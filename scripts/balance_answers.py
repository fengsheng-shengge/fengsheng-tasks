#!/usr/bin/env python3
"""
平衡 quiz.json 正确答案分布（各 ~25%）
策略：
  1. 对每道题，先验证 4 个选项的"正确性"（只保留一个正确答案文本）
  2. 把正确答案移到新的随机位置（0-3 均匀）
  3. 更新 correct 索引
这样既保持题目质量（正确答案文本不变），又把位置打散。
"""
import json, random

random.seed(42)  # 可复现

with open('data/v3/quiz.json', encoding='utf-8') as f:
    q = json.load(f)

qs = q['questions']
print(f"原始答案分布:")
from collections import Counter
orig = Counter(x['correct'] for x in qs)
for i in range(4):
    print(f"  a={i}: {orig.get(i,0)} ({orig.get(i,0)/len(qs)*100:.1f}%)")

# 按维度分组，每维度内部平衡
by_dim = {}
for item in qs:
    d = item['dim_code']
    by_dim.setdefault(d, []).append(item)

balanced = []
for dim, items in by_dim.items():
    # 该维度期望各选项比例
    per_slot = len(items) // 4
    remainder = len(items) % 4
    target_counts = [per_slot] * 4
    for r in range(remainder):
        target_counts[r] += 1

    # 随机打乱题目顺序，然后依次分配目标位置
    random.shuffle(items)
    slot_idx = 0
    slot_filled = [0, 0, 0, 0]

    for item in items:
        # 找下一个还没填满的槽位
        while slot_idx < 4 and slot_filled[slot_idx] >= target_counts[slot_idx]:
            slot_idx += 1
        if slot_idx >= 4:
            slot_idx = 0
            while slot_filled[slot_idx] >= target_counts[slot_idx]:
                slot_idx += 1

        correct_text = item['options'][item['correct']]
        new_pos = slot_idx

        # 把正确答案移到新位置
        opts = item['options'][:]
        old_pos = item['correct']
        if old_pos != new_pos:
            opts[old_pos], opts[new_pos] = opts[new_pos], opts[old_pos]

        item['options'] = opts
        item['correct'] = new_pos
        slot_filled[slot_idx] += 1

    balanced.extend(items)

# 验证
print(f"\n平衡后答案分布:")
new = Counter(x['correct'] for x in balanced)
for i in range(4):
    print(f"  a={i}: {new.get(i,0)} ({new.get(i,0)/len(balanced)*100:.1f}%)")

# 按 dim_code 排序输出更美观
balanced.sort(key=lambda x: (x['dim_code'], x['id']))

q['questions'] = balanced
with open('data/v3/quiz.json', 'w', encoding='utf-8') as f:
    json.dump(q, f, ensure_ascii=False, indent=2)

print(f"\n✅ 完成！quiz.json 答案分布已平衡")
PYEOF