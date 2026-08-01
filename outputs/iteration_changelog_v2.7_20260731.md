# 风声小程序 V2.7 迭代清单（tabBar 重组 · 知识三模块 · 客户档案提 tab）

> 分支：`feat/mp-vpay-safe-iter-20260731`（在 V2.6 已规避虚拟支付基础上继续）
> 提审目标：微信小程序 mp-weixin
> 生成日期：2026-07-31

## 一、背景与产品意图

用户明确建议：
1. 把「案例」放进「知识」里（避免与知识割裂、也腾出 tab 位）；
2. 把「测评」也放进「知识」里；
3. 把「客户档案」从次级页提升为底部 tab。

最终架构定型——**知识页内分三个模块（词典 / 测评 / 案例），客户档案提升为 tab**：

- 新 tabBar（5 项，符合微信 ≤5 硬限制）：`首页 / 知识(词典·测评·案例) / 策展 / 客户档案 / 我的`
- 案例页、测评页 → 降级为非 tab 页（从知识页对应模块进入，逻辑保留、分享/深链不变）。

## 二、优化改进 + 新增功能清单

| 模块 | 解决啥 | 做了啥 | 验收状态 |
|---|---|---|---|
| `pages.json` | tabBar 已满 5 项（含案例），客户档案被挤出 | 移除 `pages/cases/index` tab，新增 `pages/clients/index` tab；顺序：首页/知识/策展/客户档案/我的 | ✅ 编译后 app.json 已确认 5 项正确 |
| `pages/knowledge/index.vue` | 知识只放词典，案例/测评散落 | 顶部加分段控件（业务词典 / 品质测评 / 案例灵感）三模块：词典=原 7 域 104 条网格；测评=住得好7维+服务者5维两张卡+「开始测评」→navigateTo assess；案例=前 3 条可展开预览+「查看全部（按类型/场景筛选）」→navigateTo cases | ✅ 三模块字符串已进构建产物 |
| `pages/clients/index.vue` | 提为 tab 后无法 URL 带参，首页「今日跟进」直达失效 | 新增 `onShow` 读 `userStore.focusClientId` → 打开对应客户详情后清空；保留 `onLoad` 的 `query.focus` 兜底 | ✅ 逻辑闭环 |
| `store/user.js` | tabBar 页无法 URL 带参 | state 新增 `focusClientId: null`（首页写、clients 读） | ✅ |
| `pages/home/index.vue` | 导航判定过时（clients 原为非 tab） | `go()` 改为 tab 白名单判定（home/knowledge/curate/clients/profile→switchTab；assess/cases→navigateTo）；`goFollowup` 改为写 `focusClientId` + `switchTab` | ✅ |
| `pages/profile/index.vue` | 菜单「客户档案/案例」导航可能静默失败 | `go()`：cases→navigateTo；clients/curate→switchTab | ✅ |
| `pages/curate/index.vue` | `goClients` 用 navigateTo 到已成为 tab 的 clients | 改为 `switchTab`（注释同步） | ✅ |
| `src/static/hero1·2·4.png` | 违反送审资源 ≤200K 铁律（原 336K/292K/241K） | `sips -Z 750` 重压缩至 152K/124K/128K（hero3 48K 不动） | ✅ 资源复扫 0 超标 |

## 三、验证

- 双端构建 `build:mp-weixin` + `build:h5` 均 **DONE · 0 警告**。
- 虚拟支付泄漏扫描（`会员/VIP/充值/订阅/付费/解锁/积分商城/合规已评估/免费养成期/积分直购/主体升级/¥[0-9]`）**src + dist(mp-weixin) + dist(h5) 0 真实命中**（hero*.png 为二进制误报）。
- 资源体积扫描（单文件 ≤200K）：**0 超标**。
- 编译后 tabBar = 首页/知识/策展/客户档案/我的；知识页三模块字符串（业务词典/品质测评/案例灵感）已进 wxml/wxss。

## 四、送审待办

- 本端 GitHub 连接器可用 → PR 经 `mcp__github__create_pull_request` 创建（标题：fix(小程序): V2.7 tabBar 重组 + 知识三模块 + 客户档案提 tab）。
- PR 评论「请小酒窝儿审核」；合并请 **小鱼儿** 确认。
- 飞书群 `oc_68714b732f740d284e51268ba1b65614` 同步清单。
- 真机预览需人工跑微信开发者工具（本环境无法启动 devtools）。

## 五、未动项（非本轮范围，按需另排）

- v4data.js 中 `casesData` 仍带 `unlocked/cost` 死字段（真代码已按全免费实现，不再读取）；
- 网站端（fengsheng.tech）尚未同步本次 tab 重组（仅小程序端）；
- `outputs/mini-program/` 设计样本目录在本会话间被清理，V2.6 样本修改（去除虚拟支付/人才字典等）需择机重做并重新提审基线。
