# SkillCard 架构设计文档

**日期**：2026-11-25
**状态**：设计稿 · 待实现
**版本**：v1.0

---

## 1. 设计目标

为「风声居住服务工具箱」建立**统一领域配置层 + 服务者能力聚合层**，解决当前架构的七大痛点：

| # | 当前痛点 | 本次架构解决 |
|---|---------|------------|
| A | 维度配置 6+ 页面各自硬编码 | domain-config.js 作为唯一可信数据源 |
| B | 知识库零 DECOR 域数据 | config 统一引用，为知识库补全铺路 |
| C | 能力画像数据流断裂（各环节 localStorage 各自写） | Person 对象统一聚合 + 加权公式 |
| D | 没有"服务者"核心实体 | Person 类封装所有能力读写 |
| E | "专业/共情/判断/担责"四素养散在各处 | dimensions.eth 字段内建素养映射 |
| F | 市场化匹配缺消费者视角 | V1 留接口，V1.2 迭代 Consumer Persona |
| G | 加新业务模块成本爆炸 | 在 DOMAINS 对象加一个 key 即可 |

---

## 2. 架构分层

```
┌──────────────────────────────────────────────────────────┐
│  Layer 4 · Match 市场化匹配层（V2 迭代）                  │
│  Consumer Persona ↔ SkillCard 匹配矩阵 · 场景级推荐       │
├──────────────────────────────────────────────────────────┤
│  Layer 3 · Person 能力聚合层                              │
│  Person 类 · getAbilityProfile() · submitXxx() · 快照     │
├──────────────────────────────────────────────────────────┤
│  Layer 2 · Content 内容引用层                             │
│  domain-config.js · 题库/场景/课程/知识库引用路径         │
├──────────────────────────────────────────────────────────┤
│  Layer 1 · Domain 领域定义层                              │
│  DIMENSIONS × ETHICS × ROLES × SkillCard × SOFT_DIMS     │
└──────────────────────────────────────────────────────────┘
```

**核心原则**：
- Layer 1/2 是**静态配置**（domain-config.js 一次写完不改）
- Layer 3 是**运行时对象**（Person 在 localStorage 读写）
- 所有页面只读 Layer 3 的接口，绝不直接操作 Layer 1/2 的配置
- SkillCard 自动生成（dim × eth × role 交叉矩阵），不需要手动枚举

---

## 3. Layer 1 · Domain 领域定义

### 3.1 文件位置

```
/js/domain-config.js     ← 唯一可信数据源
```

### 3.1.1 技术加载方式

现有站点是纯静态 HTML（无 bundler），所有 JS 用内联 `<script>` 块。
新架构文件使用 **ES6 module**（`export const` / `import { }`），页面通过：

```html
<script type="module" src="/js/domain-config.js"></script>
<script type="module" src="/js/person.js"></script>
```

加载。现代浏览器（Chrome/Edge/Safari/Firefox ≥ 2020）原生支持，Cloudflare Pages 直接托管无需构建。
各页面内联 script 块中用 `import { ... }` 引用时，需要在外层包一层动态导入：

```html
<script>
(async () => {
  const { getCurrentDomain, getDims } = await import('/js/domain-config.js');
  // ... 原页面逻辑改为用 import 的 API
})();
</script>
```

### 3.2 完整数据结构

