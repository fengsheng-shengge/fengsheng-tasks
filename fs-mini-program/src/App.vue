<script>
import { useUserStore } from './store/user'

export default {
  onLaunch() {
    console.log('风声助手 onLaunch')
    try {
      const userStore = useUserStore()
      userStore.initFromStorage()
      userStore.markDone('login')   // 本地登录态即视为登录任务完成（幂等，首启即点亮 1/5）
    } catch (e) {
      console.warn('[fs] initFromStorage skipped:', (e && e.message) || e)
    }
  },
  onShow() { console.log('风声助手 onShow') },
  onHide() { console.log('风声助手 onHide') },
  onError(err) {
    // 兜底：onError 兜底任何 runtime 错误，避免阻塞 UI
    console.warn('[fs] onError:', (err && err.message) || err)
  }
}
</script>

<style>
/* ========== 风声 v4 贝壳风格 · 全局样式（唯一真源：小程序设计样本_v4_贝壳风格.html） ========== */
page {
  /* 品牌色规范 V2.0（7.20 更新） */
  --green: #3d5a3e;
  --green-light: #eef3ec;
  --green-dark: #2f4730;
  --green-grad: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%);
  --brown: #C8956D;
  --orange: #c46a3a;
  --orange-light: #fbeee6;
  --bg: #f7f4ef;
  --card: #FFFFFF;
  --text: #2b2b28;
  --text-secondary: #8a837a;
  --text-muted: #b8b1a6;
  --border: #ece7dc;
  --border-light: #f7f4ef;
  --muted: #5a554c;
  --shadow-sm: 0 2px 8px rgba(61, 90, 62, 0.05);
  --shadow-md: 0 4px 16px rgba(61, 90, 62, 0.10);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  background-color: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
  font-size: 14px;
}

view, text, button, input, textarea { box-sizing: border-box; }

/* 每页统一内边距 + 底部给 tabBar 留白 */
.page { padding: 12px 16px calc(78px + env(safe-area-inset-bottom)); }

