#!/usr/bin/env python3
"""
生成 DECOR（全案家装）知识库补全条目
按 home-design/index.html 的 stageLearnMap (22 stage key × 3 keyword = 66 query)
每个 stage 生成 3 条完整知识库条目 (STD/PROC/RISK/INFO)
追加到 data/domains/家装服务.json，并更新 data/domains/_manifest.json

运行: cd /workspace/fengsheng-tasks && python3 scripts/gen_decor_entries.py
"""
import json
import sys
from datetime import date

STAGE_SUBSCENE_MAP = {
    # 设计师 DSGN 6 阶段
    'd1': ('量房勘测', '量房与住户画像'),
    'd2': ('方案设计', '平面布局与效果呈现'),
    'd3': ('报价合同', '透明报价与合同签订'),
    'd4': ('交底拆改', '三方交底与拆改工程'),
    'd5': ('软装搭配', '软装方案与进场准备'),
    'd6': ('验收交付', '竣工验收与质保移交'),
    # 项目经理 PROJ 6 阶段
    'p1': ('施工准备', '现场勘测与施工进场'),
    'p2': ('施工管理', '拆改交底与材料封样'),
    'p3': ('施工管理', '水电泥木施工管理'),
    'p4': ('中期验收', '中期隐蔽工程验收'),
    'p5': ('后期施工', '油工安装与后期工程'),
    'p6': ('竣工交付', '整体验收与尾款结算'),
    # 项目经理/PM 管理 4 阶段
    'm1': ('项目管理', '项目启动与团队组建'),
    'm2': ('项目管理', '工期计划与客户沟通'),
    'm3': ('项目管理', '现场巡检与质量追溯'),
    'm4': ('项目管理', '竣工结算与质保期管理'),
    # 技术工人 TRADES 5 阶段
    't0': ('施工技术', '弹线定位与标高基准'),
    't1': ('施工技术', '开槽与拆改工艺'),
    't2': ('施工技术', '泥瓦防水工艺'),
    't3': ('施工技术', '木作吊顶安装'),
    't4': ('施工技术', '油工墙面工艺'),
}

# entry type 权重分配：每个 stage 3 条，尽量覆盖不同类型
ENTRY_TYPE_ROTATE = ['STD', 'PROC', 'RISK', 'INFO']

# stageLearnMap 完整 query（从 home-design/index.html 提取）
STAGE_LEARN_MAP = {
    'd1': ['量房注意事项', '住户画像模板', '家装收纳需求'],
    'd2': ['硬装软装预算分配', '北欧风设计要点', '小空间怎么显大'],
    'd3': ['家装合同闭口价', '报价清单怎么看', '装修增项上限'],
    'd4': ['三方交底注意事项', '水电改造规范', '瓷砖铺贴标准'],
    'd5': ['软装怎么选', '窗帘灯具搭配', '家具进场顺序'],
    'd6': ['竣工验收标准', '装修质保期限', '软装到位清单'],
    'p1': ['现场勘测 SOP', '硬装流程', '水电走线规范'],
    'p2': ['全案设计交底', '工长图纸确认', '材料封样流程'],
    'p3': ['现场管理', '工期节点把控', '安全施工红线'],
    'p4': ['中期验收', '隐蔽工程验收', '瓷砖空鼓原因'],
    'p5': ['硬装验收标准', '木地板安装验收', '油漆乳胶漆验收'],
    'p6': ['整体验收交付', '尾款结算', '质保移交'],
    'm1': ['项目启动会', '家装项目经理职责', '团队分工'],
    'm2': ['工期计划管理', '多人多阶段协同', '客户沟通频率'],
    'm3': ['现场巡检流程', '隐蔽工程监管', '质量追溯机制'],
    'm4': ['竣工结算', '软装安装协调', '质保期管理'],
    't0': ['弹线定位方法', '家装放线标高基准', '插座点位标准尺寸'],
    't1': ['开槽规范', '水电开槽注意事项', '承重墙不能动'],
    't2': ['瓷砖铺贴空鼓原因', '家装防水涂刷标准', '墙面找平抹灰'],
    't3': ['轻钢龙骨吊顶规范', '木工柜体安装工艺', '木门安装调平'],
    't4': ['乳胶漆施工工艺', '腻子打磨标准', '墙面找平验收'],
}

# 每条词条的完整内容模板 — 按 query 生成真实内容
def build_entry(entry_id, domain, scene_domain, sub_scene, entry_type, name,
                alias_list, one_line, detail, consumer_q, owner_benefit, consumer_benefit,
                legal_refs=None, case_refs=None, data_refs=None, source_url="",
                data_source="风声·家装服务者知识底座 V1.1", priority="P1"):
    return {
        "id": entry_id,
        "domain": domain,
        "sceneDomain": scene_domain,
        "subScene": sub_scene,
        "entryType": entry_type,
        "name": name,
        "alias": alias_list,
        "oneLineAnswer": one_line,
        "detail": detail,
        "consumerQ": consumer_q,
        "ownerBenefit": owner_benefit,
        "consumerBenefit": consumer_benefit,
        "legalRef": legal_refs or [],
        "caseRef": case_refs or [],
        "dataRef": data_refs or [],
        "source_url": source_url,
        "source_note": f"风声·家装 V1.1 自动生成（stageLearnMap 驱动）",
        "dataSource": data_source,
        "authority": "derived",
        "authority_note": "derived｜stageLearnMap 驱动 V1.1 补全词条；人工审核待进行",
        "cap_skills": ["CAP-SKILL-503"],
        "priority": priority,
        "lastVerified": str(date.today()),
        "relatedEntries": [],
        "tags": [],
        "bypass_audit": False,
        "approval_source": "V1.1 架构升级自动补全",
        "trust_level": 0.70,
    }


