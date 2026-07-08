#!/usr/bin/env python3
"""
每小时检查 GitHub Issue #42，提取 Cloudflare 部署凭证。

执行流程：
  1. 调 GitHub API 读取 Issue #42 全部评论
  2. 过滤"小鱼儿 / xiao-yu-er / Coze"标识的最新回复
  3. 正则提取 Account ID 和 API Token
  4. 与 .agent/memory/deploy_progress.json 比对，避免重复触发
  5. 写入仓库 GitHub Secrets（CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN）
  6. 触发 .github/workflows/deploy.yml（workflow_dispatch）
  7. 在 Issue 下回复凭证摘要（脱敏）

环境变量：
  GH_TOKEN / GITHUB_TOKEN        必填，GitHub PAT（需 repo + actions 权限）
  GITHUB_REPO_OWNER              默认 fengsheng-shengge
  GITHUB_REPO_NAME               默认 fengsheng-tasks
  ISSUE_NUMBER                   默认 42
  DEPLOY_WORKFLOW                默认 deploy.yml
  DRY_RUN                        默认 1（不写 Secrets、不触发 deploy）

退出码：
  0 = FOUND_READY / FOUND_DEPLOYED / NOT_FOUND
  2 = ERROR
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
    r"(?:API\s*Token|api[_\- ]?token|API_TOKEN|CF_API_TOKEN|Cloudflare\s*Token)\s*[:=]\s*[`'\" ]?([A-Za-z0-9_\-]{40})[`'\" ]?",
    re.IGNORECASE,
)

MEMORY_DIR = Path(".agent") / "memory"
STATE_FILE = MEMORY_DIR / "deploy_progress.json"


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

    comments, status, err = list_all_comments(token)
    if status != 200:
        log(f"ERROR: list comments failed: {status} {err}")
        return 2

    log(f"total comments: {len(comments)}")

    state = load_state()
    last_status = state.get("last_status", "NEVER_RUN")
    log(f"last_status = {last_status}")

    candidates = [c for c in comments if is_xiaoyuer(c)]
    log(f"xiaoyuer comments found: {len(candidates)}")

    if not candidates:
        state["last_status"] = "NOT_FOUND"
        save_state(state)
        log("NOT_FOUND: no xiaoyuer comment with credentials")
        return 0

    candidates.sort(key=lambda c: c.get("created_at", ""))
    latest = candidates[-1]
    body = latest.get("body", "")
    created_at = latest.get("created_at", "")
    comment_id = latest.get("id", "")

    log(f"latest xiaoyuer comment: id={comment_id}, created={created_at}")

    creds = extract_credentials(body)
    if not creds:
        log("NOT_FOUND: credentials not found in xiaoyuer comment")
        state["last_status"] = "NOT_FOUND"
        save_state(state)
        return 0

    account_id = creds["account_id"]
    api_token = creds["api_token"]
    creds_hash = f"{account_id[:8]}-{len(api_token)}"

    log(f"FOUND: account_id={mask(account_id)}, api_token={mask(api_token)}")

    if state.get("deployed_hash") == creds_hash and last_status == "FOUND_DEPLOYED":
        log("FOUND_DEPLOYED: same credentials already deployed, skip")
        return 0

    if DRY_RUN:
        log("DRY_RUN=1: skip writing secrets and triggering deploy")
        state["last_status"] = "FOUND_READY"
        state["deployed_hash"] = creds_hash
        state["comments_seen"].append(comment_id)
        save_state(state)
        return 0

    log("writing CLOUDFLARE_ACCOUNT_ID to secrets...")
    ok, msg = upsert_secret(token, "CLOUDFLARE_ACCOUNT_ID", account_id)
    if not ok:
        log(f"ERROR: upsert CLOUDFLARE_ACCOUNT_ID failed: {msg}")
        return 2
    log("OK: CLOUDFLARE_ACCOUNT_ID updated")

    log("writing CLOUDFLARE_API_TOKEN to secrets...")
    ok, msg = upsert_secret(token, "CLOUDFLARE_API_TOKEN", api_token)
    if not ok:
        log(f"ERROR: upsert CLOUDFLARE_API_TOKEN failed: {msg}")
        return 2
    log("OK: CLOUDFLARE_API_TOKEN updated")

    log("triggering deploy workflow...")
    status, resp = trigger_deploy(token)
    if status not in (200, 204):
        log(f"ERROR: trigger deploy failed: {status} {resp}")
        return 2
    log("OK: deploy workflow triggered")

    comment_body = f"""
## 🔐 凭证已收到并配置完成

**检测来源**：小鱼儿的评论（{created_at}）

**脱敏凭证**：
- Account ID: `{mask(account_id)}`
- API Token: `{mask(api_token)}`

**执行结果**：
- ✅ CLOUDFLARE_ACCOUNT_ID 已写入 GitHub Secrets
- ✅ CLOUDFLARE_API_TOKEN 已写入 GitHub Secrets
- ✅ 已触发 deploy.yml 部署流水线

部署完成后可访问：https://fengsheng.tech
"""
    status, resp = add_comment(token, comment_body)
    if status != 201:
        log(f"WARN: add comment failed: {status} {resp}")

    state["last_status"] = "FOUND_DEPLOYED"
    state["deployed_hash"] = creds_hash
    state["comments_seen"].append(comment_id)
    save_state(state)

    log("FOUND_DEPLOYED: all done")
    return 0


if __name__ == "__main__":
    sys.exit(main())