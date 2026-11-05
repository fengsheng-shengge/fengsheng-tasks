#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用**仓库自带的解析规则**复现 Issue #42 的凭据抽取，再逐个实测权限。

【为什么不用通用正则】
`scripts/check_cloudflare_credentials.py` 的抽取规则是既定事实（现役 secret 就是它写进去的）：
  account_id: (?:Account\s*ID|ACCOUNT_ID|account_id|accountId)[:\s=]+([0-9a-f]{32})
              或 代码块/反引号里的 32 位 hex
  api_token : (?:API\s*Token|API_TOKEN|api_token|CLOUDFLARE_API_TOKEN)[:\s=]+([A-Za-z0-9_\-.]{30,})
              或 cfat_xxx / v4.xxx / 反引号包裹的同族 token
且遍历顺序是 `sort=created&direction=desc`（最新优先），取**第一条同时命中两者的评论**。

本脚本：
  ① 按上述规则遍历全部评论，列出所有 distinct 凭据（来源评论 + 脱敏指纹 + sha256 前 12 位）
  ② 逐个实测 Cloudflare 权限（zone 读 / DNS 读），带 4s 退避，撞到限流自动停
  ③ sha256 指纹可与 CI 里打印的 secret 指纹对齐，定位「现役 secret 到底来自哪条评论」
"""

import hashlib, json, os, re, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_cloudflare_credentials import (extract_account_id, extract_api_token,
                                          is_coze_comment)

API = 'https://api.cloudflare.com/client/v4'
GH_API = 'https://api.github.com'
REPO = 'fengsheng-shengge/fengsheng-tasks'
ISSUE = 42
PROD_DOMAIN = 'fengsheng.tech'
COZE_MARKERS = ['小鱼儿', 'Coze', '扣子', '🤖', '🐟', '小扣子']


def http(url, headers=None, method='GET', body=None, timeout=45):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    h = {'Content-Type': 'application/json'}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, json.loads(r.read().decode('utf-8', 'replace'))
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw[:300]}
    except Exception as e:
        return 0, {'raw': str(e)[:300]}


def fetch_comments(tok):
    out, page = [], 1
    while True:
        st, d = http('%s/repos/%s/issues/%d/comments?per_page=100&page=%d'
                     % (GH_API, REPO, ISSUE, page),
                     {'Authorization': 'Bearer ' + tok,
                      'Accept': 'application/vnd.github+json'})
        if st != 200 or not isinstance(d, list) or not d:
            break
        out.extend(d)
        if len(d) < 100:
            break
        page += 1
    return out


def sha12(s):
    return hashlib.sha256(s.encode()).hexdigest()[:12]


def fp(v):
    return '%s…(len=%d)' % (v[:8], len(v))


def main():
    gh = os.environ.get('GH_TOKEN') or ''
    cs = fetch_comments(gh)
    # 与仓库脚本一致：最新优先
    cs.sort(key=lambda c: c.get('created_at') or '', reverse=True)

    print('【一】按仓库解析规则遍历 %d 条评论（最新优先）' % len(cs))
    creds = []          # (kind, value, comment meta)
    first_full = None
    for c in cs:
        body = c.get('body') or ''
        uname = (c.get('user') or {}).get('login')
        meta = {'src': c.get('id'), 'author': uname, 'date': c.get('created_at'),
                'coze': is_coze_comment(body, uname, COZE_MARKERS)}
        a = extract_account_id(body)
        t = extract_api_token(body)
        if a:
            creds.append(('account_id', a, meta))
        if t:
            creds.append(('api_token', t, meta))
        if a and t and not first_full:
            first_full = (c, a, t)

    if first_full:
        c, a, t = first_full
        print('  ★ 仓库脚本当前会选中：评论 #%s (%s, %s)'
              % (c.get('id'), (c.get('user') or {}).get('login'), c.get('created_at')))
        print('    account_id %s sha=%s' % (fp(a), sha12(a)))
        print('    api_token  %s sha=%s' % (fp(t), sha12(t)))

    # distinct token 列表
    toks, accts = {}, {}
    for kind, v, meta in creds:
        d = toks if kind == 'api_token' else accts
        if v not in d:
            d[v] = dict(meta, kind=kind, value=v, hits=[])
        d[v]['hits'].append(meta['src'])

    print('\n【二】distinct api_token（%d 个）' % len(toks))
    for v, m in sorted(toks.items(), key=lambda x: x[1]['date'] or ''):
        print('  %s sha=%s src=%s x%d coze=%s' % (fp(v), sha12(v), m['src'],
                                                  len(m['hits']), m['coze']))

    print('\n【三】逐 token 实测（退避 4s）')
    rate = False
    for v, m in sorted(toks.items(), key=lambda x: x[1]['date'] or ''):
        st, d = http(API + '/zones?name=%s' % PROD_DOMAIN,
                     {'Authorization': 'Bearer ' + v})
        if st == 200 and d.get('success') and d.get('result'):
            zid = d['result'][0]['id']
            st2, d2 = http(API + '/zones/%s/dns_records?name=%s' % (zid, PROD_DOMAIN),
                           {'Authorization': 'Bearer ' + v})
            recs = (d2.get('result') or []) if st2 == 200 else []
            print('  ✅ %s sha=%s src=%s  → zone=%s dns_read=%s 已有记录=%s'
                  % (fp(v), sha12(v), m['src'], zid[:8], st2 == 200,
                     [(x.get('type'), x.get('name'), x.get('content')) for x in recs]))
        else:
            errs = (d.get('errors') or [{}])
            msg = errs[0].get('message', '')[:80]
            print('  ✗ %s sha=%s src=%s  → %s' % (fp(v), sha12(v), m['src'], msg))
            if 'Too many' in msg:
                rate = True
                print('     ⛔ 触发认证限流，停止探测')
                break
        time.sleep(4)

    print('\n【四】account_id 候选')
    for v, m in accts.items():
        print('  %s sha=%s src=%s' % (fp(v), sha12(v), m['src']))


if __name__ == '__main__':
    main()
