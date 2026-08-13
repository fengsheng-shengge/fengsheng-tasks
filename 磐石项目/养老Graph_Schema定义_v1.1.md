# 磐石养老Graph · Schema定义 v1.1
**Graph Engineer：小眼镜**
**生效日期：2026-08-10**
**版本：v1.1.20260810**
**状态：更新版（新增多视图架构 + 可见性字段 + 服务对象矩阵）**

---

## 一、磐石定位：现有Graph下的新业务领域

### 两层分类维度（不能混用）

| 维度 | 分类 | 说明 |
|------|------|------|
| **内容形式**（通用） | 法规 / 案例 / 话术 / 数据 / 流程 | 所有词条的内容载体，跨领域通用 |
| **服务领域**（业务） | 居住服务（现状）/ 养老居住服务（磐石） | 词条所属的业务场景 |

磐石养老词条 = 内容形式标签（如"法规"） + 养老领域标签

---

## 二、服务对象矩阵（三维）

```
大居住服务
│
├── 居住服务（现状）
│   ├── 消费者
│   │   ├── 买房客户（首套/改善/投资）
│   │   ├── 租房客户（长租/短租）
│   │   └── 业主/房东（个人/机构）
│   └── 服务者：经纪人
│
└── 养老居住服务（磐石）
    ├── 消费者
    │   ├── 老人（自主决策型）
    │   ├── 子女/家属（主要付费方，独立决策）
    │   └── 老人+家属（共同决策）
    └── 服务者
        ├── 护理员/照护员（日常执行）
        ├── 养老机构运营方（合规/管理）
        ├── 养老经纪人/顾问（匹配推荐）
        ├── 社区服务者（居家协调）
        └── 辅具/医疗供应商（产品适配）
```

**消费者细分原则**：
- 同一业务领域内，不同付费方看到不同内容
- 子女/家属在养老场景是独立决策方，不是老人的附属
- 服务者看到操作层（话术/清单/风险预案），消费者看到决策层（适配度/费用/口碑）

---

## 三、三类节点（Node）

### 1. 居住节点（location）
```json
{
  "node_type": "location",
  "location_id": "BJ-DCXQ-001",
  "space_type": "institution",
  "accessibility": {
    "door_width_cm": 85,
    "has_elevator": true,
    "anti_slip": true,
    "emergency_call": true
  },
  "registry_no": "BJ-MZ-20240001",
  "ltci_qualified": true,
  "dist_to_hospital_km": 2.3,
  "trust_level": 1.0,
  "source_url": "https://mz.bjgov.cn/...",
  "last_verified_at": "2026-08-10",
  "_visibility": {
    "consumer": true,
    "service_provider": true,
    "internal": false
  },
  "_scene_tags": ["养老机构", "失能护理", "长护险定点"]
}
```

### 2. 老人节点（elderly）
```json
{
  "node_type": "elderly",
  "elderly_id": "uuid-v4-hashed",
  "capability_level": "L3",
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
  "last_verified_at": "2026-08-10",
  "_visibility": {
    "consumer": false,
    "service_provider": true,
    "internal": true
  },
  "_scene_tags": ["L3失能", "子女在外地", "照护需求高"]
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
  "last_verified_at": "2026-08-10",
  "_visibility": {
    "consumer": true,
    "service_provider": true,
    "internal": false
  },
  "_scene_tags": ["夜班护理", "跌倒预防", "压疮管理"]
}
```

**`_visibility` 字段说明**：
| 值 | 含义 |
|----|------|
| `consumer: true` | 消费者（老人/家属/客户）可见 |
| `service_provider: true` | 服务者（护理员/经纪人/机构）可见 |
| `internal: true` | 仅内部管理层可见 |

**`_scene_tags` 字段说明**：
用于API筛选。例如：`GET /v1/locations?tags=养老机构,长护险定点`

---

## 四、四类核心边（Edge）

| 边类型 | 格式 | 权重规则 |
|--------|------|----------|
| ADAPT_TO | (elderly)-[ADAPT_TO]->(location) | accessibility<0.7时权重=0（否决） |
| DIGNITY_MATCH | (elderly)-[DIGNITY_MATCH]->(location) | nostalgia高+dist近→权重高 |
| SAFETY_SUPPORT | (service)-[SAFETY_SUPPORT]->(elderly) | staff_ratio优+fall_rate低→权重高 |
| TIME_EVOLVE | (elderly)-[TIME_EVOLVE]->(elderly_new) | 记录L3→L4转移概率 |

### 权重配置（推理时固定）
```
Dignity（尊严）:  40%
Safety（安全）:   30%
Cost（成本）:     20%
Convenience（便利）: 10%
```

---

## 五、医疗防火墙（强制）

**禁止节点**：任何含 diagnosis / treatment / prescription 的节点 → 不入库

**禁止边**：`(elderly)-[SUGGEST_TREATMENT]->(xxx)` → 不建

**trust_level < 0.8 的边**：不参与核心排序，仅作参考

---

## 六、多视图API设计（按角色输出）

### 消费者视角（老人/家属/客户）
输出：适配机构列表 / 费用对比 / 口碑评价 / 尊严偏好匹配
过滤：不含话术脚本 / 操作建议 / 内部数据

### 服务者视角（护理员/经纪人）
输出：护理清单 / 风险预案 / 话术脚本 / 签约前核查
过滤：无消费金额限制

### 内部管理视角
输出：运营数据 / 投诉趋势 / 合规校验 / 成本分析
过滤：全部可见，但不含消费者个人信息

---

## 七、多形态输出规范

| 形态 | 调用场景 | 特点 |
|------|----------|------|
| 表格（CSV/Excel） | 数据对比/导出 | API直出，无需模板 |
| PDF | 决策报告/合规存档 | 模板填充，含声明抬头 |
| PPT | 政务汇报/机构演示 | 结构化数据+政务风格 |
| 话术 | 服务者与客户沟通 | Graph推理链+话术Skill |
| 语音播报 | 老人/视力障碍用户 | 简化版话术+语音合成 |

---

## 八、迭代机制

- **版本号**：v1.1.20260810
- **复盘驱动**：服务者录入回访结果（成功/错判）→ case_replay边 → 权重调整
- **回滚触发**：权重逻辑导致大面积错判 → 回滚至上一版本
- **僵尸清理**：trust_level < 0.5 的节点每月清洗一次