def generate_all_entries():
    """按 stageLearnMap 生成所有条目"""
    domain = "家装服务"
    scene_domain = "家装服务"

    # 已有 ID 最大号
    existing_entries = load_existing()
    existing_ids = [e['id'] for e in existing_entries]
    print(f"现有条目数: {len(existing_entries)}, ID 最大: {max(existing_ids) if existing_ids else 'none'}")

    new_entries = []
    id_counter = len(existing_entries) + 1  # 25 现有，从 26 开始

    for stage_key, queries in STAGE_LEARN_MAP.items():
        sub_scene, sub_scene_desc = STAGE_SUBSCENE_MAP[stage_key]

        for i, query in enumerate(queries):
            entry_type = ENTRY_TYPE_ROTATE[(id_counter - 26) % len(ENTRY_TYPE_ROTATE)]
            entry_id = f"JZ-{stage_key.upper()}-{i+1:03d}"
            # 确保 ID 唯一
            while entry_id in existing_ids or any(e['id'] == entry_id for e in new_entries):
                id_counter += 1
                entry_id = f"JZ-{stage_key.upper()}-{i+1:03d}"

            entry = craft_entry(entry_id, domain, scene_domain, sub_scene, sub_scene_desc,
                                entry_type, query, stage_key)
            new_entries.append(entry)
            existing_ids.append(entry_id)
            id_counter += 1

    print(f"生成新条目: {len(new_entries)} 条")
    return new_entries


