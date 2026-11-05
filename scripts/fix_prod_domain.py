#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 fengsheng.tech 生产域名的 Pages 自定义域名绑定 + DNS 主机记录。

【背景】
2026-11-05 实测：
  · 生产域名 fengsheng.tech 的 A / AAAA / CNAME 主机记录全缺（NS/SOA/MX/TXT 正常）
  · Cloudflare Pages 项目 fengsheng 的 domains 只有 ['fengsheng-ee9.pages.dev']
    —— 连自定义域名都没绑，所以 DNS 里也就没有对应的主机记录
  · 影响：生产域名上所有接口不可达（小程序真机埋点、小程序服务器域名配置全卡在这）

【本脚本做两件事】
  1. 给 Pages 项目 fengsheng 添加自定义域名 fengsheng.tech
     POST /accounts/{acct}/pages/projects/{project}/domains
  2. 在该 Zone 里补 DNS 主机记录：CNAME fengsheng.tech → fengsheng-ee9.pages.dev
     （Pages 自定义域名官方要求 CNAME；A 记录则用 Pages 的回退 IP）

【安全】
  · 只动 fengsheng.tech 这一个域名，不碰其他域名/记录
  · 建记录前先读现有记录，已存在则跳过（幂等）
  · 默认 dry-run，加 --apply 才真正写入

用法：
  python3 scripts/fix_prod_domain.py            # 只看会做什么
  python3 scripts/fix_prod_domain.py --apply    # 真的写
