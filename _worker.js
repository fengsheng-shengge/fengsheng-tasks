// FengSheng Pages Worker - handles all API routes
const COZE_API = 'https://api.coze.cn';
const BOT_ID = '7657006281966452790';
const PAT_TOKEN = 'COZE_PAT_TOKEN_PLACEHOLDER';

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
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Mentor chat API - uses /mentor-api/ path to avoid old Worker interception on /api/*
    if (path === '/mentor-api/chat' && request.method === 'POST') {
      return handleChat(request);
    }

    // Health check (on both paths for compatibility)
    if (path === '/mentor-api/health' || path === '/api/health') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    }

    // Legacy /api/chat route (may be intercepted by old Worker on custom domain)
    if (path === '/api/chat' && request.method === 'POST') {
      return handleChat(request);
    }

    // All other requests → pass through to static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleChat(request) {
  try {
    const body = await request.json();
    const { message, conversation_id, user_id } = body;

    if (!message || !message.trim()) {
      return jsonResponse({ error: 'message is required' }, 400);
    }

    const reqBody = {
      bot_id: BOT_ID,
      user_id: user_id || 'web_user',
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
