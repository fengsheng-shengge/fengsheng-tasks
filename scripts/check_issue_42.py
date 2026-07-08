#!/usr/bin/env python3
"""
每小时检查 GitHub Issue #42，提取 Cloudflare 部署凭证。
"""

import base64
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

OWNER = os.environ.get("GITHUB_REPO_OWNER", "fengsheng-shengge")
REPO = os.environ.get("GITHUB_REPO_NAME", "fengsheng-tasks")
ISSUE_NUMBER = int(os.environ.get("ISSUE_NUMBER", "42"))
DEPLOY_WORKFLOW = os.environ.get("DEPLOY_WORKFLOW", "deploy.yml")
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"

API_BASE = "https://api.github.com"
API_VERSION = "2022-11-28"

MEMORY_DIR = Path(".agent/memory")
STATE_FILE = MEMORY_DIR / "deploy_progress.json"

XIAOYUER_MARKERS = (
    "小鱼儿",
    "xiao-yu-er",
    "xiaoyuer",
    "coze-bot",
    "coze",
    "coze_bot",
    "i-am-xiaoyuer",
)

RE_ACCOUNT_ID = re.compile(
    r"(?:Account\s*ID|account_id|accountId|AccountID|CF_ACCOUNT_ID)\s*[:=]\s*[`'\" ]?([0-9a-f]{32})[`'\" ]?",
    re.IGNORECASE,
)
RE_API_TOKEN = re.compile(
    r"(?:API\s*Token|api[\-_ ]?token|API_TOKEN|CF_API_TOKEN|Cloudflare\s*Token)\s*[:=]\s*[`'\" ]?([A-Za-z0-9\-_]{40})[`'\" ]?",
    re.IGNORECASE,
)


def log(msg: str) -> None:
    print(f"[check-issue-42] {msg}", flush=True)


def mask(value: str, head: int = 3, tail: int = 3) -> str:
    if not value:
        return ""
    if len(value) <= head + tail:
        return "*" * len(value)
    return f"{value[:head]}{'*' * (len(value) - head - tail)}{value[-tail:]}"


def gh_request(method: str, url: str, token: str, body=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "xiaokouzi-trae-hourly-check",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            return resp.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        return e.code, {"message": body_text}


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"last_status": "NEVER_RUN", "deployed_hash": None, "comments_seen": []}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"last_status": "NEVER_RUN", "deployed_hash": None, "comments_seen": []}


def save_state(state: dict) -> None:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def list_all_comments(token: str):
    comments = []
    page = 1
    while True:
        url = f"{API_BASE}/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments?per_page=100&page={page}"
        status, payload = gh_request("GET", url, token)
        if status != 200 or not isinstance(payload, list):
            return comments, status, payload
        comments.extend(payload)
        if len(payload) < 100:
            break
        page += 1
    return comments, 200, None


def is_xiaoyuer(comment: dict) -> bool:
    user = (comment.get("user") or {}).get("login", "") or ""
    body = comment.get("body") or ""
    user_l = user.lower()
    if any(marker.lower() in user_l for marker in XIAOYUER_MARKERS):
        return True
    if any(marker in body[:200] for marker in XIAOYUER_MARKERS):
        return True
    return False


def extract_credentials(body: str):
    account_match = RE_ACCOUNT_ID.search(body)
    token_match = RE_API_TOKEN.search(body)
    if not account_match or not token_match:
        return None
    return {
        "account_id": account_match.group(1),
        "api_token": token_match.group(1),
    }


def upsert_secret(token: str, name: str, value: str):
    status, key_payload = gh_request(
        "GET", f"{API_BASE}/repos/{OWNER}/{REPO}/actions/secrets/public-key", token
    )
    if status != 200 or "key" not in key_payload:
        return False, f"public-key failed: {status} {key_payload}"

    try:
        from nacl import encoding, public
        pk = public.PublicKey(key_payload["key"].encode("utf-8"), encoding.Base64Encoder())
        sealed = public.SealedBox(pk).encrypt(value.encode("utf-8"))
        encrypted = base64.b64encode(sealed).decode("utf-8")
    except Exception as e:
        if DRY_RUN:
            encrypted = "BASE64:" + base64.b64encode(value.encode("utf-8")).decode("utf-8")
        else:
            return False, f"PyNaCl unavailable and DRY_RUN=0: {e}"

    body = {
        "encrypted_value": encrypted,
        "key_id": key_payload["key_id"],
    }
    status, resp = gh_request(
        "PUT",
        f"{API_BASE}/repos/{OWNER}/{REPO}/actions/secrets/{urllib.parse.quote(name)}",
        token,
        body,
    )
    if status in (201, 204):
        return True, "ok"
    return False, f"put-secret failed: {status} {resp}"


