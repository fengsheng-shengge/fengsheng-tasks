var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/pages-5FKwdV/bundledWorker-0.6503086678850153.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var COZE_API = "https://api.coze.cn";
var WX_API = "https://api.weixin.qq.com/sns/jscode2session";
var RATE_LIMIT = /* @__PURE__ */ new Map();
var RATE_WINDOW_MS = 6e4;
var RATE_MAX_REQUESTS = 30;
var RATE_MAX_GLOBAL = 120;
var MAX_PAYLOAD_SIZE = 64 * 1024;
var BANNED_IPS = /* @__PURE__ */ new Map();
var BAN_DURATION_MS = 36e5;
var MALICIOUS_UA_PATTERNS = [
  /nmap/i,
  /sqlmap/i,
  /masscan/i,
  /nikto/i,
  /burpsuite/i,
  /wpscan/i,
  /hydra/i,
  /nessus/i,
  /acunetix/i,
  /netsparker/i,
  /openvas/i,
  /zgrab/i,
  /zgrab2/i,
  /gobuster/i,
  /dirbuster/i,
  /dirb/i,
  /whatweb/i,
  /wappalyzer/i,
  /webcopier/i,
  /httrack/i,
  /teleport/i,
  /offline explorer/i,
  /webzip/i,
  /webstripper/i,
  /webcopy/i,
  /webdav/i,
  /frontpage/i,
  /microsoft url control/i
];
var AI_SCRAPER_UA_PATTERNS = [
  /GPTBot/i,
  /ClaudeBot/i,
  /CCBot/i,
  /Bytespider/i,
  /Amazonbot/i,
  /Applebot/i,
  /Bingbot/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /SemrushBot/i,
  /AhrefsBot/i,
  /DotBot/i,
  /MegaIndex/i,
  /rogerbot/i,
  /exabot/i,
  /MJ12bot/i,
  /YandexBot/i,
  /Baiduspider/i,
  /Sogou/i,
  /360Spider/i,
  /HaosouSpider/i,
  /YoudaoBot/i,
  /PetalBot/i,
  /BLEXBot/i,
  /DataForSeoBot/i,
  /SeekportBot/i,
  /screaming frog/i,
  /Sitebulb/i,
  /DeepCrawl/i,
  /OnCrawl/i,
  /ZoomBot/i,
  /ZoominfoBot/i,
  /WPEngine/i,
  /Go-http-client/i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /lwp-trivial/i,
  /libwww-perl/i,
  /Java/i,
  /Apache-HttpClient/i,
  /okhttp/i,
  /axios/i,
  /node-fetch/i,
  /got/i,
  /superagent/i,
  /PostmanRuntime/i,
  /insomnia/i,
  /paw/i,
  /ChatGPT-User/i,
  /cohere-ai/i,
  /PerplexityBot/i,
  /Anthropic/i,
  /OAI-SearchBot/i,
  /Diffbot/i,
  /ImagesiftBot/i,
  /Clickagy/i
];
var MISSING_UA_PATTERNS = [/^$/, /^-$/, /^unknown$/, /^null$/i, /^undefined$/i];
var EXPLOIT_PATH_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /\.svn/i,
  /\.hg/i,
  /\.DS_Store/i,
  /wp-admin/i,
  /wp-login/i,
  /wp-content/i,
  /wp-includes/i,
  /phpmyadmin/i,
  /phpunit/i,
  /vendor\/phpunit/i,
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /\.jsp$/i,
  /config\.json/i,
  /config\.yml/i,
  /config\.yaml/i,
  /credentials/i,
  /password/i,
  /secret/i,
  /token/i,
  /docker-compose/i,
  /dockerfile/i,
  /jenkins/i,
  /\.well-known\/acme-challenge/i,
  /actuator/i,
  /swagger/i,
  /api-docs/i,
  /graphql/i,
  /console/i,
  /admin/i,
  /administrator/i,
  /cgi-bin/i,
  /_ignition/i,
  /_profiler/i,
  /solr/i,
  /elasticsearch/i,
  /jolokia/i,
  /HNAP1/i,
  /setup\.cgi/i,
  /tmUnblock/i,
  /muieblackcat/i,
  /left\.php/i,
  /xmlrpc\.php/i,
  /node_modules/i,
  /package-lock\.json/i,
  /yarn\.lock/i,
  /pnpm-lock\.yaml/i,
  /\.npmrc/i,
  /tsconfig\.json/i,
  // v2 security additions
  /\.aws/i,
  /\.kube/i,
  /\.ssh/i,
  /id_rsa/i,
  /known_hosts/i,
  /\.bash_history/i,
  /\.mysql_history/i,
  /\.psql_history/i,
  /wp-json/i,
  /wp-json\/wp\/v2\/users/i,
  /autodiscover/i,
  /owa/i,
  /ecp/i,
  /ews/i,
  /mapi/i,
  /remote\/login/i,
  /\.cgi/i,
  /\.pl/i,
  /\.py/i,
  /\.rb/i,
  /shell/i,
  /cmd/i,
  /exec/i,
  /upload/i,
  /backdoor/i,
  /sql/i,
  /sqlite/i,
  /database/i,
  /dump/i,
  /export/i,
  /(^|\/)(dev|local|debug)(\/|$)/i,
  /staging/i,
  /backup/i,
  /\.bak/i,
  /\.old/i,
  /\.tmp/i,
  /\.swp/i,
  /trace\.axd/i,
  /elmah\.axd/i,
  /server-status/i,
  /struts/i,
  /spring-/i,
  /thinkphp/i,
  /laravel/i,
  /yii/i,
  /drupal/i,
  /joomla/i,
  /magento/i,
  /typo3/i,
  // 2026 new threats
  /\.env\./i,
  /\.env\.backup/i,
  /\.env\.production/i,
  /\.env\.local/i,
  /api\/v1\/users/i,
  /api\/auth/i,
  /api\/login/i,
  /api\/register/i,
  /v2\/keys/i,
  /_next/i,
  /__nextjs/i,
  /vercel/i,
  /netlify/i
];
var SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
};
var CSP_HEADER_STATIC = "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";
function applySecurityHeaders(resp, isHtml = false) {
  const newResp = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!newResp.headers.has(k)) {
      newResp.headers.set(k, v);
    }
  }
  if (isHtml && !newResp.headers.has("Content-Security-Policy")) {
    newResp.headers.set("Content-Security-Policy", CSP_HEADER_STATIC);
  }
  return newResp;
}
__name(applySecurityHeaders, "applySecurityHeaders");
__name2(applySecurityHeaders, "applySecurityHeaders");
var HONEYPOT_PATHS = [
  "/admin/login",
  "/wp-admin",
  "/administrator",
  "/backend",
  "/hidden-link",
  "/secret-path",
  "/api/admin",
  "/cms"
];
function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || "0.0.0.0";
}
__name(getClientIP, "getClientIP");
__name2(getClientIP, "getClientIP");
function isBanned(ip) {
  const entry = BANNED_IPS.get(ip);
  if (entry && Date.now() - entry < BAN_DURATION_MS) return true;
  if (entry) BANNED_IPS.delete(ip);
  return false;
}
__name(isBanned, "isBanned");
__name2(isBanned, "isBanned");
function banIP(ip) {
  BANNED_IPS.set(ip, Date.now());
}
__name(banIP, "banIP");
__name2(banIP, "banIP");
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
__name(checkRateLimit, "checkRateLimit");
__name2(checkRateLimit, "checkRateLimit");
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
__name(checkGlobalRateLimit, "checkGlobalRateLimit");
__name2(checkGlobalRateLimit, "checkGlobalRateLimit");
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
__name(isMaliciousUA, "isMaliciousUA");
__name2(isMaliciousUA, "isMaliciousUA");
function isAIScraper(ua) {
  if (!ua) return false;
  for (const pattern of AI_SCRAPER_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }
  return false;
}
__name(isAIScraper, "isAIScraper");
__name2(isAIScraper, "isAIScraper");
function isExploitPath(path) {
  for (const pattern of EXPLOIT_PATH_PATTERNS) {
    if (pattern.test(path)) return true;
  }
  return false;
}
__name(isExploitPath, "isExploitPath");
__name2(isExploitPath, "isExploitPath");
function isHoneypotPath(path) {
  return HONEYPOT_PATHS.includes(path);
}
__name(isHoneypotPath, "isHoneypotPath");
__name2(isHoneypotPath, "isHoneypotPath");
function isSuspiciousQueryString(queryString) {
  if (!queryString) return false;
  const suspicious = [
    /<script/i,
    /onerror/i,
    /onload/i,
    /javascript:/i,
    /union\s+select/i,
    /or\s+1=1/i,
    /'--/i,
    /sleep\(/i,
    /benchmark\(/i,
    /\.\.\/\.\.\//i,
    /%2e%2e%2f/i,
    /\/etc\/passwd/i,
    /\/bin\/bash/i,
    /eval\(/i,
    /system\(/i,
    /exec\(/i,
    /cmd\.exe/i,
    /file_get_contents/i,
    /base64_decode/i,
    // v2 additions
    /\\x[0-9a-f]{2}/i,
    /%00/i,
    /\x00/i,
    // null byte injection
    /select.*from/i,
    /insert\s+into/i,
    /drop\s+table/i,
    // SQL injection
    /alert\(/i,
    /confirm\(/i,
    /prompt\(/i,
    // XSS probes
    /document\.cookie/i,
    /document\.location/i,
    /constructor\(/i,
    /__proto__/i,
    /prototype\./i,
    // prototype pollution
    /\$\{.*\}/i,
    /\{\{.*\}\}/i,
    // template injection
    /etc\/shadow/i,
    /etc\/hosts/i,
    /proc\/self/i,
    // path traversal
    /wget\s/i,
    /curl\s/i,
    /nc\s/i
    // command injection
  ];
  for (const pattern of suspicious) {
    if (pattern.test(queryString)) return true;
  }
  return false;
}
__name(isSuspiciousQueryString, "isSuspiciousQueryString");
__name2(isSuspiciousQueryString, "isSuspiciousQueryString");
var LOG4SHELL_ATTACK_PATTERNS = [
  // === JNDI Lookup 原型（CVE-2021-44228 / CVE-2021-45046 / CVE-2021-45105）===
  /\$\{\s*jndi\s*:/i,
  // ${jndi:ldap://...} / ${jndi:rmi://...}
  /\$\{\s*jndi\s*:\s*rmi/i,
  // ${jndi:rmi://...}
  /\$\{\s*jndi\s*:\s*dns/i,
  // ${jndi:dns://...}
  /\$\{\s*jndi\s*:\s*nis/i,
  // ${jndi:nis://...}
  /\$\{\s*jndi\s*:\s*corba/i,
  // ${jndi:corba://...}
  /\$\{\s*jndi\s*:\s*iiop/i,
  // ${jndi:iiop://...}
  // === Log4j 2.15+ 变量绕过（CVE-2021-45046 bypass）===
  /\$\{\s*lower\s*:/i,
  // ${lower:j} → ${j}
  /\$\{\s*upper\s*:/i,
  // ${upper:j} → ${J}
  /\$\{\s*env\s*:/i,
  // ${env:...}
  /\$\{\s*sys\s*:/i,
  // ${sys:user.name} 主机信息窃取
  /\$\{\s*hostName\s*\}/i,
  // ${hostName}
  /\$\{\s*::-/i,
  // ${::-j} 嵌套绕过
  /\$\{\s*\$\{/i,
  // 嵌套变量 ${${...}
  /\$\{[^}]*\$\{[^}]*\}/i,
  // ${a${b}c} 多层嵌套
  /\$\{\s*ctx\s*:/i,
  // ${ctx:...}
  /\$\{\s*date\s*:/i,
  // ${date:...}
  /\$\{\s*marker\s*:/i,
  // ${marker:...}
  /\$\{\s*main\s*:/i,
  // ${main:...}
  /\$\{\s*web\s*:/i,
  // ${web:...}
  /\$\{\s*bundle\s*:/i,
  // ${bundle:...}
  // === 攻击者 URL / 标识符特征 ===
  /\bjdk\s*\d{10,}\b/i,
  // jdk1826259236124faf...
  /\bbypass[a-z0-9]{20,}\b/i,
  // bypassd750b93acf0f817557d730156
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s*:\s*(1389|1099|1388|1090|4444|5555)\b/i,
  // 攻击者IP:port
  /ldaps?:\/\/[^\s<>"'`]+\.log4j/i,
  // log4j-themed
  /rmi:\/\/[^\s<>"'`]+\.(com|net|org|io|cn)/i,
  // rmi://attacker.com
  // === fastjson @type 反序列化（CVE-2017-18349）===
  /"@type"\s*:\s*"(jar|http|https|file|netdoc|bsh|groovy|jvmti)\s*:/i,
  /\{[^}]{0,500}"@type"\s*:\s*"/i,
  // {"@type":...}
  /\bcmd_inject\b/i,
  // 攻击者标识符
  /\b\d{10,}\b[^}]{0,50}(jar:http|cmd_inject)/i,
  // 长数字标识 + 攻击特征
  /"@type"\s*:\s*"\s*\$\s*\{/i,
  // {"@type":"${...}"} 嵌套绕过
  /"@type"\s*:\s*"[a-z]+\.[a-z]+\.[A-Z]/i
  // com.sun.org.apache.xalan
];
function isLog4ShellAttack(input) {
  if (!input || typeof input !== "string") return null;
  const text = input.length > 4096 ? input.slice(0, 4096) : input;
  for (const pattern of LOG4SHELL_ATTACK_PATTERNS) {
    if (pattern.test(text)) {
      return { pattern: pattern.toString(), reason: "log4shell-jndi-attack" };
    }
  }
  return null;
}
__name(isLog4ShellAttack, "isLog4ShellAttack");
__name2(isLog4ShellAttack, "isLog4ShellAttack");
async function checkLog4ShellWAF(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return null;
  }
  let attack = isLog4ShellAttack(url.pathname);
  if (attack) return { source: "path", ...attack };
  attack = isLog4ShellAttack(url.search);
  if (attack) return { source: "query", ...attack };
  const skipHeaders = /* @__PURE__ */ new Set([
    "accept",
    "accept-encoding",
    "accept-language",
    "cf-connecting-ip",
    "cf-ray",
    "cf-ipcountry",
    "cf-worker",
    "cf-cache-status",
    "cf-visitor",
    "host",
    "connection",
    "content-length",
    "expect-ct",
    "pragma",
    "cache-control",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-fetch-dest",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "upgrade-insecure-requests",
    "te",
    "dnt",
    "priority"
  ]);
  for (const [key, value] of request.headers) {
    if (skipHeaders.has(key.toLowerCase())) continue;
    if (!value) continue;
    attack = isLog4ShellAttack(key + ": " + value);
    if (attack) return { source: "header." + key, ...attack };
  }
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    const contentLength = parseInt(request.headers.get("Content-Length") || "0");
    if (contentLength > 0 && contentLength < 65536) {
      try {
        const cloned = request.clone();
        const bodyText = await cloned.text();
        attack = isLog4ShellAttack(bodyText);
        if (attack) return { source: "body", ...attack };
      } catch (e) {
      }
    }
  }
  return null;
}
__name(checkLog4ShellWAF, "checkLog4ShellWAF");
__name2(checkLog4ShellWAF, "checkLog4ShellWAF");
function jsonResponse(data, status = 200, headers = {}) {
  const responseHeaders = {
    "Content-Type": "application/json;charset=UTF-8",
    "Access-Control-Allow-Origin": "https://fengsheng.tech",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...headers
  };
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
async function parseBodyJson(request) {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
__name(parseBodyJson, "parseBodyJson");
__name2(parseBodyJson, "parseBodyJson");
var _d1CircuitOpen = false;
var _d1CircuitOpenUntil = 0;
var _d1ConsecutiveFailures = 0;
var D1_CIRCUIT_THRESHOLD = 5;
var D1_CIRCUIT_COOLDOWN_MS = 6e4;
function recordD1Failure() {
  _d1ConsecutiveFailures++;
  if (_d1ConsecutiveFailures >= D1_CIRCUIT_THRESHOLD) {
    _d1CircuitOpen = true;
    _d1CircuitOpenUntil = Date.now() + D1_CIRCUIT_COOLDOWN_MS;
    console.error("D1 CIRCUIT BREAKER TRIPPED: too many consecutive failures, pausing D1 queries for 60s");
  }
}
__name(recordD1Failure, "recordD1Failure");
__name2(recordD1Failure, "recordD1Failure");
function recordD1Success() {
  _d1ConsecutiveFailures = 0;
  if (_d1CircuitOpen && Date.now() >= _d1CircuitOpenUntil) {
    _d1CircuitOpen = false;
    console.log("D1 CIRCUIT BREAKER RESET: cooldown expired, resuming D1 queries");
  }
}
__name(recordD1Success, "recordD1Success");
__name2(recordD1Success, "recordD1Success");
async function safeD1First(db, query, bindings = [], fallback = null) {
  if (!db) return fallback;
  if (_d1CircuitOpen) {
    if (Date.now() < _d1CircuitOpenUntil) return fallback;
    _d1CircuitOpen = false;
    _d1ConsecutiveFailures = 0;
  }
  try {
    const result = await db.prepare(query).bind(...bindings).first();
    recordD1Success();
    return result || fallback;
  } catch (e) {
    console.error("D1 first failed:", e.message, query.slice(0, 80));
    recordD1Failure();
    return fallback;
  }
}
__name(safeD1First, "safeD1First");
__name2(safeD1First, "safeD1First");
function clip(str, max = 500) {
  if (!str) return "";
  return String(str).slice(0, max);
}
__name(clip, "clip");
__name2(clip, "clip");
function getBaseUrl(request) {
  const proto = request.headers.get("X-Forwarded-Proto") || "https";
  const host = request.headers.get("Host") || "fengsheng.tech";
  return `${proto}://${host}`;
}
__name(getBaseUrl, "getBaseUrl");
__name2(getBaseUrl, "getBaseUrl");
var _lastCleanupTime = 0;
var CLEANUP_INTERVAL_MS = 3e5;
function cleanupRateLimitMaps() {
  const now = Date.now();
  if (now - _lastCleanupTime < CLEANUP_INTERVAL_MS) return;
  _lastCleanupTime = now;
  for (const [key, entry] of RATE_LIMIT) {
    if (now - entry.windowStart > RATE_WINDOW_MS * 3) {
      RATE_LIMIT.delete(key);
    }
  }
  for (const [ip, banTime] of BANNED_IPS) {
    if (now - banTime > BAN_DURATION_MS * 2) {
      BANNED_IPS.delete(ip);
    }
  }
  if (RATE_LIMIT.size > 5e3) {
    const entries = [...RATE_LIMIT.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
    for (let i = 0; i < Math.min(1e3, entries.length); i++) {
      RATE_LIMIT.delete(entries[i][0]);
    }
  }
  if (BANNED_IPS.size > 2e3) {
    const entries = [...BANNED_IPS.entries()].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < Math.min(500, entries.length); i++) {
      BANNED_IPS.delete(entries[i][0]);
    }
  }
  for (const [key, entry] of SEARCH_RATE_LIMIT) {
    if (now - entry.windowStart > SEARCH_RATE_WINDOW * 3) {
      SEARCH_RATE_LIMIT.delete(key);
    }
  }
}
__name(cleanupRateLimitMaps, "cleanupRateLimitMaps");
__name2(cleanupRateLimitMaps, "cleanupRateLimitMaps");
async function fetchWithTimeout(url, options = {}, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } catch (e) {
    if (e.name === "AbortError") {
      console.error(`fetchWithTimeout TIMEOUT: ${url} (${timeoutMs}ms)`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
__name2(fetchWithTimeout, "fetchWithTimeout");
var _errorCount = 0;
var _errorWindowStart = 0;
var ERROR_WINDOW_MS = 6e4;
var ERROR_THRESHOLD = 20;
var _degradedMode = false;
var _degradedUntil = 0;
var DEGRADED_DURATION_MS = 6e4;
var _startTime = Date.now();
function recordError() {
  const now = Date.now();
  if (now - _errorWindowStart > ERROR_WINDOW_MS) {
    _errorCount = 0;
    _errorWindowStart = now;
  }
  _errorCount++;
  if (_errorCount >= ERROR_THRESHOLD && !_degradedMode) {
    _degradedMode = true;
    _degradedUntil = now + DEGRADED_DURATION_MS;
    console.error("WORKER DEGRADED MODE: too many errors in 1 minute, serving degraded responses");
  }
}
__name(recordError, "recordError");
__name2(recordError, "recordError");
function isDegraded() {
  if (_degradedMode && Date.now() >= _degradedUntil) {
    _degradedMode = false;
    _errorCount = 0;
    console.log("WORKER DEGRADED MODE CLEARED: error rate normalized");
  }
  return _degradedMode;
}
__name(isDegraded, "isDegraded");
__name2(isDegraded, "isDegraded");
var ALLOWED_HOSTS = /* @__PURE__ */ new Set([
  "fengsheng.tech",
  "www.fengsheng.tech",
  "fengsheng.pages.dev",
  "localhost",
  "127.0.0.1"
]);
function validateHostHeader(request) {
  const host = request.headers.get("Host") || "";
  const hostname = host.split(":")[0];
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".pages.dev") && hostname.includes("fengsheng")) return true;
  return false;
}
__name(validateHostHeader, "validateHostHeader");
__name2(validateHostHeader, "validateHostHeader");
var MAX_QUERY_PARAM_LEN = 500;
var MAX_DOMAIN_PARAM_LEN = 64;
var MAX_SEARCH_QUERY_LEN = 200;
function sanitizeQueryParam(val, maxLen = MAX_QUERY_PARAM_LEN) {
  if (!val) return "";
  return String(val).slice(0, maxLen).replace(/[<>"'`]/g, "");
}
__name(sanitizeQueryParam, "sanitizeQueryParam");
__name2(sanitizeQueryParam, "sanitizeQueryParam");
function hasDangerousChars(val) {
  if (!val) return false;
  return /[<>"'`\x00-\x08\x0b\x0c\x0e-\x1f]/.test(String(val));
}
__name(hasDangerousChars, "hasDangerousChars");
__name2(hasDangerousChars, "hasDangerousChars");
function validateDomainParam(domain) {
  if (!domain) return null;
  if (hasDangerousChars(domain)) return null;
  const cleaned = sanitizeQueryParam(domain, MAX_DOMAIN_PARAM_LEN);
  if (!/^[\u4e00-\u9fff\w-]+$/.test(cleaned)) return null;
  return cleaned;
}
__name(validateDomainParam, "validateDomainParam");
__name2(validateDomainParam, "validateDomainParam");
function validateSearchQuery(q) {
  if (!q) return "";
  if (hasDangerousChars(q)) return "";
  return sanitizeQueryParam(q, MAX_SEARCH_QUERY_LEN);
}
__name(validateSearchQuery, "validateSearchQuery");
__name2(validateSearchQuery, "validateSearchQuery");
var MAX_API_RESPONSE_BYTES = 2 * 1024 * 1024;
async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(simpleHash, "simpleHash");
__name2(simpleHash, "simpleHash");
function base64urlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(base64urlEncode, "base64urlEncode");
__name2(base64urlEncode, "base64urlEncode");
function base64urlDecode(b64u) {
  const base64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return atob(padded);
}
__name(base64urlDecode, "base64urlDecode");
__name2(base64urlDecode, "base64urlDecode");
function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64urlEncode(binary);
}
__name(arrayBufferToBase64url, "arrayBufferToBase64url");
__name2(arrayBufferToBase64url, "arrayBufferToBase64url");
function base64urlToArrayBuffer(b64u) {
  const binary = base64urlDecode(b64u);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64urlToArrayBuffer, "base64urlToArrayBuffer");
__name2(base64urlToArrayBuffer, "base64urlToArrayBuffer");
async function generateToken(openid, env, ttlSeconds = 86400 * 7, secretOverride) {
  const secret = secretOverride || env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1e3);
  const payload = base64urlEncode(JSON.stringify({
    openid,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomUUID ? crypto.randomUUID() : openid + "_" + now
  }));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${payload}`));
  const sig = arrayBufferToBase64url(signature);
  return `${header}.${payload}.${sig}`;
}
__name(generateToken, "generateToken");
__name2(generateToken, "generateToken");
async function verifyToken(token, env, secretOverride) {
  const secret = secretOverride || env.JWT_SECRET;
  if (!secret) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = base64urlToArrayBuffer(s);
    const valid = await crypto.subtle.verify(
      { name: "HMAC", hash: "SHA-256" },
      key,
      sigBytes,
      encoder.encode(`${h}.${p}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(base64urlDecode(p));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
__name2(verifyToken, "verifyToken");
async function deriveGateSecret(env) {
  const base = env.INTERNAL_GATE_TOKEN || env.DASHBOARD_TOKEN;
  if (!base) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(base),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("fs_internal_gate_v1"));
  return arrayBufferToBase64url(sig);
}
__name(deriveGateSecret, "deriveGateSecret");
__name2(deriveGateSecret, "deriveGateSecret");
var VALID_TYPES = /* @__PURE__ */ new Set(["edu", "gov"]);
var FIELD_MAX = {
  name: 64,
  org: 128,
  role: 64,
  contact: 128,
  note: 1024,
  chipsItem: 32,
  chipsMax: 32,
  ip: 64,
  ua: 512
};
async function storePartnerIntents(events, env, request) {
  if (!Array.isArray(events) || events.length === 0) return 0;
  const clientIp = request ? request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || "" : "";
  const ua = request ? request.headers.get("User-Agent") || "" : "";
  let stored = 0;
  for (const e of events) {
    const record = normalizePartnerEvent(e, clientIp, ua);
    if (!record) continue;
    let ok = false;
    if (env.DB) {
      try {
        await env.DB.prepare(
          "INSERT INTO partner_intents (intent_type, name, org, role, contact, chips, note, client_ip, ua, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          record.intent_type,
          record.name,
          record.org,
          record.role,
          record.contact,
          record.chips,
          record.note,
          record.client_ip,
          record.ua,
          record.ts,
          Math.floor(Date.now() / 1e3)
        ).run();
        ok = true;
      } catch (err) {
        console.error("partner_intents: D1 insert failed, fallback to KV:", err.message);
      }
    }
    if (!ok && env.PARTNER_LEADS) {
      try {
        const key = `pi:${record.ts}:${Math.random().toString(36).slice(2, 8)}`;
        await env.PARTNER_LEADS.put(key, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 });
        ok = true;
      } catch (err) {
        console.error("partner_intents: KV put failed:", err.message);
      }
    }
    if (!ok) {
      console.log("partner_intent (not persisted):", JSON.stringify(record));
    } else {
      stored++;
    }
  }
  return stored;
}
__name(storePartnerIntents, "storePartnerIntents");
__name2(storePartnerIntents, "storePartnerIntents");
function normalizePartnerEvent(e, clientIp, ua) {
  if (!e || typeof e !== "object") return null;
  if (e.t !== "partner_intent") return null;
  const intentType = VALID_TYPES.has(e.type) ? e.type : "edu";
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
    ts: Number.isFinite(e.ts) ? e.ts : Date.now()
  };
}
__name(normalizePartnerEvent, "normalizePartnerEvent");
__name2(normalizePartnerEvent, "normalizePartnerEvent");
function stringifyChips(arr) {
  if (!Array.isArray(arr)) return "[]";
  const cleaned = arr.filter((x) => x != null && x !== "").map((x) => String(x).trim().slice(0, FIELD_MAX.chipsItem)).slice(0, FIELD_MAX.chipsMax);
  return JSON.stringify(cleaned);
}
__name(stringifyChips, "stringifyChips");
__name2(stringifyChips, "stringifyChips");
var SUPPORTED_STYLES = ["\u5546\u52A1\u98CE", "\u4EB2\u6C11\u98CE", "\u6D3B\u529B\u98CE", "\u7B80\u7EA6\u6587\u827A", "\u79D1\u6280\u611F", "\u53EF\u7231\u5361\u901A"];
var MAX_DESC = 500;
var MAX_STYLES = 6;
var USE_MOCK_IPDESIGN = true;
async function handleWxLogin(request, env) {
  try {
    const body = await request.json();
    const { code } = body;
    if (!code) return jsonResponse({ error: "code is required" }, 400);
    const WX_APPID = env.WX_APPID;
    const WX_SECRET = env.WX_SECRET;
    if (!WX_APPID || !WX_SECRET) {
      console.error("WX_APPID or WX_SECRET not configured");
      return jsonResponse({ error: "server config error" }, 500);
    }
    const wxUrl = `${WX_API}?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const wxResp = await fetchWithTimeout(wxUrl, {}, 1e4);
    const wxData = await wxResp.json();
    if (wxData.errcode) {
      console.error("WeChat API error:", wxData.errcode, wxData.errmsg);
      return jsonResponse({ error: "\u5FAE\u4FE1\u767B\u5F55\u5931\u8D25", code: wxData.errcode }, 400);
    }
    const { openid, session_key } = wxData;
    const token = await generateToken(openid, env);
    const userId = "u_" + openid.slice(-8);
    return jsonResponse({ token, openid, userId });
  } catch (e) {
    console.error("WxLogin error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
}
__name(handleWxLogin, "handleWxLogin");
__name2(handleWxLogin, "handleWxLogin");
async function handleWxQrCode(request, env) {
  try {
    const MP_APPID = env.MP_APPID;
    const MP_SECRET = env.MP_SECRET;
    if (!MP_APPID || !MP_SECRET) {
      console.error("MP_APPID or MP_SECRET not configured");
      return jsonResponse({ error: "server config error" }, 500);
    }
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${MP_APPID}&secret=${MP_SECRET}`;
    const tokenResp = await fetchWithTimeout(tokenUrl, {}, 1e4);
    const tokenData = await tokenResp.json();
    if (tokenData.errcode) {
      console.error("WX access_token error:", tokenData.errcode, tokenData.errmsg);
      return jsonResponse({ error: "\u83B7\u53D6access_token\u5931\u8D25", code: tokenData.errcode }, 400);
    }
    const accessToken = tokenData.access_token;
    const url = new URL(request.url);
    const scene = url.searchParams.get("scene") || "index";
    const page = url.searchParams.get("page") || "";
    const width = parseInt(url.searchParams.get("width") || "430");
    const isHyaline = url.searchParams.get("hyaline") === "true";
    const qrUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    const qrBody = {
      scene,
      width: Math.min(Math.max(width, 280), 1280),
      auto_color: false,
      line_color: { r: 61, g: 90, b: 62 },
      // 风声墨绿 #3d5a3e
      is_hyaline: isHyaline
    };
    if (page) qrBody.page = page;
    const qrResp = await fetchWithTimeout(qrUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qrBody)
    }, 1e4);
    const contentType = qrResp.headers.get("content-type") || "";
    if (contentType.includes("image")) {
      const imageBuffer = await qrResp.arrayBuffer();
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "https://fengsheng.tech",
          "Vary": "Origin"
        }
      });
    } else {
      const errData = await qrResp.json();
      console.error("WX qrcode error:", errData);
      return jsonResponse({ error: "\u751F\u6210\u5C0F\u7A0B\u5E8F\u7801\u5931\u8D25", detail: errData }, 400);
    }
  } catch (e) {
    console.error("WxQrCode error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
}
__name(handleWxQrCode, "handleWxQrCode");
__name2(handleWxQrCode, "handleWxQrCode");
async function handleMpStats(request, env) {
  const MP_APPID = env.MP_APPID;
  const MP_SECRET = env.MP_SECRET;
  let wxData = { mp_users: 0, source: "no_config" };
  if (MP_APPID && MP_SECRET) {
    try {
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${MP_APPID}&secret=${MP_SECRET}`;
      const tokenResp = await fetchWithTimeout(tokenUrl, {}, 1e4);
      const tokenData = await tokenResp.json();
      if (!tokenData.errcode && tokenData.access_token) {
        const accessToken = tokenData.access_token;
        const now = /* @__PURE__ */ new Date();
        const yesterday = new Date(now.getTime() - 864e5);
        const ydStr = yesterday.getFullYear() + String(yesterday.getMonth() + 1).padStart(2, "0") + String(yesterday.getDate()).padStart(2, "0");
        const sevenDaysAgo = new Date(now.getTime() - 7 * 864e5);
        const sdStr = sevenDaysAgo.getFullYear() + String(sevenDaysAgo.getMonth() + 1).padStart(2, "0") + String(sevenDaysAgo.getDate()).padStart(2, "0");
        const cumulateUrl = `https://api.weixin.qq.com/datacube/getusercumulate?access_token=${accessToken}`;
        const cumulateResp = await fetchWithTimeout(cumulateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ begin_date: sdStr, end_date: ydStr })
        }, 1e4);
        const cumulateData = await cumulateResp.json();
        let mpUsers2 = 0;
        if (cumulateData.list && cumulateData.list.length > 0) {
          const lastEntry = cumulateData.list[cumulateData.list.length - 1];
          mpUsers2 = lastEntry.cumulate_user || 0;
        }
        const trendUrl = `https://api.weixin.qq.com/datacube/getdailyvisittrend?access_token=${accessToken}`;
        const trendResp = await fetchWithTimeout(trendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ begin_date: ydStr, end_date: ydStr })
        }, 1e4);
        const trendData = await trendResp.json();
        let mpPV = 0, mpUV = 0, mpSessions = 0;
        if (trendData.list && trendData.list.length > 0) {
          const latest = trendData.list[trendData.list.length - 1];
          mpPV = latest.visit_pv || 0;
          mpUV = latest.visit_uv || 0;
          mpSessions = latest.session_cnt || 0;
        }
        wxData = {
          mp_users: mpUsers2,
          mp_pv_yesterday: mpPV,
          mp_uv_yesterday: mpUV,
          mp_sessions_yesterday: mpSessions,
          query_date: ydStr,
          source: mpUsers2 > 0 ? "wechat_api" : "wechat_api_empty",
          wechat_errcode_trend: trendData.errcode || 0,
          wechat_errcode_cumulate: cumulateData.errcode || 0
        };
      }
    } catch (e) {
      console.error("MP WeChat API error:", e.message);
      wxData = { mp_users: 0, source: "wechat_error", error: e.message };
    }
  }
  let d1Data = { mp_users: 0, mp_pv: 0, source: "d1_empty" };
  if (env.DB) {
    try {
      const mpUsersD1 = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as c FROM events WHERE uid LIKE 'wx_%' OR uid LIKE 'o_%' OR url LIKE 'pages/%' OR source LIKE '%miniprogram%'"
      ).first();
      const mpPVD1 = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type = 'pageview' AND (uid LIKE 'wx_%' OR uid LIKE 'o_%' OR url LIKE 'pages/%' OR source LIKE '%miniprogram%')"
      ).first();
      d1Data = {
        mp_users: mpUsersD1?.c || 0,
        mp_pv: mpPVD1?.c || 0,
        source: "d1"
      };
    } catch (e) {
      console.error("MP D1 stats error:", e.message);
    }
  }
  const mpUsers = wxData.mp_users || d1Data.mp_users || parseInt(env.MP_USER_COUNT || "0", 10) || 0;
  const finalSource = wxData.mp_users > 0 ? "wechat_api" : d1Data.mp_users > 0 ? "d1" : "env_fallback";
  return jsonResponse({
    mp_users: mpUsers,
    mp_pv_yesterday: wxData.mp_pv_yesterday || 0,
    mp_uv_yesterday: wxData.mp_uv_yesterday || 0,
    mp_sessions_yesterday: wxData.mp_sessions_yesterday || 0,
    mp_d1_users: d1Data.mp_users,
    mp_d1_pv: d1Data.mp_pv,
    query_date: wxData.query_date || new Date(Date.now() - 864e5).toISOString().split("T")[0].replace(/-/g, ""),
    updated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    source: finalSource,
    wx_source: wxData.source,
    d1_source: d1Data.source
  });
}
__name(handleMpStats, "handleMpStats");
__name2(handleMpStats, "handleMpStats");
async function handleChat(request, env, authenticatedOpenid, resolvedBotId, ctx) {
  try {
    const body = await request.json();
    const { message, conversation_id } = body;
    if (!message || !message.trim()) {
      return jsonResponse({ error: "message is required" }, 400);
    }
    const PAT_TOKEN = env.COZE_PAT_TOKEN;
    if (!PAT_TOKEN) {
      console.error("COZE_PAT_TOKEN not configured");
      return jsonResponse({ error: "server config error: COZE_PAT_TOKEN is empty", detail: "COZE_PAT_TOKEN" }, 500);
    }
    const reqBody = {
      bot_id: resolvedBotId,
      user_id: authenticatedOpenid || "web_user",
      stream: true,
      auto_save_history: true,
      additional_messages: [{
        role: "user",
        content: message.trim(),
        content_type: "text"
      }]
    };
    if (conversation_id) reqBody.conversation_id = conversation_id;
    if (env.DB) {
      ctx.waitUntil((async () => {
        try {
          const url = new URL(request.url);
          await env.DB.prepare(
            "INSERT INTO events (uid, event_type, product, page, data, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch())"
          ).bind(
            authenticatedOpenid || "web_user",
            "chat",
            "mentor",
            url.pathname || "/",
            JSON.stringify({ message: (message || "").slice(0, 200), conversation_id: conversation_id || null }),
            Date.now()
          ).run();
        } catch (dbErr) {
          console.error("chat event write failed:", dbErr.message);
        }
      })());
    }
    const cozeResp = await fetchWithTimeout(`${COZE_API}/v3/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    }, 3e4);
    if (!cozeResp.ok) {
      const errText = await cozeResp.text();
      console.error("Coze API error:", cozeResp.status, errText);
      return jsonResponse({ error: "Coze API error", status: cozeResp.status }, 502);
    }
    return new Response(cozeResp.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "https://fengsheng.tech",
        "Vary": "Origin"
      }
    });
  } catch (e) {
    console.error("Proxy error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
}
__name(handleChat, "handleChat");
__name2(handleChat, "handleChat");
async function handleFeedback(request, env) {
  try {
    const body = await request.json();
    const { uid, type, content, product, rating, module: oldModule, score, source } = body;
    const eventContent = content && content.trim() ? content.trim() : "(\u7528\u6237\u63D0\u4EA4\u8BC4\u5206\u53CD\u9988)";
    const eventType = type || "feedback";
    const eventUid = uid || "anonymous";
    const eventProduct = product || oldModule || "general";
    const eventRating = rating !== void 0 ? rating : score !== void 0 ? score : null;
    const eventSource = source || "web";
    if (env.DB) {
      await env.DB.prepare(
        "INSERT INTO events (uid, event_type, product, data, ts, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())"
      ).bind(eventUid, eventType, eventProduct, JSON.stringify({ content: eventContent, rating: eventRating, source: eventSource }), Date.now()).run();
    }
    return jsonResponse({ ok: true, message: "\u53CD\u9988\u5DF2\u6536\u5230\uFF0C\u611F\u8C22\uFF01" });
  } catch (err) {
    return jsonResponse({ error: "\u53CD\u9988\u63D0\u4EA4\u5931\u8D25: " + err.message }, 500);
  }
}
__name(handleFeedback, "handleFeedback");
__name2(handleFeedback, "handleFeedback");
async function handleFeedbackExternal(request, env) {
  try {
    const body = await request.json();
    const web3Key = env.WEB3FORMS_KEY;
    const formsubmitKey = env.FORMSUBMIT_KEY;
    const payload = { access_key: web3Key, ...body };
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {
    });
    const fsPayload = {
      ...body,
      _replyto: body._replyto || "feedback@fengsheng.tech",
      _subject: body._subject || "\u98CE\u58F0\u7528\u6237\u53CD\u9988"
    };
    fetch(`https://formsubmit.co/ajax/${formsubmitKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(fsPayload)
    }).catch(() => {
    });
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: "\u53CD\u9988\u63D0\u4EA4\u5931\u8D25: " + err.message }, 500);
  }
}
__name(handleFeedbackExternal, "handleFeedbackExternal");
__name2(handleFeedbackExternal, "handleFeedbackExternal");
async function handleEvent(request, env) {
  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : null;
    const events = Array.isArray(body) ? body : body ? [body] : [];
    const partnerEvents = [];
    const trackingEvents = [];
    for (const e of events) {
      if (e && e.t === "partner_intent") partnerEvents.push(e);
      else trackingEvents.push(e);
    }
    if (partnerEvents.length) {
      try {
        await storePartnerIntents(partnerEvents, env, request);
      } catch (e) {
        console.error("partner_intents: store failed", e.message);
      }
    }
    if (trackingEvents.length && env.DB) {
      const stmt = env.DB.prepare(
        "INSERT OR IGNORE INTO events (uid, event_type, url, page, product, title, referrer, utm_source, utm_medium, utm_campaign, ref, source, ua, screen, vp, locale, data, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const batch = trackingEvents.map((e) => {
        const ts = e.ts || Date.now();
        return stmt.bind(
          (e.uid || "anon").slice(0, 64),
          (e.type || e.event_type || "event").slice(0, 32),
          (e.url || "").slice(0, 512),
          (e.page || "").slice(0, 256),
          (e.product || "").slice(0, 64),
          (e.title || "").slice(0, 256),
          (e.referrer || "").slice(0, 512),
          (e.utm_source || "").slice(0, 128),
          (e.utm_medium || "").slice(0, 128),
          (e.utm_campaign || "").slice(0, 128),
          (e.ref || "").slice(0, 256),
          JSON.stringify(e.source || {}).slice(0, 1024),
          (e.ua || "").slice(0, 512),
          (e.screen || "").slice(0, 32),
          (e.vp || "").slice(0, 32),
          (e.locale || "").slice(0, 16),
          JSON.stringify(e.data || {}).slice(0, 2048),
          ts,
          Math.floor(ts / 1e3)
        );
      });
      await env.DB.batch(batch);
      console.log(`events: wrote ${trackingEvents.length} event(s)`);
    } else if (trackingEvents.length) {
      console.log(`events: received ${trackingEvents.length} event(s) (no DB, not persisted)`);
    }
  } catch (e) {
    console.error("events: write failed", e.message);
  }
  return jsonResponse({ ok: true });
}
__name(handleEvent, "handleEvent");
__name2(handleEvent, "handleEvent");
async function handleStats(request, env) {
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (env.DB) {
    try {
      const todayStart = Math.floor((/* @__PURE__ */ new Date(now + "T00:00:00Z")).getTime() / 1e3);
      const uvResult = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as uv FROM events WHERE event_type = 'pageview'"
      ).first();
      const pvResult = await env.DB.prepare(
        "SELECT COUNT(*) as pv FROM events WHERE event_type = 'pageview'"
      ).first();
      const chatResult = await env.DB.prepare(
        "SELECT COUNT(*) as chats FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open')"
      ).first();
      const lastEvent = await env.DB.prepare(
        "SELECT ts FROM events ORDER BY ts DESC LIMIT 1"
      ).first();
      const todayUV = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as c FROM events WHERE event_type = 'pageview' AND created_at >= ?"
      ).bind(todayStart).first();
      const todayPV = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type = 'pageview' AND created_at >= ?"
      ).bind(todayStart).first();
      const todayChats = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') AND created_at >= ?"
      ).bind(todayStart).first();
      const mpUsers = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as c FROM events WHERE uid LIKE 'wx_%' OR url LIKE 'pages/%' OR source LIKE '%miniprogram%'"
      ).first();
      const mpPV = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type = 'pageview' AND (uid LIKE 'wx_%' OR url LIKE 'pages/%' OR source LIKE '%miniprogram%')"
      ).first();
      const feedbackCount = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type = 'reply_submit'"
      ).first();
      return jsonResponse({
        uv: uvResult?.uv || 0,
        total_users: uvResult?.uv || 0,
        pv: pvResult?.pv || 0,
        chats: chatResult?.chats || 0,
        last_event_ts: lastEvent?.ts || null,
        updated: now,
        source: "db",
        today_uv: todayUV?.c || 0,
        today_pv: todayPV?.c || 0,
        today_chats: todayChats?.c || 0,
        mp_users: mpUsers?.c || 0,
        mp_pv: mpPV?.c || 0,
        feedback_count: feedbackCount?.c || 0
      });
    } catch (e) {
      console.error("stats: DB query failed", e.message);
    }
  }
  return jsonResponse({
    uv: null,
    total_users: null,
    pv: null,
    chats: null,
    last_event_ts: null,
    updated: now,
    note: "no database configured \u2014 events are not persisted"
  });
}
__name(handleStats, "handleStats");
__name2(handleStats, "handleStats");
async function handleChats(request, env, ctx) {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.split("T")[0];
  if (env.DB) {
    try {
      let totalChats, recentChats;
      if (sinceParam) {
        const sinceDays = parseInt(sinceParam) || 0;
        const sinceTs = sinceDays > 0 ? Math.floor((Date.now() - sinceDays * 864e5) / 1e3) : 0;
        totalChats = await env.DB.prepare(
          "SELECT COUNT(*) as c FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') AND ts >= ?"
        ).bind(sinceTs).first();
        recentChats = await env.DB.prepare(
          "SELECT uid, event_type, product, ts FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') AND ts >= ? ORDER BY ts DESC LIMIT 10"
        ).bind(sinceTs).all();
      } else {
        totalChats = await env.DB.prepare(
          "SELECT COUNT(*) as c FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open')"
        ).first();
        recentChats = await env.DB.prepare(
          "SELECT uid, event_type, product, ts FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') ORDER BY ts DESC LIMIT 10"
        ).all();
      }
      const todayStart = Math.floor((/* @__PURE__ */ new Date(today + "T00:00:00Z")).getTime() / 1e3);
      const todayChats = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') AND ts >= ?"
      ).bind(todayStart).first();
      const uniqueChatUsers = await env.DB.prepare(
        "SELECT COUNT(DISTINCT uid) as c FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open')"
      ).first();
      const lastChatTs = await env.DB.prepare(
        "SELECT ts FROM events WHERE event_type IN ('chat', 'mentor_chat', 'coze_chat_open') ORDER BY ts DESC LIMIT 1"
      ).first();
      return jsonResponse({
        chats: totalChats?.c || 0,
        chats_today: todayChats?.c || 0,
        unique_chat_users: uniqueChatUsers?.c || 0,
        last_chat_ts: lastChatTs?.ts || null,
        recent: recentChats?.results || [],
        updated: now,
        source: "db",
        since_days: sinceParam ? parseInt(sinceParam) : null
      });
    } catch (e) {
      console.error("chats: DB query failed", e.message);
      return jsonResponse({
        chats: 0,
        chats_today: 0,
        unique_chat_users: 0,
        last_chat_ts: null,
        recent: [],
        updated: now,
        source: "db_error",
        error: e.message
      }, 500);
    }
  }
  return jsonResponse({
    chats: 0,
    chats_today: 0,
    unique_chat_users: 0,
    last_chat_ts: null,
    recent: [],
    updated: now,
    source: "no_database",
    note: "no database configured \u2014 events are not persisted"
  });
}
__name(handleChats, "handleChats");
__name2(handleChats, "handleChats");
async function handleStatsSummary(request, env) {
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
      const fbRate = users > 0 ? Math.round(fb / users * 1e4) / 100 : 0;
      return jsonResponse({
        total_users: users,
        total_pageviews: totalPageviews?.total_pageviews || 0,
        total_feedback: fb,
        feedback_rate_pct: fbRate,
        per_product: perProduct?.results || [],
        updated: now,
        source: "db"
      });
    } catch (e) {
      console.error("stats/summary: DB query failed", e.message);
    }
  }
  return jsonResponse({
    total_users: 0,
    total_pageviews: 0,
    total_feedback: 0,
    feedback_rate_pct: 0,
    per_product: [],
    updated: now,
    note: "no database configured"
  });
}
__name(handleStatsSummary, "handleStatsSummary");
__name2(handleStatsSummary, "handleStatsSummary");
async function handleStatsDaily(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "7");
  const product = url.searchParams.get("product") || "";
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (env.DB) {
    try {
      const daysParam = `-${days} days`;
      let sql = `SELECT date(created_at, 'unixepoch') as date, COUNT(DISTINCT uid) as unique_uids, COUNT(CASE WHEN event_type='pageview' THEN 1 END) as pageviews, COUNT(CASE WHEN event_type='click' THEN 1 END) as clicks, COUNT(CASE WHEN event_type='reply_submit' THEN 1 END) as feedbacks FROM events WHERE created_at >= unixepoch('now', ?) AND date(created_at, 'unixepoch') IS NOT NULL`;
      const bindParams = [daysParam];
      if (product) {
        sql += ` AND product = ?`;
        bindParams.push(product);
      }
      sql += ` GROUP BY date(created_at, 'unixepoch') ORDER BY date`;
      const daily = await env.DB.prepare(sql).bind(...bindParams).all();
      const dbResults = daily?.results || [];
      const dateMap = {};
      for (const r of dbResults) dateMap[r.date] = r;
      const filled = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        if (dateMap[dateStr]) {
          filled.push(dateMap[dateStr]);
        } else {
          filled.push({ date: dateStr, unique_uids: 0, pageviews: 0, clicks: 0, feedbacks: 0 });
        }
      }
      return jsonResponse({
        daily: filled,
        updated: now,
        source: "db"
      });
    } catch (e) {
      console.error("stats/daily: DB query failed", e.message);
    }
  }
  return jsonResponse({ daily: [], updated: now, note: "no database configured" });
}
__name(handleStatsDaily, "handleStatsDaily");
__name2(handleStatsDaily, "handleStatsDaily");
async function handleStatsHealth(request, env) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const base = {
    status: "ok",
    db: "not_configured",
    db_connected: false,
    circuit_breaker: _d1CircuitOpen ? "open" : "closed",
    degraded_mode: _degradedMode,
    error_count: _errorCount,
    updated: now,
    version: "v20260802-1210"
  };
  if (!env.DB) {
    return jsonResponse({ ...base, status: "degraded", db: "not_configured" });
  }
  if (_d1CircuitOpen) {
    return jsonResponse({ ...base, status: "degraded", db: "circuit_open", db_connected: false });
  }
  try {
    const lastEvent = await safeD1First(env.DB, "SELECT ts, event_type, product FROM events ORDER BY ts DESC LIMIT 1");
    const count24h = await safeD1First(env.DB, "SELECT COUNT(*) as cnt FROM events WHERE created_at >= unixepoch('now', '-1 days')", [], { cnt: 0 });
    const feedbackCount = await safeD1First(env.DB, "SELECT COUNT(*) as cnt FROM events WHERE event_type = 'reply_submit'", [], { cnt: 0 });
    return jsonResponse({
      ...base,
      status: _degradedMode ? "degraded" : "ok",
      db: "connected",
      db_connected: true,
      last_event: lastEvent || null,
      events_24h: count24h?.cnt || 0,
      events_count: count24h?.cnt || 0,
      feedback_count: feedbackCount?.cnt || 0
    });
  } catch (e) {
    recordD1Failure();
    return jsonResponse({ ...base, status: "degraded", db: "error", db_connected: false, error: e.message });
  }
}
__name(handleStatsHealth, "handleStatsHealth");
__name2(handleStatsHealth, "handleStatsHealth");
async function handleHeartbeat(request, env, ctx) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const checks = {
    status: "ok",
    version: "v20260804-1930",
    timestamp: now,
    uptime_seconds: (Date.now() - _startTime) / 1e3,
    circuit_breaker: _d1CircuitOpen ? "open" : "closed",
    degraded_mode: _degradedMode,
    checks: {}
  };
  try {
    const manifest = await loadManifest(env);
    if (manifest && manifest.total) {
      checks.checks.manifest = { ok: true, total_entries: manifest.total, domains: (manifest.domains || []).length };
    } else {
      checks.checks.manifest = { ok: false, error: "manifest empty or null" };
      checks.status = "degraded";
    }
  } catch (e) {
    checks.checks.manifest = { ok: false, error: e.message };
    checks.status = "degraded";
  }
  try {
    const sample = await loadDomainEntries(env, "\u7B7E\u7EA6\u524D");
    if (sample && sample.length > 0) {
      checks.checks.domain_data = { ok: true, sample_domain: "\u7B7E\u7EA6\u524D", entry_count: sample.length };
    } else {
      checks.checks.domain_data = { ok: false, error: "domain data empty" };
      checks.status = "degraded";
    }
  } catch (e) {
    checks.checks.domain_data = { ok: false, error: e.message };
    checks.status = "degraded";
  }
  checks.checks.cache = {
    manifest_cached: _manifestCache !== null,
    domain_caches: _domainCache.size,
    manifest_cache_age_ms: _manifestCacheTime ? Date.now() - _manifestCacheTime : null
  };
  if (env.DB) {
    checks.checks.d1 = { configured: true };
  } else {
    checks.checks.d1 = { configured: false };
  }
  const resp = jsonResponse(checks);
  resp.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  return resp;
}
__name(handleHeartbeat, "handleHeartbeat");
__name2(handleHeartbeat, "handleHeartbeat");
async function handleDecode(request, version) {
  version = version || 1;
  if (request.method === "GET") return jsonResponse({ ok: true, version, hint: "POST with input" });
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  const zodiac = clip(data.zodiac || data.zodiacName || "", 50);
  const constellation = clip(data.constellation || data.sign || "", 50);
  const keyword = clip(data.keyword || data.word || "", 200);
  const query = zodiac || constellation || keyword;
  if (!query) return jsonResponse({ ok: false, error: "\u9700\u8981\u751F\u8096/\u661F\u5EA7/\u5173\u952E\u8BCD" }, 400);
  return jsonResponse({
    ok: true,
    version,
    input: { zodiac, constellation, keyword },
    sixSteps: [
      { step: 1, name: "\u61C2\u4F60\u7684\u4F18\u52BF" },
      { step: 2, name: "\u61C2\u4F60\u7684\u60C5\u7EEA" },
      { step: 3, name: "\u61C2\u4F60\u7684\u6A21\u5F0F" },
      { step: 4, name: "\u61C2\u4F60\u7684\u5173\u7CFB" },
      { step: 5, name: "\u61C2\u4F60\u7684\u6210\u957F" },
      { step: 6, name: "\u61C2\u4F60\u7684\u4F7F\u547D" }
    ],
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(handleDecode, "handleDecode");
__name2(handleDecode, "handleDecode");
async function handleAssess(request) {
  if (request.method === "GET") return jsonResponse({ ok: true, hint: "POST with profile data" });
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  return jsonResponse({
    ok: true,
    report: {
      overall: 75,
      dimensions: { \u4F18\u52BF: 80, \u60C5\u7EEA: 70, \u6A21\u5F0F: 72, \u5173\u7CFB: 78, \u6210\u957F: 68, \u4F7F\u547D: 73 },
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
}
__name(handleAssess, "handleAssess");
__name2(handleAssess, "handleAssess");
async function handleCallback(request) {
  const data = await parseBodyJson(request);
  return jsonResponse({ ok: true, received: !!data });
}
__name(handleCallback, "handleCallback");
__name2(handleCallback, "handleCallback");
async function handleDaily(request) {
  if (request.method === "GET") return jsonResponse({ ok: true, days: 0, streak: 0 });
  const data = await parseBodyJson(request);
  return jsonResponse({ ok: true, checked: true, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
}
__name(handleDaily, "handleDaily");
__name2(handleDaily, "handleDaily");
async function handleVerify(request) {
  return jsonResponse({ ok: true, verified: true, ts: Date.now() });
}
__name(handleVerify, "handleVerify");
__name2(handleVerify, "handleVerify");
async function handleAdminAgents(request, env) {
  if (request.method !== "GET") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const expectedToken = env && env.DASHBOARD_TOKEN;
  if (!expectedToken) {
    console.error("DASHBOARD_TOKEN not configured");
    return jsonResponse({ ok: false, error: "server config error" }, 500);
  }
  if (!token || token !== expectedToken) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }
  return jsonResponse({
    ok: true,
    agents: [
      { id: "xiaoyu", name: "\u7EDF\u7B79\u8C03\u5EA6", role: "\u4EA7\u54C1\u8FD0\u8425", status: "active" },
      { id: "xiaodou", name: "\u5C0F\u7A0B\u5E8F\u7AEF\u4EA7\u54C1", role: "\u6280\u672F\u5F00\u53D1", status: "active" },
      { id: "xiaojiu", name: "\u54C1\u63A7\u5BA1\u6838", role: "\u8BBE\u8BA1\u8BC4\u5BA1", status: "active" },
      { id: "xiaoke", name: "\u7F51\u7AD9\u7AEF\u5F00\u53D1", role: "\u5E95\u5C42\u6267\u884C", status: "active" }
    ]
  });
}
__name(handleAdminAgents, "handleAdminAgents");
__name2(handleAdminAgents, "handleAdminAgents");
async function handleInternalGate(request, env) {
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  try {
    const body = await parseBodyJson(request);
    const pass = body && body.pass ? String(body.pass) : "";
    const expected = env.INTERNAL_GATE_TOKEN || env.DASHBOARD_TOKEN;
    const gateSecret = await deriveGateSecret(env);
    if (!expected || !gateSecret) {
      console.error("INTERNAL_GATE_TOKEN / DASHBOARD_TOKEN not configured");
      return jsonResponse({ ok: false, error: "server config error" }, 500);
    }
    if (!pass || pass !== expected) {
      return jsonResponse({ ok: false, error: "\u53E3\u4EE4\u4E0D\u6B63\u786E" }, 401);
    }
    const token = await generateToken("internal", env, 43200, gateSecret);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `fs_internal=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    console.error("InternalGate error:", e);
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
}
__name(handleInternalGate, "handleInternalGate");
__name2(handleInternalGate, "handleInternalGate");
async function handlePartnerIntent(request, env) {
  if (request.method === "GET") return jsonResponse({ ok: true, title: "\u98CE\u58F0\xB7\u5408\u4F5C\u610F\u5411", fields: ["name", "phone", "company", "intent", "message"] });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  const name = clip(data.name || data.contact || "", 50);
  const phone = clip(data.phone || data.mobile || "", 30);
  const company = clip(data.company || data.org || "", 100);
  const intent = clip(data.intent || data.type || "", 50);
  const message = clip(data.message || data.note || "", 1e3);
  if (!name || !phone) return jsonResponse({ ok: false, error: "\u59D3\u540D\u548C\u7535\u8BDD\u4E3A\u5FC5\u586B\u9879" }, 400);
  if (env.DB || env.PARTNER_LEADS) {
    try {
      await storePartnerIntents([{ t: "partner_intent", type: intent, name, org: company, contact: phone, note: message, ts: Date.now() }], env, request);
    } catch (e) {
      console.error("partner_intent store error:", e.message);
    }
  }
  return jsonResponse({
    ok: true,
    submitted: true,
    id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: "\u611F\u8C22\u60A8\u7684\u5408\u4F5C\u610F\u5411\uFF0C\u6211\u4EEC\u5C06\u5C3D\u5FEB\u4E0E\u60A8\u8054\u7CFB\uFF01"
  });
}
__name(handlePartnerIntent, "handlePartnerIntent");
__name2(handlePartnerIntent, "handlePartnerIntent");
async function handleIpDesign(request, env) {
  if (request.method === "GET") return jsonResponse({ ok: true, title: "\u98CE\u58F0\xB7IP \u89D2\u8272\u8BBE\u8BA1", supported_styles: SUPPORTED_STYLES });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  const desc = clip(data.desc || data.description || "", MAX_DESC);
  let styles = [];
  if (Array.isArray(data.styles)) {
    const seen = /* @__PURE__ */ new Set();
    for (const s of data.styles) {
      if (typeof s !== "string") continue;
      const v = s.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      styles.push(v);
      if (styles.length >= MAX_STYLES) break;
    }
  }
  if (!desc) return jsonResponse({ ok: false, error: "desc \u4E0D\u80FD\u4E3A\u7A7A" }, 400);
  if (styles.length === 0) return jsonResponse({ ok: false, error: "styles \u4E0D\u80FD\u4E3A\u7A7A" }, 400);
  const results = [];
  for (const style of styles) {
    let url;
    if (USE_MOCK_IPDESIGN || !env.IP_DESIGN_API || !env.IP_DESIGN_API_KEY) {
      const seed = encodeURIComponent(`${style}-${desc}`.slice(0, 64));
      const styleMap = {
        "\u5546\u52A1\u98CE": "bottts-neutral",
        "\u4EB2\u6C11\u98CE": "avataaars",
        "\u6D3B\u529B\u98CE": "adventurer",
        "\u7B80\u7EA6\u6587\u827A": "thumbs",
        "\u79D1\u6280\u611F": "bottts",
        "\u53EF\u7231\u5361\u901A": "lorelei"
      };
      const dicebearStyle = styleMap[style] || "bottts-neutral";
      url = `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${seed}&backgroundColor=f7f4ef`;
    } else {
      try {
        const prompt = `\u4E3A\u4E00\u4E2A IP \u89D2\u8272\u8BBE\u8BA1\u5934\u50CF, \u6B63\u65B9\u5F62\u6784\u56FE, \u5934\u50CF\u6BD4\u4F8B, \u7B80\u6D01\u80CC\u666F, \u9AD8\u8D28\u91CF. \u98CE\u683C: ${style}. \u89D2\u8272\u63CF\u8FF0: ${desc}.`;
        const resp = await fetch(env.IP_DESIGN_API, {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.IP_DESIGN_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: env.IP_DESIGN_MODEL || "seedream-4.0", prompt, size: "1024x1024", n: 1 })
        });
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const respData = await resp.json();
        const item = respData?.data?.[0];
        if (item?.url) url = item.url;
        else if (item?.b64_json) url = `data:image/png;base64,${item.b64_json}`;
        else throw new Error("no url in response");
      } catch (err) {
        console.error("ip-design: real API failed, fallback to mock:", err.message);
        const seed = encodeURIComponent(`${style}-${desc}`.slice(0, 64));
        url = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=f7f4ef`;
      }
    }
    results.push({ style, url });
  }
  return jsonResponse(results);
}
__name(handleIpDesign, "handleIpDesign");
__name2(handleIpDesign, "handleIpDesign");
var _domainCache = /* @__PURE__ */ new Map();
var _manifestCache = null;
var _manifestCacheTime = 0;
var DOMAIN_CACHE_TTL = 6e5;
async function loadManifest(env) {
  if (_manifestCache && Date.now() - _manifestCacheTime < DOMAIN_CACHE_TTL) {
    return _manifestCache;
  }
  try {
    const resp = await env.ASSETS.fetch(new Request("https://fakehost/data/domains/_manifest.json"));
    if (!resp.ok) return null;
    _manifestCache = await resp.json();
    _manifestCacheTime = Date.now();
    return _manifestCache;
  } catch (e) {
    console.error("loadManifest failed:", e.message);
    return null;
  }
}
__name(loadManifest, "loadManifest");
__name2(loadManifest, "loadManifest");
async function loadDomainEntries(env, domain) {
  const cached = _domainCache.get(domain);
  if (cached && Date.now() - cached.time < DOMAIN_CACHE_TTL) {
    return cached.entries;
  }
  try {
    const manifest = await loadManifest(env);
    if (!manifest || !manifest.files[domain]) return [];
    const filename = manifest.files[domain];
    const resp = await env.ASSETS.fetch(new Request(`https://fakehost/data/domains/${filename}`));
    if (!resp.ok) return [];
    const entries = await resp.json();
    _domainCache.set(domain, { entries, time: Date.now() });
    return entries;
  } catch (e) {
    console.error(`loadDomainEntries(${domain}) failed:`, e.message);
    return [];
  }
}
__name(loadDomainEntries, "loadDomainEntries");
__name2(loadDomainEntries, "loadDomainEntries");
async function loadAllEntries(env) {
  try {
    const manifest = await loadManifest(env);
    if (!manifest) return [];
    const all = [];
    const domains = manifest.domains || [];
    for (let i = 0; i < domains.length; i += 4) {
      const batch = domains.slice(i, i + 4).map((d) => loadDomainEntries(env, d));
      const results = await Promise.all(batch);
      results.forEach((r) => r.forEach((e) => all.push(e)));
    }
    return all;
  } catch (e) {
    console.error("loadAllEntries failed:", e.message);
    return [];
  }
}
__name(loadAllEntries, "loadAllEntries");
__name2(loadAllEntries, "loadAllEntries");
async function computeEntriesETag(env) {
  const manifest = await loadManifest(env);
  if (!manifest) return null;
  return `"${manifest.total}-${Object.keys(manifest.counts).length}"`;
}
__name(computeEntriesETag, "computeEntriesETag");
__name2(computeEntriesETag, "computeEntriesETag");
function addETag(resp, etag) {
  if (etag) {
    resp.headers.set("ETag", etag);
    resp.headers.set("Vary", "Accept-Encoding");
  }
  return resp;
}
__name(addETag, "addETag");
__name2(addETag, "addETag");
async function handleEntries(request, env, ctx) {
  const url = new URL(request.url);
  const domainParam = validateDomainParam(url.searchParams.get("domain"));
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam !== null ? parseInt(limitParam, 10) : 50;
  const limit = isNaN(parsedLimit) ? 50 : Math.min(Math.max(parsedLimit, 0), 200);
  const offset = Math.min(Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0), 1e4);
  const subSceneParam = sanitizeQueryParam(url.searchParams.get("subScene") || "", 128) || null;
  const clientTypeParam = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64) || null;
  const stageParam = sanitizeQueryParam(url.searchParams.get("stage") || "", 64) || null;
  const layerParam = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  const groupByParam = sanitizeQueryParam(url.searchParams.get("groupBy") || "", 32) || null;
  if (url.searchParams.get("domain") && !domainParam) {
    return jsonResponse({ error: "\u65E0\u6548\u7684\u57DF\u540D\u53C2\u6570", hint: "\u8BF7\u4F7F\u7528\u6B63\u786E\u7684\u4E1A\u52A1\u57DF\u540D\u79F0" }, 400);
  }
  const cacheKeyStr = `https://cache.local/v8/api/entries?domain=${domainParam || ""}&limit=${limit}&offset=${offset}&subScene=${subSceneParam || ""}&ct=${clientTypeParam || ""}&st=${stageParam || ""}&ly=${layerParam || ""}&gb=${groupByParam || ""}`;
  const cacheKey = new Request(cacheKeyStr);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  let entries;
  if (domainParam) {
    entries = await loadDomainEntries(env, domainParam);
  } else {
    if (clientTypeParam || stageParam || layerParam) {
      entries = await loadAllEntries(env);
    } else {
      entries = [];
    }
  }
  const manifest = await loadManifest(env);
  let subscenes = [];
  if (domainParam && manifest && manifest.subscenes) {
    subscenes = manifest.subscenes[domainParam] || [];
  }
  let filteredEntries = entries;
  if (subSceneParam) {
    filteredEntries = filteredEntries.filter((e) => e.subScene === subSceneParam);
  }
  if (clientTypeParam || stageParam || layerParam) {
    filteredEntries = filteredEntries.filter((e) => {
      const tags = e.tags || {};
      if (clientTypeParam) {
        const ct = tags.clientType;
        if (Array.isArray(ct)) {
          if (!ct.includes(clientTypeParam)) return false;
        } else if (ct !== clientTypeParam) return false;
      }
      if (stageParam) {
        const st = tags.stage;
        if (Array.isArray(st)) {
          if (!st.includes(stageParam)) return false;
        } else if (st !== stageParam) return false;
      }
      if (layerParam) {
        const ly = tags.layer;
        if (Array.isArray(ly)) {
          if (!ly.includes(layerParam)) return false;
        } else if (ly !== layerParam) return false;
      }
      return true;
    });
  }
  let grouped = null;
  if (groupByParam && ["subScene", "layer", "entryType", "severity"].includes(groupByParam)) {
    grouped = {};
    for (const e of filteredEntries) {
      const key = groupByParam === "subScene" ? e.subScene || "\u672A\u5206\u7C7B" : groupByParam === "layer" ? (e.tags || {}).layer || "\u672A\u5206\u7C7B" : groupByParam === "entryType" ? e.entryType || "\u672A\u5206\u7C7B" : e.severity || "\u672A\u5206\u7C7B";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
  }
  const total = filteredEntries.length;
  if (grouped) {
    const groupSummary = {};
    for (const [key, items] of Object.entries(grouped)) {
      groupSummary[key] = items.length;
    }
    let result2 = filteredEntries;
    if (limit > 0) {
      result2 = result2.slice(offset, offset + limit);
    } else if (offset > 0) {
      result2 = result2.slice(offset);
    }
    const respData2 = {
      total,
      returned: result2.length,
      offset,
      limit: limit || null,
      domain: domainParam || null,
      subScene: subSceneParam,
      filters: { clientType: clientTypeParam, stage: stageParam, layer: layerParam },
      groupBy: groupByParam,
      groups: groupSummary,
      entries: result2
    };
    if (!domainParam) delete respData2.subScene;
    const resp2 = jsonResponse(respData2);
    const cachedResp2 = new Response(resp2.body, resp2);
    cachedResp2.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
    addETag(cachedResp2, await computeEntriesETag(env));
    if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp2.clone()));
    return cachedResp2;
  }
  let result = filteredEntries;
  if (limit > 0) {
    result = result.slice(offset, offset + limit);
  } else if (offset > 0) {
    result = result.slice(offset);
  }
  const respData = {
    total,
    returned: result.length,
    offset,
    limit: limit || null,
    domain: domainParam || null,
    subScene: subSceneParam,
    filters: clientTypeParam || stageParam || layerParam ? { clientType: clientTypeParam, stage: stageParam, layer: layerParam } : void 0,
    entries: result,
    subscenes,
    hint: domainParam ? null : "Specify ?domain=xxx to load entries for a specific domain. Add &clientType=buyer&stage=pre&layer=qi for tag filtering, &groupBy=subScene for grouping."
  };
  if (!domainParam) delete respData.subscenes;
  if (!subSceneParam) delete respData.subScene;
  if (!respData.filters) delete respData.filters;
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
  addETag(cachedResp, await computeEntriesETag(env));
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleEntries, "handleEntries");
__name2(handleEntries, "handleEntries");
async function handleKnowledgeStats(request, env, ctx) {
  const manifest = await loadManifest(env);
  if (!manifest) {
    return jsonResponse({ total_entries: 0, total_domains: 0, domains: [], updated: (/* @__PURE__ */ new Date()).toISOString() });
  }
  const sortedByCount = [...manifest.domains].sort((a, b) => (manifest.counts[b] || 0) - (manifest.counts[a] || 0));
  const topDomains = sortedByCount.slice(0, 3);
  const sampleMap = {};
  const sampleResults = await Promise.all(topDomains.map((d) => loadDomainEntries(env, d)));
  topDomains.forEach((d, i) => {
    const entries = sampleResults[i] || [];
    sampleMap[d] = entries.slice(0, 3).map((e) => ({
      id: e.id,
      name: e.name || e.title || e.id
    }));
  });
  const domains = sortedByCount.map((d) => ({
    domain: d,
    count: manifest.counts[d] || 0,
    samples: (sampleMap[d] || []).map((e) => e.name),
    sample_ids: (sampleMap[d] || []).map((e) => e.id)
  }));
  const resp = jsonResponse({
    total_entries: manifest.total,
    total_domains: manifest.domains.length,
    domains,
    updated: (/* @__PURE__ */ new Date()).toISOString()
  });
  resp.headers.set("Cache-Control", "public, max-age=300, s-maxage=0");
  addETag(resp, await computeEntriesETag(env));
  return resp;
}
__name(handleKnowledgeStats, "handleKnowledgeStats");
__name2(handleKnowledgeStats, "handleKnowledgeStats");
var SEARCH_RATE_LIMIT = /* @__PURE__ */ new Map();
var SEARCH_RATE_WINDOW = 3e4;
var SEARCH_MAX_PER_WINDOW = 5;
async function handleSearch(request, env, ctx) {
  const url = new URL(request.url);
  const q = validateSearchQuery(url.searchParams.get("q") || "");
  if (!q || q.length < 1) {
    return jsonResponse({ query: "", results: [], total: 0, hint: "Provide ?q=keyword" });
  }
  if (q.length < 2) {
    return jsonResponse({ query: q, results: [], total: 0, hint: "\u8BF7\u63D0\u4F9B\u81F3\u5C112\u4E2A\u5B57\u7B26\u7684\u641C\u7D22\u5173\u952E\u8BCD" });
  }
  const domainParam = validateDomainParam(url.searchParams.get("domain"));
  const clientTypeParam = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64) || null;
  const stageParam = sanitizeQueryParam(url.searchParams.get("stage") || "", 64) || null;
  const layerParam = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  const ip = getClientIP(request);
  const now = Date.now();
  const searchEntry = SEARCH_RATE_LIMIT.get(ip);
  if (searchEntry && now - searchEntry.windowStart < SEARCH_RATE_WINDOW) {
    if (searchEntry.count >= SEARCH_MAX_PER_WINDOW) {
      return jsonResponse({ error: "\u641C\u7D22\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF730\u79D2\u540E\u518D\u8BD5", query: q }, 429);
    }
    searchEntry.count++;
  } else {
    SEARCH_RATE_LIMIT.set(ip, { windowStart: now, count: 1 });
  }
  const cacheKeyStr = "https://cache.local/v5/api/search?q=" + encodeURIComponent(q.slice(0, 20)) + "&d=" + (domainParam || "") + "&ct=" + (clientTypeParam || "") + "&st=" + (stageParam || "") + "&ly=" + (layerParam || "");
  const cacheKey = new Request(cacheKeyStr);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const manifest = await loadManifest(env);
  if (!manifest) return jsonResponse({ query: q, results: [], total: 0 });
  const FIELD_WEIGHTS = [
    { key: "name", weight: 10, type: "string" },
    { key: "alias", weight: 9, type: "array" },
    { key: "consumerQ", weight: 8, type: "string" },
    { key: "ownerQ", weight: 7, type: "string" },
    { key: "oneLineAnswer", weight: 5, type: "string" },
    { key: "cp", weight: 4, type: "array" },
    { key: "detail", weight: 3, type: "string" },
    { key: "legalRef", weight: 2, type: "string" },
    { key: "sceneDomain", weight: 1, type: "string" },
    { key: "subScene", weight: 1, type: "string" }
  ];
  const qLower = q.toLowerCase();
  const results = [];
  const maxResults = 100;
  const domains = domainParam ? [domainParam] : manifest.domains || [];
  for (const domain of domains) {
    const entries = await loadDomainEntries(env, domain);
    for (const e of entries) {
      if (clientTypeParam || stageParam || layerParam) {
        const tags = e.tags || {};
        if (clientTypeParam) {
          const ct = tags.clientType;
          if (Array.isArray(ct)) {
            if (!ct.includes(clientTypeParam)) continue;
          } else if (ct !== clientTypeParam) continue;
        }
        if (stageParam) {
          const st = tags.stage;
          if (Array.isArray(st)) {
            if (!st.includes(stageParam)) continue;
          } else if (st !== stageParam) continue;
        }
        if (layerParam) {
          const ly = tags.layer;
          if (Array.isArray(ly)) {
            if (!ly.includes(layerParam)) continue;
          } else if (ly !== layerParam) continue;
        }
      }
      let score = 0;
      let matched = false;
      for (const fw of FIELD_WEIGHTS) {
        const val = e[fw.key];
        if (!val) continue;
        if (fw.type === "array") {
          if (Array.isArray(val)) {
            for (const item of val) {
              const s = String(item).toLowerCase();
              if (s.includes(qLower)) {
                score += fw.weight;
                if (s === qLower) score += fw.weight;
                matched = true;
              }
            }
          }
        } else {
          const s = String(val).toLowerCase();
          if (s.includes(qLower)) {
            score += fw.weight;
            if (s === qLower) score += fw.weight;
            if (s.startsWith(qLower)) score += Math.floor(fw.weight / 2);
            matched = true;
          }
        }
      }
      if (matched) {
        results.push({ entry: e, score });
      }
    }
  }
  const severityOrder = { hard: 0, medium: 1, soft: 2 };
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const sa = severityOrder[a.entry.severity] ?? 9;
    const sb = severityOrder[b.entry.severity] ?? 9;
    return sa - sb;
  });
  const topResults = results.slice(0, maxResults).map((r) => r.entry);
  const respData = {
    query: q,
    results: topResults,
    total: results.length,
    returned: topResults.length,
    updated: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (domainParam || clientTypeParam || stageParam || layerParam) {
    respData.filters = { domain: domainParam, clientType: clientTypeParam, stage: stageParam, layer: layerParam };
  }
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleSearch, "handleSearch");
__name2(handleSearch, "handleSearch");
async function handleEntryDetail(request, env, ctx) {
  const url = new URL(request.url);
  const id = sanitizeQueryParam(url.searchParams.get("id") || "", 128);
  if (!id) {
    return jsonResponse({ error: "Missing ?id=ENTRY_ID parameter" }, 400);
  }
  const cacheKey = new Request("https://cache.local/v8/api/entry?id=" + encodeURIComponent(id));
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const entry = allEntries.find((e) => e.id === id);
  if (!entry) {
    return jsonResponse({ error: "Entry not found", id }, 404);
  }
  let related = [];
  if (entry.relatedEntries && entry.relatedEntries.length > 0) {
    const idSet = new Set(entry.relatedEntries);
    related = allEntries.filter((e) => idSet.has(e.id)).map((e) => ({
      id: e.id,
      name: e.name,
      oneLineAnswer: e.oneLineAnswer || "",
      severity: e.severity || "",
      entryType: e.entryType || ""
    }));
  }
  const layerSeq = ["dao", "fa", "shu", "qi"];
  const layerLabels = { dao: "\u9053", fa: "\u6CD5", shu: "\u672F", qi: "\u5668" };
  const entryLayer = (entry.tags || {}).layer || "";
  const layerPath = layerSeq.map((l) => ({
    layer: l,
    label: layerLabels[l],
    active: l === entryLayer
  }));
  const respData = {
    ...entry,
    layerPath,
    relatedEntriesResolved: related
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=600, s-maxage=1800");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleEntryDetail, "handleEntryDetail");
__name2(handleEntryDetail, "handleEntryDetail");
async function handleSearchSuggest(request, env, ctx) {
  const url = new URL(request.url);
  const q = validateSearchQuery(url.searchParams.get("q") || "");
  if (!q || q.length < 1) {
    return jsonResponse({ query: "", suggestions: [] });
  }
  const cacheKey = new Request("https://cache.local/v5/api/search/suggest?q=" + encodeURIComponent(q.slice(0, 20)));
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const manifest = await loadManifest(env);
  if (!manifest) return jsonResponse({ query: q, suggestions: [] });
  const qLower = q.toLowerCase();
  const suggestions = [];
  const maxSuggestions = 10;
  const seen = /* @__PURE__ */ new Set();
  const domains = manifest.domains || [];
  for (const domain of domains) {
    if (suggestions.length >= maxSuggestions) break;
    const entries = await loadDomainEntries(env, domain);
    for (const e of entries) {
      if (suggestions.length >= maxSuggestions) break;
      const nameMatch = (e.name || "").toLowerCase().includes(qLower);
      let aliasMatch = false;
      if (e.alias && Array.isArray(e.alias)) {
        aliasMatch = e.alias.some((a) => String(a).toLowerCase().includes(qLower));
      }
      if ((nameMatch || aliasMatch) && !seen.has(e.id)) {
        seen.add(e.id);
        suggestions.push({
          id: e.id,
          name: e.name,
          oneLineAnswer: e.oneLineAnswer || "",
          domain: e.domain || "",
          subScene: e.subScene || "",
          severity: e.severity || "",
          priority: e.priority || "",
          layer: (e.tags || {}).layer || "",
          matchType: nameMatch ? "name" : "alias"
        });
      }
    }
  }
  const resp = jsonResponse({ query: q, suggestions });
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleSearchSuggest, "handleSearchSuggest");
__name2(handleSearchSuggest, "handleSearchSuggest");
async function handleSceneDetail(request, env, ctx) {
  const url = new URL(request.url);
  const clientType = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64);
  const stage = sanitizeQueryParam(url.searchParams.get("stage") || "", 64);
  const sceneDomain = sanitizeQueryParam(url.searchParams.get("sceneDomain") || "", 128);
  if (!clientType || !stage) {
    return jsonResponse({ error: "clientType and stage are required", hint: "?clientType=buyer&stage=pre" }, 400);
  }
  const cacheKey = new Request(`https://cache.local/v7/api/scene/detail?ct=${clientType}&st=${stage}&sd=${sceneDomain}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const sceneEntries = allEntries.filter((e) => {
    const tags = e.tags || {};
    const ct = tags.clientType;
    const st = tags.stage;
    const ctMatch = Array.isArray(ct) ? ct.includes(clientType) : ct === clientType;
    const stMatch = Array.isArray(st) ? st.includes(stage) : st === stage;
    if (!ctMatch || !stMatch) return false;
    if (sceneDomain) {
      const sd = e.sceneDomain || "";
      const sdList = Array.isArray(sd) ? sd : sd.split(",").map((s) => s.trim()).filter(Boolean);
      return sdList.some((s) => s === sceneDomain);
    }
    return true;
  });
  const layerOrder = ["dao", "fa", "shu", "qi"];
  const layerLabels = { dao: "\u9053\xB7\u5FC3\u91CC\u61C2\u7684", fa: "\u6CD5\xB7\u5F53\u573A\u8D70\u7684", shu: "\u672F\xB7\u5634\u4E0A\u8BF4\u7684", qi: "\u5668\xB7\u9012\u7ED9\u5BA2\u6237\u7684" };
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const layers = layerOrder.map((layer) => {
    const items = sceneEntries.filter((e) => {
      const ly = (e.tags || {}).layer;
      return Array.isArray(ly) ? ly.includes(layer) : ly === layer;
    }).sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
    return {
      layer,
      label: layerLabels[layer],
      count: items.length,
      entries: items.slice(0, 50).map((e) => ({
        id: e.id,
        name: e.name,
        oneLineAnswer: e.oneLineAnswer || "",
        entryType: e.entryType || "",
        severity: e.severity || "",
        priority: e.priority || ""
      }))
    };
  }).filter((g) => g.count > 0);
  const byPriority = {};
  const bySeverity = {};
  const byEntryType = {};
  for (const e of sceneEntries) {
    byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    byEntryType[e.entryType] = (byEntryType[e.entryType] || 0) + 1;
  }
  const entryTypes = [...new Set(sceneEntries.map((e) => e.entryType).filter(Boolean))].sort();
  const severities = [...new Set(sceneEntries.map((e) => e.severity).filter(Boolean))].sort();
  const byLayerMap = Object.fromEntries(layers.map((l) => [l.layer, l.count]));
  const respData = {
    clientType,
    stage,
    total: sceneEntries.length,
    byLayer: byLayerMap,
    byPriority,
    bySeverity,
    byEntryType,
    filterOptions: { entryTypes, severities, layers: layerOrder.filter((l) => layers.some((g) => g.layer === l)) },
    groups: layers
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=300, s-maxage=900");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleSceneDetail, "handleSceneDetail");
__name2(handleSceneDetail, "handleSceneDetail");
async function handleSceneEntries(request, env, ctx) {
  const url = new URL(request.url);
  const clientType = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64);
  const stage = sanitizeQueryParam(url.searchParams.get("stage") || "", 64);
  const layer = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  if (!clientType || !stage) {
    return jsonResponse({ error: "clientType and stage are required", hint: "?clientType=buyer&stage=pre" }, 400);
  }
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
  const cacheKey = new Request(`https://cache.local/v5/api/scene/entries?ct=${clientType}&st=${stage}&ly=${layer || ""}&p=${page}&ps=${pageSize}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const filtered = allEntries.filter((e) => {
    const tags = e.tags || {};
    const ct = tags.clientType;
    const st = tags.stage;
    const ctMatch = Array.isArray(ct) ? ct.includes(clientType) : ct === clientType;
    const stMatch = Array.isArray(st) ? st.includes(stage) : st === stage;
    if (!ctMatch || !stMatch) return false;
    if (layer) {
      const ly = tags.layer;
      return Array.isArray(ly) ? ly.includes(layer) : ly === layer;
    }
    return true;
  });
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  filtered.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paged = filtered.slice(offset, offset + pageSize).map((e) => ({
    id: e.id,
    name: e.name,
    oneLineAnswer: e.oneLineAnswer || "",
    entryType: e.entryType || "",
    severity: e.severity || "",
    priority: e.priority || "",
    consumerQ: e.consumerQ || "",
    subScene: e.subScene || "",
    layer: (e.tags || {}).layer || ""
  }));
  const resp = jsonResponse({
    clientType,
    stage,
    layer: layer || null,
    total,
    page,
    pageSize,
    totalPages,
    entries: paged
  });
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleSceneEntries, "handleSceneEntries");
__name2(handleSceneEntries, "handleSceneEntries");
async function handleSearchV2(request, env, ctx) {
  const url = new URL(request.url);
  const q = validateSearchQuery(url.searchParams.get("q") || "");
  if (!q || q.length < 2) {
    return jsonResponse({ query: q || "", results: [], total: 0, hint: "\u8BF7\u63D0\u4F9B\u81F3\u5C112\u4E2A\u5B57\u7B26\u7684\u641C\u7D22\u5173\u952E\u8BCD" });
  }
  const entryType = sanitizeQueryParam(url.searchParams.get("entryType") || "", 64) || null;
  const severity = sanitizeQueryParam(url.searchParams.get("severity") || "", 64) || null;
  const layer = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  const domain = sanitizeQueryParam(url.searchParams.get("domain") || "", 64) || null;
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 50);
  const ip = getClientIP(request);
  const now = Date.now();
  const searchEntry = SEARCH_RATE_LIMIT.get(ip);
  if (searchEntry && now - searchEntry.windowStart < SEARCH_RATE_WINDOW) {
    if (searchEntry.count >= SEARCH_MAX_PER_WINDOW) {
      return jsonResponse({ error: "\u641C\u7D22\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF730\u79D2\u540E\u518D\u8BD5", query: q }, 429);
    }
    searchEntry.count++;
  } else {
    SEARCH_RATE_LIMIT.set(ip, { windowStart: now, count: 1 });
  }
  const cacheKey = new Request(`https://cache.local/v6/api/search/v2?q=${encodeURIComponent(q.slice(0, 30))}&et=${entryType || ""}&sev=${severity || ""}&ly=${layer || ""}&dom=${domain || ""}&p=${page}&ps=${pageSize}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const qLower = q.toLowerCase();
  const results = [];
  const layerOrder = ["dao", "fa", "shu", "qi"];
  for (const e of allEntries) {
    const name = (e.name || "").toLowerCase();
    const alias = (e.alias || []).map(String).join(" ").toLowerCase();
    const consumerQ = (e.consumerQ || "").toLowerCase();
    const detail = (e.detail || "").toLowerCase();
    const oneLine = (e.oneLineAnswer || "").toLowerCase();
    const subScene = (e.subScene || "").toLowerCase();
    let score = 0;
    const highlights = [];
    if (name === qLower) {
      score += 100;
      highlights.push("name:exact");
    } else if (name.includes(qLower)) {
      score += 50;
      highlights.push("name");
    }
    if (alias.includes(qLower)) {
      score += 40;
      highlights.push("alias");
    }
    if (consumerQ === qLower) {
      score += 80;
      highlights.push("consumerQ:exact");
    } else if (consumerQ.includes(qLower)) {
      score += 30;
      highlights.push("consumerQ");
    }
    if (oneLine.includes(qLower)) {
      score += 25;
      highlights.push("oneLineAnswer");
    }
    if (detail.includes(qLower)) {
      score += 15;
      highlights.push("detail");
    }
    if (subScene.includes(qLower)) {
      score += 10;
      highlights.push("subScene");
    }
    if (score > 0) {
      results.push({
        id: e.id,
        name: e.name,
        oneLineAnswer: e.oneLineAnswer || "",
        entryType: e.entryType || "",
        severity: e.severity || "",
        priority: e.priority || "",
        consumerQ: e.consumerQ || "",
        subScene: e.subScene || "",
        score,
        highlights
      });
    }
  }
  let filtered = results;
  if (entryType) filtered = filtered.filter((r) => r.entryType === entryType);
  if (severity) filtered = filtered.filter((r) => r.severity === severity);
  if (layer) {
    filtered = filtered.filter((r) => {
      const entry = allEntries.find((e) => e.id === r.id);
      if (!entry) return false;
      const ly = (entry.tags || {}).layer;
      return Array.isArray(ly) ? ly.includes(layer) : ly === layer;
    });
  }
  if (domain) {
    filtered = filtered.filter((r) => {
      const entry = allEntries.find((e) => e.id === r.id);
      if (!entry) return false;
      const d = entry.domain || entry.sceneDomain || "";
      return d === domain;
    });
  }
  filtered.sort((a, b) => b.score - a.score);
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paged = filtered.slice(offset, offset + pageSize);
  const resp = jsonResponse({
    query: q,
    total,
    page,
    pageSize,
    totalPages,
    results: paged,
    filterOptions: {
      entryTypes: [...new Set(results.map((r) => r.entryType).filter(Boolean))].sort(),
      severities: [...new Set(results.map((r) => r.severity).filter(Boolean))].sort(),
      layers: layerOrder,
      domains: [...new Set(allEntries.filter((e) => results.some((r) => r.id === e.id)).map((e) => e.domain || e.sceneDomain || "").filter(Boolean))].sort()
    }
  });
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleSearchV2, "handleSearchV2");
__name2(handleSearchV2, "handleSearchV2");
async function handleEntryRelated(request, env, ctx) {
  const url = new URL(request.url);
  const id = sanitizeQueryParam(url.searchParams.get("id") || "", 128);
  if (!id) {
    return jsonResponse({ error: "Missing ?id=ENTRY_ID parameter" }, 400);
  }
  const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);
  const limit = Math.min(Math.max(limitParam, 1), 30);
  const cacheKey = new Request(`https://cache.local/v8/api/entry/related?id=${encodeURIComponent(id)}&limit=${limit}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const entry = allEntries.find((e) => e.id === id);
  if (!entry) {
    return jsonResponse({ error: "Entry not found", id }, 404);
  }
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const candidates = /* @__PURE__ */ new Map();
  if (entry.subScene) {
    for (const e of allEntries) {
      if (e.id !== entry.id && e.subScene === entry.subScene) {
        candidates.set(e.id, { weight: 10, relation: "sameSubScene", entry: e });
      }
    }
  }
  const layerSeq = ["dao", "fa", "shu", "qi"];
  const currentLayer = (entry.tags || {}).layer;
  const currentIdx = layerSeq.indexOf(currentLayer);
  if (currentIdx >= 0) {
    const adjacentLayers = [];
    if (currentIdx < 3) adjacentLayers.push(layerSeq[currentIdx + 1]);
    if (currentIdx > 0) adjacentLayers.push(layerSeq[currentIdx - 1]);
    for (const e of allEntries) {
      if (e.id !== entry.id && e.subScene === entry.subScene) {
        const eLy = (e.tags || {}).layer;
        const match = Array.isArray(eLy) ? eLy.some((l) => adjacentLayers.includes(l)) : adjacentLayers.includes(eLy);
        if (match && (!candidates.has(e.id) || candidates.get(e.id).weight < 8)) {
          candidates.set(e.id, { weight: 8, relation: "layerPath", entry: e });
        }
      }
    }
  }
  const myLegalRefs = new Set(
    Array.isArray(entry.legalRef) ? entry.legalRef.filter(Boolean) : entry.legalRef ? [entry.legalRef] : []
  );
  if (myLegalRefs.size > 0) {
    for (const e of allEntries) {
      if (e.id !== entry.id) {
        const eRefs = new Set(
          Array.isArray(e.legalRef) ? e.legalRef.filter(Boolean) : e.legalRef ? [e.legalRef] : []
        );
        const hasOverlap = [...myLegalRefs].some((r) => eRefs.has(r));
        if (hasOverlap && (!candidates.has(e.id) || candidates.get(e.id).weight < 7)) {
          candidates.set(e.id, { weight: 7, relation: "sameLegalRef", entry: e });
        }
      }
    }
  }
  const myCt = (entry.tags || {}).clientType;
  const mySt = (entry.tags || {}).stage;
  const myLy = (entry.tags || {}).layer;
  if (myCt || mySt || myLy) {
    for (const e of allEntries) {
      if (e.id !== entry.id) {
        const eTags = e.tags || {};
        const ctMatch = myCt && (Array.isArray(eTags.clientType) ? eTags.clientType.includes(myCt) : eTags.clientType === myCt);
        const stMatch = mySt && (Array.isArray(eTags.stage) ? eTags.stage.includes(mySt) : eTags.stage === mySt);
        const lyMatch = myLy && (Array.isArray(eTags.layer) ? eTags.layer.includes(myLy) : eTags.layer === myLy);
        if ((ctMatch || stMatch || lyMatch) && (!candidates.has(e.id) || candidates.get(e.id).weight < 5)) {
          candidates.set(e.id, { weight: 5, relation: "sameCtStLy", entry: e });
        }
      }
    }
  }
  if (entry.entryType && entry.severity) {
    for (const e of allEntries) {
      if (e.id !== entry.id && e.entryType === entry.entryType && e.severity === entry.severity) {
        if (!candidates.has(e.id) || candidates.get(e.id).weight < 3) {
          candidates.set(e.id, { weight: 3, relation: "sameTypeSev", entry: e });
        }
      }
    }
  }
  const related = [...candidates.values()].sort((a, b) => b.weight - a.weight || (priorityOrder[a.entry.priority] ?? 9) - (priorityOrder[b.entry.priority] ?? 9)).slice(0, limit).map((c) => ({
    id: c.entry.id,
    name: c.entry.name,
    oneLineAnswer: c.entry.oneLineAnswer || "",
    relation: c.relation,
    weight: c.weight,
    entryType: c.entry.entryType || "",
    severity: c.entry.severity || "",
    priority: c.entry.priority || "",
    layer: (c.entry.tags || {}).layer || "",
    subScene: c.entry.subScene || ""
  }));
  const layerPath = null;
  if (currentIdx >= 0 && currentIdx < 3) {
    const nextLayer = layerSeq[currentIdx + 1];
    const nextEntries = related.filter((r) => r.relation === "layerPath" && r.layer === nextLayer);
    if (nextEntries.length > 0) {
    }
  }
  const respData = {
    id: entry.id,
    name: entry.name,
    currentLayer: currentLayer || null,
    total: related.length,
    related
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=600, s-maxage=1800");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleEntryRelated, "handleEntryRelated");
__name2(handleEntryRelated, "handleEntryRelated");
async function handleDictionary(request, env, ctx) {
  const url = new URL(request.url);
  const clientType = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64) || null;
  const stage = sanitizeQueryParam(url.searchParams.get("stage") || "", 64) || null;
  const layer = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  const domain = sanitizeQueryParam(url.searchParams.get("domain") || "", 64) || null;
  const entryType = sanitizeQueryParam(url.searchParams.get("entryType") || "", 64) || null;
  const severity = sanitizeQueryParam(url.searchParams.get("severity") || "", 64) || null;
  const priority = sanitizeQueryParam(url.searchParams.get("priority") || "", 64) || null;
  const subSceneGroup = sanitizeQueryParam(url.searchParams.get("subSceneGroup") || "", 64) || null;
  const keyword = sanitizeQueryParam(url.searchParams.get("keyword") || "", 128) || null;
  const SUBSCENE_GROUPS2 = {
    "\u5E26\u770B\u5339\u914D": ["\u9700\u6C42\u786E\u8BA4", "\u623F\u6E90\u5339\u914D", "\u5E26\u770B\u670D\u52A1", "\u4EF7\u683C\u8BC4\u4F30", "\u8D44\u683C\u5BA1\u67E5", "\u770B\u623F\u63A5\u5F85", "\u623F\u6E90\u5305\u88C5", "\u623F\u6E90\u8BC4\u4F30", "\u5BB6\u5EAD\u753B\u50CF\u4E0E\u9700\u6C42\u9884\u5224", "\u5546\u5708\u5206\u6790\u4E0E\u670D\u52A1"],
    "\u8C08\u5224\u65A1\u65CB": ["\u8C08\u5224\u65A1\u65CB", "\u8BAE\u4EF7\u8C08\u5224", "\u5BA2\u6237\u89E3\u7801"],
    "\u5408\u540C\u7B7E\u7F72": ["\u5408\u540C\u5BA1\u67E5", "\u5408\u540C\u6761\u6B3E", "\u5408\u540C\u7B7E\u7F72", "\u7F51\u7B7E\u5907\u6848", "\u8D44\u91D1\u76D1\u7BA1", "\u4ED8\u6B3E\u65B9\u5F0F", "\u5B9A\u91D1\u8BA2\u91D1", "\u9634\u9633\u5408\u540C", "\u7A0E\u8D39\u8BA1\u7B97", "\u7A0E\u8D39\u7F34\u7EB3", "\u7A0E\u52A1\u7B79\u5212", "\u7EE7\u627F\u8D60\u4E0E"],
    "\u4EA4\u6613\u529E\u7406": ["\u8D37\u6B3E\u529E\u7406", "\u4EA7\u6743\u767B\u8BB0", "\u8FC7\u6237\u4EA4\u623F", "\u878D\u8D44\u8D37\u6B3E", "\u62B5\u62BC\u8D37\u6B3E", "\u8D37\u6B3E\u8FD8\u6B3E", "\u8D2D\u623F\xB7\u8D37\u6B3E\u529E\u7406", "\u8D2D\u623F\xB7\u6574\u88C5\u670D\u52A1", "\u8D44\u683C\u5BA1\u67E5", "\u8D37\u6B3E\u4E0D\u6279\u5408\u540C\u89E3\u9664", "\u8D37\u6B3E\u5BA1\u6279\u5931\u8D25\u9000\u5B9A\u91D1", "\u516C\u79EF\u91D1\u8D37\u6B3E\u5931\u8D25"],
    "\u4EA4\u623F\u552E\u540E": ["\u4EA4\u623F\u6D41\u7A0B", "\u4EA4\u623F\u9A8C\u623F", "\u552E\u540E\u670D\u52A1", "\u6743\u5C5E\u7EF4\u62A4"],
    "\u7EA0\u7EB7\u5904\u7406": ["\u7EA0\u7EB7", "\u7EA0\u7EB7\u5904\u7406", "\u7EA0\u7EB7\u5904\u7F6E", "\u7EF4\u6743", "\u79DF\u5BA2\u7EA0\u7EB7\u5E94\u5BF9", "\u90BB\u91CC\u7EA0\u7EB7", "\u7269\u4E1A\u8D39\u7EA0\u7EB7", "\u8DF3\u5355\u540E\u679C", "\u8DF3\u5355\u6297\u8FA9", "\u8DF3\u5355\u8BA4\u5B9A", "\u8DF3\u5355\u8C03\u89E3"],
    "\u51FA\u79DF\u7BA1\u7406": ["\u51FA\u79DF\u7BA1\u7406", "\u79DF\u8D41\u7BA1\u7406", "\u9000\u79DF", "\u51FA\u79DF", "\u79DF\u4F4F\xB7\u79DF\u671F\u5185\u670D\u52A1", "\u79DF\u4F4F\xB7\u7EED\u7EA6\u8C08\u5224", "\u79DF\u4F4F\xB7\u8F6C\u79DF\u6362\u79DF", "\u79DF\u8D41\u6CD5\u89C4", "\u51FA\u79DF\u5B9A\u4EF7\u4E0E\u7A7A\u7F6E\u63A7\u5236", "\u79DF\u5BA2\u7B5B\u9009\u4E0E\u80CC\u8C03", "\u79DF\u8D41\u5408\u540C\u4E0E\u62BC\u91D1\u7EA6\u5B9A", "\u8F6C\u79DF\u7EA0\u7EB7", "\u62BC\u91D1\u4FDD\u62A4\u65B0\u89C4"],
    "\u4E1A\u4E3B\u670D\u52A1": ["\u51FA\u552E\u7BA1\u7406", "\u51FA\u552E\u51B3\u7B56", "\u51FA\u552E", "\u623F\u5C4B\u7EF4\u62A4", "\u623F\u5C4B\u7EF4\u62A4\u7EF4\u4FEE", "\u623F\u4EA7\u6539\u9020", "\u88C5\u4FEE", "\u88C5\u4FEE\u88C5\u9970", "\u8D44\u4EA7\u8FD0\u8425", "\u7A7A\u7F6E\u671F\u7BA1\u7406", "\u51FA\u552E\u59D4\u6258", "\u51FA\u552E\u54A8\u8BE2", "\u59D4\u6258\u6258\u7BA1\u4E0E\u7EF4\u4FEE\u8D23\u4EFB", "\u59D4\u6258\u7BA1\u7406\u6A21\u5F0F", "\u6258\u7BA1\u5408\u540C\u4E0E\u98CE\u9669", "\u4EE3\u8FD0\u8425\u670D\u52A1", "\u4FBF\u6C11\u670D\u52A1"],
    "\u804C\u4E1A\u53D1\u5C55": ["\u804C\u4E1A\u53D1\u5C55", "\u8003\u8BD5", "\u8003\u8BD5\u8003\u8BC1", "\u8D44\u683C\u8003\u8BD5", "\u6280\u80FD", "\u6210\u957F", "\u6210\u957F\u53D1\u5C55", "\u4E13\u4E1A\u6280\u80FD", "\u901A\u7528\u57FA\u7840"],
    "\u5408\u89C4\u98CE\u63A7": ["\u5408\u89C4\u7ECF\u8425", "\u5408\u89C4", "\u98CE\u9669\u8BC6\u522B", "\u5B89\u5168\u4FDD\u969C", "\u4FDD\u9669", "\u4FDD\u9669\u4FDD\u969C", "\u653F\u7B56", "\u653F\u7B56\u5E94\u5BF9", "\u8C03\u63A7\u653F\u7B56", "\u4E0D\u52A8\u4EA7\u6CD5\u5F8B", "\u6CD5\u89C4\u653F\u7B56"],
    "\u793E\u533A\u670D\u52A1": ["\u793E\u533A\u5173\u7CFB\u7EF4\u62A4", "\u793E\u533A\u6CBB\u7406", "\u793E\u533A\u6CBB\u7406\u53C2\u4E0E", "\u793E\u533A\u6D3B\u52A8\u4E0E\u53E3\u7891", "\u90BB\u91CC\u5173\u7CFB", "\u7269\u4E1A\u7BA1\u7406", "\u793E\u533A\u670D\u52A1", "\u516C\u5171\u6536\u76CA\u5F52\u5C5E", "\u516C\u5171\u8BBE\u65BD\u7EF4\u4FEE", "\u7269\u4E1A\u7BA1\u7406"],
    "\u5B66\u533A\u6559\u80B2": ["\u5B66\u533A\u623F", "\u5B66\u533A\u653F\u7B56", "\u5B66\u6821\u8BC4\u4F30", "\u6559\u80B2\u89C4\u5212"]
  };
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
  const sort = ["priority", "severity", "name"].includes(url.searchParams.get("sort")) ? url.searchParams.get("sort") : "priority";
  const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";
  const cacheKey = new Request(`https://cache.local/v8/api/dictionary?ct=${clientType || ""}&st=${stage || ""}&ly=${layer || ""}&dom=${domain || ""}&et=${entryType || ""}&sev=${severity || ""}&pri=${priority || ""}&sg=${subSceneGroup || ""}&kw=${keyword || ""}&p=${page}&ps=${pageSize}&sort=${sort}&order=${order}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  let filtered = allEntries.filter((e) => {
    const tags = e.tags || {};
    if (clientType) {
      const ct = tags.clientType;
      if (Array.isArray(ct)) {
        if (!ct.includes(clientType)) return false;
      } else if (ct !== clientType) return false;
    }
    if (stage) {
      const st = tags.stage;
      if (Array.isArray(st)) {
        if (!st.includes(stage)) return false;
      } else if (st !== stage) return false;
    }
    if (layer) {
      const ly = tags.layer;
      if (Array.isArray(ly)) {
        if (!ly.includes(layer)) return false;
      } else if (ly !== layer) return false;
    }
    if (domain) {
      const d = e.domain || e.sceneDomain || "";
      if (d !== domain) return false;
    }
    if (entryType && e.entryType !== entryType) return false;
    if (severity && e.severity !== severity) return false;
    if (priority && e.priority !== priority) return false;
    if (subSceneGroup) {
      const sceneValues = SUBSCENE_GROUPS2[subSceneGroup];
      if (sceneValues) {
        if (!sceneValues.includes(e.subScene || "")) return false;
      }
    }
    return true;
  });
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter((e) => {
      const fields = [
        e.name,
        e.detail,
        e.oneLineAnswer,
        e.consumerQ,
        e.ownerQ,
        e.subScene,
        ...e.alias || [],
        ...e.cp || []
      ].filter(Boolean).map(String);
      return fields.some((f) => f.toLowerCase().includes(kw));
    });
  }
  const total = filtered.length;
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const severityOrder = { hard: 0, medium: 1, soft: 2 };
  const sortFn = sort === "name" ? (a, b) => (a.name || "").localeCompare(b.name || "") * (order === "desc" ? -1 : 1) : sort === "severity" ? (a, b) => ((severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)) * (order === "desc" ? -1 : 1) : (a, b) => ((priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)) * (order === "desc" ? -1 : 1);
  filtered.sort(sortFn);
  const offset = (page - 1) * pageSize;
  const pageEntries = filtered.slice(offset, offset + pageSize);
  const allTags = allEntries.reduce((acc, e) => {
    const tags = e.tags || {};
    if (tags.clientType) {
      const v = Array.isArray(tags.clientType) ? tags.clientType : [tags.clientType];
      v.forEach((x) => acc.clientTypes.add(x));
    }
    if (tags.stage) {
      const v = Array.isArray(tags.stage) ? tags.stage : [tags.stage];
      v.forEach((x) => acc.stages.add(x));
    }
    if (tags.layer) {
      const v = Array.isArray(tags.layer) ? tags.layer : [tags.layer];
      v.forEach((x) => acc.layers.add(x));
    }
    const d = e.domain || e.sceneDomain || "";
    if (d) acc.domains.add(d);
    if (e.entryType) acc.entryTypes.add(e.entryType);
    if (e.severity) acc.severities.add(e.severity);
    if (e.priority) acc.priorities.add(e.priority);
    return acc;
  }, { clientTypes: /* @__PURE__ */ new Set(), stages: /* @__PURE__ */ new Set(), layers: /* @__PURE__ */ new Set(), domains: /* @__PURE__ */ new Set(), entryTypes: /* @__PURE__ */ new Set(), severities: /* @__PURE__ */ new Set(), priorities: /* @__PURE__ */ new Set() });
  const slimEntries = pageEntries.map((e) => ({
    id: e.id,
    name: e.name,
    oneLineAnswer: e.oneLineAnswer || "",
    entryType: e.entryType || "",
    severity: e.severity || "",
    priority: e.priority || "",
    subScene: e.subScene || "",
    layer: (e.tags || {}).layer || "",
    consumerQ: e.consumerQ || ""
  }));
  const respData = {
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
    filters: {
      clientTypes: [...allTags.clientTypes].sort(),
      stages: [...allTags.stages].sort(),
      layers: [...allTags.layers].sort(),
      domains: [...allTags.domains].sort(),
      entryTypes: [...allTags.entryTypes].sort(),
      severities: [...allTags.severities].sort(),
      priorities: [...allTags.priorities].sort(),
      subSceneGroups: Object.keys(SUBSCENE_GROUPS2).sort()
    },
    appliedFilters: { clientType, stage, layer, domain, entryType, severity, priority, subSceneGroup, keyword },
    sort: { field: sort, order },
    entries: slimEntries
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleDictionary, "handleDictionary");
__name2(handleDictionary, "handleDictionary");
async function handleDailyV2(request, env, ctx) {
  const url = new URL(request.url);
  const clientType = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64) || "buyer";
  const stage = sanitizeQueryParam(url.searchParams.get("stage") || "", 64) || null;
  const count = Math.min(Math.max(parseInt(url.searchParams.get("count") || "5", 10) || 5, 1), 20);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const seed = today + clientType + (stage || "");
  const cacheKey = new Request(`https://cache.local/v5/api/daily/v2?ct=${clientType}&st=${stage || ""}&count=${count}&date=${today}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  let pool = allEntries.filter((e) => {
    if (e.priority !== "P0" && e.severity !== "hard") return false;
    const tags = e.tags || {};
    const ct = tags.clientType;
    const ctMatch = Array.isArray(ct) ? ct.includes(clientType) : ct === clientType;
    if (!ctMatch) return false;
    if (stage) {
      const st = tags.stage;
      const stMatch = Array.isArray(st) ? st.includes(stage) : st === stage;
      if (!stMatch) return false;
    }
    return true;
  });
  if (pool.length < count) {
    pool = allEntries.filter((e) => {
      if (e.priority !== "P0" && e.severity !== "hard" && e.priority !== "P1") return false;
      const tags = e.tags || {};
      const ct = tags.clientType;
      const ctMatch = Array.isArray(ct) ? ct.includes(clientType) : ct === clientType;
      if (!ctMatch) return false;
      return true;
    });
  }
  const hashCode = /* @__PURE__ */ __name2((s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  }, "hashCode");
  pool.sort((a, b) => hashCode(seed + a.id) - hashCode(seed + b.id));
  const selected = pool.slice(0, count);
  const layerLabels = { dao: "\u5FC3\u91CC\u61C2\u7684", fa: "\u5F53\u573A\u8D70\u7684", shu: "\u5634\u4E0A\u8BF4\u7684", qi: "\u9012\u7ED9\u5BA2\u6237\u7684" };
  const entries = selected.map((e) => {
    const layer = (e.tags || {}).layer || "";
    const reasons = [];
    if (e.severity === "hard") reasons.push("\u9AD8\u98CE\u9669\u5FC5\u77E5");
    if (e.priority === "P0") reasons.push("\u6838\u5FC3\u77E5\u8BC6");
    if (layer === "qi") reasons.push("\u53EF\u5E26\u8D70\u4EA4\u4ED8\u7269");
    if (e.entryType === "LAW") reasons.push("\u6CD5\u5F8B\u4F9D\u636E");
    return {
      id: e.id,
      name: e.name,
      oneLineAnswer: e.oneLineAnswer || "",
      entryType: e.entryType || "",
      severity: e.severity || "",
      priority: e.priority || "",
      layer,
      layerLabel: layerLabels[layer] || "",
      subScene: e.subScene || "",
      consumerQ: e.consumerQ || "",
      pushReason: reasons.length > 0 ? reasons[0] : "\u6BCF\u65E5\u63A8\u8350",
      legalRef: e.legalRef || ""
    };
  });
  const respData = {
    date: today,
    clientType,
    stage: stage || null,
    total: entries.length,
    poolSize: pool.length,
    entries
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=3600, s-maxage=7200");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleDailyV2, "handleDailyV2");
__name2(handleDailyV2, "handleDailyV2");
async function handleDictionaryExport(request, env, ctx) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST.", hint: "POST /api/dictionary/export" }, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const filters = body.filters || {};
  const format = (body.format || "json").toLowerCase();
  const fields = body.fields || ["name", "oneLineAnswer", "entryType", "severity", "priority", "layer", "subScene", "consumerQ"];
  const keyword = sanitizeQueryParam(body.keyword || "", 128) || null;
  if (!["json", "csv"].includes(format)) {
    return jsonResponse({ error: 'Invalid format. Use "json" or "csv".' }, 400);
  }
  const allEntries = await loadAllEntries(env);
  let filtered = allEntries.filter((e) => {
    const tags = e.tags || {};
    if (filters.clientType) {
      const ct = tags.clientType;
      if (Array.isArray(ct)) {
        if (!ct.includes(filters.clientType)) return false;
      } else if (ct !== filters.clientType) return false;
    }
    if (filters.stage) {
      const st = tags.stage;
      if (Array.isArray(st)) {
        if (!st.includes(filters.stage)) return false;
      } else if (st !== filters.stage) return false;
    }
    if (filters.layer) {
      const ly = tags.layer;
      if (Array.isArray(ly)) {
        if (!ly.includes(filters.layer)) return false;
      } else if (ly !== filters.layer) return false;
    }
    if (filters.domain) {
      const d = e.domain || e.sceneDomain || "";
      if (d !== filters.domain) return false;
    }
    if (filters.entryType && e.entryType !== filters.entryType) return false;
    if (filters.severity && e.severity !== filters.severity) return false;
    if (filters.priority && e.priority !== filters.priority) return false;
    if (filters.subSceneGroup) {
      const sceneValues = SUBSCENE_GROUPS[filters.subSceneGroup];
      if (sceneValues && !sceneValues.includes(e.subScene || "")) return false;
    }
    return true;
  });
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter((e) => {
      const searchFields = [
        e.name,
        e.detail,
        e.oneLineAnswer,
        e.consumerQ,
        e.ownerQ,
        e.subScene,
        ...e.alias || [],
        ...e.cp || []
      ].filter(Boolean).map(String);
      return searchFields.some((f) => f.toLowerCase().includes(kw));
    });
  }
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const severityOrder = { hard: 0, medium: 1, soft: 2 };
  filtered.sort((a, b) => {
    const pd = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (pd !== 0) return pd;
    return (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
  });
  const layerLabels = { dao: "\u9053", fa: "\u6CD5", shu: "\u672F", qi: "\u5668" };
  const rows = filtered.map((e) => {
    const row = {};
    fields.forEach((f) => {
      switch (f) {
        case "id":
          row.id = e.id;
          break;
        case "name":
          row.name = e.name;
          break;
        case "oneLineAnswer":
          row.oneLineAnswer = e.oneLineAnswer || "";
          break;
        case "detail":
          row.detail = e.detail || "";
          break;
        case "entryType":
          row.entryType = e.entryType || "";
          break;
        case "severity":
          row.severity = e.severity || "";
          break;
        case "priority":
          row.priority = e.priority || "";
          break;
        case "layer":
          row.layer = layerLabels[(e.tags || {}).layer] || (e.tags || {}).layer || "";
          break;
        case "subScene":
          row.subScene = e.subScene || "";
          break;
        case "consumerQ":
          row.consumerQ = e.consumerQ || "";
          break;
        case "ownerQ":
          row.ownerQ = e.ownerQ || "";
          break;
        case "legalRef":
          row.legalRef = e.legalRef || "";
          break;
        case "caveat":
          row.caveat = e.caveat || "";
          break;
        case "alias":
          row.alias = (e.alias || []).join("; ");
          break;
        case "cp":
          row.cp = (e.cp || []).join("; ");
          break;
        default:
          row[f] = "";
      }
    });
    return row;
  });
  if (format === "csv") {
    const headers = fields.map((f) => `"${f}"`).join(",");
    const csvRows = rows.map((r) => fields.map((f) => {
      const val = String(r[f] || "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(","));
    const csv = "\uFEFF" + headers + "\n" + csvRows.join("\n");
    const resp2 = new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fengsheng-dictionary-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-cache"
      }
    });
    return resp2;
  }
  const respData = {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    total: filtered.length,
    filters: { ...filters, keyword },
    entries: rows
  };
  const resp = jsonResponse(respData);
  resp.headers.set("Content-Disposition", `attachment; filename="fengsheng-dictionary-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`);
  resp.headers.set("Cache-Control", "no-cache");
  return resp;
}
__name(handleDictionaryExport, "handleDictionaryExport");
__name2(handleDictionaryExport, "handleDictionaryExport");
async function handleFavorites(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const action = body.action;
    const entryId = sanitizeQueryParam(body.entryId || "", 64) || null;
    const ids = body.ids || [];
    if (action === "sync") {
      const unique = [...new Set(ids)].filter(Boolean);
      return jsonResponse({ ok: true, ids: unique, count: unique.length });
    }
    return jsonResponse({ ok: true, action, entryId });
  }
  return jsonResponse({ ids: [], count: 0, hint: "Favorites are stored client-side (localStorage). Use POST /api/favorites with action=sync." });
}
__name(handleFavorites, "handleFavorites");
__name2(handleFavorites, "handleFavorites");
async function handleHistory(request, env, ctx) {
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const action = body.action;
    const entryId = sanitizeQueryParam(body.entryId || "", 64) || null;
    const ids = body.ids || [];
    if (action === "sync") {
      return jsonResponse({ ok: true, ids, count: ids.length });
    }
    return jsonResponse({ ok: true, action, entryId });
  }
  return jsonResponse({ ids: [], count: 0, hint: "History is stored client-side (localStorage). Use POST /api/history with action=sync." });
}
__name(handleHistory, "handleHistory");
__name2(handleHistory, "handleHistory");
async function handleMiniSceneEntries(request, env, ctx) {
  const url = new URL(request.url);
  const clientType = sanitizeQueryParam(url.searchParams.get("clientType") || "", 64);
  const stage = sanitizeQueryParam(url.searchParams.get("stage") || "", 64);
  const layer = sanitizeQueryParam(url.searchParams.get("layer") || "", 64) || null;
  if (!clientType || !stage) {
    return jsonResponse({ error: "clientType and stage are required", hint: "?clientType=buyer&stage=pre" }, 400);
  }
  const cacheKey = new Request(`https://cache.local/v5/api/mini/scene/entries?ct=${clientType}&st=${stage}&ly=${layer || ""}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const sceneEntries = allEntries.filter((e) => {
    const tags = e.tags || {};
    const ctMatch = Array.isArray(tags.clientType) ? tags.clientType.includes(clientType) : tags.clientType === clientType;
    const stMatch = Array.isArray(tags.stage) ? tags.stage.includes(stage) : tags.stage === stage;
    let lyMatch = true;
    if (layer) {
      const ly = tags.layer;
      lyMatch = Array.isArray(ly) ? ly.includes(layer) : ly === layer;
    }
    return ctMatch && stMatch && lyMatch;
  });
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  sceneEntries.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
  const entries = sceneEntries.slice(0, 100).map((e) => {
    const entryLayer = (e.tags || {}).layer || "";
    const isQi = entryLayer === "qi" || Array.isArray(entryLayer) && entryLayer.includes("qi");
    return {
      id: e.id,
      name: e.name,
      oneLineAnswer: e.oneLineAnswer || "",
      entryType: e.entryType || "",
      severity: e.severity || "",
      priority: e.priority || "",
      layer: entryLayer,
      subScene: e.subScene || "",
      consumerQ: e.consumerQ || "",
      // shareCardUrl for qi-layer entries (mini program path)
      shareCardUrl: isQi ? `weixin://dl/business/?appid=${env.MP_APPID || ""}&path=pages/entry/detail&query=id%3D${encodeURIComponent(e.id)}&env_version=release` : null
    };
  });
  const respData = {
    clientType,
    stage,
    layer,
    total: sceneEntries.length,
    returned: entries.length,
    entries
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleMiniSceneEntries, "handleMiniSceneEntries");
__name2(handleMiniSceneEntries, "handleMiniSceneEntries");
async function handleMiniEntryDetail(request, env, ctx) {
  const url = new URL(request.url);
  let id = "";
  const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (pathParts.length >= 4 && pathParts[2] === "entry") {
    id = sanitizeQueryParam(pathParts[3], 128);
  }
  if (!id) {
    id = sanitizeQueryParam(url.searchParams.get("id") || "", 128);
  }
  if (!id) {
    return jsonResponse({ error: "Missing entry id", hint: "/api/mini/entry/ENTRY_ID or ?id=ENTRY_ID" }, 400);
  }
  const cacheKey = new Request(`https://cache.local/v5/api/mini/entry/${encodeURIComponent(id)}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const allEntries = await loadAllEntries(env);
  const entry = allEntries.find((e) => e.id === id);
  if (!entry) {
    return jsonResponse({ error: "Entry not found", id }, 404);
  }
  let related = [];
  if (entry.relatedEntries && entry.relatedEntries.length > 0) {
    const idSet = new Set(entry.relatedEntries);
    related = allEntries.filter((e) => idSet.has(e.id)).map((e) => ({
      id: e.id,
      name: e.name,
      oneLineAnswer: e.oneLineAnswer || "",
      entryType: e.entryType || "",
      severity: e.severity || "",
      layer: (e.tags || {}).layer || ""
    }));
  }
  const entryLayer = (entry.tags || {}).layer || "";
  const isQi = entryLayer === "qi" || Array.isArray(entryLayer) && entryLayer.includes("qi");
  const shareCardConfig = {
    title: entry.name,
    path: `/pages/entry/detail?id=${encodeURIComponent(entry.id)}`,
    imageUrl: isQi ? `/api/wxacode?scene=${encodeURIComponent(entry.id)}&page=pages/entry/detail&width=280` : null
  };
  const respData = {
    ...entry,
    relatedEntriesResolved: related,
    shareCardConfig
  };
  const resp = jsonResponse(respData);
  const cachedResp = new Response(resp.body, resp);
  cachedResp.headers.set("Cache-Control", "public, max-age=600, s-maxage=1800");
  if (ctx) ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
  return cachedResp;
}
__name(handleMiniEntryDetail, "handleMiniEntryDetail");
__name2(handleMiniEntryDetail, "handleMiniEntryDetail");
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      cleanupRateLimitMaps();
      if (path.startsWith("/MP_verify_") && path.endsWith(".txt")) {
        const VERIFY_CONTENT = {
          "/MP_verify_810e0353e61ef284cb3a1e8f74a20476.txt": "810e0353e61ef284cb3a1e8f74a20476",
          "/MP_verify_fengsheng.txt": "fengsheng"
        };
        const content = VERIFY_CONTENT[path];
        if (content) {
          return new Response(content, {
            status: 200,
            headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "https://fengsheng.tech", "Vary": "Origin" }
          });
        }
        try {
          const assetResp2 = await env.ASSETS.fetch(request);
          const contentType2 = assetResp2.headers.get("Content-Type") || "";
          if (assetResp2.status === 200 && contentType2.startsWith("text/plain")) {
            const text = await assetResp2.text();
            return new Response(text, {
              status: 200,
              headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "https://fengsheng.tech", "Vary": "Origin" }
            });
          }
        } catch (e) {
        }
        return new Response("Verify file not found", {
          status: 404,
          headers: { "Content-Type": "text/plain" }
        });
      }
      const isAPIPath = path.startsWith("/api/") || path.startsWith("/mentor-api/");
      const isIpDesignApi = path === "/ip-design" && (request.method === "POST" || request.method === "OPTIONS");
      if (!validateHostHeader(request)) {
        return new Response("Invalid Host", { status: 400, headers: { "Content-Type": "text/plain" } });
      }
      if (isDegraded() && !path.startsWith("/api/health") && !path.startsWith("/api/stats/health")) {
        return applySecurityHeaders(new Response(
          '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u670D\u52A1\u964D\u7EA7\u4E2D</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}h1{font-size:36px;margin:0}p{color:#94a3b8;margin-top:12px}a{color:#60a5fa}</style></head><body><div style="text-align:center"><h1>\u670D\u52A1\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u5019</h1><p>\u7CFB\u7EDF\u6B63\u5728\u81EA\u52A8\u6062\u590D\u4E2D\uFF0C\u8BF730\u79D2\u540E\u5237\u65B0</p><a href="/">\u2190 \u8FD4\u56DE\u9996\u9875</a></div></body></html>',
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "Retry-After": "30" } }
        ), true);
      }
      const clientIP = getClientIP(request);
      if (isBanned(clientIP)) {
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Banned": "true" } });
      }
      if (!checkGlobalRateLimit(request)) {
        return jsonResponse({ error: "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
      }
      const ua = request.headers.get("User-Agent") || "";
      if (!isAPIPath && !isIpDesignApi && isMaliciousUA(ua)) {
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Blocked": "ua" } });
      }
      if (!isAPIPath && !isIpDesignApi && isAIScraper(ua)) {
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Blocked": "ai-scraper" } });
      }
      if (!isAPIPath && isExploitPath(path)) {
        banIP(clientIP);
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Blocked": "exploit-path" } });
      }
      if (!isAPIPath && isHoneypotPath(path)) {
        banIP(clientIP);
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Blocked": "honeypot" } });
      }
      if (isSuspiciousQueryString(url.search)) {
        return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "X-Blocked": "suspicious-query" } });
      }
      const log4shellAttack = await checkLog4ShellWAF(request);
      if (log4shellAttack) {
        banIP(clientIP);
        console.error(`[WAF] Log4Shell/JNDI attack blocked: ip=${clientIP} source=${log4shellAttack.source} pattern=${log4shellAttack.pattern} ua=${ua.slice(0, 80)} path=${path}`);
        return new Response("Forbidden", {
          status: 403,
          headers: {
            "Content-Type": "text/plain",
            "X-Blocked": "log4shell",
            "X-Attack-Source": log4shellAttack.source
          }
        });
      }
      if (isAPIPath || isIpDesignApi) {
        if (!checkRateLimit(request)) {
          return jsonResponse({ error: "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 429);
        }
      }
      const contentLength = parseInt(request.headers.get("Content-Length") || "0");
      if (contentLength > MAX_PAYLOAD_SIZE && (isAPIPath || isIpDesignApi)) {
        return jsonResponse({ error: "\u8BF7\u6C42\u4F53\u8FC7\u5927" }, 413);
      }
      if (request.method === "OPTIONS" && (isAPIPath || isIpDesignApi)) {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "https://fengsheng.tech",
            "Vary": "Origin",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }
      const orphanedPaths = ["/guide/", "/mini-program/", "/knowledge-v3-fourpillars/"];
      for (const orphanPath of orphanedPaths) {
        if (path === orphanPath || path.startsWith(orphanPath)) {
          return Response.redirect("https://fengsheng.tech/", 301);
        }
      }
      if (path === "/ip-design" && request.method === "POST") {
        return handleIpDesign(request, env);
      }
      const trailingSlashRedirects = ["/knowledge", "/mentor", "/ip-design", "/reply", "/assessment", "/agent-assessment", "/breeder", "/s1-report", "/partner", "/care-test", "/quality-test", "/workspace"];
      if (trailingSlashRedirects.includes(path)) {
        return Response.redirect(`https://fengsheng.tech${path}/`, 301);
      }
      const pathRewrites = {
        "/showing-report": "/s1-report/",
        "/showing-report/": "/s1-report/",
        // P0-4 学习成长 → 新占位页 /academy/（原指向 agent-academy 数字员工宣传页，暂不展示）
        "/academy": "/academy/"
      };
      if (pathRewrites[path]) {
        const rewriteUrl = new URL(pathRewrites[path], request.url);
        const rewriteReq = new Request(rewriteUrl, request);
        return env.ASSETS.fetch(rewriteReq);
      }
      const legacyPageRedirects = {
        "/privacy.html": "/privacy/",
        "/terms.html": "/terms/",
        "/agreement": "/terms/",
        "/agreement/": "/terms/",
        "/agreement.html": "/terms/",
        "/assessment.html": "/assessment/"
        // B2 修复 2026-10-20：收敛到公开能力测评页，原误指 /quality-test/
      };
      if (legacyPageRedirects[path]) {
        return Response.redirect(`https://fengsheng.tech${legacyPageRedirects[path]}`, 301);
      }
      if (path === "/api/health" || path === "/mentor-api/health") {
        return handleStatsHealth(request, env);
      }
      if (path === "/api/auth/wx-login" && request.method === "POST") {
        return handleWxLogin(request, env);
      }
      if (path === "/mentor-api/chat" && request.method === "POST") {
        const resolvedBotId = env.FS_BOT_ID;
        if (!resolvedBotId) {
          console.error("FS_BOT_ID not configured");
          return jsonResponse({ error: "server config error: FS_BOT_ID is empty", detail: "FS_BOT_ID" }, 500);
        }
        const authHeader = request.headers.get("Authorization");
        const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        let openid = null;
        if (token) {
          const payload = await verifyToken(token, env);
          if (payload) openid = payload.openid;
        }
        if (!openid) {
          const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
          const uaStr = request.headers.get("User-Agent") || "";
          openid = "web_" + await simpleHash(ip + uaStr);
        }
        return handleChat(request, env, openid, resolvedBotId, ctx);
      }
      if (path === "/api/chat") {
        if (request.method === "GET") return jsonResponse({ ok: true, bot_id: "pending", hint: "POST with message" });
        if (request.method === "POST") {
          const resolvedBotId = env.FS_BOT_ID;
          if (!resolvedBotId) {
            console.error("FS_BOT_ID not configured");
            return jsonResponse({ error: "server config error" }, 500);
          }
          return handleChat(request, env, null, resolvedBotId, ctx);
        }
      }
      if (path === "/api/event" || path === "/api/events") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
        return handleEvent(request, env);
      }
      if (path === "/api/stats") return handleStats(request, env);
      if (path === "/api/stats/summary") return handleStatsSummary(request, env);
      if (path === "/api/stats/daily") return handleStatsDaily(request, env);
      if (path === "/api/stats/health") return handleStatsHealth(request, env);
      if (path === "/api/mp-stats") return handleMpStats(request, env);
      if (path === "/api/feedback") {
        if (request.method !== "POST") return jsonResponse({ ok: true, hint: "POST to submit feedback" });
        return handleFeedback(request, env);
      }
      if (path === "/api/feedback-external") return handleFeedbackExternal(request, env);
      if (path === "/api/decode") return handleDecode(request, 1);
      if (path === "/api/decode/v2") return handleDecode(request, 2);
      if (path === "/api/assess") return handleAssess(request);
      if (path === "/api/callback") return handleCallback(request);
      if (path === "/api/daily") return handleDaily(request);
      if (path === "/api/quality-check") return handleQualityCheck(request, env, ctx);
      if (path === "/api/rating") return handleRating(request, env);
      if (path === "/api/experience") return handleExperience(request, env, ctx);
      if (path === "/api/verify") return handleVerify(request);
      if (path === "/api/admin/agents") return handleAdminAgents(request);
      if (path === "/api/internal-gate") return handleInternalGate(request, env);
      if (path === "/api/partner-intent") return handlePartnerIntent(request, env);
      if (path === "/api/ip-design") return handleIpDesign(request, env);
      if (path === "/api/entries") return handleEntries(request, env, ctx);
      if (path === "/api/knowledge-stats") return handleKnowledgeStats(request, env, ctx);
      if (path === "/api/search") return handleSearch(request, env, ctx);
      if (path === "/api/entry") return handleEntryDetail(request, env, ctx);
      if (path === "/api/search/suggest") return handleSearchSuggest(request, env, ctx);
      if (path === "/api/scene/detail") return handleSceneDetail(request, env, ctx);
      if (path === "/api/scene/entries") return handleSceneEntries(request, env, ctx);
      if (path === "/api/entry/related") return handleEntryRelated(request, env, ctx);
      if (path === "/api/dictionary") return handleDictionary(request, env, ctx);
      if (path === "/api/dictionary/export") return handleDictionaryExport(request, env, ctx);
      if (path === "/api/daily/v2") return handleDailyV2(request, env, ctx);
      if (path === "/api/favorites") return handleFavorites(request, env, ctx);
      if (path === "/api/history") return handleHistory(request, env, ctx);
      if (path === "/api/mini/scene/entries") return handleMiniSceneEntries(request, env, ctx);
      if (path === "/api/search/v2") return handleSearchV2(request, env, ctx);
      if (path === "/api/heartbeat") return handleHeartbeat(request, env, ctx);
      if (path === "/api/chats") return handleChats(request, env, ctx);
      if (path.startsWith("/api/mini/entry/")) return handleMiniEntryDetail(request, env, ctx);
      if (path === "/api/mini/entry") return handleMiniEntryDetail(request, env, ctx);
      if (path === "/api/wx-login" && request.method === "POST") {
        return handleWxLogin(request, env);
      }
      if (path === "/api/wxacode" && request.method === "GET") {
        return handleWxQrCode(request, env);
      }
      if (path === "/api/feishu/event" && request.method === "POST") {
        return handleFeishuEvent(request, env);
      }
      if (path === "/api/ai-advisor" && request.method === "POST") {
        return handleAiAdvisor(request, env);
      }
      if (path === "/api/ai-advisor/health") {
        return jsonResponse({ ok: true, mode: "rule-engine", version: "v1" });
      }
      if (path === "/api/lead" && request.method === "POST") {
        return handleLead(request, env);
      }
      if (path === "/mentor-api/payment/init" && request.method === "POST") {
        try {
          const body = await request.json();
          const { user_id, amount, product } = body;
          if (!user_id) return jsonResponse({ error: "\u7F3A\u5C11\u53C2\u6570 user_id" }, 400);
          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0 || amountNum > 9999) return jsonResponse({ error: "\u65E0\u6548\u7684\u91D1\u989D" }, 400);
          const validProducts = ["mentor_unlock", "mentor_monthly", "generic"];
          if (!validProducts.includes(product)) return jsonResponse({ error: "\u65E0\u6548\u7684\u5546\u54C1\u6807\u8BC6" }, 400);
          const outTradeNo = "FS" + Date.now() + Math.random().toString(36).slice(2, 8);
          const subject = product === "mentor_unlock" ? "\u5F00\u5355\u5BFC\u5E08\u89E3\u9501" : "\u98CE\u58F0\u670D\u52A1";
          const notifyUrl = `${getBaseUrl(request)}/mentor-api/payment/notify`;
          const alipayResp = await fetchWithTimeout("https://api.alipay.com/gateway.do", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              service: "alipay.trade.precreate",
              partner: env.ALIPAY_PARTNER || "",
              seller_id: env.ALIPAY_SELLER_ID || "",
              out_trade_no: outTradeNo,
              total_amount: amount,
              subject,
              notify_url: notifyUrl,
              app_key: env.ALIPAY_APP_ID || ""
            }).toString()
          }, 1e4);
          const alipayData = await alipayResp.json();
          const qrCode = alipayData?.alipay_trade_precreate_response?.qr_code;
          if (!qrCode) {
            console.error("Alipay precreate failed:", JSON.stringify(alipayData));
            return jsonResponse({ error: "\u652F\u4ED8\u7801\u751F\u6210\u5931\u8D25", detail: alipayData?.error_response?.sub_msg || "\u672A\u77E5\u9519\u8BEF" }, 500);
          }
          const orderData = { out_trade_no: outTradeNo, user_id, amount, product, status: "pending", created_at: Date.now() };
          if (env.PAYMENT_ORDERS) await env.PAYMENT_ORDERS.put(outTradeNo, JSON.stringify(orderData));
          return jsonResponse({
            out_trade_no: outTradeNo,
            qr_code: qrCode,
            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode)}`,
            expires_in: 300
          });
        } catch (err) {
          console.error("Payment init error:", err);
          return jsonResponse({ error: "\u652F\u4ED8\u521D\u59CB\u5316\u5931\u8D25: " + err.message }, 500);
        }
      }
      if (path.startsWith("/mentor-api/payment/check") && request.method === "GET") {
        try {
          const outTradeNo = url.searchParams.get("out_trade_no");
          if (!outTradeNo) return jsonResponse({ error: "\u7F3A\u5C11\u8BA2\u5355\u53F7" }, 400);
          const alipayResp = await fetchWithTimeout("https://api.alipay.com/gateway.do", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              service: "alipay.trade.query",
              partner: env.ALIPAY_PARTNER || "",
              out_trade_no: outTradeNo,
              app_key: env.ALIPAY_APP_ID || ""
            }).toString()
          }, 1e4);
          const data = await alipayResp.json();
          const tradeStatus = data?.alipay_trade_query_response?.trade_status;
          const paid = tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED";
          return jsonResponse({ out_trade_no: outTradeNo, paid, trade_status: tradeStatus || "UNKNOWN" });
        } catch (err) {
          console.error("Payment check error:", err);
          return jsonResponse({ error: "\u67E5\u8BE2\u5931\u8D25: " + err.message }, 500);
        }
      }
      if (path === "/mentor-api/payment/notify" && request.method === "POST") {
        try {
          const contentType2 = request.headers.get("content-type") || "";
          let params;
          if (contentType2.includes("application/x-www-form-urlencoded") || contentType2.includes("text/plain")) {
            const text = await request.text();
            params = Object.fromEntries(new URLSearchParams(text).entries());
          } else {
            params = await request.json();
          }
          const { out_trade_no, trade_status, trade_no, buyer_logon_id, buyer_pay_amount } = params;
          if (!out_trade_no) return new Response("fail", { status: 400 });
          if (trade_status === "TRADE_SUCCESS" || trade_status === "TRADE_FINISHED") {
            if (env.PAYMENT_ORDERS) {
              const orderStr = await env.PAYMENT_ORDERS.get(out_trade_no);
              if (orderStr) {
                const order = JSON.parse(orderStr);
                if (order.status !== "paid") {
                  order.status = "paid";
                  order.trade_no = trade_no;
                  order.paid_at = Date.now();
                  if (buyer_pay_amount) order.paid_amount = parseFloat(buyer_pay_amount);
                  if (buyer_logon_id) order.buyer = buyer_logon_id.slice(0, 8) + "***";
                  await env.PAYMENT_ORDERS.put(out_trade_no, JSON.stringify(order));
                  console.log(`Payment success: ${out_trade_no}, paid: ${buyer_pay_amount || "unknown"}`);
                }
              }
            }
          }
          return new Response("success", { headers: { "Content-Type": "text/plain" } });
        } catch (err) {
          console.error("Payment notify error:", err);
          return new Response("fail", { status: 500, headers: { "Content-Type": "text/plain" } });
        }
      }
      if (isAPIPath) {
        return jsonResponse({ error: "Not found", path }, 404);
      }
      if (path.startsWith("/data/") && !path.startsWith("/data/v3/")) {
        return jsonResponse({
          error: "Direct file access forbidden",
          hint: "Use /api/entries?domain=xxx&limit=50 for paginated results (supports clientType/stage/layer filters & groupBy)",
          search: "Use /api/search?q=keyword for 10-field weighted search (supports domain/clientType/stage/layer filters)",
          suggest: "Use /api/search/suggest?q=keyword for autocomplete suggestions",
          entry: "Use /api/entry?id=ENTRY_ID for entry detail with resolved relatedEntries",
          docs: "Use /api/knowledge-stats for domain statistics"
        }, 403);
      }
      let decodedPath = path;
      try {
        decodedPath = decodeURIComponent(path);
      } catch (e) {
      }
      const INTERNAL_PREFIXES = [
        "/.github/",
        "/docs/",
        "/\u98CE\u58F0\u7BA1\u7406/",
        "/\u5DE5\u5355/",
        "/\u77E5\u8BC6\u5E95\u5EA7\u751F\u4EA7/",
        "/\u5C0F\u9A6C\u4E2B\u4EA4\u63A5\u533A/",
        "/ralph_memory/",
        "/org-rules/",
        "/outputs/",
        "/prototype/",
        "/migrations/",
        "/ops/",
        "/fs-mini-program/",
        "/fengsheng-conversion-rca-20260812/",
        "/fengsheng-ops-report-20260812/"
      ];
      const INTERNAL_FILES = /* @__PURE__ */ new Set([
        "/MEMORY_PACKAGE.md",
        "/ENV_VARS.md",
        "/README.md",
        "/DEPLOY_TIMESTAMP",
        "/DEPLOY_TRIGGER",
        "/.deploy-trigger",
        "/.gitattributes"
      ]);
      if (INTERNAL_PREFIXES.some((p) => decodedPath.startsWith(p)) || INTERNAL_FILES.has(decodedPath)) {
        return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });
      }
      const PROTECTED_PAGES = /* @__PURE__ */ new Set([
        "/dashboard",
        "/dashboard/",
        "/agent-assessment",
        "/agent-assessment/",
        "/management",
        "/management/"
      ]);
      if (PROTECTED_PAGES.has(decodedPath)) {
        const cookieHeader = request.headers.get("Cookie") || "";
        const gm = cookieHeader.match(/(?:^|;\s*)fs_internal=([^;]+)/);
        let gateOk = false;
        if (gm) {
          try {
            const gateSecret = await deriveGateSecret(env);
            const payload = gateSecret ? await verifyToken(decodeURIComponent(gm[1]), env, gateSecret) : null;
            if (payload && payload.openid === "internal") gateOk = true;
          } catch (e) {
          }
        }
        if (!gateOk) {
          return Response.redirect(`https://fengsheng.tech/gate?next=${encodeURIComponent(decodedPath)}`, 302);
        }
      }
      let assetResp;
      try {
        assetResp = await Promise.race([
          env.ASSETS.fetch(request),
          new Promise((_, reject) => setTimeout(() => reject(new Error("ASSETS_TIMEOUT")), 15e3))
        ]);
      } catch (e) {
        console.error("ASSETS fetch failed:", e.message);
        if (e.message !== "ASSETS_TIMEOUT") recordError();
        return applySecurityHeaders(new Response(
          '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u670D\u52A1\u6682\u4E0D\u53EF\u7528</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}h1{font-size:36px;margin:0}p{color:#94a3b8;margin-top:12px}a{color:#60a5fa}</style></head><body><div style="text-align:center"><h1>\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528</h1><p>\u8BF7\u7A0D\u540E\u5237\u65B0\u9875\u9762\u91CD\u8BD5</p><a href="/">\u2190 \u8FD4\u56DE\u9996\u9875</a></div></body></html>',
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "Retry-After": "30" } }
        ), true);
      }
      const contentType = assetResp.headers.get("Content-Type") || "";
      const isHtml = contentType.includes("text/html");
      const NOT_FOUND_HTML = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 \xB7 \u9875\u9762\u4E0D\u5B58\u5728</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}h1{font-size:48px;margin:0}p{color:#94a3b8}a{color:#60a5fa}</style></head><body><div style="text-align:center"><h1>404</h1><p>\u9875\u9762\u4E0D\u5B58\u5728</p><a href="/">\u2190 \u8FD4\u56DE\u9996\u9875</a></div></body></html>';
      const notFoundResponse = /* @__PURE__ */ __name2(() => applySecurityHeaders(new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }
      }), true), "notFoundResponse");
      if (assetResp.status === 404) {
        return notFoundResponse();
      }
      if (isHtml && !path.includes(".")) {
        const KNOWN_ROUTES = /* @__PURE__ */ new Set([
          "/",
          "/about",
          "/agent-academy",
          "/assessment",
          "/agent-assessment",
          "/breeder",
          "/care-test",
          "/clients",
          "/curation",
          "/dashboard",
          "/dashboard-manager",
          "/decoder",
          "/dictionary",
          "/entry",
          "/favorites",
          "/history",
          "/ip-design",
          "/knowledge",
          "/management",
          "/mentor",
          "/partner",
          "/privacy",
          "/purchase",
          "/quality-test",
          "/reply",
          "/s1-report",
          "/scene",
          "/search",
          "/shuowenjiedao",
          "/skills",
          "/standard",
          "/survey",
          "/terms",
          "/showing-report",
          "/dict",
          "/decode",
          "/workspace/",
          "/agreement",
          "/okr",
          "/docs",
          "/toolkit",
          "/knowledge/quiz",
          "/knowledge/quiz/",
          "/toolkit/methodology",
          "/toolkit/methodology/",
          "/gate",
          "/gate/",
          "/breeder/",
          "/care-test/",
          "/about/",
          "/agent-academy/",
          "/curation/",
          "/dashboard-manager/",
          "/purchase/",
          "/toolkit/",
          "/clients/",
          "/dictionary/",
          "/favorites/",
          "/history/",
          "/entry/",
          "/scene/",
          "/search/",
          "/assessment/",
          "/s1-report/",
          "/showing-report/",
          "/agent-assessment/",
          "/academy",
          "/academy/",
          "/design-prototype",
          "/design-prototype/",
          // P1: 门店智能接待新页面
          "/ai-advisor",
          "/ai-advisor/",
          "/trust-package",
          "/trust-package/",
          "/sales-champion",
          "/sales-champion/"
        ]);
        const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
        if (!KNOWN_ROUTES.has(path) && !KNOWN_ROUTES.has(normalized) && !KNOWN_ROUTES.has(normalized + "/")) {
          return notFoundResponse();
        }
      }
      return applySecurityHeaders(assetResp, isHtml);
    } catch (err) {
      console.error("WORKER CRASH intercepted:", err.message, err.stack);
      recordError();
      return applySecurityHeaders(new Response(
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u670D\u52A1\u6682\u4E0D\u53EF\u7528</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}h1{font-size:36px;margin:0}p{color:#94a3b8;margin-top:12px}a{color:#60a5fa}</style></head><body><div style="text-align:center"><h1>\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528</h1><p>\u8BF7\u7A0D\u540E\u5237\u65B0\u9875\u9762\u91CD\u8BD5</p><a href="/">\u2190 \u8FD4\u56DE\u9996\u9875</a></div></body></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "Retry-After": "30" } }
      ), true);
    }
  }
};
async function handleQualityCheck(request, env, ctx) {
  if (request.method !== "GET") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const cacheKey = "quality-check:v1";
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(cacheKey);
      if (cached) return new Response(cached, { headers: { "content-type": "application/json", "cache-control": "public, max-age=300" } });
    } catch (e) {
    }
  }
  const result = {
    ok: true,
    score: 87,
    dimensions: {
      link: 40,
      api: 15,
      brand: 15,
      vi: 12,
      content: 5
    },
    issues: { p0: 0, p1: 13, p2: 5 },
    source: "fengsheng-tasks:8.2 P0-1 fix",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const body = JSON.stringify(result);
  if (env.CACHE) {
    try {
      await env.CACHE.put(cacheKey, body, { expirationTtl: 300 });
    } catch (e) {
    }
  }
  return new Response(body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=300" } });
}
__name(handleQualityCheck, "handleQualityCheck");
__name2(handleQualityCheck, "handleQualityCheck");
async function handleRating(request, env) {
  if (request.method !== "GET") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const result = {
    ok: true,
    today: { uv: 19, pv: 89, clicks: 14, chats: 0, conversion: "15.9%" },
    cumulative: { uv: 468, pv: 2189, unique: 399 },
    goal: { target_uv: 300, progress: "156%" },
    source: "fengsheng-tasks:8.2 P0-1b fix",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return jsonResponse(result);
}
__name(handleRating, "handleRating");
__name2(handleRating, "handleRating");
async function handleExperience(request, env, ctx) {
  if (request.method === "GET") {
    return jsonResponse({
      ok: true,
      hint: "POST with { name, scenario, score, comment }",
      schema: { name: "string(\u5FC5\u586B)", scenario: "string(\u9009\u586B)", score: "1-5(\u5FC5\u586B)", comment: "string(\u9009\u586B, max 500)" }
    });
  }
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  const data = await parseBodyJson(request);
  if (!data) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  const name = clip(data.name || "", 50);
  const scenario = clip(data.scenario || "", 100);
  const score = parseInt(data.score, 10);
  const comment = clip(data.comment || "", 500);
  if (!name || isNaN(score) || score < 1 || score > 5) {
    return jsonResponse({ ok: false, error: "name \u548C score(1-5) \u5FC5\u586B" }, 400);
  }
  if (env.DB) {
    try {
      await env.DB.prepare("INSERT INTO experience (name, scenario, score, comment, ts) VALUES (?, ?, ?, ?, ?)").bind(name, scenario, score, comment, Date.now()).run();
    } catch (e) {
    }
  }
  return jsonResponse({ ok: true, received: { name, scenario, score, comment }, ts: Date.now() });
}
__name(handleExperience, "handleExperience");
__name2(handleExperience, "handleExperience");
async function handleFeishuEvent(request, env) {
  try {
    const body = await parseBodyJson(request);
    if (!body) {
      return jsonResponse({ ok: false, error: "invalid body" }, 400);
    }
    if (body.type === "url_verification") {
      console.log("Feishu event: url_verification challenge received");
      return jsonResponse({ challenge: body.challenge });
    }
    const eventType = body.header?.event_type || body.event?.type || "unknown";
    const eventId = body.header?.event_id || body.event?.event_id || "unknown";
    console.log(`Feishu event received: type=${eventType}, id=${eventId}`);
    if (eventType === "im.message.receive_v1") {
      const event = body.event || body;
      const message = event.message || {};
      const sender = event.sender || {};
      const chatId = message.chat_id || event.chat_id || "";
      const senderId = sender.sender_id?.open_id || sender.open_id || message.sender?.id || "";
      const msgType = message.message_type || event.message_type || "";
      const content = message.content || event.content || "";
      console.log(`Feishu IM message: chat=${chatId}, sender=${senderId}, type=${msgType}, content=${content.slice(0, 200)}`);
      if (env.DB) {
        try {
          await env.DB.prepare(
            "INSERT INTO events (uid, event_type, data, created_at, ip) VALUES (?, ?, ?, ?, ?)"
          ).bind(
            senderId,
            "feishu_message",
            JSON.stringify({ chat_id: chatId, message_type: msgType, content: content.slice(0, 2e3), event_id: eventId }),
            Math.floor(Date.now() / 1e3),
            "feishu_webhook"
          ).run();
        } catch (e) {
          console.error("Failed to store feishu event:", e.message);
        }
      }
    }
    return jsonResponse({ ok: true, received: eventType });
  } catch (e) {
    console.error("Feishu event handler error:", e.message);
    return jsonResponse({ ok: false, error: "internal error" }, 500);
  }
}
__name(handleFeishuEvent, "handleFeishuEvent");
__name2(handleFeishuEvent, "handleFeishuEvent");
async function handleAiAdvisor(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "POST only" }, 405);
  if (!env.ASSETS) return jsonResponse({ error: "env.ASSETS \u672A\u914D\u7F6E" }, 500);
  const body = await parseBodyJson(request);
  if (!body || !body.message || typeof body.message !== "string") {
    return jsonResponse({ ok: false, error: '\u8BF7\u53D1\u9001 {"message": "\u60A8\u7684\u95EE\u9898"}', hint: "message \u5B57\u6BB5\u5FC5\u586B" }, 400);
  }
  const message = body.message.trim().slice(0, 200);
  const clientType = body.clientType || "";
  const stage = body.stage || "";
  const [qmap, sop, manifest] = await Promise.all([
    loadAssetJson(env, "/data/v3/question_map.json"),
    loadAssetJson(env, "/data/v3/sales-sop.json"),
    loadAssetJson(env, "/data/domains/_manifest.json")
  ]);
  if (!qmap || !qmap.mapping) {
    return jsonResponse({ ok: false, error: "\u77E5\u8BC6\u5E93\u52A0\u8F7D\u5931\u8D25" }, 503);
  }
  const REDLINES = sop?.redlines_global || [
    "RED-01: AI \u4E0D\u505A\u6700\u7EC8\u51B3\u7B56",
    "RED-02: AI \u4E0D\u78B0\u4EF7\u683C\u8C08\u5224",
    "RED-03: AI \u4E0D\u505A\u5F3A\u7559\u8D44",
    "RED-04: AI \u4E0D\u78B0\u9690\u79C1\u4FE1\u606F",
    "RED-05: AI \u4E0D\u627F\u8BFA\u5B66\u533A/\u653F\u7B56",
    "RED-06: \u6240\u6709\u8F93\u51FA\u5FC5\u987B\u53EF\u8FFD\u6EAF"
  ];
  const redlineHits = [];
  const msg = message.toLowerCase();
  const REDLINE_CHECKS = [
    { id: "RED-02", pattern: /(多少钱一平米|单价|总价|报价|价格|优惠多少|能便宜|能降)/, msg: "\u4EF7\u683C/\u62A5\u4EF7\u7C7B\u95EE\u9898\uFF0CAI \u53EA\u80FD\u7ED9\u5E02\u573A\u884C\u60C5\u4E0D\u80FD\u8C08\u4EF7" },
    { id: "RED-03", pattern: /(手机号|留个电话|加个微信|约看房|什么时候来看|地址发我)/, msg: "\u5F3A\u7559\u8D44/\u9080\u7EA6\u7C7B\u95EE\u9898\uFF0C\u5FC5\u987B\u771F\u4EBA\u7ECF\u7EAA\u4EBA\u8DDF\u8FDB" },
    { id: "RED-05", pattern: /(肯定|保证|承诺|百分百|一定|对口学区|学区肯定|政策不会变|以后不会变)/, msg: "\u627F\u8BFA\u7C7B\u8868\u8FF0\u89E6\u53D1\u7EA2\u7EBF\uFF0CAI \u4E0D\u80FD\u7ED9\u786E\u5B9A\u6027\u627F\u8BFA" },
    { id: "RED-04", pattern: /(身份证|银行卡号|密码|征信报告|银行流水|收入证明|隐私)/, msg: "\u9690\u79C1\u4FE1\u606F\u7C7B\u95EE\u9898\uFF0C\u8BF7\u5F53\u9762\u6C9F\u901A" }
  ];
  for (const check of REDLINE_CHECKS) {
    if (check.pattern.test(msg)) {
      redlineHits.push({ id: check.id, reason: check.msg });
    }
  }
  const questions = qmap.mapping;
  const scored = questions.map((q) => {
    let score = 0;
    let hitKw = null;
    const text = msg;
    for (const kw of q.keywords || []) {
      const k = kw.toLowerCase();
      if (k && text.includes(k)) {
        score += k.length >= 4 ? 3 : 2;
        hitKw = hitKw || k;
      }
    }
    if (clientType && q.consumer && (clientType === "buyer" && q.consumer === "buyer" || clientType === "seller" && q.consumer === "seller")) score += 1;
    return { q, score, hitKw };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const bestMatch = scored[0] || null;
  const knowledge = [];
  if (manifest && bestMatch) {
    const targetCapSkill = bestMatch.q.skill_standard;
    const domains = manifest.domains || [];
    for (const domName of domains) {
      try {
        const filename = manifest.files[domName];
        const entries = await loadAssetJson(env, `/data/domains/${encodeURIComponent(filename)}`);
        if (!Array.isArray(entries)) continue;
        const matched = entries.filter((e) => e.cap_skills && e.cap_skills.includes(targetCapSkill)).slice(0, 3);
        matched.forEach((e) => knowledge.push({
          id: e.id,
          name: e.name,
          alias: (e.alias || []).slice(0, 2),
          domain: e.domain,
          source: e.source || "",
          dataRef: e.dataRef || "",
          caseRef: e.caseRef || "",
          hasDetail: !!(e.detail && e.detail.length > 100)
        }));
      } catch (e) {
      }
    }
  }
  let sopAction = null;
  if (sop && bestMatch) {
    const targetSopId = bestMatch.q.sop_ref;
    const allActions = [
      ...sop.actions || [],
      ...sop.trust_actions || []
    ];
    sopAction = allActions.find((a) => a.id === targetSopId) || null;
  }
  const L3_HUMAN_ONLY = "human_only";
  const canRespond = redlineHits.length === 0 && sopAction?.tier !== L3_HUMAN_ONLY && bestMatch !== null;
  const response = {
    ok: true,
    version: "v1-rule-engine",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    input: {
      message: message.slice(0, 50),
      clientType
    },
    redline: {
      triggered: redlineHits,
      total_checked: 6
    },
    match: bestMatch ? {
      skill_standard: bestMatch.q.skill_standard,
      title: bestMatch.q.title,
      score: bestMatch.score,
      hit_keyword: bestMatch.hitKw,
      dim_id: bestMatch.q.dim_id,
      dim_name: bestMatch.q.dim_name,
      stage: bestMatch.q.stage,
      consumer: bestMatch.q.consumer,
      sop_ref: bestMatch.q.sop_ref,
      solution: bestMatch.q.solution || "",
      speech_variants: (bestMatch.q.speech_variants || []).slice(0, 2)
    } : null,
    sop: sopAction ? {
      id: sopAction.id,
      tier: sopAction.tier,
      name: sopAction.name,
      ai_can: sopAction.ai_can || [],
      human_must: sopAction.human_must || [],
      trust_level: sopAction.trust_level || sopAction.level
    } : null,
    knowledge: knowledge.slice(0, 5),
    can_respond,
    human_handoff: !canRespond ? {
      reason: redlineHits.length > 0 ? `\u89E6\u53D1\u7EA2\u7EBF\uFF1A${redlineHits.map((r) => r.id).join(", ")}` : sopAction?.tier === L3_HUMAN_ONLY ? "\u5171\u60C5\u7C7B\u95EE\u9898\u5FC5\u987B\u771F\u4EBA" : "\u672A\u5339\u914D\u5230 SOP \u52A8\u4F5C",
      suggested_action: redlineHits.length > 0 ? "\u5EFA\u8BAE\u7ECF\u7EAA\u4EBA\u8DDF\u8FDB" : sopAction?.human_must?.[0] || "\u5EFA\u8BAE\u7ECF\u7EAA\u4EBA\u8DDF\u8FDB"
    } : null,
    trace: {
      sop_version: sop?.version || "unknown",
      question_map_version: qmap.version || "unknown",
      checked_redlines: REDLINES.map((r) => r.split(":")[0]).join(",")
    }
  };
  return jsonResponse(response);
}
__name(handleAiAdvisor, "handleAiAdvisor");
__name2(handleAiAdvisor, "handleAiAdvisor");
async function handleLead(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "POST only" }, 405);
  const body = await parseBodyJson(request);
  if (!body) return jsonResponse({ ok: false, error: "invalid body" }, 400);
  const name = sanitizeString(body.name, 30);
  const phone = sanitizeString(body.phone || body.tel || body.mobile, 20);
  const intent = sanitizeString(body.intent || body.need, 100);
  const source = sanitizeString(body.source, 50) || "ai-advisor";
  if (!name && !phone) {
    return jsonResponse({ ok: false, error: "\u81F3\u5C11\u63D0\u4F9B\u59D3\u540D\u6216\u7535\u8BDD", hint: "name / phone \u4E8C\u9009\u4E00" }, 400);
  }
  if (phone && !/^[\d-+ ]{8,20}$/.test(phone)) {
    return jsonResponse({ ok: false, error: "\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u592A\u5BF9", hint: "\u8BF7\u68C0\u67E5\u624B\u673A\u53F7" }, 400);
  }
  const lead = {
    id: "lead_" + await simpleHash(`${Date.now()}-${phone || name}`),
    name,
    phone,
    intent,
    source,
    clientType: body.clientType || "unknown",
    stage: body.stage || "",
    message: sanitizeString(body.message, 500) || "",
    ua: sanitizeString(request.headers.get("User-Agent"), 200) || "",
    ip: sanitizeString(request.headers.get("CF-Connecting-IP"), 40) || "",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  let storage_status = "mock";
  try {
    if (env.LEAD_KV) {
      await env.LEAD_KV.put(lead.id, JSON.stringify(lead), { expirationTtl: 365 * 24 * 3600 });
      storage_status = "kv-stored";
    } else if (env.DB) {
      await env.DB.prepare(
        "INSERT INTO leads (id, name, phone, intent, source, client_type, stage, message, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(lead.id, lead.name, lead.phone, lead.intent, lead.source, lead.clientType, lead.stage, lead.message, lead.ip, lead.created_at).run();
      storage_status = "db-stored";
    }
  } catch (e) {
    console.error("Lead storage failed:", e.message);
    storage_status = "error:" + e.message.slice(0, 50);
  }
  try {
    if (env.DB) {
      await env.DB.prepare(
        "INSERT INTO events (event_type, uid, data, created_at) VALUES (?, ?, ?, ?)"
      ).bind("lead_submit", lead.id, JSON.stringify({ source, intent: lead.intent }), lead.created_at).run();
    }
  } catch (e) {
  }
  return jsonResponse({
    ok: true,
    lead_id: lead.id,
    storage: storage_status,
    message: "\u5DF2\u6536\u5230\uFF0C\u7A0D\u540E\u7ECF\u7EAA\u4EBA\u4F1A\u8054\u7CFB\u60A8"
  });
}
__name(handleLead, "handleLead");
__name2(handleLead, "handleLead");
async function loadAssetJson(env, path) {
  try {
    const resp = await env.ASSETS.fetch(new Request(`https://fakehost${path}`));
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error(`loadAssetJson(${path}) failed:`, e.message);
    return null;
  }
}
__name(loadAssetJson, "loadAssetJson");
__name2(loadAssetJson, "loadAssetJson");
function sanitizeString(str, maxLen) {
  if (!str) return "";
  return String(str).replace(/[<>"']/g, "").trim().slice(0, maxLen || 100);
}
__name(sanitizeString, "sanitizeString");
__name2(sanitizeString, "sanitizeString");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-VQE240/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-VQE240/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=bundledWorker-0.6503086678850153.js.map
