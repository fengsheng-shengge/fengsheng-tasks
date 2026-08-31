/**
 * MOT② 需求洞察 v1.3 · 公共模块（问诊页与报告页共用）
 *
 * 设计依据：生哥 2026-08-28 确认的 v1.2 产品方案 → v1.3 视觉与业务补齐版。
 * 六步：①为什么买 ②为什么是现在买 ③谁住住多久 ④三圈法则 ⑤深挖追问+六维现状 ⑥预算 ⑦决策人 ⑧⑨归纳确认
 *
 * 关键约定：
 *   1) 报告 type 复用 'insight' —— mot.js 的闸门1（gateInsightConfirmed）只认这个 type，
 *      新开 type 会让「需求未确认 → 提案禁用」的闸门失效。引擎版本用 engine 字段区分。
 *   2) 版本 = 该客户 insight(engine=mot2-v1.3) 报告累计条数 + 1，append-only，旧版本不覆盖。
 *   3) 客户极简版必须剥离：六维评分、提问脚手架、表层/派生/隐性诉求分层、经纪人内部判断。
 */

export const ENGINE = 'mot2-v1.3'
export const REPORT_TYPE = 'insight'
export const DRAFT_KEY = 'fs_insight2_draft_'   // 草稿：+ clientId
export const DEMO_KEY = 'fs_insight2_demo'      // 无客户时的演示草稿

export const LABELS = {
  child_school: '孩子上学', elder: '老人同住/养老', marriage: '结婚婚房', upgrade: '改善换大', commute: '通勤便利', invest: '投资保值',
  must: '必须买', should: '应该买', can: '可以买',
  half: '半年内', one: '1年内', three: '1-3年', threePlus: '3年以上', unsure: '没想好',
  couple: '夫妻', kid1: '1孩', kid2: '2孩', elderLive: '老人同住', pet: '宠物',
  d3: '3年内', d35: '3-5年', d510: '5-10年', dLong: '长期',
  life_main: '生活圈', life_mid: '生活圈', life_low: '生活圈',
  work_main: '工作圈', work_mid: '工作圈', work_low: '工作圈',
  social_main: '社交圈', social_mid: '社交圈', social_low: '社交圈',
  m_draw: '描绘法', m_trace: '追溯法', m_stat: '统计法', m_cut: '排除法',
  mine_elevator: '无电梯', mine_light: '采光差', mine_noise: '临街吵', mine_leak: '顶层漏水', mine_property: '物业差',
  wish_through: '南北通透', wish_window: '落地窗', wish_park: '近公园', wish_deco: '精装修', wish_balcony: '大阳台',
  rigid: '刚性', flex5: '可上浮5%', flex10: '可上浮10%',
  own: '自有', parents: '父母支持', loan: '组合贷',
  self: '本人', spouse: '配偶', parentsPerson: '父母', other: '其他',
  veto_spouse: '配偶', veto_parents: '父母', veto_none: '无'
}

export const DIMS = ['safety', 'convenience', 'health', 'comfort', 'beauty', 'freedom']
export const DIM_LABELS = { safety: '安全', convenience: '便利', health: '健康', comfort: '舒适', beauty: '美观', freedom: '自在' }
export const DIM_TIPS = {
  safety: '结构/消防/物业/社区', convenience: '地铁/超市/医院/商业', health: '采光/通风/噪音/绿化',
  comfort: '得房率/格局/通透', beauty: '外立面/园林/装修', freedom: '邻里/宠物/社区文化'
}

export const CIRCLES = [
  { k: 'life', name: '生活圈', icon: '🏘️', color: '#3D5A3E' },
  { k: 'work', name: '工作圈', icon: '💼', color: '#C46A3A' },
  { k: 'social', name: '社交圈', icon: '👨‍👩‍👧', color: '#7A6A55' }
]
export const TOL_TEXT = { life: '距离 +1-2km', work: '通勤 +15-20 分钟', social: '距离 +3-5km' }

