/**
 * 居住服务生命周期 · 状态机（V4.1）
 *
 * 设计依据：生哥 2026-08-27 迭代方向 —— "以服务客户为轴，接触到成交到售后，
 * 售后之后有新的居住服务再循环"。同一套闭环可以跑租赁、买卖，
 * 后续按配置补充家装 / 资产管理 / 出售变现 / 置换 / 出租托管。
 *
 * 生命周期五步（有形里程碑 = 五份报告）：
 *   接触(①洞察) → 方案(②提案) → 行动(③带看) → 成交(④谈判) → 售后(⑤售后) → 循环回新服务
 *
 * 服务线（可扩展，每线一套五步闭环，报告带 serviceLine 标记）：
 *   buy 购房 / sell 售房 / rent 租住 / host 出租托管 / decor 家装 / aging 适老化升级 /
 *   elderly 养老居住 / asset 资产管理 / replace 置换
 *
 * 三道硬闸门（可审计、不可旁路）：
 *   闸门1：①需求未获客户确认 → ②提案禁用（"请先确认需求"）
 *   闸门2：②提案未绑真源/未过测算 → ③带看无法生成
 *   闸门3：③带看未关联②提案 → ④⑤后续步骤不开放
 *
 * 数据诚实：状态全部由客户档案已有数据推导（reports[] + serviceLine），
 * 不持久化冗余状态，避免双写不一致。②-⑤ 在当前样本未审核前保持"待样本"锁定态。
 * 老数据兼容：历史报告无 serviceLine 标记时，按客户档案 typeKey/stage 兜底归线。
 */

export const SERVICE_LINES = [
  { key: 'buy', name: '购房', icon: '🏠', desc: '选房 · 看房 · 成交', color: 'green' },
  { key: 'sell', name: '售房', icon: '💰', desc: '定价 · 挂牌 · 变现', color: 'orange' },
  { key: 'rent', name: '租住', icon: '📄', desc: '租房 · 承租', color: 'blue' },
  { key: 'host', name: '出租托管', icon: '🏢', desc: '委托出租 · 托管', color: 'gold' },
  { key: 'decor', name: '家装', icon: '🛋', desc: '装修 · 改造', color: 'teal' },
  { key: 'aging', name: '适老化升级', icon: '🦽', desc: '居家适老 · 无障碍改造', color: 'sky' },
  { key: 'elderly', name: '养老居住', icon: '🌳', desc: '养老社区 · 适老居所选择', color: 'blue-vi' },
  { key: 'asset', name: '资产管理', icon: '💼', desc: '持有 · 打理 · 增值', color: 'purple' },
  { key: 'replace', name: '置换', icon: '🔁', desc: '卖旧 · 换新', color: 'red' }
]

export const SERVICE_LINE_MAP = SERVICE_LINES.reduce((m, s) => { m[s.key] = s; return m }, {})

/** 服务线 → 品牌色（驾驶舱/列表/首页共用，避免各页硬编码重复维护） */
export const SERVICE_LINE_COLORS = SERVICE_LINES.reduce((m, s) => { m[s.key] = s.color; return m }, {})

/** 生命周期五步：接触 → 方案 → 行动 → 成交 → 售后（售后完可循环回新服务） */
export const LIFECYCLE_PHASES = ['接触', '方案', '行动', '成交', '售后']
export const MOT_STEPS = LIFECYCLE_PHASES

export const MOT_REPORTS = [
  { key: 'insight', no: 1, name: '需求洞察', phase: 0, icon: '🔍', desc: '帮客户理清本轮服务要什么，客户可带走', lock: '须客户亲口确认' },
  { key: 'proposal', no: 2, name: '服务提案', phase: 1, icon: '📋', desc: '需求关联 + 测算 + 方案清单，须持此进入下一步', lock: '须先确认需求（闸门1）' },
  { key: 'viewing', no: 3, name: '行动解码', phase: 2, icon: '🏠', desc: '带看 / 面谈后解码客户反应与匹配度', lock: '须先出方案（闸门2）' },
  { key: 'negotiation', no: 4, name: '成交确认', phase: 3, icon: '⚖️', desc: '报价 / 议价 / 条件博弈记录，达成成交', lock: '须先完成行动（闸门3）' },
  { key: 'after-sale', no: 5, name: '成交售后', phase: 4, icon: '🎁', desc: '交割 / 回访 / 信任沉淀，循环回新一轮服务', lock: '须先达成成交意向' }
]

/** 老数据兜底归线：历史客户没有 serviceLine 时，按 typeKey/stage 推断服务线 */
export function inferServiceLine(client) {
  if (!client) return 'buy'
  if (client.serviceLine) return client.serviceLine
  const t = ((client.ctype || '') + ' ' + (client.stage || '') + ' ' + (client.rel || '')).trim()
  if (/置换|换房|卖旧/.test(t)) return 'replace'
  if (/养老|退休|康养|银发/.test(t)) return 'elderly'
  if (/适老|无障碍|适老化|扶手/.test(t)) return 'aging'
  if (/托管|委托出租|房东/.test(t)) return 'host'
  if (/售|变现|挂牌|业主售房/.test(t)) return 'sell'
  if (/装|装修|改造/.test(t)) return 'decor'
  if (/资产|打理|持有/.test(t)) return 'asset'
  if (/租/.test(t)) return 'rent'
  return 'buy'
}

/** 报告所属服务线（老报告无标记 → 客户兜底线） */
function lineOf(r, client) {
  if (r && r.serviceLine) return r.serviceLine
  return inferServiceLine(client)
}

/** 报告是否已产出（可按服务线过滤；不传 line 则只看类型） */
export function hasReport(client, key, line) {
  if (!client || !Array.isArray(client.reports)) return false
  return client.reports.some(r => r && r.type === key && (!line || lineOf(r, client) === line))
}

