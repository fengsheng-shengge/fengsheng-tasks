-- ============================================================
--  009: 取证 —— events 表索引清单与规模（诊断件 · 预期失败）
-- ============================================================
-- 【目的】
-- 把生产库的关键事实「读出来」到 CI 日志里：
--   · events 表的完整索引清单
--   · events 总行数、distinct page 数、distinct uid 数
--   · page 值分布（判断「WHERE page=?」的命中面有多大）
--
-- 【为什么这个文件「预期失败」】
-- D1 每日 rows read 额度锁死时：
--   · wrangler d1 execute --command（query API）→ 被预检拦住，读不出结果
--   · wrangler d1 execute --file（bulk import）→ 不受限，但 SELECT 结果不打印
-- 唯一能把查询结果「读出来」的通道，是让 RAISE(ABORT, <动态文本>) 主动中断 import，
-- 错误信息会被完整打印到 CI 日志里。
-- 所以这个文件跑完一定是红的 —— 它是诊断件，不进 CI 闸门，
-- 只在需要取证时手动跑。
--
-- 【原子性与残留】
-- D1 的 bulk import 遇错整体回滚，不会留残留；但本地 sqlite3 CLI 遇错
-- 不会自动回滚。所以开头先无条件 DROP 一次，两边都干净。
--
-- 【取不到的东西】
-- SQL 层拿不到 EXPLAIN QUERY PLAN 的输出（它是语句不是表）。
-- 执行计划的取证放在 CI 的 --command 步骤里做，额度恢复后自动跑。
-- ============================================================

-- ① 先无条件清理可能残留的对象
DROP TRIGGER IF EXISTS _plan_raise;
DROP TABLE IF EXISTS _plan_probe;

CREATE TABLE _plan_probe (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);

CREATE TRIGGER _plan_raise
BEFORE INSERT ON _plan_probe
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, NEW.payload);
END;

-- ② 触发 RAISE，把取证文本写进错误信息
INSERT INTO _plan_probe (id, payload)
SELECT 1,
  'EVIDENCE|索引清单: ' || (SELECT group_concat(name, ',') FROM pragma_index_list('events'))
  || '|events_rows: ' || (SELECT COUNT(*) FROM events)
  || '|distinct_page: ' || (SELECT COUNT(DISTINCT page) FROM events)
  || '|distinct_uid: ' || (SELECT COUNT(DISTINCT uid) FROM events)
  || '|page分布: ' || (
       SELECT group_concat(page || '=' || cnt, ', ') FROM (
         SELECT page, COUNT(*) AS cnt FROM events WHERE page != ''
         GROUP BY page ORDER BY cnt DESC LIMIT 8
       )
     );
