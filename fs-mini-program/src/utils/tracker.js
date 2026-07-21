// 小程序事件追踪 V2 — 行为埋点
// P0-02: 4核心指标 + 3触发指标
// MVP阶段：事件存本地storage，后续改为远程上报 /api/event

const PRODUCT = 'mini-program'
const STORAGE_KEY = 'fs_events'
const MAX_EVENTS = 500

// V2 页面路径映射
const PATH_MAP = {
  '/pages/home/index': 'home',
  '/pages/home/scene-detail': 'scene_detail',
  '/pages/dict/index': 'dict',
  '/pages/dict/entry-detail': 'entry_detail',
  '/pages/mentor/index': 'mentor',
  '/pages/quiz/index': 'quiz',
  '/pages/quiz/game': 'game',
  '/pages/me/index': 'me',
  '/pages/me/points': 'points',
  '/pages/me/contributions': 'contributions',
  '/pages/login/index': 'login',
  '/pages/pay/index': 'pay',
}

function derivePage(pagePath) {
  return PATH_MAP[pagePath] || 'unknown'
}

function getUserId() {
  return uni.getStorageSync('fs_user_id') || ''
}

function isoNow() {
  return new Date().toISOString()
}

/**
 * 发送事件 — MVP阶段存本地，后续改为 uni.request 上报
 */
function send(event, payload = {}) {
  const data = {
    event,
    timestamp: isoNow(),
    userId: getUserId(),
    product: PRODUCT,
    page: derivePage(uni.getStorageSync('__current_page') || ''),
    ...payload,
  }
  // 本地存储
  const events = uni.getStorageSync(STORAGE_KEY) || []
  events.push(data)
  if (events.length > MAX_EVENTS) events.shift()
  uni.setStorageSync(STORAGE_KEY, events)

  // 后续可开启远程上报（fengsheng.tech 已配置为合法域名）
  // #ifdef MP-WEIXIN
  // uni.request({
  //   url: 'https://fengsheng.tech/api/event',
  //   method: 'POST',
  //   data,
  //   fail: () => {} // 静默失败
  // })
  // #endif
}

export const track = {
  // ============ 基础事件 ============
  pageview(extra = {}) {
    send('pageview', extra)
  },

  click(name, extra = {}) {
    send('click', { name, ...extra })
  },

  use(name, extra = {}) {
    send('feature_use', { name, ...extra })
  },

  // ============ P0-02: 4 核心内容指标 ============

  /**
   * 点击率：看到卡片/词条 → 点击进入详情
   * @param {string} contentId - 内容ID（如 RNT-008, SCENE-01）
   * @param {string} contentType - 内容类型（tool_card / scene_card / entry / case）
   * @param {string} source - 来源（trigger_input / search / scene_card / dictionary）
   * @param {string} sceneId - 关联场景ID（可选）
   */
  contentClick(contentId, contentType, source = '', sceneId = '') {
    send('content_click', { contentId, contentType, source, sceneId })
  },

  /**
   * 展开率：进入详情 → 展开案例/备忘/依据
   * @param {string} contentId
   * @param {string} contentType - full_case / agent_memo / legal_basis
   */
  contentExpand(contentId, contentType) {
    send('content_expand', { contentId, contentType })
  },

  /**
   * 收藏率：展开内容 → 点击收藏
   * @param {string} contentId
   * @param {string} contentType
   * @param {string} action - collect / uncollect
   */
  contentCollect(contentId, contentType, action = 'collect') {
    send('content_collect', { contentId, contentType, action })
  },

  /**
   * 追问率：收藏后 → 点击关联词条/导师对话
   * @param {string} contentId
   * @param {string} contentType
   * @param {string} target - related_entry / mentor / scene_detail
   */
  contentFollowup(contentId, contentType, target) {
    send('content_followup', { contentId, contentType, target })
  },

  // ============ P0-01: 3 触发入口指标 ============

  /**
   * 触发入口使用率：首页"客户说了什么"输入条点击
   */
  triggerInputUse() {
    send('trigger_input_use', {})
  },

  /**
   * 触发匹配成功率：输入后匹配到内容
   * @param {string} input - 用户输入（脱敏后，截取前50字）
   * @param {string} matchedId - 匹配到的内容ID
   * @param {string} matchedType - 匹配类型（alias / keyword / none）
   */
  triggerMatchSuccess(input, matchedId, matchedType) {
    send('trigger_match_success', {
      input: (input || '').slice(0, 50),
      matchedId,
      matchedType,
    })
  },

  /**
   * 触发转化率：匹配成功后点击进入详情
   * @param {string} input
   * @param {string} contentId
   */
  triggerToDetail(input, contentId) {
    send('trigger_to_detail', {
      input: (input || '').slice(0, 50),
      contentId,
    })
  },

  // ============ 导师对话指标 ============

  /**
   * 导师对话发送
   * @param {string} source - quick_scenario / free_input
   * @param {string} scenarioId - 快捷场景ID（可选）
   */
  mentorMessageSent(source = 'free_input', scenarioId = '') {
    send('mentor_message_sent', { source, scenarioId })
  },

  /**
   * 付费墙弹出
   * @param {string} trigger - quota_exhausted / manual
   */
  paywallShown(trigger = 'quota_exhausted') {
    send('paywall_shown', { trigger })
  },

  // ============ 积分指标 ============

  /**
   * 积分变动
   * @param {string} type - earn / spend
   * @param {number} amount
   * @param {string} reason
   */
  pointsChange(type, amount, reason = '') {
    send('points_change', { type, amount, reason })
  },
}

export default track