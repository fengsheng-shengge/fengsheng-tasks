#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""复算《SKU 破局方案 v1.0》引用的每一个数字。

用法：python3 scripts/verify_sku_scope_numbers.py
输出：逐项「实际 vs 方案写」比对，全部一致才退出码 0。

起因：方案初稿曾把「全仓 grep 定价|付费 = 0 命中」写进事实表，实际复算是
242 个文件含该类词、但支付调用为 0 —— 表述不准确已改正。本脚本用于防止
方案数字再次漂移，让任何人都能独立复算。
"""
import collections
import json
import re
import subprocess
import sys

AUTH = 'data/entries.json'
DOC = 'docs/SKU破局方案v1.0_小豆子_20261105.md'

# 方案 §1.2 的五个场景包
PKGS = {
    'S1': ['签约前', '带看服务', '谈判斡旋', '业主', '业主侧'],
    'S2': ['签约中', '签约前'],
    'S3': ['签约后', '居住中', '退租出售'],
    'S4': ['资产持有与运营'],
    'S5': ['职业成长', '能力画像', '素养域', '岗位体系', '能力测评', '匠星认证', '场景剧本'],
}
# 方案中写下的数字
CLAIM = {
    'total': 6143, 'consumerQ': 5844, 'consumerBenefit': 5844,
    'sev_hard': 2467, 'sev_medium': 2005, 'sev_soft': 1393, 'sev_low': 5, 'sev_none': 273,
    'S1_n': 1568, 'S2_n': 1526, 'S3_n': 1456, 'S4_n': 631, 'S5_n': 930,
    'S5_q': 678, 'union': 5253, 'union_pct': 85.5,
    'S3_law_pct': 34.4, 'S4_case_pct': 35.8,
    'kw_files': 236, 'paycall': 0, 'price_files': 1,
}
# 关键词集固定（方案事实表同款），口径一经确定不再变更，避免数字漂移：
#   统计「定价/付费/支付/checkout/stripe/价格」六个词，排除 data/domains/
#   —— 不含「￥」「元/」等过宽符号，否则会命中与定价无关的金额表述
PAY_RE = re.compile(r'(createPayment|requestPayment|stripe|checkout|payNow|下单支付|立即购买)', re.I)
PRICE_RE = re.compile(r'(价格|定价|付费|订阅|会员|VIP|套餐)[^\n]{0,24}[¥￥$]\s*\d')
KW = ['定价', '付费', '支付', 'checkout', 'stripe', '价格']


def tracked():
    out = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout
    return [p.decode('utf-8') for p in out.split(b'\0') if p]


def main():
    entries = json.load(open(AUTH, encoding='utf-8'))
    ok = True

    def chk(label, actual, claimed, tol=None):
        nonlocal ok
        good = (abs(actual - claimed) < tol) if tol is not None else (actual == claimed)
        ok = ok and good
        print('  %-40s 实际=%-10s 方案写=%-10s %s'
              % (label, actual, claimed, '✅' if good else '❌'))

    print('=== §一 / §二 底座数字 ===')
    chk('权威源条目总数', len(entries), CLAIM['total'])
    chk('consumerQ 非空条数', sum(1 for e in entries if e.get('consumerQ')), CLAIM['consumerQ'])
    chk('consumerBenefit 非空条数', sum(1 for e in entries if e.get('consumerBenefit')), CLAIM['consumerBenefit'])
    sv = collections.Counter(e.get('severity') for e in entries)
    chk('severity hard', sv['hard'], CLAIM['sev_hard'])
    chk('severity medium', sv['medium'], CLAIM['sev_medium'])
    chk('severity soft', sv['soft'], CLAIM['sev_soft'])
    chk('severity low', sv['low'], CLAIM['sev_low'])
    chk('severity None', sv[None], CLAIM['sev_none'])

    print('=== §1.2 五包构成 ===')
    union = set()
    for k, ds in PKGS.items():
        sub = [e for e in entries if e.get('domain') in ds]
        for e in sub:
            union.add(e.get('id'))
        q = sum(1 for e in sub if e.get('consumerQ'))
        chk('%s 条目数' % k, len(sub), CLAIM['%s_n' % k])
        if k == 'S5':
            chk('S5 C端问答对', q, CLAIM['S5_q'])
        else:
            chk('%s C端问答对全覆盖' % k, q, CLAIM['%s_n' % k])
    chk('五包并集去重条目数', len(union), CLAIM['union'])
    chk('五包并集覆盖率(%)', round(100.0 * len(union) / len(entries), 1), CLAIM['union_pct'], tol=0.05)

    s3 = [e for e in entries if e.get('domain') in PKGS['S3']]
    chk('S3 LAW 占比(%)', round(100.0 * sum(1 for e in s3 if e.get('entryType') == 'LAW') / len(s3), 1),
        CLAIM['S3_law_pct'], tol=0.05)
    s4 = [e for e in entries if e.get('domain') in PKGS['S4']]
    chk('S4 CASE 占比(%)', round(100.0 * sum(1 for e in s4 if e.get('entryType') == 'CASE') / len(s4), 1),
        CLAIM['S4_case_pct'], tol=0.05)

    print('=== §〇 付费实现核查 ===')
    kw_hits = 0
    pay_hits = []
    price_hits = []
    for p in tracked():
        if p.startswith('data/domains/'):
            continue
        try:
            raw = open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        if any(k in raw for k in KW):
            kw_hits += 1
        if p.endswith(('.js', '.html', '.wxml', '.json')):
            if PAY_RE.search(raw):
                pay_hits.append(p)
            if PRICE_RE.search(raw):
                price_hits.append(p)
    chk('含「定价/付费/价格」等词文件数', kw_hits, CLAIM['kw_files'])
    chk('支付调用(createPayment等)命中文件数', len(pay_hits), CLAIM['paycall'])
    chk('含价格数字的文件数', len(price_hits), CLAIM['price_files'])
    print('     唯一含价格数字文件：%s' % (price_hits[0] if price_hits else '无'))
    if price_hits:
        refs = subprocess.run(
            ['grep', '-rl', price_hits[0], '--include=*.html', '--include=*.js', '.'],
            capture_output=True, text=True).stdout.strip().splitlines()
        refs = [r for r in refs if price_hits[0] not in r]
        print('     是否被其它页面/代码引用：%s' % ('是（%s）' % refs[:3] if refs else '否 —— 不在运行时链路 ✅'))

    print()
    print('=== 复算结论：%s ===' % ('✅ 全部一致' if ok else '❌ 存在不一致，请修正方案或数据'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
