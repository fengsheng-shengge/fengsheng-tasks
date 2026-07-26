const {chromium} = require('playwright');
const fs = require('fs');
(async () => {
  const out = '/Users/ke/WorkBuddy/Claw/outputs/audit/shots';
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
  const page = await ctx.newPage();
  const tabs = ['首页','词典','锦囊','测评','我的'];
  const routes = {
    '首页':'/#/pages/home/index',
    '词典':'/#/pages/dict/index',
    '锦囊':'/#/pages/mentor/index',
    '测评':'/#/pages/quiz/index',
    '我的':'/#/pages/me/index',
  };
  // 先去首页
  await page.goto('http://localhost:8765/#/pages/home/index', {waitUntil:'networkidle', timeout:20000});
  await page.waitForTimeout(1500);
  for (const name of tabs) {
    try {
      await page.click(`.uni-tabbar__item:has-text("${name}")`, {timeout:6000});
    } catch(e) {
      await page.goto('http://localhost:8765'+routes[name], {waitUntil:'networkidle'});
    }
    await page.waitForTimeout(1300);
    const tabText = await page.evaluate(() => Array.from(document.querySelectorAll('.uni-tabbar__item')).map(e=>e.textContent.trim()).filter(Boolean));
    await page.screenshot({path: `${out}/${name}.png`});
    console.log('shot', name, 'tabBar=', JSON.stringify(tabText));
  }
  // 会员中心（二级页，价格待定修复页）
  await page.goto('http://localhost:8765/#/pages/pay/index', {waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  await page.screenshot({path:`${out}/会员中心.png`});
  console.log('shot 会员中心');
  await browser.close();
  console.log('ALL_DONE');
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
