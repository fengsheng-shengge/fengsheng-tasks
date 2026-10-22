/**
 * 阶段二批1 页面级验证：
 *  ① 见面参谋页剧本卡渲染（标准话术/要点/禁忌/AI陪练）
 *  ② 知识页运行时域计数（不再写死）
 *  ③ 首页条数运行时真值
 *  ④ 控制台无错误
 */
import { chromium } from '/Users/ke/WorkBuddy/Claw/pw/node_modules/playwright/index.mjs'

const B = 'http://127.0.0.1:5173/#'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push('pageerror: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)) })

const clickText = async (txt, exact = true) => p.evaluate(({ txt, exact }) => {
  const els = Array.from(document.querySelectorAll('uni-view,uni-text,view,text,div,span,button,uni-button'))
  const el = els.find(e => {
    const t = (e.textContent || '').trim()
    return exact ? t === txt : t.includes(txt)
  })
  if (!el) return false
  el.click()
  return true
}, { txt, exact })

// ===== ① 见面参谋 · 剧本卡 =====
await p.goto(B + '/package-curation/pages/curate-prep/index', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(4000)
console.log('1 切租住线:', await clickText('租住线'))
await p.waitForTimeout(1200)
console.log('2 点① 起步:', await clickText('① 起步'))
await p.waitForTimeout(1200)
console.log('3 选维度「经济」:', await clickText('经济'))
await p.waitForTimeout(800)
// 生成按钮为 uni-button.btn-main，需精准点击（避免命中外层容器）
const genOk = await p.evaluate(() => {
  const b = document.querySelector('uni-button.btn-main, button.btn-main')
  if (!b) return false
  b.click()
  return true
})
console.log('4 点生成:', genOk)
await p.waitForTimeout(2500)
// 业务闸门：弹出「需求复述确认」时需再点「✓ 确认并生成策展」才真正出结果
const needConfirm = await p.evaluate(() => {
  const b = Array.from(document.querySelectorAll('uni-button,button'))
    .find(x => (x.textContent || '').includes('确认并生成策展'))
  if (!b) return false
  b.click()
  return true
})
if (needConfirm) {
  console.log('  （复述确认闸门）点确认并生成:', needConfirm)
  await p.waitForTimeout(6000)
} else {
  await p.waitForTimeout(4000)
}

let t = await p.innerText('body')
const hasScript = /标准话术/.test(t)
const hasMot = /MOT\d/.test(t)
const hasTaboo = /禁忌/.test(t)
const hasDrill = /AI陪练/.test(t)
const hasNo = /✕/.test(t)
console.log('\n=== ① 剧本卡渲染 ===')
console.log('  标准话术区块:', hasScript ? '✓' : '✗')
console.log('  MOT 场景标签:', hasMot ? '✓' : '✗')
console.log('  要点区:', hasScript && /要点/.test(t) ? '✓' : '✗')
console.log('  禁忌区:', hasTaboo ? '✓' : '✗')
console.log('  AI陪练:', hasDrill ? '✓' : '✗')
console.log('  禁忌条目✕:', hasNo ? '✓' : '✗')
const mi = t.indexOf('标准话术')
if (mi > 0) {
  console.log('\n  片段:')
  t.slice(mi, mi + 700).split('\n').filter(s => s.trim()).slice(0, 14).forEach(s => console.log('  ' + s))
}

// ===== ② 知识页运行时域计数 =====
await p.goto(B + '/pages/knowledge/index', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(5000)
t = await p.innerText('body')
console.log('\n=== ② 知识页 ===')
const cntM = t.match(/共\s*(\d+)\s*个/)
console.log('  搜索栏总数:', cntM ? cntM[1] : '未取到', cntM ? '✓' : '✗')
const nullCnt = /null\s*个方案|undefined\s*个方案/.test(t)
console.log('  出现 null/undefined 个方案:', nullCnt ? '✗ 有' : '✓ 无')
const sceneM = t.match(/(\d+)\s*个场景/)
console.log('  场景数:', sceneM ? sceneM[1] : '?')
// 抽取几个域的实拉计数
const domCounts = await p.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('uni-view')).filter(e => e.className && String(e.className).includes('dict-card'))
  return cards.slice(0, 6).map(c => {
    const name = (c.querySelector('.dict-name') || {}).textContent || ''
    const cnt = (c.querySelector('.dict-count') || {}).textContent || ''
    return (name || '').trim() + ' ' + (cnt || '').trim()
  })
})
console.log('  域卡片实拉计数:', JSON.stringify(domCounts))
console.log('  存在 "…" 占位（未加载）:', domCounts.some(x => x.includes('…')) ? '有（说明未拉到）' : '无 ✓')

// ===== ③ 首页 =====
await p.goto(B + '/pages/home/index', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(5000)
t = await p.innerText('body')
const homeM = t.match(/(\d+)\s*真实方案/)
console.log('\n=== ③ 首页 ===')
console.log('  条数文案:', homeM ? homeM[0] : '未取到', homeM ? '✓' : '✗')
console.log('  残留 "5000+":', /5000\+/.test(t) ? '✗ 有' : '✓ 无')
console.log('  残留 "26 域":', /26\s*域/.test(t) ? '✗ 有' : '✓ 无')

console.log('\n=== ④ 控制台错误 ===')
console.log('  数量:', errs.length)
errs.slice(0, 6).forEach(e => console.log('   -', e))

await b.close()
