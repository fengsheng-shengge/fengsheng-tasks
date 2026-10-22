/**
 * 北京城市卡（CITY 21 条）页面级验证
 *  ① 见面参谋页「北京现行政策口径」区块渲染
 *  ② 政策卡内容完整（结论/要点/怎么用/官网来源）
 *  ③ 交易词条产出未被城市卡挤占（回归检查）
 *  ④ 控制台无非预期错误
 */
import { chromium } from '/Users/ke/WorkBuddy/Claw/pw/node_modules/playwright/index.mjs'

const B = 'http://127.0.0.1:5173/#'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push('pageerror: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 110)) })

const clickText = async (txt, exact = true) => p.evaluate(({ txt, exact }) => {
  const els = Array.from(document.querySelectorAll('uni-view,uni-text,view,text,div,span,uni-button,button'))
  const el = els.find(e => {
    const t = (e.textContent || '').trim()
    return exact ? t === txt : t.includes(txt)
  })
  if (!el) return false
  el.click()
  return true
}, { txt, exact })

await p.goto(B + '/package-curation/pages/curate-prep/index', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(4000)

console.log('切购房线:', await clickText('购房线'))
await p.waitForTimeout(1000)
console.log('点① 首套:', await clickText('① 首套'))
await p.waitForTimeout(1000)

// 填自由文本：查北京增值税（命中城市卡）
await p.evaluate(() => {
  const ta = document.querySelector('textarea')
  if (!ta) return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(ta, '北京二手房满二增值税怎么算')
  ta.dispatchEvent(new Event('input', { bubbles: true }))
})
await p.waitForTimeout(600)
console.log('输入自由文本: 北京二手房满二增值税怎么算')

await p.evaluate(() => { const b = document.querySelector('uni-button.btn-main, button.btn-main'); if (b) b.click() })
await p.waitForTimeout(3000)
const hasConfirm = await p.evaluate(() => {
  const b = Array.from(document.querySelectorAll('uni-button, button')).find(x => (x.textContent || '').includes('确认并生成策展'))
  if (b) { b.click(); return true }
  return false
})
if (hasConfirm) { console.log('过复述确认闸门'); await p.waitForTimeout(6000) }

const t = await p.innerText('body')
console.log('\n=== ① 城市卡区块 ===')
console.log('  「北京现行政策口径」标题:', /北京现行政策口径/.test(t) ? '✓' : '✗')
console.log('  城市徽标（北京·税费计算等）:', /北京·/.test(t) ? '✓' : '✗')
console.log('  「怎么用」提示:', /怎么用/.test(t) ? '✓' : '✗')
console.log('  「官网来源」徽标:', /官网来源/.test(t) ? '✓' : '✗')
console.log('  真实法源名（财政部/京建发等）:', /财政部|京建发|税务总局|北京市/.test(t) ? '✓' : '✗')

const i = t.indexOf('北京现行政策口径')
if (i > 0) {
  console.log('\n=== ② 政策卡内容片段 ===')
  t.slice(i, i + 600).split('\n').filter(s => s.trim()).slice(0, 12).forEach(s => console.log('  ' + s))
}

// ③ 回归检查：交易词条 say 是否仍 5 条（未被城市卡挤占）
const sayCount = await p.evaluate(() => {
  const items = document.querySelectorAll('uni-view.say-item')
  return items.length
})
console.log('\n=== ③ 回归检查 ===')
console.log('  「该说的」条数:', sayCount, sayCount === 5 ? '✓ 未被城市卡挤占' : '✗ 被挤占')

// 截图
const ok = await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll('uni-view')).find(e => String(e.className || '').includes('citycard-item'))
  if (!el) return false
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -110)
  return true
})
if (ok) { await p.waitForTimeout(900); await p.screenshot({ path: '/Users/ke/u2e_city_cards.png' }); console.log('  截图已保存') }

console.log('\n=== ④ 控制台错误 ===')
console.log('  数量:', errs.length)
errs.slice(0, 5).forEach(e => console.log('   -', e))

await b.close()
