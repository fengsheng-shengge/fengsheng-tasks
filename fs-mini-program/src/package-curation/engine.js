// V3.0 策展引擎（见面参谋）· 确定性检索增强 · 不依赖 LLM
// 铁律：依据真不幻觉 —— 仅对真实 legalRef 挂依据徽标；缺失条目诚实标注；绝不编造。
import ENTRIES from '@/utils/entries_slim.js'

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

// ===== 场景化配置（V3.0.12 新增）=====
// 每个场景定义：关键词注入 + subScene 加权 + 场景化跟进 + 呈现工具推荐
export const SCENARIOS = {
  buy: {
    first_contact: {
      name: '首次接触', icon: 'handshake',
      kw: ['首次', '初次', '咨询', '了解', '来电', '到店', '见面'],
      subScenes: ['需求确认'],
      tool: '探需卡',
      followups: [
        { theme: '资格预审', text: '3天内帮客户完成购房资格预查，锁定真实购买力' },
        { theme: '区域初筛', text: '按客户预算和通勤偏好，整理2-3个候选板块供下次沟通' }
      ]
    },
    need_discovery: {
      name: '需求深挖', icon: 'search',
      kw: ['预算', '资格', '首付', '贷款', '公积金', '学区', '区域', '需求'],
      subScenes: ['需求确认', '资格审查'],
      tool: '需求画像报告',
      followups: [
        { theme: '预算锁定', text: '整理首付+月供+税费+隐性成本全口径预算表发给客户' },
        { theme: '资格确认', text: '跟进购房资格核验结果，确认限购套数和贷款成数' }
      ]
    },
    viewing: {
      name: '带看房源', icon: 'home',
      kw: ['看房', '带看', '实地', '户型', '朝向', '采光', '配套', '小区'],
      subScenes: ['房源匹配'],
      tool: '房源对比卡',
      followups: [
        { theme: '看房反馈', text: '见面后当天收集客户对每套房源的真实反馈，标记偏好' },
        { theme: '候选缩小', text: '按客户反馈缩小范围，下次带看2-3套精选房源' }
      ]
    },
    mandate: {
      name: '委托签约', icon: 'contract',
      kw: ['委托', '居间', '协议', '服务', '佣金', '独家'],
      subScenes: ['资格审查'],
      tool: '委托服务清单',
      followups: [
        { theme: '服务承诺', text: '发送书面服务承诺与看房计划，让客户安心' },
        { theme: '信息同步', text: '建立每周固定沟通节奏，同步带看进展和市场变化' }
      ]
    },
    negotiation: {
      name: '议价谈判', icon: 'balance',
      kw: ['价格', '议价', '砍价', '底价', '成交', '税费', '谈判'],
      subScenes: ['价格评估'],
      tool: '价格测算表',
      followups: [
        { theme: '价格跟进', text: '24小时内同步双方价格预期差异，给出斡旋建议' },
        { theme: '税费测算', text: '整理买卖双方各自承担的税费清单，避免签约时争议' }
      ]
    },
    contract: {
      name: '合同签署', icon: 'signature',
      kw: ['合同', '签约', '条款', '定金', '订金', '付款', '违约'],
      subScenes: ['合同条款', '定金订金', '付款方式'],
      tool: '合同要点清单',
      followups: [
        { theme: '签约跟进', text: '签约后发送合同关键条款摘要，标注重要时间节点' },
        { theme: '贷款对接', text: '协助客户对接银行贷款面签，跟进审批进度' }
      ]
    },
    handover: {
      name: '交房过户', icon: 'key',
      kw: ['交房', '过户', '验收', '交接', '物业', '登记', '不动产权'],
      subScenes: [],
      tool: '交房验收单',
      followups: [
        { theme: '验收跟进', text: '交房后7天内跟进发现的瑕疵问题，协调原业主修复' },
        { theme: '过户确认', text: '确认不动产证办理进度，同步客户领取时间' }
      ]
    },
    after_sale: {
      name: '售后关怀', icon: 'heart',
      kw: ['装修', '入住', '物业', '社区', '邻居', '入住体验'],
      subScenes: [],
      tool: '入住关怀卡',
      followups: [
        { theme: '入住关怀', text: '入住1个月后回访居住体验，提供社区资源对接' },
        { theme: '持续服务', text: '定期同步区域房价走势，帮客户跟踪资产价值' }
      ]
    }
  },
  rent: {
    first_contact: {
      name: '首次接触', icon: 'handshake',
      kw: ['租房', '租住', '出租', '租金', '合租', '整租', '见面'],
      subScenes: ['需求确认'],
      tool: '租住需求卡',
      followups: [
        { theme: '需求整理', text: '当天整理客户租住需求清单，确认预算和区域偏好' },
        { theme: '房源初筛', text: '2天内匹配3-5套候选房源，约定带看时间' }
      ]
    },
    need_match: {
      name: '需求匹配', icon: 'search',
      kw: ['匹配', '预算', '户型', '通勤', '期限', '合租', '需求'],
      subScenes: ['需求确认'],
      tool: '租住画像报告',
      followups: [
        { theme: '匹配优化', text: '按客户反馈调整匹配条件，缩小到2-3套优质候选' }
      ]
    },
    viewing: {
      name: '带看房源', icon: 'home',
      kw: ['看房', '带看', '实地', '采光', '噪音', '家电', '小区'],
      subScenes: [],
      tool: '房源对比卡',
      followups: [
        { theme: '看房反馈', text: '当天收集客户对每套房源的反馈，标记偏好和顾虑' }
      ]
    },
    mandate: {
      name: '委托签约', icon: 'contract',
      kw: ['委托', '居间', '协议', '佣金', '服务'],
      subScenes: [],
      tool: '委托服务清单',
      followups: [
        { theme: '服务承诺', text: '发送书面服务承诺，明确看房安排和沟通方式' }
      ]
    },
    lease_signing: {
      name: '合同签署', icon: 'signature',
      kw: ['合同', '租约', '押金', '租金', '维修', '转租', '续租'],
      subScenes: [],
      tool: '合同要点清单',
      followups: [
        { theme: '签约跟进', text: '发送租赁合同关键条款摘要，标注押金退还条件' }
      ]
    },
    move_in: {
      name: '入住交接', icon: 'key',
      kw: ['交接', '入住', '水电', '家电', '钥匙', '物品'],
      subScenes: [],
      tool: '交接清单',
      followups: [
        { theme: '入住跟进', text: '入住1周后回访居住体验，记录需维修项' }
      ]
    },
    move_out: {
      name: '退租续租', icon: 'refresh',
      kw: ['退租', '退房', '续租', '验房', '押金退还'],
      subScenes: [],
      tool: '退租验房单',
      followups: [
        { theme: '退租协助', text: '协助押金退还流程，同步房屋验收结果' },
        { theme: '续租关怀', text: '如续租，提前30天同步市场租金变化，帮客户谈判' }
      ]
    }
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

// ===== 主引擎 =====
export function generateCuration(input) {
  const { axisType = 'buy', axisNodeKey = 'improve', dimensions = [], freeText = '', scenario = '' } = input || {}
  const group = AXIS_GROUPS.find(g => g.type === axisType) || AXIS_GROUPS[0]
  const node = group.nodes.find(n => n.key === axisNodeKey) || group.nodes[0]
  const ct = group.clientType
  const sc = (SCENARIOS[axisType] || {})[scenario] || null

  // 1) 检索词集合
  const qKw = new Set([...node.kw])
  dimensions.forEach(dk => {
    const d = DIMENSIONS.find(x => x.key === dk)
    if (d) d.kw.forEach(k => qKw.add(k))
  })
  // 场景关键词注入
  if (sc) sc.kw.forEach(k => qKw.add(k))
  const freeTokens = tokenize(freeText)
  freeTokens.forEach(t => qKw.add(t))
  const qArr = [...qKw]

  // 2) 扁平化 + 打分
  const all = []
  for (const grpKey of ['decoder', 'see', 'nego']) {
    (ENTRIES[grpKey] || []).forEach(e => {
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
      // 客户类型硬过滤：词条 clientType 必须包含目标客户类型才保留
      // agent 标签表示"经纪人也应知道"，不等于"适用于所有客户类型"
      // 如 buyer+agent 的词条在租客场景下不出现
      const eCt = (e.tags && e.tags.clientType) || []
      if (eCt.length && !eCt.includes(ct)) return
      // 见前阶段（签约前/需求确认）轻微加权
      const stage = (e.tags && e.tags.stage) || ''
      if (String(stage).includes('pre') || (e.domain || '').includes('签约前')) score += 0.5
      // 场景 subScene 加权：命中该场景配置的 subScene 额外 +2
      if (sc && sc.subScenes.length && sc.subScenes.includes(e.subScene)) score += 2
      if (score > 0) all.push({ e, score, grp: grpKey })
    })
  }
  all.sort((a, b) => b.score - a.score)

  const topN = all.slice(0, 40)
  // 强相关判定：score>=4（至少一个名称/核心词命中），用于诚实元信息与说/问聚焦
  const strong = topN.filter(x => x.score >= 4)
  const strongCount = strong.length
  const realLegalStrong = strong.filter(x => isRealLegal(x.e.legalRef)).length

  // 3) 说（关键要点，优先含真实法源）—— 阈值提升到 score>=4 确保强匹配
  const sayRaw = topN
    .filter(x => x.score >= 4 && (x.e.ola || (x.e.cp && x.e.cp.length)))
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

  // 4) 带（看房/房源匹配方向，取自 see 组）—— 限定客户类型匹配
  const bring = topN
    .filter(x => x.grp === 'see')
    .slice(0, 4)
    .map(x => ({
      title: x.e.name,
      benefit: x.e.consumerBenefit || (x.e.detail || '').slice(0, 40)
    }))

  // 4b) 如果 see 组在该客户类型下无结果（如租客），从 decoder 组补充实用建议
  const bringFallback = bring.length === 0
    ? topN
        .filter(x => x.grp === 'decoder' && x.score >= 4 && x.e.consumerBenefit)
        .slice(0, 3)
        .map(x => ({
          title: x.e.name,
          benefit: x.e.consumerBenefit || (x.e.detail || '').slice(0, 40)
        }))
    : []

  // 5) 问（必问 cq，去重取相关）
  const seenQ = new Set()
  const ask = []
  for (const x of topN) {
    if (ask.length >= 5) break
    const q = x.e.cq
    if (q && !seenQ.has(q)) { seenQ.add(q); ask.push({ q }) }
  }

  // 6) 跟（见后跟进 / 持续关怀）
  // 场景化跟进优先；无场景时走原有节点+维度模板
  const followups = sc
    ? sc.followups.concat(buildDimensionFollowups(dimensions)).slice(0, 4)
    : buildFollowups(node, dimensions)

  // 7) 诚实元信息（绝不编造分数）
  const totalMatched = all.length
  const scenarioNote = sc && totalMatched === 0
    ? '该场景下暂无匹配词条。' + (axisType === 'rent' ? '租住类知识库持续扩充中' : '该场景词条待补充') + '，建议结合你的专业判断'
    : null
  const honesty = {
    matchedTotal: strongCount,
    realLegalCount: realLegalStrong,
    note: scenarioNote || (totalMatched === 0
      ? '该客户类型下暂无匹配词条。租住类知识库持续扩充中，建议结合你的专业判断补充'
      : strongCount < 3
        ? '匹配条目有限（' + totalMatched + ' 条），建议结合你的专业判断补充'
        : ('基于真实字典命中 ' + strongCount + ' 条强相关（其中 ' + realLegalStrong + ' 条含真实法源）'))
  }

  return {
    axisLabel: group.label + ' · ' + node.name,
    scenarioName: sc ? sc.name : '',
    scenarioIcon: sc ? sc.icon : '',
    recommendedTool: sc ? sc.tool : '',
    dimensionLabels: dimensions.map(dk => (DIMENSIONS.find(d => d.key === dk) || {}).name).filter(Boolean),
    freeText,
    say, bring: bring.length ? bring : bringFallback, ask, followups,
    honesty,
    timeline: buildTimeline()
  }
}

// 维度补充跟进（场景化跟进复用）
function buildDimensionFollowups(dimensions) {
  const dimText = []
  if (dimensions.includes('econ')) dimText.push({ theme: '费用透明', text: '持续关怀：整理本次交易全部成本清单，避免隐性支出' })
  if (dimensions.includes('conv')) dimText.push({ theme: '通勤实测', text: '见后跟进：提供早晚高峰通勤实测，增强决策依据' })
  return dimText
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
  return base.concat(buildDimensionFollowups(dimensions)).slice(0, 4)
}

// 三段式时间轴（见前/见面/见后）结构，供 UI 渲染
function buildTimeline() {
  return [
    { phase: '见前准备', tip: '看完策展包，标记要讲的 3 个要点与要问的 2 个问题', icon: '📋' },
    { phase: '见面执行', tip: '按「说→带→问」节奏推进，每条依据可当面点开给客户看', icon: '🤝' },
    { phase: '见后跟进', tip: '埋下引子 + 持续关怀，下次见面自动反哺客户认知', icon: '💌' }
  ]
}
