# 全站角色引导重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将风声网站首页从"功能平铺"改造为"角色引导 + 场景导航"结构，新增经纪人/管理者/新用户三种模式，全站统一导航和引导

**Architecture:** 角色状态通过 `localStorage` 持久化，首页通过 `display` 切换三个内容块；导航栏居中增加面包屑，子页面顶部注入引导横幅（可关闭）。所有状态前端存储，不依赖后端。

**Tech Stack:** HTML/CSS/JS（vanilla），无框架依赖

---

### Task 1: 角色切换器 + 经纪人模式首页

**Files:**
- Modify: `index.html` — 重构整个首页

- [ ] **Step 1: 在首页顶部加入角色切换器 HTML**

在 `<header>` 区域（约第42行 hero 区之前）插入角色切换器：

```html
<div class="role-switcher" id="roleSwitcher">
  <button class="role-btn active" data-role="agent" onclick="switchRole('agent')">
    <span class="role-icon">🤝</span>
    <span class="role-label">我是经纪人</span>
  </button>
  <button class="role-btn" data-role="manager" onclick="switchRole('manager')">
    <span class="role-icon">📊</span>
    <span class="role-label">我是管理者</span>
  </button>
  <button class="role-btn" data-role="newbie" onclick="switchRole('newbie')">
    <span class="role-icon">🌱</span>
    <span class="role-label">我是新用户</span>
  </button>
</div>
```

- [ ] **Step 2: 添加角色切换器 CSS**

```css
/* ===== 角色切换器 ===== */
.role-switcher{display:flex;gap:8px;justify-content:center;padding:16px 8% 8px;flex-wrap:wrap}
.role-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:12px;border:2px solid var(--border);background:var(--card);font-size:14px;font-weight:700;color:var(--ts);cursor:pointer;transition:all .25s;font-family:inherit;-webkit-tap-highlight-color:transparent}
.role-btn:hover{border-color:var(--brand);color:var(--brand);background:rgba(44,95,58,.04)}
.role-btn.active{background:var(--brand);color:#fff;border-color:var(--brand);box-shadow:0 3px 12px rgba(44,95,58,.2)}
.role-btn.active:hover{background:var(--brand-light);border-color:var(--brand-light)}
.role-icon{font-size:18px;line-height:1}
.role-label{font-size:13px;letter-spacing:.5px}
```

- [ ] **Step 3: 添加角色内容块结构**

在 hero 区之后、stats 区之前，插入三个角色内容块，初始只显示 `agent` 块：

