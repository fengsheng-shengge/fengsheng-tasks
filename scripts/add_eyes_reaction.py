#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_eyes_reaction.py
====================
给指定评论添加 👀 reaction（标记已处理）。
"""

import json
import os
import sys
import urllib.error
import urllib.request


def main():
    comment_id = os.environ.get('COMMENT_ID', '').strip()
    token = os.environ.get('GH_TOKEN', '').strip()
    repo = os.environ.get('REPO', '').strip()

    if not all([comment_id, token, repo]):
        print('ERROR: COMMENT_ID / GH_TOKEN / REPO env vars required', file=sys.stderr)
        sys.exit(2)

    url = f'https://api.github.com/repos/{repo}/issues/comments/{comment_id}/reactions'
    req = urllib.request.Request(url, data=json.dumps({'content': 'eyes'}).encode('utf-8'))
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Accept', 'application/vnd.github.squirrel-girl-preview+json')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    req.add_header('User-Agent', 'fengsheng-auto-deploy/1.0')
    req.get_method = lambda: 'POST'

    try:
        urllib.request.urlopen(req, timeout=10).read()
        print(f'OK: eyes reaction added to comment #{comment_id}')
    except urllib.error.HTTPError as e:
        print(f'WARN: HTTP {e.code} when adding reaction: {e.reason}', file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(f'WARN: {e}', file=sys.stderr)
        sys.exit(0)


if __name__ == '__main__':
    main()
