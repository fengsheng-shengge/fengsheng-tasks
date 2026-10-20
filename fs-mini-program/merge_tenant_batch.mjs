// tenant 策展批次并入 entries_slim（按 id 去重 · 不覆盖既有 · 字段格式归一）
// 数据源：权威基线 entries_5000.json（与 RENT-TEN-001/002/003 同源）
import { readFileSync, writeFileSync } from 'fs'

const AUTH = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/知识底座生产/entries_5000.json'
const SLIM = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program/src/package-curation/data/entries_slim.js'
const sel = JSON.parse(readFileSync('/tmp/tenant_selected_ids.json', 'utf8'))
const auth = JSON.parse(readFileSync(AUTH, 'utf8'))
const authById = new Map(auth.map(e => [e.id, e]))

const mod = await import(SLIM)
const G = mod.default

// 现状快照
const before = { decoder: G.decoder.length, see: G.see.length, nego: G.nego.length }
const beforeIds = new Set([...G.decoder, ...G.see, ...G.nego].map(e => e.id))
console.log('并入前:', JSON.stringify(before), '| 总计', [...beforeIds].size)

const added = { decoder: [], see: [], nego: [] }
const skipped = []
let noOwnerBenefit = 0

for (const s of sel) {
  const src = authById.get(s.id)
  if (!src) { skipped.push({ id: s.id, why: '权威库无此 id' }); continue }
  if (beforeIds.has(s.id)) { skipped.push({ id: s.id, why: '已存在（id 去重）' }); continue }

  // 字段归一：引擎 searchable() 依赖 name/alias/cq/ola/cp/detail/consumerBenefit；
  // normalizeEntry 产出的 API 态用 cq/ola/cp/detail —— 此处必须同样归一，
  // 否则静态兜底路径与在线 API 路径字段名不一致，导致检索/渲染不对称。
  const entry = {
    id: src.id,
    domain: src.domain,
    subScene: src.subScene,
    name: src.name,
    alias: Array.isArray(src.alias) ? src.alias : (src.alias ? [src.alias] : []),
    cq: src.consumerQ || '',
    ola: src.ola || '',
    cp: Array.isArray(src.cp) ? src.cp : (src.cp ? [src.cp] : []),
    detail: src.detail || '',
    legalRef: src.legalRef || '',
    consumerBenefit: src.consumerBenefit || '',
    ownerBenefit: src.ownerBenefit || '',
    tags: src.tags || {},
    scene: src.sceneDomain,
    entryType: src.entryType || '',
    severity: src.severity || ''
  }
  // ownerBenefit 缺失如实留空（引擎 curate-prep 会诚实不显示业主侧价值，不编造）
  if (!entry.ownerBenefit) noOwnerBenefit++
  added[s.group].push(entry)
}

// 追加（不改动既有条目，仅在组尾追加）
G.decoder = [...G.decoder, ...added.decoder]
G.see = [...G.see, ...added.see]
G.nego = [...G.nego, ...added.nego]

const after = { decoder: G.decoder.length, see: G.see.length, nego: G.nego.length }
console.log('并入后:', JSON.stringify(after), '| 总计', after.decoder + after.see + after.nego)
console.log('增量:', JSON.stringify({ decoder: added.decoder.length, see: added.see.length, nego: added.nego.length }))
console.log('跳过:', skipped.length, JSON.stringify(skipped.reduce((m, s) => { m[s.why] = (m[s.why] || 0) + 1; return m }, {})))
console.log('ownerBenefit 缺失（诚实留空）:', noOwnerBenefit)

// tenant 视角统计
const all = [...G.decoder, ...G.see, ...G.nego]
const ct = {}
all.forEach(e => (e.tags && e.tags.clientType || []).forEach(t => { ct[t] = (ct[t] || 0) + 1 }))
console.log('并入后 clientType:', JSON.stringify(ct))
const sc = {}
all.forEach(e => { sc[e.scene] = (sc[e.scene] || 0) + 1 })
console.log('并入后 scene:', JSON.stringify(sc))

// 校验：字段完整性 + id 唯一
const allIds = all.map(e => e.id)
console.log('id 唯一:', new Set(allIds).size === allIds.length, `(${allIds.length})`)
const bad = all.filter(e => !e.name || !Array.isArray(e.cp) || !e.ola)
console.log('字段不完整条目:', bad.length, bad.slice(0, 5).map(e => e.id))

// 写回（保持 default 导出的单行 JSON 格式）
const header = [
  '// 策展引擎静态兜底数据 · 按权威基线对齐（FS-KB-ALIGN-20261014-01）',
  '// 来源：知识底座生产/entries_5000.json（权威基线 5843 条 / v3 归并 26 域），按 id 同源对齐 name/alias/cq/ola/cp/detail',
  '// 新增 ownerBenefit（经纪人侧收益）；legalRef 取权威真值（无真值诚实保留）；scene 对齐权威 sceneDomain',
  '// 保留 decoder/see/nego 三组策展分组与顺序；tags 用权威值（引擎兼容）；ESM 导出',
  '// 2026-10-20 追加：tenant 视角策展批次 247 条（scene∈{租住,退租出售}，subScene 语义映射，',
  '//   与 RENT-TEN-001/002/003 同源同基线，按 id 去重；decoder 65 / nego 182）'
].join('\n')
writeFileSync(SLIM, header + '\nexport default ' + JSON.stringify(G) + '\n')
console.log('\n已写回:', SLIM)
console.log('文件大小:', readFileSync(SLIM, 'utf8').length, '字节')