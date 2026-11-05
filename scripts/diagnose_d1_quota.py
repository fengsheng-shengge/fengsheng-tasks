#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
D1 免费额度真凶诊断 —— 定位 500 万 rows read/天 到底被谁打穿。

2026-11-05 事故现象：UTC 00:00（北京时间 08:00）额度已过，线上仍返回
  D1_ERROR: Your account has exceeded D1's free tier daily row read limit
说明额度恢复后又被打穿了第二次。只靠读代码猜不出真凶
（CI / deploy / 巡检都不碰 D1，daily-health-check 引用的 scripts/daily_check.py
在仓库里根本不存在），必须用 Cloudflare 官方 analytics 拿实证。

做法：GraphQL Analytics API → d1AnalyticsAdaptiveGroups，
     按查询维度拆 sum.rowsRead，直接看哪条 SQL 读得最多。

设计要点：不猜 GraphQL schema。
  Cloudflare 各版本维度名不同（queryText / query / sqlText …），
  这里先用 __type 内省一路走下来，拿到真实字段名再拼查询。

用法（需环境变量）：
  CLOUDFLARE_API_TOKEN   必填
  CLOUDFLARE_ACCOUNT_ID  选填（不填则用 accounts 列表第一个）
  HOURS                  选填，回溯小时数，默认 48
  TOP                    选填，输出条数，默认 30

