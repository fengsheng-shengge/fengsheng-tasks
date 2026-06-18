-- ============================================================
-- 风声 D1 Schema v2.0 · 对应作战方案 v1.1（110人验证线）
-- 小扣子（技术侧）产出
--
-- 执行方式：Cloudflare Dashboard → D1 → fengsheng-db → Console
-- 注意：SQLite 语法，ALTER TABLE ADD COLUMN 可用
-- 首次部署整段执行即可，增量部署只执行对应 ALTER 部分
-- ============================================================

-- ------------------------------------------------------------
-- 1) 反馈表 feedback（用户提交的意见/线索）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  page TEXT DEFAULT '',
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  product TEXT DEFAULT '',        -- 新增 v2.0：所属产品 breeder/knowledge/...
  uid TEXT DEFAULT '',             -- 新增 v2.0：关联 tracker.js 的 fs_uid
  ip_hash TEXT DEFAULT '',         -- 新增 v2.0：匿名 IP hash，用于限流
  user_agent TEXT DEFAULT '',      -- 新增 v2.0：UA 字符串
  status TEXT DEFAULT 'open',      -- 新增 v2.0：open/closed/spam
  source TEXT DEFAULT '',          -- 新增 v2.0：来源备注（utm/人工等）
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_topic ON feedback(topic);
CREATE INDEX IF NOT EXISTS idx_feedback_product ON feedback(product, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_uid ON feedback(uid, created_at DESC);

-- 若数据库已有旧表，用下列语句补齐字段（可重复执行无副作用）
-- ALTER TABLE feedback ADD COLUMN product TEXT DEFAULT '';
-- ALTER TABLE feedback ADD COLUMN uid TEXT DEFAULT '';
-- ALTER TABLE feedback ADD COLUMN ip_hash TEXT DEFAULT '';
-- ALTER TABLE feedback ADD COLUMN user_agent TEXT DEFAULT '';
-- ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT 'open';
-- ALTER TABLE feedback ADD COLUMN source TEXT DEFAULT '';

-- ------------------------------------------------------------
-- 2) 埋点事件表 events（tracker.js 自动上报的行为数据）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT DEFAULT '',             -- 匿名用户 ID
  event_type TEXT NOT NULL,         -- pageview/click/reply_submit/scroll_depth/...
  page TEXT DEFAULT '',             -- 页面路径
  product TEXT DEFAULT '',          -- 新增 v2.0：产品标识
  utm_source TEXT DEFAULT '',       -- 新增 v2.0：推广来源
  utm_medium TEXT DEFAULT '',       -- 新增 v2.0：推广媒介
  utm_campaign TEXT DEFAULT '',     -- 新增 v2.0：推广活动
  ref TEXT DEFAULT '',              -- 新增 v2.0：referrer
  data TEXT DEFAULT '{}',           -- 结构化附加数据（JSON）
  ip_hash TEXT DEFAULT '',          -- 新增 v2.0：匿名 IP hash
  user_agent TEXT DEFAULT '',       -- 新增 v2.0：UA 字符串
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product ON events(product, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_uid ON events(uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product_type ON events(product, event_type, created_at DESC);

-- 旧表增量补齐语句：
-- ALTER TABLE events ADD COLUMN product TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN utm_source TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN utm_medium TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN utm_campaign TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN ref TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN ip_hash TEXT DEFAULT '';
-- ALTER TABLE events ADD COLUMN user_agent TEXT DEFAULT '';

-- ------------------------------------------------------------
-- 3) 每日聚合统计表 stats_daily（Dashboard 读此表，避免全表扫）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stats_daily (
  date TEXT NOT NULL,              -- YYYY-MM-DD
  product TEXT NOT NULL,            -- 产品名 / 'all'
  pageviews INTEGER DEFAULT 0,      -- 当日 pageview 数
  unique_uids INTEGER DEFAULT 0,    -- 当日独立 uid 数
  clicks INTEGER DEFAULT 0,         -- 当日 click 事件数
  feedbacks INTEGER DEFAULT 0,      -- 当日反馈条数
  PRIMARY KEY (date, product)
);

CREATE INDEX IF NOT EXISTS idx_stats_daily_date ON stats_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_stats_daily_product ON stats_daily(product, date DESC);

-- ============================================================
-- END · 小扣子 v2.0 schema
-- ============================================================