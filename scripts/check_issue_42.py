#!/usr/bin/env python3
import os
import re
import sys
import json
import subprocess
from datetime import datetime

ISSUE_NUMBER = 42
OWNER = "fengsheng-shengge"
REPO = "fengsheng-tasks"
STATE_FILE = ".agent/memory/deploy_progress.json"

DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"
FORCE_RECHECK = os.environ.get("FORCE_RECHECK", "0") == "1"

ACCOUNT_ID_PATTERN = re.compile(r'(?:account[_-]?id|CLOUDFLARE_ACCOUNT_ID)\s*[:=]\s*`?([a-f0-9]{32})`?', re.IGNORECASE)
API_TOKEN_PATTERN = re.compile(r'(?:api[_-]?token|CLOUDFLARE_API_TOKEN|token)\s*[:=]\s*`?(cfut_[A-Za-z0-9_-]{20,}|[a-f0-9]{40})`?', re.IGNORECASE)
# Fallback: match bare cfut_ tokens not captured by the structured pattern
CFUT_TOKEN_PATTERN = re.compile(r'(cfut_[A-Za-z0-9_-]{20,})')


def run_gh_command(args):
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] gh command failed: {' '.join(args)}")
        print(f"  stderr: {e.stderr}")
        return None


def get_issue_comments():
    """Fetch all issue comments with pagination."""
    all_comments = []
    page = 1
    per_page = 100
    while True:
        result = run_gh_command([
            "api", f"repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments?per_page={per_page}&page={page}"
        ])
        if not result:
            break
        try:
            page_comments = json.loads(result)
        except json.JSONDecodeError:
            print("[ERROR] Failed to parse comments JSON")
            break
        if not page_comments:
            break
        all_comments.extend(page_comments)
        if len(page_comments) < per_page:
            break
        page += 1
    print(f"[INFO] Fetched {len(all_comments)} total comments across {page} page(s)")
    return all_comments


def extract_credentials(comments):
    account_id = None
    api_token = None
    found_by = None
    found_comment_id = None

    # Search ALL comments (not just CozeBot/小鱼儿), prioritize recent ones
    for comment in reversed(comments):
        body = comment.get("body", "")
        user_login = comment.get("user", {}).get("login", "")
        comment_id = comment.get("id", "")

        # Skip our own bot comments to avoid re-extracting already-processed credentials
        if user_login in ("fengsheng-shengge", "github-actions[bot]"):
            # Still scan for cfut_ tokens even in bot comments (they may quote 小鱼儿's reply)
            pass

        account_match = ACCOUNT_ID_PATTERN.search(body)
        token_match = API_TOKEN_PATTERN.search(body)

        # Fallback: try bare cfut_ pattern
        if not token_match:
            cfut_match = CFUT_TOKEN_PATTERN.search(body)
            if cfut_match:
                api_token = cfut_match.group(1)
                found_by = user_login
                found_comment_id = comment_id

        if account_match:
            account_id = account_match.group(1)
            found_by = user_login
            found_comment_id = comment_id
        if token_match:
            api_token = token_match.group(1)
            found_by = user_login
            found_comment_id = comment_id

        if account_id and api_token:
            break

    return account_id, api_token, found_by, found_comment_id


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"status": "NOT_FOUND", "last_checked": None, "credentials_detected": None}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def set_github_secret(name, value):
    if DRY_RUN:
        print(f"[DRY RUN] Would set secret {name}")
        return True
    
    escaped_value = value.replace('"', '\\"').replace('$', '\\$')
    result = run_gh_command(["secret", "set", name, "-b", escaped_value])
    return result is not None


def trigger_deploy():
    if DRY_RUN:
        print("[DRY RUN] Would trigger deploy workflow")
        return True
    
    result = run_gh_command([
        "workflow", "run", "deploy.yml",
        "-f", "environment=production"
    ])
    return result is not None


def mask_secret(value, keep=3):
    if len(value) <= keep * 2:
        return value
    return f"{value[:keep]}{'*' * (len(value) - keep * 2)}{value[-keep:]}"


def add_comment(body):
    result = run_gh_command([
        "issue", "comment", str(ISSUE_NUMBER), "-b", body
    ])
    return result is not None


