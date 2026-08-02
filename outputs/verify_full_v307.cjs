// V3.0.7 综合真渲染用户测试（H5 层）：覆盖用户四痛点 + 全局无报错
// A 真实词典 / B 真实策展(不千篇一律) / C 客户档案新建 / D 真实测评(答题→报告)
const { chromium } = require('/Users/ke/WorkBuddy/Claw/node_modules/playwright');
const fs = require('fs');

const H5_DIR = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/fs-mini-program/dist/build/h5';
const BASE = 'http://localhost:8096';
const OUT = '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/outputs/h5_verify_v307';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail) { results.push({ name, ok, detail }); console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} :: ${detail}`); }
const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  async function home() { await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await wait(page, 1500); }
  async function tab(name) {
    const item = page.locator('.uni-tabbar__item', { hasText: name }).first();
    await item.waitFor({ state: 'visible', timeout: 8000 }); await item.click(); await wait(page, 900);
  }

  await home();

  // ---------- A: 知识页真实词典 ----------
  try {
    await tab('知识');
    const box = page.locator('.dict-input').first();
    await box.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('.dict-input input').first().fill('学区', { force: true });
    await wait(page, 700);
    const entryCount = await page.locator('.dict-entry').count();
    const hasBadge = await page.locator('.de-badge').count();
    check('A 知识页搜得到真实词条(非模拟)', entryCount > 0, `关键词「学区」命中 .dict-entry = ${entryCount}`);
    check('A 真实依据徽标出现', hasBadge > 0, `.de-badge（真实依据）数量 = ${hasBadge}`);
    await page.screenshot({ path: `${OUT}/A_knowledge.png`, fullPage: true });
  } catch (e) { check('A 知识页', false, 'EXC ' + e.message); await page.screenshot({ path: `${OUT}/A_ERR.png`, fullPage: true }); }

  // ---------- B: 真实策展引擎(不同输入→不同产出) ----------
  try {
    await tab('策展');
    await page.locator('.btn-cta').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('.btn-cta').first().click();
    await wait(page, 900);
    const onPrep = await page.locator('.btn-main').count();
    check('B 进入真实策展引擎', onPrep > 0, `.btn-main 生成按钮存在 = ${onPrep}`);
    const fullText = async () => (await page.locator('.say-item,.bring-item,.ask-item,.follow-item').allInnerTexts().catch(() => [])).join('|');
    // run1 购房线·改善
    await page.locator('.ta textarea').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('.ta textarea').first().fill('800万想换改善三房，纠结学区', { force: true });
    await wait(page, 300); await page.locator('.btn-main').first().click();
    await wait(page, 600); const txt1 = await fullText(); const axis1 = (await page.locator('.rh-axis').first().innerText().catch(() => '')) || '';
    await page.screenshot({ path: `${OUT}/B_prep_run1.png`, fullPage: true });
    // run2 租住线（差异化）
    await page.locator('.btn-line').first().click().catch(() => {});
    await wait(page, 500); await page.locator('.seg-item').nth(1).click().catch(() => {});
    await wait(page, 400);
    await page.locator('.ta textarea').first().fill('刚工作预算有限想租房过渡', { force: true });
    await wait(page, 300); await page.locator('.btn-main').first().click();
    await wait(page, 600); const txt2 = await fullText(); const axis2 = (await page.locator('.rh-axis').first().innerText().catch(() => '')) || '';
    await page.screenshot({ path: `${OUT}/B_prep_run2.png`, fullPage: true });
    check('B 引擎动态产出(说/带/问/跟)', txt1.length > 0 && txt2.length > 0, `run1 len=${txt1.length}  run2 len=${txt2.length}`);
    check('B 不同输入→产出不同(非千篇一律)', txt1 !== txt2, `axis1="${axis1}"  axis2="${axis2}"`);
  } catch (e) { check('B 策展引擎', false, 'EXC ' + e.message); await page.screenshot({ path: `${OUT}/B_ERR.png`, fullPage: true }); }

  // ---------- C: 客户档案新建（用户痛点#2「无法新建」）----------
  try {
    await home();
    await tab('客户档案');
    const before = await page.locator('.client-card').count();
    // 非空态(示例客户已 seed)：新建入口是页头常驻「＋ 新建」按钮
    const addBtn = page.locator('.add-btn');
    await addBtn.waitFor({ state: 'visible', timeout: 8000 });
    check('C 页头「＋ 新建」按钮可见', true, 'add-btn 可见（非空态新建入口）');
    await addBtn.click();
    await wait(page, 600);
    const overlayActive = await page.locator('.overlay.active').count();
    const ovFoot = await page.locator('.ov-foot').count();
    check('C 点新建→浮层弹出', overlayActive > 0 && ovFoot > 0, `.overlay.active=${overlayActive} .ov-foot=${ovFoot}`);
    // 填称呼(必填,name=inp[1]) + 姓氏(surname=inp[0])：H5 下 .inp 是 uni-input 自定义元素，原生 input 在其内(.inp input)，force 规避覆盖层
    const inps = page.locator('.inp input');
    await inps.nth(1).fill('测试客户王', { force: true });
    await wait(page, 200);
    await inps.nth(0).fill('王', { force: true });
    await wait(page, 200);
    await page.locator('.btn-green.foot-save').first().click();
    await wait(page, 800);
    const overlayClosed = await page.locator('.overlay.active').count();
    const after = await page.locator('.client-card').count();
    check('C 创建后浮层关闭', overlayClosed === 0, `.overlay.active 关闭后=${overlayClosed}`);
    check('C 客户卡片新增(新建成功)', after > before, `before=${before} after=${after}`);
    await page.screenshot({ path: `${OUT}/C_clients_new.png`, fullPage: true });
  } catch (e) { check('C 客户档案新建', false, 'EXC ' + e.message); await page.screenshot({ path: `${OUT}/C_ERR.png`, fullPage: true }); }

  // ---------- D: 真实测评（用户痛点#4「测评都是模拟」）----------
  try {
    await page.goto(BASE + '/#/pages/assess/quiz?type=living', { waitUntil: 'networkidle' });
    await wait(page, 1000);
    const qTitle = await page.locator('.q-title').first().innerText().catch(() => '');
    check('D 测评进入答题(真实题库)', qTitle.length > 0, `首题标题="${qTitle.slice(0, 24)}"`);
    let guard = 0;
    while (guard < 40) {
      guard++;
      await page.locator('.q-opt').first().click({ force: true }).catch(() => {});
      await wait(page, 120);
      const btn = page.locator('.q-btn.primary');
      const label = await btn.innerText().catch(() => '');
      await btn.click({ force: true }).catch(() => {});
      await wait(page, 200);
      if (label && label.includes('提交')) break;
    }
    await wait(page, 900);
    const rTitle = await page.locator('.r-title').first().innerText().catch(() => '');
    const dimCount = await page.locator('.r-dim').count();
    const hasCanvas = await page.locator('canvas').count();
    check('D 提交→报告页出现', rTitle.includes('报告'), `报告标题="${rTitle}"`);
    check('D 七维维度卡+雷达图渲染', dimCount === 7 && hasCanvas >= 1, `维度卡=${dimCount} canvas=${hasCanvas}`);
    await page.screenshot({ path: `${OUT}/D_assess_report.png`, fullPage: true });
  } catch (e) { check('D 真实测评', false, 'EXC ' + e.message); await page.screenshot({ path: `${OUT}/D_ERR.png`, fullPage: true }); }

  const realErrors = errors.filter(e => !/scrollTop|pageScrollTo/i.test(e));
  const harnessOnly = errors.length - realErrors.length;
  check('全局无 JS 运行时报错(排除H5 harness已知quirk)', realErrors.length === 0,
    (realErrors.slice(0, 5).join(' | ') || '无') + (harnessOnly ? ` ｜(已忽略H5 quirk ×${harnessOnly})` : ''));

  await browser.close();
  const passed = results.filter(r => r.ok).length;
  console.log(`\n=== V3.0.7 综合真渲染验证 ${passed}/${results.length} 通过 ===`);
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(results, null, 2));
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
