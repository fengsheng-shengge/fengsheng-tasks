# P5 里程碑1：AI提及率指标 — 设计方案

**作者**：小扣子
**日期**：2026-06-27
**版本**：v1
**用途**：P5#115 M1 + P1#111 M4 共用数据层

---

## 1. 什么是"AI提及率"

**定义**：风声知识底座词条在AI搜索/对话场景中被引用/提及的频次。

**两层含义**：

| 层级 | 含义 | 可追踪性 |
|------|------|---------|
| **内部提及率** | 风声用户在产品内使用AI功能的比率（如：查词条→用了AI解读的比例） | ✅ 可追踪（前端埋点） |
| **外部提及率** | 外部AI引擎（Perplexity/ChatGPT/文心）提及风声词条的频次 | ❌ 需外部工具（SEMrush/Brandwatch） |

**MVP方案**：先做**内部提及率**，外部提及率在GEO化上线后用第三方工具补充。

---

## 2. 内部AI提及率 — 数据采集

### 2.1 新增事件类型

在 `tracker.js` 和 `event.js` 中新增两个事件：

```
ai_surfaced  — 词条被AI功能展示（AI摘要/解读/对比出现）
ai_used      — 用户主动触发AI功能（点击"AI解读"/"AI对比"等）
```

### 2.2 埋点位置

在 knowledge.html 的词条卡片中，当以下场景触发时上报：

```javascript
// 用户点击"AI解读"按钮 → 上报 ai_used
track.use('ai_interpret', { entryId: 'TRX-001', domain: 'trade' })

// 词条在AI摘要中展示 → 上报 ai_surfaced（批量，滚动时触发）
track.use('ai_surfaced', { entryId: 'TRX-001', domain: 'trade' })
```

### 2.3 D1新增表

```sql
CREATE TABLE IF NOT EXISTS ai_events (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,           -- 'ai_surfaced' | 'ai_used'
  entry_id    TEXT NOT NULL,           -- 词条ID，如 'TRX-001'
  entry_name  TEXT,                    -- 词条名称
  domain      TEXT NOT NULL,           -- 域，如 'trade'
  session_id  TEXT,                    -- 会话ID（关联用户行为）
  source      TEXT DEFAULT 'knowledge', -- 来源：'knowledge' | 'decode' | 'assess'
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_ai_entry ON ai_events(entry_id);
CREATE INDEX idx_ai_domain ON ai_events(domain);
CREATE INDEX idx_ai_type ON ai_events(event_type);
CREATE INDEX idx_ai_ts ON ai_events(ts);
```

### 2.4 API端点

```javascript
// 新增 GET /api/ai-stats
// 查询参数：
//   key=fs-admin-2026（认证）
//   period=today|week|month|all
//   domain=trade|quality-customer|...（可选筛选）

// 响应：
{
  "total_ai_used": 342,           // AI功能总使用次数
  "total_ai_surfaced": 1850,      // 词条被AI展示总次数
  "top_entries": [                // Top 10 被AI展示的词条
    { "entry_id": "TRX-001", "entry_name": "真房源", "count": 89, "domain": "trade" },
    { "entry_id": "QLT-005", "entry_name": "资金监管", "count": 76, "domain": "trade" }
  ],
  "ai_usage_rate": "18.3%",       // AI使用率 = ai_used / 页面UV
  "by_domain": {                   // 各域分布
    "trade": { used: 200, surfaced: 1100 },
    "quality-customer": { used: 80, surfaced: 400 },
    "rental": { used: 40, surfaced: 200 }
  }
}
```

---

## 3. 外部提及率 — 采集方案

### 3.1 可用工具

| 工具 | 免费额度 | 说明 |
|------|---------|------|
| Google Alerts | 无限 | 监控 "风声"+"AI" 等关键词 |
| SEMrush | 10次/月免费 | 追踪品牌提及+AI搜索引擎 |
| Mention | 14天试用 | 全网实时监控 |
| Google Search Console | 无限 | 监控知识底座被搜索引擎收录 |

### 3.2 MVP实施

**Google Alerts 配置（立即可做）**：
- 关键词1：`风声` + `AI`
- 关键词2：`风声` + `Perplexity`
- 关键词3：`fengsheng.tech`
- 关键词4：`风声 居住服务`
- 关键词5：`资金监管 AI`
- 关键词6：`学区房 AI`

**GSC数据提取（立即可做）**：
- 通过 Search Console API 拉取知识底座页面的搜索展现量/点击量
- 区分 `site:fenfsheng.tech` 查询（外部引用）

### 3.3 手动录入机制

在 `/api/ops/` 中新增手动录入接口：

```javascript
// POST /api/ops/ai-mention
// Body: { source: 'perplexity', url: '...', entry_id: 'TRX-001', date: '2026-06-27' }
// 说明：运营人员发现外部提及时手动录入
```

---

## 4. 验证看板集成

AI提及率数据接入 P5 M3 验证看板，显示：

```
┌─────────────────────────────────────────┐
│  AI提及率（本月）          18.3%      │
│  ▲ +3.2% vs 上月                      │
├─────────────────────────────────────────┤
│  内部：AI功能使用       342次          │
│  外部：监测到提及        12次（手动）   │
├─────────────────────────────────────────┤
│  Top词条                                │
│  1. 真房源        89次  ▲              │
│  2. 资金监管      76次  ▲              │
│  3. 六维品质      54次  —              │
└─────────────────────────────────────────┘
```

---

## 5. 实施任务拆分

| 任务 | 工期 | 依赖 | 负责人 |
|------|------|------|--------|
| event.js 新增 ai_surfaced/ai_used 事件处理 | 0.5h | 无 | 小扣子 |
| knowledge.html 添加AI功能埋点 | 0.5h | 无 | 小扣子 |
| D1 ai_events 表创建 | 0.5h | 无 | 小扣子 |
| GET /api/ai-stats 开发 | 1h | D1表 | 小扣子 |
| 验证看板 AI提及率看板集成 | 1h | /api/ai-stats | 小扣子 |
| Google Alerts 配置 | 0.5h | 无 | 小眼镜 |
| GSC数据接入 | 1h | GSC权限 | 小扣子 |

**预计总工期**：5小时（0.5天）
**截止**：2026-07-10（M1截止日）
