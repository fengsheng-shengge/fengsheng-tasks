// ============================================================
// stats 共享核心 · 供 health/summary/daily/goals/public 引用
// ============================================================

export const GOALS = {
  total: 110,
  products: {
    'breeder': 40, 'knowledge': 25, 'shuowenjiedao': 15,
    'care-test': 10, 'assessment': 10, 'reply': 10
  }
};

export function errJson(code, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}

export function okJson(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}

export function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || '';
}

export function hashIp(ip) {
  if (!ip) return 'anon';
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) - h + ip.charCodeAt(i)) | 0;
  return 'ip_' + Math.abs(h).toString(36);
}

export async function getSummary(env) {
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
      totalPV += row.pv || 0;
    }
  } catch (_) {}
  try {
    const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events`).first();
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
  for (const p of Object.keys(GOALS.products).concat(['other'])) {
    perProduct.push({ product: p, pageviews: pvByProduct[p] || 0, users: usersByProduct[p] || 0, feedback: fbByProduct[p] || 0 });
  }
  const feedbackRate = totalUsers > 0 ? Math.round((totalFB / totalUsers) * 1000) / 10 : 0;
  return okJson({ total_users: totalUsers, total_pageviews: totalPV, total_feedback: totalFB, feedback_rate_pct: feedbackRate, per_product: perProduct, generated_at: Date.now() });
}

export async function getDaily(env, url) {
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '7'), 1), 30);
  const product = (url.searchParams.get('product') || '').toString().slice(0, 50);
  const now = Date.now();
  const oneDay = 86400_000;
  const startTs = now - (days - 1) * oneDay;
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startTs + i * oneDay);
    dates.push(d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'));
  }
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
      const dk = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dk]) { dailyMap[dk].pageviews++; if (row.uid) dailyMap[dk].unique_uids.add(row.uid); }
    }
  } catch (_) {}
  try {
    const q = product ? `SELECT created_at FROM events WHERE event_type = 'click' AND product = ? AND created_at >= ?` : `SELECT created_at FROM events WHERE event_type = 'click' AND created_at >= ?`;
    const params = product ? [product, startTs] : [startTs];
    const { results } = await env.DB.prepare(q).bind(...params).all();
    for (const row of results) {
      const d = new Date(row.created_at);
      const dk = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dk]) dailyMap[dk].clicks++;
    }
  } catch (_) {}
  try {
    const q = product ? `SELECT created_at FROM feedback WHERE product = ? AND created_at >= ?` : `SELECT created_at FROM feedback WHERE created_at >= ?`;
    const params = product ? [product, startTs] : [startTs];
    const { results } = await env.DB.prepare(q).bind(...params).all();
    for (const row of results) {
      const d = new Date(row.created_at);
      const dk = d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      if (dailyMap[dk]) dailyMap[dk].feedbacks++;
    }
  } catch (_) {}
  const daily = dates.map(d => ({ date: d, pageviews: dailyMap[d].pageviews, unique_uids: dailyMap[d].unique_uids.size, clicks: dailyMap[d].clicks, feedbacks: dailyMap[d].feedbacks }));
  return okJson({ days, product: product || 'all', daily, generated_at: Date.now() });
}

export async function getGoals(env) {
  let totalUsers = 0;
  try {
    const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events`).first();
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

export async function getPublic(env) {
  let totalUsers = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN uid != '' THEN uid END) as n FROM events`).first(); totalUsers = r.n || 0; } catch (_) {}
  let totalFB = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM feedback`).first(); totalFB = r.n || 0; } catch (_) {}
  return okJson({ users_validated: totalUsers, total_feedback: totalFB, target: GOALS.total, progress_pct: Math.round((totalUsers / GOALS.total) * 1000) / 10 });
}

export async function getHealth(env) {
  let ok = true, events_count = 0, feedback_count = 0;
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM events LIMIT 1`).first(); events_count = r.n || 0; } catch (_) { ok = false; }
  try { const r = await env.DB.prepare(`SELECT COUNT(*) as n FROM feedback LIMIT 1`).first(); feedback_count = r.n || 0; } catch (_) { ok = false; }
  return okJson({ status: ok ? 'ok' : 'degraded', events_count, feedback_count, db_connected: ok, generated_at: Date.now() });
}