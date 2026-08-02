// V3.0 策展引擎（见面参谋）· 确定性检索增强 · 不依赖 LLM
// 铁律：依据真不幻觉 —— 仅对真实 legalRef 挂依据徽标；缺失条目诚实标注；绝不编造。
// V3.1：支持动态 API 数据（generateCurationAsync），静态数据作为降级兜底
import ENTRIES from './data/entries_slim.js'

const API_BASE = 'https://fengsheng.tech'

// ===== 双纵轴节点（购5 / 租4）与检索关键词 =====
export const AXIS_GROUPS = [
  {
    type: 'buy', label: '购房线', clientType: 'buyer',
    nodes: [
      { key: 'first', name: '① 首套', kw: ['首套', '首次', '刚需', '新房', '第一次买房', '结婚', '婚房'] },
      { key: 'improve', name: '② 改善', kw: ['改善', '换房', '置换', '卖旧买新', '换大', '二套', '卖一买一'] },
      { key: 'edu', name: '③ 教育', kw: ['学区', '入学', '教育', '上学', '划片', '学位', '孩子'] },
      { key: 'upgrade', name: '④ 升级', kw: ['升级', '品质', '置换', '资产', '换房', '豪宅'] },
      { key: 'elder', name: '⑤ 适老', kw: ['适老', '养老', '老人', '父母', '无障碍', '电梯'] }
    ]
  },
  {
    type: 'rent', label: '租住线', clientType: 'tenant',
    nodes: [
      { key: 'start', name: '① 起步', kw: ['租房', '首次租房', '租', '合租', '预算', '上班'] },
      { key: 'rimprove', name: '② 改善', kw: ['租住改善', '换租', '改善租', '更大', '独立'] },
      { key: 'family', name: '③ 家庭', kw: ['家庭', '孩子', '学区', '陪读', '户型'] },
      { key: 'quality', name: '④ 品质', kw: ['品质', '装修', '社区', '服务', '安静'] }
    ]
  }
]

// ===== 住得好七维 与检索关键词 =====
export const DIMENSIONS = [
  { key: 'safety', name: '物质安全', kw: ['产权', '安全', '物业', '隔音', '消防', '质量'] },
  { key: 'health', name: '健康', kw: ['采光', '通风', '噪音', '环境', '甲醛', '绿化', '空气'] },
  { key: 'conv', name: '便利', kw: ['通勤', '地铁', '配套', '商圈', '学校', '医院', '交通'] },
  { key: 'econ', name: '经济', kw: ['预算', '价格', '税费', '成本', '月供', '首付', '划算', '费用'] },
  { key: 'comfort', name: '舒适', kw: ['户型', '朝向', '采光', '楼层', '空间', '通风'] },
  { key: 'beauty', name: '美观', kw: ['装修', '风格', '颜值', '设计', '外观'] },
  { key: 'free', name: '自在', kw: ['邻里', '社区', '安静', '氛围', '自在'] }
]

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

  const grouped = { decoder: [], see: [], nego: [] }

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

// ===== 核心引擎逻辑（与数据源无关） =====
function generateCurationFromEntries(input, entriesByGroup) {
  const { axisType = 'buy', axisNodeKey = 'improve', dimensions = [], freeText = '' } = input || {}
  const group = AXIS_GROUPS.find(g => g.type === axisType) || AXIS_GROUPS[0]
  const node = group.nodes.find(n => n.key === axisNodeKey) || group.nodes[0]
  const ct = group.clientType

  // 1) 检索词集合
  const qKw = new Set([...node.kw])
  dimensions.forEach(dk => {
    const d = DIMENSIONS.find(x => x.key === dk)
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
      // 客户类型匹配（不匹配大幅降权，但不直接丢弃）
      const eCt = (e.tags && e.tags.clientType) || []
      if (eCt.length && !eCt.includes(ct)) score *= 0.15
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

  // 7) 诚实元信息（绝不编造分数）
  const honesty = {
    matchedTotal: strongCount,
    realLegalCount: realLegalStrong,
    note: strongCount < 3
      ? '匹配条目有限，建议结合你的专业判断补充'
      : ('基于真实字典命中 ' + strongCount + ' 条强相关（其中 ' + realLegalStrong + ' 条含真实法源）')
  }

  return {
    axisLabel: group.label + ' · ' + node.name,
    dimensionLabels: dimensions.map(dk => (DIMENSIONS.find(d => d.key === dk) || {}).name).filter(Boolean),
    freeText,
    say, bring, ask, followups,
    honesty,
    timeline: buildTimeline()
  }
}

// 见后跟进：按节点 + 维度生成，语言用「见后跟进/持续关怀」，禁用钩子/策略/转化
function buildFollowups(node, dimensions) {
  const map = {
    first: [{ theme: '资格核验', text: '3 天内跟进购房资格与贷款额度测算，帮客户锁定真实预算' },
            { theme: '区域筛选', text: '持续关怀：按通勤与学区优先级，整理 2–3 个候选板块' }],
    improve: [{ theme: '旧房处置', text: '跟进现住房处置进度（在售/已售），衔接换房节奏' },
              { theme: '低密盘带看', text: '下周带看同板块低密改善盘，对比得房率与物业档次' }],
    edu: [{ theme: '划片公示', text: '开学季前帮盯目标校划片公示，第一时间同步客户' },
           { theme: '学位核实', text: '持续关怀：核实落户年限要求，避免政策误读' }],
    upgrade: [{ theme: '资产配置', text: '跟进置换后的资产结构，提供持有成本测算' }],
    elder: [{ theme: '适老改造', text: '跟进无障碍与电梯需求，整理适老改造要点' }],
    start: [{ theme: '预算对齐', text: '跟进可接受租金区间，缩小候选范围' }],
    rimprove: [{ theme: '换租节奏', text: '跟进租约到期时间，提前规划换租' }],
    family: [{ theme: '户型匹配', text: '持续关怀：按家庭结构推荐合适户型与楼层' }],
    quality: [{ theme: '社区服务', text: '跟进对物业与社区服务的真实体验反馈' }]
  }
  const base = map[node.key] || [{ theme: '持续关怀', text: '见面后 1–2 天做轻量跟进，确认客户还有哪些顾虑' }]
  // 维度补充（经济/学区相关关怀）
  const dimText = []
  if (dimensions.includes('econ')) dimText.push({ theme: '费用透明', text: '持续关怀：整理本次交易全部成本清单，避免隐性支出' })
  if (dimensions.includes('conv')) dimText.push({ theme: '通勤实测', text: '见后跟进：提供早晚高峰通勤实测，增强决策依据' })
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