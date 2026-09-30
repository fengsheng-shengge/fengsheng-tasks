#!/usr/bin/env python3
"""风声知识库数据审计脚本。
只读审计，不修改任何数据源。
检查：entryType 分布、severity 分布、broker_toolkit 与 entries 的映射差集。
"""
import json
from collections import Counter

BASE = '/workspace/fengsheng-tasks/data'
entries = json.load(open(f'{BASE}/entries.json', encoding='utf-8'))
idx = {x.get('id'): x for x in entries for x in [x]}  # {id: entry}
idx = {x.get('id'): x for x in entries}

print('=== A. 知识词条基线 ===')
print(f'entries 总条数: {len(entries)}  唯一id: {len(idx)}')
print('entryType 分布:', dict(Counter(x.get('entryType') for x in entries)))

print()
print('=== B. severity 分布 ===')
print('severity 分布:', dict(Counter(x.get('severity') for x in entries)))

print()
print('=== C. broker_toolkit 映射审计 ===')
d = json.load(open(f'{BASE}/broker_toolkit.json', encoding='utf-8'))
tt = d.get('toolTypes', {})
print('toolTypes 槽位:', list(tt.keys()))
tool_mapped = set()
for k, v in tt.items():
    ids = v.get('entryIds', []) if isinstance(v, dict) else []
    if isinstance(ids, list):
        tool_mapped.update(ids)
top_entries = set(x for x in d.get('entries', []) if isinstance(x, str))
all_mapped = tool_mapped | top_entries
print(f'toolTypes 映射数: {len(tool_mapped)}  顶层entries数: {len(top_entries)}  合计唯一: {len(all_mapped)}')

all_entry_ids = set(idx.keys())
unmapped = all_entry_ids - all_mapped
print(f'未映射进工具卡的词条数: {len(unmapped)}')
uq = {i: idx[i].get('entryType') for i in unmapped}
print('未映射词条 entryType 分布:', dict(Counter(uq.values())))

# 有槽位却漏 vs 无槽位
with_slot = [i for i in unmapped if uq[i] in tt]
no_slot = [i for i in unmapped if uq[i] not in tt]
print(f'-- 有对应 toolType 却漏映射(纯漏): {len(with_slot)}, 分布: {dict(Counter(uq[i] for i in with_slot))}')
print(f'-- 无对应 toolType 槽位: {len(no_slot)}, 类型: {set(uq[i] for i in no_slot)}')
print('无槽位样例:', [(i, idx[i].get('name'), uq[i]) for i in no_slot[:6]])
print('有槽位却漏样例:', [(i, idx[i].get('name'), uq[i]) for i in with_slot[:6]])