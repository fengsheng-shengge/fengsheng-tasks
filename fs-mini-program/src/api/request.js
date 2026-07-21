const BASE_URL = 'https://fengsheng.tech'

// 全局 loading 计数器
let loadingCount = 0

function showLoading() {
  loadingCount++
  if (loadingCount === 1) {
    uni.showLoading({
      title: '加载中...',
      mask: true
    })
  }
}

function hideLoading() {
  if (loadingCount > 0) {
    loadingCount--
  }
  if (loadingCount === 0) {
    uni.hideLoading()
  }
}

/**
 * 统一请求封装
 * @param {Object} options - 请求选项
 * @param {string} options.url - 请求路径（相对路径）
 * @param {string} options.method - 请求方法
 * @param {Object} options.data - 请求参数
 * @param {Object} options.header - 自定义请求头
 * @param {boolean} options.showLoading - 是否显示 loading，默认 true
 * @param {number} options.timeout - 超时时间，默认 15000ms
 * @returns {Promise}
 */
function request(options = {}) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    showLoading: needLoading = true,
    timeout = 15000
  } = options

  if (needLoading) {
    showLoading()
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      success: (res) => {
        const { statusCode, data: responseData } = res

        // HTTP 状态码判断
        if (statusCode >= 200 && statusCode < 300) {
          // 业务状态码判断
          if (responseData && responseData.code !== undefined) {
            if (responseData.code === 0 || responseData.code === 200) {
              resolve(responseData.data || responseData)
            } else {
              const errorMsg = responseData.message || responseData.msg || '请求失败'
              uni.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 2000
              })
              reject(new Error(errorMsg))
            }
          } else {
            resolve(responseData)
          }
        } else if (statusCode === 401) {
          // 未授权，跳转登录
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('未授权'))
        } else if (statusCode === 403) {
          uni.showToast({
            title: '没有访问权限',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('没有访问权限'))
        } else if (statusCode === 404) {
          uni.showToast({
            title: '请求的资源不存在',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('资源不存在'))
        } else if (statusCode >= 500) {
          uni.showToast({
            title: '服务器异常，请稍后再试',
            icon: 'none',
            duration: 2000
          })
          reject(new Error(`服务器错误: ${statusCode}`))
        } else {
          reject(new Error(`请求失败: ${statusCode}`))
        }
      },
      fail: (err) => {
        // 网络错误
        uni.showToast({
          title: '网络连接失败，请检查网络',
          icon: 'none',
          duration: 2000
        })
        reject(err)
      },
      complete: () => {
        if (needLoading) {
          hideLoading()
        }
      }
    })
  })
}

/**
 * GET 请求
 */
function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

/**
 * POST 请求
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT 请求
 */
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE 请求
 */
function del(url, data = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

export default {
  BASE_URL,
  request,
  get,
  post,
  put,
  del
}