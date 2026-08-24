// V3.0 策展引擎（见面参谋）· 确定性检索增强 · 不依赖 LLM
// 铁律：依据真不幻觉 —— 仅对真实 legalRef 挂依据徽标；缺失条目诚实标注；绝不编造。
// V3.1：支持动态 API 数据（generateCurationAsync），静态数据作为降级兜底
import ENTRIES from './entries_slim.js'

const API_BASE = 'https://fengsheng.tech'

// ===== 双纵轴节点（购5 / 租4）与检索关键词 =====
export const AXIS_GROUPS = [
  {
    type: 'buy', label: '购房线', clientType: 'buyer',
    nodes: [
      { key: 'first', name: '① 首套', kw: ['首套', '首次', '刚需', '新房', '第一次买房', '结婚', '婚房'] },
      { key: 'improve', name: '② 改善', kw: ['改善', '换房', '置换', '卖旧买新', '换大', '二套', '卖一买一'] },
      { key: 'edu', name: '③ 教育', kw: ['学区', '入学', '教育', '上学', '划片', '学位', '孩子'] },
      { key: 'upgrade', name: '④ 升级', kw: ['升级', '品质', '置换', '资产', '换房', '豪宅'] },
      { key: 'elder', name: '⑤ 适老', kw: ['适老', '养老', '老人', '父母', '无障碍', '电梯'] }
    ]
  },
  {
    type: 'rent', label: '租住线', clientType: 'tenant',
    nodes: [
      { key: 'start', name: '① 起步', kw: ['租房', '首次租房', '租', '合租', '预算', '上班'] },
      { key: 'rimprove', name: '② 改善', kw: ['租住改善', '换租', '改善租', '更大', '独立'] },
      { key: 'family', name: '③ 家庭', kw: ['家庭', '孩子', '学区', '陪读', '户型'] },
      { key: 'quality', name: '④ 品质', kw: ['品质', '装修', '社区', '服务', '安静'] }
    ]
  },
  {
    type: 'lease_out', label: '房东出租线', clientType: 'landlord',
    nodes: [
      { key: 'lease_out', name: '房东出租', kw: ['出租', '房东', '托管', '招租', '空置', '收租', '包租'] }
    ]
  },
  {
    type: 'sell', label: '业主出售线', clientType: 'seller',
    nodes: [
      { key: 'sell', name: '业主出售', kw: ['卖房', '出售', '挂牌', '业主', '置换', '资产', '出手'] }
    ]
  }
]

// ===== 住得好七维 与检索关键词 =====
// V3.2 生产化：每维补充「锚点」——定义 / 子维 / 1-10 标尺 / 升分信号 / 降分信号 / 让客户认同话术
// 锚点为经纪人实战共识（方法性指引，非统计假数据），用于让经纪人知道怎么打分、依据什么。
export const DIMENSIONS = [
  {
    key: 'safe', name: '物质安全', kw: ['产权', '安全', '物业', '隔音', '消防', '质量'],
    def: '房子能不能稳稳托住基本生活与资产安全——产权清不清、结构牢不牢、物业靠不靠谱。',
    sub: '产权(是否查封/抵押/共有) · 结构(楼龄/质量/渗漏) · 物业(安保/消防/维修响应)',
    scale: '1-3 不在意 ｜ 4-6 常规要求 ｜ 7-10 高度敏感(有娃/老人/资产安全焦虑)',
    up: '客户主动问「产权干净吗/会不会查封/月供扛不扛得住」→ 升',
    down: '客户说「老点旧点无所谓，能住就行」→ 降',
    script: '您最怕的是钱花出去不安心，对吧？产权清不清、房子稳不稳，这俩我先帮您把关。'
  },
  {
    key: 'health', name: '健康', kw: ['采光', '通风', '噪音', '环境', '甲醛', '绿化', '空气'],
    def: '居住空间对身体的长期影响——采光、通风、噪音、空气、社区环境。',
    sub: '采光朝向 · 通风对流 · 噪音源(路/轨/工) · 空气与绿化',
    scale: '1-3 无所谓 ｜ 4-6 一般 ｜ 7-10 高敏感(娃/老人/过敏体质)',
    up: '反复问「采光好不好/吵不吵/甲醛」→ 升',
    down: '「只要便宜，环境差点能忍」→ 降',
    script: '家里有老人小孩的话，采光和安静最影响日常舒服度，这块我帮您重点看。'
  },
  {
    key: 'conv', name: '便利', kw: ['通勤', '地铁', '配套', '商圈', '学校', '医院', '交通'],
    def: '日常通勤与生活配套的省心程度——上班、上学、买菜、就医是否方便。',
    sub: '通勤时长/方式 · 地铁商业医疗配套 · 学区可达性',
    scale: '1-3 不挑 ｜ 4-6 均衡 ｜ 7-10 强约束(通勤焦虑/依赖地铁)',
    up: '反复确认「到公司多久/地铁多远」→ 升',
    down: '「平时不出门，远近都行」→ 降',
    script: '通勤是每天的事，您理想单程多久能接受？我按这个帮您卡半径。'
  },
  {
    key: 'econ', name: '经济', kw: ['预算', '价格', '税费', '成本', '月供', '首付', '划算', '费用'],
    def: '这笔钱花得值不值、扛不扛得住——总价、月供、税费、持有成本。',
    sub: '总价预算 · 首付来源 · 月供承受 · 税费与隐性成本',
    scale: '1-3 预算宽松 ｜ 4-6 有规划 ｜ 7-10 高度敏感(月供压力大/精打细算)',
    up: '反复问「月供多少/税费多少/首付缺口」→ 升',
    down: '「钱不是问题，看中就买」→ 降',
    script: '买房大头在月供和税费，我把总账算给您看，您心里就有底了。'
  },
  {
    key: 'comfort', name: '舒适', kw: ['户型', '朝向', '采光', '楼层', '空间', '通风'],
    def: '户内空间的体感舒服度——户型方正、朝向、楼层、空间感。',
    sub: '户型方正度 · 朝向采光 · 楼层视野 · 空间利用',
    scale: '1-3 不挑 ｜ 4-6 一般 ｜ 7-10 高要求(改善/品质客)',
    up: '强调「要通透/要大面宽/不要暗卫」→ 升',
    down: '「能住人就行，舒服次要」→ 降',
    script: '住得舒不舒服主要看户型和朝向，我带您重点感受这几处。'
  },
  {
    key: 'beauty', name: '美观', kw: ['装修', '风格', '颜值', '设计', '外观'],
    def: '房子和社区的「颜值」带来的心理满足——装修风格、外立面、社区调性。',
    sub: '装修风格 · 外立面与公区 · 社区调性 · 园林',
    scale: '1-3 不在意 ｜ 4-6 一般 ｜ 7-10 高要求(颜值控/社交展示)',
    up: '说「要发朋友圈/要有面子/装修要喜欢」→ 升',
    down: '「后期自己装，现在丑点没事」→ 降',
    script: '房子也是您生活品味的延伸，外观和装修对味，住着心情都不一样。'
  },
  {
    key: 'free', name: '自在', kw: ['邻里', '社区', '安静', '氛围', '自在'],
    def: '社区氛围与邻里关系带来的松弛感——安静、自在、不被打扰。',
    sub: '邻里密度 · 社区氛围 · 安静度 · 管理尺度',
    scale: '1-3 无所谓 ｜ 4-6 一般 ｜ 7-10 高敏感(社恐/重视隐私/养老)',
    up: '问「邻居好不好相处/闹不闹/物业管不管」→ 升',
    down: '「回家关门就行，邻里不重要」→ 降',
    script: '住得自在不自在，邻里和物业氛围很关键，这块我帮您打听清楚。'
  }
]