```html
<!-- 经纪人模式内容 -->
<div class="role-content active" id="roleAgent">
  <div class="scene-section">
    <div class="scene-card" onclick="location.href='/curation/'">
      <div class="scene-icon">🏠</div>
      <div class="scene-body">
        <div class="scene-title">遇到一个买房/卖房客户</div>
        <div class="scene-desc">策展引擎 → 生成全生命周期报告</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="location.href='/knowledge/'">
      <div class="scene-icon">📚</div>
      <div class="scene-body">
        <div class="scene-title">想提升专业能力</div>
        <div class="scene-desc">知识库 → 学习词条 → 品质测评</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="document.querySelector('.chat-fab')?.click()">
      <div class="scene-icon">💬</div>
      <div class="scene-body">
        <div class="scene-title">需要回复客户一个问题</div>
        <div class="scene-desc">AI对话 → 直接提问</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="location.href='/clients/'">
      <div class="scene-icon">📋</div>
      <div class="scene-body">
        <div class="scene-title">管理我的客户</div>
        <div class="scene-desc">客户档案 → 查看/编辑客户信息</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
  </div>
  
  <!-- 快速工具箱 -->
  <div class="toolbox-section">
    <div class="toolbox-header">
      <span class="toolbox-title">📦 全部工具</span>
      <span class="toolbox-hint">点击进入对应功能</span>
    </div>
    <div class="toolbox-grid">
      <a href="/knowledge/" class="toolbox-item"><span class="tbi-icon">📖</span><span class="tbi-name">知识库</span><span class="tbi-desc">5,942 条专业词条</span></a>
      <a href="/curation/" class="toolbox-item"><span class="tbi-icon">📋</span><span class="tbi-name">策展引擎</span><span class="tbi-desc">全生命周期报告</span></a>
      <a href="/care-test/" class="toolbox-item"><span class="tbi-icon">🔍</span><span class="tbi-name">品质测评</span><span class="tbi-desc">六维品质评估</span></a>
      <a href="/clients/" class="toolbox-item"><span class="tbi-icon">👥</span><span class="tbi-name">客户管理</span><span class="tbi-desc">客户档案管理</span></a>
      <a href="/dictionary/" class="toolbox-item"><span class="tbi-icon">📕</span><span class="tbi-name">词典</span><span class="tbi-desc">专业术语查询</span></a>
      <a href="/decoder/" class="toolbox-item"><span class="tbi-icon">🔓</span><span class="tbi-name">解码器</span><span class="tbi-desc">场景解码分析</span></a>
      <a href="/scene/" class="toolbox-item"><span class="tbi-icon">🎯</span><span class="tbi-name">场景</span><span class="tbi-desc">34 个服务场景</span></a>
      <a href="/search/" class="toolbox-item"><span class="tbi-icon">🔎</span><span class="tbi-name">搜索</span><span class="tbi-desc">全局搜索</span></a>
      <a href="/mentor/" class="toolbox-item"><span class="tbi-icon">🧑‍🏫</span><span class="tbi-name">导师</span><span class="tbi-desc">AI 导师指导</span></a>
      <a href="/showing-report/" class="toolbox-item"><span class="tbi-icon">📊</span><span class="tbi-name">带看报告</span><span class="tbi-desc">带看数据报告</span></a>
      <a href="/breeder/" class="toolbox-item"><span class="tbi-icon">🌱</span><span class="tbi-name">培育</span><span class="tbi-desc">能力成长计划</span></a>
      <a href="/favorites/" class="toolbox-item"><span class="tbi-icon">⭐</span><span class="tbi-name">收藏</span><span class="tbi-desc">我的收藏</span></a>
    </div>
  </div>
</div>

<!-- 管理者模式内容 -->
<div class="role-content" id="roleManager" style="display:none">
  <div class="scene-section">
    <div class="scene-card" onclick="location.href='/dashboard/'">
      <div class="scene-icon">📊</div>
      <div class="scene-body">
        <div class="scene-title">查看团队整体数据</div>
        <div class="scene-desc">管理看板 → 考核指标 → 产出日志</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="location.href='/assessment/'">
      <div class="scene-icon">🏅</div>
      <div class="scene-body">
        <div class="scene-title">查看数字员工考核</div>
        <div class="scene-desc">五把尺子 → 评分详情 → 排名</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="location.href='/okr/'">
      <div class="scene-icon">🎯</div>
      <div class="scene-body">
        <div class="scene-title">管理 OKR 与目标</div>
        <div class="scene-desc">OKR → 目标对齐 → 进度追踪</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
    <div class="scene-card" onclick="location.href='/agent-academy/'">
      <div class="scene-icon">🧠</div>
      <div class="scene-body">
        <div class="scene-title">智能体学院</div>
        <div class="scene-desc">学习 → 培训 → 能力提升</div>
      </div>
      <div class="scene-arrow">→</div>
    </div>
  </div>
  
  <div class="toolbox-section">
    <div class="toolbox-header">
      <span class="toolbox-title">📦 管理工具</span>
      <span class="toolbox-hint">点击进入对应功能</span>
    </div>
    <div class="toolbox-grid">
      <a href="/dashboard/" class="toolbox-item"><span class="tbi-icon">📊</span><span class="tbi-name">管理看板</span><span class="tbi-desc">团队数据总览</span></a>
      <a href="/assessment/" class="toolbox-item"><span class="tbi-icon">🏅</span><span class="tbi-name">数字员工考核</span><span class="tbi-desc">五把尺子评分</span></a>
      <a href="/okr/" class="toolbox-item"><span class="tbi-icon">🎯</span><span class="tbi-name">OKR</span><span class="tbi-desc">目标管理</span></a>
      <a href="/agent-academy/" class="toolbox-item"><span class="tbi-icon">🧠</span><span class="tbi-name">智能体学院</span><span class="tbi-desc">AI 培训</span></a>
      <a href="/agreement" class="toolbox-item"><span class="tbi-icon">📝</span><span class="tbi-name">协议</span><span class="tbi-desc">协议文档</span></a>
      <a href="/ip-design/" class="toolbox-item"><span class="tbi-icon">🎨</span><span class="tbi-name">IP设计</span><span class="tbi-desc">品牌IP设计</span></a>
      <a href="/about/" class="toolbox-item"><span class="tbi-icon">ℹ️</span><span class="tbi-name">关于</span><span class="tbi-desc">关于风声</span></a>
    </div>
  </div>
</div>

<!-- 新用户模式内容 -->
<div class="role-content" id="roleNewbie" style="display:none">
  <div class="newbie-section">
    <div class="newbie-header">
      <div class="newbie-title">🌱 新手引导三步走</div>
      <div class="newbie-progress">整体进度: <span id="newbieProgressBar">●○○○○</span> <span id="newbieProgressText">20%</span></div>
    </div>
    <div class="newbie-steps">
      <div class="newbie-step" id="step1">
        <div class="step-status" id="step1Status">□</div>
        <div class="step-body">
          <div class="step-title">完成品质测评</div>
          <div class="step-desc">了解自己的专业水平，看看哪些地方需要提升</div>
          <div class="step-action"><a href="/care-test/" class="step-btn">开始测评 →</a></div>
        </div>
      </div>
      <div class="newbie-step" id="step2">
        <div class="step-status" id="step2Status">□</div>
        <div class="step-body">
          <div class="step-title">浏览知识库</div>
          <div class="step-desc">了解基础知识体系，找到你感兴趣的领域</div>
          <div class="step-action"><a href="/knowledge/" class="step-btn">浏览知识库 →</a></div>
        </div>
      </div>
      <div class="newbie-step" id="step3">
        <div class="step-status" id="step3Status">□</div>
        <div class="step-body">
          <div class="step-title">尝试策展引擎</div>
          <div class="step-desc">给一个客户生成全生命周期报告，看实际效果</div>
          <div class="step-action"><a href="/curation/" class="step-btn">尝试策展 →</a></div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="newbie-recommend">
    <div class="toolbox-header">
      <span class="toolbox-title">💡 推荐了解</span>
    </div>
    <div class="toolbox-grid">
      <a href="/care-test/" class="toolbox-item"><span class="tbi-icon">🔍</span><span class="tbi-name">品质测评</span><span class="tbi-desc">了解你的专业水平</span></a>
      <a href="/knowledge/" class="toolbox-item"><span class="tbi-icon">📖</span><span class="tbi-name">知识库</span><span class="tbi-desc">学习基础知识</span></a>
      <a href="/curation/" class="toolbox-item"><span class="tbi-icon">📋</span><span class="tbi-name">策展引擎</span><span class="tbi-desc">生成客户报告</span></a>
    </div>
  </div>
</div>
```

