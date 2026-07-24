-- 风声 · 合作意向留资 D1 建表 (issue #191 任务1)
-- 用途：存储 partner.js 通过 POST /api/event (t='partner_intent') 提交的合作意向
-- 部署：wrangler d1 execute fengsheng-db --file=migrations/002_create_partner_intents.sql
-- 兜底：若 D1/表不可用, worker 会降级写入 KV (env.PARTNER_LEADS)

CREATE TABLE IF NOT EXISTS partner_intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intent_type TEXT NOT NULL DEFAULT 'edu',   -- edu(高校) | gov(政府)
  name TEXT NOT NULL DEFAULT '',             -- 姓名
  org TEXT NOT NULL DEFAULT '',              -- 机构/学校
  role TEXT NOT NULL DEFAULT '',             -- 职务
  contact TEXT NOT NULL DEFAULT '',          -- 联系方式
  chips TEXT NOT NULL DEFAULT '[]',          -- 合作方向标签 (JSON 数组字符串)
  note TEXT NOT NULL DEFAULT '',             -- 备注
  client_ip TEXT NOT NULL DEFAULT '',        -- 提交者 IP
  ua TEXT NOT NULL DEFAULT '',               -- User-Agent
  ts INTEGER NOT NULL,                       -- 前端时间戳 (ms)
  created_at INTEGER NOT NULL                -- 服务端落库时间 (s, unixepoch)
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_partner_intents_type ON partner_intents(intent_type);
CREATE INDEX IF NOT EXISTS idx_partner_intents_created_at ON partner_intents(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_intents_contact ON partner_intents(contact);