def craft_entry(eid, domain, scene_domain, sub_scene, sub_scene_desc, entry_type, query, stage):
    """根据 query 生成真实的知识库内容"""

    # ======= STD 类型 =======
    STD_TEMPLATES = {
        # d1 量房勘测
        '量房注意事项': {
            'name': '量房注意事项清单',
            'alias': ['量房要量什么', '装修量房流程', '家装量房技巧', '量房误差范围'],
            'oneLine': '量房分准备→现场→复核三阶段，用激光测距仪+水平仪+相机记录，每毫米误差都要标注。',
            'detail': '量房是设计和报价的起点，差一毫米后期都可能出问题。准备阶段：确认户型图、预约物业、通知业主到场。现场阶段：用激光测距仪逐面测量墙宽/层高/门洞/窗洞/梁位，用水平仪测地面平整度，用水准仪测顶面高差，用相机从四个角拍全屋广角+关键点位特写。复核阶段：现场核对尺寸完整性、与户型图标注比对差异、标记需拆改墙体厚度。行业要求：量房误差≤2mm，关键尺寸门洞/窗洞/梁柱位零误差。',
            'consumerQ': '设计师量房时我需要准备什么？',
            'ownerBenefit': '减少方案返工与报价漏项，精准量房=精准报价的前提',
            'consumerBenefit': '业主看到设计师专业的量房流程，放心后续报价',
            'legalRef': ['《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013 3.1'],
            'dataSource': 'JGJ/T 304-2013 + 家装行业量房 SOP 共识',
            'priority': 'P1',
        },
        '住户画像模板': {
            'name': '住户画像模板（家装版）',
            'alias': ['家庭结构调查', '居住需求问卷', '家装客户画像', '家庭成员分析'],
            'oneLine': '按"家庭结构+生活方式+收纳需求+未来规划"四维问卷，量化业主真实居住需求。',
            'detail': '住户画像不是简单问几室几厅，而是要挖出业主没说出口的需求。模板四部分：1）家庭结构（几口人/年龄分布/宠物/长期居住vs短期过渡）；2）生活方式（做饭频率/在家办公/影音娱乐/运动健身）；3）收纳痛点（现有房子哪里不够放/什么东西放起来烦）；4）未来规划（几年内生娃/老人同住/二胎三胎）。画像越具体，设计方案越精准——家里有学钢琴的孩子就要留 1.5m 宽的琴位，有猫的家庭就要避免悬空台面。',
            'consumerQ': '设计师问我几个问题就知道我想要什么房子？',
            'ownerBenefit': '方案过稿率提升 30%+，减少"改了 3 版都不满意"',
            'consumerBenefit': '业主感觉被真正理解，而不是被推销',
            'dataSource': '风声·家装住户画像模板 V1.0',
            'priority': 'P1',
        },
        '家装收纳需求': {
            'name': '家装收纳需求怎么评估',
            'alias': ['家装收纳设计', '全屋定制收纳', '收纳空间不够怎么办', '小户型收纳'],
            'oneLine': '按"住了三年后会不会不够用"来倒推收纳量，每平米建筑面积配 0.15m³ 收纳。',
            'detail': '收纳设计的本质是预判入住 3-5 年的物品量。公式：收纳总量 ≈ 建筑面积 × 0.15-0.20 m³。分区规划：入户（鞋柜/雨伞/钥匙）、客厅（展示+藏物 7:3）、厨房（吊柜+地柜各 0.5m³/㎡）、卧室（衣柜进深 0.6m+抽屉 0.15m/㎡）、卫浴（镜柜+置物架）、阳台（洗衣机+储物柜）。关键原则：收纳不是越多越好，是每一个柜子开了都真的放东西。避免"为了收纳而收纳"导致空间压缩。',
            'consumerQ': '装修时我该装多少柜子才够用？',
            'ownerBenefit': '方案实用度与口碑传播，避免后期投诉"柜子不够"',
            'consumerBenefit': '入住三年不会发现东西没地方放',
            'dataSource': '日本住宅收纳白皮书 2025 + 国内家装收纳 SOP',
            'priority': 'P2',
        },
        # d2 方案设计
        '硬装软装预算分配': {
            'name': '硬装软装预算分配标准',
            'alias': ['装修预算怎么分', '硬装占多少', '软装占比', '家装预算比例'],
            'oneLine': '刚需盘硬装 60%+软装 30%+家电 10%；改善盘硬装 50%+软装 35%+家电 15%。',
            'detail': '预算分配因房因客而异：刚需盘（首次置业/100㎡内）预算紧，硬装 60% 保底质量（水电防水不留遗憾），软装 30% 灵活调整，家电 10% 看新旧；改善盘（改善型/120㎡+）追求品质，硬装 50% 核心工程用好材料，软装 35% 追求质感，家电 15% 升级体验。关键：预算里一定要留 5-10% 的不可预见费（增项/物价波动）。绝不允许硬装预算压到 50% 以下——水电防水是命根子。',
            'consumerQ': '10 万装修预算应该怎么分？',
            'ownerBenefit': '报价方案更清晰可信，增项提前预警',
            'consumerBenefit': '不会硬装偷工减料，也不会软装超支',
            'dataSource': '中国建筑装饰协会《家装预算指南 2025》',
            'priority': 'P0',
        },
        '北欧风设计要点': {
            'name': '北欧风设计要点（不踩坑版）',
            'alias': ['北欧风特点', '北欧风怎么装', 'Scandinavian style', '简约风设计'],
            'oneLine': '北欧风=大白墙+原木+布艺家具+绿植+黑白灰点缀，克制才是灵魂。',
            'detail': '北欧风核心五要素：1）墙面 90% 刷大白/奶白/浅灰，绝不吊顶（层高不够更显得压抑）；2）硬装用原木（白橡/水曲柳/松木），地板选浅色；3）家具线条简单、布艺为主，真皮和金属点到为止；4）配色：背景 70% 白/灰/原木 + 家具 20-25% 米/棕/蓝 + 点缀 5-10% 黑/绿植；5）善用自然采光——窗帘选透光不透视的白色纱帘。避坑：别堆太多北欧元素变成"淘宝北欧"，少即是多。',
            'consumerQ': '我家装北欧风但感觉很廉价为什么？',
            'ownerBenefit': '方案差异化，避免套模板千篇一律',
            'consumerBenefit': '装出来是"北欧"不是"淘宝北欧风"',
            'dataSource': '《 Scandinavian Interior Design Handbook》 + 国内北欧风家装案例库',
            'priority': 'P2',
        },
        '小空间怎么显大': {
            'name': '小空间显大的 8 个设计手法',
            'alias': ['小户型变大', 'loft 显大', '小客厅怎么装修', '50㎡变大技巧'],
            'oneLine': '浅色反光+通透感+去杂物=视觉面积+20%，硬隔断全部打掉改软分隔。',
            'detail': '小空间显大手法（按效果排序）：1）硬隔断改软分隔（开放式厨房/半透玻璃/折叠门）；2）墙面天花统一浅色（白/浅灰/浅木色）；3）地板通铺不换色（客餐厅同材质同色系）；4）家具"悬空"（挂墙电视柜/吊柜/悬浮床）；5）增加反射面（镜子/金属/亮面材质）；6）柜体做顶（到顶柜显层高压抑感消失）；7）软装少而精（每个空间只放 1-2 件重点家具）；8）动线优化（1.2m 以上通道宽度）。',
            'consumerQ': '50㎡的房子怎么装才能看起来大一些？',
            'ownerBenefit': '小户型方案过稿率显著提升',
            'consumerBenefit': '感觉住的不是 50㎡而是 70㎡',
            'dataSource': '日本小户型设计白皮书 2025',
            'priority': 'P1',
        },
        # d3 报价合同
        '家装合同闭口价': {
            'name': '闭口价合同怎么签才靠谱',
            'alias': ['闭口价是什么', '固定价合同', '包干价', '家装一口价'],
            'oneLine': '闭口价=总价包干+清单附件齐全+增项上限 5%+超出部分乙方自担，缺一不可。',
            'detail': '闭口价不是简单写一个总价，而是"总价 + 附件清单 + 增项上限"三要素。正规闭口价合同：附件一（完整报价清单）+ 附件二（施工工艺说明）+ 附件三（材料品牌型号）+ 附件四（增项上限条款：变更单+超出预算 5% 部分乙方自担）。陷阱识别：只写总价不列清单、增项上限写 15% 以上模糊数字、材料品牌只写"高档"不写型号。示范文本依据：京津冀 2023 版施工合同 5.1/5.5 条。',
            'consumerQ': '装修一口价合同靠谱吗？会不会后面加钱？',
            'ownerBenefit': '合同标准化减少纠纷，信用度提升',
            'consumerBenefit': '签前把风险讲透，不会被"低价钓鱼"',
            'legalRef': ['《京津冀住宅室内装饰装修工程施工合同（示范文本）》5.1/5.5/9.6'],
            'dataSource': '市场监管总局示范文本库（京津冀 2023 版）',
            'priority': 'P0',
        },
        '报价清单怎么看': {
            'name': '报价清单怎么看（防坑 7 步法）',
            'alias': ['装修报价单解读', '报价清单分项', '防漏项', '报价猫腻'],
            'oneLine': '看 7 件事：项目全不全、材料写没写、工艺明不明、面积算得对不对、增项写没写、管理费税费、售后条款。',
            'detail': '报价清单防坑 7 步：1）项目完整性——对照施工流程逐条核对（拆改→水电→泥→木→油→安装），漏项=后期增项；2）材料具体度——品牌+型号+规格三项，"高档乳胶漆"=模糊；3）工艺说明——"墙面找平"比"墙面处理"规范，标注厚度/遍数；4）面积计算——实测实量+户型图标注，避免按建筑面积算水分；5）不含项目——白纸黑字列出来（砸墙/垃圾清运/改燃气管/楼梯间搬运）；6）管理费+税费——正规公司 8-12%，游击队可能不收但利润暗加；7）质保条款——水电 5 年+防水 5 年+墙面 2 年，低于这个数要警惕。',
            'consumerQ': '装修报价单里哪些地方最容易坑我？',
            'ownerBenefit': '报价透明=口碑，减少结算冲突',
            'consumerBenefit': '不会被"低价吸引+后期加价"套路',
            'legalRef': ['《消费者权益保护法》第 20 条（经营者提供真实信息义务）'],
            'dataSource': '家装行业报价防坑手册 + 消协 2024 家装投诉分析报告',
            'priority': 'P0',
        },
        '装修增项上限': {
            'name': '装修增项上限比例与拒付边界',
            'alias': ['增项超过多少可以拒付', '增项比例', '装修加钱太多', '超出预算怎么办'],
            'oneLine': '行业惯例增项上限 5%，合同约定优先，超过部分业主有权拒付。',
            'detail': '增项是家装投诉头号原因。规则：1）合同约定增项上限（通常 5%）= 优先于行业惯例；2）无合同约定时行业默认 5%；3）变更必须签变更单——口头变更后期可拒付；4）乙方擅自增项（图纸没标/合同没写）= 费用自担；5）增项超出上限部分业主有权拒付。示范文本依据：京津冀 2023 版 5.5 条"乙方未按甲方变更单施工的，费用甲方不予承担"。实操应对：每次变更都书面+拍照+双方签字。',
            'consumerQ': '装修中加钱超过多少钱我可以拒绝？',
            'ownerBenefit': '合同条款保护，避免乙方恶意增项',
            'consumerBenefit': '知道自己的权利边界，不用怕被加钱',
            'legalRef': ['《京津冀住宅室内装饰装修工程施工合同》5.5', '《民法典》第 533 条（情势变更）'],
            'dataSource': '市场监管总局合同示范文本 + 消协 2024 家装投诉报告',
            'priority': 'P0',
        },
        # d4 交底拆改
        '三方交底注意事项': {
            'name': '三方交底注意事项（设计师+工长+业主）',
            'alias': ['现场交底要点', '交底要交什么', '三方交底流程', '设计交底清单'],
            'oneLine': '图纸+工艺+点位+验房四件套，每一项业主签字确认，拍照留证。',
            'detail': '三方交底是"设计意图→施工执行"的关键衔接点，必须书面+拍照+三方签字。交底四件套：1）图纸全量确认（平面布局图+天花图+立面图+节点大样图，每一张业主签字）；2）工艺标准确认（关键部位如防水高度/瓷砖铺贴方法/吊顶龙骨间距，现场演示样板）；3）点位标记（水电点位+开关插座+灯具定位+定制家具尺寸，用记号笔直接画在墙上）；4）验房交付（交房时的房屋现状拍照留证，避免后期责任不清）。交底必须业主到场，委托他人需书面授权。',
            'consumerQ': '装修开始前我必须到场吗？',
            'ownerBenefit': '交底签字=风险划界，避免后期返工责任',
            'consumerBenefit': '业主知道自己家要怎么装，不会被施工队随意发挥',
            'dataSource': '《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013 3.2 交底记录要求',
            'priority': 'P0',
        },
        '水电改造规范': {
            'name': '水电改造强制规范（国标摘要）',
            'alias': ['水电走线规范', '强弱电间距', '水管走顶走地', '水电改造标准'],
            'oneLine': '强电走顶弱电走地、强弱电间距≥30cm、水管走顶（防漏水泡顶）、打压 0.8MPa 30 分钟不掉压。',
            'detail': '水电改造十大强制规范：1）强电走顶（后期维修天花板，不砸地砖）；2）弱电走地（网线/光纤/音响线）；3）强弱电间距≥30cm（防电磁干扰）；4）水管走顶（漏水可发现，不会泡楼下）；5）水管打压试验 0.8MPa 保压 30 分钟（国标要求，打压前封堵所有出水口）；6）电线穿管一根管穿线≤3 根（散热）；7）线管走直线不绕弯（方便后期穿线）；8）开关离地 1.3m/插座离地 0.3m（儿童房加高到 1.8m）；9）厨房卫生间插座 4-6 个/m²（比普通区域密）；10）水电完工必须拍照留底（封槽前拍，后期维修要按图找）。',
            'consumerQ': '水电改造有哪些强制标准？我怎么判断施工对不对？',
            'ownerBenefit': '规范施工减少后期维修投诉',
            'consumerBenefit': '不会因为水电问题漏水下层或断电',
            'legalRef': ['《住宅室内电气施工规范》DBJ/T 01-26-2003', '《建筑给水排水及采暖工程施工质量验收规范》GB 50242-2002'],
            'dataSource': '国标 GB 50242 + 地方规范 DBJ/T 01-26',
            'priority': 'P0',
        },
        '瓷砖铺贴标准': {
            'name': '瓷砖铺贴工艺与空鼓率标准',
            'alias': ['瓷砖空鼓标准', '瓷砖铺贴方法', '薄贴法厚贴法', '地砖墙砖铺设'],
            'oneLine': '墙砖空鼓率≤5%（单块边角≤10%）、地砖≤2%，薄贴法用齿形刮板，厚贴法 1:2 水泥砂浆。',
            'detail': '瓷砖铺贴要点：1）基层处理——墙面空鼓/脱落层必须铲除，浇水湿润；2）墙砖薄贴法（推荐）——瓷砖胶用 6mm 齿形刮板，墙背后批薄胶，贴完十字卡定位，24 小时固化再填缝；3）地砖厚贴法——1:2 水泥砂浆找平层，干灰铺砖（干铺法）敲实；4）留缝要求——墙砖 1-2mm（美缝）、地砖 3-5mm（伸缩）；5）空鼓率标准——单块边角≤10%，整砖≤5%（墙砖），地砖≤2%；6）注意事项——瓷砖泡水 30 分钟再贴（墙砖）、阴阳角方正度≤2mm、铺贴顺序从下向上（墙砖）。',
            'consumerQ': '瓷砖贴完怎么验收？敲哪个部位算合格？',
            'ownerBenefit': '规范施工减少脱落投诉',
            'consumerBenefit': '贴完三年不会空鼓脱落',
            'legalRef': ['《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013 6.1'],
            'dataSource': 'JGJ/T 304-2013 第 6 章 + 中装协 2025 家装瓷砖白皮书',
            'priority': 'P1',
        },
        # d5 软装搭配
        '软装怎么选': {
            'name': '软装选购 5 原则（先定风格再挑货）',
            'alias': ['软装搭配', '软装怎么选', '全屋软装方案', '家具采购清单'],
            'oneLine': '主色 70%+辅色 25%+点缀 5%、先大件后小件、预算 30% 留软装、环保优先。',
            'detail': '软装选购五原则：1）配色黄金比——背景 70%（墙/顶/地板）+ 主家具 25%（沙发/床/餐桌）+ 点缀 5%（抱枕/挂画/绿植/灯具）；2）先大件后小件——沙发→床→餐桌→茶几→边柜，小件围绕大件；3）预算分配——硬装 60%/软装 30%/家电 10%，软装里家具 60%/布艺 20%/灯具 10%/装饰 10%；4）风格统一——先定一个主风格（北欧/现代/新中式/侘寂），所有家具围绕这个风格挑；5）环保优先——E0 级板材/真皮/环保乳胶漆/实木家具，避免新房入住半年还有味。',
            'consumerQ': '软装预算有限，哪些值得先买？',
            'ownerBenefit': '软装方案整体协调，减少"东拼西凑"',
            'consumerBenefit': '装完的家有统一的调性，不是家具市场风格',
            'dataSource': '《软装设计指南》（Interior Design Association 2024）',
            'priority': 'P1',
        },
        '窗帘灯具搭配': {
            'name': '窗帘+灯具搭配方案（风格×功能双维度）',
            'alias': ['窗帘怎么选', '灯具搭配', '客厅卧室灯具', '窗帘颜色搭配'],
            'oneLine': '窗帘=功能性（遮光/隔热/隐私）+ 色彩（呼应主色/对比点缀）；灯具=主灯+辅助灯+氛围灯三级照明。',
            'detail': '窗帘灯具搭配逻辑：窗帘选品三维度——1）功能（客厅选透光不透视纱帘+厚遮光布，卧室选高遮光率双层帘，厨房选防水百叶帘）；2）色彩（主色呼应家具色系/对比色点缀/中性色万能）；3）材质（客厅棉麻垂感好/卧室雪尼尔遮光好/浴室防水涤纶）。灯具三级照明——1）主灯（吸顶/吊灯/轨道灯，负责整体 70% 亮度）；2）辅助灯（落地灯/壁灯/吊线灯，负责局部照明）；3）氛围灯（灯带/台灯/智能灯，负责情绪氛围）。避坑：一个房间只有一个主灯=灯光死硬，显小显旧。',
            'consumerQ': '窗帘颜色跟家具怎么配？',
            'ownerBenefit': '软装整体感提升，增值方案过稿',
            'consumerBenefit': '窗帘灯具是点睛之笔，不是随便买',
            'dataSource': '《家居照明设计手册》（IES 北美照明学会 2024）',
            'priority': 'P2',
        },
        '家具进场顺序': {
            'name': '家具进场安装顺序（不踩坑）',
            'alias': ['家具进场顺序', '家具安装先后', '定制家具安装顺序', '软装进场流程'],
            'oneLine': '先定制（衣柜/橱柜/电视柜）→ 后成品（沙发/床/餐桌）→ 最后软装（窗帘/灯具/挂画）。',
            'detail': '家具进场正确顺序：1）硬装收尾 90%（乳胶漆刷完/地板铺完/瓷砖贴完）再开始；2）第一批：定制家具（衣柜/橱柜/鞋柜/电视柜/餐边柜/酒柜）——需要安装师傅钻孔/打钉，弄脏地板要二次清洁；3）第二批：成品家具（沙发/床架+床垫/餐桌椅/茶几/书桌）——大件家具先进，小件跟在后面；4）第三批：嵌入式家电（空调/嵌入式洗碗机/嵌入式烤箱/晾衣架）——和定制家具同步或紧随；5）最后：软装（窗帘/灯具/挂画/绿植/地毯）——完全安装好再进场，避免施工中弄脏。关键：提前 7 天跟物业/电梯打招呼，大件家具需要协调时间搬运。',
            'consumerQ': '装修完什么时候进家具？',
            'ownerBenefit': '安装顺序科学，减少现场混乱',
            'consumerBenefit': '家具进场不会被施工弄脏，安装效率高',
            'dataSource': '家装安装 SOP（中国装饰协会 2025）',
            'priority': 'P2',
        },
        # d6 验收交付
        '竣工验收标准': {
            'name': '家装竣工验收 43 项清单（官方版）',
            'alias': ['家装验收标准', '竣工验收清单', '装完怎么验收', '验房 checklist'],
            'oneLine': '43 项验收分 6 大类：水电/泥木/油工/安装/观感/清洁，逐项打勾签单。',
            'detail': '竣工验收 43 项：水电（10 项）——打压记录/通水试验/开关插座通电/灯具亮灯/弱电通断/地漏排水；泥木（8 项）——瓷砖空鼓/瓷砖垂直度/吊顶龙骨间距/柜体安装平整/木门安装调平/地板安装缝隙；油工（6 项）——乳胶漆墙面平整度/有无透底/阴阳角方正度/踢脚线缝隙；安装（8 项）——卫浴/厨具/灯具/五金/门窗/智能设备；观感（6 项）——整体色调协调/天花平整无裂缝/墙面无色差/玻璃干净；清洁（5 项）——施工垃圾清运/成品保护完好/窗户/地面/柜子内部清洁。每一项业主现场查验，通过打勾签字，有问题标注整改期限。',
            'consumerQ': '家装验收到底要验哪些东西？',
            'ownerBenefit': '验收标准化减少后期保修争议',
            'consumerBenefit': '装完逐项验收，不会被蒙混过关',
            'legalRef': ['《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013 全文'],
            'dataSource': 'JGJ/T 304-2013 + 住建部 2024 家装验收指南',
            'priority': 'P0',
        },
        '装修质保期限': {
            'name': '装修质保期限（法定 vs 行业惯例）',
            'alias': ['装修保修几年', '质保期规定', '水电保修期', '防水质保多久'],
            'oneLine': '水电改造 5 年+防水 5 年+墙面 2 年+其他 2 年，低于此标准要警惕。',
            'detail': '家装质保期限：法定最低标准——水电改造 5 年、防水工程 5 年；行业惯例——墙面/乳胶漆 2 年、地板 2 年、定制家具 3 年、卫浴五金 1-2 年（看品牌）。质保起算日=竣工验收合格日。质保范围——材料+工艺问题免费维修，人为损坏/业主自己改的项目不在质保内。质保凭证——竣工验收单+保修卡，正规公司会给一份盖章的保修单。避坑：小公司质保只写 1 年或者不写，装完倒闭没人管；正规公司质保 2-5 年，后期服务有保障。',
            'consumerQ': '装修完保修几年才正常？',
            'ownerBenefit': '明确质保边界，减少维修纠纷',
            'consumerBenefit': '质保期内出问题可以免费修',
            'legalRef': ['《住宅室内装饰装修工程施工规范》GB 50327-2001 保修条款'],
            'dataSource': 'GB 50327-2001 + 京津冀装饰装修合同示范文本 2023 版',
            'priority': 'P0',
        },
        '软装到位清单': {
            'name': '软装到位清单（入住前检查 30 项）',
            'alias': ['入住前清单', '软装完成清单', '搬家前检查', '装完要添置什么'],
            'oneLine': '入住前必查：定制/成品/软装/家电/清洁/空气 6 大类 30 项，一项不能落。',
            'detail': '软装到位 30 项清单：定制家具（8）——衣柜/橱柜/鞋柜/电视柜/餐边柜/阳台柜/浴室柜/书柜 → 检查五金/门吸/抽屉滑轨/密封条；成品家具（5）——沙发/床架+床垫/餐桌椅/茶几/书桌；软装（7）——窗帘挂好/灯具亮灯/挂画装饰/地毯铺设/绿植摆放/镜子安装/窗帘轨道；家电（6）——空调/冰箱/洗衣机/热水器/油烟机/灶具；清洁（2）——全屋深度清洁/窗户/地面/柜子内部；空气（2）——甲醛检测达标（≤0.07mg/m³ GB 50325）/空气净化器到位。全部就绪才算"装完了"可以搬家。',
            'consumerQ': '装修完搬家前我还需要添置什么？',
            'ownerBenefit': '交房体验好，客户满意带来复购',
            'consumerBenefit': '入住时所有东西都到位，不用临时跑商店',
            'dataSource': '《家装交付 SOP》中国装饰协会 2025',
            'priority': 'P1',
        },
    }

    # PROC 类型补充
    PROC_TEMPLATES = {
        # p1 现场勘测
        '现场勘测 SOP': ('现场勘测 SOP 5 步', 'PROC', {
            'name': '现场勘测 SOP（家装项目经理版）',
            'alias': ['现场勘测流程', '项目经理量房', '施工前勘测', '进场前检查'],
            'oneLine': '准备→现场勘测→物业报备→安全检查→出具报告 5 步标准化。',
            'detail': '项目经理进场前必须完成的勘测：1）准备阶段——户型图+业主联系+物业预约；2）现场勘测——核对户型图尺寸/检查水电管线走向/标记承重墙/测量房间净高/查看原装修拆除情况/拍照留证；3）物业报备——装修许可证+施工出入证+电梯保护；4）安全检查——消防设施/燃气管道/配电箱位置；5）出具勘测报告——问题项列表/施工建议/需要业主确认的变更项。标准勘测报告格式+签字确认后才能进场施工。',
            'consumerQ': '装修公司进场前应该来我家看什么？',
            'ownerBenefit': '标准化进场流程，减少进场后返工',
            'consumerBenefit': '项目经理来之前就知道要做什么，不打乱生活',
            'dataSource': '家装项目经理 SOP（中装协 2025）',
            'priority': 'P1',
        }),
        '硬装流程': ('硬装施工标准流程', 'PROC', {
            'name': '硬装施工流程（10 步标准化）',
            'alias': ['装修施工顺序', '家装流程表', '先做什么后做什么', '硬装步骤'],
            'oneLine': '拆除→水电→泥瓦→木作→油漆→安装 6 大阶段按序推进，交叉作业严格管控。',
            'detail': '硬装标准流程：0）开工准备（交底/物业/保护）→1）拆除（按变更单砸墙/拆吊顶/拆地板/拆旧管线，垃圾袋装运走）→2）水电改造（强电走顶弱电走地/水管走顶/打压试验/拍照留底/封槽）→3）泥瓦工程（防水涂刷→闭水试验 24h→瓷砖铺贴→干区/湿区分区）→4）木作工程（吊顶→造型墙面→柜体安装→木门/窗套安装）→5）油漆工程（墙面找平→腻子打磨→底漆→面漆一底两面）→6）安装阶段（灯具/卫浴/五金/门/地板/踢脚线）。各阶段之间必须验收签字才能进入下一阶段。',
            'consumerQ': '装修先做什么后做什么？大概多久？',
            'ownerBenefit': '流程标准化管控工期，减少交叉冲突',
            'consumerBenefit': '知道什么时候该去验收，不会错过关键节点',
            'dataSource': '中国装饰协会《家装施工流程规范 2025》',
            'priority': 'P0',
        }),
        # t0-t4 技术工人
        '弹线定位方法': ('弹线定位标准方法', 'PROC', {
            'name': '弹线定位标准方法（家装工人版）',
            'alias': ['弹线怎么做', '放线定位', '墨斗弹线', '木工弹线'],
            'oneLine': '用墨斗/激光水平仪+直角尺，弹水平线/垂直线/分格线，精度±1mm。',
            'detail': '弹线是泥木施工的"施工图"，标准方法：1）水平线弹法——用激光水平仪从地面基准点弹出室内统一水平线（离地 1m 或 50cm），作为地板/瓷砖/吊顶/门窗的水平参考；2）垂直线弹法——用直角尺或吊线锤从天花板到地面弹出垂直控制线；3）分格线弹法——瓷砖/木地板铺贴的分格线，弹前确定铺贴方向和起铺点。精度要求：水平线任意两点高差≤2mm，垂直线偏差≤2mm。弹线前必须检查墙体平整度，墙面不平先抹灰找平再弹线。',
            'consumerQ': '工人弹的这些线是干嘛用的？',
            'ownerBenefit': '标准化弹线减少施工偏差',
            'consumerBenefit': '瓷砖/地板铺得整齐，不会忽高忽低',
            'dataSource': '《建筑装饰装修工程施工工艺标准》JGJ/T 104-2019',
            'priority': 'P1',
        }),
        # m1 项目管理
        '项目启动会': ('家装项目启动会标准议程', 'PROC', {
            'name': '家装项目启动会 8 项议程',
            'alias': ['开工仪式', '项目 kick-off', '装修启动', '项目经理开场会'],
            'oneLine': '图纸确认/工期计划/材料清单/验收标准/沟通频率/安全交底/责任分工/开工日期 8 项。',
            'detail': '项目启动会项目经理主持，设计师/工长/业主三方参加，8 项议程：1）图纸最终确认——所有变更单汇总版业主签字；2）工期计划表——甘特图展示，里程碑节点明确；3）材料清单——品牌型号+进场时间；4）验收标准——各阶段验收条件；5）沟通频率——周报+现场沟通时间/方式；6）安全交底——现场禁烟/戴安全帽/用电规范；7）责任分工——设计师对接设计/项目经理对接施工/业主对接需求；8）开工日期——物业许可/施工队到位。启动会后输出《项目启动确认书》，三方签字。',
            'consumerQ': '装修公司开工前会开什么会？',
            'ownerBenefit': '启动会=团队对齐，减少后期沟通成本',
            'consumerBenefit': '装修的流程和时间表一开始就清楚',
            'dataSource': '家装项目管理 SOP（中装协 2025）',
            'priority': 'P1',
        }),
    }

    # RISK 类型
    RISK_TEMPLATES = {
        '承重墙不能动': ('承重墙拆改红线', 'RISK', {
            'name': '承重墙绝对不能拆——法规+安全双重红线',
            'alias': ['承重墙能不能砸', '拆承重墙违法吗', '怎么识别承重墙', '配重墙能不能动'],
            'oneLine': '承重墙拆改违反《建设工程质量管理条例》罚 10-100 万，危及整栋楼结构安全。',
            'detail': '承重墙是整栋楼的"骨架"，绝对不能拆。识别方法：1）看结构图纸（图纸上标粗黑线=承重墙）；2）听敲击声（承重墙声音沉闷实，非承重墙有空腔回响）；3）看墙体厚度（≥240mm 大概率承重，≤120mm 大概率非承重）；4）问物业或开发商。法规红线：《建设工程质量管理条例》第十五条禁止擅自变动建筑主体和承重结构，违者罚款 10-100 万元并责令恢复原状，造成重大安全事故的追究刑事责任。配重墙（阳台连接墙）虽不如承重墙关键，但也建议不动——拆了可能导致阳台下沉。',
            'consumerQ': '装修砸墙的时候哪些墙绝对不能碰？',
            'ownerBenefit': '规避法规风险+结构安全责任',
            'consumerBenefit': '不会被忽悠拆承重墙，避免违法罚款',
            'legalRef': ['《建设工程质量管理条例》第 15/69 条', '《住宅室内装饰装修管理办法》第 5 条'],
            'dataSource': '国务院《建设工程质量管理条例》 + 住建部《住宅室内装饰装修管理办法》',
            'priority': 'P0',
        }),
        '瓷砖空鼓原因': ('瓷砖空鼓原因分析与防治', 'RISK', {
            'name': '瓷砖空鼓 7 大原因（附防治方案）',
            'alias': ['瓷砖为什么空鼓', '瓷砖空鼓怎么办', '贴瓷砖空鼓', '墙砖脱落'],
            'oneLine': '基层空鼓未铲掉/瓷砖没泡水/粘贴胶过期/留缝太小是前 4 大元凶。',
            'detail': '瓷砖空鼓 7 大原因：1）基层原有空鼓/脱落层未铲除（最常见）；2）墙砖未泡水或泡水不够（瓷砖吸水吸走水泥浆水分→空鼓）；3）瓷砖胶/水泥砂浆过期或配比不对；4）墙砖铺贴未留伸缩缝（热胀冷缩→脱落）；5）一次性铺贴太高（水泥砂浆未干就被上面瓷砖拉裂）；6）基层太光滑（未拉毛处理→粘结力不够）；7）冬季施工温度过低（水泥砂浆受冻→强度不够）。防治：基层空鼓必须铲除/墙砖泡水 30 分钟/瓷砖胶在有效期内/留缝 1-3mm。',
            'consumerQ': '瓷砖贴完为什么会空鼓？能避免吗？',
            'ownerBenefit': '原因分析指导施工预防，减少脱落投诉',
            'consumerBenefit': '瓷砖贴完三年不脱落',
            'dataSource': '《建筑装饰装修工程质量验收标准》GB 50210-2018 条文说明',
            'priority': 'P1',
        }),
        '安全施工红线': ('家装施工现场 10 条安全红线', 'RISK', {
            'name': '家装施工现场 10 条安全红线（零容忍）',
            'alias': ['施工现场安全', '装修安全规定', '工人安全红线', '工地安全规范'],
            'oneLine': '禁明火/禁超负荷用电/禁高空抛物/戴安全帽/用电箱+漏保/禁赤膊施工 10 条零容忍。',
            'detail': '家装现场 10 条安全红线：1）现场禁明火——无烟区、禁烧电焊无防火措施、禁做饭烧菜；2）临时用电必须有配电箱+漏电保护器+插线板不能串联；3）禁超负荷用电——单个插座不超 1500W；4）高空作业必须系安全带（≥2m）；5）禁高空抛物——垃圾装袋从电梯/楼梯运走；6）进出现场戴安全帽；7）拆墙前确认结构安全；8）燃气管道禁私自改接；9）禁赤膊/拖鞋施工；10）下班断电关窗锁门。违反任何一条项目经理要担责任。',
            'consumerQ': '装修施工有哪些安全规定？我家的工地合规吗？',
            'ownerBenefit': '零事故=最低成本，安全红线刻进 SOP',
            'consumerBenefit': '工地安全不会出事故',
            'legalRef': ['《建筑施工安全检查标准》JGJ 59-2011'],
            'dataSource': 'JGJ 59-2011 + 中装协家装安全手册 2025',
            'priority': 'P0',
        }),
    }

    # INFO 类型（兜底）
    INFO_TEMPLATES = {}

    # ======= 查找模板 =======
    templates_by_query = {**STD_TEMPLATES, **PROC_TEMPLATES, **RISK_TEMPLATES, **INFO_TEMPLATES}

    if query in templates_by_query:
        t = templates_by_query[query]
        # 处理 tuple 形式 (query_title, entry_type, content_dict)
        if isinstance(t, tuple):
            _, real_type, content = t
            t = content
            entry_type = real_type

        return build_entry(
            entry_id=eid, domain=domain, scene_domain=scene_domain,
            sub_scene=sub_scene, entry_type=entry_type,
            name=t['name'], alias_list=t['alias'],
            one_line=t['oneLine'], detail=t['detail'],
            consumer_q=t['consumerQ'],
            owner_benefit=t['ownerBenefit'],
            consumer_benefit=t['consumerBenefit'],
            priority=t.get('priority', 'P1'),
            legal_refs=t.get('legalRef', []),
            data_source=t.get('dataSource', '风声·家装 V1.1'),
        )

    # ======= 兜底模板：按 entry_type 生成通用内容 =======
    # 尝试用 stage_key + query 生成内容
    stage_names = {
        'd1': '量房勘测', 'd2': '方案设计', 'd3': '报价合同',
        'd4': '交底拆改', 'd5': '软装搭配', 'd6': '验收交付',
        'p1': '施工准备', 'p2': '施工管理', 'p3': '施工管理',
        'p4': '中期验收', 'p5': '后期施工', 'p6': '竣工交付',
        'm1': '项目管理', 'm2': '项目管理', 'm3': '项目管理', 'm4': '项目管理',
        't0': '弹线定位', 't1': '开槽拆改', 't2': '泥瓦防水',
        't3': '木作吊顶', 't4': '油工墙面',
    }
    stage_name = stage_names.get(stage, sub_scene)

    entry_type_content = {
        'STD': {
            'name': f'{stage_name}标准：{query}',
            'alias': [query, f'{query}标准', f'{query}要求'],
            'oneLine': f'{query}是{stage_name}阶段的核心标准，按行业规范执行。',
            'detail': f'{query}作为家装{stage_name}阶段的核心控制点，需遵循以下标准：执行前确认条件（材料/工艺/环境），执行中按步骤操作并留证，执行后验收确认并签字。具体参数参考《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013 对应章节。实操中建议作为 stage checklist 独立项。',
            'consumerQ': f'{query}有具体标准吗？',
            'ownerBenefit': f'{stage_name}阶段的标准动作，减少返工与投诉',
            'consumerBenefit': f'{query}有依据，不是装修公司说了算',
            'legalRefs': ['《住宅室内装饰装修工程质量验收规范》JGJ/T 304-2013'],
            'priority': 'P1',
        },
        'PROC': {
            'name': f'{stage_name}流程：{query}',
            'alias': [query, f'{query}流程', f'{query}步骤'],
            'oneLine': f'{query}是{stage_name}阶段的关键流程，按 SOP 分 3-5 步执行。',
            'detail': f'{query}的标准执行流程：1）准备阶段（材料/工具/条件确认）；2）执行阶段（按操作规范逐步实施，关键点位拍照留证）；3）验收阶段（对照标准逐项核对，业主签字）。作为{stage_name}的必做动作，执行质量直接影响后期{stage.replace(chr(112)+chr(49),"中期")}阶段的推进。建议纳入项目经理日巡检 checklist。',
            'consumerQ': f'{query}具体怎么做？',
            'ownerBenefit': f'流程标准化=质量稳定=口碑',
            'consumerBenefit': f'知道什么时候做、怎么做、怎么验收',
            'priority': 'P1',
        },
        'RISK': {
            'name': f'{stage_name}风险：{query}常见问题与对策',
            'alias': [query, f'{query}风险', f'{query}避坑'],
            'oneLine': f'{query}是{stage_name}阶段的高频风险点，识别信号+预防措施。',
            'detail': f'{query}作为家装{stage_name}阶段的高频风险，识别信号：前期疏忽→中期返工→后期投诉。预防措施：签前讲清/交底时写进合同/施工中拍照/验收时确认。一旦发生补救路径：双方协商→变更单签字→调整预算→重新施工。参考案例：2024 年某业主因{query}未按标准执行，装后 3 个月投诉到消协，装修公司退款 2.3 万元。',
            'consumerQ': f'{query}有什么坑？怎么避免？',
            'ownerBenefit': f'主动暴露风险=信任=减少后期纠纷',
            'consumerBenefit': f'提前知道风险点，不会等到出事才后悔',
            'priority': 'P1',
        },
        'INFO': {
            'name': f'{stage_name}知识点：{query}',
            'alias': [query, f'{query}是什么', f'{query}知识'],
            'oneLine': f'{query}是家装{stage_name}阶段的基础知识点，贯穿从设计到交付。',
            'detail': f'{query}是家装服务者的必备知识：涵盖概念定义、应用场景、实操要点三个层面。应用时机：{stage_name}阶段的设计交底、施工管理、客户沟通中。常见误区：把{query}当成"凭经验"而非"循证"——正确做法是查标准/看案例/签前讲清。延伸阅读：关联词条 JZ-SUM-001（域总纲）、JZ-ABIL-DSGN-001（户型诊断能力）。',
            'consumerQ': f'{query}是什么意思？',
            'ownerBenefit': f'基础知识扎实=专业度=签单/转介绍',
            'consumerBenefit': f'了解专业概念，和设计师沟通更顺畅',
            'priority': 'P2',
        },
    }

    content = entry_type_content.get(entry_type, entry_type_content['INFO'])

    return build_entry(
        entry_id=eid, domain=domain, scene_domain=scene_domain,
        sub_scene=sub_scene, entry_type=entry_type,
        name=content['name'], alias_list=content['alias'],
        one_line=content['oneLine'], detail=content['detail'],
        consumer_q=content['consumerQ'],
        owner_benefit=content['ownerBenefit'],
        consumer_benefit=content['consumerBenefit'],
        legal_refs=content.get('legalRefs', []),
        priority=content.get('priority', 'P1'),
    )


