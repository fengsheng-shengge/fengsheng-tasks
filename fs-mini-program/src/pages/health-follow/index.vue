<template>
  <view class="page">
    <view class="hf-banner">
      <view class="hf-banner-t">健康盯办</view>
      <view class="hf-banner-s">会员健康关怀节点持续盯办 · 只给依据不给结论</view>
    </view>

    <!-- 概览条 -->
    <view class="hf-overview">
      <view class="ov-item"><text class="ov-n">{{ cnt.book }}</text><text class="ov-l">待预约</text></view>
      <view class="ov-item"><text class="ov-n">{{ cnt.check }}</text><text class="ov-l">待到检</text></view>
      <view class="ov-item"><text class="ov-n">{{ cnt.read }}</text><text class="ov-l">待解读</text></view>
      <view class="ov-item"><text class="ov-n">{{ cnt.done }}</text><text class="ov-l">已闭环</text></view>
    </view>

    <!-- 预警区（仅超时显示） -->
    <view v-if="overdue.length" class="hf-warn">
      <text class="wf-ico">⚠</text>
      <text class="wf-txt">{{ overdue.length }} 项已超期，请优先处理</text>
    </view>

    <!-- 盯办列表（卡片流） -->
    <view class="hf-list">
      <view class="hf-card" v-for="t in activeList" :key="t.id" :class="{ overdue: t._overdue }">
        <view class="hc-top">
          <text class="hc-name">{{ t.clientName }}</text>
          <text class="hc-proj">{{ t.project }}</text>
        </view>
        <view class="hc-meta">
          <text class="hc-node">当前节点：{{ nodeLabel(t.node) }}</text>
          <text class="hc-due" :class="{ od: t._overdue }">截止 {{ t.dueDate }}</text>
        </view>
        <view class="hc-tags">
          <text class="hc-status" :class="statusClass(t)">{{ t._overdue ? '已超期' : nodeLabel(t.node) }}</text>
          <text class="hc-owner" v-if="t.owner">负责人 {{ t.owner }}</text>
          <text class="hc-arc" v-if="t.memberArchiveId">档案 {{ t.memberArchiveId }}</text>
        </view>
        <view class="hc-ops">
          <text class="hc-op" @tap="startFollow(t)">发起回访</text>
          <text class="hc-op kb" @tap="syncXiaojingyan(t)">同步小眼镜</text>
          <text class="hc-op go" @tap="advance(t)">标记推进 ›</text>
        </view>
      </view>

      <view v-if="activeList.length === 0" class="hf-empty">
        暂无活跃盯办，点下方「+ 新建盯办」开始。
      </view>
    </view>

    <!-- 同步小眼镜 依据面板 -->
    <view v-if="kbOpen" class="kb-mask" @tap="closeKb">
      <view class="kb-panel" @tap.stop>
        <view class="kb-ph"><text class="kb-pt">小眼镜 · 依据</text><text class="kb-close" @tap="closeKb">✕</text></view>
        <view class="kb-sub">仅检索真实词条作为回访话术依据（只给依据，不给结论，不诊断）</view>
        <view class="kb-entry" v-for="(e, i) in kbResults" :key="i">
          <view class="kbe-t">{{ e.title }}</view>
          <view class="kbe-sum">{{ e.summary }}</view>
          <view class="kbe-src" v-if="e.src">来源：{{ e.src }}</view>
        </view>
        <view v-if="kbResults.length === 0" class="kb-empty">未检索到「{{ kbKw }}」相关依据，可调整健康项目关键词。</view>
      </view>
    </view>

    <!-- 新建盯办 -->
    <view v-if="formOpen" class="kb-mask" @tap="closeForm">
      <view class="kb-panel" @tap.stop>
        <view class="kb-ph"><text class="kb-pt">新建盯办</text><text class="kb-close" @tap="closeForm">✕</text></view>
        <view class="fld"><text class="fld-l">客户姓名</text><input class="fld-i" v-model="form.clientName" placeholder="如：王女士" /></view>
        <view class="fld"><text class="fld-l">健康项目</text>
          <view class="fld-chips">
            <text class="fc" v-for="p in projects" :key="p" :class="{ on: form.project === p }" @tap="form.project = p">{{ p }}</text>
          </view>
        </view>
        <view class="fld"><text class="fld-l">当前节点</text>
          <view class="fld-chips">
            <text class="fc" v-for="n in nodes" :key="n" :class="{ on: form.node === n }" @tap="form.node = n">{{ nodeLabel(n) }}</text>
          </view>
        </view>
        <view class="fld"><text class="fld-l">截止日</text><input class="fld-i" v-model="form.dueDate" placeholder="YYYY-MM-DD" /></view>
        <view class="fld"><text class="fld-l">负责人(经纪人)</text><input class="fld-i" v-model="form.owner" placeholder="经纪人姓名" /></view>
        <view class="fld"><text class="fld-l">关联会员档案ID</text><input class="fld-i" v-model="form.memberArchiveId" placeholder="好友会会员档案ID" /></view>
        <button class="btn-save" @tap="saveTask">保存盯办</button>
      </view>
    </view>

    <!-- 底部悬浮 -->
    <view class="hf-fab" @tap="openForm">+ 新建盯办</view>
  </view>