// ===== 场景化配置（V3.0.13 升级：全生命周期 4 线 34 场景）=====
// 每条客户线：购房线11 / 租住线10 / 房东出租线4 / 业主出售线9
// 每个场景定义：kw 关键词注入 + subScenes 加权 + tool 呈现工具
//   + followups 见后跟进 + explorePrompts(M1探索) + actionSteps(M3行动) + confirmChecklist(M4确认)
export const SCENARIOS = {
  buy: {
    first_contact: {
      name: '首次接触', icon: 'handshake',
      kw: ['首次', '初次', '咨询', '了解', '来电', '到店', '见面'],
      subScenes: ['需求确认'], tool: '探需卡',
      followups: [
        { theme: '资格预审', text: '3天内帮客户完成购房资格预查，锁定真实购买力' },
        { theme: '区域初筛', text: '按客户预算和通勤偏好，整理2-3个候选板块供下次沟通' }
      ],
      explorePrompts: ['这次买房最核心的诉求是什么（自住/学区/投资）？', '首付和月供的承受上限心里有数吗？'],
      actionSteps: ['用探需卡现场记录客户画像', '当面演示板块对比，建立专业信任'],
      confirmChecklist: ['确认客户理解下一步动作', '约定下次沟通时间']
    },
    need_discovery: {
      name: '需求深挖', icon: 'search',
      kw: ['预算', '资格', '首付', '贷款', '公积金', '学区', '区域', '需求'],
      subScenes: ['需求确认', '资格审查'], tool: '需求画像报告',
      followups: [
        { theme: '预算锁定', text: '整理首付+月供+税费+隐性成本全口径预算表发给客户' },
        { theme: '资格确认', text: '跟进购房资格核验结果，确认限购套数和贷款成数' }
      ],
      explorePrompts: ['除房款外，税费/中介费/装修预留是否算进总预算？', '对户型/朝向/楼层的硬性要求有哪些？'],
      actionSteps: ['输出需求画像报告', '标注「必须满足」与「可妥协」项'],
      confirmChecklist: ['与客户确认需求画像无误', '同步下一步看房计划']
    },
    viewing: {
      name: '带看房源', icon: 'home',
      kw: ['看房', '带看', '实地', '户型', '朝向', '采光', '配套', '小区'],
      subScenes: ['房源匹配'], tool: '房源对比卡',
      followups: [
        { theme: '看房反馈', text: '见面后当天收集客户对每套房源的真实反馈，标记偏好' },
        { theme: '候选缩小', text: '按客户反馈缩小范围，下次带看2-3套精选房源' }
      ],
      explorePrompts: ['今天看的几套里，最打动你和最劝退的分别是什么？', '如果只能留一个，你最看重哪个点？'],
      actionSteps: ['用房源对比卡逐项打分', '现场拍照记录客户关注细节'],
      confirmChecklist: ['确认候选清单', '约定复看/决策时间']
    },
    mandate: {
      name: '委托签约', icon: 'contract',
      kw: ['委托', '居间', '协议', '服务', '佣金', '独家'],
      subScenes: ['资格审查'], tool: '委托服务清单',
      followups: [
        { theme: '服务承诺', text: '发送书面服务承诺与看房计划，让客户安心' },
        { theme: '信息同步', text: '建立每周固定沟通节奏，同步带看进展和市场变化' }
      ],
      explorePrompts: ['您期望的委托方式是独家还是多家？', '对佣金和服务边界有什么特别关注？'],
      actionSteps: ['讲解委托协议关键条款', '出具服务清单明确保障'],
      confirmChecklist: ['客户签字确认委托', '归档委托资料']
    },
    negotiation: {
      name: '议价谈判', icon: 'balance',
      kw: ['价格', '议价', '砍价', '底价', '成交', '税费', '谈判'],
      subScenes: ['价格评估'], tool: '价格测算表',
      followups: [
        { theme: '价格跟进', text: '24小时内同步双方价格预期差异，给出斡旋建议' },
        { theme: '税费测算', text: '整理买卖双方各自承担的税费清单，避免签约时争议' }
      ],
      explorePrompts: ['业主底价心理线您了解多少？', '如果价格谈不拢，您的备选方案是什么？'],
      actionSteps: ['用价格测算表呈现双方差距', '给出可落地的斡旋话术'],
      confirmChecklist: ['确认价格共识', '推进草签意向']
    },
    contract: {
      name: '合同签署', icon: 'signature',
      kw: ['合同', '签约', '条款', '定金', '订金', '付款', '违约'],
      subScenes: ['合同条款', '定金订金', '付款方式'], tool: '合同要点清单',
      followups: [
        { theme: '签约跟进', text: '签约后发送合同关键条款摘要，标注重要时间节点' },
        { theme: '贷款对接', text: '协助客户对接银行贷款面签，跟进审批进度' }
      ],
      explorePrompts: ['付款节奏和过户节点有无特殊约定？', '定金与订金的区别是否清楚？'],
      actionSteps: ['逐条讲解合同要点清单', '提示违约与解约风险'],
      confirmChecklist: ['双方确认条款无误', '安排贷款面签']
    },
    loan: {
      name: '贷款办理', icon: 'bank',
      kw: ['贷款', '商贷', '公积金', '组合贷', '面签', '征信', '审批', '放款', '月供', 'LPR'],
      subScenes: ['资格审查'], tool: '贷款方案测算表',
      followups: [
        { theme: '面签跟进', text: '协助准备收入/流水/征信材料，预约银行面签' },
        { theme: '审批跟踪', text: '每周跟进审批进度，预判放款时点衔接过户' }
      ],
      explorePrompts: ['公积金与商贷组合比例想怎么配？', '对放款周期有什么时间要求？'],
      actionSteps: ['输出多方案月供对比', '核对征信与流水缺口'],
      confirmChecklist: ['确认最优贷款方案', '预约银行面签']
    },
    handover: {
      name: '交房过户', icon: 'key',
      kw: ['交房', '过户', '验收', '交接', '物业', '登记', '不动产权'],
      subScenes: [], tool: '交房验收单',
      followups: [
        { theme: '验收跟进', text: '交房后7天内跟进发现的瑕疵问题，协调原业主修复' },
        { theme: '过户确认', text: '确认不动产证办理进度，同步客户领取时间' }
      ],
      explorePrompts: ['水电燃气物业交割有无遗留欠费？', '户口迁出是否写入约定？'],
      actionSteps: ['用验收单逐项核对', '陪同办理物业交割'],
      confirmChecklist: ['确认房屋无遗留问题', '拿到不动产权证']
    },
    renovation: {
      name: '整装服务', icon: 'paint',
      kw: ['装修', '整装', '设计', '施工', '监理', '软装', '工期', '预算'],
      subScenes: [], tool: '整装需求卡',
      followups: [
        { theme: '风格确认', text: '交房后跟进装修风格与预算，引荐整装设计师' },
        { theme: '工期规划', text: '同步施工节点与入住计划，避免空置浪费' }
      ],
      explorePrompts: ['喜欢的风格倾向（现代/原木/轻奢）？', '整装预算和期望入住时间？'],
      actionSteps: ['用整装需求卡采集痛点', '出具风格参考板'],
      confirmChecklist: ['确认整装方向', '对接设计师量房']
    },
    after_sale: {
      name: '售后关怀', icon: 'heart',
      kw: ['入住', '物业', '社区', '邻居', '居住体验', '维保'],
      subScenes: [], tool: '入住关怀卡',
      followups: [
        { theme: '入住关怀', text: '入住1个月后回访居住体验，提供社区资源对接' },
        { theme: '持续服务', text: '定期同步区域房价走势，帮客户跟踪资产价值' }
      ],
      explorePrompts: ['入住后最不习惯或想改善的是什么？', '邻里/物业体验如何？'],
      actionSteps: ['建立入住关怀卡', '记录改善需求'],
      confirmChecklist: ['确认居住满意度', '标记潜在服务机会']
    },
    asset: {
      name: '资产管理', icon: 'chart',
      kw: ['资产', '保值', '增值', '出租', '置换', '配置', '持有成本'],
      subScenes: [], tool: '资产配置报告',
      followups: [
        { theme: '价值跟踪', text: '每季度同步小区成交价，帮客户跟踪资产走势' },
        { theme: '配置建议', text: '识别低效资产，建议出租/置换/优化持有结构' }
      ],
      explorePrompts: ['这套房未来是长期持有还是阶段性置换？', '有无出租或二次置业打算？'],
      actionSteps: ['出具资产配置报告', '测算持有成本与收益'],
      confirmChecklist: ['确认资产管理目标', '制定年度跟踪计划']
    }
  },
  rent: {
    first_contact: {
      name: '首次接触', icon: 'handshake',
      kw: ['租房', '租住', '出租', '租金', '合租', '整租', '见面'],
      subScenes: ['需求确认'], tool: '租住需求卡',
      followups: [
        { theme: '需求整理', text: '当天整理客户租住需求清单，确认预算和区域偏好' },
        { theme: '房源初筛', text: '2天内匹配3-5套候选房源，约定带看时间' }
      ],
      explorePrompts: ['对通勤时间和区域有什么硬性要求？', '合租还是整租，预算上限多少？'],
      actionSteps: ['用租住需求卡采集画像', '标注必满足项'],
      confirmChecklist: ['确认需求清单', '约定看房时间']
    },
    need_match: {
      name: '需求匹配', icon: 'search',
      kw: ['匹配', '预算', '户型', '通勤', '期限', '合租', '需求'],
      subScenes: ['需求确认'], tool: '租住画像报告',
      followups: [
        { theme: '匹配优化', text: '按客户反馈调整匹配条件，缩小到2-3套优质候选' }
      ],
      explorePrompts: ['上次候选里最不满意的点是什么？', '租期大概多长，是否考虑长租？'],
      actionSteps: ['输出租住画像报告', '重新圈定候选'],
      confirmChecklist: ['确认优化后需求', '安排复看']
    },
    viewing: {
      name: '带看房源', icon: 'home',
      kw: ['看房', '带看', '实地', '采光', '噪音', '家电', '小区'],
      subScenes: [], tool: '房源对比卡',
      followups: [
        { theme: '看房反馈', text: '当天收集客户对每套房源的反馈，标记偏好和顾虑' }
      ],
      explorePrompts: ['采光、噪音、家电这三项里你最在意哪个？', '周边配套还缺什么？'],
      actionSteps: ['用房源对比卡打分', '现场记录瑕疵'],
      confirmChecklist: ['确认意向房源', '推进签约']
    },
    mandate: {
      name: '委托签约', icon: 'contract',
      kw: ['委托', '居间', '协议', '佣金', '服务'],
      subScenes: [], tool: '委托服务清单',
      followups: [
        { theme: '服务承诺', text: '发送书面服务承诺，明确看房安排和沟通方式' }
      ],
      explorePrompts: ['对佣金和服务内容有无特别约定？', '看房时间偏好？'],
      actionSteps: ['讲解委托协议', '出具服务清单'],
      confirmChecklist: ['确认委托关系', '归档资料']
    },
    lease_signing: {
      name: '合同签署', icon: 'signature',
      kw: ['合同', '租约', '押金', '租金', '维修', '转租', '续租'],
      subScenes: [], tool: '合同要点清单',
      followups: [
        { theme: '签约跟进', text: '发送租赁合同关键条款摘要，标注押金退还条件' }
      ],
      explorePrompts: ['押金支付方式和退还条件确认了吗？', '维修责任划分清楚了吗？'],
      actionSteps: ['讲解合同要点清单', '提示转租/续租条款'],
      confirmChecklist: ['双方确认条款', '安排交接']
    },
    move_in: {
      name: '入住交接', icon: 'key',
      kw: ['交接', '入住', '水电', '家电', '钥匙', '物品'],
      subScenes: [], tool: '交接清单',
      followups: [
        { theme: '入住跟进', text: '入住1周后回访居住体验，记录需维修项' }
      ],
      explorePrompts: ['水电燃气底数是否当面核对？', '家具有无破损需记录？'],
      actionSteps: ['用交接清单逐项核对', '拍照留存现状'],
      confirmChecklist: ['确认交接无误', '建立维修台账']
    },
    rent_period: {
      name: '租期内服务', icon: 'service',
      kw: ['维修', '物业', '邻里', '房东', '投诉', '漏水', '噪音', '续租意向'],
      subScenes: [], tool: '租期服务卡',
      followups: [
        { theme: '响应跟进', text: '建立维修/物业问题响应台账，24小时内跟进进展' },
        { theme: '关系维护', text: '逢节日轻量关怀，提前摸续租意向' }
      ],
      explorePrompts: ['近期有没有需要协调的维修或邻里问题？', '对当前住的满意度如何？'],
      actionSteps: ['建立租期服务卡', '协调房东/物业'],
      confirmChecklist: ['确认问题解决', '记录续租意向']
    },
    renewal: {
      name: '续约谈判', icon: 'refresh',
      kw: ['续租', '涨租', '续约', '到期', '重新签约', '议价'],
      subScenes: [], tool: '续约方案卡',
      followups: [
        { theme: '到期提醒', text: '到期前30天同步市场租金变化，帮客户争取合理条件' },
        { theme: '方案确认', text: '整理续租 vs 换租成本对比，辅助决策' }
      ],
      explorePrompts: ['打算续租还是换租？', '对涨幅的心理预期是多少？'],
      actionSteps: ['输出续约方案卡', '对比换租成本'],
      confirmChecklist: ['确认续租意向', '推进重签']
    },
    move_out: {
      name: '退租续租', icon: 'exit',
      kw: ['退租', '退房', '续租', '验房', '押金退还'],
      subScenes: [], tool: '退租验房单',
      followups: [
        { theme: '退租协助', text: '协助押金退还流程，同步房屋验收结果' },
        { theme: '续租关怀', text: '如续租，提前30天同步市场租金变化，帮客户谈判' }
      ],
      explorePrompts: ['退租还是续租最终定了？', '房屋有无需修复的损耗？'],
      actionSteps: ['用验房单核对', '协调押金结算'],
      confirmChecklist: ['确认退/续结果', '结清费用']
    },
    transfer: {
      name: '转租换租', icon: 'swap',
      kw: ['转租', '换租', '转租合法', '押金转移', '新房源', '违约'],
      subScenes: [], tool: '转租指引卡',
      followups: [
        { theme: '合规提醒', text: '提示转租需房东书面同意，避免违约风险' },
        { theme: '新源匹配', text: '同步新需求，快速匹配换租房源' }
      ],
      explorePrompts: ['转租还是直接换租？', '现有合同对转租怎么约定？'],
      actionSteps: ['讲解转租合规要点', '匹配新房源'],
      confirmChecklist: ['确认合规路径', '衔接新租约']
    }
  },
  lease_out: {
    entrust: {
      name: '委托出租', icon: 'contract',
      kw: ['出租', '委托', '招租', '空置', '托管', '房东'],
      subScenes: [], tool: '委托出租清单',
      followups: [
        { theme: '房源接洽', text: '上门勘房，确认出租预期与空置期容忍度' },
        { theme: '定价建议', text: '提供同小区租金对比，帮房东定合理挂牌价' }
      ],
      explorePrompts: ['期望租金和空置期容忍度？', '对租客类型有无要求？'],
      actionSteps: ['出具委托出租清单', '拍摄房源素材'],
      confirmChecklist: ['确认委托关系', '上线招租']
    },
    evaluate: {
      name: '房屋评估', icon: 'chart',
      kw: ['租金评估', '售价评估', '回报率', '估值', '对比'],
      subScenes: [], tool: '房屋评估报告',
      followups: [
        { theme: '数据支撑', text: '提供同户型成交/挂牌对比，给出租售双口径估值' },
        { theme: '决策建议', text: '对比出租回报率与出售收益，辅助房东决策' }
      ],
      explorePrompts: ['更倾向出租还是出售？', '对回报率的预期？'],
      actionSteps: ['输出房屋评估报告', '测算租售比'],
      confirmChecklist: ['确认估值区间', '制定方案']
    },
    renovate: {
      name: '整装翻新', icon: 'paint',
      kw: ['翻新', '简装', '精装', '出租前装修', '软装', '工期'],
      subScenes: [], tool: '翻新方案卡',
      followups: [
        { theme: '回报测算', text: '测算翻新投入与租金提升的回收周期' },
        { theme: '方案确认', text: '按出租定位给简装/精装两档方案' }
      ],
      explorePrompts: ['翻新预算和期望租金提升？', '出租定位（白领/家庭）？'],
      actionSteps: ['出具翻新方案卡', '对比回收周期'],
      confirmChecklist: ['确认翻新档次', '对接施工']
    },
    manage: {
      name: '租赁托管', icon: 'shield',
      kw: ['托管', '包租', '代管', '资产管理', '省心', '收益'],
      subScenes: [], tool: '托管服务对比卡',
      followups: [
        { theme: '模式对比', text: '对比包租（固定收益）与代管（按比例抽成）两种模式' },
        { theme: '风险说明', text: '提示空置风险转移与收益上限，帮房东选合适模式' }
      ],
      explorePrompts: ['想要稳定收益还是更高弹性回报？', '是否愿意承担空置风险？'],
      actionSteps: ['输出托管对比卡', '测算两种模式收益'],
      confirmChecklist: ['确认托管模式', '签署托管协议']
    }
  },
  sell: {
    consult: {
      name: '出售咨询', icon: 'question',
      kw: ['卖房', '咨询', '出售', '挂牌', '值多少钱', '怎么卖'],
      subScenes: [], tool: '卖房决策卡',
      followups: [
        { theme: '需求厘清', text: '了解出售动机与时间表，判断是否急售' },
        { theme: '路径建议', text: '对比「先卖后买」与「先买后卖」的资金衔接风险' }
      ],
      explorePrompts: ['出售的主要动因是什么？', '资金衔接上有没有时间压力？'],
      actionSteps: ['用卖房决策卡采集', '初判出售可行性'],
      confirmChecklist: ['确认出售意向', '进入评估']
    },
    evaluate: {
      name: '房源评估', icon: 'chart',
      kw: ['估价', '估值', '定价', '成交价', '挂牌价', '市场'],
      subScenes: [], tool: '房源定价报告',
      followups: [
        { theme: '定价策略', text: '提供市场成交对比，给「保守/均衡/激进」三档挂牌价' },
        { theme: '周期预判', text: '结合市场热度预判成交周期，管理业主预期' }
      ],
      explorePrompts: ['心理底价是多少？', '对成交周期有要求吗？'],
      actionSteps: ['输出房源定价报告', '标注三档区间'],
      confirmChecklist: ['确认挂牌价', '进入委托']
    },
    entrust: {
      name: '出售委托', icon: 'contract',
      kw: ['委托', '独家居间', '多家', '协议', '佣金'],
      subScenes: [], tool: '委托出售清单',
      followups: [
        { theme: '委托确认', text: '讲解独家 vs 多家的利弊，明确委托期限与权限' },
        { theme: '信息披露', text: '提示房屋瑕疵与权属披露义务，规避后续纠纷' }
      ],
      explorePrompts: ['倾向独家还是多家委托？', '委托期限怎么定？'],
      actionSteps: ['出具委托出售清单', '讲解披露义务'],
      confirmChecklist: ['签署委托', '上线推广']
    },
    package: {
      name: '房源包装', icon: 'sparkle',
      kw: ['拍摄', '文案', '卖点', '美化', '线上', '展示'],
      subScenes: [], tool: '房源卖点卡',
      followups: [
        { theme: '卖点提炼', text: '提炼3-5个核心卖点，专业拍摄与文案包装' },
        { theme: '渠道铺排', text: '多平台同步上线，制定带看节奏' }
      ],
      explorePrompts: ['这套房最大的亮点是什么？', '目标买家画像？'],
      actionSteps: ['用卖点卡提炼优势', '专业拍摄上线'],
      confirmChecklist: ['确认包装方案', '启动推广']
    },
    viewing: {
      name: '看房接待', icon: 'home',
      kw: ['看房', '带看', '接待', '验房', '讲解', '反馈'],
      subScenes: [], tool: '带看接待卡',
      followups: [
        { theme: '反馈收集', text: '每次带看后记录买家反馈，反哺定价与包装' },
        { theme: '节奏管理', text: '集中带看制造热度，提升成交概率' }
      ],
      explorePrompts: ['带看中买家最关心什么？', '对价格的反馈如何？'],
      actionSteps: ['用带看接待卡记录', '集中安排看房'],
      confirmChecklist: ['确认买家意向', '推进议价']
    },
    negotiation: {
      name: '议价谈判', icon: 'balance',
      kw: ['议价', '底价', '还价', '谈判', '诚意金', '博弈'],
      subScenes: [], tool: '议价策略卡',
      followups: [
        { theme: '价差斡旋', text: '在业主底价与买家出价间斡旋，寻找成交平衡点' },
        { theme: '风险规避', text: '提示跳单与阴阳合同风险，守住合规底线' }
      ],
      explorePrompts: ['买家出价与底价差多少？', '有无其他竞争者制造紧迫感？'],
      actionSteps: ['用议价策略卡', '给出斡旋话术'],
      confirmChecklist: ['确认价格共识', '推进签约']
    },
    contract: {
      name: '合同签署', icon: 'signature',
      kw: ['合同', '签约', '定金', '网签', '条款', '违约'],
      subScenes: [], tool: '出售合同要点',
      followups: [
        { theme: '条款核对', text: '逐条讲解出售合同要点，标注付款与过户节点' },
        { theme: '资金安全', text: '提示资金监管，保障业主收款安全' }
      ],
      explorePrompts: ['付款节奏怎么安排？', '资金监管方式确认？'],
      actionSteps: ['讲解合同要点', '强调资金监管'],
      confirmChecklist: ['双方签约', '进入过户']
    },
    handover: {
      name: '过户交房', icon: 'key',
      kw: ['过户', '缴税', '交房', '物业交割', '领证', '尾款'],
      subScenes: [], tool: '过户交房清单',
      followups: [
        { theme: '过户跟进', text: '跟进缴税过户进度，确认尾款支付节点' },
        { theme: '交割确认', text: '陪同物业交割，确认户口迁出与欠费结清' }
      ],
      explorePrompts: ['户口迁出约定清楚了吗？', '物业欠费谁承担？'],
      actionSteps: ['用清单逐项核对', '陪同办理过户'],
      confirmChecklist: ['确认过户完成', '收讫尾款']
    },
    asset: {
      name: '资产优化', icon: 'chart',
      kw: ['资产', '多套', '配置', '税筹', '置换', '优化'],
      subScenes: [], tool: '资产优化报告',
      followups: [
        { theme: '组合分析', text: '分析多套房产持有成本与收益，给优化建议' },
        { theme: '长期规划', text: '识别低效资产，建议置换升级或出租腾挪' }
      ],
      explorePrompts: ['手中房产长期怎么规划？', '有无税筹或置换需求？'],
      actionSteps: ['出具资产优化报告', '测算组合收益'],
      confirmChecklist: ['确认优化方向', '制定计划']
    }
  }
}

