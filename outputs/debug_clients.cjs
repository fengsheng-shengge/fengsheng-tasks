const { chromium } = require('/Users/ke/WorkBuddy/Claw/node_modules/playwright');
const BASE = 'http://localhost:8092';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.locator('.uni-tabbar__item', { hasText: '客户档案' }).first().click(); await p.waitForTimeout(1000);
  await p.locator('.add-btn').first().click(); await p.waitForTimeout(800);
  const totalInput = await p.locator('input').count();
  console.log('TOTAL input in page:', totalInput);
  const ovInputs = await p.locator('.overlay.active input').evaluateAll(els => els.map(e => e.tagName + '|' + (e.className || '') + '|ph=' + (e.placeholder || '')));
  console.log('OVERLAY inputs:', JSON.stringify(ovInputs, null, 2));
  const inpCount = await p.locator('.inp').count();
  console.log('.inp count:', inpCount);
  const firstInp = await p.locator('.inp').first().evaluate(e => e.outerHTML.slice(0, 180)).catch(() => 'NONE');
  console.log('first .inp outerHTML:', firstInp);
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
