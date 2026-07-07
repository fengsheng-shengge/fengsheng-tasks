#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
MEMORY_DIR = WORKSPACE / ".agent" / "memory"
STATE_FILE = MEMORY_DIR / "deploy_progress.json"

OWNER = os.environ.get("GITHUB_REPO_OWNER", "fengsheng-shengge")
REPO = os.environ.get("GITHUB_REPO_NAME", "fengsheng-tasks")
ISSUE_NUMBER = int(os.environ.get("ISSUE_NUMBER", "42"))
DEPLOY_WORKFLOW = os.environ.get("DEPLOY_WORKFLOW", "deploy.yml")
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"

API_BASE = "https://api.github.com"
API_VERSION = "2022-11-28"

# 小鱼儿的多种可能标识
XIAOYUER_MARKERS = (
    "小鱼儿",
    "xiao-yu-er",
    "xiaoyuer",
    "coze-bot",
    "coze",
    "coze_bot",
    "i-am-xiaoyuer",
)

# 提取规则：Account ID 是 32 位 hex；API Token 是 40 字符的 base64-ish（含 _-）
RE_ACCOUNT_ID = re.compile(
    r"(?:Account\s*ID|account_id|accountId|AccountID|CF_ACCOUNT_ID)\s*[:=]\s*[`'\"]?([0-9a-f]{32})[`'\"]?",
    re.IGNORECASE,
)
RE_API_TOKEN = re.compile(
    r"(?:API\s*Token|api[_\- ]?token|API_TOKEN|CF_API_TOKEN|Cloudflare\s*Token)\s*[:=]\s*[`'\"]?([A-Za-z0-9_\-]{40})[`'\"]?",
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
    """分页拿全 Issue 评论。"""
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
    """通过 Public Key 加密方式写入仓库 Secret。"""
    status, key_payload = gh_request(
        "GET", f"{API_BASE}/repos/{OWNER}/{REPO}/actions/secrets/public-key", token
    )
    if status != 200 or "key" not in key_payload:
        return False, f"public-key failed: {status} {key_payload}"

    try:
        from nacl import encoding, public  # type: ignore

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

    log(f"target = {OWNER}/{REPO}#{ISSUE_NUMBER}, dry_run = {DRY_RUN}, deploy_workflow = {DEPLOY_WORKFLOW}")

    state = load_state()
    comments, status, err = list_all_comments(token)
    if status != 200:
        log(f"ERROR: list comments failed: {status} {err}")
        return 2

    log(f"comments fetched = {len(comments)}")

    candidates = [c for c in comments if is_xiaoyuer(c)]
    if not candidates:
        log("STATUS = NOT_FOUND（未识别到小鱼儿的回复）")
        state["last_status"] = "NOT_FOUND"
        state["last_check_at"] = int(time.time())
        state["comments_seen"] = [c.get("id") for c in comments]
        save_state(state)
        return 0

    chosen = None
    creds = None
    for c in reversed(candidates):
        result = extract_credentials(c.get("body") or "")
        if result:
            chosen = c
            creds = result
            break

    if not creds:
        log("STATUS = NOT_FOUND（小鱼儿有回复，但未匹配到 Account ID / API Token 模式）")
        state["last_status"] = "NOT_FOUND"
        state["last_check_at"] = int(time.time())
        state["comments_seen"] = [c.get("id") for c in comments]
        save_state(state)
        return 0

    log(
        "FOUND: account_id="
        f"{mask(creds['account_id'])} token={mask(creds['api_token'])} from comment_id={chosen.get('id')}"
    )

    deploy_hash = f"{creds['account_id']}:{creds['api_token']}"
    if state.get("deployed_hash") == deploy_hash and state.get("last_status") == "FOUND_DEPLOYED":
        log("STATUS = FOUND_DEPLOYED（凭证已部署过，跳过）")
        return 0

    if DRY_RUN:
        log("DRY_RUN=1，跳过写 Secrets 和触发 deploy")
        state["last_status"] = "FOUND_READY"
        state["last_check_at"] = int(time.time())
        state["deployed_hash"] = None
        state["comments_seen"] = [c.get("id") for c in comments]
        save_state(state)
        return 0

    ok1, msg1 = upsert_secret(token, "CLOUDFLARE_ACCOUNT_ID", creds["account_id"])
    ok2, msg2 = upsert_secret(token, "CLOUDFLARE_API_TOKEN", creds["api_token"])
    log(f"secret CLOUDFLARE_ACCOUNT_ID: {ok1} ({msg1})")
    log(f"secret CLOUDFLARE_API_TOKEN: {ok2} ({msg2})")
    if not (ok1 and ok2):
        state["last_status"] = "ERROR"
        save_state(state)
        return 2

    dep_status, dep_resp = trigger_deploy(token)
    log(f"dispatch deploy: {dep_status} {dep_resp}")

    add_comment(
        token,
        f"✅ 小扣子已自动配置 Cloudflare Secrets 并触发 `{DEPLOY_WORKFLOW}`。\n\n"
        f"- Account ID: `{mask(creds['account_id'])}`\n"
        f"- API Token: `{mask(creds['api_token'])}`\n"
        f"- 来源评论: #{chosen.get('id')}\n\n部署完成后会自动更新本 Issue。",
    )

    if dep_status == 204:
        state["last_status"] = "FOUND_DEPLOYED"
        state["deployed_hash"] = deploy_hash
    else:
        state["last_status"] = "FOUND_READY"

    state["last_check_at"] = int(time.time())
    state["comments_seen"] = [c.get("id") for c in comments]
    save_state(state)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        import traceback

        traceback.print_exc()
        sys.exit(2)
