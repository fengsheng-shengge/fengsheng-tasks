// Cloudflare Pages Function: /api/event  v2.2 — 修复字段映射+product推导
// POST /api/event  — 提交埋点事件（公开，支持单条或批量数组）
// GET  /api/event?key=fs-admin-2026&product=xxx — 管理查询

const EVENT_WHITELIST = new Set([
  'pageview', 'click', 'reply_submit', 'coze_chat_open',
  'action', 'scroll_depth', 'signup', 'feedback',
  'ai_surfaced', 'ai_used', 'decode', 'assess',
  'feature_use', 'subscribe'
]);

const PRODUCT_WHITELIST = new Set([
  'breeder', 'knowledge', 'shuowenjiedao', 'dashboard',
  'reply', 'goals', 'index', 'about',
  'assessment', 'care-test', 'quality-test', 's1-report',
  'decode', 'assess', 'mini-program', 'agent', 'other'
]);

const RATE_LIMIT = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX_PER_UID = 30;
const RATE_MAX_PER_IP = 100;

function hashIp(ip) {
  if (!ip) return '';
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) - h + ip.charCodeAt(i)) | 0;
  return 'ip_' + Math.abs(h).toString(36);
}

function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || '';
}

function checkRateLimit(uid, ipHash, cost) {
  const now = Date.now();
  const keys = [];
  if (uid) keys.push({ k: 'u_' + uid, max: RATE_MAX_PER_UID });
  if (ipHash) keys.push({ k: 'i_' + ipHash, max: RATE_MAX_PER_IP });

  for (const { k, max } of keys) {
    const arr = RATE_LIMIT.get(k) || [];
    const fresh = arr.filter(t => now - t < RATE_WINDOW);
    if (fresh.length + cost > max) return false;
    for (let i = 0; i < cost; i++) fresh.push(now);
    RATE_LIMIT.set(k, fresh);
  }
  if (RATE_LIMIT.size > 1000) {
    for (const [k, v] of RATE_LIMIT.entries()) {
      const fresh = v.filter(t => now - t < RATE_WINDOW);
      if (fresh.length) RATE_LIMIT.set(k, fresh); else RATE_LIMIT.delete(k);
    }
  }
  return true;
}

function errJson(code, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function validateCSRF(request) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  if (!origin) return true;
  if (origin.includes('fengsheng.tech') || origin.includes('localhost')) return true;
  if (referer.includes('fengsheng.tech') || referer.includes('localhost')) return true;
  return false;
}

