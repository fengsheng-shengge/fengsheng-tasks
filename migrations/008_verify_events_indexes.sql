-- ============================================================
--  008: 验证 events 表热点查询的索引已就位（生产硬校验）
-- ============================================================
-- 【目的】
-- migrations/007 补的索引必须真的在生产库上建好，否则第 1 热点查询
--   SELECT ... FROM events WHERE page = ? ORDER BY created_at ASC LIMIT ?
-- 仍会走 SCAN events USING INDEX idx_events_created_at（整表扫），
--  500 万行/天的免费额度还会被打穿。
--
-- 【为什么用 CHECK 约束而不是 SELECT 校验】
-- D1 每日 rows read 额度锁死时：
--   · wrangler d1 execute --command（query API）→ 被预检拦住，读不出结果
--   · wrangler d1 execute --file（bulk import）→ 不受限，但 SELECT 结果不打印
-- CHECK 约束在 import 路径上照样生效：条件不满足 → 整条 import 报错 → CI 直接红。
-- 校验通过则 import 成功，CI 绿。
--
-- 【校验内容】
-- 两条新索引都必须存在：
--   idx_events_page_created            (page, created_at)          ← 第 1 热点
--   idx_events_created_at_event_type   (created_at, event_type)    ← 统计类查询
--
-- 【不留下任何残留对象】用完即 DROP。
-- ============================================================

-- ① 硬校验表：CHECK (ok = 2) —— 两条索引都在时 ok=2，插入成功；
--    少任何一条 ok<2 → CHECK 失败 → import 报错 → CI 变红。
CREATE TABLE IF NOT EXISTS _idx_verify (
  id INTEGER PRIMARY KEY,
  ok INTEGER NOT NULL CHECK (ok = 2),
  idx_page_created INTEGER NOT NULL,
  idx_created_event INTEGER NOT NULL,
  events_rows INTEGER NOT NULL
);
DELETE FROM _idx_verify;

INSERT INTO _idx_verify (id, ok, idx_page_created, idx_created_event, events_rows)
SELECT 1,
  (SELECT COUNT(*) FROM pragma_index_list('events') WHERE name IN (
     'idx_events_page_created', 'idx_events_created_at_event_type'
   )),
  (SELECT COUNT(*) FROM pragma_index_list('events') WHERE name = 'idx_events_page_created'),
  (SELECT COUNT(*) FROM pragma_index_list('events') WHERE name = 'idx_events_created_at_event_type'),
  (SELECT COUNT(*) FROM events);

-- ② 清理：不留残留对象
DROP TABLE _idx_verify;
