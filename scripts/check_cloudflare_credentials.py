#!/usr/bin/env python3
"""
检查 GitHub Issue #42 评论，提取小鱼儿回复的 Cloudflare 部署凭证。

用法：
  python scripts/check_cloudflare_credentials.py \
    --repo fengsheng-shengge/fengsheng-tasks \
    --issue 42 \
    --coze-marker "小鱼儿|Coze|扣子" \
    --output /tmp/cred_result.json

凭证格式检测：
  - Account ID: 32位十六进制字符串 (如 820ba2e413a24c5b9e0f6d1a7c3b8e5d)
  - API Token: 以 cfat_ 或 v4. 开头的长字符串
  - 也支持 key=value 或 key: value 格式
"""

import argparse
import json
import os
import re
import subprocess
import sys
from typing import Optional


def run_gh_api(endpoint: str, repo: str) -> list:
    """调用 gh api 获取 Issue 评论"""
    cmd = ["gh", "api", f"repos/{repo}/issues/{endpoint}?per_page=100&sort=created&direction=desc"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"::error::gh api 调用失败: {result.stderr}", file=sys.stderr)
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        # 尝试分页获取更多评论
        all_comments = []
        page = 1
        while True:
            cmd = ["gh", "api", f"repos/{repo}/issues/{endpoint}?per_page=100&page={page}&sort=created&direction=desc"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0 or not result.stdout.strip():
                break
            comments = json.loads(result.stdout)
            if not comments:
                break
            all_comments.extend(comments)
            if len(comments) < 100:
                break
            page += 1
        return all_comments


def extract_account_id(text: str) -> Optional[str]:
    """从文本中提取 Cloudflare Account ID (32位hex)"""
    # 格式1: Account ID: xxx / account_id=xxx / accountId: xxx
    patterns_explicit = [
        r'(?:Account\s*ID|ACCOUNT_ID|account_id|accountId)[:\s=]+([0-9a-f]{32})',
        r'(?:Account\s*ID|ACCOUNT_ID|account_id|accountId)[:\s=]+([0-9a-fA-F]{32})',
    ]
    for pat in patterns_explicit:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).lower()

    # 格式2: 代码块中的 32位hex
    patterns_codeblock = [
        r'```\s*\n.*?([0-9a-f]{32}).*?\n\s*```',
        r'`([0-9a-f]{32})`',
    ]
    for pat in patterns_codeblock:
        m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
        if m:
            return m.group(1).lower()

    return None


def extract_api_token(text: str) -> Optional[str]:
    """从文本中提取 Cloudflare API Token"""
    # 格式1: API Token: xxx / api_token=xxx / CLOUDFLARE_API_TOKEN=xxx
    patterns_explicit = [
        r'(?:API\s*Token|API_TOKEN|api_token|CLOUDFLARE_API_TOKEN)[:\s=]+([A-Za-z0-9_\-.]{30,})',
    ]
    for pat in patterns_explicit:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)

    # 格式2: Cloudflare token 格式 cfat_xxx 或 v4.xxx
    patterns_cf = [
        r'(cfat_[A-Za-z0-9_\-.]{30,})',
        r'(v4\.[A-Za-z0-9_\-.]{30,})',
    ]
    for pat in patterns_cf:
        m = re.search(pat, text)
        if m:
            return m.group(1)

    # 格式3: 代码块中的长token
    patterns_codeblock = [
        r'```\s*\n.*?(cfat_[A-Za-z0-9_\-.]{30,}).*?\n\s*```',
        r'```\s*\n.*?(v4\.[A-Za-z0-9_\-.]{30,}).*?\n\s*```',
        r'`(cfat_[A-Za-z0-9_\-.]{30,})`',
        r'`(v4\.[A-Za-z0-9_\-.]{30,})`',
    ]
    for pat in patterns_codeblock:
        m = re.search(pat, text, re.DOTALL)
        if m:
            return m.group(1)

    return None


def is_coze_comment(body: str, username: str, coze_markers: list[str]) -> bool:
    """判断评论是否来自小鱼儿/Coze"""
    markers_lower = [m.lower() for m in coze_markers]
    # 检查用户名
    for marker in markers_lower:
        if marker in username.lower():
            return True
    # 检查评论内容中的标记
    for marker in markers_lower:
        if marker in body.lower():
            return True
    return False


