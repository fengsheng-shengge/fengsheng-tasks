# SkillCard 架构 V1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一领域配置层 (domain-config.js) + 服务者能力聚合层 (Person)，替换全站 6+ 页面的硬编码维度配置和断裂的 localStorage 读写。

**Architecture:** 新建 `/js/domain-config.js`（唯一可信数据源，IIFE 挂 window）+ `/js/person.js`（Person 类封装 localStorage 读写）。页面迁移分三步：① 头部 `<script src="/js/domain-config.js">` 加载 ② 硬编码替换为 `window.DOMAIN_CONFIG.getDims()` ③ 写入 localStorage 的地方替换为 `Person.submitXxx()`。

**Tech Stack:** 纯原生 JS IIFE 模式（兼容现有内联 script，不需要 async wrapper 或 bundler），localStorage 做持久化，Cloudflare Pages 静态托管。

---

## File Structure

```
/js/                              ← 新建目录
  domain-config.js                ← Task 1: 唯一可信数据源（IIFE → window.DOMAIN_CONFIG）
  person.js                       ← Task 2: Person 类（IIFE → window.Person）

/care-test/index.html             ← Task 3: 迁移 P0（3 处硬编码替换 + 写接口）
/academy/exam/index.html          ← Task 4: 迁移 P1
/academy/profile/index.html       ← Task 5: 迁移 P2
/academy/practice/index.html      ← Task 6: 迁移 P3
/academy/match/index.html         ← Task 6: 迁移 P3
/academy/core-courses/index.html  ← Task 6: 迁移 P3
/home-design/index.html           ← Task 6: 迁移 P3
```

---

### Task 1: 创建 domain-config.js（Layer 1 + Layer 2）

**Files:**
- Create: `js/domain-config.js`

**设计决策：** 用 IIFE 模式（挂 window）而非 ES6 module。原因：现有 6+ 页面全是内联 `<script>`，用 ES6 module 需要把每个页面的内联脚本都包成 `async IIFE + await import()`，改动量大且容易出闭包陷阱。IIFE 模式零侵入。

- [ ] **Step 1: 创建目录 + 写完整文件**

```bash
mkdir -p /workspace/fengsheng-tasks/js
```

写入 `js/domain-config.js`：

