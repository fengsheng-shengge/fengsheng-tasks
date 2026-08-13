# 风声·磐石养老Graph · API接口规范 v1.0
**面向对象：小豆子 / 小扣子（调用方）**
**Graph Engineer：小眼镜**
**版本：v1.1.20260813（修正：加风声·前缀）**
**审核状态：根据小酒窝儿2026-08-13打回意见修正**

---

## 一、API设计原则

- **同一底层，多视图输出**：底层是同一Graph，通过参数控制输出角色
- **医疗防火墙内置**：diagnosis/treatment/prescription 相关内容自动过滤
- **边类型筛选**：通过 `edge_filter` 参数按类型精准调用

---

## 二、节点查询接口

### 2.1 查询居住节点（location）

```
GET /v1/locations
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `space_type` | string | 否 | institution / community / home |
| `ltci_qualified` | bool | 否 | 长护险定点筛选 |
| `max_dist_hospital` | float | 否 | 距三甲最大距离（km） |
| `trust_level_min` | float | 否 | 最低可信度（默认0.8参与排序） |
| `tags` | string[] | 否 | scene_tags筛选，如 `["养老机构","长护险定点"]` |
| `visibility` | string | 否 | consumer / service_provider（默认全开） |
| `limit` | int | 否 | 默认20条 |
| `offset` | int | 否 | 分页偏移 |

**示例响应：**
```json
{
  "total": 200,
  "data": [
    {
      "location_id": "BJ-DCXQ-001",
      "space_type": "institution",
      "accessibility": {
        "door_width_cm": 85,
        "has_elevator": true,
        "anti_slip": true,
        "emergency_call": true
      },
      "ltci_qualified": true,
      "dist_to_hospital_km": 2.3,
      "trust_level": 1.0,
      "source_url": "https://mz.bjgov.cn/..."
    }
  ]
}
```

---

### 2.2 查询老人档案（elderly）

```
GET /v1/elderly
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `capability_level` | string | 否 | L1 / L2 / L3 / L4 / L5 |
| `chronic_tags` | string[] | 否 | 慢病标签筛选 |
| `visibility` | string | 否 | 仅 service_provider 可见（consumer=false） |
| `limit` | int | 否 | 默认20条 |

**示例响应：**
```json
{
  "data": [
    {
      "elderly_id": "uuid-v4-hashed",
      "capability_level": "L3",
      "chronic_tags": ["高血压"],
      "dignity_pref": {
        "nostalgia": 0.8,
        "fear_stranger": 0.6,
        "quiet_preference": 0.9
      },
      "medication_count": 3,
      "family_structure": {
        "children_local": true,
        "caregiver_available": false
      },
      "trust_level": 0.4
    }
  ]
}
```

**注意**：`elderly` 节点 `visibility.consumer = false`，默认不向消费者输出。

---

### 2.3 查询服务节点（service）

```
GET /v1/services
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `linked_location_id` | string | 否 | 关联居住节点ID |
| `staff_ratio_night` | string | 否 | 夜班配比，如 "1:4" |
| `max_fall_rate` | float | 否 | 跌倒率上限 |
| `visibility` | string | 否 | consumer / service_provider |
| `limit` | int | 否 | 默认20条 |

---

## 三、边查询接口（推理核心）

### 3.1 适配推理

```
GET /v1/inference/adapt
```

**功能**：查询某老人与哪些居住点适配，按权重排序。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `elderly_id` | string | 是 | 老人UUID |
| `edge_filter` | string[] | 否 | 筛选边类型，默认 [ADAPT_TO, DIGNITY_MATCH] |
| `include_safety` | bool | 否 | 是否同时查 SAFETY_SUPPORT |
| `min_weight` | float | 否 | 最小权重阈值，默认0.0 |
| `top_k` | int | 否 | 返回Top K，默认5 |

**权重计算规则（固定）：**
```
Dignity = 40%: nostalgia权重 + dist_hospital权重
Safety = 30%: staff_ratio优(1:4>1:10) + fall_rate低
Cost = 20%: 预估费用等级
Convenience = 10%: dist_hospital_km低
```

**响应示例：**
```json
{
  "elderly_id": "uuid-xxx",
  "recommendations": [
    {
      "location_id": "BJ-DCXQ-001",
      "total_score": 0.82,
      "edge_type": "ADAPT_TO",
      "breakdown": {
        "dignity": 0.38,
        "safety": 0.28,
        "cost": 0.10,
        "convenience": 0.06
      },
      "deny_reason": null,
      "deny_edges": []
    },
    {
      "location_id": "BJ-YYY-002",
      "total_score": 0.65,
      "edge_type": "DIGNITY_MATCH",
      "deny_reason": "accessibility得分=0.5 < 0.7 阈值",
      "deny_edges": ["ADAPT_TO"]
    }
  ]
}
```

---

### 3.2 状态演化推理

```
GET /v1/inference/evolve
```

**功能**：查询老人状态转移预测（L3→L4触发路径调整）

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `elderly_id` | string | 是 | 老人UUID |
| `time_horizon_months` | int | 否 | 预测时间范围，默认12 |

---

### 3.3 关系查询

```
GET /v1/edges
```

**功能**：查询任意两节点间的边关系

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from_id` | string | 是 | 起始节点ID |
| `edge_type` | string | 否 | 如 ADAPT_TO / DIGNITY_MATCH |
| `direction` | string | 否 | forward / backward / bidirectional |
| `limit` | int | 否 | 默认50条 |

