// 业务词典 —— 域配置 + 词条数据源（真实口径）
// 数据源：fengsheng.tech /api/entries（按域）、/api/search（全库加权检索）
// 域与条数来自后端 manifest（data/domains/_manifest.json），已全量核对 2026-08-31，非估算。
export const API_BASE = 'https://fengsheng.tech'

// 13 域（key = 后端 domain 字段值，count = manifest.counts）
// 英文域 key（CAR/OWN/SNG/trade）为历史遗留的细分域，name 依据其 subScene 内容命名，不合并、不丢数据。
export const DICT_DOMAINS = [
  { key: '签约前', icon: '🔍', name: '签约前', count: 829 },
  { key: '签约中', icon: '📝', name: '签约中', count: 389 },
  { key: 'SNG', icon: '💰', name: '贷款税费保险', count: 274 },
  { key: '签约后', icon: '🔐', name: '签约后', count: 688 },
  { key: '居住中', icon: '🏠', name: '居住中', count: 463 },
  { key: '退租出售', icon: '🔁', name: '退租出售', count: 250 },
  { key: '资产持有与运营', icon: '📈', name: '资产运营', count: 631 },
  { key: '业主', icon: '👤', name: '业主服务', count: 340 },
  { key: 'OWN', icon: '🗂️', name: '业主出租出售', count: 174 },
  { key: '职业成长', icon: '🎓', name: '职业成长', count: 431 },
  { key: 'CAR', icon: '📚', name: '经纪人考试成长', count: 243 },
  { key: 'trade', icon: '🤝', name: '谈判带看解码', count: 265 },
  { key: '跨域通用', icon: '🌐', name: '跨域通用', count: 90 }
]

export const DICT_TOTAL = DICT_DOMAINS.reduce((s, d) => s + d.count, 0) // 5067

// 真实法源判定（与策展引擎 R2 边界一致）：非空且非「待补充/待核/无/—」且长度≥4
export function isRealLegal(ref) {
  if (!ref) return false
  const s = String(ref).trim()
  return !/待补充|待核|无|—|^-$|^\s*$/.test(s) && s.length >= 4
}

// 通用请求封装（超时 12s，失败回调 reject，由调用方决定兜底）
export function requestDict(url) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 12000,
      success: (res) => resolve(res.data || {}),
      fail: (err) => reject(err)
    })
  })
}

// 按域分页拉词条（后端 limit 上限 200）
export function fetchDomainEntries(domain, offset = 0, limit = 200) {
  const url = `${API_BASE}/api/entries?domain=${encodeURIComponent(domain)}&limit=${limit}&offset=${offset}`
  return requestDict(url)
}

// 全库加权搜索（返回完整词条数组，最多 100 条）
export function searchEntries(q) {
  const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}`
  return requestDict(url)
}
