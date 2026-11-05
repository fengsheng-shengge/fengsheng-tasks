#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
列出 Cloudflare 账户下的 Workers 脚本与 Pages 项目 —— 找出 D1 查询的真凶归属。

2026-11-05 D1 事故：额度（500 万 rows read/天）被打穿。GraphQL analytics 显示
真正的消耗来自「管理端交互式查询」：
    SELECT ... FROM events WHERE page = ? ORDER BY created_at ASC LIMIT ?
    SELECT ... WHERE uid LIKE ? OR event_type LIKE ? OR ... （多字段模糊搜索）
这些 SQL 不在本仓库的 _worker.js 里 → 说明有第二个绑定/项目在查同一个 D1 库。
本脚本列出账户下所有 Worker 脚本与 Pages 项目，逐一比对即可定位。

用法（需环境变量）：
  CLOUDFLARE_API_TOKEN   必填
  CLOUDFLARE_ACCOUNT_ID  必填
"""

import json
import os
import sys
import urllib.request
import urllib.error

API = 'https://api.cloudflare.com/client/v4'


def api(path, token):
    req = urllib.request.Request(
        API + path,
        headers={'Authorization': 'Bearer ' + token,
                 'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'success': False, 'errors': [{'message': e.read().decode('utf-8', 'replace')[:300]}]}
    except Exception as e:
        return {'success': False, 'errors': [{'message': str(e)}]}


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    if not token or not account:
        print('缺少 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID')
        return 1

    print('=== Workers 脚本 ===')
    d = api('/accounts/%s/workers/scripts' % account, token)
    if d.get('success'):
        for s in d.get('result') or []:
            print('  %-32s modified=%s' % (s.get('id'), s.get('modified_on')))
        if not (d.get('result') or []):
            print('  （无）')
    else:
        print('  查询失败: %s' % json.dumps(d.get('errors'), ensure_ascii=False)[:300])

    print('')
    print('=== Pages 项目 ===')
    d = api('/accounts/%s/pages/projects' % account, token)
    if d.get('success'):
        for p in d.get('result') or []:
            print('  %-24s domains=%s' % (
                p.get('name'),
                ','.join(p.get('domains') or [])))
            for b in (p.get('deployment_configs') or {}).get('production', {}).get('env_vars', {}) or []:
                if b.get('key', '').endswith('_ID') or 'D1' in b.get('key', ''):
                    print('      env %s = %s' % (b.get('key'), b.get('value')))
        if not (d.get('result') or []):
            print('  （无）')
    else:
        print('  查询失败: %s' % json.dumps(d.get('errors'), ensure_ascii=False)[:300])

    print('')
    print('=== D1 数据库及其绑定 ===')
    d = api('/accounts/%s/d1/database' % account, token)
    if d.get('success'):
        for db in d.get('result') or []:
            print('  %-24s %s  size=%s' % (
                db.get('name'), db.get('uuid'), db.get('file_size')))
    else:
        print('  查询失败: %s' % json.dumps(d.get('errors'), ensure_ascii=False)[:300])
    return 0


if __name__ == '__main__':
    sys.exit(main())
