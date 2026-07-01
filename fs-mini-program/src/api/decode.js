// 客户解码器 API
// POST /api/decode/v2
import { post } from './request'

/**
 * 解码客户需求
 * @param {string} input - 用户输入的客户描述
 * @returns {Promise<{category, profile, insights, suggestions}>}
 */
export async function decodeCustomer(input) {
  return post('/api/decode/v2', { input, type: 'text' })
}
