#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_cloudflare_credentials.py
================================
检查 GitHub Issue 上小鱼儿(Coze)是否回复了 Cloudflare 部署凭证。
如检测到完整的 (Account ID + API Token)，输出结果供 GitHub Actions 后续步骤使用。

支持的凭证格式（按优先级）：
  1. 标签式：  "Account ID: xxx"  /  "API Token: xxx"
  2. 环境变量式： CLOUDFLARE_ACCOUNT_ID=xxx  /  CLOUDFLARE_API_TOKEN=xxx
  3. JSON 块： ```json {"account_id": "...", "api_token": "..."} ```
  4. 裸值：   32 位十六进制（Account ID）+ 40 位 [A-Za-z0-9_-]（API Token）

使用示例：
  GH_TOKEN=ghp_xxx python scripts/check_cloudflare_credentials.py \
    --repo fengsheng-shengge/fengsheng-tasks \
    --issue 42

退出码：
  0  正常（无论是否找到凭证）
  2  配置错误（缺少 token 等）
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request


# Cloudflare Account ID: 32 hex chars
ACCOUNT_ID_RE = re.compile(r'\b([a-f0-9]{32})\b')
# Cloudflare API Token: 40 chars of [A-Za-z0-9_-]
API_TOKEN_RE = re.compile(r'\b([A-Za-z0-9_-]{40})\b')

# 小鱼儿（Coze）身份标记（可被 --coze-marker 覆盖）
DEFAULT_COZE_MARKERS = ['小鱼儿', 'Coze', '扣子', '🤖', '🐟']


def log(msg: str):
    """Print to stderr so it shows up in Actions logs (kept short, no secrets)."""
    print(f'[check-cf-cred] {msg}', file=sys.stderr)


def http_get(url: str, token: str, accept: str = 'application/vnd.github+json') -> dict:
    """GET request, return parsed JSON."""
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Accept', accept)
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    req.add_header('User-Agent', 'fengsheng-auto-deploy/1.0')
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def fetch_issue_comments(repo: str, issue_number: int, token: str) -> list:
    """Fetch all comments on the given issue (handles pagination)."""
    comments = []
    page = 1
    while True:
        url = f'https://api.github.com/repos/{repo}/issues/{issue_number}/comments?per_page=100&page={page}'
        batch = http_get(url, token)
        if not batch:
            break
        comments.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return comments


def is_from_coze(comment: dict, coze_markers: list) -> bool:
    """判断评论是否来自小鱼儿（Coze）。"""
    body = (comment.get('body') or '').lower()
    user = comment.get('user') or {}
    user_type = user.get('type') or ''
    user_login = (user.get('login') or '').lower()
    if user_type == 'Bot':
        return True
    coze_usernames = os.environ.get('COZE_BOT_USERNAMES', 'coze-bot,coze,xiaoyuer').lower().split(',')
    if user_login in [u.strip() for u in coze_usernames if u.strip()]:
        return True
    for marker in coze_markers:
        if marker.lower() in body:
            return True
    return False


def extract_credentials(body: str) -> dict:
    """多策略提取 Account ID 和 API Token。"""
    if not body:
        return {'account_id': None, 'api_token': None, 'format': None}

    text = body
    account_id = None
    api_token = None
    formats = []

    # 策略 1：标签式
    if not account_id:
        m = re.search(
            r'(?:Account\s*ID|账号|账户|account)\s*[:：=]\s*[`"\']*\s*([a-f0-9]{32})[`"\']*\s*',
            text, re.IGNORECASE
        )
        if m:
            account_id = m.group(1)
            formats.append('labeled:account_id')

    if not api_token:
        m = re.search(
            r'(?:API\s*Token|Token|令牌|密钥|token)\s*[:：=]\s*[`"\']*\s*([A-Za-z0-9_\-]{40})[`"\']*\s*',
            text, re.IGNORECASE
        )
        if m:
            api_token = m.group(1)
            formats.append('labeled:api_token')

    # 策略 2：环境变量式
    if not account_id:
        m = re.search(r'CLOUDFLARE_ACCOUNT_ID\s*=\s*([a-f0-9]{32})', text)
        if m:
            account_id = m.group(1)
            formats.append('env:account_id')
    if not api_token:
        m = re.search(r'CLOUDFLARE_API_TOKEN\s*=\s*([A-Za-z0-9_\-]{40})', text)
        if m:
            api_token = m.group(1)
            formats.append('env:api_token')

    # 策略 3：JSON 块
    if not account_id or not api_token:
        json_block = re.search(r'```(?:json)?\s*(\{[^`]+\})\s*```', text)
        if json_block:
            try:
                data = json.loads(json_block.group(1))
                if not account_id and 'account_id' in data:
                    cand = str(data['account_id']).strip()
                    if re.fullmatch(r'[a-f0-9]{32}', cand):
                        account_id = cand
                        formats.append('json:account_id')
                if not api_token and 'api_token' in data:
                    cand = str(data['api_token']).strip()
                    if re.fullmatch(r'[A-Za-z0-9_\-]{40}', cand):
                        api_token = cand
                        formats.append('json:api_token')
            except (json.JSONDecodeError, ValueError):
                pass

    # 策略 4：裸值
    if not account_id:
        m = ACCOUNT_ID_RE.search(text)
        if m:
            account_id = m.group(1)
            formats.append('bare:account_id')
    if not api_token:
        m = API_TOKEN_RE.search(text)
        if m:
            api_token = m.group(1)
            formats.append('bare:api_token')

    return {
        'account_id': account_id,
        'api_token': api_token,
        'format': '+'.join(formats) if formats else None,
    }


