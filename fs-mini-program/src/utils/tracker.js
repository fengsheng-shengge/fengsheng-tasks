/**
 * 风声小程序 · 行为埋点工具 v2
 * 7 个核心事件：4 内容指标 + 3 触发指标
 * 远程上报到 /api/event，本地存储作为 fallback
 */

const API_BASE = 'https://fengsheng.tech'
const APP_VERSION = '1.0.0'
const PLATFORM = 'miniprogram'

const PATH_MAP = {
  '/pages/home/index': 'home',
  '/pages/dict/index': 'dict',
  '/pages/mentor/index': 'mentor',
  '/pages/quiz/index': 'quiz',
  '/pages/me/index': 'me',
}

// 获取 sessionId（全局唯一）
let _sessionId = null
function getSessionId() {
  if (!_sessionId) {
    _sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
  }
  return _sessionId
}

// 获取 userId
function getUserId() {
  try {
    const userData = uni.getStorageSync('fs_user_data')
    return userData?.userId || ''
  } catch {
    return ''
  }
}

function derivePage(pagePath) {
  return PATH_MAP[pagePath] || pagePath
}

/**
 * 上报事件 — 远程上报 + 本地 fallback
 * @param {string} event 事件名
 * @param {object} properties 事件属性
 */
function trackEvent(event, properties = {}) {
  const currentPage = uni.getStorageSync('__current_page') || '/pages/home/index'
  const payload = {
    event,
    properties: {
      ...properties,
      userId: getUserId(),
      sessionId: getSessionId(),
      appVersion: APP_VERSION,
      platform: PLATFORM,
      page: derivePage(currentPage),
    },
    timestamp: Date.now(),
  }

  // 本地存储 fallback（保留原有逻辑）
  try {
    const events = uni.getStorageSync('fs_events') || []
    events.push(payload)
    if (events.length > 100) events.shift()
    uni.setStorageSync('fs_events', events)
  } catch {}

  // 异步远程上报，不阻塞业务
  uni.request({
    url: API_BASE + '/api/event',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: payload,
    success: () => {},
    fail: () => {},
  })
}

/**
 * 4 个核心内容指标
 */

// 点击率：看到卡片/词条→点击进入详情
export function trackContentClick(contentId, contentType, source) {
  trackEvent('content_click', { contentId, contentType, source })
}

// 展开率：进入详情→展开案例/备忘/依据
export function trackContentExpand(contentId, section) {
  trackEvent('content_expand', { contentId, section })
}

// 收藏率：展开内容→点击收藏
export function trackContentCollect(contentId, contentType) {
  trackEvent('content_collect', { contentId, contentType })
}

// 追问率：收藏后→点击关联词条/导师对话
export function trackContentFollowup(fromContentId, toContentId, toType) {
  trackEvent('content_followup', { fromContentId, toContentId, toType })
}

/**
 * 3 个触发指标（P0-01 触发入口验证）
 */

// 触发入口使用率：首页"客户说了什么"输入条点击
export function trackTriggerInputUse() {
  trackEvent('trigger_input_use', {})
}

// 触发匹配成功率：输入后匹配到内容
export function trackTriggerMatchSuccess(input, matchCount, topMatchId) {
  trackEvent('trigger_match_success', { input, matchCount, topMatchId })
}

// 触发转化率：匹配成功后点击进入详情
export function trackTriggerToDetail(input, clickedId, clickedType) {
  trackEvent('trigger_to_detail', { input, clickedId, clickedType })
}

/**
 * 兼容原有接口（pageview/click/use）
 */
export const track = {
  pageview(extra = {}) {
    trackEvent('pageview', extra)
  },
  click(name, extra = {}) {
    trackEvent('click', { name, ...extra })
  },
  use(name, extra = {}) {
    trackEvent('feature_use', { name, ...extra })
  },
}

export default {
  trackEvent,
  trackContentClick,
  trackContentExpand,
  trackContentCollect,
  trackContentFollowup,
  trackTriggerInputUse,
  trackTriggerMatchSuccess,
  trackTriggerToDetail,
  track,
}