```javascript
// ========== 领域元数据 ==========
export const DOMAINS = {
  TRANSACTION: {
    name: '房产交易服务',
    tagline: '从获客到复购的全链路专业服务',
    icon: '🏠',
    color: '#1a3d24',       // 绿色系
  },
  DECOR: {
    name: '全案家装服务',
    tagline: '从设计到交付的全案拎包入住',
    icon: '🛠️',
    color: '#8a5a2b',       // 棕色系
  },
  // 未来可加 PROPERTY-MGMT / COMMERCIAL / ...
};

// ========== 7 硬技能维度 ==========
// 每个维度: id, name, emoji, eth(四素养映射), weight(能力聚合权重)
export const DIMENSIONS = {
  TRANSACTION: [
    { id:'DIM-1', name:'获客触达',   emoji:'📣', eth:'profe',  weight:0.15 },
    { id:'DIM-2', name:'需求洞察',   emoji:'👁️', eth:'judge',  weight:0.15 },
    { id:'DIM-3', name:'专业方案',   emoji:'📐', eth:'profe',  weight:0.15 },
    { id:'DIM-4', name:'带看谈判',   emoji:'🤝', eth:'empathy',weight:0.15 },
    { id:'DIM-5', name:'交易履约',   emoji:'📋', eth:'resp',   weight:0.15 },
    { id:'DIM-6', name:'售后复购',   emoji:'🔄', eth:'empathy',weight:0.10 },
    { id:'DIM-7', name:'数字化协同', emoji:'🤖', eth:'profe',  weight:0.15 },
  ],
  DECOR: [
    { id:'DIM-1', name:'品牌获客',   emoji:'📣', eth:'profe',  weight:0.10 },
    { id:'DIM-2', name:'住户画像',   emoji:'👁️', eth:'judge',  weight:0.12 },
    { id:'DIM-3', name:'全案设计',   emoji:'📐', eth:'profe',  weight:0.20 },  // DECOR 核心维度
    { id:'DIM-4', name:'方案呈现',   emoji:'🎨', eth:'empathy',weight:0.12 },
    { id:'DIM-5', name:'施工交底',   emoji:'🏗️', eth:'resp',   weight:0.15 },
    { id:'DIM-6', name:'交付兑现',   emoji:'✅', eth:'resp',   weight:0.15 },
    { id:'DIM-7', name:'数字化工具', emoji:'🤖', eth:'profe',  weight:0.16 },
  ],
};

// ========== 四素养 ==========
export const ETHICS = [
  { id:'profe',   name:'专业', emoji:'🎯', color:'#1a3d24', desc:'掌握领域硬技能，循证服务而非凭经验' },
  { id:'empathy', name:'共情', emoji:'💚', color:'#2c6b3f', desc:'听懂客户没说出口的情绪和深层需求' },
  { id:'judge',   name:'判断', emoji:'⚖️', color:'#8a7040', desc:'风险识别、优先级排序、专业决策' },
  { id:'resp',    name:'担责', emoji:'🛡️', color:'#c8423f', desc:'出了问题不推诿敢兜底，信守承诺边界' },
];

// ========== 服务岗位 ==========
// primaryDims: 该岗位最核心的硬技能维度（Person 聚合时自动加权）
export const ROLES = {
  TRANSACTION: [
    { id:'R-agent',  name:'房产经纪人',   icon:'🏠', primaryDims:['DIM-1','DIM-2','DIM-3','DIM-4'] },
    { id:'R-senior', name:'高级交易主管', icon:'📋', primaryDims:['DIM-5','DIM-6','DIM-7'] },
  ],
  DECOR: [
    { id:'R-design',  name:'全案设计师', icon:'🎨', primaryDims:['DIM-3','DIM-4','DIM-2','DIM-7'] },
    { id:'R-project', name:'项目经理',   icon:'📋', primaryDims:['DIM-5','DIM-6','DIM-2','DIM-7'] },
    { id:'R-foreman', name:'工长',       icon:'🔧', primaryDims:['DIM-5','DIM-6','DIM-7'] },
    { id:'R-trades',  name:'技术工人',   icon:'⚒️', primaryDims:['DIM-5','DIM-7'] },
  ],
};

// ========== 5 软技能维度 ==========
export const SOFT_DIMS = {
  TRANSACTION: ['共情能力','判断能力','责任担当','职业素养','服务意识'],
  DECOR:       ['共情能力','判断能力','责任担当','职业素养','服务意识'],
};

// ========== SkillCard 自动生成 ==========
// 每个 SkillCard = dim × eth × role 的交叉点
// isPrimary: 该 SkillCard 是否是该岗位的核心能力
export function getSkillCards(domain) {
  const dims = DIMENSIONS[domain];
  const roles = ROLES[domain];
  return dims.flatMap(d =>
    ETHICS.map(eth =>
      roles.map(r => ({
        id: `SC-${domain}-${d.id}-${eth.id}-${r.id}`,
        dimId: d.id,    dimName: d.name,
        ethId: eth.id,  ethName: eth.name,
        roleId: r.id,   roleName: r.name,
        title: `${r.name}·${d.name}·${eth.name}`,
        isPrimary: r.primaryDims.includes(d.id),
      }))
    ).flat()
  );
}

// ========== 工具函数 ==========
export function getCurrentDomain() {
  const params = new URLSearchParams(location.search);
  return params.get('domain') || 'TRANSACTION';
}
export function getDims(domain = getCurrentDomain()) { return DIMENSIONS[domain]; }
export function getRoles(domain = getCurrentDomain()) { return ROLES[domain]; }
export function getDomainMeta(domain = getCurrentDomain()) { return DOMAINS[domain]; }
```

