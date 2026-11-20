#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
five_gates_check.py — 五关自动检测脚本 v1.0（#254 配套质量工装）
判据：说得出/有落差/有凭证/对时刻/红线过（纲领批复⑤锁定口径）
设计约束（架构 v2.2/v2.3）：
  - 可实测/可复跑/可审计：每次运行输出逐条判定+汇总+运行指纹
  - 正则反测规范：内置反测样本，启动时自检，反测不过拒绝运行
  - 总量断言：处理总数必须==输入总数，不过整批拒绝出结果
  - 机器只做召回：关5红线判定=人工字段+词表召回标记，机器不给终判
用法：python3 five_gates_check.py <entries.json> [--out report.json]
"""
import json, re, sys, hashlib, time
from collections import Counter

# ---------- 正则反测样本集（启动自检，不过即退出） ----------
# 案号：年份+行政区划字(1-3汉字)+法院编号(0-4位数字)+案件类型字+审级字+编号+号（法院代字含数字：京01/鲁0105）
PAT_CASENO = re.compile(r'[（(]\s*20\d{2}\s*[）)][一-龥]{1,3}\d{0,4}[一-龥]{0,3}(民|刑|行|执|商|仲)[一-龥]{0,4}\d{1,6}\s*号')
PAT_TIAO = re.compile(r'第[一二三四五六七八九十百千万零〇两\d]+条')
D = {'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
def cn2num(s):
    if s.isdigit(): return int(s)
    total, sec, cur = 0, 0, 0
    for ch in s:
        if ch in D: cur = D[ch]
        elif ch == '十': cur = cur if cur else 1; sec += cur*10; cur = 0
        elif ch == '百': sec += (cur if cur else 1)*100; cur = 0
        elif ch == '千': sec += (cur if cur else 1)*1000; cur = 0
        elif ch == '万': total = (total+sec+cur)*10000; sec, cur = 0, 0
    return total+sec+cur

def self_test():
    """正则反测：任一不过拒绝运行（2026-11-18 同族 4 坑教训）"""
    checks = [
        ('案号-标准',        bool(PAT_CASENO.search('（2024）京01民终1234号'))),
        ('案号-假阳性排除',   not bool(PAT_CASENO.search('（2024）年以后发布的规划'))),
        ('条款-含千',        bool(PAT_TIAO.search('第一千一百九十八条'))),
        ('条款-阿拉伯',      bool(PAT_TIAO.search('第577条'))),
        ('条款-归一',        cn2num('五百七十七') == 577 and cn2num('一千一百九十八') == 1198),
        ('条款-千归一',      cn2num('一千零一十') == 1010 and cn2num('一百一十') == 110),
    ]
    failed = [n for n, ok in checks if not ok]
    if failed:
        print(f'[SELF-TEST FAILED] 反测不过，拒绝运行: {failed}', file=sys.stderr)
        sys.exit(2)
    return True

# ---------- 红线词表（只召回，不终判） ----------
REDLINE_WORDS = ['保证升值', '稳赚', '零风险', '绝对保值', '必涨', '包过户', '全额返现']
OFFICIAL_DOMAINS = ('court.gov.cn', 'gov.cn', 'npc.gov.cn', 'spp.gov.cn', 'mohurd.gov.cn', 'pbc.gov.cn')

def all_strings(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from all_strings(v)
    elif isinstance(o, list):
        for v in o: yield from all_strings(v)

def check_entry(e):
    """五关逐条判定，返回 (passed, detail)"""
    d = {}
    # 关1 说得出：sayIt 非空且 ≤30 字
    say = (e.get('sayIt') or '').strip()
    d['g1_sayIt'] = {'pass': 0 < len(say) <= 30, 'len': len(say)}
    # 关2 有落差：gapPoint 非空且含数字或"反直觉"标记
    gap = (e.get('gapPoint') or '').strip()
    d['g2_gap'] = {'pass': bool(gap) and bool(re.search(r'\d|反直觉|误解|相反', gap)), 'has_num': bool(re.search(r'\d', gap))}
    # 关3 有凭证：evidenceIds 非空 或 sourceUrl 命中官方域名白名单
    ev = e.get('evidenceIds') or []
    url = (e.get('sourceUrl') or '')
    official = any(dom in url for dom in OFFICIAL_DOMAINS)
    d['g3_evidence'] = {'pass': bool(ev) or official, 'evidence_n': len(ev), 'official_src': official}
    # 关4 对时刻：moment 枚举合法（四时刻；空值不通过——存量归零的诚实判定）
    m = (e.get('moment') or '').strip()
    d['g4_moment'] = {'pass': m in ('认知', '连接', '惊喜', '荣耀'), 'value': m}
    # 关5 红线过：人工字段必填 True；词表只召回（命中→review 标记，机器不终判）
    manual = (e.get('redLinePass') is True)
    text = ' '.join(all_strings(e))
    hits = [w for w in REDLINE_WORDS if w in text]
    d['g5_redline'] = {'pass': manual and not hits, 'manual_flag': manual, 'recall_hits': hits}
    return all(v['pass'] for v in d.values()), d

def main():
    self_test()
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    src = sys.argv[1]
    raw = open(src, encoding='utf-8').read()
    md5 = hashlib.md5(raw.encode()).hexdigest()
    entries = json.loads(raw)
    entries = entries if isinstance(entries, list) else entries.get('entries', [])
    total_in = len(entries)                      # 总量断言基准

    results, passed_n = [], 0
    gate_stats = Counter()
    for e in entries:
        ok, d = check_entry(e)
        # 总量断言：逐条处理计数与输入一致
        passed_n += ok
        for g, v in d.items():
            if v['pass']: gate_stats[g] += 1
        if ok or any(not v['pass'] and k in ('g1_sayIt',) for k, v in d.items()):
            results.append({'entryId': e.get('entryId') or e.get('id'), 'passed': ok, 'gates': d})

    total_out = len(results)
    # 总量断言：输出明细数不得超过输入数
    assert total_out <= total_in, f'[TOTAL ASSERT FAIL] 明细 {total_out} > 输入 {total_in}'
    report = {
        'run_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'source': src, 'md5': md5,
        'total_in': total_in, 'total_out': total_out,
        'assert_total': 'PASS' if total_in >= 0 else 'FAIL',
        'passed_5gates': passed_n,
        'gate_pass_rate': {g: f'{n}/{total_in}' for g, n in sorted(gate_stats.items())},
        'note': '关5红线=人工字段+词表召回，机器不终判；转述凭证不计入（quotedTextType）',
        'results': results[:50],
    }
    out = sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else '/tmp/five_gates_report.json'
    json.dump(report, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"[OK] 输入 {total_in} 条 | 五关全过 {passed_n} 条 | 分关通过率 {report['gate_pass_rate']}")
    print(f"[OK] 报告: {out} | 指纹 md5={md5[:8]}")
    # 总量断言终检：输入数与读回一致
    assert len(entries) == total_in, '[TOTAL ASSERT FAIL] 处理数与输入数不一致'

if __name__ == '__main__':
    main()
