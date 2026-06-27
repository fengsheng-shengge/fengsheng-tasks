// 微信授权登录 API
// POST /api/auth/wx-login

import { post } from './request'

/**
 * 微信静默登录
 * @returns {Promise<{token, openid, userId}>}
 */
export async function wxLogin() {
  return new Promise((resolve, reject) => {
    // 1. 获取微信登录凭证
    uni.login({
      provider: 'weixin',
      onlyAuthorize: true,
      success: async (loginRes) => {
        const { code } = loginRes
        if (!code) {
          return reject(new Error('微信登录凭证获取失败'))
        }

        try {
          // 2. 换取 token
          const res = await post('/api/auth/wx-login', { code })

          // 3. 存储
          uni.setStorageSync('fs_token', res.token)
          uni.setStorageSync('fs_openid', res.openid)
          uni.setStorageSync('fs_user_id', res.userId)

          resolve(res)
        } catch (err) {
          reject(err)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '微信登录失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

/**
 * 检查登录状态
 */
export function checkLogin() {
  const token = uni.getStorageSync('fs_token')
  return !!token
}

/**
 * 登出
 */
export function logout() {
  uni.removeStorageSync('fs_token')
  uni.removeStorageSync('fs_openid')
  uni.removeStorageSync('fs_user_id')
  uni.removeStorageSync('fs_user')
}

/**
 * 获取当前用户ID
 */
export function getUserId() {
  return uni.getStorageSync('fs_user_id')
}
