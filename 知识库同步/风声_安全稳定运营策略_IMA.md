# 风声 · 安全稳定运营策略 v1.0

> **CTO · 小扣子 | 2026.06.22**
> 目标：全年99.9%可用性，安全零事故

---

## 一、策略总览

网站是风声运营核心目标：**全年99.9% 可用性，安全零事故**。分为四套机制：

| 机制 | 目标 | 负责 |
|------|------|------|
| 🔴 安全防护 | 防DDoS·防注入·防爬·防XSS·防CSRF | WAF + 代码层 |
| 🟡 每日巡检 | 自动化检查·异常告警 | Python脚本 + GitHub Actions |
| 🟢 监控告警 | 页面宕机秒级发现·5分钟响应 | 健康检查API + 邮件告警 |
| 🔵 应急响应 | 故障分级·5分钟切换·1小时恢复 | Runbook + 一键回滚 |

---

## 二、安全防护层 · 四道防线

### 防线1：Cloudflare WAF（网络层）
- 自动识别机器人流量 → Block
- 速率限制 → 单IP 300次/分钟触发验证码
- SQL注入/XSS → Cloudflare托管规则集

### 防线2：HTTP Security Headers（应用层）
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self' ...
```

### 防线3：API限流 & 输入校验（代码层）
```javascript
// 单IP 60秒内60次请求
const RATE_WINDOW = 60_000;
const RATE_MAX_PER_IP = 60;

// 统一输入过滤
function sanitize(str) { return str?.slice(0, 2000).replace(/[<>]/g, ''); }
```

### 防线4：CSRF校验（代码层）
- 所有POST请求校验Origin/Referer
- 同源策略：仅fengsheng.tech允许

---

## 三、每日巡检体系 · 四层检查

**巡检频率**：北京时间 09:00 / 14:00 / 22:00
**执行方式**：GitHub Actions定时触发 + Python脚本

### 巡检清单（20项）

| 层级 | 检查项 | 阈值 | 告警级别 |
|------|--------|------|---------|
| 🟢 页面层 | 首页/知识底座/测评/培养/解码/报告/看板/字典/伙伴/关于/课程/工具/说文/示例/404 | < 3秒 | 正常/警告/严重 |
| 🟢 API层 | /api/ping /api/stats/health /api/feedback /api/event | < 1秒 | 严重 |
| 🟢 数据层 | D1连接/events表/feedback表 | 有数据 | 警告 |
| 🟢 基础设施 | DNS解析/SSL证书/sitemap/_redirects/og:image | 正常 | 警告 |

---

## 四、监控告警体系 · 三级响应

| 级别 | 触发条件 | 响应方式 | 响应时间 |
|------|---------|---------|---------|
| 🔴 P0 严重 | 页面5xx / API全挂 / D1断开 | GitHub Issue + 邮件 + 推送 | 5分钟 |
| 🟡 P1 警告 | 响应>3秒 / 数据异常 / og:image缺失 | GitHub Issue | 1小时 |
| 🟢 P2 提示 | 数据流入正常·无异常 | 日志记录 | 24小时 |

---

## 五、应急响应Runbook

### P0级：网站宕机/API挂掉
```
1. Cloudflare Dashboard → Pages → 部署历史 → 一键回滚
2. 检查GitHub Actions → Deploy日志
3. 本地复现 → 修复提交 → 部署
4. 通知全员：生哥/小鱼儿
```

### P1级：页面响应慢/数据异常
```
1. 检查 /api/stats/summary
2. 查看7日趋势图
3. 查看数据库是否异常
4. 诊断问题 → 修复
```

---

## 六、版本控制 & 回滚策略

| 操作 | 命令 | 说明 |
|------|------|------|
| 🚀 部署 | git push origin main | 自动触发Cloudflare Pages部署 |
| ⏪ 回滚 | git revert <hash> | 回滚到指定commit |
| 🔒 Force Push | **禁止！** | 会覆盖他人提交 |

### 部署前Checklist
- [ ] 本地启动测试无语法错误
- [ ] Python巡检脚本本地跑一遍无red
- [ ] 3个核心页面手工验证
- [ ] Push到GitHub

---

## 七、数据备份策略

- **D1数据库**：每周日03:00自动备份（Cloudflare自动备份）
- **代码库**：GitHub自动版本控制 + 本地clone
- **配置文件**：wrangler.toml / _headers / _redirects 随代码入库

---

## 八、CTO每日5分钟检查清单

- [ ] 09:00 查看自动巡检报告（邮件/GitHub Issue）
- [ ] 14:00 人工抽查3个核心页面
- [ ] 22:00 夜间巡检（自动）

---

## 九、相关文件索引

- 风声_安全稳定运营策略_v1.0
- daily_check.py - Python巡检脚本
- daily-health-check.yml - GitHub Actions工作流
- ops.js - 运维总控API
- _headers - 安全Headers配置
- _redirects - 路由重定向规则

---

*v1.0 · 小扣子（CTO）· 2026.06.22*
