"""按 entryType 重生成 data/v3/split/ 分片 + manifest（基于带三层标签的 entries_v16）"""
import json, os, hashlib
from collections import defaultdict

ENTRIES = 'data/entries.json'
OUT_DIR = 'data/v3/split'
SHARDS = os.path.join(OUT_DIR, 'shards')
os.makedirs(SHARDS, exist_ok=True)

d = json.load(open(ENTRIES))
entries_md5 = hashlib.md5(json.dumps(d, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

# 按 entryType 分桶
buckets = defaultdict(list)
for e in d:
    t = e.get('entryType') or e.get('entry_type') or 'OTHER'
    buckets[t].append(e)

# 写分片 + 计算 md5
manifest_shards = {}
for etype, items in sorted(buckets.items()):
    fname = f"{etype}.json"
    fpath = os.path.join(SHARDS, fname)
    content = json.dumps(items, ensure_ascii=False, indent=2)
    open(fpath, 'w', encoding='utf-8').write(content)
    md5 = hashlib.md5(content.encode()).hexdigest()
    size = os.path.getsize(fpath)
    manifest_shards[etype] = {
        "file": f"shards/{fname}",
        "count": len(items),
        "size_bytes": size,
        "md5": md5
    }
    print(f"  {etype:10s}: {len(items):5d} 条, {size/1024:.0f}KB")

# 汇总 manifest.json
manifest = {
    "version": "v1.2",
    "generated_at": "2026-11-26",
    "source": "entries.json",
    "source_md5": entries_md5,
    "total_entries": len(d),
    "split_strategy": "by_entryType",
    "note": "V1.6 重分片: 新增 module_tags/consumer_tags/stage_tags 三层标签（基于 domain 字段反推）",
    "shards": manifest_shards,
    "role_preference_map": {
        "BROKER": ["LAW", "RISK", "CASE"],
        "LEASE": ["LAW", "RISK", "POL"],
        "NEW_HOME": ["LAW", "RISK", "DATA"]
    },
    "consumer_tags": ["buyer", "seller", "renter", "landlord"],
    "module_tags": ["TRANSACTION", "DECOR", "ASSET", "SUPPORT"],
}

open(os.path.join(OUT_DIR, 'manifest.json'), 'w', encoding='utf-8').write(
    json.dumps(manifest, ensure_ascii=False, indent=2)
)

print(f"\n✅ manifest.json 已更新 (source_md5={entries_md5[:16]}...)")
print(f"   总条目: {len(d)}, 分片: {len(buckets)}")
