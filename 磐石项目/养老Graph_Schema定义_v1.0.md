# 磐石养老Graph · Schema定义 v1.0
**Graph Engineer：小眼镜**
**生效日期：2026-08-10**
**版本：v1.0.20260810**

---

## 一、磐石定位：现有Graph下的新业务领域

磐石不是另起炉灶，是在现有居住服务Graph下新增一个**养老居住服务业务分支**。

**两层分类维度**（不能混用）：

| 维度 | 分类 | 说明 |
|------|------|------|
| **内容形式**（通用） | 法规类 / 案例类 / 话术类 / 数据类 / 流程类 | 所有词条的内容载体，通用 |
| **服务领域**（业务） | 居住服务（现状）/ **养老居住服务（磐石）** | 词条所属的业务场景 |

磐石覆盖的养老词条，同时具有"内容形式"标签和"养老"领域标签。例如：
- 养老领域的法规 → "法规类" + "养老领域"
- 养老场景话术 → "话术类" + "养老领域"

---

## 二、三类节点（Node）

### 1. 居住节点（location）
```json
{
  "node_type": "location",
  "location_id": "BJ-DCXQ-001",
  "space_type": "institution",           // home | community | institution
  "accessibility": {
    "door_width_cm": 85,
    "has_elevator": true,
    "anti_slip": true,
    "emergency_call": true
  },
  "registry_no": "BJ-MZ-20240001",       // 民政局备案号（仅institution）
  "ltci_qualified": true,                // 长护险定点
  "dist_to_hospital_km": 2.3,
  "trust_level": 1.0,                    // 0.0-1.0，系统计算
  "source_url": "https://mz.bjgov.cn/...",
  "last_verified_at": "2026-08-10"
}
```

### 2. 老人节点（elderly）
```json
{
  "node_type": "elderly",
  "elderly_id": "uuid-v4-hashed",
  "capability_level": "L3",              // L1(完全自理)-L5(完全失能)
  "chronic_tags": ["高血压", "糖尿病"],
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
  "trust_level": 0.4,
  "last_verified_at": "2026-08-10"
}
```

### 3. 服务节点（service）
```json
{
  "node_type": "service",
  "service_id": "SRV-BJDC-001",
  "linked_location_id": "BJ-DCXQ-001",
  "staff_ratio_night": "1:4",
  "pressure_sore_rate": 0.02,
  "fall_rate": 0.05,
  "complaint_records": [],
  "trust_level": 0.85,
  "last_verified_at": "2026-08-10"
}
```

---

## 二、四类核心边（Edge）

| 边类型 | 格式 | 权重规则 |
|--------|------|----------|
| ADAPT_TO | (elderly)-[ADAPT_TO]->(location) | accessibility<0.7时权重=0（否决） |
| DIGNITY_MATCH | (elderly)-[DIGNITY_MATCH]->(location) | nostalgia高+dist近→权重高 |
| SAFETY_SUPPORT | (service)-[SAFETY_SUPPORT]->(elderly) | staff_ratio优(1:4>1:10)+fall_rate低→权重高 |
| TIME_EVOLVE | (elderly)-[TIME_EVOLVE]->(elderly_new) | 记录L3→L4转移概率 |

### 权重配置（推理时固定）
```
Dignity（尊严）:  40%
Safety（安全）:   30%
Cost（成本）:     20%
Convenience（便利）: 10%
```

---

## 三、医疗防火墙（强制）

**禁止节点**：任何含 diagnosis / treatment / prescription 的节点 → 不入库

**禁止边**：`(elderly)-[SUGGEST_TREATMENT]->(xxx)` → 不建

**trust_level < 0.8 的边**：不参与核心排序，仅作参考

---

## 四、多形态输出规范

Graph底层数据不变，渲染层按需输出：

| 调用方需求 | 输出方式 |
|-----------|---------|
| 表格 | CSV/Excel，直接从Graph API拉数据 |
| PDF | 模板填充（声明+事实+决策+风险+校准） |
| PPT | 结构化数据+演示模板（政务汇报风格） |
| 话术 | Graph推理链+话术Skill组合输出 |
| API | JSON + Graph推理引擎响应 |

**输出报告必含区块**：
1. 声明：本报告仅涉及适老居住匹配，不构成医疗诊断
2. 核心事实：来源URL+检索日期
3. 决策逻辑：权重计算过程
4. 风险提示：急救预案/夜间响应等
5. 校准标记：服务者ID+时间

---

## 五、迭代机制

- **版本号**：v1.0.20260810
- **回滚触发**：权重逻辑导致大面积错判 → 回滚至上一版本
- **case_replay**：服务者录入回访结果 → 自动生成反向边 → 调整权重
- **僵尸清理**：trust_level < 0.5 的节点每月清洗一次
