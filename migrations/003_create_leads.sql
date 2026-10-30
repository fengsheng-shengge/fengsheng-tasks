-- 风声 · P1 留资 D1 建表
-- 用途: POST /api/lead 消费者 AI 顾问留资落库
-- 部署: wrangler d1 execute fengsheng-db --file=migrations/003_create_leads.sql

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,                        -- 'lead_' + hash
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  intent TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai-advisor',  -- ai-advisor | partner | tracker | manual
  client_type TEXT NOT NULL DEFAULT 'unknown', -- buyer | seller | renter | agency
  stage TEXT NOT NULL DEFAULT '',              -- prepare | invite | negotiate | transaction
  message TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  ua TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''          -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_client_type ON leads(client_type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
