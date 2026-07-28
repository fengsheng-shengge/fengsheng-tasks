// FengSheng Pages Worker - handles all API routes
// Version: v20260720-1600 - anti-bot + anti-crawling defense
//   + issue #191: 合作意向留资 (partner_intent) & IP 设计 AI 头像生成 (/ip-design)

// 模块化业务处理 (api/ 目录, 由 Workerd 模块加载器解析相对 ESM 导入)
const COZE_API = 'https://api.coze.cn';
const BOT_ID_PLACEHOLDER = '***MASKED***'; // Bot ID from env var FS_BOT_ID，禁止硬编码
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';

// ============================================================
//  Rate limiting — simple in-memory sliding window (resets on Worker cold start)
// ============================================================
const RATE_LIMIT = new Map();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_REQUESTS = 30;   // 30 req/min per IP (API routes)
const RATE_MAX_GLOBAL = 120;     // 120 req/min per IP (all routes)
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64KB max request body

// Banned IPs (honeypot triggers, known abusers) — in-memory, cold start resets
const BANNED_IPS = new Map();
const BAN_DURATION_MS = 3600_000; // 1 hour ban

// ============================================================
//  Bot detection — User-Agent patterns
// ============================================================

// Malicious tool / scanner UAs — block outright
const MALICIOUS_UA_PATTERNS = [
  /nmap/i, /sqlmap/i, /masscan/i, /nikto/i, /burpsuite/i, /wpscan/i,
  /hydra/i, /nessus/i, /acunetix/i, /netsparker/i, /openvas/i,
  /zgrab/i, /zgrab2/i, /gobuster/i, /dirbuster/i, /dirb/i,
  /whatweb/i, /wappalyzer/i, /webcopier/i, /httrack/i, /teleport/i,
  /offline explorer/i, /webzip/i, /webstripper/i, /webcopy/i,
  /webdav/i, /frontpage/i, /microsoft url control/i,
];

// AI scrapers that ignore robots.txt — block at network level
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

// Invalid / missing UA — likely bots
const MISSING_UA_PATTERNS = [/^$/, /^-$/, /^unknown$/, /^null$/i, /^undefined$/i];

// ============================================================
//  Suspicious path patterns — exploit probes
// ============================================================
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

// Honeypot paths — if a bot follows these hidden links, ban the IP
const HONEYPOT_PATHS = [
  '/admin/login', '/wp-admin', '/administrator', '/backend',
  '/hidden-link', '/secret-path', '/api/admin', '/cms',
];

// ============================================================
//  Helper functions
// ============================================================

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || '0.0.0.0';
}

function isBanned(ip) {
  const entry = BANNED_IPS.get(ip);
  if (entry && Date.now() - entry < BAN_DURATION_MS) {
    return true;
  }
  if (entry) BANNED_IPS.delete(ip); // expired
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
    if (entry.count >= RATE_MAX_REQUESTS) {
      return false;
    }
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
    if (entry.count >= RATE_MAX_GLOBAL) {
      return false;
    }
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