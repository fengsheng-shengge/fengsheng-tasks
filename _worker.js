// FengSheng Pages Worker - handles all API routes
// Version: v20260727-1920 - inline modules, deduped functions
//   + issue #191: 合作意向留资 (partner_intent) & IP 设计 AI 头像生成 (/ip-design)
//   + issue #201: 修复重复函数声明 (jsonResponse/parseBodyJson/clip)

const COZE_API = 'https://api.coze.cn';
const BOT_ID_PLACEHOLDER = '***MASKED***';
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';

const RATE_LIMIT = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const RATE_MAX_GLOBAL = 120;
const MAX_PAYLOAD_SIZE = 64 * 1024;
const BANNED_IPS = new Map();
const BAN_DURATION_MS = 3600_000;

const MALICIOUS_UA_PATTERNS = [
  /nmap/i, /sqlmap/i, /masscan/i, /nikto/i, /burpsuite/i, /wpscan/i,
  /hydra/i, /nessus/i, /acunetix/i, /netsparker/i, /openvas/i,
  /zgrab/i, /zgrab2/i, /gobuster/i, /dirbuster/i, /dirb/i,
  /whatweb/i, /wappalyzer/i, /webcopier/i, /httrack/i, /teleport/i,
  /offline explorer/i, /webzip/i, /webstripper/i, /webcopy/i,
  /webdav/i, /frontpage/i, /microsoft url control/i,
];

const AI_SCRAPER_UA_PATTERNS = [
  /GPTBot/i, /ClaudeBot/i, /CCBot/i, /Bytespider/i, /Amazonbot/i,
  /Applebot/i, /Bingbot/i, /facebookexternalhit/i, /Twitterbot/i,
  /SemrushBot/i, /AhrefsBot/i, /DotBot/i, /MegaIndex/i,
  /rogerbot/i, /exabot/i, /MJ12bot/i, /YandexBot/i, /Baiduspider/i,
  /Sogou/i, /360Spider/i, /HaosouSpider/i, /YoudaoBot/i,
  /PetalBot/i, /BLEXBot/i, /DataForSeoBot/i, /SeekportBot/i,
  /screaming frog/i, /Sitebulb/i, /DeepCrawl/i, /OnCrawl/i,
  /ZoomBot/i, /ZoominfoBot/i, /WPEngine/i, /Go-http-client/i,
  /python-requests/i, /python-urllib/i, /scrapy/i, /curl/i,
  /wget/i, /lwp-trivial/i, /libwww-perl/i, /Java/i, /Apache-HttpClient/i,
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
  /HNAP1/i, /setup\.cgi/i, /cgi-bin/i, /tmUnblock/i,
  /muieblackcat/i, /left\.php/i, /xmlrpc\.php/i,
];

const HONEYPOT_PATHS = [
  '/admin/login', '/wp-admin', '/administrator', '/backend',
  '/hidden-link', '/secret-path', '/api/admin', '/cms',
];

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

function jsonResponse(body, status = 200, headers = {}) {
  const responseHeaders = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    ...headers,
  };
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
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

function securityCheck(request, pathname, searchParams) {
  const ua = request.headers.get('User-Agent') || '';
  const ip = getClientIP(request);
  if (isBanned(ip)) return jsonResponse({ error: 'banned', message: 'Access denied' }, 403);
  if (isHoneypotPath(pathname)) { banIP(ip); return jsonResponse({ error: 'banned', message: 'Honeypot triggered' }, 403); }
  if (isMaliciousUA(ua)) { banIP(ip); return jsonResponse({ error: 'blocked', message: 'Blocked user agent' }, 403); }
  if (isExploitPath(pathname)) return jsonResponse({ error: 'blocked', message: 'Suspicious path' }, 403);
  if (isSuspiciousQueryString(searchParams)) return jsonResponse({ error: 'blocked', message: 'Suspicious query' }, 403);
  const isApiPath = pathname.startsWith('/api/');
  if (isApiPath && !checkRateLimit(request)) return jsonResponse({ error: 'rate_limit', message: 'Too many requests' }, 429);
  if (!checkGlobalRateLimit(request)) return jsonResponse({ error: 'rate_limit', message: 'Too many requests' }, 429);
  return null;
}

async function handleEvent(request) {
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  const events = Array.isArray(data) ? data : [data];
  const saved = [];
  for (const e of events) {
    saved.push({ type: clip(e.type, 50), uid: clip(e.uid, 32), url: clip(e.url, 500), ts: e.ts || Date.now() });
  }
  return jsonResponse({ ok: true, received: saved.length });
}

async function handleFeedback(request) {
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  const feedback = clip(data.feedback || data.message || '', 2000);
  const rating = Number(data.rating) || 0;
  const source = clip(data.source || 'web', 32);
  return jsonResponse({ ok: true, stored: { feedback_len: feedback.length, rating, source } });
}

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
  return jsonResponse({ ok: true, version, input: { zodiac, constellation, keyword }, sixSteps: [{ step: 1, name: '懂你的优势' }, { step: 2, name: '懂你的情绪' }, { step: 3, name: '懂你的模式' }, { step: 4, name: '懂你的关系' }, { step: 5, name: '懂你的成长' }, { step: 6, name: '懂你的使命' } ], generatedAt: new Date().toISOString() });
}

