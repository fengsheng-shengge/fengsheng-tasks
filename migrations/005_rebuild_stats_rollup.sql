-- 风声 · 统计物化层全量重建（D1 免费额度根治 · 回填 + 自愈）
-- 用途：从 events 全量重算物化表并置就绪标记
-- 何时跑：
--   ① 首次上线（建表之后）—— 把历史 events 全量灌进物化层
--   ② 每天一次（定时任务 d1-stats-rollup.yml，北京时间 08:02 = UTC 00:02，
--      选在 D1 免费额度 UTC 00:00 恢复之后 2 分钟）—— 自愈任何增量漂移
-- 幂等：每次都是「先清空再按 events 绝对重算」，跑多少次结果都一样。
-- 读取量：events 全表扫 4 遍 ≈ 5.5 万行/天，占 500 万额度的 1.1%。
--
-- 部署：wrangler d1 execute fengsheng-db --remote --file=migrations/005_rebuild_stats_rollup.sql

-- ① 先清空（注意顺序：stats_product 必须先于去重集合清空，
--    否则重建时触发器会往旧行上累加，导致重复计数）
DELETE FROM stats_uid_prod;
DELETE FROM stats_uid_prod_pv;
DELETE FROM stats_product;
DELETE FROM stats_totals;
DELETE FROM stats_uid;

-- ② 重建去重集合（此刻 stats_product 为空，触发器的 UPDATE 影响 0 行 → 不会多计）
INSERT OR IGNORE INTO stats_uid_prod (uid, product)
  SELECT DISTINCT uid, product FROM events;
INSERT OR IGNORE INTO stats_uid_prod_pv (uid, product)
  SELECT DISTINCT uid, product FROM events WHERE event_type = 'pageview';

-- ③ 按 events 绝对重算分产品计数（含 users / pv_users 去重用户数）
INSERT INTO stats_product (product, users, pv_users, pv, chats, feedback, clicks, events)
SELECT product,
       COUNT(DISTINCT uid),
       COUNT(DISTINCT CASE WHEN event_type = 'pageview' THEN uid END),
       COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type IN ('chat','mentor_chat','coze_chat_open') THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'reply_submit' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
       COUNT(*)
FROM events GROUP BY product;

-- ④ 全局计数
INSERT INTO stats_totals (id, pv, chats, feedback, clicks, events)
SELECT 1,
       COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type IN ('chat','mentor_chat','coze_chat_open') THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'reply_submit' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
       COUNT(*)
FROM events;

-- ⑤ 全局去重用户
INSERT INTO stats_uid (uid, pv, chat)
SELECT uid,
       MAX(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END),
       MAX(CASE WHEN event_type IN ('chat','mentor_chat','coze_chat_open') THEN 1 ELSE 0 END)
FROM events GROUP BY uid;

-- ⑥ 置就绪标记：只有走到这一步，统计接口才会切到物化路径
INSERT OR REPLACE INTO stats_meta (key, value) VALUES ('rollup_ready', datetime('now'));