### 3.3 设计决策记录

| 决策 | 理由 |
|------|------|
| SkillCard 自动生成 vs 手动枚举 | 7 dims × 4 ethics × 4 roles = 最多 112 个 SkillCard，手动维护成本爆炸。自动生成 + isPrimary 标记足够 |
| DECOR 的 DIM-3 weight=0.20 | 全案设计是家装的核心能力（决定客户选哪家），权重最高 |
| DIMENSIONS.eth 内建四素养映射 | 避免单独维护维度→素养的映射表，反向聚合时自动生效 |
| 纯配置 + 纯函数（无副作用） | 可被任何页面 import，测试容易，可被 V2 后端复用 |

---

## 4. Layer 3 · Person 能力聚合层

### 4.1 文件位置

```
/js/person.js     ← 封装所有能力读写
```

### 4.2 完整 API

```javascript
import { DOMAINS, DIMENSIONS, ETHICS, ROLES, getCurrentDomain, getDims } from './domain-config.js';

const LS_KEY = 'fs_person_v2';

export class Person {
  constructor() {
    this.data = this._load();    // 兼容旧 localStorage key 的迁移逻辑
    this.domain = getCurrentDomain();
  }

  // ===== 读取接口（所有页面从此读能力数据）=====

  /**
   * 获取带权重的硬技能能力画像
   * 返回: [{ dimId, dimName, emoji, score, weightedScore, weight, ethId, ethName, breakdown:{baseline,exam,practice} }]
   */
  getAbilityProfile();

  /**
   * 获取四素养综合分（从硬技能维度反向聚合）
   * 返回: [{ id, name, emoji, color, desc, score, dims: string[] }]
   */
  getEthicsProfile();

  /**
   * 获取能力变化曲线（过去 N 次测评/考试的分差快照）
   * 返回: [{ ts, trigger, scores:{DIM-x:number}, ethics:{profe:number} }]
   */
  getGrowth();

  /**
   * 获取弱项（能力最低的 2 个维度 ID）
   */
  getWeakDims();

  /**
   * 获取角色对应的核心能力 SkillCard 列表
   */
  getPrimarySkillCards();

  // ===== 写入接口（各环节完成后调用）=====

  /** care-test 测评完成: scores = {'DIM-1': 75, 'DIM-2': 80, ...} */
  submitCareTest(scores);

  /** exam 考试完成: dimId='DIM-3', score=85 */
  submitExam(dimId, score);

  /** practice 场景完成: sceneId='decor-quote-expensive', score=90 */
  submitPractice(sceneId, score);

  // ===== 内部 =====
  _dimScore(source, dimId);     // 从各数据源读取某维度分
  _snapshot(trigger, extra);    // 自动记录能力快照
  _save(); _load(); _default(); // localStorage 操作
}
```

### 4.3 核心聚合公式

```
// 硬技能维度分
dimScore = careTest(baseline) × 0.3 + exam(best) × 0.4 + practice(avg) × 0.3
// exam 权重最高（正式认证考试）

// 加权分
weightedDimScore = dimScore × DIMENSIONS[domain].find(d=>d.id===dimId).weight

// 四素养分（反向聚合）
ethScore = avg(dimScore for all dims where dim.eth === eth.id)
```

### 4.4 透明化 breakdown

每个维度分都记录 `breakdown: { baseline, exam, practice }`，让用户看到：
- "我全案设计 85 分，其中测评基础分 72、考试认证分 90、练习平均分 88"
- 知道自己该补哪块（practice 分低 → 多练；exam 没考 → 去考）

### 4.5 自动快照

