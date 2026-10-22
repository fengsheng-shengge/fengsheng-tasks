// V3.0 策展引擎（见面参谋）· 确定性检索增强 · 不依赖 LLM
// 铁律：依据真不幻觉 —— 仅对真实 legalRef 挂依据徽标；缺失条目诚实标注；绝不编造。
// V3.1：支持动态 API 数据（generateCurationAsync），静态数据作为降级兜底
// V3.8：领域配置解耦 —— 轴/节点/维度/跟进话术迁至 config/curation.config.js。
//      引擎只保留「与领域无关」的检索与生成逻辑，新增领域（资产运营/家装/特殊居住）
//      仅需改配置文件、不再改引擎代码，实现架构规划要求的「底层通用、上层替换」。
import ENTRIES from './data/entries_slim.js'
import {
  AXIS_GROUPS as _AXIS_GROUPS,
  DIMENSIONS as _DIMENSIONS,
  DOMAIN_DIMENSIONS as _DOMAIN_DIMENSIONS,
  FOLLOWUP_PLAYBOOKS as _FOLLOWUP_PLAYBOOKS,
  DIMENSION_FOLLOWUPS as _DIMENSION_FOLLOWUPS,
  DEFAULT_FOLLOWUPS as _DEFAULT_FOLLOWUPS
} from './config/curation.config.js'

const API_BASE = 'https://fengsheng.tech'

// ===== 运行时配置（默认取自配置文件，可被 registerDomain / applyConfig 覆盖）=====
// 之所以再包一层可变引用：Phase 2 起支持按领域热注册轴线，无需重新构建即可扩展。
const _config = {
  axisGroups: _AXIS_GROUPS,
  dimensions: [..._DIMENSIONS, ..._DOMAIN_DIMENSIONS],
  followupPlaybooks: _FOLLOWUP_PLAYBOOKS,
  dimensionFollowups: _DIMENSION_FOLLOWUPS,
  defaultFollowups: _DEFAULT_FOLLOWUPS,
  // 线上 API 尚未部署、需用静态同源数据补齐的策展域（数据兜底，非领域知识）
  staticFallbackScenes: ['学区教育', '业主出售', '房东出租', '租住']
}

// 兼容既有导出名（页面直接 import { AXIS_GROUPS, DIMENSIONS }）
export const AXIS_GROUPS = _config.axisGroups
export const DIMENSIONS = _config.dimensions

/**
 * 注册一个新领域轴线（Phase 2 资产运营 / Phase 3 家装 走此入口）。
 * @param {{type:string,label:string,clientType:string,nodes:Array<{key,name,kw,followups?}>}} group
 * @param {{playbooks?:object, dimensionFollowups?:object, scenes?:string[]}} [opts]
 * @returns {{ok:boolean, axisLabel?:string, issues?:string[]}}
 */
export function registerDomain(group, opts = {}) {
  const issues = []
  if (!group || !group.type || !group.label || !group.clientType) {
    return { ok: false, issues: ['group 必须含 type / label / clientType'] }
  }
  if (!Array.isArray(group.nodes) || group.nodes.length === 0) {
    return { ok: false, issues: [`领域「${group.type}」未提供 nodes`] }
  }
  if (_config.axisGroups.some(g => g.type === group.type)) {
    return { ok: false, issues: [`领域「${group.type}」已注册，请勿重复`] }
  }
  const existingKeys = new Set()
  _config.axisGroups.forEach(g => (g.nodes || []).forEach(n => existingKeys.add(n.key)))
  group.nodes.forEach(n => {
    if (!n.key || !n.name) issues.push('node 缺 key / name')
    if (!Array.isArray(n.kw) || !n.kw.length) issues.push(`节点「${n.key}」kw 为空`)
    if (existingKeys.has(n.key)) issues.push(`节点 key「${n.key}」与既有轴重复`)
  })

  _config.axisGroups = [..._config.axisGroups, group]
  if (opts.playbooks) _config.followupPlaybooks = { ..._config.followupPlaybooks, ...opts.playbooks }
  if (opts.dimensionFollowups) _config.dimensionFollowups = { ..._config.dimensionFollowups, ...opts.dimensionFollowups }
  if (Array.isArray(opts.scenes) && opts.scenes.length) {
    _config.staticFallbackScenes = [...new Set([..._config.staticFallbackScenes, ...opts.scenes])]
  }
  return { ok: issues.length === 0, axisLabel: group.label + ' · ' + (group.nodes[0] ? group.nodes[0].name : ''), issues }
}

