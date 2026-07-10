// 小程序事件追踪
// MVP阶段：事件存本地storage，API部署后改为远程上报

const PRODUCT = 'mini-program'

const PATH_MAP = {
  '/pages/index/index': 'index',
  '/pages/mentor/index': 'mentor',
  '/pages/profile/index': 'profile',
  '/pages/webview/index': 'webview',
}

function deriveProduct(pagePath) {
  return PATH_MAP[pagePath] || 'mini-program'
}

function buildPayload(eventType, extra = {}) {
  return {
    type: eventType,
    product: PRODUCT,
    page: deriveProduct(uni.getStorageSync('__current_page') || '/pages/index/index'),
    ts: Date.now(),
    ...extra,
  }
}

/**
 * 发送事件 — MVP阶段存本地，避免404
 */
function send(eventType, extra = {}) {
  const payload = buildPayload(eventType, extra)
  // 存本地，最多保留100条
  const events = uni.getStorageSync('fs_events') || []
  events.push(payload)
  if (events.length > 100) events.shift()
  uni.setStorageSync('fs_events', events)
}

export const track = {
  pageview(extra = {}) {
    send('pageview', extra)
  },
  click(name, extra = {}) {
    send('click', { name, ...extra })
  },
  use(name, extra = {}) {
    send('feature_use', { name, ...extra })
  },
}

export default track
