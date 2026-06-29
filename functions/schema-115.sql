-- ============================================================
-- #115 数据基建 · AI提及率追踪 Schema
-- 小扣子 2026-06-29
--
-- 执行方式：Cloudflare Dashboard → D1 → fengsheng-db → Console
-- ALTER TABLE 可重复执行（SQLite 允许 ADD COLUMN idempotent）
-- ============================================================

-- ------------------------------------------------------------
-- 4) AI提及率记录表 ai_mentions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engine TEXT NOT NULL,              -- 引擎标识: metaso/kimi/doubao/baidu/perplexity/chatgpt
  engine_name TEXT NOT NULL,         -- 显示名称: 秘塔AI/Kimi/豆包/文心一言/Perplexity/ChatGPT
  query TEXT NOT NULL,               -- 触发搜索的关键词
  mentioned INTEGER NOT NULL DEFAULT 0, -- 0=未提及 1=提及
  mention_snippet TEXT DEFAULT '',    -- 提及时的原文摘要
  mention_url TEXT DEFAULT '',        -- 来源页面URL
  search_url TEXT DEFAULT '',        -- 当时的搜索URL（可复现）
  search_date TEXT NOT NULL,         -- 执行搜索的日期 YYYY-MM-DD
  created_at INTEGER NOT NULL         -- 记录创建时间戳
);

CREATE INDEX IF NOT EXISTS idx_ai_mentions_engine ON ai_mentions(engine);
CREATE INDEX IF NOT EXISTS idx_ai_mentions_date ON ai_mentions(search_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mentions_engine_date ON ai_mentions(engine, search_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mentions_mentioned ON ai_mentions(mentioned, search_date DESC);

-- 增量补齐（已有表则跳过）：
-- ALTER TABLE ai_mentions ADD COLUMN engine TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN engine_name TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN query TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN mentioned INTEGER DEFAULT 0;
-- ALTER TABLE ai_mentions ADD COLUMN mention_snippet TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN mention_url TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN search_url TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN search_date TEXT;
-- ALTER TABLE ai_mentions ADD COLUMN created_at INTEGER;

-- ------------------------------------------------------------
-- 5) 付费转化事件表 subscriptions（对应P2/P3付费墙上线后）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT DEFAULT '',               -- 用户ID（关联 events.uid）
  product TEXT NOT NULL,            -- 产品: decoder-basic/decorder-pro/quality-test/quality-pro
  plan TEXT NOT NULL,                -- 套餐: monthly/yearly
  price_yuan INTEGER NOT NULL,       -- 价格（分：4900=¥49）
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/initiated/completed/failed/refunded
  order_id TEXT DEFAULT '',          -- 外部订单号（微信支付）
  paid_at INTEGER,                   -- 支付完成时间戳
  expires_at INTEGER,                -- 订阅过期时间戳
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subs_uid ON subscriptions(uid);
CREATE INDEX IF NOT EXISTS idx_subs_product ON subscriptions(product, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_paid ON subscriptions(paid_at DESC);

-- 增量补齐：
-- ALTER TABLE subscriptions ADD COLUMN uid TEXT;
-- ALTER TABLE subscriptions ADD COLUMN product TEXT;
-- ALTER TABLE subscriptions ADD COLUMN plan TEXT;
-- ALTER TABLE subscriptions ADD COLUMN price_yuan INTEGER;
-- ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'pending';
-- ALTER TABLE subscriptions ADD COLUMN order_id TEXT;
-- ALTER TABLE subscriptions ADD COLUMN paid_at INTEGER;
-- ALTER TABLE subscriptions ADD COLUMN expires_at INTEGER;
-- ALTER TABLE subscriptions ADD COLUMN created_at INTEGER;

-- ============================================================
-- END · #115 数据基建 Schema
-- ============================================================
