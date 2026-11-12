/**
 * data-adapter.js
 * ────────────────────────────────────────────────────────
 * Evidence Schema v0.1 桥接层
 * 旧字段（legalRef / caseRef / dataRef / source / source_url / authority / lastVerified）
 *   → 新 schema（evidence[] / b_level_tag / l3_blocked / caveat）
 *
 * 目的：entries.json 暂时不改，前端统一用新 schema 读数据。
 *       小眼镜 M1-M4 批量迁移脚本跑的时候，这层自动降级为 no-op。
 *
 * 契约来源：Evidence Schema v0.1（草案 2026-11-11）
 *   https://schema.evidence.v0.1
 */

(function (global) {
  'use strict';

  // ============ 契约常量 ============

  /** type → authority_level 默认映射（Schema v0.1 §三） */
  const TYPE_AUTHORITY_DEFAULT = {
    law: 'A',
    policy: 'A',
    case: 'A',
    data: 'B',   // 政府统计 → 后续手动升 A
    experience: 'C',
  };

  /** entry_type → 允许的 evidence.type 集合 */
  const ENTRY_TYPE_MAP = {
    LAW: ['law'],
    POL: ['policy'],
    PROC: ['experience', 'law'],
    RISK: ['experience', 'policy'],
    CASE: ['case'],
    DATA: ['data'],
  };

  /** 过期阻断规则（Schema v0.1 §四-2） */
  const EXPIRY_RULES = {
    LAW:    { hard: false, soft_days: null },     // 不阻断，季度核查
    POL:    { hard: false, soft_days: 180 },
    PROC:   { hard: false, soft_days: 180 },
    RISK:   { hard: false, soft_days: 180 },
    CASE:   { hard: false, soft_days: 180 },
    DATA:   { hard: false, soft_days: 30 },       // 30 天降权
  };

  /** authority_level 显示色值 */
  const AUTHORITY_COLOR = { A: '#2d7a3e', B: '#8a6f2b', C: '#7d7d7d' };
  const AUTHORITY_LABEL = { A: '官方', B: '权威', C: '经验' };

  // ============ 核心桥接函数 ============

  /**
   * 把一个旧 entry 对象转换为新 schema 格式。
   * 无论 entries.json 现在是旧格式还是已经部分迁移，这个函数都输出 v0.1 schema。
   *
   * @param {object} e 单条 entry（entries.json 原始格式）
   * @returns {object} v0.1 schema 对象，含 evidence[] / b_level_tag / l3_blocked / caveat
   */
  function adaptEntry(e) {
    // 已经是新 schema 的 → 直接返回（M1 迁移跑了之后）
    if (Array.isArray(e.evidence) && e.evidence.length > 0) {
      return normalizeNewEntry(e);
    }
    return migrateOldEntry(e);
  }

  /** 新 schema 归一化（兜底）——M1 迁移后 entries 走这个分支 */
  function normalizeNewEntry(e) {
    const entryType = e.entry_type || e.entryType || 'PROC';
    const rawEvidence = (e.evidence || []).map(normalizeEvidence);
    
    // v1.0 §三 同 type 去重（和 migrateOldEntry 保持一致）
    const evidence = dedupeEvidenceByType(rawEvidence);
    
    // v1.0 §四 B 级标签自动触发
    const allC = evidence.length > 0 && evidence.every(ev => ev.authority_level === 'C');
    
    // v1.0 §六 占位标记
    const caveat = normalizeCaveat(e.caveat);
    const hasCaveat = ['advantage', 'risk', 'scope', 'no_commit'].some(k => caveat[k] && String(caveat[k]).trim());
    const isCaveatPlaceholder = (entryType === 'RISK' && !hasCaveat);

    return {
      entry_id: e.entry_id || e.id,
      entry_type: entryType,
      evidence,
      b_level_tag: !!e.b_level_tag || allC,
      l3_blocked: !!e.l3_blocked,
      caveat,
      severity: e.severity,
      _adapted_from: 'new',
      _schema_version: 'v1.0',
      _placeholder: { b_level_tag: false, caveat: isCaveatPlaceholder },
    };
  }

  function normalizeEvidence(ev) {
    if (!ev.authority_level) {
      ev.authority_level = TYPE_AUTHORITY_DEFAULT[ev.type] || 'B';
    }
    if (!ev.verified_date) {
      ev.verified_date = ev.as_of || null;
    }
    // v1.0: url 空字符串 '' = 待核验，不强制转 null（和空值语义区分）
    if (ev.url === undefined || ev.url === null) ev.url = '';
    return ev;
  }

  function normalizeCaveat(c) {
    if (!c || typeof c !== 'object') {
      return { advantage: '', risk: '', scope: '', no_commit: '' };
    }
    return {
      advantage: c.advantage || '',
      risk: c.risk || '',
      scope: c.scope || '',
      no_commit: c.no_commit || '',
    };
  }

  /** 旧 → 新 迁移主逻辑 */
  function migrateOldEntry(e) {
    const evidence = [];
    const entryType = e.entryType || 'PROC';

    // 1. legalRef（法条）
    if (e.legalRef) {
      evidence.push({
        type: 'law',
        title: stripBrackets(e.legalRef),
        source_name: guessSourceName(e.legalRef),
        url: null,  // W1 批量补
        authority_level: 'A',
        verified_date: e.lastVerified || null,
        as_of: null,
      });
    }

    // 2. dataRef（数据来源）——跳过与 legalRef 重复的"法条伪装数据"
    if (e.dataRef && !isLawText(e.dataRef)) {
      evidence.push({
        type: 'data',
        title: e.dataRef,
        source_name: '数据来源',
        url: null,
        authority_level: e.dataRef.startsWith('国家') || e.dataRef.includes('统计局') ? 'A' : 'B',
        verified_date: e.lastVerified || null,
        as_of: e.lastVerified || null,
      });
    }

    // 3. caseRef（判例）
    if (e.caseRef) {
      evidence.push({
        type: 'case',
        title: e.caseRef,
        source_name: '司法判例',
        url: null,
        authority_level: 'A',
        verified_date: e.lastVerified || null,
        as_of: null,
      });
    }

    // 4. source_url（已经有外链的直接用上）
    if (e.source_url && !isEvidenceUsed(evidence, e.source_url)) {
      evidence.push({
        type: 'experience',
        title: e.source || '经验参考',
        source_name: '原始来源',
        url: e.source_url,
        authority_level: e.authority || 'B',
        verified_date: e.lastVerified || null,
        as_of: null,
      });
    }

    // 5. 兜底：source 字段不拆，作为一条 experience 类
    if (evidence.length === 0 && e.source) {
      evidence.push({
        type: 'experience',
        title: e.source,
        source_name: '来源说明',
        url: null,
        authority_level: 'C',
        verified_date: e.lastVerified || null,
        as_of: null,
      });
    }

    // caveat：RISK 类必填四要素，其他可选
    const caveat = normalizeCaveat(e.caveat || {
      risk: e.caveat || '',   // 旧 caveat 字段直接是风险描述
      advantage: e.ola || e.ownerBenefit || '',
    });

    // v1.0 §三 去重：同 type 重复只保留 authority_level 最高的
    const deduped = dedupeEvidenceByType(evidence);

    // B 级标签：b_level_tag=true 或 authority_level 全是 C
    const allC = deduped.length > 0 && deduped.every(ev => ev.authority_level === 'C');

    // v1.0 §六 占位：12.31 前 b_level_tag / caveat 允许为占位状态
    // _placeholder 标记：前端 EvidenceLink 组件不渲染这些块
    const isBLevelPlaceholder = false;  // 后续 M6a 批量标记
    const isCaveatPlaceholder = (entryType === 'RISK' && !hasCaveatContent(caveat));

    return {
      entry_id: e.id,
      entry_type: entryType,
      evidence: deduped,
      b_level_tag: !!e.b_level_tag || allC,
      l3_blocked: !!e.l3_blocked,
      caveat,
      severity: e.severity,
      lastVerified: e.lastVerified,
      _adapted_from: 'old',
      _schema_version: 'v1.0',
      _placeholder: { b_level_tag: isBLevelPlaceholder, caveat: isCaveatPlaceholder },
    };
  }

  /**
   * v1.0 §三 去重：evidence 数组内同 type 的条目
   * title 相同或相似度 >80% → 只保留 authority_level 最高的（A > B > C）
   */
  function dedupeEvidenceByType(list) {
    const AUTHORITY_RANK = { A: 3, B: 2, C: 1 };
    const groups = {};
    for (const ev of list) {
      if (!groups[ev.type]) groups[ev.type] = [];
      groups[ev.type].push(ev);
    }

    const result = [];
    for (const [type, items] of Object.entries(groups)) {
      if (items.length === 1) {
        result.push(items[0]);
        continue;
      }
      // 按 authority_level 从高到低 + 选 title 最短（通常最精准）
      items.sort((a, b) => {
        const rank = (AUTHORITY_RANK[b.authority_level] || 0) - (AUTHORITY_RANK[a.authority_level] || 0);
        if (rank !== 0) return rank;
        return a.title.length - b.title.length;
      });
      // 相似度 >80% 去重
      const kept = [];
      for (const candidate of items) {
        const dup = kept.find(k => similarTitle(k.title, candidate.title));
        if (!dup) kept.push(candidate);
      }
      result.push(...kept);
    }
    return result;
  }

  /** 简易相似度：common chars / max(len(a), len(b)) > 0.8 → 视为重复 */
  function similarTitle(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    // 短串完全包含在长串里 → 高度相似
    if (longer.includes(shorter) && shorter.length / longer.length > 0.5) return true;
    return false;
  }

  function hasCaveatContent(c) {
    return ['advantage', 'risk', 'scope', 'no_commit'].some(k => c[k] && String(c[k]).trim());
  }

  function stripBrackets(s) {
    return String(s).replace(/[《》\[\]【】]/g, '').trim();
  }

  function guessSourceName(legalRef) {
    if (legalRef.includes('民法典')) return '全国人大';
    if (legalRef.includes('房地产经纪管理办法')) return '住建部';
    if (legalRef.includes('民事诉讼法')) return '全国人大';
    if (legalRef.includes('合同法')) return '全国人大';
    if (legalRef.includes('合伙企业法')) return '全国人大';
    if (legalRef.includes('物业管理条例')) return '国务院';
    if (legalRef.includes('商品房销售管理办法')) return '住建部';
    return '立法机关';
  }

  /** 判断一段文本是不是法律条文（避免 dataRef 与 legalRef 重复） */
  function isLawText(s) {
    const lawKeywords = [
      '《', '》', '法》', '条例》', '办法》', '规定》', '解释》',
      '第', '条', '款', '项', '章', '节',
    ];
    // 至少命中 2 个以上关键词
    let hits = 0;
    for (const kw of lawKeywords) {
      if (String(s).includes(kw)) hits++;
      if (hits >= 2) return true;
    }
    return false;
  }

  function isEvidenceUsed(arr, url) {
    return arr.some(ev => ev.url === url);
  }

  // ============ 过期阻断管道 ============

  /**
   * 对一个已适配的 entry 做时效评估。
   * @returns {object} { status: 'fresh'|'soft_expired'|'hard_blocked', days, reason }
   */
  function assessExpiry(adaptedEntry, today) {
    today = today || new Date();
    const rule = EXPIRY_RULES[adaptedEntry.entry_type] || EXPIRY_RULES.PROC;

    // L3 硬拦截（Schema §四-4）
    if (adaptedEntry.l3_blocked) {
      return { status: 'hard_blocked', days: 0, reason: 'L3_blocked' };
    }

    // 时效判断
    const verif = adaptedEntry.evidence.find(ev => ev.verified_date);
    const as_of = adaptedEntry.evidence.find(ev => ev.as_of);
    const dateStr = (as_of && as_of.as_of) || (verif && verif.verified_date);

    if (!dateStr) {
      return { status: 'fresh', days: 0, reason: 'no_date' };
    }

    const refDate = new Date(dateStr);
    const days = Math.floor((today - refDate) / (1000 * 60 * 60 * 24));

    if (rule.soft_days && days > rule.soft_days) {
      return { status: 'soft_expired', days, reason: `${adaptedEntry.entry_type} > ${rule.soft_days}d` };
    }
    if (rule.hard && days > rule.hard) {
      return { status: 'hard_blocked', days, reason: `${adaptedEntry.entry_type} > ${rule.hard}d` };
    }

    return { status: 'fresh', days, reason: null };
  }

  /**
   * 批量过滤 + 降权。
   * @param {object[]} rawEntries entries.json 原始数组
   * @returns {object[]} 已适配 + 已过时效筛选的数组
   */
  function filterAndAdaptAll(rawEntries, opts) {
    opts = Object.assign({ drop_hard: true, expire_soft: true }, opts);
    const today = new Date();

    return rawEntries
      .map(e => {
        const adapted = adaptEntry(e);
        const exp = assessExpiry(adapted, today);
        adapted._expiry = exp;
        adapted._dropped = exp.status === 'hard_blocked' && opts.drop_hard;
        adapted._expired = exp.status === 'soft_expired' && opts.expire_soft;
        return adapted;
      })
      .filter(e => !e._dropped);
  }

  // ============ EvidenceLink 渲染辅助 ============

  /** 给 EvidenceLink 组件用的扁平视图 */
  function flattenEvidence(adaptedEntry) {
    if (!adaptedEntry || !Array.isArray(adaptedEntry.evidence)) return [];
    return adaptedEntry.evidence.map((ev, i) => ({
      key: `${adaptedEntry.entry_id}_ev_${i}`,
      type: ev.type,
      type_label: typeLabel(ev.type),
      title: ev.title,
      source_name: ev.source_name,
      url: ev.url,
      clickable: !!ev.url,
      authority_level: ev.authority_level,
      authority_label: AUTHORITY_LABEL[ev.authority_level] || '?',
      authority_color: AUTHORITY_COLOR[ev.authority_level] || '#7d7d7d',
      verified_date: ev.verified_date,
      as_of: ev.as_of,
    }));
  }

  function typeLabel(t) {
    return { law: '📜 法条', policy: '📋 政策', case: '⚖️ 判例', data: '📊 数据', experience: '💡 经验' }[t] || t;
  }

  // ============ 导出 ============

  const EvidenceAdapter = {
    // 契约常量（EvidenceLink 组件引用）
    CONSTANTS: { TYPE_AUTHORITY_DEFAULT, AUTHORITY_COLOR, AUTHORITY_LABEL, EXPIRY_RULES, ENTRY_TYPE_MAP },
    // 单条适配
    adaptEntry,
    flattenEvidence,
    assessExpiry,
    // 批量过滤
    filterAndAdaptAll,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceAdapter;
  } else {
    global.EvidenceAdapter = EvidenceAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
