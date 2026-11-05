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
        # Workers 用模块化部署：/content 返回的是模块清单，不是真实代码。
        # 必须逐个模块下载后拼起来。
        raw = api('/accounts/%s/workers/scripts/%s/content' % (account, sid), token, raw=True)
        modules = []
        raw_text = raw.decode('utf-8', 'replace') if raw else ''
        try:
            meta = json.loads(raw_text)
            if isinstance(meta, dict):
                if 'main_module' in meta:
                    modules = [meta['main_module']] + list(meta.get('modules') or [])
                elif 'result' in meta:
                    modules = meta['result'] if isinstance(meta['result'], list) else []
            elif isinstance(meta, list):
                modules = meta
        except Exception:
            modules = []
        if not modules:
            # 模块清单取不到 → 直接把 /content 的返回当源码用（部分脚本是非模块化的）
            if raw_text and 'main_module' not in raw_text:
                modules = ['__raw__']
            else:
                print('   未取到模块清单（返回 %d 字节）' % (len(raw) if raw else 0))
                continue

        text_parts = []
        for i, m in enumerate(modules):
            mname = m if isinstance(m, str) else m.get('name')
            mtype = 'esm' if (isinstance(m, str) or m.get('type') == 'esm') else 'commonjs'
            if mname == '__raw__':
                blob = raw
            else:
                blob = api('/accounts/%s/workers/scripts/%s/content/%s?module=%s'
                           % (account, sid, mname, mtype), token, raw=True)
            if not blob:
                continue
            try:
                text_parts.append('// ===== module: %s =====\n%s' % (
                    mname, blob.decode('utf-8', 'replace')))
            except Exception:
                pass
        text = '\n'.join(text_parts)
        if not text:
            print('   模块源码均下载失败')
            continue
        path = os.path.join(out_dir, sid + '.js')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('   源码已存: %s  (%d 模块, %d 字节)' % (path, len(modules), len(text)))

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

    # ── Pages 项目的 Functions（可能是真凶）──
    print('── Pages 项目 Functions ──')
    pd = api('/accounts/%s/pages/projects' % account, token)
    if pd.get('success'):
        for pj in pd.get('result') or []:
            pname = pj.get('name')
            fd = api('/accounts/%s/pages/projects/%s/functions' % (account, pname), token)
            if not fd.get('success'):
                print('   %s: Functions 列表查询失败' % pname)
                continue
            funcs = fd.get('result') or []
            # 实测：/functions 返回的是「项目对象」，不是数组
            if isinstance(funcs, dict):
                print('   %s: /functions 返回项目对象（非数组），改用 /functions/content 列举' % pname)
                funcs = []
            if not funcs:
                # ① 从仓库里的 Pages Functions 目录推断（本仓库 api/*.js → functions/api/*）
                repo_api = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'api')
                names = []
                if os.path.isdir(repo_api):
                    names = ['api/' + f for f in os.listdir(repo_api) if f.endswith('.js')]
                names.append('_worker.js')
                # ② content 目录端点：抓可能的文件名
                cd = api('/accounts/%s/pages/projects/%s/functions/content' % (account, pname),
                         token, raw=True)
                ctext = cd.decode('utf-8', 'replace') if cd else ''
                extra = sorted(set(re.findall(r'"(?:name|filename)"\s*:\s*"([^"]+)"', ctext)))
                if not extra:
                    extra = sorted(set(re.findall(r'([A-Za-z0-9_\-./]+\.js)', ctext)))
                for e in extra:
                    if e not in names:
                        names.append(e)
                print('   %s: 候选 Function %d 个' % (pname, len(names)))
                print('      %s' % ', '.join(names[:50]))
                funcs = names
            if not funcs:
                print('   %s: 无 Functions' % pname)
                continue
            print('   %s: %d 个 Function' % (pname, len(funcs)))
            for fn in funcs:
                fname = fn.get('name') if isinstance(fn, dict) else str(fn)
                if not fname:
                    continue
                blob = api('/accounts/%s/pages/projects/%s/functions/%s/content'
                           % (account, pname, fname), token, raw=True)
                if not blob:
                    print('      %s: 内容下载失败/为空' % fname)
                    continue
                try:
                    ftext = blob.decode('utf-8', 'replace')
                except Exception:
                    continue
                fpath = os.path.join(out_dir, '%s__%s.js' % (pname, fname))
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(ftext)
                fhits = [(lb, len(list(re.finditer(pt, ftext, re.I | re.S))))
                         for lb, pt in PATTERNS]
                fhits = [(lb, n) for lb, n in fhits if n]
                mark = '★' if fhits else ' '
                print('     %s %-28s %8d 字节 %s' % (
                    mark, fname, len(ftext),
                    (', '.join('%s×%d' % (l, n) for l, n in fhits)) if fhits else ''))
                if fhits:
                    hit_map.setdefault('%s/functions/%s' % (pname, fname), []).extend(
                        [l for l, _ in fhits])
                    for m in re.finditer(r'[^`\'"]{0,200}FROM\s+events[^`\'"]{0,300}', ftext, re.I):
                        print('         SQL: %s' % ' '.join(m.group(0).split())[:300])
    else:
        print('   Pages 项目查询失败')
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
