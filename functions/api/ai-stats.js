// ============================================================
// GET /api/ai-stats
// AI提及率指标查询
// 小扣子 · 2026.06.27
//
// 查询参数：
//   key=fs-admin-2026  — 管理密钥
//   period=today|week|month|all  — 时间范围（默认all）
//   domain=xxx  — 域筛选（可选）
//   entry_id=xxx  — 词条ID筛选（可选）
// ============================================================

const PERIOD_MAP = {
  'today': 1,
  'week': 7,
  'month': 30,
  'all': 99999
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

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  // 认证
  const key = url.searchParams.get('key');
  if (key !== 'fs-admin-2026') {
    return errJson(401, 'unauthorized');
  }

  const period = url.searchParams.get('period') || 'all';
  const domain = url.searchParams.get('domain');
  const entryId = url.searchParams.get('entry_id');
  const days = PERIOD_MAP[period] || 99999;

  // 检查D1是否配置
  if (!env.DB) {
    return errJson(503, 'Database not configured');
  }

  try {
    // 查询 ai_events 表
    const cutoff = Date.now() - days * 86400 * 1000;

    // 基础统计
    const statsSql = `
      SELECT
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as sessions
      FROM ai_events
      WHERE ts > ?
      ${domain ? ' AND domain = ?' : ''}
      ${entryId ? ' AND entry_id = ?' : ''}
      GROUP BY event_type
    `;
    const params = [Math.floor(cutoff / 1000)];
    if (domain) params.push(domain);
    if (entryId) params.push(entryId);

    const stmt = env.DB.prepare(statsSql);
    const statsResult = await stmt.bind(...params).all();

    const stats = {
      total_ai_used: 0,
      total_ai_surfaced: 0,
      unique_sessions: new Set()
    };

    for (const row of statsResult.results || statsResult) {
      if (row.event_type === 'ai_used') {
        stats.total_ai_used = row.count;
      } else if (row.event_type === 'ai_surfaced') {
        stats.total_ai_surfaced = row.count;
      }
    }

    // Top词条
    const topSql = `
      SELECT entry_id, entry_name, domain, COUNT(*) as count
      FROM ai_events
      WHERE ts > ? AND event_type = 'ai_surfaced'
      ${domain ? ' AND domain = ?' : ''}
      GROUP BY entry_id
      ORDER BY count DESC
      LIMIT 10
    `;
    const topParams = [Math.floor(cutoff / 1000)];
    if (domain) topParams.push(domain);

    const topResult = await env.DB.prepare(topSql).bind(...topParams).all();
    stats.top_entries = (topResult.results || topResult).map(r => ({
      entry_id: r.entry_id,
      entry_name: r.entry_name || r.entry_id,
      domain: r.domain,
      count: r.count
    }));

    // 按域分布
    const byDomainSql = `
      SELECT domain, event_type, COUNT(*) as count
      FROM ai_events
      WHERE ts > ?
      GROUP BY domain, event_type
    `;
    const byDomainResult = await env.DB.prepare(byDomainSql)
      .bind(Math.floor(cutoff / 1000)).all();

    stats.by_domain = {};
    for (const row of byDomainResult.results || byDomainResult) {
      if (!stats.by_domain[row.domain]) {
        stats.by_domain[row.domain] = { used: 0, surfaced: 0 };
      }
      if (row.event_type === 'ai_used') {
        stats.by_domain[row.domain].used = row.count;
      } else if (row.event_type === 'ai_surfaced') {
        stats.by_domain[row.domain].surfaced = row.count;
      }
    }

    // AI使用率（需结合pageview计算，这里用ai_used/ai_surfaced的比率估算）
    const total = stats.total_ai_used + stats.total_ai_surfaced;
    stats.ai_interaction_rate = total > 0
      ? (stats.total_ai_used / total * 100).toFixed(1) + '%'
      : '0%';

    return okJson(stats);

  } catch (e) {
    return errJson(500, 'Server error: ' + (e.message || String(e)));
  }
}
