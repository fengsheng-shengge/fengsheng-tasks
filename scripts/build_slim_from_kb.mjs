#!/usr/bin/env node
/**
 * 从小眼镜知识库（data/entries_5000.json）重抽小程序 slim 数据源
 *
 * 铁律：
 *  1. 数据诚实 —— 只搬运，不编造；占位符（待补充/待核）一律视为无值
 *  2. 防串线 —— tags 必须规范化为对象且带 clientType，缺失则不下发（宁可漏不可串）
 *  3. 体积可控 —— 主包上限 2MB，slim 预算由 --budget 控制
 *
 * 用法：
 *   node scripts/build_slim_from_kb.mjs [--budget 1206] [--dry] [--src <path>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
// slim 落在 package-curation 分包内（engine.js 唯一消费方也在该分包），
// 避免占满主包 2MB 上限（主包已 1836KB，slim 1205KB 会超限）。分包 2MB 上限充足。
const OUT = path.join(REPO, 'fs-mini-program/src/package-curation/entries_slim.js')
const OLD_OUT = path.join(REPO, 'fs-mini-program/src/utils/entries_slim.js')
const ENGINE = path.join(REPO, 'fs-mini-program/src/package-curation/engine.js')

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const BUDGET_KB = +arg('--budget', 1206)
const DRY = argv.includes('--dry')
const SRC = arg('--src', '')

// ===== 1. 载入源数据 =====
let raw
if (SRC) raw = fs.readFileSync(SRC, 'utf8')
else raw = execSync(`cd ${REPO} && git show origin/main:data/entries_5000.json`, { maxBuffer: 300 * 1024 * 1024 }).toString()
const j = JSON.parse(raw)
const FULL = Array.isArray(j) ? j : (j.entries || j.data || [])
console.log(`源库：${FULL.length} 条`)

// 现有 slim（保留 full 中缺失的条目，避免回退丢数据）
// 优先读 OUT；首次迁移时 OUT 尚不存在，回退读旧 utils/ 位置以保住 orphan（如 RENT-*）
let PREV = []
function readSlim(p) {
  const m = fs.readFileSync(p, 'utf8')
  const i = m.indexOf('{"decoder"')
  const objTxt = i >= 0 ? m.slice(i) : m.slice(m.indexOf('['))
  const parsed = JSON.parse(objTxt.replace(/\s*$/, ''))
  return Array.isArray(parsed) ? parsed : (parsed.decoder || [])
}
try { PREV = readSlim(OUT) }
catch (e1) {
  try { PREV = readSlim(OLD_OUT) }
  catch (e2) { console.log('⚠️ 旧 slim 解析失败，按空处理：', e2.message.slice(0, 80)) }
}
console.log(`旧 slim：${PREV.length} 条`)

// ===== 2. 规范化 =====
const CT_MAP = {
  '买方': 'buyer', '购房者': 'buyer', '买家': 'buyer', 'buyer': 'buyer',
  '卖方': 'seller', '业主': 'seller', '卖家': 'seller', 'seller': 'seller', 'owner': 'seller',
  '房东': 'landlord', 'landlord': 'landlord',
  '租客': 'tenant', '承租人': 'tenant', 'tenant': 'tenant',
  '经纪人': 'agent', '中介': 'agent', 'agent': 'agent'
}
const STAGE_MAP = {
  '售前': 'pre', '售中': 'mid', '售后': 'post', '全阶段': 'all',
  'pre': 'pre', 'mid': 'mid', 'post': 'post', 'all': 'all'
}
const normStage = v => {
  if (!v) return ''
  return String(v).split(/[,，]/).map(s => STAGE_MAP[s.trim()] || '').filter(Boolean).join(',')
}
const isReal = v => {
  if (!v) return false
  const s = String(v).trim()
  return s.length >= 2 && !/^(待补充|待核|暂无|无|—|-|null|undefined)/.test(s) && !/待补充|待核实/.test(s)
}

// tags 规范化：数组 → 对象。数组形态无 clientType，按铁律「无 clientType 不下发」标记
let fixedFromArray = 0, droppedNoCt = 0
function normTags(e) {
  const t = e.tags
  if (Array.isArray(t)) {
    // 小眼镜案例库 batch：tags 退化为关键词数组，无 clientType/stage
    // 铁律：不猜 clientType（猜错=四线串台），关键词移入 keywords，clientType 留空 → 后续按「无 clientType 不下发」丢弃
    fixedFromArray++
    return { keywords: t.slice(0, 6), clientType: [], stage: '', layer: '', meetingPhase: [] }
  }
  if (!t || typeof t !== 'object') return { clientType: [], stage: '', layer: '', meetingPhase: [] }
  const rawCt = Array.isArray(t.clientType) ? t.clientType : (t.clientType ? [t.clientType] : [])
  const ct = [...new Set(rawCt.map(x => CT_MAP[String(x).trim()]).filter(Boolean))]
  const mp = Array.isArray(t.meetingPhase) ? t.meetingPhase : (t.meetingPhase ? [t.meetingPhase] : [])
  return { clientType: ct, stage: normStage(t.stage), layer: t.layer || '', meetingPhase: mp }
}

const KEEP = ['id', 'name', 'domain', 'subScene', 'scene', 'cq', 'ola', 'cp', 'detail', 'legalRef', 'consumerBenefit', 'dataRef', 'caseRef', 'tags']
function toSlim(e) {
  const tags = normTags(e)
  const o = {
    id: e.id,
    name: e.name,
    domain: e.domain || '',
    subScene: e.subScene || '',
    scene: e.scene || ((e.domain || '') + '·' + (e.subScene || '')),
    cq: e.cq || e.consumerQ || '',
    ola: e.ola || '',
    cp: Array.isArray(e.cp) ? e.cp : [],
    detail: e.detail || '',
    legalRef: e.legalRef || '',
    consumerBenefit: e.consumerBenefit || e.ownerBenefit || '',
    tags
  }
  // alias 砍到 3（引擎仅用于检索命中，多余的只占体积）
  if (Array.isArray(e.alias) && e.alias.length) o.alias = e.alias.slice(0, 3)
  // dataRef / caseRef：只搬真值，占位符一律丢弃（客户可见页据此判可见性）
  if (isReal(e.dataRef)) o.dataRef = e.dataRef
  if (isReal(e.caseRef)) o.caseRef = e.caseRef
  // 清掉空字段省体积
  Object.keys(o).forEach(k => {
    const v = o[k]
    if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) delete o[k]
  })
  return o
}

// ===== 3. 打分选条 =====
// 从引擎读取四线节点关键词，保证选条口径与检索口径一致（避免灌了引擎搜不到的条目）
const engineSrc = fs.readFileSync(ENGINE, 'utf8')
const AXIS_KW = { buyer: new Set(), tenant: new Set(), landlord: new Set(), seller: new Set() }
{
  const block = engineSrc.slice(engineSrc.indexOf('AXIS_GROUPS'), engineSrc.indexOf('// ===== 住得好七维'))
  const groups = block.split(/clientType:\s*'/).slice(1)
  groups.forEach(g => {
    const ct = g.slice(0, g.indexOf("'"))
    if (!AXIS_KW[ct]) return
    ;[...g.matchAll(/kw:\s*\[([^\]]+)\]/g)].forEach(m => {
      m[1].split(',').forEach(s => {
        const w = s.trim().replace(/^['"]|['"]$/g, '')
        if (w) AXIS_KW[ct].add(w)
      })
    })
  })
}
console.log('引擎节点关键词：' + Object.entries(AXIS_KW).map(([k, v]) => `${k}:${v.size}`).join(' '))

function score(o) {
  let s = 0
  const ct = o.tags.clientType
  // ① 客户页刚需：真实数据 / 真实案例（当前 dataRef/caseRef 覆盖率 0 是唯一阻塞）
  if (o.dataRef) s += 100
  if (o.caseRef) s += 100
  // ② 真法源
  if (isReal(o.legalRef)) s += 8
  // ③ 节点关键词命中（与引擎检索同口径）
  const text = [o.name, o.cq, o.ola, (o.cp || []).join(' '), (o.alias || []).join(' ')].join(' ')
  let kwHit = 0
  ct.forEach(c => { (AXIS_KW[c] || new Set()).forEach(w => { if (text.includes(w)) kwHit++ }) })
  s += Math.min(kwHit, 6) * 4
  // ④ 见前 / 售前 = 策展主战场
  const mp = o.tags.meetingPhase || []
  if (mp.includes('见前')) s += 6
  if (String(o.tags.stage).includes('pre')) s += 4
  // ⑤ 内容完整度（说/带/问都要素材）
  if (o.ola) s += 3
  if ((o.cp || []).length >= 3) s += 3
  if (o.detail && o.detail.length > 80) s += 2
  if (o.consumerBenefit) s += 2
  return s
}

const B = x => Buffer.byteLength(JSON.stringify(x), 'utf8')
const BUDGET = BUDGET_KB * 1024

// 规范化全库
const all = FULL.map(toSlim)
// 铁律：无 clientType 的不下发（防四线串台）
const usable = all.filter(o => {
  if (!o.tags.clientType.length) { droppedNoCt++; return false }
  return true
})
console.log(`规范化：tags 数组修复 ${fixedFromArray} 条 | 无 clientType 丢弃 ${droppedNoCt} 条 | 可用 ${usable.length} 条`)

// 旧 slim 里源库没有的，无条件保留（不能因为换源丢数据）
const fullIds = new Set(all.map(o => o.id))
const orphans = PREV.filter(e => !fullIds.has(e.id))
console.log(`旧 slim 独有（保留）：${orphans.length} 条`)

// 四线配额：按线均衡，避免 buyer 一家独大（旧 slim: buyer281/seller49/tenant34/landlord25）
const scored = usable.map(o => ({ o, s: score(o), b: B(o) })).sort((a, b) => b.s - a.s)
const QUOTA_W = { buyer: 0.34, seller: 0.22, landlord: 0.22, tenant: 0.22 }
let used = orphans.reduce((a, e) => a + B(e), 0)
const picked = [], pickedIds = new Set(orphans.map(e => e.id))
const lineUsed = { buyer: 0, seller: 0, landlord: 0, tenant: 0, agent: 0 }

// 第一轮：dataRef/caseRef 真值全收（客户可见页解锁，不受配额限制）
for (const it of scored) {
  if (!(it.o.dataRef || it.o.caseRef)) continue
  if (used + it.b > BUDGET) break
  picked.push(it.o); pickedIds.add(it.o.id); used += it.b
  it.o.tags.clientType.forEach(c => { if (lineUsed[c] !== undefined) lineUsed[c]++ })
}
const phase1 = picked.length
console.log(`第一轮（真实数据/案例全收）：${phase1} 条 / ${(used / 1024).toFixed(0)}KB`)

// 第二轮：按四线配额补齐
const remain = BUDGET - used
const lineBudget = {}
Object.entries(QUOTA_W).forEach(([k, w]) => { lineBudget[k] = remain * w })
const lineSpent = { buyer: 0, seller: 0, landlord: 0, tenant: 0 }
for (const it of scored) {
  if (pickedIds.has(it.o.id)) continue
  const cts = it.o.tags.clientType.filter(c => lineBudget[c] !== undefined)
  if (!cts.length) continue
  // 归属到当前余量最多的那条线
  const line = cts.sort((a, b) => (lineBudget[b] - lineSpent[b]) - (lineBudget[a] - lineSpent[a]))[0]
  if (lineSpent[line] + it.b > lineBudget[line]) continue
  if (used + it.b > BUDGET) break
  picked.push(it.o); pickedIds.add(it.o.id)
  used += it.b; lineSpent[line] += it.b
  it.o.tags.clientType.forEach(c => { if (lineUsed[c] !== undefined) lineUsed[c]++ })
}
console.log(`第二轮（四线配额补齐）：${picked.length - phase1} 条`)

const RESULT = [...orphans, ...picked]
const finalBytes = B({ decoder: RESULT })

// ===== 4. 报告 =====
const ctDist = {}
RESULT.forEach(e => ((e.tags && e.tags.clientType) || []).forEach(c => ctDist[c] = (ctDist[c] || 0) + 1))
const realLegal = RESULT.filter(e => isReal(e.legalRef)).length
const withData = RESULT.filter(e => e.dataRef).length
const withCase = RESULT.filter(e => e.caseRef).length
const noCt = RESULT.filter(e => !((e.tags && e.tags.clientType) || []).length).length

console.log('\n========== 灌注结果 ==========')
console.log(`条数：${PREV.length} → ${RESULT.length}（${RESULT.length > PREV.length ? '+' : ''}${RESULT.length - PREV.length}）`)
console.log(`体积：${(fs.existsSync(OUT) ? fs.statSync(OUT).size / 1024 : 0).toFixed(0)}KB → ${(finalBytes / 1024).toFixed(0)}KB（预算 ${BUDGET_KB}KB）`)
console.log(`四线分布：${JSON.stringify(ctDist)}`)
console.log(`真法源：${realLegal}（${(realLegal / RESULT.length * 100).toFixed(1)}%）`)
console.log(`真实数据 dataRef：${withData}（${(withData / RESULT.length * 100).toFixed(1)}%）← 旧版 0`)
console.log(`真实案例 caseRef：${withCase}（${(withCase / RESULT.length * 100).toFixed(1)}%）← 旧版 0`)
console.log(`无 clientType（串线风险）：${noCt} ${noCt === 0 ? '✅' : '❌'}`)

if (DRY) { console.log('\n--dry 模式，未写文件'); process.exit(0) }

// ===== 5. 写出 =====
const header = [
  '// 由 scripts/build_slim_from_kb.mjs 从小眼镜知识库 data/entries_5000.json 抽取生成',
  `// 生成时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')} | 源库 ${FULL.length} 条 → slim ${RESULT.length} 条`,
  '// 字段：id/name/domain/subScene/scene/cq/ola/cp/detail/legalRef/consumerBenefit/dataRef/caseRef/alias/tags',
  '// 规范化：clientType 统一 buyer/seller/landlord/tenant/agent；stage 统一 pre/mid/post/all',
  '// 铁律：dataRef/caseRef 仅保留真值（占位符已剔除）；无 clientType 的条目不下发（防四线串台）',
  `export default ${JSON.stringify({ decoder: RESULT })}`
].join('\n')
fs.writeFileSync(OUT, header)
console.log(`\n✅ 已写入 ${OUT}（${(fs.statSync(OUT).size / 1024).toFixed(0)}KB）`)
// 迁移清理：删除旧主包 utils/ 副本，避免两份同源分叉（双份 slim 必出串台/丢数据）
if (OUT !== OLD_OUT && fs.existsSync(OLD_OUT)) {
  fs.unlinkSync(OLD_OUT)
  console.log(`🧹 已删除旧副本 ${OLD_OUT}`)
}
