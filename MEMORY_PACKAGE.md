# 风声项目·完整记忆包
> 打包时间: 2026-07-31 09:40 (北京时间)
> 打包人: 小扣子（底层执行Agent）
> 版本: v20260731-2300

---

## 一、项目概览

### 1.1 项目名称
风声（FengSheng）— 房产经纪人选品工具 + 知识底座 + AI助手

### 1.2 域名与部署
- 生产域名: `https://fengsheng.tech`
- 托管平台: Cloudflare Pages
- 仓库: `github.com/fengsheng-shengge/fengsheng-tasks` (private)
- D1数据库: 已绑定（`env.DB`）
- KV命名空间: `PARTNER_LEADS`（合作意向兜底）、`PAYMENT_ORDERS`（支付订单）

### 1.3 五Agent团队
| 花名 | 角色 | 职责 |
|------|------|------|
| 小鱼儿 | 产品运营 | 需求定义、上线验收、用户体验 |
| 小豆子 | 技术开发 | 小程序开发、功能实现、代码提交 |
| 小酒窝儿 | 设计评审 | UI/UX评审、视觉规范 |
| 小扣子 | 底层执行 | 网站运维、部署、bug修复、安全 |
| (用户) | 决策者 | 任务派发、审批上线 |

### 1.4 技术栈
- 前端: HTML + 原生JS + Tailwind CSS
- 小程序: uni-app (Vue3) → mp-weixin
- 后端: Cloudflare Pages Functions (_worker.js)
- 数据库: Cloudflare D1 (SQLite)
- AI: Coze API (流式SSE)
- 认证: JWT (HMAC-SHA256)
- 支付: 支付宝当面付

---

## 二、关键文件清单与状态

### 2.1 核心配置文件

| 文件路径 | 行数 | 状态 | 说明 |
|----------|------|------|------|
| `_worker.js` | 1146 | ✅ 已修复 | 全功能版：D1+Coze+JWT+支付+安全 |
| `_redirects` | 11行 | ✅ 已修复 | 静态页301跳转+微信验证文件 |
| `_headers` | ~100行 | ✅ 稳定 | 安全响应头+CSP+缓存策略 |
| `ENV_VARS.md` | 70行 | ✅ 新增 | 环境变量配置说明文档 |
| `data/entries.json` | 5067条 | ✅ 稳定 | 知识底座词条全量数据(~10MB) |

### 2.2 _worker.js 功能清单

**API端点（全部已恢复真实功能）:**
```
GET  /api/health              → D1健康检查（last_event + events_24h）
GET  /api/stats                → D1实时统计（uv/pv/chats）
GET  /api/stats/summary        → D1汇总（per_product明细）
GET  /api/stats/daily?days=N   → D1每日趋势
GET  /api/stats/health         → D1连接状态
POST /api/event                → D1批量埋点 + partner_intent分流
POST /api/feedback             → D1反馈存储
POST /api/feedback-external    → Web3Forms + FormSubmit代理
POST /api/chat                 → Coze AI流式聊天
GET  /api/chat                 → 聊天端点提示
POST /api/auth/wx-login        → 微信登录 + JWT生成
POST /api/decode               → 六步解码
POST /api/decode/v2            → 六步解码v2
POST /api/assess               → 评估报告
POST /api/callback             → 回调
GET  /api/daily                → 每日打卡
GET  /api/verify              → 验证
GET  /api/admin/agents         → Agent列表
GET  /api/partner-intent       → 合作意向表单
POST /api/partner-intent       → 合作意向提交（D1+KV双写）
GET  /api/ip-design            → IP设计表单
POST /ip-design                → IP头像生成（mock/真实API）
POST /mentor-api/chat          → 导师聊天（JWT鉴权）
POST /mentor-api/payment/init  → 支付宝当面付初始化
GET  /mentor-api/payment/check → 支付状态查询
POST /mentor-api/payment/notify → 支付宝异步回调
GET  /mentor-api/health        → 健康检查
```

**安全层架构（7层）:**
- Layer 0: 微信验证文件白名单
- Layer 0.5: API路径跳过UA检测
- Layer 1: IP封禁检查（honeypot触发）
- Layer 2: 全局限流（120/min）
- Layer 3: 恶意UA拦截（扫描工具）
- Layer 4: AI爬虫拦截（GPTBot/ClaudeBot等）
- Layer 5: 漏洞路径探测拦截 + 自动封IP
- Layer 6: 蜜罐路径触发封IP
- Layer 7: 可疑查询字符串（SQLi/XSS）

**安全规则调优记录:**
- `curl`/`wget` 已从 AI_SCRAPER_UA_PATTERNS 移除（允许API测试）
- API路径（`/api/`、`/mentor-api/`）跳过 Layer 3-6 的UA检测

### 2.3 _redirects 规则
```
/showing-report/*  /s1-report.html          200
/dict/*            /knowledge/              200
/guide/*           /guide.html              200
/decode/*          /care-test/              200
/assessment        /quality-test/            301
/breeder.html      /breeder/                 301
/care-test.html    /care-test/               301
/quality-test.html /quality-test/            301
/knowledge.html    /knowledge/               301
/MP_verify_*       /MP_verify_*             200
```

