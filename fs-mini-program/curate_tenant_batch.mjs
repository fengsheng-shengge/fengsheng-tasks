// tenant 视角策展清单产出（v2 · 按 subScene 语义分类，不用关键词猜测）
// 口径锚定：小眼镜 10-16 租房线补产范围（家庭落户/子女就学/通勤 → 权益 → 决策）
// 同源纪律：与 RENT-TEN-001/002/003 同源同一权威基线（entries_5000.json），按 id 去重
import { readFileSync, writeFileSync } from 'fs'

const AUTH = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/知识底座生产/entries_5000.json'
const auth = JSON.parse(readFileSync(AUTH, 'utf8'))
const isTenant = e => ((e.tags && e.tags.clientType) || []).includes('tenant')

// ── 候选域：天然租客场景（租住 197 + 退租出售 50 = 247）──────────────
// 说明：居住中/跨域通用/CRO 里的 tenant 条目多为「装修施工」「买房决策」
//       「家电尺寸」等与租客决策弱相关或语义错位内容，不纳入（见 skipReason）
const RENT_SCENES = ['租住', '退租出售']

// ── subScene 语义 → 锚定分类映射（与 RENT-TEN 补产口径一致）─────────
const SUBSCENE_MAP = {
  // 家庭三题（对应租住线 ③ 家庭节点）
  '租住·生活规划': '家庭与规划',   // 租购/入学/社保等家庭决策
  '租住·新手入门': '家庭与规划',
  // 居住决策（对应 ① 起步 / ② 改善）
  '租住·挑选房源': '决策合租整租',
  '租住·地段选择': '决策合租整租',
  '租住·换租策略': '决策合租整租',
  '租住·合租生活': '决策合租整租',
  '租住·生活品质': '决策合租整租',
  '租住·生活修复': '决策合租整租',
  '租住·居住管理': '决策合租整租',
  // 权益（对应 ③ 家庭 / 权益类）
  '租住·权益保障': '租赁权益',
  '租住·风险保障': '租赁权益',
  '租住·风险管理': '租赁权益',
  '租住·维权途径': '租赁权益',
  '租住·合同签订': '租赁权益',
  '租住·费用结算': '租赁权益',
  '租住·税费财务': '租赁权益',
  '租住·签约入住': '租赁权益',
  '租住·合同到期': '租赁权益',
  // 履约与服务
  '租住·租期内服务': '租赁权益',
  '租住·生活维修': '租赁权益',
  '租住·生活安全': '租赁权益',
  '租住·邻里关系': '租赁权益',
  '租住·续约谈判': '租赁权益',
  '租住·转租换租': '租赁权益',
  '租住·退租押金': '租赁权益',
  '租住·退租换房': '租赁权益',
  '租住·签约退租': '租赁权益',
  '租住·政策福利': '租赁权益',
  '退租': '租赁权益'
}

// 租住线节点归属（决定策展 UI 命中面）
const CAT_TO_NODES = {
  '家庭与规划': ['family'],
  '租赁权益': ['start', 'family', 'quality'],
  '决策合租整租': ['start', 'rimprove']
}

// 策展分组：decoder=解码/决策、see=房源与居住匹配、nego=权益谈判与履约
function pickGroup (e, cat) {
  if (cat === '租赁权益') return 'nego'
  if (cat === '决策合租整租') return 'decoder'
  return 'decoder'
}

const pass = []
const skipped = []

