#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每小时检查 GitHub Issue #42，提取 Cloudflare 部署凭证。

流程:
1. 读取 Issue #42 全部评论
2. 筛选"小鱼儿 / xiao-yu-er / Coze"标识的最新回复
3. 用正则提取 Account ID 和 API Token
4. 写入仓库 GitHub Secrets
5. 触发 deploy.yml workflow_dispatch
6. 写入 .agent/memory/deploy_progress.json 防止重复

输出环境变量:
  ISSUE_42_STATUS: FOUND_READY / FOUND_DEPLOYED / NOT_FOUND / ERROR
  CLOUDFLARE_ACCOUNT_ID_MASKED: 如 abc****def (仅首末 3 位)
"""

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

TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_PAT", "")
API = "https://api.github.com"

AUTHOR_KEYWORDS = ["小鱼儿", "xiao-yu-er", "xiaoyuer", "Coze", "coze", "小魚兒"]

ACCOUNT_ID_RE = re.compile(
    r"(?:account[_\- ]?id|accountid|account_id|账户id|账号id|账户ID|cloudflare[_\- ]?account)[\s:：=]*\n?\s*([A-Za-z0-9]{20,40})",
    re.IGNORECASE,
)
API_TOKEN_RE = re.compile(
    r"(?:api[_\- ]?token|apitoken|api_token|api密钥|api 密钥|cloudflare[_\- ]?api[_\- ]?token|api key)[\s:：=]*\n?\s*([A-Za-z0-9_\-]{20,80})",
    re.IGNORECASE,
)
SIMPLE_ALNUM_RE = re.compile(r"\b([A-Za-z0-9]{30,45})\b")
SIMPLE_TOKEN_RE = re.compile(r"\b([A-Za-z0-9_\-]{32,80})\b")


def gh_request(method, path, data=None, raw=False):
    url = API + path if path.startswith("/") else path
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "xiaokouzi-fengsheng",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read()
            if raw:
                return resp.status, payload
            if not payload:
                return {}
            return json.loads(payload.decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"[HTTP {e.code}] {method} {path}: {err_body[:400]}", file=sys.stderr)
        raise


def list_comments():
    """读取 Issue #42 的所有 issue comments."""
    comments = []
    page = 1
    while True:
        path = f"/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments?per_page=100&page={page}"
        batch = gh_request("GET", path)
        if not batch:
            break
        comments.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return comments


def pick_candidate(comments):
    """返回最新一条作者名/内容匹配小鱼儿的评论体（字符串）。跳过脚本自己的自动化回复。"""
    # 按创建时间正序，取最新命中
    hit = None
    for c in comments:
        author = (c.get("user") or {}).get("login", "") or ""
        body = c.get("body", "") or ""
        text = f"{author}\n{body}"
        # 跳过脚本自己的自动化回复
        if any(kw in body for kw in ["已写入 Secrets", "已写入仓库 Secrets", "小扣子已收到凭证并触发部署"]):
            continue
        if any(k in text for k in AUTHOR_KEYWORDS):
            hit = c
        # 另外: 任何包含 "Account ID" + "Token" 的就算是小鱼儿回复
        elif re.search(r"account[\s_-]?id", body, re.IGNORECASE) and re.search(r"api[\s_-]?token", body, re.IGNORECASE):
            hit = c
    return hit


def extract_credentials(body):
    """返回 (account_id, api_token) 或 (None, None)."""
    if not body:
        return None, None

    # 优先用带 label 的正则
    m_id = ACCOUNT_ID_RE.search(body)
    m_tok = API_TOKEN_RE.search(body)
    account_id = m_id.group(1).strip() if m_id else None
    api_token = m_tok.group(1).strip() if m_tok else None

    # 退化策略：若某个字段没抓到，按出现顺序抓取候选
    if not account_id:
        found = SIMPLE_ALNUM_RE.findall(body)
        account_id = found[0] if found else None
    if not api_token:
        found = [t for t in SIMPLE_TOKEN_RE.findall(body) if t != account_id]
        api_token = found[0] if found else None

    # 验证 Token 格式：必须是 cfut_ 前缀（Cloudflare API Token），拒绝 cfat_ 前缀（Global API Key）
    if api_token:
        if api_token.startswith("cfat_"):
            print(f"[WARN] 检测到 cfat_ 前缀 Token（Global API Key），此格式不被 Cloudflare API 接受，已忽略。", file=sys.stderr)
            return account_id, None
        if not api_token.startswith("cfut_"):
            print(f"[WARN] Token 格式异常（非 cfut_ 前缀），可能无效。", file=sys.stderr)

    return account_id, api_token


def masked(s, keep=3):
    if not s or len(s) <= keep * 2:
        return "***"
    return s[:keep] + "****" + s[-keep:]


