#!/usr/bin/env python3
"""知识库数据治理脚本（幂等）。

对应需求清单 B/C：
  ① add_slots —— 为「无槽位」的 INFO/DATA/Knowledge 三类词条在 broker_toolkit 新增工具卡槽位承接（additive，可逆）。
  ② severity    —— 收敛 normal/low（未默认执行，需产品给映射口径，--apply 需显式 --map）。
  ③ knowledge   —— Knowledge 类型归属统一提示（待口径，不落库）。

安全：
  - 不改动 entries.json（上游同步源）。
  - ①改的是 broker_toolkit（新增槽位+把缺失词条对象并入 entries dict），additive，可备份还原。
  - 默认 --dry-run 只预览；--apply 才写盘（写盘前自动备份 .pre-remediate）。

用法：
  python3 scripts/remediate_knowledge.py add_slots          # 预览①
  python3 scripts/remediate_knowledge.py add_slots --apply  # 执行①
  python3 scripts/remediate_knowledge.py severity --map normal=medium,low=soft   # 预览②（映射可改）
  python3 scripts/remediate_knowledge.py knowledge          # 预览③（仅报告，不改数据）
"""
import argparse
import json
import os
import shutil
from collections import Counter

BASE = '/workspace/fengsheng-tasks/data'
ENTRIES = f'{BASE}/entries.json'
TOOLKIT = f'{BASE}/broker_toolkit.json'

# 无槽位类型 -> 新槽位显示名（命名可随产品口径调整）
SLOT_NAMES = {
    'INFO': '资讯速递',
    'DATA': '数据参考',
    'Knowledge': '知识科普',
}


def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def save(d):
    backup = f'{TOOLKIT}.pre-remediate'
    if not os.path.exists(backup):
        shutil.copy2(TOOLKIT, backup)
        print(f'✅ 已备份到 {backup}')
    with open(TOOLKIT, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def apply_flag(args, flag):
    # 带 backup 的写盘（复用主入口先行备份），供各 action 统一调用
    global _backbone
    _backbone.save = save


def cmd_add_slots(args):
    entries = load_json(ENTRIES)
    d = load_json(TOOLKIT)
    tt = d['toolTypes']
    existing_ids = set(d.get('entries', {}).keys())

    picks = [e for e in entries for t in SLOT_NAMES
             if e.get('entryType') == t and e.get('id')]
    # 只取尚未进 entries dict 的（保持幂等）
    missing = [e for e in picks if e['id'] not in existing_ids]
    dist = Counter(e['entryType'] for e in missing)
    print(f'[① add_slots] 无槽位词条总: {len(picks)} | 待承接(未入dict): {len(missing)}  分布: {dict(dist)}')
    for t in ['INFO', 'DATA', 'Knowledge']:
        cnt = dist.get(t, 0)
        print(f'   - {t:8s} 新增槽位: 承接 {cnt} 条')

    if not args.apply:
        print('(dry-run) 未写盘。新槽位将承载这些词条。')
        return

    save(d)  # 先备份
    for e in missing:
        t = e['entryType']
        slot = tt.setdefault(t, {'name': SLOT_NAMES[t], 'count': 0, 'entryIds': []})
        if not isinstance(slot.get('entryIds'), list):
            slot['entryIds'] = []
        if e['id'] not in slot['entryIds']:
            slot['entryIds'].append(e['id'])
        slot['count'] = len(slot['entryIds'])
        d['entries'][e['id']] = e
    save(d)
    print(f'✅ 已承接 {len(missing)} 条并写盘。')


def cmd_severity(args):
    entries = load_json(ENTRIES)
    d = load_json(TOOLKIT)
    mapping = {}
    if args.map:
        for kv in args.map.split(','):
            k, _, v = kv.partition('=')
            if k and v:
                mapping[k.strip()] = v.strip()
    if not mapping:
        print('⚠ 请用 --map normal=medium,low=soft 指定映射（待产品口径）。默认 preview 仅统计。')
    dist = Counter(e.get('severity') for e in entries)
    print(f'[② severity] 全量分布: {dict(dist)}')
    if mapping:
        targets = [(e['id'], e.get('severity')) for e in entries if e.get('severity') in mapping]
        print(f'  待映射: {len(targets)} 条 → {mapping}')
        if args.apply:
            changelist = set(e['id'] for e in entries if e.get('severity') in mapping)
            # 同时更新 broker_toolkit.entries 与 entries 源内命中条目
            for e in d.get('entries', {}).values():
                if e.get('id') in changelist and e.get('severity') in mapping:
                    e['severity'] = mapping[e['severity']]
            if args.also_entries:
                for e in entries:
                    if e.get('severity') in mapping:
                        e['severity'] = mapping[e['severity']]
                with open(ENTRIES, 'w', encoding='utf-8') as f:
                    json.dump(entries, f, ensure_ascii=False, indent=2)
            save_ck = save(d)
            print(f'✅ 已映射。默认只改 broker_toolkit；加 --also-entries 才同步 entries.json（需产品确认）。')
    else:
        print('(dry-run) 未写盘。')


def cmd_knowledge(args):
    entries = load_json(ENTRIES)
    n = sum(1 for e in entries if e.get('entryType') == 'Knowledge')
    domains = Counter(str(e.get('domain'))[:12] for e in entries if e.get('entryType') == 'Knowledge')
    print(f'[③ knowledge] Knowledge 类型 {n} 条。域分布(前6): {dict(list(domains.items())[:6])}')
    print('  归属/命名待产品口径，本命令仅报告，不改数据。')


def main():
    ap = argparse.ArgumentParser(description='知识库数据治理（①add_slots ②severity ③knowledge）')
    sub = ap.add_subparsers(dest='action', required=True)

    p1 = sub.add_parser('add_slots')
    p1.add_argument('--apply', action='store_true')

    p2 = sub.add_parser('severity')
    p2.add_argument('--map', help='映射，如 normal=medium,low=soft')
    p2.add_argument('--apply', action='store_true')
    p2.add_argument('--also-entries', action='store_true')

    p3 = sub.add_parser('knowledge')

    args = ap.parse_args()
    if args.action == 'add_slots':
        cmd_add_slots(args)
    elif args.action == 'severity':
        cmd_severity(args)
    elif args.action == 'knowledge':
        cmd_knowledge(args)


if __name__ == '__main__':
    main()