-- ============================================================
-- P5 M1: AI提及率数据采集 — D1数据库表
-- 小扣子 · 2026.06.27
--
-- 使用方式：
-- 1. 在 Cloudflare Dashboard → D1 → 选择数据库
-- 2. 点击 "Query" → 粘贴本文件内容执行
-- 3. 或用 Wrangler: wrangler d1 execute <db-name> --file=ai_events_schema.sql
-- ============================================================

-- AI事件表：记录词条被AI展示/使用的埋点
CREATE TABLE IF NOT EXISTS ai_events (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,           -- 'ai_surfaced' | 'ai_used'
  entry_id    TEXT NOT NULL,           -- 词条ID，如 'TRX-001'
  entry_name  TEXT,                    -- 词条名称
  domain      TEXT NOT NULL,           -- 域，如 'trade'
  session_id  TEXT,                    -- 会话ID（关联用户行为）
  source      TEXT DEFAULT 'knowledge', -- 来源：'knowledge' | 'decode' | 'assess' | 'mini-program'
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_entry ON ai_events(entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_domain ON ai_events(domain);
CREATE INDEX IF NOT EXISTS idx_ai_type ON ai_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_ts ON ai_events(ts);

-- 产品事件扩展表：记录产品级别的AI使用事件（可关联订阅/转化）
CREATE TABLE IF NOT EXISTS product_events (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,           -- 'decode' | 'assess' | 'subscribe' | 'report_generate'
  product     TEXT NOT NULL,           -- 'decode' | 'assess' | 'agent' | 's1-report'
  user_id     TEXT,                    -- 用户ID（未登录时为空）
  session_id  TEXT,                    -- 会话ID
  metadata    TEXT,                     -- JSON格式附加数据
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pe_type ON product_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pe_product ON product_events(product);
CREATE INDEX IF NOT EXISTS idx_pe_user ON product_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pe_ts ON product_events(ts);

-- 外部提及记录表：运营人员手动录入外部AI引擎提及
CREATE TABLE IF NOT EXISTS external_mentions (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,           -- 'perplexity' | 'chatgpt' | 'gemini' | 'semrush' | 'manual'
  url         TEXT,                     -- 提及来源URL
  entry_id    TEXT,                     -- 相关词条ID（可选）
  content     TEXT,                     -- 提及内容摘要
  found_at    INTEGER NOT NULL DEFAULT (unixepoch()),  -- 发现时间
  entered_by  TEXT DEFAULT 'system',    -- 录入人
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_em_source ON external_mentions(source);
CREATE INDEX IF NOT EXISTS idx_em_entry ON external_mentions(entry_id) WHERE entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_em_found ON external_mentions(found_at);

-- 示例查询：AI使用率
-- SELECT
--   COUNT(DISTINCT date(ts, 'unixepoch')) as active_days,
--   COUNT(*) as total_ai_used,
--   COUNT(DISTINCT session_id) as unique_sessions
-- FROM ai_events
-- WHERE event_type = 'ai_used'
--   AND ts > unixepoch() - 30 * 86400;
