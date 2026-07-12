-- 风声 · 数据采集层 D1 建表
-- 用途：存储 tracker.js 前端埋点事件
-- 部署：wrangler d1 execute fengsheng-db --file=migrations/001_create_events.sql

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL DEFAULT 'anon',
  event_type TEXT NOT NULL DEFAULT 'event',
  url TEXT DEFAULT '',
  page TEXT DEFAULT '',
  product TEXT DEFAULT '',
  title TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  utm_source TEXT DEFAULT '',
  utm_medium TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  ref TEXT DEFAULT '',
  source TEXT DEFAULT '',
  ua TEXT DEFAULT '',
  screen TEXT DEFAULT '',
  vp TEXT DEFAULT '',
  locale TEXT DEFAULT '',
  data TEXT DEFAULT '',
  ts INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 高频查询索引
CREATE INDEX IF NOT EXISTS idx_events_uid ON events(uid);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_product ON events(product);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);