const DEFAULT_CIRCLES = {
  life: { place: '望京', scene: '孩子上学、老人就医遛弯、日常采购' },
  work: { place: '国贸', scene: '每日到岗，通勤上限 35 分钟' },
  social: { place: '亚运村', scene: '亲友见面每月 2-3 次' }
}
const DEFAULT_VISION = {
  indoor: '采光充足，南北通透，有阳台，家人可以在客厅共处活动',
  community: '园区绿化充足，有老人小孩活动场地，夜间治安好，邻里氛围和睦',
  around: '楼下有商超药店，临近公园，就医方便'
}

export function createDefaultState () {
  return {
    purpose: ['child_school'],
    strength: 'must',
    rentNo: true,
    timeline: 'one',
    members: ['couple', 'kid1', 'elderLive'],
    duration: 'd510',
    wLife: 'life_main',
    wWork: 'work_mid',
    wSocial: 'social_low',
    methods: ['m_draw', 'm_trace'],
    circles: JSON.parse(JSON.stringify(DEFAULT_CIRCLES)),
    tolerance: { life: true, work: true, social: true },
    mine: ['mine_elevator', 'mine_light'],
    wish: ['wish_through', 'wish_park'],
    vision: JSON.parse(JSON.stringify(DEFAULT_VISION)),
    dims: { safety: 4, convenience: 1, health: 2, comfort: 3, beauty: 3, freedom: 4 },
    low: { convenience: ['e_地铁远', 'e_无电梯'], health: ['e_采光差', 'e_噪音大'] },
    budget: { total: '300-330万', down: '100万', month: '8000元/月以内' },
    flex: 'flex5',
    fund: ['own', 'parents'],
    mainDecider: 'self',
    veto: ['veto_spouse'],
    invite: true,
    confirmed: false,
    version: 1
  }
}

