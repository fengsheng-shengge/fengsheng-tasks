#!/usr/bin/env python3
"""T08: 案例采集流水线 — 每周从A级源检索关键词，产出候选案例清单
用法: python3 case_collector.py [--keywords keyword1,keyword2] [--output cases_weekly.json]
"""

import json
import re
import sys
import time
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from pathlib import Path

# ============================================================
#  A级案例采集源
# ============================================================
SOURCES = [
    {
        'name': '中国裁判文书网',
        'url': 'https://wenshu.court.gov.cn/',
        'type': 'A级',
        'searchUrl': 'https://wenshu.court.gov.cn/website/wenshu/181217BMTKHNT2W0/index.html?pageId=xxx&s8={keyword}',
        'note': '需手动搜索，API限制严格',
        'method': 'manual',
    },
    {
        'name': '人民法院公告网',
        'url': 'https://rmfygg.court.gov.cn/',
        'type': 'A级',
        'searchUrl': 'https://rmfygg.court.gov.cn/web/rmfyportal/search?keyword={keyword}',
        'note': '公告类信息，适合提取判决摘要',
        'method': 'manual',
    },
    {
        'name': '住建部官网·通报公告',
        'url': 'https://www.mohurd.gov.cn/',
        'type': 'A级',
        'searchUrl': 'https://www.mohurd.gov.cn/gongkai/fdzdgknr/tzgg/index.html',
        'note': '房地产行业政策通报、违规处罚',
        'method': 'manual',
    },
    {
        'name': '中国消费者协会·典型案例',
        'url': 'https://www.cca.org.cn/',
        'type': 'A级',
        'searchUrl': 'https://www.cca.org.cn/tsdh/detail/{id}.html',
        'note': '消费维权典型案例，房产纠纷占比高',
        'method': 'manual',
    },
    {
        'name': '中国房地产估价师学会',
        'url': 'https://www.cirea.org.cn/',
        'type': 'B级',
        'searchUrl': 'https://www.cirea.org.cn/search?q={keyword}',
        'note': '行业标准、估价案例',
        'method': 'manual',
    },
    {
        'name': '各地住建委官网',
        'url': 'https://zjw.beijing.gov.cn/ (北京例)',
        'type': 'B级',
        'searchUrl': '各地住建委搜索',
        'note': '地方性政策、违规通报',
        'method': 'manual',
    },
    {
        'name': '北大法宝',
        'url': 'https://www.pkulaw.com/',
        'type': 'A级',
        'searchUrl': 'https://www.pkulaw.com/case/',
        'note': '法律数据库，判例检索',
        'method': 'manual',
    },
    {
        'name': '中国消费者报',
        'url': 'https://www.ccn.com.cn/',
        'type': 'B级',
        'searchUrl': 'https://www.ccn.com.cn/search?q={keyword}',
        'note': '消费维权新闻案例',
        'method': 'manual',
    },
]

# ============================================================
#  案例采集模板
# ============================================================
CASE_TEMPLATE = {
    'caseId': '',           # CASE-{domain}-{seq}
    'title': '',            # 案例标题
    'court': '',            # 审理法院
    'date': '',             # 裁判日期
    'source': '',           # 来源名称
    'sourceUrl': '',        # 来源URL
    'sourceLevel': '',      # A/B/C级
    'direction': '',        # 判决定向（正向/负向/中性）
    'judgment': '',         # 裁判摘要
    'professionalInsight': '',  # 经纪人专业洞察
    'relatedToolIds': [],   # 关联工具卡ID
    'relatedEntryIds': [],  # 关联词条ID
    'keywords': [],         # 检索关键词
    'collectedAt': '',      # 采集时间
    'status': 'candidate',  # candidate/approved/rejected
}