def main():
    parser = argparse.ArgumentParser(description="检查 Issue #42 中的 Cloudflare 凭证")
    parser.add_argument("--repo", required=True, help="GitHub 仓库 (owner/repo)")
    parser.add_argument("--issue", type=int, required=True, help="Issue 编号")
    parser.add_argument("--coze-marker", default="小鱼儿|Coze|扣子|🤖|🐟", help="小鱼儿标记（|分隔）")
    parser.add_argument("--output", default="/tmp/cred_result.json", help="输出 JSON 文件路径")
    parser.add_argument("--force", default="false", help="强制重处理")
    args = parser.parse_args()

    coze_markers = [m.strip() for m in args.coze_marker.split("|") if m.strip()]
    repo = args.repo
    issue_num = args.issue

    result = {
        "has_credentials": "false",
        "account_id": "",
        "api_token": "",
        "comment_id": "",
        "comment_author": "",
        "format": "",
        "error": "",
    }

    print(f"🔍 检查 Issue #{issue_num} 中的 Cloudflare 凭证...")
    print(f"  仓库: {repo}")
    print(f"  小鱼儿标记: {coze_markers}")

    # 获取评论
    comments = run_gh_api(f"{issue_num}/comments", repo)
    if not comments:
        result["error"] = "无法获取评论或评论为空"
        print(f"  ⚠️ {result['error']}")
        with open(args.output, "w") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        # 写 GITHUB_OUTPUT
        write_github_output(result)
        return

    print(f"  共 {len(comments)} 条评论")

    # 从最新评论开始检查
    for comment in comments:
        body = comment.get("body", "")
        username = comment.get("user", {}).get("login", "")
        comment_id = comment.get("id", "")

        # 检查是否是小鱼儿的评论（或包含小鱼儿标记的评论）
        is_coze = is_coze_comment(body, username, coze_markers)

        # 提取凭证（不限小鱼儿，任何包含凭证格式的评论都检查）
        account_id = extract_account_id(body)
        api_token = extract_api_token(body)

        if account_id and api_token:
            print(f"  ✅ 在 @{username} 的评论 #{comment_id} 中找到完整凭证！")
            print(f"    Account ID: {account_id[:8]}...{account_id[-4:]}")
            print(f"    API Token: {api_token[:8]}...{api_token[-4:]}")
            result.update({
                "has_credentials": "true",
                "account_id": account_id,
                "api_token": api_token,
                "comment_id": str(comment_id),
                "comment_author": username,
                "format": "auto-extracted" if is_coze else "manual-extracted",
            })
            break

        # 部分匹配也记录
        if account_id and not result.get("account_id"):
            print(f"  📝 在 @{username} 的评论中找到 Account ID（缺少 API Token）")
            result["account_id"] = account_id
            result["comment_id"] = str(comment_id)
            result["comment_author"] = username
        if api_token and not result.get("api_token"):
            print(f"  📝 在 @{username} 的评论中找到 API Token（缺少 Account ID）")
            result["api_token"] = api_token
            if not result["comment_id"]:
                result["comment_id"] = str(comment_id)
                result["comment_author"] = username

    if result["has_credentials"] != "true":
        if result["account_id"] or result["api_token"]:
            result["error"] = "部分凭证已找到，但不完整（需要同时有 Account ID 和 API Token）"
            print(f"  ⚠️ {result['error']}")
        else:
            result["error"] = "暂未发现包含凭证的评论"
            print(f"  ⏳ {result['error']}，下次继续检查。")

    # 写入结果文件
    with open(args.output, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n结果已写入 {args.output}")

    # 写 GITHUB_OUTPUT
    write_github_output(result)


def write_github_output(result: dict):
    """写入 GitHub Actions 输出变量"""
    github_output = os.environ.get("GITHUB_OUTPUT", "")
    if github_output:
        with open(github_output, "a") as f:
            for key in ["has_credentials", "account_id", "api_token", "comment_id", "comment_author", "format", "error"]:
                f.write(f"{key}={result.get(key, '')}\n")
        print("GITHUB_OUTPUT 已写入")


if __name__ == "__main__":
    main()
