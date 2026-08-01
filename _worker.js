// FengSheng Pages Worker - handles all API routes
// Version: v20260801-1830 - perf: entries pagination+cache, 404 fix, data file block
//   + D1 database integration (stats, events, feedback)
//   + Coze AI chat streaming
//   + WeChat login with JWT
//   + Alipay payment (mentor unlock)
//   + issue #191: partner_intent + ip-design
//   + issue #201: fix duplicate function declarations
//   + issue #208: MP_verify + /api/health routing

const COZE_API = 'https://api.coze.cn';
const BOT_ID_PLACEHOLDER = '***MASKED***';
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';

// ============================================================
//  Rate limiting
// ============================================================
const RATE_LIMIT = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const RATE_MAX_GLOBAL = 120;
const MAX_PAYLOAD_SIZE = 64 * 1024;
const BANNED_IPS = new Map();
const BAN_DURATION_MS = 3600_000;

// Malicious tool / scanner UAs — block outright
const MALICIOUS_UA_PATTERNS = [
  /nmap/i, /sqlmap/i, /masscan/i, /nikto/i, /burpsuite/i, /wpscan/i,
  /hydra/i, /nessus/i, /acunetix/i, /netsparker/i, /openvas/i,
  /zgrab/i, /zgrab2/i, /gobuster/i, /dirbuster/i, /dirb/i,
  /whatweb/i, /wappalyzer/i, /webcopier/i, /httrack/i, /teleport/i,
  /offline explorer/i, /webzip/i, /webstripper/i, /webcopy/i,
  /webdav/i, /frontpage/i, /microsoft url control/i,
];

// AI scrapers — block at network level (curl/wget removed for testing)
const AI_SCRAPER_UA_PATTERNS = [
  /GPTBot/i, /ClaudeBot/i, /CCBot/i, /Bytespider/i, /Amazonbot/i,
  /Applebot/i, /Bingbot/i, /facebookexternalhit/i, /Twitterbot/i,
  /SemrushBot/i, /AhrefsBot/i, /DotBot/i, /MegaIndex/i,
  /rogerbot/i, /exabot/i, /MJ12bot/i, /YandexBot/i, /Baiduspider/i,
  /Sogou/i, /360Spider/i, /HaosouSpider/i, /YoudaoBot/i,
  /PetalBot/i, /BLEXBot/i, /DataForSeoBot/i, /SeekportBot/i,
  /screaming frog/i, /Sitebulb/i, /DeepCrawl/i, /OnCrawl/i,
  /ZoomBot/i, /ZoominfoBot/i, /WPEngine/i, /Go-http-client/i,
  /python-requests/i, /python-urllib/i, /scrapy/i,
  /lwp-trivial/i, /libwww-perl/i, /Java/i, /Apache-HttpClient/i,
  /okhttp/i, /axios/i, /node-fetch/i, /got/i, /superagent/i,
  /PostmanRuntime/i, /insomnia/i, /paw/i,
  /ChatGPT-User/i, /cohere-ai/i, /PerplexityBot/i, /Anthropic/i,
  /OAI-SearchBot/i, /Diffbot/i, /ImagesiftBot/i, /Clickagy/i,
];

const MISSING_UA_PATTERNS = [/^$/, /^-$/, /^unknown$/, /^null$/i, /^undefined$/i];

const EXPLOIT_PATH_PATTERNS = [
  /\.env/i, /\.git/i, /\.svn/i, /\.hg/i, /\.DS_Store/i,
  /wp-admin/i, /wp-login/i, /wp-content/i, /wp-includes/i,
  /phpmyadmin/i, /phpunit/i, /vendor\/phpunit/i,
  /\.php$/i, /\.asp$/i, /\.aspx$/i, /\.jsp$/i,
  /config\.json/i, /config\.yml/i, /config\.yaml/i,
  /credentials/i, /password/i, /secret/i, /token/i,
  /docker-compose/i, /dockerfile/i, /jenkins/i,
  /\.well-known\/acme-challenge/i,
  /actuator/i, /swagger/i, /api-docs/i, /graphql/i,
  /console/i, /admin/i, /administrator/i,
  /cgi-bin/i, /_ignition/i, /_profiler/i,
  /solr/i, /elasticsearch/i, /jolokia/i,
  /HNAP1/i, /setup\.cgi/i, /tmUnblock/i,
  /muieblackcat/i, /left\.php/i, /xmlrpc\.php/i,
  /node_modules/i, /package-lock\.json/i, /yarn\.lock/i,
  /pnpm-lock\.yaml/i, /\.npmrc/i, /tsconfig\.json/i,
];

// ============================================================
//  Security headers (applied to ALL responses)
//  _headers file not applied in advanced mode; inject here
// ============================================================
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

const CSP_HEADER_STATIC = "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

function applySecurityHeaders(resp, isHtml = false) {
  const newResp = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!newResp.headers.has(k)) {
      newResp.headers.set(k, v);
    }
  }
  if (isHtml && !newResp.headers.has('Content-Security-Policy')) {
    newResp.headers.set('Content-Security-Policy', CSP_HEADER_STATIC);
  }
  return newResp;
}

const HONEYPOT_PATHS = [
  '/admin/login', '/wp-admin', '/administrator', '/backend',
  '/hidden-link', '/secret-path', '/api/admin', '/cms',
];

// ============================================================
//  Utility functions (defined ONCE — no duplicates)
// ============================================================

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || '0.0.0.0';
}

function isBanned(ip) {
  const entry = BANNED_IPS.get(ip);
  if (entry && Date.now() - entry < BAN_DURATION_MS) return true;
  if (entry) BANNED_IPS.delete(ip);
  return false;
}

