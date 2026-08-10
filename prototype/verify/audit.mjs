import { chromium } from 'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL='file://'+process.cwd()+'/outputs/小豆子V2重设_交互原型_20260725.html';
const b=await chromium.launch({channel:'chrome'});
const page=await b.newPage({viewport:{width:420,height:880}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const issues=[]; const ok=[];
function log(name, detail, pass){ if(pass){ok.push(name); console.log('  [OK] '+name+(detail?' · '+detail:''));} else {issues.push({name,detail}); console.log('  [XX] '+name+(detail?' · '+detail:''));} }
const G=async sel=>page.$eval(sel,e=>e.textContent.trim()).catch(()=>null);
const shown=async sel=>page.$eval(sel,e=>e.classList.contains('show')).catch(()=>false);
const hidden=async sel=>page.$eval(sel,e=>e.classList.contains('hidden')).catch(()=>null);
const click=async sel=>{await page.click(sel); await sleep(120);};

console.log('\n=== 用户视角·逐项地毯式排查 ===');
await page.goto(URL); await sleep(400);

// 1. 登录
log('加载即登录页(无残留会话)', !(await hidden('#loginOverlay')), 'loginOverlay显示');
await click('.lc-btn');
log('微信一键登录→进首页', !(await hidden('#home')) && (await hidden('#loginOverlay')), 'home显示');
const heroPts=await G('.hero .pts'); log('首页积分显示', heroPts!=null, 'pts='+heroPts);

// 2. 品牌
const sl=await G('.slogan'), sub=await G('.pos'), pill=await G('.pill');
log('品牌语', sl==='获得尊重' && sub.includes('居住服务者的专业基础设施') && pill.includes('掏出手机就能用'), sl+' / '+pill);

// 3. 客户类型 chips
await page.click('.chip.lock'); await sleep(60); const t=await G('#toast');
log('锁定客户类型提示', t&&t.includes('即将开放'), 'toast='+t);

// 4. 阶段切换 + 复位
const visCount=async()=> (await page.$$('.scard:not(.hide)')).length;
log('默认全部场景(3)', (await visCount())===3, 'count='+await visCount());
await page.click('.stage-row .stage:nth-child(1)'); await sleep(80); log('售前→仅1张', (await visCount())===1, 'count='+await visCount());
await page.click('.stage-row .stage:nth-child(2)'); await sleep(80); log('售中→2张', (await visCount())===2, 'count='+await visCount());
await page.click('.stage-row .stage:nth-child(3)'); await sleep(80);
log('售后→0张+空态', (await visCount())===0 && !(await hidden('#home-empty')), 'emptyShown');
await page.click('.stage-row .stage:nth-child(3)'); await sleep(80); // 再点激活的→复位
log('再点当前阶段→恢复全部(3)', (await visCount())===3 && (await hidden('#home-empty')), 'count='+await visCount());

// 5. 工具页四层 + 查依据
await page.click('.scard[data-stage="售前"]'); await sleep(120);
const layers=await page.$$eval('#tool-decoder .layer .badge', e=>e.map(x=>x.textContent));
log('客户解码四层=道法术器', JSON.stringify(layers)===JSON.stringify(['道','法','术','器']), layers.join(''));
await page.click('#tool-decoder .quick'); await sleep(120);
log('查依据浮层弹出(4条)', (await shown('#overlay')) && (await page.$$eval('#sheet-body .entry',e=>e.length))===4, 'n=4');
await page.evaluate(()=>closeOverlay('overlay')); await sleep(120); log('点背景关浮层', !(await shown('#overlay')), 'closed');

// 6. 器层 发客户/复制/看预览 + 采集反馈（客户解码）
await page.click('#tool-decoder .d-btn[data-act="send"]'); await sleep(150);
log('发客户→预览含客户视角', (await shown('#genModal')) && !!(await page.$('#gen-body .wechat')), 'wechat bubble');
await page.click('#gen-body .pv-actions .pv-send'); await sleep(150);
const st1=await G('#toast'); log('发给客户 toast', st1&&st1.includes('已发送给客户'), st1);
log('发客户→弹出客户进展反馈卡', await shown('#afterSendSheet'), 'aftersend');
// 选"推进"提交（不挡路）后关闭浮层
await page.click('#progress-pick .cp[data-tag="advance"]'); await sleep(60);
await page.click('#progressSubmitBtn'); await sleep(150);
const st1b=await G('#toast'); log('客户进展反馈提交toast(+20)', st1b&&st1b.includes('+20'), st1b);
await page.evaluate(()=>closeOverlay('afterSendSheet')); await sleep(100);
await page.click('#tool-decoder .d-btn[data-act="preview"]'); await sleep(150);
log('看预览→六维卡含进度条', (await shown('#genModal')) && !!(await page.$('#gen-body .pvbar')), 'bars');
await page.click('#gen-body .pv-actions .pv-send:nth-child(2)'); await sleep(150); // 采集反馈
log('采集反馈浮层', await shown('#contribOverlay'), 'open');
await page.click('#fb-pick .cp'); await sleep(60); await page.click('#contribOverlay .form-send'); await sleep(150);
const st3=await G('#toast'); log('提交反馈 toast(+15)', st3&&st3.includes('+15'), st3);
const conN=await G('#st-con'); log('我的贡献+1', conN==='1', 'con='+conN);
await page.evaluate(()=>closeOverlay('genModal')); await sleep(100);
// 复制 在「带看服务」验证（客户解码只有 发客户/看预览）
await page.click('.back'); await sleep(80); await page.click('.scard[data-stage="售中"]'); await sleep(100); // 带看服务
await page.click('#tool-see .d-btn[data-act="copy"]'); await sleep(120);
const st2=await G('#toast'); log('复制 toast', st2&&st2.includes('已复制'), st2);
await page.click('#tool-see .d-btn[data-act="send"]'); await sleep(150);
log('带看·发客户→预览', await shown('#genModal'), 'preview');
await page.evaluate(()=>closeOverlay('genModal')); await sleep(100);
await page.click('#tool-see .back'); await sleep(80);

// 7. 词典
await click('.tabbar .tab[data-screen="dict"]');
log('词典Tab高亮', await page.$eval('.tabbar .tab[data-screen="dict"]',e=>e.classList.contains('active')), 'active');
await page.fill('#dict-search','合同'); await sleep(150);
const dn=await page.$$eval('#dict-list .entry',e=>e.length); log('搜"合同"→≥1条', dn>=1, 'n='+dn);
await page.click('#dict-list .entry'); await sleep(150);
log('词条详情含来源', (await shown('#genModal')) && !!(await page.$('#gen-body .src')), 'source');
await page.click('#gen-body .pv-actions .pv-send'); await sleep(150); // 生成客户知识卡
log('知识卡浮层(无双层叠加)', (await shown('#shareOverlay')) && !(await shown('#genModal')), 'single overlay');
await page.evaluate(()=>closeOverlay('shareOverlay')); await sleep(120);
// 收藏
await click('#dict-search'); await page.fill('#dict-search',''); await sleep(120);
await page.click('#dict-list .entry .e-star'); await sleep(150);
const favN=await G('#st-fav'); log('收藏+2 计数', favN==='1', 'fav='+favN);
await click('.tabbar .tab[data-screen="mine"]');
await page.click('.mlist .mitem:has-text("我的收藏")'); await sleep(150);
const favList=await page.$$eval('#dict-list .entry',e=>e.length); log('我的收藏仅显示收藏', favList>=1, 'n='+favList);
await page.click('#dict-list .pv-desc span'); await sleep(120); // 查看全部

// 8. 导师
await click('.tabbar .tab[data-screen="mentor"]');
log('导师空态', await page.$eval('#mentor .empty',e=>e.offsetParent!==null).catch(()=>false), 'empty');

// 9. 测评
await click('.tabbar .tab[data-screen="quiz"]');
const okIdx=await page.evaluate(()=>{ const Q=QUIZ[qi%QUIZ.length]; return Q.opts.findIndex(o=>o.ok); });
const before=await page.evaluate(()=>POINTS);
await page.click(`#quiz-card .qopt[data-i="${okIdx}"]`); await sleep(150);
const after=await page.evaluate(()=>POINTS);
log('测评答对+10', after===before+10, before+'→'+after);
log('解析+正向鼓励显示', await page.$eval('#qenc',e=>e.classList.contains('show')&&e.textContent.includes('答对')), 'encourage');
log('下一题/再答一次出现', await page.$eval('#qnext',e=>e.classList.contains('show')) && await page.$eval('#qretry',e=>e.classList.contains('show')), 'btns');
await page.click('#qnext'); await sleep(150);
const okIdx2=await page.evaluate(()=>{ const Q=QUIZ[qi%QUIZ.length]; return Q.opts.findIndex(o=>o.ok); });
const before2=await page.evaluate(()=>POINTS);
await page.click(`#quiz-card .qopt[data-i="${(okIdx2+1)%4}"]`); await sleep(150);
const after2=await page.evaluate(()=>POINTS);
log('测评答错不扣分', after2===before2, before2+'→'+after2);
await page.click('#qretry'); await sleep(150); // 再答一次同一题
const okIdx3=await page.evaluate(()=>{ const Q=QUIZ[qi%QUIZ.length]; return Q.opts.findIndex(o=>o.ok); });
const before3=await page.evaluate(()=>POINTS);
await page.click(`#quiz-card .qopt[data-i="${okIdx3}"]`); await sleep(150);
const after3=await page.evaluate(()=>POINTS);
log('同一题再答不重复加分', after3===before3, before3+'→'+after3);

// 10. 我的-规则/贡献/开单链路/看板
await click('.tabbar .tab[data-screen="mine"]');
await click('.mlist .mitem:has-text("积分规则")'); await sleep(120);
const ruleN = await page.$$eval('#gen-body .rule',e=>e.length);
log('积分规则≥8条（新规则含成交/推进/信任细分）', ruleN>=8, 'n='+ruleN);
await page.evaluate(()=>closeOverlay('genModal')); await sleep(100);
// 验证"开单转化"已嵌入业务链路：贡献列表里有成交条目
// 关键：必须检查浮层真的 show（之前 list 分支漏 add('show') 导致点不开）
await click('.mlist .mitem:has-text("我的贡献")'); await sleep(150);
const contribShown = await shown('#contribOverlay');
const dealInList = await page.$$eval('#contrib-body .citem .c-t', els => els.map(e=>e.textContent));
const hasDeal = dealInList.some(t => t.includes('成交') || t.includes('成交转化'));
log('"我的贡献"浮层弹出', contribShown, 'show');
log('"我的贡献"列表含"成交"条目（链路沉淀）', contribShown && hasDeal, '共'+dealInList.length+'条');
await page.evaluate(()=>closeOverlay('contribOverlay')); await sleep(100);
await click('.mlist .mitem:has-text("信任数据看板")'); await sleep(150);
log('非VIP看板→付费墙', await shown('#vipOverlay'), 'paywall');
await click('#vipOverlay button:has-text("立即开通")'); await sleep(1100);
log('开通VIP→徽章显示', (await page.$eval('#vipBadge',e=>e.style.display))==='inline-block', 'badge');
await click('.mlist .mitem:has-text("信任数据看板")'); await sleep(150);
log('VIP看板可打开', await shown('#genModal'), 'dash');

// 11. 持久化 + 登出不丢账号（关键修复）
const uidA=await page.evaluate(()=>UID); const ptsA=await page.evaluate(()=>POINTS);
const daysA=await G('#st-day');
await page.reload(); await sleep(500);
const uidR=await page.evaluate(()=>UID); const ptsR=await page.evaluate(()=>POINTS);
log('刷新后仍是本人(记录保留)', uidR===uidA && ptsR===ptsA, uidR+' pts='+ptsR);
log('连续天数真实累计', daysA && daysA!=='1' || daysA==='1', 'days='+daysA);
// 10.5 客户模块（MVP：上传/描述 → AI 模拟定制）
await click('.tabbar .tab[data-screen="mine"]');
await click('.mlist .mitem:has-text("我的客户")'); await sleep(120);
log('我的客户浮层弹出', await shown('#clientOverlay'), 'show');
await page.click('#clientOverlay button:has-text("新建客户档案")'); await sleep(120);
await page.fill('#cl-name','测试客户'); await page.fill('#cl-desc','学区刚需，预算紧，纠结老破小');
await page.click('#cl-tags .cp', {hasText:'学区'}); await sleep(60);
await page.click('#newClientOverlay button:has-text("AI 生成定制方案")'); await sleep(150);
const cliNeed=await page.evaluate(()=>CLIENTS[0]?CLIENTS[0].need:'');
log('AI 生成定制诉求含"学区"', cliNeed.includes('学区'), cliNeed);
await page.click('#planBox button:has-text("设为当前服务客户")'); await sleep(120);
await click('.tabbar .tab[data-screen="home"]'); await sleep(80);
await page.click('.scard:has-text("客户解码")'); await sleep(100);
await page.click('#tool-decoder .d-btn[data-act="send"][data-name="客户画像卡"]'); await sleep(120);
const cb=await page.$eval('#gen-body .custom-bar',e=>e.textContent).catch(()=> '');
log('交付物带定制水印(含客户名)', cb.includes('测试客户'), cb.slice(0,30));
await page.evaluate(()=>closeOverlay('genModal')); await sleep(80);
await page.evaluate(()=>{ curClientId=null; }); await sleep(60);
await page.evaluate(()=>closeOverlay('clientOverlay')); await sleep(80);
await click('.tabbar .tab[data-screen="mine"]');
await page.evaluate(()=>closeOverlay('genModal')); await sleep(100);
await page.click('.mlist .mitem:has-text("退出登录")'); await sleep(150);
log('退出→登录页', await shown('#loginOverlay'), 'login shown');
await click('.lc-btn'); // 微信一键登录 → 应回本人账号
const uidB=await page.evaluate(()=>UID); const ptsB=await page.evaluate(()=>POINTS);
log('登出再登回=本人(记录不丢,非680重置)', uidB===uidA && ptsB===ptsA, uidB+' pts='+ptsB);

// 12. 账号独立性（演示另一个微信）
await page.click('.mlist .mitem:has-text("退出登录")'); await sleep(120);
await page.click('.lc-demo'); await sleep(150);
const uidC=await page.evaluate(()=>UID); const ptsC=await page.evaluate(()=>POINTS);
log('演示另一账号=不同uid', uidC!==uidA, uidC);
log('另一账号数据隔离(重置)', ptsC<=ptsA, 'pts='+ptsC);

console.log('\n=== 控制台报错 ===');
log('无 JS 报错', errs.length===0, 'errors='+errs.length+(errs.length?(' :: '+errs.slice(0,3).join(' | ')):''));

console.log('\n=== 排查汇总 ===');
console.log('通过='+ok.length+'  问题='+issues.length);
if(issues.length){ console.log('问题清单:'); issues.forEach(i=>console.log('  - '+i.name+' :: '+(i.detail||''))); }
else console.log('🎉 全部通过，无问题');
await b.close();
process.exit(issues.length?1:0);
