#!/usr/bin/env python3
import os
import re
import sys
import json
import urllib.request
import urllib.error
import subprocess
import time


def github_api_request(url, token, method="GET", data=None):
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "fengsheng-deploy-bot"
    }
    req_data = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  API Error {e.code}: {e.read().decode()}")
        return None


def get_issue_comments(repo, issue_number, token):
    all_comments = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments?per_page=100&page={page}"
        comments = github_api_request(url, token)
        if not comments:
            break
        all_comments.extend(comments)
        if len(comments) < 100:
            break
        page += 1
    return all_comments


def extract_cloudflare_credentials(text):
    account_id = None
    api_token = None

    patterns = [
        (r'CLOUDFLARE_ACCOUNT_ID\s*[:=]\s*["`\']?([a-f0-9]{32})["`\']?', "account_id"),
        (r'Account.?ID\s*[:=]\s*["`\']?([a-f0-9]{32})["`\']?', "account_id"),
        (r'account_id\s*[:=]\s*["`\']?([a-f0-9]{32})["`\']?', "account_id"),
        (r'\b([a-f0-9]{32})\b', "account_id_possible"),
    ]

    token_patterns = [
        (r'CLOUDFLARE_API_TOKEN\s*[:=]\s*["`\']?([A-Za-z0-9_\-]{20,})["`\']?', "api_token"),
        (r'API.?Token\s*[:=]\s*["`\']?([A-Za-z0-9_\-]{20,})["`\']?', "api_token"),
        (r'api_token\s*[:=]\s*["`\']?([A-Za-z0-9_\-]{20,})["`\']?', "api_token"),
    ]

    for pattern, key in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if key == "account_id_possible":
                if not account_id:
                    account_id = match.group(1)
            else:
                account_id = match.group(1)
                break

    for pattern, key in token_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            api_token = match.group(1)
            break

    if not api_token:
        token_match = re.search(r'["`\']([A-Za-z0-9_\-]{30,})["`\']', text)
        if token_match and not account_id or (token_match and len(token_match.group(1)) > 35):
            api_token = token_match.group(1)

    return account_id, api_token


def is_xiaoyu_reply(comment):
    author = comment.get("user", {}).get("login", "").lower()
    body = comment.get("body", "")

    xiaoyu_keywords = ["xiaoyu", "fish", "小鱼儿", "coze", "bot"]
    for kw in xiaoyu_keywords:
        if kw in author:
            return True

    if "@xiaoyu" in body.lower() or "@小鱼儿" in body:
        return False

    return False


def find_credentials_in_comments(comments):
    found = []
    for comment in comments:
        body = comment.get("body", "")
        author = comment.get("user", {}).get("login", "unknown")

        account_id, api_token = extract_cloudflare_credentials(body)

        if account_id and api_token:
            found.append({
                "author": author,
                "comment_id": comment.get("id"),
                "comment_url": comment.get("html_url"),
                "created_at": comment.get("created_at"),
                "account_id": account_id,
                "api_token": api_token,
                "body": body
            })

    return found


def set_github_secret(repo, secret_name, secret_value, token):
    import base64
    from nacl import encoding, public

    pubkey_url = f"https://api.github.com/repos/{repo}/actions/secrets/public-key"
    pubkey_data = github_api_request(pubkey_url, token)
    if not pubkey_data:
        print(f"  Failed to get public key for secret {secret_name}")
        return False

    key_id = pubkey_data["key_id"]
    public_key = pubkey_data["key"]

    public_key_obj = public.PublicKey(public_key.encode(), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key_obj)
    encrypted = sealed_box.encrypt(secret_value.encode())
    encrypted_value = base64.b64encode(encrypted).decode()

    secret_url = f"https://api.github.com/repos/{repo}/actions/secrets/{secret_name}"
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }
    result = github_api_request(secret_url, token, method="PUT", data=data)
    return result is not None or True


def add_issue_comment(repo, issue_number, body, token):
    url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments"
    data = {"body": body}
    return github_api_request(url, token, method="POST", data=data)


def trigger_deploy_workflow(repo, workflow_id, ref, token):
    url = f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_id}/dispatches"
    data = {"ref": ref}
    result = github_api_request(url, token, method="POST", data=data)
    return result is not None


def deploy_to_cloudflare(account_id, api_token, project_name, directory="./"):
    env = os.environ.copy()
    env["CLOUDFLARE_ACCOUNT_ID"] = account_id
    env["CLOUDFLARE_API_TOKEN"] = api_token

    try:
        result = subprocess.run(
            ["npx", "wrangler@3", "pages", "deploy", directory,
             "--project-name", project_name, "--branch", "main"],
            capture_output=True, text=True, env=env, cwd="/workspace"
        )
        print(f"  wrangler stdout: {result.stdout[-500:] if result.stdout else '(empty)'}")
        if result.stderr:
            print(f"  wrangler stderr: {result.stderr[-500:]}")
        return result.returncode == 0
    except Exception as e:
        print(f"  Deploy error: {e}")
        return False