/* ---------------- 工具 ---------------- */
export function clean (k) { return String(k || '').replace(/^e_/, '') }
export function pad (n) { return (n < 10 ? '0' : '') + n }
export function dateStr (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
export function stamp (ts) {
  const d = ts ? new Date(ts) : new Date()
  return dateStr(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}
export function listKeys (arr) {
  return (arr || []).map(k => LABELS[k] || k).join('、')
}

/* ---------------- 三圈 ---------------- */
export function weightKey (state, k) {
  return k === 'life' ? state.wLife : k === 'work' ? state.wWork : state.wSocial
}
export function weightInfo (state, k) {
  const v = weightKey(state, k)
  if (v === k + '_main') return { rank: 1, label: '主驱动圈', cls: 'lh', w: 1 }
  if (v === k + '_mid') return { rank: 2, label: '重要约束', cls: 'ld', w: 0.72 }
  return { rank: 3, label: '次要参考', cls: 'ls', w: 0.5 }
}
export function mainCircle (state) {
  let m = null
  CIRCLES.forEach(c => { if (weightInfo(state, c.k).rank === 1) m = c })
  return m
}
export function circleData (state, k) {
  return (state.circles && state.circles[k]) || DEFAULT_CIRCLES[k] || { place: '', scene: '' }
}
/** 推荐片区文案：优先主驱动圈片区，兼顾次圈；禁止地理交集 */
export function circlePriority (state) {
  const mc = mainCircle(state)
  if (!mc) return { title: '请先指定主驱动圈', desc: '三圈必须且只能有一个主驱动圈，其余为约束。' }
  const mcData = circleData(state, mc.k)
  const others = CIRCLES.filter(c => c.k !== mc.k).sort((a, b) => weightInfo(state, a.k).rank - weightInfo(state, b.k).rank)
  const o1 = circleData(state, others[0].k)
  return {
    title: '优先推荐片区：' + (mcData.place || '—') + '（' + mc.name + '内）',
    desc: '优先' + (mcData.place || '—') + '片区，兼顾' + (o1.place || '—') +
      '方向的' + (others[0].k === 'work' ? '通勤' : '配套') +
      '条件；不强行找三圈地理交集。'
  }
}
/** 经纪人复述确认话术 */
export function circleSpeech (state) {
  const mc = mainCircle(state)
  if (!mc) return '请先回到问诊页指定主驱动圈。'
  const mcData = circleData(state, mc.k)
  const others = CIRCLES.filter(c => c.k !== mc.k).sort((a, b) => weightInfo(state, a.k).rank - weightInfo(state, b.k).rank)
  const o1 = circleData(state, others[0].k)
  const constraint = String(o1.scene || '').replace(/^.*?，/, '')
  return '咱们买房首要优先保障' + (mcData.scene || mc.name + '需求') + '，主要看' + (mcData.place || '') +
    '；' + others[0].name + '作为' + (weightInfo(state, others[0].k).rank === 2 ? '重要约束' : '参考') +
    '，控制在' + (constraint || '可接受范围') + '以内；' + others[1].name + '距离可以适当放宽，对吗？'
}

/* ---------------- 六维 ---------------- */
export function dimGroups (state) {
  const hard = [], red = [], opt = []
  DIMS.forEach(d => {
    const s = state.dims[d]
    if (s <= 2) {
      const items = (state.low[d] || []).map(clean)
      if (items.length) items.forEach(it => hard.push(DIM_LABELS[d] + '·' + it))
      else hard.push(DIM_LABELS[d] + '（待选痛点）')
    } else if (s >= 4) red.push(DIM_LABELS[d])
    else opt.push(DIM_LABELS[d])
  })
  return { hard, red, opt }
}
/**
 * 硬需求清单：低分维度（1-2分）的具体痛点要素。
 * 只输出客户能看懂的具体痛点（如"采光差"），不再叠加"维度·痛点"前缀，避免重复展示。
 * 低分但未选要素时，退化输出"维度（待选痛点）"提示经纪人补采。
 */
export function hardUniq (state) {
  const out = []
  DIMS.forEach(d => {
    if ((state.dims[d] || 5) > 2) return
    const items = (state.low[d] || []).map(clean)
    if (items.length) {
      items.forEach(it => { if (out.indexOf(it) < 0) out.push(it) })
    } else {
      const t = DIM_LABELS[d] + '（待选痛点）'
      if (out.indexOf(t) < 0) out.push(t)
    }
  })
  return out
}
export function strengthText (state) {
  return state.strength === 'must' ? '必须买' : state.strength === 'should' ? '应该买' : '可以买'
}

/* ---------------- 归纳复述 ---------------- */
export function recapText (state) {
  const mc = mainCircle(state)
  const mcData = mc ? circleData(state, mc.k) : { place: '待定' }
  const vetoArr = (state.veto || []).filter(v => v !== 'veto_none')
  const vetoText = vetoArr.length ? vetoArr.map(v => LABELS[v] || clean(v)).join('、') : '无'
  return '客户' + (state.confirmed ? '已确认' : '待确认') + '：因' + (listKeys(state.purpose) || '待补充') +
    '，计划' + (LABELS[state.timeline] || '') + '内' + strengthText(state) +
    '，优先' + (mcData.place || '') + '片区；核心硬需求：' + (hardUniq(state).join('、') || '待补充') +
    '；预算' + (state.budget.total || '') + '，' + (LABELS[state.flex] || '') + '；否决人：' + vetoText + '。'
}

/* ---------------- 客户极简版（剥离内部信息） ---------------- */
export function buildClientView (state) {
  const mc = mainCircle(state)
  const mcData = mc ? circleData(state, mc.k) : { place: '待定' }
  const rows = []
  rows.push(['购房目标', (listKeys(state.purpose) || '待明确') + '，' + (LABELS[state.timeline] || '') + '购房，优先 ' + (mcData.place || '') + ' 片区'])
  rows.push(['预算', (state.budget.total || '待补充') + '｜首付 ' + (state.budget.down || '—') + '｜月供 ' + (state.budget.month || '—')])
  rows.push(['硬性要求', hardUniq(state).join('、') || '待补充'])
  rows.push(['不接受', (state.mine || []).map(k => LABELS[k] || clean(k)).join('、') || '暂无'])
  rows.push(['特别想要', (state.wish || []).map(k => LABELS[k] || clean(k)).join('、') || '暂无'])
  const v = state.vision || {}
  const visionTxt = [v.indoor, v.community, v.around].filter(Boolean).join('；')
  if (visionTxt) rows.push(['理想生活', visionTxt])
  const vetoArr = (state.veto || []).filter(x => x !== 'veto_none')
  rows.push(['重要提示', vetoArr.length
    ? (vetoArr.map(x => LABELS[x] || x).join('、') + ' 拥有否决权，看好房源建议全家实地看房')
    : '决策集中，可直接推进'])
  return rows
}
export function clientPlain (state) {
  const lines = ['【风声 · 购房需求确认】']
  buildClientView(state).forEach(r => { lines.push(r[0] + '：' + r[1]) })
  lines.push('—— 如信息有出入，请直接回复我修改，确认后我们再进入选房环节。')
  return lines.join('\n')
}

/* ---------------- 报告编号 / 版本 ---------------- */
export function reportNo (state, seq) {
  const d = state.generatedAt ? new Date(state.generatedAt) : new Date()
  return 'FS-INS-' + dateStr(d).replace(/-/g, '') + '-V' + (seq || state.version || 1)
}
/** 版本 = 该客户 engine=mot2-v1.3 的 insight 报告累计条数 + 1 */
export function nextVersion (client) {
  const list = (client && Array.isArray(client.reports))
    ? client.reports.filter(r => r && r.type === REPORT_TYPE && r.engine === ENGINE)
    : []
  return list.length + 1
}
/** 演示模式（未绑定客户）报告列表 */
export function demoReports () {
  try { return JSON.parse(uni.getStorageSync('fs_insight2_demo_reports') || '[]') } catch (e) { return [] }
}
export function saveDemoReport (report) {
  const list = demoReports()
  list.push(report)
  try { uni.setStorageSync('fs_insight2_demo_reports', JSON.stringify(list)) } catch (e) {}
}
/** 下一版本号：绑定客户走档案累计，未绑定走演示列表累计 —— 保证改版只升不覆盖 */
export function nextVersionFor (client, clientId) {
  return clientId ? nextVersion(client) : demoReports().length + 1
}
export function insightList (client) {
  if (!client || !Array.isArray(client.reports)) return []
  return client.reports.filter(r => r && r.type === REPORT_TYPE && r.engine === ENGINE)
}
export function latestInsight (client) {
  const list = insightList(client)
  return list.length ? list[list.length - 1] : null
}

/* ---------------- 存储 ---------------- */
export function loadDraft (clientId) {
  const key = clientId ? DRAFT_KEY + clientId : DEMO_KEY
  try {
    const raw = uni.getStorageSync(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}
export function saveDraft (clientId, state) {
  const key = clientId ? DRAFT_KEY + clientId : DEMO_KEY
  try { uni.setStorageSync(key, JSON.stringify(state)) } catch (e) {}
}
export function clearDraft (clientId) {
  const key = clientId ? DRAFT_KEY + clientId : DEMO_KEY
  try { uni.removeStorageSync(key) } catch (e) {}
}

/** 合法化：防止老草稿缺字段导致渲染崩溃 */
export function normalize (raw) {
  const base = createDefaultState()
  if (!raw || typeof raw !== 'object') return base
  const s = Object.assign({}, base, raw)
  s.dims = Object.assign({}, base.dims, raw.dims || {})
  s.low = Object.assign({}, base.low, raw.low || {})
  s.budget = Object.assign({}, base.budget, raw.budget || {})
  s.circles = Object.assign({}, base.circles, raw.circles || {})
  s.vision = Object.assign({}, base.vision, raw.vision || {})
  s.tolerance = Object.assign({}, base.tolerance, raw.tolerance || {})
  ;['purpose', 'members', 'methods', 'mine', 'wish', 'fund', 'veto'].forEach(k => {
    if (!Array.isArray(s[k])) s[k] = base[k].slice()
  })
  return s
}
