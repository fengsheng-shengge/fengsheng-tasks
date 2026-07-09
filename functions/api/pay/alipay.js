// ============================================================
// POST /api/pay/alipay
// 支付宝当面付 API（QR码模式 + PAGE跳转模式）
// 小扣子 · 2026.07.09
//
// 功能：
// - 创建支付宝当面付订单（QR码 / 跳转收银台）
// - 查询订单状态
// - 异步回调（notify_url）
//
// 环境变量：
// - ALIPAY_APP_ID        支付宝应用ID
// - ALIPAY_PRIVATE_KEY   应用私钥（PKCS8格式）
// - ALIPAY_PUBLIC_KEY    支付宝公钥
// - ALIPAY_NOTIFY_URL    异步回调地址（可选，默认用请求origin）
// ============================================================

const MENTOR_PLANS = {
  single: { name: '风声·开单导师 单次咨询', price: 99, product: 'mentor_single' },     // ¥0.99 → 分转元: 99分
  monthly: { name: '风声·开单导师 月度畅聊', price: 990, product: 'mentor_monthly' },   // ¥9.9 → 990分
};

const DECODE_PLANS = {
  monthly: { name: '风声·客户解码器 月卡', price: 4900, product: 'decode_monthly' },
  yearly: { name: '风声·客户解码器 年卡', price: 49000, product: 'decode_yearly' },
};

function errJson(code, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function okJson(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

// RSA签名（PKCS8 + SHA256WithRSA）— 使用 Web Crypto API
async function rsaSign(content, privateKey) {
  // 提取 PKCS8 PEM 中的 base64 内容
  const pemContent = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(content)
  );

  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// 构建支付宝请求参数
function buildBizContent({ orderId, subject, totalAmount, body }) {
  return {
    out_trade_no: orderId,
    total_amount: totalAmount,
    subject,
    body: body || subject,
    timeout_express: '15m',
  };
}

// 构建签名前的字符串
function buildSignStr(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

// 获取plan配置
function getPlanConfig(plan) {
  if (MENTOR_PLANS[plan]) return MENTOR_PLANS[plan];
  if (DECODE_PLANS[plan]) return DECODE_PLANS[plan];
  return MENTOR_PLANS.single; // 默认单次
}

export async function onRequest({ request, env }) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  const url = new URL(request.url);

  // GET: 查询订单状态（简化版，实际生产应调 alipay.trade.query）
  if (request.method === 'GET') {
    const orderId = url.searchParams.get('order_id');
    if (!orderId) return errJson(400, '缺少 order_id');
    // 简化：返回订单ID，实际应查DB或调支付宝API
    return okJson({ order_id: orderId, status: 'pending' });
  }

  // POST: 创建订单
  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return errJson(400, 'Invalid JSON'); }

    const plan = body.plan || 'single';
    const payMode = body.mode || 'page'; // 'page' = 跳转收银台, 'qr' = QR码
    const returnUrl = body.return_url || `${url.origin}/mentor/`;
    const config = getPlanConfig(plan);

    const orderId = `fs_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalAmount = (config.price / 100).toFixed(2); // 分→元

    // 检查支付宝配置
    if (!env.ALIPAY_APP_ID || !env.ALIPAY_PRIVATE_KEY) {
      // 无配置 → mock模式（开发调试）
      return okJson({
        order_id: orderId,
        amount: config.price,
        currency: 'CNY',
        plan,
        product: config.product,
        subject: config.name,
        mock: true,
        mock_url: `${url.origin}/mentor/?mock_pay=success&order_id=${orderId}&plan=${plan}`,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        note: '支付宝配置未就绪，mock模式仅供开发调试',
      });
    }

    // 构建支付宝API请求
    const notifyUrl = env.ALIPAY_NOTIFY_URL || `${url.origin}/api/pay/alipay/notify`;
    const gateway = 'https://openapi.alipay.com/gateway.do'; // 正式环境
    // const gateway = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'; // 沙箱

    const method = payMode === 'qr' ? 'alipay.trade.precreate' : 'alipay.trade.page.pay';
    const bizContent = buildBizContent({
      orderId,
      subject: config.name,
      totalAmount,
      body: config.name,
    });

    const commonParams = {
      app_id: env.ALIPAY_APP_ID,
      method,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      version: '1.0',
      notify_url: notifyUrl,
      biz_content: JSON.stringify(bizContent),
    };

    if (payMode === 'page') {
      commonParams.return_url = returnUrl;
    }

    // 签名
    const signStr = buildSignStr(commonParams);
    const sign = await rsaSign(signStr, env.ALIPAY_PRIVATE_KEY);
    commonParams.sign = sign;

    if (payMode === 'page') {
      // PAGE模式：返回跳转URL
      const redirectUrl = gateway + '?' + Object.entries(commonParams)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

      return okJson({
        order_id: orderId,
        amount: config.price,
        currency: 'CNY',
        plan,
        product: config.product,
        subject: config.name,
        pay_url: redirectUrl,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    } else {
      // QR模式：返回QR码URL（需要调用API获取qr_code）
      // 直接返回跳转URL，由后端调用获取qr_code内容
      // 简化实现：使用GET方式调API获取qr_code
      const apiParams = new URLSearchParams();
      for (const [k, v] of Object.entries(commonParams)) {
        apiParams.set(k, v);
      }

      try {
        const apiRes = await fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: apiParams.toString(),
        });

        const resText = await apiRes.text();
        // 解析返回的qr_code
        const qrMatch = resText.match(/"qr_code"\s*:\s*"([^"]+)"/);
        const qrCode = qrMatch ? qrMatch[1] : null;

        return okJson({
          order_id: orderId,
          amount: config.price,
          currency: 'CNY',
          plan,
          product: config.product,
          subject: config.name,
          qr_code: qrCode,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } catch (e) {
        return errJson(500, '支付宝API调用失败: ' + e.message);
      }
    }
  }

  return errJson(405, 'Method not allowed');
}
