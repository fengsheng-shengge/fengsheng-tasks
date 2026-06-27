// ============================================================
// POST /api/decode/v2
// 客户解码器 v2 — 核心AI解码接口
// 小扣子 · 2026.06.27
//
// 输入：用户一句话 → 分类 → 解码 → 返回客户画像
// 依赖：Coze Bot API / OpenAI API（通过 env.COZE_API_KEY / env.OPENAI_API_KEY）
// ============================================================

// ---------- 分类关键词 ----------
const CATEGORY_KEYWORDS = {
  buying: ['买', '购房', '买房', '首套', '二套', '置换', '改善', '学区', '婚房', '刚需', '入手'],
  selling: ['卖', '售房', '卖房', '挂牌', '出手', '卖掉', '房东'],
  investing: ['投资', '出租', '租金', '回报率', '收益率', '投资房', '收租'],
  living: ['住', '装修', '入住', '搬家', '自住', '宜居', '生活'],
};

// ---------- 规则分类器（轻量，无LLM依赖） ----------
function classifyCategory(input) {
  const text = input.toLowerCase();
  let best = 'living';
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return bestScore > 0 ? best : 'buying'; // 默认归类为购房
}

// ---------- 轻量解码器（无LLM时的降级方案） ----------
function ruleBasedDecode(input, category, sessionId) {
  // 简单的规则引擎生成基础画像
  const inputs = input.toLowerCase();

  // 需求识别
  let coreNeed = '待挖掘';
  if (inputs.includes('安全') || inputs.includes('放心')) coreNeed = '安全';
  else if (inputs.includes('便宜') || inputs.includes('性价比')) coreNeed = '经济';
  else if (inputs.includes('方便') || inputs.includes('便利')) coreNeed = '便利';
  else if (inputs.includes('舒服') || inputs.includes('舒适')) coreNeed = '舒适';

  // 决策风格
  let decisionStyle = '待观察';
  if (inputs.includes('犹豫') || inputs.includes('考虑') || inputs.includes('再想想')) decisionStyle = '迟疑型';
  else if (inputs.includes('尽快') || inputs.includes('马上') || inputs.includes('着急')) decisionStyle = '果断型';
  else if (inputs.includes('比较') || inputs.includes('对比') || inputs.includes('看看')) decisionStyle = '比较型';

  // 风险偏好
  let riskTolerance = '稳健';
  if (inputs.includes('投资') || inputs.includes('博一把')) riskTolerance = '激进';
  else if (inputs.includes('保守') || inputs.includes('安全第一')) riskTolerance = '保守';

  // 人生阶段
  let lifeStage = '未知';
  if (inputs.includes('首套') || inputs.includes('刚需')) lifeStage = '首套房';
  else if (inputs.includes('改善') || inputs.includes('置换')) lifeStage = '改善置换';
  else if (inputs.includes('学区') || inputs.includes('孩子')) lifeStage = '学区需求';
  else if (inputs.includes('婚') || inputs.includes('结婚')) lifeStage = '婚房置業';
  else if (inputs.includes('投资') || inputs.includes('出租')) lifeStage = '投资出租';

  return {
    category,
    profile: {
      lifeStage,
      coreNeed,
      riskTolerance,
      decisionStyle,
      source: 'rule_based', // 标记为规则引擎生成
    },
    insights: [
      {
        type: '需求',
        content: `客户关注「${coreNeed}」，属于「${lifeStage}」阶段，决策风格「${decisionStyle}」。`,
      },
      {
        type: '策略',
        content: decisionStyle === '迟疑型'
          ? '不要急于逼单，先建立信任，了解真实顾虑。'
          : decisionStyle === '果断型'
          ? '节奏可以快，但务必核实关键信息避免决策失误。'
          : '提供充分对比信息，尊重客户的比较需求。',
      },
    ],
    suggestions: [
      {
        scene: '初次接触',
        content: coreNeed === '安全'
          ? '先讲安全底线（资金监管、产权核验），建立基本信任。'
          : coreNeed === '经济'
          ? '先讲性价比逻辑（地段/单价/总价的关系），再进入具体房源。'
          : '先问清楚他的核心诉求，不急着推房源。',
      },
      {
        scene: '需求挖掘',
        content: lifeStage === '首套房'
          ? '关注首付能力和月供承受力，兼顾未来换房可能性。'
          : lifeStage === '改善置换'
          ? '先了解现有房产情况和置换时间线，评估资金方案。'
          : '了解他对「理想居住」的具体描述，捕捉真实需求。',
      },
    ],
  };
}

