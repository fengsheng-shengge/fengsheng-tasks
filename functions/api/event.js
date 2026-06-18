// Cloudflare Pages Function: /api/event
// POST /api/event — 接收前端埋点事件，写入 D1
// GET  /api/event?key=fs-admin-2026 — 查询事件列表

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
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
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
      const offset = (page - 1) * limit;
      const eventType = url.searchParams.get('type');

      let query = 'SELECT * FROM events';
      let countQuery = 'SELECT COUNT(*) as total FROM events';
      const params = [];
      const countParams = [];

      if (eventType) {
        query += ' WHERE event_type = ?';
        countQuery += ' WHERE event_type = ?';
        params.push(eventType);
        countParams.push(eventType);
      }

      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const { results } = await env.DB.prepare(query).bind(...params).all();
      const countResult = eventType
        ? await env.DB.prepare(countQuery).bind(...countParams).first()
        : await env.DB.prepare(countQuery).first();

      return new Response(JSON.stringify({
        total: countResult.total,
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
      const { uid, event_type, page, data } = body;

      if (!event_type) {
        return new Response(JSON.stringify({ error: 'event_type is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await env.DB.prepare(
        'INSERT INTO events (uid, event_type, page, data, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        uid || '',
        event_type,
        page || '',
        data ? JSON.stringify(data).slice(0, 4000) : '{}',
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
