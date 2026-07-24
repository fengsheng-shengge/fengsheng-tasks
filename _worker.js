// FengSheng Pages Worker - handles all API routes
// Version: v20260720-1600 - anti-bot + anti-crawling defense
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ============================================================
    //  Layer 0: Whitelist — 微信域名校验文件（必须放最前面，绕过所有安全层）
    // ============================================================
    if (path.startsWith('/MP_verify_')) {
      return env.ASSETS.fetch(request);
    }

    // ============================================================
    //  Layer 0.5: API paths bypass UA/bot detection (小程序/服务端调用不自带浏览器UA)
    // ============================================================
    const isAPIPath = path.startsWith('/api/') || path.startsWith('/mentor-api/');

    // ============================================================
    //  Layer 1: IP Ban Check (honeypot triggers, repeat offenders)
    // ============================================================
    const clientIP = getClientIP(request);
    if (isBanned(clientIP)) {
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Banned': 'true' },
      });
    }

    // ============================================================
    //  Layer 2: Global Rate Limiting (all requests)
    // ============================================================
    if (!checkGlobalRateLimit(request)) {
      return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ============================================================
    //  Layer 3: Malicious User-Agent Blocking
    // ============================================================
    const ua = request.headers.get('User-Agent') || '';
    if (!isAPIPath && isMaliciousUA(ua)) {
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'ua' },
      });
    }

    // ============================================================
    //  Layer 4: AI Scraper Blocking (ignore robots.txt violators)
    // ============================================================
    if (!isAPIPath && isAIScraper(ua)) {
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'ai-scraper' },
      });
    }

    // ============================================================
    //  Layer 5: Exploit Path / Probe Detection
    // ============================================================
    if (!isAPIPath && isExploitPath(path)) {
      banIP(clientIP); // auto-ban anyone probing exploit paths
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'exploit-path' },
      });
    }

    // ============================================================
    //  Layer 6: Honeypot Trap — ban IPs that follow hidden links
    // ============================================================
    if (!isAPIPath && isHoneypotPath(path)) {
      banIP(clientIP);
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'honeypot' },
      });
    }

    // ============================================================
    //  Layer 7: Suspicious Query String (SQLi / XSS probes)
    // ============================================================
    if (isSuspiciousQueryString(url.search)) {
      return new Response('Forbidden', { status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Blocked': 'suspicious-query' },
      });
    }

    // API rate limiting (stricter than global)
    if (path.startsWith('/mentor-api/') || path.startsWith('/api/')) {
      if (!checkRateLimit(request)) {
        return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Early body size check for POST/PUT endpoints
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');
    if (contentLength > MAX_PAYLOAD_SIZE && (path.startsWith('/mentor-api/') || path.startsWith('/api/'))) {
      return new Response(JSON.stringify({ error: '请求体过大' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Resolve BOT_ID from env (with fallback)
    const resolvedBotId = env.FS_BOT_ID || BOT_ID_PLACEHOLDER;

    // CORS preflight for API routes
    if (request.method === 'OPTIONS' && (path.startsWith('/mentor-api/') || path.startsWith('/api/'))) {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Orphaned pages — 301 redirect to homepage (no local files, SPA fallback would serve homepage)
    const orphanedPaths = ['/guide/', '/mini-program/', '/knowledge-v3-fourpillars/'];
    for (const orphanPath of orphanedPaths) {
      if (path === orphanPath || path.startsWith(orphanPath)) {
        return Response.redirect('https://fengsheng.tech/', 301);
      }
    }

    // Trailing-slash redirects — ensure directory-style paths always have /
    const trailingSlashRedirects = ['/knowledge', '/mentor', '/ip-design', '/reply', '/assessment', '/breeder', '/s1-report', '/partner', '/care-test', '/quality-test'];
    if (trailingSlashRedirects.includes(path)) {
      return Response.redirect(`https://fengsheng.tech${path}/`, 301);
    }

    // WeChat domain verification files - serve directly as plain text
    if (path.startsWith('/MP_verify_') && path.endsWith('.txt')) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status === 200) {
        const text = await assetResp.text();
        return new Response(text, {
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' },
        });
      }
    }

    // WeChat Mini Program Login
    if (path === '/api/auth/wx-login' && request.method === 'POST') {
      return handleWxLogin(request, env);
    }

    // Mentor chat API (supports both authenticated and anonymous web access)
    if (path === '/mentor-api/chat' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      let openid = null;
      if (token) {
        const payload = await verifyToken(token, env);
        if (payload) {
          openid = payload.openid;
        }
      }
      // Anonymous web access: generate a stable visitor ID from IP+UA fingerprint
      if (!openid) {
        const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'anonymous';
        const ua = request.headers.get('User-Agent') || '';
        openid = 'web_' + await simpleHash(clientIP + ua);
      }
      return handleChat(request, env, openid, resolvedBotId);
    }

    // Mentor 支付初始化 — 生成支付宝当面付二维码
    if (path === '/mentor-api/payment/init' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { user_id, amount, product } = body;

        if (!user_id) {
          return jsonResponse({ error: '缺少参数 user_id' }, 400);
        }

        // 验证金额：必须是正数，最多2位小数，上限 9999
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0 || amountNum > 9999) {
          return jsonResponse({ error: '无效的金额' }, 400);
        }

        // 验证商品标识
        const validProducts = ['mentor_unlock', 'mentor_monthly', 'generic'];
        if (!validProducts.includes(product)) {
          return jsonResponse({ error: '无效的商品标识' }, 400);
        }

        // 生成唯一订单号（加盐防预测）
        const outTradeNo = 'FS' + Date.now() + Math.random().toString(36).slice(2, 8);
        const subject = product === 'mentor_unlock' ? '开单导师解锁' : '风声服务';
        const notifyUrl = `${getBaseUrl(request)}/mentor-api/payment/notify`;

        // 调用支付宝当面付 API
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
          return jsonResponse({
            error: '支付码生成失败',
            detail: alipayData?.error_response?.sub_msg || '未知错误'
          }, 500);
        }

        // 存储订单状态（KV or in-memory map for MVP）
        const orderData = {
          out_trade_no: outTradeNo,
          user_id,
          amount,
          product,
          status: 'pending',
          created_at: Date.now()
        };

        if (env.PAYMENT_ORDERS) {
          await env.PAYMENT_ORDERS.put(outTradeNo, JSON.stringify(orderData));
        }

        return jsonResponse({
          out_trade_no: outTradeNo,
          qr_code: qrCode,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCode)}`,
          expires_in: 300  // 5分钟有效期
        });

      } catch (err) {
        console.error('Payment init error:', err);
        return jsonResponse({ error: '支付初始化失败: ' + err.message }, 500);
      }
    }

    // Mentor 支付状态查询
    if (path.startsWith('/mentor-api/payment/check') && request.method === 'GET') {
      try {
        const url = new URL(request.url);
        const outTradeNo = url.searchParams.get('out_trade_no');
        if (!outTradeNo) return jsonResponse({ error: '缺少订单号' }, 400);

        // 查询支付宝
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

        return jsonResponse({
          out_trade_no: outTradeNo,
          paid,
          trade_status: tradeStatus || 'UNKNOWN'
        });

      } catch (err) {
        console.error('Payment check error:', err);
        return jsonResponse({ error: '查询失败: ' + err.message }, 500);
      }
    }

    // Mentor 支付回调通知（支付宝异步通知）
    // ⚠️ 注意：支付宝异步回调使用 application/x-www-form-urlencoded，不是 JSON
    if (path === '/mentor-api/payment/notify' && request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || '';
        let params;

        // 支付宝异步回调通常为 application/x-www-form-urlencoded
        if (contentType.includes('application/x-www-form-urlencoded') ||
            contentType.includes('text/plain')) {
          const text = await request.text();
          const searchParams = new URLSearchParams(text);
          params = Object.fromEntries(searchParams.entries());
        } else {
          params = await request.json();
        }

        const {
          out_trade_no,
          trade_status,
          trade_no,
          total_amount,
          buyer_logon_id,
          buyer_pay_amount,
        } = params;

        if (!out_trade_no) {
          return new Response('fail', { status: 400 });
        }

        // ⚠️ 安全建议：生产环境应启用支付宝签名验证
        // const sign = params.sign;
        // const verified = await alipayVerifySign(params, env);
        // if (!verified) { return new Response('fail'); }

        if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
          if (env.PAYMENT_ORDERS) {
            const orderStr = await env.PAYMENT_ORDERS.get(out_trade_no);
            if (orderStr) {
              const order = JSON.parse(orderStr);

              // 防重放：已标记为 paid 的订单不再重复处理
              if (order.status !== 'paid') {
                order.status = 'paid';
                order.trade_no = trade_no;
                order.paid_at = Date.now();
                if (buyer_pay_amount) order.paid_amount = parseFloat(buyer_pay_amount);
                if (buyer_logon_id) order.buyer = buyer_logon_id.slice(0, 8) + '***'; // 脱敏
                await env.PAYMENT_ORDERS.put(out_trade_no, JSON.stringify(order));
                console.log(`Payment success: ${out_trade_no}, paid: ${buyer_pay_amount || 'unknown'}`);
              } else {
                console.log(`Duplicate notify ignored: ${out_trade_no}`);
              }
            } else {
              console.warn(`Order not found for notify: ${out_trade_no}`);
            }
          }
        }

        // 支付宝要求返回纯文本 "success" 表示已接收
        return new Response('success', {
          headers: { 'Content-Type': 'text/plain' },
        });
      } catch (err) {
        console.error('Payment notify error:', err);
        return new Response('fail', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // Health check
    if (path === '/mentor-api/health' || path === '/api/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    }

    // Legacy /api/chat route
    if (path === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env, null, resolvedBotId);
    }

    // Event tracking API (public, fire-and-forget)
    if (path === '/api/event' && request.method === 'POST') {
      return handleEvent(request, env);
    }

    // Stats API (public, read-only)
    if (path === '/api/stats' && request.method === 'GET') {
      return handleStats(request, env);
    }
    if (path === '/api/stats/summary' && request.method === 'GET') {
      return handleStatsSummary(request, env);
    }
    if (path === '/api/stats/daily' && request.method === 'GET') {
      return handleStatsDaily(request, env);
    }
    if (path === '/api/stats/health' && request.method === 'GET') {
      return handleStatsHealth(request, env);
    }

    // Feedback API (POST) — internal D1 storage
    if (path === '/api/feedback' && request.method === 'POST') {
      return handleFeedback(request, env);
    }

    // External feedback proxy — forwards to Web3Forms + FormSubmit, keys stay on server
    if (path === '/api/feedback-external' && request.method === 'POST') {
      return handleFeedbackExternal(request, env);
    }

    // All other requests → pass through to static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleWxLogin(request, env) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return jsonResponse({ error: 'code is required' }, 400);
    }

    const WX_APPID = env.WX_APPID || 'wxb87aa256991cc9c6';
    const WX_SECRET = env.WX_SECRET;

    if (!WX_SECRET) {
      console.error('WX_SECRET not configured in worker environment');
      return jsonResponse({ error: 'server config error' }, 500);
    }

    // Exchange code for openid + session_key
    const wxUrl = `${WX_API}?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const wxResp = await fetch(wxUrl);
    const wxData = await wxResp.json();

    if (wxData.errcode) {
      console.error('WeChat API error:', wxData.errcode, wxData.errmsg);
      return jsonResponse({ error: '微信登录失败', code: wxData.errcode }, 400);
    }

    const { openid, session_key } = wxData;

    // Generate a simple JWT-like token (stateless, no DB needed for MVP)
    const token = await generateToken(openid, env);
    const userId = 'u_' + openid.slice(-8);

    return jsonResponse({
      token,
      openid,
      userId,
    });
  } catch (e) {
    console.error('WxLogin error:', e);
    return jsonResponse({ error: e.message }, 500);
  }
}

async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// JWT-standard base64url encoding/decoding (RFC 7515)
function base64urlEncode(str) {
  // Use standard btoa then convert to base64url
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(b64u) {
  // Restore base64url → standard base64, then decode
  const base64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to multiple of 4
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
  if (!secret) {
    throw new Error('JWT_SECRET not configured in worker environment');
  }
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(JSON.stringify({
    openid,
    iat: now,
    exp: now + 86400 * 7, // 7 days
    jti: crypto.randomUUID ? crypto.randomUUID() : openid + '_' + now,
  }));

  // HMAC-SHA256 signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
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

    // Verify signature using timing-safe Web Crypto
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = base64urlToArrayBuffer(s);
    const valid = await crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' },
      key,
      sigBytes,
      encoder.encode(`${h}.${p}`)
    );
    if (!valid) return null;

    // Decode payload and validate expiration
    const payload = JSON.parse(base64urlDecode(p));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch { return null; }
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

    if (conversation_id) {
      reqBody.conversation_id = conversation_id;
    }

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

    // Stream SSE response through
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

// handleFeedbackExternal — proxies to Web3Forms + FormSubmit so API keys never reach browser
async function handleFeedbackExternal(request, env) {
  try {
    const body = await request.json();

    const web3Key = env.WEB3FORMS_KEY || '27c926eb-07d8-4a71-8bf8-f30ad73f8e39';
    const formsubmitKey = env.FORMSUBMIT_KEY || 'd818fa3cece5258aea8205bd492316de';

    const payload = {
      access_key: web3Key,
      ...body,
    };

    // Fire to Web3Forms (analytics, silent)
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {}); // fire-and-forget

    // Fire to FormSubmit (email notification)
    const fsPayload = {
      ...body,
      _replyto: body._replyto || 'feedback@fengsheng.tech',
      _subject: body._subject || '风声用户反馈',
    };
    fetch(`https://formsubmit.co/ajax/${formsubmitKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(fsPayload),
    }).catch(() => {}); // fire-and-forget

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: '反馈提交失败: ' + err.message }, 500);
  }
}

async function handleEvent(request, env) {
  // Fire-and-forget: always acknowledge, never block page load
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    if (env.DB) {
      // D1 available → bulk insert events
      const stmt = env.DB.prepare(
        'INSERT OR IGNORE INTO events (uid, event_type, url, page, product, title, referrer, utm_source, utm_medium, utm_campaign, ref, source, ua, screen, vp, locale, data, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const batch = events.map((e) => {
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
      console.log(`events: wrote ${events.length} event(s)`);
    } else {
      console.log(`events: received ${events.length} event(s) (no DB, not persisted)`);
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
      // Real stats from D1
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

  // Fallback: no DB available
  return jsonResponse({
    uv: null,
    total_users: null,
    pv: null,
    chats: null,
    last_event_ts: null,
    updated: now,
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
    per_product: [], updated: now,
    note: 'no database configured',
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

      return jsonResponse({
        daily: daily?.results || [],
        updated: now,
        source: 'db',
      });
    } catch (e) {
      console.error('stats/daily: DB query failed', e.message);
    }
  }

  return jsonResponse({
    daily: [], updated: now,
    note: 'no database configured',
  });
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

      return jsonResponse({
        status: 'ok',
        db: 'connected',
        last_event: lastEvent || null,
        events_24h: count24h?.cnt || 0,
        updated: now,
      });
    } catch (e) {
      return jsonResponse({ status: 'degraded', db: 'error', error: e.message, updated: now });
    }
  }

  return jsonResponse({ status: 'degraded', db: 'not_configured', updated: now });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function getBaseUrl(request) {
  const proto = request.headers.get('X-Forwarded-Proto') || 'https';
  const host = request.headers.get('Host') || 'fengsheng.tech';
  return `${proto}://${host}`;
}
