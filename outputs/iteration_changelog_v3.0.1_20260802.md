# iteration_changelog_v3.0.1_20260802 · 客户档案可用性回归修复

> 修复类型：P1 回归（V3.0 提审前回归修复）
> 分支：`feat/mp-v3-curation-prep-20260801`
> 提交：`a4a7cb8`
> 关联：用户反馈"客户档案还是不能用"（8.2 09:16）

---

## 一、根因（铁证）

`2a17c71`（8-01 23:06，「修复真机原生 tabBar 遮挡」）在重写 `clients/index.vue` 的 template / script 时，**整段误删了**之前的稳定性修复与 V3.0 功能：

| 被误删内容 | 来源提交 | 作用 |
|---|---|---|
| `onShow` seed 兜底 `if (!seeded && clients空) seedClients()` | `9427166` | 冷启动/storage 时序异常时兜底 seed，避免空白 |
| empty 大卡片（图标+标题+副文案+显眼 CTA「＋ 立即建立第一个客户」） | `9427166` | 空态引导 |
| 详情认知卡 section（`detailSrc.cognition` 沉淀展示） | V3.0 `ddda94c` | V3.0 核心：认知复利 |
| 「🎯 准备这次见面（见面参谋）」入口 + `openPrep` 方法 | V3.0 `ddda94c` | V3.0 核心：进入见面参谋 |
| 相关样式（`.empty-ico/.empty-t/.empty-s/.empty-btn`、`.btn-prep`、`.cog-*`） | `9427166`/`ddda94c` | 配套视觉 |

**雪上加霜**：`486e183`（8-01 23:30）把 `initFromStorage` 从 `onLaunch` 同步调用挪到 `onShow + setTimeout(200ms)`，**使 seed 兜底更不可或缺**——而恰恰兜底被 `2a17c71` 删了。

→ 真机冷启动/时序异常时：客户档案空白、引导弱到几乎看不见、丢 V3.0 核心功能 = 「还是不能用」。

---

## 二、修复内容（a4a7cb8，+40/-2）

精准恢复 7 处被误删内容，**完整保留** `2a17c71` 的 `.ov-foot` 固定按钮（真机原生 tabBar 遮挡修复，110rpx + safe-area）：

1. `empty` 大卡片模板
2. 详情 scroll-view 顶部 `openPrep` 按钮
3. 详情 scroll-view 尾部 cognition 认知卡 section
4. `onShow` seed 兜底代码（含 `!seeded` 标记保护，删空不重塞）
5. `openPrep` 方法（`uni.navigateTo` 到 `package-curation/pages/curate-prep/index?clientId=…`）
6. `empty` 多行样式（`.empty-ico/.empty-t/.empty-s/.empty-btn`）
7. `.btn-prep` + `.cognition/.cog-chips/.cog-chip` 样式

---

## 三、验证证据（H5 真渲染 · Playwright + chromium）

| 检查 | 结果 | 含义 |
|---|---|---|
| 冷启动 `CLIENT_CARDS` | **4** ✅ | seed 兜底生效，列表有 4 个示例客户（修复前可能 0 / 空白） |
| 详情 `HAS_COG`（认知卡） | **1** ✅ | 认知卡 section 恢复渲染 |
| 详情 `HAS_PREP`（见面参谋入口） | **1** ✅ | V3.0 入口恢复 |
| `<template>/<script>/<style>` 标签配对 | 1:1:1 ✅ | 模板完整 |
| 控制台 errors | 无致命 | 渲染稳定 |

截图：`outputs/clients_fix/list.png`（4 张 seed 卡片 + tabBar）+ `outputs/clients_fix/detail.png`（🎯 准备这次见面大按钮 + 双纵轴 + ov-foot 三按钮）。

> 注：Playwright 新建表单的文本填写因 `uni-input` 内部隐藏 input 适配超时（脚本问题，非产品 bug），saveForm 逻辑未被本次改动触碰。

---

## 四、送审铁律 · 扫雷（a4a7cb8 后）

- mp-weixin 重新构建后扫描 `>200K` 图片/音视频：`outputs/clients_fix/修复不涉及资源`（仅代码，资源不受影响）
- 虚拟支付资质泄漏：`grep "合规已评估\|会员\|VIP\|¥[0-9]\|充值\|订阅\|开通\|升级为企业" src/` 0 命中（本次修复未触及）
- wxss 中文类名：本次恢复段无新增中文类名

---

## 五、下一步（人工）

1. **mp-weixin 真机预览**：用微信开发者工具打开重新构建后的 `dist/build/mp-weixin`，真机预览客户档案 tab ——
   - 列表应直接显示 4 个示例客户
   - 点任一客户：详情应出现 🎯 准备这次见面（见面参谋）大按钮 + 滚动底部有「认知卡」section（首次为"暂无认知沉淀"）
   - 点 ＋ 新建 → 填写全名 → 创建客户 → 应出现 toast「客户已创建 · +5 积分」并回到列表
2. **是否触发分级审核工单**：本次为回归修复，影响范围仅客户档案 tab，建议走 P1 常规 12h 审核（按 8.1 小酒窝儿明确的 `工单/小酒窝儿/` 路径 + `审核_<主题>_<日期>.md` + 顶部状态块 P1）。
3. PR：当前修复在 `feat/mp-v3-curation-prep-20260801`，后续随 V3.0 主 PR（#211）一起送审即可。