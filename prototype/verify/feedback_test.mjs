import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file://' + process.cwd() + '/outputs/小豆子V2重设_交互原型_20260725.html';
const OUT = process.cwd() + '/outputs/verify';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errorsAll = [];
function log(phase, msg){ console.log(`[${phase}] ${msg}`); }
function err(phase, msg){ errorsAll.push(`[${phase}] ${msg}`); log(phase, '❌ '+msg); }

async function closeOverlay(page, id){ await page.evaluate((id)=>closeOverlay(id), id); await sleep(80); }
const pts = page => page.$eval('.pts', e => parseInt(e.textContent,10));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(URL); await sleep(350);
await page.click('.lc-btn'); await sleep(150);  // 微信一键登录

// ===== 进入词典，打开词条并纠错 =====
await page.click('.tabbar .tab[data-screen="dict"]'); await sleep(120);
await page.fill('#dict-search', '合同'); await sleep(120);
await page.click('#dict-list .entry'); await sleep(120);
// 词条详情应有"纠错 / 补充"按钮
const hasFixBtn = await page.$('#gen-body button[onclick*="openContrib(\'fix\'"]');
log('fb', '词条页纠错按钮存在='+!!hasFixBtn);
if(!hasFixBtn) err('fb','词条页缺纠错入口');
await page.click('#gen-body button[onclick*="openContrib(\'fix\'"]'); await sleep(150);

// 纠错表单：类型默认选中、必填项 fx-text
const typeOn = await page.$eval('#fx-type .cp.on', e => e.dataset.k).catch(()=>null);
log('fb', '默认纠错类型='+typeOn);
if(typeOn!=='error') err('fb','默认纠错类型应为 error');

const p0 = await pts(page);
await page.fill('#fx-text', '测试：合同条款中的举例数据应更新为最新口径'); await sleep(60);
await page.click('#contribOverlay .form-send'); await sleep(150);

const fbs1 = await page.evaluate(() => FEEDBACKS.length);
const fbStatus1 = await page.evaluate(() => FEEDBACKS[0] && FEEDBACKS[0].status);
const contrib1 = await page.evaluate(() => contribs.length);
const p1 = await pts(page);
log('fb', `提交后 FEEDBACKS=${fbs1} status=${fbStatus1} contribs=${contrib1} pts ${p0}→${p1}`);
if(fbs1!==1) err('fb','FEEDBACKS 应有1条');
if(fbStatus1!=='pending') err('fb','提交后状态应为 pending');
if(contrib1<1) err('fb','贡献列表应+1（防回归 verify）');
if(p1!==p0+5) err('fb',`提交基础分应为+5，实际 ${p1-p0}`);

// ===== 我的反馈：状态可见 =====
await page.click('.tabbar .tab[data-screen="mine"]'); await sleep(120);
await page.click('.mitem:has-text("我的反馈")'); await sleep(150);
const fbItem = await page.$('.fbitem');
const fbBadge = await page.$eval('.fbstatus', e=>e.textContent).catch(()=>'');
log('fb', '我的反馈列表项存在='+!!fbItem+' 徽章='+fbBadge);
if(!fbItem) err('fb','我的反馈列表应显示提交项');
if(!fbBadge.includes('待审核')) err('fb','徽章应显示待审核');

// ===== 模拟审核通过 → 采纳 +20 =====
await page.click('.fb-btn.adopt'); await sleep(150);
const fbStatus2 = await page.evaluate(() => FEEDBACKS[0].status);
const p2 = await pts(page);
const contribPt = await page.evaluate(() => contribs.find(c=>c.pt===25)?.pt);
log('fb', `采纳后 status=${fbStatus2} pts ${p1}→${p2} 贡献对应分=${contribPt}`);
if(fbStatus2!=='adopted') err('fb','采纳后状态应为 adopted');
if(p2!==p1+20) err('fb',`采纳应再+20，实际 ${p2-p1}`);
if(contribPt!==25) err('fb','采纳后贡献记录应更新为25分');

// ===== 再提交一条 → 模拟驳回（基础分保留）=====
await closeOverlay(page,'contribOverlay'); await sleep(80);
await page.click('.tabbar .tab[data-screen="dict"]'); await sleep(120);
await page.fill('#dict-search', '合同'); await sleep(120);
await page.click('#dict-list .entry'); await sleep(120);
await page.click('#gen-body button[onclick*="openContrib(\'fix\'"]'); await sleep(120);
await page.fill('#fx-text', '第二条纠错：补充学区房最新政策话术'); await sleep(60);
await page.click('#contribOverlay .form-send'); await sleep(150);
const p3 = await pts(page);
await page.click('.tabbar .tab[data-screen="mine"]'); await sleep(120);
await page.click('.mitem:has-text("我的反馈")'); await sleep(150);
// 第二条为 pending，点驳回
const rejectBtn = await page.$$('.fb-btn.reject');
log('fb', `第二条提交后 pts ${p2}→${p3} 驳回按钮数=${rejectBtn.length}`);
if(p3!==p2+5) err('fb',`第二条提交应+5，实际 ${p3-p2}`);
if(rejectBtn.length<1) err('fb','应有可驳回按钮');
await rejectBtn[0].click(); await sleep(150);
const fbStatus3 = await page.evaluate(() => FEEDBACKS.find(f=>f.status==='rejected')?.status);
const p4 = await pts(page);
log('fb', `驳回后 status=${fbStatus3} pts ${p3}→${p4}`);
if(fbStatus3!=='rejected') err('fb','驳回后状态应为 rejected');
if(p4!==p3) err('fb','驳回不应扣基础分，实际 '+ (p4-p3));

// ===== 方案预览页也应能纠错 =====
await closeOverlay(page,'contribOverlay'); await sleep(80);
await page.evaluate(()=>openPreview('价格锚定卡')); await sleep(150);
const planFixBtn = await page.$('#gen-body button[onclick*="openContrib(\'fix\'"]');
log('fb', '方案预览页纠错按钮存在='+!!planFixBtn);
if(!planFixBtn) err('fb','方案预览页缺纠错入口');

// ===== 控制台错误 =====
log('fb', `console错误数=${consoleErrors.length}`);
consoleErrors.forEach(e => err('fb', e));

await browser.close();
console.log('\n===== 反馈纠错测试汇总 =====');
if(errorsAll.length){ console.log('❌ 失败 '+errorsAll.length+' 项:'); errorsAll.forEach(e=>console.log('  '+e)); process.exit(1); }
else { console.log('✅ 全部通过：提交→双段积分 / 我的反馈状态 / 采纳+20 / 驳回保留 / 多场景入口'); }
