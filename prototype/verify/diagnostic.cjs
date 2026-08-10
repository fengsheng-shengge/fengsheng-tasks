const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 880 } });

  const url = 'file://' + process.cwd() + '/小豆子V2重设_交互原型_20260725.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Login
  await page.click('.lc-btn');
  await page.waitForTimeout(300);

  console.log('=== 专项问题排查 ===\n');

  // Issue 1: 查依据浮层词条数
  console.log('【问题1: 查依据浮层词条数】');
  await page.click('.scard[data-stage="售前"]');
  await page.waitForTimeout(300);
  await page.click('#tool-decoder .quick');
  await page.waitForTimeout(500);

  const entriesAll = await page.$$eval('#sheet-body .entry', els => els.length);
  const lyHeads = await page.$$eval('#sheet-body .ly-head', els => els.map(e => e.textContent.trim()));
  const entriesByLayer = await page.evaluate(() => {
    const body = document.getElementById('sheet-body');
    const groups = {};
    let currentLayer = 'unknown';
    body.querySelectorAll('.ly-head, .entry').forEach(el => {
      if (el.classList.contains('ly-head')) {
        currentLayer = el.textContent.trim();
        groups[currentLayer] = 0;
      } else {
        groups[currentLayer] = (groups[currentLayer] || 0) + 1;
      }
    });
    return groups;
  });

  console.log('  总词条数:', entriesAll);
  console.log('  层级分组:', lyHeads);
  console.log('  各层词条:', JSON.stringify(entriesByLayer));

  // 关闭
  await page.evaluate(() => closeOverlay('overlay'));
  await page.waitForTimeout(200);

  // Issue 2: 词典搜索"合同"
  console.log('\n【问题2: 词典搜索"合同"】');
  await page.click('.tabbar .tab:nth-child(2)');
  await page.waitForTimeout(300);

  const dictBeforeSearch = await page.$$eval('#dict-list .entry', els => els.length).catch(() => 0);
  console.log('  搜索前词条数:', dictBeforeSearch);

  // 搜索"合同"
  await page.fill('#dict-search', '合同');
  await page.waitForTimeout(300);

  const dictAfterSearch = await page.$$eval('#dict-list .entry', els => els.length).catch(() => 0);
  console.log('  搜索"合同"结果数:', dictAfterSearch);

  // 搜索"定金"
  await page.fill('#dict-search', '定金');
  await page.waitForTimeout(300);
  const dingjinResults = await page.$$eval('#dict-list .entry', els => els.length).catch(() => 0);
  console.log('  搜索"定金"结果数:', dingjinResults);

  // 搜索"客户"
  await page.fill('#dict-search', '客户');
  await page.waitForTimeout(300);
  const kehuResults = await page.$$eval('#dict-list .entry', els => els.length).catch(() => 0);
  console.log('  搜索"客户"结果数:', kehuResults);

  // 清空搜索
  await page.fill('#dict-search', '');
  await page.waitForTimeout(300);
  const dictCleared = await page.$$eval('#dict-list .entry', els => els.length).catch(() => 0);
  console.log('  清空后词条数:', dictCleared);

  // 检查搜索匹配逻辑
  const searchCheck = await page.evaluate(() => {
    const all = window.__FENGSHENG_ENTRIES__;
    const allEntries = [...(all.decoder||[]), ...(all.see||[]), ...(all.nego||[])];
    const matches = allEntries.filter(e =>
      (e.name + ' ' + e.alias.join(' ') + ' ' + e.cq + ' ' + e.ola).toLowerCase().includes('合同')
    );
    return {
      total: allEntries.length,
      contractMatches: matches.length,
      sampleMatches: matches.slice(0, 3).map(e => e.name)
    };
  });
  console.log('  数据中含"合同"词条:', searchCheck.contractMatches, searchCheck.sampleMatches);

  // Issue 3: 点击词典词条打开详情
  console.log('\n【问题3: 词典词条点击】');
  await page.fill('#dict-search', '');
  await page.waitForTimeout(200);

  const dictEntries = await page.$$eval('#dict-list .entry', els => els.length);
  console.log('  词典词条数:', dictEntries);

  if (dictEntries > 0) {
    await page.click('#dict-list .entry');
    await page.waitForTimeout(300);
    const modalShown = await page.$eval('#genModal', el => el.classList.contains('show')).catch(() => false);
    console.log('  点击后详情弹层:', modalShown);

    if (modalShown) {
      const title = await page.$eval('#gen-title', el => el.textContent.trim()).catch(() => '');
      console.log('  详情标题:', title);
    }
  }

  await browser.close();
  console.log('\n=== 排查完成 ===');
})().catch(e => { console.error(e); process.exit(1); });
