// 风声 V3.0.7 · 真实测评题库（唯一真源）
// 数据诚实原则：维度与题项均基于真实框架——
//   · 住得好七维(4+2+1)：物质4(安全/健康/便利/经济) + 情感2(舒适/美观) + 精神1(自在)
//   · 服务者五维：人才字典 v8.0 的 5 个能力维度（专业/规范/沟通/工具/素养）
// 评分：1–5 Likert（完全不符合=1 / 不太符合=2 / 一般=3 / 比较符合=4 / 完全符合=5）
// 每题均为可自评的「能力/体验」陈述，非臆造数据。

export const LIKERT = [
  { v: 1, t: '完全不符合' },
  { v: 2, t: '不太符合' },
  { v: 3, t: '一般' },
  { v: 4, t: '比较符合' },
  { v: 5, t: '完全符合' }
]

// ===== 住得好七维（21 题，每维 3 题）=====
export const livingDims = [
  { key: 'safe', name: '安全', group: '物质', desc: '消防、防盗、结构、邻里环境' },
  { key: 'health', name: '健康', group: '物质', desc: '空气、采光、通风、噪音' },
  { key: 'conv', name: '便利', group: '物质', desc: '通勤、商超、医疗、教育' },
  { key: 'econ', name: '经济', group: '物质', desc: '总价、月供、持有成本、保值' },
  { key: 'comfort', name: '舒适', group: '情感', desc: '体感、私密、动线、收纳' },
  { key: 'beauty', name: '美观', group: '情感', desc: '立面、园林、公区、调性' },
  { key: 'free', name: '自在', group: '精神', desc: '归属感、可改造、社区氛围' }
]

export const livingQuestions = [
  // 安全 ×3
  { id: 'L01', dim: 'safe', text: '我能识别房屋的消防隐患（逃生通道、灭火器配置、电气线路）' },
  { id: 'L02', dim: 'safe', text: '我了解意向小区的治安状况与门禁管理是否可靠' },
  { id: 'L03', dim: 'safe', text: '我会检查房屋结构是否有裂缝、渗漏等明显安全隐患' },
  // 健康 ×3
  { id: 'L04', dim: 'health', text: '我关注室内空气质量（甲醛、通风换气条件）' },
  { id: 'L05', dim: 'health', text: '我在意房屋的采光时长与自然通风效果' },
  { id: 'L06', dim: 'health', text: '我注意周边噪音来源与房屋隔音表现' },
  // 便利 ×3
  { id: 'L07', dim: 'conv', text: '我评估通勤时间与公共交通便利度是否在可接受范围' },
  { id: 'L08', dim: 'conv', text: '我关注周边菜场、商超等日常配套是否齐全' },
  { id: 'L09', dim: 'conv', text: '我看重医疗、教育等公共资源的覆盖与质量' },
  // 经济 ×3
  { id: 'L10', dim: 'econ', text: '我算清了总价与月供在自己家庭承受区间内的安全线' },
  { id: 'L11', dim: 'econ', text: '我了解房屋持有成本（物业、税费、能耗）的长期负担' },
  { id: 'L12', dim: 'econ', text: '我关注房产的保值能力与未来流通性' },
  // 舒适 ×3
  { id: 'L13', dim: 'comfort', text: '我在意温度体感与供暖/制冷是否稳定舒适' },
  { id: 'L14', dim: 'comfort', text: '我重视居住私密性与室内动线是否合理' },
  { id: 'L15', dim: 'comfort', text: '我关注收纳空间与整体空间利用率' },
  // 美观 ×3
  { id: 'L16', dim: 'beauty', text: '我在意建筑立面与园林景观的整体观感' },
  { id: 'L17', dim: 'beauty', text: '我看重单元大堂、电梯厅等公共空间品质' },
  { id: 'L18', dim: 'beauty', text: '我关注室内风格调性与个人审美的契合度' },
  // 自在 ×3
  { id: 'L19', dim: 'free', text: '我看重社区的归属感与邻里关系氛围' },
  { id: 'L20', dim: 'free', text: '我希望拥有可按需自主改造的空间余地' },
  { id: 'L21', dim: 'free', text: '我在意社区节奏是否支持慢生活与松弛感' }
]