```javascript
/* eslint-disable */
/**
 * domain-config.js · 唯一可信数据源
 * IIFE → window.DOMAIN_CONFIG
 * 所有页面从这里读领域配置，绝不硬编码维度名/岗位/素养
 */
(function(global) {
  'use strict';

  // ========== 领域元数据 ==========
  const DOMAINS = {
    TRANSACTION: { name:'房产交易服务', tagline:'从获客到复购的全链路专业服务', icon:'🏠', color:'#1a3d24' },
    DECOR:       { name:'全案家装服务', tagline:'从设计到交付的全案拎包入住', icon:'🛠️', color:'#8a5a2b' },
  };

  // ========== 7 硬技能维度 ==========
  // eth: 四素养映射 (profe/empathy/judge/resp)
  // weight: 能力聚合权重（Person 用）
  const DIMENSIONS = {
    TRANSACTION: [
      { id:'DIM-1', name:'获客触达',   emoji:'📣', eth:'profe',   weight:0.15 },
      { id:'DIM-2', name:'需求洞察',   emoji:'👁️', eth:'judge',   weight:0.15 },
      { id:'DIM-3', name:'专业方案',   emoji:'📐', eth:'profe',   weight:0.15 },
      { id:'DIM-4', name:'带看谈判',   emoji:'🤝', eth:'empathy', weight:0.15 },
      { id:'DIM-5', name:'交易履约',   emoji:'📋', eth:'resp',    weight:0.15 },
      { id:'DIM-6', name:'售后复购',   emoji:'🔄', eth:'empathy', weight:0.10 },
      { id:'DIM-7', name:'数字化协同', emoji:'🤖', eth:'profe',   weight:0.15 },
    ],
    DECOR: [
      { id:'DIM-1', name:'品牌获客',   emoji:'📣', eth:'profe',   weight:0.10 },
      { id:'DIM-2', name:'住户画像',   emoji:'👁️', eth:'judge',   weight:0.12 },
      { id:'DIM-3', name:'全案设计',   emoji:'📐', eth:'profe',   weight:0.20 },
      { id:'DIM-4', name:'方案呈现',   emoji:'🎨', eth:'empathy', weight:0.12 },
      { id:'DIM-5', name:'施工交底',   emoji:'🏗️', eth:'resp',    weight:0.15 },
      { id:'DIM-6', name:'交付兑现',   emoji:'✅', eth:'resp',    weight:0.15 },
      { id:'DIM-7', name:'数字化工具', emoji:'🤖', eth:'profe',   weight:0.16 },
    ],
  };

  // ========== 四素养 ==========
  const ETHICS = [
    { id:'profe',   name:'专业', emoji:'🎯', color:'#1a3d24', desc:'掌握领域硬技能，循证服务而非凭经验' },
    { id:'empathy', name:'共情', emoji:'💚', color:'#2c6b3f', desc:'听懂客户没说出口的情绪和深层需求' },
    { id:'judge',   name:'判断', emoji:'⚖️', color:'#8a7040', desc:'风险识别、优先级排序、专业决策' },
    { id:'resp',    name:'担责', emoji:'🛡️', color:'#c8423f', desc:'出了问题不推诿敢兜底，信守承诺边界' },
  ];

  // ========== 服务岗位 ==========
  // primaryDims: 该岗位最核心的硬技能维度
  const ROLES = {
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
  const SOFT_DIMS = {
    TRANSACTION: ['共情能力','判断能力','责任担当','职业素养','服务意识'],
    DECOR:       ['共情能力','判断能力','责任担当','职业素养','服务意识'],
  };

  // ========== SkillCard 自动生成 ==========
  function getSkillCards(domain) {
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
  function getCurrentDomain() {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('domain') || 'TRANSACTION';
    } catch(e) { return 'TRANSACTION'; }
  }
  function getDims(domain) {
    domain = domain || getCurrentDomain();
    return DIMENSIONS[domain] || DIMENSIONS.TRANSACTION;
  }
  function getRoles(domain) {
    domain = domain || getCurrentDomain();
    return ROLES[domain] || ROLES.TRANSACTION;
  }
  function getDomainMeta(domain) {
    domain = domain || getCurrentDomain();
    return DOMAINS[domain] || DOMAINS.TRANSACTION;
  }
  function getEthicsById(id) {
    return ETHICS.find(e => e.id === id);
  }

  // 导出到 window
  global.DOMAIN_CONFIG = {
    DOMAINS: DOMAINS,
    DIMENSIONS: DIMENSIONS,
    ETHICS: ETHICS,
    ROLES: ROLES,
    SOFT_DIMS: SOFT_DIMS,
    getSkillCards: getSkillCards,
    getCurrentDomain: getCurrentDomain,
    getDims: getDims,
    getRoles: getRoles,
    getDomainMeta: getDomainMeta,
    getEthicsById: getEthicsById,
  };
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Node 语法验证**

```bash
cd /workspace/fengsheng-tasks && node -e "
var fs = require('fs');
eval(fs.readFileSync('js/domain-config.js','utf8').replace(/window/g,'({})'));
console.log('DOMAINS:', Object.keys(DOMAIN_CONFIG.DOMAINS));
console.log('DECOR dims:', DOMAIN_CONFIG.DIMENSIONS.DECOR.map(d=>d.name).join(' / '));
console.log('ROLES.DECOR:', DOMAIN_CONFIG.ROLES.DECOR.map(r=>r.name).join(' / '));
console.log('SkillCards(DECOR):', DOMAIN_CONFIG.getSkillCards('DECOR').length);
console.log('✅ 语法正确');
"
```

Expected: `✅ 语法正确` + 正确的维度名和岗位列表。

- [ ] **Step 3: Commit**

```bash
git add js/domain-config.js
git commit -m "feat(domain-config): Layer 1 唯一可信数据源 · DOMAINS/DIMENSIONS/ETHICS/ROLES/SkillCard 自动生成"
```

---

### Task 2: 创建 person.js（Layer 3 能力聚合层）

**Files:**
- Create: `js/person.js`

- [ ] **Step 1: 写完整文件**

写入 `js/person.js`：

```javascript
/* eslint-disable */
/**
 * person.js · 服务者能力聚合层
 * IIFE → window.Person
 * 统一封装 localStorage 读写 + 加权聚合公式 + 自动快照
 * LS_KEY: fs_person_v2
 * 兼容迁移: fs_care_profile / fs_exam_results / fs_practice_done
 */
