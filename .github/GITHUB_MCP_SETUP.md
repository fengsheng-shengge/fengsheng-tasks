# GitHub MCP 配置说明

> 此文件说明如何为风声项目配置 GitHub MCP，使小扣子（Trae）能够直接读写 GitHub Issues 和仓库。

## 当前状态

- [x] GitHub Actions CI 流水线（9项检查）
- [x] GitHub Actions 部署流水线
- [x] Issue 模板（Bug / Feature / Task）
- [x] Labels 配置（labels.yml）
- [x] CONTRIBUTING.md 协同规范
- [ ] GitHub MCP 认证配置（待填入）
- [ ] Cloudflare Secrets 配置（待填入）

---

## 配置步骤

### 步骤 1：在 Trae 中添加 GitHub MCP

在 Trae 的 MCP 设置中添加 GitHub MCP：

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

或者使用 GitHub CLI：

```json
{
  "mcpServers": {
    "github-cli": {
      "command": "gh",
      "args": ["api", "repos/{owner}/{repo}/issues"]
    }
  }
}
```

### 步骤 2：获取 GitHub Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选权限：
   - `repo` (全部仓库) 或 `public_repo` (仅公开)
   - `issues` (Issues读写)
   - `pull_requests` (PR读写)
4. 生成 Token，保存到安全地方（不进代码！）

### 步骤 3：填入仓库信息

将以下信息告知小扣子（Trae）：

| 信息 | 说明 |
|------|------|
| `GITHUB_REPO_OWNER` | 仓库所有者（用户名或组织名） |
| `GITHUB_REPO_NAME` | 仓库名称（如 `fengsheng-tech`） |
| `GITHUB_TOKEN` | 步骤2中生成的 PAT |

### 步骤 4：配置 Cloudflare Secrets（用于部署）

在 GitHub 仓库 Settings → Secrets 中添加：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | Cloudflare Dashboard → Profile → API Tokens → Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Cloudflare Dashboard → 任意域名 Overview 右侧 |

---

## MCP 可用命令（配置完成后）

小扣子可以直接通过 GitHub MCP 执行以下操作：

```markdown
# 读取 Issue 列表
github_list_issues(repository="owner/repo", state="open")

# 读取单个 Issue 详情
github_get_issue(repository="owner/repo", issue_number=123)

# 创建 Issue（由小鱼儿/生哥触发）
github_create_issue(
  repository="owner/repo",
  title="[Bug] 首页产品卡链接错误",
  body="...（使用模板）",
  labels=["bug", "P1"]
)

# 添加 Issue 评论
github_create_issue_comment(
  repository="owner/repo",
  issue_number=123,
  body="✅ 已修复，PR: #xxx，请确认"
)

# 关闭 Issue
github_update_issue(repository="owner/repo", issue_number=123, state="closed")
```

---

## 协同流程（配置完成后）

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
    │ CI 自动验证（9项检查）
    ▼
PR 合并 → 自动部署 Cloudflare Pages
    │
    │ 小扣子更新 Issue 并关闭
    ▼
小鱼儿通知用户（Coze 回复确认）
```
