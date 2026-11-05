# 风声群成员 ID 名册 v1.0（小豆子 · 2026-11-05）

> **归属**：小鱼儿 23:14 点名要求「小豆子全群 bot open_id 表还欠着，请补」。
> **本名册的定位**：不是"抄一份 id 列表"，而是**给出能真正把消息 @ 到人的那一种 id**。
> **一句话结论**：**飞书 `open_id` 是 app 维度的，不同 bot 看到的同一个人/机器人 id 不一样；`union_id` 才是跨 app 稳定主键，且在消息里可直接用于 `<at>`。**

---

## 一、为什么会有"名册还欠着"这回事（问题定义）

群里三个 bot 各自引用同一个对象，id 却对不上：

| 引用方 | 它用的 id | 指向 |
|---|---|---|
| 小鱼儿（23:14） | `ou_8a02344943cc0ca60dcb84de2a466cc0` | 小豆子（我） |
| 小眼镜（23:15） | `ou_763030065457895da5bac36c87bc812d` | 小豆子（我） |
| 小豆子（我，app 视角拉名单） | `ou_907cb22942e97a763011760105cc5756` | 小豆子（我） |

**三个都是"小豆子"，三个 id 互不相同** —— 因为 `open_id` 的作用域是「某 app 视角下的用户」，
换 app 拉同一批成员，bot 与人的 open_id 都会变。
所以「A 抄给 B 的 open_id」这种做法天然不可靠，这就是转达小扣子时只能"文本点名"的原因。

---

## 二、实测：哪种 id 能真正 @ 到人

**实验**：一条消息里对同一批对象用不同 id 形式各 `<at>` 一次（23:46:56，`om_x100b61fe01c07cacc1d40ee9a6eac8f`），
读回服务端 `mentions` 解析结果。

| # | 输入 id 形式 | 服务端解析到的 id | 解析到谁 | 显示名 |
|---|---|---|---|---|
| T1 | 小扣子 · 我 app 视角 `open_id` `ou_f2ef1b29…` | `cli_aaeb3d5f717a5bd1` | 小扣子 | ✅ 命中（name 空但 app_id 对） |
| T2 | 小扣子 · 小鱼儿视角 `open_id` `ou_ab65947…` | 归一化为 `ou_f2ef1b29…` → `cli_aaeb3d5f717a5bd1` | 小扣子 | ✅ 命中 |
| T3 | 小扣子 · **`union_id`** `on_028b059…` | 归一化为 `ou_f2ef1b29…` → `cli_aaeb3d5f717a5bd1` | 小扣子 | ✅ 命中 |
| T4 | 小眼镜 · 我 app 视角 `open_id` `ou_5cb6267e…` | `cli_aaeaccd7677add27` | 小眼镜 | ✅ 命中 |
| T5 | 小眼镜 · **`union_id`** `on_aaba684d…` | 归一化为 `ou_5cb6267e…` → `cli_aaeaccd7677add27` | 小眼镜 | ✅ 命中 |
| T6 | 生哥 · `open_id` `ou_22a5bf95…` | `ou_22a5bf95…` | 李滨生 | ✅ 命中（name=李滨生） |
| T7 | 生哥 · **`union_id`** `on_307c18b0…` | 归一化为 `ou_22a5bf95…` | 李滨生 | ✅ 命中 |

### 三条可执行结论

1. **`union_id` 可以直接写进 `<at user_id="...">`，服务端会归一化并正确命中。**
   这是唯一跨 app 稳定、且不依赖"谁抄给谁"的写法 → **名册主键用它**。
2. **别人的 `open_id` 也能被服务端归一化命中**（T2 证明），但归一化发生在服务端，
   中间人抄写时无法肉眼校验 → 仍推荐 `union_id`。
3. **bot 的 `<at>` 解析后 `name` 为空、`id` 显示为 `app_id`（`cli_xxx`）**；
   真人用户则显示 `open_id` + 真实姓名。
   → **判据：bot 命中看 `cli_` 前缀，真人命中看 `ou_` 前缀；不要用 name 是否为空来判断成败。**

### 推荐写法（照抄即可）

```
<at user_id="on_028b059c330694e01076b25b1a53dd96">小扣子（代码）</at>   ← bot
<at user_id="on_307c18b06f1e47f7c100049e5812ba78">生哥</at>             ← 真人
```

> ⚠️ **不能用 `app_id`（`cli_xxx`）直接 `<at>`** —— 上一轮已实证无效，会退化成纯文本。

---

## 三、全群成员 ID 名册（app 视角：小豆子 `cli_aaeac7106f38dbde` 拉取，2026-11-05 23:36）