- [ ] **Step 4: 添加场景卡片和新手引导 CSS**

```css
/* ===== 场景卡片 ===== */
.scene-section{padding:10px 0 6px}
.scene-card{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:10px;cursor:pointer;transition:all .25s;text-decoration:none;color:inherit;max-width:560px;margin-left:auto;margin-right:auto;-webkit-tap-highlight-color:transparent}
.scene-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(60,50,40,.10);border-color:var(--border-h)}
.scene-card:active{transform:scale(.98)}
.scene-icon{width:44px;height:44px;border-radius:12px;background:var(--p-bg);display:grid;place-items:center;font-size:22px;flex-shrink:0}
.scene-body{flex:1;min-width:0}
.scene-title{font-size:15px;font-weight:800;color:var(--dk);margin-bottom:2px}
.scene-desc{font-size:12px;color:var(--ts)}
.scene-arrow{font-size:16px;color:var(--td);flex-shrink:0;transition:transform .2s}
.scene-card:hover .scene-arrow{transform:translateX(4px);color:var(--brand)}

/* ===== 快速工具箱 ===== */
.toolbox-section{padding:14px 0 10px;max-width:560px;margin:0 auto}
.toolbox-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px}
.toolbox-title{font-size:14px;font-weight:800;color:var(--dk)}
.toolbox-hint{font-size:11px;color:var(--td)}
.toolbox-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.toolbox-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:12px;border:1px solid var(--border);background:var(--card);text-decoration:none;color:inherit;transition:all .2s;text-align:center}
.toolbox-item:hover{transform:translateY(-2px);box-shadow:0 3px 12px rgba(60,50,40,.08);border-color:var(--border-h)}
.toolbox-item:active{transform:scale(.96)}
.tbi-icon{font-size:20px;line-height:1}
.tbi-name{font-size:11px;font-weight:700;color:var(--dk)}
.tbi-desc{font-size:9px;color:var(--td);line-height:1.3}

/* ===== 新手引导 ===== */
.newbie-section{max-width:560px;margin:0 auto;padding:10px 0}
.newbie-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:0 4px;flex-wrap:wrap;gap:6px}
.newbie-title{font-size:16px;font-weight:800;color:var(--dk)}
.newbie-progress{font-size:12px;color:var(--ts)}
#newbieProgressBar{letter-spacing:2px;font-size:14px}
.newbie-steps{display:flex;flex-direction:column;gap:10px}
.newbie-step{display:flex;align-items:flex-start;gap:12px;padding:16px 18px;background:var(--card);border:1px solid var(--border);border-radius:14px;transition:all .2s}
.newbie-step.done{background:rgba(44,95,58,.04);border-color:rgba(44,95,58,.15)}
.newbie-step.done .step-status{color:var(--brand)}
.newbie-step.done .step-title{color:var(--brand)}
.step-status{font-size:20px;font-weight:700;color:var(--td);line-height:1;flex-shrink:0;margin-top:2px}
.step-body{flex:1;min-width:0}
.step-title{font-size:15px;font-weight:800;color:var(--dk);margin-bottom:3px}
.step-desc{font-size:12px;color:var(--ts);margin-bottom:6px}
.step-btn{display:inline-block;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;background:var(--brand);color:#fff;text-decoration:none;transition:all .2s}
.step-btn:hover{background:var(--brand-light);transform:translateY(-1px)}
.newbie-recommend{max-width:560px;margin:10px auto 0}
```

