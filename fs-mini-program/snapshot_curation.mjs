// 策展引擎行为基线快照工具
// 用途：重构前后跑同一组输入，比对输出是否逐字节一致（证明纯结构重构、行为零变动）
// 用法：node snapshot_curation.mjs <输出文件>
import { writeFileSync } from 'fs'

const out = process.argv[2] || '/tmp/curation_snapshot.json'

const mod = await import('./src/package-curation/engine.js')
const { AXIS_GROUPS, DIMENSIONS, generateCuration } = mod

const cases = []
// 遍历全部 axis × node × 若干维度组合
for (const g of AXIS_GROUPS) {
  for (const n of g.nodes) {
    for (const dims of [[], ['econ'], ['conv'], ['econ', 'conv'], ['health']]) {
      for (const ft of ['', '学区', '押金', '落户', '租金贷风险']) {
        cases.push({ axisType: g.type, axisNodeKey: n.key, dimensions: dims, freeText: ft })
      }
    }
  }
}

const results = cases.map((c) => {
  const r = generateCuration(c)
  return {
    input: c,
    axisLabel: r.axisLabel,
    dimensionLabels: r.dimensionLabels,
    honesty: r.honesty,
    sayCount: r.say.length,
    say: r.say.map(s => [s.title, s.point, s.detail, s.legalRef, s.hasLegal, s.ownerBenefit, s.entryId]),
    bringCount: r.bring.length,
    bring: r.bring.map(b => [b.title, b.benefit]),
    askCount: r.ask.length,
    ask: r.ask.map(a => [a.q, a.insightHint || null]),
    followupCount: r.followups.length,
    followups: r.followups.map(f => [f.theme, f.text, f.reciprocityNote || null]),
    timeline: r.timeline
  }
})

// 附加：带影响力参数的用例
const withInfluence = [
  {
    axisType: 'buy', axisNodeKey: 'edu', dimensions: ['econ'],
    triggerEvents: ['family_school'], triggerRemark: '孩子明年入学',
    customerConflict: '预算与学区难兼顾',
    hardBottomLines: ['school'], flexibleItems: ['floor'],
    riskItems: ['fear_policy'], decisionMakerStances: [{ name: '孩子妈', stanceType: 'school' }],
    lifeVision: '就近入学'
  },
  {
    axisType: 'rent', axisNodeKey: 'start', dimensions: ['econ'],
    triggerEvents: ['external_commute'], hardBottomLines: ['budget'],
    riskItems: ['fear_expensive'], decisionMakerStances: [{ name: '本人', stanceType: 'commute' }]
  }
].map((c) => {
  const r = generateCuration(c)
  return {
    input: c,
    axisLabel: r.axisLabel,
    honesty: r.honesty,
    say: r.say.map(s => [s.title, s.point, s.legalRef, s.hasLegal, s.ownerBenefit, s.entryId, s.influencePrinciples || null]),
    ask: r.ask.map(a => [a.q, a.insightHint || null]),
    followups: r.followups.map(f => [f.theme, f.text, f.reciprocityNote || null])
  }
})

const snapshot = {
  meta: {
    axisGroups: AXIS_GROUPS,
    dimensions: DIMENSIONS,
    caseCount: cases.length,
    influenceCaseCount: withInfluence.length
  },
  results,
  withInfluence
}

writeFileSync(out, JSON.stringify(snapshot, null, 2))
console.log('snapshot written:', out, '| cases:', cases.length, '+ influence:', withInfluence.length)
console.log('say total:', results.reduce((s, r) => s + r.sayCount, 0),
            '| bring total:', results.reduce((s, r) => s + r.bringCount, 0),
            '| ask total:', results.reduce((s, r) => s + r.askCount, 0),
            '| followups total:', results.reduce((s, r) => s + r.followupCount, 0))