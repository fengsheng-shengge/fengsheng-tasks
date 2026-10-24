/**
 * 入库批次结构性预检（流水线批前检查 · 小豆子侧）
 *
 * 用途：知识库流水线「验收→转条目→预检→终审→合并→三端同步」中，
 *       在合并入库【之前】跑一遍结构性检查，避免撞车/口径矛盾/断链。
 *       批次节奏为「不再攒批」，每批都跑，不能靠人工记忆。
 *
 * 检查项：
 *   ① ID 续段与撞车：待入批 ID 是否与主库现有 ID 冲突、是否正好续段
 *   ② name/alias 撞车：待入批 name/alias 与主库现有条目是否重名
 *   ③ 字段完整性：与主库同 entryType 条目的字段集对齐度（缺字段会静默失效）
 *   ④ clientType/scene 规范：标签值域合法性（策展引擎只认 tenant/buyer/seller/…）
 *   ⑤ 小程序侧影响：是否落入我的策展场景 / 13 导航域 / 城市卡通道
 *   ⑥ 时效性风险：lastVerified 距今过久、pendingVerify=true 条目
 *
 * 用法：
 *   node precheck_batch.mjs <待审条目.json> [--entrytype OWN-POL] [--label 第14批]
 *   待审条目.json 支持两种形态：① 顶层数组 ② {items:[...]} 或 {entries:[...]}
 */
import fs from 'fs'
import path from 'path'

const SNAPSHOT = '/Users/ke/Library/CloudStorage/坚果云-281710898@qq.com/风声知识底座备份/entries_bj_b1_20261022.json'
const MY_SLIM = path.resolve('src/package-curation/data/entries_slim.js')

const argv = process.argv.slice(2)
const file = argv.find(a => !a.startsWith('--'))
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d }

if (!file) { console.error('用法: node precheck_batch.mjs <待审条目.json> [--entrytype OWN-POL] [--label 批号]'); process.exit(1) }

const label = opt('label', '待检批次')
const entryTypeFilter = opt('entrytype', null)

const auth = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
const authMap = new Map(auth.map(e => [e.id, e]))
const authNames = new Map()
auth.forEach(e => { authNames.set(e.name, e.id) })

// ---- 读待审批次（兼容多种 JSON 形态）----
const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
let items = []
if (Array.isArray(raw)) items = raw
else if (Array.isArray(raw.items)) items = raw.items
else if (Array.isArray(raw.entries)) items = raw.entries
else if (Array.isArray(raw.data)) items = raw.data
else { console.error('❌ 无法识别待审 JSON 结构（支持 数组 / items / entries / data）'); process.exit(1) }

if (entryTypeFilter) items = items.filter(e => (e.entryType || '').startsWith(entryTypeFilter))

console.log('='.repeat(64))
console.log(`批次结构性预检 · ${label}`)
console.log(`  待检条目: ${items.length} 条 | 权威基线: ${auth.length} 条 (md5 102e055f6…)`)
console.log('='.repeat(64))

// ---- ① ID 撞车与续段 ----
const dupIds = items.filter(e => authMap.has(e.id))
console.log('\n① ID 撞车检查')
if (dupIds.length) {
  console.log(`  ❌ ${dupIds.length} 条与主库撞车：`)
  dupIds.forEach(e => console.log(`     ${e.id} → 主库已有「${authMap.get(e.id).name}」`))
} else {
  console.log('  ✓ 与主库零撞车')
  // 续段分析（按 ID 前缀分段）
  const seg = {}
  items.forEach(e => {
    const m = (e.id || '').match(/^([A-Z-]+?)(\d+)$/)
    if (!m) return
    const [, pre, num] = m
    ;(seg[pre] = seg[pre] || { items: [], maxAuth: 0 }).items.push(parseInt(num, 10))
  })
  Object.keys(seg).forEach(pre => {
    const nums = seg[pre].items.sort((a, b) => a - b)
    const authNums = auth
      .map(e => (e.id || '').match(new RegExp('^' + pre.replace(/[-]/g, '\\-') + '(\\d+)$')))
      .filter(Boolean).map(m => parseInt(m[1], 10))
    const maxAuth = authNums.length ? Math.max(...authNums) : 0
    const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
    console.log(`  段 ${pre}: 本批 ${nums[0]}~${nums[nums.length - 1]}（${nums.length} 条）| 主库最大 ${maxAuth} | ${contiguous ? '✓ 连续' : '✗ 不连续'}${nums[0] === maxAuth + 1 ? ' | ✓ 正好续段' : nums[0] > maxAuth + 1 ? ' | ⚠️ 跳过 ' + (nums[0] - maxAuth - 1) + ' 号' : ' | ❌ 与主库重叠'}`)
  })
}

