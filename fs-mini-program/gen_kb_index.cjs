// 知识字典多维索引生成器
// 基于真实 src/data/entries.json 重建 src/utils/knowledge-search.js
// 输出支持「用户类型 / 业务阶段 / 业务域 / 工具类型」多维筛选的词条索引（不含 def 长文，控体积）
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, 'src/data/entries.json')
const OUT = path.resolve(__dirname, 'src/utils/knowledge-search.js')

const CT_MAP = { buyer: '买方', seller: '卖方', renter: '租客', tenant: '租客', landlord: '业主', owner: '业主', agent: '经纪人' }
const STAGE_MAP = { pre: '需求了解', mid: '看房·谈判', post: '售后·持有', all: '全阶段', selling: '售房中', holding: '持有中', own: '自住', sng: '单居', pst: '其他' }
const DOMAIN_MAP = {
  CAR: '交易·购车相关', OWN: '购房相关', trade: '交易通用',
  '签约前': '签约前', '签约中': '签约中', '签约后': '签约后',
  '居住中': '居住中', '业主': '业主侧', '资产持有与运营': '资产持有',
  '退租出售': '退租出售', '职业成长': '职业成长', '跨域通用': '跨域通用', SNG: '单居/单身'
}
const TOOL_TYPES = ['风险卡', '边界卡', '流程卡', '校准卡', '决策卡', '评估卡']

function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }
function normList(map, raw) { return [...new Set(arr(raw).map(k => map[k]).filter(Boolean))] }
function clip(s, n) { s = (s || '').toString().replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s }

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const out = []
for (const e of raw) {
  const title = (e.name || e.alias || '').trim()
  if (!title) continue
  const summary = clip(e.oneLineAnswer || e.corePoint || e.consumerBenefit || e.def, 80)
  const src = (e.source || e.legalRef || '').toString().trim()
  const clientType = normList(CT_MAP, e.tags && e.tags.clientType)
  const stage = normList(STAGE_MAP, e.tags && e.tags.stage)
  const domain = e.domain || ''
  const domainCn = DOMAIN_MAP[domain] || domain
  const toolType = TOOL_TYPES.includes(e.toolType) ? e.toolType : ''
  out.push({ id: e.id || '', title, domain, domainCn, clientType, stage, toolType, summary, src })
}

// 体积控制：按业务域均匀截断，每域最多 200 条，保证多维筛选覆盖且主包不超 2MB
const byDomain = {}
for (const e of out) (byDomain[e.domain] = byDomain[e.domain] || []).push(e)
const final = []
const DOMAIN_LIMIT = 200
for (const d of Object.keys(byDomain)) final.push(...byDomain[d].slice(0, DOMAIN_LIMIT))

// 维度筛选配置（facet）
const kbFacets = {
  clientTypes: ['买方', '卖方', '租客', '业主', '经纪人'],
  stages: ['需求了解', '看房·谈判', '售后·持有', '全阶段', '售房中', '持有中', '自住', '单居', '其他'],
  domains: Object.keys(DOMAIN_MAP).map(k => ({ key: k, cn: DOMAIN_MAP[k] })),
  toolTypes: TOOL_TYPES
}

const banner = `// 知识字典多维索引（自动生成自 src/data/entries.json 真实词条，非编造）
// 生成于 ${new Date().toISOString().slice(0, 10)}，共 ${final.length} 条（按业务域均匀截断，每域≤200）。支持 用户类型/业务阶段/业务域/工具类型 多维筛选。
// 字段：id/title/domain/domainCn/clientType[]/stage[]/toolType/summary/src
`
const body = banner +
  'export const kbFacets = ' + JSON.stringify(kbFacets, null, 2) + '\n\n' +
  'export const kbSearch = ' + JSON.stringify(final, null, 0) + '\n'

fs.writeFileSync(OUT, body, 'utf8')
console.log('generated', final.length, 'entries (from', out.length, ') ->', OUT)
console.log('bytes', body.length)
