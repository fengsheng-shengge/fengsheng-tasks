// Pinia 用户状态管理
import { defineStore } from 'pinia'
import { wxLogin, checkLogin, logout, getUserId } from '../api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: null,
    openid: null,
    userId: null,
    nickname: null,
    avatar: null,
    subscription: null, // { type: 'monthly'|'yearly', status, expireAt }
    isLoggedIn: false,
  }),

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
    },

    initFromStorage() {
      this.token = uni.getStorageSync('fs_token') || null
      this.openid = uni.getStorageSync('fs_openid') || null
      this.userId = uni.getStorageSync('fs_user_id') || null
      this.isLoggedIn = !!this.token
    },

    getUserId() {
      return this.userId || getUserId()
    },
  },
})