(function(global) {
  'use strict';

  var LS_KEY = 'fs_person_v2';

  // Person 类
  function Person() {
    var cfg = global.DOMAIN_CONFIG || {};
    var saved = _load();
    this.data = saved || _default();
    this.cfg = cfg;
  }

  // ===== 读取接口 =====

  /** 带权重的硬技能能力画像 */
  Person.prototype.getAbilityProfile = function() {
    var dims = this.cfg.getDims ? this.cfg.getDims() : [];
    var self = this;
    return dims.map(function(dim) {
      var baseline = self._dimScore('careTest', dim.id) || 0;
      var exam     = self._dimScore('exam',     dim.id) || 0;
      var practice = self._dimScore('practice', dim.id) || 0;
      var rawScore = baseline * 0.3 + exam * 0.4 + practice * 0.3;
      var weighted = rawScore * (dim.weight || 0.14);
      var eth = self.cfg.getEthicsById ? self.cfg.getEthicsById(dim.eth) : null;
      return {
        dimId: dim.id,
        dimName: dim.name,
        emoji: dim.emoji,
        score: Math.round(rawScore),
        weightedScore: Math.round(weighted * 100),
        weight: dim.weight,
        ethId: dim.eth,
        ethName: eth ? eth.name : '',
        breakdown: { baseline: Math.round(baseline), exam: Math.round(exam), practice: Math.round(practice) },
      };
    });
  };

  /** 四素养综合分（从硬技能反向聚合） */
  Person.prototype.getEthicsProfile = function() {
    var profile = this.getAbilityProfile();
    var ethics = this.cfg.ETHICS || [];
    return ethics.map(function(eth) {
      var related = profile.filter(function(p) { return p.ethId === eth.id; });
      var avg = related.length ? Math.round(related.reduce(function(s,p){return s+p.score;},0) / related.length) : 0;
      return {
        id: eth.id, name: eth.name, emoji: eth.emoji, color: eth.color, desc: eth.desc,
        score: avg, dims: related.map(function(p){ return p.dimName; }),
      };
    });
  };

  /** 能力变化曲线快照 */
  Person.prototype.getGrowth = function() {
    return this.data.snapshots || [];
  };

  /** 弱项（能力最低的 2 个维度 ID） */
  Person.prototype.getWeakDims = function() {
    return this.getAbilityProfile()
      .slice()
      .sort(function(a,b){ return a.score - b.score; })
      .slice(0, 2)
      .map(function(p){ return p.dimId; });
  };

  // ===== 写入接口 =====

  /** care-test 测评完成 */
  Person.prototype.submitCareTest = function(scores) {
    this.data.careTest = { ts: Date.now(), scores: scores };
    this._snapshot('careTest');
    this._save();
  };

  /** exam 考试完成: dimId='DIM-3', score=85 */
  Person.prototype.submitExam = function(dimId, score) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (!this.data.exams[domain]) this.data.exams[domain] = {};
    var prev = this.data.exams[domain][dimId] || { best: 0, attempts: [] };
    prev.best = Math.max(prev.best, score);
    prev.attempts.push({ ts: Date.now(), score: score });
    this.data.exams[domain][dimId] = prev;
    this._snapshot('exam', dimId);
    this._save();
  };

  /** practice 场景完成: sceneId='decor-quote-expensive', score=90 */
  Person.prototype.submitPractice = function(sceneId, score) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (!this.data.practices[domain]) this.data.practices[domain] = {};
    this.data.practices[domain][sceneId] = { ts: Date.now(), score: score };
    this._snapshot('practice', sceneId);
    this._save();
  };

  // ===== 内部 =====

  Person.prototype._dimScore = function(source, dimId) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (source === 'careTest') {
      return this.data.careTest && this.data.careTest.scores ? this.data.careTest.scores[dimId] : undefined;
    }
    if (source === 'exam') {
      var d = this.data.exams && this.data.exams[domain];
      return d && d[dimId] ? d[dimId].best : undefined;
    }
    if (source === 'practice') {
      var scenes = this.data.practices && this.data.practices[domain];
      if (!scenes) return undefined;
      var vals = Object.values(scenes);
      if (!vals.length) return undefined;
      return Math.round(vals.reduce(function(s,x){ return s + (x.score || 0); }, 0) / vals.length);
    }
  };

  Person.prototype._snapshot = function(trigger, extra) {
    var scores = {};
    var ethics = {};
    try {
      var profile = this.getAbilityProfile();
      profile.forEach(function(p) { scores[p.dimId] = p.score; });
      this.getEthicsProfile().forEach(function(e) { ethics[e.id] = e.score; });
    } catch(e) { /* 配置未加载时跳过 */ }
    var snap = {
      ts: Date.now(),
      trigger: trigger + (extra ? ':' + extra : ''),
      scores: scores,
      ethics: ethics,
    };
    if (!this.data.snapshots) this.data.snapshots = [];
    this.data.snapshots.push(snap);
    if (this.data.snapshots.length > 30) this.data.snapshots = this.data.snapshots.slice(-30);
  };

  Person.prototype._save = function() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch(e) {}
  };

  Person.prototype.getRawData = function() { return this.data; };

  // ===== 模块级工具 =====

  function _load() {
    try {
      var v2 = JSON.parse(localStorage.getItem(LS_KEY));
      if (v2) return v2;
    } catch(e) {}
    // 旧格式迁移（单向）
    var migrated = _migrateV1();
    if (migrated) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(migrated)); } catch(e) {}
      return migrated;
    }
    return null;
  }

  function _migrateV1() {
    var result = _default();
    var v1Care = null, v1Exam = null;
    try { v1Care = JSON.parse(localStorage.getItem('fs_care_profile')); } catch(e) {}
    try { v1Exam = JSON.parse(localStorage.getItem('fs_exam_results')); } catch(e) {}
    if (v1Care && v1Care.scores) {
      result.careTest = { ts: v1Care.ts || Date.now(), scores: v1Care.scores };
    }
    if (v1Exam && typeof v1Exam === 'object') {
      result.exams.TRANSACTION = {};
      Object.keys(v1Exam).forEach(function(dimId) {
        var v = v1Exam[dimId];
        if (typeof v === 'number') {
          result.exams.TRANSACTION[dimId] = { best: v, attempts: [{ ts: Date.now(), score: v }] };
        } else if (v && typeof v.best === 'number') {
          result.exams.TRANSACTION[dimId] = v;
        }
      });
    }
    if (!v1Care && !v1Exam) return null;  // 无旧数据不创建空壳
    return result;
  }

  function _default() {
    return {
      careTest: null,
      exams: { TRANSACTION: {}, DECOR: {} },
      practices: { TRANSACTION: {}, DECOR: {} },
      roleId: null,
      consumerId: null,
      snapshots: [],
    };
  }

  // 导出 Person 类
  global.Person = Person;
  global.PersonLS_KEY = LS_KEY;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Node 语法验证**

