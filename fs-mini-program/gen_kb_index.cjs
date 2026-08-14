// 知识字典多维索引生成器（v3.2 · 对齐网站版 9 组 facet）
// 基于真实 src/data/entries.json（5067 条结构化词条）重建 src/utils/knowledge-search.js
// 输出支持 9 组筛选：用户类型 / 业务阶段 / 代码域 / 业务职能域 / 知识层级(道法术器) / 词条类型 / 风险等级 / 优先级 / 业务场景
// 体积控制：按业务域均匀截断，每域最多 200 条，保证多维覆盖且主包不超 2MB
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, 'src/data/entries.json')
const OUT = path.resolve(__dirname, 'src/utils/knowledge-search.js')

// ===== 中文映射（与网站版一致）=====
const CT_MAP = { buyer: '买方', seller: '卖方', renter: '租客', tenant: '租客', landlord: '业主', owner: '业主', agent: '经纪人' }
const STAGE_MAP = { pre: '需求了解', mid: '看房·谈判', post: '售后·持有', all: '全阶段', selling: '售房中', holding: '持有中', own: '自住', sng: '单居', pst: '其他' }
const DOMAIN_MAP = {
  CAR: '交易·购车', OWN: '购房相关', trade: '交易通用',
  '签约前': '签约前', '签约中': '签约中', '签约后': '签约后',
  '居住中': '居住中', '业主': '业主侧', '资产持有与运营': '资产持有',
  '退租出售': '退租出售', '职业成长': '职业成长', '跨域通用': '跨域通用', SNG: '单居'
}
const SCENE_MAP = {
  '职业成长': '职业成长', '跨域通用': '跨域通用', 'CRO': '客户谈判', '退租出售': '退租出售',
  '居住中': '居住中', '资产持有与运营·业主侧': '资产持有', 'OWN': '购房相关', '业主侧': '业主侧',
  '资产持有与运营': '资产持有', '客户解码': '客户解码', '谈判斡旋': '谈判斡旋', '带看服务': '带看服务',
  '签约前': '签约前', '签约后': '签约后', '签约中': '签约中'
}
const LAYER_MAP = { dao: '道', fa: '法', shu: '术', qi: '器' }
const SEV_MAP = { hard: '红线', medium: '提醒', soft: '建议' }
const PRI_MAP = { P0: '最高优', P1: '高优', P2: '中优', P3: '一般' }
const ETYPE_MAP = { CASE: '案例', LAW: '法律', RISK: '风险', POL: '政策', STD: '标准', PROC: '流程', TERM: '术语' }
const TOOL_TYPES = ['风险卡', '边界卡', '流程卡', '校准卡', '决策卡', '评估卡']

function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }
function normList(map, raw) { return [...new Set(arr(raw).map(k => map[k]).filter(Boolean))] }
function clip(s, n) { s = (s || '').toString().replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s }

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const out = []
const subSceneCount = {}
for (const e of raw) {
  const title = (e.name || (e.alias && e.alias[0]) || '').trim()
  if (!title) continue
  const summary = clip(e.oneLineAnswer || e.corePoint || e.consumerBenefit || e.def, 80)
  const src = (e.source || e.legalRef || '').toString().trim()
  const clientType = normList(CT_MAP, e.tags && e.tags.clientType)
  const stage = normList(STAGE_MAP, e.tags && e.tags.stage)
  const layer = LAYER_MAP[e.tags && e.tags.layer] || ''
  const severity = SEV_MAP[e.severity] || ''
  const priority = PRI_MAP[e.priority] || ''
  const entryType = ETYPE_MAP[e.entryType] || ''
  const subScene = (e.subScene || '').toString().trim()
  const sceneDomain = SCENE_MAP[e.sceneDomain] || (e.sceneDomain || '').toString().trim()
  if (subScene) subSceneCount[subScene] = (subSceneCount[subScene] || 0) + 1
  const domain = e.domain || ''
  out.push({
    id: e.id || '', title, domain, domainCn: DOMAIN_MAP[domain] || domain,
    clientType, stage, layer, severity, priority, entryType, subScene, sceneDomain,
    toolType: TOOL_TYPES.includes(e.toolType) ? e.toolType : '',
    summary, src
  })
}

// 业务场景：取出现频次 ≥ 12 的（控数量），其余归入「其他」
const topSubScenes = Object.entries(subSceneCount)
  .filter(([, n]) => n >= 12)
  .sort((a, b) => b[1] - a[1])
  .map(([k]) => k)
const SUB_OTHER = '其他'
out.forEach(e => { if (e.subScene && !topSubScenes.includes(e.subScene)) e.subScene = SUB_OTHER })

// 体积控制：按业务域均匀截断，每域最多 200 条
const byDomain = {}
for (const e of out) (byDomain[e.domain] = byDomain[e.domain] || []).push(e)
const final = []
const DOMAIN_LIMIT = 200
for (const d of Object.keys(byDomain)) final.push(...byDomain[d].slice(0, DOMAIN_LIMIT))

// ===== 9 组 facet 配置 =====
const kbFacets = {
  clientTypes: ['买方', '卖方', '业主', '租客', '经纪人'],
  stages: ['需求了解', '看房·谈判', '售后·持有', '全阶段'],
  domains: Object.keys(DOMAIN_MAP).map(k => ({ key: k, cn: DOMAIN_MAP[k] })),
  sceneDomains: [...new Set(final.map(e => e.sceneDomain).filter(Boolean))].sort(),
  layers: ['道', '法', '术', '器'],
  entryTypes: ['案例', '法律', '风险', '政策', '标准', '流程', '术语'],
  severities: ['红线', '提醒', '建议'],
  priorities: ['最高优', '高优', '中优', '一般'],
  subScenes: [...topSubScenes, SUB_OTHER],
  toolTypes: TOOL_TYPES
}

const banner = `// 知识字典多维索引（自动生成自 src/data/entries.json 真实词条，非编造）
// 生成于 ${new Date().toISOString().slice(0, 10)}，共 ${final.length} 条（按业务域均匀截断，每域≤200）。
// 支持 9 组筛选：用户类型 / 业务阶段 / 代码域 / 业务职能域 / 知识层级(道法术器) / 词条类型 / 风险等级 / 优先级 / 业务场景
// 字段：id/title/domain/domainCn/clientType[]/stage[]/layer/severity/priority/entryType/subScene/sceneDomain/toolType/summary/src
`
const body = banner +
  'export const kbFacets = ' + JSON.stringify(kbFacets, null, 2) + '\n\n' +
  'export const kbSearch = ' + JSON.stringify(final, null, 0) + '\n'

fs.writeFileSync(OUT, body, 'utf8')
console.log('generated', final.length, 'entries (from', out.length, ') ->', OUT)
console.log('bytes', body.length)
