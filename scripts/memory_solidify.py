#!/usr/bin/env python3
"""
小扣子每日记忆固化脚本
每天 21:00 CST 自动运行，收集 P1 协作内容到 ralph_memory/daily-logs/
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone, timedelta

# 脚本所在目录的父目录 = 仓库根目录
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OWNER = "fengsheng-shengge"
REPO = "fengsheng-tasks"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

def github_api(endpoint):
    """调用 GitHub API"""
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/{endpoint}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    req = urllib.request.Request(url, headers=headers)
    return json.loads(urllib.request.urlopen(req).read())

def main():
    today = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")
    print(f"记忆固化 · {today}")

    # 1. 获取今日 Issues
    issues = github_api("issues?state=all&since=2026-08-12T21:00:00Z&per_page=30")
    issue_lines = []
    for i in issues:
        issue_lines.append(f"- [{i['state']}] #{i['number']} {i['title']}")

    # 2. 获取今日 PRs
    prs = github_api("pulls?state=all&per_page=30")
    pr_lines = []
    for p in prs:
        pr_lines.append(f"- [{p['state']}] !#{p['number']} {p['title']}")

    # 3. 获取今日 Commits
    commits = github_api("commits?since=2026-08-12T21:00:00Z&per_page=30")
    commit_lines = []
    for c in commits:
        msg = c['commit']['message'].split('\n')[0]
        author = c['commit']['author']['name']
        commit_lines.append(f"- {author}: {msg[:80]}")

    # 4. 生成日志
    log = f"""# {today} 日常日志

> 由小扣子记忆固化系统自动生成

## GitHub Issues

{'无更新' if not issue_lines else chr(10).join(issue_lines)}

## Pull Requests

{'无更新' if not pr_lines else chr(10).join(pr_lines)}

## Git 提交

{'无更新' if not commit_lines else chr(10).join(commit_lines)}

## 部署记录

（待双闸门齐全后记录）

---

> 自动生成于 {datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')}
"""

    # 5. 写入文件
    log_dir = os.path.join(REPO_ROOT, "ralph_memory", "daily-logs")
    log_path = os.path.join(log_dir, f"{today}.md")
    os.makedirs(log_dir, exist_ok=True)
    with open(log_path, "w") as f:
        f.write(log)

    print(f"日志已写入: {log_path}")

    # 6. Git 提交
    subprocess.run(["git", "-C", REPO_ROOT, "add", "ralph_memory/"], capture_output=True)
    result = subprocess.run(
        ["git", "-C", REPO_ROOT, "commit", "-m", f"记忆固化: {today}"],
        capture_output=True, text=True
    )
    if "nothing to commit" in result.stdout:
        print("无变更，无需提交")
    else:
        subprocess.run(["git", "-C", REPO_ROOT, "push", "origin", "main"], capture_output=True)
        print("已提交并推送")

if __name__ == "__main__":
    main()