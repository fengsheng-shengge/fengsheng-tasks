#!/usr/bin/env node
/**
 * 把 entries.json 的 cap_skills 同步到 data/domains/*.json
 * Worker 实际读的是 domains/*.json，不是 entries.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'entries.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'domains', '_manifest.json'), 'utf8'));

console.log(`entries.json: ${entries.length} 条`);
console.log(`manifest 声明: ${manifest.total} 条, ${manifest.domains.length} domains`);

// 建 id → cap_skills 映射
const idToCap = {};
entries.forEach(e => {
  if (e.id && e.cap_skills && e.cap_skills.length > 0) {
    idToCap[e.id] = e.cap_skills;
  }
});
console.log(`有 cap_skills 的 entries: ${Object.keys(idToCap).length}`);

// 遍历每个 domain 文件
let totalDomainsEntries = 0;
let domainsWithCap = 0;
let entriesNotFound = [];

manifest.domains.forEach(domName => {
  const filename = manifest.files[domName];
  const domPath = path.join(ROOT, 'data', 'domains', filename);
  if (!fs.existsSync(domPath)) {
    console.log(`  ⚠️  文件不存在: ${filename}`);
    return;
  }

  const domEntries = JSON.parse(fs.readFileSync(domPath, 'utf8'));
  let added = 0;
  let missing = 0;

  domEntries.forEach(e => {
    totalDomainsEntries++;
    if (e.id && idToCap[e.id]) {
      e.cap_skills = idToCap[e.id];
      added++;
    } else if (e.id) {
      // entries.json 里没有这条，也加空数组
      e.cap_skills = e.cap_skills || [];
      missing++;
      entriesNotFound.push(e.id);
    }
  });

  // 写回
  fs.writeFileSync(domPath, JSON.stringify(domEntries, null, 2), 'utf8');
  domainsWithCap += added;

  console.log(`  ${domName} (${filename}): ${domEntries.length} 条, ${added} 同步, ${missing} 未匹配`);
});

console.log(`\n=== 同步结果 ===`);
console.log(`domain 文件总条目: ${totalDomainsEntries}`);
console.log(`成功同步 cap_skills: ${domainsWithCap}`);
console.log(`entries.json 有但 domain 里没找到: ${entriesNotFound.length}`);

if (entriesNotFound.length > 0) {
  console.log(`前 10 个未匹配 ID: ${entriesNotFound.slice(0, 10).join(', ')}`);
}

// 同时更新 manifest 的 total
const allDomains = manifest.domains.reduce((sum, dom) => {
  const filename = manifest.files[dom];
  const domPath = path.join(ROOT, 'data', 'domains', filename);
  if (fs.existsSync(domPath)) {
    return sum + JSON.parse(fs.readFileSync(domPath, 'utf8')).length;
  }
  return sum;
}, 0);
manifest.total = allDomains;
manifest.total_entries = allDomains;
fs.writeFileSync(path.join(ROOT, 'data', 'domains', '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\nmanifest total 更新为: ${allDomains}`);
