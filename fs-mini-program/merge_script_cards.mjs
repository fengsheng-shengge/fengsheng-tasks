/**
 * 阶段二批1 · 剧本卡 26 条接入小程序策展库（第四组 script）
 *
 * 背景：权威主库 6114（md5 102e728f）新增 SCRIPT 类剧本卡 26 条
 *   （5 大 MOT 场景：首次接触5 / 需求解码5 / 带看讲解6 / 谈判签约5 / 售后维保5），
 *   每条含 scriptText(标准话术) + keyPoints(要点) + taboos(禁忌) + aiDrill(AI陪练用法)，
 *   生哥口径：「→ /decoder/ 话术解码器首版内容可支撑」。
 *
 * 为什么独立成组、而不是塞进 decoder：
 *   知识词条（decoder/see/nego）是「结论 + 依据」形态，字段为 cq/ola/cp/detail；
 *   剧本卡是「话术脚本」形态（scriptText/taboos/aiDrill），无 cq/ola/cp/detail。
 *   若并入 decoder 会被引擎检索逻辑按「无内容字段」处理，检索不到、也污染打分。
 *   故新增第四组 script，由引擎按 MOT 场景挂到「说」卡作为标准话术/禁忌。
 *
 * 字段映射（引擎消费态）：
 *   id / name / mot / scene / branch / scriptText / keyPoints / taboos / aiDrill
 *   / abilityRef / layer / dim / jobScope / subScene / entryType / scene(检索场景)
 *   tags.clientType = ['agent']（剧本是经纪人服务动作，策展轴 clientType 匹配加权生效）
 *   tags.mot = 对应 MOT 场景标识（引擎按节点映射到 MOT）
 *
 * 纪律：只新增 script 组，不改动既有 decoder/see/nego 任何条目。
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('.')
const SNAPSHOT = '/Users/ke/Library/CloudStorage/坚果云-281710898@qq.com/风声知识底座备份/entries_jmjx_s2a_20261022.json'
const SLIM = path.join(ROOT, 'src/package-curation/data/entries_slim.js')
const DRY = process.argv.includes('--dry')

const auth = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
const scripts = auth.filter(e => e.entryType === 'SCRIPT')
if (scripts.length !== 26) {
  console.error(`❌ 剧本卡数量异常：${scripts.length}（期望 26）`)
  process.exit(1)
}

// MOT 场景 → 策展轴节点映射：让「首次接触/需求解码」落在租赁线起步、
// 「带看讲解」落在改善、「谈判签约」落在谈判、「售后维保」落在品质/家庭。
// 每条剧本卡挂 1~2 个节点，按 MOT 语义归属。
const MOT_NODES = {
  'MOT1·首次接触': ['start', 'first'],
  'MOT2·需求解码': ['first', 'start', 'edu'],
  'MOT3·带看讲解': ['improve', 'rimprove'],
  'MOT4·谈判签约': ['improve', 'start', 'upgrade', 'elder'],
  'MOT5·售后维保': ['quality', 'family', 'elder']
}

const out = scripts.map(e => {
  const mot = e.mot || ''
  const nodes = MOT_NODES[mot] || []
  return {
    id: e.id,
    name: e.name,
    mot,
    scene: e.scene || '',
    branch: e.branch || '',
    scriptText: e.scriptText || '',
    keyPoints: Array.isArray(e.keyPoints) ? e.keyPoints : [],
    taboos: Array.isArray(e.taboos) ? e.taboos : [],
    aiDrill: e.aiDrill || '',
    abilityRef: e.abilityRef || '',
    layer: e.layer || '',
    dim: e.dim || '',
    jobScope: e.jobScope || '',
    subScene: e.subScene || '',
    entryType: 'SCRIPT',
    domain: e.domain || '场景剧本',
    // 检索场景：剧本卡不属任何交易域，标 '场景剧本'；引擎按 nodes 匹配挂载
    scene: '场景剧本',
    tags: {
      clientType: ['agent'],
      mot,
      nodes,
      layer: e.layer || '',
      dim: e.dim || ''
    }
  }
})

console.log('=== 剧本卡接入计划 ===')
console.log('  权威库 SCRIPT:', scripts.length, '条')
const motDist = {}
out.forEach(s => { motDist[s.mot] = (motDist[s.mot] || 0) + 1 })
Object.entries(motDist).forEach(([k, v]) => console.log(`    ${k}: ${v}`))
const bad = out.filter(s => !s.scriptText || !s.keyPoints.length || !s.taboos.length)
console.log('  字段不完整:', bad.length, bad.length ? bad.map(b => b.id).join(',') : '✓ 无')

if (DRY) { console.log('\n[dry] 未写回'); process.exit(0) }

// ---- 读现有 slim 并追加 script 组 ----
const src = fs.readFileSync(SLIM, 'utf8')
const m = src.match(/export default (\{[\s\S]*\})\s*$/)
if (!m) { console.error('❌ 无法解析 entries_slim.js'); process.exit(1) }
const G = JSON.parse(m[1])

if (G.script) {
  if (!process.argv.includes('--rebuild')) {
    console.log('⚠️ script 组已存在，跳过（--rebuild 可覆盖重建）')
    process.exit(0)
  }
  console.log('↻ --rebuild：覆盖重建 script 组')
}
const existing = new Set([...G.decoder, ...G.see, ...G.nego].map(e => e.id))
const dup = out.filter(s => existing.has(s.id))
if (dup.length) { console.error('❌ 与既有条目 id 冲突:', dup.map(d => d.id).join(',')); process.exit(1) }

const next = { decoder: G.decoder, see: G.see, nego: G.nego, script: out }
const header = src.slice(0, src.indexOf('export default'))
fs.writeFileSync(SLIM, header + 'export default ' + JSON.stringify(next) + '\n')

console.log('\n✓ 已写回 script 组:', out.length, '条')
console.log('  既有组条数不变: decoder', G.decoder.length, '/ see', G.see.length, '/ nego', G.nego.length)
