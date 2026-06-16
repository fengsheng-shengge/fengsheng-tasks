# GitHub 推送与 MCP 配置说明

> 仓库：https://github.com/fengsheng-shengge/fengsheng-tasks  
> 分支：main

---

## 🚀 方案一：手动推送（推荐，最快）

在本地终端执行以下命令（需要 GitHub 账号密码或 Personal Access Token）：

```bash
cd /workspace
git push -u origin main
```

如果提示需要认证，请输入你的 GitHub 账号密码，或使用 Personal Access Token：

### 获取 GitHub Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选权限：
   - `repo` (全部仓库) 或 `public_repo` (仅公开)
   - `workflow` (允许 GitHub Actions)
4. 生成 Token，复制保存（仅显示一次）
5. 推送时密码输入 Token

---

## 🤖 方案二：配置 GitHub MCP（小扣子自动推送）

### 步骤 1：获取 GitHub Personal Access Token

同上，获取 Token 并保存。

### 步骤 2：在 Trae 中配置 GitHub MCP

在 Trae 的 MCP 设置中添加以下配置：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<你的 PAT Token>"
      }
    }
  }
}
```

### 步骤 3：小扣子执行推送

配置完成后，小扣子可以执行：

```bash
git push -u origin main
```

---

## 🔐 GitHub Secrets 配置（用于 Cloudflare 部署）

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | Cloudflare Dashboard → Profile → API Tokens → Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Cloudflare Dashboard → 任意域名 Overview 右侧 |

---

## ✅ 推送成功后，自动触发 GitHub Actions

### CI 流水线（9 项检查）

- ✅ 所有 HTML 文件存在性检查
- ✅ _headers 安全头检查（CSP/HSTS/nosniff/DENY）
- ✅ viewport 允许缩放检查（无 user-scalable=no）
- ✅ 所有页面 skip-nav 存在检查
- ✅ sitemap.xml 完整性检查（≥10 个 URL）
- ✅ robots.txt AI 爬虫禁止检查
- ✅ tracker.js 匿名 UID 检查
- ✅ 管理后台 URL key 鉴权检查
- ✅ 无硬编码密钥检查

### 部署流水线（Cloudflare Pages）

- ✅ 自动部署到 Cloudflare Pages
- ✅ 部署后验证关键页面可访问
- ✅ 生成部署报告

---

## 🎯 小扣子（Trae）如何使用 GitHub MCP

### 读取 Issue 列表

```markdown
/github list_issues repository="fengsheng-shengge/fengsheng-tasks" state="open"
```

### 读取单个 Issue

```markdown
/github get_issue repository="fengsheng-shengge/fengsheng-tasks" issue_number=1
```

### 创建 Issue（由小鱼儿/生哥触发）

```markdown
/github create_issue repository="fengsheng-shengge/fengsheng-tasks" title="[Bug] 首页产品卡链接错误" body="..." labels=["bug", "P1"]
```

### 添加评论

```markdown
/github create_issue_comment repository="fengsheng-shengge/fengsheng-tasks" issue_number=1 body="✅ 已修复，PR: #xxx"
```

### 关闭 Issue

```markdown
/github update_issue repository="fengsheng-shengge/fengsheng-tasks" issue_number=1 state="closed"
```

---

## 📋 协同流程（配置完成后）

```
小鱼儿/生哥
    │ 通过 Coze 或直接 GitHub 创建 Issue
    ▼
GitHub Issue 创建（带标签：bug/enhancement/task）
    │
    │ 小扣子读取 Issue
    ▼
小扣子认领 → 代码修复 → 提交 PR
    │
    │ CI 自动验证（9 项检查）
    ▼
PR 合并 → 自动部署 Cloudflare Pages
    │
    │ 小扣子更新 Issue 并关闭
    ▼
小鱼儿通知用户（Coze 回复确认）
```

---

## 🔗 仓库链接

- **仓库地址**：https://github.com/fengsheng-shengge/fengsheng-tasks
- **Issue 列表**：https://github.com/fengsheng-shengge/fengsheng-tasks/issues
- **Actions**：https://github.com/fengsheng-shengge/fengsheng-tasks/actions
- **Settings**：https://github.com/fengsheng-shengge/fengsheng-tasks/settings

---

## 📝 下一步

1. ✅ 代码已提交到本地 Git 仓库
2. ⏳ 等待你手动推送或配置 MCP 后小扣子推送
3. ⏳ GitHub Actions 自动运行 CI 检查
4. ⏳ 配置 Cloudflare Secrets 启用自动部署
5. ⏳ 小鱼儿（Coze）开始通过 Issues 与小扣子协同

**请选择方案一（手动推送）或方案二（配置 MCP）继续。**