/* ========== 首页 ========== */
.hero-carousel { position: relative; width: calc(100% + 32px); margin: -12px -16px 16px; height: 210px; overflow: hidden; background: var(--green-dark); }
.hero-track { display: flex; height: 100%; transition: transform .7s cubic-bezier(.22,.61,.36,1); }
.slide { min-width: 100%; height: 100%; position: relative; overflow: hidden; }
.slide-img { width: 100%; height: 100%; display: block; }
.hero-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 18px 20px; background: linear-gradient(transparent, rgba(20,30,20,.66)); color: #fff; pointer-events: none; }
.hero-cap .ht { font-size: 16.5px; font-weight: 800; letter-spacing: .5px; text-shadow: 0 1px 6px rgba(0,0,0,.3); }
.hero-cap .hs { font-size: 11.5px; opacity: .92; margin-top: 3px; line-height: 1.45; text-shadow: 0 1px 6px rgba(0,0,0,.3); }
.hero-dots { position: absolute; bottom: 11px; right: 14px; display: flex; gap: 6px; z-index: 3; }
.hero-dots .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.5); }
.hero-dots .dot.on { background: #fff; width: 19px; border-radius: 4px; }
.hero-badge { position: absolute; top: 12px; left: 14px; z-index: 3; background: rgba(255,255,255,.16); color: #fff; font-size: 10.5px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,.25); }

.search-bar { display: flex; align-items: center; gap: 8px; background: var(--card); border-radius: 999px; padding: 10px 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
.search-bar .icon { color: var(--text-muted); font-size: 14px; }
.search-bar .text { color: var(--text-muted); font-size: 13px; flex: 1; }
.search-bar .btn { color: var(--green); font-size: 13px; font-weight: 600; }

.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 2px; }
.section-title { font-size: 17px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 6px; }
.section-title::before { content: ''; width: 4px; height: 16px; background: var(--green); border-radius: 2px; }
.section-more { font-size: 12px; color: var(--text-secondary); }

.product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.product-card { background: var(--card); border-radius: var(--radius-lg); padding: 16px 14px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); position: relative; overflow: hidden; }
.product-card:active { transform: scale(0.97); }
.product-card.featured { border: 1.5px solid var(--orange); }
.product-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 10px; }
.product-icon.green { background: var(--green-light); }
.product-icon.orange { background: var(--orange-light); }
.product-icon.brown { background: #F5E8DC; }
.product-icon.blue { background: #e8f0f5; }
.product-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.product-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px; }
.product-tag { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
.product-tag.hot { background: var(--orange-light); color: var(--orange); }
.product-tag.free { background: var(--green-light); color: var(--green); }

.steps-row { display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 8px; margin: 0 -16px 16px; padding-left: 16px; }
.steps-row::-webkit-scrollbar { display: none; }
.step-card { flex-shrink: 0; width: 124px; background: var(--card); border-radius: var(--radius-md); padding: 14px 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); }
.step-num { display: inline-block; font-size: 10px; font-weight: 700; color: var(--green); background: var(--green-light); padding: 2px 8px; border-radius: 10px; margin-bottom: 8px; }
.step-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.step-desc { font-size: 10px; color: var(--text-secondary); line-height: 1.5; }

.icp { text-align: center; font-size: 10px; color: var(--text-muted); padding: 12px 0; line-height: 1.6; }

/* ========== 知识 ========== */
.knowledge-banner { background: var(--green-grad); border-radius: var(--radius-lg); padding: 16px; color: #fff; margin-bottom: 16px; }
.dict-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.dict-card { background: var(--card); border-radius: var(--radius-md); padding: 14px 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); }
.dict-icon { font-size: 24px; margin-bottom: 8px; }
.dict-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.dict-count { font-size: 10px; color: var(--text-secondary); }

/* ========== 客户档案 ========== */
.client-card { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 12px 14px; margin-bottom: 10px; box-shadow: var(--shadow-sm); }
.avatar { width: 44px; height: 44px; border-radius: 13px; background: linear-gradient(135deg, var(--brown), #a9744f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; flex-shrink: 0; }
.client-card .nm { font-size: 14.5px; font-weight: 600; }
.client-card .mt { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.stagebadge { font-size: 10.5px; padding: 3px 8px; border-radius: 9px; background: var(--green-light); color: var(--green); font-weight: 600; flex-shrink: 0; }
.persona { font-size: 10px; padding: 2px 7px; border-radius: 9px; font-weight: 600; margin-left: 6px; }
.p-red { background: #fdecea; color: #c0392b; } .p-blue { background: #e8f0fe; color: #2a6fb0; } .p-green { background: #e9f7ef; color: #1e8a5a; }

.featured-cta { background: var(--green-grad); color: #fff; border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow-md); }
.btn-cta { background: #fff; color: var(--green); border: none; padding: 10px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; }

/* ========== 策展 ========== */
.methodcard { background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 13px 14px; margin-bottom: 9px; box-shadow: var(--shadow-sm); }
.methodcard .mh { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; color: var(--green); }
.methodcard .mh .arrow { margin-left: auto; font-size: 13px; color: var(--text-muted); transition: .2s; }
.methodcard.open .arrow { transform: rotate(90deg); }
.methodcard .ms { font-size: 11.5px; color: var(--text-secondary); margin-top: 8px; line-height: 1.55; display: none; }
.methodcard.open .ms { display: block; }

.libitem { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 11px 13px; margin-bottom: 9px; box-shadow: var(--shadow-sm); }
.libitem .lt { flex: 1; } .libitem .lt .t { font-size: 13.5px; font-weight: 600; }
.libitem .lt .s { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
.libitem .ok { font-size: 11px; color: var(--green); background: var(--green-light); padding: 2px 8px; border-radius: 9px; }

/* ========== 测评 ========== */
.assess-tabs { display: flex; background: var(--card); border-radius: var(--radius-md); padding: 4px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }
.assess-tab { flex: 1; padding: 10px; text-align: center; font-size: 13px; font-weight: 600; color: var(--text-secondary); border-radius: var(--radius-sm); }
.assess-tab.active { background: var(--green); color: #fff; }
.assess-card { background: var(--card); border-radius: var(--radius-lg); padding: 20px 16px; margin-bottom: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); }
.assess-meta { display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); margin-bottom: 14px; }
.assess-btn { width: 100%; background: var(--green-grad); color: #fff; border: none; border-radius: 999px; padding: 12px; font-size: 14px; font-weight: 600; }

/* ========== 我的 ========== */
.profile-header { background: var(--green-grad); border-radius: var(--radius-lg); padding: 20px; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 14px; }
.profile-avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.profile-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.profile-tag { font-size: 11px; opacity: .85; background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 8px; display: inline-block; }
.menu-group { background: var(--card); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 12px; box-shadow: var(--shadow-sm); }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 0.5px solid var(--border); }
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: var(--bg); }
.menu-icon { width: 24px; font-size: 18px; text-align: center; }
.menu-text { flex: 1; font-size: 14px; color: var(--text); }
.menu-arrow { color: var(--text-muted); font-size: 14px; }
.menu-badge { background: var(--orange); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 8px; }

/* ========== 覆盖层（策展表单/结果/客户详情） ========== */
.overlay { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: var(--bg); z-index: 60; display: none; flex-direction: column; }
.overlay.active { display: flex; }
.ovcontent { flex: 1; overflow-y: auto; padding: 16px 16px 90px; }
.ov-nav { background: var(--card); padding: 12px 16px 14px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; border-bottom: 0.5px solid var(--border); }
.ov-nav .back { background: var(--green-light); border: none; color: var(--green); width: 30px; height: 30px; border-radius: 9px; font-size: 18px; }
.ov-nav .sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }

.sec { background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 14px; margin-bottom: 11px; box-shadow: var(--shadow-sm); }
.sec .h { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; font-weight: 700; color: var(--green); }
.sec .h .em { font-size: 17px; }
.sec .h .mtd { font-size: 10px; color: #fff; background: var(--orange); padding: 2px 7px; border-radius: 9px; margin-left: auto; font-weight: 600; }
.sec-list { padding: 0; } .sec-li { font-size: 13px; color: var(--text); padding: 5px 0 5px 18px; position: relative; line-height: 1.55; }
.sec-li::before { content: ""; position: absolute; left: 2px; top: 12px; width: 6px; height: 6px; border-radius: 50%; background: var(--orange); }
.sec .ref { font-size: 11px; color: var(--brown); margin-top: 6px; background: #fbf6ee; padding: 5px 9px; border-radius: 8px; display: inline-block; }
.svc-progress { font-size: 13px; line-height: 1.6; white-space: pre-line; }
.hl { background: var(--orange-light); color: var(--orange); padding: 1px 5px; border-radius: 5px; font-weight: 600; }

.field { margin-bottom: 14px; }
.field .label { font-size: 13px; color: var(--green); font-weight: 600; display: block; margin-bottom: 7px; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt view { background: #fff; border: 1px solid var(--border); padding: 7px 13px; border-radius: 11px; font-size: 13px; color: var(--text-secondary); }
.opt view.on { background: var(--green); color: #fff; border-color: var(--green); }
.opt view.on.p-r { background: #c0392b; border-color: #c0392b; }
.opt view.on.p-b { background: #2a6fb0; border-color: #2a6fb0; }
.opt view.on.p-g { background: #1e8a5a; border-color: #1e8a5a; }
textarea { width: 100%; border: 1px solid var(--border); border-radius: 11px; padding: 11px; font-size: 13.5px; font-family: inherit; height: 84px; background: #fff; color: var(--text); }
.btn-orange { background: var(--orange); color: #fff; border: none; padding: 12px; border-radius: 999px; font-size: 14px; font-weight: 600; width: 100%; }
.btn-green { background: var(--green); color: #fff; border: none; padding: 12px; border-radius: 999px; font-size: 14px; font-weight: 600; width: 100%; }
.btn-ghost { background: #fff; color: var(--green); border: 1.5px solid var(--green); padding: 12px; border-radius: 999px; font-size: 14px; font-weight: 600; width: 100%; }
.score { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #c46a3a, #a9542c); color: #fff; border-radius: var(--radius-md); padding: 13px 15px; margin-bottom: 12px; }
.score .num { font-size: 30px; font-weight: 800; } .score .tx { font-size: 12.5px; line-height: 1.4; } .score .tx-sub { font-size: 12.5px; line-height: 1.4; margin-top: 2px; }
.channel { display: flex; align-items: center; gap: 8px; background: var(--green-light); border-radius: 11px; padding: 9px 12px; margin-bottom: 12px; font-size: 12.5px; color: var(--green); font-weight: 600; }

/* ========== 案例 ========== */
.cases-wallet { background: var(--green-grad); border-radius: var(--radius-lg); padding: 15px 16px; color: #fff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow-md); }
.cases-wallet .lab { font-size: 12px; opacity: .85; }
.cases-wallet .num { font-size: 30px; font-weight: 800; line-height: 1.1; margin-top: 2px; }
.cases-wallet .num .unit { font-size: 13px; font-weight: 600; margin-left: 3px; }
.cases-wallet .earn { background: #fff; color: var(--green); border: none; padding: 9px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 700; flex-shrink: 0; }
.filter-block { margin-bottom: 12px; }
.filter-label { font-size: 12px; color: var(--text-secondary); margin: 0 2px 7px; font-weight: 600; }
.chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex-shrink: 0; background: var(--card); border: 1px solid var(--border); padding: 7px 13px; border-radius: 999px; font-size: 12.5px; color: var(--text-secondary); white-space: nowrap; }
.chip.on { background: var(--green); color: #fff; border-color: var(--green); }
.case-card { background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 14px; margin-bottom: 11px; box-shadow: var(--shadow-sm); }
.case-tags { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.ctag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 9px; }
.ctag.role { background: var(--green-light); color: var(--green); }
.ctag.scene { background: var(--orange-light); color: var(--orange); }
.ctag.mtd { background: #F5E8DC; color: var(--brown); }
.case-title { font-size: 14.5px; font-weight: 700; color: var(--text); margin-bottom: 5px; line-height: 1.4; }
.case-preview { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }
.case-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 11px; }
.case-cost { font-size: 12px; font-weight: 700; color: var(--orange); }
.case-cost.free { color: var(--green); }
.case-lockbtn { background: var(--orange); color: #fff; border: none; padding: 7px 13px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.case-openbtn { background: var(--green-light); color: var(--green); border: none; padding: 7px 13px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.case-full { display: none; margin-top: 10px; padding-top: 11px; border-top: 1px dashed var(--border); }
.case-card.open .case-full { display: block; }
.case-full .blk { margin-bottom: 9px; }
.case-full .blk-h { font-size: 12.5px; font-weight: 700; color: var(--green); margin-bottom: 3px; }
.case-full .blk-b { font-size: 12.5px; color: var(--text-secondary); line-height: 1.65; }
.earn-card { background: var(--card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 13px 14px; margin-bottom: 11px; box-shadow: var(--shadow-sm); }
.earn-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid var(--border); }
.earn-row:last-child { border-bottom: none; }
.earn-row .et { flex: 1; font-size: 13px; color: var(--text); }
.earn-row .ep { font-size: 12px; color: var(--orange); font-weight: 700; }
.earn-row .eb { background: var(--green); color: #fff; border: none; padding: 5px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.earn-row .eb.done { background: var(--border); color: var(--text-muted); }
.case-promo { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg,#c46a3a,#a9542c); color: #fff; border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 18px; box-shadow: var(--shadow-md); }
.case-promo .cp-t { font-size: 14.5px; font-weight: 700; }
.case-promo .cp-s { font-size: 11px; opacity: .9; margin-top: 3px; }
.case-promo .cp-r { background: rgba(255,255,255,.2); padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; flex-shrink: 0; }

/* ========== 信任积分 + LTRUST ========== */
.trust-banner { display: flex; align-items: center; gap: 12px; background: var(--green-grad); border-radius: var(--radius-lg); padding: 13px 15px; margin-bottom: 14px; color: #fff; box-shadow: var(--shadow-md); }
.trust-banner .tb-ico { font-size: 26px; flex-shrink: 0; }
.trust-banner .tb-l { flex: 1; min-width: 0; }
.trust-banner .tb-lab { font-size: 11px; opacity: .85; }
.trust-banner .tb-num { font-size: 22px; font-weight: 800; line-height: 1.15; }
.trust-banner .tb-num .unit { font-size: 12px; font-weight: 600; margin-left: 2px; }
.trust-banner .tb-goal { font-size: 10.5px; opacity: .9; margin-top: 2px; }
.trust-banner .tb-bar { height: 6px; background: rgba(255,255,255,.25); border-radius: 3px; margin-top: 5px; overflow: hidden; }
.trust-banner .tb-fill { height: 100%; background: var(--orange-light); border-radius: 3px; }

.ltrust-list { margin: 2px 0 4px; }
.ltrust-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 0.5px solid var(--border); }
.ltrust-row:last-child { border-bottom: none; }
.ltrust-ck { width: 20px; height: 20px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.ltrust-ck.off { background: var(--border); color: var(--text-muted); }
.ltrust-tx { flex: 1; font-size: 13px; color: var(--text); line-height: 1.4; }
.ltrust-map { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; }
.ltrust-prog { display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-secondary); margin-top: 8px; }
.ltrust-prog .bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.ltrust-prog .bar .bar-fill { display: block; height: 100%; background: linear-gradient(90deg,var(--green-light),var(--green)); border-radius: 3px; }

.trust-stars { display: flex; gap: 6px; justify-content: center; margin: 8px 0 4px; }
.trust-stars .ts { font-size: 28px; color: var(--brown); }
.trust-stars .ts.on { color: var(--orange); }
.trust-rate-cap { text-align: center; font-size: 12px; color: var(--text-secondary); }

.trust-card { background: var(--green-grad); border-radius: var(--radius-lg); padding: 16px; color: #fff; margin-bottom: 12px; box-shadow: var(--shadow-md); }
.trust-card .tc-top { display: flex; align-items: center; justify-content: space-between; }
.trust-card .tc-num { font-size: 34px; font-weight: 800; line-height: 1; }
.trust-card .tc-num .unit { font-size: 14px; font-weight: 600; margin-left: 3px; }
.trust-card .tc-goal { font-size: 11.5px; opacity: .9; margin-top: 4px; }
.trust-card .tc-bar { height: 7px; background: rgba(255,255,255,.25); border-radius: 4px; margin-top: 9px; overflow: hidden; }
.trust-card .tc-fill { height: 100%; background: var(--orange-light); border-radius: 4px; }
.trust-card .tc-rule { font-size: 10.5px; opacity: .85; margin-top: 8px; line-height: 1.5; }

/* ========== 邀请裂变 ========== */
.phase-banner { background: rgba(196,106,58,.10); border: 1px solid rgba(196,106,58,.28); border-radius: 10px; padding: 9px 12px; margin: 4px 0 12px; font-size: 12px; color: #9a5026; line-height: 1.6; }
.invite-box { background: linear-gradient(135deg,var(--green),#4d7050); color: #fff; border-radius: 14px; padding: 16px; margin: 12px 0; }
.invite-box .ib-title { font-size: 14px; font-weight: 700; }
.invite-box .ib-code { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.16); border-radius: 10px; padding: 10px 12px; margin: 10px 0; font-size: 13px; }
.invite-box .ib-reward { font-size: 12px; opacity: .92; line-height: 1.6; }
.btn-light { background: #fff; color: var(--green); border: none; border-radius: 999px; padding: 8px 16px; font-size: 13px; font-weight: 700; margin-top: 4px; }
</style>
