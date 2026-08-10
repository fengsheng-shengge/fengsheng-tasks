# 迭代变更清单 · V3.0.2 · 2026-08-02

> 承接 V3.0.1（8-02 客户档案回归），本轮在 V3.0 分支 `feat/mp-v3-curation-prep-20260801` 上提交。

## 触发背景
- 用户反馈「客户档案还是不能用」→ V3.0.1 已修；用户接着问「新建入口在哪」、「示例客户可以灰化只做参考吗」
- 用户紧接着要求「删光示例」、「自定义删除弹窗（不依赖系统模态框）」

## A 批（P1·体验一致）
- **A-1 删除客户改自定义弹窗**（`pages/clients/index.vue`）
  - 删除原 `uni.showModal` 流程，改成自定义 modal-mask 组件（template + script + style）
  - 弹出文案保留原意（带客户名 + "此操作不可恢复"）；不再依赖系统模态框
  - **真机/H5 一致可用**：规避 uni Web 版 `showModal` 的 `Cannot set properties of null (setting 'scrollTop')` 框架缺陷（之前只能靠真机原生 modal 跳过）
  - delClient 改名为 askDel 以更准确；保留兼容转发 `delClient→askDel`
- **A-2 「清空示例」一键按钮 + sample-bar**（`pages/clients/index.vue`）
  - 列表上方加一条 sample-bar（仅 `hasSamples` 时显示）
  - 文案：`示例客户仅供演示参考 · 点击可清空`
  - 按钮：`清空示例` 描边灰胶囊
  - 复用自定义弹窗做"清空"二次确认，文案动态显示当前示例数（`将删除全部 N 张示例客户（真实客户不受影响）。确定？`）

## B 批（P1·数据正确）
- **B-1 store 新增 clearSamples()**（`store/user.js`）
  - 仅过滤 `!c.seed` 的客户，真实客户不动
  - 返回删除数量（toast 用）
  - _persist() 一次性同步 clients/seeded
- **B-2 store 新增 `_initialized` 标记 + 修复 onShow 兜底 seed 竞态**（`store/user.js` + `pages/clients/index.vue`）
  - **根因**：App.vue `onShow` 延迟 200ms 才调 `initFromStorage`，但 `pages/clients` 的 `onShow` 兜底 seed 守卫 (`!seeded && empty → seedClients`) 会在用户切到该 tab 时立即触发，命中尚未初始化的 `seeded=false` 状态 → **reload 后旧示例被自动重新塞回**（实测到 localStorage id 变化，确认是重新 seed）
  - **修复**：在 state 增 `_initialized: false`；`initFromStorage` 末尾 `this._initialized = true`；客户档案页 onShow 守卫补 `_initialized` 条件
  - **效果**：T6/T8 测试通过 — 清空示例后 reload 不再回弹，删光后 reload 仍空态（"已 seed 过则不再塞回"的本意现在真正成立）

## C 批（P0·送审门槛）
- mp-weixin 已重建（`MP_EXIT=0`），资源扫描无 >200K 文件（送审铁律过关）
- 静态校验：template/script/style 三段标签 1:1:1 配对，无遗漏

## 验证（Playwright + Chromium 真渲染·H5）
- T1 冷启动 seed 4 张 + 灰化 + sample-bar 显示 ✅
- T2 新建真实客户 → 总数 5、真实在前、sample-bar 仍在 ✅
- T3 编辑真实客户 → 名字持久化 ✅
- **T4 自定义删除弹窗在 H5 可点通**（删除示例客户）✅ — 本次修复前无法在 H5 验证
- T5 清空示例 → 剩真实客户，sample-bar 消失 ✅
- **T6 reload 后真实客户保留，示例不回弹** ✅ — 本次修复的竞态问题
- T7 删光真实客户 → 空态大卡片 ✅
- **T8 reload 后仍空态、不回弹** ✅
- 业务控制台错误：0（3 条 `scrollTop` 为 uni H5 预览专属框架噪声，真机原生 toast 不触发）

## 真机需要做的（人工）
- 微信开发者工具真机预览 `dist/build/mp-weixin`：
  1. 列表上方应可见「示例客户…·点击可清空」+「清空示例」按钮
  2. 删任意客户 → 弹出中文原生样式确认框（自定义弹窗，与系统 modal 视觉一致）
  3. 点清空示例 → 弹出确认框显示剩余示例张数 → 确定 → 真实客户保留，示例消失，sample-bar 消失

## 产物
- 测试报告：`outputs/clients_test_report_20260802.md`
- 截图：
  - `outputs/clients_fix/list_with_samplebar.png`
  - `outputs/clients_fix/delete_custom_modal.png`
  - `outputs/clients_fix/clear_samples_modal.png`
- 代码：即将提交（请见 commit 列表）