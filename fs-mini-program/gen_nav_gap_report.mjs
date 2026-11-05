#!/usr/bin/env node
// ============================================================================
// 13 导航映射 · 缺口实测底稿生成器
// ----------------------------------------------------------------------------
// 【为什么有这个脚本】
// 小眼镜认领的「13 导航聚合映射表」（13 导航 key → v3 26 归并域 → 全量映射）
// 承诺 11-12 前交付，但**目前仍是纸面承诺**（已逾期两次，这是第三次）。
// 我这边不能空等：把「映射表交付后我要适配什么」这件事先做完 ——
//
//   ① 实测权威主库，得出 13 导航 key 覆盖了多少、缺口多少、缺口在哪些域；
//   ② 从 subScene 反推出每个未归并域**应该归到哪个导航 key**（给出建议值）；
//   ③ 产出一份可直接对照验收的 JSON 底稿 —— 小眼镜的映射表一到，
//      一跑本脚本就能比对我的建议与它的产出是否一致，不一致处当场暴露。
//
// 【口径依据】
//   权威主库：知识底座生产/entries_5000.json（2026-11-05 实测 5843 条 / 35 domain）
//   导航定义：fs-mini-program/src/utils/dict.js 的 DICT_DOMAINS（13 key）
//   缺口口径：主库总量 − 13 导航 key 命中数（不是「显示 6135 / 实际可达 4720」
//             那个后端部署副本口径，两者库不同、数不同，本脚本只算主库）
//
// 【退出码】0 = 脚本正常（含「缺口非零」的正常提示）；2 = 脚本自身异常
//
// 【用法】
//   node gen_nav_gap_report.mjs              （人看版）
//   node gen_nav_gap_report.mjs --json out.json   （同时落 JSON 底稿）
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const LIB = path.join(REPO, '知识底座生产', 'entries_5000.json');
const DICT_JS = path.join(REPO, 'fs-mini-program', 'src', 'utils', 'dict.js');
const JSON_OUT = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

// ── 读 13 导航 key（从 dict.js 实读，不手维护清单）──
function readNavKeys() {
  const t = fs.readFileSync(DICT_JS, 'utf8');
  const block = (t.match(/export const DICT_DOMAINS\s*=\s*\[([\s\S]*?)\n\]/) || [])[1] || '';
  const keys = [];
  for (const m of block.matchAll(/key\s*:\s*'([^']+)'/g)) keys.push(m[1]);
  if (!keys.length) throw new Error('无法从 dict.js 的 DICT_DOMAINS 解析出导航 key');
  return keys;
}

// ── 读主库 ──
function readLib() {
  const raw = JSON.parse(fs.readFileSync(LIB, 'utf8'));
  const items = Array.isArray(raw) ? raw : (raw.entries || raw.items || raw.data || []);
  if (!items.length) throw new Error('主库解析为空');
  return items;
}

// ── 归并建议表：从 subScene 语义反推 ──
// 依据：每个未归并域的 subScene 前缀即业务线（购房/租住/不动产法律/调控政策…），
//       按业务线归属映射到 13 导航 key。标注 inference=规则推断（可被小眼镜的表覆盖）。
//
// 【修正记录】2026-11-05 实测校正：
//   初版把 H2 归到「资产持有与运营」，但 H2 的 subScene 是「购房·整装服务」，
//   与 G1-G4 同属整装服务 → 归并必须一致，已改为「签约前」。
//   H1/H3/H4 的 subScene 是「购房·资产管理」（托管/隐性成本/持售决策/多房配置），
//   属持有期经营 → 归「资产持有与运营」。
//   拆分依据是 subScene 语义而非域名字母（A/B/C/G/H 无含义），故规则表按实测写死。
const MERGE_SUGGEST = {
  // 购房线 → 签约前（购房是购房全流程，签约前是入口域）
  BUY: '签约前',
  // 租住线 → 居住中
  RENT: '居住中',
  A1: '签约前',   // 不动产法律
  A2: '签约前',   // 调控政策
  A3: '签约前',   // 税费法规
  A4: '居住中',   // 租赁法规 + 租期内服务
  B1: '签约前', B2: '签约前', B3: '签约前', B4: '签约前', // 购房·贷款办理
  C1: '签约前', C2: '签约前', C3: '签约前',             // 学区/学校/教育规划
  // 整装服务（G1-G4 + H2，均为「购房·整装服务」subScene）
  G1: '签约前', G2: '签约前', G3: '签约前', G4: '签约前', H2: '签约前',
  // 持有期资产管理（H1/H3/H4，均为「购房·资产管理」subScene）
  H1: '资产持有与运营', H3: '资产持有与运营', H4: '资产持有与运营',
  DATA: '跨域通用', // 数据类词条（贝壳/百城/各城市）
};

const navKeys = readNavKeys();
const items = readLib();