</template>

<script>
import { kbSearch } from '../../utils/knowledge-search.js'
import { trackPageview } from '../../utils/tracker'

const STORAGE_KEY = 'fs_health_follow'
const NODES = ['待预约', '待到检', '待解读', '待复查', '已闭环']
const PROJECTS = ['胃肠镜', '体检', '其他']

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default {
  data() {
    return {
      list: [],
      nodes: NODES,
      projects: PROJECTS,
      kbSearch,
      kbOpen: false,
      kbKw: '',
      kbResults: [],
      formOpen: false,
      form: { clientName: '', project: '胃肠镜', node: '待预约', dueDate: '', owner: '', memberArchiveId: '' }
    }
  },
  computed: {
    today() { return todayStr() },
    // 派生：超期
    decorated() {
      return this.list.map(t => ({ ...t, _overdue: t.node !== '已闭环' && t.dueDate && t.dueDate < this.today }))
    },
    activeList() {
      // 活跃 = 非已闭环（超期仍显示在活跃列表顶部预警）
      return this.decorated.filter(t => t.node !== '已闭环').sort((a, b) => (a._overdue === b._overdue ? 0 : a._overdue ? -1 : 1))
    },
    overdue() { return this.decorated.filter(t => t._overdue) },
    cnt() {
      const d = this.decorated
      return {
        book: d.filter(t => t.node === '待预约' && !t._overdue).length,
        check: d.filter(t => t.node === '待到检' && !t._overdue).length,
        read: d.filter(t => t.node === '待解读' && !t._overdue).length,
        done: d.filter(t => t.node === '已闭环').length
      }
    }
  },
  onShow() { trackPageview('health-follow'); this.load() },
  methods: {
    nodeLabel(n) { return n },
    load() {
      let data = uni.getStorageSync(STORAGE_KEY)
      if (!data || !data.length) {
        // 首次进入写入演示样本，便于测试（非真实客户数据）
        data = [
          { id: 'hf_demo_1', clientName: '样本·李女士', project: '胃肠镜', node: '待到检', dueDate: '2026-09-05', owner: '经纪人A', memberArchiveId: 'HY-0001', kbRefs: [] },
          { id: 'hf_demo_2', clientName: '样本·张先生', project: '体检', node: '待解读', dueDate: '2026-08-20', owner: '经纪人B', memberArchiveId: 'HY-0002', kbRefs: [] },
          { id: 'hf_demo_3', clientName: '样本·王女士', project: '其他', node: '待复查', dueDate: '2026-09-12', owner: '经纪人A', memberArchiveId: 'HY-0003', kbRefs: [] }
        ]
        uni.setStorageSync(STORAGE_KEY, data)
      }
      this.list = data
    },
    persist() { uni.setStorageSync(STORAGE_KEY, this.list) },
    statusClass(t) {
      if (t._overdue) return 'od'
      if (t.node === '已闭环') return 'done'
      return 'live'
    },
    // 状态推进：待预约→待到检→待解读→待复查→已闭环
    advance(t) {
      const i = NODES.indexOf(t.node)
      if (i < 0 || i >= NODES.length - 1) { uni.showToast({ title: '已是终态', icon: 'none' }); return }
      t.node = NODES[i + 1]
      this.persist()
      uni.showToast({ title: '已推进至「' + t.node + '」', icon: 'none' })
    },
    // 发起回访（演示：记录动作，不写知识底座）
    startFollow(t) {
      uni.showToast({ title: '已生成回访入口（演示）', icon: 'none' })
    },
    // 同步小眼镜：按健康项目检索本地知识库「依据」
    syncXiaojingyan(t) {
      this.kbKw = t.project
      const kw = (t.project || '').toLowerCase()
      this.kbResults = (this.kbSearch || []).filter(e => {
        const hay = (e.title + ' ' + e.summary + ' ' + (e.domainCn || '')).toLowerCase()
        return kw && hay.indexOf(kw) >= 0
      }).slice(0, 8)
      this.kbOpen = true
    },
    closeKb() { this.kbOpen = false },
    openForm() { this.form = { clientName: '', project: '胃肠镜', node: '待预约', dueDate: '', owner: '', memberArchiveId: '' }; this.formOpen = true },
    closeForm() { this.formOpen = false },
    saveTask() {
      if (!this.form.clientName.trim()) { uni.showToast({ title: '请填客户姓名', icon: 'none' }); return }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.form.dueDate)) { uni.showToast({ title: '截止日格式 YYYY-MM-DD', icon: 'none' }); return }
      const t = { ...this.form, clientName: this.form.clientName.trim(), id: 'hf_' + Date.now(), kbRefs: [] }
      this.list.push(t)
      this.persist()
      this.formOpen = false
      uni.showToast({ title: '已建单', icon: 'success' })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 160rpx; background: var(--cream-dark); min-height: 100vh; }
