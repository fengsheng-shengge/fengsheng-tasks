#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""打印 Issue #42 里含凭据关键词的评论（密钥全部脱敏），用于看清真实形态。"""
import json, os, re, sys, urllib.request, urllib.error

GH_API = 'https://api.github.com'
REPO = 'fengsheng-shengge/fengsheng-tasks'
ISSUE = 42
KEYWORDS = re.compile(r'account[_\s-]?id|api[_\s-]?token|global[_\s-]?api[_\s-]?key|'
                      r'x-auth-key|x-auth-email|cloudflare', re.I)


def fetch(tok):
    out, page = [], 1
    while True:
        req = urllib.request.Request(
            '%s/repos/%s/issues/%d/comments?per_page=100&page=%d'
            % (GH_API, REPO, ISSUE, page),
            headers={'Authorization': 'Bearer ' + tok,
                     'Accept': 'application/vnd.github+json'})
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=45).read().decode())
        except urllib.error.HTTPError as e:
            print('ERR', e.code, e.read()[:200]); break
        if not isinstance(d, list) or not d: break
        out.extend(d)
        if len(d) < 100: break
        page += 1
    return out


def mask(body):
    b = body
    b = re.sub(r'github_pat_[A-Za-z0-9_]{10,}', '<GH_PAT>', b)
    b = re.sub(r'gh[pousr]_[A-Za-z0-9]{20,}', '<GH_TOKEN>', b)
    b = re.sub(r'v1\.0-[A-Za-z0-9_-]{10,}', '<CF_TOKEN>', b)
    b = re.sub(r'v4\.[A-Za-z0-9_-]{10,}', '<CF_TOKEN4>', b)
    b = re.sub(r'\b[0-9a-f]{37}\b', '<HEX37>', b, flags=re.I)
    b = re.sub(r'\b[0-9a-f]{32}\b', '<HEX32>', b, flags=re.I)
    # 其它长随机串（>=30 且混合大小写/数字）一律脱敏
    b = re.sub(r'\b(?=[A-Za-z0-9_-]{30,}\b)(?=[^\s]*[a-z])(?=[^\s]*[A-Z])[A-Za-z0-9_-]{30,}\b',
               '<RANDOM>', b)
    b = re.sub(r'\b[0-9a-f]{30,}\b', '<HEXLONG>', b, flags=re.I)
    return b


def main():
    tok = os.environ.get('GH_TOKEN') or ''
    cs = fetch(tok)
    print('评论总数: %d' % len(cs))
    hits = [c for c in cs if KEYWORDS.search(c.get('body') or '')]
    print('含凭据关键词的评论数: %d\n' % len(hits))
    for c in hits:
        body = mask(c.get('body') or '')
        body = re.sub(r'\n{3,}', '\n\n', body)
        print('===== 评论 #%s | %s | %s =====' %
              (c.get('id'), (c.get('user') or {}).get('login'), c.get('created_at')))
        print(body[:1400])
        print()


if __name__ == '__main__':
    main()