- [ ] **Step 5: 添加角色切换 JS 逻辑**

在首页底部 `</body>` 前、`tracker.js` 后插入：

```html
<script>
// 角色切换逻辑
(function() {
  var ROLE_KEY = 'fs_role';
  var NEWBIE_KEY = 'fs_newbie_progress';
  
  // 默认角色
  var savedRole = localStorage.getItem(ROLE_KEY) || 'agent';
  
  function switchRole(role) {
    // 更新按钮状态
    document.querySelectorAll('.role-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.role === role);
    });
    // 切换内容块
    document.querySelectorAll('.role-content').forEach(function(el) {
      el.style.display = 'none';
    });
    var target = document.getElementById('role' + role.charAt(0).toUpperCase() + role.slice(1));
    if (target) target.style.display = 'block';
    // 保存
    localStorage.setItem(ROLE_KEY, role);
  }
  
  window.switchRole = switchRole;
  
  // 初始化
  switchRole(savedRole);
  
  // 新用户进度（通过 localStorage 标记已完成的任务）
  // 用户访问过care-test → 标记step1完成，以此类推
  var visited = {};
  try { visited = JSON.parse(localStorage.getItem(NEWBIE_KEY) || '{}'); } catch(e) {}
  
  function checkNewbieProgress() {
    var steps = ['care-test', 'knowledge', 'curation'];
    var paths = ['/care-test/', '/knowledge/', '/curation/'];
    paths.forEach(function(path, i) {
      if (document.referrer && document.referrer.includes(path)) {
        visited['step' + (i+1)] = true;
      }
    });
    // 兼容：当前页面即完成
    var currentPath = window.location.pathname;
    paths.forEach(function(path, i) {
      if (currentPath.startsWith(path) || currentPath === path.replace(/\/$/, '')) {
        visited['step' + (i+1)] = true;
      }
    });
    localStorage.setItem(NEWBIE_KEY, JSON.stringify(visited));
    
    // 更新UI
    for (var i = 1; i <= 3; i++) {
      var stepEl = document.getElementById('step' + i);
      var statusEl = document.getElementById('step' + i + 'Status');
      if (stepEl && visited['step' + i]) {
        stepEl.classList.add('done');
        if (statusEl) statusEl.textContent = '✓';
      }
    }
    
    // 计算进度
    var done = 0;
    for (var i = 1; i <= 3; i++) { if (visited['step' + i]) done++; }
    var pct = Math.round(done / 3 * 100);
    var bar = ['●','●','●','●','●'];
    var filled = Math.round(done / 3 * 5);
    for (var i = 0; i < 5; i++) { bar[i] = i < filled ? '●' : '○'; }
    var barEl = document.getElementById('newbieProgressBar');
    var textEl = document.getElementById('newbieProgressText');
    if (barEl) barEl.textContent = bar.join('');
    if (textEl) textEl.textContent = pct + '%';
  }
  
  checkNewbieProgress();
})();
</script>
```

