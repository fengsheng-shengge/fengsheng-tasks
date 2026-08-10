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

  const results = [];
  const log = (name, pass, detail) => {
    const icon = pass ? '✅' : '❌';
    results.push({ name, pass, detail });
    console.log(`  ${name}: ${icon}${detail ? ' ' + detail : ''}`);
  };

  console.log('=== PR#189 完整功能测试（v2）===\n');

  // ===== 1. 基础检查 =====
  console.log('【1. 基础检查】');
  log('页面错误', errors.length === 0, errors.length === 0 ? '无' : errors.length + '个');
  log('控制台错误', consoleErrors.length === 0, consoleErrors.length === 0 ? '无' : consoleErrors.length + '个');

  // ===== 2. 登录 =====
  console.log('\n【2. 登录流程】');
  await page.click('.lc-btn');
  await page.waitForTimeout(400);
  const homeVisible = await page.$eval('#home', el => !el.classList.contains('hidden'));
  log('登录后首页显示', homeVisible);

  // ===== 3. 首页内容 =====
  console.log('\n【3. 首页内容】');
  const slogan = await page.$eval('.hero .slogan', el => el.textContent.trim());
  const pos = await page.$eval('.hero .pos', el => el.textContent.trim());
  const points = await page.$eval('.hero .pts', el => el.textContent.trim());
  const cardCount = await page.$$eval('.scard:not(.hide)', els => els.length);
  const chipCount = await page.$$eval('.chip', els => els.length);
  log('品牌语', slogan === '获得尊重', slogan + ' / ' + pos);
  log('初始积分', points.includes('685'), points);
  log('场景卡片数', cardCount === 3, cardCount + '张');
  log('客户类型数', chipCount === 4, chipCount + '类');

  // ===== 4. 工具页 =====
  console.log('\n【4. 工具页(客户解码)】');
  await page.click('.scard[data-stage="售前"]');
  await page.waitForTimeout(400);
  const toolVisible = await page.$eval('#tool-decoder', el => !el.classList.contains('hidden'));
  log('工具页显示', toolVisible);

  const layers = await page.$$eval('#tool-decoder .layer .badge', els => els.map(e => e.textContent.trim()));
  log('道法术器四层', layers.length === 4, layers.join(''));

  // 查依据浮层
  await page.click('#tool-decoder .quick').catch(() => {});
  await page.waitForTimeout(400);
  const overlayVisible = await page.$eval('#overlay', el => el.classList.contains('show')).catch(() => false);
  log('查依据浮层弹出', overlayVisible);

  if (overlayVisible) {
    const entries = await page.$$eval('#sheet-body .entry', els => els.length);
    log('浮层词条数', entries > 0, entries + '条');

    // BUG检测：浮层词条是否有 onclick
    const hasOnclick = await page.$$eval('#sheet-body .entry', els =>
      els.some(e => e.hasAttribute('onclick'))
    ).catch(() => false);
    log('浮层词条点击绑定', hasOnclick, hasOnclick ? '有onclick' : 'BUG: 无onclick，点击词条无响应');

    // 关闭浮层
    await page.evaluate(() => closeOverlay('overlay'));
    await page.waitForTimeout(200);
  }

  // ===== 5. 词典页 → 词条详情 =====
  console.log('\n【5. 词典页 → 词条详情弹层】');
  await page.click('.tabbar .tab:nth-child(2)');
  await page.waitForTimeout(300);
  const dictVisible = await page.$eval('#dict', el => !el.classList.contains('hidden')).catch(() => false);
  log('词典页显示', dictVisible);

  if (dictVisible) {
    const dictEntries = await page.$$eval('#dict .entry', els => els.length).catch(() => 0);
    log('词典词条数', dictEntries === 570, dictEntries + '条');

    // 点击词典第一个词条 → 应触发 openEntry → #genModal.show
    const firstEntryName = await page.$eval('#dict .entry .e-name', el => el.textContent.trim()).catch(() => '');
    await page.click('#dict .entry').catch(() => {});
    await page.waitForTimeout(400);

    const genModalVisible = await page.$eval('#genModal', el => el.classList.contains('show')).catch(() => false);
    log('词条详情弹层(#genModal)', genModalVisible);

    if (genModalVisible) {
      // 检查详情内容
      const genTitle = await page.$eval('#gen-title', el => el.textContent.trim()).catch(() => '');
      const genSub = await page.$eval('#gen-sub', el => el.textContent.trim()).catch(() => '');
      log('详情标题', genTitle.length > 0, genTitle);

      // 关键要点
      const cpItems = await page.$$eval('#genModal .cp-item', els => els.length).catch(() => 0);
      log('关键要点列表', cpItems > 0, cpItems + '条');

      // VIP锁定检查
      const lockedItems = await page.$$eval('#genModal .cp-locked', els => els.length).catch(() => 0);
      log('VIP锁定要点', lockedItems > 0, lockedItems + '条锁定');

      // 纠错入口
      const fixBtn = await page.$$eval('#genModal [onclick*="openContrib"]', els => els.map(e => e.textContent.trim()));
      log('纠错/补充入口', fixBtn.length > 0, fixBtn.join(', '));

      // 分享入口
      const shareBtns = await page.$$eval('#genModal [onclick*="openShare"]', els => els.map(e => e.textContent.trim()));
      log('分享入口', shareBtns.length > 0, shareBtns.join(', '));

      // 法条依据
      const legalRef = await page.$eval('#genModal .legal', el => !!el).catch(() => false);
      log('法条依据区域', legalRef !== false ? '有' : '无');

      // 关闭弹层
      await page.evaluate(() => closeOverlay('genModal'));
      await page.waitForTimeout(200);
    }
  }

  // ===== 6. 分享流程 =====
  console.log('\n【6. 分享流程】');
  if (dictVisible) {
    // 重新点击词条打开详情
    await page.click('#dict .entry').catch(() => {});
    await page.waitForTimeout(300);

    // 点击分享按钮（客户知识卡 or 朋友圈）
    const shareBtn = await page.$('#genModal [onclick*="openShare"]').catch(() => null);
    if (shareBtn) {
      await shareBtn.click();
      await page.waitForTimeout(400);
      const shareVisible = await page.$eval('#shareOverlay', el => el.classList.contains('show')).catch(() => false);
      log('分享浮层弹出', shareVisible);

      if (shareVisible) {
        const shareTitle = await page.$eval('#share-title', el => el.textContent.trim()).catch(() => '');
        log('分享标题', shareTitle.length > 0, shareTitle);

        const shareBody = await page.$eval('#share-body .sharecard', el => !!el).catch(() => false);
        log('分享卡片内容', shareBody);

        // 关闭
        await page.evaluate(() => closeOverlay('shareOverlay'));
        await page.waitForTimeout(200);
      }
    } else {
      log('分享按钮存在', false, '未找到分享按钮');
    }
  }

  // ===== 7. 纠错/反馈流程（端到端）=====
  console.log('\n【7. 纠错/反馈流程（端到端）】');
  // 记录提交前积分
  const pointsBefore = await page.evaluate(() => parseInt(document.querySelector('.hero .pts').textContent.match(/\d+/)?.[0] || 0));
  log('提交前积分', pointsBefore > 0, pointsBefore + '');

  // 从我的页进入纠错
  await page.click('.tabbar .tab:nth-child(5)');
  await page.waitForTimeout(300);

  // 点击"我的反馈 / 纠错"菜单项
  const feedbackMenuItem = await page.$$eval('#mine .mitem', els => {
    const idx = els.findIndex(e => e.textContent.includes('反馈') || e.textContent.includes('纠错'));
    return idx;
  }).catch(() => -1);

  if (feedbackMenuItem >= 0) {
    await page.click(`#mine .mitem:nth-child(${feedbackMenuItem + 1})`).catch(() => {});
    await page.waitForTimeout(300);

    // 应该打开 contribOverlay，查看"我的反馈"列表
    const contribVisible = await page.$eval('#contribOverlay', el => el.classList.contains('show')).catch(() => false);
    log('反馈列表浮层', contribVisible);

    if (contribVisible) {
      // 点击"+ 纠错 / 补充"按钮
      const fixBtn2 = await page.$('#contribOverlay [onclick*="openContrib(\'fix\')"]').catch(() => null);
      if (fixBtn2) {
        await fixBtn2.click();
        await page.waitForTimeout(300);

        // 填写纠错表单
        await page.fill('#fx-name', '测试词条-自动测试');
        await page.fill('#fx-text', '这是一条自动测试提交的纠错内容，用于验证反馈流程。');
        await page.fill('#fx-fix', '建议修正为：测试修正内容');
        await page.fill('#fx-evi', '自动测试依据');
        await page.waitForTimeout(200);

        // 提交
        await page.click('#contribOverlay .form-send').catch(() => {});
        await page.waitForTimeout(500);

        // 检查积分增加 +5
        const pointsAfter = await page.evaluate(() => parseInt(document.querySelector('.hero .pts').textContent.match(/\d+/)?.[0] || 0));
        log('纠错提交后积分(+5)', pointsAfter === pointsBefore + 5, pointsBefore + ' → ' + pointsAfter);

        // 检查 toast
        const toastText = await page.$eval('#toast', el => el.textContent.trim()).catch(() => '');
        log('提交成功toast', toastText.includes('采纳') || toastText.includes('纠错'), toastText);
      }
    }
  }

  // ===== 8. 模拟审核流程 =====
  console.log('\n【8. 模拟审核流程】');
  // 重新打开我的反馈
  await page.click('.tabbar .tab:nth-child(5)').catch(() => {});
  await page.waitForTimeout(200);
  await page.click(`#mine .mitem:nth-child(${feedbackMenuItem + 1})`).catch(() => {});
  await page.waitForTimeout(300);

  const pointsBeforeReview = await page.evaluate(() => parseInt(document.querySelector('.hero .pts').textContent.match(/\d+/)?.[0] || 0));

  // 查找"模拟审核通过"按钮
  const adoptBtn = await page.$('#contribOverlay .fb-btn.adopt').catch(() => null);
  if (adoptBtn) {
    await adoptBtn.click();
    await page.waitForTimeout(500);

    const pointsAfterReview = await page.evaluate(() => parseInt(document.querySelector('.hero .pts').textContent.match(/\d+/)?.[0] || 0));
    log('审核通过后积分(+20)', pointsAfterReview === pointsBeforeReview + 20, pointsBeforeReview + ' → ' + pointsAfterReview);

    // 检查状态变化
    const adoptedStatus = await page.$$eval('#contribOverlay .fbstatus.adopted', els => els.length).catch(() => 0);
    log('已采纳状态显示', adoptedStatus > 0, adoptedStatus + '条');
  } else {
    log('模拟审核按钮', false, '未找到"模拟审核通过"按钮');
  }

  // 关闭浮层
  await page.evaluate(() => closeOverlay('contribOverlay')).catch(() => {});
  await page.waitForTimeout(200);

  // ===== 9. 底部导航完整性 =====
  console.log('\n【9. 底部导航】');
  const tabs = await page.$$eval('.tabbar .tab', els => els.map(e => e.textContent.trim()));
  log('导航项数', tabs.length === 5, tabs.join(' | '));

  // ===== 10. 阶段切换 =====
  console.log('\n【10. 阶段切换】');
  await page.click('.tabbar .tab:nth-child(1)');
  await page.waitForTimeout(200);

  await page.click('.stage-row .stage:nth-child(1)').catch(() => {});
  await page.waitForTimeout(100);
  const preCount = await page.$$eval('.scard:not(.hide)', els => els.length).catch(() => 0);
  log('售前场景数', preCount === 1, preCount + '张');

  await page.click('.stage-row .stage:nth-child(2)').catch(() => {});
  await page.waitForTimeout(100);
  const midCount = await page.$$eval('.scard:not(.hide)', els => els.length).catch(() => 0);
  log('售中场景数', midCount === 2, midCount + '张');

  // 复位
  await page.click('.stage-row .stage:nth-child(2)').catch(() => {});
  await page.waitForTimeout(100);

  // ===== 11. 锁定提示 =====
  console.log('\n【11. 锁定客户类型】');
  await page.click('.chip.lock').catch(() => {});
  await page.waitForTimeout(100);
  const toast = await page.$eval('#toast', el => el.textContent.trim()).catch(() => '');
  log('锁定toast提示', toast.includes('即将') || toast.includes('开放'), toast);

  // ===== 12. 数据完整性 =====
  console.log('\n【12. 数据完整性】');
  const dataCheck = await page.evaluate(() => {
    const d = window.__FENGSHENG_ENTRIES__;
    if (!d) return { loaded: false };
    const all = [...(d.decoder||[]), ...(d.see||[]), ...(d.nego||[])];
    const etypes = {};
    all.forEach(e => { etypes[e.etype] = (etypes[e.etype]||0) + 1; });
    const missingFields = all.filter(e => !e.name || !e.etype || !e.detail || !e.domain);
    return {
      loaded: true,
      decoder: (d.decoder||[]).length,
      see: (d.see||[]).length,
      nego: (d.nego||[]).length,
      total: all.length,
      etypes,
      missingFields: missingFields.length
    };
  });
  log('词条数据加载', dataCheck.loaded);
  log('词条总数', dataCheck.total === 570, `decoder:${dataCheck.decoder} see:${dataCheck.see} nego:${dataCheck.nego}`);
  log('道法术器分布', dataCheck.etypes?.dao > 0 && dataCheck.etypes?.fa > 0 && dataCheck.etypes?.shu > 0, JSON.stringify(dataCheck.etypes));
  log('必填字段完整', dataCheck.missingFields === 0, dataCheck.missingFields === 0 ? '无缺失' : dataCheck.missingFields + '条缺失');

  // ===== 截图 =====
  await page.screenshot({ path: '/workspace/fengsheng-tasks/prototype/verify/shots/test-v2-final.png' });

  // ===== 汇总 =====
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log('\n=== 测试汇总 ===');
  console.log(`通过: ${passed} | 失败: ${failed} | 总计: ${results.length}`);
  if (failed > 0) {
    console.log('\n失败项:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name} ${r.detail||''}`));
  }

  await browser.close();
  console.log('\n=== 测试完成 ===');
})().catch(e => { console.error(e); process.exit(1); });