.hf-banner { background: linear-gradient(135deg, var(--green-deep), var(--green)); color: #fff; border-radius: var(--r-lg); padding: 36rpx 32rpx; }
.hf-banner-t { font-size: 36rpx; font-weight: 800; }
.hf-banner-s { font-size: 22rpx; opacity: .85; margin-top: 10rpx; }
.hf-overview { display: flex; gap: 12rpx; margin: 24rpx 0; }
.ov-item { flex: 1; background: #fff; border: 2rpx solid var(--border); border-radius: var(--r-md); padding: 24rpx 0; text-align: center; }
.ov-n { display: block; font-size: 40rpx; font-weight: 800; color: var(--green); }
.ov-l { display: block; font-size: 22rpx; color: var(--text-secondary); margin-top: 6rpx; }
.hf-warn { display: flex; align-items: center; gap: 12rpx; background: #fdecea; border: 2rpx solid #f5c6c0; border-radius: var(--r-md); padding: 20rpx 28rpx; margin-bottom: 20rpx; }
.wf-ico { color: #c0392b; font-size: 30rpx; }
.wf-txt { color: #c0392b; font-size: 26rpx; font-weight: 700; }
.hf-card { background: #fff; border: 2rpx solid var(--border); border-radius: var(--r-lg); padding: 28rpx; margin-bottom: 20rpx; box-shadow: var(--shadow-sm); }
.hf-card.overdue { border-color: #f5c6c0; }
.hc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.hc-name { font-size: 32rpx; font-weight: 800; color: var(--text-primary); }
.hc-proj { font-size: 22rpx; color: var(--orange); background: var(--orange-bg); padding: 6rpx 16rpx; border-radius: var(--r-sm); }
.hc-meta { display: flex; justify-content: space-between; font-size: 24rpx; color: var(--text-secondary); margin-top: 14rpx; }
.hc-due.od { color: #c0392b; font-weight: 700; }
.hc-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.hc-status { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: var(--r-sm); }
.hc-status.live { color: var(--green); background: var(--green-bg); }
.hc-status.done { color: var(--text-tertiary); background: var(--cream-dark); }
.hc-status.od { color: #fff; background: #c0392b; }
.hc-owner, .hc-arc { font-size: 22rpx; color: var(--text-secondary); background: var(--cream-dark); padding: 6rpx 16rpx; border-radius: var(--r-sm); }
.hc-ops { display: flex; gap: 12rpx; margin-top: 22rpx; }
.hc-op { flex: 1; text-align: center; font-size: 24rpx; font-weight: 700; padding: 16rpx 0; border-radius: var(--r-pill); background: var(--cream-dark); color: var(--text-secondary); }
.hc-op.kb { color: var(--green); background: var(--green-bg); }
.hc-op.go { color: var(--orange); background: var(--orange-bg); }
.hf-empty { background: #fff; border: 2rpx dashed var(--border); border-radius: var(--r-lg); padding: 48rpx 32rpx; text-align: center; color: var(--text-tertiary); font-size: 26rpx; }
.hf-fab { position: fixed; left: 50%; transform: translateX(-50%); bottom: 40rpx; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; font-size: 30rpx; font-weight: 800; padding: 26rpx 60rpx; border-radius: var(--r-pill); box-shadow: var(--shadow-accent); }
.kb-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; z-index: 50; }
.kb-panel { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; max-height: 78vh; overflow-y: auto; }
.kb-ph { display: flex; align-items: center; justify-content: space-between; }
.kb-pt { font-size: 32rpx; font-weight: 800; color: var(--text-primary); }
.kb-close { font-size: 32rpx; color: var(--text-tertiary); padding: 0 12rpx; }
.kb-sub { font-size: 22rpx; color: var(--text-tertiary); margin: 10rpx 0 20rpx; line-height: 1.6; }
.kb-entry { background: var(--cream-dark); border-radius: var(--r-md); padding: 24rpx; margin-bottom: 16rpx; }
.kbe-t { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
.kbe-sum { font-size: 24rpx; color: var(--text-secondary); margin-top: 10rpx; line-height: 1.7; }
.kbe-src { font-size: 20rpx; color: var(--text-tertiary); margin-top: 10rpx; }
.kb-empty { font-size: 24rpx; color: var(--text-tertiary); text-align: center; padding: 32rpx; }
.fld { margin-bottom: 24rpx; }
.fld-l { display: block; font-size: 26rpx; font-weight: 700; color: var(--text-secondary); margin-bottom: 12rpx; }
.fld-i { background: var(--cream-dark); border: 2rpx solid var(--border); border-radius: var(--r-sm); padding: 22rpx 24rpx; font-size: 28rpx; }
.fld-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.fc { font-size: 24rpx; padding: 14rpx 30rpx; border-radius: var(--r-pill); background: #fff; border: 3rpx solid var(--border); color: var(--text-secondary); }
.fc.on { background: var(--green); color: #fff; border-color: var(--green); }
.btn-save { background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border: none; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; margin-top: 8rpx; }
</style>