// ===== 工具：真实法源判定（R2 边界）=====
function isRealLegal(ref) {
  if (!ref) return false
  const s = String(ref).trim()
  return !/待补充|待核|无|—|^-$|^\s*$/.test(s) && s.length >= 4
}

// ===== 客户相关性判定（客户可见页过滤纯经纪人内训/噪音）=====
// 知识底座主体是经纪人执业合规库（LAW/RISK/PROC/STD/POL/TERM/CASE），
// 客户页只保留与「购房决策」直接相关的内容，剔除经纪人行为语义与入住/搬家噪音。
const AGENT_NOISE = /(经纪|中介|执业|备案|佣金|阴阳合同|绕开|私下成交|退佣|资格考试|职业培训|信用档案|私自收|如实报告|利益冲突|客户信息保密|服务承诺体系|执业禁止|入住|搬家|搬家公司|电梯预约|物业报备|搬运|退租|续租|租期内|邻里纠纷|物业投诉|经纪人能)/
function isClientRelevant(e, ct) {
  const blob = (e.name || '') + ' ' + (e.ola || '') + ' ' + (e.def || '')
  if (AGENT_NOISE.test(blob)) return false
  const eCt = (e.tags && e.tags.clientType) || []
  if (eCt.length && !eCt.includes(ct)) return false
  return true
}