// ===== 服务者五维（75 题，每维 15 题）=====
export const serviceDims = [
  { key: 'pro', name: '专业', desc: '行业知识、法规、户型、市场研判' },
  { key: 'norm', name: '规范', desc: '流程合规、合同、隐私、资金安全' },
  { key: 'comm', name: '沟通', desc: '倾听、表达、共情、异议处理' },
  { key: 'tool', name: '工具', desc: '系统、数据、展示、协作应用' },
  { key: 'qual', name: '素养', desc: '诚信、耐心、主动、职业边界' }
]

export const serviceQuestions = [
  // 专业 ×15
  { id: 'S01', dim: 'pro', text: '我能准确说出本地二手房交易的关键税费种类' },
  { id: 'S02', dim: 'pro', text: '我熟悉所在城市限购、限贷政策的最新口径' },
  { id: 'S03', dim: 'pro', text: '我能独立解读不动产登记信息与产权状况' },
  { id: 'S04', dim: 'pro', text: '我能为客户做户型优劣的结构化分析' },
  { id: 'S05', dim: 'pro', text: '我掌握片区近半年的成交均价与价格走势' },
  { id: 'S06', dim: 'pro', text: '我能解释公积金贷款与商业贷款的差异与适用场景' },
  { id: 'S07', dim: 'pro', text: '我了解房屋质量常见隐患（漏水、沉降等）的识别要点' },
  { id: 'S08', dim: 'pro', text: '我能向客户说明租赁与买卖的法律边界' },
  { id: 'S09', dim: 'pro', text: '我熟悉契税、增值税、个税的测算逻辑' },
  { id: 'S10', dim: 'pro', text: '我能判断房源附着的学区、户籍等权益' },
  { id: 'S11', dim: 'pro', text: '我掌握房贷利率与月供的测算方法' },
  { id: 'S12', dim: 'pro', text: '我能识别中介费合规收取的标准' },
  { id: 'S13', dim: 'pro', text: '我了解住宅、公寓、商办等不同物业类型的差异' },
  { id: 'S14', dim: 'pro', text: '我能说明满五唯一等税收优惠的适用条件' },
  { id: 'S15', dim: 'pro', text: '我持续跟踪本地楼市政策变化并同步给客户' },
  // 规范 ×15
  { id: 'S16', dim: 'norm', text: '我接委托先出书面定价报告书，而非只做口头估价' },
  { id: 'S17', dim: 'norm', text: '我签署合同前完整向客户提示风险与权责' },
  { id: 'S18', dim: 'norm', text: '我严格保护客户隐私，不泄露个人与交易信息' },
  { id: 'S19', dim: 'norm', text: '我按标准流程做房源核验与产权调查' },
  { id: 'S20', dim: 'norm', text: '我如实告知房屋瑕疵，不隐瞒不利信息' },
  { id: 'S21', dim: 'norm', text: '我使用公司合规模板，而非自制不规范合同' },
  { id: 'S22', dim: 'norm', text: '我明码标价，不私下收取约定外费用' },
  { id: 'S23', dim: 'norm', text: '我主动以书面方式回报带看与进展' },
  { id: 'S24', dim: 'norm', text: '我遵循资金监管流程，不经手客户房款' },
  { id: 'S25', dim: 'norm', text: '我留存服务记录，确保过程可追溯' },
  { id: 'S26', dim: 'norm', text: '我尊重客户反悔权，不施压逼定' },
  { id: 'S27', dim: 'norm', text: '我合规使用客户数据，不滥用或外传' },
  { id: 'S28', dim: 'norm', text: '我按规范做带看登记与安全提醒' },
  { id: 'S29', dim: 'norm', text: '我清晰区分居间与代理的法律责任' },
  { id: 'S30', dim: 'norm', text: '我定期参加合规培训并更新知识' },
  // 沟通 ×15
  { id: 'S31', dim: 'comm', text: '我先倾听再给建议，不抢话打断客户' },
  { id: 'S32', dim: 'comm', text: '我能用客户听得懂的语言解释专业术语' },
  { id: 'S33', dim: 'comm', text: '我能识别客户性格频道并切换沟通方式' },
  { id: 'S34', dim: 'comm', text: '我面对客户异议先共情，再回应' },
  { id: 'S35', dim: 'comm', text: '我能结构化表达房源的优劣势' },
  { id: 'S36', dim: 'comm', text: '我会确认客户核心诉求，而非自行假设' },
  { id: 'S37', dim: 'comm', text: '我能在价格谈判中保持中立与专业' },
  { id: 'S38', dim: 'comm', text: '我会用书面方式固化关键信息，避免误解' },
  { id: 'S39', dim: 'comm', text: '我能安抚焦虑型客户的情绪' },
  { id: 'S40', dim: 'comm', text: '我避免夸张承诺，只说可兑现的话' },
  { id: 'S41', dim: 'comm', text: '我会复述客户要求，以确保理解一致' },
  { id: 'S42', dim: 'comm', text: '我能在多决策人场景中协调不同意见' },
  { id: 'S43', dim: 'comm', text: '我善用提问引导客户澄清真实需求' },
  { id: 'S44', dim: 'comm', text: '我能把复杂流程讲成清晰的步骤' },
  { id: 'S45', dim: 'comm', text: '我接受客户的批评，并转化为服务改进' },
  // 工具 ×15
  { id: 'S46', dim: 'tool', text: '我熟练使用房源管理系统录入与检索' },
  { id: 'S47', dim: 'tool', text: '我能用数据看板向客户展示行情走势' },
  { id: 'S48', dim: 'tool', text: '我会制作带真实依据的客户专属策展包' },
  { id: 'S49', dim: 'tool', text: '我用客户档案沉淀客户偏好与决策信号' },
  { id: 'S50', dim: 'tool', text: '我能用 VR / 视频辅助客户远程看房' },
  { id: 'S51', dim: 'tool', text: '我掌握线上签约与电子合同工具' },
  { id: 'S52', dim: 'tool', text: '我会用地图工具分析通勤与周边配套' },
  { id: 'S53', dim: 'tool', text: '我能生成税费、月供试算表' },
  { id: 'S54', dim: 'tool', text: '我与团队用协作工具同步服务进度' },
  { id: 'S55', dim: 'tool', text: '我善用知识库检索真实法源依据' },
  { id: 'S56', dim: 'tool', text: '我维护客户分层运营，不遗漏关键客户' },
  { id: 'S57', dim: 'tool', text: '我会用对比表呈现决策选项' },
  { id: 'S58', dim: 'tool', text: '我定期备份客户与服务数据' },
  { id: 'S59', dim: 'tool', text: '我能用模板快速产出标准报告' },
  { id: 'S60', dim: 'tool', text: '我持续学习新工具，提升服务效率' },
  // 素养 ×15
  { id: 'S61', dim: 'qual', text: '我宁可少成交，也不误导客户' },
  { id: 'S62', dim: 'qual', text: '我对客户承诺的事，一定兑现' },
  { id: 'S63', dim: 'qual', text: '我面对繁琐需求保持耐心，不敷衍' },
  { id: 'S64', dim: 'qual', text: '我主动预判风险，并提前告知客户' },
  { id: 'S65', dim: 'qual', text: '我尊重客户边界，不越界打扰' },
  { id: 'S66', dim: 'qual', text: '我把客户利益放在短期业绩之前' },
  { id: 'S67', dim: 'qual', text: '我坦诚告知自己不擅长的部分，并转介专业资源' },
  { id: 'S68', dim: 'qual', text: '我维护行业声誉，不诋毁同行' },
  { id: 'S69', dim: 'qual', text: '我持续复盘服务失误并改进' },
  { id: 'S70', dim: 'qual', text: '我对老年、弱势客户额外用心' },
  { id: 'S71', dim: 'qual', text: '我遵守职业操守，不收灰色费用' },
  { id: 'S72', dim: 'qual', text: '我主动做售后，而非成交即结束' },
  { id: 'S73', dim: 'qual', text: '我保护交易中弱势一方的知情权' },
  { id: 'S74', dim: 'qual', text: '我对自己经手的每一单负责到底' },
  { id: 'S75', dim: 'qual', text: '我把「一次委托、终生服务」落到日常行动' }
]

// 题库按类型聚合
export const ASSESS_SETS = {
  living: { title: '住得好测评', dims: livingDims, questions: livingQuestions, total: livingQuestions.length },
  service: { title: '服务者能力测评', dims: serviceDims, questions: serviceQuestions, total: serviceQuestions.length }
}