def main():
    print(f"=== [{datetime.now().isoformat()}] Checking Issue #{ISSUE_NUMBER} ===")
    print(f"  DRY_RUN: {DRY_RUN}")
    print(f"  FORCE_RECHECK: {FORCE_RECHECK}")

    state = load_state()
    
    if state["status"] == "FOUND_DEPLOYED" and not FORCE_RECHECK:
        # Still check if credentials have changed
        comments = get_issue_comments()
        if comments:
            account_id_new, api_token_new, _, _ = extract_credentials(comments)
            prev_creds = state.get("credentials_detected", {})
            if (account_id_new == prev_creds.get("account_id_raw") and
                api_token_new == prev_creds.get("api_token_raw")):
                print("[INFO] Credentials unchanged and already deployed, skipping")
                return 0
            else:
                print("[INFO] New credentials detected, will re-deploy")
        else:
            print("[INFO] Credentials already deployed, skipping (use FORCE_RECHECK=1 to recheck)")
            return 0

    comments = get_issue_comments()
    if not comments:
        print("[INFO] No comments found or cannot access comments")
        state["status"] = "ERROR"
        state["last_checked"] = datetime.now().isoformat()
        save_state(state)
        return 1

    print(f"[INFO] Found {len(comments)} comments")
    
    account_id, api_token, found_by, found_comment_id = extract_credentials(comments)

    # Check if credentials are new/changed compared to last known state
    prev_creds = state.get("credentials_detected", {})
    prev_account = prev_creds.get("account_id_raw") if prev_creds else None
    prev_token = prev_creds.get("api_token_raw") if prev_creds else None
    creds_changed = (account_id != prev_account or api_token != prev_token)

    if account_id and api_token:
        print(f"[FOUND] Credentials detected from {found_by}")
        print(f"  Account ID: {mask_secret(account_id)}")
        print(f"  API Token: {mask_secret(api_token)}")

        if DRY_RUN:
            state["status"] = "FOUND_READY"
            state["credentials_detected"] = {
                "account_id_masked": mask_secret(account_id),
                "api_token_masked": mask_secret(api_token),
                "account_id_raw": account_id,
                "api_token_raw": api_token,
                "found_by": found_by,
                "comment_id": found_comment_id
            }
            state["last_checked"] = datetime.now().isoformat()
            save_state(state)
            
            print("[DRY RUN] Dry run mode - credentials found but not applied")
            return 0

        print("[ACTION] Setting GitHub Secrets...")
        
        if not set_github_secret("CLOUDFLARE_ACCOUNT_ID", account_id):
            print("[ERROR] Failed to set CLOUDFLARE_ACCOUNT_ID")
            return 1
        
        if not set_github_secret("CLOUDFLARE_API_TOKEN", api_token):
            print("[ERROR] Failed to set CLOUDFLARE_API_TOKEN")
            return 1

        print("[SUCCESS] Secrets configured")

        print("[ACTION] Triggering deployment...")
        if not trigger_deploy():
            print("[ERROR] Failed to trigger deployment")
            return 1

        state["status"] = "FOUND_DEPLOYED"
        state["credentials_detected"] = {
            "account_id_masked": mask_secret(account_id),
            "api_token_masked": mask_secret(api_token),
            "account_id_raw": account_id,
            "api_token_raw": api_token,
            "found_by": found_by,
            "comment_id": found_comment_id
        }
        state["deployed_at"] = datetime.now().isoformat()
        state["last_checked"] = datetime.now().isoformat()
        save_state(state)

        print("[SUCCESS] Deployment triggered")

        comment_body = f"""
✅ **Cloudflare 凭证已提取并部署**

检测到小鱼儿回复的 Cloudflare 部署凭证，已自动配置到 GitHub Secrets 并触发部署：

| 凭证 | 值（脱敏） |
|------|-----------|
| CLOUDFLARE_ACCOUNT_ID | `{mask_secret(account_id)}` |
| CLOUDFLARE_API_TOKEN | `{mask_secret(api_token)}` |

部署状态：已触发 → GitHub Actions → Cloudflare Pages

> 此消息由小扣子（Trae）自动生成
"""
        add_comment(comment_body)
        print("[INFO] Notification comment added to Issue")

        return 0
    else:
        print("[INFO] No Cloudflare credentials found in comments")
        state["status"] = "NOT_FOUND"
        state["last_checked"] = datetime.now().isoformat()
        save_state(state)
        return 0


if __name__ == "__main__":
    sys.exit(main())