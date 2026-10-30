#!/usr/bin/env node
/**
 * CAP-SKILL 批量打标脚本 v2
 *
 * 优化点：
 *   1. 每个 entry 最多挂 3 个 cap_skills，按匹配等级优先
 *   2. 关键词匹配更严格：exact 命中 + 出现位置权重
 *   3. 反向 gap 分析：哪些 CAP-SKILL 打不到 = 知识库缺什么
 *   4. 打不上的 entry 记录 reasons 供人工审核
 */

const fs = require('fs');
const path = require('path');

// ========== 0. 加载源数据 ==========
const ENTRIES_PATH = path.join(__dirname, '..', 'data', 'entries.json');
const QMAP_PATH = path.join(__dirname, '..', 'data', 'v3', 'question_map.json');
const OUT_PATH = path.join(__dirname, '..', 'data', 'entries.json');

const entries = JSON.parse(fs.readFileSync(ENTRIES_PATH, 'utf8'));
const qmap = JSON.parse(fs.readFileSync(QMAP_PATH, 'utf8'));
const questions = qmap.mapping;

console.log(`加载: entries=${entries.length}, question_map=${questions.length}`);

// ========== 1. domain→dim_id 映射 ==========
const DOMAIN_TO_DIM = {
  '签约前': 3, '签约中': 4, '签约后': 5,
  '购房': 3, '谈判斡旋': 4,
  '客户解码': 2, '学区教育': 3,
  '带看服务': 1, '场景剧本': 1,
  '法规政策': 3, '城市数据': 3,
  '跨域通用': 2, '租房': 3,
  '租住': 5, '房东出租': 1,
  '业主出售': 1, '退租出售': 5,
  '居住中': 6, '业主': 4, '业主侧': 4,
  '资产持有与运营': 6, '职业成长': 5,
  '岗位体系': null, '能力画像': null,
  '素养域': null, '能力测评': null, '匠星认证': null,
  '市场数据-二手房': 3, '市场数据-宏观': 3,
  '市场数据-房贷': 3, '市场数据-物业': 3,
  '市场数据-租赁': 3, '市场数据-头部企业': 3,
  '市场数据-新兴赛道': 3,
};

const QSTAGE_TO_ESTAGE = {
  'prepare': ['pre', 'all'],
  'market': ['pre', 'all'],
  'invite': ['pre', 'all'],
  'negotiate': ['mid', 'during', 'all'],
  'transaction': ['mid', 'during', 'all'],
  'closing': ['post', 'all'],
};

// ========== 2. 核心打标 ==========

function getEntryStage(e) {
  const s = e.stage || (e.tags && e.tags.stage) || '';
  if (Array.isArray(s)) return s.join(',');
  return String(s);
}

function scoreMatch(entry, q) {
  // score 越高越匹配，返回 null 表示不匹配
  const domain = entry.domain;
  const primaryDim = DOMAIN_TO_DIM[domain];
  const qDim = q.dim_id;
  const qStage = q.stage;
  const qKeywords = q.keywords || [];

  if (!primaryDim && !['职业成长','资产持有与运营','业主','业主侧','购房','签约前','签约中','签约后'].includes(domain)) {
    return null;
  }

  const entryStage = getEntryStage(entry);
  const compatibleStages = QSTAGE_TO_ESTAGE[qStage] || ['all'];
  const stageOk = !entryStage || compatibleStages.some(s => entryStage.includes(s));

  // 关键词在 name/alias/detail 里 exact 出现
  const entryText = [
    entry.name,
    ...(entry.alias || []),
    entry.detail,
    entry.consumerQ,
  ].filter(Boolean).join(' ').toLowerCase();

  let hitKw = null;
  let hitCount = 0;
  let hitInName = false;

  for (const kw of qKeywords) {
    const k = (kw || '').toLowerCase();
    if (!k) continue;
    const count = (entryText.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > 0) {
      hitCount += count;
      hitKw = hitKw || k;
      if ((entry.name || '').toLowerCase().includes(k)) hitInName = true;
    }
  }

  if (!hitKw) return null;

  // 打分：dim匹配是基础
  let score = 0;
  const dimMatch = qDim === primaryDim || primaryDim === null;

  if (dimMatch) score += 5;
  if (stageOk) score += 2;
  if (hitInName) score += 3;        // name 里出现 = 强
  if (hitCount >= 3) score += 3;    // 多次出现
  else if (hitCount >= 2) score += 1;

  // 阈值：score >= 5 才收录
  if (score < 5) return null;

  return {
    skill: q.skill_standard,
    score,
    hitKw,
    dimMatch,
    stageOk,
    hitInName,
    hitCount,
  };
}

