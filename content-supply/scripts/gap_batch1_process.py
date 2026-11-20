# -*- coding: utf-8 -*-
"""
GAP 第一批处理脚本：authority 批量标注 + source 规范化
对应：《采集需求清单GAP对表与执行排期_20261120.md》GAP-3 / GAP-6
口径基准：数据字典 v1.3.3（知识底座生产/风声知识底座数据字典v1.3_20261120.md，单一事实源）
规则：只加不删（source_raw 保留原值），不动主库，产出候选文件送小酒窝儿审核
锚定：主库 md5 bc614c84 / 6143 条
"""
import json, re, hashlib, sys
from collections import Counter

# ---------- 正则（与 v2.3 定版一致，含千条款） ----------
PAT_TIAO = re.compile(r'第[一二三四五六七八九十百千万零〇两\d]+条')
PAT_BOOK = re.compile(r'《[^》]+》')
PAT_CASENO = re.compile(r'[（(]\s*20\d{2}\s*[）)][一-龥]{1,3}\d{0,4}[一-龥]{0,3}(民|刑|行|执|商|仲)[一-龥]{0,4}\d{1,6}\s*号')

# ---------- authority 直接映射（按 entryType） ----------
# v2 修订（小马丫主体性质论点+实测抽检）：
# - PROC 1301 全量 derived（主体=流程/话术属行业实践，法条支撑走 legalRef 引证位，避免绿徽章虚高）
# - KNOWLEDGE 71 全量 derived（主体=分析判断，风声观点+数据）
# - CITY 21 → official（税费政策口径，dataSource 带官方公告 URL 佐证）
# - CERT 6 → derived（风声自建认证体系，非行业标准，industry 会虚高）
AUTH_BY_TYPE = {
    'LAW': 'official', 'POL': 'official',
    'DATA': 'data',
    'CITY': 'official',
    'CASE': 'court',
    'STD': 'industry', 'TERM': 'industry',
}
# v3（丁方案，20261120 拍板）：RISK 全量 derived——甲拆分已失效（P 档 758 全量判定仅 58% 后果型，
# 距 90% 语义层门过远），凭证层法条引用保留 legalRef 引证位，authority_note='法源待复核' 标注升级通道；
# 内容改写为后果型后按 authority_note 筛选走正常升级。案号型（真实判例）仍 court。
DERIVE_TYPES = {'RISK'}
# 主体性质=风声提炼/行业实践 → derived
DEFAULT_TYPES = {'PROC', 'KNOWLEDGE', 'ABIL', 'JOB', 'CERT', 'SUM', 'INFO', 'QUIZ', 'SCRIPT'}  # → derived

def derive_authority(e):
    """v3：RISK 全 derived（法源待复核），仅 caseRef 真实案号→court；其他 DEFAULT 类型 derived"""
    cr = str(e.get('caseRef') or '')
    if PAT_CASENO.search(cr):
        return 'court'
    return 'derived'

def risk_needs_review(e):
    """法源待复核标记：仅 RISK 且 legalRef 含具名法规或条号（凭证层成立、语义层未过门）"""
    if str(e.get('entryType')) != 'RISK':
        return False
    lr = str(e.get('legalRef') or '')
    return bool(PAT_TIAO.search(lr) or PAT_BOOK.search(lr))

def authority_of(e):
    t = str(e.get('entryType') or '')
    if t in AUTH_BY_TYPE: return AUTH_BY_TYPE[t]
    if t in DERIVE_TYPES: return derive_authority(e)
    return 'derived'  # DEFAULT_TYPES 与未知类型兜底

# ---------- source 规范化 ----------
# 第一版：清单明确映射 + 同义归一（完整度实测 82%，其余保留原值待第二批）
SOURCE_EXACT = {
    '法律条文': '国家法律法规数据库',
    '法律条文+行业惯例': '国家法律法规数据库 + 行业共识',
    '法律条文+判例': '国家法律法规数据库 + 中国裁判文书网',
    '行业标准+法律条文': '行业标准 + 国家法律法规数据库',
    '司法判例': '中国裁判文书网',
    '行业惯例': '风声研究 + 行业共识',
    '风声原创': '风声研究',
    '实战经验': '风声研究',
    '风险警示': '风声研究',
    '风险提示': '风声研究',
    '流程规范': '风声研究',
    '操作指南': '风声研究',
    '案例沉淀': '风声研究',
    '综合知识': '风声研究',
    '银行信贷实践': '风声研究',
    '政策文件': '住建部/地方政府官网',
    '住建部规章': '住建部官网',
    '政策解读+实战经验': '政府官网 + 风声研究',
    '法律条文+实战经验': '国家法律法规数据库 + 风声研究',
    '判例': '中国裁判文书网',
    '司法案例': '中国裁判文书网',
    '《民法典》合同编': '国家法律法规数据库',
    '《民法典》物权编': '国家法律法规数据库',
    '《房地产经纪管理办法》': '国家法律法规数据库',
    '民法典租赁合同章节': '国家法律法规数据库',
}
# 组合成分映射（按分隔符拆分后逐成分归一，保留原顺序）
COMPONENT = {
    '法律条文': '国家法律法规数据库',
    '司法判例': '中国裁判文书网',
    '判例': '中国裁判文书网',
    '司法案例': '中国裁判文书网',
    '政策文件': '政府官网',
    '税务政策': '政府官网',
    '行业惯例': '行业共识',
    '实战经验': '风声研究',
    '风声原创': '风声研究',
    '风险警示': '风声研究',
    '风险提示': '风声研究',
    '住建部规章': '住建部官网',
}
PAT_JM = re.compile(r'^聚满匠星云')
PAT_BJ = re.compile(r'^北京样板城市库')

