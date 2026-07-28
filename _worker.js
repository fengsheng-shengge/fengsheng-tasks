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