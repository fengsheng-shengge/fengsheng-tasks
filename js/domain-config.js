/* eslint-disable */
/**
 * domain-config.js · 唯一可信数据源
 * IIFE → window.DOMAIN_CONFIG
 * 所有页面从这里读领域配置，绝不硬编码维度名/岗位/素养
 */
(function(global) {
  'use strict';

  // ========== 领域元数据 ==========
  const DOMAINS = {
    TRANSACTION: { name:'房产交易服务', tagline:'从获客到复购的全链路专业服务', icon:'🏠', color:'#1a3d24' },
    DECOR:       { name:'全案家装服务', tagline:'从设计到交付的全案拎包入住', icon:'🛠️', color:'#8a5a2b' },
  };

  // ========== 7 硬技能维度 ==========
  // eth: 四素养映射 (profe/empathy/judge/resp)
  // weight: 能力聚合权重（Person 用）
  const DIMENSIONS = {
    TRANSACTION: [
      { id:'DIM-1', name:'获客触达',   emoji:'📣', eth:'profe',   weight:0.15 },
      { id:'DIM-2', name:'需求洞察',   emoji:'👁️', eth:'judge',   weight:0.15 },
      { id:'DIM-3', name:'专业方案',   emoji:'📐', eth:'profe',   weight:0.15 },
      { id:'DIM-4', name:'带看谈判',   emoji:'🤝', eth:'empathy', weight:0.15 },
      { id:'DIM-5', name:'交易履约',   emoji:'📋', eth:'resp',    weight:0.15 },
      { id:'DIM-6', name:'售后复购',   emoji:'🔄', eth:'empathy', weight:0.10 },
      { id:'DIM-7', name:'数字化协同', emoji:'🤖', eth:'profe',   weight:0.15 },
    ],
    DECOR: [
      { id:'DIM-1', name:'品牌获客',   emoji:'📣', eth:'profe',   weight:0.10 },
      { id:'DIM-2', name:'住户画像',   emoji:'👁️', eth:'judge',   weight:0.12 },
      { id:'DIM-3', name:'全案设计',   emoji:'📐', eth:'profe',   weight:0.20 },
      { id:'DIM-4', name:'方案呈现',   emoji:'🎨', eth:'empathy', weight:0.12 },
      { id:'DIM-5', name:'施工交底',   emoji:'🏗️', eth:'resp',    weight:0.15 },
      { id:'DIM-6', name:'交付兑现',   emoji:'✅', eth:'resp',    weight:0.15 },
      { id:'DIM-7', name:'数字化工具', emoji:'🤖', eth:'profe',   weight:0.16 },
    ],
  };

  // ========== 四素养 ==========
  const ETHICS = [
    { id:'profe',   name:'专业', emoji:'🎯', color:'#1a3d24', desc:'掌握领域硬技能，循证服务而非凭经验' },
    { id:'empathy', name:'共情', emoji:'💚', color:'#2c6b3f', desc:'听懂客户没说出口的情绪和深层需求' },
    { id:'judge',   name:'判断', emoji:'⚖️', color:'#8a7040', desc:'风险识别、优先级排序、专业决策' },
    { id:'resp',    name:'担责', emoji:'🛡️', color:'#c8423f', desc:'出了问题不推诿敢兜底，信守承诺边界' },
  ];

  // ========== 服务岗位 ==========
  // primaryDims: 该岗位最核心的硬技能维度
  const ROLES = {
    TRANSACTION: [
      { id:'R-agent',  name:'房产经纪人',   icon:'🏠', primaryDims:['DIM-1','DIM-2','DIM-3','DIM-4'] },
      { id:'R-senior', name:'高级交易主管', icon:'📋', primaryDims:['DIM-5','DIM-6','DIM-7'] },
    ],
    DECOR: [
      { id:'R-design',  name:'全案设计师', icon:'🎨', primaryDims:['DIM-3','DIM-4','DIM-2','DIM-7'] },
      { id:'R-project', name:'项目经理',   icon:'📋', primaryDims:['DIM-5','DIM-6','DIM-2','DIM-7'] },
      { id:'R-foreman', name:'工长',       icon:'🔧', primaryDims:['DIM-5','DIM-6','DIM-7'] },
      { id:'R-trades',  name:'技术工人',   icon:'⚒️', primaryDims:['DIM-5','DIM-7'] },
    ],
  };

  // ========== 5 软技能维度 ==========
  const SOFT_DIMS = {
    TRANSACTION: ['共情能力','判断能力','责任担当','职业素养','服务意识'],
    DECOR:       ['共情能力','判断能力','责任担当','职业素养','服务意识'],
  };

  // ========== SkillCard 自动生成 ==========
  function getSkillCards(domain) {
    const dims = DIMENSIONS[domain];
    const roles = ROLES[domain];
    return dims.flatMap(d =>
      ETHICS.map(eth =>
        roles.map(r => ({
          id: `SC-${domain}-${d.id}-${eth.id}-${r.id}`,
          dimId: d.id,    dimName: d.name,
          ethId: eth.id,  ethName: eth.name,
          roleId: r.id,   roleName: r.name,
          title: `${r.name}·${d.name}·${eth.name}`,
          isPrimary: r.primaryDims.includes(d.id),
        }))
      ).flat()
    );
  }

  // ========== 工具函数 ==========
  function getCurrentDomain() {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('domain') || 'TRANSACTION';
    } catch(e) { return 'TRANSACTION'; }
  }
  function getDims(domain) {
    domain = domain || getCurrentDomain();
    return DIMENSIONS[domain] || DIMENSIONS.TRANSACTION;
  }
  function getRoles(domain) {
    domain = domain || getCurrentDomain();
    return ROLES[domain] || ROLES.TRANSACTION;
  }
  function getDomainMeta(domain) {
    domain = domain || getCurrentDomain();
    return DOMAINS[domain] || DOMAINS.TRANSACTION;
  }
  function getEthicsById(id) {
    return ETHICS.find(e => e.id === id);
  }

  // 导出到 window
  global.DOMAIN_CONFIG = {
    DOMAINS: DOMAINS,
    DIMENSIONS: DIMENSIONS,
    ETHICS: ETHICS,
    ROLES: ROLES,
    SOFT_DIMS: SOFT_DIMS,
    getSkillCards: getSkillCards,
    getCurrentDomain: getCurrentDomain,
    getDims: getDims,
    getRoles: getRoles,
    getDomainMeta: getDomainMeta,
    getEthicsById: getEthicsById,
  };
})(typeof window !== 'undefined' ? window : globalThis);