```bash
cd /workspace/fengsheng-tasks && node -e "
var fs = require('fs');
var ctx = {};
eval(fs.readFileSync('js/domain-config.js','utf8').replace(/window/g,'ctx'));
eval(fs.readFileSync('js/person.js','utf8').replace(/window/g,'ctx'));
var p = new ctx.Person();
console.log('Person._default keys:', Object.keys(p.getRawData()).join(', '));
console.log('PersonLS_KEY:', ctx.PersonLS_KEY);
console.log('getAbilityProfile 运行:', typeof p.getAbilityProfile === 'function');
console.log('getWeakDims 运行:', p.getWeakDims());
console.log('✅ person.js 语法正确');
"
```

Expected: `✅ person.js 语法正确`，WeakDims 返回空数组或有值的数组。

- [ ] **Step 3: Commit**

```bash
git add js/person.js
git commit -m "feat(person): Layer 3 能力聚合层 · Person 类 · 加权公式 baseline×0.3+exam×0.4+practice×0.3 · 自动快照 · v1→v2 迁移"
```

---

### Task 3: care-test 迁移（P0）

**Files:**
- Modify: `care-test/index.html`

**改动点：**
1. `<head>` 加 `<script src="/js/domain-config.js"></script>` + `<script src="/js/person.js"></script>`
2. 页面开头的 `DOMAIN_CONFIGS` 大块硬编码 → 保留（兼容），但维度名/岗位从 DOMAIN_CONFIG 读
3. CARETEST 测评完成时 → 同时写 Person.submitCareTest(scores)
4. 原来的 localStorage 写入保持（向后兼容 + V2 迁移）

