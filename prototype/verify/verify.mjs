import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file://' + process.cwd() + '/outputs/小豆子V2重设_交互原型_20260725.html';
const OUT = process.cwd() + '/outputs/verify';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errorsAll = [];
function log(phase, msg){ console.log(`[${phase}] ${msg}`); }
function err(phase, msg){ errorsAll.push(`[${phase}] ${msg}`); log(phase, '❌ '+msg); }

async function closeOverlay(page, id){ await page.evaluate((id)=>closeOverlay(id), id); await sleep(80); }
async function go(page, id){ await page.evaluate((id)=>go(id), id); await sleep(120); }

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(URL); await sleep(350);
// 登录（账号独立性）：微信一键登录 → 跳过完善资料
await page.click('.lc-btn'); await sleep(150);

// ===== PASS 1: 打开+截图+抓错 =====
{
  log('pass1', '=== 第1遍：打开+截图+抓错 ===');
  await page.screenshot({ path: `${OUT}/pass1-home.png` });
  const slogan = await page.$eval('.slogan', e => e.textContent);
  const pos = await page.$eval('.pos', e => e.textContent);
  const pill = await page.$eval('.hero .pill', e => e.textContent);
  log('pass1', `品牌语: ${slogan} | ${pos} | ${pill}`);
  if(slogan!=='获得尊重' || !pos.includes('居住服务者')) err('pass1','品牌定位语异常');
  const stages = await page.$$eval('.stage-row .stage', els => els.map(e=>e.textContent));
  log('pass1', '阶段chips: '+stages.join('/'));
  const cards = await page.$$eval('.scard .title', els => els.map(e=>e.textContent));
  log('pass1', '场景卡: '+cards.join(' / '));
  if(cards.length!==3) err('pass1','P0场景卡数量异常='+cards.length);
  log('pass1', `console错误=${consoleErrors.length}`);
  consoleErrors.forEach(e => err('pass1', e));
}

