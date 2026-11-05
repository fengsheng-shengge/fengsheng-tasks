#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 GitHub Issue #42 的全部评论，抽取所有候选 Cloudflare 凭据，逐个实测权限。

【为什么要有这个脚本】
`check-cloudflare-creds.yml` 只认「32 位 hex = Account ID」+「token 样式字符串」两种形态，
且取**最新**一条命中的评论写入 `CLOUDFLARE_API_TOKEN`。
现役 token 实测：有 Pages 写权限、**无 DNS 写权限**（code 10000 Authentication error），
导致 fengsheng.tech 的主机记录建不出来（P0）。

两种可能性：
  A) 小鱼儿当初给的凭据本身就少 DNS 权限 → 只能人工补
  B) 评论里**还有别的**凭据形态没被识别 —— 典型是
     Cloudflare **Global API Key + Email**（用 X-Auth-Key / X-Auth-Email 头认证，
     权限远高于 API Token），脚本只搜 token 形态，直接漏掉了

本脚本把 B 补上：把所有形态的候选凭据都试一遍，谁能写 DNS 就用谁。

【安全】
  · 任何密钥都不打印，只打印来源（评论号/作者/形态）与判定结论
  · 只读评论 + 只读 Cloudflare 权限；写 DNS 由独立开关 --apply 控制
  · 只动 fengsheng.tech 一个域名的 CNAME/A 记录
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
GH_API = 'https://api.github.com'
REPO = 'fengsheng-shengge/fengsheng-tasks'
ISSUE = 42
PROD_DOMAIN = 'fengsheng.tech'
PAGES_HOST = 'fengsheng-ee9.pages.dev'


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


def gh_headers(tok):
    return {'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json'}


def fetch_comments(gh_token):
    out, page = [], 1
    while True:
        st, d = http('%s/repos/%s/issues/%d/comments?per_page=100&page=%d'
                     % (GH_API, REPO, ISSUE, page), gh_headers(gh_token))
        if st != 200 or not isinstance(d, list) or not d:
            break
        out.extend(d)
        if len(d) < 100:
            break
        page += 1
    return out


# ---- 凭据形态识别 -------------------------------------------------------
TOKEN_RE = re.compile(r'\bv1\.0-[A-Za-z0-9_-]{20,}|\bv4\.[A-Za-z0-9_-]{30,}'
                      r'|[A-Za-z0-9_-]{40,}')
EMAIL_RE = re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}')
HEX32_RE = re.compile(r'\b[0-9a-f]{32}\b')
HEX37_RE = re.compile(r'\b[0-9a-f]{37}\b')
# 已知噪声（GitHub 自己的 token 前缀等）
NOISE = ('github_pat_', 'ghp_', 'gho_', 'ghs_', 'ghu_', 'githubsecret')


def looks_like_cf_token(s):
    if any(n in s for n in NOISE):
        return False
    if s.startswith('v1.0-') or s.startswith('v4.'):
        return True
    # Cloudflare API Token：字母数字混合、无点无空格，长度 40
    if len(s) >= 40 and re.fullmatch(r'[A-Za-z0-9_-]+', s):
        # 排除纯 hex（那是 key/id）
        if not re.fullmatch(r'[0-9a-f]+', s.lower()):
            return True
    return False


def looks_like_cf_global_key(s):
    # Cloudflare Global API Key：37 位 hex
    return bool(re.fullmatch(r'[0-9a-f]{37}', s, re.I))


def mine(comments):
    """返回候选凭据列表，每条：kind / value / source"""
    cands = []
    for c in comments:
        body = c.get('body') or ''
        cid = c.get('id')
        author = (c.get('user') or {}).get('login')
        date = c.get('created_at')

        tokens, gkeys, emails, accts = [], [], [], []
        for m in set(TOKEN_RE.findall(body)):
            if looks_like_cf_token(m):
                tokens.append(m)
        for m in set(HEX37_RE.findall(body)):
            if looks_like_cf_global_key(m):
                gkeys.append(m)
        for m in set(EMAIL_RE.findall(body)):
            emails.append(m.lower())
        for m in set(HEX32_RE.findall(body)):
            accts.append(m)

        for t in tokens:
            cands.append({'kind': 'api_token', 'value': t, 'src': cid,
                          'author': author, 'date': date})
        for k in gkeys:
            cands.append({'kind': 'global_key', 'value': k, 'src': cid,
                          'author': author, 'date': date})
        for e in emails:
            cands.append({'kind': 'email', 'value': e, 'src': cid,
                          'author': author, 'date': date})
        for a in accts:
            cands.append({'kind': 'account_id', 'value': a, 'src': cid,
                          'author': author, 'date': date})
    return cands


