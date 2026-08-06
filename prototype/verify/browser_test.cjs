const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const url = 'file://' + process.cwd() + '/小豆子V2重设_交互原型_20260725.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('=== 浏览器加载测试 ===');
  console.log('页面错误(pageerror):', errors.length === 0 ? '无 ✅' : errors.join('\n'));
  console.log('控制台错误(console.error):', consoleErrors.length === 0 ? '无 ✅' : consoleErrors.join('\n'));

  const title = await page.title();
  console.log('页面标题:', title);

  // 检查登录页
  const loginVisible = await page.$eval('#loginOverlay', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('登录页显示:', loginVisible ? '是 ✅' : '否 ❌');

  // 执行登录
  await page.click('.lc-btn').catch(() => {});
  await page.waitForTimeout(500);

  const homeVisible = await page.$eval('#home', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('登录后首页显示:', homeVisible ? '是 ✅' : '否 ❌');

  // 检查品牌语
  const slogan = await page.$eval('.hero .slogan', el => el.textContent.trim()).catch(() => '');
  const pos = await page.$eval('.hero .pos', el => el.textContent.trim()).catch(() => '');
  console.log('品牌语:', slogan, '/', pos);

  // 检查场景卡片
  const cardCount = await page.$$eval('.scard:not(.hide)', els => els.length).catch(() => 0);
  console.log('场景卡片数量:', cardCount);

  // 检查词条数据加载
  const entriesLoaded = await page.evaluate(() => {
    const d = window.__FENGSHENG_ENTRIES__;
    if (!d) return '未加载 ❌';
    return 'decoder:' + (d.decoder||[]).length + ' see:' + (d.see||[]).length + ' nego:' + (d.nego||[]).length;
  });
  console.log('词条数据:', entriesLoaded);

  // 点击场景卡进工具页
  await page.click('.scard[data-stage="售前"]').catch(() => {});
  await page.waitForTimeout(500);
  const toolVisible = await page.$eval('#tool-decoder', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('工具页显示:', toolVisible ? '是 ✅' : '否 ❌');

  if (toolVisible) {
    const layers = await page.$$eval('#tool-decoder .layer .badge', els => els.map(e => e.textContent.trim())).catch(() => []);
    console.log('道法术器四层:', layers.join(''), layers.length === 4 ? '✅' : '❌');

    const entryCount = await page.$$eval('#tool-decoder .eitem', els => els.length).catch(() => 0);
    console.log('词条列表数量:', entryCount);

    // 点击第一个词条查看详情
    await page.click('#tool-decoder .eitem').catch(() => {});
    await page.waitForTimeout(300);
    const detailVisible = await page.$eval('#entry-sheet', el => el.classList.contains('show')).catch(() => false);
    console.log('词条详情弹层:', detailVisible ? '是 ✅' : '否 ❌');

    // 检查反馈纠错入口
    const fbBtn = await page.$eval('[onclick*="openFeedback"], .fb-trigger, [data-fb]', el => el.textContent.trim()).catch(() => '');
    console.log('反馈纠错入口:', fbBtn ? '存在 ✅ (' + fbBtn + ')' : '未找到');
  }

  // 检查底部导航
  const navItems = await page.$$eval('.bottom-nav .nav-item', els => els.map(e => e.textContent.trim())).catch(() => []);
  console.log('底部导航:', navItems.join(' | '));

  // 检查我的页
  await page.click('.nav-item[data-tab="mine"], .nav-item:last-child').catch(() => {});
  await page.waitForTimeout(300);
  const mineVisible = await page.$eval('#mine', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('我的页显示:', mineVisible ? '是 ✅' : '否 ❌');

  if (mineVisible) {
    const mineContent = await page.$$eval('#mine .mine-item, #mine .mi', els => els.map(e => e.textContent.trim())).catch(() => []);
    console.log('我的页菜单项:', mineContent.join(' | '));
  }

  // 检查积分显示
  const points = await page.$eval('.hero .pts', el => el.textContent.trim()).catch(() => '');
  console.log('积分显示:', points || '未找到');

  // 截图
  await page.screenshot({ path: '/workspace/fengsheng-tasks/prototype/verify/shots/test-home.png' });
  console.log('\n截图已保存: test-home.png');

  await browser.close();
  console.log('=== 浏览器测试完成 ===');
})().catch(e => { console.error(e); process.exit(1); });
