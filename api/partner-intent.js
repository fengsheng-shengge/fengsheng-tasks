// api/partner-intent.js
// ============================================================
//  合作意向留资 (路径B · 增量前置)
//  对应 GitHub issue #191 任务1
//  --------------------------------------------------------
//  路由: POST /api/event   (body.t === 'partner_intent')
//  前端契约 (来自 PR#190 partner.js, 通过 navigator.sendBeacon 发送):
//    {
//      "t": "partner_intent",
//      "type": "edu" | "gov",
//      "name": "",
//      "org": "",
//      "role": "",
//      "contact": "",
//      "chips": [],
//      "note": "",
//      "ts": 0
//    }
//
//  存储: D1 (env.DB, 表 partner_intents) 为主,
//        KV  (env.PARTNER_LEADS)         为兜底,
//        都不可用时降级为 console.log (fire-and-forget, 不阻塞前端).
//  依赖: 见 migrations/002_create_partner_intents.sql
// ============================================================

// 合法合作类型
const VALID_TYPES = new Set(['edu', 'gov']);

// 字段最大长度 (防滥用 / 超长截断)
const FIELD_MAX = {
  name: 64,
  org: 128,
  role: 64,
  contact: 128,
  note: 1024,
  chipsItem: 32,   // 单个标签最大长度
  chipsMax: 32,    // 最多 32 个标签
  ip: 64,
  ua: 512,
};

/**
 * 批量存储合作意向事件.
 * @param {Array} events  已过滤为 t==='partner_intent' 的事件数组
 * @param {Object} env    Worker env (DB / PARTNER_LEADS)
 * @param {Request} [request]  用于读取 client IP / UA
 * @returns {Promise<number>}  成功落库条数
 */
export async function storePartnerIntents(events, env, request) {
  if (!Array.isArray(events) || events.length === 0) return 0;

  const clientIp = request
    ? (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || '')
    : '';
  const ua = request ? (request.headers.get('User-Agent') || '') : '';

  let stored = 0;
  for (const e of events) {
    const record = normalize(e, clientIp, ua);
    if (!record) continue;

    let ok = false;

    // ----- 1) D1 主存储 -----
    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO partner_intents (intent_type, name, org, role, contact, chips, note, client_ip, ua, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          record.intent_type,
          record.name,
          record.org,
          record.role,
          record.contact,
          record.chips,
          record.note,
          record.client_ip,
          record.ua,
          record.ts,
          Math.floor(Date.now() / 1000)
        ).run();
        ok = true;
      } catch (err) {
        // 表可能尚未建 (migration 未执行) → 降级 KV
        console.error('partner_intents: D1 insert failed, fallback to KV:', err.message);
      }
    }

    // ----- 2) KV 兜底 (D1 不可用或建表未执行) -----
    if (!ok && env.PARTNER_LEADS) {
      try {
        const key = `pi:${record.ts}:${Math.random().toString(36).slice(2, 8)}`;
        await env.PARTNER_LEADS.put(key, JSON.stringify(record), {
          expirationTtl: 60 * 60 * 24 * 365, // 1 年
        });
        ok = true;
      } catch (err) {
        console.error('partner_intents: KV put failed:', err.message);
      }
    }

    if (!ok) {
      // 最后兜底: 仅打日志, 仍向前端返回 ok (fire-and-forget)
      console.log('partner_intent (not persisted):', JSON.stringify(record));
    } else {
      stored++;
    }
  }
  return stored;
}

/**
 * 将前端原始事件归一化为可存储记录.
 * @returns {Object|null}  非法事件返回 null
 */
function normalize(e, clientIp, ua) {
  if (!e || typeof e !== 'object') return null;
  if (e.t !== 'partner_intent') return null;

  const intentType = VALID_TYPES.has(e.type) ? e.type : 'edu';

  return {
    intent_type: intentType,
    name: clip(e.name, FIELD_MAX.name),
    org: clip(e.org, FIELD_MAX.org),
    role: clip(e.role, FIELD_MAX.role),
    contact: clip(e.contact, FIELD_MAX.contact),
    chips: stringifyChips(e.chips),
    note: clip(e.note, FIELD_MAX.note),
    client_ip: clip(clientIp, FIELD_MAX.ip),
    ua: clip(ua, FIELD_MAX.ua),
    ts: Number.isFinite(e.ts) ? e.ts : Date.now(),
  };
}

function clip(v, max) {
  const s = (v == null ? '' : String(v)).trim();
  return s.slice(0, max);
}

function stringifyChips(arr) {
  if (!Array.isArray(arr)) return '[]';
  const cleaned = arr
    .filter((x) => x != null && x !== '')
    .map((x) => String(x).trim().slice(0, FIELD_MAX.chipsItem))
    .slice(0, FIELD_MAX.chipsMax);
  return JSON.stringify(cleaned);
}

/**
 * 独立路由处理器 (可选).
 * 当前实现中, /api/event 入口在 _worker.js 的 handleEvent 里
 * 已对 t==='partner_intent' 做了分流并调用 storePartnerIntents.
 * 若后续想把留资拆成独立路由 (如 POST /api/partner-intent),
 * 可直接挂载本函数.
 */
export async function handlePartnerIntentRoute(request, env) {
  try {
    const body = await parseBodyJson(request);
    const events = Array.isArray(body) ? body : body ? [body] : [];
    const partnerEvents = events.filter((e) => e && e.t === 'partner_intent');
    const stored = await storePartnerIntents(partnerEvents, env, request);
    // fire-and-forget: 即使 0 条也返回 ok, 不暴露内部状态
    return jsonResponse({ ok: true, stored });
  } catch (err) {
    console.error('handlePartnerIntentRoute error:', err);
    return jsonResponse({ ok: true });
  }
}

async function parseBodyJson(request) {
  const text = await request.text();
  if (!text) return null;
  return JSON.parse(text);
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