// ========== 3. 批量执行 ==========

console.log('\n开始全量打标...');

let stats = { tagged: 0, skipped: 0, untagged: 0 };
const skillEntryCount = {};
questions.forEach(q => skillEntryCount[q.skill_standard] = 0);
const gapSkills = new Set(); // 始终匹配不到的 CAP-SKILL

entries.forEach((entry, idx) => {
  const primaryDim = DOMAIN_TO_DIM[entry.domain];
  if (primaryDim === null) {
    entry.cap_skills = [];
    stats.skipped++;
    return;
  }

  const scores = [];
  for (const q of questions) {
    const s = scoreMatch(entry, q);
    if (s) scores.push(s);
  }

  // 按 score 降序，取 top 3
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 3);

  entry.cap_skills = top.map(s => s.skill);

  if (entry.cap_skills.length > 0) {
    stats.tagged++;
    top.forEach(s => { skillEntryCount[s.skill] = (skillEntryCount[s.skill] || 0) + 1; });
  } else {
    stats.untagged++;
  }
});

// ========== 4. 输出统计 ==========

const TOTAL_KNOWLEDGE = stats.tagged + stats.untagged; // 不包含 skipped
const COVERAGE = (stats.tagged / TOTAL_KNOWLEDGE * 100).toFixed(1);

console.log('\n═══════════════════════════════════════════');
console.log('  全量打标结果');
console.log('═══════════════════════════════════════════');
console.log(`总条目:         ${entries.length}`);
console.log(`可打标域:       ${TOTAL_KNOWLEDGE}`);
console.log(`已打标:         ${stats.tagged} (${COVERAGE}%)`);
console.log(`未打标:         ${stats.untagged}`);
console.log(`跳过(素养/组织): ${stats.skipped}`);

console.log('\n═══════════════════════════════════════════');
console.log('  39 个 CAP-SKILL 覆盖排行');
console.log('═══════════════════════════════════════════');

questions.forEach(q => {
  const count = skillEntryCount[q.skill_standard] || 0;
  if (count === 0) gapSkills.add(q.skill_standard);
  const bar = '█'.repeat(Math.min(count / 10, 20));
  console.log(`  ${q.skill_standard} dim${String(q.dim_id).padStart(2)}  ${String(count).padStart(4)}  ${bar}  ${q.title.slice(0, 25)}`);
});

console.log('\n═══════════════════════════════════════════');
console.log('  GAP: 覆盖为 0 的 CAP-SKILL (知识库缺什么)');
console.log('═══════════════════════════════════════════');

if (gapSkills.size === 0) {
  console.log('  ✅ 全部覆盖！');
} else {
  questions
    .filter(q => gapSkills.has(q.skill_standard))
    .forEach(q => {
      console.log(`  ${q.skill_standard} (dim${q.dim_id} ${q.dim_name})`);
      console.log(`    "${q.title}"`);
      console.log(`    关键词: [${(q.keywords || []).slice(0,5).join(', ')}]`);
      console.log('');
    });
}

// ========== 5. 保存结果 ==========
fs.writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2), 'utf8');
console.log(`\n✅ 已保存: ${OUT_PATH}`);

// 同时导出 gap 报告
const gapReport = {
  generated_at: new Date().toISOString(),
  total_entries: entries.length,
  tagged: stats.tagged,
  coverage_pct: COVERAGE,
  gap_skills: [...gapSkills].map(id => {
    const q = questions.find(x => x.skill_standard === id);
    return { skill: id, dim: q.dim_id, dim_name: q.dim_name, title: q.title, keywords: q.keywords };
  }),
};

const GAP_PATH = path.join(__dirname, '..', 'data', 'v3', 'cap-skill-gap-report.json');
fs.writeFileSync(GAP_PATH, JSON.stringify(gapReport, null, 2), 'utf8');
console.log(`✅ Gap 报告: ${GAP_PATH}`);