def normalize_source(src):
    s = str(src or '').strip()
    if not s: return s, False
    if s in SOURCE_EXACT: return SOURCE_EXACT[s], True
    if PAT_JM.match(s): return '风声职业成长体系 v1.0', True
    # 组合成分拆分：+ / ＋ 分隔
    parts = re.split(r'\s*\+\s*', s)
    if len(parts) > 1 and all(p.strip() in COMPONENT or p.strip() in SOURCE_EXACT for p in parts):
        normed = []
        for p in parts:
            p = p.strip()
            if p in COMPONENT: normed.append(COMPONENT[p])
            elif p in SOURCE_EXACT: normed.append(SOURCE_EXACT[p])
            else: normed.append(p)
        # 去重保序
        seen, out = set(), []
        for x in normed:
            if x not in seen: seen.add(x); out.append(x)
        return ' + '.join(out), True
    return s, False  # 保留原值（含北京样板城市库等待裁定项）

# ---------- 反测自检（同族坑教训：上线前必须用已知答案反测） ----------
def self_test():
    cases_auth = [
        ({'entryType': 'LAW'}, 'official'),
        ({'entryType': 'CASE'}, 'court'),
        ({'entryType': 'DATA'}, 'data'),
        ({'entryType': 'CITY'}, 'official'),
        ({'entryType': 'STD'}, 'industry'),
        ({'entryType': 'TERM'}, 'industry'),
        # v3 丁方案：RISK 引用法条也 derived+法源待复核（甲拆分失效 58%<90% 门）
        ({'entryType': 'RISK', 'legalRef': '《中华人民共和国民法典》第一千一百九十八条', 'caseRef': ''}, 'derived'),
        ({'entryType': 'RISK', 'legalRef': '行业通行做法', 'caseRef': '（2024）京01民终1234号'}, 'court'),
        ({'entryType': 'RISK', 'legalRef': '行业通行做法', 'caseRef': '相关判例'}, 'derived'),
        # v2：PROC/KNOWLEDGE 主体性质=行业实践/分析判断，即使引用法条也 derived（法条走引证位）
        ({'entryType': 'PROC', 'legalRef': '《房地产经纪管理办法》第22条', 'caseRef': ''}, 'derived'),
        ({'entryType': 'PROC', 'legalRef': '', 'caseRef': ''}, 'derived'),
        ({'entryType': 'KNOWLEDGE', 'legalRef': '《民法典》第963条', 'caseRef': ''}, 'derived'),
        ({'entryType': 'CERT'}, 'derived'),
        ({'entryType': 'ABIL'}, 'derived'),
        ({'entryType': 'JOB'}, 'derived'),
        ({'entryType': '未知类型X'}, 'derived'),
    ]
    for e, want in cases_auth:
        got = authority_of(e)
        assert got == want, f'authority 反测失败: {e} 期望{want} 实得{got}'
    cases_note = [
        ({'entryType': 'RISK', 'legalRef': '《民法典》第962条', 'caseRef': ''}, True),
        ({'entryType': 'RISK', 'legalRef': '《中华人民共和国城乡规划法》第64条、第65条', 'caseRef': ''}, True),
        ({'entryType': 'RISK', 'legalRef': '行业通行做法', 'caseRef': '相关判例'}, False),
        ({'entryType': 'RISK', 'legalRef': '', 'caseRef': ''}, False),
        ({'entryType': 'PROC', 'legalRef': '《房地产经纪管理办法》第22条', 'caseRef': ''}, False),
    ]
    for e, want in cases_note:
        got = risk_needs_review(e)
        assert got == want, f'note 反测失败: {e} 期望{want} 实得{got}'
    cases_src = [
        ('法律条文', '国家法律法规数据库'),
        ('聚满匠星云岗位体系v1_生哥20261022拍板_内容侧初稿待行业校准', '风声职业成长体系 v1.0'),
        ('聚满匠星云阶段二批1_生哥20261022指令采集_内容侧初稿待行业校准', '风声职业成长体系 v1.0'),
        ('法律条文+判例', '国家法律法规数据库 + 中国裁判文书网'),
        ('司法判例+法律条文', '中国裁判文书网 + 国家法律法规数据库'),
        ('政策文件+行业惯例', '政府官网 + 行业共识'),
        ('法律条文+政策文件', '国家法律法规数据库 + 政府官网'),
        ('行业惯例+法律条文', '行业共识 + 国家法律法规数据库'),
        ('行业惯例', '风声研究 + 行业共识'),
        ('风声原创', '风声研究'),
        ('《民法典》合同编', '国家法律法规数据库'),
        # 不可识别值保留原样
        ('北京样板城市库批1_生哥任务书20261022_官网政策核验_待行业实操校准', '北京样板城市库批1_生哥任务书20261022_官网政策核验_待行业实操校准'),
        ('风声研究', '风声研究'),
    ]
    for s, want in cases_src:
        got, _ = normalize_source(s)
        assert got == want, f'source 反测失败: {s!r} 期望{want!r} 实得{got!r}'
    print(f'[self_test] 反测 {len(cases_auth)}+{len(cases_src)} 项全部通过')