退出码：0 成功；1 失败。
"""

import json
import os
import sys
import datetime
import urllib.request
import urllib.error

API = 'https://api.cloudflare.com/client/v4/graphql'


def gql(query, variables, token):
    body = json.dumps({'query': query, 'variables': variables}).encode('utf-8')
    req = urllib.request.Request(
        API, data=body,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=90)
        return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'__http__': e.code, '__body__': e.read().decode('utf-8', 'replace')[:600]}
    except Exception as e:
        return {'__err__': str(e)}


def fields_of(type_name, token):
    """内省某个 GraphQL 类型的字段名列表。"""
    s = gql('{ __type(name: "%s") { fields { name } } }' % type_name, {}, token)
    if s.get('data') and s['data'].get('__type'):
        return [f['name'] for f in s['data']['__type']['fields'] or []]
    return []


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    hours = int(os.environ.get('HOURS', '48'))
    top = int(os.environ.get('TOP', '30'))
    if not token:
        print('缺少 CLOUDFLARE_API_TOKEN')
        return 1

    since = (datetime.datetime.now(datetime.timezone.utc)
             - datetime.timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M:%SZ')
    print('=== D1 额度诊断 · 回溯 %d 小时 ===' % hours)
    print('起点(UTC): %s' % since)
    print('')

    probe = gql('{ viewer { __typename } }', {}, token)
    if probe.get('errors') or probe.get('__http__') or probe.get('__err__'):
        print('GraphQL 不可用: %s' % json.dumps(probe, ensure_ascii=False)[:400])
        return 1
    print('GraphQL 连通（token 有 analytics 读权限）')

    # ── 步骤 1：内省出 d1AnalyticsAdaptiveGroups 的维度字段名 ──
    print('')
    print('-- 内省 schema --')
    group_type = None
    for tn in ('D1AdaptiveGroups', 'D1AnalyticsAdaptiveGroups', 'AdaptiveGroups'):
        fl = fields_of(tn, token)
        if fl:
            print('   类型 %s 字段: %s' % (tn, ', '.join(fl)))
            if group_type is None:
                group_type = tn
    if group_type is None:
        tl = gql('{ __schema { types { name } } }', {}, token)
        names = []
        if tl.get('data'):
            names = [t['name'] for t in (tl['data'].get('__schema') or {}).get('types') or []
                     if 'd1' in (t['name'] or '').lower()]
        print('   含 D1 的类型: %s' % (', '.join(names[:40]) if names else '（无）'))
        for tn in names:
            fl = fields_of(tn, token)
            if fl:
                print('   %s: %s' % (tn, ', '.join(fl)))
                if group_type is None:
                    group_type = tn
    if group_type is None:
        print('   拿不到维度字段，退出')
        return 1

    # dimensions 字段的类型名 → 该类型的字段就是真正的维度名
    dim_type = None
    s = gql('{ __type(name: "%s") { fields { name type { name kind ofType { name kind ofType { name } } } } } }'
            % group_type, {}, token)
    if s.get('data') and s['data'].get('__type'):
        for f in s['data']['__type']['fields'] or []:
            if f['name'] == 'dimensions':
                t = f.get('type') or {}
                nm = t.get('name') or ((t.get('ofType') or {}).get('name')) or \
                     (((t.get('ofType') or {}).get('ofType') or {}).get('name'))
                dim_type = nm
                print('   dimensions 字段类型: %s' % nm)
                break
    dim_names = fields_of(dim_type, token) if dim_type else []
    print('   实际维度名: %s' % (', '.join(dim_names) if dim_names else '（无）'))

    text_dim = None
    for cand in ('queryText', 'query', 'sqlText', 'sql', 'statement', 'queryHash', 'queryId'):
        if cand in dim_names:
            text_dim = cand
            break
    time_dim = None
    for cand in ('datetime', 'date', 'minute', 'hour', 'day'):
        if cand in dim_names:
            time_dim = cand
            break
    print('   选用维度: 文本=%s  时间=%s' % (text_dim, time_dim))

    dims = ' '.join([d for d in (time_dim, text_dim) if d])
    if not dims:
        print('   无可用维度，退出')
        return 1
    tfilter = (time_dim or 'datetime') + '_geq'

    # ── 步骤 2：取分组数据 ──
    def build(extra):
        return ('query($tag: String!, $since: TimeStamp!, $top: Int!) { viewer { '
                'accounts(filter: {accountTag: $tag}) { d1AnalyticsAdaptiveGroups('
                'limit: $top, %sfilter: { %s: $since }) { dimensions { %s } '
                'sum { rowsRead rowsWritten } } } } }') % (extra, tfilter, dims)

    variables = {'tag': account, 'since': since, 'top': top}
    out = gql(build('orderBy: [sum_rowsRead_DESC], '), variables, token)
    if out.get('errors'):
        print('   带 orderBy 查询失败，去掉后重试')
        out = gql(build(''), variables, token)
        if out.get('errors'):
            print('   查询失败: %s' % json.dumps(out['errors'], ensure_ascii=False)[:600])
            return 1

    groups = ((((out.get('data') or {}).get('viewer') or {}).get('accounts') or [{}])[0]
              .get('d1AnalyticsAdaptiveGroups')) or []
    if not groups:
        print('该时段无 D1 查询记录（API 可能有延迟）')
        return 0

    total = sum((g.get('sum') or {}).get('rowsRead') or 0 for g in groups)
    print('')
    print('OK: %d 组聚合, 合计 rowsRead = %s  (免费额度 5,000,000/天)'
          % (len(groups), format(total, ',')))
    print('')
    print('=' * 104)
    for i, g in enumerate(groups, 1):
        d = g.get('dimensions') or {}
        s = g.get('sum') or {}
        qt = ' '.join(str(d.get(text_dim) or '').split()) if text_dim else ''
        if len(qt) > 150:
            qt = qt[:150] + '...'
        print('%3d. rowsRead=%10s  rowsWritten=%8s  %s'
              % (i, format(s.get('rowsRead') or 0, ','),
                 format(s.get('rowsWritten') or 0, ','),
                 d.get(time_dim) if time_dim else ''))
        if qt:
            print('     %s' % qt)
    print('=' * 104)
    print('')
    print('※ 免费额度 5,000,000 rows/day；本窗口内合计 %s 行。' % format(total, ','))
    return 0


if __name__ == '__main__':
    sys.exit(main())