- [ ] **Step 6: 简化原首页内容**

保留 Hero 区品牌介绍（精简），移除原有 2x2 核心网格、场景选择器、产品工具网格等冗余模块，用新角色内容块替代。保留统计概览区、每日知识模块、AI 聊天按钮。

- [ ] **Step 7: 验证**

打开浏览器访问首页，确认：
- 角色切换器显示正常，默认选中"经纪人"
- 点击"管理者"和"新用户"，内容块切换
- 场景卡片点击跳转正常
- 工具箱链接跳转正常
- 新用户进度追踪正常

---

### Task 2: 导航栏改造 — 面包屑 + 角色快捷入口

**Files:**
- Modify: `assets/fs-nav.js` — 增加面包屑和角色切换功能

- [ ] **Step 1: 修改 `fs-nav.js` 增加面包屑参数**

将 `FSNav.init(title)` 扩展为 `FSNav.init(title, options)`，支持：
- `breadcrumb`: 面包屑数组，如 `[{name:'首页',url:'/'}, {name:'知识库',url:'/knowledge/'}]`
- `showRoleSwitcher`: 是否显示角色切换小图标

```javascript
/**
 * 风声 (FengSheng) 统一导航栏组件 v2.0
 * 新增：面包屑导航 + 角色快捷切换
 */
;(function () {
  'use strict'

  var ID_PREFIX = 'fs-nav'
  var INJECTED = false

  function injectStyles() {
    if (INJECTED) return
    INJECTED = true

    var css = ''
      + '#' + ID_PREFIX + '-root,'
      + '#' + ID_PREFIX + '-root *{margin:0;padding:0;box-sizing:border-box}'
      + '#' + ID_PREFIX + '-root{'
      +   'position:sticky;top:0;left:0;right:0;z-index:1000;'
      +   'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;'
      +   '-webkit-font-smoothing:antialiased;'
      + '}'
      + '#' + ID_PREFIX + '-bar{'
      +   'display:flex;align-items:center;justify-content:space-between;'
      +   'height:56px;padding:0 16px;'
      +   'background:linear-gradient(135deg,#3d5a3e 0%,#2c4430 100%);'
      +   'color:#fff;'
      +   'box-shadow:0 2px 12px rgba(44,68,48,.25);'
      +   'border-bottom:1px solid rgba(255,255,255,.08);'
      + '}'
      // 左侧：面包屑
      + '#' + ID_PREFIX + '-left{'
      +   'display:flex;align-items:center;gap:4px;flex-shrink:0;overflow:hidden;'
      +   'font-size:13px;'
      + '}'
      + '#' + ID_PREFIX + '-left a{color:rgba(255,255,255,.7);text-decoration:none;white-space:nowrap}'
      + '#' + ID_PREFIX + '-left a:hover{color:#fff}'
      + '#' + ID_PREFIX + '-left .sep{color:rgba(255,255,255,.35);margin:0 2px;user-select:none}'
      + '#' + ID_PREFIX + '-left .current{color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      // 中间：页面标题
      + '#' + ID_PREFIX + '-center{flex:1;text-align:center;font-size:15px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 12px;letter-spacing:.5px}'
      // 右侧：角色切换 + 返回首页
      + '#' + ID_PREFIX + '-right{display:flex;align-items:center;gap:6px;flex-shrink:0}'
      + '#' + ID_PREFIX + '-role-btn{display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border-radius:6px;font-size:12px;color:#fff;text-decoration:none;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit}'
      + '#' + ID_PREFIX + '-role-btn:hover{background:rgba(255,255,255,.2)}'
      + '#' + ID_PREFIX + '-home-btn{display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border-radius:6px;font-size:12px;color:#fff;text-decoration:none;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);transition:all .2s}'
      + '#' + ID_PREFIX + '-home-btn:hover{background:rgba(255,255,255,.15)}'
      /* ===== Mobile ===== */
      + '@media(max-width:640px){'
      + '#' + ID_PREFIX + '-bar{padding:0 10px;height:50px}'
      + '#' + ID_PREFIX + '-left{font-size:11px;max-width:40%}'
      + '#' + ID_PREFIX + '-center{display:none}'
      + '#' + ID_PREFIX + '-role-btn{font-size:10px;padding:4px 6px}'
      + '#' + ID_PREFIX + '-home-btn{font-size:10px;padding:4px 6px;display:none}'
      + '}'
      /* ===== Back link (fallback) ===== */
      + '#' + ID_PREFIX + '-back{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;color:#fff;text-decoration:none;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);transition:all .2s;white-space:nowrap}'
      + '#' + ID_PREFIX + '-back:hover{background:rgba(255,255,255,.2)}'

    var style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * 初始化导航栏
   * @param {string} title - 当前页面标题
   * @param {object} [options] - 可选配置
   * @param {Array} [options.breadcrumb] - 面包屑 [{name, url}]
   * @param {boolean} [options.showRoleSwitcher] - 是否显示角色切换按钮
   */
  function init(title, options) {
    options = options || {}
    var root = document.getElementById(ID_PREFIX + '-root')
    if (root) root.innerHTML = ''  // 清除旧内容

    injectStyles()

    if (!root) {
      root = document.createElement('div')
      root.id = ID_PREFIX + '-root'
      document.body.insertBefore(root, document.body.firstChild)
    }

    // 构建面包屑 HTML
    var breadcrumbHtml = ''
    if (options.breadcrumb && options.breadcrumb.length > 0) {
      var items = options.breadcrumb
      for (var i = 0; i < items.length; i++) {
        if (i > 0) breadcrumbHtml += '<span class="sep">›</span>'
        if (i < items.length - 1) {
          breadcrumbHtml += '<a href="' + items[i].url + '">' + items[i].name + '</a>'
        } else {
          breadcrumbHtml += '<span class="current">' + items[i].name + '</span>'
        }
      }
    } else {
      // 降级：显示首页 > 当前页面标题
      breadcrumbHtml = '<a href="/">首页</a><span class="sep">›</span><span class="current">' + (title || '') + '</span>'
    }

    // 角色切换按钮
    var roleBtnHtml = ''
    if (options.showRoleSwitcher !== false) {
      roleBtnHtml = '<button id="' + ID_PREFIX + '-role-btn" class="' + ID_PREFIX + '-role-btn" onclick="var r=localStorage.getItem(\'fs_role\')||\'agent\';var icons={\'agent\':\'🤝\',\'manager\':\'📊\',\'newbie\':\'🌱\'};var labels={\'agent\':\'经纪人\',\'manager\':\'管理者\',\'newbie\':\'新手\'};window.location.href=\'/?role=\'+r">' 
        + '<span id="' + ID_PREFIX + '-role-icon">🤝</span>'
        + '<span id="' + ID_PREFIX + '-role-label">经纪人模式</span>'
        + '</button>'
    }

    var html = ''
      + '<div id="' + ID_PREFIX + '-bar">'
      +   '<div id="' + ID_PREFIX + '-left">' + breadcrumbHtml + '</div>'
      +   '<div id="' + ID_PREFIX + '-center">' + (title || '') + '</div>'
      +   '<div id="' + ID_PREFIX + '-right">'
      +     roleBtnHtml
      +     '<a href="/" id="' + ID_PREFIX + '-home-btn" class="' + ID_PREFIX + '-home-btn">🏠 首页</a>'
      +   '</div>'
      + '</div>'

    root.innerHTML = html

    // 更新角色按钮显示
    var savedRole = localStorage.getItem('fs_role') || 'agent'
    var roleIcons = {'agent':'🤝','manager':'📊','newbie':'🌱'}
    var roleLabels = {'agent':'经纪人模式','manager':'管理者模式','newbie':'新手引导'}
    var roleIconEl = document.getElementById(ID_PREFIX + '-role-icon')
    var roleLabelEl = document.getElementById(ID_PREFIX + '-role-label')
    if (roleIconEl) roleIconEl.textContent = roleIcons[savedRole] || '🤝'
    if (roleLabelEl) roleLabelEl.textContent = roleLabels[savedRole] || '经纪人模式'
  }

  window.FSNav = { init: init }
})()
```

