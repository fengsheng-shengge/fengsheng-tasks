-- ============================================================
--  007: D1 额度根治 · 第二阶段 —— events 表补索引
-- ============================================================
--  【实测根因（2026-11-05，Cloudflare GraphQL D1 analytics 实证）】
--  72 小时内 fengsheng-events 共读 1303 万行，远超免费额度 500 万/天。
--  按 SQL 拆排行，前 6 名全是「管理端交互式查询」，而非统计聚合接口：
--
--   1. 1,862,190 行  SELECT ... FROM events WHERE page = ?
--                        ORDER BY created_at ASC LIMIT ?
--   2.   843,680 行  SELECT ... WHERE uid LIKE ? OR event_type LIKE ? OR ...
--                        （10 个字段的模糊搜索）
--   3.   773,724 行  SELECT page, COUNT(*) FROM events WHERE page != ''
--                        GROUP BY page ORDER BY cnt DESC LIMIT ?
--   4.   307,600 行  SELECT ts, event_type, product FROM events
--                        ORDER BY ts DESC LIMIT ?
--   5.   184,680 行  SELECT id FROM events WHERE uid LIKE ? OR ... LIMIT ?
--   6.   153,900 行  SELECT COUNT(*) FROM events
--
--  【为什么第 1 条最致命】
--  events 表现有索引：uid / event_type / product / ts / created_at。
--  `WHERE page = ?` 命中不了任何一个；为了满足 `ORDER BY created_at ASC`，
--  SQLite 只能选 idx_events_created_at 做索引扫描：
--      SCAN events USING INDEX idx_events_created_at   ← 全表 13,685 行
--  即：取前 100 条也要把整表扫一遍。生产库行数更大，代价同比放大。
--  本地复现库实测（1.37 万行）：
--      改前：SCAN events USING INDEX idx_events_created_at
--      改后：SEARCH events USING INDEX idx_events_page_created (page=?)
--
--  【本次补的索引】
--  · idx_events_page_created (page, created_at)
--      复合索引：page 等值 + created_at 有序 → 上面第 1 条从全表扫变范围扫，
--      且 ORDER BY / LIMIT 直接由索引提供，无需临时排序。
--      附带收益：第 3 条 GROUP BY page 也能走该索引（SCAN → COVERING INDEX）。
--
--  · idx_events_created_at_event_type (created_at, event_type)
--      统计类接口的日期范围过滤 + event_type 过滤复合，
--      让「近 N 天某事件类型」这类查询只读索引而非回表。
--
--  【为什么不一次性加更多索引】
--  D1 的 rows read 按扫描行数计费，但索引本身要占存储、拖慢写入。
--  本次只加两条与已实测热点一一对应的索引，其余按需再加。
--
--  【幂等】IF NOT EXISTS，可重复执行。
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_page_created
  ON events(page, created_at);

CREATE INDEX IF NOT EXISTS idx_events_created_at_event_type
  ON events(created_at, event_type);
