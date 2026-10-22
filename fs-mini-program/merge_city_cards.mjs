/**
 * 北京样板城市库 批1（2026-10-22）· CITY 21 条接入小程序策展库（第五组 city）
 *
 * 背景：权威主库 entries_bj_b1_20261022.json（6135 条 / md5 2e055f6b）新增
 *   CITY 类城市卡 21 条：税费计算 11 / 交易政策 4 / 贷款政策 6
 *   （北京，新 domain「城市数据」/ 新 sceneDomain「城市数据」/ toolType=城市卡）
 *   生哥口径：全部官网来源 + brokerUsage + city + stage 六阶段标注。
 *
 * 为什么需要字段族适配（CITY 与既有知识词条字段族不同）：
 *   主库 CITY 卡字段：city / stage / brokerUsage / dataSource[] / pendingVerify
 *   引擎消费字段：  cq / ola / cp / detail / consumerBenefit / ownerBenefit / legalRef
 *   实测 CITY 21 条：ola 0/21、cp 0/21、consumerQ 0/21、legalRef 0/21、
 *   consumerBenefit 0/21、alias 0/21 —— 原样接入会「永远进不了 say、挂不上法源徽标」。
 *
 * 适配规则（不新增事实，只做字段搬运与保守提取）：
 *   cq            ← name（城市卡本身以问句成文，如「不满2年卖房增值税现在交多少？」）
 *   ola           ← detail 首句（截至句号/分号止），空则回退 name
 *   cp            ← detail 拆句（按。；换行取前 3 句作为要点）
 *   detail        ← 原文
 *   legalRef      ← dataSource[].name 拼接（真实官网来源，**不是编造**；
 *                   URL 存入 legalUrl 单独字段，不混入法源文案）
 *   ownerBenefit  ← brokerUsage（经纪人用途，原文照搬，不改写）
 *   consumerBenefit ← brokerUsage（同上，语义上是"服务者视角的用法"）
 *   tags.clientType ← ['buyer','seller','agent']（税费/政策类买卖双方都要 → 三者皆可命中）
 *   tags.city / tags.stage ← 原样保留
 *   scene         ← '城市数据'（新增静态兜底域，引擎按需取用）
 *
 * 纪律：只新增 city 组，不改动既有 decoder/see/nego/script 任何条目。
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('.')
const SNAPSHOT = '/Users/ke/Library/CloudStorage/坚果云-281710898@qq.com/风声知识底座备份/entries_bj_b1_20261022.json'
const SLIM = path.join(ROOT, 'src/package-curation/data/entries_slim.js')
const DRY = process.argv.includes('--dry')

const auth = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
const cityCards = auth.filter(e => e.entryType === 'CITY')
if (cityCards.length !== 21) {
  console.error(`❌ CITY 条数异常：${cityCards.length}（期望 21）`)
  process.exit(1)
}

/** detail 首句 → 一句话结论（保守：到句号/分号/换行止；无标点则取前 60 字） */
function firstSentence(text) {
  if (!text) return ''
  const t = String(text).trim()
  const m = t.match(/^[^。；;\n]{6,80}[。；;]/)
  const s = (m ? m[0] : t.slice(0, 60)).replace(/[。；;]$/, '')
  return s.length >= 6 ? s : t.slice(0, 60)
}

/** detail 拆句 → 要点数组（最多 3 条，每条 ≥8 字） */
function splitPoints(text) {
  if (!text) return []
  return String(text)
    .split(/[。；;\n]/)
    .map(s => s.trim())
    .filter(s => s.length >= 8)
    .slice(0, 3)
}

/**
 * 主题词索引 → alias
 * 城市卡的 name 常是完整问句（"不满2年卖房增值税现在交多少？"），
 * 而经纪人实际会输入短词（"增值税"/"社保"/"五环"/"多子女"/"购房资格"）。
 * 若只靠 name，这些短词只能命中 detail（+1 分），排序不稳定、易答非所问。
 * 故按 subScene + 该条 name/detail 实际含有的主题词补 alias，使其与 name 同权重（+3 分）。
 *
 * ⚠️ 主题词必须**逐条判定**（该条目自己的 name/detail 含此主题才补），
 *    不能按 subScene 整批下发 —— 否则「印花税」条目会被塞进「契税」，
 *    查契税时返回印花税条目（实测曾发生），比不显示更糟。
 * 主题词取自主库该条目的 name/detail/subScene 原文，**不新增事实**。
 */