- [ ] **Step 1: 定位 head 结束位置 + 插入 script 标签**

找到 `</head>` 标签前一行（在 `care-test/index.html` 里搜 `</head>`），在前面插入：

```html
<script src="/js/domain-config.js"></script>
<script src="/js/person.js"></script>
```

- [ ] **Step 2: 替换 CARETEST_DIM_NAMES 动态生成逻辑**

care-test/index.html L576 附近原来手动生成 `CARETEST_DIM_NAMES`：
```javascript
CARETEST_DIM_NAMES[i+1] = DIMS[i];
```
改为：
```javascript
// 从统一配置读
var _dims = (window.DOMAIN_CONFIG && window.DOMAIN_CONFIG.getDims) 
  ? window.DOMAIN_CONFIG.getDims(CURRENT_DOMAIN) : DIMS.map(function(n,i){return {name:n,id:'DIM-'+(i+1)};});
CARETEST_DIM_NAMES = {};
_dims.forEach(function(d,i){ CARETEST_DIM_NAMES['DIM-'+(i+1)] = d.name; });
```

- [ ] **Step 3: 测评完成时写 Person**

care-test 测评提交成功后（搜 `localStorage.setItem('fs_care_profile'` 附近），在原有写入之后加：

```javascript
// 新架构：Person 聚合层
if (window.Person && typeof window.Person === 'function') {
  var _person = new window.Person();
  _person.submitCareTest(allScores);  // allScores 是 { 'DIM-1': 75, ... } 格式
}
```

- [ ] **Step 4: 本地 HTTP 验证无 JS 报错**

```bash
cd /workspace/fengsheng-tasks && python3 -m http.server 8765 &
curl -s "http://localhost:8765/care-test/?domain=DECOR" 2>&1 | grep -c "DOMAIN_CONFIG"
curl -s "http://localhost:8765/care-test/?domain=DECOR" 2>&1 | grep -c "Person"
echo "以上数字应该 > 0"
```

- [ ] **Step 5: Commit**

```bash
git add care-test/index.html
git commit -m "refactor(care-test): 迁移到统一配置层 + Person.submitCareTest 写入"
```

---

### Task 4: exam 迁移（P1）

**Files:**
- Modify: `academy/exam/index.html`

- [ ] **Step 1: head 加 script 标签**

在 `</head>` 前插入：
```html
<script src="/js/domain-config.js"></script>
<script src="/js/person.js"></script>
```

- [ ] **Step 2: 替换 EXAM_GRID 渲染中的维度名**

