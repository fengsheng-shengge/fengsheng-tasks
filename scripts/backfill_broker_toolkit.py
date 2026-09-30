#!/usr/bin/env python3
"""补齐 broker_toolkit.json 中「纯漏映射」的词条。

数据结构（重要）：
  broker_toolkit.json:
    - toolTypes: {TYPE: {name, count, entryIds: [id,...]}}
        每个槽位按 entryType 组织其词条 id 列表。
    - entries:   {id: {完整词条对象}}   全局词条对象字典，顶层。

背景：entries.json(5843) 比 broker_toolkit.toolTypes 映射(5067) 领先 776 条。
其中 642 条 entryType 属于已有 toolType 槽位（RISK/PROC/LAW/STD/POL/TERM）
却未映射进 entries dict 与该槽位 entryIds，属真实同步漏项。

本脚本把缺失词的【完整对象】追加进 entries dict，并把 id 补进对应 toolType entryIds + 更新 count。

安全：
  - 不改动 entries.json（上游同步源）。
  - 不改无槽位的 INFO/Knowledge/DATA（134 条，留产品决策）。
  - 默认 --dry-run 只预览；--apply 才写盘（写入前自动备份 .pre-backfill）。
用法：
  python3 scripts/backfill_broker_toolkit.py            # 预览
  python3 scripts/backfill_broker_toolkit.py --apply    # 真正补齐
"""
import argparse
import json
import os
import shutil
from collections import Counter

BASE = '/workspace/fengsheng-tasks/data'
ENTRIES = f'{BASE}/entries.json'
TOOLKIT = f'{BASE}/broker_toolkit.json'


def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(description='补齐 broker_toolkit 纯漏映射')
    ap.add_argument('--apply', action='store_true', help='真正写盘（默认仅预览）')
    args = ap.parse_args()

    entries = load_json(ENTRIES)                 # 词条源：list[obj]
    d = load_json(TOOLKIT)                       # 工具夹
    tt = d['toolTypes']
    tk_entries = d['entries']                     # dict{id: obj}

    slot_indices = {}
    for k, v in tt.items():
        slot_indices[k] = set(v.get('entryIds') or [])
    existing_ids = set(tk_entries.keys())
    all_mapped = set().union(*slot_indices.values()) if slot_indices else set()
    all_mapped |= existing_ids

    # 收集缺失：entryType 在槽位内，但 id 不在 entries dict 也不在该槽位 entryIds
    missing = []
    for ent in entries:
        et = ent.get('entryType')
        eid = ent.get('id')
        if not eid:
            continue
        if et in tt and eid not in existing_ids and eid not in slot_indices.get(et, set()):
            missing.append(ent)
    dist = Counter(e.get('entryType') for e in missing)
    print(f'可补齐的纯漏映射词条数: {len(missing)}')
    print(f'distribution: {dict(dist)}')

    if not args.apply:
        print('(dry-run) 未写盘。样例 id:', [e.get("id") for e in missing[:6]])
        return

    # 备份
    backup = f'{TOOLKIT}.pre-backfill'
    if not os.path.exists(backup):
        shutil.copy2(TOOLKIT, backup)
        print(f'已备份到 {backup}')

    for ent in missing:
        eid = ent['id']
        et = ent.get('entryType')
        # 1) 加入对应槽位 entryIds
        if not isinstance(tt[et].get('entryIds'), list):
            tt[et]['entryIds'] = []
        if eid not in tt[et]['entryIds']:
            tt[et]['entryIds'].append(eid)
        tt[et]['count'] = len(tt[et]['entryIds'])
        # 2) 加入 entries dict
        tk_entries[eid] = ent

    with open(TOOLKIT, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'已补齐 {len(missing)} 条并写盘 {TOOLKIT}')


if __name__ == '__main__':
    main()