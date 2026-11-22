// 小程序 API 鉴权配置
// 说明：小程序运行在 WeChat service worker（servicewechat.com/<appid>），
// 不带 fengsheng.tech Origin → Worker Layer 8 同源判定失败。
// 用自定义 header + Bearer token 走小程序专用通道。
//
// 安全注意：
//   本文件的 MINI_PROGRAM_TOKEN 是独立 token，可独立吊销（不影响 web 侧 API_BEARER_TOKEN）。
//   若需轮换：Cloudflare 添加 API_MINI_PROGRAM_TOKEN secret → 改这里 → 发布。
//   token 未配置时回退到 API_BEARER_TOKEN（env 层回退，无需前端改码）。
//
// 2026-11-22 · 生哥修复 Layer 8 对小程序全 401 问题

export const MINI_PROGRAM_TOKEN = 'fs-mini-v1-placeholder' // 发布前替换为真实 token

export const MINI_PROGRAM_HEADERS = {
  'X-From': 'fengsheng-mini-program',
  'Authorization': 'Bearer ' + MINI_PROGRAM_TOKEN,
}