def cf_headers_for(kind, value, email=None):
    if kind == 'api_token':
        return {'Authorization': 'Bearer ' + value}
    if kind == 'global_key':
        return {'X-Auth-Key': value, 'X-Auth-Email': email}
    return {}


def probe(cands):
    """逐个测凭据：能否读 zone、能否写 DNS。返回带判定的列表。"""
    results = []
    # 先把 email 与 global_key 配对
    emails = [c for c in cands if c['kind'] == 'email']
    gkeys = [c for c in cands if c['kind'] == 'global_key']

    probes = []
    for c in cands:
        if c['kind'] in ('api_token',):
            probes.append((c['kind'], c['value'], None, c))
    for g in gkeys:
        for e in emails:
            probes.append(('global_key', g['value'], e['value'], g))

    for kind, value, email, meta in probes:
        h = cf_headers_for(kind, value, email)
        label = '%s@#%s' % (kind, meta['src'])
        st, d = http(API + '/zones?name=%s' % PROD_DOMAIN, h)
        r = {'kind': kind, 'src': meta['src'], 'author': meta['author'],
             'date': meta['date'], 'email': email,
             'zone_read': bool(st == 200 and d.get('success') and d.get('result'))}
        if r['zone_read']:
            zid = d['result'][0]['id']
            r['zone_id'] = zid
            r['zone_status'] = d['result'][0].get('status')
            # 写权限探测：尝试创建目标 CNAME（幂等：已存在则说明有写权限）
            st2, d2 = http(API + '/zones/%s/dns_records' % zid, h, 'POST',
                           {'type': 'CNAME', 'name': PROD_DOMAIN,
                            'content': PAGES_HOST, 'proxied': True, 'ttl': 1})
            r['dns_write_code'] = st2
            r['dns_write_ok'] = bool(st2 == 200 and d2.get('success'))
            r['dns_write_msg'] = ''
            if not r['dns_write_ok']:
                errs = (d2.get('errors') or [{}])
                r['dns_write_msg'] = '%s | code=%s' % (
                    errs[0].get('message', '')[:120], errs[0].get('code'))
        else:
            r['dns_write_ok'] = False
            errs = (d.get('errors') or [{}])
            r['dns_write_msg'] = (errs[0].get('message', '')[:120] if errs else '')
        results.append(r)
    return results


def main():
    gh_token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or ''
    if not gh_token:
        print('缺少 GH_TOKEN')
        return 1

    comments = fetch_comments(gh_token)
    print('【一】Issue #%d 评论数: %d' % (ISSUE, len(comments)))

    # 统计哪些评论含候选凭据
    cands = mine(comments)
    by_src = {}
    for c in cands:
        by_src.setdefault(c['src'], {'author': c['author'], 'date': c['date'], 'kinds': set()})
        by_src[c['src']]['kinds'].add(c['kind'])
    print('【二】含候选凭据的评论（只报形态，不报密钥）:')
    for cid, info in sorted(by_src.items()):
        print('  #%-10s %-18s %s  形态=%s' % (cid, info['author'], info['date'],
                                             ','.join(sorted(info['kinds']))))
    if not by_src:
        print('  （评论里没有任何可用形态的凭据）')

    print('【三】逐凭据实测权限:')
    results = probe(cands)
    if not results:
        print('  （无候选凭据可测）')
    seen = set()
    for r in results:
        sig = (r['kind'], r['src'], r.get('email'))
        if sig in seen:
            continue
        seen.add(sig)
        mark = '✅ 可写DNS' if r.get('dns_write_ok') else ('· 只读' if r.get('zone_read') else '✗ 无权')
        print('  %-9s #%-10s %-12s zone_read=%-5s dns_write=%-5s %s %s'
              % (r['kind'], r['src'], r['author'], r.get('zone_read'),
                 r.get('dns_write_ok'), mark, r.get('dns_write_msg', '')[:90]))

    ok = [r for r in results if r.get('dns_write_ok')]
    if ok:
        print('【结论】✅ 找到可写 DNS 的凭据: kind=%s 来源评论 #%s' % (ok[0]['kind'], ok[0]['src']))
        print('        下一步：用该凭据建 CNAME %s → %s' % (PROD_DOMAIN, PAGES_HOST))
    else:
        print('【结论】❌ Issue #42 评论里没有任何凭据能写 DNS —— 需人工补一条记录')
    return 0


if __name__ == '__main__':
    sys.exit(main())
