# 🧠 风声记忆系统 | ralph_memory

> 本目录是风声项目记忆系统的持久化存储层。
> Wiki 存储 P0 级主子信息（战略级），本目录存储完整细节（战术级）。
> 两者通过 GitHub Actions 每日自动同步。

## 目录结构

```
ralph_memory/
├── README.md               # 本文件 — 记忆系统入口
├── p0-master-info.md       # P0 主子信息（同步到 Wiki）
├── memory-evolution.md     # 记忆进化方法论（同步到 Wiki）
├── team-roles.md           # 团队角色与协作规则
├── project-state.md        # 项目当前状态
├── decisions.md            # 关键决策记录
├── technical-notes.md      # 技术沉淀
├── daily-logs/             # 每日协作日志（由 Actions 自动生成）
│   ├── 2026-08-13.md
│   └── ...
└── _sync/                  # 同步暂存区（由 Actions 管理）
    └── wiki-sync.md
```

## 记忆分层

| 层级 | 存储位置 | 内容 | 更新频率 |
|------|----------|------|----------|
| **P0 主子信息** | Wiki + `p0-master-info.md` | 项目定位、团队、宪法、技术栈 | 手动（战略变更时） |
| **P1 协作日志** | `daily-logs/` | 每日部署、Issue、PR、决策 | 每日自动（Actions） |
| **P2 详细参考** | 其他 `.md` 文件 | 技术细节、角色说明、决策背景 | 按需更新 |

## 记忆固化流程

```
P1 协作内容（Issues/PRs/Commits）
        ↓
GitHub Actions（每日 21:00 CST）
        ↓
ralph_memory/daily-logs/YYYY-MM-DD.md
        ↓
关键信息提取 → 更新 p0-master-info.md
        ↓
推送到 main → 同步到 Wiki
```

## 验收标准

新对话中询问"昨天小扣子部署了什么"，应从 `daily-logs/` 的对应日期文件中准确回答。