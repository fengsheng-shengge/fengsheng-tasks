import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file://' + process.cwd() + '/outputs/小豆子V2重设_交互原型_20260725.html';
const OUT = process.cwd() + '/outputs/verify';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const issues = [];
const ok = [];
function logI(sev, mod, msg) { issues.push({sev, mod, msg}); console.log(`  [${sev}] ${mod}: ${msg}`); }
function logO(mod, msg) { ok.push({mod, msg}); console.log(`  [OK] ${mod}: ${msg}`); }
const vis = (page, id) => page.$eval('#'+id, e => e.classList.contains('show'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(URL);
await sleep(300);
// 登录（账号独立性）：微信手机号一键登录
await page.click('.lc-btn'); await sleep(150);
console.log('\n=== 深度测试开始 ===');
logO('加载', `标题=${await page.title()}`);

// 1. 浮层漏关：词典→词条→生成卡→关卡→genModal残留
console.log('\n-- 测试1: 浮层漏关 (genModal 残留) --');
await page.evaluate(() => go('dict')); await sleep(120);
await page.fill('#dict-search', '合同'); await sleep(120);
await page.click('#dict-list .entry'); await sleep(200);
const g1 = await vis(page,'genModal');
const hasClient = await page.$('#gen-body button[onclick*="openShare(\'client\'"]') !== null;
const hasMoment = await page.$('#gen-body button[onclick*="openShare(\'moment\'"]') !== null;
logO('词典词条', `genModal=${g1} 客户卡btn=${hasClient} 朋友圈btn=${hasMoment}`);
await page.click('#gen-body button[onclick*="openShare(\'client\'"]'); await sleep(200);
const shareShown = await vis(page,'shareOverlay');
const gDuring = await vis(page,'genModal');   // 期望 false
logO('生成卡', `shareOverlay=${shareShown} 此时genModal仍开=${gDuring}`);
if (gDuring) logI('BUG', '浮层', '生成客户知识卡时未关闭 genModal，两层叠加(脏状态)');
await page.screenshot({ path: `${OUT}/deep-overlay-leak.png` });
// 用 JS 关掉 share（模拟用户点背景关闭）
await page.evaluate(() => closeOverlay('shareOverlay')); await sleep(150);
const shareClosed = !(await vis(page,'shareOverlay'));
const gAfter = await vis(page,'genModal');
logO('关卡后', `shareClosed=${shareClosed} genModal仍开=${gAfter}`);
if (gAfter) logI('BUG', '浮层', '关掉分享卡后 genModal 仍残留，用户看到旧详情/双层');
await page.evaluate(() => closeOverlay('genModal')); await sleep(100);

// 2. 我的收藏 筛选
console.log('\n-- 测试2: 我的收藏 应为收藏筛选 --');
await page.evaluate(() => go('dict')); await sleep(100);
await page.fill('#dict-search', '预算'); await sleep(100);
await page.click('#dict-list .entry .e-star'); await sleep(120);
const favSize = await page.evaluate(() => fav.size);
await page.evaluate(() => go('mine')); await sleep(100);
const stFav = await page.$eval('#st-fav', e => e.textContent.trim());
logO('收藏', `fav.size=${favSize} 我的页st-fav=${stFav}`);
await page.click('.mitem:has-text("我的收藏")'); await sleep(200);
const onDict = await page.$eval('#dict', e => !e.classList.contains('hidden'));
const dictCount = await page.$$eval('#dict-list .entry', els => els.length);
logO('我的收藏', `跳dict=${onDict} 列词条数=${dictCount} (fav=${favSize})`);
if (onDict && dictCount > favSize) logI('BUG', '我的收藏', `点"我的收藏"显示全部 ${dictCount} 条而非筛选收藏(${favSize})，名不副实`);

// 3. +50 开单转化 入口
console.log('\n-- 测试3: +50 开单转化 提交入口可达 --');
const dealRefs = await page.evaluate(() => (document.documentElement.innerHTML.match(/openContrib\('deal'/g)||[]).length);
logO('开单入口', `源码 openContrib('deal') 引用=${dealRefs}`);
if (dealRefs === 0) logI('BUG', '贡献', '积分规则承诺"开单/信任转化 +50"，但全 App 无触发入口，用户无法提交该贡献');

// 4. 登录打卡 +5
console.log('\n-- 测试4: 每日登录打卡 +5 入口 --');
const ck = await page.evaluate(() => (document.documentElement.innerHTML.match(/打卡|每日登录/g)||[]).length);
logO('打卡', `规则文案引用=${ck} (无触发逻辑)`);
if (ck <= 1) logI('NOTE', '贡献', '规则含"每日登录打卡 +5"但无触发(可后接服务端)');

// 5. 发客户类 客户视角
console.log('\n-- 测试5: 发客户交付物 客户视角呈现 --');
const sendItems = await page.$$eval('.d-btn[data-act="send"]', els => els.map(e=>e.dataset.name));
logO('发客户项', `共 ${sendItems.length}: ${sendItems.join(' / ')}`);
await page.evaluate(() => go('tool-decoder')); await sleep(120);
await page.click('.d-btn[data-act="send"][data-name="客户画像卡"]'); await sleep(150);
const toastTxt = await page.$eval('#toast', e => e.textContent);
const g2 = await vis(page,'genModal');
const wechat = await page.$('#gen-body .wechat') !== null;
logO('客户画像卡', `toast="${toastTxt}" genModal=${g2} 客户视角=${wechat}`);
if (!g2 && !wechat) logI('GAP', '器层', `发客户类(${sendItems.join('/')})仅toast，不呈现"客户收到啥"，看不到可信/有用感知`);
await page.evaluate(() => closeOverlay('genModal')); await sleep(100);

// 6. 测评刷分
console.log('\n-- 测试6: 测评 可刷分 --');
await page.evaluate(() => go('quiz')); await sleep(120);
const p0 = await page.evaluate(() => POINTS);
const okIdx = await page.evaluate(() => QUIZ[qi%QUIZ.length].opts.findIndex(o=>o.ok));
await page.click(`#quiz-card .qopt[data-i="${okIdx}"]`); await sleep(120);
const p1 = await page.evaluate(() => POINTS);
logO('答对', `POINTS ${p0}->${p1} (期望+10)`);
await page.click('#qretry'); await sleep(120);
const p1b = await page.evaluate(() => POINTS);
await page.click(`#quiz-card .qopt[data-i="${okIdx}"]`); await sleep(120);
const p2 = await page.evaluate(() => POINTS);
logO('再答一次重答', `POINTS ${p1b}->${p2}`);
if (p2 >= p1 + 10) logI('GAP', '测评', '答错后"再答一次"重答可再+10，且同题可无限刷分');
await page.screenshot({ path: `${OUT}/deep-quiz.png` });

// 7. 测评答错反馈
console.log('\n-- 测试7: 测评答错 反馈质量 --');
await page.evaluate(() => { qi=0; renderQuiz(); }); await sleep(100);
const wrongIdx = await page.evaluate(() => QUIZ[qi%QUIZ.length].opts.findIndex(o=>!o.ok));
await page.click(`#quiz-card .qopt[data-i="${wrongIdx}"]`); await sleep(120);
const enc = await page.$eval('#qenc', e => e.textContent);
const whyShown = await page.$eval('#qwhy', e => e.classList.contains('show'));
const pWrong = await page.evaluate(() => POINTS);
const streak = await page.evaluate(() => STREAK);
logO('答错', `鼓励="${enc}" 解析=${whyShown} POINTS=${pWrong} STREAK=${streak}`);
if (streak !== 0) logI('BUG', '测评', '答错后 STREAK 未归零');

// 8. 移动端溢出
console.log('\n-- 测试8: 移动端 375 横向溢出 --');
await page.setViewportSize({ width: 375, height: 812 }); await sleep(200);
const ov = await page.evaluate(() => { const ph=document.querySelector('.phone'); return {sw:ph.scrollWidth,cw:ph.clientWidth}; });
logO('移动端phone', `scrollWidth=${ov.sw} clientWidth=${ov.cw}`);
if (ov.sw > ov.cw) logI('BUG', '移动端', `375 视口 phone 横向溢出 ${ov.sw}>${ov.cw}`);
const homeOv = await page.evaluate(() => { const s=document.querySelector('#home'); return {sw:s.scrollWidth,cw:s.clientWidth}; });
logO('首页', `scrollWidth=${homeOv.sw} clientWidth=${homeOv.cw}`);
if (homeOv.sw > homeOv.cw) logI('BUG', '移动端', `首页内容横向溢出 ${homeOv.sw}>${homeOv.cw}`);
await page.screenshot({ path: `${OUT}/deep-mobile.png` });

// 9. 阶段空态
console.log('\n-- 测试9: 阶段切换 售后空态 --');
await page.setViewportSize({ width: 420, height: 880 });
await page.evaluate(() => go('home')); await sleep(100);
await page.click('.stage:has-text("售后")'); await sleep(120);
const emptyShown = await page.$eval('#home-empty', e => !e.classList.contains('hidden'));
const cardsHidden = await page.$$eval('.scard:not(.hide)', els => els.length);
logO('售后', `空态=${emptyShown} 可见卡片=${cardsHidden}`);
if (!emptyShown) logI('BUG', '首页', '售后阶段未显示"即将开放"空态');
await page.click('.stage:has-text("售前")'); await sleep(100);
const back = await page.$$eval('.scard:not(.hide)', els => els.length);
logO('回售前', `可见卡片=${back}`);

// 10. 控制台
console.log('\n-- 测试10: 控制台报错 --');
logO('控制台', `报错数=${consoleErrors.length}`);
consoleErrors.forEach(e => logI('BUG', '控制台', e));

// ---------- 11. 账号独立性（数据不串号）----------
console.log('\n-- 测试11: 账号独立性 --');
const uidA = await page.evaluate(() => UID);
const ptsA0 = await page.evaluate(() => POINTS);
await page.evaluate(() => go('quiz')); await sleep(80);
const okIdxA = await page.evaluate(() => QUIZ[qi%QUIZ.length].opts.findIndex(o=>o.ok));
await page.click(`#quiz-card .qopt[data-i="${okIdxA}"]`); await sleep(100);
const ptsA2 = await page.evaluate(() => POINTS);
logO('A账号', `uid=${uidA} 登录积分=${ptsA0} 答对后=${ptsA2}`);
await page.evaluate(() => logout()); await sleep(120);
await page.evaluate(() => demoOtherAccount()); await sleep(150);
const uidB = await page.evaluate(() => UID);
const ptsB = await page.evaluate(() => POINTS);
logO('B账号', `uid=${uidB} 积分=${ptsB}`);
if(uidA===uidB) logI('BUG','独立性','两次登录 uid 相同，未独立');
if(ptsB>=ptsA2) logI('BUG','独立性',`新账号 B 积分(${ptsB})未重置，与 A(${ptsA2})串号`);
await page.evaluate(() => logout()); await sleep(120);
await page.evaluate((u)=>loginAs(u), uidA); await sleep(150);
const ptsBack = await page.evaluate(() => POINTS);
logO('切回A', `积分=${ptsBack} (期望=${ptsA2})`);
if(ptsBack!==ptsA2) logI('BUG','独立性','切回 A 后积分未恢复，持久化失败');

// 12. 持久化（重开不清空）：刷新页面后仍是本人、记录保留
console.log('\n-- 测试12: 刷新后记录沉淀保留 --');
await page.reload(); await sleep(400);
const uidR = await page.evaluate(() => UID);
const ptsR = await page.evaluate(() => POINTS);
logO('刷新后', `uid=${uidR} 积分=${ptsR} (期望uid=${uidA} 积分=${ptsA2})`);
if(uidR!==uidA) logI('BUG','持久化',`刷新后身份变了（${uidR}），未自动登录本人`);
if(ptsR!==ptsA2) logI('BUG','持久化','刷新后积分未保留，记录被清空');

console.log('\n=== 问题汇总 ===');
const c = {BUG:issues.filter(i=>i.sev==='BUG').length, GAP:issues.filter(i=>i.sev==='GAP').length, NOTE:issues.filter(i=>i.sev==='NOTE').length};
console.log(`BUG=${c.BUG} GAP=${c.GAP} NOTE=${c.NOTE} 通过=${ok.length}`);
issues.forEach(i => console.log(`  ${i.sev} | ${i.mod} | ${i.msg}`));
await browser.close();
fs.writeFileSync(`${OUT}/deep_issues.json`, JSON.stringify(issues, null, 2));
console.log('\n结果写入 outputs/verify/deep_issues.json');
