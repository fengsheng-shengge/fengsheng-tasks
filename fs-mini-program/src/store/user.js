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
    // ===== V2.1.1a 新增：客户档案 / 策展库 / 测评 / 任务完成态 =====
    clients: [], // [{id, surname, name, rel, stage, pkey, persona, status, asset, level, addr, note, seed}]
    curatings: [], // [{id, clientId, t, s, ts}]
    assessments: [], // [{id, ts}]
    doneFlags: {}, // { taskId: true } 任务真实完成态（防自嗨闭环）
    shares: 0, // 分享次数（案例分享任务）
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
    // 任务是否真实完成（积分领取校验）
    isDone(state) {
      return (key) => !!state.doneFlags[key]
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
      // V2.1.1a
      uni.setStorageSync('fs_clients', JSON.stringify(this.clients))
      uni.setStorageSync('fs_curatings', JSON.stringify(this.curatings))
      uni.setStorageSync('fs_assessments', JSON.stringify(this.assessments))
      uni.setStorageSync('fs_done_flags', JSON.stringify(this.doneFlags))
      uni.setStorageSync('fs_shares', this.shares)
    },

    async login() {
      try {
        const res = await wxLogin()
        this.token = res.token
        this.openid = res.openid
        this.userId = res.userId
        this.isLoggedIn = true
        // 新用户体验礼包（对齐免费养成期规范：新户 +200）
        if (res.isNewUser) {
          this.earnPoints(200, '新用户礼包')
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
      // V2.1.1a：客户 / 策展 / 测评 / 任务态
      try { this.clients = JSON.parse(uni.getStorageSync('fs_clients') || '[]') } catch { this.clients = [] }
      try { this.curatings = JSON.parse(uni.getStorageSync('fs_curatings') || '[]') } catch { this.curatings = [] }
      try { this.assessments = JSON.parse(uni.getStorageSync('fs_assessments') || '[]') } catch { this.assessments = [] }
      try { this.doneFlags = JSON.parse(uni.getStorageSync('fs_done_flags') || '{}') } catch { this.doneFlags = {} }
      this.shares = uni.getStorageSync('fs_shares') || 0
      // 首次启动（无缓存）seed 4 个示例客户，让经纪人看到"可录入"的样子
      if (this.clients.length === 0) this.seedClients()
      // 跨日重置对话配额
      this._resetDailyQuotaIfNeeded()
    },

    /** 首次启动写入 4 个示例客户（标记 seed，可删可改） */
    seedClients() {
      const seed = [
        { surname: '林', name: '林先生 & 未婚妻', rel: '买房客户', stage: '购房线 / ①首套', pkey: 'red', persona: '🔴 结果导向', status: '跟进中', asset: '关系建立中，资产初值', level: 'A', addr: '', note: '90后婚房，预算300万，看重学区与通勤', seed: true },
        { surname: '张', name: '张先生（业主）', rel: '业主', stage: '购房线 / ④升级', pkey: 'blue', persona: '🔵 关系导向', status: '已成交', asset: '已购本房，适老改造钩子已埋', level: 'A', addr: '', note: '已购，适老改造咨询', seed: true },
        { surname: '王', name: '王女士（房东）', rel: '房东', stage: '租住线 / 业主侧', pkey: 'blue', persona: '🔵 关系导向', status: '跟进中', asset: '委托出租，定价钩子待跟进', level: 'B', addr: '', note: '空置45天委托出租', seed: true },
        { surname: '陈', name: '陈同学（租客）', rel: '租客', stage: '租住线 / ②改善', pkey: 'green', persona: '🟢 理智型', status: '跟进中', asset: '工作调动，租住改善中', level: 'C', addr: '', note: '工作调动近地铁', seed: true }
      ]
      this.clients = seed.map(c => ({ id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), ...c }))
      this._persist()
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

    // ============ V2.1.1a：客户档案 ============

    /** 新建客户 */
    addClient(c) {
      const client = { id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), seed: false, ...c }
      this.clients.unshift(client)
      this._persist()
      return client
    },

    /** 更新客户字段 */
    updateClient(id, patch) {
      const i = this.clients.findIndex(c => c.id === id)
      if (i >= 0) { this.clients[i] = { ...this.clients[i], ...patch }; this._persist() }
    },

    /** 删除客户 */
    removeClient(id) {
      this.clients = this.clients.filter(c => c.id !== id)
      this._persist()
    },

    getClient(id) {
      return this.clients.find(c => c.id === id) || null
    },

    /** 新增一次策展记录（关联客户） */
    addCurating(rec) {
      const item = { id: 'cur_' + Date.now(), ts: Date.now(), ...rec }
      this.curatings.unshift(item)
      this._persist()
      return item
    },

    /** 新增一次测评记录 */
    addAssessment() {
      const item = { id: 'as_' + Date.now(), ts: Date.now() }
      this.assessments.unshift(item)
      this._persist()
      return item
    },

    /** 分享次数 +1（案例分享任务） */
    incShare() {
      this.shares += 1
      this._persist()
    },

    /** 标记任务真实完成（幂等，返回是否首次完成） */
    markDone(key) {
      if (this.doneFlags[key]) return false
      this.doneFlags[key] = true
      this._persist()
      return true
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