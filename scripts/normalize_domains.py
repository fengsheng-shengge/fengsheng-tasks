#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对 data/domains 分片做 schema 统一归一化，修正双 schema 混用问题：

根因：老 5067 条用 def/corePoint/oneLineAnswer（缺 detail/dataRef/caseRef），
新归并 776 条用 detail/ola/cp（缺 def/corePoint）。前端详情页读 def/corePoint/dataRef，
导致两类词条详情互补缺失，776 条(13%)特征/优势区空白，5067 条引证区空白。

本脚本以 data/entries.json（5843 全集，含 detail/dataRef/caseRef）为权威源，
对每个分片词条按 id 补齐缺失的展示关键字段，且不覆盖已有值：
  oneLineAnswer = ola (已有则保留)
  detail        = 缺失时从 entries 补齐（长文）
  def           = 缺失时取 entries.detail 截断摘要
  corePoint     = 缺失时取 entries.cp
  dataRef       = 缺失时取 entries.dataRef
  caseRef       = 缺失时取 entries.caseRef
  ownerBenefit  / caveat 等原样保留

幂等：仅补缺失字段，不删不改已有字段。
默认 --dry-run，--apply 才写。--check 校验补齐后覆盖是否全量 5843/5843。
"""
import argparse
import json
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAINS = os.path.join(ROOT, "data", "domains")
ENTRIES = os.path.join(ROOT, "data", "entries.json")


def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def brief(text, n=120):
    """从长文提取摘要行。"""
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()[:n]


def build_index(entries):
    idx = {}
    for e in entries:
        if e.get("id"):
            idx[e["id"]] = e
    return idx


def normalize(entry, src):
    """补齐 entry 的缺失展示字段，返回相对 src 的改动描述。"""
    out = dict(entry)
    edits = []

    # oneLineAnswer
    if not out.get("oneLineAnswer"):
        ola = src.get("ola") or brief(src.get("detail"))
        if ola:
            out["oneLineAnswer"] = ola
            edits.append("oneLineAnswer")

    # detail（长文）
    if not out.get("detail") and src.get("detail"):
        out["detail"] = src["detail"]
        edits.append("detail")

    # def
    if not out.get("def"):
        if src.get("def"):
            out["def"] = src["def"]
            edits.append("def")
        elif src.get("detail"):
            out["def"] = brief(src["detail"])
            edits.append("def(summ)")

    # corePoint
    if not out.get("corePoint"):
        cp = src.get("cp") or []
        if isinstance(cp, str):
            cp = [cp]
        if cp:
            out["corePoint"] = cp
            edits.append("corePoint")

    # dataRef / caseRef
    if not out.get("dataRef") and src.get("dataRef"):
        out["dataRef"] = src["dataRef"]
        edits.append("dataRef")
    if not out.get("caseRef") and src.get("caseRef"):
        out["caseRef"] = src["caseRef"]
        edits.append("caseRef")

    if not out.get("consumerQ") and src.get("consumerQ"):
        out["consumerQ"] = src["consumerQ"]
        edits.append("consumerQ")

    return out, edits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="写文件（默认 dry-run）")
    ap.add_argument("--check", action="store_true",
                    help="补齐后校验展示关键字段覆盖率并打印")
    args = ap.parse_args()

    entries = load(ENTRIES)
    idx = build_index(entries)
    print(f"entries 权威源: {len(entries)} 条")

    domain_files = sorted(
        f for f in glob.glob(os.path.join(DOMAINS, "*.json"))
        if os.path.basename(f) != "_manifest.json"
    )

    total_edits = 0
    not_found = 0
    field_coverage = {}

    for fpath in domain_files:
        fname = os.path.basename(fpath)
        data = load(fpath)
        arr = data if isinstance(data, list) else data.get("entries", [])

        touched = 0
        for i, e in enumerate(arr):
            eid = e.get("id")
            src = idx.get(eid) if eid else None
            if src is None:
                not_found += 1
                continue
            new_e, edits = normalize(e, src)
            if edits:
                arr[i] = new_e
                touched += 1
                total_edits += 1

        if args.apply and touched:
            if isinstance(data, list):
                dump(fpath, arr)
            else:
                data["entries"] = arr
                dump(fpath, data)
        print(f"  {fname}: 补齐 {touched} 条")

    print(f"\n待补齐词条数(次): {total_edits}, 未在entries中找到的id: {not_found}")

    # 校验补齐后的覆盖率
    if args.check or args.apply:
        print("\n=== 补齐后覆盖率校验 ===")
        allx = []
        for fpath in domain_files:
            d = load(fpath)
            allx += (d if isinstance(d, list) else d.get("entries", []))
        print(f"总词条: {len(allx)}")
        for k in ["oneLineAnswer", "def", "detail", "corePoint", "dataRef", "caseRef", "consumerQ", "legalRef"]:
            n = sum(1 for e in allx if e.get(k))
            flag = "OK" if n == len(allx) else "  <-- 缺口"
            print(f"  {k}: {n}/{len(allx)} {flag}")

    if not args.apply:
        print("\n[dry-run] 未写文件。加 --apply 执行。")


if __name__ == "__main__":
    main()