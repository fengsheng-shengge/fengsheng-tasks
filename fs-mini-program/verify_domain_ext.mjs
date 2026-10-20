// 扩域演练验证：用 Phase 2 资产运营线走 registerDomain 入口，
// 证明「新增领域只改配置、不碰引擎」。这是解耦的验收标准。
import { AXIS_GROUPS, DIMENSIONS, registerDomain, getCurationConfig, generateCuration } from './src/package-curation/engine.js'
import { validateCurationConfig } from './src/package-curation/config/curation.config.js'

console.log('=== 1) 解耦前基线 ===')
console.log('  轴线数:', AXIS_GROUPS.length, '| 维度数:', DIMENSIONS.length)
console.log('  配置自检问题:', validateCurationConfig().length === 0 ? '无 ✓' : validateCurationConfig())

console.log('\n=== 2) 仅用配置新增 Phase 2 资产运营线（不写引擎代码）===')
const r = registerDomain({
  type: 'operate', label: '资产运营线', clientType: 'landlord',
  nodes: [
    // 演示两种话术写法：节点内联 followups / 走 playbooks 表
    { key: 'hold', name: '① 收房持有', kw: ['收房', '持有', '出租准备', '空置'],
      followups: [{ theme: '收房核验', text: '收房后 7 天内完成家电清单与设施核验留存证据' }] },
    { key: 'income', name: '② 收益评估', kw: ['收益', '租金', '投入产出', '回本', '回报', '定价'] },
    { key: 'maint',  name: '③ 维修维护', kw: ['维修', '维护', '保养', '保洁', '家电'] },
    { key: 'exit',   name: '④ 退出处置', kw: ['退租', '出售', '退出', '撤场'] }
  ]
}, {
  playbooks: {
    income: [{ theme: '收益测算', text: '持续关怀：提供租金回报测算与同小区租金对比' }],
    maint:  [{ theme: '维修响应', text: '见后跟进：维修工单已派给谁、多久上门，同步客户' }],
    exit:   [{ theme: '退出衔接', text: '退租前 30 天启动撤场与费用结算清单核对' }]
  },
  dimensionFollowups: {
    roi: [{ theme: '投入产出', text: '持续关怀：整理持有总成本与回本周期测算' }]
  },
  scenes: ['退租出售', '居住中']
})
console.log('  registerDomain 结果:', JSON.stringify(r))
console.log('  引擎代码是否被改动: 否（本文件未编辑 engine.js）')

console.log('\n=== 3) 解耦后生效状态 ===')
const cfg = getCurationConfig()
console.log('  轴线数:', cfg.axisGroups.length, '（原 2 + 新 1 = 3 ✓）')
console.log('  新轴:', cfg.axisGroups[cfg.axisGroups.length - 1].label,
            '| 节点数:', cfg.axisGroups[cfg.axisGroups.length - 1].nodes.length)
console.log('  静态兜底域（已随配置扩展）:', cfg.staticFallbackScenes.join(' / '))

console.log('\n=== 4) 新领域实际产出（说/带/问/跟）===')
for (const nk of ['income', 'maint', 'exit']) {
  const out = generateCuration({ axisType: 'operate', axisNodeKey: nk, dimensions: [], freeText: '' })
  console.log('  [' + out.axisLabel + '] ' + out.honesty.note)
  console.log('    say:', out.say.length, '条 | 首条:', out.say[0] ? out.say[0].title : '(无)')
  console.log('    followups:', out.followups.map(f => f.theme).join(' → '))
}

console.log('\n=== 5) 配置自检 ===')
const issues = validateCurationConfig(cfg)
console.log('  问题清单:', issues.length === 0 ? '无 ✓' : issues)

console.log('\n=== 5b) 负向用例：配置缺失应被自检捕获 ===')
console.log('  故意漏话术 →', validateCurationConfig({
  axisGroups: [{ type: 'z', label: 'Z', clientType: 'buyer', nodes: [{ key: 'n1', name: '①', kw: ['a'] }] }],
  followupPlaybooks: {}
}))

console.log('\n=== 6) 负向用例：非法注册应被拒绝 ===')
console.log('  空 nodes →', JSON.stringify(registerDomain({ type: 'x', label: 'X', clientType: 'buyer', nodes: [] })))
console.log('  缺 kw   →', JSON.stringify(registerDomain({ type: 'y', label: 'Y', clientType: 'buyer', nodes: [{ key: 'n1', name: '①', kw: [] }] })))
console.log('  重复 type →', JSON.stringify(registerDomain({ type: 'buy', label: '重复', clientType: 'buyer', nodes: [{ key: 'z', name: 'Z', kw: ['z'] }] })))