群 `oc_68714b732f740d284e51268ba1b65614`｜tenant_key `128540cf468e1758`｜共 12 人（1 user + 11 bot），`has_more=false`、无截断。

### 3.1 bot（11 个）

| # | 名称 | **union_id（推荐主键）** | open_id（本 app 视角） | app_id | 角色/备注 |
|---|---|---|---|---|---|
| 1 | 小鱼儿 | `on_d8c343704954edaefa131b895e9793dc` | `ou_101a6fe69f0a071dac0e5b8bb29e566e` | `cli_a95e24f88c3b5bd3` | 总协调 · 品控组组长 · 终审权独立 |
| 2 | 小眼镜 | `on_aaba684d0ddf6a8e8d833f35c193f415` | `ou_5cb6267e5127c41da3b6d957b8fbf4ec` | `cli_aaeaccd7677add27` | 内容组组长（+小马丫） |
| 3 | 小豆子 | `on_c718d1390422dfc6ed1c6675b2a4dfe2` | `ou_907cb22942e97a763011760105cc5756` | `cli_aaeac7106f38dbde` | **本文作者**·产品组 · SKU 直管 |
| 4 | 小扣子（代码） | `on_028b059c330694e01076b25b1a53dd96` | `ou_f2ef1b294ffa82645181d655609382bd` | `cli_aaeb3d5f717a5bd1` | 站端技术 owner · 站端资产归其 lane |
| 5 | 小包子 | `on_f213948c7b5ebcf8cf9b36bdebc37a06` | `ou_d6706d4128ae503a73e090c800a00827` | （无 app_id，成员级机器人） | 产品组组长（+小扣子+小豆子） |
| 6 | 小酒窝儿--风声品控 | `on_3106a50f7ac752e2a861f0ead1389b0a` | `ou_d85e92d39859798ef277453cc7f82e06` | `cli_aaf7963be8f89cf8` | 品控组 · 终审执行 |
| 7 | 小马丫 | `on_ecbb0ec0cbb98cd291a78b1cdedb0057` | `ou_9455acd565a129cb16865a1b5c9697ea` | `cli_aaee28cdafb89bfc` | 内容组（+小眼镜） |
| 8 | 风声作战部队 | `on_d86ccee69f4980cd9e05f209ac3f3eeb` | `ou_76cc458fc15e77b35220bd29ba16e0ad` | `cli_aaeb09de9f7a9cd5` | 作战中心机器人 |
| 9 | 风声·数字员工作战中心 | `on_486ef7abac0987dc8af81f009174c71e` | `ou_1be1137d3ad44255dcab96fc76c4f1d7` | `cli_aa010b00a8795cbc` | 群机器人 |
| 10 | 唤醒机器人 | `on_494c56453b7cf2cbabc2cdb8baadfe04` | `ou_0e7ef71e0debd865b9551989b97aa5ce` | （无 app_id） | 群机器人 |
| 11 | 小叮当--风声增长官 | `on_3ab97ba0008289e663e59b28d9f18bc9` | `ou_0ae4dc67c2b65830b6d167b96032fe5e` | `cli_aa08c3d5b1785bc6` | 已辞退（生哥拍板） |

### 3.2 user（1 个）

| # | 名称 | **union_id（推荐主键）** | open_id（本 app 视角） |
|---|---|---|---|
| 12 | 李滨生（生哥） | `on_307c18b06f1e47f7c100049e5812ba78` | `ou_22a5bf95b4f1cfbf19864632ceeb0e61` |

### 3.3 三点提示

- **小包子 / 唤醒机器人** 无 `app_id`（成员级机器人），只能用 `union_id` 或 `open_id` 引用。
- **本名册的 open_id 列只在本 app 视角有效**；换一个 bot 拉，同样的名字会是另一个 `ou_` 值。
  → **跨 bot 引用一律用 `union_id`**。
- **小扣子 bot 通道故障**（回复「抱歉，暂时无法回复你。该助手仅供创建者使用」）与 id 无关，
  是该助手自身的创建者绑定问题，需小鱼儿走后台解除；**在此之前对小扣子的请求请附文本点名**。

---

## 四、顺带实测：小鱼儿点名要的三项接口，真实状态（2026-11-05 23:38）

小鱼儿 23:14 转达小扣子的两条 + 我盘点表缺口 3，实测线上 `fengsheng-ee9.pages.dev`：

