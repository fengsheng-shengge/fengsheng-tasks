"""entries.json 三层标签反推脚本 · V1.6"""
import json, sys
from collections import Counter

INPUT  = 'data/entries.json'
OUTPUT = 'data/entries.json'  # 就地更新

d = json.load(open(INPUT))
total = len(d)
print(f"加载 {total} 条 entries")

# ═══ domain → stage ═══
DOMAIN_STAGES = {
    '签约前': ['b1','b2'], '签约中': ['b4','b5'], '签约后': ['b6'],
    '谈判斡旋': ['b4'], '带看服务': ['b3'], '客户解码': ['b2'], '场景剧本': ['b3','b4'],
    '购房': ['b1','b2','b3','b4','b5','b6'],
    '租住': ['l1','l2','l3','l4','l5','l6'], '租房': ['l1','l2','l3','l4','l5','l6'],
    '业主出售': ['b1','b4','b5','b6'], '房东出租': ['l1','l2','l3','l4','l5','l6'], '退租出售': ['l6'],
    '居住中': ['d1','d2','d3','d4','d5','d6'],
}

# ═══ domain → consumer ═══
DOMAIN_CONSUMER = {
    '购房': ['buyer'], '租住': ['renter','landlord'], '租房': ['renter','landlord'],
    '业主': ['seller'], '业主侧': ['seller'], '业主出售': ['seller'],
    '房东出租': ['landlord','renter'], '退租出售': ['renter','landlord'],
    '签约前': ['buyer','seller'], '签约中': ['buyer','seller'], '签约后': ['buyer','seller'],
    '谈判斡旋': ['buyer','seller'], '带看服务': ['buyer','renter'],
    '客户解码': ['buyer','seller','renter','landlord'],
    '场景剧本': ['buyer','seller','renter','landlord'],
    '居住中': ['buyer','renter'],
    '资产持有与运营': ['seller','landlord'],
}

# ═══ domain → module ═══
DOMAIN_MODULE = {
    '签约前': ['TRANSACTION'], '签约中': ['TRANSACTION'], '签约后': ['TRANSACTION'],
    '谈判斡旋': ['TRANSACTION'], '带看服务': ['TRANSACTION'], '客户解码': ['TRANSACTION'],
    '场景剧本': ['TRANSACTION','DECOR'],
    '购房': ['TRANSACTION'], '租住': ['TRANSACTION'], '租房': ['TRANSACTION'],
    '业主出售': ['TRANSACTION'], '房东出租': ['TRANSACTION'], '退租出售': ['TRANSACTION'],
    '居住中': ['DECOR','TRANSACTION'],
    '资产持有与运营': ['ASSET'], '业主': ['ASSET'], '业主侧': ['ASSET'], 'OWN': ['ASSET'],
}

stage_hits = Counter(); consumer_hits = Counter(); module_hits = Counter()

for e in d:
    dom = str(e.get('domain', ''))
    
    stages = DOMAIN_STAGES.get(dom, [])
    if not stages:
        t = e.get('tags')
        if isinstance(t, dict):
            ts = t.get('stage', [])
            if 'pre' in ts: stages = ['b1','b2']
            elif 'mid' in ts: stages = ['b3','b4','b5']
            elif 'post' in ts: stages = ['b6']
    e['stage_tags'] = stages
    for s in stages: stage_hits[s] += 1
    
    consumers = DOMAIN_CONSUMER.get(dom, [])
    e['consumer_tags'] = consumers
    for c in consumers: consumer_hits[c] += 1
    if not consumers: consumer_hits['_none'] += 1
    
    modules = DOMAIN_MODULE.get(dom, ['SUPPORT'])
    e['module_tags'] = modules
    for m in modules: module_hits[m] += 1

# 输出结果
print(f"\n【stage 覆盖度】{total} 条")
for s in ['b1','b2','b3','b4','b5','b6','l1','l2','l3','l4','l5','l6','d1','d2','d3','d4','d5','d6']:
    c = stage_hits.get(s, 0)
    print(f"  {s}: {c:4d} ({c*100/total:5.1f}%)")

print(f"\n【consumer 覆盖度】")
for c, v in consumer_hits.most_common():
    label = c if c != '_none' else '未命中'
    print(f"  {label}: {v:4d} ({v*100/total:5.1f}%)")

print(f"\n【module 覆盖度】")
for m, v in module_hits.most_common():
    print(f"  {m}: {v:4d} ({v*100/total:5.1f}%)")

# 写入
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
print(f"\n✅ 写入 {OUTPUT}")

# 交叉验证 72 组合
print(f"\n【交叉验证 · TRANSACTION 域 72 组合】")
row_header = "        " + " | ".join(f"{c:>8}" for c in ['buyer','seller','renter','landlord'])
print(row_header)
for stage in ['b1','b2','b3','b4','b5','b6']:
    counts = []
    for consumer in ['buyer','seller','renter','landlord']:
        hits = sum(1 for e in d 
                   if 'TRANSACTION' in e.get('module_tags',[]) 
                   and stage in e.get('stage_tags',[])
                   and consumer in e.get('consumer_tags',[]))
        counts.append(f"{hits:4d}")
    has_zero = any(int(c) == 0 for c in counts)
    flag = "❌" if has_zero else "✅"
    print(f"  {stage} {flag} {' | '.join(f'{c:>8}' for c in counts)}")