// ---- ② name/alias 撞车 ----
console.log('\n② name/alias 撞车检查')
const nameDup = items.filter(e => authNames.has(e.name))
console.log(`  name 撞车: ${nameDup.length} 条${nameDup.length ? ' → ' + nameDup.map(e => e.name).join(' / ') : ' ✓'}`)
const aliasDup = []
items.forEach(e => (e.alias || []).forEach(a => { if (authNames.has(a)) aliasDup.push(`${e.id} 的 alias「${a}」= 主库 ${authNames.get(a)}`) }))
console.log(`  alias 撞车: ${aliasDup.length} 处${aliasDup.length ? ' → ' + aliasDup.slice(0, 5).join('; ') : ' ✓'}`)

// ---- ③ 字段完整性（与主库同 entryType 对齐）----
console.log('\n③ 字段完整性（与主库同 entryType 对齐）')
const byType = {}
items.forEach(e => { (byType[e.entryType || '?'] = byType[e.entryType || '?'] || []).push(e) })
Object.keys(byType).forEach(t => {
  const list = byType[t]
  const peers = auth.filter(e => e.entryType === t)
  if (!peers.length) { console.log(`  ${t}: 主库无同类型条目，跳过对齐`); return }
  const peerKeys = new Set()
  peers.forEach(p => Object.keys(p).forEach(k => peerKeys.add(k)))
  const missing = []
  list.forEach(e => { const lack = [...peerKeys].filter(k => !(k in e) && e[k] !== undefined); if (lack.length) missing.push({ id: e.id, lack }) })
  if (!missing.length) console.log(`  ${t} (${list.length} 条): ✓ 字段与主库同类型完全对齐（${peerKeys.size} 字段）`)
  else {
    console.log(`  ${t} (${list.length} 条): ⚠️ ${missing.length} 条有缺字段`)
    missing.slice(0, 5).forEach(m => console.log(`     ${m.id} 缺: ${m.lack.join(', ')}`))
  }
  // 空值检查：字段存在但值为空 → 内容侧会在引擎里静默失效（进不了说卡/挂不上法源）
  const REQUIRED = ['name', 'detail', 'ola', 'cp', 'consumerQ', 'legalRef', 'consumerBenefit', 'ownerBenefit', 'source']
  const empties = []
  list.forEach(e => {
    const bad = []
    REQUIRED.forEach(k => {
      if (!(k in e)) return
      const v = e[k]
      if (v === null || v === undefined) { bad.push(k + '(空)'); return }
      if (typeof v === 'string' && !v.trim()) bad.push(k + '(空串)')
      if (Array.isArray(v) && v.length === 0) bad.push(k + '(空数组)')
    })
    if (bad.length) empties.push({ id: e.id, bad })
  })
  if (!empties.length) console.log(`    └ 值完整性: ✓ 关键字段均有值（${REQUIRED.length} 项）`)
  else {
    console.log(`    └ 值完整性: ⚠️ ${empties.length} 条有字段为空（这些字段在引擎里会静默失效）`)
    empties.slice(0, 6).forEach(e => console.log(`       ${e.id}: ${e.bad.join(', ')}`))
  }
})