def trigger_deploy(token: str):
    url = f"{API_BASE}/repos/{OWNER}/{REPO}/actions/workflows/{DEPLOY_WORKFLOW}/dispatches"
    body = {"ref": "main", "inputs": {"environment": "production"}}
    status, resp = gh_request("POST", url, token, body)
    return status, resp


def add_comment(token: str, body_text: str):
    url = f"{API_BASE}/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments"
    status, resp = gh_request("POST", url, token, {"body": body_text})
    return status, resp


def main() -> int:
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        log("ERROR: GH_TOKEN/GITHUB_TOKEN is required")
        return 2

    log(f"target = {OWNER}/{REPO}#{ISSUE_NUMBER}, dry_run = {DRY_RUN}")

    state = load_state()
    log(f"current state: {state['last_status']}")

    comments, status, err = list_all_comments(token)
    if status != 200:
        log(f"ERROR: list_comments failed: {status} {err}")
        state["last_status"] = "ERROR"
        save_state(state)
        return 2

    log(f"total comments: {len(comments)}")

    valid_comments = []
    for c in comments:
        if is_xiaoyuer(c):
            valid_comments.append(c)

    if not valid_comments:
        log("NOT_FOUND: 未找到小鱼儿的回复")
        state["last_status"] = "NOT_FOUND"
        save_state(state)
        return 0

    log(f"found {len(valid_comments)} 条小鱼儿的回复")

    credentials = None
    latest_comment = None
    for c in reversed(valid_comments):
        body = c.get("body", "")
        creds = extract_credentials(body)
        if creds:
            credentials = creds
            latest_comment = c
            break

    if not credentials:
        log("NOT_FOUND: 小鱼儿的回复中未找到有效凭证")
        state["last_status"] = "NOT_FOUND"
        save_state(state)
        return 0

    log(f"FOUND: account_id={mask(credentials['account_id'])}, api_token={mask(credentials['api_token'])}")

    cred_hash = f"{credentials['account_id'][:8]}..{credentials['api_token'][:8]}"
    if state.get("deployed_hash") == cred_hash:
        log("FOUND_DEPLOYED: 相同凭证已部署过，跳过")
        state["last_status"] = "FOUND_DEPLOYED"
        save_state(state)
        return 0

    if DRY_RUN:
        log("DRY_RUN=1: 跳过写 Secrets 和触发 deploy")
        state["last_status"] = "FOUND_READY"
        state["deployed_hash"] = cred_hash
        save_state(state)
        return 0

    log("开始写入 GitHub Secrets...")
    success, msg = upsert_secret(token, "CLOUDFLARE_ACCOUNT_ID", credentials["account_id"])
    if not success:
        log(f"ERROR: 写入 CLOUDFLARE_ACCOUNT_ID 失败: {msg}")
        state["last_status"] = "ERROR"
        save_state(state)
        return 2
    log("✓ CLOUDFLARE_ACCOUNT_ID 已写入")

    success, msg = upsert_secret(token, "CLOUDFLARE_API_TOKEN", credentials["api_token"])
    if not success:
        log(f"ERROR: 写入 CLOUDFLARE_API_TOKEN 失败: {msg}")
        state["last_status"] = "ERROR"
        save_state(state)
        return 2
    log("✓ CLOUDFLARE_API_TOKEN 已写入")

    log("触发部署 workflow...")
    status, resp = trigger_deploy(token)
    if status != 204:
        log(f"ERROR: 触发 deploy 失败: {status} {resp}")
        state["last_status"] = "ERROR"
        save_state(state)
        return 2
    log("✓ deploy.yml 已触发")

    log("在 Issue 下添加评论...")
    comment_body = (
        f"## ✅ 小扣子已收到凭证并触发部署\n\n"
        f"- **Account ID**: `{mask(credentials['account_id'])}`\n"
        f"- **API Token**: `{mask(credentials['api_token'])}`\n\n"
        f"已写入 GitHub Secrets，部署已触发。请关注 Actions 进度。"
    )
    status, resp = add_comment(token, comment_body)
    if status != 201:
        log(f"WARN: 添加评论失败: {status} {resp}")

    state["last_status"] = "FOUND_DEPLOYED"
    state["deployed_hash"] = cred_hash
    state["deployed_at"] = latest_comment.get("created_at", "") if latest_comment else ""
    save_state(state)
    log("完成！")

    return 0


if __name__ == "__main__":
    sys.exit(main())