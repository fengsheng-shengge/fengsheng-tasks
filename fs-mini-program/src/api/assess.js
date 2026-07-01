// 品质测评 API
// POST /api/assess
import { post } from './request'

/**
 * 提交测评答案
 * @param {object[]} answers - 各维度答题结果
 * @returns {Promise<{scores, report, level}>}
 */
export async function submitAssess(answers) {
  return post('/api/assess', { answers })
}
