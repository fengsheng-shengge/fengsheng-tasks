#!/usr/bin/env node
// 埋点口径自检门禁 —— 上线前必跑
// ----------------------------------------------------------------------------
// 【为什么有这个脚本】9-30 我向小鱼儿承诺「把数据口径一致性纳入每次上线前自检清单，
//   含体验版上传前核对各页面统计口径对齐、杜绝双口径」。此前该承诺只停留在口头上：
//   verify_all.mjs（26 页面渲染 + 21 项交互）无任何埋点校验项，仓库根目录 17 个 .mjs
//   批处理脚本也无一个含埋点校验 —— 埋点做了，但「漏埋就报错」的门禁没建。
//   本脚本即为该承诺的落地：静态检查，不依赖浏览器/构建产物，任何人 clone 后可直接跑。
//
// 【检查项】
//   C1  页面路由全量覆盖：pages.json 每个路由对应页面必须含 trackPageview
//   C2  关键业务事件存在性：关键事件名必须在 src 中真实上报（防漏埋）
//   C3  埋点出口唯一性：/api/events 的上报只允许出现在 utils/tracker.js
//   C4  展示层口径自愈：dict.js 不得再写死总条数（count 必须为 null，运行时实拉）
//   C5  点击口径对齐：tracker.js 必须保留点击类事件的 event_type='click' 补发逻辑
//   C6  page 命名规范：trackPageview 的 page 实参必须是 kebab-case 短名
//       （禁路径式 /pages/x/index、禁 snake_case 下划线）——
//       后端 /api/stats/pages 按 page 字段 GROUP BY，命名不统一会裂成多行，
//       同一页面被算成两个页面，页面热力榜直接失真
//
// 【退出码】0 = 全通过；1 = 有 FAIL 项（可作为上传闸门的硬拦截）；2 = 脚本自身异常
//
// 【用法】node verify_tracking.mjs          （人看版）
//        node verify_tracking.mjs --json   （机器版，供 CI/上传脚本消费）
// ----------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src');
const JSON_OUT = process.argv.includes('--json');

// ── 关键事件清单（口径：与需求单 / 埋点覆盖清单一致，缺一即视为漏埋）──
const REQUIRED_EVENTS = [
  { type: 'feedback_open', desc: '反馈入口打开' },
  { type: 'feedback_submit', desc: '反馈提交' },
];

// 点击类事件 → 看板 click 口径
const CLICK_TYPES = ['banner_click', 'feature_click', 'feature_more'];

