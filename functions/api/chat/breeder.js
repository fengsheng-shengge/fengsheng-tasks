// ============================================================
// POST /api/chat/breeder
// 开单导师 聊天API代理 — 自建UI后端
// 小扣子 · 2026.07.09
//
// 架构：前端自建聊天UI → POST /api/chat/breeder → Coze v3/chat API → 返回回复
// 降级：无 COZE_API_KEY 时走规则引擎，保证始终有响应
// ============================================================

// ---------- 规则引擎（无LLM时的降级方案） ----------
function ruleBasedReply(message) {
  const t = message.toLowerCase();

  // 拆需求场景
  if (t.includes('再看看') || t.includes('不着急') || t.includes('考虑')) {
    return '客户说"再看看"，通常不是真的不急，而是有顾虑没说出来。\n\n建议你这样做：\n1. 先共情："理解，房子这事确实不能急"\n2. 猜顾虑："我猜你不是不想租，是怕定下来之后遇到更好的？"\n3. 探预算："方便说一下大概预算范围吗？我帮你盯着，有合适的第一时间通知你"\n\n核心：不要反驳、不要催，先把真实顾虑挖出来。';
  }

  // 出话术场景
  if (t.includes('带看') || t.includes('话术') || t.includes('准备')) {
    return '带看前话术准备清单：\n\n1. 开场（破冰）："这套我特意挑的，有个细节你一看就会喜欢"\n2. 亮点前置：先说1个最大卖点（采光/地铁/价格），再进门\n3. 预埋对比："之前看的X套也有这个优点，但那套XX不如这套"\n4. 价格锚定："这个片区同户型基本在X-X，这套性价比很突出"\n5. 决策兜底："今天看完不用定，3天犹豫期，随时可以退"\n\n关键：每句话都在帮客户做减法，不是在推销。';
  }

  // 验房源场景
  if (t.includes('房源') || t.includes('押') || t.includes('坑') || t.includes('风险')) {
    let reply = '房源风险核验清单：\n\n';
    if (t.includes('押二付三')) reply += '⚠️ 押二付三：偏高。行业标准通常押一付三或押一付一。建议谈成押一付三。\n\n';
    if (t.includes('2800') || t.includes('2800')) reply += '💰 月租2800：需对比同小区均价。如果包物业费，实际相当于2600左右，属于合理区间。\n\n';
    if (t.includes('地铁') || t.includes('5分钟')) reply += '🚇 步行5分钟到地铁：需实地走一次。中介说的"5分钟"往往是直线距离，实际可能8-10分钟。\n\n';
    reply += '其他必查项：\n- 产权核验：让房东出示房产证原件\n- 身份核验：房东身份证与房产证一致\n- 租赁备案：签合同后要求做租赁备案\n- 维修责任：合同写明自然损耗由房东负责\n\n核心：凡是含糊的地方，一定要白纸黑字写进合同。';
    return reply;
  }

  // 帮决策场景
  if (t.includes('纠结') || t.includes('犹豫') || t.includes('决策') || t.includes('选')) {
    return '客户犹豫不决时的决策引导：\n\n1. 不要替客户做决定，帮他理清优先级\n2. 画一张对比表：户型A vs 户型B，列3个维度（价格/通勤/采光）\n3. 问一个问题："如果这两套价格一样，你选哪个？"——这个答案就是他真实偏好\n4. 给退路："先定心仪的那套，3天内如果改主意可以免费换"\n\n核心：客户不是不知道选哪个，是怕选错。你的任务是降低他"选错"的恐惧。';
  }

  // 通用回复
  return '我是开单导师，可以帮你：\n\n1. 拆需求 — 客户说"再看看"，帮你挖出真实顾虑\n2. 出话术 — 带看前准备、议价策略、逼单技巧\n3. 验房源 — 押金、租金、产权风险核验\n4. 帮决策 — 客户纠结时如何引导\n\n请描述你遇到的具体情况，比如：\n"客户预算3000想离地铁近，跟老人住，说再看看"';
}

// ---------- Coze API 调用 ----------
async function cozeChat(message, sessionId, env) {
  const cozeToken = env.COZE_API_KEY;
  if (!cozeToken) {
    return { reply: ruleBasedReply(message), engine: 'rule_based', sessionId };
  }

  const cozeBotId = env.COZE_BOT_ID || env.BREEDER_BOT_ID;
  if (!cozeBotId) {
    return { reply: ruleBasedReply(message), engine: 'rule_based', sessionId };
  }

  const url = 'https://api.coze.cn/v3/chat';
  const body = {
    bot_id: cozeBotId,
    user_id: sessionId || 'web_anonymous',
    conversation_id: '',
    query: message,
    stream: false,
    extra: { source: 'breeder_web' },
  };

  try {
    // 1. 发起对话
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cozeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.code !== 0) {
      throw new Error(data.msg || 'Coze API error');
    }

    const chatId = data.data.chat_id;
    const conversationId = data.data.conversation_id;

    // 2. 轮询获取结果（最多15秒）
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(
        `${url}/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
        { headers: { Authorization: `Bearer ${cozeToken}` } }
      );
      const statusData = await statusRes.json();

      if (statusData.data?.status === 'completed') {
        // 3. 获取回复消息
        const msgRes = await fetch(
          `${url}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          { headers: { Authorization: `Bearer ${cozeToken}` } }
        );
        const msgData = await msgRes.json();
        const reply =
          msgData.data?.find(m => m.role === 'assistant')?.content || '';

        if (reply) {
          return { reply, engine: 'coze', sessionId, conversationId };
        }
      }

      if (statusData.data?.status === 'failed') {
        throw new Error('Coze chat failed');
      }
    }

    // 超时
    throw new Error('Coze chat timeout');
  } catch (e) {
    console.error('Coze chat failed:', e);
    return { reply: ruleBasedReply(message), engine: 'rule_based_fallback', sessionId };
  }
}

// ---------- 主处理函数 ----------
export async function onRequest({ request, env }) {
  // CORS
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const message = (body.message || '').trim();
  if (!message || message.length < 2) {
    return new Response(JSON.stringify({ error: '消息内容过短' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: '消息内容过长（限2000字）' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const sessionId =
    body.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const result = await cozeChat(message, sessionId, env);

    // 异步记录事件
    if (env.DB) {
      try {
        const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        env.DB.prepare(
          'INSERT INTO chat_logs (id, session_id, message, reply, engine, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            id,
            sessionId,
            message,
            result.reply,
            result.engine,
            'breeder_web',
            Math.floor(Date.now() / 1000)
          )
          .run();
      } catch (e) {
        console.error('DB write failed:', e);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: '聊天服务暂时不可用，请稍后重试',
        detail: e.message,
        reply: ruleBasedReply(message),
        engine: 'error_fallback',
        sessionId,
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
