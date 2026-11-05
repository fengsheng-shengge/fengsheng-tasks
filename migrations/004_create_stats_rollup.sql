-- 风声 · 统计物化层建表（D1 免费额度根治）
-- 用途：把统计接口的「全时段聚合」从 events 全表扫描改为读物化表
-- 背景：2026-11-05 D1 免费额度（500 万 rows read/天）被打穿。
--      实测执行计划：/api/stats 9 条 SQL 中 6 条无任何日期过滤，
--      单个请求即读 8.2 万行（events 1.37 万行 × 6）；叠加 /api/stats/summary 4 条
--      与 /api/chats 7 条，日 rows read 直接超限，所有统计接口返回 0。
--      根治：写入侧增量维护本组物化表，统计接口改读物化表 → 单请求降到约 1 千行。
--
-- 部署：wrangler d1 execute fengsheng-db --remote --file=migrations/004_create_stats_rollup.sql
-- 说明：本文件只有 DDL，0 行读取，额度锁死时也能执行。
--      建表后需再执行 005_rebuild_stats_rollup.sql 做全量回填并置就绪标记。

-- ① 全局计数（单行，id=1）
CREATE TABLE IF NOT EXISTS stats_totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pv INTEGER NOT NULL DEFAULT 0,
  chats INTEGER NOT NULL DEFAULT 0,
  feedback INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0
);

-- ② 分产品计数（users / pv_users 为去重用户数，由触发器累加）
CREATE TABLE IF NOT EXISTS stats_product (
  product TEXT PRIMARY KEY,
  users INTEGER NOT NULL DEFAULT 0,
  pv_users INTEGER NOT NULL DEFAULT 0,
  pv INTEGER NOT NULL DEFAULT 0,
  chats INTEGER NOT NULL DEFAULT 0,
  feedback INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0
);

-- ③ 全局去重用户（uid 唯一；pv/chat 为是否出现过该类事件）
CREATE TABLE IF NOT EXISTS stats_uid (
  uid TEXT PRIMARY KEY,
  pv INTEGER NOT NULL DEFAULT 0,
  chat INTEGER NOT NULL DEFAULT 0
);

-- ④ 产品维度去重集合（写入用；供触发器累加 stats_product.users）
CREATE TABLE IF NOT EXISTS stats_uid_prod (
  uid TEXT NOT NULL,
  product TEXT NOT NULL,
  PRIMARY KEY (uid, product)
);

-- ⑤ 产品维度 pageview 去重集合（写入用；供触发器累加 stats_product.pv_users）
CREATE TABLE IF NOT EXISTS stats_uid_prod_pv (
  uid TEXT NOT NULL,
  product TEXT NOT NULL,
  PRIMARY KEY (uid, product)
);

-- ⑥ 就绪标记：rollup_ready 有值 = 物化层已回填，统计接口才允许读物化表
CREATE TABLE IF NOT EXISTS stats_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_stats_uid_prod_product ON stats_uid_prod(product);
CREATE INDEX IF NOT EXISTS idx_stats_uid_prod_pv_product ON stats_uid_prod_pv(product);

-- 去重用户数增量维护：同一 (uid, product) 只在首次出现时插入，
-- 触发器因此只在「新用户-新组合」时 +1，不会重复累加。
CREATE TRIGGER IF NOT EXISTS trg_stats_users AFTER INSERT ON stats_uid_prod
BEGIN
  UPDATE stats_product SET users = users + 1 WHERE product = NEW.product;
END;

CREATE TRIGGER IF NOT EXISTS trg_stats_pv_users AFTER INSERT ON stats_uid_prod_pv
BEGIN
  UPDATE stats_product SET pv_users = pv_users + 1 WHERE product = NEW.product;
END;
