// 业务词典 —— 域配置 + 词条数据源（真实口径）
// 数据源：fengsheng.tech /api/entries（按域）、/api/search（全库加权检索）
//
// 【口径纪律 · 2026-10-22 阶段二批1 后确立】
// 本文件不再写死任何"总条数/总域数"中间数字，理由：
//   ① 权威主库持续增补（5843 → 6036 → 6114 …），写死必然再次失真，
//      历史上已出现过「文案 5843 / 显示 5067」的口径矛盾；
//   ② 后端部署副本与主库存在同步差，运行时真值与主库口径本就不同步；
//   ③ 后端 13 个导航 key 是 manifest 定义的聚合视图（domain 精确匹配、
//      聚合在服务端完成），部署新版库后各 key 的 total 会变
//      （例：签约前 1222→858、签约中 394→668、业主 418→344）。
// 因此：域计数与总数一律【运行时向 API 实拉】，后端更新后小程序自动跟随，
//       无需再改前端、不会再出现文案与实际可达条数打架。
// 权威主库口径（如需对外文案）由内容侧维护并群内同步，前端不落死数字。
//
// H5 开发模式走 vite 代理（避免 CORS 拦截，本地预览也能看真实数据）；生产构建/小程序用完整域名
// import.meta.env.DEV 仅 dev server 为 true；build 产物中恒为 false → 生产一律用完整域名，不受影响
export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ? '' : 'https://fengsheng.tech'

// 13 个导航域（key = 后端 domain 字段值）。
// count 为 null = 不写死，运行时向 /api/entries?domain=<key>&limit=1 实拉 total。
// 英文域 key（CAR/OWN/SNG/trade）为历史遗留的细分域，name 依据其 subScene 内容命名，不合并、不丢数据。
export const DICT_DOMAINS = [
  { key: '签约前', icon: '🔍', name: '签约前', count: null },
  { key: '签约中', icon: '📝', name: '签约中', count: null },
  { key: 'SNG', icon: '💰', name: '贷款税费保险', count: null },
  { key: '签约后', icon: '🔐', name: '签约后', count: null },
  { key: '居住中', icon: '🏠', name: '居住中', count: null },
  { key: '退租出售', icon: '🔁', name: '退租出售', count: null },
  { key: '资产持有与运营', icon: '📈', name: '资产运营', count: null },
  { key: '业主', icon: '👤', name: '业主服务', count: null },
  { key: 'OWN', icon: '🗂️', name: '业主出租出售', count: null },
  { key: '职业成长', icon: '🎓', name: '职业成长', count: null },
  { key: 'CAR', icon: '📚', name: '经纪人考试成长', count: null },
  { key: 'trade', icon: '🤝', name: '谈判带看解码', count: null },
  { key: '跨域通用', icon: '🌐', name: '跨域通用', count: null }
]

// 静态兜底总数：仅在后端完全不可达时用于避免 UI 空白，附「数据同步中」标识由页面处理。
export const DICT_FALLBACK_TOTAL = null

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

// ===== 运行时口径自愈 =====
// 逐域实拉 total（limit=1 只取一条元数据，不浪费带宽），返回
// { domains: [{key,name,icon,count}], total, ok, partial }。
// 后端部署新版本主库后，这里自动取到新的域计数与总数，前端无需改代码。
export async function fetchDictCounts() {
  const results = await Promise.all(
    DICT_DOMAINS.map(async (d) => {
      try {
        const res = await fetchDomainEntries(d.key, 0, 1)
        const total = Number(res && res.total)
        return { ...d, count: Number.isFinite(total) && total > 0 ? total : 0 }
      } catch (e) {
        return { ...d, count: 0 }
      }
    })
  )
  const total = results.reduce((s, d) => s + (d.count || 0), 0)
  const ok = results.some((d) => d.count > 0)
  return { domains: results, total, ok, partial: results.some((d) => d.count === 0) }
}
