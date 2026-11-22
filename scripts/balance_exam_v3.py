#!/usr/bin/env python3
"""只平衡 a:N 数字位置，不碰 opts 数组（彻底安全）"""
import re, random

random.seed(7)

# 用 git show HEAD 拿原始 EXAM_DB
import subprocess
orig_html = subprocess.check_output(['git', 'show', 'HEAD:academy/exam/index.html'], encoding='utf-8')

# 提取原始 EXAM_DB 部分（从 var EXAM_DB = { 到 }; 结束）
db_start = orig_html.find('var EXAM_DB = {')
db_end = orig_html.find('};\nvar', db_start) + 2  # 包含 };
orig_db_section = orig_html[db_start:db_end]

# 提取所有 a:N 的位置（精确到每个匹配）
# 注意：格式是 ", a:N, src:'...'"，逗号后有空格
pattern_a = re.compile(r', a:(\d+),\s*src:')
matches = list(pattern_a.finditer(orig_db_section))
print(f"原始 EXAM_DB 找到 {len(matches)} 道题的 a:N")

# 按维度分组
dim_groups = {}
for m in matches:
    before = orig_db_section[:m.start()]
    dim_match = re.findall(r"'((?:DIM|SOFT)-\d)'\s*:", before)
    dim = dim_match[-1] if dim_match else 'UNKNOWN'
    dim_groups.setdefault(dim, []).append(m)

# 每个维度内部平衡
replacements = []  # (absolute offset, new_a_str)

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

        old_a = int(m.group(1))
        new_a = slot

        if old_a != new_a:
            # 精确替换：从 a: 到 , src:
            abs_start = db_start + m.start(1)
            abs_end = db_start + m.end(1)
            replacements.append((abs_start, abs_end, str(new_a)))

        filled[slot] += 1

print(f"需要改 a:N 的题: {len(replacements)}")

# 现在读当前文件，用原始 EXAM_DB 替换，再改 a:N
with open('academy/exam/index.html', encoding='utf-8') as f:
    t = f.read()

# 1. 先把当前文件的 EXAM_DB 替换成 git HEAD 的原始版本
curr_db_start = t.find('var EXAM_DB = {')
curr_db_end = t.find('};\nvar', curr_db_start) + 2
t = t[:curr_db_start] + orig_db_section + t[curr_db_end:]

# 2. 从后往前改 a:N
for start, end, new_val in sorted(replacements, key=lambda x: -x[0]):
    t = t[:start] + new_val + t[end:]

# 验证
answers = re.findall(r', a:(\d+), src:', t[t.find('EXAM_DB'):t.find('};', t.find('EXAM_DB'))])
from collections import Counter
dist = Counter(int(a) for a in answers)
total = len(answers)
print(f"\n平衡后 a:N 分布（{total} 题）:")
for i in range(4):
    pct = dist.get(i,0)/total*100
    bar = '█'*int(pct/5)
    print(f"  a={i}: {dist.get(i,0):3d} ({pct:5.1f}%) {bar}")

# 写回
with open('academy/exam/index.html', 'w', encoding='utf-8') as f:
    f.write(t)
print("\n✅ 完成！只改 a:N，opts 数组完全不动")
PYEOF