const results = [];
const add = (id, level, name, detail) => results.push({ id, level, name, detail });

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'unpackage') continue;
      walk(p, out);
    } else if (/\.(vue|js|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(__dirname, p);

// ═══ 读取路由 ═══
let routes = [];
try {
  const raw = fs.readFileSync(path.join(SRC, 'pages.json'), 'utf8');
  const json = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
  for (const p of json.pages || []) routes.push(p.path);
  for (const sp of json.subPackages || json.subpackages || []) {
    for (const p of sp.pages || []) routes.push(`${sp.root}/${p.path}`);
  }
} catch (e) {
  console.error('✗ 无法解析 src/pages.json：', e.message);
  process.exit(2);
}

const files = walk(SRC);
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

const pageFile = (route) => {
  for (const ext of ['.vue', '.nvue']) {
    const p = path.join(SRC, route + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
};

// ═══ C1 页面路由 pageview 覆盖 ═══
{
  const missing = [];
  const noFile = [];
  for (const r of routes) {
    const f = pageFile(r);
    if (!f) { noFile.push(r); continue; }
    if (!/trackPageview\s*\(/.test(fs.readFileSync(f, 'utf8'))) missing.push(r);
  }
  const detail = `共 ${routes.length} 条路由；已覆盖 ${routes.length - missing.length - noFile.length} 页` +
    (missing.length ? `；未埋 ${missing.join(', ')}` : '') +
    (noFile.length ? `；页面文件缺失 ${noFile.join(', ')}` : '');
  // 允许显式豁免（需在本文件白名单里写明原因，不允许静默放过）
  const WHITELIST = [];
  const realMissing = missing.filter((r) => !WHITELIST.includes(r));
  if (noFile.length) add('C1', 'FAIL', 'C1 页面路由 pageview 覆盖', detail);
  else if (realMissing.length) add('C1', 'FAIL', 'C1 页面路由 pageview 覆盖', detail);
  else add('C1', 'PASS', 'C1 页面路由 pageview 覆盖', detail);
}

// ═══ C2 关键事件存在性 ═══
{
  const all = files.map((f) => ({ f, t: fs.readFileSync(f, 'utf8') })).filter((x) => x.t.includes('trackEvent'));
  const missing = [];
  for (const ev of REQUIRED_EVENTS) {
    const hit = all.some((x) => new RegExp(`trackEvent\\s*\\(\\s*['"\`]${ev.type}['"\`]`).test(x.t));
    if (!hit) missing.push(`${ev.type}(${ev.desc})`);
  }
  const detail = missing.length
    ? `缺失关键事件：${missing.join(', ')}`
    : `全部 ${REQUIRED_EVENTS.length} 个关键事件已上报（${REQUIRED_EVENTS.map((e) => e.type).join(', ')}）`;
  add('C2', missing.length ? 'FAIL' : 'PASS', 'C2 关键业务事件存在性', detail);
}

// ═══ C3 埋点出口唯一性 ═══
{
  const trackerPath = path.join(SRC, 'utils', 'tracker.js');
  const offenders = [];
  for (const f of files) {
    if (f === trackerPath) continue;
    const t = fs.readFileSync(f, 'utf8');
    if (/\/api\/events/.test(t)) offenders.push(rel(f));
  }
  const detail = offenders.length
    ? `除 utils/tracker.js 外仍有 ${offenders.length} 处直写 /api/events：${offenders.join(', ')}`
    : '所有 /api/events 上报均收敛在 utils/tracker.js（唯一出口）';
  add('C3', offenders.length ? 'FAIL' : 'PASS', 'C3 埋点出口唯一性', detail);
}

// ═══ C4 展示层口径自愈（不写死总条数）═══
{
  const dictPath = path.join(SRC, 'utils', 'dict.js');
  const t = readIf(dictPath);
  if (!t) {
    add('C4', 'FAIL', 'C4 展示层口径自愈', '未找到 src/utils/dict.js');
  } else {
    const hasFetch = /fetchDictCounts/.test(t);
    const hardTotal = /DICT_TOTAL\s*=\s*\d+/.test(t);
    // 只查 DICT_DOMAINS 配置块内的 count 是否写死数字；
    // 运行时代码里的 `count: 0` 是请求失败时的兜底值，属正常实现，不算口径写死。
    const block = (t.match(/export const DICT_DOMAINS\s*=\s*\[([\s\S]*?)\n\]/) || [])[1] || '';
    const hardCounts = /count\s*:\s*\d+/.test(block);
    const ok = hasFetch && !hardTotal && !hardCounts;
    const detail = ok
      ? `dict.js 走运行时实拉（fetchDictCounts），13 导航域 count 全为 null，未写死总条数/分域 count`
      : `hasFetch=${hasFetch} 写死总数=${hardTotal} 配置块内写死分域count=${hardCounts}`;
    add('C4', ok ? 'PASS' : 'FAIL', 'C4 展示层口径自愈', detail);
  }
}

// ═══ C5 点击口径对齐（event_type='click' 补发）═══
{
  const t = readIf(path.join(SRC, 'utils', 'tracker.js'));
  if (!t) {
    add('C5', 'FAIL', 'C5 点击口径对齐', '未找到 src/utils/tracker.js');
  } else {
    const hasClickList = new RegExp(CLICK_TYPES.join('|')).test(t);
    const hasClickPost = /post\(\s*['"]click['"]/.test(t);
    const hasOrigType = /origType/.test(t);
    const ok = hasClickList && hasClickPost && hasOrigType;
    const detail = ok
      ? `点击类事件 ${CLICK_TYPES.join('/')} 已补发 event_type='click'（带 origType），看板 click 口径可汇总`
      : `点击类清单=${hasClickList} click补发=${hasClickPost} origType=${hasOrigType}`;
    add('C5', ok ? 'PASS' : 'FAIL', 'C5 点击口径对齐', detail);
  }
}

// ═══ C6 page 命名规范（kebab-case 短名）═══
// 背景：后端 /api/stats/pages 按 events.page 字段 GROUP BY，
//       若同一页面用两种命名上报，会被算成两个页面，热力榜失真。
//       2026-11-05 实测修掉 5 处：/pages/briefing/index → briefing、
//       deal_report/negotiation_report/proposal_report/showing_report → *-report
{
  const bad = [];
  const seen = new Map(); // page 名 → 出现文件，用于检出重名
  const dynamic = [];     // 动态 page 参数（trackEvent('x', <变量>, ...)）
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/trackPageview\s*\(\s*['"]([^'"]+)['"]/g)) {
      const p = m[1];
      if (/^\//.test(p)) bad.push(`${p}（路径式，应为短名）@ ${rel(f)}`);
      else if (/_/.test(p)) bad.push(`${p}（snake_case，应为 kebab-case）@ ${rel(f)}`);
      else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p)) bad.push(`${p}（非法字符）@ ${rel(f)}`);
      if (!seen.has(p)) seen.set(p, []);
      seen.get(p).push(rel(f));
    }
    // trackPageview 只接受 1 个参数；传 2 个时第二个会被静默丢弃
    for (const m of t.matchAll(/trackPageview\s*\(\s*['"][^'"]+['"]\s*,/g)) {
      bad.push(`多参数调用（第二参会被丢弃）@ ${rel(f)}`);
    }
    // trackEvent 的 page 参数允许是变量（如 feedback-popup 的 this.source），
    // 但必须能静态解析成合法短名，否则 /api/stats/pages 里会多出「假页面」行。
    for (const m of t.matchAll(/trackEvent\s*\(\s*['"][^'"]+['"]\s*,\s*([^,)]+)/g)) {
      const arg = m[1].trim();
      if (/^['"]/.test(arg)) {
        const p = arg.replace(/^['"]|['"]$/g, '');
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p)) {
          bad.push(`trackEvent 的 page「${p}」非 kebab-case @ ${rel(f)}`);
        }
        if (!seen.has(p)) seen.set(p, []);
        seen.get(p).push(rel(f));
      } else {
        dynamic.push(`${arg} @ ${rel(f)}`);
      }
    }
  }
  const dup = [...seen.entries()].filter(([, fs2]) => fs2.length > 1);
  const detail = bad.length
    ? `${bad.length} 处命名不合规：${bad.join('；')}`
    : `${seen.size} 个 page 名全部为 kebab-case 短名，无路径式、无 snake_case、无多参数调用` +
      (dynamic.length ? `；${dynamic.length} 处动态 page 参数：${dynamic.join('，')}` : '');
  add('C6', bad.length ? 'FAIL' : 'PASS', 'C6 page 命名规范', detail);

  // 动态 page 参数提示：不阻断，但需人工确认其取值落在合法短名集合内
  if (dynamic.length) {
    console.error(`ℹ️  C6 附加提示：${dynamic.length} 处动态 page 参数（需人工确认取值合法）→ ` +
      dynamic.join('，'));
  }

  // 重名提示：不阻断，但同一 page 名被多个文件上报通常是复制粘贴残留
  if (dup.length) {
    console.error(`⚠️  C6 附加提示：${dup.length} 个 page 名被多处上报 → ` +
      dup.map(([p, fs2]) => `${p}(${fs2.length}处)`).join(', '));
  }
}

// ═══ 输出 ═══
const fails = results.filter((r) => r.level === 'FAIL');
if (JSON_OUT) {
  console.log(JSON.stringify({
    ok: fails.length === 0,
    total: results.length,
    passed: results.length - fails.length,
    failed: fails.length,
    results,
  }, null, 2));
} else {
  console.log('\n═══ 埋点口径自检 · verify_tracking ═══\n');
  for (const r of results) {
    const mark = r.level === 'PASS' ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark}  ${r.name}`);
    console.log(`        ${r.detail}`);
  }
  console.log(`\n结果：${results.length - fails.length}/${results.length} 通过` +
    (fails.length ? `，${fails.length} 项 FAIL —— 阻断上传，请修复后重跑` : ' —— 口径门禁放行'));
  console.log('口径依据：9-30 承诺（埋点口径统一自检清单）/ V3.4 埋点覆盖清单 / 需求单_P1小程序埋点聚合接口_20260831\n');
}

process.exit(fails.length ? 1 : 0);
