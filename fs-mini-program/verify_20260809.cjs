// 验证 + 产出报告样本：录入可输入 / 知识字典筛选 / 顾问简报报告渲染
const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:8091'
const OUT = '/Users/ke/WorkBuddy/Claw/outputs'
async function shot(page, path) {
  try {
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null))
    await page.screenshot({ path, fullPage: true, animations: 'disabled', caret: 'hide' })
  } catch (e) {
    console.log('shot fullPage fail, fallback viewport:', e.message)
    await page.screenshot({ path, fullPage: false, animations: 'disabled' })
  }
}
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message))

  // 1) 顾问简报：录入可输入验证（修复 v-model 不回写）+ 截图
  await page.goto(BASE + '/#/pages/curate/index', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.getByText('填写客户画像').first().click()
  await page.waitForTimeout(500)
  const setVal = async (loc, v) => { await loc.evaluate((el, val) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })) }, v) }
  const nameInput = page.locator('input').nth(0)
  await setVal(nameInput, '测试王女士')
  const nameVal = await nameInput.inputValue()
  const budget = page.locator('input').nth(1)
  await setVal(budget, '800')
  const budgetVal = await budget.inputValue()
  await shot(page, OUT + '/样本_顾问简报表单.png')
  console.log('INPUT name=', JSON.stringify(nameVal), 'budget=', JSON.stringify(budgetVal))

  // 2) 知识字典：多维筛选验证 + 截图
  await page.goto(BASE + '/#/pages/knowledge/index', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const beforeTxt = await page.getByText(/命中/).first().textContent()
  await page.locator('.f-chip').nth(0).click()
  await page.locator('.f-chip').nth(6).click()
  await page.waitForTimeout(600)
  const afterTxt = await page.getByText(/命中/).first().textContent()
  await shot(page, OUT + '/样本_知识字典筛选.png')
  console.log('KB before=', beforeTxt.trim(), '-> after=', afterTxt.trim())

  // 3) 顾问简报报告样本
  const dimSelf = encodeURIComponent(JSON.stringify({ safe: 8, health: 6, conv: 7, econ: 5, comfort: 9, beauty: 4, free: 7 }))
  const freeText = encodeURIComponent('客户类型：学区；预算800万；置业目的：学区；付款方式：按揭；家庭结构：有孩家庭；关键时间：孩子2027年上小学；已有想法：买名校旁才放心；已基于七维品质测评结论（客户自评带入）')
  const dims = encodeURIComponent('safe,health,conv,econ,comfort,beauty,free')
  const url = BASE + '/#/package-curation/pages/curate-client/index?axisType=buy&scenario=&freeText=' + freeText + '&dimensions=' + dims + '&dimSelfScores=' + dimSelf
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  await page.waitForSelector('.h1', { timeout: 6000 })
  await shot(page, OUT + '/样本_顾问简报报告.png')
  const h1 = await page.locator('.h1').first().textContent()
  console.log('REPORT h1=', h1.trim())

  console.log('CONSOLE_ERRORS', errors.length, JSON.stringify(errors.slice(0, 6)))
  await browser.close()
  console.log('DONE')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
