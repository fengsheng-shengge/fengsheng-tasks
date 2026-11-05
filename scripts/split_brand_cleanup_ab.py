#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按小眼镜 21:42 分拣裁定，把 506 处旧名清单拆成可执行的 A/B 两份。

裁定（小眼镜 2026-11-05 21:42）：
  A 必清：tags[0]/[1]/[2] 裸旧名标签 + meaning 1 处（品牌自称陈述句）→ 改新名
  B 保留：source 全部（历史档案出处引用，指向的档案本体保留旧名）→ 不动
  C 不动：数据层内无备份文件 → 0

新名字符串：以小鱼儿 12:25「产品更名」卡原文为准 ——「聚满匠星云 → 聚匠星云（生哥 11:52 拍板）」，
原文 message_id = om_x100b61f41d461ca8c1bf6da91233772；
站端落地实证 = commit 5c9f22d（index.html 3 处 / workspace/index.html 3 处 / prototype/v3-flow 4 处，均为新名，0 旧名）。

用法：python3 scripts/split_brand_cleanup_ab.py <输出md路径> [--apply]
  默认只出清单（不改数据）；--apply 会双写（权威源先、运行时副本后）。
"""
import json
import os
import subprocess
import sys

OLD = '聚满匠星云'
NEW = '聚匠星云'
CTX = 30


def git_files():
    out = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout
    return [p.decode('utf-8') for p in out.split(b'\0') if p]


def classify(field):
    """按小眼镜 21:42 裁定分 A/B。field 是 JSON 路径末段，如 tags[1] / source / meaning"""
    if field.startswith('tags'):
        return 'A'
    if field == 'meaning':
        return 'A'
    if field == 'source':
        return 'B'
    return '?'


def scan(path):
    """返回 [(id, field, context)]"""
    hits = []
    try:
        data = json.load(open(path, encoding='utf-8'))
    except Exception:
        return hits
    if not isinstance(data, list):
        return hits

    def walk(obj, rid, field):
        if isinstance(obj, str):
            i = obj.find(OLD)
            if i >= 0:
                hits.append((rid, field, obj[max(0, i - CTX):i + len(OLD) + CTX]))
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
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'brand_cleanup_AB.md'
    apply_mode = '--apply' in sys.argv

    src = 'data/entries.json'
    hits = scan(src)

    # id → 域文件落点
    id2dom = {}
    for f in git_files():
        if f.startswith('data/domains/') and f.endswith('.json'):
            try:
                d = json.load(open(f, encoding='utf-8'))
            except Exception:
                continue
            if isinstance(d, list):
                for it in d:
                    if isinstance(it, dict) and it.get('id'):
                        id2dom.setdefault(str(it['id']), []).append(f)

    A = [h for h in hits if classify(h[1]) == 'A']
    B = [h for h in hits if classify(h[1]) == 'B']
    Q = [h for h in hits if classify(h[1]) == '?']

    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('# 旧名「聚满匠星云」→ 新名「聚匠星云」A/B 执行清单\n\n')
        fh.write('> 拆解依据：小眼镜 2026-11-05 21:42 分拣裁定（A 必清 / B 保留 / C 不动）\n')
        fh.write('> 新名字符串：**聚匠星云**（4 字）。原文出处：小鱼儿 12:25「产品更名」卡'
                 '（`om_x100b61f41d461ca8c1bf6da91233772`）「聚满匠星云 → 聚匠星云（生哥 11:52 拍板）…'
                 '①所有文档/UI/文案/播报用新名，**历史档案保留旧名**」；站端落地实证：commit `5c9f22d`'
                 '（index.html 3 处 / workspace/index.html 3 处 / prototype/v3-flow 4 处均为新名，站端可见面 0 旧名）。\n')
        fh.write('> 导出方：小豆子｜导出时间：2026-11-05｜权威源：`data/entries.json`；运行时副本：`data/domains/*.json`\n\n')
        fh.write('## 〇、执行铁律（错一条就线上出旧名）\n\n')
        fh.write('1. **双写**：`data/entries.json`（权威源）先改 → `data/domains/*.json`（运行时消费）同步改；'
                 '只改一侧 = 线上仍出旧名。\n')
        fh.write('2. **B 类一律不动**：`source` 是历史档案出处引用，指向的《聚满匠星云岗位体系v1》等档案本体'
                 '按生哥「历史档案保留旧名」保留旧名；改了反而对不上档，且 source 对 C 端不可见。\n')
        fh.write('3. **新名比旧名少 1 字**（聚满匠星云 5 字 → 聚匠星云 4 字），detail 长度只会减不会增，质检安全。\n')
        fh.write('4. 清扫后跑三项质检并交 MD5 回执（改前改后）。\n\n')
        fh.write('## 一、数量核对\n\n')
        fh.write('| 分类 | 口径 | 处数（权威源） | 处置 |\n| --- | --- | --- | --- |\n')
        fh.write('| A 必清 | tags 裸标签 + meaning 品牌自称 | %d | 改「聚匠星云」 |\n' % len(A))
        fh.write('| B 保留 | source 历史档案出处引用 | %d | 不动 |\n' % len(B))
        fh.write('| ? 待定 | 未归类字段 | %d | 需小眼镜补裁定 |\n' % len(Q))
        fh.write('| C 不动 | 备份 / 历史档案文件 | 0 | — |\n\n')
        fh.write('> 独立条目：A %d 条 + B %d 条（同一 id 同时含 A/B 字段时两处各计一次，'
                 '双写时同批改同一 id 的所有域文件）。\n\n' % (len({h[0] for h in A}), len({h[0] for h in B})))

        fh.write('## 二、A 类执行清单（必清，%d 处）\n\n' % len(A))
        fh.write('| # | id | 域文件（双写落点） | 字段 | 改前（±30 字） | 改后 |\n| --- | --- | --- | --- | --- | --- |\n')
        for n, (rid, fld, ctx) in enumerate(A, 1):
            doms = '、'.join('`%s`' % x.replace('data/domains/', '') for x in id2dom.get(rid, [])) or '（仅权威源）'
            after = ctx.replace(OLD, NEW)
            fh.write('| %d | %s | %s | `%s` | …%s… | …%s… |\n'
                     % (n, rid, doms, fld, ctx.replace('|', '\\|'), after.replace('|', '\\|')))

        fh.write('\n## 三、B 类保留清单（%d 处，一律不动）\n\n' % len(B))
        fh.write('| # | id | 字段 | 出处（保留旧名） |\n| --- | --- | --- | --- |\n')
        for n, (rid, fld, ctx) in enumerate(B, 1):
            fh.write('| %d | %s | `%s` | %s |\n' % (n, rid, fld, ctx.replace('|', '\\|')))

        if Q:
            fh.write('\n## 四、待裁定字段（%d 处）\n\n' % len(Q))
            for rid, fld, ctx in Q:
                fh.write('- `%s` / `%s`：…%s…\n' % (rid, fld, ctx))

    print('输出: %s' % out_path)
    print('A 必清: %d 处 | B 保留: %d 处 | 待定: %d 处' % (len(A), len(B), len(Q)))
    print('A 涉及独立 id: %d | B 涉及独立 id: %d'
          % (len({h[0] for h in A}), len({h[0] for h in B})))
    if Q:
        print('待定字段样例:', [(h[0], h[1]) for h in Q[:5]])

    if not apply_mode:
        print('\n（未加 --apply，仅出清单，不改数据）')
        return

    # ---- 双写执行：权威源先，运行时副本后 ----
    touched = []
    for path in [src] + sorted({d for h in A for d in id2dom.get(h[0], [])}):
        raw = open(path, encoding='utf-8').read()
        n = raw.count(OLD)
        if not n:
            continue
        # 只改 A 类字段：按 JSON 结构逐条替换，避免误伤 B 类 source
        data = json.load(open(path, encoding='utf-8'))
        changed = 0

        def rewrite(obj):
            nonlocal changed
            if isinstance(obj, str):
                return obj
            if isinstance(obj, list):
                return [rewrite(x) for x in obj]
            if isinstance(obj, dict):
                out = {}
                for k, v in obj.items():
                    if isinstance(v, str) and OLD in v and classify(k) == 'A':
                        out[k] = v.replace(OLD, NEW)
                        changed += 1
                    else:
                        out[k] = rewrite(v)
                return out
            return obj

        data = rewrite(data)
        out = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        open(path, 'w', encoding='utf-8').write(out)
        touched.append((path, changed))
        print('  已改 %s：%d 处' % (path, changed))


if __name__ == '__main__':
    main()
