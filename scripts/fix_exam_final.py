#!/usr/bin/env python3
"""终极方案：git HEAD EXAM_DB 整体替换 + 只改 a:N"""
import re, random, subprocess

random.seed(7)

# 1. 从 git HEAD 拿原始 EXAM_DB 完整内容
orig_html = subprocess.check_output(['git', 'show', 'HEAD:academy/exam/index.html'], encoding='utf-8')
# 找 EXAM_DB 范围
db_s = orig_html.find('var EXAM_DB = {')
# 找 EXAM_DB 后的第一个 var（DIM_ORDER）
db_e = orig_html.find('\nvar DIM_ORDER', db_s) + 1  # 包含 \n
orig_db = orig_html[db_s:db_e]
print(f"从 git HEAD 提取 EXAM_DB: {len(orig_db)} 字符")

# 2. 读当前文件
with open('academy/exam/index.html', encoding='utf-8') as f:
    curr_html = f.read()

# 3. 替换当前文件的 EXAM_DB
curr_db_s = curr_html.find('var EXAM_DB = {')
curr_db_e = curr_html.find('\nvar DIM_ORDER', curr_db_s) + 1
if curr_db_s == -1 or curr_db_e == 0:
    print("❌ 当前文件找不到 EXAM_DB 边界")
    exit(1)

curr_html = curr_html[:curr_db_s] + orig_db + curr_html[curr_db_e:]
print(f"✅ EXAM_DB 已用 git HEAD 原始版本替换")

# 4. 现在在原始 EXAM_DB 上平衡 a:N
# 用 pattern 找到所有题目的 a:N
# 格式: { q:'...', opts:['...','...','...','...'], a:N, src:'...' },
full_pattern = re.compile(
    r"\{\s*q:'[^']*',\s*opts:\s*\['[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*'\],\s*a:(\d+),\s*src:'[^']*'\s*\}"
)

matches = list(full_pattern.finditer(orig_db))
print(f"原始 EXAM_DB 找到 {len(matches)} 道题")

# 按维度分组
dim_groups = {}
for m in matches:
    before = orig_db[:m.start()]
    dim_match = re.findall(r"'((?:DIM|SOFT)-\d)'\s*:", before)
    dim = dim_match[-1] if dim_match else 'UNKNOWN'
    dim_groups.setdefault(dim, []).append(m)

# 平衡
abs_replacements = []  # (absolute offset in curr_html, new_a_str)

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
            # 计算在 curr_html 里的绝对位置
            abs_start = curr_db_s + m.start(1)
            abs_end = curr_db_s + m.end(1)
            abs_replacements.append((abs_start, abs_end, str(new_a)))

        filled[slot] += 1

print(f"需要改 a:N 的题: {len(abs_replacements)}")

# 从后往前替换
for start, end, new_val in sorted(abs_replacements, key=lambda x: -x[0]):
    curr_html = curr_html[:start] + new_val + curr_html[end:]

# 验证
answers = re.findall(r'a:(\d+), src:', curr_html[curr_db_s:curr_db_e])
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
    f.write(curr_html)
print("\n✅ 完成！EXAM_DB 从 git HEAD 恢复 + a:N 平衡")
PYEOF