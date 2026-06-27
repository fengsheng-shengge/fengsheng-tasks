// ============================================================
// POST /api/auth/wx-login
// 微信小程序授权登录
// 小扣子 · 2026.06.25
//
// 流程：wx.login() → code → 换 openid → 生成 JWT
// ============================================================

// 微信登录凭证校验接口
const WX_CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

// JWT Payload 结构
function createJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const data = `${encodedHeader}.${encodedPayload}`;
  // 简化签名：用 HMAC-SHA256 (Workers 兼容)
  const key = crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return key.then(k =>
    crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data))
      .then(sig => {
        const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '');
        return `${data}.${sigBase64}`;
      })
  );
}

// 简化同步JWT（用于onRequest上下文）
async function signJwt(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const p = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).replace(/=/g, '');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${p}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '');
  return `${header}.${p}.${sigB64}`;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { code } = body;
  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const appId = env.WX_APP_ID;
  const appSecret = env.WX_APP_SECRET;

  if (!appId || !appSecret) {
    return new Response(JSON.stringify({ error: 'WeChat API not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 向微信换取 openid + session_key
  const wxUrl = `${WX_CODE2SESSION_URL}?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  let wxData;
  try {
    const wxRes = await fetch(wxUrl);
    wxData = await wxRes.json();
  } catch {
    return new Response(JSON.stringify({ error: 'WeChat API request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (wxData.errcode) {
    console.error('WeChat error:', wxData);
    return new Response(JSON.stringify({
      error: 'WeChat login failed',
      errcode: wxData.errcode,
      errmsg: wxData.errmsg
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { openid, session_key } = wxData;
  const userId = `wx_${openid.substring(0, 16)}`;

  // 生成 JWT
  const jwtSecret = env.JWT_SECRET || 'fs-mini-program-2026';
  const token = await signJwt({
    sub: userId,
    openid,
    type: 'mini_program',
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7天
  }, jwtSecret);

  return new Response(JSON.stringify({
    token,
    openid,
    userId
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
