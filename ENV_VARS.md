# 风声 Worker 环境变量配置说明

在 Cloudflare Pages → 项目 → Settings → Environment variables 中配置以下变量。

## 必需变量（核心功能）

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `COZE_PAT_TOKEN` | Coze AI 平台 PAT Token（聊天功能） | `pat_xxxxxxxx` |
| `FS_BOT_ID` | Coze Bot ID（聊天机器人ID） | `750xxxxx` |
| `JWT_SECRET` | JWT 签名密钥（微信登录鉴权） | 随机32位字符串 |
| `WX_SECRET` | 微信小程序 AppSecret | 微信公众平台获取 |

## D1 数据库绑定（统计数据）

在 Cloudflare Pages → Settings → Functions → D1 database bindings 中绑定：

| 绑定名 | 说明 |
|--------|------|
| `DB` | D1 数据库实例（events 表 + partner_intents 表） |

所需数据表（见 `migrations/` 目录）：
- `events` — 埋点数据（pageview, click, chat 等）
- `partner_intents` — 合作意向留资

## KV 命名空间绑定（存储兜底）

在 Cloudflare Pages → Settings → Functions → KV namespace bindings 中绑定：

| 绑定名 | 说明 |
|--------|------|
| `PARTNER_LEADS` | 合作意向 KV 兜底存储（D1 不可用时降级） |
| `PAYMENT_ORDERS` | 支付订单状态存储（导师解锁功能） |

## 可选变量（支付功能）

| 变量名 | 说明 |
|--------|------|
| `ALIPAY_PARTNER` | 支付宝合作伙伴ID |
| `ALIPAY_SELLER_ID` | 支付宝卖家ID |
| `ALIPAY_APP_ID` | 支付宝应用ID |

## 可选变量（外部反馈代理）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WEB3FORMS_KEY` | Web3Forms API Key | 内置兜底Key |
| `FORMSUBMIT_KEY` | FormSubmit API Key | 内置兜底Key |

## 可选变量（IP头像生成）

| 变量名 | 说明 |
|--------|------|
| `IP_DESIGN_API` | 文生图服务地址（如火山方舟） |
| `IP_DESIGN_API_KEY` | 文生图服务 API Key |
| `IP_DESIGN_MODEL` | 模型名，默认 `seedream-4.0` |

## 可选变量（微信登录）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WX_APPID` | 微信小程序 AppID | `wxb87aa256991cc9c6` |

## 降级行为说明

- **无 D1 (`env.DB`)**：统计接口返回 `null` + note 提示；埋点仅打日志不持久化
- **无 Coze Token**：聊天接口返回 `500 server config error`
- **无 JWT Secret**：微信登录返回 `500 server config error`
- **无 KV (`PARTNER_LEADS`)**：合作意向仅 D1 存储，无兜底
- **IP Design 无 API 配置**：自动降级为 DiceBear 占位头像
