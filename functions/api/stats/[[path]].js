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
// GET /api/stats/ai-mentions — AI提及率追踪（#115数据基建）
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
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' }
    });
  }
  if (!['GET', 'POST'].includes(request.method)) return errJson(405, 'method not allowed');
  if (!checkRate(hashIp(getClientIp(request)))) return errJson(429, 'rate limited');

  const path = url.pathname.replace(/^\/api\/stats\/?/, '').toLowerCase();
  try {
    // POST: 手动录入AI提及记录（#115 MVP阶段用）
    if (request.method === 'POST' && path === 'ai-mentions') {
      return await recordAiMention(env, request);
    }
    if (request.method === 'POST') return errJson(405, 'POST not supported for this endpoint');
    if (path === '' || path === 'summary') return await getSummary(env);
    if (path === 'daily') return await getDaily(env, url);
    if (path === 'goals') return await getGoals(env);
    if (path === 'public') return await getPublic(env);
    if (path === 'health') return await getHealth(env);
    if (path === 'ai-mentions') return await getAiMentions(env);
    return errJson(404, 'unknown endpoint: ' + path);
  } catch (e) { return errJson(500, 'db error: ' + (e.message || String(e))); }
}

async function getSummary(env) {
  const pvByProduct = {}, usersByProduct = {}, clicksByProduct = {};
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
  // 查询交互次数（click/action/feature_use等事件类型）
  try {
    const { results } = await env.DB.prepare(
      `SELECT product, COUNT(*) as clicks
       FROM events
       WHERE event_type IN ('click','action','feature_use','ai_surfaced','ai_used','signup','reply_submit')
       GROUP BY product`
    ).all();
    for (const row of results) {
      clicksByProduct[row.product || 'other'] = row.clicks || 0;
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
    perProduct.push({ product: p, pageviews: pvByProduct[p] || 0, users: usersByProduct[p] || 0, feedback: fbByProduct[p] || 0, clicks: clicksByProduct[p] || 0 });
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

// ============================================================
// #115 AI提及率追踪
// 目标：追踪fengsheng.tech在AI搜索引擎中的提及情况
// 采集方式：MVP阶段手动定期查询，v2阶段接API自动化
// ============================================================

const AI_ENGINES = {
  metaso:    { name: '秘塔AI搜索', url: 'https://metaso.cn', keywords: ['风声科技', '风声tech', '居住服务'] },
  kimi:      { name: 'Kimi',       url: 'https://kimi.moonshot.cn', keywords: ['风声科技', 'fengsheng.tech'] },
  doubao:    { name: '豆包',       url: 'https://www.doubao.com', keywords: ['风声科技', '居住服务AI'] },
  baidu:     { name: '文心一言',   url: 'https://yiyan.baidu.com', keywords: ['风声科技', '居住服务'] },
  perplexity:{ name: 'Perplexity', url: 'https://www.perplexity.ai', keywords: ['fengsheng.tech', 'housing service'] },
};

async function getAiMentions(env) {
  // 1. 各引擎最新一次采集结果
  const byEngine = {};
  for (const engine of Object.keys(AI_ENGINES)) {
    byEngine[engine] = { latest: null, total_checks: 0, mention_count: 0, mention_rate: 0 };
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT engine, engine_name, mentioned, mention_snippet, search_date, search_url
       FROM ai_mentions
       WHERE search_date >= date('now', '-90 days')
       ORDER BY search_date DESC`
    ).all();
    for (const row of results) {
      const eng = byEngine[row.engine] || byEngine[Object.keys(AI_ENGINES)[0]]; // fallback
      eng.total_checks++;
      if (row.mentioned) {
        eng.mention_count++;
        if (!eng.latest || eng.latest.newer) {
          eng.latest = { mentioned: row.mentioned, snippet: row.mention_snippet, date: row.search_date, url: row.search_url };
        }
      } else if (!eng.latest) {
        eng.latest = { mentioned: 0, snippet: '', date: row.search_date, url: row.search_url };
      }
    }
    for (const eng of Object.keys(byEngine)) {
      if (byEngine[eng].total_checks > 0) {
        byEngine[eng].mention_rate = Math.round((byEngine[eng].mention_count / byEngine[eng].total_checks) * 1000) / 10;
      }
    }
  } catch (_) {}

  // 2. 全局统计
  let totalChecks = 0, totalMentions = 0;
  for (const eng of Object.keys(byEngine)) {
    totalChecks += byEngine[eng].total_checks;
    totalMentions += byEngine[eng].mention_count;
  }
  const overallRate = totalChecks > 0 ? Math.round((totalMentions / totalChecks) * 1000) / 10 : 0;

  // 3. 最近30天的趋势（按月统计）
  const trend = [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT strftime('%Y-%m', search_date) as month, COUNT(*) as checks, SUM(mentioned) as mentions
       FROM ai_mentions
       WHERE search_date >= date('now', '-90 days')
       GROUP BY month ORDER BY month ASC`
    ).all();
    for (const row of results) {
      trend.push({
        month: row.month,
        checks: row.checks || 0,
        mentions: row.mentions || 0,
        rate: row.checks > 0 ? Math.round((row.mentions / row.checks) * 1000) / 10 : 0
      });
    }
  } catch (_) {}

  return okJson({
    total_checks: totalChecks,
    total_mentions: totalMentions,
    overall_mention_rate_pct: overallRate,
    engines: byEngine,
    trend,
    engines_info: AI_ENGINES,
    generated_at: Date.now(),
    note: 'MVP阶段需手动在目标引擎搜索关键词并通过 POST /api/stats/ai-mentions 录入数据'
  });
}

// POST /api/stats/ai-mentions — 手动录入AI提及记录
// Body: { engine, query, mentioned, mention_snippet, mention_url, search_url }
async function recordAiMention(env, request) {
  let body;
  try { body = await request.json(); } catch (_) { return errJson(400, 'invalid JSON'); }
  const { engine, query, mentioned, mention_snippet = '', mention_url = '', search_url = '' } = body;
  if (!engine || !query || mentioned === undefined) {
    return errJson(400, 'missing required fields: engine, query, mentioned');
  }
  const engineNames = { metaso:'秘塔AI搜索', kimi:'Kimi', doubao:'豆包', baidu:'文心一言', perplexity:'Perplexity' };
  const engineName = engineNames[engine] || engine;
  const searchDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    await env.DB.prepare(
      `INSERT INTO ai_mentions (engine, engine_name, query, mentioned, mention_snippet, mention_url, search_url, search_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(engine, engineName, query, mentioned ? 1 : 0, mention_snippet, mention_url, search_url, searchDate, Date.now()).run();
    return okJson({ ok: true, engine, query, mentioned: !!mentioned, search_date: searchDate });
  } catch (e) { return errJson(500, 'db error: ' + e.message); }
}