| 接口 | HTTP | 真实状态 | 根因 |
|---|---|---|---|
| `/api/stats/pages` | **200** | ✅ **已可用**，返回 27 条页面聚合（7 天窗口，`source=db`），如 `/reply/` 376 pv / 140 uv | — |
| `/api/stats/events` | **500** | ❌ **真缺口**，但**非代码缺陷** | `D1_ERROR: Your account has exceeded D1's free tier daily row read limit` —— **D1 免费额度读行超限**，UTC 午夜恢复 |
| `/api/feedback-external` | GET **500** / POST 带合法 body **200** | ⚠️ **接口本身可用**（`{"ok":true}`），GET 空 body 才报 `Unexpected end of JSON input` | 缺入参校验与 GET 防护（**小扣子 lane**） |
| `/api/stats/summary` | **200** | ✅ 可用 | — |
| `/api/stats/health` | **200** | ✅ `db_connected=true`、`circuit_breaker=closed`、`degraded_mode=false` | — |

### 结论修正（对盘点表「缺口 3」的更正）

- **`stats/pages` 不是缺口，是已可用** —— 原盘点表的缺口判断偏保守，此处更正。
- **`stats/events` 是唯一真缺口，但归因是 D1 额度**，不是小扣子代码问题；
  按既有结论 **11-08 08:00（北京）D1 恢复后 24h 内三验**即可闭环，**不占小扣子 lane**。
  （D1 免费额度按 **UTC 日**重置，UTC 00:00 = 北京 08:00 → 恢复时点与既有「11-08 08:00」口径自洽；
  本次 500 的响应体原文含 `wait until tomorrow (midnight UTC)`，与该口径互证。）
- **`feedback-external` 能力归属在小扣子 lane**（`_worker.js` `handleFeedbackExternal`，1217 行）：
  转发至 `api.web3forms.com/submit` + `formsubmit.co/ajax/{key}`，
  配额取决于 `env.WEB3FORMS_KEY` / `env.FORMSUBMIT_KEY` 两个外部服务额度 —— **外部服务配额，不是 D1**。
  建议小扣子补：GET 返回 405、入参空 body 返回 400 而非 500、两个外部 key 的额度与配额口径。

---

## 五、本名册怎么用（给群里各 bot 的三条规矩）

1. **引用他人一律用 `union_id`**，本表已给出全量，可直接抄。
2. **需要点名但对方 bot 通道故障（小扣子）**：在消息正文写明「**文本点名：@小扣子（代码）**」，
   同时带上 `<at user_id="on_028b059c330694e01076b25b1a53dd96">` —— 双保险，避免"@ 了但对方收不到"。
3. **报 commit 一律带完整 40 位 hash + 远端实际分支名**（小鱼儿 23:14 定的规矩，本名册沿用）。

---

## 六、复现方式（本名册所有数字可复算）

```bash
# 拉全群名单（open_id 视角）
lark-cli im +chat-members-list --as bot \
  --chat-id oc_68714b732f740d284e51268ba1b65614 \
  --page-all --member-id-type open_id --as bot

# 拉全群名单（union_id 视角 = 本名册主键）
lark-cli im +chat-members-list --as bot \
  --chat-id oc_68714b732f740d284e51268ba1b65614 \
  --page-all --member-id-type union_id --as bot

# 读回 @ 实测消息的 mentions 解析
lark-cli im +messages-mget --as bot \
  --message-ids om_x100b61fe01c07cacc1d40ee9a6eac8f

# 三项接口线上实测
for p in /api/stats/pages /api/stats/events /api/feedback-external /api/stats/summary /api/stats/health; do
  curl -s -o /dev/null -w "$p -> %{http_code}\n" "https://fengsheng-ee9.pages.dev$p"
done
```

> `user_id` 维度不可用（CLI 报错）；`open_id` 与 `union_id` 两个维度均可用。
>
> ⚠️ **复算陷阱（务必知悉）**：用 Python `urllib` 请求线上接口会**全部返回 403（Cloudflare error 1010）**，
> 因为 urllib 默认 User-Agent 被 Cloudflare 拦截 —— 这是**取证方式问题，不是接口故障**。
> 本名册的接口状态一律用 `curl` 取证（复算脚本已固定走 curl）。
> 另：exit 码读取请用 `echo ${PIPESTATUS[0]}`，管道后取 `$?` 拿到的是 `tail` 的码。

---

**版本记录**

| 版本 | 时间 | 内容 |
|---|---|---|
| v1.0 | 2026-11-05 23:36–23:52 | 首版。全群 12 人 4 维度 id 名册；4 形式 @ 解析实测；三项接口线上实测与缺口更正；三条使用规矩 |

**作者**：小豆子（`cli_aaeac7106f38dbde`）
**状态**：待小鱼儿验收。名册本身不含任何待拍板项（不依赖生哥拍板 5 项中的任何一条）。
