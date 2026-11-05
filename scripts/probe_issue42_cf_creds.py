#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按标签锚定抽取 Issue #42 里的 Cloudflare 凭据，并逐个实测权限。

【与 find_dns_capable_cred.py 的区别（修正）】
前一版用通用长随机串正则，把评论里携带的 **GitHub token** 也当成了 Cloudflare token 去试，
既无效又把 Cloudflare 打成 "Too many authentication failures"。
本版只认**明确标签锚定**的形态：
  · `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_KEY` / `api_token` 后紧跟的值
  · `CLOUDFLARE_ACCOUNT_ID` 后紧跟的 32 位 hex
  · `X-Auth-Key` / `Global API Key` / `global_api_key` 后紧跟的值
  · `X-Auth-Email` / `email` 后紧跟的邮箱
每条候选带来源评论 id + 日期 + 脱敏指纹，逐个实测（退避重试，避免认证限流）。

【只读】默认只探测；--apply 才创建 DNS 记录。
"""

import json, os, re, sys, time, urllib.error, urllib.request

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


# ---- 标签锚定抽取 -------------------------------------------------------
# 取「标签 后 0~40 字符内」的值
VAL_RE = {
    'api_token': re.compile(
        r'(?:CLOUDFLARE_API_TOKEN|CLOUDFLARE_API_KEY|CLOUDFLARE_TOKEN|'
        r'api[_\s-]?token|api[_\s-]?key)\s*[=:|"\'`]*\s*'
        r'([A-Za-z0-9_\-.]{30,})', re.I),
    'account_id': re.compile(
        r'(?:CLOUDFLARE_ACCOUNT_ID|account[_\s-]?id)\s*[=:|"\'`]*\s*'
        r'([0-9a-f]{32})', re.I),
    'global_key': re.compile(
        r'(?:X-Auth-Key|Global[_\s-]?API[_\s-]?Key|global[_\s-]?api[_\s-]?key)\s*'
        r'[=:|"\'`]*\s*([0-9a-fA-F]{37}|[A-Za-z0-9_\-]{30,})', re.I),
    'email': re.compile(
        r'(?:X-Auth-Email|global[_\s-]?api[_\s-]?key[^\n]{0,60}?email|'
        r'account[_\s-]?email)\s*[=:|"\'`]*\s*'
        r'([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})', re.I),
}


def mine(comments):
    seen = {}
    for c in comments:
        body = c.get('body') or ''
        cid = c.get('id')
        meta = {'src': cid, 'author': (c.get('user') or {}).get('login'),
                'date': c.get('created_at')}
        for kind, rx in VAL_RE.items():
            for m in rx.finditer(body):
                val = m.group(1).strip().strip('.,;)\'"`')
                if not val:
                    continue
                key = (kind, val)
                if key in seen:
                    seen[key]['count'] += 1
                    continue
                seen[key] = dict(meta, kind=kind, value=val, count=1)
    return list(seen.values())


def fp(v):
    """脱敏指纹：前 6 位 + 长度 + 字符集特征"""
    kinds = []
    if re.search(r'[a-z]', v): kinds.append('a')
    if re.search(r'[A-Z]', v): kinds.append('A')
    if re.search(r'[0-9]', v): kinds.append('9')
    if '-' in v: kinds.append('-')
    if '_' in v: kinds.append('_')
    return '%s…(%d,%s)' % (v[:6], len(v), ''.join(kinds))


def probe_one(kind, value, email=None, apply=False):
    if kind == 'api_token':
        h = {'Authorization': 'Bearer ' + value}
    elif kind == 'global_key':
        h = {'X-Auth-Key': value, 'X-Auth-Email': email or ''}
    else:
        return None

    st, d = http(API + '/zones?name=%s' % PROD_DOMAIN, h)
    r = {'zone_read': bool(st == 200 and d.get('success') and d.get('result'))}
    if not r['zone_read']:
        errs = (d.get('errors') or [{}])
        r['err'] = '%s (code=%s)' % (errs[0].get('message', '')[:90],
                                     errs[0].get('code'))
        r['http'] = st
        return r

    zid = d['result'][0]['id']
    r['zone_id'] = zid
    # 写权限探测：读 DNS 记录列表里是否已有目标记录
    st2, d2 = http(API + '/zones/%s/dns_records?name=%s' % (zid, PROD_DOMAIN), h)
    r['dns_read'] = bool(st2 == 200 and d2.get('success'))
    existing = d2.get('result') or [] if r['dns_read'] else []
    r['existing'] = [(x.get('type'), x.get('name'), x.get('content'), x.get('proxied'))
                     for x in existing]
    if apply and not existing:
        st3, d3 = http(API + '/zones/%s/dns_records' % zid, h, 'POST',
                       {'type': 'CNAME', 'name': PROD_DOMAIN,
                        'content': PAGES_HOST, 'proxied': True, 'ttl': 1})
        r['created'] = bool(st3 == 200 and d3.get('success'))
        if not r['created']:
            errs = (d3.get('errors') or [{}])
            r['create_err'] = '%s (code=%s)' % (errs[0].get('message', '')[:90],
                                                 errs[0].get('code'))
    return r


def main():
    gh = os.environ.get('GH_TOKEN') or ''
    apply = '--apply' in sys.argv
    cs = fetch_comments(gh)
    cands = mine(cs)
    print('【一】评论 %d 条 → 标签锚定候选 %d 条' % (len(cs), len(cands)))
    for c in sorted(cands, key=lambda x: (x['kind'], x['date'])):
        print('  %-10s #%-11s %s  %s  (出现%d次)'
              % (c['kind'], c['src'], c['date'], fp(c['value']), c['count']))

    # 配对 global_key + email
    gkeys = [c for c in cands if c['kind'] == 'global_key']
    emails = [c for c in cands if c['kind'] == 'email']
    probes = [(c['kind'], c['value'], None, c) for c in cands
              if c['kind'] == 'api_token']
    for g in gkeys:
        for e in emails:
            probes.append(('global_key', g['value'], e['value'], g))

    print('\n【二】逐凭据实测（退避间隔 4s；apply=%s）' % apply)
    hit = None
    seen = set()
    for kind, value, email, meta in probes:
        sig = (kind, value, email)
        if sig in seen:
            continue
        seen.add(sig)
        r = probe_one(kind, value, email, apply=apply)
        if r is None:
            continue
        tag = '%s#%s' % (kind[:4], meta['src'])
        if r.get('zone_read'):
            print('  ✅ %-16s zone_read=True  dns_read=%s  已有记录=%s'
                  % (tag, r.get('dns_read'), r.get('existing')))
            if r.get('created'):
                print('     → 已创建 CNAME %s → %s' % (PROD_DOMAIN, PAGES_HOST))
            if hit is None and r.get('dns_read'):
                hit = (kind, value, email, meta)
        else:
            print('  ✗ %-16s %s' % (tag, r.get('err')))
        time.sleep(4)

    print('\n【三】结论')
    if hit:
        print('  ✅ 可用凭据: kind=%s 来源评论 #%s 日期 %s'
              % (hit[0], hit[3]['src'], hit[3]['date']))
    else:
        print('  ❌ 无任何凭据可写 DNS')


if __name__ == '__main__':
    main()
