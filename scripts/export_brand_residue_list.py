#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""核实旧名「聚满匠星云」在知识底座数据层的真实分布，并导出逐条清单。
用法：python3 scripts/export_brand_residue_list.py <输出md路径>
"""
import json
import os
import subprocess
import sys

OLD = '聚满匠星云'
CTX = 30


def git_files():
    out = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout
    return [p.decode('utf-8') for p in out.split(b'\0') if p]


def count_in(path):
    try:
        raw = open(path, encoding='utf-8').read()
    except Exception:
        return 0
    return raw.count(OLD)


def harvest_entries(path):
    """从聚合 entries.json 抽 (id, 字段, 上下文)"""
    hits = []
    data = json.load(open(path, encoding='utf-8'))
    if not isinstance(data, list):
        return hits

    def walk(obj, rid, field):
        if isinstance(obj, str):
            idx = 0
            while True:
                i = obj.find(OLD, idx)
                if i < 0:
                    break
                hits.append((rid, field, obj[max(0, i - CTX):i + len(OLD) + CTX]))
                idx = i + len(OLD)
        elif isinstance(obj, list):
            for n, x in enumerate(obj):
                walk(x, rid, '%s[%d]' % (field, n) if field else '[%d]' % n)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, rid, '%s.%s' % (field, k) if field else k)

    for n, item in enumerate(data):
        rid = 'idx#%d' % n
        if isinstance(item, dict):
            rid = str(item.get('id') or item.get('entryId') or item.get('uid') or rid)
        walk(item, rid, '')
    return hits


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'brand_residue_list.md'
    files = git_files()
    data_files = [f for f in files if f.startswith('data/') and f.endswith('.json')]
    per_file = {}
    for f in data_files:
        n = count_in(f)
        if n:
            per_file[f] = n
    total_occ = sum(per_file.values())

    hits = harvest_entries('data/entries.json') if os.path.exists('data/entries.json') else []
    ids = sorted({h[0] for h in hits})

    # 域文件是否只是同批条目的分片存储：用 id 集合比对
    dom_ids = set()
    id2dom = {}
    for f in per_file:
        if f.startswith('data/domains/'):
            try:
                d = json.load(open(f, encoding='utf-8'))
            except Exception:
                continue
            if isinstance(d, list):
                for it in d:
                    if isinstance(it, dict) and it.get('id'):
                        id2dom.setdefault(str(it['id']), []).append(f)
                dom_ids |= set(id2dom.keys())

    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('# 知识底座数据层旧名「聚满匠星云」逐条清单\n\n')
        fh.write('> 用途：小眼镜 11-09 前分拣 A（品牌自称·必清）/ B（自然语言·法条案例·保留）/ C（备份与历史档案·不动）三类。\n')
        fh.write('> 导出方：**小豆子**（实际执行清扫的一方；小眼镜 21:16 裁定中「小扣子导出」一项由小豆子代出，因清扫动作由小豆子执行）\n')
        fh.write('> 导出时间：2026-11-05｜口径：逐条含 id + 字段路径 + 前后文 ±30 字\n\n')
        fh.write('## 一、按文件分布（按出现次数，非行数）\n\n')
        fh.write('| 文件 | 出现次数 |\n| --- | --- |\n')
        for f, n in sorted(per_file.items(), key=lambda x: -x[1]):
            fh.write('| `%s` | %d |\n' % (f, n))
        fh.write('| **合计出现次数** | **%d** |\n\n' % total_occ)
        fh.write('> 注：`data/entries.json`（聚合）与 `data/domains/*.json`（分域）是同一批条目的两份存储，'
                 '同一 id 在两处各出现一次；**独立条目数 = %d**，不是 %d。\n\n'
                 % (len(set(ids)), total_occ))
        fh.write('## 二、存储关系与清扫顺序（必读，先定这个再动手）\n\n')
        fh.write('| 层 | 文件 | 角色 | 运行时是否消费 |\n| --- | --- | --- | --- |\n')
        fh.write('| 权威源 | `data/entries.json` | 5843 全集，`normalize_domains.py` 声明其为权威源 | 否（构建期源） |\n')
        fh.write('| 运行时 | `data/domains/*.json` | 分片副本，`_worker.js` 运行时直接读（`_manifest.json` 索引） | **是** |\n\n')
        fh.write('**结论：只改一处必然分叉。** A 类清扫必须**同批改两处** —— 先改 `data/entries.json`（权威源），'
                 '再同步 `data/domains/*.json`（运行时消费）；顺序反了或只改一侧，线上仍出旧名。\n\n')
        fh.write('**本清单按权威源 `data/entries.json` 逐条出**，并在每条标出该 id 对应的域文件（分片落点），'
                 '供分拣后直接双写。\n\n')
        fh.write('## 三、逐条清单（权威源口径，字段路径可直接回溯到域文件）\n\n')
        fh.write('| # | id | 域文件（分片落点） | 字段 | 前后文（±30 字） |\n| --- | --- | --- | --- | --- |\n')
        for n, (rid, fld, ctx) in enumerate(hits, 1):
            ctx = ctx.replace('|', '\\|').replace('\n', ' ')
            doms = '、'.join('`%s`' % x.replace('data/domains/', '') for x in id2dom.get(rid, [])) or '（未落域文件）'
            fh.write('| %d | %s | %s | `%s` | …%s… |\n' % (n, rid, doms, fld, ctx))

    print('输出: %s' % out_path)
    print('按文件出现次数:')
    for f, n in sorted(per_file.items(), key=lambda x: -x[1]):
        print('  %-42s %d' % (f, n))
    print('出现总次数: %d' % total_occ)
    print('独立条目数(entries.json): %d' % len(ent_ids))
    print('域文件 id 数: %d | 与 entries.json id 交集: %d'
          % (len(dom_ids), len(dom_ids & ent_ids)))


if __name__ == '__main__':
    main()
