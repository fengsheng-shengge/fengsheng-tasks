#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
D1 免费额度真凶诊断 —— 定位 500 万 rows read/天 到底被谁打穿。

2026-11-05 事故现象：UTC 00:00（北京时间 08:00）额度已过，线上仍返回
  D1_ERROR: Your account has exceeded D1's free tier daily row read limit
说明额度恢复后又被打穿了第二次。只靠读代码猜不出真凶
（CI / deploy / 巡检都不碰 D1，daily-health-check 引用的 scripts/daily_check.py
在仓库里根本不存在），必须用 Cloudflare 官方 analytics 拿实证。

Cloudflare GraphQL schema（2026-11-05 __type 内省实测）：
  AccountD1AnalyticsAdaptiveGroups
      dimensions: databaseId, databaseRole, date, datetime, datetimeHour,
                  datetimeMinute, servedByInstance, servedByRegion
      sum:       rowsRead, rowsWritten, readQueries, writeQueries
      → 无 SQL 文本，但能按分钟拆出「每分钟读了多少行」

  AccountD1QueriesAdaptiveGroups
      dimensions: query, datetime, date, error, databaseId, databaseRole, …
      sum:       rowsRead, rowsReturned, rowsWritten, queryDurationMs
      avg:       rowsRead, rowsReturned, rowsWritten, queryDurationMs
      → 有 SQL 文本（query 维度），avg.rowsRead = 单条查询平均读多少行

本脚本两个数据集都查：Queries 给「哪条 SQL」，Analytics 给「什么时候」。

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