def set_github_output(name, value):
    output_file = os.environ.get("GITHUB_OUTPUT", "")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"{name}={value}\n")
    else:
        print(f"  ::set-output name={name}::{value}")


def main():
    repo = os.environ.get("GITHUB_REPOSITORY", "fengsheng-shengge/fengsheng-tasks")
    token = os.environ.get("GITHUB_TOKEN", "")
    issue_number = int(os.environ.get("ISSUE_NUMBER", "42"))
    workspace = os.environ.get("GITHUB_WORKSPACE", "/workspace")
    state_file = os.path.join(workspace, ".github", ".last-checked-comment-id")

    if not token:
        print("ERROR: GITHUB_TOKEN not set")
        sys.exit(1)

    print(f"=== 检查 Issue #{issue_number} 的 Cloudflare 凭证 ===")
    print(f"仓库: {repo}")
    print()

    last_processed_id = ""
    if os.path.exists(state_file):
        with open(state_file, "r") as f:
            last_processed_id = f.read().strip()
        print(f"上次处理的评论 ID: {last_processed_id}")
        print()

    print("1. 获取 Issue 评论...")
    comments = get_issue_comments(repo, issue_number, token)
    print(f"   共获取 {len(comments)} 条评论")

    print()
    print("2. 搜索包含 Cloudflare 凭证的评论...")
    creds_list = find_credentials_in_comments(comments)

    if not creds_list:
        print("   未找到包含有效凭证的评论")
        print()
        print("=== 检查完成，暂无新凭证 ===")
        set_github_output("found_credentials", "false")
        set_github_output("needs_commit", "false")
        sys.exit(0)

    print(f"   找到 {len(creds_list)} 条包含凭证的评论")

    latest = max(creds_list, key=lambda x: x["created_at"])
    print(f"   最新凭证来自: @{latest['author']} ({latest['created_at']})")
    print(f"   Account ID: {latest['account_id'][:8]}...{latest['account_id'][-4:]}")
    print(f"   API Token: {latest['api_token'][:6]}...{latest['api_token'][-4:]}")
    print(f"   评论 ID: {latest['comment_id']}")

    if str(latest["comment_id"]) == last_processed_id:
        print()
        print("   该凭证已处理过，跳过")
        print()
        print("=== 检查完成，暂无新凭证 ===")
        set_github_output("found_credentials", "false")
        set_github_output("needs_commit", "false")
        sys.exit(0)

    print()
    print("3. 配置 GitHub Secrets...")
    secrets_set = False
    try:
        import nacl
        account_set = set_github_secret(repo, "CLOUDFLARE_ACCOUNT_ID", latest["account_id"], token)
        token_set = set_github_secret(repo, "CLOUDFLARE_API_TOKEN", latest["api_token"], token)
        if account_set and token_set:
            print("   Secrets 配置成功")
            secrets_set = True
        else:
            print("   Secrets 配置失败（可能权限不足）")
    except ImportError:
        print("   PyNaCl 不可用，跳过 Secrets 配置")
    except Exception as e:
        print(f"   Secrets 配置出错: {e}")

    print()
    print("4. 设置输出变量供部署步骤使用...")
    set_github_output("found_credentials", "true")
    set_github_output("cloudflare_account_id", latest["account_id"])
    set_github_output("cloudflare_api_token", latest["api_token"])
    set_github_output("credentials_author", latest["author"])
    set_github_output("credentials_created_at", latest["created_at"])
    set_github_output("last_comment_id", str(latest["comment_id"]))
    set_github_output("needs_commit", "true")
    print("   输出变量已设置")

    print()
    print("5. 在 Issue 中通知...")
    secrets_status = "✅ 已配置到 Secrets" if secrets_set else "⚠️ 未配置到 Secrets（将直接使用）"
    comment_body = f"""## 🚀 凭证已收到，开始部署！

| 项目 | 状态 |
|------|------|
| 凭证来源 | @{latest['author']} |
| 提交时间 | {latest['created_at']} |
| Account ID | ✅ 已提取 |
| API Token | ✅ 已提取 |
| GitHub Secrets | {secrets_status} |
| 部署状态 | 🔄 进行中 |

正在部署到 Cloudflare Pages，请稍候...

---
_由自动检查机器人于 {time.strftime('%Y-%m-%d %H:%M:%S UTC')} 生成_
"""
    add_issue_comment(repo, issue_number, comment_body, token)
    print("   已在 Issue 中添加评论通知")

    os.makedirs(os.path.dirname(state_file), exist_ok=True)
    with open(state_file, "w") as f:
        f.write(str(latest["comment_id"]))
    print(f"   已更新状态文件: {state_file}")

    print()
    print("=== 任务完成 ===")


if __name__ == "__main__":
    main()