const domCount = new Map();
const domSub = new Map();
for (const it of items) {
  const d = it.domain || '(空)';
  domCount.set(d, (domCount.get(d) || 0) + 1);
  if (!domSub.has(d)) domSub.set(d, new Map());
  const s = it.subScene || '(空)';
  domSub.get(d).set(s, (domSub.get(d).get(s) || 0) + 1);
}

const total = items.length;
const navHits = new Map();
let navSum = 0;
for (const k of navKeys) {
  const c = domCount.get(k) || 0;
  navHits.set(k, c);
  navSum += c;
}
const gap = total - navSum;

const outside = [];
for (const [d, c] of domCount.entries()) {
  if (navKeys.includes(d)) continue;
  outside.push({
    domain: d,
    count: c,
    suggestedNav: MERGE_SUGGEST[d] || null,
    inference: MERGE_SUGGEST[d] ? '规则推断' : '无建议（需人工判定）',
    sampleSubScenes: [...domSub.get(d).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s}×${n}`),
  });
}
outside.sort((a, b) => b.count - a.count);

const noSuggestion = outside.filter((o) => !o.suggestedNav);
const uncovered = outside.filter((o) => o.suggestedNav && !navKeys.includes(o.suggestedNav));

// ── 自校验：同一 subScene 的词条不应被归到不同导航 key ──
// 理由：subScene 是业务线语义的最细粒度，同一 subScene 拆到两个导航域
//       会让用户在两个入口看到同一批内容，是归并表最典型的低级错误。
const subSceneNav = new Map(); // subScene → Set(建议导航)
for (const o of outside) {
  if (!o.suggestedNav) continue;
  for (const ss of o.sampleSubScenes) {
    const key = ss.replace(/×\d+$/, '');
    if (!subSceneNav.has(key)) subSceneNav.set(key, new Set());
    subSceneNav.get(key).add(o.suggestedNav);
  }
}
const subSceneConflicts = [...subSceneNav.entries()]
  .filter(([, set]) => set.size > 1)
  .map(([ss, set]) => ({ subScene: ss, suggested: [...set] }));

const report = {
  generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  lib: path.relative(REPO, LIB),
  totalEntries: total,
  navKeyCount: navKeys.length,
  navHitSum: navSum,
  gap,
  navHits: Object.fromEntries(navHits),
  outsideNav: outside,
  outsideCount: outside.length,
  outsideTotal: outside.reduce((s, o) => s + o.count, 0),
  noSuggestion,
  uncovered,
  subSceneConflicts,
};

if (JSON_OUT) {
  fs.writeFileSync(path.resolve(process.cwd(), JSON_OUT), JSON.stringify(report, null, 2), 'utf8');
  console.error(`JSON 底稿已写入：${path.resolve(process.cwd(), JSON_OUT)}`);
}

console.log('\n═══ 13 导航映射 · 缺口实测底稿 ═══\n');
console.log(`主库           ${LIB.replace(REPO + '/', '')}`);
console.log(`主库总量       ${total}`);
console.log(`导航 key 数    ${navKeys.length}（从 dict.js 的 DICT_DOMAINS 实读）`);
console.log(`13 导航求和    ${navSum}`);
console.log(`缺口           ${gap}`);
console.log(`\n── 各导航 key 命中（主库侧）──`);
for (const [k, c] of [...navHits.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${k.padEnd(16, ' ')} ${String(c).padStart(5)}`);
}
console.log(`\n── 13 导航之外的 ${outside.length} 个 domain（合计 ${report.outsideTotal} 条）──`);
for (const o of outside) {
  console.log(`   ${o.domain.padEnd(12)} ${String(o.count).padStart(4)}  → 建议归并: ${(o.suggestedNav || '待人工判定').padEnd(16)} [${o.inference}]`);
  console.log(`       subScene: ${o.sampleSubScenes.join(' / ')}`);
}
if (noSuggestion.length) {
  console.log(`\n⚠️  ${noSuggestion.length} 个域无归并建议，需小眼镜的映射表给出：${noSuggestion.map((o) => o.domain).join(', ')}`);
}
if (uncovered.length) {
  console.log(`⚠️  建议值不在 13 导航 key 内：${uncovered.map((o) => `${o.domain}→${o.suggestedNav}`).join(', ')}`);
}
if (subSceneConflicts.length) {
  console.log(`\n❌ 归并一致性冲突 ${subSceneConflicts.length} 处（同一 subScene 被归到不同导航域，必须修）：`);
  for (const c of subSceneConflicts) console.log(`   ${c.subScene} → ${c.suggested.join(' / ')}`);
} else {
  console.log(`\n✅ 归并一致性自校验通过：无同一 subScene 被归到不同导航域的情况。`);
}
console.log(`\n口径：主库总量 − 13 导航命中 = 缺口。`);
console.log('注意：这是主库口径；后端部署副本另有其数（历史上出现过「显示 6135 / 实际可达 4720」），两者库不同、不可混算。\n');
process.exit(0);