for (const e of auth) {
  if (!isTenant(e)) continue
  const inScene = RENT_SCENES.includes(e.sceneDomain)
  const cat = SUBSCENE_MAP[e.subScene]

  // 质检（沿用知识库铁律）
  const hardQ = [
    ['detail≥130', (e.detail || '').length >= 130],
    ['ola≥21', (e.ola || '').length >= 21],
    ['cp≥1', (e.cp || []).length >= 1],
    ['cq 非空', !!(e.consumerQ || e.cq)],
    ['legalRef 真实', !!e.legalRef && !/待补充|待核|^无$|^-$/.test(String(e.legalRef)) && String(e.legalRef).trim().length >= 4]
  ].filter(([, v]) => !v).map(([k]) => k)

  if (!inScene) { skipped.push({ id: e.id, name: e.name, scene: e.sceneDomain, reason: '非租住/退租场景（多为装修施工、买卖决策等弱相关内容）' }); continue }
  if (!cat) { skipped.push({ id: e.id, name: e.name, scene: e.sceneDomain, sub: e.subScene, reason: 'subScene 未映射到锚定分类' }); continue }
  if (hardQ.length) { skipped.push({ id: e.id, name: e.name, scene: e.sceneDomain, sub: e.subScene, reason: '质检未达标：' + hardQ.join('/') }); continue }

  pass.push({ e, cat })
}

// ── 输出清单 ────────────────────────────────────────────────
const tenantTotal = auth.filter(isTenant).length
const manifest = {
  generatedAt: '2026-10-20',
  anchor: '小眼镜 2026-10-16 租房线补产口径（家庭三题起步 → 权益 → 决策），同源权威基线 entries_5000.json',
  rule: '按 sceneDomain∈{租住,退租出售} + subScene 语义映射筛选；按 id 去重；不覆盖既有条目',
  authorityTenantTotal: tenantTotal,
  selected: pass.length,
  skipped: skipped.length,
  skipReason: skipped.reduce((m, s) => { const k = s.reason.split('（')[0]; m[k] = (m[k] || 0) + 1; return m }, {}),
  byCategory: pass.reduce((m, p) => { m[p.cat] = (m[p.cat] || 0) + 1; return m }, {}),
  byGroup: pass.reduce((m, p) => { const g = pickGroup(p.e, p.cat); m[g] = (m[g] || 0) + 1; return m }, {}),
  byScene: pass.reduce((m, p) => { m[p.e.sceneDomain] = (m[p.e.sceneDomain] || 0) + 1; return m }, {}),
  items: pass.map(({ e, cat }) => ({
    id: e.id, name: e.name, cat, group: pickGroup(e, cat), nodes: CAT_TO_NODES[cat],
    scene: e.sceneDomain, sub: e.subScene, entryType: e.entryType, severity: e.severity,
    detailLen: (e.detail || '').length, cpCount: (e.cp || []).length,
    legalRef: e.legalRef, ownerBenefit: !!e.ownerBenefit, caseRefFilled: !/待补充/.test(String(e.caseRef || ''))
  })),
  skippedDetail: skipped
}
writeFileSync('/tmp/tenant_manifest.json', JSON.stringify(manifest, null, 2))

console.log('=== tenant 策展清单（v2 · subScene 语义映射）===')
console.log('权威库 tenant 总数:', tenantTotal)
console.log('本批通过并入:', pass.length)
console.log('跳过:', skipped.length)
Object.entries(manifest.skipReason).forEach(([k, v]) => console.log('   - ' + k + ': ' + v))
console.log('\n按锚定分类:', JSON.stringify(manifest.byCategory))
console.log('按策展分组:', JSON.stringify(manifest.byGroup))
console.log('按场景:', JSON.stringify(manifest.byScene))
console.log('\n=== 各分类抽样（4 条）===')
;['家庭与规划', '决策合租整租', '租赁权益'].forEach(c => {
  const s = pass.filter(p => p.cat === c).slice(0, 4)
  console.log(' [' + c + ']')
  s.forEach(({ e }) => console.log('   [' + e.id + '] ' + e.name + '  (' + e.subScene + ')'))
})
console.log('\n=== ownerBenefit / caseRef 缺口（需内容侧跟进）===')
console.log('  ownerBenefit 缺失:', pass.filter(p => !p.e.ownerBenefit).length, '/', pass.length)
console.log('  caseRef 待补充:', pass.filter(p => /待补充/.test(String(p.e.caseRef || ''))).length, '/', pass.length)
writeFileSync('/tmp/tenant_selected_ids.json', JSON.stringify(pass.map(p => ({ id: p.e.id, cat: p.cat, group: pickGroup(p.e, p.cat) }))))