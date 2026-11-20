/**
 * EvidenceLink.js — 蓝图 C1 证据链组件
 * ────────────────────────────────────────────────────────
 * 渲染 Schema v1.0 证据数组为可交互卡片/抽屉。
 * 入口：EvidenceLink.render(rawEntry | adaptedEntry, opts)
 *   - 自动调用 EvidenceAdapter.adaptEntry() 桥接旧字段（如果还没转）
 *   - L3 拦截 → 返回空（不渲染）
 *   - 过期降权 → 标注
 *   - 空链接 → 灰色待核验，不可点
 *
 * 依赖：window.EvidenceAdapter（已由 data-adapter.js 注入）
 * 组件复用：workspace / knowledge / ai-advisor / 未来档案页
 */

(function (global) {
  'use strict';

  if (!global.EvidenceAdapter) {
    console.warn('[EvidenceLink] EvidenceAdapter 未加载，组件不可用');
    return;
  }

  const ADAPTER = global.EvidenceAdapter;
  // CONSTANTS 防御：data-adapter 延迟加载或版本不匹配时降级为空对象
  const CONST = ADAPTER.CONSTANTS || {};
  const EXPIRY_RULES = CONST.EXPIRY_RULES || {};
  const AUTHORITY_COLORS = CONST.AUTHORITY_COLOR || {};

  // ============ 类型标签 ============
  const TYPE_LABEL = {
    law: '📜 法条', policy: '🏛️ 政策', case: '⚖️ 判例',
    data: '📊 数据', experience: '💡 经验',
  };
  const AUTH_BADGE = { A: '🟢 官方', B: '🟡 权威', C: '⚪ 经验' };
  const AUTH_COLOR = { A: '#2d7a3e', B: '#8a6f2b', C: '#7d7d7d' };
  // 证据状态徽章（蓝图 C1 · 来源可信度分层）
  // 与 authority 徽章的区别：authority 反映"条目内容本身是什么"；evidence_state 反映"这条证据的原始来源能定位到多深"
  //   🟢 已核验 = derived 条目，有 source_url + 结论逐条比对（未来数据字段 evidence_verified 为 true）
  //   🟤 法源可溯 = derived 条目，有 source_url 能找到官方原文，但结论未逐条核验
  //   ⚪ 待溯源   = derived 条目，无 source_url，原始法源未定位
  // 注：A/B 级（official/court/industry/data）不加此徽章——这些条目本身就是原始权威或行业源头
  const EVIDENCE_STATE_BADGE = {
    verified:   '🟢 已核验',
    traceable:  '🟤 法源可溯',
    untraceable:'⚪ 待溯源',
  };
  const EVIDENCE_STATE_COLOR = {
    verified:   '#2d7a3e',
    traceable:  '#8b5a2b',
    untraceable:'#999999',
  };

  function deriveEvidenceState(ev, entryAuthLevel) {
    // 只对 C 级（derived）加证据状态徽章——A/B 级本身就是原始权威
    if (entryAuthLevel !== 'C') return null;
    const hasUrl = ev.url && String(ev.url).trim();
    if (!hasUrl) return 'untraceable';
    // 结论核验标记：数据层字段 evidence_verified，未来补
    if (ev.evidence_verified === true) return 'verified';
    return 'traceable';
  }

  // ============ 过期降权判断（复用 adapter 规则）============
  function isExpired(entryType, verifiedDate) {
    if (!verifiedDate) return false;
    const rule = EXPIRY_RULES[entryType] || { soft_days: null };
    if (!rule.soft_days) return false;
    const vd = new Date(verifiedDate);
    if (isNaN(vd.getTime())) return false;
    const days = (Date.now() - vd.getTime()) / 86400000;
    return days > rule.soft_days;
  }

  // ============ 渲染主入口 ============
  function render(entry, opts) {
    opts = opts || {};
    const maxItems = opts.max || 0;       // 0=全量
    const compact = !!opts.compact;        // 卡片精简模式
    const showCaveat = opts.showCaveat !== false;
    const showEntryBadge = opts.showEntryBadge !== false;  // 字典 v1.3：入口徽章开关

    // Step 1: adapt（如果还没转）
    let adapted = entry;
    if (entry && !entry._schema_version) {
      adapted = ADAPTER.adaptEntry(entry);
    }

    if (!adapted) return '';
    if (adapted.l3_blocked) return '';  // 蓝图 3.3 硬拦截
    if (!adapted.evidence || adapted.evidence.length === 0) return '';

    // Step 2: 入口徽章（字典 v1.3 §二）——整条知识条目的权威等级
    // 与 evidence[] 卡片内的引用徽章是不同层（entry 级 vs evidence 级）
    let entryBadgeHtml = '';
    if (showEntryBadge && adapted._entry_auth_level) {
      const authColor = AUTHORITY_COLORS[adapted._entry_auth_level] || '#7d7d7d';
      const authBadge = adapted._entry_auth_badge || '';
      const dualTag = adapted._has_dual_evidence
        ? '<span class="el-badge dual-evidence" title="法条+判例双引证经验提炼">🔗 双引证</span>'
        : '';
      const supNote = adapted._entry_auth_level === 'B' && adapted._entry_auth_badge && adapted._entry_auth_badge.includes('待补证')
        ? '<span class="el-badge caveat-suppressed" title="官方来源待补 source_url，补证后恢复绿徽章">⚠️ 待补证</span>'
        : '';
      entryBadgeHtml = (
        '<div class="el-entry-head">' +
          '<span class="el-entry-auth" style="color:' + authColor + '">' + authBadge + '</span>' +
          dualTag + supNote +
        '</div>'
      );
    }

    // Step 3: 渲染 evidence[] 数组
    let items = adapted.evidence;
    if (maxItems > 0) items = items.slice(0, maxItems);

    const cards = items.map(function (ev) {
      const isExp = isExpired(adapted.entry_type, ev.verified_date);
      const hasUrl = ev.url && String(ev.url).trim();
      const typeLabel = TYPE_LABEL[ev.type] || '📄 ' + ev.type;
      const badgeLabel = AUTH_BADGE[ev.authority_level] || '⚪ 未知';
      const badgeColor = AUTH_COLOR[ev.authority_level] || '#999';
      const verDate = ev.verified_date || ev.as_of || '';

      // 证据状态徽章（C 级 derived 才加，A/B 级本身就是原始权威不加）
      const evState = deriveEvidenceState(ev, adapted._entry_auth_level);
      let evStateBadge = '';
      if (evState) {
        evStateBadge = '<span class="el-badge ev-state ev-state-' + evState + '" style="color:' + EVIDENCE_STATE_COLOR[evState] + '" title="' +
          ({verified: '结论与原文逐条比对通过', traceable: '能找到官方原文，但结论未逐条核验', untraceable: '原始法源未定位'}[evState]) +
          '">' + EVIDENCE_STATE_BADGE[evState] + '</span>';
      }

      // 链接状态
      let linkHtml;
      if (hasUrl) {
        linkHtml = '<a href="' + ev.url + '" target="_blank" rel="noopener" class="el-link">查看原文 ↗</a>';
      } else {
        linkHtml = '<span class="el-link pending">待核验</span>';
      }

      // 过期标注
      const expiredBadge = isExp
        ? '<span class="el-badge expired" title="超过 ' + ((EXPIRY_RULES[adapted.entry_type] && EXPIRY_RULES[adapted.entry_type].soft_days) || 180) + ' 天未核验，已降权">⚠️ 超期</span>'
        : '';

      // B 级全量
      const bLevelNote = adapted.b_level_tag
        ? '<span class="el-badge b-level">经验型（B 级）</span>'
        : '';

      return (
        '<div class="el-card' + (compact ? ' compact' : '') + (isExp ? ' expired' : '') + '">' +
          '<div class="el-head">' +
            '<span class="el-type">' + typeLabel + '</span>' +
            '<span class="el-auth" style="color:' + badgeColor + '">' + badgeLabel + '</span>' +
            evStateBadge + expiredBadge + bLevelNote +
          '</div>' +
          '<div class="el-title" title="' + (ev.title || '').replace(/"/g, '&quot;') + '">' +
            (ev.title || '(未命名)') +
          '</div>' +
          '<div class="el-meta">' +
            '<span class="el-source">' + (ev.source_name || '未标注来源') + '</span>' +
            (verDate ? '<span class="el-date">· 核验 ' + verDate + '</span>' : '') +
          '</div>' +
          linkHtml +
        '</div>'
      );
    }).join('');

    // Step 4: caveat 边界位（蓝图 C1，有内容才显示）
    let caveatHtml = '';
    if (showCaveat && adapted.caveat) {
      const c = adapted.caveat;
      const parts = [];
      if (c.risk)       parts.push('<span class="caveat risk">⚠️ ' + escape(c.risk) + '</span>');
      if (c.no_commit)  parts.push('<span class="caveat no-commit">🚫 ' + escape(c.no_commit) + '</span>');
      if (c.scope)      parts.push('<span class="caveat scope">📌 ' + escape(c.scope) + '</span>');
      if (parts.length > 0) {
        caveatHtml = '<div class="el-caveat">' + parts.join('') + '</div>';
      }
    }

    // Step 5: 顾问署名栏（蓝图 P4 · #245 消费者规范）
    // 数据层优先：signedBy > verifiedBy > owner → 都没有 fallback 机构名
    const signedBy = entry.signedBy || entry.verifiedBy || entry.owner || '风声信息咨询';
    const signDate = adapted.evidence.find(function(ev){ return ev.verified_date; }) || {};
    const signDateStr = signDate.verified_date || '';
    let signHtml = '<div class="el-sign">' +
      '<span class="el-sign-name">由 ' + escape(signedBy) +
      (signDateStr ? ' 于 ' + signDateStr : '') + ' 整理提供</span>' +
    '</div>';

    // Step 6: 免责句（消费者向 · 蓝图 P4）
    const disclaimer = '<div class="el-disclaimer">以上证据可溯源，消费者可自行核验原文，最终判断由消费者自主作出</div>';

    return (
      '<div class="evidence-link' + (compact ? ' compact' : '') + '" data-entry-id="' + adapted.entry_id + '">' +
        entryBadgeHtml + cards + caveatHtml + signHtml + disclaimer +
      '</div>'
    );
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.EvidenceLink = { render: render };
})(window);
