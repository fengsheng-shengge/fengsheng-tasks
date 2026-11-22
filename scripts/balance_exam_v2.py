#!/usr/bin/env python3
"""安全平衡 exam 硬编码答案位置（保留原始格式）"""
import re, random

random.seed(7)

# 用 git 恢复的原始文件作为输入
with open('/tmp/exam_restored.html', encoding='utf-8') as f:
    t = f.read()

# 精确匹配：{ q:'...', opts:['...','...','...','...'], a:N, src:'...' }
pattern = re.compile(
    r"\{\s*q:'([^']*?)',\s*opts:\s*\['([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\],\s*a:(\d+),\s*src:'([^']*?)'\s*\}"
)

# 先提取所有匹配
matches = list(pattern.finditer(t))
print(f"找到 {len(matches)} 道题")

# 按维度分组（向前找最近的 'DIM-x': { 或 'SOFT-x': {）
dim_groups = {}
for m in matches:
    before = t[:m.start()]
    dim_match = re.findall(r"'((?:DIM|SOFT)-\d)'\s*:", before)
    dim = dim_match[-1] if dim_match else 'UNKNOWN'
    dim_groups.setdefault(dim, []).append(m)

# 每个维度内部平衡
# 从后往前替换，这样 start/end 不会变
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
        while slot < 4 and filled[slot] >= targets[slot]:
            slot += 1
        if slot >= 4:
            slot = 0
            while filled[slot] >= targets[slot]:
                slot += 1

        old_a = int(m.group(6))
        new_a = slot

        if old_a != new_a:
            # opts 数组的四个元素
            opts = [m.group(2), m.group(3), m.group(4), m.group(5)]
            # 交换
            opts[old_a], opts[new_a] = opts[new_a], opts[old_a]
            # 重建字符串（严格保留原始格式）
            new_str = "{ q:'%s', opts:['%s', '%s', '%s', '%s'], a:%d, src:'%s' }" % (
                m.group(1), opts[0], opts[1], opts[2], opts[3], new_a, m.group(7)
            )
            replacements.append((m.start(), m.end(), new_str))

        filled[slot] += 1

print(f"需要交换答案位置的题: {len(replacements)}")

# 从后往前替换
for start, end, new_str in sorted(replacements, key=lambda x: -x[0]):
    t = t[:start] + new_str + t[end:]

# 验证
dist = Counter()
for m in pattern.finditer(t):
    dist[int(m.group(6))] += 1
total = sum(dist.values())
print(f"\n平衡后分布（{total} 题）:")
for i in range(4):
    print(f"  a={i}: {dist.get(i,0):3d} ({dist.get(i,0)/total*100:.1f}%)")

# 写回
with open('academy/exam/index.html', 'w', encoding='utf-8') as f:
    f.write(t)
print("\n✅ exam/index.html 已更新（只改 EXAM_DB 部分，其他不动）")

from collections import Counter
PYEOF