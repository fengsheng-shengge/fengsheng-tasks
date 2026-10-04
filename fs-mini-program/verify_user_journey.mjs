import { chromium } from '/Users/ke/WorkBuddy/Claw/pw/node_modules/playwright/index.mjs';

const BASE = 'http://127.0.0.1:5173/';
const SHOT = (n) => '/Users/ke/u2e_' + n + '.png';
const allErrors = [];
let pass = 0, fail = 0;
const issues = [];

const browser = await chromium.launch();
async function newSession() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') allErrors.push(m.text().slice(0, 150)); });
  page.on('pageerror', e => allErrors.push('PAGEERROR: ' + String(e).slice(0, 150)));
  return { ctx, page };
}
const body = (page) => page.evaluate(() => document.body.innerText);
async function clickText(page, re, { last = false } = {}) {
  return page.evaluate(({ src, last }) => {
    const re = new RegExp(src);
    const els = [...document.querySelectorAll('*')].filter(e =>
      e.children.length === 0 && re.test(e.textContent) && e.getBoundingClientRect().height > 0);
    if (!els.length) return false;
    (last ? els[els.length - 1] : els[0]).click();
    return true;
  }, { src: re.source, last });
}
async function waitText(page, re, ms = 8000) {
  const rx = new RegExp(re.source);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (rx.test(await body(page))) return true;
    await page.waitForTimeout(400);
  }
  return false;
}
async function gotoH(page, path) {
  await page.goto(BASE + '#' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
}
async function step(name, fn) {
  try { await fn(); pass++; console.log('PASS', name); }
  catch (e) { fail++; issues.push(name + ' :: ' + String(e).slice(0, 160)); console.log('FAIL', name, '::', String(e).slice(0, 200)); }
}
async function pickRole(page, label) {
  if (!await clickText(page, new RegExp('^' + label))) throw new Error('无角色项 ' + label);
  await page.waitForTimeout(700);
}
// 精准点击首页「三步引导」卡内某步骤（避开底部 tabBar 同名标签劫持点击）
async function clickOnboardStep(page, name) {
  return await page.evaluate((nm) => {
    const steps = [...document.querySelectorAll('.rr-step')];
    const s = steps.find(el => el.textContent.includes(nm));
    if (!s) return false;
    s.click();
    return true;
  }, name);
}
// Likert 答题：等选项渲染后点第一个选项行，再推进（下一题 / 提交报告）
async function answerLikert(page) {
  await page.waitForSelector('.q-opt', { timeout: 5000 }).catch(() => {});
  const ok = await page.evaluate(() => {
    const opt = document.querySelector('.q-opt');
    if (!opt || opt.getBoundingClientRect().height === 0) return false;
    opt.click();
    return true;
  });
  if (!ok) throw new Error('无选项');
  await page.waitForTimeout(450);
  const adv = await clickText(page, /下一题/) || await clickText(page, /提交报告/);
  if (!adv) throw new Error('无下一题/提交按钮');
  await page.waitForTimeout(500);
}

// ═══════ A. 新用户完整旅程 ═══════
{
  const { ctx, page } = await newSession();
  await page.goto(BASE + '#/pages/home/index', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await step('A1 首启角色浮层', async () => { if (!(await body(page)).includes('你主要是')) throw new Error('无浮层'); });
  await step('A2 认领新用户→三步卡', async () => {
    await pickRole(page, '新用户');
    const t = await body(page);
    if (!t.includes('三步上手')) throw new Error('无三步卡');
    await page.screenshot({ path: SHOT('newbie_home') });
  });
  await step('A3 步1→住得好测评 7 题全程', async () => {
    await clickText(page, /住得好测评/);
    if (!await waitText(page, /开始测评/)) throw new Error('未进入测评封面');
    await clickText(page, /开始测评/);
    for (let i = 0; i < 7; i++) await answerLikert(page);
    if (!await waitText(page, /雷达|报告|维度|同步/, 6000)) throw new Error('无报告页');
    await page.screenshot({ path: SHOT('assess_report') });
  });
  await step('A4 报告可同步需求洞察', async () => {
    const t = await body(page);
    if (!t.includes('同步')) throw new Error('无同步入口');
  });
  await gotoH(page, '/pages/home/index');
  await step('A5 回首页步1已亮✓，进步2知识库', async () => {
    const t = await body(page);
    if (!t.includes('✓')) throw new Error('步1未亮');
    if (!await clickOnboardStep(page, '知识库')) throw new Error('无知识库步骤卡');
    await waitText(page, /服务方案|大家都在问/);
  });
  await gotoH(page, '/pages/home/index');
  await page.waitForTimeout(1500);
  await step('A6 进步3策展引擎', async () => {
    if (!await clickOnboardStep(page, '策展引擎')) throw new Error('无策展引擎步骤卡');
    if (!await waitText(page, /见面参谋|策展|客户/, 6000)) throw new Error('策展页未打开');
    await page.screenshot({ path: SHOT('curate_page') });
  });
  await gotoH(page, '/pages/home/index');
  await page.waitForTimeout(1500);
  await step('A7 三步全亮✓', async () => {
    const t = await body(page);
    const marks = (t.match(/✓/g) || []).length;
    if (marks < 3) throw new Error('仅 ' + marks + ' 步完成');
    await page.screenshot({ path: SHOT('newbie_all_done') });
  });
  await ctx.close();
}

// ═══════ B. 经纪人主力旅程 ═══════
{
  const { ctx, page } = await newSession();
  await page.goto(BASE + '#/pages/home/index', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await step('B1 认领经纪人→角色推荐', async () => {
    await pickRole(page, '经纪人');
    const t = await body(page);
    if (!t.includes('为经纪人推荐')) throw new Error('无推荐卡');
    await page.screenshot({ path: SHOT('broker_home') });
  });
  await step('B2 知识搜索闭环+溯源条', async () => {
    await gotoH(page, '/pages/knowledge/domain');
    await clickText(page, /房东不退押金/);
    if (!await waitText(page, /个相关方案/)) throw new Error('搜索无果');
    const t = await body(page);
    if (!(t.includes('法源有据') || t.includes('核验'))) throw new Error('无溯源条');
    await page.screenshot({ path: SHOT('knowledge_trace') });
  });
  await step('B3 词条展开：方案+话术+红线', async () => {
    await clickText(page, /查看处理方案/, { last: true });
    await page.waitForTimeout(900);
    const t = await body(page);
    if (!t.includes('收起')) throw new Error('未展开');
  });
  await step('B4 真题闯关完整通关', async () => {
    await gotoH(page, '/pages/assess/index');
    await clickText(page, /真题闯关/);
    await page.waitForTimeout(700);
    await clickText(page, /初级/, { last: true });
    await page.waitForTimeout(1100);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const leaves = [...document.querySelectorAll('*')].filter(e =>
          e.children.length === 0 && e.textContent.trim().length > 8 &&
          e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().top < 900);
        leaves[leaves.length - 1] && leaves[leaves.length - 1].click();
      });
      await page.waitForTimeout(900);
      if (i < 2) { await clickText(page, /下一题/); await page.waitForTimeout(700); }
    }
    await clickText(page, /查看结果/);
    if (!await waitText(page, /优秀|基本掌握|有待加强|重学/, 5000)) throw new Error('无结果等级');
    await page.screenshot({ path: SHOT('quiz_result') });
  });
  await step('B5 新建客户闭环', async () => {
    await gotoH(page, '/pages/clients/index');
    await clickText(page, /＋ 新建|新建/);
    await page.waitForTimeout(700);
    // uni-app H5 把 placeholder 渲染成独立 span，原生 input 无 placeholder 属性，故按表单 input 顺序填充
    const ins = page.locator('input.uni-input-input');
    await ins.nth(0).fill('测');           // 姓氏
    await ins.nth(1).fill('测试先生');     // 称呼 / 全名
    await clickText(page, /创建客户/);
    if (!await waitText(page, /测试先生/, 4000)) throw new Error('客户未出现在列表');
    await page.screenshot({ path: SHOT('client_created') });
  });
  await step('B6 客户详情→见面参谋入口', async () => {
    await clickText(page, /测试先生/);
    await page.waitForTimeout(900);
    const t = await body(page);
    if (!t.includes('见面参谋')) throw new Error('详情无参谋入口');
    await clickText(page, /准备这次见面/);
    await page.waitForTimeout(1800);
    const t2 = await body(page);
    if (t2.length < 40) throw new Error('参谋页空白');
    await page.screenshot({ path: SHOT('curate_prep') });
  });
  await step('B7 MOT 页（含客户场景）', async () => {
    await gotoH(page, '/pages/mot/index');
    const t = await body(page);
    if (t.length < 40) throw new Error('MOT 空白');
    await page.screenshot({ path: SHOT('mot_page') });
  });
  await step('B8 计算器可用', async () => {
    await gotoH(page, '/pages/calculator/index');
    const t = await body(page);
    if (t.length < 40) throw new Error('计算器空白');
    await page.screenshot({ path: SHOT('calc') });
  });
  await step('B9 案例页渲染', async () => {
    await gotoH(page, '/pages/cases/index');
    if ((await body(page)).length < 40) throw new Error('案例空白');
  });
  await step('B10 简报页渲染', async () => {
    await gotoH(page, '/pages/briefing/index');
    if ((await body(page)).length < 40) throw new Error('简报空白');
  });
  await step('B11 我的页渲染', async () => {
    await gotoH(page, '/pages/profile/index');
    if ((await body(page)).length < 40) throw new Error('我的空白');
  });
  await ctx.close();
}

// ═══════ C. 管理者 ═══════
{
  const { ctx, page } = await newSession();
  await page.goto(BASE + '#/pages/home/index', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await step('C1 认领管理者→专属推荐', async () => {
    await pickRole(page, '管理者');
    const t = await body(page);
    if (!t.includes('为管理者推荐')) throw new Error('无推荐卡');
    if (t.includes('三步上手')) throw new Error('不应有三步引导');
    await page.screenshot({ path: SHOT('manager_home') });
  });
  await ctx.close();
}

console.log('---');
console.log('PASS:', pass, 'FAIL:', fail);
console.log('CONSOLE_ERRORS:', allErrors.length);
allErrors.slice(0, 8).forEach(e => console.log('ERR>', e));
issues.forEach(i => console.log('ISSUE>', i));
await browser.close();
console.log('DONE');