// ===== PASS 2: 点所有交互+记浮层/弹窗 =====
{
  log('pass2', '=== 第2遍：点所有交互+记浮层/弹窗 ===');
  // 阶段过滤：售前
  await page.click('.stage:has-text("售前")'); await sleep(80);
  let vis = await page.$$eval('.scard:not(.hide)', els => els.length);
  log('pass2', '售前可见卡='+vis);
  if(vis!==1) err('pass2','售前过滤后应1张卡');
  // 售后空态
  await page.click('.stage:has-text("售后")'); await sleep(80);
  const empty = await page.$eval('#home-empty', e => !e.classList.contains('hidden'));
  log('pass2', '售后空态='+empty);
  if(!empty) err('pass2','售后未显示空态');
  await page.click('.stage:has-text("售中")'); await sleep(80);
  vis = await page.$$eval('.scard:not(.hide)', els => els.length);
  log('pass2', '售中可见卡='+vis);
  if(vis!==2) err('pass2','售中过滤后应2张卡');

  // 工具1: 客户解码
  await go(page,'home');
  await page.click('.stage:has-text("售前")'); await sleep(80);
  await page.click('.scard:has-text("客户解码")'); await sleep(120);
  await page.click('#tool-decoder .quick'); await sleep(120);
  let nEntries = await page.$$eval('#sheet-body .entry', e => e.length);
  log('pass2', '客户解码查依据词条='+nEntries);
  if(nEntries < 50) err('pass2','客户解码词条数过少='+nEntries+'（应已接入真实数据集，decoder=220）');
  await closeOverlay(page,'overlay');
  // 器层发客户 → 应打开预览浮层(含客户视角)
  await page.click('#tool-decoder .d-btn[data-act="send"][data-name="客户画像卡"]'); await sleep(150);
  const prevShown = await page.$eval('#genModal', e => e.classList.contains('show'));
  const hasWe = await page.$('#gen-body .wechat') !== null;
  const hasSrc = await page.$('#gen-body .src') !== null;
  log('pass2', '客户画像卡 预览='+prevShown+' 客户视角='+hasWe+' 来源='+hasSrc);
  if(!prevShown||!hasWe||!hasSrc) err('pass2','发客户交付物未呈现客户视角/来源');
  await page.screenshot({ path: `${OUT}/pass2-preview-send.png` });
  // 发给客户 → 弹轻量"客户进展"反馈卡
  await page.click('#gen-body .pv-actions .pv-send'); await sleep(120);
  const toast1 = await page.$eval('#toast', e => e.textContent);
  log('pass2', '发客户toast='+toast1);
  if(!toast1.includes('已发送给客户')) err('pass2','发客户toast异常='+toast1);
  // 验证 afterSendSheet 弹出
  const afterShown = await page.$eval('#afterSendSheet', e => e.classList.contains('show'));
  log('pass2', '客户进展反馈卡弹出='+afterShown);
  if(!afterShown) err('pass2','发客户后客户进展反馈卡未弹出');
  await page.screenshot({ path: `${OUT}/pass2-aftersend.png` });
  // 选"成交了"提交 +50
  await page.locator('#progress-pick .cp[data-tag="deal"]').click(); await sleep(60);
  await page.click('#progressSubmitBtn'); await sleep(150);
  const ptsAfter = await page.evaluate(() => POINTS);
  const nContribAfter = await page.evaluate(() => contribs.length);
  log('pass2', '反馈提交后 积分='+ptsAfter+' 贡献数='+nContribAfter);
  if(ptsAfter < 730) err('pass2','成交反馈后积分异常(应>=730) 实测='+ptsAfter);
  if(nContribAfter < 1) err('pass2','成交反馈未写入贡献');
  // 关闭弹层后继续
  await closeOverlay(page,'afterSendSheet');
  // 采集反馈
  await page.click('#tool-decoder .d-btn[data-act="preview"][data-name="六维测评卡"]'); await sleep(150);
  await page.click('#gen-body .pv-actions .pv-send:nth-child(2)'); await sleep(150);
  const cShown = await page.$eval('#contribOverlay', e => e.classList.contains('show'));
  log('pass2', '采集反馈浮层='+cShown);
  if(!cShown) err('pass2','贡献反馈浮层未弹出');
  await page.locator('#fb-pick .cp').first().click(); await sleep(60);
  await page.click('#contribOverlay .form-send'); await sleep(120);
  const nContrib = await page.evaluate(() => contribs.length);
  log('pass2', '贡献数='+nContrib+' 积分='+await page.evaluate(()=>POINTS));
  if(nContrib<1) err('pass2','贡献未记录');
  await closeOverlay(page,'contribOverlay');

  // 工具2: 带看服务
  await go(page,'home');
  await page.click('.stage:has-text("售中")'); await sleep(80);
  await page.click('.scard:has-text("带看服务")'); await sleep(120);
  const layers2 = await page.$$eval('#tool-see .layer .badge', els => els.map(e=>e.textContent));
  log('pass2', '带看四层='+layers2.join(''));
  if(layers2.join('')!=='道法术器') err('pass2','带看四层顺序异常');
  await page.click('#tool-see .d-btn[data-act="copy"][data-name="带看 Checklist"]'); await sleep(120);
  const toast2 = await page.$eval('#toast', e => e.textContent);
  log('pass2', '复制toast='+toast2);
  if(!toast2.includes('已复制')) err('pass2','复制toast异常');

  // 工具3: 谈判斡旋
  await go(page,'home');
  await page.click('.stage:has-text("售中")'); await sleep(80);
  await page.click('.scard:has-text("谈判斡旋")'); await sleep(120);
  const layers3 = await page.$$eval('#tool-nego .layer .badge', els => els.map(e=>e.textContent));
  log('pass2', '谈判四层='+layers3.join(''));
  if(layers3.join('')!=='道法术器') err('pass2','谈判四层顺序异常');

  // Tab 五屏
  for (const tab of ['dict','mentor','quiz','mine','home']){
    await page.click(`.tabbar .tab[data-screen="${tab}"]`); await sleep(100);
    const shown = await page.$eval('#'+tab, e => !e.classList.contains('hidden'));
    const active = await page.$eval(`.tabbar .tab[data-screen="${tab}"]`, e => e.classList.contains('active'));
    log('pass2', `Tab ${tab} 显示=${shown} 高亮=${active}`);
    if(!shown||!active) err('pass2','Tab '+tab+' 切换异常');
  }

  // 词典：搜索+打开词条+生成客户卡+朋友圈+收藏+纠错+分享时不叠层
  await go(page,'dict');
  await page.evaluate(() => { document.getElementById('dict-search').value=''; renderDict(); }); await sleep(80);
  await page.fill('#dict-search', '合同'); await sleep(120);
  const results = await page.$$eval('#dict-list .entry', els => els.length);
  log('pass2', '词典搜"合同"结果='+results);
  if(results<1) err('pass2','词典搜索异常(应为≥1条)');
  const firstName = await page.$eval('#dict-list .entry .e-name', e=>e.textContent);
  log('pass2', '搜索"合同"首条='+firstName);
  if(!firstName) err('pass2','搜索"合同"首条为空');
  await page.click('#dict-list .entry'); await sleep(150);
  await page.click('#gen-body button[onclick*="openShare(\'client\'"]'); await sleep(150);
  const shareShown = await page.$eval('#shareOverlay', e => e.classList.contains('show'));
  const genResidual = await page.$eval('#genModal', e => e.classList.contains('show'));
  log('pass2', '客户知识卡 share='+shareShown+' genModal残留='+genResidual);
  if(!shareShown) err('pass2','客户知识卡未弹出');
  if(genResidual) err('pass2','分享卡打开后genModal仍残留');
  await page.screenshot({ path: `${OUT}/pass2-sharecard.png` });
  await closeOverlay(page,'shareOverlay');

  // 收藏功能
  await page.fill('#dict-search', '预算'); await sleep(120);
  await page.click('#dict-list .entry .e-star'); await sleep(120);
  const favNow = await page.evaluate(() => fav.size);
  log('pass2', '收藏后fav.size='+favNow);
  if(favNow<1) err('pass2','收藏未生效');
  // 我的收藏 应为筛选视图
  await page.click('.tabbar .tab[data-screen="mine"]'); await sleep(100);
  await page.click('.mitem:has-text("我的收藏")'); await sleep(150);
  const inFav = await page.evaluate(() => favOnly);
  const favCount = await page.$$eval('#dict-list .entry', els => els.length);
  log('pass2', '我的收藏 favOnly='+inFav+' 显示='+favCount);
  if(!inFav || favCount!==favNow) err('pass2','我的收藏未正确筛选');
  await page.click('.tabbar .tab[data-screen="dict"]'); await sleep(100);
  const allCount = await page.$$eval('#dict-list .entry', els => els.length);
  log('pass2', '词典Tab显示全部='+allCount);
  if(allCount===favCount) err('pass2','词典Tab应显示全部而非仅收藏');

  // 纠错/补充
  await page.fill('#dict-search', '合同'); await sleep(120);
  await page.click('#dict-list .entry'); await sleep(120);
  await page.click('#gen-body button[onclick*="openContrib(\'fix\'"]'); await sleep(120);
  await page.fill('#fx-text', '补充说明'); await sleep(60);
  await page.click('#contribOverlay .form-send'); await sleep(120);
  const c2 = await page.evaluate(() => contribs.length);
  log('pass2', '纠错提交后贡献数='+c2);
  if(c2<1) err('pass2','纠错未记录');
  await closeOverlay(page,'contribOverlay');

  // "开单转化"已嵌入业务链路：发客户后即时反馈，沉淀到贡献列表
  // → 不再有独立入口；改为验证"我的贡献"列表里"成交转化"已存在
  await page.click('.tabbar .tab[data-screen="mine"]'); await sleep(100);
  await page.click('.mitem:has-text("我的贡献")'); await sleep(150);
  const contribShownV = await page.$eval('#contribOverlay', e => e.classList.contains('show'));
  const dealInList = await page.$$eval('#contrib-body .citem .c-t', els => els.map(e=>e.textContent));
  const hasDeal = dealInList.some(t => t.includes('成交转化') || t.includes('成交'));
  log('pass2', '我的贡献浮层弹出='+contribShownV+' 贡献列表含成交条目='+hasDeal+' 共'+dealInList.length+'条');
  if(!contribShownV) err('pass2','我的贡献浮层未弹出（点不开）');
  if(!hasDeal) err('pass2','贡献列表缺少"成交转化"记录（说明发客户→反馈链路未沉淀）');
  // 同时确认独立"记录开单转化"入口已下线
  const hasOldEntry = await page.$$eval('.mitem .mt', els => els.map(e=>e.textContent).some(t => t.includes('记录开单转化')));
  if(hasOldEntry) err('pass2','孤立入口"记录开单转化"应已下线但仍存在');
  await closeOverlay(page,'contribOverlay');

  // 积分规则条数（新规则：7 条 → 8 条，增加了"成交"和"推进"两条细分）
  await page.click('.mitem:has-text("积分规则")'); await sleep(150);
  const ruleCount = await page.$$eval('#gen-body .rule', els => els.length);
  log('pass2', '积分规则条数='+ruleCount);
  if(ruleCount < 8) err('pass2','积分规则条数异常(应>=8) 实测='+ruleCount);
  const rulesText = await page.$$eval('#gen-body .rule .r-t', els => els.map(e=>e.textContent).join('|'));
  if(!rulesText.includes('成交')) err('pass2','积分规则应包含"成交"相关条目');
  await closeOverlay(page,'genModal');

  // 测评
  await page.click('.tabbar .tab[data-screen="quiz"]'); await sleep(100);
  const pts0 = await page.evaluate(() => POINTS);
  const okIdx = await page.evaluate(() => QUIZ[qi%QUIZ.length].opts.findIndex(o=>o.ok));
  await page.click(`#quiz-card .qopt[data-i="${okIdx}"]`); await sleep(120);
  const pts1 = await page.evaluate(() => POINTS);
  log('pass2', '测评答对 '+pts0+'->'+pts1);
  if(pts1!==pts0+10) err('pass2','答对未+10');
  // 再答一次不应再加分
  await page.click('#qretry'); await sleep(100);
  await page.click(`#quiz-card .qopt[data-i="${okIdx}"]`); await sleep(120);
  const pts1b = await page.evaluate(() => POINTS);
  log('pass2', '重答后积分='+pts1b);
  if(pts1b!==pts1) err('pass2','重答不应再加分');
  // 换一题（新题）答对再加
  await page.click('#qscore .qs-rd'); await sleep(100);
  const newOkIdx = await page.evaluate(() => QUIZ[qi%QUIZ.length].opts.findIndex(o=>o.ok));
  await page.click(`#quiz-card .qopt[data-i="${newOkIdx}"]`); await sleep(120);
  const pts2 = await page.evaluate(() => POINTS);
  log('pass2', '新题答对 '+pts1b+'->'+pts2);
  if(pts2!==pts1b+10) err('pass2','新题答对应+10');
  await page.screenshot({ path: `${OUT}/pass2-quiz.png` });
}