- [ ] **Step 2: 更新引用 `fs-nav.js` 的子页面**

在所有子页面中，将 `FSNav.init('页面标题')` 改为 `FSNav.init('页面标题', { breadcrumb: [...], showRoleSwitcher: true })`。

关键页面的面包屑：
- 知识库: `FSNav.init('知识库', { breadcrumb: [{name:'首页', url:'/'}, {name:'知识库', url:'/knowledge/'}], showRoleSwitcher: true })`
- 策展引擎: `FSNav.init('策展引擎', { breadcrumb: [{name:'首页', url:'/'}, {name:'策展引擎', url:'/curation/'}] })`
- 品质测评: `FSNav.init('品质测评', { breadcrumb: [{name:'首页', url:'/'}, {name:'品质测评', url:'/care-test/'}] })`
- 客户管理: `FSNav.init('客户管理', { breadcrumb: [{name:'首页', url:'/'}, {name:'客户管理', url:'/clients/'}] })`

---

### Task 3: 各页面引导横幅组件

**Files:**
- Create: `assets/fs-guide.js` — 引导横幅组件
- Modify: 关键子页面（index.html, curation/index.html, care-test/index.html, clients/index.html, knowledge/index.html 等）— 引入引导横幅

- [ ] **Step 1: 创建引导横幅组件**

