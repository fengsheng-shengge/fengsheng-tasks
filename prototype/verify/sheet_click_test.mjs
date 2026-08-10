// sheet_click_test.mjs —— 验证 openSheet 查依据浮层词条点击可打开详情（修复 P2 Bug）
// 防回归：openSheet() 生成的 .entry 必须绑定 onclick=openEntry
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const fileUrl = 'file://' + path.resolve('outputs/小豆子V2重设_交互原型_20260725.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const log = (k, ok, extra='') => { console.log(`[${ok?'PASS':'FAIL'}] ${k}${extra?' — '+extra:''}`); ok?pass++:fail++; };

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(fileUrl, { waitUntil: 'networkidle' });
await sleep(200);
await page.click('.lc-btn'); await sleep(200);

for (const key of ['decoder', 'see', 'nego']) {
  await page.evaluate(k => openSheet(k), key);
  await sleep(120);
  const overlayShown = await page.$eval('#overlay', el => el.classList.contains('show'));
  log(`openSheet('${key}') 浮层显示`, overlayShown);

  const firstEntry = await page.$('#sheet-body .entry');
  if (!firstEntry) { log(`openSheet('${key}') 有词条`, false); continue; }
  log(`openSheet('${key}') 浮层有词条`, true);

  // 点击第一条词条 → 应打开 genModal 详情
  await firstEntry.click();
  await sleep(150);
  const modalShown = await page.$eval('#genModal', el => el.classList.contains('show'));
  const bodyLen = await page.$eval('#gen-body', el => el.textContent.trim().length);
  log(`点词条打开详情 (${key})`, modalShown && bodyLen > 10, `modal=${modalShown} bodyLen=${bodyLen}`);

  await page.evaluate(() => closeOverlay('genModal'));
  await sleep(80);
  await page.evaluate(() => closeOverlay('overlay'));
  await sleep(80);
}

// 收藏星标点击不应触发 openEntry（stopPropagation）
await page.evaluate(() => openSheet('decoder'));
await sleep(120);
await page.click('#sheet-body .entry .e-star'); await sleep(120);
const modalAfterStar = await page.$eval('#genModal', el => el.classList.contains('show'));
log('点收藏星标不误开详情', !modalAfterStar);
await page.evaluate(() => closeOverlay('overlay'));
await sleep(80);

log('控制台错误数', errors.length === 0, errors.slice(0,3).join(' | '));
await browser.close();
console.log(`\n=== sheet_click_test: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
