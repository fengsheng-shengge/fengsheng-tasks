#!/usr/bin/env python3
"""平衡 exam 硬编码题库正确答案位置"""
import re, random

random.seed(7)

with open('academy/exam/index.html', encoding='utf-8') as f:
    t = f.read()

# 匹配 EXAM_DB 中每道题的 { q:'...', opts:['...','...','...','...'], a:N, src:'...' }
# 需要处理 opts 数组里的正确答案位置
pattern = re.compile(
    r"\{\s*q:'([^']+)',\s*opts:\s*\[(.*?)\],\s*a:(\d+),\s*src:'([^']+)'",
    re.S
)

def swap_a_in_opts(opts_str_list, old_a, new_a):
    """把 opts 数组里 old_a 和 new_a 位置的选项交换，返回新的 opts 字符串"""
    items = opts_str_list[:]
    items[old_a], items[new_a] = items[new_a], items[old_a]
    return ', '.join(items)

# 先提取所有匹配
matches = list(pattern.finditer(t))
print(f"找到 {len(matches)} 道硬编码题")

# 按维度分组
dim_groups = {}
for m in matches:
    # 往前找最近的 'DIM-x': { 或 'SOFT-x': {
    before = t[:m.start()]
    dim_match = re.findall(r"'((?:DIM|SOFT)-\d)'\s*:", before)
    dim = dim_match[-1] if dim_match else 'UNKNOWN'
    dim_groups.setdefault(dim, []).append(m)

# 每个维度内部平衡
replacements = []  # (start, end, new_str)

for dim, mlist in dim_groups.items():
    n = len(mlist)
    per_slot = n // 4
    rem = n % 4
    targets = [per_slot] * 4
    for r in range(rem):
        targets[r] += 1

    indices = list(range(n))
    random.shuffle(indices)

    slot = 0
    filled = [0, 0, 0, 0]

    for idx in indices:
        m = mlist[idx]
        # 找下一个未填满的槽
        while slot < 4 and filled[slot] >= targets[slot]:
            slot += 1
        if slot >= 4:
            slot = 0
            while filled[slot] >= targets[slot]:
                slot += 1

        old_a = int(m.group(3))
        new_a = slot

        if old_a != new_a:
            opts_str = m.group(2)
            # 解析 opts 数组
            opts_items = re.findall(r"'([^']*)'", opts_str)
            if len(opts_items) == 4:
                swapped = swap_a_in_opts(opts_items, old_a, new_a)
                new_match_str = m.group(0).replace(opts_str, swapped).replace(f'a:{old_a}', f'a:{new_a}')
                replacements.append((m.start(), m.end(), new_match_str))

        filled[slot] += 1

print(f"需要交换答案位置的题: {len(replacements)}")

# 从后往前替换
for start, end, new_str in sorted(replacements, key=lambda x: -x[0]):
    t = t[:start] + new_str + t[end:]

# 写回
with open('academy/exam/index.html', 'w', encoding='utf-8') as f:
    f.write(t)

# 验证
dist = Counter(int(m.group(3)) for m in pattern.finditer(t))
print(f"\n✅ exam 硬编码新分布:")
for i in range(4):
    print(f"  a={i}: {dist.get(i,0)} ({dist.get(i,0)/sum(dist.values())*100:.1f}%)")

from collections import Counter
PYEOF