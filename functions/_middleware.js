// ============================================================
// Cloudflare Pages Function: 全局请求中间件
// 小扣子 · 2026.06.24
//
// 功能：
// - 屏蔽 Bytespider 等恶意爬虫
// - 记录被拦截的请求（用于监控）
// ============================================================

const BLOCKED_BOTS = [
  'Bytespider',
  'bytespider',
  'ByteDance',
  'bytedance'
];

export async function onRequest(context) {
  const request = context.request;
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  
  // 检查是否在屏蔽列表
  const isBlockedBot = BLOCKED_BOTS.some(bot => userAgent.includes(bot));
  
  if (isBlockedBot) {
    // 记录拦截日志（异步，不阻塞响应）
    context.waitUntil(
      logBlockedRequest(context, userAgent, url.pathname)
    );
    
    // 返回 403 Forbidden
    return new Response('Forbidden', {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }
  
  // 正常请求继续处理
  return context.next();
}

// 异步记录被拦截的请求
async function logBlockedRequest(context, userAgent, path) {
  try {
    // 如果有D1数据库，可以写入日志表
    // 目前仅输出到控制台（Cloudflare Logs可见）
    console.log(`[BOT_BLOCKED] UA="${userAgent}" Path="${path}" Time="${new Date().toISOString()}"`);
  } catch (e) {
    // 日志失败不影响主流程
  }
}
