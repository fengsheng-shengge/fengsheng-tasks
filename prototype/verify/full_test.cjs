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
  await page.waitForTimeout(800);

  console.log('=== PR#189 全面功能测试 ===\n');

  // 1. 基础检查
  console.log('【1. 基础检查】');
  console.log('  页面错误:', errors.length === 0 ? '无 ✅' : errors.length + '个 ❌');
  console.log('  控制台错误:', consoleErrors.length === 0 ? '无 ✅' : consoleErrors.length + '个 ❌');

  // 2. 登录流程
  await page.click('.lc-btn');
  await page.waitForTimeout(400);
  const homeVisible = await page.$eval('#home', el => !el.classList.contains('hidden'));
  console.log('\n【2. 登录流程】');
  console.log('  登录后首页:', homeVisible ? '✅' : '❌');

  // 3. 首页内容
  const slogan = await page.$eval('.hero .slogan', el => el.textContent.trim());
  const pos = await page.$eval('.hero .pos', el => el.textContent.trim());
  const points = await page.$eval('.hero .pts', el => el.textContent.trim());
  const cardCount = await page.$$eval('.scard:not(.hide)', els => els.length);
  const chipCount = await page.$$eval('.chip', els => els.length);
  console.log('\n【3. 首页内容】');
  console.log('  品牌语:', slogan, '/', pos, slogan === '获得尊重' ? '✅' : '❌');
  console.log('  积分:', points, '✅');
  console.log('  场景卡片:', cardCount, cardCount === 3 ? '✅' : '❌');
  console.log('  客户类型:', chipCount, chipCount === 4 ? '✅' : '❌');

  // 4. 进入工具页
  await page.click('.scard[data-stage="售前"]');
  await page.waitForTimeout(400);
  const toolVisible = await page.$eval('#tool-decoder', el => !el.classList.contains('hidden'));
  console.log('\n【4. 工具页(客户解码)】');
  console.log('  工具页显示:', toolVisible ? '✅' : '❌');

  // 四层检查
  const layers = await page.$$eval('#tool-decoder .layer .badge', els => els.map(e => e.textContent.trim()));
  console.log('  道法术器四层:', layers.join(''), layers.length === 4 ? '✅' : '❌');

  // 查依据按钮 → openSheet
  await page.click('#tool-decoder .quick').catch(() => {});
  await page.waitForTimeout(400);
  const overlayVisible = await page.$eval('#overlay', el => el.classList.contains('show')).catch(() => false);
  console.log('  查依据浮层:', overlayVisible ? '✅' : '❌');

  if (overlayVisible) {
    const entries = await page.$$eval('#sheet-body .entry', els => els.length);
    console.log('  浮层词条数:', entries, entries > 0 ? '✅' : '❌');

    // 点击第一个词条
    if (entries > 0) {
      await page.click('#sheet-body .entry').catch(() => {});
      await page.waitForTimeout(300);

      // 检查词条详情弹层 (openEntry 使用 #genModal)
      const entrySheet = await page.$eval('#genModal', el => el.classList.contains('show')).catch(() => false);
      console.log('  词条详情弹层:', entrySheet ? '✅' : '❌');

      if (entrySheet) {
        // 检查纠错入口
        const fixBtns = await page.$$eval('#genModal [onclick*="openContrib"]', els => els.map(e => e.textContent.trim()));
        console.log('  纠错/反馈入口:', fixBtns.length > 0 ? '✅ ' + fixBtns.join(', ') : '❌');

        // 检查分享入口
        const shareBtns = await page.$$eval('#genModal [onclick*="openShare"]', els => els.map(e => e.textContent.trim()));
        console.log('  分享入口:', shareBtns.length > 0 ? '✅ ' + shareBtns.join(', ') : '❌');
      }
    }

    // 关闭浮层
    await page.evaluate(() => closeOverlay('overlay')).catch(() => {});
    await page.waitForTimeout(200);
  }

  // 5. 底部导航
  const tabs = await page.$$eval('.tabbar .tab', els => els.map(e => e.textContent.trim()));
  console.log('\n【5. 底部导航】');
  console.log('  导航项:', tabs.join(' | '));

  // 6. 知识词典页
  await page.click('.tabbar .tab:nth-child(2)');
  await page.waitForTimeout(300);
  const dictVisible = await page.$eval('#dict', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('\n【6. 知识词典】');
  console.log('  词典页显示:', dictVisible ? '✅' : '❌');

  if (dictVisible) {
    const dictEntries = await page.$$eval('#dict .entry', els => els.length).catch(() => 0);
    console.log('  词典词条数:', dictEntries, dictEntries > 0 ? '✅' : '❌');
  }

  // 7. 我的页
  await page.click('.tabbar .tab:nth-child(5)');
  await page.waitForTimeout(300);
  const mineVisible = await page.$eval('#mine', el => !el.classList.contains('hidden')).catch(() => false);
  console.log('\n【7. 我的页】');
  console.log('  我的页显示:', mineVisible ? '✅' : '❌');

  if (mineVisible) {
    const mineItems = await page.$$eval('#mine .mitem .mt', els => els.map(e => e.textContent.trim()));
    console.log('  菜单项:', mineItems.join(' | '));
    const hasFeedback = mineItems.some(t => String(t).includes('反馈') || String(t).includes('纠错'));
    console.log('  反馈纠错入口:', hasFeedback ? '✅' : '❌');
  }

  // 8. 数据完整性
  const dataCheck = await page.evaluate(() => {
    const d = window.__FENGSHENG_ENTRIES__;
    if (!d) return { loaded: false };
    return {
      loaded: true,
      decoder: (d.decoder||[]).length,
      see: (d.see||[]).length,
      nego: (d.nego||[]).length,
      total: (d.decoder||[]).length + (d.see||[]).length + (d.nego||[]).length
    };
  });
  console.log('\n【8. 数据完整性】');
  console.log('  词条数据:', dataCheck.loaded ? '✅' : '❌');
  console.log('  decoder:', dataCheck.decoder, '| see:', dataCheck.see, '| nego:', dataCheck.nego);
  console.log('  总数:', dataCheck.total, dataCheck.total === 570 ? '✅' : '❌');

  // 9. 阶段切换
  await page.click('.tabbar .tab:nth-child(1)'); // 回首页
  await page.waitForTimeout(200);
  console.log('\n【9. 阶段切换】');
  // 售前
  await page.click('.stage-row .stage:nth-child(1)').catch(() => {});
  await page.waitForTimeout(100);
  const preCount = await page.$$eval('.scard:not(.hide)', els => els.length).catch(() => 0);
  console.log('  售前场景:', preCount, preCount === 1 ? '✅' : '❌');
  // 售中
  await page.click('.stage-row .stage:nth-child(2)').catch(() => {});
  await page.waitForTimeout(100);
  const midCount = await page.$$eval('.scard:not(.hide)', els => els.length).catch(() => 0);
  console.log('  售中场景:', midCount, midCount === 2 ? '✅' : '❌');
  // 复位
  await page.click('.stage-row .stage:nth-child(2)').catch(() => {});
  await page.waitForTimeout(100);

  // 10. 锁定客户类型提示
  await page.click('.chip.lock').catch(() => {});
  await page.waitForTimeout(100);
  const toast = await page.$eval('#toast', el => el.textContent.trim()).catch(() => '');
  console.log('\n【10. 锁定提示】');
  console.log('  锁定客户toast:', toast.includes('即将开放') || toast.includes('即将') ? '✅' : '❌ (' + toast + ')');

  // 截图
  await page.screenshot({ path: '/workspace/fengsheng-tasks/prototype/verify/shots/test-full.png' });

  await browser.close();
  console.log('\n=== 测试完成 ===');
})().catch(e => { console.error(e); process.exit(1); });
