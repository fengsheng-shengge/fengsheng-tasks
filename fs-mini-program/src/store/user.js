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
    isLoggedIn: false,
    points: 0,
    pointsHistory: [], // [{type:'earn', amount, reason, timestamp}]
    favorites: [], // [entryId, ...]
    contributions: [], // [{type, entryId, status, timestamp}]
    // ===== V2.1.1a 新增：客户档案 / 策展库 / 测评 / 任务完成态 =====
    clients: [], // [{id, surname, name, rel, stage, pkey, persona, status, asset, level, addr, note, seed, followups[], timeline[], memoryPoints[]}]
    seeded: false, // 首次启动是否已写入示例客户（避免用户删光后又被重新塞回示例）
    focusClientId: null, // V2.7：首页「今日跟进」直达客户详情（tabBar 页无法 URL 带参，改走 store）
    curatings: [], // [{id, clientId, t, s, ts}]
    assessments: [], // [{id, ts}]
    doneFlags: {}, // { taskId: true } 任务真实完成态（防自嗨闭环）
    shares: 0, // 分享次数（案例分享任务）
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
      uni.setStorageSync('fs_favorites', JSON.stringify(this.favorites))
      uni.setStorageSync('fs_contributions', JSON.stringify(this.contributions))
      uni.setStorageSync('fs_quiz_stats', JSON.stringify(this.quizStats))
      // V2.1.1a
      uni.setStorageSync('fs_clients', JSON.stringify(this.clients))
      uni.setStorageSync('fs_curatings', JSON.stringify(this.curatings))
      uni.setStorageSync('fs_assessments', JSON.stringify(this.assessments))
      uni.setStorageSync('fs_done_flags', JSON.stringify(this.doneFlags))
      uni.setStorageSync('fs_shares', this.shares)
      uni.setStorageSync('fs_seeded', this.seeded)
    },

    async login() {
      try {
        const res = await wxLogin()
        this.token = res.token
        this.openid = res.openid
        this.userId = res.userId
        this.isLoggedIn = true
        // 新用户体验礼包（新户 +200 信任积分，靠真实注册动作发放）
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
        this.pointsHistory = JSON.parse(uni.getStorageSync('fs_points_history') || '[]')
      } catch { this.pointsHistory = [] }
      try {
        this.favorites = JSON.parse(uni.getStorageSync('fs_favorites') || '[]')
      } catch { this.favorites = [] }
      try {
        this.contributions = JSON.parse(uni.getStorageSync('fs_contributions') || '[]')
      } catch { this.contributions = [] }
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
      this.seeded = uni.getStorageSync('fs_seeded') || false
      // 首次启动（无缓存、且此前未 seed 过）写入 4 个示例客户，让经纪人看到"可录入"的样子
      if (!this.seeded && this.clients.length === 0) this.seedClients()
    },

    /** 首次启动写入 4 个示例客户（标记 seed，可删可改） */
    seedClients() {
      const seed = [
        { surname: '林', name: '林先生 & 未婚妻', rel: '买房客户', stage: '购房线 / ①首套', pkey: 'red', persona: '🔴 结果导向', status: '跟进中', asset: '关系建立中，资产初值', level: 'A', addr: '', note: '90后婚房，预算300万，看重学区与通勤', seed: true },
        { surname: '张', name: '张先生（业主）', rel: '业主', stage: '购房线 / ④升级', pkey: 'blue', persona: '🔵 关系导向', status: '已成交', asset: '已购本房，适老改造跟进已规划', level: 'A', addr: '', note: '已购，适老改造咨询', seed: true },
        { surname: '王', name: '王女士（房东）', rel: '房东', stage: '租住线 / 业主侧', pkey: 'blue', persona: '🔵 关系导向', status: '跟进中', asset: '委托出租，定价跟进待办', level: 'B', addr: '', note: '空置45天委托出租', seed: true },
        { surname: '陈', name: '陈同学（租客）', rel: '租客', stage: '租住线 / ②改善', pkey: 'green', persona: '🟢 理智型', status: '跟进中', asset: '工作调动，租住改善中', level: 'C', addr: '', note: '工作调动近地铁', seed: true }
      ]
      this.clients = seed.map(c => ({ id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), ...c, followups: c.followups || [], timeline: c.timeline || [], memoryPoints: c.memoryPoints || [], cognition: c.cognition || { log: [] } }))
      this.seeded = true
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
      const client = { id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), seed: false, followups: [], timeline: [], memoryPoints: [], cognition: { log: [] }, ...c }
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

    /** V2.5 M1：把生成的见后跟进写入客户档案 followups[] */
    addFollowups(clientId, list) {
      const c = this.clients.find(x => x.id === clientId)
      if (!c || !Array.isArray(list) || list.length === 0) return
      if (!Array.isArray(c.followups)) c.followups = []
      const now = Date.now()
      list.forEach(f => c.followups.push({
        type: '见后跟进',
        theme: f.theme,
        text: f.text,
        ltrust: f.ltrust,
        dueAt: null,
        done: false,
        createdAt: now
      }))
      // 同时写一条"跟进"时间线，让双纵轴视图能看到接触主线
      this.addTimelineEvent(clientId, { type: '跟进', summary: '生成 ' + list.length + ' 条见后跟进：' + list.map(f => f.theme).join('、') })
      this._persist()
    },

    /** V2.5 M2：写入接触时间线（策展/见面/跟进） */
    addTimelineEvent(clientId, ev) {
      const c = this.clients.find(x => x.id === clientId)
      if (!c) return
      if (!Array.isArray(c.timeline)) c.timeline = []
      c.timeline.unshift({ at: Date.now(), type: ev.type, summary: ev.summary })
      this._persist()
    },

    /** V2.5 M2：写入记忆点（客户记住你的瞬间） */
    addMemoryPoint(clientId, point) {
      const c = this.clients.find(x => x.id === clientId)
      if (!c || !point) return
      if (!Array.isArray(c.memoryPoints)) c.memoryPoints = []
      c.memoryPoints.unshift({ at: Date.now(), point })
      this._persist()
    },

    /** 新增一次策展记录（关联客户） */
    addCurating(rec) {
      const item = { id: 'cur_' + Date.now(), ts: Date.now(), ...rec }
      this.curatings.unshift(item)
      this._persist()
      return item
    },

    /** V3.0 认知复利：把一次见面参谋沉淀进客户认知卡（初始空、靠真实互动涨） */
    saveCognition(clientId, rec) {
      const c = this.clients.find(x => x.id === clientId)
      if (!c) return
      if (!c.cognition || !Array.isArray(c.cognition.log)) c.cognition = { log: [] }
      const log = {
        at: Date.now(),
        axisLabel: rec.axisLabel || '',
        dims: rec.dims || [],
        sayTitles: rec.sayTitles || [],
        followThemes: rec.followThemes || [],
        freeText: rec.freeText || ''
      }
      c.cognition.log.unshift(log)
      // 聚合：已知偏好 = 七维关注 + 说要点；决策信号 = 见后跟进主题
      const known = new Set()
      ;(log.dims || []).forEach(d => known.add('关注·' + d))
      ;(log.sayTitles || []).forEach(s => known.add(s))
      const signals = new Set()
      ;(log.followThemes || []).forEach(f => signals.add(f))
      c.cognition.known = Array.from(new Set([...(c.cognition.known || []), ...known])).slice(0, 12)
      c.cognition.signals = Array.from(new Set([...(c.cognition.signals || []), ...signals])).slice(0, 12)
      c.cognition.lastAxis = log.axisLabel
      this._persist()
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