def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state):
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def set_secret(name, value):
    """写入仓库 Actions Secret. 需要 libsodium + public key."""
    import base64

    key_info = gh_request("GET", f"/repos/{OWNER}/{REPO}/actions/secrets/public-key")
    key_id = key_info["key_id"]
    key_b64 = key_info["key"]

    # 用 libsodium sealed box 加密
    try:
        import nacl.secret  # noqa: F401
        import nacl.public
        import nacl.encoding
    except ImportError:
        print("[ERROR] 需要 pynacl: pip install pynacl", file=sys.stderr)
        raise

    public_key = nacl.public.PublicKey(key_b64, encoder=nacl.encoding.Base64Encoder)
    sealed_box = nacl.public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(value.encode("utf-8"))
    encrypted_b64 = base64.b64encode(encrypted).decode("ascii")

    gh_request(
        "PUT",
        f"/repos/{OWNER}/{REPO}/actions/secrets/{name}",
        data={"encrypted_value": encrypted_b64, "key_id": key_id},
    )


def trigger_deploy():
    """触发 deploy.yml 的 workflow_dispatch."""
    return gh_request(
        "POST",
        f"/repos/{OWNER}/{REPO}/actions/workflows/deploy.yml/dispatches",
        data={"ref": "main", "inputs": {"environment": "production"}},
    )


def comment_issue(body):
    return gh_request(
        "POST",
        f"/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments",
        data={"body": body},
    )


def set_github_output(key, value):
    out_file = os.environ.get("GITHUB_OUTPUT", "")
    if out_file:
        with open(out_file, "a", encoding="utf-8") as f:
            f.write(f"{key}={value}\n")


def main():
    if not TOKEN:
        print("[ERROR] 未配置 GH_TOKEN / GITHUB_TOKEN，无法访问 API", file=sys.stderr)
        set_github_output("ISSUE_42_STATUS", "ERROR")
        sys.exit(2)

    try:
        comments = list_comments()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"[INFO] Issue #{ISSUE_NUMBER} 尚未创建，跳过本轮。")
            set_github_output("ISSUE_42_STATUS", "NOT_FOUND")
            sys.exit(0)
        raise

    print(f"[INFO] 共 {len(comments)} 条评论")

    candidate = pick_candidate(comments)
    if not candidate:
        print("[INFO] 未检测到小鱼儿的凭证回复，本轮结束。")
        set_github_output("ISSUE_42_STATUS", "NOT_FOUND")
        sys.exit(0)

    body = candidate.get("body", "") or ""
    comment_id = candidate.get("id", 0)
    created_at = candidate.get("created_at", "")

    account_id, api_token = extract_credentials(body)

    if not account_id or not api_token:
        print(f"[WARN] 检测到小鱼儿评论(id={comment_id})但未能完整提取凭证")
        print(f"[WARN] account_id={masked(account_id) if account_id else None}, api_token={'已提取' if api_token else None}")
        set_github_output("ISSUE_42_STATUS", "ERROR")
        sys.exit(1)

    print(f"[OK] 凭证提取成功: Account ID={masked(account_id)}, Token={masked(api_token)}")

    # 防止重复部署：以 (comment_id, first_chars) 作为指纹
    fingerprint = f"{comment_id}-{account_id[:6]}-{api_token[:6]}"
    state = load_state()
    if state.get("fingerprint") == fingerprint:
        print(f"[INFO] 该凭证已在 {state.get('deployed_at')} 部署过，跳过。")
        set_github_output("ISSUE_42_STATUS", "FOUND_DEPLOYED")
        set_github_output("CLOUDFLARE_ACCOUNT_ID_MASKED", masked(account_id))
        sys.exit(0)

    # 写入 Secrets
    set_secret("CLOUDFLARE_ACCOUNT_ID", account_id)
    set_secret("CLOUDFLARE_API_TOKEN", api_token)
    print("[OK] CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 已写入仓库 Secrets")

    # 触发部署
    trigger_deploy()
    print("[OK] 已触发 deploy.yml workflow_dispatch")

    # 回写 Issue 评论：进度通知（不回显凭证）
    try:
        comment_issue(
            "## 🚀 小扣子已收到凭证并触发部署\n"
            f"- 检测时间: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n"
            f"- Account ID 已写入 Secrets ({masked(account_id)})\n"
            f"- API Token 已写入 Secrets ({masked(api_token)})\n"
            f"- 部署状态: https://github.com/{OWNER}/{REPO}/actions\n\n"
            "✅ 凭证不会在评论中回显，所有敏感信息仅通过加密方式写入仓库 Actions Secrets。"
        )
    except Exception as e:
        print(f"[WARN] 回写 Issue 评论失败: {e}", file=sys.stderr)

    state.update(
        {
            "status": "FOUND_DEPLOYED",
            "fingerprint": fingerprint,
            "comment_id": comment_id,
            "comment_created_at": created_at,
            "deployed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "account_id_masked": masked(account_id),
            "api_token_masked": masked(api_token),
        }
    )
    save_state(state)

    set_github_output("ISSUE_42_STATUS", "FOUND_READY")
    set_github_output("CLOUDFLARE_ACCOUNT_ID_MASKED", masked(account_id))
    print("[DONE]")


if __name__ == "__main__":
    main()