/** 读取当前生效配置（调试 / 校验用） */
// ===== 业主侧价值「模板化」识别 =====
// 权威库 2026-10-22 批次回填的 400 条 ownerBenefit 为同一模板套用
// （"经纪人在「X」场景可离线调用：直接给出判定口径…"），非手写具体价值。
// 同页出现多条会一字不差 → 展示层过滤，不显示雷同模板句（内容侧另行补写）。
// 仅识别这一条已知模板，不误伤手写文案。
const OWNER_BENEFIT_TEMPLATE = /^经纪人在「[^」]*」场景可离线调用：直接给出判定口径与实操落点，见客户即用、控风险，减少查证与误判$/
function isTemplateOwnerBenefit(v) {
  return !!v && OWNER_BENEFIT_TEMPLATE.test(String(v).trim())
}

/** 业主侧价值：空 → null；模板套用句 → null（展示层不显示雷同文案）；真实手写 → 原值 */
function displayOwnerBenefit(v) {
  if (!v || !String(v).trim()) return null
  if (isTemplateOwnerBenefit(v)) return null
  return String(v).trim()
}

export function getCurationConfig() {
  return {
    axisGroups: _config.axisGroups,
    dimensions: _config.dimensions,
    followupPlaybooks: _config.followupPlaybooks,
    dimensionFollowups: _config.dimensionFollowups,
    staticFallbackScenes: _config.staticFallbackScenes
  }
}

// ===== 工具：真实法源判定（R2 边界）=====
function isRealLegal(ref) {
  if (!ref) return false
  const s = String(ref).trim()
  return !/待补充|待核|无|—|^-$|^\s*$/.test(s) && s.length >= 4
}

function tokenize(text) {
  if (!text) return []
  const out = []
  const cj = text.match(/[一-龥]{2,}/g) || []
  const en = text.match(/[a-zA-Z0-9]{2,}/g) || []
  return out.concat(cj, en)
}

function searchable(e) {
  return [e.name, (e.alias || []).join(' '), e.cq, e.ola, (e.cp || []).join(' '), e.detail, e.consumerBenefit]
    .filter(Boolean).join(' ')
}

// ===== API 字段 → 引擎字段归一化 =====
function normalizeEntry(apiEntry) {
  return {
    id: apiEntry.id || '',
    name: apiEntry.name || '',
    alias: apiEntry.alias || [],
    cq: apiEntry.consumerQ || '',
    ola: apiEntry.oneLineAnswer || '',
    cp: Array.isArray(apiEntry.corePoint) ? apiEntry.corePoint : (apiEntry.corePoint ? [apiEntry.corePoint] : []),
    detail: apiEntry.def || '',
    legalRef: apiEntry.legalRef || '',
    consumerBenefit: apiEntry.consumerBenefit || '',
    ownerBenefit: apiEntry.ownerBenefit || '',
    tags: apiEntry.tags || {},
    scene: apiEntry.sceneDomain || '',
    domain: apiEntry.domain || '',
    subScene: apiEntry.subScene || ''
  }
}

// ===== API 数据拉取（带缓存） =====
let _cachedEntries = null