function okJson(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function deriveProduct(pathname) {
  if (!pathname || pathname === '/') return 'index';
  const m = pathname.match(/^\/([a-z0-9-]+)/);
  if (!m) return 'other';
  const map = {
    'quality-test': 'quality-test', 'reply': 'reply',
    'assessment': 'assessment', 'breeder': 'breeder',
    'knowledge': 'knowledge', 'care-test': 'care-test',
    's1-report': 's1-report', 'dashboard': 'dashboard',
    'shuowenjiedao': 'shuowenjiedao', 'goals': 'goals',
    'about': 'about'
  };
  return map[m[1]] || 'other';
}

function normalizeEvent(raw, request, url) {
  let event_type = (raw.event_type || raw.type || '').toString().slice(0, 50);
  if (!EVENT_WHITELIST.has(event_type)) event_type = 'action';

  // 修复page：兼容 tracker.js 传的 url 字段
  let page = (raw.page || '').toString().slice(0, 200);
  if (!page) {
    const rawUrl = raw.url || '';
    try {
      page = rawUrl ? new URL(rawUrl, 'https://fengsheng.tech').pathname : '';
    } catch (_) { page = ''; }
  }
  // 清理bug数据：如果page以/api/开头说明是旧bug，清空
  if (page.startsWith('/api/')) page = '';
  if (!page) page = url.pathname || '';

  // 修复product：从显式字段或page路径推导
  let product = (raw.product || '').toString().slice(0, 50);
  if (!product) {
    product = deriveProduct(page);
  }
  if (product && !PRODUCT_WHITELIST.has(product)) product = 'other';

  const uid = (raw.uid || '').toString().slice(0, 100);

  // 修复utm：兼容 tracker.js 的 source 对象
  const src = raw.source || {};
  const utm_source = (raw.utm_source || src.utm_source || '').toString().slice(0, 100);
  const utm_medium = (raw.utm_medium || src.utm_medium || '').toString().slice(0, 100);
  const utm_campaign = (raw.utm_campaign || src.utm_campaign || '').toString().slice(0, 100);
  const ref = (raw.ref || src.ref || raw.referrer || '').toString().slice(0, 200);

  let dataStr = '{}';
  if (raw.data !== undefined && raw.data !== null) {
    try {
      dataStr = (typeof raw.data === 'string' ? raw.data : JSON.stringify(raw.data)).slice(0, 4000);
    } catch (_) { dataStr = '{}'; }
  }

  const ipHash = hashIp(getClientIp(request));
  const userAgent = (request.headers.get('user-agent') || '').toString().slice(0, 500);

  return {
    uid, event_type, page, product,
    utm_source, utm_medium, utm_campaign, ref,
    data: dataStr, ip_hash: ipHash, user_agent: userAgent,
    created_at: Date.now()
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (method === 'POST') {
    if (!validateCSRF(request)) {
      return errJson(403, 'CSRF validation failed');
    }
    try {
      let body;
      try { body = await request.json(); } catch (_) {
        return errJson(400, 'invalid JSON');
      }
      const events = Array.isArray(body) ? body : [body];
      if (events.length === 0) return errJson(400, 'empty payload');
      if (events.length > 50) return errJson(400, 'batch too large');

      const firstUid = (events[0]?.uid || '').toString();
      const ipHash = hashIp(getClientIp(request));
      if (!checkRateLimit(firstUid, ipHash, events.length)) {
        return errJson(429, 'too many requests');
      }

      const prepared = events.map(raw => normalizeEvent(raw, request, url));

      let inserted = 0;
      for (const ev of prepared) {
        try {
          await env.DB.prepare(
            `INSERT INTO events
             (uid, event_type, page, product, utm_source, utm_medium, utm_campaign, ref, data, ip_hash, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            ev.uid, ev.event_type, ev.page, ev.product,
            ev.utm_source, ev.utm_medium, ev.utm_campaign, ev.ref,
            ev.data, ev.ip_hash, ev.user_agent, ev.created_at
          ).run();
          inserted++;
        } catch (_) {}
      }

      return okJson({ ok: true, inserted, total: prepared.length });
    } catch (e) {
      return errJson(500, 'server error: ' + (e.message || String(e)));
    }
  }

  if (method === 'GET') {
    const key = url.searchParams.get('key');
    if (key !== 'fs-admin-2026') {
      return errJson(401, 'unauthorized');
    }
    try {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
      const offset = (page - 1) * limit;
      const eventType = url.searchParams.get('type');
      const product = url.searchParams.get('product');
      const uid = url.searchParams.get('uid');

      const where = [];
      const params = [];
      if (eventType) { where.push('event_type = ?'); params.push(eventType); }
      if (product) { where.push('product = ?'); params.push(product); }
      if (uid) { where.push('uid = ?'); params.push(uid); }
      const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

      const countRes = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM events' + whereSql
      ).bind(...params).first();

      const { results } = await env.DB.prepare(
        'SELECT id, uid, event_type, page, product, utm_source, utm_medium, utm_campaign, ref, created_at ' +
        'FROM events' + whereSql + ' ORDER BY id DESC LIMIT ? OFFSET ?'
      ).bind(...params, limit, offset).all();

      return okJson({ total: countRes.total, page, limit, data: results });
    } catch (e) {
      return errJson(500, 'db error: ' + (e.message || String(e)));
    }
  }

  return errJson(405, 'method not allowed');
}