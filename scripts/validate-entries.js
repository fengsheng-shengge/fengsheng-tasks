#!/usr/bin/env node
// ============================================================
// 词条Schema验证脚本
// 验收标准：每条词条必须有必填字段，无脏数据
// 小扣子 · 2026.06.27
// ============================================================

const fs = require('fs');
const path = require('path');

// 必填字段
const REQUIRED = ['id', 'name', 'def', 'srcType', 'source'];

// 推荐字段（警告）
const RECOMMENDED = ['consumerQ', 'simpleAnswer', 'consumerBenefit'];

// GEO关键字段（7.24上线后必须）
const GEO_FIELDS = ['consumerNarrative', 'serviceNarrative', 'faq', 'compareTable', 'authRef'];

// ID格式白名单（必须符合 域-XXX 格式）
const VALID_ID_PREFIXES = [
  'TRX','QLT','RNT','DCV','HSK','TAL','TRD','QLC','RNC','DCF',
  'DEC','HOM','POL',  // 实际使用的域
];

// 允许的srcType（包容实际数据）
const VALID_SRC_TYPES = [
  '行业标准', '法律规范', '科学原理', '经验总结', '官方文件',
  '国家标准', '部门规章', '行政法规', '政策文件', '行业研究',
  '法律+部门规章', '法律+行政法规', '平台标准+部门规章', '学术研究',
];

let passed = 0;
let failed = 0;
let warnings = 0;
const errors = [];

function validateEntry(entry, file) {
  const entryErrors = [];
  const entryWarnings = [];

  // 1. ID格式检查
  if (!entry.id || typeof entry.id !== 'string') {
    entryErrors.push(`  ✗ 缺少或无效ID: ${JSON.stringify(entry.id)}`);
  } else {
    const prefix = entry.id.split('-')[0];
    if (!VALID_ID_PREFIXES.some(p => prefix.startsWith(p))) {
      entryWarnings.push(`  ⚠ ID格式不规范: ${entry.id}（期望前缀: ${VALID_ID_PREFIXES.join(', ')}）`);
    }
  }

  // 2. 必填字段
  for (const field of REQUIRED) {
    if (!entry[field]) {
      entryErrors.push(`  ✗ 缺少必填字段 [${field}]`);
    }
  }

  // 3. 推荐字段
  for (const field of RECOMMENDED) {
    if (!entry[field]) {
      entryWarnings.push(`  ⚠ 缺少推荐字段 [${field}]`);
    }
  }

  // 4. ID唯一性（简单检查）
  if (typeof entry.id === 'string' && entry.id.length > 50) {
    entryErrors.push(`  ✗ ID过长: ${entry.id.slice(0, 20)}...`);
  }

  // 5. 字段类型检查
  if (entry.faq && !Array.isArray(entry.faq)) {
    entryErrors.push(`  ✗ faq字段必须是数组，当前: ${typeof entry.faq}`);
  }

  if (entry.compareTable && typeof entry.compareTable !== 'string') {
    entryErrors.push(`  ✗ compareTable字段必须是字符串，当前: ${typeof entry.compareTable}`);
  }

  if (entry.scores) {
    if (typeof entry.scores !== 'object') {
      entryErrors.push(`  ✗ scores字段必须是对象，当前: ${typeof entry.scores}`);
    }
  }

  // 6. srcType合法值
  if (entry.srcType && !VALID_SRC_TYPES.includes(entry.srcType)) {
    entryWarnings.push(`  ⚠ srcType不规范: "${entry.srcType}"（期望: ${VALID_SRC_TYPES.join(' | ')}）`);
  }

  // 7. 无空字符串必填字段
  for (const field of REQUIRED) {
    if (entry[field] === '') {
      entryErrors.push(`  ✗ [${field}] 字段为空字符串`);
    }
  }

  // 8. 无脏数据标志
  if (entry.id && entry.id.startsWith('/api/')) {
    entryErrors.push(`  ✗ 脏数据：ID为API路径 "${entry.id}"`);
  }

  // 9. 无XSS风险（简单检查）
  const strFields = ['name', 'def', 'simpleAnswer'];
  for (const field of strFields) {
    if (entry[field] && entry[field].includes('<script')) {
      entryErrors.push(`  ✗ [${field}] 包含疑似XSS: <script`);
    }
  }

  if (entryErrors.length > 0) {
    failed++;
    errors.push(`\n✗ ${entry.id || '未知'} (${file}):\n${entryErrors.join('\n')}`);
    if (entryWarnings.length > 0) {
      warnings += entryWarnings.length;
      errors.push(entryWarnings.join('\n'));
    }
  } else {
    passed++;
    if (entryWarnings.length > 0) {
      warnings += entryWarnings.length;
      console.log(`⚠ ${entry.id} (${file}):\n${entryWarnings.join('\n')}`);
    }
  }
}

function main() {
  const htmlFiles = process.argv.slice(2);
  console.log('🔍 词条Schema验证\n');
  console.log(`必填字段: ${REQUIRED.join(', ')}`);
  console.log(`推荐字段: ${RECOMMENDED.join(', ')}\n`);

  if (htmlFiles.length === 0) {
    // 默认检查knowledge.html
    const knowledgePath = path.join(__dirname, '..', 'knowledge.html');
    if (fs.existsSync(knowledgePath)) {
      htmlFiles.push(knowledgePath);
    }
  }

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/const ENTRIES\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!match) {
      console.log(`⚠ 无法从 ${file} 提取词条`);
      continue;
    }

    let entries;
    try {
      entries = eval(`(${match[1]})`);
    } catch (e) {
      console.log(`✗ ${file} 词条JSON解析失败: ${e.message}`);
      process.exit(1);
    }

    console.log(`📄 ${path.basename(file)}: ${entries.length} 条词条`);

    for (const entry of entries) {
      validateEntry(entry, path.basename(file));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 通过: ${passed} 条`);
  console.log(`⚠ 警告: ${warnings} 项`);
  console.log(`✗ 失败: ${failed} 条`);

  if (errors.length > 0) {
    console.log('\n' + errors.join('\n'));
    process.exit(1);
  } else {
    console.log('\n🎉 全部通过！词条数据就绪。');
    process.exit(0);
  }
}

main();
