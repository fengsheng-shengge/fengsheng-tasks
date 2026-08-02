// 验证：knowledge 跨包 require 修复 + 真实词条仍能正常加载
// 抓 console 错误（重点看 entries_slim 模块未定义）+ 知识页真实词条渲染
const { chromium } = require('/Users/ke/WorkBuddy/Claw/node_modules/playwright');

const BASE = 'http://localhost:8095';
const log = [];
const errors = [];

function check(name, ok, detail) {
  log.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name} :: ${detail}`);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = m.text();
      // 只关心 entries_slim 跨包 / 任何模块未定义错误
      if (/is not defined|require args|cross-package|module not found|404/i.test(t)) {
        errors.push(t.slice(0, 200));
      }
    }
  });
  page.on('pageerror', e => {
    errors.push('PAGEERROR: ' + e.message.slice(0, 200));
  });

  // 1. 先到首页再点知识 tab（H5 tab 路由在 index 上）
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const tab = page.locator('.uni-tabbar__item', { hasText: '知识' }).first();
  await tab.waitFor({ state: 'visible', timeout: 8000 });
  await tab.click();
  await page.waitForTimeout(2000);

  // 2. 确认页头渲染
  const title = await page.locator('text=知识底座').count();
  check('知识底座页头可见', title > 0, `count=${title}`);

  // 3. 真实词条渲染：搜"学区" → 命中真实依据徽标
  const dictBox = page.locator('.dict-input').first();
  await dictBox.waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('.dict-input input').first().fill('学区', { force: true });
  await page.waitForTimeout(1500);

  const realBadgeCount = await page.locator('.de-badge').count();
  const entryCards = await page.locator('.dict-entry').count();
  check('学区搜索→真实依据徽标', realBadgeCount > 0, `badge=${realBadgeCount}`);
  check('学区搜索→词条卡片', entryCards > 0, `cards=${entryCards}`);

  // 4. 切到策展 tab 验证 engine.js 仍能加载 entries_slim（分包 require 主包）
  const curateTab = page.locator('.uni-tabbar__item').nth(2);
  await curateTab.click();
  await page.waitForTimeout(2000);
  const curateText = await page.locator('text=策展').count();
  check('策展 tab 跳转', curateText > 0, `count=${curateText}`);

  // 5. 进见面参谋（分包内的页面）验证 engine.js
  // 找"见面参谋"入口
  const seeLink = page.locator('text=见面参谋').first();
  if (await seeLink.count() > 0) {
    await seeLink.click();
    await page.waitForTimeout(2500);
    const seeTitle = await page.locator('text=见面参谋').count();
    check('见面参谋页加载(engine.js 引 entries_slim)', seeTitle > 0, `count=${seeTitle}`);
  } else {
    log.push({ name: '见面参谋入口', ok: 'skip', detail: '未找到入口按钮' });
    console.log('⏭ 见面参谋入口未找到，跳过');
  }

  // 6. 关键：无 entries_slim 跨包 / 模块未定义错误
  check('全程无跨包/模块未定义错误', errors.length === 0, `errors=${errors.length}`);
  if (errors.length > 0) {
    console.log('--- 错误详情 ---');
    errors.forEach(e => console.log('  · ' + e));
  }

  const schoolInput = page.locator('.dict-input input').first();
  // 7. 截图知识页（用户当前看到出错的页）
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const tab7 = page.locator('.uni-tabbar__item', { hasText: '知识' }).first();
  await tab7.click();
  await page.waitForTimeout(1500);
  await schoolInput.fill('学区', { force: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/ke/WorkBuddy/Claw/fengsheng-tasks/outputs/h5_verify_v307/F_knowledge_after_fix.png', fullPage: true });

  await browser.close();
  const failed = log.filter(x => x.ok === false);
  console.log(`\n--- 总结: ${log.length - failed.length}/${log.length} 通过 ---`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