async function fetchCurationEntries() {
  // 拉取签约前 + 签约中 两个域的全部词条，映射到 decoder / see / nego 三组
  const domainRequests = [
    { domain: '签约前', grp: 'decoder' },
    { domain: '签约中', grp: 'nego' }
  ]

  const grouped = { decoder: [], see: [], nego: [], script: [] }

  for (const { domain } of domainRequests) {
    const resp = await new Promise((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/api/entries?domain=${encodeURIComponent(domain)}&limit=1500`,
        method: 'GET',
        timeout: 12000,
        success: (res) => resolve(res.data || {}),
        fail: (err) => reject(err)
      })
    })

    const entries = (resp.entries || []).map(normalizeEntry)

    for (const e of entries) {
      if (e.domain === '签约前') {
        // see 组：房源匹配 / 价格评估（看房/带看方向）
        if (e.subScene === '房源匹配' || e.subScene === '价格评估') {
          grouped.see.push(e)
        }
        // decoder 组：需求确认 / 资格审查 / 及其他签约前子场景
        if (e.subScene === '需求确认' || e.subScene === '资格审查') {
          grouped.decoder.push(e)
        } else if (e.subScene !== '房源匹配' && e.subScene !== '价格评估') {
          // 其他签约前子场景（如融资贷款、风险识别、合同审查等）也归入 decoder
          grouped.decoder.push(e)
        }
      } else if (e.domain === '签约中') {
        // nego 组：全部签约中词条
        grouped.nego.push(e)
      }
    }
  }

  // ===== 补齐 API 未部署的策展域（学区教育/业主出售/房东出租/租住）=====
  // 线上 API 已 serve 签约前/签约中/OWN/职业成长/签约后/居住中/退租出售 7 个域；
  // 策展依赖的另几个域（静态同源数据中有、API 暂无），用静态数据补齐并按 id 去重
  // ——后端将来部署这些域后，API 数据自动优先、不重复。
  // 域清单来自配置（config/curation.config.js / _config.staticFallbackScenes），
  // 新领域上线时走 registerDomain({ scenes }) 追加，无需改本引擎。
  const seenIds = new Set(
    [...grouped.decoder, ...grouped.see, ...grouped.nego].map(e => e.id)
  )
  const apiMissingScenes = _config.staticFallbackScenes
  for (const grp of ['decoder', 'see', 'nego']) {
    for (const e of (ENTRIES[grp] || [])) {
      if (apiMissingScenes.includes(e.scene) && !seenIds.has(e.id)) {
        grouped[grp].push(e)
        seenIds.add(e.id)
      }
    }
  }

  // 剧本卡（阶段二批1 · SCRIPT 26 条）：只存在于静态同源数据，后端尚无该域，
  // 故始终取静态、并在 API 路径下也注入，保证在线/离线两种模式下剧本都可用。
  grouped.script = (ENTRIES.script || []).slice()

  return grouped
}

// ===== 主引擎（同步版 · 静态数据） =====
export function generateCuration(input) {
  return generateCurationFromEntries(input, ENTRIES)
}

// ===== 主引擎（异步版 · API 数据，静态数据兜底） =====
export async function generateCurationAsync(input) {
  try {
    if (!_cachedEntries) {
      _cachedEntries = await fetchCurationEntries()
    }
    return generateCurationFromEntries(input, _cachedEntries)
  } catch (e) {
    console.warn('[curation] API fetch failed, falling back to static data:', e.message)
    // 降级：使用静态数据
    return generateCuration(input)
  }
}

// ===== 影响力原理标注（引擎内嵌 · 经纪人可见） =====
// 映射关系：触发动因 / 内心矛盾 / 底线让步 → 影响策展内容的呈现策略
function enrichWithInfluence(insight, say, ask, followups) {
  if (!insight) return { say, ask, followups }

  const principleMap = {
    'family_birth':    '👶 家庭变化触发（互惠预期↑）',
    'family_marriage': '💍 新婚承诺触发（承诺一致↑）',
    'family_elder':    '👴 养老责任触发（互惠+社会认同）',
    'family_school':   '🏫 教育节点触发（时间压力+稀缺）',
    'external_expiry': '📅 租约到期触发（时间压力）',
    'external_transfer': '🏢 工作调动触发（环境变化）',
    'external_commute': '🚇 通勤痛点触发（痛点放大）',
    'external_defect':  '🏠 现居缺陷触发（痛点+对比）',
    'time_school':     '📋 入学节点触发（稀缺+时间压力）',
    'time_limit':      '⏰ 置换窗口期触发（时间稀缺）',
    'time_other':      '📌 其他时间压力',
  }
  const conflictMap = {
    'school':    '🔴 学区 vs 预算矛盾（稀缺原理）',
    'metro':     '🚇 地铁 vs 价格矛盾（对比原理）',
    'budget':    '💰 预算红线（承诺一致）',
    'floor':     '🏢 楼层偏好',
    'orientation': '🧭 朝向要求',
    'elevator':  '🛗 电梯要求（安全需求）',
    'noise':     '🔇 噪音控制（健康需求）',
    'title':     '📜 产权清晰（风险规避）',
  }

  const activeTriggers  = insight.triggerEvents  || []
  const activeConflicts = insight.hardBottomLines || []
  const activeFlexes   = insight.flexibleItems   || []
  const activeRisks    = insight.riskItems       || []
  const dmStances      = insight.decisionMakerStances || []
  const lifeVision     = insight.lifeVision      || ''

  // 顾虑映射：顾虑类型 → 对应的需求安抚策略
  const riskStrategyMap = {
    'fear_expensive': '【价格锚定】提供近期同小区/同板块成交记录，用真实数据打消「买贵」焦虑',
    'fear_mortgage':  '【月供安心】主动提供月供压力测算，让客户对持有成本有清晰预期',
    'fear_devalue':   '【长线价值】呈现区域发展规划与配套落地节奏，强调持有的确定性',
    'fear_family':    '【家庭对齐】提案前先分别与核心决策人单独对齐，避免带看时意见冲突',
    'fear_policy':    '【政策权威】提供教育局/规划委官方文件摘录，用权威来源消除不确定性',
    'fear_delivery':  '【交楼保障】核对五证+预售资金监管楼盘，降低交楼不确定性感知',
    'fear_liquidity': '【流通预判】提供近6个月板块成交量与挂牌去化周期数据，增强流动性信心',
    'fear_quality':   '【品质背书】查找该开发商近期交付项目业主评价，提供第三方验收报告',
  }

  // 决策人立场 → 经纪人带看前准备重点
  const dmAdviceMap = {
    'commute': '带看前：提前实测通勤路线，准备早晚高峰实拍视频',
    'school':  '带看前：核实目标学校最新招生简章，标注落户年限要求',
    'budget':  '带看前：准备好完整费用清单（月供+税费+中介费），避免现场超预期',
    'floor':   '带看前：确认楼层偏好，现场带看时优先看满意楼层房源',
    'quality': '带看前：了解改善型客户对品质的具体定义（面积/装修/得房率）',
    'safety':  '带看前：核查产权清晰度，准备产权调查简要说明',
    'other':   '带看前：按备注中的个性化诉求做针对性准备',
  }

  const enrichedSay = say.map((s, i) => {
    let principles = []
    if (activeTriggers.length) principles.push('触发动机：' + activeTriggers.map(t => principleMap[t] || t).join(' / '))
    if (i === 0 && activeConflicts.length) principles.push('底线：' + activeConflicts.map(c => conflictMap[c] || c).join(' / '))
    if (i === say.length - 1 && activeFlexes.length) principles.push('可让步：' + activeFlexes.join('、') + '（可适度放大）')
    return { ...s, influencePrinciples: principles.length ? principles : null }
  })

  const enrichedAsk = ask.map((a, i) => {
    let insightHint = ''
    if (i === 0 && activeTriggers.length > 0)  insightHint = '【探互惠/承诺一致】追问具体时间节点和感受'
    if (i === 1 && activeConflicts.length > 0)  insightHint = '【探对比原理】了解底线之上的理想标准'
    if (i === 2 && activeFlexes.length > 0)    insightHint = '【探稀缺敏感度】问客户对稀缺信号的接受程度'
    // V3.7：顾虑探问策略
    if (activeRisks.length > 0 && i === ask.length - 1) {
      const topRisk = activeRisks[0]
      insightHint = (insightHint ? insightHint + '；' : '') + '【探' + (riskStrategyMap[topRisk] ? riskStrategyMap[topRisk].match(/【(.+?)】/)[1] : '顾虑') + '】'
    }
    return { ...a, insightHint: insightHint || null }
  })

  const enrichedFollowups = followups.map((f, i) => {
    let note = ''
    if (i === 0) note = '互惠时机：首次跟进建议提供有价值的轻量信息（如板块行情/政策动态），不要直接索求'
    if (i === followups.length - 1 && activeTriggers.length > 0) {
      const triggers = activeTriggers.map(t => principleMap[t] || t).join('、')
      note += (note ? '；' : '') + '社会认同时机：分享近期相似动因客户成交案例'
    }
    // V3.7：顾虑应对策略注入到跟进内容
    if (activeRisks.length > 0 && i === 1) {
      const topRisk = activeRisks[0]
      const strategy = riskStrategyMap[topRisk] || ''
      note += (note ? '；' : '') + '顾虑应对[' + topRisk + ']：' + strategy.replace(/^【.+?】/, '')
    }
    // V3.7：决策人立场 → 带看前准备提醒
    if (dmStances.length > 0 && i === 0) {
      const st = dmStances[0]
      const advice = st.stanceType ? (dmAdviceMap[st.stanceType] || '按个性化诉求准备') : '确认决策人核心诉求'
      note += (note ? '；' : '') + '决策人准备：' + (st.name || '主要决策人') + ' — ' + advice
    }
    return { ...f, reciprocityNote: note || null }
  })

  return { say: enrichedSay, ask: enrichedAsk, followups: enrichedFollowups }
}

// ===== 核心引擎逻辑（与数据源无关） =====
function generateCurationFromEntries(input, entriesByGroup) {
  const {
    axisType = 'buy',
    axisNodeKey = 'improve',
    dimensions = [],
    freeText = '',
    // ★ V3.6+V3.7 影响力原理参数（来自深层洞察）
    triggerEvents = [],
    triggerRemark = '',
    customerConflict = '',
    hardBottomLines = [],
    flexibleItems = [],
    // V3.7 新增
    riskItems = [],
    decisionMakerStances = [],
    lifeVision = ''
  } = input || {}
  const group = _config.axisGroups.find(g => g.type === axisType) || _config.axisGroups[0]
  const node = group.nodes.find(n => n.key === axisNodeKey) || group.nodes[0]
  const ct = group.clientType

  // 1) 检索词集合
  const qKw = new Set([...node.kw])
  dimensions.forEach(dk => {
    const d = _config.dimensions.find(x => x.key === dk)
    if (d) d.kw.forEach(k => qKw.add(k))
  })
  const freeTokens = tokenize(freeText)
  freeTokens.forEach(t => qKw.add(t))
  const qArr = [...qKw]

  // 2) 扁平化 + 打分
  const all = []
  for (const grpKey of ['decoder', 'see', 'nego']) {
    (entriesByGroup[grpKey] || []).forEach(e => {
      const text = searchable(e)
      let score = 0
      qArr.forEach(kw => {
        if (!kw) return
        const inName = (e.name || '').includes(kw) || (e.alias || []).some(a => a.includes(kw))
        const inCore = (e.cq || '').includes(kw) || (e.ola || '').includes(kw) || (e.cp || []).some(c => c.includes(kw))
        const inBody = text.includes(kw)
        if (inName) score += 3
        else if (inCore) score += 2
        else if (inBody) score += 1
      })
      // 客户类型匹配（不匹配大幅降权，匹配则加权，让租住线优先租客、购房线优先买家）
      const eCt = (e.tags && e.tags.clientType) || []
      if (eCt.length && !eCt.includes(ct)) score *= 0.15
      else if (eCt.length && eCt.includes(ct)) score *= 1.5
      // 见前阶段（签约前/需求确认）轻微加权
      const stage = (e.tags && e.tags.stage) || ''
      if (String(stage).includes('pre') || (e.domain || '').includes('签约前')) score += 0.5
      if (score > 0) all.push({ e, score, grp: grpKey })
    })
  }
  all.sort((a, b) => b.score - a.score)

  const topN = all.slice(0, 40)
  // 强相关判定：score>=4（至少一个名称/核心词命中），用于诚实元信息与说/问聚焦
  const strong = topN.filter(x => x.score >= 4)
  const strongCount = strong.length
  const realLegalStrong = strong.filter(x => isRealLegal(x.e.legalRef)).length

  // 3) 说（关键要点，优先含真实法源）
  const sayRaw = topN
    .filter(x => x.score >= 3 && (x.e.ola || (x.e.cp && x.e.cp.length)))
    .slice(0, 12)
    .sort((a, b) => (isRealLegal(b.e.legalRef) ? 1 : 0) - (isRealLegal(a.e.legalRef) ? 1 : 0) || b.score - a.score)
  const say = sayRaw.slice(0, 5).map(x => ({
    title: x.e.name,
    point: x.e.ola || (x.e.cp && x.e.cp[0]) || '',
    detail: (x.e.cp && x.e.cp.slice(0, 2).join('；')) || '',
    legalRef: isRealLegal(x.e.legalRef) ? x.e.legalRef : null,
    hasLegal: isRealLegal(x.e.legalRef),
    ownerBenefit: displayOwnerBenefit(x.e.ownerBenefit),
    entryId: x.e.id
  }))

  // 4) 带（看房/房源匹配方向，取自 see 组）
  const bring = topN
    .filter(x => x.grp === 'see')
    .slice(0, 4)
    .map(x => ({
      title: x.e.name,
      benefit: x.e.consumerBenefit || (x.e.detail || '').slice(0, 40)
    }))

  // 5) 问（必问 cq，去重取相关）
  const seenQ = new Set()
  const ask = []
  for (const x of topN) {
    if (ask.length >= 5) break
    const q = x.e.cq
    if (q && !seenQ.has(q)) { seenQ.add(q); ask.push({ q }) }
  }

  // 6) 跟（见后跟进 / 持续关怀，按节点 + 维度，禁用操纵词）
  const followups = buildFollowups(node, dimensions)

  // ★ V3.6+V3.7 影响力原理注入（经纪人可见标注）
  const influenceInsight = {
    triggerEvents, triggerRemark, customerConflict,
    hardBottomLines, flexibleItems,
    // V3.7 新增
    riskItems, decisionMakerStances, lifeVision
  }
  const enriched = enrichWithInfluence(influenceInsight, say, ask, followups)

  // 7) 诚实元信息（绝不编造分数）
  const honesty = {
    matchedTotal: strongCount,
    realLegalCount: realLegalStrong,
    note: strongCount < 3
      ? '匹配条目有限，建议结合你的专业判断补充'
      : ('基于真实字典命中 ' + strongCount + ' 条强相关（其中 ' + realLegalStrong + ' 条含真实法源）')
  }

  // 2.5) 剧本卡挂载（阶段二批1 · SCRIPT 26 条）
  // 剧本卡是「话术脚本」形态（scriptText/taboos/aiDrill），与知识词条不同，
  // 不参与关键词打分（无 cq/ola/cp/detail），而是按 MOT 场景 + 节点匹配后
  // 挂到策展结果，作为「标准话术 / 禁忌 / AI陪练」供经纪人直接照读。
  const scriptPool = entriesByGroup.script || ENTRIES.script || []
  const matchedScripts = scriptPool.filter(s => {
    const nodes = (s.tags && s.tags.nodes) || []
    return nodes.includes(node.key)
  })
  const scripts = matchedScripts.slice(0, 3).map(s => ({
    id: s.id,
    name: s.name,
    mot: s.mot,
    scene: s.scene,
    branch: s.branch,
    scriptText: s.scriptText,
    keyPoints: s.keyPoints || [],
    taboos: s.taboos || [],
    aiDrill: s.aiDrill || '',
    abilityRef: s.abilityRef || ''
  }))

  return {
    axisLabel: group.label + ' · ' + node.name,
    dimensionLabels: dimensions.map(dk => (_config.dimensions.find(d => d.key === dk) || {}).name).filter(Boolean),
    freeText,
    say: enriched.say,
    bring,
    ask: enriched.ask,
    followups: enriched.followups,
    scripts,
    honesty,
    timeline: buildTimeline()
  }
}

// 见后跟进：按节点 + 维度生成，语言用「见后跟进/持续关怀」，禁用钩子/策略/转化
// V3.8：话术剧本已迁至 config/curation.config.js（DOMAIN_FOLLOWUP_PLAYBOOKS / DIMENSION_FOLLOWUPS），
//      扩领域时增配置项即可，本函数不再持有领域相关硬编码。
function buildFollowups(node, dimensions) {
  // 话术来源优先级：节点内联 followups > 剧本表 followupPlaybooks > 全领域兜底
  const base = (Array.isArray(node.followups) && node.followups.length)
    ? node.followups
    : (_config.followupPlaybooks[node.key] || _config.defaultFollowups)
  // 维度补充（经济/学区相关关怀）
  const dimText = []
  dimensions.forEach(dk => {
    const add = _config.dimensionFollowups[dk]
    if (Array.isArray(add)) dimText.push(...add)
  })
  return base.concat(dimText).slice(0, 4)
}

// 三段式时间轴（见前/见面/见后）结构，供 UI 渲染
function buildTimeline() {
  return [
    { phase: '见前准备', tip: '看完策展包，标记要讲的 3 个要点与要问的 2 个问题', icon: '📋' },
    { phase: '见面执行', tip: '按「说→带→问」节奏推进，每条依据可当面点开给客户看', icon: '🤝' },
    { phase: '见后跟进', tip: '埋下引子 + 持续关怀，下次见面自动反哺客户认知', icon: '💌' }
  ]
}