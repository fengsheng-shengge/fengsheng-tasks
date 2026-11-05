-- 风声 · 统计物化层全量重建（D1 免费额度根治 · 回填 + 自愈）
-- 用途：从 events 全量重算物化表并置就绪标记
-- 何时跑：
--   ① 首次上线（建表之后）—— 把历史 events 全量灌进物化层
--   ② 每天一次（定时任务 d1-stats-rollup.yml，北京时间 08:02 = UTC 00:02，
--      选在 D1 免费额度 UTC 00:00 恢复之后 2 分钟）—— 自愈任何增量漂移
-- 幂等：每次都是「按 events 绝对重算」，跑多少次结果都一样。
-- 读取量：events 全表扫 4 遍 ≈ 8.6 万行/次（实测 2026-11-05：85,976 行读 / 9,975 行写）。
--
-- 部署：wrangler d1 execute fengsheng-events --remote --file=migrations/005_rebuild_stats_rollup.sql
--
-- 【为什么不再用 DELETE + INSERT】
--   旧写法先 DELETE 再 INSERT，中间有几十毫秒的「表是空的」窗口；
--   撞上一个请求就会把 0 缓存 15 分钟，看板直接白屏半小时。
--   现在改成：去重集合只增不减（INSERT OR IGNORE），计数表逐行原子替换
--   （INSERT OR REPLACE），全程表不空 → 读者永远看到的是「略旧但完整」的状态。
--   触发器（users / pv_users 累加）在重算期间先摘掉，避免与绝对重算叠加；
--   文件末尾会重新装回，workflow 也会在建表步骤里再兜底一次。

-- ① 重建期间先摘掉两个累加触发器（它们与绝对重算会重复计）
DROP TRIGGER IF EXISTS trg_stats_users;
DROP TRIGGER IF EXISTS trg_stats_pv_users;

-- ② 去重集合：只增不减（events 是纯追加，不存在需要清理的过期行）
INSERT OR IGNORE INTO stats_uid_prod (uid, product)
  SELECT DISTINCT uid, product FROM events;
INSERT OR IGNORE INTO stats_uid_prod_pv (uid, product)
  SELECT DISTINCT uid, product FROM events WHERE event_type = 'pageview';

-- ③ 按 events 绝对重算分产品计数（含 users / pv_users 去重用户数）
INSERT OR REPLACE INTO stats_product (product, users, pv_users, pv, chats, feedback, clicks, events)
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
INSERT OR REPLACE INTO stats_totals (id, pv, chats, feedback, clicks, events)
SELECT 1,
       COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type IN ('chat','mentor_chat','coze_chat_open') THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'reply_submit' THEN 1 ELSE 0 END), 0),
       COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0),
       COUNT(*)
FROM events;

-- ⑤ 全局去重用户
INSERT OR REPLACE INTO stats_uid (uid, pv, chat)
SELECT uid,
       MAX(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END),
       MAX(CASE WHEN event_type IN ('chat','mentor_chat','coze_chat_open') THEN 1 ELSE 0 END)
FROM events GROUP BY uid;

-- ⑥ 装回触发器（此后新事件的 users / pv_users 继续自动累加）
CREATE TRIGGER IF NOT EXISTS trg_stats_users AFTER INSERT ON stats_uid_prod
BEGIN
  UPDATE stats_product SET users = users + 1 WHERE product = NEW.product;
END;

CREATE TRIGGER IF NOT EXISTS trg_stats_pv_users AFTER INSERT ON stats_uid_prod_pv
BEGIN
  UPDATE stats_product SET pv_users = pv_users + 1 WHERE product = NEW.product;
END;

-- ⑦ 置就绪标记：只有走到这一步，统计接口才会切到物化路径
INSERT OR REPLACE INTO stats_meta (key, value) VALUES ('rollup_ready', datetime('now'));