# ============================================================
#  检索关键词（按域）
# ============================================================
KEYWORD_MAP = {
    '签约前': ['房屋买卖合同纠纷', '定金纠纷', '购房资格', '学区房承诺', '中介费争议', '阴阳合同', '跳单纠纷', '房屋信息隐瞒'],
    '签约中': ['贷款审批纠纷', '税费计算争议', '资金监管', '网签备案', '合同条款争议', '定金返还'],
    '签约后': ['房屋交付纠纷', '产权过户', '房屋质量', '装修纠纷', '物业纠纷', '邻里纠纷', '房屋漏水', '面积误差'],
    '居住中': ['房屋维修', '物业费纠纷', '邻里纠纷', '房屋漏水', '承重墙', '装修违规', '违章建筑'],
    '退租出售': ['房屋继承', '遗产分割', '赠与合同', '离婚房产', '房屋出售', '抵押处置', '经济适用房'],
    '资产持有与运营': ['房屋租赁纠纷', '租客欠租', '房屋转租', '租金减免', '租赁合同解除', '房东违约'],
    '业主': ['业主维权', '物业纠纷', '房屋维修基金', '业主委员会', '共有部分', '停车位纠纷'],
    '客户解码': ['经纪人违规', '中介违规', '居间合同', '独家代理', '跳单', '中介费'],
}

def generate_candidate_cases(keywords=None, domain=None):
    """Generate candidate case entries from keyword search"""
    candidates = []
    now = datetime.now().isoformat()
    
    search_keywords = keywords or []
    if domain and domain in KEYWORD_MAP:
        search_keywords = KEYWORD_MAP[domain]
    
    if not search_keywords:
        search_keywords = ['房屋买卖合同纠纷', '定金纠纷', '中介费争议']
    
    seq = 1
    for kw in search_keywords:
        candidate = dict(CASE_TEMPLATE)
        candidate['caseId'] = f'CASE-CANDIDATE-{seq:04d}'
        candidate['keywords'] = [kw]
        candidate['collectedAt'] = now
        candidate['sourceLevel'] = '待确认'
        candidate['title'] = f'[{kw}] 检索候选'
        candidate['note'] = f'需从{", ".join(s["name"] for s in SOURCES[:3])}检索确认'
        candidates.append(candidate)
        seq += 1
    
    return candidates

def main():
    import argparse
    parser = argparse.ArgumentParser(description='案例采集流水线')
    parser.add_argument('--keywords', type=str, help='检索关键词，逗号分隔')
    parser.add_argument('--domain', type=str, help='按域检索：签约前/签约中/签约后/居住中/退租出售/资产持有与运营/业主/客户解码')
    parser.add_argument('--output', type=str, default='cases_weekly.json', help='输出文件路径')
    parser.add_argument('--list-sources', action='store_true', help='列出采集源')
    parser.add_argument('--list-keywords', action='store_true', help='列出所有域关键词')
    args = parser.parse_args()
    
    if args.list_sources:
        print("=== A级案例采集源 ===")
        for s in SOURCES:
            print(f"  [{s['type']}] {s['name']}: {s['url']}")
            print(f"       搜索: {s['searchUrl']}")
            print(f"       方法: {s['method']}")
            print(f"       备注: {s['note']}")
            print()
        return
    
    if args.list_keywords:
        print("=== 检索关键词（按域）===")
        for domain, kws in KEYWORD_MAP.items():
            print(f"  {domain}: {', '.join(kws)}")
        return
    
    keywords = args.keywords.split(',') if args.keywords else None
    candidates = generate_candidate_cases(keywords, args.domain)
    
    out_path = Path(args.output)
    out_data = {
        'version': '1.0',
        'generated': datetime.now().isoformat(),
        'description': '风声案例采集流水线 — 每周候选案例清单',
        'sources': [{'name': s['name'], 'url': s['url'], 'type': s['type'], 'method': s['method']} for s in SOURCES],
        'totalCandidates': len(candidates),
        'candidates': candidates,
    }
    out_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2))
    print(f"Written {len(candidates)} candidates to {out_path}")
    print(f"Next: 人工审核 → 确认事实 → 入库 case_library.json")

if __name__ == '__main__':
    main()