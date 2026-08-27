/**
 * MOT 五报告专业闭环 · 状态机（V4）
 *
 * 设计依据：风声_小程序产品迭代方案V4_五报告专业闭环_20260826
 * - 每个客户 = 一条 MOT 闭环（探索→提议→行动→确认→售后），五份报告是有形里程碑。
 * - 三道硬闸门（可审计、不可旁路）：
 *   闸门1：①需求未获客户确认 → ②提案禁用（"请先确认需求"）
 *   闸门2：②提案未绑真源/未过测算 → ③带看无法生成
 *   闸门3：③带看未关联②提案 → ④⑤后续步骤不开放
 *   循环：③④⑤任一产出新认知 → 回①修正需求（需求档案 append-only 留痕）
 *
 * 数据诚实：状态全部由客户档案已有数据推导（reports[]），不持久化冗余状态，
 * 避免双写不一致。②-⑤ 在当前样本未审核前保持"待样本"锁定态，不渲染空壳能力。
 */

export const MOT_REPORTS = [
  { key: 'insight', no: 1, name: '需求洞察', mot: '探索', icon: '🔍', desc: '帮客户理清需求，客户可带走', lock: '须客户亲口确认' },
  { key: 'proposal', no: 2, name: '房源提案', mot: '提议', icon: '📋', desc: '需求关联+测算+推荐清单，须持此带看', lock: '须先确认需求（闸门1）' },
  { key: 'viewing', no: 3, name: '带看解码', mot: '行动', icon: '🏠', desc: '带看后解码客户反应与匹配度', lock: '须先出提案（闸门2）' },
  { key: 'negotiation', no: 4, name: '斡旋谈判', mot: '确认', icon: '⚖️', desc: '报价/议价/条件博弈记录', lock: '须先完成带看（闸门3）' },
  { key: 'after-sale', no: 5, name: '成交售后', mot: '售后', icon: '🎁', desc: '交割/回访/信任沉淀，循环回①', lock: '须先达成成交意向' }
]

export const MOT_STEPS = ['探索', '提议', '行动', '确认', '售后']

/** 报告是否已产出 */
export function hasReport(client, key) {
  if (!client || !Array.isArray(client.reports)) return false
  return client.reports.some(r => r && r.type === key)
}

/** 报告详情（最新一版，历史保留在 client.reports 内） */
export function getReport(client, key) {
  if (!client || !Array.isArray(client.reports)) return null
  const list = client.reports.filter(r => r && r.type === key)
  return list.length ? list[list.length - 1] : null
}

/** 需求确认闸门1：最新需求洞察报告须 confirmed */
export function gateInsightConfirmed(client) {
  const r = getReport(client, 'insight')
  if (!r) return false
  return !!(r.confirm && r.confirm.confirmed)
}

/**
 * 由客户档案推导 MOT 状态。
 * @returns {{
 *   stepIndex: number,        // 0-4 当前所处 MOT 步（只进不退）
 *   step: string,             // '探索'|'提议'|'行动'|'确认'|'售后'
 *   produced: string[],       // 已产出报告 key
 *   gates: { g1:boolean,g2:boolean,g3:boolean },
 *   pending: { key, label }[] // 下一步待办
 * }}
 */
export function deriveMotState(client) {
  const produced = MOT_REPORTS.filter(r => hasReport(client, r.key)).map(r => r.key)
  const g1 = gateInsightConfirmed(client)

  // 闸门2/3：当前无真源样本，②③④⑤ 一律视为"未过闸门"——等样本审核接入后再放开。
  const g2 = false
  const g3 = false

  // MOT 步 = 已产出报告的最大里程碑（只进不退）
  let stepIndex = 0
  if (produced.includes('after-sale')) stepIndex = 4
  else if (produced.includes('negotiation')) stepIndex = 3
  else if (produced.includes('viewing')) stepIndex = 2
  else if (produced.includes('proposal')) stepIndex = 1
  else if (produced.includes('insight')) stepIndex = g1 ? 1 : 0

  const pending = []
  if (!produced.includes('insight')) {
    pending.push({ key: 'insight', label: '做①需求洞察问诊' })
  } else if (!g1) {
    pending.push({ key: 'insight', label: '待客户确认①需求' })
  }
  if (!produced.includes('proposal')) {
    pending.push({ key: 'proposal', label: '缺②房源提案（等样本接入）' })
  } else if (!produced.includes('viewing')) {
    pending.push({ key: 'viewing', label: '缺③带看解码（等样本接入）' })
  } else if (!produced.includes('negotiation')) {
    pending.push({ key: 'negotiation', label: '缺④斡旋谈判（等样本接入）' })
  } else if (!produced.includes('after-sale')) {
    pending.push({ key: 'after-sale', label: '缺⑤成交售后（等样本接入）' })
  }

  return {
    stepIndex,
    step: MOT_STEPS[stepIndex],
    produced,
    gates: { g1, g2, g3 },
    pending
  }
}

/** 报告是否可操作：当前只有①真实可用，②-⑤为样本锁定态 */
export function isReportActionable(reportKey) {
  return reportKey === 'insight'
}
