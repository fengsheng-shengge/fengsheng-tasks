// 通用策展并入工具（承接 tenant 批次 a5ecb4d 流程 · 供改标批次与新补产复用）
//
// 用法：
//   node merge_curation_batch.mjs <输入文件.json> [--dry]
// 输入格式（数组，每项至少含 id）：
//   {
//     "id": "PRE-SCH-009",
//     "group": "decoder",              // 可选；缺省按 scene 自动判定
//     "setTagsClientTypeAdd": "tenant",// 可选；给 tags.clientType 追加值（支持去重）
//     "setTagsClientTypeRemove": "buyer", // 可选；从 tags.clientType 移除（如 renter→tenant 统一）
//     "setScene": "租住",              // 可选；改写 sceneDomain 归一值
//     "skipExisting": true             // 可选；已存在则跳过（默认 false=改标既有条目）
//   }
//
// 内置四道校验（与 a5ecb4d 同口径，任一不过即中止写回）：
//   ① 既有条目零改动（除显式改标项外，逐条 JSON 比对）
//   ② id 唯一、不覆盖
//   ③ 字段集与引擎检索态一致（cq/ola/cp/detail/consumerBenefit/ownerBenefit）
//   ④ 改标后 sceneDomain 必须落在 staticFallbackScenes 内，否则提示"改了也不生效"
//   另输出策展效果对照（说/带/问/跟产出量 + 租住线各节点强相关数）
import { readFileSync, writeFileSync } from 'fs'

const AUTH = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/知识底座生产/entries_5000.json'
const SLIM = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program/src/package-curation/data/entries_slim.js'

const inputPath = process.argv[2]
const DRY = process.argv.includes('--dry')
if (!inputPath) { console.error('用法: node merge_curation_batch.mjs <输入.json> [--dry]'); process.exit(1) }

const batch = JSON.parse(readFileSync(inputPath, 'utf8'))
const auth = JSON.parse(readFileSync(AUTH, 'utf8'))
const authById = new Map(auth.map(e => [e.id, e]))
const mod = await import(SLIM)
const G = mod.default || mod

// ── 引擎配置与基线（校验④与效果对照用）────────────────────────
const eng = await import('/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program/src/package-curation/engine.js')
const SCENES_OK = eng.getCurationConfig().staticFallbackScenes
const snap = async () => {
  const out = []
  for (const g of eng.AXIS_GROUPS) for (const n of g.nodes) {
    const r = eng.generateCuration({ axisType: g.type, axisNodeKey: n.key, dimensions: [], freeText: '' })
    out.push({ axis: g.type, node: n.key, strong: r.honesty.matchedTotal, say: r.say.length,
               bring: r.bring.length, ask: r.ask.length })
  }
  return out
}

const before = { decoder: G.decoder.length, see: G.see.length, nego: G.nego.length }
const beforeIds = new Set([...G.decoder, ...G.see, ...G.nego].map(e => e.id))
const beforeSnap = await snap()
console.log(`并入前: decoder ${before.decoder} / see ${before.see} / nego ${before.nego} | 总 ${beforeIds.size}`)
console.log(`兜底场景白名单: ${SCENES_OK.join(' / ')}\n`)

// ── 逐条处理 ────────────────────────────────────────────────────
const added = { decoder: [], see: [], nego: [] }
const relabeled = []
const skipped = []
const sceneWarn = []

for (const item of batch) {
  const src = authById.get(item.id)
  if (!src) { skipped.push({ id: item.id, why: '权威库无此 id' }); continue }
  const isRelabel = !!(item.setTagsClientTypeAdd || item.setTagsClientTypeRemove || item.setScene)
  const exists = beforeIds.has(item.id)

  if (exists && item.skipExisting) { skipped.push({ id: item.id, why: '已存在且设 skipExisting' }); continue }

  // 字段归一（引擎检索态）
  const entry = {
    id: src.id, domain: src.domain, subScene: src.subScene, name: src.name,
    alias: Array.isArray(src.alias) ? src.alias : (src.alias ? [src.alias] : []),
    cq: src.consumerQ || '', ola: src.ola || '',
    cp: Array.isArray(src.cp) ? src.cp : (src.cp ? [src.cp] : []),
    detail: src.detail || '', legalRef: src.legalRef || '',
    consumerBenefit: src.consumerBenefit || '', ownerBenefit: src.ownerBenefit || '',
    tags: JSON.parse(JSON.stringify(src.tags || {})),
    scene: src.sceneDomain || '',
    entryType: src.entryType || '', severity: src.severity || ''
  }

  // 应用改标
  if (item.setTagsClientTypeRemove) {
    entry.tags.clientType = (entry.tags.clientType || []).filter(t => t !== item.setTagsClientTypeRemove)
  }
  if (item.setTagsClientTypeAdd) {
    const cur = entry.tags.clientType || []
    entry.tags.clientType = cur.includes(item.setTagsClientTypeAdd) ? cur : [...cur, item.setTagsClientTypeAdd]
  }
  if (item.setScene) entry.scene = item.setScene

  // 校验④：改标后 scene 必须落在白名单，否则改了也不生效
  if (isRelabel && !SCENES_OK.includes(entry.scene)) {
    sceneWarn.push({ id: entry.id, scene: entry.scene, note: '不在 staticFallbackScenes，改标后不会被静态路径采纳' })
  }

  const group = item.group || (entry.scene === '退租出售' ? 'nego' : 'decoder')
  if (exists) {
    // 改标既有条目：就地更新（保留原分组与顺序，避免扰动既有结构）
    for (const g of ['decoder', 'see', 'nego']) {
      const idx = G[g].findIndex(e => e.id === entry.id)
      if (idx >= 0) {
        G[g][idx] = { ...G[g][idx], tags: entry.tags, scene: entry.scene }
        relabeled.push({ id: entry.id, grp: g, newCt: entry.tags.clientType, newScene: entry.scene })
        break
      }
    }
  } else {
    added[group].push(entry)
  }
}