# ---------- 主流程 ----------
def main(in_path, out_path, report_path):
    self_test()
    raw = open(in_path, 'rb').read()
    md5 = hashlib.md5(raw).hexdigest()[:8]
    data = json.loads(raw)
    entries = data if isinstance(data, list) else data.get('entries') or data.get('data')
    n0 = len(entries)

    stats = {'authority': Counter(), 'source_normed': 0, 'source_kept': 0,
             'auth_changed': 0, 'src_changed': 0, 'kept_types': Counter(), 'auth_note': 0}
    samples = []
    for e in entries:
        # GAP-3 authority（只加/覆盖非法枚举）
        old_a = str(e.get('authority') or '').strip()
        new_a = authority_of(e)
        e['authority'] = new_a
        if old_a and old_a != new_a:
            stats['auth_changed'] += 1
            e['authority_raw'] = old_a  # 溯源保留
        elif old_a == new_a:
            pass
        stats['authority'][new_a] += 1
        # GAP-6 source 规范化（source_raw 保留原值，只加不删）
        old_s = str(e.get('source') or '')
        new_s, hit = normalize_source(old_s)
        if hit and new_s != old_s:
            e['source_raw'] = old_s
            e['source'] = new_s
            stats['src_changed'] += 1
            stats['source_normed'] += 1
        else:
            stats['source_kept'] += 1
            if not hit: stats['kept_types'][old_s] += 1
        # v3 丁方案：RISK 法源待复核标注（升级通道标记）
        if str(e.get('entryType')) == 'RISK' and new_a == 'derived' and risk_needs_review(e):
            e['authority_note'] = '法源待复核'
            stats['auth_note'] += 1
        if len(samples) < 20 and (old_a != new_a or (hit and new_s != old_s)):
            samples.append({'id': e.get('id'), 'entryType': e.get('entryType'),
                            'source': f'{old_s[:30]!r}->{new_s[:40]!r}',
                            'authority': f'{old_a or "(空)"}->{new_a}'})

    # 不变量校验：条数不变/结构只加不删
    assert len(entries) == n0, f'条数漂移 {n0}->{len(entries)}'
    out = json.dumps(data, ensure_ascii=False, indent=1)
    open(out_path, 'w', encoding='utf-8').write(out)
    out_md5 = hashlib.md5(out.encode()).hexdigest()[:8]

    report = {
        'in_md5': md5, 'in_total': n0, 'out_md5': out_md5, 'out_total': len(entries),
        'authority_dist': dict(stats['authority']),
        'authority_changed': stats['auth_changed'],
        'authority_note_count': stats['auth_note'],
        'source_normed': stats['source_normed'],
        'source_kept': stats['source_kept'],
        'kept_unnormed_top10': dict(stats['kept_types'].most_common(10)),
        'samples': samples,
    }
    json.dump(report, open(report_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'[done] in={md5}/{n0} out={out_md5}/{len(entries)} '
          f'authority={dict(stats["authority"])} 变更{stats["auth_changed"]} '
          f'source规范化={stats["source_normed"]} 保留={stats["source_kept"]} 法源待复核={stats["auth_note"]}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
