// Cloudflare Pages Function: /api/feedback
// POST /api/feedback — 接收用户反馈，写入 D1
// GET  /api/feedback?key=fs-admin-2026 — 查询反馈列表

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 密钥认证
  const key = url.searchParams.get('key');

  if (method === 'GET') {
    if (key !== 'fs-admin-2026') {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    try {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      const { results } = await env.DB.prepare(
        'SELECT * FROM feedback ORDER BY id DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all();

      const { total } = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM feedback'
      ).first();

      return new Response(JSON.stringify({
        total: total,
        page: page,
        limit: limit,
        data: results
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'db_error', message: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'POST') {
    try {
      const body = await request.json();
      const { topic, page, content, contact } = body;

      if (!topic || !content) {
        return new Response(JSON.stringify({ error: 'topic and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await env.DB.prepare(
        'INSERT INTO feedback (topic, page, content, contact, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        topic,
        page || '',
        content.slice(0, 5000),
        contact || '',
        Date.now()
      ).run();

      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'db_error', message: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}