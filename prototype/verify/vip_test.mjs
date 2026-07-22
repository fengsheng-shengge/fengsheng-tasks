import { chromium } from 'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({channel:'chrome'});
const p=await b.newPage({viewport:{width:420,height:880}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('file://'+process.cwd()+'/outputs/小豆子V2重设_交互原型_20260725.html'); await sleep(300);
await p.click('.lc-btn'); await sleep(150);
// 进我的，看专业版状态
await p.click('.tabbar .tab[data-screen="mine"]'); await sleep(120);
const vipBadgeBefore=await p.$eval('#vipBadge',e=>e.style.display);
const vipBtnBefore=await p.$eval('#vipBtn',e=>e.textContent);
console.log('登录后 vipBadge=',vipBadgeBefore,' vipBtn=',vipBtnBefore);
// 点开通 -> 付费墙
await p.click('#vipBtn'); await sleep(150);
const payShown=await p.$eval('#vipOverlay',e=>e.classList.contains('show'));
console.log('付费墙弹出=',payShown);
await p.click('#vipOverlay button:has-text("立即开通")'); await sleep(1100);
const vipBadgeAfter=await p.$eval('#vipBadge',e=>e.style.display);
const vipBtnAfter=await p.$eval('#vipBtn',e=>e.textContent);
console.log('开通后 vipBadge=',vipBadgeAfter,' vipBtn=',vipBtnAfter);
// 数据看板（应直接开，不再弹付费墙）
await p.click('.mitem:has-text("信任数据看板")'); await sleep(150);
const dashShown=await p.$eval('#genModal',e=>e.classList.contains('show'));
const dashTitle=await p.$eval('#gen-title',e=>e.textContent);
console.log('数据看板打开=',dashShown,' title=',dashTitle);
// 非VIP 时数据看板应弹付费墙（用另一个全新微信账号验证 gate；本人账号已购VIP，重登仍是VIP）
await p.evaluate(()=>closeOverlay('genModal')); await sleep(80);
await p.evaluate(()=>logout()); await sleep(120);
await p.click('.lc-demo'); await sleep(150);
await p.click('.tabbar .tab[data-screen="mine"]'); await sleep(120);
await p.click('.mitem:has-text("信任数据看板")'); await sleep(150);
const paywallForNonVip=await p.$eval('#vipOverlay',e=>e.classList.contains('show'));
console.log('非VIP点看板→弹付费墙=',paywallForNonVip);
console.log('console错误=',errs.length, errs);
await b.close();
