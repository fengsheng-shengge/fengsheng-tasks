// ============================================================
// Cloudflare Pages Function: /api/feedback  v2.1
// 对应作战方案 v1.1 · 110人验证线
// 小扣子（技术侧）
//
// POST /api/feedback  — 提交一条反馈（公开）
// GET  /api/feedback?key=fs-admin-2026&product=xxx — 管理查询
// v2.1: 增加反垃圾邮件过滤（内容关键词 + 链接检测 + 重复内容）
// ============================================================

const PRODUCT_WHITELIST = new Set([
  'breeder', 'knowledge', 'shuowenjiedao', 'dashboard',
  'reply', 'goals', 'index', 'about',
  'assessment', 'care-test', 'quality-test', 's1-report', 'other'
]);

// 反垃圾关键词列表
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'win money', 'earn $', 'make money',
  'click here', 'buy now', 'order now', 'limited time', 'act now',
  'free gift', 'congratulations', 'you won', 'winner', 'prize',
  'debt', 'loan', 'credit card', 'mortgage', 'insurance',
  'weight loss', 'diet pill', 'muscle', 'supplement',
  'hot singles', 'dating', 'sexy', 'adult', 'xxx',
  'crypto', 'bitcoin', 'investment opportunity', 'double your',
  ' Nigerian', 'prince', 'inheritance', 'wire transfer',
  'urgent', 'important notice', 'verify your account', 'suspended',
  '发情', '约炮', '博彩', '彩票', '兼职刷单', '信用卡套现',
  '贷款', '高利贷', '代孕', '毒品', '枪支'
];

const SPAM_URL_PATTERNS = [
  /https?:\/\/[^\s]+\.(tk|ml|ga|cf|top|xyz|click|link|work)/i,
  /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
];

// 简单内存限流（单 Worker 进程内生效）
const RATE_LIMIT = new Map(); // key -> [{ts: ms, ...}]
const RATE_WINDOW = 60_000; // 60s
const RATE_MAX_PER_UID = 5;
const RATE_MAX_PER_IP = 10;

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

function checkRateLimit(uid, ipHash) {
  const now = Date.now();
  const keys = [];
  if (uid) keys.push({ k: 'u_' + uid, max: RATE_MAX_PER_UID });
  if (ipHash) keys.push({ k: 'i_' + ipHash, max: RATE_MAX_PER_IP });

  for (const { k, max } of keys) {
    const arr = RATE_LIMIT.get(k) || [];
    const fresh = arr.filter(t => now - t < RATE_WINDOW);
    if (fresh.length >= max) return false;
    fresh.push(now);
    RATE_LIMIT.set(k, fresh);
  }
  if (RATE_LIMIT.size > 500) {
    for (const [k, v] of RATE_LIMIT.entries()) {
      const fresh = v.filter(t => now - t < RATE_WINDOW);
      if (fresh.length) RATE_LIMIT.set(k, fresh); else RATE_LIMIT.delete(k);
    }
  }
  return true;
}

// 反垃圾检测
function isSpam(content, contact) {
  const text = (content + ' ' + contact).toLowerCase();
  
  // 1. 关键词检测
  for (const kw of SPAM_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) return { spam: true, reason: 'keyword: ' + kw };
  }
  
  // 2. URL模式检测
  for (const pattern of SPAM_URL_PATTERNS) {
    if (pattern.test(text)) return { spam: true, reason: 'suspicious link pattern' };
  }
  
  // 3. 链接数量检测（正常反馈不会有很多链接）
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) return { spam: true, reason: 'too many links: ' + linkCount };
  
  // 4. 重复字符检测（垃圾邮件常见特征）
  const repeatedChars = /(.)(\1{10,})/;
  if (repeatedChars.test(text)) return { spam: true, reason: 'repeated characters' };
  
  // 5. 全大写比例检测
  const upperRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (upperRatio > 0.7 && text.length > 20) return { spam: true, reason: 'excessive caps' };
  
  return { spam: false };
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
  const host = request.headers.get('host') || '';
  // 允许同源请求 + 无Origin的请求（如curl/server-side）
  if (!origin) return true;
  if (origin.includes('fengsheng.tech') || origin.includes('localhost')) return true;
  if (referer.includes('fengsheng.tech') || referer.includes('localhost')) return true;
  // 拒绝跨域伪造
  return false;
}

function okJson(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
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
      const body = await request.json();
      let { topic, page, content, contact, product, uid } = body;

      if (!content || !content.toString().trim()) {
        return errJson(400, 'content is required and cannot be empty');
      }
      content = content.toString().slice(0, 5000);
      topic = (topic || 'general').toString().slice(0, 100);
      page = (page || url.pathname || '').toString().slice(0, 200);
      contact = (contact || '').toString().slice(0, 200);
      product = (product || '').toString().slice(0, 50);
      uid = (uid || '').toString().slice(0, 100);

      if (product && !PRODUCT_WHITELIST.has(product)) product = 'other';

      const ipHash = hashIp(getClientIp(request));
      const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);

      if (!checkRateLimit(uid, ipHash)) {
        return errJson(429, 'too many requests, please wait a moment');
      }

      // v2.1: 反垃圾邮件检测
      const spamCheck = isSpam(content, contact);
      if (spamCheck.spam) {
        // 记录垃圾邮件但不入库，返回成功避免暴露检测逻辑
        console.log('Spam blocked:', spamCheck.reason, 'IP:', ipHash, 'UA:', userAgent.slice(0, 100));
        return okJson({ ok: true, id: null, note: 'feedback received' });
      }

      const result = await env.DB.prepare(
        `INSERT INTO feedback
         (topic, page, content, contact, product, uid, ip_hash, user_agent, status, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 'web', ?)`
      ).bind(
        topic, page, content, contact, product, uid, ipHash, userAgent, Date.now()
      ).run();

      const newId = result && result.meta && result.meta.last_row_id
        ? result.meta.last_row_id
        : null;

      return okJson({ ok: true, id: newId });
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
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const offset = (page - 1) * limit;
      const product = url.searchParams.get('product');
      const status = url.searchParams.get('status');

      let where = [];
      let params = [];
      if (product) { where.push('product = ?'); params.push(product); }
      if (status) { where.push('status = ?'); params.push(status); }
      const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

      const countRes = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM feedback' + whereSql
      ).bind(...params).first();

      const { results } = await env.DB.prepare(
        'SELECT id, topic, page, content, contact, product, uid, status, created_at ' +
        'FROM feedback' + whereSql + ' ORDER BY id DESC LIMIT ? OFFSET ?'
      ).bind(...params, limit, offset).all();

      return okJson({ total: countRes.total, page, limit, data: results });
    } catch (e) {
      return errJson(500, 'db error: ' + (e.message || String(e)));
    }
  }

  return errJson(405, 'method not allowed');
}
