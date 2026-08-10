// 微信授权登录 API
// POST /api/auth/wx-login

import { post } from './request'

// 工具：包 try/catch，单点 storage 失败不影响调用
function ssGet(k, defVal) { try { const v = uni.getStorageSync(k); return v ? v : defVal } catch (e) { return defVal } }
function ssSet(k, v) { try { uni.setStorageSync(k, v) } catch (e) {} }
function ssDel(k) { try { uni.removeStorageSync(k) } catch (e) {} }

/**
 * 微信静默登录
 * @returns {Promise<{token, openid, userId}>}
 */
export async function wxLogin() {
  return new Promise((resolve, reject) => {
    // 1. 获取微信登录凭证
    uni.login({
      provider: 'weixin',
      success: async (loginRes) => {
        const { code } = loginRes
        if (!code) {
          return reject(new Error('微信登录凭证获取失败'))
        }

        try {
          // 2. 换取 token
          const res = await post('/api/auth/wx-login', { code })

          // 3. 存储(单点容错)
          ssSet('fs_token', res.token)
          ssSet('fs_openid', res.openid)
          ssSet('fs_user_id', res.userId)

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
  return !!ssGet('fs_token')
}

/**
 * 登出
 */
export function logout() {
  ssDel('fs_token')
  ssDel('fs_openid')
  ssDel('fs_user_id')
  ssDel('fs_user')
}

/**
 * 获取当前用户ID
 */
export function getUserId() {
  return ssGet('fs_user_id')
}