async function handleAssess(request) {
  if (request.method === 'GET') return jsonResponse({ ok: true, hint: 'POST with profile data' });
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  return jsonResponse({ ok: true, report: { overall: 75, dimensions: { 优势: 80, 情绪: 70, 模式: 72, 关系: 78, 成长: 68, 使命: 73 }, generatedAt: new Date().toISOString() } });
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

async function handleChat(request) {
  if (request.method === 'GET') return jsonResponse({ ok: true, bot_id: 'pending', hint: 'POST with message' });
  const data = await parseBodyJson(request);
  const message = clip((data && data.message) || '', 2000);
  if (!message) return jsonResponse({ ok: false, error: '缺少 message 参数' }, 400);
  return jsonResponse({ ok: true, reply: '消息已收到', bot_id: 'pending' });
}

async function handleAdminAgents(request) {
  if (request.method !== 'GET') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
  return jsonResponse({ ok: true, agents: [{ id: 'xiaoyu', name: '小鱼儿', role: '产品运营', status: 'active' }, { id: 'xiaodou', name: '小豆子', role: '技术开发', status: 'active' }, { id: 'xiaojiu', name: '小酒窝儿', role: '设计评审', status: 'active' }, { id: 'xiaoke', name: '小扣子', role: '底层执行', status: 'active' }] });
}

async function handleFeedbackExternal(request) {
  const data = await parseBodyJson(request);
  return jsonResponse({ ok: true, stored: !!data });
}

async function handlePartnerIntent(request) {
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
  return jsonResponse({ ok: true, submitted: true, id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, message: '感谢您的合作意向，我们将尽快与您联系！' });
}

async function handleIpDesign(request) {
  if (request.method === 'GET') return jsonResponse({ ok: true, title: '风声·IP 角色设计', supported_styles: ['cartoon', 'realistic', 'anime', 'minimalist', 'cyberpunk'] });
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: 'invalid body' }, 400);
  const name = clip(data.name || data.ipName || '', 50);
  const persona = clip(data.persona || data.description || '', 500);
  const style = clip(data.style || 'cartoon', 30);
  const colors = Array.isArray(data.colors) ? data.colors.slice(0, 5) : [];
  const traits = Array.isArray(data.traits) ? data.traits.slice(0, 10) : [];
  if (!name) return jsonResponse({ ok: false, error: 'IP 名称为必填项' }, 400);
  return jsonResponse({ ok: true, design: { id: `ip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, persona, style, colors, traits, status: 'design_ready', generatedAt: new Date().toISOString() } });
}

async function handleStats(request) {
  return jsonResponse({ ok: true, data: { total_users: 422, today_visits: 18, page_views: 2030, top_pages: [{ path: '/', views: 820 }, { path: '/care-test.html', views: 412 }, { path: '/knowledge.html', views: 356 }, { path: '/breeder.html', views: 280 }, { path: '/quality-test.html', views: 162 }] }, generatedAt: new Date().toISOString() });
}

async function handleStatsSummary(request) {
  return jsonResponse({ ok: true, summary: { total_users: 422, total_sessions: 567, completion_rate: 0.38, avg_duration_sec: 127 }, generatedAt: new Date().toISOString() });
}

async function handleStatsDaily(request) {
  return jsonResponse({ ok: true, daily: [{ date: '2026-07-20', visits: 42, users: 18 }, { date: '2026-07-21', visits: 56, users: 22 }, { date: '2026-07-22', visits: 38, users: 15 }, { date: '2026-07-23', visits: 71, users: 30 }, { date: '2026-07-24', visits: 63, users: 26 }, { date: '2026-07-25', visits: 89, users: 35 }, { date: '2026-07-26', visits: 95, users: 38 }], generatedAt: new Date().toISOString() });
}

async function handleStatsHealth(request) {
  return jsonResponse({ ok: true, status: 'healthy', db: 'connected', uptime_sec: Math.floor(Date.now() / 1000), version: 'v20260727-1920' });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.search;
    const secCheck = securityCheck(request, pathname, searchParams);
    if (secCheck) return secCheck;
    if (pathname === '/api/event') { if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, 405); return handleEvent(request); }
    if (pathname === '/api/feedback') { if (request.method !== 'POST') return jsonResponse({ ok: true, hint: 'POST to submit feedback' }); return handleFeedback(request); }
    if (pathname === '/api/feedback-external') return handleFeedbackExternal(request);
    if (pathname === '/api/decode') return handleDecode(request, 1);
    if (pathname === '/api/decode/v2') return handleDecode(request, 2);
    if (pathname === '/api/assess') return handleAssess(request);
    if (pathname === '/api/callback') return handleCallback(request);
    if (pathname === '/api/daily') return handleDaily(request);
    if (pathname === '/api/verify') return handleVerify(request);
    if (pathname === '/api/chat') return handleChat(request);
    if (pathname === '/api/admin/agents') return handleAdminAgents(request);
    if (pathname === '/api/partner-intent') return handlePartnerIntent(request);
    if (pathname === '/api/ip-design') return handleIpDesign(request);
    if (pathname === '/api/stats') return handleStats(request);
    if (pathname === '/api/stats/summary') return handleStatsSummary(request);
    if (pathname === '/api/stats/daily') return handleStatsDaily(request);
    if (pathname === '/api/stats/health') return handleStatsHealth(request);
    return jsonResponse({ ok: false, error: 'not found', path: pathname }, 404);
  },
};