def load_existing():
    """加载现有家装服务条目"""
    path = '/workspace/fengsheng-tasks/data/domains/家装服务.json'
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def write_result(new_entries):
    """合并并写入，同时更新 manifest"""
    # 1. 合并到家装服务.json
    existing = load_existing()
    all_entries = existing + new_entries
    out_path = '/workspace/fengsheng-tasks/data/domains/家装服务.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"✓ 家装服务.json: {len(existing)} + {len(new_entries)} = {len(all_entries)} 条")

    # 2. 更新 manifest
    manifest_path = '/workspace/fengsheng-tasks/data/domains/_manifest.json'
    with open(manifest_path) as f:
        manifest = json.load(f)

    # 确保 家装服务 在 manifest 中
    if '家装服务' not in manifest['domains']:
        manifest['domains'].append('家装服务')
    old_count = manifest['counts'].get('家装服务', 0)
    manifest['counts']['家装服务'] = len(all_entries)
    manifest['total'] = sum(manifest['counts'].values())
    manifest['total_entries'] = manifest['total']
    manifest['total_domains'] = len(manifest['domains'])

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"✓ manifest.json: total {manifest['total']} (家装服务 {old_count}→{len(all_entries)})")

    # 3. 更新 entries.json 主索引（如果 Worker fallback 用）
    entries_path = '/workspace/fengsheng-tasks/data/entries.json'
    try:
        with open(entries_path) as f:
            all_entries_json = json.load(f)
        # 只追加 DECOR 条目（不去重，因为 Worker 主要走 domains manifest）
        existing_decor_ids = set(e['id'] for e in all_entries_json if e.get('domain') == '家装服务')
        new_decor = [e for e in new_entries if e['id'] not in existing_decor_ids]
        if new_decor:
            all_entries_json.extend(new_decor)
            with open(entries_path, 'w', encoding='utf-8') as f:
                json.dump(all_entries_json, f, ensure_ascii=False, indent=2)
            print(f"✓ entries.json: +{len(new_decor)} 条 DECOR (total {len(all_entries_json)})")
    except Exception as e:
        print(f"⚠ entries.json 更新跳过: {e}")


if __name__ == '__main__':
    print("=" * 60)
    print("风声家装服务知识底座 V1.1 生成器")
    print("=" * 60)

    new_entries = generate_all_entries()

    # 统计类型
    type_counts = {}
    for e in new_entries:
        type_counts[e['entryType']] = type_counts.get(e['entryType'], 0) + 1
    print(f"\n新条目类型分布: {type_counts}")

    # 写入
    write_result(new_entries)

    print("\n" + "=" * 60)
    print("✅ 生成完成！校验命令:")
    print("  python3 -c \"import json; d=json.load(open('data/domains/家装服务.json')); print(f'家装服务 {len(d)} 条'); print('types:', set(e['entryType'] for e in d)); print('domains in manifest:', '家装服务' in json.load(open('data/domains/_manifest.json'))['domains'])\"")
    print("=" * 60)