def fetch(dataset, dims, sum_fields, avg_fields, order_by, variables, token):
    """通用取数：viewer.accounts(filter:{accountTag}){ dataset(filter:{}){...} }"""
    sel_sum = ' '.join(sum_fields)
    sel_avg = ' '.join(avg_fields) if avg_fields else ''
    avg_part = ('avg { %s } ' % sel_avg) if sel_avg else ''
    q = ('query($tag: String!, $since: TimeStamp!, $top: Int!) { viewer { '
         'accounts(filter: {accountTag: $tag}) { %s('
         'limit: $top, %sfilter: { datetime_geq: $since }) { '
         'dimensions { %s } sum { %s } %s } } } }'
         ) % (dataset, order_by, dims, sel_sum, avg_part)
    out = gql(q, variables, token)
    if out.get('errors'):
        # 去掉 orderBy 再试
        q2 = q.replace(order_by, '')
        out = gql(q2, variables, token)
        if out.get('errors'):
            return None, out['errors']
    groups = ((((out.get('data') or {}).get('viewer') or {}).get('accounts') or [{}])[0]
              .get(dataset)) or []
    return groups, None


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

    probe = gql('{ viewer { __typename } }', {}, token)
    if probe.get('errors') or probe.get('__http__') or probe.get('__err__'):
        print('GraphQL 不可用: %s' % json.dumps(probe, ensure_ascii=False)[:400])
        return 1
    print('GraphQL 连通（token 有 analytics 读权限）')
    print('')

    variables = {'tag': account, 'since': since, 'top': top}

    # ── ① 按 SQL 文本排行（Queries 数据集）──
    print('=' * 108)
    print('【一】按 SQL 排行（哪些语句读得最多）')
    print('=' * 108)
    groups, err = fetch(
        'd1QueriesAdaptiveGroups',
        'query datetime error',
        ['rowsRead', 'rowsReturned', 'rowsWritten'],
        ['rowsRead', 'rowsReturned'],
        'orderBy: [sum_rowsRead_DESC], ',
        variables, token)
    if err:
        print('  查询失败: %s' % json.dumps(err, ensure_ascii=False)[:500])
        groups = []
    if groups:
        # 同一 SQL 可能有多条记录（按 datetime 拆）→ 按 SQL 文本聚合
        agg = {}
        for g in groups:
            d = g.get('dimensions') or {}
            s = g.get('sum') or {}
            a = g.get('avg') or {}
            key = ' '.join(str(d.get('query') or '').split())
            e = agg.setdefault(key, {'rowsRead': 0, 'rowsReturned': 0, 'rowsWritten': 0,
                                     'avgRowsRead': 0.0, 'n': 0, 'errs': set(),
                                     'first': d.get('datetime'), 'last': d.get('datetime')})
            e['rowsRead'] += s.get('rowsRead') or 0
            e['rowsReturned'] += s.get('rowsReturned') or 0
            e['rowsWritten'] += s.get('rowsWritten') or 0
            e['avgRowsRead'] += a.get('rowsRead') or 0
            e['n'] += 1
            if d.get('error'):
                e['errs'].add(str(d['error']))
            for k in ('first', 'last'):
                if d.get('datetime'):
                    if not e[k] or d['datetime'] < e[k]:
                        e[k] = d['datetime']
                    if not e[k] or d['datetime'] > e[k]:
                        e[k] = d['datetime']
        rows = sorted(agg.items(), key=lambda kv: -kv[1]['rowsRead'])
        total = sum(v['rowsRead'] for _, v in rows)
        print('合计 rowsRead = %s   （免费额度 5,000,000/天）' % format(total, ','))
        print('')
        for i, (sql, v) in enumerate(rows[:top], 1):
            qt = sql if len(sql) <= 300 else sql[:300] + '...'
            print('%2d. rowsRead=%10s  rowsReturned=%8s  rowsWritten=%8s  单条均读=%9s  命中段数=%d'
                  % (i, format(v['rowsRead'], ','), format(v['rowsReturned'], ','),
                     format(v['rowsWritten'], ','),
                     format(int(v['avgRowsRead'] / max(v['n'], 1)), ','), v['n']))
            print('    窗口: %s ~ %s' % (v['first'], v['last']))
            if v['errs']:
                print('    错误: %s' % ' | '.join(list(v['errs'])[:2])[:200])
            print('    SQL: %s' % qt)
            print('')
    else:
        print('  （无数据）')

    # ── ② 时间分布（Analytics 数据集，按分钟）──
    print('=' * 108)
    print('【二】时间分布（哪些时段在烧额度）')
    print('=' * 108)
    groups, err = fetch(
        'd1AnalyticsAdaptiveGroups',
        'datetime',
        ['rowsRead', 'rowsWritten', 'readQueries', 'writeQueries'],
        [],
        'orderBy: [sum_rowsRead_DESC], ',
        variables, token)
    if err:
        print('  查询失败: %s' % json.dumps(err, ensure_ascii=False)[:500])
    elif not groups:
        print('  （该时段无记录）')
    else:
        rows = sorted(groups, key=lambda g: (g.get('dimensions') or {}).get('datetime') or '')
        total = sum((g.get('sum') or {}).get('rowsRead') or 0 for g in rows)
        rq = sum((g.get('sum') or {}).get('readQueries') or 0 for g in rows)
        print('合计 rowsRead = %s   readQueries = %s' % (format(total, ','), format(rq, ',')))
        print('')
        print('%-22s %12s %12s %10s' % ('datetime(UTC)', 'rowsRead', 'rowsWritten', 'readQ'))
        print('-' * 60)
        for g in rows[-40:]:
            d = g.get('dimensions') or {}
            s = g.get('sum') or {}
            print('%-22s %12s %12s %10s' % (
                d.get('datetime'), format(s.get('rowsRead') or 0, ','),
                format(s.get('rowsWritten') or 0, ','),
                format(s.get('readQueries') or 0, ',')))
        print('-' * 60)
        print('※ 只显示最后 40 个采样点；单点峰值可从上面【一】的窗口推断。')

    # ── ③ 来源归属：databaseRole / databaseId / servedByRegion ──
    # 真凶定位到具体 SQL 后，还要确认它来自哪个绑定（Pages Worker / 独立 Worker / CLI），
    # 否则改了本仓库也没用。
    print('=' * 108)
    print('【三】来源归属（databaseRole / databaseId / region）')
    print('=' * 108)
    for ds, label in (('d1QueriesAdaptiveGroups', 'Queries'),
                      ('d1AnalyticsAdaptiveGroups', 'Analytics')):
        groups, err = fetch(ds, 'databaseRole databaseId servedByRegion',
                            ['rowsRead', 'readQueries'], [], '', variables, token)
        if err or not groups:
            print('  %s: %s' % (label, '查询失败' if err else '无数据'))
            continue
        rows = sorted(groups, key=lambda g: -(g.get('sum') or {}).get('rowsRead') or 0)
        total = sum((g.get('sum') or {}).get('rowsRead') or 0 for g in rows)
        print('  %s 合计 rowsRead = %s' % (label, format(total, ',')))
        for g in rows[:8]:
            d = g.get('dimensions') or {}
            s = g.get('sum') or {}
            print('    role=%-22s dbId=%-38s region=%-14s rowsRead=%10s readQ=%6s' % (
                str(d.get('databaseRole')), str(d.get('databaseId')),
                str(d.get('servedByRegion')),
                format(s.get('rowsRead') or 0, ','), format(s.get('readQueries') or 0, ',')))
        print('')

    print('※ 免费额度 5,000,000 rows/day。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
