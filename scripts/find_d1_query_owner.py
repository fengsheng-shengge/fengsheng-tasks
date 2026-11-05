#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载并检索 Cloudflare Worker 脚本源码，找出 D1 热点查询的归属。

2026-11-05 D1 事故：GraphQL analytics 显示额度被「管理端交互式查询」打穿：
    SELECT ... FROM events WHERE page = ? ORDER BY created_at ASC LIMIT ?
    SELECT ... WHERE uid LIKE ? OR event_type LIKE ? OR ... （多字段模糊搜索）
这些 SQL 不在本仓库的 _worker.js 里 → 必定在别的 Worker 脚本里。
本脚本把账户下所有 Worker 脚本的源码下载下来，直接搜这些 SQL 特征。

用法（需环境变量）：
  CLOUDFLARE_API_TOKEN   必填
  CLOUDFLARE_ACCOUNT_ID  必填
  OUT_DIR                选填，源码落盘目录，默认 /tmp/cf_workers
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error

API = 'https://api.cloudflare.com/client/v4'

# 要在源码里搜的特征串（命中即说明该脚本在查 events 表）
PATTERNS = [
    ('WHERE page=?',      r'WHERE\s+page\s*=\s*\?'),
    ('ORDER BY created_at', r'ORDER\s+BY\s+created_at'),
    ('GROUP BY page',     r'GROUP\s+BY\s+page'),
    ('多字段 LIKE',        r'uid\s+LIKE\s+\?.*OR\s+event_type\s+LIKE'),
    ('events 表引用',      r'FROM\s+events'),
    ('D1 binding',        r'\bDB\b.*prepare|env\.DB'),
]


def api(path, token, raw=False):
    req = urllib.request.Request(
        API + path,
        headers={'Authorization': 'Bearer ' + token})
    try:
        r = urllib.request.urlopen(req, timeout=90)
        data = r.read()
        if raw:
            return data
        return json.loads(data.decode('utf-8'))
    except urllib.error.HTTPError as e:
        if raw:
            return e.read()
        return {'success': False, 'errors': [{'message': e.read().decode('utf-8', 'replace')[:300]}]}
    except Exception as e:
        return {'success': False, 'errors': [{'message': str(e)}]}


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    out_dir = os.environ.get('OUT_DIR', '/tmp/cf_workers')
    if not token or not account:
        print('缺少 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID')
        return 1

    os.makedirs(out_dir, exist_ok=True)

    d = api('/accounts/%s/workers/scripts' % account, token)
    if not d.get('success'):
        print('查询 Worker 列表失败: %s' % json.dumps(d.get('errors'), ensure_ascii=False)[:300])
        return 1

    scripts = d.get('result') or []
    print('=== 账户下共 %d 个 Worker 脚本 ===' % len(scripts))
    print('')

    hit_map = {}
    for s in scripts:
        sid = s.get('id')
        print('── Worker: %s  (modified %s)' % (sid, s.get('modified_on')))
        # 下载 metadata + 源码
        raw = api('/accounts/%s/workers/scripts/%s/content' % (account, sid), token, raw=True)
        if not raw:
            print('   源码下载失败或为空')
            continue
        try:
            text = raw.decode('utf-8', 'replace')
        except Exception:
            print('   源码解码失败')
            continue
        path = os.path.join(out_dir, sid + '.js')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('   源码已存: %s  (%d 字节)' % (path, len(text)))

        hits = []
        for label, pat in PATTERNS:
            ms = list(re.finditer(pat, text, re.I | re.S))
            if ms:
                hits.append((label, len(ms)))
        if hits:
            print('   ★ 命中 D1 热点特征:')
            for label, n in hits:
                print('       %-22s ×%d' % (label, n))
                hit_map.setdefault(sid, []).append(label)
            # 把 events 相关的 SQL 原文打出来
            print('   ── 相关 SQL 片段 ──')
            for m in re.finditer(r'[^`\'"]{0,200}FROM\s+events[^`\'"]{0,300}', text, re.I):
                frag = ' '.join(m.group(0).split())
                print('       %s' % frag[:340])
        else:
            print('   （未命中 D1 热点特征）')
        print('')

    print('=' * 80)
    if hit_map:
        print('★ 真凶候选（命中 D1 热点特征）:')
        for sid, labels in hit_map.items():
            print('   %s → %s' % (sid, ', '.join(labels)))
    else:
        print('未找到命中项 —— 热点 SQL 可能来自 Pages 项目或第三方绑定')
    return 0


if __name__ == '__main__':
    sys.exit(main())
