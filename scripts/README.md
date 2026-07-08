# Cloudflare 凭证自动检查与部署

## 功能说明

这个自动化系统会每小时检查 GitHub Issue #42，查找小鱼儿回复的 Cloudflare 部署凭证。如果找到凭证，会自动：

1. 提取 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN`
2. 配置到 GitHub Repository Secrets
3. 触发 Cloudflare Pages 部署
4. 在 Issue 中添加确认评论

## 文件说明

| 文件 | 说明 |
|------|------|
| `scripts/check_cloudflare_credentials.py` | Python 脚本，检查凭证并自动配置 |
| `.github/workflows/check-credentials.yml` | GitHub Actions 定时工作流（每小时运行） |

## 凭证格式

小鱼儿需要在 Issue #42 中回复以下格式的凭证：

```
CLOUDFLARE_ACCOUNT_ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_API_TOKEN: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

或者：

```
Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Account ID 是 32 位十六进制字符串，API Token 是 40+ 位的字符串。

## 手动运行

### 方法 1：本地运行

```bash
# 设置 GitHub Token（需要 repo 权限）
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# 运行脚本
python scripts/check_cloudflare_credentials.py
```

### 方法 2：手动触发 GitHub Actions

1. 访问 https://github.com/fengsheng-shengge/fengsheng-tasks/actions/workflows/check-credentials.yml
2. 点击 "Run workflow" 按钮
3. 选择 main 分支并运行

## 所需权限

GitHub Token 要要以下权限：

- `repo` - 访问仓库
- `workflow` - 触发工作流
- `write:packages` - 写入 Secrets

## 定时任务

GitHub Actions 会每小时整点自动运行检查。查看运行日志：

https://github.com/fengsheng-shengge/fengsheng-tasks/actions/workflows/check-credentials.yml

## 部署流程

找到凭证后的完整流程：

```
Issue #42 凭证 → 提取凭证 → 配置 Secrets → 触发 deploy.yml → Cloudflare Pages 部署 → 网站上线
```

## 验证部署

部署完成后访问：https://fengsheng.tech

## 注意事项

- 凭证只能提取一次，提取后立即配置并部署
- GitHub Secrets 配置后无法读取，只能更新或删除
- API Token 只在创建时显示一次，请确保正确复制

## 相关链接

- [Issue #42](https://github.com/fengsheng-shengge/fengsheng-tasks/issues/42)
- [部署工作流](https://github.com/fengsheng-shengge/fengsheng-tasks/actions/workflows/deploy.yml)
- [Actions 运行记录](https://github.com/fengsheng-shengge/fengsheng-tasks/actions)