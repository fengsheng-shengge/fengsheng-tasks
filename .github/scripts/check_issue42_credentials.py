#!/usr/bin/env python3
"""Monitor Issue #42 for Cloudflare credentials and auto-configure GitHub Secrets."""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

OWNER = "fengsheng-shengge"
REPO = "fengsheng-tasks"
ISSUE_NUMBER = 42
VARIABLE_NAME = "ISSUE42_LAST_PROCESSED_AT"

ACCOUNT_ID_PATTERN = re.compile(
    r"(?:CLOUDFLARE_)?ACCOUNT_ID\s*[:=]\s*([a-f0-9]{32})", re.IGNORECASE
)
API_TOKEN_PATTERN = re.compile(
    r"(?:CLOUDFLARE_)?API_TOKEN\s*[:=]\s*([A-Za-z0-9_\-]{40,})", re.IGNORECASE
)


def run_gh(args, input_text=None, check=True):
    """Run a gh CLI command and return its output."""
    result = subprocess.run(
        ["gh", *args],
        input=input_text,
        capture_output=True,
        text=True,
    )
    if check and result.returncode != 0:
        print(f"gh command failed: gh {' '.join(args)}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError(result.stderr)
    return result


def list_comments():
    """Return all comments on Issue #42, oldest first."""
    result = run_gh(
        [
            "api",
            "--paginate",
            f"/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments",
        ]
    )
    return json.loads(result.stdout)


def get_last_processed():
    """Return the ISO timestamp of the last processed credential comment."""
    result = run_gh(["variable", "get", VARIABLE_NAME], check=False)
    if result.returncode != 0:
        return None
    value = result.stdout.strip()
    # gh may return JSON if --json was used; handle plain text.
    if not value:
        return None
    try:
        data = json.loads(value)
        return data.get("value") if isinstance(data, dict) else data
    except json.JSONDecodeError:
        return value


def set_last_processed(timestamp):
    """Persist the last processed comment timestamp."""
    run_gh(["variable", "set", VARIABLE_NAME, "--body", timestamp])


def parse_credentials(body):
    """Extract Account ID and API Token from a comment body."""
    cleaned = re.sub(r"`+", "", body or "")
    account_match = ACCOUNT_ID_PATTERN.search(cleaned)
    token_match = API_TOKEN_PATTERN.search(cleaned)
    if account_match and token_match:
        return account_match.group(1), token_match.group(1)
    return None, None


def set_secret(name, value):
    """Create or update a repository secret."""
    run_gh(
        ["secret", "set", name, "--repo", f"{OWNER}/{REPO}"],
        input_text=value,
    )


def trigger_deploy():
    """Trigger the deploy workflow on the main branch."""
    run_gh(
        [
            "workflow",
            "run",
            "deploy.yml",
            "--repo",
            f"{OWNER}/{REPO}",
            "--ref",
            "main",
        ]
    )


def add_issue_comment(body):
    """Post a comment to Issue #42."""
    run_gh(
        [
            "api",
            f"/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments",
            "-X",
            "POST",
            "-f",
            f"body={body}",
        ]
    )


def main():
    dry_run = os.environ.get("DRY_RUN", "false").lower() == "true"
    has_pat = bool(os.environ.get("SECRETS_PAT"))

    comments = list_comments()
    if not comments:
        print("Issue #42 has no comments yet.")
        return

    last_processed_raw = get_last_processed()
    if last_processed_raw:
        try:
            last_processed = datetime.fromisoformat(
                last_processed_raw.replace("Z", "+00:00")
            )
        except ValueError:
            last_processed = datetime.min.replace(tzinfo=timezone.utc)
    else:
        last_processed = datetime.min.replace(tzinfo=timezone.utc)

    candidates = []
    for comment in comments:
        updated_at = datetime.fromisoformat(
            comment["updated_at"].replace("Z", "+00:00")
        )
        if updated_at <= last_processed:
            continue
        account_id, api_token = parse_credentials(comment.get("body", ""))
        if account_id and api_token:
            candidates.append(
                {
                    "html_url": comment["html_url"],
                    "created_at": comment["created_at"],
                    "account_id": account_id,
                    "api_token": api_token,
                }
            )

    if not candidates:
        print(
            f"No new Cloudflare credentials found. "
            f"Last processed: {last_processed_raw or 'never'}"
        )
        return

    # Process the newest matching comment.
    latest = candidates[-1]
    print(f"::add-mask::{latest['account_id']}")
    print(f"::add-mask::{latest['api_token']}")
    print(
        f"Found credentials in comment {latest['html_url']} "
        f"at {latest['created_at']}"
    )

    if dry_run:
        print("Dry run: would set secrets and trigger deploy.")
        return

    if not has_pat:
        add_issue_comment(
            "检测到 Issue #42 中可能包含 Cloudflare 凭证，但仓库未配置 "
            "`SECRETS_PAT` secret，无法自动写入 GitHub Secrets。"
            "请仓库管理员添加一个具有 `repo` 范围的 PAT 作为 `SECRETS_PAT`，"
            "然后重新运行本工作流。"
        )
        print("SECRETS_PAT not configured; notified issue.")
        sys.exit(1)

    set_secret("CLOUDFLARE_ACCOUNT_ID", latest["account_id"])
    set_secret("CLOUDFLARE_API_TOKEN", latest["api_token"])
    print("Updated GitHub Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN.")

    set_last_processed(latest["created_at"])
    print(f"Updated {VARIABLE_NAME} to {latest['created_at']}.")

    trigger_deploy()
    print("Triggered deploy.yml on main.")

    add_issue_comment(
        "已自动提取 Cloudflare 凭证并配置到 GitHub Secrets，"
        "已触发 [deploy.yml](../../actions/workflows/deploy.yml) 部署。"
    )


if __name__ == "__main__":
    main()
