# -*- coding: utf-8 -*-
"""
送审包预检器（D2 扩展：审核人视角可访问性预检，20261120 采纳小酒窝儿《品质改进建议单》）
用途：每次送审前运行，产出预检报告附工单；审核人按报告三步取件（通道→md5→结构）
规则：预检不过=不发工单；md5 以预检报告为准，审核人回读 md5 与报告一致才开审
"""
import json, hashlib, os, sys, datetime

# 送审包清单（相对主对话目录）
PKG = [
    ('candidate', '知识底座生产/entries_gap_batch1_20261120.json', '候选文件（v3）'),
    ('report',    '知识底座生产/gap_batch1_报告_20261120.json', '处理报告'),
    ('ticket',    '知识底座生产/送审_GAP第一批authority与source规范化_20261120.md', '送审工单'),
    ('dict',      '知识底座生产/风声知识底座数据字典v1.3_20261120.md', '数据字典 v1.3.3'),
]
BASE = '/Coze/Drive/小眼镜/所有对话/主对话/'
EXPECT_NOTE = '法源待复核'

def md5(path):
    return hashlib.md5(open(path, 'rb').read()).hexdigest()[:8]

def main():
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    print(f'=== 送审包预检报告 {now} ===')
    ok = True
    struct = {}
    for kind, rel, desc in PKG:
        p = BASE + rel
        if not os.path.exists(p):
            print(f'[FAIL] {desc}: 文件不存在 {rel}')
            ok = False
            continue
        m = md5(p)
        size = os.path.getsize(p)
        print(f'[OK] {desc}: {rel} | md5={m} | {size:,}B')
        if kind == 'candidate':
            d = json.load(open(p, encoding='utf-8'))
            es = d if isinstance(d, list) else d.get('entries')
            from collections import Counter
            dist = Counter(e.get('authority') for e in es)
            total = sum(dist.values())
            note = sum(1 for e in es if e.get('authority_note') == EXPECT_NOTE)
            risk = [e for e in es if e.get('entryType') == 'RISK']
            risk_dist = Counter(e.get('authority') for e in risk)
            city = Counter(e.get('authority') for e in es if e.get('entryType') == 'CITY')
            struct = {'total': total, 'dist': dict(dist), 'note': note,
                      'risk_dist': dict(risk_dist), 'city': dict(city)}
            # 结构断言
            if total != 6143: print(f'[FAIL] 条数 {total} != 6143'); ok = False
            if dict(dist) != {'court': 879, 'official': 1723, 'derived': 2606, 'industry': 907, 'data': 28}:
                print(f'[FAIL] 分布漂移: {dict(dist)}'); ok = False
            if note != 830: print(f'[FAIL] 法源待复核 {note} != 830'); ok = False
            if dict(risk_dist) != {'derived': 945, 'court': 8}: print(f'[FAIL] RISK 分布 {dict(risk_dist)}'); ok = False
            # 主库未动锚定
            main_p = BASE + 'GitHub/fengsheng-shengge/fengsheng-tasks/data/entries.json'
            mm = md5(main_p)
            if mm != 'bc614c84': print(f'[FAIL] 主库 md5 {mm} != bc614c84（基准被污染）'); ok = False
            else: print(f'[OK] 主库锚定: bc614c84 未动')
    print(f'--- 结构: {struct}')
    print(f'=== 预检结论: {"PASS 可发工单" if ok else "FAIL 禁止发工单"} ===')
    # 输出 JSON 报告供工单引用
    rpt = {'time': now, 'pass': ok, 'files': {k: md5(BASE+v) for k, v, _ in PKG if os.path.exists(BASE+v)}, 'struct': struct}
    json.dump(rpt, open(BASE+'知识底座生产/送审包预检报告_20261120.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
