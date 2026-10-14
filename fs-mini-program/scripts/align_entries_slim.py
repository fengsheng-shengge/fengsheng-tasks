#!/usr/bin/env python3
# FS-KB-ALIGN-20261014-01 · 小程序策展数据对齐权威基线（小眼镜口径）
# 按 id 同源对齐 entries_slim.js（704 / decoder·see·nego）到 知识底座生产/entries_5000.json（5843 / 30 场景域）：
#   - name/alias/cq/ola/cp/detail 对齐权威值
#   - 新增 ownerBenefit（经纪人侧收益，适配使用关键）
#   - legalRef 取权威真值（无真值诚实保留，绝不编造）
#   - scene 对齐权威 sceneDomain（30 类规范域）
#   - 保留 decoder/see/nego 分组与顺序；tags 用权威值（引擎 String() 兼容）
# 用法：python3 scripts/align_entries_slim.py [--dry]
import json, sys, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # fs-mini-program
SLIM = os.path.join(ROOT, 'src/package-curation/data/entries_slim.js')
AUTH = os.path.join(ROOT, '..', '知识底座生产', 'entries_5000.json')

def load_slim(p):
    s = open(p, encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])

def is_real_legal(ref):
    if not ref:
        return False
    t = str(ref).strip()
    return not re.search(r'待补充|待核|无|—|^-$|^\s*$', t) and len(t) >= 4

def main():
    dry = '--dry' in sys.argv
    auth = json.load(open(AUTH, encoding='utf-8'))
    by = {e['id']: e for e in auth}
    slim = load_slim(SLIM)
    st = dict(total=0, miss=0, name=0, alias=0, cq=0, ola=0, cp=0, detail=0, scene=0,
              legalfix=0, ob=0, legalreal_before=0, legalreal_after=0)
    out = {}
    for grp in ['decoder', 'see', 'nego']:
        out[grp] = []
        for e in slim.get(grp, []):
            st['total'] += 1
            a = by.get(e['id'])
            if not a:
                st['miss'] += 1
                out[grp].append(e)  # 权威缺失 → 原样保留（诚实）
                continue
            if is_real_legal(e.get('legalRef')):
                st['legalreal_before'] += 1
            ne = {
                'id': a['id'],
                'domain': a.get('domain') or e.get('domain', ''),
                'subScene': a.get('subScene') or e.get('subScene', ''),
                'name': a.get('name') or e.get('name', ''),
                'alias': a.get('alias') or e.get('alias', []),
                'cq': a.get('consumerQ') or e.get('cq', ''),
                'ola': a.get('ola') or e.get('ola', ''),
                'cp': a.get('cp') or e.get('cp', []),
                'detail': a.get('detail') or e.get('detail', ''),
                'legalRef': a.get('legalRef') or e.get('legalRef', ''),
                'consumerBenefit': a.get('consumerBenefit') or e.get('consumerBenefit', ''),
                'ownerBenefit': a.get('ownerBenefit') or '',
                'tags': a.get('tags') or e.get('tags', {}),
                'scene': a.get('sceneDomain') or e.get('scene', ''),
            }
            if ne['name'] != e.get('name'): st['name'] += 1
            if ne['alias'] != e.get('alias'): st['alias'] += 1
            if ne['cq'] != e.get('cq'): st['cq'] += 1
            if ne['ola'] != e.get('ola'): st['ola'] += 1
            if ne['cp'] != e.get('cp'): st['cp'] += 1
            if ne['detail'] != e.get('detail'): st['detail'] += 1
            if ne['scene'] != e.get('scene'): st['scene'] += 1
            if (not is_real_legal(e.get('legalRef'))) and is_real_legal(ne['legalRef']): st['legalfix'] += 1
            if ne['ownerBenefit']: st['ob'] += 1
            if is_real_legal(ne['legalRef']): st['legalreal_after'] += 1
            out[grp].append(ne)
    print('STATS ' + json.dumps(st, ensure_ascii=False))
    if dry:
        print('DRY-RUN · 未写盘')
        return
    header = (
        '// 策展引擎静态兜底数据 · 按权威基线对齐（FS-KB-ALIGN-20261014-01）\n'
        '// 来源：知识底座生产/entries_5000.json（权威基线 5843 条 / 30 场景域），按 id 同源对齐 name/alias/cq/ola/cp/detail\n'
        '// 新增 ownerBenefit（经纪人侧收益）；legalRef 取权威真值（无真值诚实保留）；scene 对齐权威 sceneDomain\n'
        '// 保留 decoder/see/nego 三组策展分组与顺序；tags 用权威值（引擎兼容）；ESM 导出\n'
    )
    body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open(SLIM, 'w', encoding='utf-8').write(header + 'export default ' + body + '\n')
    print('WROTE ' + SLIM)

if __name__ == '__main__':
    main()
