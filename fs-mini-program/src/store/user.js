// Pinia 用户状态管理 — V2 完整版
import { defineStore } from 'pinia'
import { wxLogin, logout as apiLogout, getUserId as apiGetUserId } from '../api/auth'

// 等级配置
const LEVEL_CONFIG = [
  { minPoints: 0, name: '见习经纪', maxPoints: 99 },
  { minPoints: 100, name: '初级经纪', maxPoints: 299 },
  { minPoints: 300, name: '中级经纪', maxPoints: 599 },
  { minPoints: 600, name: '高级经纪', maxPoints: 999 },
  { minPoints: 1000, name: '资深经纪', maxPoints: 1999 },
  { minPoints: 2000, name: '金牌经纪', maxPoints: 4999 },
  { minPoints: 5000, name: '钻石经纪', maxPoints: 9999 },
  { minPoints: 10000, name: '传奇经纪', maxPoints: Infinity },
]

function getLevelInfo(points) {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (points >= LEVEL_CONFIG[i].minPoints) {
      return {
        level: i + 1,
        levelName: LEVEL_CONFIG[i].name,
        minPoints: LEVEL_CONFIG[i].minPoints,
        maxPoints: LEVEL_CONFIG[i].maxPoints,
      }
    }
  }
  return { level: 1, levelName: '见习经纪', minPoints: 0, maxPoints: 99 }
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: null,
    openid: null,
    userId: null,
    nickname: null,
    avatar: null,
    subscription: null, // { type: 'monthly'|'yearly', status, expireAt }
    isLoggedIn: false,
    points: 0,
    pointsHistory: [], // [{type:'earn'|'spend', amount, reason, timestamp}]
    unlockedContent: {}, // { 'entry_001': ['fullCase', 'agentMemo'], ... }
    favorites: [], // [entryId, ...]
    contributions: [], // [{type, entryId, status, timestamp}]
    // 导师对话配额
    freeChatCount: 5,
    lastChatResetDate: null,
    // 答题统计
    quizStats: { total: 0, correct: 0, streak: 0, lastAnswerDate: null },
  }),

  getters: {
    levelInfo(state) {
      return getLevelInfo(state.points)
    },
    level(state) {
      return getLevelInfo(state.points).level
    },
    levelName(state) {
      return getLevelInfo(state.points).levelName
    },
    isContentUnlocked() {
      return (entryId, contentType) => {
        const unlocked = this.unlockedContent[entryId]
        return unlocked && unlocked.includes(contentType)
      }
    },
    remainingQuota(state) {
      // 订阅有效期内无限
      if (state.subscription && state.subscription.expireAt > Date.now()) {
        return Infinity
      }
      return state.freeChatCount
    },
    isQuotaExhausted() {
      return this.remainingQuota === 0
    },
    accuracy(state) {
      if (state.quizStats.total === 0) return 0
      return Math.round((state.quizStats.correct / state.quizStats.total) * 100)
    },
  },

  actions: {
    _persist() {
      uni.setStorageSync('fs_points', this.points)
      uni.setStorageSync('fs_points_history', JSON.stringify(this.pointsHistory))
      uni.setStorageSync('fs_unlocked_content', JSON.stringify(this.unlockedContent))
      uni.setStorageSync('fs_favorites', JSON.stringify(this.favorites))
      uni.setStorageSync('fs_contributions', JSON.stringify(this.contributions))
      uni.setStorageSync('fs_chat_quota', JSON.stringify({ freeChatCount: this.freeChatCount, lastChatResetDate: this.lastChatResetDate }))
      uni.setStorageSync('fs_quiz_stats', JSON.stringify(this.quizStats))
    },

    async login() {
      try {
        const res = await wxLogin()
        this.token = res.token
        this.openid = res.openid
        this.userId = res.userId
        this.isLoggedIn = true
        // 新用户送 50 积分
        if (res.isNewUser) {
          this.earnPoints(50, '注册赠送')
        }
        return res
      } catch (err) {
        throw err
      }
    },

    logout() {
      apiLogout()
      this.$reset()
    },

    initFromStorage() {
      this.token = uni.getStorageSync('fs_token') || null
      this.openid = uni.getStorageSync('fs_openid') || null
      this.userId = uni.getStorageSync('fs_user_id') || null
      this.isLoggedIn = !!this.token
      this.points = uni.getStorageSync('fs_points') || 0
      try {
        this.unlockedContent = JSON.parse(uni.getStorageSync('fs_unlocked_content') || '{}')
      } catch { this.unlockedContent = {} }
      try {
        this.pointsHistory = JSON.parse(uni.getStorageSync('fs_points_history') || '[]')
      } catch { this.pointsHistory = [] }
      try {
        this.favorites = JSON.parse(uni.getStorageSync('fs_favorites') || '[]')
      } catch { this.favorites = [] }
      try {
        this.contributions = JSON.parse(uni.getStorageSync('fs_contributions') || '[]')
      } catch { this.contributions = [] }
      try {
        const q = JSON.parse(uni.getStorageSync('fs_chat_quota') || '{}')
        this.freeChatCount = q.freeChatCount ?? 5
        this.lastChatResetDate = q.lastChatResetDate || null
      } catch { this.freeChatCount = 5; this.lastChatResetDate = null }
      try {
        const qs = JSON.parse(uni.getStorageSync('fs_quiz_stats') || '{}')
        this.quizStats = {
          total: qs.total ?? 0,
          correct: qs.correct ?? 0,
          streak: qs.streak ?? 0,
          lastAnswerDate: qs.lastAnswerDate ?? null,
        }
      } catch { this.quizStats = { total: 0, correct: 0, streak: 0, lastAnswerDate: null } }
      // 跨日重置对话配额
      this._resetDailyQuotaIfNeeded()
    },

    getUserId() {
      return this.userId || apiGetUserId()
    },

    /** 赚取积分 */
    earnPoints(amount, reason = '') {
      this.points = Math.max(0, (this.points || 0) + amount)
      this.pointsHistory.unshift({
        type: 'earn',
        amount,
        reason: reason || '积分奖励',
        timestamp: Date.now(),
      })
      // 保留最近 200 条
      if (this.pointsHistory.length > 200) {
        this.pointsHistory = this.pointsHistory.slice(0, 200)
      }
      this._persist()
      return this.points
    },

    /** 消费积分（通用，不涉及解锁） */
    spendPoints(amount, reason = '') {
      if ((this.points || 0) < amount) {
        return { success: false, message: `积分不足，需要 ${amount} 积分` }
      }
      this.points -= amount
      this.pointsHistory.unshift({
        type: 'spend',
        amount,
        reason: reason || '积分消耗',
        timestamp: Date.now(),
      })
      if (this.pointsHistory.length > 200) {
        this.pointsHistory = this.pointsHistory.slice(0, 200)
      }
      this._persist()
      return { success: true, remainingPoints: this.points }
    },

    /** 消费积分解锁内容 */
    unlockContent(entryId, contentType, cost) {
      if (!this.unlockedContent[entryId]) {
        this.unlockedContent[entryId] = []
      }
      if (this.unlockedContent[entryId].includes(contentType)) {
        return { success: true, alreadyUnlocked: true }
      }
      if ((this.points || 0) < cost) {
        return { success: false, message: `积分不足，需要 ${cost} 积分` }
      }
      this.points -= cost
      this.unlockedContent[entryId].push(contentType)
      this.pointsHistory.unshift({
        type: 'spend',
        amount: cost,
        reason: `解锁 ${contentType}`,
        timestamp: Date.now(),
      })
      if (this.pointsHistory.length > 200) {
        this.pointsHistory = this.pointsHistory.slice(0, 200)
      }
      this._persist()
      return { success: true, remainingPoints: this.points }
    },

    /** 检查指定内容是否已解锁 */
    checkUnlocked(entryId, contentType) {
      const unlocked = this.unlockedContent[entryId]
      return unlocked && unlocked.includes(contentType)
    },

    /** 收藏词条 */
    addFavorite(entryId) {
      if (!this.favorites.includes(entryId)) {
        this.favorites.push(entryId)
        this._persist()
      }
    },

    /** 取消收藏 */
    removeFavorite(entryId) {
      this.favorites = this.favorites.filter(id => id !== entryId)
      this._persist()
    },

    /** 添加贡献记录 */
    addContribution(contribution) {
      this.contributions.unshift({
        ...contribution,
        status: 'pending',
        timestamp: Date.now(),
      })
      this._persist()
    },

    // ============ 导师对话配额 ============

    _resetDailyQuotaIfNeeded() {
      const today = todayStr()
      if (this.lastChatResetDate !== today) {
        this.freeChatCount = 5
        this.lastChatResetDate = today
        this._persist()
      }
    },

    /** 发送消息前检查配额 */
    checkQuotaBeforeSendMessage() {
      this._resetDailyQuotaIfNeeded()
      // 订阅有效期内无限
      if (this.subscription && this.subscription.expireAt > Date.now()) {
        return { canSend: true, remaining: Infinity }
      }
      if (this.freeChatCount > 0) {
        return { canSend: true, remaining: this.freeChatCount }
      }
      return { canSend: false, reason: 'free_quota_exhausted', remaining: 0 }
    },

    /** 消耗一次对话配额 */
    consumeQuota() {
      this._resetDailyQuotaIfNeeded()
      if (this.subscription && this.subscription.expireAt > Date.now()) {
        return { success: true, remaining: Infinity }
      }
      if (this.freeChatCount > 0) {
        this.freeChatCount--
        this._persist()
        return { success: true, remaining: this.freeChatCount }
      }
      return { success: false, message: '免费额度已用完' }
    },

    // ============ 答题统计 ============

    /** 记录答题结果 */
    recordAnswer(isCorrect) {
      const today = todayStr()
      this.quizStats.total++
      if (isCorrect) {
        this.quizStats.correct++
        // 连续答对：同一天或昨天连续
        if (this.quizStats.lastAnswerDate === today) {
          // 同一天不重复加 streak
        } else {
          this.quizStats.streak++
        }
      } else {
        this.quizStats.streak = 0
      }
      this.quizStats.lastAnswerDate = today
      this._persist()
    },
  },
})