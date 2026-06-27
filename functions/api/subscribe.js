// ============================================================
// POST /api/subscribe
// 订阅管理 API
// 小扣子 · 2026.06.27
//
// 功能：
// - 创建订阅订单（返回微信支付参数）
// - 查询订阅状态
// ============================================================

const PLAN_CONFIG = {
  decode_monthly: { name: '客户解码器 月卡', price: 4900, period: 'monthly', product: 'decode' },
  decode_yearly:   { name: '客户解码器 年卡', price: 49000, period: 'yearly', product: 'decode' },
  assess_yearly:   { name: '品质测评 年卡', price: 12900, period: 'yearly', product: 'assess' },
};

const PRICE_MAP = {
  'decode': 4900,    // ¥49/月
  'assess': 12900,   // ¥129/年
};

function errJson(code, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json' }
  });
}

function okJson(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const secret = env.JWT_SECRET || 'fs-mini-program-2026';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBytes = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const exp = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(`${h}.${p}`));
    const expB64 = btoa(String.fromCharCode(...new Uint8Array(exp))).replace(/=/g, '');
    if (s !== expB64) return null;
    return JSON.parse(atob(p));
  } catch { return null; }
}

export async function onRequest({ request, env }) {
  const method = request.method;

  if (method === 'POST') {
    // ---------- 创建订阅订单 ----------
    const payload = await verifyToken(request, env);
    if (!payload) return errJson(401, '请先登录');

    let body;
    try { body = await request.json(); } catch { return errJson(400, 'Invalid JSON'); }

    const product = body.product || 'decode';
    const plan = body.plan || 'monthly';
    const price = PRICE_MAP[product] || 4900;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 检查是否有微信支付配置
    const wxMchId = env.WX_MCH_ID;
    if (!wxMchId) {
      // 无微信支付配置，返回模拟订单（开发模式）
      return okJson({
        orderId,
        amount: price,
        currency: 'CNY',
        product,
        plan,
        mock: true,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        note: '微信支付配置未就绪，mock模式仅供开发调试',
      });
    }

    // 微信支付统一下单
    try {
      const notifyUrl = `${new URL(request.url).origin}/api/pay/callback`;
      const wxRes = await wxUnifiedOrder({
        env,
        orderId,
        amount: price,
        product,
        openid: payload.openid,
        notifyUrl,
      });
      return okJson({
        orderId,
        amount: price,
        currency: 'CNY',
        product,
        plan,
        prepayId: wxRes.prepay_id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    } catch (e) {
      return errJson(500, '支付创建失败: ' + e.message);
    }
  }

  if (method === 'GET') {
    // ---------- 查询订阅状态 ----------
    const payload = await verifyToken(request, env);
    if (!payload) return errJson(401, '请先登录');

    if (!env.DB) return okJson({ subscription: null });

    try {
      const { results } = await env.DB.prepare(`
        SELECT product, plan, status, started_at, expires_at
        FROM subscriptions
        WHERE user_id = ? AND status = 'active' AND expires_at > unixepoch()
        ORDER BY expires_at DESC
        LIMIT 1
      `).bind(payload.sub).all();

      if (!results || results.length === 0) {
        return okJson({ subscription: null });
      }

      const sub = results[0];
      return okJson({
        subscription: {
          product: sub.product,
          plan: sub.plan,
          status: sub.status,
          startedAt: new Date(sub.started_at * 1000).toISOString(),
          expireAt: new Date(sub.expires_at * 1000).toISOString(),
        }
      });
    } catch (e) {
      return okJson({ subscription: null });
    }
  }

  return errJson(405, 'Method not allowed');
}

// ---------- 微信支付统一下单 ----------
async function wxUnifiedOrder({ env, orderId, amount, product, openid, notifyUrl }) {
  const mchId = env.WX_MCH_ID;
  const wxAppId = env.WX_APP_ID;
  const wxKey = env.WX_API_KEY; // 商户API密钥

  const nonceStr = Math.random().toString(36).slice(2);
  const timeStamp = Math.floor(Date.now() / 1000).toString();

  // 构建签名
  const signParams = {
    appid: wxAppId,
    mch_id: mchId,
    nonce_str: nonceStr,
    body: `风声-${product}`,
    out_trade_no: orderId,
    total_fee: amount,
    spbill_create_ip: '127.0.0.1',
    notify_url: notifyUrl,
    trade_type: 'JSAPI',
    openid,
  };

  const signStr = Object.entries(signParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&') + `&key=${wxKey}`;

  const sign = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signStr))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => ('0' + b.toString(16)).slice(-2)).join('').toUpperCase());

  const xml = `<xml>${Object.entries({ ...signParams, sign }).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}</xml>`;

  const res = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
    method: 'POST',
    body: xml,
    headers: { 'Content-Type': 'text/xml' },
  });

  const xmlText = await res.text();
  const prepayIdMatch = xmlText.match(/<prepay_id><!\[CDATA\[([^\]]+)\]\]><\/prepay_id>/);

  if (!prepayIdMatch) {
    throw new Error('微信支付下单失败: ' + xmlText.slice(0, 200));
  }

  const prepayId = prepayIdMatch[1];

  // 返回调起支付的签名参数
  const paySignParams = {
    appId: wxAppId,
    timeStamp,
    nonceStr,
    package: `prepay_id=${prepayId}`,
    signType: 'MD5',
  };
  const paySignStr = Object.entries(paySignParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&') + `&key=${wxKey}`;
  const paySign = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(paySignStr))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => ('0' + b.toString(16)).slice(-2)).join('').toUpperCase());

  return {
    prepay_id: prepayId,
    timeStamp,
    nonceStr,
    paySign,
  };
}