"""

import json
import os
import sys
import urllib.request
import urllib.error

API = 'https://api.cloudflare.com/client/v4'
PROD_DOMAIN = os.environ.get('PROD_DOMAIN', 'fengsheng.tech')
PAGES_PROJECT = 'fengsheng'
PAGES_HOST = 'fengsheng-ee9.pages.dev'

# Pages 自定义域名的回退 IP（官方给 CNAME 失败时的 A 记录用）
PAGES_FALLBACK_IPS = ['172.66.44.177', '172.66.47.79']

# fengsheng.tech 的 zone id（只用于提示文案，脚本实际按域名查 zone）
ZONE_ID_HINT = '11d52deaf9a0b2ae04dbf0a349553d72'


def api(path, token, method='GET', body=None):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(
        API + path, data=data, method=method,
        headers={'Authorization': 'Bearer ' + token,
                 'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'success': False,
                'errors': [{'message': e.read().decode('utf-8', 'replace')[:400]}]}
    except Exception as e:
        return {'success': False, 'errors': [{'message': str(e)}]}


def find_zone(token, account):
    """按名字找 Zone。支持传子域名（www.fengsheng.tech → zone fengsheng.tech）。"""
    # 1) 直接按名字找
    d = api('/zones?name=%s&account.id=%s' % (PROD_DOMAIN, account), token)
    if d.get('success') and d.get('result'):
        return d['result'][0]
    # 2) 逐级去掉最左标签，找父级 zone
    labels = PROD_DOMAIN.split('.')
    for i in range(1, len(labels) - 1):
        parent = '.'.join(labels[i:])
        d = api('/zones?name=%s&account.id=%s' % (parent, account), token)
        if d.get('success') and d.get('result'):
            print('  （目标 %s 属于 zone %s）' % (PROD_DOMAIN, parent))
            return d['result'][0]
    # 3) 全量列出再按 name 匹配
    d = api('/zones?per_page=50', token)
    if d.get('success'):
        for z in d.get('result') or []:
            if z.get('name') == PROD_DOMAIN:
                return z
    return None


def main():
    apply = '--apply' in sys.argv
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    if not token or not account:
        print('缺少 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID')
        return 1

    print('=== %s ===' % ('实际执行' if apply else 'DRY-RUN（加 --apply 才会写）'))
    print('')

    # ── ① Zone ──
    zone = find_zone(token, account)
    if not zone:
        print('❌ 找不到 Zone: %s（确认 token 有 Zone 读权限，且域名已添加到账号）' % PROD_DOMAIN)
        return 1
    zid = zone['id']
    print('✓ Zone: %s (id=%s, status=%s)' % (zone.get('name'), zid, zone.get('status')))

    # ── ② 现有 DNS 主机记录 ──
    d = api('/zones/%s/dns_records?name=%s' % (zid, PROD_DOMAIN), token)
    existing = (d.get('result') or []) if d.get('success') else []
    print('  现有 %s 主机记录: %d 条' % (PROD_DOMAIN, len(existing)))
    for r in existing:
        print('    %s %s %s → %s' % (r.get('type'), r.get('name'), r.get('ttl'), r.get('content')))

    # ── ③ Pages 自定义域名 ──
    p = api('/accounts/%s/pages/projects/%s' % (account, PAGES_PROJECT), token)
    domains = (p.get('result') or {}).get('domains') or []
    print('  Pages 项目 %s 已绑域名: %s' % (PAGES_PROJECT, domains))
    if PROD_DOMAIN in domains:
        print('  ✓ Pages 已绑定 %s，跳过添加' % PROD_DOMAIN)
    elif apply:
        d = api('/accounts/%s/pages/projects/%s/domains' % (account, PAGES_PROJECT),
                token, method='POST', body={'name': PROD_DOMAIN})
        if d.get('success'):
            print('  ✓ 已给 Pages 项目添加自定义域名 %s' % PROD_DOMAIN)
        else:
            print('  ✗ 添加失败: %s' % json.dumps(d.get('errors'), ensure_ascii=False)[:300])
    else:
        print('  → 将添加 Pages 自定义域名 %s' % PROD_DOMAIN)

    # ── ④ DNS 主机记录 ──
    # 优先 CNAME（Pages 自定义域名官方要求）；失败则回退 A 记录（官方回退 IP）。
    have_cname = any(r.get('type') == 'CNAME' and r.get('name') == PROD_DOMAIN for r in existing)
    have_a = any(r.get('type') == 'A' and r.get('name') == PROD_DOMAIN for r in existing)
    if have_cname or have_a:
        print('  ✓ DNS 主机记录已存在，跳过')
    else:
        candidates = [
            ('CNAME', {'type': 'CNAME', 'name': PROD_DOMAIN, 'content': PAGES_HOST,
                       'ttl': 1, 'proxied': True,
                       'comment': 'Pages custom domain (fix_prod_domain.py)'}),
            ('A', {'type': 'A', 'name': PROD_DOMAIN, 'content': PAGES_FALLBACK_IPS[0],
                   'ttl': 1, 'proxied': True,
                   'comment': 'Pages custom domain fallback IP (fix_prod_domain.py)'}),
        ]
        for label, rec in candidates:
            print('  → 尝试新增 DNS: %s %s → %s (proxied)' % (label, PROD_DOMAIN, rec['content']))
            if not apply:
                continue
            d = api('/zones/%s/dns_records' % zid, token, method='POST', body=rec)
            if d.get('success'):
                print('  ✓ DNS 记录已创建（%s）' % label)
                break
            err = json.dumps(d.get('errors'), ensure_ascii=False)[:200]
            print('  ✗ %s 失败: %s' % (label, err))
            if 'Authentication' in err or '10000' in err:
                print('    → token 无 DNS 写权限。两条路，二选一：')
                print('')
                print('    路线 A（最快，30 秒）：Cloudflare Dashboard 手动加一条记录')
                print('       Zone %s → DNS → Records → Add record' % PROD_DOMAIN)
                print('       类型：CNAME    名称：%s    指向：%s' % (PROD_DOMAIN, rec['content']))
                print('       Proxy status：Proxied（橙云）    TTL：Auto')
                print('')
                print('    路线 B（可自动化）：建一个带 Zone:DNS:Edit 的 token，')
                print('       存成仓库 secret CLOUDFLARE_DNS_TOKEN，')
                print('       再跑本 workflow（apply=true）→ 脚本会自动用它写记录。')
                print('       token 权限建议只给：Zone:DNS:Edit + Zone:Read，')
                print('       资源限定 zone fengsheng.tech（zone_id=%s）' % ZONE_ID_HINT)
                break
        if apply and not (have_cname or have_a):
            pass

    if not apply:
        print('')
        print('（DRY-RUN 结束，加 --apply 执行）')
    else:
        print('')
        print('=== 完成 · DNS 生效需 1~5 分钟 ===')
        print('验证：curl -4 -sI https://%s/api/health' % PROD_DOMAIN)
    return 0


if __name__ == '__main__':
    sys.exit(main())
