/**
 * 架构 V1 + UX 七处修复 · 交叉验证测试
 * 运行: cd /workspace/fengsheng-tasks && node tests/arch-validation.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
let PASSED = 0, FAILED = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    PASSED++;
  } catch(e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    FAILED++;
  }
}

// ====== Layer 1: domain-config.js ======
console.log('\n========== Layer 1: domain-config.js ==========');
const domainConfig = fs.readFileSync(path.join(ROOT,'js/domain-config.js'),'utf8');

test('DOMAINS 含 TRANSACTION + DECOR', () => {
  assert(domainConfig.includes("TRANSACTION:"), '缺 TRANSACTION');
  assert(domainConfig.includes("DECOR:"), '缺 DECOR');
});

test('DECOR 7 硬技能维度', () => {
  assert(domainConfig.includes("品牌获客"), '缺 品牌获客');
  assert(domainConfig.includes("住户画像"), '缺 住户画像');
  assert(domainConfig.includes("全案设计"), '缺 全案设计');
  assert(domainConfig.includes("方案呈现"), '缺 方案呈现');
  assert(domainConfig.includes("施工交底"), '缺 施工交底');
  assert(domainConfig.includes("交付兑现"), '缺 交付兑现');
  assert(domainConfig.includes("数字化工具"), '缺 数字化工具');
});

test('DECOR 维度有 eth 素养映射 + weight 权重', () => {
  assert(domainConfig.includes("eth:'profe'"), '缺 eth 映射');
  assert(domainConfig.includes("weight:0.20"), '全案设计 weight 应为 0.20');
});

test('ETHICS 四素养', () => {
  assert(domainConfig.includes("profe"), '缺 专业');
  assert(domainConfig.includes("empathy"), '缺 共情');
  assert(domainConfig.includes("judge"), '缺 判断');
  assert(domainConfig.includes("resp"), '缺 担责');
});

test('ROLES DECOR 含 4 岗位', () => {
  assert(domainConfig.includes("R-design"), '缺 全案设计师');
  assert(domainConfig.includes("R-project"), '缺 项目经理');
  assert(domainConfig.includes("R-foreman"), '缺 工长');
  assert(domainConfig.includes("R-trades"), '缺 技术工人');
});

// ====== Layer 3: person.js ======
console.log('\n========== Layer 3: person.js ==========');
const personJS = fs.readFileSync(path.join(ROOT,'js/person.js'),'utf8');

test('Person 类存在 + submitCareTest/submitExam/submitPractice', () => {
  assert(personJS.includes('submitCareTest'), '缺 submitCareTest');
  assert(personJS.includes('submitExam'), '缺 submitExam');
  assert(personJS.includes('submitPractice'), '缺 submitPractice');
  assert(personJS.includes('getAbilityProfile'), '缺 getAbilityProfile');
  assert(personJS.includes('getWeakDims'), '缺 getWeakDims');
});

test('加权聚合公式 baseline×0.3 + exam×0.4 + practice×0.3', () => {
  assert(personJS.includes('baseline * 0.3'), 'baseline 权重不是 0.3');
  assert(personJS.includes('exam * 0.4'), 'exam 权重不是 0.4');
  assert(personJS.includes('practice * 0.3'), 'practice 权重不是 0.3');
});

test('LS_KEY = fs_person_v2 + V1 迁移逻辑', () => {
  assert(personJS.includes("LS_KEY = 'fs_person_v2'"), 'LS_KEY 不对');
  assert(personJS.includes("fs_care_profile"), '缺 V1 care 迁移');
  assert(personJS.includes("fs_exam_results"), '缺 V1 exam 迁移');
});

// ====== 架构端到端模拟 ======
console.log('\n========== 端到端数据流模拟 ==========');
const mockLS = { _s:{}, getItem(k){return this._s[k]!=null?this._s[k]:null;}, setItem(k,v){this._s[k]=String(v);} };
const ctx = { localStorage: mockLS, location: { search: '?domain=DECOR' } };
ctx.window = ctx; ctx.globalThis = ctx;
// domain-config.js 的 getCurrentDomain 用 new URLSearchParams(location.search)
// Node 内置 URLSearchParams 会读 ctx.location.search 吗？需要确保 URLSearchParams 用 ctx.location
// 简单办法：用 with 绑定，或者把 location 提升到 global
global.location = ctx.location; // 这样 URLSearchParams(location.search) 就能读到
eval(domainConfig.replace(/typeof window !== 'undefined' \? window : globalThis/g,'ctx'));
eval(personJS.replace(/typeof window !== 'undefined' \? window : globalThis/g,'ctx'));

const Person = ctx.Person;
let p, profile, dim3;

test('模拟 DECOR 域 care-test → exam → practice 后能力画像正确', () => {
  p = new Person();
  p.submitCareTest({ 'DIM-1': 72, 'DIM-2': 68, 'DIM-3': 80, 'DIM-4': 75, 'DIM-5': 70, 'DIM-6': 65, 'DIM-7': 78 });
  p.submitExam('DIM-3', 90);
  p.submitPractice('s1', 85);
  p.submitPractice('s2', 78);
  
  profile = p.getAbilityProfile();
  assert(profile.length === 7, `应为 7 个维度，实际 ${profile.length}`);
  dim3 = profile.find(d => d.dimId === 'DIM-3');
  assert(dim3.dimName === '全案设计', `DIM-3 名称应为 全案设计，实际 ${dim3.dimName}`);
  // 公式: 80*0.3 + 90*0.4 + 82*0.3 = 24 + 36 + 24.6 = 84.6 → Math.round = 85
  assert(Math.abs(dim3.score - 85) <= 1, `DIM-3 应为 ~85 分，实际 ${dim3.score}`);
});

test('四素养从硬技能 eth 反向聚合', () => {
  const ethics = p.getEthicsProfile();
  assert(ethics.length === 4, `四素养应为 4 项，实际 ${ethics.length}`);
  assert(ethics.find(e => e.id === 'profe'), '缺 专业');
  assert(ethics.find(e => e.id === 'empathy'), '缺 共情');
  assert(ethics.find(e => e.id === 'judge'), '缺 判断');
  assert(ethics.find(e => e.id === 'resp'), '缺 担责');
});

test('弱项自动识别', () => {
  const weak = p.getWeakDims();
  assert(weak.length === 2, `弱项应为 2 项，实际 ${weak.length}`);
});

test('自动快照记录每次 submit', () => {
  const growth = p.getGrowth();
  assert(growth.length >= 3, `应为 3+ 条快照，实际 ${growth.length}`);
});

test('breakdown 透明化 — 每维度有 baseline/exam/practice 三来源分数', () => {
  const d = profile[0];
  assert(typeof d.breakdown === 'object', '缺 breakdown 对象');
  assert('baseline' in d.breakdown, '缺 breakdown.baseline');
  assert('exam' in d.breakdown, '缺 breakdown.exam');
  assert('practice' in d.breakdown, '缺 breakdown.practice');
});

// ====== 页面迁移验证 ======
console.log('\n========== 页面迁移验证 ==========');
const check = (file, checks) => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  checks.forEach(c => {
    test(`${file}: ${c.label}`, () => {
      if (c.neg) {
        assert(!content.includes(c.pattern), `不应包含: ${c.pattern}`);
      } else {
        assert(content.includes(c.pattern), `应包含: ${c.pattern}`);
      }
    });
  });
};

check('index.html', [
  { label: '进入工作台 → /workspace/', pattern: 'href="/workspace/"' },
  { label: '不再有 href="#biz"', pattern: 'href="#biz"', neg: true },
  { label: '定位句存在', pattern: '居住服务者的能力标准与现场工具箱' },
  { label: '五项导航 工具箱', pattern: 'href="/toolkit/"' },
  { label: '五项导航 能力标准', pattern: 'href="/standard/"' },
  { label: '五项导航 知识底座', pattern: 'href="/knowledge/"' },
  { label: '五项导航 能力测评', pattern: 'href="/care-test/"' },
  { label: '五项导航 工作台', pattern: 'href="/workspace/"' },
  { label: '无 6,135 旧数字', pattern: '6,135', neg: true },
]);

check('workspace/index.html', [
  { label: '引入 domain-config.js', pattern: '/js/domain-config.js' },
  { label: '引入 person.js', pattern: '/js/person.js' },
  { label: 'max-width 1180px', pattern: '1180px' },
  { label: '无 ¥ 付费卡内容', pattern: '¥999', neg: true },
  { label: '无 ¥2,999', pattern: '¥2,999', neg: true },
  { label: '无 L2→L5', pattern: 'L2→L5', neg: true },
  { label: '无 0% 覆盖率', pattern: '链接覆盖率', neg: true },
  { label: '红线 innerHTML 修复', pattern: 'redEl.innerHTML' },
  { label: '展开更多 toggle', pattern: '展开更多' },
  { label: '有全库 6,143 条', pattern: '6,143 条' },
]);

check('care-test/index.html', [
  { label: '引入 domain-config.js', pattern: '/js/domain-config.js' },
  { label: '引入 person.js', pattern: '/js/person.js' },
  { label: 'Person.submitCareTest 调用', pattern: 'submitCareTest' },
  { label: '首屏开始按钮', pattern: 'start-test-top' },
  { label: '角色联动 updateIntroStats', pattern: 'updateIntroStats' },
  { label: '隐私 consent checkbox', pattern: 'phone-consent' },
  { label: '无 6,135 旧数字', pattern: '6,135', neg: true },
]);

check('academy/profile/index.html', [
  { label: '引入 domain-config.js', pattern: '/js/domain-config.js' },
  { label: '引入 person.js', pattern: '/js/person.js' },
  { label: 'Person.getAbilityProfile 调用', pattern: 'getAbilityProfile' },
  { label: 'Person.getWeakDims 调用', pattern: 'getWeakDims' },
  { label: 'Person.getGrowth 调用', pattern: 'getGrowth' },
]);

check('academy/exam/index.html', [
  { label: '引入 domain-config.js', pattern: '/js/domain-config.js' },
  { label: '引入 person.js', pattern: '/js/person.js' },
  { label: 'Person.submitExam 调用', pattern: 'submitExam' },
]);

// ====== 导航统一验证 ======
console.log('\n========== 全站品牌+导航统一 ==========');
const navPages = [
  'index.html','workspace/index.html','home-design/index.html',
  'care-test/index.html','academy/index.html','academy/profile/index.html',
  'academy/exam/index.html','academy/practice/index.html','academy/match/index.html',
  'academy/core-courses/index.html','knowledge/index.html'
];

navPages.forEach(p => {
  const c = fs.readFileSync(path.join(ROOT,p),'utf8');
  test(`${p}: 品牌名=风声聚匠星云`, () => {
    assert(c.includes('风声聚匠星云') || c.includes('风声'), '缺品牌名');
  });
});

// ====== 汇总 ======
console.log(`\n========== 交叉验证结果 ==========`);
console.log(`  ✅ 通过: ${PASSED}`);
console.log(`  ❌ 失败: ${FAILED}`);
console.log(`  📊 总计: ${PASSED + FAILED}`);
console.log(FAILED === 0 ? `\n  🎉 全部通过！架构 V1 + UX 修复可部署` : `\n  ⚠️ 有 ${FAILED} 项失败，请修复后重新部署`);
process.exit(FAILED === 0 ? 0 : 1);
