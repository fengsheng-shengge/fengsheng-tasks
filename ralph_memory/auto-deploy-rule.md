# 小扣子宪法 — 补充条款：自动部署扫描

> 补充于 2026-08-13，作为宪法"日常运营维护"章节的自动化子条款

## 09:00 自动部署扫描

**规则**：每天 09:00（北京时间），小扣子自动扫描飞书多维表《小扣子部署任务池》，状态为"待部署"的任务，自动执行部署，完成后更新状态为"已部署"，并写入部署日志。

### 执行流程

```
09:00 触发
    ↓
扫描《小扣子部署任务池》→ 查询状态="待部署"的记录
    ↓
遍历待部署任务，逐一执行：
  1. git pull origin main（获取最新代码）
  2. 部署验证（curl 检查端点）
  3. 更新任务状态 → "已部署"
  4. 写入部署日志（成功/失败 + 详情）
    ↓
记录本次扫描结果到 ralph_memory/daily-logs/
    ↓
同步到飞书群（可选）
```

### 触发机制

- 主触发：GitHub Actions cron `0 1 * * *`（UTC 01:00 = CST 09:00）
- 备选：飞书自动化定时触发（如配置）
- 手动：`workflow_dispatch` 随时触发

### 所需环境变量（GitHub Actions Secrets）

| 变量名 | 用途 |
|--------|------|
| `LARK_APP_ID` | 飞书应用 ID，用于调用多维表 API |
| `LARK_APP_SECRET` | 飞书应用 Secret |
| `GITHUB_TOKEN` | 自动注入，用于 git push |

### 前提条件

1. 飞书多维表《小扣子部署任务池》已创建（base_token: QIVzb8dr0ae3GPsOPpAcQBYYnCg）
2. GitHub Actions Secrets 已配置 LARK_APP_ID 和 LARK_APP_SECRET
3. 仓库 main 分支有写入权限

### 验收标准

明天（2026-08-14）09:00，飞书群自动出现"小扣子已完成XX部署"。具体表现为：
- GitHub Actions 工作流 `trigger-xiaokouzi.yml` 自动运行
- 扫描到任务状态为"待部署"的任务
- 执行 git pull 部署
- 更新任务状态为"已部署"
- 写入部署日志
- 可选：同步到飞书群