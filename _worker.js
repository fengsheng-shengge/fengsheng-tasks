// FengSheng Pages Worker - handles all API routes
const COZE_API = 'https://api.coze.cn';
const BOT_ID = '7657006281966452790';
const WX_API = 'https://api.weixin.qq.com/sns/jscode2session';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

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

    // Stats API (public, read-only)
    if (path === '/api/stats' && request.method === 'GET') {
      return handleStats(request, env);
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

async function handleStats(request, env) {
  // Return basic public stats
  return jsonResponse({
    uv: 0,
    subs: 0,
    updated: new Date().toISOString().split('T')[0],
  });
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