/** 报告详情（最新一版，历史保留在 client.reports 内） */
export function getReport(client, key, line) {
  if (!client || !Array.isArray(client.reports)) return null
  const list = client.reports.filter(r => r && r.type === key && (!line || lineOf(r, client) === line))
  return list.length ? list[list.length - 1] : null
}

/** 某服务线的报告条数（key 为空则统计该服务线全部报告；版本=累计条数） */
export function countReports(client, key, line) {
  if (!client || !Array.isArray(client.reports)) return 0
  return client.reports.filter(r => r && (!key || r.type === key) && (!line || lineOf(r, client) === line)).length
}

/** 需求确认闸门1：某服务线最新需求洞察报告须 confirmed */
export function gateInsightConfirmed(client, line) {
  const r = getReport(client, 'insight', line)
  if (!r) return false
  return !!(r.confirm && r.confirm.confirmed)
}

/** 当前活跃服务线：优先最新一份报告所属线，否则客户声明线 / 兜底推断线 */
export function activeServiceLine(client) {
  const declared = inferServiceLine(client)
  if (client && Array.isArray(client.reports) && client.reports.length) {
    const last = client.reports[client.reports.length - 1]
    if (last && last.serviceLine) return last.serviceLine
  }
  return declared
}

/** 由已产出报告 + 闸门1 派生生命周期步（只进不退） */
function phaseIndexFor(produced, g1) {
  if (produced.includes('after-sale')) return 4
  if (produced.includes('negotiation')) return 3
  if (produced.includes('viewing')) return 2
  if (produced.includes('proposal')) return 1
  if (produced.includes('insight')) return g1 ? 1 : 0
  return 0
}

/** 客户所有服务线汇总（报告驱动 + 声明线兜底） */
export function deriveServiceLines(client) {
  if (!client) return []
  const declared = inferServiceLine(client)
  const keys = new Set()
  if (declared) keys.add(declared)
  ;(client.reports || []).forEach(r => { if (r && r.serviceLine) keys.add(r.serviceLine) })
  const lines = Array.from(keys).map(k => {
    const meta = SERVICE_LINE_MAP[k] || { name: k, icon: '🏠' }
    const produced = MOT_REPORTS.filter(r => hasReport(client, r.key, k)).map(r => r.key)
    return {
      key: k,
      name: meta.name,
      icon: meta.icon,
      produced,
      count: countReports(client, null, k),
      completed: produced.includes('after-sale'),
      stepIndex: phaseIndexFor(produced, gateInsightConfirmed(client, k))
    }
  })
  // 当前活跃线排最前，其余按完成态排
  const active = activeServiceLine(client)
  lines.sort((a, b) => (a.key === active ? -1 : b.key === active ? 1 : (b.completed - a.completed || 0)))
  return lines
}

/**
 * 由客户档案派生「指定服务线（默认当前活跃线）」的生命周期状态。
 * @param {object} client 客户档案
 * @param {string} [targetLine] 目标服务线 key，缺省用 activeServiceLine()
 * @returns {{
 *   lineKey: string, lineName: string, lineIcon: string,
 *   lines: { key,name,icon,produced,count,completed,stepIndex }[],
 *   stepIndex: number, step: string, produced: string[],
 *   producedCount: number, gates: { g1:boolean,g2:boolean,g3:boolean },
 *   completed: boolean, canStartNew: boolean,
 *   pending: { key, label }[]
 * }}
 */
export function deriveLifecycleState(client, targetLine) {
  const lineKey = targetLine || activeServiceLine(client)
  const lines = deriveServiceLines(client)
  const meta = SERVICE_LINE_MAP[lineKey] || { name: lineKey, icon: '🏠' }
  const produced = MOT_REPORTS.filter(r => hasReport(client, r.key, lineKey)).map(r => r.key)
  const g1 = gateInsightConfirmed(client, lineKey)

  // 闸门2/3：当前无真源样本，②③④⑤ 一律视为"未过闸门"——等样本审核接入后再放开。
  const g2 = false
  const g3 = false

  const stepIndex = phaseIndexFor(produced, g1)

  const pending = []
  if (!produced.includes('insight')) {
    pending.push({ key: 'insight', label: '做①需求洞察问诊（' + meta.name + '）' })
  } else if (!g1) {
    pending.push({ key: 'insight', label: '待客户确认①需求' })
  }
  if (!produced.includes('proposal')) {
    pending.push({ key: 'proposal', label: '缺②服务提案（样本接入后开放）' })
  } else if (!produced.includes('viewing')) {
    pending.push({ key: 'viewing', label: '缺③行动解码（样本接入后开放）' })
  } else if (!produced.includes('negotiation')) {
    pending.push({ key: 'negotiation', label: '缺④成交确认（样本接入后开放）' })
  } else if (!produced.includes('after-sale')) {
    pending.push({ key: 'after-sale', label: '缺⑤成交售后（样本接入后开放）' })
  }

  const completed = produced.includes('after-sale')

  return {
    lineKey,
    lineName: meta.name,
    lineIcon: meta.icon,
    lines,
    stepIndex,
    step: LIFECYCLE_PHASES[stepIndex],
    produced,
    producedCount: produced.length,
    gates: { g1, g2, g3 },
    completed,
    canStartNew: true, // 接触或售后循环，随时可开新一轮服务
    pending
  }
}

/** 兼容旧引用名（V4 单闭环 → V4.1 生命周期） */
export const deriveMotState = deriveLifecycleState

/** 报告是否可操作：当前只有①真实可用，②-⑤为样本锁定态 */
export function isReportActionable(reportKey) {
  return reportKey === 'insight'
}