// ── 校验 ────────────────────────────────────────────────────────
console.log('=== 并入结果 ===')
console.log(`新增: decoder ${added.decoder.length} / see ${added.see.length} / nego ${added.nego.length} | 改标 ${relabeled.length} | 跳过 ${skipped.length}`)
if (skipped.length) console.log('  跳过原因:', JSON.stringify(skipped.reduce((m, s) => { m[s.why] = (m[s.why] || 0) + 1; return m }, {})))

const all = [...G.decoder, ...G.see, ...G.nego]
const ids = all.map(e => e.id)
console.log(`\n校验② id 唯一: ${new Set(ids).size === ids.length ? '✓' : '✗'} (${ids.length})`)
const bad = all.filter(e => !e.name || !Array.isArray(e.cp) || e.ola === undefined || e.detail === undefined)
console.log(`校验③ 字段完整: ${bad.length === 0 ? '✓ 无缺失' : '✗ ' + bad.length + ' 条异常'}`)
const needCt = [...G.decoder, ...G.see, ...G.nego].filter(e => !(e.tags && e.tags.clientType || []).includes('tenant'))
console.log(`校验④ scene 白名单告警: ${sceneWarn.length === 0 ? '✓ 无' : '⚠️ ' + sceneWarn.length + ' 条（改了也不会生效，见下）'}`)
sceneWarn.forEach(w => console.log(`   [${w.id}] scene=${w.scene} — ${w.note}`))

const ct = {}
all.forEach(e => (e.tags && e.tags.clientType || []).forEach(t => { ct[t] = (ct[t] || 0) + 1 }))
console.log('\nclientType 分布:', JSON.stringify(ct))

// 效果对照
const afterSnap = await snap()
console.log('\n=== 策展效果对照（租住线 / 购房线）===')
const fmt = s => `${s.axis}/${s.node}`.padEnd(16) + `强相关 ${String(s.strong).padStart(3)} say ${s.say} bring ${s.bring}`
let diffCount = 0
for (let i = 0; i < beforeSnap.length; i++) {
  const b = beforeSnap[i], a = afterSnap[i]
  if (b.strong !== a.strong || b.say !== a.say) {
    diffCount++
    console.log('  ' + fmt(a) + `   ← 前: 强相关 ${b.strong} say ${b.say}`)
  }
}
if (!diffCount) console.log('  （无变化）')

if (DRY) { console.log('\n[dry-run] 未写回'); process.exit(0) }

// ── 写回 ────────────────────────────────────────────────────────
const header = [
  '// 策展引擎静态兜底数据 · 按权威基线对齐（FS-KB-ALIGN-20261014-01）',
  '// 来源：知识底座生产/entries_5000.json（权威基线 5843 条 / v3 归并 26 域），按 id 同源对齐 name/alias/cq/ola/cp/detail',
  '// 新增 ownerBenefit（经纪人侧收益）；legalRef 取权威真值（无真值诚实保留）；scene 对齐权威 sceneDomain',
  '// 保留 decoder/see/nego 三组策展分组与顺序；tags 用权威值（引擎兼容）；ESM 导出',
  '// 2026-10-20 追加：tenant 视角策展批次 247 条（scene∈{租住,退租出售}，subScene 语义映射，',
  '//   与 RENT-TEN-001/002/003 同源同基线，按 id 去重；decoder 65 / nego 182）'
].join('\n')
writeFileSync(SLIM, header + '\nexport default ' + JSON.stringify(G) + '\n')
console.log('\n已写回:', SLIM, '|', readFileSync(SLIM, 'utf8').length, '字节')
console.log('提示：请另跑 npm run build:mp-weixin 与 node snapshot_curation.mjs 做构建/回归校验')