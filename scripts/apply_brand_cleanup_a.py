#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""执行「聚满匠星云 → 聚匠星云」A 类 253 处双写清扫。

授权：小眼镜 2026-11-05 21:56「授权执行」——单执行方（小豆子）、范围 A 类 253 处、
B 类 source 一处不得动、权威源先改 → 分片后改、交付四件套回执。

四道安全闸（任一不过即中止，不落盘）：
  闸1 回环保真：解析→重新序列化必须与原文逐字节一致，否则判定该文件格式未识别 → 中止
  闸2 结构定位：按 JSON 字段路径定位 A 类（tags.* / meaning），source 显式排除
  闸3 非A零变更：除 A 类字段外，所有字段值逐条深比对，必须完全一致
  闸4 双写一致：同 id 在权威源与分片的新名计数必须相等

用法：
  python3 scripts/apply_brand_cleanup_a.py            # 预演（dry-run，不写盘）
  python3 scripts/apply_brand_cleanup_a.py --apply    # 执行
"""
import copy
import glob
import hashlib
import json
import os
import re
import sys

OLD = '聚满匠星云'
NEW = '聚匠星云'
AUTH = 'data/entries.json'
DOM_GLOB = 'data/domains/*.json'


# ---------- 分类：小眼镜 21:42 裁定 ----------
def classify(field_path):
    """field_path 为 JSON 字段路径（相对条目根），如 tags[1] / tags.clientType / meaning / source。

    注意：文件级遍历会带列表下标前缀（如 '[0].tags[1]'），必须先剥掉下标段再取首段名，
    否则首段会变成空串、A 类判定全部失效。
    """
    segs = [p for p in re.sub(r'\[[^\]]*\]', '', field_path).split('.') if p]
    head = segs[0] if segs else ''
    if head == 'tags':
        return 'A'
    if head == 'meaning':
        return 'A'
    if head == 'source':
        return 'B'
    return '?'


# ---------- 序列化格式探测 ----------
def pick_serializer(raw, data):
    """返回能把 data 序列化成与 raw 逐字节一致的 callable；都不行则返回 None。"""
    cands = [
        ('default(默认分隔符)', lambda d: json.dumps(d, ensure_ascii=False)),
        ('indent=2', lambda d: json.dumps(d, ensure_ascii=False, indent=2)),
        ('indent=4', lambda d: json.dumps(d, ensure_ascii=False, indent=4)),
        ('compact', lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))),
        ('compact2', lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ': '))),
    ]
    for name, fn in cands:
        try:
            if fn(data) == raw:
                return fn, name
        except Exception:
            continue
    return None, None


# ---------- 结构化定位与改写 ----------
def scan_hits(data):
    """返回 [(id, field_path, 上下文)]，用于清点与清单核对。"""
    hits = []

    def walk(obj, rid, path):
        if isinstance(obj, str):
            if OLD in obj:
                hits.append((rid, path, obj[max(0, obj.find(OLD) - 30): obj.find(OLD) + len(OLD) + 30]))
        elif isinstance(obj, list):
            for n, x in enumerate(obj):
                walk(x, rid, '%s[%d]' % (path, n) if path else '[%d]' % n)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, rid, '%s.%s' % (path, k) if path else k)

    for it in data:
        rid = 'idx#%d'
        if isinstance(it, dict):
            rid = str(it.get('id') or it.get('entryId') or it.get('uid') or 'idx#%d')
        walk(it, rid, '')
    return hits


def rewrite_a(obj, path, counter, rid=''):
    """只改 A 类字段。counter = {'fields': n, 'occ': n, 'ids': set()}"""
    if isinstance(obj, list):
        return [rewrite_a(x, '%s[%d]' % (path, i) if path else '[%d]' % i, counter, rid) for i, x in enumerate(obj)]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            kp = '%s.%s' % (path, k) if path else k
            cls = classify(kp)
            if cls == 'A':
                nv, n = replace_in(v, kp)
                if n:
                    counter['fields'] += 1
                    counter['occ'] += n
                    counter['ids'].add(rid)
                    out[k] = nv
                    continue
                out[k] = v
            else:
                out[k] = rewrite_a(v, kp, counter, rid)
        return out
    return obj


def replace_in(value, path):
    """在 A 类字段值内做字符串替换（支持 str / list[str] / dict[str,list[str]]）。返回 (新值, 替换次数)。"""
    n = 0
    if isinstance(value, str):
        if OLD in value:
            n = value.count(OLD)
            return value.replace(OLD, NEW), n
        return value, 0
    if isinstance(value, list):
        out = []
        for x in value:
            if isinstance(x, str) and OLD in x:
                n += x.count(OLD)
                out.append(x.replace(OLD, NEW))
            else:
                out.append(x)
        return out, n
    if isinstance(value, dict):
        out = {}
        for k, x in value.items():
            if isinstance(x, str) and OLD in x:
                n += x.count(OLD)
                out[k] = x.replace(OLD, NEW)
            elif isinstance(x, list):
                lst = []
                for e in x:
                    if isinstance(e, str) and OLD in e:
                        n += e.count(OLD)
                        lst.append(e.replace(OLD, NEW))
                    else:
                        lst.append(e)
                out[k] = lst
            else:
                out[k] = x
        return out, n
    return value, 0


# ---------- 快照 / 比对 ----------
def strip_a_fields(entry):
    """把条目的 A 类字段摘掉，剩余部分用于「非A零变更」深比对。"""
    if not isinstance(entry, dict):
        return entry
    o = {}
    for k, v in entry.items():
        if classify(k) == 'A':
            continue
        o[k] = copy.deepcopy(v)
    return o


def a_field_counter(data):
    """按 id 统计 A 类字段中 NEW 的出现次数（用于双写一致性）。"""
    c = {}

    def walk(obj, path, rid, acc):
        if isinstance(obj, str):
            if NEW in obj:
                acc[rid] = acc.get(rid, 0) + obj.count(NEW)
        elif isinstance(obj, list):
            for x in obj:
                walk(x, path, rid, acc)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                kp = '%s.%s' % (path, k) if path else k
                if classify(kp) == 'A':
                    walk(v, kp, rid, acc)
                else:
                    walk(v, kp, rid, acc)

    for it in data:
        rid = str(it.get('id') or it.get('entryId') or it.get('uid') or '') if isinstance(it, dict) else ''
        walk(it, '', rid, c)
    return c


def md5(path):
    return hashlib.md5(open(path, 'rb').read()).hexdigest()


def main():
    apply_mode = '--apply' in sys.argv

    # ---------- 加载 ----------
    files = [AUTH] + sorted(glob.glob(DOM_GLOB))
    payloads = {}
    rawmap = {}
    for p in files:
        raw = open(p, encoding='utf-8').read()
        rawmap[p] = raw
        try:
            payloads[p] = json.load(open(p, encoding='utf-8'))
        except Exception as e:
            print('!! %s 解析失败：%s' % (p, e))
            return 1

    # ---------- 闸1：回环保真 ----------
    serials = {}
    for p in files:
        fn, name = pick_serializer(rawmap[p], payloads[p])
        if fn is None:
            print('!! 闸1 未通过：%s 的序列化格式无法逐字节复现，中止（未落盘）' % p)
            return 2
        serials[p] = (fn, name)
    print('闸1 回环保真：%d/%d 文件解析→序列化逐字节一致 ✅' % (len(files), len(files)))

    # ---------- 闸2：改前清点 ----------
    before_a = {}
    before_b = {}
    for p in files:
        hits = scan_hits(payloads[p])
        before_a[p] = sum(1 for h in hits if classify(h[1]) == 'A')
        before_b[p] = sum(1 for h in hits if classify(h[1]) == 'B')
        q = [h for h in hits if classify(h[1]) == '?']
        if q:
            print('!! 闸2 未通过：%s 存在未归类字段 %s，中止' % (p, [(h[0], h[1]) for h in q[:5]]))
            return 3
    tot_a = sum(before_a.values())
    tot_b = sum(before_b.values())
    print('闸2 结构定位：A=%d 处 / B=%d 处 / 待定=0 ✅（source 已显式排除）' % (tot_a, tot_b))

    # ---------- 改前快照（非A字段 + source 值） ----------
    snapshot_non_a = {p: [strip_a_fields(it) for it in payloads[p]] for p in files}
    snapshot_source = {}
    for p in files:
        # 与校验侧用完全相同的采集口径，避免两侧长度/形态不一致造成的假阳性
        snapshot_source[p] = [it.get('source') if isinstance(it, dict) else None for it in payloads[p]]

    # ---------- 执行改写 ----------
    counter = {'fields': 0, 'occ': 0, 'ids': set()}
    new_payloads = {}
    changed_files = []
    for p in files:
        cnt = {'fields': 0, 'occ': 0, 'ids': set()}
        pl = payloads[p]
        if isinstance(pl, list):
            for n, it in enumerate(pl):
                rid = str(it.get('id') or it.get('entryId') or it.get('uid') or 'idx#%d' % n) if isinstance(it, dict) else 'idx#%d' % n
                pl[n] = rewrite_a(it, '', cnt, rid)
        else:
            pl = rewrite_a(pl, '', cnt, p)
        new_payloads[p] = pl
        counter['fields'] += cnt['fields']
        counter['occ'] += cnt['occ']
        counter['ids'] |= cnt['ids']
        if cnt['occ']:
            changed_files.append((p, cnt['occ'], cnt['fields']))

    print('改写统计：命中字段 %d 个 / 字符串出现 %d 次 / 独立 id %d 个'
          % (counter['fields'], counter['occ'], len(counter['ids'])))
    for p, occ, fl in changed_files:
        print('   %-34s %d 处（%d 个字段）' % (os.path.basename(p), occ, fl))

    # ---------- 闸3：非A零变更 ----------
    for p in files:
        cur = [strip_a_fields(it) for it in new_payloads[p]]
        if cur != snapshot_non_a[p]:
            print('!! 闸3 未通过：%s 非 A 类字段发生变化，中止' % p)
            return 4
    print('闸3 非A零变更：全部 %d 文件的非A字段逐条深比对一致 ✅' % len(files))

    # ---------- 闸4：双写一致性（同 id 权威源 vs 分片新名计数相等） ----------
    auth_new = a_field_counter(new_payloads[AUTH])
    dom_new = {}
    for p in files:
        if p == AUTH:
            continue
        for rid, n in a_field_counter(new_payloads[p]).items():
            dom_new[rid] = dom_new.get(rid, 0) + n
    mismatch = []
    for rid, n in auth_new.items():
        if rid in dom_new:
            if dom_new[rid] != n:
                mismatch.append((rid, n, dom_new[rid]))
        else:
            mismatch.append((rid, n, '分片缺失'))
    orphan = [rid for rid in dom_new if rid not in auth_new]
    if mismatch:
        print('!! 闸4 未通过：双写计数不一致 %s，中止' % mismatch[:10])
        return 5
    if orphan:
        print('（提示）分片侧存在权威源未收录的 id %d 个：%s' % (len(orphan), orphan[:5]))
    print('闸4 双写一致：权威源 A 类含新名 id %d 个，与分片逐 id 计数相等 ✅'
          % len(auth_new))

    # ---------- B 类零变更校验 ----------
    for p in files:
        cur = [it.get('source') if isinstance(it, dict) else None for it in new_payloads[p]]
        if cur != snapshot_source[p]:
            print('!! B 类零变更校验失败：%s 的 source 字段发生变化，中止' % p)
            return 6
    print('B 类零变更：%d 文件 source 字段逐条深比对一致 ✅' % len(files))

    if not apply_mode:
        print('\n（未加 --apply，仅预演，未落盘）')
        return 0

    # ---------- 落盘：权威源先 → 分片后 ----------
    print('\n--- 落盘（权威源 → 分片）---')
    for p in [AUTH] + [x for x in files if x != AUTH]:
        if p != AUTH and not any(p == c[0] for c in changed_files):
            continue
        fn, name = serials[p]
        open(p, 'w', encoding='utf-8').write(fn(new_payloads[p]))
        print('   已写 %s（格式 %s）' % (p, name))

    # ---------- 落盘后复检 ----------
    print('\n--- 落盘后复检 ---')
    for p in files:
        raw = open(p, encoding='utf-8').read()
        d = json.load(open(p, encoding='utf-8'))  # 解析校验
        hits = scan_hits(d)
        a = [h for h in hits if classify(h[1]) == 'A']
        b = [h for h in hits if classify(h[1]) == 'B']
        if a:
            print('!! 复检失败：%s A 类仍残留旧名 %d 处' % (p, len(a)))
            return 7
        print('   %-34s A 残留=0  B(source) 保留=%-4d  md5=%s' % (os.path.basename(p), len(b), md5(p)))

    # 权威源与分片新名计数最终复核
    auth_final = a_field_counter(json.load(open(AUTH, encoding='utf-8')))
    dom_final = {}
    for p in files:
        if p == AUTH:
            continue
        for rid, n in a_field_counter(json.load(open(p, encoding='utf-8'))).items():
            dom_final[rid] = dom_final.get(rid, 0) + n
    bad = [(r, auth_final[r], dom_final.get(r)) for r in auth_final if dom_final.get(r) != auth_final[r]]
    if bad:
        print('!! 落盘后双写不一致：%s' % bad[:10])
        return 8
    print('   落盘后双写复核：%d 个 id 计数全等 ✅' % len(auth_final))
    print('\n执行完成 ✅')
    return 0


if __name__ == '__main__':
    sys.exit(main())