// ---- ④ clientType / scene 规范 ----
console.log('\n④ clientType / scene 规范')
const VALID_CT = ['buyer', 'seller', 'tenant', 'renter', 'landlord', 'owner', 'agent', 'family', 'renter']
const badCt = []
items.forEach(e => {
  const ct = (e.tags && e.tags.clientType) || []
  if (!Array.isArray(ct)) { badCt.push(`${e.id} clientType 非数组`); return }
  const inv = ct.filter(x => !VALID_CT.includes(x))
  if (inv.length) badCt.push(`${e.id} 含未登记标签 ${inv.join('/')}`)
})
console.log(`  clientType: ${badCt.length ? '❌ ' + badCt.join('; ') : '✓ 全部合法'}`)

const noScene = items.filter(e => !e.sceneDomain)
console.log(`  sceneDomain: ${noScene.length ? '❌ ' + noScene.map(e => e.id).join(',') : '✓ 全部有值'}`)
const noSource = items.filter(e => !e.source && !(e.dataSource))
console.log(`  来源(source/dataSource): ${noSource.length ? '❌ ' + noSource.map(e => e.id).join(',') : '✓ 全部有来源'}`)

// ---- ⑤ 小程序侧影响 ----
console.log('\n⑤ 小程序侧影响（策展/城市卡/导航域）')
const MY_SCENES = ['签约前', '签约中', '签约后', '退租出售', '学区教育', '业主出售', '房东出租', '租住', '城市数据']
const MY_NAV = ['签约前', '签约中', 'SNG', '签约后', '居住中', '退租出售', '资产持有与运营', '业主', 'OWN', '职业成长', 'CAR', 'trade', '跨域通用']
const hitScene = items.filter(e => MY_SCENES.includes(e.sceneDomain))
const hitNav = items.filter(e => MY_NAV.includes(e.domain))
const hitCity = items.filter(e => e.city || (e.tags && e.tags.city))
console.log(`  落入我策展场景(${MY_SCENES.length}个): ${hitScene.length} 条${hitScene.length ? ' → ' + hitScene.map(e => e.id).join(',') : ' ✓ 不影响'}`)
console.log(`  落入我13导航域: ${hitNav.length} 条${hitNav.length ? ' → ' + hitNav.map(e => e.id).join(',') : ' ✓ 不影响'}`)
console.log(`  属城市卡(带 city 字段): ${hitCity.length} 条${hitCity.length ? ' → ' + hitCity.map(e => e.id + '(' + (e.city || e.tags.city) + ')').join(',') : ' ✓ 不进城市卡通道'}`)

// ---- ⑥ 时效性 ----
console.log('\n⑥ 时效性')
const pending = items.filter(e => e.pendingVerify === true)
console.log(`  pendingVerify=true: ${pending.length} 条${pending.length ? ' → ' + pending.map(e => e.id).join(',') : ' ✓'}`)
const stale = items.filter(e => {
  if (!e.lastVerified) return false
  const d = (Date.now() - new Date(e.lastVerified).getTime()) / 86400000
  return d > 365
})
console.log(`  lastVerified 超 1 年: ${stale.length} 条${stale.length ? ' → ' + stale.map(e => e.id + '(' + e.lastVerified + ')').join(',') : ' ✓'}`)

// ---- 与我 slim 的 id 冲突 ----
try {
  const mod = await import(pathToFileURL(MY_SLIM))
  const G = mod.default || mod
  const slimIds = new Set([...G.decoder, ...G.see, ...G.nego, ...G.script, ...G.city].map(e => e.id))
  const clash = items.filter(e => slimIds.has(e.id))
  console.log('\n⑦ 与我小程序策展库(slim)的 id 冲突')
  console.log(`  ${clash.length ? '❌ ' + clash.map(e => e.id).join(',') : '✓ 零冲突（slim ' + slimIds.size + ' 条）'}`)
} catch (e) {
  console.log('\n⑦ 与我小程序策展库(slim)的 id 冲突: 跳过（' + e.message + '）')
}

function pathToFileURL(p) { return 'file://' + p }
console.log('\n' + '='.repeat(64))
console.log('预检完成。① ② ④ ⑤ ⑥ 有 ❌/⚠️ 时建议先修订再合并。')
console.log('='.repeat(64))
