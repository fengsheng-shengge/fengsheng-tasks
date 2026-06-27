# 风声API接口文档 v1.0

**版本**：v1.0
**更新**：2026-06-27
**作者**：小扣子
**Base URL**：`https://fengsheng.tech`

---

## 认证

除 `/api/event`、`/api/stats`、`/api/auth/*` 外，所有接口需要 JWT Token。

```
Authorization: Bearer <token>
```

Token 通过 `POST /api/auth/wx-login` 获取，有效期 **7天**。

---

## 1. 事件追踪

### 上报事件

```
POST /api/event
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | 事件类型：`pageview` \| `click` \| `feature_use` \| `subscribe` \| `decode` \| `assess` |
| product | string | ✅ | 产品标识：`index` \| `knowledge` \| `decode` \| `care-test` \| `s1-report` \| `breeder` \| `mini-program` |
| page | string | | 页面路径，默认 `window.location.pathname` |
| url | string | | 完整URL |
| ts | number | | 时间戳（毫秒），默认自动生成 |
| ...extra | any | | 自定义扩展字段 |

**响应**：
```json
{ "ok": true }
```

**示例**：
```bash
curl -X POST https://fengsheng.tech/api/event \
  -H "Content-Type: application/json" \
  -d '{"type":"pageview","product":"knowledge","page":"/knowledge"}'
```

---

## 2. 统计数据

### 获取统计数据

```
GET /api/stats?key=fs-admin-2026
```

**查询参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| key | ✅ | 管理密钥：`fs-admin-2026` |
| product | | 产品筛选 |
| period | | 时间范围：`today` \| `week` \| `month` \| `all`（默认 `all`） |

**响应**：
```json
{
  "total": 2464,
  "products": {
    "knowledge": 1800,
    "index": 400,
    "decode": 150,
    "care-test": 80,
    "s1-report": 30,
    "breeder": 4
  }
}
```

---

## 3. 认证

### 微信小程序登录

```
POST /api/auth/wx-login
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | ✅ | 微信小程序 `wx.login()` 返回的 code |

**响应**：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "openid": "oXXXXXxXXXXXxXXXXXX",
  "userId": "wx_oXXXXXxXXXXX"
}
```

**示例**：
```bash
curl -X POST https://fengsheng.tech/api/auth/wx-login \
  -H "Content-Type: application/json" \
  -d '{"code":"031SxG1w3..."}'
```

**错误码**：

| errcode | 说明 |
|---------|------|
| 400 | 缺少 code |
| 401 | code 无效或已过期 |
| 503 | 微信 API 未配置 |

---

## 4. 客户解码器

### 解码（v2）

```
POST /api/decode/v2
```

**认证**：需要 Bearer Token

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | string | ✅ | 用户输入 |
| type | string | | `text`（默认）\| `voice` |
| sessionId | string | | 会话ID（用于上下文关联） |

**响应**：
```json
{
  "sessionId": "sess_xxxxx",
  "category": "buying",
  "profile": {
    "lifeStage": "婚房置業",
    "coreNeed": "安全",
    "riskTolerance": "穩健型",
    "decisionStyle": "遲疑型"
  },
  "insights": [
    {
      "type": "情感",
      "content": "買房對她而言是安全感重建..."
    }
  ],
  "suggestions": [
    {
      "scene": "初次見面",
      "content": "不急着推房源，先問問她對家的想象..."
    }
  ]
}
```

---

## 5. 品质测评

### 提交测评

```
POST /api/assess
```

**认证**：需要 Bearer Token

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| answers | object[] | ✅ | 各维度答题结果 |

**响应**：
```json
{
  "resultId": "rs_xxxxx",
  "scores": {
    "safety": 85,
    "health": 72,
    "convenience": 90,
    "economy": 68,
    "comfort": 75,
    "beauty": 60,
    "freedom": 78
  },
  "level": "B",
  "summary": "您在安全感和便利性上得分较高...",
  "report": "https://fengsheng.tech/s1-report/?result=rs_xxxxx"
}
```

---

## 6. 订阅

### 创建订阅订单

```
POST /api/subscribe
```

**认证**：需要 Bearer Token

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| product | string | ✅ | 产品标识：`decode` \| `assess` \| `agent` |
| plan | string | ✅ | 订阅周期：`monthly` \| `yearly` |

**响应**：
```json
{
  "orderId": "ord_xxxxx",
  "amount": 4900,
  "currency": "CNY",
  "expiresAt": "2026-07-27T00:00:00Z"
}
```

---

## 7. 反馈

### 提交反馈

```
POST /api/feedback
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | `quality` \| `bug` \| `suggestion` |
| product | string | | 产品标识 |
| content | string | ✅ | 反馈内容（50字以上） |
| contact | string | | 联系方式（选填） |
| score | number | | 评分 1-5（选填） |

**响应**：
```json
{ "ok": true }
```

---

## 错误响应格式

所有接口错误均返回：

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

| HTTP状态码 | 说明 |
|-----------|------|
| 400 | 参数错误 |
| 401 | 未认证或Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |
| 503 | 服务未配置（如WX_APP_ID未设置） |