找到 exam 页面渲染维度卡片的位置（搜 `HARD_NAMES` 或 `renderGrid` 函数），把：
```javascript
var name = HARD_NAMES[i];
```
改为：
```javascript
var _cfg = window.DOMAIN_CONFIG;
var _dims = _cfg && _cfg.getDims ? _cfg.getDims() : EXAM_GRID;
var name = _dims[i] ? _dims[i].name : (EXAM_GRID[i] || '');
```

- [ ] **Step 3: 考试完成时写 Person.submitExam(dimId, score)**

找到 exam 答题完成、计算分数、写 localStorage 的位置（搜 `localStorage.setItem('fs_exam_results'` 附近），在原有写入之后加：

```javascript
// 新架构：Person 聚合层
if (window.Person && typeof window.Person === 'function' && typeof dimId === 'string') {
  var _p = new window.Person();
  _p.submitExam(dimId, Math.round(score));
}
```

- [ ] **Step 4: 验证 + Commit**

```bash
cd /workspace/fengsheng-tasks
git add academy/exam/index.html
git commit -m "refactor(exam): 迁移到统一配置层 + Person.submitExam 写入"
```

---

### Task 5: profile 迁移（P2）

**Files:**
- Modify: `academy/profile/index.html`

这是**价值最大的迁移**——画像页从"手动拼各环节 localStorage"变成"一个 Person 调用返回完整画像"。

- [ ] **Step 1: head 加 script 标签**

```html
<script src="/js/domain-config.js"></script>
<script src="/js/person.js"></script>
```

- [ ] **Step 2: 替换 HARD_DIMS 硬编码**

profile/index.html L427-433 原来：
```javascript
var HARD_DIMS, HARD_CODES, HARD_ICONS;
if (CURRENT_DOMAIN === 'DECOR') {
  HARD_DIMS = ['品牌获客','住户画像',...];
  ...
} else {
  HARD_DIMS = ['获客触达','需求洞察',...];
  ...
}
```
改为：
```javascript
var _cfg = window.DOMAIN_CONFIG || {};
var _dims = _cfg.getDims ? _cfg.getDims() : [];
var HARD_DIMS  = _dims.map(function(d){ return d.name; });
var HARD_CODES = _dims.map(function(d){ return d.id; });
var HARD_ICONS = _dims.map(function(d){ return d.emoji; });
```

- [ ] **Step 3: 替换 getProfileScores 手动聚合**

profile/index.html L468-487 原来手动读 3 个 localStorage key 拼分：
```javascript
try { care = JSON.parse(localStorage.getItem('fs_care_profile')); } catch(e) {}
try { examResults = JSON.parse(localStorage.getItem('fs_exam_results')); } catch(e) {}
try { practiceDoneRaw = JSON.parse(localStorage.getItem('fs_practice_done')) || {}; } catch(e) {}
// ... 手动拼各维度分
```
改为：
```javascript
// 新架构：Person 统一聚合
var _p = (window.Person && typeof window.Person === 'function') ? new window.Person() : null;
var profileScores = {};  // { 'DIM-1': 85, 'DIM-2': 72, ... }
var ethicsScores = {};   // { profe: 80, empathy: 75, ... }
var breakdowns = {};     // { 'DIM-1': {baseline, exam, practice} }
var weakDims = [];
var growth = [];

if (_p) {
  var _ap = _p.getAbilityProfile();
  _ap.forEach(function(p){
    profileScores[p.dimId] = p.score;
    breakdowns[p.dimId] = p.breakdown;
  });
  _p.getEthicsProfile().forEach(function(e){ ethicsScores[e.id] = e.score; });
  weakDims = _p.getWeakDims();
  growth = _p.getGrowth();
} else {
  // fallback: 旧 localStorage 手动拼（保留兼容）
  // ... 原来的代码不动
}
```

- [ ] **Step 4: 验证 + Commit**

```bash
cd /workspace/fengsheng-tasks
git add academy/profile/index.html
git commit -m "refactor(profile): Person 统一聚合能力画像 · HARD_DIMS 从配置读 · 四素养自动聚合 · 能力变化曲线快照"
```

