#!/usr/bin/env node
/**
 * 补 4 个 GAP 知识条目到 domains/*.json
 * 对应 cap-skill-gap-report.json 的 4 个缺口
 * 同时补 entries.json 保持一致
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 4 个 GAP 类型的新增条目
const NEW_ENTRIES = [
  // CAP-SKILL-001: 客户不愿出来看房 — 场景剧本域
  {
    id: 'SS-INVITE-001',
    domain: '场景剧本',
    sceneDomain: '场景剧本',
    subScene: '带看讲解',
    name: '客户不愿出来看房怎么办？',
    alias: ['客户不愿看房', '客户不出来看房', '客户不愿出来', '客户不想看房', '客户不肯看房'],
    consumerQ: '最近想看看XX小区的房子，但客户说忙，不愿出来看房',
    consumerBenefit: '了解三个降低客户出门门槛的话术，提高邀约成功率',
    detail: '客户不愿出来看房通常有三类原因：时间紧张、怕被套路、没建立信任。经纪人需要用"三降低"话术：\n1. 降低决策门槛："您放心，这次就是带您看看小区环境，不聊价格"\n2. 降低时间成本："XX小区15分钟就能逛完，我在大门口等您"\n3. 降低心理压力："带看完全免费，看完您觉得不合适我们就不打扰了"\n核心原则：让客户觉得"我只是出去看看，不会被逼着成交"。首次邀约成功率目标 30%，用场景剧本反复演练。',
    severity: 'medium',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-001',
    caseRef: '望京南-2026Q3-邀约话术',
    cap_skills: ['CAP-SKILL-001'],
    tags: { clientType: 'buyer', stage: 'invite', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '话术模板',
    relatedEntries: ['SS-INVITE-003'],
  },
  {
    id: 'SS-INVITE-002',
    domain: '场景剧本',
    sceneDomain: '场景剧本',
    subScene: '带看讲解',
    name: '客户说"我再看看"怎么回应？',
    alias: ['我再想想', '我再对比对比', '先不看房了', '再看看别的', '暂时不考虑'],
    consumerQ: '最近买房/卖房，但对方说"我再看看"就没下文了',
    consumerBenefit: '掌握 3 种应对"我再看看"的低压力话术',
    detail: '"我再看看"背后不是真的不买/不卖，是三种隐性顾虑：\n1. 信任还没建立 → "您说得对，多看看才稳。我这有一份周边同户型成交数据，您可以参考一下"\n2. 价格/条件没达到心理预期 → "我们先不急着定。您理想价位是多少？我帮您留意"\n3. 被套路/被催促过 → "您放心，我不催您。有问题随时问我就行"\n关键：不反驳、不施压、给台阶、留钩子。',
    severity: 'medium',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-006',
    caseRef: '望京南-2026Q3-邀约话术',
    cap_skills: ['CAP-SKILL-006'],
    tags: { clientType: 'buyer', stage: 'invite', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '话术模板',
    relatedEntries: ['SS-INVITE-001'],
  },
  {
    id: 'SS-INVITE-003',
    domain: '场景剧本',
    sceneDomain: '场景剧本',
    subScene: '带看讲解',
    name: '业主不让看房/不给钥匙怎么办？',
    alias: ['业主不让看房', '不给钥匙', '不让带看', '业主不配合带看', '约不上看房时间'],
    consumerQ: '客户要看的那套房子业主不让看房，说是已经有买家了',
    consumerBenefit: '了解如何化解业主的抗拒，争取带看机会',
    detail: '业主不让看房通常基于四种顾虑：\n1. 怕被打扰 → 方案："我保证只看 15 分钟，不动您的家具"\n2. 已经有买家在谈 → 方案："我理解。如果那位买家最终没成交，方便联系我吗？我有很多客户等着"\n3. 还在犹豫要不要卖 → 方案："我完全理解。要不您先让我挂着，有诚意客户再来跟您确认"\n4. 之前被劣质客户骚扰过 → 方案："我会先筛选客户，只带真正有实力的来看"\n核心：尊重业主意愿 + 提供确定性保障 + 留好后路。',
    severity: 'medium',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-003',
    caseRef: '望京南-2026Q3-带看协调',
    cap_skills: ['CAP-SKILL-003'],
    tags: { clientType: 'seller', stage: 'invite', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '协调话术',
    relatedEntries: ['SS-INVITE-001'],
  },
  {
    id: 'SS-INVITE-004',
    domain: '场景剧本',
    sceneDomain: '场景剧本',
    subScene: '带看讲解',
    name: '带看完怎么跟进客户不被反感？',
    alias: ['带看完跟进', '带看完联系', '带看完怎么说', '跟进客户带看后'],
    consumerQ: '刚刚带客户看完房，不知道什么时候跟进比较好，说什么',
    consumerBenefit: '掌握"24小时黄金窗口"跟进法，不催但保持连接',
    detail: '带看后的跟进节奏遵循"1-2-7 法则"：\n1. 带看后 1 小时内发简讯："XX 哥/姐，今天辛苦跑一趟！有任何问题随时问我"\n2. 带看后 24 小时内发个性化信息："您说关心的装修问题，我整理了这份清单"\n3. 带看后 7 天内不主动打扰，除非有新进展\n跟进内容必须"有价值"：成交数据、新盘消息、政策变化，不能只是"考虑得怎么样了"\n关键：让客户觉得你在帮他，而不是催他。',
    severity: 'low',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-102',
    caseRef: '望京南-2026Q3-跟进方法论',
    cap_skills: ['CAP-SKILL-102'],
    tags: { clientType: 'buyer', stage: 'negotiate', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '跟进模板',
    relatedEntries: ['SS-INVITE-001'],
  },
  // CAP-SKILL-004: 客户要对比周边小区 — 带看服务域
  {
    id: 'BK-SERVICE-001',
    domain: '带看服务',
    sceneDomain: '带看服务',
    subScene: '带看服务',
    name: '客户要对比周边小区怎么办？',
    alias: ['对比下小区', '再看看别的', '周边对比', '小区对比', '选哪个小区好'],
    consumerQ: '想买房，A 小区看上了但 B 小区朋友推荐，不知道选哪个',
    consumerBenefit: '拿到 3 维对比表模板，专业不专业一看就知道',
    detail: '主动给对比表，而不是被动回答"各有优缺点"。\n对比维度建议：\n1. 价格与增值：均价、近 1 年涨幅、同区域排名\n2. 居住品质：容积率、绿化率、楼龄、户型分布\n3. 配套：学校、医院、地铁、商业 4 类各打勾\n4. 社区氛围：业主画像、物业评级、邻里评价（可通过业主群了解）\n5. 风险提示：哪个小区有安置房、哪个小区最近在施工\n输出方式：做成 Excel/手写表格，当面一起勾选。客户会觉得"你考虑得比我还细"。',
    severity: 'low',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-004',
    caseRef: '望京南-2026Q3-带看对比',
    cap_skills: ['CAP-SKILL-004'],
    tags: { clientType: 'buyer', stage: 'market', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '对比模板',
    relatedEntries: ['BK-SERVICE-002'],
  },
  {
    id: 'BK-SERVICE-002',
    domain: '带看服务',
    sceneDomain: '带看服务',
    subScene: '带看服务',
    name: '带看动线怎么设计客户体验最好？',
    alias: ['带看怎么逛', '看房子顺序', '带看路线', '带看动线'],
    consumerQ: '想买房，但每次看房经纪人都乱带，感觉没重点',
    consumerBenefit: '理解价值点呈现顺序：先触后证，体验优先',
    detail: '好的带看动线遵循"先公共区域 → 再楼体 → 最后室内"的价值点呈现：\n1. 小区大门口：展示保安、绿化、公共设施（2 分钟）\n2. 楼栋大堂：展示电梯、楼道、邻居素质（2 分钟）\n3. 室内：先客厅再卧室最后厨房（重点展示采光、通风、装修品质）\n4. 窗户/阳台：指给客户看景观/视野/朝向\n每到一个点不说"这个不错"，说"您看这个，下午 3 点阳光还能照进来，冬天不用开灯"\n原则：让客户自己"发现"价值，而不是被"灌输"。',
    severity: 'low',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-004',
    caseRef: '望京南-2026Q3-带看动线',
    cap_skills: ['CAP-SKILL-004'],
    tags: { clientType: 'buyer', stage: 'invite', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '带看脚本',
    relatedEntries: ['BK-SERVICE-001'],
  },
  // CAP-SKILL-602: 成交后感谢客户维护关系 — 居住中域
  {
    id: 'LV-AFTER-001',
    domain: '居住中',
    sceneDomain: '居住中',
    subScene: '邻里关系',
    name: '成交后怎么感谢客户、维护关系？',
    alias: ['感谢客户', '感谢业主', '卖完房感谢', '成交后感谢', '送点什么给客户'],
    consumerQ: '朋友/亲戚刚通过你买完房，不知道怎么感谢比较合适',
    consumerBenefit: '让成交不是终点，而是转介绍的起点',
    detail: '成交后的感谢分"三档+三不送"：\n三档感谢：\n1. 轻量档（200 元内）：定制钥匙扣+手写贺卡"恭喜安家"\n2. 中档位（500 元内）：品牌家居好物（绿植/茶具/香薰）\n3. 重量档（1000 元内）：家电/保洁年卡/绿植租赁年卡\n三不送：\n- 不送太贵重的（超 1000 容易显得"图他钱"）\n- 不送没用的摆件（客户真的不缺）\n- 不送现金卡（失去温度）\n关键：写一张手写贺卡。字丑没关系，手写 = 用心。\n后续维护节奏：\n- 成交后第 7 天：发消息"最近入住感觉怎么样？有问题随时问我"\n- 成交后 3 个月：约"喝杯咖啡，聊聊你新家的装修"\n- 成交后 6 个月：发"最近小区成交价更新了，给您参考"\n- 每年春节：发专属拜年短信（不是群发模板）',
    severity: 'low',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-602',
    caseRef: '望京南-2026Q3-客户维护',
    cap_skills: ['CAP-SKILL-602'],
    tags: { clientType: 'seller', stage: 'closing', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '维护模板',
    relatedEntries: ['LV-AFTER-002'],
  },
  {
    id: 'LV-AFTER-002',
    domain: '居住中',
    sceneDomain: '居住中',
    subScene: '居住安全',
    name: '怎么让老客户主动转介绍？',
    alias: ['客户转介绍', '老客户推荐', '让客户帮我介绍', '怎么让客户带客户'],
    consumerQ: '想让通过我成交的客户介绍朋友过来，但不好意思开口',
    consumerBenefit: '理解转介绍的本质：不是"拉人"，是"创造价值后自然发生"',
    detail: '转介绍的底层逻辑是"价值交换 → 信任传递 → 口碑传播"：\n1. 先做价值：给老客户"超预期"的体验（比如免费帮验房、帮装修、帮出租）\n2. 再做钩子："张哥，您最近有没有朋友在看房子？我这边手里几套精品，可以让他先看看"\n3. 给动力：转介绍成功后，给双方都送一份感谢礼（不能只给介绍人）\n4. 不勉强：如果客户没动静，绝对不催。过 6 个月再提一次\n关键：不要只在自己需要客户时才想起老客户。平时发点有价值的内容（小区成交数据、政策变化、装修小贴士），让客户觉得"这个人靠谱，不是只想着赚我钱"\n参考：望京南李姐 2026Q3 30% 成交来自老客户转介绍。',
    severity: 'low',
    priority: 'P1',
    source: '销冠经验·望京南李姐',
    entryType: 'PROC',
    dataRef: 'CAP-SKILL-602',
    caseRef: '望京南-2026Q3-转介绍方法论',
    cap_skills: ['CAP-SKILL-602'],
    tags: { clientType: 'seller', stage: 'closing', layer: 'qi' },
    lastVerified: '2026-10-30',
    dataSource: 'fengsheng-sop',
    toolType: '运营策略',
    relatedEntries: ['LV-AFTER-001'],
  },
];

// 写入 domains 文件
console.log('=== 补 GAP 条目 ===');
console.log(`新增 ${NEW_ENTRIES.length} 条`);

NEW_ENTRIES.forEach(entry => {
  const domain = entry.domain;
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'domains', '_manifest.json'), 'utf8'));
  const filename = manifest.files[domain];
  const domPath = path.join(ROOT, 'data', 'domains', filename);

  if (!fs.existsSync(domPath)) {
    console.log(`⚠️ ${domPath} 不存在`);
    return;
  }

  const domEntries = JSON.parse(fs.readFileSync(domPath, 'utf8'));

  // 检查是否已存在
  const exists = domEntries.some(e => e.id === entry.id);
  if (exists) {
    console.log(`  ⚠️ ${entry.id} 已存在，跳过`);
    return;
  }

  domEntries.push(entry);
  fs.writeFileSync(domPath, JSON.stringify(domEntries, null, 2), 'utf8');
  console.log(`  ✅ ${entry.id} → ${domain} (${domEntries.length} 条)`);
});

// 同步更新 manifest
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'domains', '_manifest.json'), 'utf8'));
manifest.total += NEW_ENTRIES.length;
manifest.total_entries += NEW_ENTRIES.length;
NEW_ENTRIES.forEach(e => {
  manifest.counts[e.domain] = (manifest.counts[e.domain] || 0) + 1;
});
fs.writeFileSync(path.join(ROOT, 'data', 'domains', '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\nmanifest total: ${manifest.total}`);
console.log(`counts 更新:`);
NEW_ENTRIES.forEach(e => console.log(`  ${e.domain}: ${manifest.counts[e.domain]}`));
console.log(`\n✅ GAP 条目补完`);
