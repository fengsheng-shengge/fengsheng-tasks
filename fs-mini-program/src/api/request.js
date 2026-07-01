// uni-app 请求封装
// 自动附加 Authorization Token
// 自动处理错误响应

const BASE_URL = 'https://fengsheng.tech'

/**
 * 请求封装
 * @param {string} url - 接口路径（不含 BASE_URL）
 * @param {object} options - uni.request 选项
 */
async function request(url, options = {}) {
  const token = uni.getStorageSync('fs_token') || null

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const finalOptions = {
    url: `${BASE_URL}${url}`,
    header: {
      ...defaultHeaders,
      ...(options.header || {}),
    },
    timeout: 15000,
    ...options,
  }

  return new Promise((resolve, reject) => {
    uni.request({
      ...finalOptions,
      success: (res) => {
        const { statusCode, data } = res

        if (statusCode === 401) {
          // Token 过期，清除并跳转登录
          uni.removeStorageSync('fs_token')
          uni.removeStorageSync('fs_user')
          uni.reLaunch({ url: '/pages/index/index' })
          return reject(new Error('登录已过期，请重新登录'))
        }

        if (statusCode >= 200 && statusCode < 300) {
          resolve(data)
        } else {
          const msg = (data && data.error) || `请求失败(${statusCode})`
          uni.showToast({ title: msg, icon: 'none', duration: 2000 })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none', duration: 2000 })
        reject(err)
      },
    })
  })
}

export const get = (url, params, options = {}) => {
  let queryString = ''
  if (params) {
    queryString = '?' + Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
  }
  return request(url + queryString, { ...options, method: 'GET' })
}

export const post = (url, data, options = {}) =>
  request(url, { ...options, method: 'POST', data })

export const put = (url, data, options = {}) =>
  request(url, { ...options, method: 'PUT', data })

export default { get, post, put }