function banIP(ip) {
  BANNED_IPS.set(ip, Date.now());
}

function checkRateLimit(request) {
  const ip = getClientIP(request);
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (entry && now - entry.windowStart < RATE_WINDOW_MS) {
    if (entry.count >= RATE_MAX_REQUESTS) return false;
    entry.count++;
  } else {
    RATE_LIMIT.set(ip, { windowStart: now, count: 1 });
  }
  return true;
}

function checkGlobalRateLimit(request) {
  const ip = getClientIP(request);
  const now = Date.now();
  const key = `global_${ip}`;
  const entry = RATE_LIMIT.get(key);
  if (entry && now - entry.windowStart < RATE_WINDOW_MS) {
    if (entry.count >= RATE_MAX_GLOBAL) return false;
    entry.count++;
  } else {
    RATE_LIMIT.set(key, { windowStart: now, count: 1 });
  }
  return true;
}

function isMaliciousUA(ua) {
  if (!ua) return true;
  for (const pattern of MISSING_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }
  for (const pattern of MALICIOUS_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }
  return false;
}

function isAIScraper(ua) {
  if (!ua) return false;
  for (const pattern of AI_SCRAPER_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }
  return false;
}

function isExploitPath(path) {
  for (const pattern of EXPLOIT_PATH_PATTERNS) {
    if (pattern.test(path)) return true;
  }
  return false;
}

function isHoneypotPath(path) {
  return HONEYPOT_PATHS.includes(path);
}