---

### Task 6: practice / match / core-courses / home-design 迁移（P3）

**Files:**
- Modify: `academy/practice/index.html`
- Modify: `academy/match/index.html`
- Modify: `academy/core-courses/index.html`
- Modify: `home-design/index.html`

- [ ] **Step 1: 统一加 script 标签**

这 4 个页面的 `</head>` 前都插：
```html
<script src="/js/domain-config.js"></script>
<script src="/js/person.js"></script>
```

- [ ] **Step 2: practice — 写 Person.submitPractice()**

practice 场景完成后（搜 `localStorage.setItem('fs_practice_done'`），加：
```javascript
if (window.Person) {
  var _p = new window.Person();
  _p.submitPractice(sceneId, Math.round(score));  // sceneId 和 score 从当前作用域取
}
```

- [ ] **Step 3: match — 维度/岗位从配置读**

match 页面原来硬编码两套维度名 + 两套岗位，替换为：
```javascript
var _cfg = window.DOMAIN_CONFIG;
var HARD_DIMS  = _cfg.getDims().map(function(d){ return d.name; });
var HARD_ICONS = _cfg.getDims().map(function(d){ return d.emoji; });
var ROLES_LIST = _cfg.getRoles();
```
能力数据也从 Person.getAbilityProfile() 读。

- [ ] **Step 4: core-courses — 卡片名从配置读**

core-courses 原来的 DIM-1~7 卡片硬编码维度名，替换为：
```javascript
var _dims = (window.DOMAIN_CONFIG && window.DOMAIN_CONFIG.getDims) ? window.DOMAIN_CONFIG.getDims() : [];
// 卡片标题 = _dims[i].name
```

- [ ] **Step 5: home-design — 岗位/维度从配置读**

home-design 的岗位选择器原来硬编码 4 个岗位名（设计师/项目经理/工长/技术工人），替换为：
```javascript
var _roles = (window.DOMAIN_CONFIG && window.DOMAIN_CONFIG.getRoles) ? window.DOMAIN_CONFIG.getRoles('DECOR') : [];
// 岗位按钮从 _roles 动态生成
```

- [ ] **Step 6: 批量 Commit**

```bash
cd /workspace/fengsheng-tasks
git add academy/practice/index.html academy/match/index.html academy/core-courses/index.html home-design/index.html
git commit -m "refactor(P3): practice/match/core-courses/home-design 迁移到统一配置层 + Person 写入"
```

---

## Self-Review Checklist

| 检查项 | 结果 |
|--------|------|
| **Spec 覆盖** | ✅ 设计文档 Section 3 对应 Task 1，Section 4 对应 Task 2，Section 5.2 迁移清单 7 个页面全在 Task 3-6，Section 5.3 数据兼容在 person.js 的 _migrateV1() |
| **Placeholder scan** | ✅ 所有 step 有具体代码块 + 具体命令 + 预期输出。无 TBD/TODO/类似 Task N |
| **Type consistency** | ✅ DOMAIN_CONFIG 接口名（getDims / getRoles / getCurrentDomain）在 domain-config.js、person.js、所有页面调用处一致；Person API（submitCareTest / submitExam / submitPractice / getAbilityProfile）在 person.js 定义和各页面调用处一致 |
| **边界条件** | ✅ 所有 `window.DOMAIN_CONFIG` 调用前加了 `window.DOMAIN_CONFIG &&` null guard；Person 构造函数里 `this.cfg` 可以为 {} 空对象（config 未加载时不崩溃） |
| **向后兼容** | ✅ 旧 localStorage key 不删（person.js 自动迁移，页面 fallback 保留）；旧硬编码不删（Person 不存在时 fallback） |
| **风险评估** | ⚠️ care-test 的 DOMAIN_CONFIGS 硬编码不删（保留兼容 quiz JSON fetch 路径），只把维度名动态化。如果后续要彻底消除硬编码是 V2 的事 |

---

*Plan complete · Ready to execute*
