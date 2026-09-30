#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
风声知识库 · 掌握度测评题库生成器
从 data/entries.json 真实词条派生「按业务模块×场景」的判断题/选择题。
原则：正确项必须取自词条明确的 cp(正确做法)/ola(一句话答案)；干扰项取自同场景真实要点。
仅保留可溯源、可判定、无明显歧义的题，避免误导。
"""
import json, os, re

BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRIES = os.path.join(BASE, 'data', 'entries.json')
OUT     = os.path.join(BASE, 'knowledge', 'quiz-data.js')

# 业务模块：展示名 + 图标（词条 sceneDomain 映射）
DOMAIN_CFG = {
    '签约前':   '📋', '签约中':   '✍️', '签约后':   '✅',
    '居住中':   '🏠', '退租出售': '🔑', '职业成长': '📈',
    '租赁':     '🔑', '租住':     '🏡', '购房':     '🏘',
}

# 明确「正确做法」的开头词（cp/ola 正向表述）
P_GOOD = ('必须','应','需要','要','需','应当','建议','可以','得先','优先','先','不能忘','务必','确保','核实')
# 明确「错误/禁止」词，用于构造判断题的反向项或排除不可判项
P_BAD  = ('不得','禁止','严禁','不能','不可','勿','不应','不要','违规','避免','绝不','是违规')

def clean(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()

def is_good_phrase(s):
    return any(s.startswith(w) for w in P_GOOD)

def is_bad_phrase(s):
    return any(s.startswith(w) for w in P_BAD)

def cp_points(e):
    c = e.get('cp')
    if isinstance(c, list):
        return [clean(x) for x in c if clean(x)]
    if isinstance(c, str) and clean(c):
        return [clean(c)]
    return []

def detail_points(e):
    d = clean(e.get('detail'))
    if not d: return []
    return re.findall(r'((?:必须|应|需|要|应当|建议|不得|禁止|严禁|不能|不可|勿)[^，。；;]{4,40})', d)

def entry_judge(e):
    """由正向 cp/ola 构造判断题。
    部分题改写为『错误认知』的否定陈述（answer=false），保证对错平衡、可检测误解。
    """
    ola = clean(e.get('ola')) or clean(e.get('detail'))
    if not ola: return None
    pts = cp_points(e) or detail_points(e)
    good = [p for p in pts if is_good_phrase(p) and len(p) >= 8]
    if not good: return None
    correct = good[0]
    # 用「点对点」正则找强正向句，做关键词否定改写
    neg = make_negated(correct)
    # 只有能可靠改写时才生成 false 题；否则给 true 题
    if neg:
        return {'type':'judge', 'stem': f'{neg}。', 'answer': False, 'explanation': ola}
    return {'type':'judge', 'stem': f'{correct}。', 'answer': True, 'explanation': ola}

def make_negated(p):
    """将正确做法改写为错误说法（用于判断题 answer=false）。"""
    neg_rules = [
        # 必须/应/要/需  → 无需/不必/可以跳过
        ('必须', '不必'),
        ('应', '无需'),
        ('需要', '无需'),
        ('应当', '无需'),
        ('需', '无需'),
        ('要', '不用'),
    ]
    for kw, rep in neg_rules:
        if p.startswith(kw):
            if rep == '无需' and p.startswith('需'):
                return '无需' + p[len('需'):]
            return rep + p[len(kw):]
    return None

def entry_choice(e, pool):
    """选择题：正确项 = 正向 cp/ola；干扰项 = 同场景词条的真实错误/其他要点。"""
    ola = clean(e.get('ola')) or clean(e.get('detail'))
    pts = cp_points(e) or detail_points(e)
    good = [p for p in pts if is_good_phrase(p) and len(p) >= 8]
    if not good: 
        return None
    correct = good[0]
    # 干扰项候选：同场景其他词条的负面要点 + 通用错误项补足
    distractor_cands = []
    for f in pool:
        for p in (cp_points(f) + detail_points(f)):
            if is_bad_phrase(p) and clean(p) != correct and clean(p) not in distractor_cands:
                distractor_cands.append(clean(p))
            if len(distractor_cands) >= 3: break
        if len(distractor_cands) >= 3: break
    static_bads = ['仅凭口头约定即可','由无关第三方代签即可','不核查直接成交即可','任一方口头反悔即解除']
    distractors = distractor_cands[:3]
    for b in static_bads:
        if len(distractors) >= 3: break
        if b != correct and b not in distractors:
            distractors.append(b)
    if len(distractors) < 3: return None
    opts = ['A', 'B', 'C', 'D']
    labels = {opts[i]: (correct if i == 0 else distractors[i-1]) for i in range(4)}
    return {'type':'choice', 'stem': f'关于「{clean(e.get("name"))}」的守则，下列做法正确的是____。',
            'options': [f'{k}. {labels[k]}' for k in opts], 'answer': 'A', 'explanation': ola}

def main():
    data  = json.load(open(ENTRIES))
    # 预分组：sceneDomain -> subScene -> [entry]
    grouped = {}
    for e in data:
        dom = clean(e.get('sceneDomain'))
        sub = clean(e.get('subScene')) or '综合'
        grouped.setdefault(dom, {}).setdefault(sub, []).append(e)

    modules = []
    for dom, cfg_icon in DOMAIN_CFG.items():
        subs  = grouped.get(dom)
        if not subs: continue
        scenes = []
        for sub, entries in subs.items():
            # 该场景全部词条作干扰池
            pool = entries
            qs = []
            for e in entries:
                # 判断题：最多3道
                if len([q for q in qs if q.get('type')=='judge']) < 3:
                    qq = entry_judge(e)
                    if qq:
                        qq['entry'], qq['entryId'] = clean(e.get('name')), e.get('id')
                        qs.append(qq)
                # 选择题：最多3道
                if len([q for q in qs if q.get('type')=='choice']) < 3:
                    qq = entry_choice(e, pool)
                    if qq:
                        qq['entry'], qq['entryId'] = clean(e.get('name')), e.get('id')
                        qs.append(qq)
                if len(qs) >= 6: break
            if qs:
                scenes.append({'scene': sub, 'questions': qs})
        if scenes:
            modules.append({'domain': dom, 'icon': cfg_icon, 'scenes': scenes})

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('window.KNOWLEDGE_QUIZ = ' + json.dumps(modules, ensure_ascii=False) + ';\n')
    total = sum(len(s['questions']) for m in modules for s in m['scenes'])
    print(f'生成：{len(modules)} 业务模块，共 {total} 题 → {OUT}')

if __name__ == '__main__':
    main()