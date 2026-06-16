# 风声 fengsheng.tech 部署操作手册

## 快速部署

### 方式一：手动上传到 Cloudflare Pages（推荐，无需配置 Secrets）

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com/
   - 进入 "Pages" → 选择项目 `fengsheng-tech`

2. **上传代码**
   - 点击 "Upload assets"
   - 选择 `/workspace` 目录下的所有文件（或打包成 zip）
   - 点击 "Upload"

3. **配置构建**
   - Build command: 留空（纯静态站点，无需构建）
   - Build output directory: `./`

4. **配置环境变量**（可选）
   - 在 "Settings" → "Environment variables" 中添加

5. **等待部署完成**
   - Cloudflare 会自动部署并提供预览 URL
   - 确认后配置自定义域名 `fengsheng.tech`

---

### 方式二：GitHub Actions 自动部署（需要配置 Secrets）

1. **获取 Cloudflare API Token**
   - 在 Cloudflare Dashboard → 右上角头像 → "My Profile" → "API Tokens"
   - 点击 "Create Token" → 选择 "Edit Cloudflare Workers" 模板
   - 复制生成的 Token（只显示一次）

2. **获取 Cloudflare Account ID**
   - 在 Cloudflare Dashboard 首页右侧栏找到

3. **配置 GitHub Secrets**
   - 打开 https://github.com/fengsheng-shengge/fengsheng-tasks/settings/secrets/actions
   - 添加两个 Secret：
     - `CLOUDFLARE_API_TOKEN` → 步骤 1 获取的 Token
     - `CLOUDFLARE_ACCOUNT_ID` → 步骤 2 获取的 Account ID

4. **触发部署**
   - 推送代码到 `main` 分支，自动触发部署
   - 或在 GitHub Actions → "Deploy to Cloudflare Pages" → "Run workflow"

---

## 文件结构说明

```
/workspace/
├── index.html              # 首页
├── breeder.html            # Agent培养师
├── care-test.html          # 客户解码器
├── quality-test.html       # 六维品质测评
├── assessment.html         # 能力测评
├── s1-report.html          # 带看报告
├── knowledge.html          # 知识底座
├── guide.html              # 使用指南
├── reply.html              # 反馈表单
├── about.html              # 关于我们
├── privacy.html            # 隐私政策
├── dashboard.html          # 管理后台（需要 URL key 鉴权）
├── 404.html                # 独立404页
├── tracker.js              # 全站埋点（匿名 fs_uid）
├── _headers                # Cloudflare 安全头配置
├── _redirects              # Cloudflare 路由重定向
├── sitemap.xml             # 站点地图
└── robots.txt              # 爬虫规则
```

---

## CI 检查项

代码推送前会自动运行 10 项检查：

| 检查项 | 说明 |
|--------|------|
| 所有 HTML 文件存在 | 确保 14 个页面文件都存在 |
| _headers 安全头 | CSP、HSTS、X-Content-Type-Options、X-Frame-Options、Referrer-Policy |
| viewport 允许缩放 | 无 user-scalable=no |
| skip-nav 存在 | 所有页面有跳过导航链接 |
| sitemap.xml 完整性 | 至少包含 10 个 URL |
| _redirects 路由配置 | 存在且包含路由规则 |
| robots.txt AI 爬虫禁止 | GPTBot、ClaudeBot 已禁止 |
| tracker.js 匿名 UID | fs_uid 标识存在 |
| 管理后台 URL key 鉴权 | dashboard.html 有 searchParams 鉴权 |
| 无硬编码密钥 | 检测 password/secret/token，排除测试密钥 |

---

## 管理后台访问

访问 `https://fengsheng.tech/dashboard.html?key=fs-admin-2026` 进入管理后台。

可用密钥：
- `fs-admin-2026`
- `fengsheng-ops`
- `demo-admin-key`

---

## 常见问题

**Q: 部署后页面显示 404**
A: 检查 `_redirects` 文件是否存在，确保路由规则正确。

**Q: 安全头未生效**
A: 确认 `_headers` 文件在根目录，格式正确。

**Q: CI 检查失败**
A: 根据错误信息修复对应问题后重新推送。

---

## 紧急修复流程

1. 在本地修改文件
2. 运行 `bash .github/workflows/ci.yml` 验证
3. 提交并推送：`git add . && git commit -m "fix(xxx): 描述" && git push origin main`
4. 等待 GitHub Actions 完成
5. 确认部署成功
