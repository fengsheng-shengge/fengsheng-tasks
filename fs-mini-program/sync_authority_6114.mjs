/**
 * 阶段二批1（2026-10-22）主库 6114 → 小程序策展库 slim 同步
 *
 * 背景：内容侧主库已更新至 6114 条（md5 102e728f），其中
 *   ① ownerBenefit 回填 400 条（含我 slim 之前缺失的 180 条）
 *   ② domain 归并 1660 条（RENT→租住 / OWN→业主出售|房东出租 / C1|C2|C3→学区教育 / A4→租住）
 *   ③ caseRef 30 条由「待补充」补为真值
 * 本脚本只做「展示层字段对齐 + 缺失字段回填」，不新增/删除词条、不改任何内容正文。
 *
 * 纪律：
 *   - 严格按 id 对齐，slim 现有 954 条 id 与顺序完全不动
 *   - 仅回填 ownerBenefit（slim 为空 → 主库有值）与 domain（主库归并后的新值）
 *   - 不覆盖 slim 中已有的非空 ownerBenefit（主库该批为「空→有」400 条，无反向，故实际无覆盖）
 *   - 主库不存在的 3 条（RENT-TEN-001/002/003，小马丫补产）保持原样不动
 *
 * 用法：node sync_authority_6114.mjs [--dry]
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('.')
const SNAPSHOT = '/Users/ke/Library/CloudStorage/坚果云-281710898@qq.com/风声知识底座备份/entries_jmjx_s2a_20261022.json'
const SLIM = path.join(ROOT, 'src/package-curation/data/entries_slim.js')
const DRY = process.argv.includes('--dry')

const auth = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
const authMap = new Map(auth.map(e => [e.id, e]))

// ---- 读现有 slim（单行 ESM，取 default 导出对象）----
const src = fs.readFileSync(SLIM, 'utf8')
const m = src.match(/export default (\{[\s\S]*\})\s*$/)
if (!m) { console.error('❌ 无法解析 entries_slim.js 的 default 导出'); process.exit(1) }
const G = JSON.parse(m[1])
const groups = ['decoder', 'see', 'nego']

const stat = { ownerBenefitFilled: [], domainUpdated: [], caseRefFilled: [], notInAuthority: [], idDup: 0 }

// ---- id 唯一性预检 ----
const allIds = []
groups.forEach(g => G[g].forEach(e => allIds.push(e.id)))
if (new Set(allIds).size !== allIds.length) { console.error('❌ slim 内存在重复 id，中止'); process.exit(1) }

const next = { decoder: [], see: [], nego: [] }
for (const g of groups) {
  for (const e of G[g]) {
    const a = authMap.get(e.id)
    if (!a) { stat.notInAuthority.push(e.id); next[g].push(e); continue }
    const o = { ...e }
    // ① ownerBenefit 回填（slim 空 → 主库有值）
    if (!o.ownerBenefit && a.ownerBenefit) { o.ownerBenefit = a.ownerBenefit; stat.ownerBenefitFilled.push(e.id) }
    // ② domain 归并（主库为权威）
    if (a.domain && o.domain !== a.domain) { o.domain = a.domain; stat.domainUpdated.push(e.id) }
    // ③ caseRef 回填（主库有真值且 slim 为待补充）
    if (a.caseRef && /待补充/.test(String(o.caseRef || '')) && !/待补充/.test(String(a.caseRef))) {
      o.caseRef = a.caseRef; stat.caseRefFilled.push(e.id)
    }
    next[g].push(o)
  }
}

console.log('=== 阶段二批1 同步计划 ===')
console.log('  授权基线:', auth.length, '条 (md5 102e728f)')
console.log('  slim 现有:', allIds.length, '条')
console.log('  ① ownerBenefit 回填:', stat.ownerBenefitFilled.length, '条')
console.log('  ② domain 归并对齐:', stat.domainUpdated.length, '条')
console.log('  ③ caseRef 回填:', stat.caseRefFilled.length, '条')
console.log('  主库不存在的条目（保持原样）:', stat.notInAuthority.length, '→', stat.notInAuthority.join(', '))

if (DRY) { console.log('\n[dry] 未写回'); process.exit(0) }

// ---- 写回（保持原有 export default 格式与字段顺序）----
const header = src.slice(0, src.indexOf('export default'))
const body = 'export default ' + JSON.stringify(next)
fs.writeFileSync(SLIM, header + body + '\n')

console.log('\n✓ 已写回', SLIM)
console.log('  新总量:', groups.reduce((s, g) => s + next[g].length, 0))
