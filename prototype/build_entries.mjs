// build_entries.mjs —— #185 词条数据接入管道（fengsheng-shengge/fengsheng-tasks）
// 输入: data/entries_mvp_subset.json（顶层 {entries:[...], meta:{...}}，字段全称不缩写）
// 输出: outputs/entries_data.js（window.__FENGSHENG_ENTRIES__ = {decoder:[],see:[],nego:[]}）
// 用法: node build_entries.mjs [输入json] [输出js]
import * as fs from 'fs';

const inPath = process.argv[2] || '/Users/ke/WorkBuddy/Claw/outputs/data/entries_mvp_subset.json';
const outPath = process.argv[3] || '/Users/ke/WorkBuddy/Claw/outputs/entries_data.js';

const rawObj = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const raw = Array.isArray(rawObj) ? rawObj : (rawObj.entries || []);
if (!Array.isArray(raw) || !raw.length) { console.error('✗ 输入未解析到词条数组'); process.exit(1); }

// ===== 一行映射逻辑：subScene 中文值 → 三组 =====
// decoder(客户解码/了解)  |  see(带看匹配/认知)  |  nego(谈判签约/成交)
// 依据语义 + 业务阶段(签约前/签约中)划分，覆盖全部 7 个 subScene，合计 570 条。
const SCENE_GROUP = {
  '需求确认': 'decoder',   // 签约前·读懂客户真实诉求
  '资格审查': 'decoder',   // 签约前·资格/预算核验
  '房源匹配': 'see',       // 签约前·带看匹配体验
  '价格评估': 'see',       // 签约前·带看中的价格认知
  '合同条款': 'nego',      // 签约中·谈判签约
  '付款方式': 'nego',      // 签约中·付款谈判
  '定金订金': 'nego'       // 签约中·定金斡旋
};
function groupOf(e) {
  if (SCENE_GROUP[e.subScene]) return SCENE_GROUP[e.subScene];
  // 兜底：签约中一律 nego，其余 decoder
  return (e.domain === '签约中') ? 'nego' : 'decoder';
}

// subScene → 图标（视觉区分，纯展示用）
const SUB_ICON = {
  '需求确认': '📋', '资格审查': '💰', '房源匹配': '🎯', '价格评估': '⚖️',
  '合同条款': '📑', '付款方式': '💳', '定金订金': '🔖'
};

// 字段映射：#185 全称 → 原型简写键（兼容缺字段、兜底）
function mapEntry(e) {
  const cp = e.corePoint != null
    ? (Array.isArray(e.corePoint) ? e.corePoint : [e.corePoint])
    : (e.cp || []);
  const ola = e.oneLineAnswer != null ? e.oneLineAnswer : (e.ola || '');
  const cq = e.consumerQ != null ? e.consumerQ : (e.cq || e.name || '');
  // 关键：道法术器层在 tags.layer（dao/fa/shu/qi），不是 entryType（TERM/LAW…）
  const layer = (e.tags && e.tags.layer) || e.etype || '';
  const source = e.source || e.dataSource || '风声知识底座';
  const detail = e.def || cp.join('；');
  const consumerBenefit = e.consumerBenefit || '';
  return {
    id: e.id,
    domain: e.domain,
    subScene: e.subScene,
    ico: SUB_ICON[e.subScene] || (e.ico || '📌'),
    name: e.name || e.entryName || e.title || '',
    alias: e.alias || [],
    cq,                                   // 客户视角提问
    oq: e.ownerQ != null ? e.ownerQ : '', // 真实数据无业主视角，留空(不显示业主tab)
    ola,                                  // 一句话答案
    sev: e.severity || 'soft',
    etype: layer,                         // 道法术器层（驱动标签+openSheet筛选）
    entryType: e.entryType || '',         // 词条种类(TERM/LAW…) 仅记录
    tags: {
      clientType: (e.tags && e.tags.clientType) || 'buyer',
      stage: (e.tags && e.tags.stage) || '',
      layer
    },
    cp,
    detail,
    def: e.def || '',
    consumerBenefit,
    legalRef: e.legalRef || '',
    source,
    use: ['自用', '客户', '朋友圈'],       // 知识底座默认全渠道可用，确保分享/朋友圈功能可演示
    scene: e.scene || (e.subScene ? (e.domain + '·' + e.subScene) : ''),
    cardClient: consumerBenefit || ola,    // 客户知识卡正文（真实数据，不臆造）
    cardMoment: ola || consumerBenefit,    // 朋友圈文案正文（真实数据）
    relatedEntries: e.relatedEntries || [],
    priority: e.priority || '',
    lastVerified: e.lastVerified || ''
  };
}

const grouped = { decoder: [], see: [], nego: [] };
const unknown = new Set();
for (const e of raw) {
  grouped[groupOf(e)].push(mapEntry(e));
  if (!SCENE_GROUP[e.subScene]) unknown.add(e.subScene || '(空)');
}

const js = '// 自动生成：由 fengsheng-tasks data/entries_mvp_subset.json 映射为原型 ENTRIES 结构\n'
  + '// 生成时间 ' + new Date().toISOString() + '\n'
  + '// 词条总数 ' + raw.length + ' | decoder ' + grouped.decoder.length
  + ' / see ' + grouped.see.length + ' / nego ' + grouped.nego.length + '\n'
  + '// subScene→组 映射: 需求确认/资格审查→decoder, 房源匹配/价格评估→see, 合同条款/付款方式/定金订金→nego\n'
  + 'window.__FENGSHENG_ENTRIES__ = ' + JSON.stringify(grouped, null, 2) + ';\n';
fs.writeFileSync(outPath, js);

const total = grouped.decoder.length + grouped.see.length + grouped.nego.length;
console.log('✓ built ->', outPath);
console.log('  decoder(客户解码):', grouped.decoder.length,
  '| see(带看匹配):', grouped.see.length,
  '| nego(谈判签约):', grouped.nego.length, '| total:', total);
if (unknown.size) console.log('  ⚠ 未命中 subScene 映射(已兜底):', [...unknown].join(', '));
if (total !== raw.length) { console.log('  ⚠ 数量不一致! 输入', raw.length, '输出', total); process.exit(2); }
console.log('  字段校验: etype取自tags.layer(dao/fa/shu/qi) | 图标按subScene | 客户卡/朋友圈取真实consumerBenefit/oneLineAnswer');
