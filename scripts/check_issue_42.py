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
import urllib.error
import urllib.parse
import urllib.request

OWNER = os.environ.get("GITHUB_REPO_OWNER", "fengsheng-shengge")
REPO = os.environ.get("GITHUB_REPO_NAME", "fengsheng-tasks")
ISSUE_NUMBER = int(os.environ.get("ISSUE_NUMBER", "42"))
DEPLOY_WORKFLOW = os.environ.get("DEPLOY_WORKFLOW", "deploy.yml")
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"

API_BASE = "https://api.github.com"
API_VERSION = "2022-11-28"

MEMORY_DIR = os.path.join(os.path.dirname(__file__), "..", ".agent", "memory")
STATE_FILE = os.path.join(MEMORY_DIR, "deploy_progress.json")

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

STATE_NOT_FOUND = "NOT_FOUND"
STATE_FOUND_READY = "FOUND_READY"
STATE_FOUND_DEPLOYED = "FOUND_DEPLOYED"
STATE_ERROR = "ERROR"


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
    if not os.path.exists(STATE_FILE):
        return {"state": STATE_NOT_FOUND, "last_checked": None, "account_id_masked": None, "token_masked": None}
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"state": STATE_NOT_FOUND, "last_checked": None, "account_id_masked": None, "token_masked": None}


def save_state(state: dict) -> None:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def list_all_comments(token: str):
    comments = []
    page = 1
    while True:
        url = f"{API_BASE}/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments?per_page=100&page={page}"
        status, payload = gh_request("GET", url, token)
        if status != 200 or not isinstance(payload, list):
            log(f"Failed to fetch comments: HTTP {status}")
            return comments
        comments.extend(payload)
        if len(payload) < 100:
            break
        page += 1
    return comments


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
    import time
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        log("ERROR: GH_TOKEN/GITHUB_TOKEN is required")
        return 2

    log(f"target = {OWNER}/{REPO}#{ISSUE_NUMBER}, dry_run = {DRY_RUN}")

    state = load_state()
    if state.get("state") == STATE_FOUND_DEPLOYED:
        log(f"Already deployed with credentials {state.get('account_id_masked', '?')}")
        return 0

    comments = list_all_comments(token)
    log(f"Found {len(comments)} comments")

    account_id = None
    api_token = None

    for comment in reversed(comments):
        if is_xiaoyuer(comment):
            body = comment.get("body", "")
            credentials = extract_credentials(body)
            if credentials:
                account_id = credentials["account_id"]
                api_token = credentials["api_token"]
                user_login = (comment.get("user") or {}).get("login", "unknown")
                log(f"Found credentials in comment by {user_login}")
                break

    if not account_id or not api_token:
        log("No Cloudflare credentials found in Issue #42 comments")
        save_state({"state": STATE_NOT_FOUND, "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ")})
        return 0

    account_id_masked = mask(account_id)
    api_token_masked = mask(api_token)

    log(f"CLOUDFLARE_ACCOUNT_ID: {account_id_masked}")
    log(f"CLOUDFLARE_API_TOKEN: {api_token_masked}")

    if DRY_RUN:
        log("DRY_RUN mode: Not setting secrets or triggering deploy")
        save_state({
            "state": STATE_FOUND_READY,
            "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "account_id_masked": account_id_masked,
            "token_masked": api_token_masked
        })
        return 0

    log("Setting GitHub Secrets...")
    success = True

    ok, msg = upsert_secret(token, "CLOUDFLARE_ACCOUNT_ID", account_id)
    if not ok:
        log(f"Failed to set CLOUDFLARE_ACCOUNT_ID: {msg}")
        success = False

    ok, msg = upsert_secret(token, "CLOUDFLARE_API_TOKEN", api_token)
    if not ok:
        log(f"Failed to set CLOUDFLARE_API_TOKEN: {msg}")
        success = False

    if not success:
        log("Failed to set secrets")
        save_state({"state": STATE_ERROR, "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ")})
        return 2

    log("Triggering deploy workflow...")
    status, resp = trigger_deploy(token)
    if status != 204:
        log(f"Failed to trigger deploy: HTTP {status} {resp}")
        save_state({"state": STATE_ERROR, "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ")})
        return 2

    comment_body = f"""
## 🔐 凭证已提取并配置

小扣子已从本 Issue 中提取 Cloudflare 部署凭证：

| 凭证 | 状态 |
|------|------|
| CLOUDFLARE_ACCOUNT_ID | ✅ 已配置 `{account_id_masked}` |
| CLOUDFLARE_API_TOKEN | ✅ 已配置 `{api_token_masked}` |

部署流程已触发，将通过 GitHub Actions 自动部署到 Cloudflare Pages。

👉 [查看部署状态](https://github.com/{OWNER}/{REPO}/actions/workflows/{DEPLOY_WORKFLOW})
"""

    add_comment(token, comment_body)

    save_state({
        "state": STATE_FOUND_DEPLOYED,
        "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "account_id_masked": account_id_masked,
        "token_masked": api_token_masked
    })
    log("All done! Credentials configured and deploy triggered")
    return 0


if __name__ == "__main__":
    sys.exit(main())