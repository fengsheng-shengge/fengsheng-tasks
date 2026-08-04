#!/usr/bin/env python3
"""合并案例：将第二批10条案例追加到第一批10条"""
import json

# 第二批10条案例
new_cases = [
    {
        "id": "CASE-WEEKLY-011",
        "title": "装修公司擅自停工加价业主有权解除合同",
        "direction": "正向",
        "relatedEntries": ["LIV-HOM-001", "LIV-HOM-005"],
        "facts": "天津某法院审理，装修公司以业主不支付增项款为由擅自停工。法院查明，双方补充协议已明确约定合同报价单内工程量无任何增项。装修公司作为专业施工方，前期对工程量预估不足，又以业主不支付增项款为由擅自停工，违反合同约定和诚信原则。法院判决解除双方的装修合同，装修公司在扣除已完成项目的合理费用后返还剩余款项。",
        "legalBasis": "《民法典》第563条（合同解除）",
        "professionalInsight": [
            "签订装修合同时须明确'无增项'条款",
            "装修公司擅自停工即构成违约",
            "增项需双方书面确认否则无效",
            "业主有权解除合同并获得退款"
        ],
        "consumerQ": "装修公司中途停工要求加钱，不然就不干了，我能解除合同吗？",
        "oneLineAnswer": "装修公司擅自停工加价构成违约，业主有权解除合同并要求退款。",
        "severity": "hard",
        "source": "天津法院网",
        "sourceUrl": "https://tjfy.tjcourt.gov.cn/article/detail/2026/06/id/9387113.shtml",
        "sourceLevel": "A级",
        "court": "天津法院",
        "date": "2026-06",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["装修增项", "擅自停工", "解除合同", "诚信原则"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-012",
        "title": "装修验收不合格整改还要加钱法院判装修公司违约",
        "direction": "正向",
        "relatedEntries": ["LIV-HOM-003", "LIV-HOM-008"],
        "facts": "上海二中院审理，小余夫妻与装修公司签订装修合同，验收时发现多处质量问题未通过监理验收。装修公司要求加钱才肯整改，小余夫妻拒绝。一审法院认定装修公司存在违约事实，判决装修公司支付违约金1万元。装修公司不服上诉，上海二中院维持原判，认定装修公司未按要求进行整改、未通过监理公司验收，构成违约。",
        "legalBasis": "《民法典》第577条（违约责任）",
        "professionalInsight": [
            "装修验收须有监理公司参与",
            "整改是合同义务不是增值服务",
            "装修公司以整改为由加价属违约",
            "保留验收记录和监理报告是关键证据"
        ],
        "consumerQ": "装修验收不合格，装修公司说要整改就得加钱，这合理吗？",
        "oneLineAnswer": "装修整改是合同义务，以整改为由加价构成违约，法院支持业主索赔。",
        "severity": "hard",
        "source": "澎湃新闻",
        "sourceUrl": "https://m.thepaper.cn/newsDetail_forward_33003530",
        "sourceLevel": "A级",
        "court": "上海二中院",
        "date": "2026-04",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["装修验收", "整改加价", "监理验收", "违约金"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-013",
        "title": "房屋漏水不能拒交物业费法院判决必须缴纳",
        "direction": "负向",
        "relatedEntries": ["LIV-PMG-001", "LIV-PMG-005"],
        "facts": "湖南益阳法院审理，涂某、张某两名业主以房屋漏水为由拒绝缴纳物业费。物业公司起诉追讨。法院审理认为，《前期物业服务合同》依法成立并有效，对全体业主具有法律约束力。房屋漏水问题原因尚不明确，可能涉及开发商质量保修、第三方侵权等多个责任主体，与物业服务合同不属于同一法律关系，业主不能以房屋漏水为由拒交物业费。判决业主须足额缴纳物业费。",
        "legalBasis": "《民法典》第944条（业主支付物业费义务）",
        "professionalInsight": [
            "房屋漏水与物业费是不同法律关系",
            "漏水问题须先确定责任主体再维权",
            "拒交物业费可能面临诉讼风险",
            "建议业主通过合法渠道（报修/投诉/诉讼）解决漏水问题"
        ],
        "consumerQ": "房子漏水一直没修好，我能不交物业费吗？",
        "oneLineAnswer": "不能以房屋漏水为由拒交物业费，两者属于不同法律关系。",
        "severity": "hard",
        "source": "湖南普法网",
        "sourceUrl": "https://www.hnpfw.com/content/646040/91/15985717.html",
        "sourceLevel": "A级",
        "court": "益阳法院",
        "date": "2026-06",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["房屋漏水", "物业费", "拒交", "法律关系"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-014",
        "title": "卧室改建卫生间致楼下渗水被判拆除并赔偿",
        "direction": "正向",
        "relatedEntries": ["LIV-DEC-003", "LIV-DEC-005"],
        "facts": "海南二中院终审判决，业主谭某在卧室改建卫生间，导致楼下邻居卧室渗水霉变。楼下业主起诉要求拆除并赔偿。法院审理认定，谭某改变房屋结构功能，将卧室改为卫生间，影响楼下居住安全和生活质量，构成妨害。判决谭某拆除卫生间给排水管道（含暗敷管线）、切断水源并做好防水封闭、恢复卧室功能，补偿楼下业主修复材料及人工费1万元。",
        "legalBasis": "《民法典》第288条（相邻关系）、第236条（排除妨害）",
        "professionalInsight": [
            "室内改造不得改变房屋基本结构功能",
            "卧室改卫生间侵犯楼下相邻权",
            "擅自改造需承担拆除恢复原状责任",
            "相邻纠纷中精神损害抚慰金较难获得支持"
        ],
        "consumerQ": "楼上把卧室改成卫生间，我家天花板渗水发霉了怎么办？",
        "oneLineAnswer": "楼上擅自改变房屋结构侵害相邻权，可起诉要求拆除恢复原状并赔偿。",
        "severity": "hard",
        "source": "儋州政法网",
        "sourceUrl": "https://danzhou.hnzhengfa.gov.cn/news/yianshuofa/show-5598.html",
        "sourceLevel": "A级",
        "court": "海南二中院",
        "date": "2026-06",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["相邻关系", "改建", "渗水", "排除妨害", "恢复原状"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-015",
        "title": "开发商漏水保修期内未解决不能以质保期届满免责",
        "direction": "正向",
        "relatedEntries": ["LIV-MNT-001", "LIV-MNT-008"],
        "facts": "上海普陀区法院审理，林某购买的房屋在保修期内出现漏水问题，开发商多次维修但未彻底解决。质保期届满后，开发商以保修期已过为由拒绝继续维修。法院审理认定，房屋漏水问题发生在保修期内，开发商多次维修未彻底解决，不能以质保期届满为由免除责任。但考虑到房屋已交付多年存在自然损耗，法院酌情判决开发商承担维修费用，具体金额根据实际情况确定。",
        "legalBasis": "《民法典》第617条（出卖人瑕疵担保责任）",
        "professionalInsight": [
            "保修期内未解决的问题不能以过保免责",
            "开发商多次维修未彻底解决的须继续负责",
            "业主要保留每次报修和维修记录",
            "保修期不是免责金牌，关键看问题是否已在期内暴露"
        ],
        "consumerQ": "房子漏水保修期内修了好几次都没好，现在过保了开发商不管了怎么办？",
        "oneLineAnswer": "保修期内暴露的问题未彻底解决，开发商不能以过保为由免责。",
        "severity": "hard",
        "source": "澎湃新闻",
        "sourceUrl": "https://m.thepaper.cn/newsDetail_forward_33236163",
        "sourceLevel": "A级",
        "court": "上海普陀区法院",
        "date": "2026-05",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["房屋漏水", "保修期", "开发商", "瑕疵担保"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-016",
        "title": "新房漏水楼上80%物业20%责任法院判赔",
        "direction": "中性",
        "relatedEntries": ["LIV-MNT-003", "LIV-PMG-003"],
        "facts": "中国法院网报道，琚阿姨新房漏水，多方咨询后法院认定维修赔偿损失基本合理。法院依法行使自由裁量权，判决楼上业主周某承担80%责任，物业公司承担20%责任，赔偿总额以2万元为基数按比例计算。判决书对损失认定依据、询价过程、裁量理由逐一写明，各方当事人均接受。此案明确了漏水纠纷中的多方责任比例分配。",
        "legalBasis": "《民法典》第1165条（过错责任原则）、第1172条（分别侵权按份责任）",
        "professionalInsight": [
            "漏水纠纷可同时追究多方责任",
            "楼上业主和物业公司可能按比例担责",
            "法院通过询价方式确定合理维修费用",
            "保留漏水证据和维修报价是关键"
        ],
        "consumerQ": "新房漏水，楼上和物业都说不是自己的责任，我该找谁？",
        "oneLineAnswer": "漏水纠纷可同时起诉楼上业主和物业公司，法院按过错比例分配责任。",
        "severity": "hard",
        "source": "中国法院网",
        "sourceUrl": "https://www.chinacourt.cn/article/detail/2026/07/id/9416653.shtml",
        "sourceLevel": "A级",
        "court": "法院",
        "date": "2026-07",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["新房漏水", "责任比例", "楼上业主", "物业公司", "按份责任"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-017",
        "title": "9份相互矛盾遗嘱全部无效法定继承均分",
        "direction": "中性",
        "relatedEntries": ["EXT-INH-001", "EXT-INH-005"],
        "facts": "昆明法院审理，一名老人在两年内先后出具9份内容相互矛盾的遗嘱及房产处置文件，四名儿子各手持自己的文书争夺房产继承权。法院审理认定，全部文书均无法完全体现老人独立真实意愿，多份文书短期内接连出具、内容相互矛盾，且形成过程受外界干预，无任何一份可认定为老人自主订立的有效遗嘱。依法不予认可，涉案房产份额按照法定继承由四名儿子均分。",
        "legalBasis": "《民法典》第1143条（遗嘱无效情形）",
        "professionalInsight": [
            "多份矛盾遗嘱可能导致全部无效",
            "遗嘱须体现立遗嘱人独立真实意愿",
            "受外界干预形成的遗嘱可能被认定无效",
            "全部遗嘱无效时按法定继承处理"
        ],
        "consumerQ": "老人留下好几份遗嘱内容都不一样，到底按哪份来？",
        "oneLineAnswer": "多份矛盾遗嘱若均无法体现老人真实意愿，可能全部无效，按法定继承处理。",
        "severity": "hard",
        "source": "昆明日报",
        "sourceUrl": "https://m.weibo.cn/detail/5326816988105340",
        "sourceLevel": "A级",
        "court": "昆明法院",
        "date": "2026-06",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["遗嘱", "继承纠纷", "法定继承", "遗嘱无效"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-018",
        "title": "离婚协议约定房产归小孩父亲去世后赠与义务不消灭",
        "direction": "正向",
        "relatedEntries": ["EXT-INH-003", "EXT-INH-008"],
        "facts": "山东高法报道，康某与前妻离婚协议约定房产归小孩小康，但一直未过户。康某去世后，继母覃某认为该房产属于遗产拒绝过户。法院审理认定，康某生前负有将房屋过户给小康的义务，该赠与义务不因康某去世而消灭。覃某、康乙、康丙作为康某的法定继承人，在未明确放弃继承权的情况下，依法应当继续履行康某生前未尽的义务，协助将房屋过户给小康。",
        "legalBasis": "《民法典》第1161条（继承人清偿债务义务）",
        "professionalInsight": [
            "离婚协议中约定的赠与义务不因死亡消灭",
            "继承人须继续履行被继承人生前未尽的义务",
            "离婚协议中的房产约定具有法律约束力",
            "建议离婚后及时办理过户避免后续纠纷"
        ],
        "consumerQ": "离婚时说好房子归孩子，前夫去世后继母说是遗产不给过户怎么办？",
        "oneLineAnswer": "离婚协议约定的赠与义务不因一方去世而消灭，继承人须继续履行。",
        "severity": "hard",
        "source": "山东高法",
        "sourceUrl": "http://m.toutiao.com/group/7662793155812622884/",
        "sourceLevel": "A级",
        "court": "山东法院",
        "date": "2026-06",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["离婚协议", "赠与", "继承", "过户", "遗产"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-019",
        "title": "生而不养还想争房产法院判养母继承全部份额",
        "direction": "正向",
        "relatedEntries": ["EXT-INH-002", "EXT-INH-006"],
        "facts": "法院审理，男子刘俊由养母抚养长大，去世后留下一套房产。亲生父亲一方主张继承权，声称毕竟是亲生父亲。法院审理认定，收养关系成立后，养母对刘俊尽了抚养义务，是实际抚养人。亲生父亲长期未尽抚养义务，根据权利义务对等原则，判决养母继承全部房产份额，亲生父亲无权继承。",
        "legalBasis": "《民法典》第1111条（收养关系效力）、第1130条（遗产分配）",
        "professionalInsight": [
            "收养关系成立后养父母享有法定继承权",
            "未尽抚养义务的亲生父母继承权可能被限制",
            "继承权与抚养义务对等",
            "收养关系中的继承权不因血缘关系而改变"
        ],
        "consumerQ": "养母养大的孩子去世了，亲生父母来争房产怎么办？",
        "oneLineAnswer": "收养关系成立后养母享有法定继承权，未尽抚养义务的亲生父母无权继承。",
        "severity": "hard",
        "source": "三湘都市报",
        "sourceUrl": "http://epaper.voc.com.cn/sxdsb/images/2026-03/23/A6/20260323A6_pdf.pdf",
        "sourceLevel": "A级",
        "court": "法院",
        "date": "2026-03",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["收养", "继承", "抚养义务", "遗产"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "fa"}
    },
    {
        "id": "CASE-WEEKLY-020",
        "title": "全屋定制设计图一变报价涨10万+法院调解化解",
        "direction": "中性",
        "relatedEntries": ["LIV-HOM-002", "LIV-HOM-006"],
        "facts": "天津法院报道，唐先生委托全屋定制公司做装修，设计图多次修改后报价从最初约定暴涨10万+。唐先生拒绝支付增项款项，双方对簿公堂。法官采用'背对背'调解方式，分别与双方沟通，最终促成调解——装修公司在合理范围内调整报价，唐先生支付相应款项，双方和解撤诉。此案提示设计变更须书面确认报价。",
        "legalBasis": "《民法典》第5条（自愿原则）、第469条（合同形式）",
        "professionalInsight": [
            "设计变更须同步书面确认报价调整",
            "口头承诺的报价变更难以举证",
            "调解是装修纠纷的高效解决方式",
            "签约时须明确设计修改的计价规则"
        ],
        "consumerQ": "全屋定制设计图改了几次，报价涨了10万，我能不认吗？",
        "oneLineAnswer": "设计变更导致的报价调整须双方书面确认，口头承诺缺乏法律效力。",
        "severity": "medium",
        "source": "今晚报",
        "sourceUrl": "https://jinwanbaoepaper.enorth.com.cn/jwb/resfile/2026-04-14/12/jwb2026041412.pdf",
        "sourceLevel": "A级",
        "court": "天津法院",
        "date": "2026-04",
        "collectedAt": "2026-08-02",
        "status": "candidate",
        "keywords": ["全屋定制", "设计变更", "报价暴涨", "装修合同"],
        "tags": {"clientType": ["agent"], "stage": "mid", "layer": "shu"}
    }
]

# 读取第一批
with open('/workspace/fengsheng-tasks/data/cases_weekly_real_20260802.json') as f:
    first_batch = json.load(f)

# 合并
first_batch['cases'].extend(new_cases)
first_batch['totalCandidates'] = len(first_batch['cases'])
first_batch['description'] = '风声案例采集流水线 — 第一批案例补强（20条，装修+物业+继承+买卖+租赁）'

# 写入
with open('/workspace/fengsheng-tasks/data/cases_weekly_real_20260802.json', 'w') as f:
    json.dump(first_batch, f, ensure_ascii=False, indent=2)

# 统计
directions = {}
domains = {}
for c in first_batch['cases']:
    d = c['direction']
    directions[d] = directions.get(d, 0) + 1
print(f'合并完成: 共 {len(first_batch["cases"])} 条案例')
print(f'方向分布: {directions}')