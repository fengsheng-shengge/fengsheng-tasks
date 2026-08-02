# 客户档案全面测试报告 · V3.0.2 · 2026-08-02

> 工具：Playwright + Chromium（本地 H5 真渲染）+ 静态校验
> 范围：V3.0.1 客户档案回归 + V3.0.2 自定义删除/清空示例/_initialized 修复
> 目标产物：`fs-mini-program/dist/build/{h5, mp-weixin}`

## 一、测试用例与结果

| # | 用例 | 预期 | 实测 | 结果 |
|---|---|---|---|---|
| T1 | 冷启动 seed + 灰化 + sample-bar 显示 | 4 张示例 + 4 个「示例」角标 + 1 条 sample-bar | TOTAL=4 SAMPLE=4 BAR=1 | ✅ PASS |
| T2 | 新建真实客户 | 总数 5、真实在前、sample-bar 仍在 | TOTAL=5 FIRST_IS_SAMPLE=false | ✅ PASS |
| T3 | 编辑真实客户 → 名字持久化 | "赵先生改后" | FIRST_NAME="赵先生改后" | ✅ PASS |
| T4 | **自定义删除弹窗在 H5 可点通** | modal 显示 + 关闭 + 总数-1 + 示例-1 | MODAL_SHOWN=1 GONE=0 TOTAL=4 SAMPLE=3 | ✅ PASS |
| T5 | **清空示例保留真实客户** | 总数 1、真实名在前、sample-bar 消失 | TOTAL=1 SAMPLE=0 BAR=0 FIRST="赵先生改后" | ✅ PASS |
| T6 | **reload 不回弹示例** | 仍 1 真实、sample-bar 不出现 | TOTAL=1 BAR=0 FIRST="赵先生改后" | ✅ PASS |
| T7 | 删光真实客户 → 空态大卡片 | .empty 渲染 | EMPTY_SHOWN=1 | ✅ PASS |
| T8 | **reload 后空态保持、不回弹** | 总数 0、empty 显示 | TOTAL=0 EMPTY=1 | ✅ PASS |
| 错误 | 控制台业务错误 | 0 | 0（3 条 `scrollTop` 为 H5-only 良性） | ✅ PASS |

## 二、本轮发现并修复的真问题

### ① 自定义弹窗替代 `uni.showModal`（修复）
**现象**：uni Web 版 `showModal` 在确认按钮点击后抛 `Cannot set properties of null (setting 'scrollTop')`，回调中断，弹窗不关、删除不执行。WeChat 真机用的是原生 modal 不受影响。
**修复**：模板新增 `modal-mask` 组件，`askDel(c)` / `askClear()` 复用同一确认弹窗。
**验证**：T4 在 H5 自动化中首次可点通删除（之前不可能）。

### ② 客户档案 `onShow` 兜底 seed 与 `initFromStorage` 的竞态（修复）
**现象**：App.vue `onShow` 用 `setTimeout(safeInit, 200)` 延迟初始化，但客户档案页 `onShow` 的兜底 seed 守卫 `!seeded && empty → seedClients` 在用户切到该 tab 时立刻执行，命中尚未初始化的 `seeded=false`，把示例又塞回去一次（localStorage 中 id 时间戳证明确实重新 seed）。
**修复**：store 增加 `_initialized` 标记（`initFromStorage` 末尾置 `true`），页面守卫补 `_initialized` 条件。
**验证**：T6（清空示例后 reload 不回弹）、T8（删光后 reload 仍空态）均通过。

### ③ 控制台 `scrollTop` 噪声（已归类·非应用问题）
**现象**：uni H5 `showToast` 在某些浏览器下访问 `null.scrollTop` 抛错。
**结论**：仅 H5 预览出现；WeChat 真机为原生 toast，无此错误；不影响业务。

## 三、铁律合规

| 项 | 要求 | 实测 |
|---|---|---|
| 静态校验 | template/script/style 标签 1:1:1 | 通过 |
| mp-weixin 资源 ≤200K | `find ... -size +204800c` 无输出 | 0 个 |
| libVersion 锁 2.32.3 | uni 编译后强制重写 project.config.json | 通过 |
| 控制台业务错误 | 0 | 0 |
| 操纵性词 | grep 命中"钩子/策略/转化" | 0 |

## 四、产物
- 截图（已归档 `outputs/clients_fix/`）：
  - `list_with_samplebar.png` 列表页+清空示例栏
  - `delete_custom_modal.png` 自定义删除确认弹窗
  - `clear_samples_modal.png` 自定义清空示例确认弹窗（动态显示 3 张）
- 测试脚本：`/tmp/clients_full2.cjs`
- 构建产物：
  - H5：`fs-mini-program/dist/build/h5`
  - mp-weixin：`fs-mini-program/dist/build/mp-weixin`