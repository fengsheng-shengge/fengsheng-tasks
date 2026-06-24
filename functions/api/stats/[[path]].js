// ============================================================
// Cloudflare Pages Function: /api/stats  v1.1
// 对应作战方案 v1.1 · 110人验证线
// 小扣子（技术侧）
//
// v1.1 优化：N+1 查询 → GROUP BY 单趟聚合；空 uid 不计入独立用户
//
// GET /api/stats/summary   — 全局总览
// GET /api/stats/daily?days=7&product=breeder — 每日曲线
// GET /api/stats/goals     — 300人验证线进度
// GET /api/stats/public    — 极简公开只读
// GET /api/stats/health    — 健康检查
// ============================================================

const GOALS = {
  total: 300,  // 6.24生哥确认：300人验证线，9.1前达标
  products: {
    'reply': 100,          // 客户解码器：流量发动机
    'knowledge': 40,       // 业务字典
    'breeder': 40,         // Agent培养师
    'care-test': 40,       // 能力测评
    'assessment': 40,      // 六维品质测评
    'quality-test': 40,    // 品质测试
    's1-report': 10,       // 带看报告
    'shuowenjiedao': 10,   // 说文解道
    'dashboard': 5,        // 管理看板
    'index': 5             // 首页
  }
};

const RATE_LIMIT = new Map();
function checkRate(ipHash) {
  const now = Date.now();
  const arr = RATE_LIMIT.get(ipHash) || [];
  const fresh = arr.filter(t => now - t < 60_000);
  // v2.0: 收紧限流 60→30，防止CC攻击
  if (fresh.length >= 30) return false;
  fresh.push(now);
  RATE_LIMIT.set(ipHash, fresh);
  if (RATE_LIMIT.size > 500) RATE_LIMIT.clear();
  return true;
}

function hashIp(ip) {
  if (!ip) return 'anon';
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) - h + ip.charCodeAt(i)) | 0;
  return 'ip_' + Math.abs(h).toString(36);
}

function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || '';
}

function errJson(code, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}

function okJson(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}

function dateRange(days) {
  const now = Date.now();
  const oneDay = 86400_000;
  const dates = [];
  const startTs = now - (days - 1) * oneDay;
  for (let i = 0; i < days; i++) {
    const d = new Date(startTs + i * oneDay);
    dates.push(d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'));
  }
  return dates;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Cache-Control': 'no-store' }
    });
  }
  if (request.method !== 'GET') return errJson(405, 'method not allowed');
  if (!checkRate(hashIp(getClientIp(request)))) return errJson(429, 'rate limited');

  const path = url.pathname.replace(/^\/api\/stats\/?/, '').toLowerCase();
  try {
    if (path === '' || path === 'summary') return await getSummary(env);
    if (path === 'daily') return await getDaily(env, url);
    if (path === 'goals') return await getGoals(env);
    if (path === 'public') return await getPublic(env);
    if (path === 'health') return await getHealth(env);
    return errJson(404, 'unknown endpoint: ' + path);
  } catch (e) { return errJson(500, 'db error: ' + (e.message || String(e))); }
}

