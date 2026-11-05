-- 风声 · 统计物化层校验（与 events 严格对账，不一致即整条失败）
-- 用途：① 打印生产真值快照到 Actions 日志；② 用 CHECK 约束做硬校验，
--        任何口径漂移都让 CI 直接变红，而不是悄悄算错。
--
-- 为什么走 wrangler d1 execute --file 而不是 --command：
--   D1 免费额度的「每日 rows read」限制只卡 query API（wrangler --command / Worker D1 绑定）；
--   bulk import（--file）路径不受该限制。2026-11-05 额度锁死期间实测：
--   --command 被拒（code 7500），--file 正常执行（读 8.6 万行、写 1 万行）。
--   所以额度锁死时也能验证物化层。

-- ① 真值快照（打印在 Actions 日志里）
SELECT
  (SELECT events FROM stats_totals WHERE id=1)       AS events_total,
  (SELECT pv FROM stats_totals WHERE id=1)            AS pv_total,
  (SELECT chats FROM stats_totals WHERE id=1)         AS chats_total,
  (SELECT feedback FROM stats_totals WHERE id=1)      AS feedback_total,
  (SELECT clicks FROM stats_totals WHERE id=1)        AS clicks_total,
  (SELECT COUNT(*) FROM stats_uid)                    AS uid_rows,
  (SELECT SUM(pv) FROM stats_uid)                     AS uv_total,
  (SELECT SUM(chat) FROM stats_uid)                   AS chat_user_total,
  (SELECT COUNT(*) FROM stats_product)                AS product_rows,
  (SELECT COUNT(*) FROM stats_uid_prod)               AS uid_prod_rows,
  (SELECT COUNT(*) FROM stats_uid_prod_pv)            AS uid_prod_pv_rows,
  (SELECT value FROM stats_meta WHERE key='rollup_ready') AS rollup_ready,
  (SELECT COUNT(*) FROM events)                       AS events_raw,
  (SELECT COUNT(DISTINCT uid) FROM events)            AS users_raw,
  (SELECT COUNT(*) FROM events WHERE event_type='pageview') AS pv_raw,
  (SELECT COUNT(*) FROM events WHERE event_type IN ('chat','mentor_chat','coze_chat_open')) AS chats_raw,
  (SELECT COUNT(*) FROM events WHERE event_type='reply_submit') AS feedback_raw,
  (SELECT COUNT(*) FROM events WHERE event_type='click') AS clicks_raw;

-- ② 硬校验：任一项不一致 → CHECK(ok = 1) 失败 → import 报错 → CI 变红
CREATE TABLE IF NOT EXISTS stats_verify (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM stats_verify;
INSERT INTO stats_verify (ok)
SELECT CASE WHEN
     (SELECT events FROM stats_totals WHERE id=1)   = (SELECT COUNT(*) FROM events)
 AND (SELECT pv FROM stats_totals WHERE id=1)       = (SELECT COUNT(*) FROM events WHERE event_type='pageview')
 AND (SELECT chats FROM stats_totals WHERE id=1)    = (SELECT COUNT(*) FROM events WHERE event_type IN ('chat','mentor_chat','coze_chat_open'))
 AND (SELECT feedback FROM stats_totals WHERE id=1) = (SELECT COUNT(*) FROM events WHERE event_type='reply_submit')
 AND (SELECT clicks FROM stats_totals WHERE id=1)   = (SELECT COUNT(*) FROM events WHERE event_type='click')
 AND (SELECT COUNT(*) FROM stats_uid)               = (SELECT COUNT(DISTINCT uid) FROM events)
 AND (SELECT SUM(pv) FROM stats_uid)                = (SELECT COUNT(DISTINCT uid) FROM events WHERE event_type='pageview')
 AND (SELECT SUM(chat) FROM stats_uid)              = (SELECT COUNT(DISTINCT uid) FROM events WHERE event_type IN ('chat','mentor_chat','coze_chat_open'))
 AND (SELECT COUNT(*) FROM stats_uid_prod)          = (SELECT COUNT(*) FROM (SELECT DISTINCT uid, product FROM events))
 AND (SELECT COUNT(*) FROM stats_uid_prod_pv)       = (SELECT COUNT(*) FROM (SELECT DISTINCT uid, product FROM events WHERE event_type='pageview'))
 AND (SELECT SUM(users) FROM stats_product)         = (SELECT COUNT(*) FROM (SELECT DISTINCT uid, product FROM events))
 AND (SELECT SUM(pv_users) FROM stats_product)      = (SELECT COUNT(*) FROM (SELECT DISTINCT uid, product FROM events WHERE event_type='pageview'))
 AND EXISTS (SELECT 1 FROM stats_meta WHERE key='rollup_ready' AND value IS NOT NULL)
THEN 1 ELSE 0 END;
