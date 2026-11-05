#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""复算《SKU 场景包交付形态规格 v1.0》引用的每一个数字。

用法：python3 scripts/verify_sku_delivery_forms.py
全部一致才退出码 0。

与 verify_sku_scope_numbers.py 同源（同一权威源、同一五包划分），
本脚本负责交付形态层的数字：形态 ↔ entryType 映射后的各形态条目数、
severity 分布、以及「话术卡占比」等派生判断。
"""
import collections
import json
import sys

AUTH = 'data/entries.json'
PKGS = {
    'S1': ['签约前', '带看服务', '谈判斡旋', '业主', '业主侧'],
    'S2': ['签约中', '签约前'],
    'S3': ['签约后', '居住中', '退租出售'],
    'S4': ['资产持有与运营'],
    'S5': ['职业成长', '能力画像', '素养域', '岗位体系', '能力测评', '匠星认证', '场景剧本'],
}
FORM = {
    '话术卡': ['SCRIPT', 'CASE'],
    '流程清单': ['PROC', 'STD'],
    '风险法规卡': ['RISK', 'LAW', 'POL'],
    '测评上岗包': ['QUIZ', 'ABIL', 'SUM', 'JOB', 'CERT'],
    '术语问答库': ['TERM', 'KNOWLEDGE'],
}
# 规格中写下的数字：包 → {形态: 条数} + severity 五档
CLAIM = {
    'S1': {'话术卡': 193, '流程清单': 608, '风险法规卡': 679, '术语问答库': 88,
           'total': 1568, 'hard': 711, 'medium': 513, 'soft': 342, 'low': 2, 'none': 0},
    'S2': {'话术卡': 102, '流程清单': 573, '风险法规卡': 716, '术语问答库': 135,
           'total': 1526, 'hard': 587, 'medium': 519, 'soft': 420, 'low': 0, 'none': 0},
    'S3': {'话术卡': 177, '流程清单': 360, '风险法规卡': 774, '术语问答库': 145,
           'total': 1456, 'hard': 629, 'medium': 544, 'soft': 281, 'low': 2, 'none': 0},
    'S4': {'话术卡': 226, '流程清单': 163, '风险法规卡': 232, '术语问答库': 10,
           'total': 631, 'hard': 313, 'medium': 223, 'soft': 95, 'low': 0, 'none': 0},
    'S5': {'话术卡': 211, '流程清单': 205, '风险法规卡': 258, '测评上岗包': 226, '术语问答库': 30,
           'total': 930, 'hard': 307, 'medium': 211, 'soft': 159, 'low': 1, 'none': 252},
}
# 派生判断：话术卡占比（S4 最高 35.8%、S2 最低 6.7%）
CLAIM_TALK = {'S1': 12.3, 'S2': 6.7, 'S3': 12.2, 'S4': 35.8, 'S5': 22.7}


def main():
    entries = json.load(open(AUTH, encoding='utf-8'))
    ok = True

    def chk(label, actual, claimed, tol=None):
        nonlocal ok
        good = (abs(actual - claimed) < tol) if tol is not None else (actual == claimed)
        ok = ok and good
        print('  %-40s 实际=%-10s 规格写=%-10s %s'
              % (label, actual, claimed, '✅' if good else '❌'))

    for k, ds in PKGS.items():
        sub = [e for e in entries if e.get('domain') in ds]
        c = collections.Counter(e.get('entryType') for e in sub)
        sv = collections.Counter(e.get('severity') for e in sub)
        print('=== %s ===' % k)
        chk('%s 条目总数' % k, len(sub), CLAIM[k]['total'])
        for form, ets in FORM.items():
            n = sum(c.get(t, 0) for t in ets)
            claimed = CLAIM[k].get(form, 0)
            if n or claimed:
                chk('  %s %s' % (k, form), n, claimed)
        for sev in ['hard', 'medium', 'soft', 'low']:
            chk('  %s severity %s' % (k, sev), sv[sev], CLAIM[k][sev])
        chk('  %s severity 无' % k, sv[None], CLAIM[k]['none'])
        talk = sum(c.get(t, 0) for t in FORM['话术卡'])
        chk('  %s 话术卡占比(%%)' % k, round(100.0 * talk / len(sub), 1), CLAIM_TALK[k], tol=0.05)

    s5 = [e for e in entries if e.get('domain') in PKGS['S5']]
    chk('S5 无 severity 占比(%)', round(100.0 * sum(1 for e in s5 if e.get('severity') is None) / len(s5), 1),
        27.1, tol=0.05)
    s3 = [e for e in entries if e.get('domain') in PKGS['S3']]
    chk('S3 LAW 占风险法规卡(%)', round(100.0 * sum(1 for e in s3 if e.get('entryType') == 'LAW')
        / sum(1 for e in s3 if e.get('entryType') in FORM['风险法规卡']), 1), 64.7, tol=0.05)

    print()
    print('=== 复算结论：%s ===' % ('✅ 全部一致' if ok else '❌ 存在不一致，请修正规格或数据'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