```javascript
/**
 * 风声全局引导横幅组件
 * 每个子页面首次访问时，显示一条可关闭的引导提示
 * 关闭后记录 localStorage，不再显示
 *
 * 用法：FSNavGuide.show('knowledge', '知识库', '你可以在这里搜索专业词条...')
 */
;(function() {
  'use strict'

  var GUIDE_KEY = 'fs_guide_closed'

  function getClosed() {
    try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}') } catch(e) { return {} }
  }

  function setClosed(pageId) {
    var closed = getClosed()
    closed[pageId] = true
    localStorage.setItem(GUIDE_KEY, JSON.stringify(closed))
  }

  function show(pageId, title, message) {
    var closed = getClosed()
    if (closed[pageId]) return

    var banner = document.createElement('div')
    banner.id = 'fs-guide-banner'
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(44,95,58,.06);border-bottom:1px solid rgba(44,95,58,.1);font-size:13px;color:#3d5a3e;line-height:1.5;position:sticky;top:56px;z-index:999'
    banner.innerHTML = '<span style="font-size:16px;flex-shrink:0">ℹ️</span>'
      + '<span style="flex:1"><strong>' + title + '</strong> · ' + message + '</span>'
      + '<button onclick="this.parentElement.remove();FSNavGuide._close(\'' + pageId + '\')" style="background:none;border:none;font-size:18px;cursor:pointer;color:rgba(44,95,58,.5);padding:0 4px;line-height:1;flex-shrink:0">×</button>'

    var navRoot = document.getElementById('fs-nav-root')
    if (navRoot && navRoot.nextSibling) {
      navRoot.parentNode.insertBefore(banner, navRoot.nextSibling)
    } else {
      document.body.insertBefore(banner, document.body.firstChild)
    }
  }

  window.FSNavGuide = {
    show: show,
    _close: setClosed
  }
})()
```

