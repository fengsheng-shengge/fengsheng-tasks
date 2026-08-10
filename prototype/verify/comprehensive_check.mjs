import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';

const URL = 'file://' + process.cwd() + '/outputs/小豆子V2重设_交互原型_20260725.html';
const OUT = process.cwd() + '/outputs/verify/shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const log = (...a) => console.log(...a);

// 关闭所有可能浮层（按类 + 常见 id 双重保险）
async function closeAll(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
    ['overlay','clientsOverlay','clientOverlay','contribOverlay','entryOverlay','genModal','sheetOverlay']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('show'); });
  });
  await sleep(90);
}

async function fullRun(browser, label, viewport) {
  const page = await browser.newPage({ viewport });
  const ce = [];
  page.on('console', m => { if (m.type() === 'error') ce.push(m.text()); });
  page.on('pageerror', e => ce.push('PAGEERR: ' + e.message));
  const step = async (name, fn) => {
    try { await fn(); } catch (e) { errors.push(`[${label}] 步骤[${name}]异常: ${e.message.split('\n')[0]}`); }
  };

  await page.goto(URL); await sleep(450);
  await step('login', async () => { await page.click('.lc-btn'); await sleep(200); });
  await step('home', async () => { await page.screenshot({ path: `${OUT}/${label}-01-home.png` }); });

  // 词典（真实 570 条）
  await step('dict', async () => {
    await page.evaluate(() => go('dict')); await sleep(250);
    await page.fill('#dict-search', '合同'); await sleep(250);
    const n = await page.$$eval('#dict-list .entry', e => e.length);
    errors.push(`[${label}] 词典搜"合同"结果=${n}` + (n < 1 ? ' ❌' : ' ✓'));
    await page.screenshot({ path: `${OUT}/${label}-02-dict.png` });
  });
  // 打开词条详情
  await step('entry', async () => {
    const first = await page.$('#dict-list .entry');
    if (first) { await first.click(); await sleep(250); await page.screenshot({ path: `${OUT}/${label}-03-entry.png` }); }
    await closeAll(page);
  });
  // 道法术器分层（openSheet 正确 key=decoder/see/nego）
  await step('sheet', async () => {
    await page.evaluate(() => openSheet && openSheet('decoder')); await sleep(250);
    await page.screenshot({ path: `${OUT}/${label}-04-sheet-decoder.png` });
    await closeAll(page);
  });
  // 方案预览 + 纠错入口
  await step('preview', async () => {
    await page.evaluate(() => go('home')); await sleep(150);
    await page.evaluate(() => openPreview && openPreview('价格锚定卡')); await sleep(300);
    await page.screenshot({ path: `${OUT}/${label}-05-preview.png` });
    const fixBtn = await page.$('#gen-body button[onclick*="openContrib(\'fix\'"]');
    if (fixBtn) { await fixBtn.click(); await sleep(250); await page.screenshot({ path: `${OUT}/${label}-06-preview-fix.png` }); }
    await closeAll(page);
  });
  // 我的客户（浮层，由 openClients 触发）
  await step('client', async () => {
    await page.evaluate(() => openClients && openClients()); await sleep(250);
    await page.screenshot({ path: `${OUT}/${label}-07-client.png` });
    await closeAll(page);
  });
  // 我的 + 贡献 + 反馈
  await step('mine', async () => {
    await page.evaluate(() => go('mine')); await sleep(200);
    await page.screenshot({ path: `${OUT}/${label}-08-mine.png` });
    await page.evaluate(() => openContrib && openContrib('list')); await sleep(250);
    await page.screenshot({ path: `${OUT}/${label}-09-contrib.png` });
    await closeAll(page);
    await page.evaluate(() => openContrib && openContrib('feedbacks')); await sleep(250);
    await page.screenshot({ path: `${OUT}/${label}-10-feedback.png` });
    await closeAll(page);
  });

  errors.push(`[${label}] console错误数=${ce.length}` + (ce.length ? ' ❌' : ' ✓'));
  ce.forEach(e => errors.push('   ' + e));
  await page.close();
  return ce.length;
}

// ===== 主浏览器：桌面 + 移动端 =====
const b = await chromium.launch({ channel: 'chrome' });
await fullRun(b, 'desktop', { width: 1280, height: 800 });
await fullRun(b, 'mobile', { width: 390, height: 844 });
await b.close();

// ===== 跨浏览器：firefox / webkit（未装则记录）=====
for (const [name, fn] of [['firefox', firefox], ['webkit', webkit]]) {
  try {
    const bb = await fn.launch();
    const n = await fullRun(bb, name, { width: 1280, height: 800 });
    await bb.close();
    errors.push(`[${name}] 跨浏览器加载 OK，错误数=${n}`);
  } catch (e) {
    errors.push(`[${name}] 跨浏览器不可用(可能未安装): ${e.message.split('\n')[0]}`);
  }
}

log('');
log('========== 全面检测报告 ==========');
errors.forEach(e => log(e));
const fatal = errors.filter(e => e.includes('❌') || (e.includes('异常') && !e.includes('none')));
log('========== 结论: ' + (fatal.length ? `发现 ${fatal.length} 项需关注 ❌` : '全面检测通过 ✓（chromium 桌面+移动 0 控制台错误）' ) + ' ==========');