### 2.4 小程序编译产物
- 路径: `fs-mini-program/dist/build/mp-weixin/`
- 大小: 1.3MB
- 基础库: 2.32.3（锁定，绕开3.15.x polyfill timeout）
- lazyCodeLoading: requiredComponents（已注入）
- 敏感信息扫描: NO_LEAK（无花名/密钥/token泄露）
- 编译时间: 2026-07-31 01:38

---

## 三、环境变量配置

### 3.1 必需变量
| 变量名 | 用途 | 配置位置 |
|--------|------|----------|
| `COZE_PAT_TOKEN` | Coze AI聊天 | Cloudflare Pages → Settings → Env |
| `FS_BOT_ID` | Coze Bot ID | 同上 |
| `JWT_SECRET` | JWT签名密钥 | 同上 |
| `WX_SECRET` | 微信AppSecret | 同上 |

### 3.2 D1绑定
| 绑定名 | 数据表 | 用途 |
|--------|--------|------|
| `DB` | `events` | 埋点/统计/反馈 |
| `DB` | `partner_intents` | 合作意向留资 |

### 3.3 KV绑定
| 绑定名 | 用途 |
|--------|------|
| `PARTNER_LEADS` | 合作意向KV兜底 |
| `PAYMENT_ORDERS` | 支付订单状态 |

### 3.4 可选变量
- `ALIPAY_PARTNER` / `ALIPAY_SELLER_ID` / `ALIPAY_APP_ID`（支付）
- `WEB3FORMS_KEY` / `FORMSUBMIT_KEY`（外部反馈，有默认值）
- `IP_DESIGN_API` / `IP_DESIGN_API_KEY` / `IP_DESIGN_MODEL`（文生图）
- `WX_APPID`（默认 `wxb87aa256991cc9c6`）

### 3.5 降级行为
- 无D1 → 统计返回null+note，埋点仅日志
- 无Coze Token → 聊天返回500
- 无JWT Secret → 微信登录返回500
- IP Design无API → 降级DiceBear占位头像

---

## 四、重大事件时间线

### 2026-07-25~26：知识底座修复
- entries.json 从241条恢复到3130条（13个域）
- 修复域分类不匹配（8→13域）
- 实现动态域生成、子场景过滤、分页
- 修复搜索功能（列表展示替代单条返回）
- 小程序知识页移除"小鱼儿"花名（敏感信息）

### 2026-07-27：首次上线
- PR #195 合并到main，部署到Cloudflare Pages
- 修复_worker.js CI/CD部署问题
- 小程序代码编译验证 NO_LEAK
- 回复小鱼儿 Issue #201
- 分析小豆子 origin/feat/issue-185-xiaodouzi-prototype 分支提交

### 2026-07-30：P0回滚事故
- commit 225a675 将 _worker.js 从1519行替换为345行stub
- 原因：修复 /assessment 重定向时意外缩减worker
- 导致所有API返回mock数据，D1/Coze功能丢失
- 多次尝试恢复（f740c84等），但重复函数声明导致ESM解析错误

### 2026-07-31：全面恢复（本次）
- **根因定位**: 1519行版本中有3处重复 `jsonResponse`、2处重复 `clip`、2处重复 `parseBodyJson`
- **修复方案**: 从0b34554提取完整版，去重后整合为1146行单文件
- **安全调优**: 移除curl/wget禁用，API路径跳过UA检测
- **验证结果**: 全部API端点200，D1连接正常（uv:434/pv:2114）
- **PR #209**: 已合并到main，Cloudflare自动部署成功
- **小程序**: 重新编译成功，1.3MB，NO_LEAK

---

## 五、Git工作流

### 5.1 分支策略
- `main` → 生产分支（合并即触发Cloudflare Pages自动部署）
- `fix/*` → 修复分支
- `feat/*` → 功能分支
- `docs/*` → 文档分支

### 5.2 部署流程
1. 本地修改 → `git checkout -b fix/xxx`
2. `git add` + `git commit`（conventional commit）
3. `git push origin fix/xxx`
4. 通过MCP GitHub工具创建PR
5. 通过MCP GitHub工具合并PR（squash merge）
6. Cloudflare Pages自动构建部署（~30秒）
7. curl验证API端点

### 5.3 关键Git历史
```
31c7225 (HEAD -> main, origin/main) 全面恢复_worker.js完整功能 (#209)
a7525ec P0根因修复 — /api/health路由 + MP_verify加固 (#208)
225a675 P0事故源头 — stub化_worker.js（345行）
f740c84 修复重复函数声明（但仍有问题）
0b34554 内联ESM模块到_worker.js单文件（1519行完整版，含重复声明）
ec3181b 后端API干净重提 — ip-design + partner-intent (#197)
ff0565d 五层反爬安全屏障部署
92af6cf 尾斜杠重定向全覆盖
```

---

## 六、待办事项

### 6.1 当前无阻塞性待办
所有P0问题已修复，网站功能正常。