def is_already_processed(comment_id, token: str, repo: str) -> bool:
    """检查评论是否已有 'eyes' 反应。"""
    if not comment_id:
        return False
    try:
        url = f'https://api.github.com/repos/{repo}/issues/comments/{comment_id}/reactions'
        reactions = http_get(url, token, accept='application/vnd.github.squirrel-girl-preview+json')
        for r in reactions:
            if r.get('content') == 'eyes':
                return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        log(f'reactions check HTTP {e.code} (continue)')
    except Exception as e:
        log(f'reactions check error: {e} (continue)')
    return False


def write_output(result: dict, output_path: str):
    """写入 JSON 结果文件 + 同步到 GITHUB_OUTPUT。"""
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    github_output = os.environ.get('GITHUB_OUTPUT')
    if github_output and github_output != output_path:
        with open(github_output, 'a', encoding='utf-8') as f:
            for k, v in result.items():
                f.write(f'{k}<<EOF\n{v}\nEOF\n')


def main():
    parser = argparse.ArgumentParser(description='Check Issue for Coze Cloudflare credentials')
    parser.add_argument('--repo', required=True, help='owner/repo')
    parser.add_argument('--issue', type=int, required=True, help='issue number')
    parser.add_argument('--coze-marker', default='|'.join(DEFAULT_COZE_MARKERS),
                        help='Coze markers (pipe-separated)')
    parser.add_argument('--output', default=os.environ.get('RESULT_FILE', '/tmp/cred_result.json'),
                        help='JSON output file path')
    parser.add_argument('--force', action='store_true',
                        help='force process even if comment has eyes reaction')
    args = parser.parse_args()

    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or os.environ.get('AUTOMATION_PAT')
    if not token:
        log('ERROR: GH_TOKEN / GITHUB_TOKEN / AUTOMATION_PAT env var required')
        sys.exit(2)

    coze_markers = [m for m in args.coze_marker.split('|') if m]

    result = {
        'has_credentials': 'false',
        'comment_id': '',
        'comment_author': '',
        'comment_url': '',
        'account_id': '',
        'api_token': '',
        'format': '',
        'error': '',
    }

    try:
        comments = fetch_issue_comments(args.repo, args.issue, token)
        log(f'fetched {len(comments)} comments from issue #{args.issue}')
    except urllib.error.HTTPError as e:
        result['error'] = f'HTTP {e.code} fetching comments: {e.reason}'
        log(result['error'])
        write_output(result, args.output)
        sys.exit(0)
    except Exception as e:
        result['error'] = f'fetch error: {e}'
        log(result['error'])
        write_output(result, args.output)
        sys.exit(0)

    if not comments:
        result['error'] = 'no comments yet'
        write_output(result, args.output)
        sys.exit(0)

    for comment in reversed(comments):
        body = comment.get('body') or ''
        user = comment.get('user') or {}

        if not is_from_coze(comment, coze_markers):
            continue
        log(f"candidate comment #{comment.get('id')} by @{user.get('login')} (Coze match)")

        if not args.force and is_already_processed(comment.get('id'), token, args.repo):
            log(f"  -> already processed (eyes reaction exists), skip")
            continue

        creds = extract_credentials(body)
        if creds['account_id'] and creds['api_token']:
            result['has_credentials'] = 'true'
            result['comment_id'] = str(comment.get('id', ''))
            result['comment_author'] = user.get('login', '')
            result['comment_url'] = comment.get('html_url', '')
            result['account_id'] = creds['account_id']
            result['api_token'] = creds['api_token']
            result['format'] = creds['format'] or 'unknown'
            log(f"  -> extracted credentials via {result['format']}")
            break
        else:
            missing = []
            if not creds['account_id']:
                missing.append('Account ID')
            if not creds['api_token']:
                missing.append('API Token')
            log(f"  -> partial, missing: {', '.join(missing)}, skip")

    if result['has_credentials'] == 'false' and not result['error']:
        result['error'] = 'no new Coze comment with both credentials'

    write_output(result, args.output)
    sys.exit(0)


if __name__ == '__main__':
    main()