function tokenize(text) {
  if (!text) return []
  const out = []
  const cj = text.match(/[一-龥]{2,}/g) || []
  const en = text.match(/[a-zA-Z0-9]{2,}/g) || []
  return out.concat(cj, en)
}

function searchable(e) {
  return [e.name, (e.alias || []).join(' '), e.cq, e.ola, (e.cp || []).join(' '), e.detail, e.consumerBenefit]
    .filter(Boolean).join(' ')
}

// ===== API 字段 → 引擎字段归一化 =====
// 支持新旧双字段名（新：name/ola/cp/detail/dataRef/caseRef/source；旧：oneLineAnswer/corePoint/def/...）
function normalizeEntry(apiEntry) {
  const cpRaw = apiEntry.cp || apiEntry.corePoint
  return {
    id: apiEntry.id || '',
    name: apiEntry.name || '',
    alias: apiEntry.alias || [],
    cq: apiEntry.cq || apiEntry.consumerQ || '',
    ola: apiEntry.ola || apiEntry.oneLineAnswer || '',
    cp: Array.isArray(cpRaw) ? cpRaw : (cpRaw ? [cpRaw] : []),
    detail: apiEntry.detail || apiEntry.def || '',
    legalRef: apiEntry.legalRef || '',
    dataRef: apiEntry.dataRef || '',
    caseRef: apiEntry.caseRef || '',
    source: apiEntry.source || '',
    consumerBenefit: apiEntry.consumerBenefit || '',
    tags: apiEntry.tags || {},
    scene: apiEntry.sceneDomain || apiEntry.scene || '',
    domain: apiEntry.domain || '',
    subScene: apiEntry.subScene || ''
  }
}

