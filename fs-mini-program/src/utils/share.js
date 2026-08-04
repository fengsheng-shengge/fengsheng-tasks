// 分享能力工具
// - 微信内转发卡片：由页面 onShareAppMessage / onShareTimeline 提供
// - 小程序链接：明文 URL Scheme（微信内外都能打开小程序）
// - h5 链接：降级方案，浏览器打开网页版
// - 小程序码：通过服务端 /api/wxacode 接口生成真·小程序码

export const APP_SHARE_TITLE = '风声 · 帮服务者用独立价值获得尊重'
const MP_APPID = 'wxd4ccbb319a00bb89'

// 生成微信小程序明文 URL Scheme（微信内外都能直接拉起小程序）
// 格式：weixin://dl/business/?appid=xxx&path=xxx&query=xxx&env_version=release
export function buildMiniProgramLink(path, query) {
  const p = (path || '').replace(/^\//, '')
  let url = `weixin://dl/business/?appid=${MP_APPID}&path=${encodeURIComponent(p)}&env_version=release`
  if (query) {
    url += `&query=${encodeURIComponent(query)}`
  }
  return url
}

// 当前构建版本号（与送审 zip / 微信开发者工具「上传」版本号保持一致）。
// 用途：让用户一眼确认手机跑的是不是最新包，消除「到底有没有更新」的歧义。
export const APP_VERSION = '3.0.12.0'

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

// 生成小程序码图片 URL（服务端渲染）
// scene: 场景参数（最长32字符），如 'd:CAR-SEE'
// page: 可选，小程序页面路径，如 'pages/knowledge/detail'
// width: 可选，像素宽，默认430，范围280-1280
// hyaline: 可选，透明背景，默认false
export function buildWxQrCodeUrl({ scene = 'index', page = '', width = 430, hyaline = false } = {}) {
  const base = 'https://fengsheng.tech/api/wxacode'
  const params = new URLSearchParams({ scene, width: String(width) })
  if (page) params.set('page', page)
  if (hyaline) params.set('hyaline', 'true')
  return `${base}?${params.toString()}`
}

// 下载小程序码图片到本地临时路径（小程序端）
export async function downloadWxQrCode(options = {}) {
  const url = buildWxQrCodeUrl(options)
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error(`下载失败: ${res.statusCode}`))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

// 保存小程序码到相册（小程序端）
export async function saveWxQrCodeToAlbum(options = {}) {
  const tempPath = await downloadWxQrCode(options)
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => {
        uni.showToast({ title: '小程序码已保存到相册', icon: 'success' })
        resolve(tempPath)
      },
      fail: (err) => {
        if (err.errMsg?.includes('auth deny')) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在设置中允许访问相册，才能保存小程序码',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) uni.openSetting()
            },
          })
        }
        reject(err)
      },
    })
  })
}

// 复制小程序链接到剪贴板（使用明文 URL Scheme，微信内外都能打开小程序）
export function copyLink(path, tip, query) {
  uni.setClipboardData({
    data: buildMiniProgramLink(path, query),
    success: () => uni.showToast({ title: tip || '小程序链接已复制 · 打开微信即可跳转', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
  })
}

// 复制 h5 网页链接到剪贴板（降级方案，浏览器打开）
export function copyH5Link(path, tip) {
  uni.setClipboardData({
    data: buildShareLink(path),
    success: () => uni.showToast({ title: tip || '网页链接已复制 · 微信外也能打开', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
  })
}
