// V3.0.7 测评真渲染验证（H5 层）
// 流程：进入测评入口 → 开始住得好测评 → 逐题选第1选项 → 提交 → 报告出现 + canvas 渲染
const { chromium } = require('/Users/ke/WorkBuddy/Claw/node_modules/playwright')
const path = require('path')

const H5_DIR = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program/dist/build/h5'
const BASE = 'http://localhost:4321'

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // 进入「知识」tab 找到测评入口？测评是非 tab 页，通过 URL 直达 quiz 更直接
  // 1) 直达 quiz 页（住得好）
  await page.goto(BASE + '/#/pages/assess/quiz?type=living', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const qTitle = await page.locator('.q-title').first().innerText().catch(() => '')
  console.log('quiz标题:', qTitle)

  // 2) 循环作答：每题点第一个选项，再点「下一题/提交」
  let guard = 0
  while (guard < 40) {
    guard++
    const opt = page.locator('.q-opt').first()
    await opt.click({ force: true }).catch(() => {})
    await page.waitForTimeout(120)
    const btn = page.locator('.q-btn.primary')
    const label = await btn.innerText().catch(() => '')
    await btn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(200)
    if (label && label.includes('提交')) break
  }

  await page.waitForTimeout(800)
  const rTitle = await page.locator('.r-title').first().innerText().catch(() => '')
  const dimCount = await page.locator('.r-dim').count()
  const hasCanvas = await page.locator('canvas').count()
  console.log('报告标题:', rTitle, '| 维度卡数:', dimCount, '| canvas数:', hasCanvas)
  await page.screenshot({ path: path.join(H5_DIR, '../../../outputs/assess_result.png') })

  // 3) 校验分数
  const scores = await page.locator('.r-dim-score').allInnerTexts().catch(() => [])
  console.log('维度评分样例:', scores.slice(0, 3))

  await browser.close()
  const pass = rTitle.includes('报告') && dimCount === 7 && hasCanvas >= 1 && errors.length === 0
  console.log(JSON.stringify({ pass, errors }, null, 2))
  process.exit(pass ? 0 : 1)
}
run().catch(e => { console.error(e); process.exit(2) })