const THEME_LIST = [
  '契税', '增值税', '个人所得税', '个税', '印花税', '满五唯一', '满二', '满两年',
  '社保', '五环', '多子女', '二孩', '购房资格', '非京籍', '限购', '多买一套',
  '商贷', '商业贷款', '公积金', '首付', '利率', '贷款额度', '提取', '继承',
  '赠与', '退税', '合同', '装修'
]

function buildAliases(e) {
  const base = new Set(Array.isArray(e.alias) ? e.alias : [])
  const own = `${e.name} ${e.detail || ''}`
  THEME_LIST.forEach(theme => {
    if (own.includes(theme)) base.add(theme)
  })
  if (e.city) base.add(e.city)
  return [...base]
}

const out = cityCards.map(e => {
  const ds = Array.isArray(e.dataSource) ? e.dataSource : []
  const legalRef = ds.map(d => d.name).filter(Boolean).join('；')
  const legalUrl = ds.find(d => d && d.url)
  const ola = firstSentence(e.detail)
  const cp = splitPoints(e.detail)
  return {
    id: e.id,
    name: e.name,
    alias: buildAliases(e),
    cq: e.name,
    ola,
    cp,
    detail: e.detail || '',
    legalRef,
    legalUrl: legalUrl ? legalUrl.url : '',
    legalSite: legalUrl ? (legalUrl.site || '') : '',
    consumerBenefit: e.brokerUsage || '',
    ownerBenefit: e.brokerUsage || '',
    brokerUsage: e.brokerUsage || '',
    city: e.city || '',
    stage: e.stage || '',
    subScene: e.subScene || '',
    domain: e.domain || '城市数据',
    scene: '城市数据',
    entryType: 'CITY',
    toolType: e.toolType || '城市卡',
    severity: e.severity || '',
    lastVerified: e.lastVerified || '',
    pendingVerify: e.pendingVerify === true,
    source: e.source || '',
    tags: {
      clientType: ['buyer', 'seller', 'agent'],
      city: e.city || '北京',
      stage: e.stage || '',
      subScene: e.subScene || '',
      cityCard: true
    }
  }
})

console.log('=== 北京城市卡接入计划 ===')
console.log('  主库 CITY:', cityCards.length, '条')
const ss = {}
out.forEach(c => { ss[c.subScene] = (ss[c.subScene] || 0) + 1 })
Object.entries(ss).forEach(([k, v]) => console.log(`    ${k}: ${v}`))
const bad = out.filter(c => !c.ola || !c.cp.length || !c.legalRef)
console.log('  适配后缺 ola/cp/legalRef 的条数:', bad.length, bad.length ? bad.map(b => b.id).join(',') : '✓ 无')
console.log('  带 URL 的条数:', out.filter(c => c.legalUrl).length, '/21')
console.log('  样例 ola:', out[3].ola.slice(0, 60))
console.log('  样例 legalRef:', out[3].legalRef)
console.log('  样例 brokerUsage:', out[3].brokerUsage.slice(0, 50))

if (DRY) { console.log('\n[dry] 未写回'); process.exit(0) }

// ---- 写回 slim，新增 city 组 ----
const src = fs.readFileSync(SLIM, 'utf8')
const m = src.match(/export default (\{[\s\S]*\})\s*$/)
if (!m) { console.error('❌ 无法解析 entries_slim.js'); process.exit(1) }
const G = JSON.parse(m[1])
if (G.city && !process.argv.includes('--rebuild')) {
  console.log('⚠️ city 组已存在，跳过（--rebuild 可覆盖重建）')
  process.exit(0)
}
const existing = new Set([...G.decoder, ...G.see, ...G.nego, ...G.script].map(e => e.id))
const dup = out.filter(c => existing.has(c.id))
if (dup.length) { console.error('❌ 与既有条目 id 冲突:', dup.map(d => d.id).join(',')); process.exit(1) }

const next = { decoder: G.decoder, see: G.see, nego: G.nego, script: G.script, city: out }
const header = src.slice(0, src.indexOf('export default'))
fs.writeFileSync(SLIM, header + 'export default ' + JSON.stringify(next) + '\n')

console.log('\n✓ 已写回 city 组:', out.length, '条')
console.log('  既有组不变: decoder', G.decoder.length, '/ see', G.see.length, '/ nego', G.nego.length, '/ script', G.script.length)