// ===== PASS 3: 移动端+跨浏览器 =====
{
  log('pass3', '=== 第3遍：移动端+溢出检查 ===');
  await page.setViewportSize({ width: 375, height: 812 }); await sleep(200);
  await page.evaluate(() => go('home')); await sleep(120);
  const sw = await page.evaluate(() => document.querySelector('.phone').scrollWidth);
  const cw = await page.evaluate(() => document.querySelector('.phone').clientWidth);
  log('pass3', `phone sw=${sw} cw=${cw}`);
  if(sw>cw) err('pass3','移动端phone横向溢出 '+sw+'>'+cw);
  // 移动闭环：首页→售中→谈判斡旋→查依据→看预览→采集反馈
  await page.click('.stage:has-text("售中")'); await sleep(80);
  await page.click('.scard:has-text("谈判斡旋")'); await sleep(120);
  await page.click('#tool-nego .quick'); await sleep(120);
  const ne = await page.$$eval('#sheet-body .entry', e => e.length);
  if(ne < 50) err('pass3','移动端查依据词条数过少='+ne+'（应已接入真实数据集，nego=150）');
  await closeOverlay(page,'overlay');
  await page.click('#tool-nego .d-btn[data-act="preview"][data-name="价格锚定卡"]'); await sleep(120);
  await page.click('#gen-body .pv-actions .pv-send:nth-child(2)'); await sleep(120);
  const c3 = await page.evaluate(() => contribs.length);
  log('pass3', '移动闭环贡献数='+c3);
  await closeOverlay(page,'contribOverlay');
  await page.screenshot({ path: `${OUT}/pass3-mobile-chrome.png` });
}

console.log('\n=== 汇总 ===');
if(errorsAll.length===0){
  console.log('✅ 3遍全部通过，0 报错');
} else {
  console.log(`❌ 失败 ${errorsAll.length} 项：`);
  errorsAll.forEach(e=>console.log('  '+e));
}
await browser.close();
process.exit(errorsAll.length?1:0);