async function getSummary(env) {
  const pvByProduct = {}, usersByProduct = {};
  let totalPV = 0, totalUsers = 0;
  try {
    const { results } = await env.DB.prepare(
      `SELECT product, COUNT(*) as pv, COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as uniq_users
       FROM events WHERE event_type = 'pageview' GROUP BY product`
    ).all();
    for (const row of results) {
      pvByProduct[row.product || 'other'] = row.pv || 0;
      usersByProduct[row.product || 'other'] = row.uniq_users || 0;
      if ((row.product || 'other') !== 'other') totalPV += row.pv || 0;
    }
  } catch (_) {}
  try {
    const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events WHERE product != 'other'`).first();
    totalUsers = r.n || 0;
  } catch (_) { totalUsers = 0; }
  let totalFB = 0;
  const fbByProduct = {};
  try {
    const { results } = await env.DB.prepare(`SELECT product, COUNT(*) as n FROM feedback GROUP BY product`).all();
    for (const row of results) {
      const p = row.product || 'other'; fbByProduct[p] = row.n || 0; totalFB += row.n || 0;
    }
  } catch (_) {}
  const perProduct = [];
  for (const p of Object.keys(GOALS.products)) {
    perProduct.push({ product: p, pageviews: pvByProduct[p] || 0, users: usersByProduct[p] || 0, feedback: fbByProduct[p] || 0 });
  }
  const feedbackRate = totalUsers > 0 ? Math.round((totalFB / totalUsers) * 1000) / 10 : 0;
  return okJson({ total_users: totalUsers, total_pageviews: totalPV, total_feedback: totalFB, feedback_rate_pct: feedbackRate, per_product: perProduct, generated_at: Date.now() });
}

async function getDaily(env, url) {
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '7'), 1), 30);
  const product = (url.searchParams.get('product') || '').toString().slice(0, 50);
  const dates = dateRange(days);
  const now = Date.now();
  const startTs = now - (days - 1) * 86400_000;
  const dailyMap = {};
  for (const d of dates) dailyMap[d] = { pageviews: 0, unique_uids: new Set(), clicks: 0, feedbacks: 0 };
  try {
    const q = product
      ? `SELECT created_at, uid FROM events WHERE event_type = 'pageview' AND product = ? AND created_at >= ?`
      : `SELECT created_at, uid FROM events WHERE event_type = 'pageview' AND created_at >= ?`;
    const params = product ? [product, startTs] : [startTs];
    const { results } = await env.DB.prepare(q).bind(...params).all();
    for (const row of results) {
      const d = new Date(row.created_at);
      const dateKey = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dateKey]) { dailyMap[dateKey].pageviews++; if (row.uid) dailyMap[dateKey].unique_uids.add(row.uid); }
    }
  } catch (_) {}
  try {
    const q = product ? `SELECT created_at FROM events WHERE event_type = 'click' AND product = ? AND created_at >= ?` : `SELECT created_at FROM events WHERE event_type = 'click' AND created_at >= ?`;
    const params = product ? [product, startTs] : [startTs];
    const { results } = await env.DB.prepare(q).bind(...params).all();
    for (const row of results) {
      const d = new Date(row.created_at);
      const dateKey = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dateKey]) dailyMap[dateKey].clicks++;
    }
  } catch (_) {}
  try {
    const q = product ? `SELECT created_at FROM feedback WHERE product = ? AND created_at >= ?` : `SELECT created_at FROM feedback WHERE created_at >= ?`;
    const params = product ? [product, startTs] : [startTs];
    const { results } = await env.DB.prepare(q).bind(...params).all();
    for (const row of results) {
      const d = new Date(row.created_at);
      const dateKey = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dateKey]) dailyMap[dateKey].feedbacks++;
    }
  } catch (_) {}
  const daily = dates.map(d => ({ date: d, pageviews: dailyMap[d].pageviews, unique_uids: dailyMap[d].unique_uids.size, clicks: dailyMap[d].clicks, feedbacks: dailyMap[d].feedbacks }));
  return okJson({ days, product: product || 'all', daily, generated_at: Date.now() });
}

async function getGoals(env) {
  let totalUsers = 0;
  try {
    const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events WHERE product != 'other'`).first();
    totalUsers = r.n || 0;
  } catch (_) {}
  const usersByProduct = {};
  try {
    const { results } = await env.DB.prepare(`SELECT product, COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events GROUP BY product`).all();
    for (const row of results) usersByProduct[row.product || 'other'] = row.n || 0;
  } catch (_) {}
  const perProduct = [];
  for (const [product, target] of Object.entries(GOALS.products)) {
    const users = usersByProduct[product] || 0;
    const progress = target > 0 ? Math.round((users / target) * 1000) / 10 : 0;
    perProduct.push({ product, users, target, progress_pct: progress });
  }
  const totalProgress = Math.round((totalUsers / GOALS.total) * 1000) / 10;
  return okJson({ total_users: totalUsers, total_target: GOALS.total, total_progress_pct: totalProgress, per_product: perProduct, generated_at: Date.now() });
}

async function getPublic(env) {
  let totalUsers = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events WHERE product != 'other'`).first(); totalUsers = r.n || 0; } catch (_) {}
  let totalFB = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM feedback`).first(); totalFB = r.n || 0; } catch (_) {}
  return okJson({ users_validated: totalUsers, total_feedback: totalFB, target: GOALS.total, progress_pct: Math.round((totalUsers / GOALS.total) * 1000) / 10 });
}

async function getHealth(env) {
  let ok = true, events_count = 0, feedback_count = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM events LIMIT 1`).first(); events_count = r.n || 0; } catch (_) { ok = false; }
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM feedback LIMIT 1`).first(); feedback_count = r.n || 0; } catch (_) { ok = false; }
  return okJson({ status: ok ? 'ok' : 'degraded', events_count, feedback_count, db_connected: ok, generated_at: Date.now() });
}