// 分享能力工具
// - 微信内转发卡片：由页面 onShareAppMessage / onShareTimeline 提供
// - 微信外链接：生成 h5 链接（客户/同事在浏览器或微信里打开即可看）
// 说明：真·小程序码需服务端调微信 API（access_token + getwxacodeunlimit），
//       纯前端无法生成；这里用「h5 链接」满足「链接/码」诉求（扫码即开 h5 版）。

export const APP_SHARE_TITLE = '风声 · 帮服务者用独立价值获得尊重'

// 当前构建版本号（与送审 zip / 微信开发者工具「上传」版本号保持一致）。
// 用途：让用户一眼确认手机跑的是不是最新包，消除「到底有没有更新」的歧义。
export const APP_VERSION = '3.0.7'

// 生成可分享的 h5 链接（条件编译：H5 用当前域名，小程序用线上域名）
export function buildShareLink(path) {
  const p = (path || '').replace(/^\//, '')
  // #ifdef H5
  return location.origin + '/#/' + p
  // #endif
  // #ifndef H5
  return 'https://fengsheng.tech/#/' + p
  // #endif
}

// 复制链接到剪贴板（双端通用）
export function copyLink(path, tip) {
  uni.setClipboardData({
    data: buildShareLink(path),
    success: () => uni.showToast({ title: tip || '链接已复制 · 微信外也能打开', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
  })
}
