const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:8091'
const BOUND = (el, val) => el.evaluate((e, v) => {
  const proto = Object.getPrototypeOf(e)
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  desc.set.call(e, v)
  e.dispatchEvent(new Event('input', { bubbles: true }))
}, val)

async function round(n) {
  const errors = []
  const b = await chromium.launch()
  const ctx = await b.newContext()
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERR:' + e.message))

  // --- 闭环 1：录入 → 生成 → 报告 ---
  await page.goto(BASE + '/#/pages/curate/index', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.getByText('填写客户画像').first().click()
  await page.waitForTimeout(400)
  const inputs = page.locator('input')
  const total = await inputs.count()
  if (total < 2) { await b.close(); return { n, fail: 'input 不足=' + total, errors } }
  await BOUND(inputs.nth(0), '测试王女士')
  await BOUND(inputs.nth(1), '800')
  await page.waitForTimeout(200)
  const nameVal = await page.evaluate(() => {
    const root = document.querySelector('#app')
    return window.__VUE__ ? null : null
  })
  // 点生成
  await page.getByText('生成顾问简报').first().click()
  await page.waitForTimeout(2500)
  const url = page.url()
  const jumped = url.includes('curate-client')
  let reportOk = false, reportText = ''
  if (jumped) {
    reportText = (await page.locator('body').innerText()).slice(0, 200)
    reportOk = /为您准备|建议|需求|维度|雷达/.test(reportText)
  }

  // --- 闭环 2：知识字典多选筛选 ---
  await page.goto(BASE + '/#/pages/knowledge/index', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const hit0 = await page.getByText(/命中/).first().textContent()
  await page.locator('.f-chip').nth(0).click() // 买方
  await page.waitForTimeout(400)
  await page.locator('.f-chip').nth(6).click() // 看房·谈判
  await page.waitForTimeout(400)
  const hit1 = await page.getByText(/命中/).first().textContent()

  await b.close()
  const ok = jumped && reportOk && errors.length === 0 && hit0 !== hit1
  return { n, ok, jumped, reportOk, hit0: hit0.trim(), hit1: hit1.trim(), errors, inputCount: total }
}

;(async () => {
  const r = []
  for (let i = 1; i <= 3; i++) r.push(await round(i))
  let pass = 0
  r.forEach(x => { console.log('ROUND', x.n, x.ok ? 'PASS' : 'FAIL',
    '| jumped=' + x.jumped, 'report=' + x.reportOk,
    '| hit0=' + x.hit0, 'hit1=' + x.hit1,
    '| err=' + x.errors.length, x.errors.slice(0,2).join('||')); if (x.ok) pass++ })
  console.log('SUMMARY pass=' + pass + '/3')
  process.exit(pass === 3 ? 0 : 1)
})().catch(e => { console.error('FATAL', e); process.exit(2) })
