# V3.0.7.1 修复报告 · chip 70vh 竖条带
**日期**：2026.8.2 19:09 · **commit**：2729b52 · **zip**：outputs/mp-weixin-v3.0.7.1-20260802.zip（768486 字节/92 文件）

## 用户反馈
"@image 这个正常吗？" 截图：知识底座"业务词典" tab 下，绿色"全部"chip 占据左半屏高度的圆角矩形，"签约前 429""签约中 150"两个浅色 chip 同样被拉成竖向长条；chip 下方整片空白，579 条真实词条列表完全看不见。

## 根因诊断（双重叠加）

### 根因 A · V3.0.7 漏修 chip 70vh bug
- 知识页用 `<scroll-view scroll-x enable-flex class="dict-chips">` 包裹 chip 区
- 但 `.dict-chips` CSS 缺 `align-items:center`，scroll-view 也没 `style="height:auto"`
- 真机上 scroll-view 默认撑满父容器（几乎 viewport 全高），3 个 chip 在里面被 flex 拉成 70vh 高的"长条"
- 后果：词条列表 `.dict-list` 被 chip 推出可视区
- **memory 里早就有这条 bug 修法**（line 34），但只覆盖了老 `.chips` 类名，V3.0.7 新加的 `.dict-chips` 漏掉

### 根因 B · 用户手机跑的不是 V3.0.7
- 截图里搜索框 placeholder 是"按搜索: 手价 / 公允梁 / 价 / 中继 / 起约"——早期版本文案
- V3.0.7 的 placeholder 已是"搜词条：学区 / 公积金 / 产权 / 甲醛 / 违约…"
- 词条"手价/公允梁/中继"是早期数据，不是 V3.0.7 的 579 条新版
- 故"客户档案页不行"+"知识页不行"根因都是同一件事——用户手机仍跑 V3.0.4 之前的旧包

## 修复方案

### 改法 1 · App.vue 全局（根治）
- `.chips{...;height:auto}` 全局加 height:auto
- `.chip{...;align-self:center;height:auto;...}` 全局加 align-self:center + height:auto
- **一次改、永久免疫**——任何 page 用 `class="chips"` 或 `class="dict-chips"` 等命名都自动防 bug
- cases/index.vue 的两处 scroll-x 用全局类，自动同步修复（之前也漏了，会同样中招）

### 改法 2 · knowledge/index.vue 局部（兜底）
- `<scroll-view ... class="dict-chips" style="height:auto">` 局部加 height:auto
- `.dict-chips{align-items:center}` + `.dict-chips .chip{align-self:center;height:auto}` 局部加
- 兼容非全局继承路径（局部 scope 隔离）

### 改法 3 · MEMORY 铁律更新
- line 34 推广为"全局根治法"，去掉"用局部 scoped 覆盖"的临时修法
- 新加 chip 类名（dict-chips/cases-chips 等）**自动免疫**，不用每次记

## 编译产物验证（已 6/6 通过）
```
=== compiled scroll-view tag ===
<scroll-view scroll-x="true" enable-flex class="dict-chips data-v-adac068d" style="height:auto">
=== compiled .dict-chips css ===
.dict-chips.data-v-adac068d{white-space:nowrap;display:flex;gap:8px;margin-bottom:12px;align-items:center}
=== compiled .dict-chips .chip css ===
.dict-chips .chip.data-v-adac068d{align-self:center;height:auto}
=== global .chips ===
.chips{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:2px 0 4px;height:auto}
=== global .chip ===
.chip{flex-shrink:0;align-self:center;height:auto;background:var(--card);...}
=== version ===
APP_VERSION="3.0.7.1"
```

## 送审铁律 5 项全过
| 检查 | 结果 |
|---|---|
| 资源单文件 ≤200K | ✅ 0 命中 |
| 虚拟支付泄漏 | ✅ 0 命中 |
| 跨包 require 错误 | ✅ 0 命中（entries_slim 已在主包 utils/） |
| 主包 < 2M | ✅ 1.6M（余量 400K） |
| wxss 类名无中文 | ✅ 0 命中 |

## 待用户真机验证（必经步骤 · 沙箱无法替代）
1. 微信开发者工具导入 `outputs/mp-weixin-v3.0.7.1-20260802.zip`（解包后是 dist/build/mp-weixin）
2. 真机预览 → 底部"我的"页确认**显示"风声 v3.0.7.1"**（若仍显示 v3.0.7 或更早，说明手机仍跑旧包，需删除小程序重扫体验码）
3. 进"知识"tab → "业务词典"子 tab → 验证：
   - 3 个 chip（全部/签约前 429/签约中 150）是横向并排的"小药丸"形状（不是长条形）
   - chip 下方能看到词条卡片列表（"第一次买房要注意什么"等 579 条）
4. 再进"客户档案"tab → 验证"＋ 新建"按钮可弹出浮层、保存客户

## 诚实边界
- 沙箱内 H5 走查（Playwright）受代理限制无法出真渲染截图，已用编译产物 grep 替代验证（6/6 通过）
- 真机原生效（H5 走 webview 渲染，看不出 scroll-view 撑满父容器的真机表现）——chip 修复在真机上的视觉效果必须用户闭环
- 若真机版本号 v3.0.7.1 + chip 仍拉长条，请发真机 Console 截图（按 vConsole）
