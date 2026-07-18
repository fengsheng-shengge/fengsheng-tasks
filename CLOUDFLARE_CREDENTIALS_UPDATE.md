# Cloudflare 凭证更新请求

## 问题

根据 Issue #172，Cloudflare Pages 部署持续失败。
当前 `CLOUDFLARE_API_TOKEN` 可能只有 `Cloudflare Workers: Edit` 权限，缺少 `Cloudflare Pages: Edit` 权限。

## 小鱼儿请操作

1. 登录 https://dash.cloudflare.com/
2. 右上角头像 → My Profile → API Tokens
3. 点 Create Token
4. 选择 Custom token
5. 添加权限：
   - Account → Cloudflare Pages → Edit
   - Account → Workers Scripts → Edit
6. 创建后复制 Token
7. 在 Issue #42 回复新的 Token 和 Account ID

## 同时请确认
- Cloudflare Pages 项目名称是 `fengsheng` 还是 `fengsheng-tech`？
- Account ID 是否还是之前的那个？