function isSuspiciousQueryString(queryString) {
  if (!queryString) return false;
  const suspicious = [
    /<script/i, /onerror/i, /onload/i, /javascript:/i,
    /union\s+select/i, /or\s+1=1/i, /'--/i, /sleep\(/i, /benchmark\(/i,
    /\.\.\/\.\.\//i, /%2e%2e%2f/i,
    /\/etc\/passwd/i, /\/bin\/bash/i,
    /eval\(/i, /system\(/i, /exec\(/i, /cmd\.exe/i,
    /file_get_contents/i, /base64_decode/i,
  ];
  for (const pattern of suspicious) {
    if (pattern.test(queryString)) return true;
  }
  return false;
}

function jsonResponse(data, status = 200, headers = {}) {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers,
  };
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

async function parseBodyJson(request) {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function clip(str, max = 500) {
  if (!str) return '';
  return String(str).slice(0, max);
}

function getBaseUrl(request) {
  const proto = request.headers.get('X-Forwarded-Proto') || 'https';
  const host = request.headers.get('Host') || 'fengsheng.tech';
  return `${proto}://${host}`;
}

// ============================================================
//  JWT helpers
// ============================================================

async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64urlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(b64u) {
  const base64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64urlEncode(binary);
}

function base64urlToArrayBuffer(b64u) {
  const binary = base64urlDecode(b64u);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function generateToken(openid, env) {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(JSON.stringify({
    openid,
    iat: now,
    exp: now + 86400 * 7,
    jti: crypto.randomUUID ? crypto.randomUUID() : openid + '_' + now,
  }));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
  const sig = arrayBufferToBase64url(signature);
  return `${header}.${payload}.${sig}`;
}

async function verifyToken(token, env) {
  const secret = env.JWT_SECRET;
  if (!secret) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = base64urlToArrayBuffer(s);
    const valid = await crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' }, key, sigBytes, encoder.encode(`${h}.${p}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(base64urlDecode(p));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch { return null; }
}

// ============================================================
//  Partner intent storage (inlined from api/partner-intent.js)
// ============================================================

const VALID_TYPES = new Set(['edu', 'gov']);
const FIELD_MAX = {
  name: 64, org: 128, role: 64, contact: 128, note: 1024,
  chipsItem: 32, chipsMax: 32, ip: 64, ua: 512,
};

async function storePartnerIntents(events, env, request) {
  if (!Array.isArray(events) || events.length === 0) return 0;
  const clientIp = request
    ? (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || '')
    : '';
  const ua = request ? (request.headers.get('User-Agent') || '') : '';
  let stored = 0;
  for (const e of events) {
    const record = normalizePartnerEvent(e, clientIp, ua);
    if (!record) continue;
    let ok = false;
    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO partner_intents (intent_type, name, org, role, contact, chips, note, client_ip, ua, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          record.intent_type, record.name, record.org, record.role,
          record.contact, record.chips, record.note, record.client_ip,
          record.ua, record.ts, Math.floor(Date.now() / 1000)
        ).run();
        ok = true;
      } catch (err) {
        console.error('partner_intents: D1 insert failed, fallback to KV:', err.message);
      }
    }
    if (!ok && env.PARTNER_LEADS) {
      try {
        const key = `pi:${record.ts}:${Math.random().toString(36).slice(2, 8)}`;
        await env.PARTNER_LEADS.put(key, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 });
        ok = true;
      } catch (err) {
        console.error('partner_intents: KV put failed:', err.message);
      }
    }
    if (!ok) {
      console.log('partner_intent (not persisted):', JSON.stringify(record));
    } else {
      stored++;
    }
  }
  return stored;
}

function normalizePartnerEvent(e, clientIp, ua) {
  if (!e || typeof e !== 'object') return null;
  if (e.t !== 'partner_intent') return null;
  const intentType = VALID_TYPES.has(e.type) ? e.type : 'edu';
  return {
    intent_type: intentType,
    name: clip(e.name, FIELD_MAX.name),
    org: clip(e.org, FIELD_MAX.org),
    role: clip(e.role, FIELD_MAX.role),
    contact: clip(e.contact, FIELD_MAX.contact),
    chips: stringifyChips(e.chips),
    note: clip(e.note, FIELD_MAX.note),
    client_ip: clip(clientIp, FIELD_MAX.ip),
    ua: clip(ua, FIELD_MAX.ua),
    ts: Number.isFinite(e.ts) ? e.ts : Date.now(),
  };
}

function stringifyChips(arr) {
  if (!Array.isArray(arr)) return '[]';
  const cleaned = arr
    .filter((x) => x != null && x !== '')
    .map((x) => String(x).trim().slice(0, FIELD_MAX.chipsItem))
    .slice(0, FIELD_MAX.chipsMax);
  return JSON.stringify(cleaned);
}

// ============================================================
//  IP Design (inlined from api/ip-design.js)
// ============================================================

const SUPPORTED_STYLES = ['商务风', '亲民风', '活力风', '简约文艺', '科技感', '可爱卡通'];
const MAX_DESC = 500;
const MAX_STYLES = 6;
const USE_MOCK_IPDESIGN = true;

// ============================================================
//  API Handlers
// ============================================================

async function handleWxLogin(request, env) {
  try {
    const body = await request.json();
    const { code } = body;
    if (!code) return jsonResponse({ error: 'code is required' }, 400);
    const WX_APPID = env.WX_APPID || 'wxb87aa256991cc9c6';
    const WX_SECRET = env.WX_SECRET;
    if (!WX_SECRET) {
      console.error('WX_SECRET not configured');
      return jsonResponse({ error: 'server config error' }, 500);
    }
    const wxUrl = `${WX_API}?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const wxResp = await fetch(wxUrl);
    const wxData = await wxResp.json();
    if (wxData.errcode) {
      console.error('WeChat API error:', wxData.errcode, wxData.errmsg);
      return jsonResponse({ error: '微信登录失败', code: wxData.errcode }, 400);
    }
    const { openid, session_key } = wxData;
    const token = await generateToken(openid, env);
    const userId = 'u_' + openid.slice(-8);
    return jsonResponse({ token, openid, userId });
  } catch (e) {
    console.error('WxLogin error:', e);
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleChat(request, env, authenticatedOpenid, resolvedBotId) {
  try {
    const body = await request.json();
    const { message, conversation_id } = body;
    if (!message || !message.trim()) {
      return jsonResponse({ error: 'message is required' }, 400);
    }
    const PAT_TOKEN = env.COZE_PAT_TOKEN;
    if (!PAT_TOKEN) {
      console.error('COZE_PAT_TOKEN not configured');
      return jsonResponse({ error: 'server config error' }, 500);
    }
    const reqBody = {
      bot_id: resolvedBotId,
      user_id: authenticatedOpenid || 'web_user',
      stream: true,
      auto_save_history: true,
      additional_messages: [{
        role: 'user',
        content: message.trim(),
        content_type: 'text',
      }],
    };
    if (conversation_id) reqBody.conversation_id = conversation_id;
    const cozeResp = await fetch(`${COZE_API}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });
    if (!cozeResp.ok) {
      const errText = await cozeResp.text();
      console.error('Coze API error:', cozeResp.status, errText);
      return jsonResponse({ error: 'Coze API error', status: cozeResp.status }, 502);
    }
    return new Response(cozeResp.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('Proxy error:', e);
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleFeedback(request, env) {
  try {
    const body = await request.json();
    const { uid, type, content, product, rating } = body;
    if (!content || !content.trim()) {
      return jsonResponse({ error: 'content is required' }, 400);
    }
    const eventType = type || 'feedback';
    const eventUid = uid || 'anonymous';
    const eventProduct = product || 'general';
    if (env.DB) {
      await env.DB.prepare(
        'INSERT INTO events (uid, event_type, product, data, ts, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())'
      ).bind(eventUid, eventType, eventProduct, JSON.stringify({ content: content.trim(), rating: rating || null }), Date.now()).run();
    }
    return jsonResponse({ ok: true, message: '反馈已收到，感谢！' });
  } catch (err) {
    return jsonResponse({ error: '反馈提交失败: ' + err.message }, 500);
  }
}

async function handleFeedbackExternal(request, env) {
  try {
    const body = await request.json();
    const web3Key = env.WEB3FORMS_KEY || '27c926eb-07d8-4a71-8bf8-f30ad73f8e39';
    const formsubmitKey = env.FORMSUBMIT_KEY || 'd818fa3cece5258aea8205bd492316de';
    const payload = { access_key: web3Key, ...body };
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    const fsPayload = {
      ...body,
      _replyto: body._replyto || 'feedback@fengsheng.tech',
      _subject: body._subject || '风声用户反馈',
    };
    fetch(`https://formsubmit.co/ajax/${formsubmitKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(fsPayload),
    }).catch(() => {});
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: '反馈提交失败: ' + err.message }, 500);
  }
}

async function handleEvent(request, env) {
  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : null;
    const events = Array.isArray(body) ? body : body ? [body] : [];
    const partnerEvents = [];
    const trackingEvents = [];
    for (const e of events) {
      if (e && e.t === 'partner_intent') partnerEvents.push(e);
      else trackingEvents.push(e);
    }
    if (partnerEvents.length) {
      try {
        await storePartnerIntents(partnerEvents, env, request);
      } catch (e) {
        console.error('partner_intents: store failed', e.message);
      }
    }
    if (trackingEvents.length && env.DB) {
      const stmt = env.DB.prepare(
        'INSERT OR IGNORE INTO events (uid, event_type, url, page, product, title, referrer, utm_source, utm_medium, utm_campaign, ref, source, ua, screen, vp, locale, data, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const batch = trackingEvents.map((e) => {
        const ts = e.ts || Date.now();
        return stmt.bind(
          (e.uid || 'anon').slice(0, 64),
          (e.type || e.event_type || 'event').slice(0, 32),
          (e.url || '').slice(0, 512),
          (e.page || '').slice(0, 256),
          (e.product || '').slice(0, 64),
          (e.title || '').slice(0, 256),
          (e.referrer || '').slice(0, 512),
          (e.utm_source || '').slice(0, 128),
          (e.utm_medium || '').slice(0, 128),
          (e.utm_campaign || '').slice(0, 128),
          (e.ref || '').slice(0, 256),
          JSON.stringify(e.source || {}).slice(0, 1024),
          (e.ua || '').slice(0, 512),
          (e.screen || '').slice(0, 32),
          (e.vp || '').slice(0, 32),
          (e.locale || '').slice(0, 16),
          JSON.stringify(e.data || {}).slice(0, 2048),
          ts,
          Math.floor(ts / 1000)
        );
      });
      await env.DB.batch(batch);
      console.log(`events: wrote ${trackingEvents.length} event(s)`);
    } else if (trackingEvents.length) {
      console.log(`events: received ${trackingEvents.length} event(s) (no DB, not persisted)`);
    }
  } catch (e) {
    console.error('events: write failed', e.message);
  }
  return jsonResponse({ ok: true });
}

async function handleStats(request, env) {
  const now = new Date().toISOString().split('T')[0];
  if (env.DB) {
    try {
      const uvResult = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as uv FROM events WHERE event_type = 'pageview'"
      ).first();
      const pvResult = await env.DB.prepare(
        "SELECT COUNT(*) as pv FROM events WHERE event_type = 'pageview'"
      ).first();
      const chatResult = await env.DB.prepare(
        "SELECT COUNT(*) as chats FROM events WHERE event_type IN ('chat', 'mentor_chat')"
      ).first();
      const lastEvent = await env.DB.prepare(
        "SELECT ts FROM events ORDER BY ts DESC LIMIT 1"
      ).first();
      return jsonResponse({
        uv: uvResult?.uv || 0,
        total_users: uvResult?.uv || 0,
        pv: pvResult?.pv || 0,
        chats: chatResult?.chats || 0,
        last_event_ts: lastEvent?.ts || null,
        updated: now,
        source: 'db',
      });
    } catch (e) {
      console.error('stats: DB query failed', e.message);
    }
  }
  return jsonResponse({
    uv: null, total_users: null, pv: null, chats: null,
    last_event_ts: null, updated: now,
    note: 'no database configured — events are not persisted',
  });
}

async function handleStatsSummary(request, env) {
  const now = new Date().toISOString().split('T')[0];
  if (env.DB) {
    try {
      const totalUsers = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as total_users FROM events"
      ).first();
      const totalPageviews = await env.DB.prepare(
        "SELECT COUNT(*) as total_pageviews FROM events WHERE event_type = 'pageview'"
      ).first();
      const totalFeedback = await env.DB.prepare(
        "SELECT COUNT(*) as total_feedback FROM events WHERE event_type = 'reply_submit'"
      ).first();
      const perProduct = await env.DB.prepare(
        "SELECT product, COUNT(DISTINCT uid) as users, COUNT(CASE WHEN event_type='pageview' THEN 1 END) as pageviews, COUNT(CASE WHEN event_type='reply_submit' THEN 1 END) as feedback, COUNT(CASE WHEN event_type='click' THEN 1 END) as clicks, 0 as actions FROM events WHERE product != '' GROUP BY product"
      ).all();
      const users = totalUsers?.total_users || 0;
      const fb = totalFeedback?.total_feedback || 0;
      const fbRate = users > 0 ? Math.round(fb / users * 10000) / 100 : 0;
      return jsonResponse({
        total_users: users,
        total_pageviews: totalPageviews?.total_pageviews || 0,
        total_feedback: fb,
        feedback_rate_pct: fbRate,
        per_product: perProduct?.results || [],
        updated: now,
        source: 'db',
      });
    } catch (e) {
      console.error('stats/summary: DB query failed', e.message);
    }
  }
  return jsonResponse({
    total_users: 0, total_pageviews: 0, total_feedback: 0, feedback_rate_pct: 0,
    per_product: [], updated: now, note: 'no database configured',
  });
}

async function handleStatsDaily(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '7');
  const now = new Date().toISOString().split('T')[0];
  if (env.DB) {
    try {
      const daily = await env.DB.prepare(
        `SELECT date(created_at, 'unixepoch') as date, COUNT(DISTINCT uid) as unique_uids, COUNT(CASE WHEN event_type='pageview' THEN 1 END) as pageviews, COUNT(CASE WHEN event_type='click' THEN 1 END) as clicks, COUNT(CASE WHEN event_type='reply_submit' THEN 1 END) as feedbacks FROM events WHERE created_at >= unixepoch('now', '-${days} days') AND date(created_at, 'unixepoch') IS NOT NULL GROUP BY date(created_at, 'unixepoch') ORDER BY date`
      ).all();
      // Fill missing days with zeros for continuous chart
      const dbResults = daily?.results || [];
      const dateMap = {};
      for (const r of dbResults) dateMap[r.date] = r;
      const filled = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (dateMap[dateStr]) {
          filled.push(dateMap[dateStr]);
        } else {
          filled.push({ date: dateStr, unique_uids: 0, pageviews: 0, clicks: 0, feedbacks: 0 });
        }
      }
      return jsonResponse({
        daily: filled,
        updated: now,
        source: 'db',
      });
    } catch (e) {
      console.error('stats/daily: DB query failed', e.message);
    }
  }
  return jsonResponse({ daily: [], updated: now, note: 'no database configured' });
}

async function handleStatsHealth(request, env) {
  const now = new Date().toISOString();
  if (env.DB) {
    try {
      const lastEvent = await env.DB.prepare(
        "SELECT ts, event_type, product FROM events ORDER BY ts DESC LIMIT 1"
      ).first();
      const count24h = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM events WHERE created_at >= unixepoch('now', '-1 days')"
      ).first();
      const feedbackCount = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM events WHERE event_type = 'reply_submit'"
      ).first();
      return jsonResponse({
        status: 'ok',
        db: 'connected',
        db_connected: true,
        last_event: lastEvent || null,
        events_24h: count24h?.cnt || 0,
        events_count: count24h?.cnt || 0,
        feedback_count: feedbackCount?.cnt || 0,
        updated: now,
        version: 'v20260801-1830',
      });
    } catch (e) {
      return jsonResponse({ status: 'degraded', db: 'error', db_connected: false, error: e.message, updated: now });
    }
  }
  return jsonResponse({ status: 'degraded', db: 'not_configured', db_connected: false, updated: now });
}

// Simple handlers for additional routes
async function handleDecode(request, version) {
  version = version || 1;
  if (request.method === 'GET') return jsonResponse({ ok: true, version, hint: 'POST with input' });
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  const zodiac = clip(data.zodiac || data.zodiacName || '', 50);
  const constellation = clip(data.constellation || data.sign || '', 50);
  const keyword = clip(data.keyword || data.word || '', 200);
  const query = zodiac || constellation || keyword;
  if (!query) return jsonResponse({ ok: false, error: '需要生肖/星座/关键词' }, 400);
  return jsonResponse({
    ok: true, version,
    input: { zodiac, constellation, keyword },
    sixSteps: [
      { step: 1, name: '懂你的优势' }, { step: 2, name: '懂你的情绪' },
      { step: 3, name: '懂你的模式' }, { step: 4, name: '懂你的关系' },
      { step: 5, name: '懂你的成长' }, { step: 6, name: '懂你的使命' },
    ],
    generatedAt: new Date().toISOString(),
  });
}

async function handleAssess(request) {
  if (request.method === 'GET') return jsonResponse({ ok: true, hint: 'POST with profile data' });
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  return jsonResponse({
    ok: true,
    report: {
      overall: 75,
      dimensions: { 优势: 80, 情绪: 70, 模式: 72, 关系: 78, 成长: 68, 使命: 73 },
      generatedAt: new Date().toISOString(),
    },
  });
}

async function handleCallback(request) {
  const data = await parseBodyJson(request);
  return jsonResponse({ ok: true, received: !!data });
}

async function handleDaily(request) {
  if (request.method === 'GET') return jsonResponse({ ok: true, days: 0, streak: 0 });
  const data = await parseBodyJson(request);
  return jsonResponse({ ok: true, checked: true, date: new Date().toISOString().slice(0, 10) });
}

async function handleVerify(request) {
  return jsonResponse({ ok: true, verified: true, ts: Date.now() });
}

async function handleAdminAgents(request, env) {
  if (request.method !== 'GET') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
  // Layer A: 鉴权（防止 4 数字员工列表泄漏·7.31 23:30 小鱼儿代修·P0 雷修复 #1/2）
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const expectedToken = (env && env.DASHBOARD_TOKEN) || '07dc894ef8c6828c861803dd4326118d795f6912ebc1ec0e';
  if (!token || token !== expectedToken) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return jsonResponse({
    ok: true,
    agents: [
      { id: 'xiaoyu', name: '小鱼儿', role: '产品运营', status: 'active' },
      { id: 'xiaodou', name: '小豆子', role: '技术开发', status: 'active' },
      { id: 'xiaojiu', name: '小酒窝儿', role: '设计评审', status: 'active' },
      { id: 'xiaoke', name: '小扣子', role: '底层执行', status: 'active' },
    ],
  });
}

async function handlePartnerIntent(request, env) {
  if (request.method === 'GET') return jsonResponse({ ok: true, title: '风声·合作意向', fields: ['name', 'phone', 'company', 'intent', 'message'] });
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  const name = clip(data.name || data.contact || '', 50);
  const phone = clip(data.phone || data.mobile || '', 30);
  const company = clip(data.company || data.org || '', 100);
  const intent = clip(data.intent || data.type || '', 50);
  const message = clip(data.message || data.note || '', 1000);
  if (!name || !phone) return jsonResponse({ ok: false, error: '姓名和电话为必填项' }, 400);
  // Try D1 + KV storage
  if (env.DB || env.PARTNER_LEADS) {
    try {
      await storePartnerIntents([{ t: 'partner_intent', type: intent, name, org: company, contact: phone, note: message, ts: Date.now() }], env, request);
    } catch (e) {
      console.error('partner_intent store error:', e.message);
    }
  }
  return jsonResponse({
    ok: true, submitted: true,
    id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: '感谢您的合作意向，我们将尽快与您联系！',
  });
}

async function handleIpDesign(request, env) {
  if (request.method === 'GET') return jsonResponse({ ok: true, title: '风声·IP 角色设计', supported_styles: SUPPORTED_STYLES });
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);

  const desc = clip(data.desc || data.description || '', MAX_DESC);
  let styles = [];
  if (Array.isArray(data.styles)) {
    const seen = new Set();
    for (const s of data.styles) {
      if (typeof s !== 'string') continue;
      const v = s.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      styles.push(v);
      if (styles.length >= MAX_STYLES) break;
    }
  }
  if (!desc) return jsonResponse({ ok: false, error: 'desc 不能为空' }, 400);
  if (styles.length === 0) return jsonResponse({ ok: false, error: 'styles 不能为空' }, 400);

  const results = [];
  for (const style of styles) {
    let url;
    if (USE_MOCK_IPDESIGN || !env.IP_DESIGN_API || !env.IP_DESIGN_API_KEY) {
      // Mock: DiceBear avatar
      const seed = encodeURIComponent(`${style}-${desc}`.slice(0, 64));
      const styleMap = {
        '商务风': 'bottts-neutral', '亲民风': 'avataaars', '活力风': 'adventurer',
        '简约文艺': 'thumbs', '科技感': 'bottts', '可爱卡通': 'lorelei',
      };
      const dicebearStyle = styleMap[style] || 'bottts-neutral';
      url = `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${seed}&backgroundColor=f7f4ef`;
    } else {
      try {
        const prompt = `为一个 IP 角色设计头像, 正方形构图, 头像比例, 简洁背景, 高质量. 风格: ${style}. 角色描述: ${desc}.`;
        const resp = await fetch(env.IP_DESIGN_API, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.IP_DESIGN_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: env.IP_DESIGN_MODEL || 'seedream-4.0', prompt, size: '1024x1024', n: 1 }),
        });
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const respData = await resp.json();
        const item = respData?.data?.[0];
        if (item?.url) url = item.url;
        else if (item?.b64_json) url = `data:image/png;base64,${item.b64_json}`;
        else throw new Error('no url in response');
      } catch (err) {
        console.error('ip-design: real API failed, fallback to mock:', err.message);
        const seed = encodeURIComponent(`${style}-${desc}`.slice(0, 64));
        url = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=f7f4ef`;
      }
    }
    results.push({ style, url });
  }
  return jsonResponse(results);
}

// ============================================================
//  Knowledge base entries (issue #210: /api/entries endpoint)
// ============================================================

// Isolate-level cache: avoid re-parsing 10MB JSON on every request
let _entriesCache = null;
let _entriesCacheTime = 0;
const ENTRIES_CACHE_TTL = 300_000; // 5 minutes

async function loadEntriesFromAssets(env) {
  if (_entriesCache && Date.now() - _entriesCacheTime < ENTRIES_CACHE_TTL) {
    return _entriesCache;
  }
  try {
    const assetReq = new Request('https://fakehost/data/entries.json');
    const resp = await env.ASSETS.fetch(assetReq);
    if (!resp.ok) return [];
    const text = await resp.text();
    _entriesCache = JSON.parse(text);
    _entriesCacheTime = Date.now();
    return _entriesCache;
  } catch (e) {
    console.error('loadEntriesFromAssets failed:', e.message);
    return [];
  }
}

async function handleEntries(request, env, ctx) {
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  // Default to 50 entries; limit=0 explicitly requests all (for knowledge page)
  // Note: 0 is falsy in JS, so we can't use || — must check explicitly
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : 50;
  const limit = isNaN(parsedLimit) ? 50 : (parsedLimit === 0 ? 0 : Math.min(parsedLimit, 200));
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0);

  // Cache API: avoid re-fetching + re-parsing on repeated calls
  const cacheKey = new Request('https://cache.local/api/entries' + url.search);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const entries = await loadEntriesFromAssets(env);
  let result = domain ? entries.filter(e => e.domain === domain) : entries;
  const total = result.length;
  if (limit > 0) {
    result = result.slice(offset, offset + limit);
  } else if (offset > 0) {
    result = result.slice(offset);
  }
  const resp = jsonResponse({
    total,
    returned: result.length,
    offset,
    limit: limit || null,
    domain: domain || null,
    entries: result,
  });
  // Cache for 5 min at edge, 10 min in browser
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}

async function handleKnowledgeStats(request, env, ctx) {
  // Cache API: stats change rarely, cache 10 min
  const cache = caches.default;
  const cacheKey = new Request('https://cache.local/api/knowledge-stats');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const entries = await loadEntriesFromAssets(env);
  const domains = {};
  for (const e of entries) {
    const d = e.domain || 'unknown';
    if (!domains[d]) domains[d] = { count: 0, samples: [] };
    domains[d].count++;
    if (domains[d].samples.length < 3) {
      domains[d].samples.push(e.name || e.title || e.id);
    }
  }
  const domainList = Object.entries(domains)
    .map(([domain, info]) => ({ domain, count: info.count, samples: info.samples }))
    .sort((a, b) => b.count - a.count);
  const resp = jsonResponse({
    total_entries: entries.length,
    total_domains: domainList.length,
    domains: domainList,
    updated: new Date().toISOString(),
  });
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set('Cache-Control', 'public, max-age=600, s-maxage=1800');
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}

// ============================================================
//  Main entry point
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Layer 0: WeChat domain verification files（7.31 23:30 小鱼儿代修 + fengsheng 项 + 严格 text/plain 兜底 + 404 兜底·P0 雷修复 #2/2）
    if (path.startsWith('/MP_verify_') && path.endsWith('.txt')) {
      const VERIFY_CONTENT = {
        '/MP_verify_810e0353e61ef284cb3a1e8f74a20476.txt': '810e0353e61ef284cb3a1e8f74a20476',
        '/MP_verify_fengsheng.txt': 'fengsheng',
      };
      const content = VERIFY_CONTENT[path];
      if (content) {
        return new Response(content, {
          status: 200,
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
        });
      }
      try {
        const assetResp = await env.ASSETS.fetch(request);
        const contentType = assetResp.headers.get('Content-Type') || '';
        // 严格兜底：只接受 text/plain，不要 SPA fallback HTML（修复 48144B 矛盾）
        if (assetResp.status === 200 && contentType.startsWith('text/plain')) {
          const text = await assetResp.text();
          return new Response(text, {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) { /* fall through */ }
      // 兜底失败 → 返回 404（不要 fall through 到 SPA fallback）
      return new Response('Verify file not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Layer 0.5: API paths bypass UA/bot detection
    const isAPIPath = path.startsWith('/api/') || path.startsWith('/mentor-api/');
    const isIpDesignApi = path === '/ip-design' && (request.method === 'POST' || request.method === 'OPTIONS');

    // Layer 1: IP Ban Check
    const clientIP = getClientIP(request);
    if (isBanned(clientIP)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Banned': 'true' } });
    }

    // Layer 2: Global Rate Limiting
    if (!checkGlobalRateLimit(request)) {
      return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
    }

    // Layer 3: Malicious UA Blocking (skip for API paths)
    const ua = request.headers.get('User-Agent') || '';
    if (!isAPIPath && !isIpDesignApi && isMaliciousUA(ua)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'ua' } });
    }

    // Layer 4: AI Scraper Blocking (skip for API paths)
    if (!isAPIPath && !isIpDesignApi && isAIScraper(ua)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'ai-scraper' } });
    }

    // Layer 5: Exploit Path Detection (skip for API paths)
    if (!isAPIPath && isExploitPath(path)) {
      banIP(clientIP);
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'exploit-path' } });
    }

    // Layer 6: Honeypot Trap
    if (!isAPIPath && isHoneypotPath(path)) {
      banIP(clientIP);
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'honeypot' } });
    }

    // Layer 7: Suspicious Query String
    if (isSuspiciousQueryString(url.search)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'suspicious-query' } });
    }

    // API rate limiting
    if (isAPIPath || isIpDesignApi) {
      if (!checkRateLimit(request)) {
        return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
      }
    }

    // Body size check
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');
    if (contentLength > MAX_PAYLOAD_SIZE && (isAPIPath || isIpDesignApi)) {
      return jsonResponse({ error: '请求体过大' }, 413);
    }

    // Resolve BOT_ID from env
    const resolvedBotId = env.FS_BOT_ID || BOT_ID_PLACEHOLDER;

    // CORS preflight for API routes
    if (request.method === 'OPTIONS' && (isAPIPath || isIpDesignApi)) {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Orphaned pages redirect
    const orphanedPaths = ['/guide/', '/mini-program/', '/knowledge-v3-fourpillars/'];
    for (const orphanPath of orphanedPaths) {
      if (path === orphanPath || path.startsWith(orphanPath)) {
        return Response.redirect('https://fengsheng.tech/', 301);
      }
    }

    // IP Design POST (before trailing-slash redirect)
    if (path === '/ip-design' && request.method === 'POST') {
      return handleIpDesign(request, env);
    }

    // Trailing-slash redirects
    const trailingSlashRedirects = ['/knowledge', '/mentor', '/ip-design', '/reply', '/assessment', '/breeder', '/s1-report', '/partner', '/care-test', '/quality-test'];
    if (trailingSlashRedirects.includes(path)) {
      return Response.redirect(`https://fengsheng.tech${path}/`, 301);
    }

    // ===== API Routes =====

    // Health check
    if (path === '/api/health' || path === '/mentor-api/health') {
      return handleStatsHealth(request, env);
    }

    // WeChat login
    if (path === '/api/auth/wx-login' && request.method === 'POST') {
      return handleWxLogin(request, env);
    }

    // Mentor chat (authenticated + anonymous)
    if (path === '/mentor-api/chat' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      let openid = null;
      if (token) {
        const payload = await verifyToken(token, env);
        if (payload) openid = payload.openid;
      }
      if (!openid) {
        const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
        const uaStr = request.headers.get('User-Agent') || '';
        openid = 'web_' + await simpleHash(ip + uaStr);
      }
      return handleChat(request, env, openid, resolvedBotId);
    }

    // Legacy /api/chat
    if (path === '/api/chat') {
      if (request.method === 'GET') return jsonResponse({ ok: true, bot_id: 'pending', hint: 'POST with message' });
      if (request.method === 'POST') return handleChat(request, env, null, resolvedBotId);
    }

    // Event tracking
    if (path === '/api/event') {
      if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
      return handleEvent(request, env);
    }

    // Stats
    if (path === '/api/stats') return handleStats(request, env);
    if (path === '/api/stats/summary') return handleStatsSummary(request, env);
    if (path === '/api/stats/daily') return handleStatsDaily(request, env);
    if (path === '/api/stats/health') return handleStatsHealth(request, env);

    // Feedback
    if (path === '/api/feedback') {
      if (request.method !== 'POST') return jsonResponse({ ok: true, hint: 'POST to submit feedback' });
      return handleFeedback(request, env);
    }
    if (path === '/api/feedback-external') return handleFeedbackExternal(request, env);

    // Decode (六步解码)
    if (path === '/api/decode') return handleDecode(request, 1);
    if (path === '/api/decode/v2') return handleDecode(request, 2);

    // Assess (评估)
    if (path === '/api/assess') return handleAssess(request);

    // Callback
    if (path === '/api/callback') return handleCallback(request);

    // Daily check-in
    if (path === '/api/daily') return handleDaily(request);

    // Verify
    if (path === '/api/verify') return handleVerify(request);

    // Admin agents
    if (path === '/api/admin/agents') return handleAdminAgents(request);

    // Partner intent
    if (path === '/api/partner-intent') return handlePartnerIntent(request, env);

    // IP design (GET endpoint)
    if (path === '/api/ip-design') return handleIpDesign(request, env);

    // Knowledge base entries (issue #210)
    if (path === '/api/entries') return handleEntries(request, env, ctx);
    if (path === '/api/knowledge-stats') return handleKnowledgeStats(request, env, ctx);

    // wx-login alias (issue #210: /api/wx-login → /api/auth/wx-login)
    if (path === '/api/wx-login' && request.method === 'POST') {
      return handleWxLogin(request, env);
    }

    // ===== Mentor Payment Routes =====

    if (path === '/mentor-api/payment/init' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { user_id, amount, product } = body;
        if (!user_id) return jsonResponse({ error: '缺少参数 user_id' }, 400);
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0 || amountNum > 9999) return jsonResponse({ error: '无效的金额' }, 400);
        const validProducts = ['mentor_unlock', 'mentor_monthly', 'generic'];
        if (!validProducts.includes(product)) return jsonResponse({ error: '无效的商品标识' }, 400);
        const outTradeNo = 'FS' + Date.now() + Math.random().toString(36).slice(2, 8);
        const subject = product === 'mentor_unlock' ? '开单导师解锁' : '风声服务';
        const notifyUrl = `${getBaseUrl(request)}/mentor-api/payment/notify`;
        const alipayResp = await fetch('https://api.alipay.com/gateway.do', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            service: 'alipay.trade.precreate',
            partner: env.ALIPAY_PARTNER || '',
            seller_id: env.ALIPAY_SELLER_ID || '',
            out_trade_no: outTradeNo,
            total_amount: amount,
            subject: subject,
            notify_url: notifyUrl,
            app_key: env.ALIPAY_APP_ID || '',
          }).toString()
        });
        const alipayData = await alipayResp.json();
        const qrCode = alipayData?.alipay_trade_precreate_response?.qr_code;
        if (!qrCode) {
          console.error('Alipay precreate failed:', JSON.stringify(alipayData));
          return jsonResponse({ error: '支付码生成失败', detail: alipayData?.error_response?.sub_msg || '未知错误' }, 500);
        }
        const orderData = { out_trade_no: outTradeNo, user_id, amount, product, status: 'pending', created_at: Date.now() };
        if (env.PAYMENT_ORDERS) await env.PAYMENT_ORDERS.put(outTradeNo, JSON.stringify(orderData));
        return jsonResponse({
          out_trade_no: outTradeNo, qr_code: qrCode,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode)}`,
          expires_in: 300,
        });
      } catch (err) {
        console.error('Payment init error:', err);
        return jsonResponse({ error: '支付初始化失败: ' + err.message }, 500);
      }
    }

    if (path.startsWith('/mentor-api/payment/check') && request.method === 'GET') {
      try {
        const outTradeNo = url.searchParams.get('out_trade_no');
        if (!outTradeNo) return jsonResponse({ error: '缺少订单号' }, 400);
        const alipayResp = await fetch('https://api.alipay.com/gateway.do', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            service: 'alipay.trade.query',
            partner: env.ALIPAY_PARTNER || '',
            out_trade_no: outTradeNo,
            app_key: env.ALIPAY_APP_ID || '',
          }).toString()
        });
        const data = await alipayResp.json();
        const tradeStatus = data?.alipay_trade_query_response?.trade_status;
        const paid = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED';
        return jsonResponse({ out_trade_no: outTradeNo, paid, trade_status: tradeStatus || 'UNKNOWN' });
      } catch (err) {
        console.error('Payment check error:', err);
        return jsonResponse({ error: '查询失败: ' + err.message }, 500);
      }
    }

    if (path === '/mentor-api/payment/notify' && request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || '';
        let params;
        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('text/plain')) {
          const text = await request.text();
          params = Object.fromEntries(new URLSearchParams(text).entries());
        } else {
          params = await request.json();
        }
        const { out_trade_no, trade_status, trade_no, buyer_logon_id, buyer_pay_amount } = params;
        if (!out_trade_no) return new Response('fail', { status: 400 });
        if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
          if (env.PAYMENT_ORDERS) {
            const orderStr = await env.PAYMENT_ORDERS.get(out_trade_no);
            if (orderStr) {
              const order = JSON.parse(orderStr);
              if (order.status !== 'paid') {
                order.status = 'paid';
                order.trade_no = trade_no;
                order.paid_at = Date.now();
                if (buyer_pay_amount) order.paid_amount = parseFloat(buyer_pay_amount);
                if (buyer_logon_id) order.buyer = buyer_logon_id.slice(0, 8) + '***';
                await env.PAYMENT_ORDERS.put(out_trade_no, JSON.stringify(order));
                console.log(`Payment success: ${out_trade_no}, paid: ${buyer_pay_amount || 'unknown'}`);
              }
            }
          }
        }
        return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
      } catch (err) {
        console.error('Payment notify error:', err);
        return new Response('fail', { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    // Catch-all: unmatched /api/* paths → JSON 404 (not SPA HTML)
    if (isAPIPath) {
      return jsonResponse({ error: 'Not found', path }, 404);
    }

    // Block direct access to large data files — use API endpoints instead
    if (path === '/data/entries.json') {
      return jsonResponse({
        error: 'Direct file access forbidden',
        hint: 'Use /api/entries?limit=50&offset=0 for paginated results',
        docs: 'Use /api/knowledge-stats for domain statistics',
      }, 403);
    }

    // All other requests → static assets (with security headers)
    const assetResp = await env.ASSETS.fetch(request);
    // Fix: return proper 404 for non-existent paths (not SPA 200 fallback)
    if (assetResp.status === 404) {
      const notFoundHtml = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 · 页面不存在</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}h1{font-size:48px;margin:0}p{color:#94a3b8}a{color:#60a5fa}</style></head><body><div style="text-align:center"><h1>404</h1><p>页面不存在</p><a href="/">← 返回首页</a></div></body></html>';
      return applySecurityHeaders(new Response(notFoundHtml, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      }), true);
    }
    const contentType = assetResp.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');
    return applySecurityHeaders(assetResp, isHtml);
  },
};
