# 养老Graph · 小马丫采集规范 v1.0
**磐石项目 · 适用对象：小马丫（数据采集官）**
**生效日期：2026-08-10**
**需求方：小眼镜（Graph Engineer）**

---

## 一、采集范围与优先级

### 严禁采集
以下内容**绝对禁止**采集入库：
- 老人姓名、身份证号、电话号码
- 病历照片、诊断书、处方单
- 任何医疗诊断、治疗方案、用药建议
- 自媒体软文、论坛主观帖、无来源数据

### 采集优先级（Trust权重）

| 级别 | 来源 | Trust值 | 说明 |
|------|------|---------|------|
| 一级源 | 民政部全国养老服务信息平台、省市监局处罚公示、医保局长护险定点名单 | 1.0 | 必须带URL |
| 二级源 | 实地核验（拍照+GPS+时间戳） | 0.85 | 必采硬指标 |
| 三级源 | 家属访谈（仅用于老人尊严偏好、家族照护能力） | 0.4 | 需脱敏 |

### 采集顺序
1. **先拉清单**：从民政局/医保局官网批量拉长护险定点机构名单
2. **再实地**：逐一上门核验硬指标（门宽/夜班配比/适老化设施）
3. **最后访谈**：家属访谈仅用于"尊严偏好"和"家庭结构"两个字段

---

## 二、三类节点采集规格

### A. 居住节点（location）
**对应文件**：`locations_batch_*.json`

必填字段：
```json
{
  "location_id": "BJ-DCXQ-001",          // 标准地址哈希（省-市-区-街道-门牌）
  "space_type": "institution",            // home | community | institution
  "accessibility": {
    "door_width_cm": 85,                   // 实测门框宽度（厘米）
    "has_elevator": true,
    "anti_slip": true,
    "emergency_call": true
  },
  "registry_no": "BJ-MZ-20240001",        // 民政局备案号（仅机构必填）
  "ltci_qualified": true,                 // 长护险定点
  "dist_to_hospital_km": 2.3,             // 距最近三甲驾车距离
  "trust_level": 1.0,                     // 系统生成：1.0=官网, 0.85=实地
  "source_url": "https://mz.bjgov.cn/...", // 一级源必填URL
  "last_verified_at": "2026-08-10"        // 实地核验日期
}
```

**适老化硬指标（实地必拍）**：
- [ ] 门宽：实测门框宽度，拍照留存
- [ ] 电梯：有无电梯，层数
- [ ] 厕所：防滑地砖、扶手、紧急呼叫按钮（拍照）
- [ ] 资质公示：民政局备案证、消防验收文件（拍照）
- [ ] 投诉记录：近一年重大处罚（查公示栏或问院长）

### B. 老人节点（elderly）
**对应文件**：`elderly_batch_*.json`

**原则**：只采脱敏标签，不采原始病历。采集前必须获得家属签署的《敏感个人信息处理单独同意书》。

必填字段：
```json
{
  "elderly_id": "uuid-v4-hashed",         // 系统生成UUID（不可反解）
  "capability_level": "L3",               // L1-L5（GB/T 42195）
  "chronic_tags": ["高血压", "糖尿病"],    // 慢病标签（仅限标签，禁止存诊断书）
  "dignity_pref": {
    "nostalgia": 0.8,                     // 恋旧程度 0-1
    "fear_stranger": 0.6,                 // 怕生人程度 0-1
    "quiet_preference": 0.9               // 安静偏好 0-1
  },
  "medication_count": 3,                 // 用药种类数量（禁止存药名）
  "family_structure": {
    "children_local": true,               // 子女在本地
    "caregiver_available": false           // 专职照护人是否可陪
  },
  "trust_level": 0.4,                     // 三级源：家属访谈
  "last_verified_at": "2026-08-10"
}
```

### C. 服务节点（service）
**对应文件**：`services_batch_*.json`

必填字段：
```json
{
  "service_id": "SRV-BJDC-001",
  "linked_location_id": "BJ-DCXQ-001",    // 关联居住节点ID
  "staff_ratio_night": "1:4",             // 夜班护理员配比（必问）
  "pressure_sore_rate": 0.02,             // 近一年压疮发生率（小数）
  "fall_rate": 0.05,                      // 近一年跌倒发生率（小数）
  "complaint_records": [                   // 选填：脱敏投诉摘要
    "2025Q3-食品安全投诉-已整改",
    "2025Q4-服务响应超时-已处理"
  ],
  "trust_level": 0.85,                    // 实地核验
  "last_verified_at": "2026-08-10"
}
```

---

## 三、输出格式要求

文件名规范：
```
locations_batch_[批次]_[日期].json   // 居住节点
elderly_batch_[批次]_[日期].json     // 老人节点
services_batch_[批次]_[日期].json     // 服务节点
```

每批不超过200条，JSON数组格式，输出到坚果云：
```
/坚果云/风声协作/小马丫交接区/磐石/
```

---

## 四、采集禁止事项（红线）

| 禁止内容 | 处理方式 |
|----------|----------|
| 老人姓名/身份证/电话 | 发现即删除，不入库 |
| 诊断书/病历/处方照片 | 不采集，已采删除 |
| 医疗建议/治疗方案 | 不采集，已采删除 |
| 自媒体/论坛无来源数据 | 不采集，Trust=0直接废弃 |
| 家属未签授权书 | 暂停该老人节点采集 |

---

## 五、校验自检清单（交给小眼镜前必查）

采集完每一批后，小马丫自检：
- [ ] location节点：source_url是否带一级源URL
- [ ] location节点：accessibility四个字段是否全部实测
- [ ] elderly节点：chronic_tags是否只有标签（无药名/诊断）
- [ ] elderly节点：elderly_id是否为UUID（不可反解）
- [ ] service节点：staff_ratio_night是否为"1:数字"格式
- [ ] 全部节点：last_verified_at是否填写
- [ ] 全部节点：trust_level是否合理（一级1.0/实地0.85/访谈0.4）

---

**小眼镜审核点**：入库前小眼镜会跑QC校验以上全部字段，不合格打回重采。
