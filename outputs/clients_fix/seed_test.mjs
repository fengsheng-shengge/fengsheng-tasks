// 桩 uni 内存 storage（不包装，直接存值，模拟真实存储 key 存在性）
const mem = {}
global.uni = {
  getStorageSync: (k) => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v },
}
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from './_user.bundle.mjs'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++; console.log('  ✅', name) } else { fail++; console.log('  ❌', name) } }
// 页面 onShow 守卫等价逻辑（新）：未初始化则同步 initFromStorage（内部按 key 存在性判定首次 seed / 清空不回弹）
const guard = (s) => { if (!s._initialized) s.initFromStorage() }

console.log('== T1 首次启动（storage 空）initFromStorage ==')
setActivePinia(createPinia())
let s = useUserStore()
s.initFromStorage()
ok('seed 出 4 个示例', s.clients.length === 4)
ok('seeded=true', s.seeded === true)
ok('_initialized=true', s._initialized === true)
ok('全为 seed:true', s.clients.every(c => c.seed === true))

console.log('== T2 已同步后页面守卫不重复 seed ==')
guard(s)
ok('仍是 4 个（未翻倍）', s.clients.length === 4)

console.log('== T3 清空示例后 reload 不回弹（核心）==')
s.clearSamples()
ok('清空 4 张示例 → 空', s.clients.length === 0)
// 模拟 reload：新 store 从同一 storage 初始化
setActivePinia(createPinia())
let s2 = useUserStore()
s2.initFromStorage()
ok('reload 后 clients 仍空（fs_clients key 存在=[]，不 seed）', s2.clients.length === 0)
ok('reload 后 _initialized=true', s2._initialized === true)
guard(s2)
ok('页面守卫后仍空（用户清空态真实可达）', s2.clients.length === 0)

console.log('== T4 新建真实客户后 reload 真实保留 ==')
const c = s2.addClient({ name: '真实客户赵', rel: '买房客户' })
ok('真实客户 seed=false', c.seed === false)
ok('列表 1 个真实', s2.clients.length === 1)
setActivePinia(createPinia())
let s3 = useUserStore()
s3.initFromStorage()
ok('reload 后真实客户保留（1 个）', s3.clients.length === 1 && s3.clients[0].name === '真实客户赵')
guard(s3)
ok('页面守卫不塞回示例', s3.clients.length === 1)

console.log('== T5 删除真实客户后空态 reload 真实可达 ==')
s3.removeClient(c.id)
ok('删除后空', s3.clients.length === 0)
setActivePinia(createPinia())
let s4 = useUserStore()
s4.initFromStorage()
ok('reload 后空（不回弹）', s4.clients.length === 0)
guard(s4)
ok('页面守卫不塞回（空态真实可达）', s4.clients.length === 0)

console.log('== T6 冷启动直接落客户档案 tab（未 init，页面守卫兜底）==')
for (const k in mem) delete mem[k]   // 模拟全新安装（storage 空）
setActivePinia(createPinia())
let s5 = useUserStore()
// 此时 _initialized=false, clients=[]
guard(s5)
ok('未 init 时页面守卫 seed 出 4 个（消除真机空白）', s5.clients.length === 4)
ok('兜底 seed 后 seeded=true', s5.seeded === true)
// 随后 App init（200ms）读 storage（页面已 persist）→ 不应覆盖清空
s5.initFromStorage()
ok('App init 后仍是 4 个（未被覆盖）', s5.clients.length === 4)
ok('App init 后 _initialized=true', s5._initialized === true)
guard(s5)
ok('App init 后页面守卫不重复', s5.clients.length === 4)

console.log('== T7 seedClients 幂等（clients 非空时不重置）==')
setActivePinia(createPinia())
let s6 = useUserStore()
s6.seedClients()
const ref = s6.clients
s6.seedClients() // 二次，clients 已非空 → 应 return
ok('仍为 4 个（未重置）', s6.clients.length === 4 && s6.clients === ref)

console.log('\n结果:', pass, '通过 /', fail, '失败')
process.exit(fail === 0 ? 0 : 1)
