// 小程序行为埋点 —— 复用 fengsheng.tech /api/events（D1 events 表），product='mini-program'
// 设计：uid 为本地匿名标识（用户隐私友好，不强制登录即可统计）；
//      上报失败静默，绝不影响业务主流程；仅在页面 onShow / 关键动作后调用（避开 onLaunch 同步 storage 坑）。
const BASE = 'https://fengsheng.tech'
let _uid = null

function getUid() {
  if (_uid) return _uid
  try {
    _uid = uni.getStorageSync('fs_track_uid')
    if (!_uid) {
      _uid = 'mp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      uni.setStorageSync('fs_track_uid', _uid)
    }
  } catch (e) {
    _uid = 'mp_anon'
  }
  return _uid
}

function send(type, page, data) {
  // H5 本地调试（127.0.0.1）跳过向 fengsheng.tech 的跨域请求，避免 console 刷 CORS 报错。
  // mp-weixin 真机无 window，仍按 MP 后台合法域名决定能否上报，失败亦静默，不影响主流程。
  try {
    if (typeof window !== 'undefined' && window.location && window.location.hostname === '127.0.0.1') {
      return
    }
  } catch (e) { /* 忽略，继续上报 */ }
  try {
    uni.request({
      url: BASE + '/api/events',
      method: 'POST',
      data: { uid: getUid(), type: type, product: 'mini-program', page: page || '', data: data || {} },
      fail: () => {}
    })
  } catch (e) { /* 静默 */ }
}

// 页面浏览（每个 tab 页 onShow 调用）
export function trackPageview(page) {
  send('pageview', page)
}
// 关键业务事件
export function trackEvent(type, page, data) {
  send(type, page, data)
}

export default { trackPageview, trackEvent }
