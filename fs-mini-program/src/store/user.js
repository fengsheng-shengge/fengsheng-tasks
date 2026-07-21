// Pinia 用户状态管理
import { defineStore } from 'pinia'
import { wxLogin, checkLogin, logout, getUserId } from '../api/auth'

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
    unlockedContent: {}, // { 'entry_001': ['fullCase', 'agentMemo'], ... }
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
  },

  actions: {
    async login() {
      try {
        const res = await wxLogin()
        this.token = res.token
        this.openid = res.openid
        this.userId = res.userId
        this.isLoggedIn = true
        return res
      } catch (err) {
        throw err
      }
    },

    logout() {
      logout()
      this.token = null
      this.openid = null
      this.userId = null
      this.nickname = null
      this.avatar = null
      this.subscription = null
      this.isLoggedIn = false
      this.points = 0
      this.unlockedContent = {}
    },

    initFromStorage() {
      this.token = uni.getStorageSync('fs_token') || null
      this.openid = uni.getStorageSync('fs_openid') || null
      this.userId = uni.getStorageSync('fs_user_id') || null
      this.isLoggedIn = !!this.token
      this.points = uni.getStorageSync('fs_points') || 0
      try {
        const unlocked = uni.getStorageSync('fs_unlocked_content')
        this.unlockedContent = unlocked ? JSON.parse(unlocked) : {}
      } catch {
        this.unlockedContent = {}
      }
    },

    getUserId() {
      return this.userId || getUserId()
    },

    /** 赚取积分 */
    earnPoints(amount) {
      this.points = Math.max(0, (this.points || 0) + amount)
      uni.setStorageSync('fs_points', this.points)
      return this.points
    },

    /** 消费积分解锁内容 */
    unlockContent(entryId, contentType, cost) {
      // 检查是否已解锁
      if (!this.unlockedContent[entryId]) {
        this.unlockedContent[entryId] = []
      }
      if (this.unlockedContent[entryId].includes(contentType)) {
        return { success: true, alreadyUnlocked: true }
      }
      // 检查积分是否足够
      if ((this.points || 0) < cost) {
        return { success: false, message: `积分不足，需要 ${cost} 积分` }
      }
      // 扣除积分并解锁
      this.points -= cost
      this.unlockedContent[entryId].push(contentType)
      // 持久化
      uni.setStorageSync('fs_points', this.points)
      uni.setStorageSync('fs_unlocked_content', JSON.stringify(this.unlockedContent))
      return { success: true, remainingPoints: this.points }
    },

    /** 检查指定内容是否已解锁 */
    checkUnlocked(entryId, contentType) {
      const unlocked = this.unlockedContent[entryId]
      return unlocked && unlocked.includes(contentType)
    },
  },
})