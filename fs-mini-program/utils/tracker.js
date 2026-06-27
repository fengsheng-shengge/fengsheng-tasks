// 小程序事件追踪
// 与主站 tracker.js 逻辑一致，数据统一进入 /api/event

const PRODUCT = 'mini-program'

// 产品路径映射（小程序内）
const PATH_MAP = {
  '/pages/index/index': 'index',
  '/pages/decode/index': 'decode',
  '/pages/assess/index': 'assess',
  '/pages/agent/index': 'agent',
  '/pages/profile/index': 'profile',
  '/pages/subscribe/index': 'subscribe',
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
 * 发送事件
 */
function send(eventType, extra = {}) {
  const payload = buildPayload(eventType, extra)
  // 小程序环境用 uni.request
  uni.request({
    url: 'https://fengsheng.tech/api/event',
    method: 'POST',
    data: payload,
    header: { 'Content-Type': 'application/json' },
    fail: () => {}, // 不阻塞用户操作
  })
}

export const track = {
  // 页面浏览
  pageview(extra = {}) {
    send('pageview', extra)
  },
  // 用户点击
  click(name, extra = {}) {
    send('click', { name, ...extra })
  },
  // 功能使用
  use(name, extra = {}) {
    send('feature_use', { name, ...extra })
  },
  // 订阅事件
  subscribe(plan, extra = {}) {
    send('subscribe', { plan, ...extra })
  },
  // 解码完成
  decode(category, extra = {}) {
    send('decode', { category, ...extra })
  },
  // 测评完成
  assess(level, extra = {}) {
    send('assess', { level, ...extra })
  },
}

export default track