// ===== API 数据拉取（带缓存） =====
let _cachedEntries = null

async function fetchCurationEntries() {
  // 拉取签约前 + 签约中 两个域的全部词条，映射到 decoder / see / nego 三组
  const domainRequests = [
    { domain: '签约前', grp: 'decoder' },
    { domain: '签约中', grp: 'nego' }
  ]

  const grouped = { decoder: [], see: [], nego: [] }

  for (const { domain } of domainRequests) {
    const resp = await new Promise((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/api/entries?domain=${encodeURIComponent(domain)}&limit=1500`,
        method: 'GET',
        timeout: 12000,
        success: (res) => resolve(res.data || {}),
        fail: (err) => reject(err)
      })
    })

    const entries = (resp.entries || []).map(normalizeEntry)

    for (const e of entries) {
      if (e.domain === '签约前') {
        // see 组：房源匹配 / 价格评估（看房/带看方向）
        if (e.subScene === '房源匹配' || e.subScene === '价格评估') {
          grouped.see.push(e)
        }
        // decoder 组：需求确认 / 资格审查 / 及其他签约前子场景
        if (e.subScene === '需求确认' || e.subScene === '资格审查') {
          grouped.decoder.push(e)
        } else if (e.subScene !== '房源匹配' && e.subScene !== '价格评估') {
          // 其他签约前子场景（如融资贷款、风险识别、合同审查等）也归入 decoder
          grouped.decoder.push(e)
        }
      } else if (e.domain === '签约中') {
        // nego 组：全部签约中词条
        grouped.nego.push(e)
      }
    }
  }

  return grouped
}

// ===== 主引擎（同步版 · 静态数据） =====
export function generateCuration(input) {
  return generateCurationFromEntries(input, ENTRIES)
}

// ===== 主引擎（异步版 · API 数据，静态数据兜底） =====
export async function generateCurationAsync(input) {
  try {
    if (!_cachedEntries) {
      _cachedEntries = await fetchCurationEntries()
    }
    return generateCurationFromEntries(input, _cachedEntries)
  } catch (e) {
    console.warn('[curation] API fetch failed, falling back to static data:', e.message)
    // 降级：使用静态数据
    return generateCuration(input)
  }
}

// ===== 核心引擎逻辑（与数据源无关） =====
function generateCurationFromEntries(input, entriesByGroup) {
  // 默认 axisNodeKey='first'：购房线最大流量为首次购房，避免未指定时错配到改善线
  const { axisType = 'buy', axisNodeKey = 'first', dimensions = [], freeText = '', scenario = '', dimScores = {}, dimSelfScores = {} } = input || {}
  const group = AXIS_GROUPS.find(g => g.type === axisType) || AXIS_GROUPS[0]
  const node = group.nodes.find(n => n.key === axisNodeKey) || group.nodes[0]
  const ct = group.clientType
  const sc = (SCENARIOS[axisType] || {})[scenario] || null

  // 1) 检索词集合
  const qKw = new Set([...node.kw])
  dimensions.forEach(dk => {
    const d = DIMENSIONS.find(x => x.key === dk)
    if (d) d.kw.forEach(k => qKw.add(k))
  })
  // 场景关键词注入
  if (sc) sc.kw.forEach(k => qKw.add(k))
  const freeTokens = tokenize(freeText)
  freeTokens.forEach(t => qKw.add(t))
  const qArr = [...qKw]

  // 2) 扁平化 + 打分
  const all = []
  for (const grpKey of ['decoder', 'see', 'nego']) {
    (entriesByGroup[grpKey] || []).forEach(e => {
      const text = searchable(e)
      let score = 0
      qArr.forEach(kw => {
        if (!kw) return
        const inName = (e.name || '').includes(kw) || (e.alias || []).some(a => a.includes(kw))
        const inCore = (e.cq || '').includes(kw) || (e.ola || '').includes(kw) || (e.cp || []).some(c => c.includes(kw))
        const inBody = text.includes(kw)
        if (inName) score += 3
        else if (inCore) score += 2
        else if (inBody) score += 1
      })
      // 客户类型硬过滤：词条 clientType 必须包含目标客户类型才保留
      // agent 标签表示"经纪人也应知道"，不等于"适用于所有客户类型"
      // 如 buyer+agent 的词条在租客场景下不出现
      const eCt = (e.tags && e.tags.clientType) || []
      if (eCt.length && !eCt.includes(ct)) return
      // 见前阶段（签约前/需求确认）轻微加权
      const stage = (e.tags && e.tags.stage) || ''
      if (String(stage).includes('pre') || (e.domain || '').includes('签约前')) score += 0.5
      // 场景 subScene 加权：命中该场景配置的 subScene 额外 +2
      if (sc && sc.subScenes.length && sc.subScenes.includes(e.subScene)) score += 2
      const clientRelevant = isClientRelevant(e, ct)
      if (score > 0) all.push({ e, score, grp: grpKey, clientRelevant })
    })
  }
  all.sort((a, b) => b.score - a.score)

  const topN = all.slice(0, 40)
  // 强相关判定：score>=4（至少一个名称/核心词命中），用于诚实元信息与说/问聚焦
  const strong = topN.filter(x => x.score >= 4)
  const strongCount = strong.length
  const realLegalStrong = strong.filter(x => isRealLegal(x.e.legalRef)).length

  // 3) 说（关键要点，优先含真实法源）—— 阈值提升到 score>=4 确保强匹配
  const sayRaw = topN
    .filter(x => x.score >= 4 && (x.e.ola || (x.e.cp && x.e.cp.length)))
    .slice(0, 12)
    .sort((a, b) => (isRealLegal(b.e.legalRef) ? 1 : 0) - (isRealLegal(a.e.legalRef) ? 1 : 0) || b.score - a.score)
  const say = sayRaw.slice(0, 5).map(x => {
    const e = x.e
    const realLegal = isRealLegal(e.legalRef)
    // FABE 四维（F功能/A优势/B利益/E佐证）· 数据/案例缺失时诚实标待补充
    const fabe = {
      f: { label: '功能', text: e.name + (e.detail ? '：' + String(e.detail).slice(0, 80) : '') },
      a: { label: '优势', text: [e.ola, (e.cp && e.cp.join('；'))].filter(Boolean).join('；') || '待补充' },
      b: { label: '利益', text: e.consumerBenefit || '待补充（内容持续完善中）' },
      e: {
        label: '佐证',
        legal: realLegal ? e.legalRef : null,
        data: (e.dataRef && String(e.dataRef).length > 1 && !/待补充|待核/.test(e.dataRef)) ? e.dataRef : null,
        case: (e.caseRef && String(e.caseRef).length > 1 && !/待补充|待核/.test(e.caseRef)) ? e.caseRef : null
      }
    }
    return {
      title: e.name,
      point: e.ola || (e.cp && e.cp[0]) || '',
      detail: (e.cp && e.cp.slice(0, 2).join('；')) || '',
      legalRef: realLegal ? e.legalRef : null,
      hasLegal: realLegal,
      fabe,
      clientRelevant: x.clientRelevant,
      entryId: e.id
    }
  })

  // 4) 带（看房/房源匹配方向，取自 see 组）—— 限定客户类型匹配
  const bring = topN
    .filter(x => x.grp === 'see')
    .slice(0, 4)
    .map(x => ({
      title: x.e.name,
      benefit: x.e.consumerBenefit || (x.e.detail || '').slice(0, 40)
    }))

  // 4b) 如果 see 组在该客户类型下无结果（如租客），从 decoder 组补充实用建议
  const bringFallback = bring.length === 0
    ? topN
        .filter(x => x.grp === 'decoder' && x.score >= 4 && x.e.consumerBenefit)
        .slice(0, 3)
        .map(x => ({
          title: x.e.name,
          benefit: x.e.consumerBenefit || (x.e.detail || '').slice(0, 40)
        }))
    : []
  const bringFinal = bring.length ? bring : bringFallback

  // 5) 问（必问 cq，去重取相关）
  const seenQ = new Set()
  const ask = []
  for (const x of topN) {
    if (ask.length >= 5) break
    const q = x.e.cq
    if (q && !seenQ.has(q)) { seenQ.add(q); ask.push({ q }) }
  }

  // 6) 跟（见后跟进 / 持续关怀）
  // 场景化跟进优先；无场景时走原有节点+维度模板
  const followups = sc
    ? sc.followups.concat(buildDimensionFollowups(dimensions)).slice(0, 4)
    : buildFollowups(node, dimensions)

  // 7) 诚实元信息（绝不编造分数）
  const totalMatched = all.length
  const scenarioNote = sc && totalMatched === 0
    ? '该场景下暂无匹配词条。' + (axisType === 'rent' ? '租住类知识库持续扩充中' : '该场景词条待补充') + '，建议结合你的专业判断'
    : null
  const honesty = {
    matchedTotal: strongCount,
    realLegalCount: realLegalStrong,
    note: scenarioNote || (totalMatched === 0
      ? '该客户类型下暂无匹配词条。租住类知识库持续扩充中，建议结合你的专业判断补充'
      : strongCount < 3
        ? '匹配条目有限（' + totalMatched + ' 条），建议结合你的专业判断补充'
        : ('基于真实字典命中 ' + strongCount + ' 条强相关（其中 ' + realLegalStrong + ' 条含真实法源）'))
  }

  // 8) 真实数据 / 案例 / 依据来源（取自强相关词条，与 ola/cp 解耦）
  // 知识底座输入契约（已与小眼镜拉齐，见 Issue #222）：
  //  · 数据: 读 dataRef（真数据）+ 真实引用 dataSource（100% 填充，非 source 类别标签）
  //  · 案例: 优先 caseRef；缺料时从 entryType=CASE 词条的 oneLineAnswer+def 派生（871 条已就绪，立即可用）
  //  · 依据: 取 legalRef + dataSource，强相关词条 100% 有料，常驻提升报告权威
  const realSrc = (e) => (e.dataSource && !/待补充|待核/.test(e.dataSource)) ? e.dataSource : (e.source || '')
  const dataSources = strong
    .filter(x => x.e.dataRef && String(x.e.dataRef).length > 1 && !/待补充|待核/.test(x.e.dataRef))
    .slice(0, 6)
    .map(x => ({ label: x.e.name, text: x.e.dataRef, source: realSrc(x.e), srcType: x.e.source || '', clientRelevant: x.clientRelevant }))
  const caseSources = []
  strong
    .filter(x => x.e.caseRef && String(x.e.caseRef).length > 1 && !/待补充|待核/.test(x.e.caseRef))
    .slice(0, 4)
    .forEach(x => caseSources.push({ title: x.e.name, body: x.e.caseRef, source: realSrc(x.e), srcType: x.e.source || '', clientRelevant: x.clientRelevant }))
  if (caseSources.length < 4) {
    strong
      .filter(x => x.e.entryType === 'CASE' && x.e.def && x.e.oneLineAnswer && !/待补充|待核/.test(x.e.def))
      .slice(0, 4 - caseSources.length)
      .forEach(x =>         caseSources.push({
          title: x.e.name,
          body: x.e.oneLineAnswer + '：' + x.e.def,
          source: realSrc(x.e),
          srcType: x.e.source || '',
          clientRelevant: x.clientRelevant
        }))
  }
  const legalSources = strong
    .filter(x => x.e.legalRef && String(x.e.legalRef).length > 1)
    .slice(0, 6)
    .map(x => ({ label: x.e.name, legal: x.e.legalRef, source: realSrc(x.e), srcType: x.e.source || '', clientRelevant: x.clientRelevant }))

  return {
    axisLabel: group.label + ' · ' + node.name,
    scenarioName: sc ? sc.name : '',
    scenarioIcon: sc ? sc.icon : '',
    recommendedTool: sc ? sc.tool : '',
    dimensionLabels: dimensions.map(dk => (DIMENSIONS.find(d => d.key === dk) || {}).name).filter(Boolean),
    freeText,
    say, bring: bringFinal, ask, followups,
    mot: buildMot(sc, ask, say, bringFinal, followups),
    dimsInsight: buildDimsInsight(dimensions, dimScores, dimSelfScores),
    honesty,
    dataSources,
    caseSources,
    legalSources,
    timeline: buildTimeline(),
    layers: buildLayers(topN, isRealLegal)
  }
}

// ===== 七维洞察（双轨：经纪人评 + 客户自评）=====
// 差异 >3 分的维度 = 见面重点对齐的突破口（数据差本身是产品金矿）
function buildDimsInsight(dimensions, dimScores, dimSelfScores) {
  const items = dimensions.map(dk => {
    const d = DIMENSIONS.find(x => x.key === dk)
    if (!d) return null
    const broker = +(dimScores[dk] || 0)
    const self = +(dimSelfScores[dk] || 0)
    const hasBroker = broker > 0
    const hasSelf = self > 0
    const diff = (hasBroker && hasSelf) ? Math.abs(broker - self) : 0
    return { key: dk, name: d.name, broker, self, hasBroker, hasSelf, diff, flag: diff > 3 }
  }).filter(Boolean)
  // 启用判定：broker 或 self 任一有分即视为「已评分」，避免「仅客户自评」时整张雷达图被判定为空白（原逻辑只看 broker 轨，导致客户页算不出分）
  const brokerEval = items.some(i => i.hasBroker)
  const selfEval = items.some(i => i.hasSelf)
  const enabled = brokerEval || selfEval
  const selfCount = items.filter(i => i.hasSelf).length
  const diffItems = items.filter(i => i.flag)
  const diffNames = diffItems.map(i => i.name)
  // conclusion：经纪人内页视角（工作语言）
  let conclusion = ''
  if (!enabled) conclusion = '七维尚未评分——见面时按锚点给分，能更准地画出客户画像。'
  else if (!brokerEval && selfEval) conclusion = '已收到客户自评（' + selfCount + ' 维）。见面时结合您的专业判断补上经纪人视角，双方画像叠起来更立体。'
  else if (!selfEval) conclusion = '已按经纪人视角完成七维画像，建议让客户自评一次，差异往往是面谈金矿。'
  else if (diffItems.length) conclusion = '经纪人与客户在「' + diffNames.join('、') + '」上看法差异较大（差>3分），见面重点对齐这几点。'
  else conclusion = '经纪人与客户评分基本一致，画像可信度高，直接按画像推进。'
  // clientConclusion：客户可见页视角（对客语言，不出现"经纪人评/画像/面谈金矿"等内部说法）
  let clientConclusion = ''
  if (!enabled) clientConclusion = ''
  else if (!brokerEval && selfEval) clientConclusion = '这是我们目前对您居住需求的理解（基于您的自评）。见面时我们再结合专业视角补充，把方案调到您真正在意的地方。'
  else if (!selfEval) clientConclusion = '这是我们目前对您居住需求的理解。哪一项不准，随时告诉我们，我们再调。'
  else if (diffItems.length) clientConclusion = '在「' + diffNames.join('、') + '」上，我们的理解和您的想法还有一些出入。见面时我们重点听您讲讲，把方案调到您真正在意的地方。'
  else clientConclusion = '我们对您需求的理解，和您自己的判断基本一致。接下来就按这个方向为您筛选。'
  return { enabled, selfEval, items, diffNames, conclusion, clientConclusion }
}

// ===== FABE × MOT 包装层 =====
// MOT 四阶段复用现有 问/说/带/跟 并合并场景专属 extras
//   M1 探索 ← ask + sc.explorePrompts
//   M2 提议 ← say（已含 FABE）
//   M3 行动 ← bring + sc.actionSteps
//   M4 确认 ← followups + sc.confirmChecklist
function buildMot(sc, ask, say, bring, followups) {
  const extra = sc || {}
  return {
    m1_explore: {
      key: 'explore', label: 'M1 探索 · 探真实需求', icon: '🔍',
      items: [
        ...(extra.explorePrompts || []).map(t => ({ type: 'prompt', text: t })),
        ...ask.map(a => ({ type: 'ask', text: a.q }))
      ]
    },
    m2_advise: {
      key: 'advise', label: 'M2 提议 · 呈现方案与价值', icon: '💡',
      items: say
    },
    m3_act: {
      key: 'act', label: 'M3 行动 · 现场执行', icon: '🛠️',
      items: [
        ...(extra.actionSteps || []).map(t => ({ type: 'step', text: t })),
        ...bring.map(b => ({ type: 'bring', title: b.title, text: b.benefit }))
      ]
    },
    m4_confirm: {
      key: 'confirm', label: 'M4 确认 · 共识与跟进', icon: '✅',
      items: [
        ...(extra.confirmChecklist || []).map(t => ({ type: 'check', text: t })),
        ...followups.map(f => ({ type: 'follow', theme: f.theme, text: f.text }))
      ]
    }
  }
}

// 维度补充跟进（场景化跟进复用）
function buildDimensionFollowups(dimensions) {
  const dimText = []
  if (dimensions.includes('econ')) dimText.push({ theme: '费用透明', text: '持续关怀：整理本次交易全部成本清单，避免隐性支出' })
  if (dimensions.includes('conv')) dimText.push({ theme: '通勤实测', text: '见后跟进：提供早晚高峰通勤实测，增强决策依据' })
  return dimText
}

// 见后跟进：按节点 + 维度生成，语言用「见后跟进/持续关怀」，禁用钩子/策略/转化
function buildFollowups(node, dimensions) {
  const map = {
    first: [{ theme: '资格核验', text: '3 天内跟进购房资格与贷款额度测算，帮客户锁定真实预算' },
            { theme: '区域筛选', text: '持续关怀：按通勤与学区优先级，整理 2–3 个候选板块' }],
    improve: [{ theme: '旧房处置', text: '跟进现住房处置进度（在售/已售），衔接换房节奏' },
              { theme: '低密盘带看', text: '下周带看同板块低密改善盘，对比得房率与物业档次' }],
    edu: [{ theme: '划片公示', text: '开学季前帮盯目标校划片公示，第一时间同步客户' },
           { theme: '学位核实', text: '持续关怀：核实落户年限要求，避免政策误读' }],
    upgrade: [{ theme: '资产配置', text: '跟进置换后的资产结构，提供持有成本测算' }],
    elder: [{ theme: '适老改造', text: '跟进无障碍与电梯需求，整理适老改造要点' }],
    start: [{ theme: '预算对齐', text: '跟进可接受租金区间，缩小候选范围' }],
    rimprove: [{ theme: '换租节奏', text: '跟进租约到期时间，提前规划换租' }],
    family: [{ theme: '户型匹配', text: '持续关怀：按家庭结构推荐合适户型与楼层' }],
    quality: [{ theme: '社区服务', text: '跟进对物业与社区服务的真实体验反馈' }]
  }
  const base = map[node.key] || [{ theme: '持续关怀', text: '见面后 1–2 天做轻量跟进，确认客户还有哪些顾虑' }]
  return base.concat(buildDimensionFollowups(dimensions)).slice(0, 4)
}

// ===== 道法术器分层（知识库大脑：方案按 layer 组织，而非模板套话） =====
// IF 命中条目的 tags.layer ∈ {dao/fa/shu/qi}，按 道→法→术→器 顺序组织
// 每条挂真实依据（legalRef 真实存在才标，绝不编造），法层(有法律/红线)优先
const LAYER_META = {
  dao: { name: '道 · 战略方向', desc: '该不该做、大方向怎么定' },
  fa: { name: '法 · 规则依据', desc: '红线与政策，必须守住' },
  shu: { name: '术 · 操作方法', desc: '具体怎么做、话术怎么讲' },
  qi: { name: '器 · 工具推荐', desc: '用什么工具落地' }
}
function buildLayers(topN, isRealLegal) {
  // layer 字段中英文混存（道/法/术/器 与 dao/fa/shu/qi），统一归一化到英文键
  const LAYER_KEY = { dao: 'dao', fa: 'fa', shu: 'shu', qi: 'qi', '道': 'dao', '法': 'fa', '术': 'shu', '器': 'qi' }
  const layerMap = {}
  for (const x of topN) {
    const raw = (x.e.tags && x.e.tags.layer) || 'shu'
    const l = LAYER_KEY[raw] || 'shu'
    ;(layerMap[l] = layerMap[l] || []).push(x)
  }
  return ['dao', 'fa', 'shu', 'qi'].map(k => ({
    key: k,
    name: LAYER_META[k].name,
    desc: LAYER_META[k].desc,
    items: (layerMap[k] || [])
      .filter(x => x.score >= 3)
      // 有真实法源的优先（必含依据），同层按分数降序
      .sort((a, b) => (isRealLegal(b.e.legalRef) ? 1 : 0) - (isRealLegal(a.e.legalRef) ? 1 : 0) || b.score - a.score)
      .slice(0, 4)
      .map(x => {
        const realLegal = isRealLegal(x.e.legalRef)
        return {
          title: x.e.name,
          ola: x.e.ola || (Array.isArray(x.e.cp) && x.e.cp[0]) || '',
          cp: Array.isArray(x.e.cp) ? x.e.cp : [],
          legalRef: realLegal ? x.e.legalRef : null,
          hasLegal: realLegal,
          clientRelevant: x.clientRelevant,
          entryId: x.e.id
        }
      })
  })).filter(g => g.items.length)
}

// 三段式时间轴（见前/见面/见后）结构，供 UI 渲染
function buildTimeline() {
  return [
    { phase: '见前准备', tip: '看完策展包，标记要讲的 3 个要点与要问的 2 个问题', icon: '📋' },
    { phase: '见面执行', tip: '按「说→带→问」节奏推进，每条依据可当面点开给客户看', icon: '🤝' },
    { phase: '见后跟进', tip: '埋下引子 + 持续关怀，下次见面自动反哺客户认知', icon: '💌' }
  ]
}