---

## 四、多形态输出接口

### 4.1 决策依据报告（PDF/Word）

```
POST /v1/reports/decision
```

**功能**：生成完整的适老居住决策依据报告

**请求体：**
```json
{
  "elderly_id": "uuid-xxx",
  "report_type": "pdf",
  "include_sections": ["declaration", "facts", "logic", "risks", "calibration"],
  "calibrator_id": "服务者ID",
  "calibrator_name": "张三"
}
```

**输出**：PDF文件字节流

**报告必须包含的区块：**
1. 声明：本报告仅涉及适老居住匹配，不构成医疗诊断
2. 核心事实：来源URL + 检索日期
3. 决策逻辑：权重计算过程
4. 风险提示：急救预案 / 夜间响应
5. 校准标记：服务者ID + 校准时间

---

### 4.2 对比表格（CSV/Excel）

```
POST /v1/reports/comparison
```

**功能**：输出多个居住点的对比表格

**请求体：**
```json
{
  "location_ids": ["BJ-DCXQ-001", "BJ-YYY-002", "SH-ZJD-003"],
  "elderly_id": "uuid-xxx",
  "format": "csv",
  "include_columns": ["名称", "类型", "长护险", "距三甲", "夜班配比", "跌倒率", "综合评分"]
}
```

---

### 4.3 话术输出

```
POST /v1/scripts/generate
```

**功能**：基于Graph推理链生成服务者话术

**请求体：**
```json
{
  "scenario": "老人抗拒入住机构",
  "elderly_id": "uuid-xxx",
  "target_role": "服务者",
  "consumer_role": "老人",
  "tone": "温和坚定"
}
```

**响应：**
```json
{
  "script": "【开场】李阿姨，我知道您舍不得离开家……",
  "cited_edges": ["DIGNITY_MATCH:BJ-DCXQ-001", "SAFETY_SUPPORT:SRV-001"],
  "cited_sources": ["长护险定点机构名单（民政部2026）"],
  "medical_disclaimer": "本话术仅涉及适老居住建议，不构成医疗诊断"
}
```

---

## 五、医疗防火墙（内置拦截）

以下关键词自动触发拦截或过滤：

| 触发词 | 处理方式 |
|--------|----------|
| diagnosis / 诊断 | 整条结果不返回 |
| treatment / 治疗方案 | 整条结果不返回 |
| prescription / 用药建议 | 整条结果不返回 |
| 确诊 / 治愈率 / 根治 | 删除或改为"据官方记录" |
| 建议用药 / 推荐医师 | 改为"建议核查相关科室" |

---

## 六、调用认证

```
Authorization: Bearer <API_KEY>
```

API_KEY由小眼镜统一管理，按调用方（小豆子/小扣子/服务者App）分发。

---

## 七、版本与变更

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-08-10 | 初版 |
| v1.1 | 2026-08-10 | 新增多视图visibility过滤 + 服务对象矩阵 |

---
**接口对接联系人：小眼镜**
**Graph版本：v1.1.20260810**