- [ ] **Step 2: 在首页和关键子页面引入引导横幅**

首页 `index.html` 中：
```html
<script src="/assets/fs-guide.js"></script>
<script>
// 首页引导（经纪人模式）
if (localStorage.getItem('fs_role') !== 'newbie') {
  FSNavGuide.show('home', '欢迎来到风声', '选择你的角色，找到最适合你的工具。试试场景卡片一键直达。')
}
</script>
```

各子页面在 `FSNav.init()` 后加入：
```html
<script src="/assets/fs-guide.js"></script>
<script>
FSNavGuide.show('curation', '策展引擎', '选择一个生命周期阶段，系统自动生成带说/带/问/跟的完整报告。')
</script>
```

- [ ] **Step 3: 子页面引导横幅内容**

| 页面 | pageId | 标题 | 引导文案 |
|------|--------|------|---------|
| 知识库 | knowledge | 知识库 | 搜索专业词条、按场景浏览，收藏常用知识 |
| 策展引擎 | curation | 策展引擎 | 选择一个生命周期阶段，系统自动生成完整报告 |
| 品质测评 | care-test | 品质测评 | 七维品质评估，了解你的专业水平 |
| 客户管理 | clients | 客户管理 | 管理客户档案，查看交互记录 |
| 词典 | dictionary | 词典 | 查询专业术语，快速定位定义 |
| 解码器 | decoder | 解码器 | 分析服务场景，找到最佳方案 |
| 场景 | scene | 场景导航 | 按客户类型和阶段浏览匹配的知识方案 |
| 管理看板 | dashboard | 管理看板 | 查看团队整体数据和考核指标 |
| 考核 | assessment | 数字员工考核 | 五把尺子评分体系，了解员工表现 |

---

### Task 4: 首页 SEO 和数据区精简

**Files:**
- Modify: `index.html` — 精简统计区、保留每日知识模块

- [ ] **Step 1: 精简首页统计概览区**

保留统计概览区，数据更简洁：
```html
<div class="stats-section">
  <div class="stats-row">
    <div class="stat-item"><div class="stat-num">5,942</div><div class="stat-label">专业词条</div></div>
    <div class="stat-item"><div class="stat-num">34</div><div class="stat-label">服务场景</div></div>
    <div class="stat-item"><div class="stat-num">9</div><div class="stat-label">知识域</div></div>
    <div class="stat-item"><div class="stat-num">6</div><div class="stat-label">数字员工</div></div>
  </div>
</div>
```

- [ ] **Step 2: 保留每日知识模块**

每日知识模块（daily-section）完整保留，这是用户最有价值的每日内容。

---

### Task 5: 部署验证

- [ ] **Step 1: 提交代码**

```bash
cd /workspace/fengsheng-tasks
git add -A
git commit -m "feat: 全站角色引导重构 - 首页改造 + 面包屑导航 + 引导横幅

- 首页新增角色切换器（经纪人/管理者/新用户三种模式）
- 经纪人模式：场景卡片 + 快速工具箱
- 管理者模式：管理场景卡片 + 管理工具箱
- 新用户模式：新手三步走引导 + 进度追踪
- 导航栏 v2.0：新增面包屑导航 + 角色快捷入口
- 新增引导横幅组件 fs-guide.js
- 精简首页统计区，保留每日知识模块"
git push origin main
```

- [ ] **Step 2: 验证部署**

```bash
curl -s -o /dev/null -w "%{http_code}" https://fengsheng.tech/
curl -s -o /dev/null -w "%{http_code}" https://fengsheng.tech/curation/
```
预期：200 OK

- [ ] **Step 3: 浏览器验证**

打开浏览器访问 https://fengsheng.tech/，确认：
- 角色切换器正常显示
- 三种模式切换正常
- 场景卡片点击跳转正确
- 引导横幅在首次访问时显示
- 导航栏面包屑正确显示
- 移动端响应式布局正常