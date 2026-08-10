import { chromium } from 'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({channel:'chrome'});
const p=await b.newPage({viewport:{width:420,height:880}});
const errs=[]; let BUG=0, OK=0;
const log=(k,v,extra='')=>{ console.log(`[${k}] ${v}${extra?' · '+extra:''}`); };
const check=(name,cond,extra='')=>{ if(cond){OK++;log('OK',name,extra);}else{BUG++;log('BUG',name,extra);} };
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
p.on('dialog',d=>{ d.accept('已带看2次，卡在学区vs通勤，客户说再想想'); });

await p.goto('file://'+process.cwd()+'/outputs/小豆子V2重设_交互原型_20260725.html'); await sleep(300);
await p.click('.lc-btn'); await sleep(200);

// 1. 我的客户入口 + 空态
await p.click('.tabbar .tab[data-screen="mine"]'); await sleep(120);
await p.click('.mlist .mitem:has-text("我的客户")'); await sleep(150);
check('我的客户浮层弹出', await p.$eval('#clientOverlay',e=>e.classList.contains('show')));
check('空态提示正确', await p.$eval('#clientList',e=>e.textContent.includes('还没有客户档案')));
await p.evaluate(()=>closeOverlay('clientOverlay')); await sleep(80);

// 2. 新建客户 + AI 生成方案
await p.click('.mlist .mitem:has-text("我的客户")'); await sleep(120);
await p.click('#clientOverlay button:has-text("新建客户档案")'); await sleep(150);
check('新建客户浮层弹出', await p.$eval('#newClientOverlay',e=>e.classList.contains('show')));
await p.fill('#cl-name','85后夫妻');
await p.fill('#cl-desc','85后夫妻，预算550，老婆盯学区，老公盯通勤，纠结老破小 vs 远郊新盘');
// 勾选标签：学区、通勤
await p.locator('#cl-tags .cp', {hasText:'学区'}).click(); await sleep(40);
await p.locator('#cl-tags .cp', {hasText:'通勤'}).click(); await sleep(40);
await p.click('#newClientOverlay button:has-text("AI 生成定制方案")'); await sleep(200);
const portrait = await p.$eval('#planBox .plan-portrait',e=>e.textContent).catch(()=> '');
check('定制画像生成(含诉求)', portrait.includes('核心诉求'), portrait.slice(0,40));
const needTxt = await p.evaluate(()=> (CLIENTS[0]||{}).need||'');
check('诉求提炼含「学区」', needTxt.includes('学区'), needTxt);
check('诉求提炼含「通勤」', needTxt.includes('通勤'), needTxt);
check('诉求提炼含「预算」', needTxt.includes('预算'), needTxt);
const recoCount = await p.$$eval('#planBox .preco',els=>els.length);
check('推荐工具≥2条', recoCount>=2, 'n='+recoCount);
const clientCnt = await p.evaluate(()=>CLIENTS.length);
check('客户已写入', clientCnt===1, 'n='+clientCnt);

// 3. 设为当前客户 → 交付物带定制水印
await p.click('#planBox button:has-text("设为当前服务客户")'); await sleep(150);
const curId = await p.evaluate(()=>curClientId);
check('当前客户已设', !!curId, curId||'');
await p.click('.tabbar .tab[data-screen="home"]'); await sleep(100);
await p.click('.scard:has-text("客户解码")'); await sleep(120);
await p.click('#tool-decoder .d-btn[data-act="send"][data-name="客户画像卡"]'); await sleep(150);
const customBar = await p.$eval('#gen-body .custom-bar',e=>e.textContent).catch(()=> '');
check('交付物带定制水印(含客户名)', customBar.includes('85后夫妻'), customBar.slice(0,40));
check('水印含诉求', customBar.includes('诉求定制'), customBar.slice(0,40));
await p.evaluate(()=>closeOverlay('genModal')); await sleep(80);

// 4. 无客户时 → 引导建档水印
await p.evaluate(()=>{ curClientId=null; }); await sleep(60);
await p.click('.tabbar .tab[data-screen="home"]'); await sleep(100);
await p.click('.scard:has-text("带看服务")'); await sleep(120);
await p.click('#tool-see .d-btn[data-act="send"][data-name="房源对比表"]'); await sleep(150);
const emptyBar = await p.$eval('#gen-body .custom-bar',e=>e.textContent).catch(()=> '');
check('无客户→引导建档水印', emptyBar.includes('还没建客户档案'), emptyBar.slice(0,30));
await p.evaluate(()=>closeOverlay('genModal')); await sleep(80);

// 5. 追加过程记录 → 方案更新
await p.click('.tabbar .tab[data-screen="mine"]'); await sleep(100);
await p.click('.mlist .mitem:has-text("我的客户")'); await sleep(120);
await p.click('#clientList .c-edit'); await sleep(150);  // 编辑客户
await p.click('#planBox button:has-text("追加过程记录")'); await sleep(200); // 触发 prompt
const recCount = await p.evaluate(()=> (CLIENTS[0].records||[]).length);
check('过程记录已追加', recCount>=1, 'n='+recCount);

// 6. 持久化（刷新后客户仍在 · 自动静默登录本人）
const beforeUid = await p.evaluate(()=>UID);
await p.reload(); await sleep(500);
const afterCnt = await p.evaluate(()=>CLIENTS.length);
const afterUid = await p.evaluate(()=>UID);
check('刷新后客户保留', afterCnt===1, 'n='+afterCnt);
check('刷新后仍是本人', afterUid===beforeUid, afterUid||'');

// 7. 账号独立性：另一账号无客户
await p.evaluate(()=>demoOtherAccount()); await sleep(150);
const otherCnt = await p.evaluate(()=>CLIENTS.length);
check('另一账号客户隔离(0)', otherCnt===0, 'n='+otherCnt);

console.log('\n=== 客户模块测试 ===');
console.log('通过='+OK+'  BUG='+BUG+'  控制台报错='+errs.length);
if(errs.length) console.log('报错:', errs.slice(0,5));
await b.close();
process.exit(BUG>0?1:0);
