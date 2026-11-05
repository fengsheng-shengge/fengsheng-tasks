/**
 * 后端地址候选链（failover）
 *
 * 【为什么需要这个文件】
 * 2026-11-05 实测：生产域名 fengsheng.tech 的 DNS 主机记录 0 条，域名解析不了。
 * 小程序真机调试时，所有后端请求都会走 uni.request 的 fail 回调（网络级失败），
 * 表现为「页面空白 / 加载失败」，而且**不报错、不告警**。
 * Cloudflare 现役 API Token 没有 Zone DNS Edit 权限（4 种 DNS 写法全部 403），
 * 在 DNS 记录被补上之前，这是唯一能立刻打通的办法。
 *
 * 【策略】
 *   1. 优先主域 https://fengsheng.tech —— 正式发布走这个（需已备案 + 已配合法域名）
 *   2. 主域发生**网络级失败**（DNS 解析不了 / 连接失败 / 超时）时，自动切兜底域重试
 *   3. HTTP 4xx / 5xx **不**触发切换 —— 那是服务端问题，换域结果一样，切换只会掩盖问题
 *   4. 切换成功后记住结果，本次运行后续请求直接走可用域，避免每次都双打
 *   5. 下次冷启动重新从主域开始 —— 主域修好后会自动回正，无需改代码
 *
 * 【兜底域说明】
 *   fengsheng-ee9.pages.dev 是 Cloudflare Pages 官方分配域，HTTPS 证书有效、
 *   内容与主域完全一致（D1/KV 绑定都在 Pages 侧）。
 *   但它**没有 ICP 备案**，因此：
 *     · 真机调试 / 体验版（勾选「不校验合法域名」）→ 可用
 *     · 正式发布版 → 仍必须用已备案的 fengsheng.tech
 *   这个限制是微信平台的硬规则，代码绕不过去，也不该绕。
 */

export const API_CANDIDATES = [
  'https://fengsheng.tech',          // 主域：正式发布用
  'https://fengsheng-ee9.pages.dev'  // 兜底：Cloudflare Pages 官方域（调试期）
]

let activeIndex = 0

/** 当前正在使用的后端地址 */
export function getActiveBase() {
  return API_CANDIDATES[activeIndex]
}

/** 当前候选下标 */
export function getActiveIndex() {
  return activeIndex
}

/** 记录一次成功使用的候选（只有成功才记录，失败不污染状态） */
export function markActive(index) {
  if (typeof index === 'number' && index >= 0 && index < API_CANDIDATES.length) {
    activeIndex = index
  }
}

/** 冷启动复位到主域 */
export function resetActive() {
  activeIndex = 0
}

/** 候选总数 */
export function candidateCount() {
  return API_CANDIDATES.length
}
