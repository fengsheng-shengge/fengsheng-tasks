/* eslint-disable */
/**
 * domain-config.js · 唯一可信数据源 V1.3
 * IIFE → window.DOMAIN_CONFIG
 * 
 * V1.3 改动:
 * - 每个 DIMENSION 加 aliases 数组，兼容旧页面硬编码维度名
 *   TRANSACTION: ACQUISITION/INSIGHT/SOLUTION/NEGOTIATION/FULFILLMENT/AFTERSALE/DIGITAL
 *   DECOR: DSGN-1~4, PROJ-5~8, SOFT-1~5
 * - 新增 resolveDimId(alias, domain) + getDimByAlias(alias, domain) 工具函数
 * - DECOR 维度名称更新为 home-design 真实语义（户型诊断/方案呈现/透明报价/合同解读/施工管理/验收标准/问题处置）
 * 
 * Person.js 按 dim.id (DIM-1~DIM-7) 聚合 → 各页面用 resolveDimId 翻译后消费 → 数据打通
 */
(function(global) {
  'use strict';

  // ========== 领域元数据 ==========
  const DOMAINS = {
    TRANSACTION: { name:'房产交易服务', tagline:'从获客到复购的全链路专业服务', icon:'🏠', color:'#1a3d24' },
    DECOR:       { name:'全案家装服务', tagline:'从设计到交付的全案拎包入住', icon:'🛠️', color:'#8a5a2b' },
  };

  // ========== 7 硬技能维度 ==========
  // aliases: 旧页面硬编码的维度名，resolveDimId 会反向查
  const DIMENSIONS = {
    TRANSACTION: [
      { id:'DIM-1', name:'获客触达',   emoji:'📣', eth:'profe',   weight:0.15,
        aliases:['ACQUISITION','获客','房源开发','房源开拓','业主委托'] },
      { id:'DIM-2', name:'需求洞察',   emoji:'👁️', eth:'judge',   weight:0.15,
        aliases:['INSIGHT','洞察','客户解码','客户需求','需求挖掘'] },
      { id:'DIM-3', name:'专业方案',   emoji:'📐', eth:'profe',   weight:0.15,
        aliases:['SOLUTION','方案','带看讲解','专业推荐','方案匹配'] },
      { id:'DIM-4', name:'带看谈判',   emoji:'🤝', eth:'empathy', weight:0.15,
        aliases:['NEGOTIATION','谈判','斡旋','议价','带看技巧'] },
      { id:'DIM-5', name:'交易履约',   emoji:'📋', eth:'resp',    weight:0.15,
        aliases:['FULFILLMENT','履约','签约','过户','交易流程'] },
      { id:'DIM-6', name:'售后复购',   emoji:'🔄', eth:'empathy', weight:0.10,
        aliases:['AFTERSALE','复购','老客','售后','客户维护'] },
      { id:'DIM-7', name:'数字化协同', emoji:'🤖', eth:'profe',   weight:0.15,
        aliases:['DIGITAL','数字化','AI','工具','系统协同'] },
    ],
    DECOR: [
      { id:'DIM-1', name:'户型诊断',   emoji:'🔍', eth:'judge',   weight:0.12,
        aliases:['DSGN-1','户型','量房','户型分析','承重墙'] },
      { id:'DIM-2', name:'方案呈现',   emoji:'🎨', eth:'empathy', weight:0.14,
        aliases:['DSGN-2','平面','效果图','软装搭配','VR展示'] },
      { id:'DIM-3', name:'透明报价',   emoji:'💰', eth:'profe',   weight:0.14,
        aliases:['DSGN-3','报价','分项','三档档次','预算'] },
      { id:'DIM-4', name:'合同解读',   emoji:'📜', eth:'resp',    weight:0.12,
        aliases:['DSGN-4','合同','闭口价','增项条款','质保'] },
      { id:'DIM-5', name:'施工管理',   emoji:'🏗️', eth:'resp',    weight:0.15,
        aliases:['PROJ-5','施工','工期','材料进场','工种衔接'] },
      { id:'DIM-6', name:'验收标准',   emoji:'✅', eth:'profe',   weight:0.17,
        aliases:['PROJ-6','验收','标准','国家规范','世赛标准'] },
      { id:'DIM-7', name:'数字化工具', emoji:'🤖', eth:'profe',   weight:0.16,
        aliases:['PROJ-7','PROJ-8','物业','问题处置','数字化','协同工具'] },
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
  const ROLES = {
    TRANSACTION: [
      { id:'R-agent',  name:'房产经纪人',   icon:'🏠', primaryDims:['DIM-1','DIM-2','DIM-3','DIM-4'],
        posKey:'BROKER' },
      { id:'R-lease',   name:'租赁管家',    icon:'🏢', primaryDims:['DIM-1','DIM-2','DIM-4','DIM-5'],
        posKey:'LEASE' },
      { id:'R-newhome', name:'新房置业顾问', icon:'🏗️', primaryDims:['DIM-1','DIM-3','DIM-5','DIM-7'],
        posKey:'NEW_HOME' },
      { id:'R-senior',  name:'高级交易主管', icon:'📋', primaryDims:['DIM-5','DIM-6','DIM-7'] },
    ],
    DECOR: [
      { id:'R-design',  name:'全案设计师', icon:'🎨', primaryDims:['DIM-1','DIM-2','DIM-3','DIM-4'],
        posKey:'DSGN' },
      { id:'R-project', name:'项目经理',   icon:'📋', primaryDims:['DIM-4','DIM-5','DIM-6','DIM-7'],
        posKey:'MGR' },
      { id:'R-foreman', name:'工长',       icon:'🔧', primaryDims:['DIM-5','DIM-6','DIM-7'],
        posKey:'PROJ' },
      { id:'R-trades',  name:'技术工人',   icon:'⚒️', primaryDims:['DIM-5','DIM-7'],
        posKey:'TRADES' },
    ],
  };

  // ========== 5 软技能维度 ==========
  const SOFT_DIMS = {
    TRANSACTION: ['共情能力','判断能力','责任担当','职业素养','服务意识'],
    DECOR:       ['共情能力','判断能力','责任担当','职业素养','服务意识'],
  };

  // ========== Alias 反向索引（延迟构建） ==========
  let _aliasIndex = null;
  function _buildAliasIndex() {
    const idx = {};
    Object.keys(DIMENSIONS).forEach(domain => {
      idx[domain] = {};
      DIMENSIONS[domain].forEach(dim => {
        // dim.id 本身也是 alias
        idx[domain][dim.id.toLowerCase()] = dim.id;
        (dim.aliases || []).forEach(a => {
          idx[domain][a.toLowerCase()] = dim.id;
        });
      });
    });
    return idx;
  }

  // ========== 核心工具函数（V1.3 新增） ==========

  /**
   * 把旧硬编码维度名（ACQUISITION/DSGN-1 等）翻译为 SSOT dim.id
   * @param {string} alias - 旧维度名
   * @param {string} domain - TRANSACTION | DECOR
   * @returns {string|null} dim.id 或 null
   */
  function resolveDimId(alias, domain) {
    if (!alias) return null;
    if (!_aliasIndex) _aliasIndex = _buildAliasIndex();
    domain = domain || getCurrentDomain();
    const idx = _aliasIndex[domain];
    if (!idx) return null;
    // 直接命中
    const hit = idx[alias.toLowerCase()];
    if (hit) return hit;
    // 模糊：alias 包含 dim.id（如 "DIM-1" 包含在 "ACQUISITION_DIM-1"）
    // 或 alias 包含在某个 alias 里
    for (const [k, v] of Object.entries(idx)) {
      if (alias.toLowerCase().includes(k) || k.includes(alias.toLowerCase())) {
        return v;
      }
    }
    return null;
  }

  /**
   * 把旧硬编码维度名翻译为完整 dim 对象
   * @param {string} alias - 旧维度名
   * @param {string} domain
   * @returns {object|null} { id, name, emoji, eth, weight, aliases }
   */
  function getDimByAlias(alias, domain) {
    const id = resolveDimId(alias, domain);
    if (!id) return null;
    const dims = DIMENSIONS[domain || getCurrentDomain()];
    return dims.find(d => d.id === id) || null;
  }

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

  // ========== 基础工具函数 ==========
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
  function getDimById(id, domain) {
    const dims = getDims(domain);
    return dims.find(d => d.id === id) || null;
  }

  // 导出到 window
  global.DOMAIN_CONFIG = {
    DOMAINS: DOMAINS,
    DIMENSIONS: DIMENSIONS,
    ETHICS: ETHICS,
    ROLES: ROLES,
    SOFT_DIMS: SOFT_DIMS,
    // V1.3 新增
    resolveDimId: resolveDimId,
    getDimByAlias: getDimByAlias,
    getDimById: getDimById,
    getSkillCards: getSkillCards,
    getCurrentDomain: getCurrentDomain,
    getDims: getDims,
    getRoles: getRoles,
    getDomainMeta: getDomainMeta,
    getEthicsById: getEthicsById,
  };
})(typeof window !== 'undefined' ? window : globalThis);