// ---------- JWT 验证 ----------
async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const secret = env.JWT_SECRET || 'fs-mini-program-2026';

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    // 验证签名
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const expected = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(`${headerB64}.${payloadB64}`));
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected))).replace(/=/g, '');
    if (sigB64 !== expectedB64) return null;

    // 解析payload
    const payload = JSON.parse(atob(payloadB64));
    return payload;
  } catch {
    return null;
  }
}

// ---------- Coze AI 解码（生产可用） ----------
async function cozeDecode(input, category, sessionId, env) {
  const cozeToken = env.COZE_API_KEY;
  if (!cozeToken) {
    // 无 Coze Token，降级到规则引擎
    return ruleBasedDecode(input, category, sessionId);
  }

  const cozeBotId = env.COZE_BOT_ID || 'your-bot-id';
  const url = `https://api.coze.cn/v3/chat`;
  const body = {
    bot_id: cozeBotId,
    user_id: sessionId || 'anonymous',
    conversation_id: '',
    query: input,
    stream: false,
    extra: { category },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg || 'Coze API error');

    // 轮询获取结果
    const chatId = data.data.chat_id;
    const conversationId = data.data.conversation_id;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`${url}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`, {
        headers: { 'Authorization': `Bearer ${cozeToken}` },
      });
      const statusData = await statusRes.json();
      if (statusData.data?.status === 'completed') {
        // 获取消息
        const msgRes = await fetch(`${url}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`, {
          headers: { 'Authorization': `Bearer ${cozeToken}` },
        });
        const msgData = await msgRes.json();
        const reply = msgData.data?.find(m => m.role === 'assistant')?.content || '';
        return parseCozeResponse(reply, category);
      }
    }
  } catch (e) {
    console.error('Coze decode failed:', e);
  }

  // Coze失败，降级到规则引擎
  return ruleBasedDecode(input, category, sessionId);
}

// ---------- 解析 Coze 返回 ----------
function parseCozeResponse(text, category) {
  // Coze返回的JSON文本，尝试解析
  try {
    // 去掉 markdown code block
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      category: parsed.category || category,
      profile: parsed.profile || {},
      insights: parsed.insights || [],
      suggestions: parsed.suggestions || [],
    };
  } catch {
    // 无法解析，返回原文作为insight
    return {
      category,
      profile: {},
      insights: [{ type: 'AI解读', content: text.slice(0, 300) }],
      suggestions: [],
    };
  }
}

// ---------- 主处理函数 ----------
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // JWT 验证
  const payload = await verifyToken(request, env);
  const userId = payload?.sub || 'anonymous';
  const sessionId = payload?.openid || userId;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const input = (body.input || '').trim();
  if (!input || input.length < 2) {
    return new Response(JSON.stringify({ error: '输入内容过短' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (input.length > 2000) {
    return new Response(JSON.stringify({ error: '输入内容过长（限2000字）' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientSessionId = body.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 1. 分类
    const category = classifyCategory(input);

    // 2. 解码
    const result = await cozeDecode(input, category, clientSessionId, env);

    // 3. 记录事件
    if (env.DB) {
      const id = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        await env.DB.prepare(`
          INSERT INTO decode_results (id, user_id, input, category, profile, insights, suggestions, source, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          userId,
          input,
          category,
          JSON.stringify(result.profile),
          JSON.stringify(result.insights),
          JSON.stringify(result.suggestions),
          'mini_program',
          Math.floor(Date.now() / 1000)
        ).run();
      } catch (e) {
        console.error('DB write failed:', e);
      }
    }

    return new Response(JSON.stringify({
      sessionId: clientSessionId,
      ...result,
      engine: result.profile?.source || 'coze',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({
      error: '解码失败，请稍后重试',
      detail: e.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
