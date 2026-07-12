// FengSheng Pages Worker - handles all API routes
const COZE_API = 'https://api.coze.cn';
const BOT_ID = '7657006281966452790';
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

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
      return handleChat(request, env, openid);
    }

    // Health check
    if (path === '/mentor-api/health' || path === '/api/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    }

    // Legacy /api/chat route
    if (path === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
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

async function generateToken(openid, env) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured in worker environment');
  }
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    openid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  }));
  
  // Simple HMAC using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
  
  return `${header}.${payload}.${sig}`;
}

async function verifyToken(token, env) {
  const secret = env.JWT_SECRET;
  if (!secret) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const sigBytes = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' },
      key, sigBytes, encoder.encode(`${h}.${p}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(atob(p));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch { return null; }
}

async function handleChat(request, env, authenticatedOpenid) {
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
      bot_id: BOT_ID,
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
        `SELECT date(created_at, 'unixepoch') as date, COUNT(DISTINCT uid) as unique_uids, COUNT(CASE WHEN event_type='pageview' THEN 1 END) as pageviews, COUNT(CASE WHEN event_type='click' THEN 1 END) as clicks, COUNT(CASE WHEN event_type='reply_submit' THEN 1 END) as feedbacks FROM events WHERE created_at >= unixepoch('now', '-${days} days') GROUP BY date(created_at, 'unixepoch') ORDER BY date`
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
