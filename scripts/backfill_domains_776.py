#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方案A：把 entries.json(5843) 中未发布到 data/domains 的 776 条，
按语义归并进现有 13 个 domains 文件，补齐渲染字段并重建 _manifest.json，
使线上显示与权威基线(total=5843)一致。

幂等：以词条 id 判重，已存在的不会再加；但不破坏已存在的词条。
默认 --dry-run 只预览，--apply 才写文件。
"""
import argparse
import json
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DOMAINS = os.path.join(DATA, "domains")
ENTRIES = os.path.join(DATA, "entries.json")
MANIFEST = os.path.join(DOMAINS, "_manifest.json")

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def one_line_summary(entry, n=120):
    """从 detail(及摘要)生成 oneLineAnswer，缺 detail 时用 name。"""
    detail = entry.get("detail") or ""
    text = re.sub(r"\s+", " ", detail).strip()
    if not text:
        text = (entry.get("name") or "").strip()
    return text[:n]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="写文件（默认 dry-run）")
    args = ap.parse_args()

    entries = load(ENTRIES)
    manifest = load(MANIFEST)

    # 现有 domains 词条 id 集合
    existing_ids = set()
    domain_files = {}
    for f in sorted(glob.glob(os.path.join(DOMAINS, "*.json"))):
        if os.path.basename(f) == "_manifest.json":
            continue
        domain_files[os.path.basename(f)[:-5]] = f

    for f in domain_files.values():
        for x in load(f):
            existing_ids.add(x.get("id"))

    # 未发布词条
    missing = [e for e in entries if e.get("id") and e.get("id") not in existing_ids]
    print(f"entries 总数: {len(entries)}")
    print(f"domains 已收录: {len(existing_ids)}")
    print(f"待归并(776): {len(missing)}")

    # 语义归并映射：sceneDomain -> 目标域名
    SCENE_TARGET = {
        "购房": "签约前",
        "学区教育": "签约前",
        "法规政策": "签约前",
        "签约前": "签约前",
        "租住": "居住中",
        "租房": "居住中",
        "居住中": "居住中",
        "交房售后": "居住中",
        "业主出售": "业主",
        "房东出租": "业主",
        "OWN": "业主",
        "市场数据-二手房": "资产持有与运营",
        "市场数据-租赁": "资产持有与运营",
        "市场数据-房贷": "资产持有与运营",
        "市场数据-宏观": "资产持有与运营",
        "市场数据-新兴赛道": "资产持有与运营",
        "市场数据-头部企业": "资产持有与运营",
        "市场数据-物业": "资产持有与运营",
        "签约中": "签约中",
        "签约后": "签约后",
        "CRO": "跨域通用",
    }

    targets = {}
    no_map = []
    for e in missing:
        sc = e.get("sceneDomain")
        t = SCENE_TARGET.get(sc)
        if not t:
            no_map.append((e.get("id"), sc))
            continue
        targets.setdefault(t, []).append(e)

    print("\n=== 按目标域统计 ===")
    for t in sorted(targets):
        print(f"  {t}: {len(targets[t])}")
    if no_map:
        print("\n⚠️ 无映射词条:")
        for i, s in no_map:
            print(f"  {i} sceneDomain={s}")

    # 构造增强后的词条（补 oneLineAnswer，保留原字段，强加 domain 对应目标域文件名）
    new_by_domain = {}
    for t, items in targets.items():
        fname = manifest.get("files", {}).get(t)
        if not fname:
            print(f"\n⚠️ 目标域 {t} 无 files 映射，跳过 {len(items)} 条")
            continue
        enriched = []
        for e in items:
            o = dict(e)
            o.setdefault("oneLineAnswer", one_line_summary(e))
            enriched.append(o)
        new_by_domain[fname] = enriched

    if args.apply:
        # 追加到各域文件
        for fname, items in new_by_domain.items():
            path = os.path.join(DOMAINS, fname)
            cur = load(path)
            ids = set(x.get("id") for x in cur)
            added = 0
            for o in items:
                if o.get("id") not in ids:
                    cur.append(o)
                    ids.add(o.get("id"))
                    added += 1
            dump(path, cur)
            print(f"  + {fname}: 追加 {added} 条（现 {len(cur)}）")
        # 重建 manifest：total 及 counts
        m = load(MANIFEST)
        total = 0
        counts = {}
        for t, fname in m["files"].items():
            path = os.path.join(DOMAINS, fname)
            n = len(load(path))
            counts[t] = n
            total += n
        m["total"] = total
        m["counts"] = counts
        dump(MANIFEST, m)
        print(f"\nmanifest.total 已重建 = {total}")
    else:
        print("\n[dry-run] 未写文件。加 --apply 执行。")

if __name__ == "__main__":
    main()