每次 submitXxx() 调用时自动记录当前完整能力画像，保留最近 30 条。
为 profile 页的"能力变化曲线"和"成长趋势图"提供数据基础。

---

## 5. 页面迁移策略

### 5.1 新增文件（2 个）

```
/js/domain-config.js    ← Layer 1+2
/js/person.js           ← Layer 3
```

### 5.2 迁移清单（按优先级）

| 优先级 | 页面 | 改动内容 | 行数估计 |
|--------|------|---------|---------|
| **P0** | care-test/index.html | DOMAIN_CONFIGS → DIMENSIONS.get()，测评完成 → person.submitCareTest() | ~30 |
| **P1** | academy/exam/index.html | HARD_NAMES → getDims().map(d=>d.name)，考试完成 → person.submitExam() | ~20 |
| **P2** | academy/profile/index.html | 画像读取 → person.getAbilityProfile()，成长 → person.getGrowth()，弱项 → person.getWeakDims() | ~40 |
| **P3** | academy/practice/index.html | 维度名 → getDims()，场景完成 → person.submitPractice() | ~15 |
| **P3** | academy/match/index.html | 维度 → getDims()，岗位 → ROLES，能力 → person.getAbilityProfile() | ~25 |
| **P3** | academy/core-courses/index.html | 维度卡片名/描述 → getDims() | ~15 |
| **P3** | home-design/index.html | DIM 维度 → getDims()，岗位 → ROLES.DECOR | ~20 |

**总计 ≈ 165 行代码改动**（纯配置/接口替换，不改页面业务逻辑）

### 5.3 数据兼容

```javascript
// person.js _load() 方法
_load() {
  const v2 = JSON.parse(localStorage.getItem(LS_KEY));
  if (v2) return v2;
  // 旧格式迁移
  const v1Care = JSON.parse(localStorage.getItem('fs_care_profile'));
  const v1Exam = JSON.parse(localStorage.getItem('fs_exam_results'));
  // ... 迁移逻辑
  return this._default();
}
```

- 迁移是**单向的**（旧数据 → 新格式）
- 新格式 key `fs_person_v2` 避免污染旧数据
- 旧数据迁移成功后可以删除旧 key

### 5.4 YAGNI 边界（不迁移的东西）

| 项目 | 理由 |
|------|------|
| entries.json 知识库 | 6143 条是独立数据源，config 只引用路径不内嵌 |
| EXAM_DB 题库内容 | 保持在各自页面或独立 JSON，config 只引用 |
| domain-switcher UI | 继续保留在各页面，逻辑不变 |
| home-design 的 stageLearnMap / POSITION_TIMELINE | 家装业务特定数据结构，不属于通用领域配置 |
| V2 Consumer Persona + MatchMatrix | V1 跑通后再迭代 |

---

## 6. V2 路线图

```
V1 · SkillCard + Person + 配置统一          ← 本次设计，3 天内落地
 │
 ├─ V1.1 · 知识库 DECOR 域补全（~66 条）    ← 按 home-design stageLearnMap 逐补
 ├─ V1.2 · Consumer Persona + 匹配矩阵      ← 市场化匹配真正落地
 ├─ V1.3 · 能力变化曲线可视化               ← profile 页加折线图
 ├─ V1.4 · Person 重考历史详情              ← profile 页点击维度看 exam attempts
 │
 └─ V2 · Cloudflare Workers 后端            ← 多设备同步 · 团队能力对比
```

---

## 7. 成功标准

架构 V1 实现完成后，以下项目必须全部成立：

- [ ] 全站维度名改动（如 DECOR 某个维度改名）只需要改 1 处（domain-config.js）
- [ ] 测评 → 考试 → 练习 全部完成后，profile 页的能力画像能自动聚合三者数据
- [ ] 加新业务模块（如 PROPERTY-MGMT）只需要在 DOMAINS/DIMENSIONS/ROLES 加配置，不改任何页面代码
- [ ] Person 对象的 `getWeakDims()` 返回真实的能力最低维度，practice 页弱项推荐准确
- [ ] 旧 localStorage key（fs_care_profile / fs_exam_results）能被自动迁移到 fs_person_v2

---

*设计完成 · 待实现*