### 6.2 后续可迭代项
- [ ] 小豆子新版小程序代码审核上线（origin/feat/issue-185-xiaodouzi-prototype）
- [ ] IP Design真实文生图API接入（当前mock模式）
- [ ] 支付宝签名验证（当前注释状态，生产需启用）
- [ ] entries.json 词条持续扩充（当前5067条）
- [ ] D1数据表migration脚本整理（migrations/目录）
- [ ] 前端页面性能优化（图片懒加载等）

---

## 七、已知问题与解决方案

### 7.1 Worker重复函数声明（已解决）
- **问题**: 内联api/partner-intent.js和api/ip-design.js时，`jsonResponse`/`clip`/`parseBodyJson`被重复声明
- **根因**: 两个模块文件各自定义了同名工具函数
- **解决**: 在_worker.js顶层统一定义一次，模块内引用全局函数

### 7.2 静态页面404（已解决）
- **问题**: breeder.html等页面被改为目录结构，旧URL 404
- **解决**: _redirects添加301重定向 .html → /

### 7.3 curl测试被ban（已解决）
- **问题**: curl/wget在AI_SCRAPER_UA_PATTERNS中被拦截
- **解决**: 移除curl/wget模式 + API路径跳过UA检测

### 7.4 小程序请求超时（已解决）
- **问题**: 小程序服务端调用不自带浏览器UA，被安全层拦截
- **解决**: API路径（/api/）跳过Layer 3-6的UA/爬虫检测

### 7.5 Cloudflare Pages Worker未部署（已解决）
- **问题**: CI/CD未正确部署_worker.js
- **解决**: 直接推送到main分支触发自动部署

---

## 八、API验证快照（2026-07-31 09:36）

```
/api/health     → 200 {"status":"ok","db":"connected","events_24h":3037}
/api/stats      → 200 {"uv":434,"pv":2114,"source":"db"}
/api/stats/summary → 200 {"total_users":440,"total_pageviews":2114,"source":"db"}
/api/stats/daily   → 200 {"daily":[...],"source":"db"}
/api/admin/agents  → 200 {"agents":[4个Agent]}
/api/decode        → 200
/api/partner-intent → 200
/breeder/          → 200
/care-test/        → 200
/quality-test/     → 200
/knowledge/        → 200
/breeder.html      → 301 → /breeder/
/care-test.html    → 301 → /care-test/
/quality-test.html → 301 → /quality-test/
/knowledge.html    → 301 → /knowledge/
```

---

## 九、项目目录结构（关键部分）

```
fengsheng-tasks/
├── _worker.js              # Cloudflare Pages Worker (1146行, 全功能)
├── _redirects              # URL重定向规则 (11行)
├── _headers                # 安全响应头配置
├── ENV_VARS.md             # 环境变量配置说明 (新增)
├── MEMORY_PACKAGE.md       # 本文件
├── data/
│   └── entries.json        # 知识底座词条 (5067条, ~10MB)
├── api/
│   ├── partner-intent.js   # 合作意向模块 (已被内联到_worker.js)
│   └── ip-design.js         # IP头像生成模块 (已被内联到_worker.js)
├── fs-mini-program/        # 微信小程序源码
│   ├── src/
│   │   ├── pages/          # 页面
│   │   ├── data/           # 案例库/场景卡/工具箱
│   │   ├── utils/          # 工具函数
│   │   └── store/          # Pinia状态
│   ├── dist/build/mp-weixin/  # 编译产物 (1.3MB)
│   ├── vite.config.js      # Vite配置 (postBuildInject)
│   └── package.json        # uni-app依赖
├── migrations/             # D1数据库迁移脚本
├── index.html              # 首页
├── knowledge/              # 知识底座页面
├── breeder/                # 经纪人选品页面
├── care-test/              # 体检页面
├── quality-test/           # 质量评估页面
├── mentor/                 # 开单导师页面
├── s1-report/              # S1报告页面
└── partner/                # 合作意向页面
```

---

## 十、注意事项

1. **不要用225a675这个commit**: 它是P0事故源头，会把worker替换为stub
2. **合并PR用squash**: 保持main历史干净
3. **小程序编译前检查花名**: 确保无"小鱼儿/小豆子/小酒窝/小扣子"泄露
4. **D1表结构**: events表有19个字段，partner_intents表有11个字段
5. **安全规则**: curl/wget已解禁，但python-requests/scrapy仍被拦截
6. **基础库版本**: 小程序锁定2.32.3，不要升级到3.15.x（polyfill timeout）
7. **entries.json**: 当前5067条，从之前的3130条扩充而来
8. **Worker版本**: v20260731-2300，在/api/stats/health的version字段可查

---

## 十一、团队协作约定

- 用户用中文下达任务，小扣子执行技术操作
- 修复后需创建PR并合并到main才会生效
- 部署后必须curl验证API端点
- 小程序编译后必须扫描敏感信息（NO_LEAK检查）
- 回复GitHub Issue时使用小扣子身份
- 上线前需用户确认

---

*记忆包结束 — 如需恢复上下文，阅读本文件即可获取完整项目状态*
