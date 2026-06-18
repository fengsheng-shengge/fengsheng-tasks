-- D1 反馈表 schema
-- 在 Cloudflare Dashboard → D1 → fengsheng-db → Console 中执行

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  page TEXT DEFAULT '',
  content TEXT NOT NULL,
  contact TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_topic ON feedback(topic);
-- 埋点事件表
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT DEFAULT '',
  event_type TEXT NOT NULL,
  page TEXT DEFAULT '',
  data TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
