<template>
  <view class="page">
    <!-- 客户卡 -->
    <view class="client-card">
      <view class="cc-av" :style="{ background: client.avatarColor || '#3D5A3E' }">{{ client.avatar }}</view>
      <view class="cc-body">
        <view class="cc-name">{{ client.name }}</view>
        <view class="cc-meta">
          <text class="tag tag-cream">{{ client.rel || '客户' }}</text>
          <text class="tag" :class="'tag-' + (client.businessColor || 'green')">{{ client.businessIcon }} {{ client.businessTypeName }}</text>
        </view>
        <view class="cc-note" v-if="client.note">{{ client.note }}</view>
      </view>
      <view class="cc-edit" @tap="goEdit">编辑 ›</view>
    </view>

    <!-- MOT 闭环进度 -->
    <view class="sec">
      <view class="sec-h">
        <text class="em">🧭</text>MOT 五步闭环
        <text class="sec-tag">{{ mot.step }}</text>
      </view>
      <view class="mot-track">
        <view
          v-for="(s, i) in motSteps"
          :key="i"
          class="mot-node"
          :class="{ done: i < mot.stepIndex, cur: i === mot.stepIndex, lock: i > mot.stepIndex }"
        >
          <view class="mot-ic">{{ i < mot.stepIndex ? '✓' : (i === mot.stepIndex ? '●' : i + 1) }}</view>
          <view class="mot-t">{{ s }}</view>
        </view>
      </view>
      <view class="mot-line"><view class="mot-line-fill" :style="{ width: (mot.stepIndex / 4) * 100 + '%' }"></view></view>
    </view>

    <!-- 五报告清单 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📄</text>五份专业报告</view>
      <view class="rep-list">
        <view class="rep-item" v-for="r in reportRows" :key="r.key" :class="r.state" @tap="onReport(r)">
          <view class="rep-ic" :class="r.state">{{ r.icon }}</view>
          <view class="rep-body">
            <view class="rep-top">
              <text class="rep-name">{{ r.no }} {{ r.name }}</text>
              <text class="rep-st" :class="r.state">{{ r.stateTxt }}</text>
            </view>
            <view class="rep-desc">{{ r.desc }}</view>
            <view class="rep-lock" v-if="r.lockTxt && r.state !== 'ok'">🔒 {{ r.lockTxt }}</view>
            <view class="rep-ver" v-if="r.version">共 {{ r.version }} 版 · 最近 {{ r.savedDate }}</view>
          </view>
          <view class="rep-arrow" v-if="r.actionable">›</view>
        </view>
      </view>
    </view>

    <!-- 下一步待办 -->
    <view class="sec" v-if="mot.pending.length">
      <view class="sec-h"><text class="em">✅</text>下一步待办</view>
      <view class="todo-row" v-for="(p, i) in mot.pending" :key="i" @tap="goTodo(p)">
        <view class="todo-dot" :class="{ go: p.key === 'insight' }"></view>
        <view class="todo-txt">{{ p.label }}</view>
        <view class="todo-arrow" v-if="p.key === 'insight'">›</view>
      </view>
    </view>

    <!-- 闸门提示 -->
    <view class="gate" v-if="!mot.gates.g1">
      <view class="gate-t">闸门1：需求确认</view>
      <view class="gate-d">①需求洞察未经客户确认前，②房源提案不开放。请先完成问诊并请客户确认。</view>
    </view>

    <!-- 客户时间线 -->
    <view class="sec" v-if="timeline.length">
      <view class="sec-h"><text class="em">🗓</text>服务时间线</view>
      <view class="tl-row" v-for="(t, i) in timeline" :key="i">
        <view class="tl-dot" :class="'tl-' + t.type"></view>
        <view class="tl-body">
          <view class="tl-txt">{{ t.summary }}</view>
          <view class="tl-time">{{ fmtTime(t.at) }}</view>
        </view>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { MOT_REPORTS, deriveMotState, getReport, isReportActionable } from '../../utils/mot'
import { trackPageview } from '../../utils/tracker'

export default {
  data() {
    return { clientId: '' }
  },
  computed: {
    userStore() { return useUserStore() },
    motSteps() { return ['探索', '提议', '行动', '确认', '售后'] },
    client() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return {}
      return this.decorate(c)
    },
    mot() { return deriveMotState(this.userStore.getClient(this.clientId)) },
    reportRows() {
      const c = this.userStore.getClient(this.clientId)
      return MOT_REPORTS.map(r => {
        const rep = getReport(c, r.key)
        const state = rep ? 'ok' : (r.key === 'insight' ? 'todo' : 'lock')
        return {
          ...r,
          state,
          stateTxt: rep ? '已产出' : (r.key === 'insight' ? '可开始' : '待样本'),
          lockTxt: rep ? '' : r.lock,
          version: rep ? (c.reports || []).filter(x => x.type === r.key).length : 0,
          savedDate: rep ? this.fmtDate(rep.savedAt) : '',
          actionable: isReportActionable(r.key) && (!rep || r.key === 'insight')
        }
      })
    },
    timeline() {
      const c = this.userStore.getClient(this.clientId)
      return (c && c.timeline) || []
    }
  },
  onLoad(options) {
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    this.clientId = (options && options.id) || this.userStore.focusClientId || ''
    if (this.clientId) this.userStore.focusClientId = null
  },
  onShow() { trackPageview('client_detail') },
  methods: {
    decorate(c) {
      const palette = ['#3D5A3E', '#C46A3A', '#9c7c3a', '#5E7291']
      const typeKey = c.ctype || '购房'
      const map = { '学区': { icon: '🏫', name: '购房' }, '改善': { icon: '🏠', name: '购房' }, '首置': { icon: '🔑', name: '购房' }, '租赁': { icon: '📄', name: '租赁' }, '业主售房': { icon: '💰', name: '业主' }, '购房': { icon: '🏠', name: '购房' }, '售房': { icon: '💰', name: '售房' } }
      const mt = map[typeKey] || { icon: '🏠', name: '购房' }
      const colorMap = { buy: 'green', sell: 'orange', rent: 'blue', owner: 'gold' }
      return {
        ...c,
        avatar: (c.name || '客')[0],
        avatarColor: c.id ? palette[c.id.length % palette.length] : palette[0],
        businessIcon: mt.icon,
        businessTypeName: mt.name,
        businessColor: colorMap[mt.icon === '📄' ? 'rent' : (mt.icon === '💰' && typeKey === '售房' ? 'sell' : (mt.icon === '💰' ? 'owner' : 'buy'))]
      }
    },
    onReport(r) {
      if (!r.actionable) {
        uni.showToast({ title: r.state === 'ok' ? '②-⑤ 待样本接入后查看' : '当前为样本锁定态', icon: 'none' })
        return
      }
      if (r.key === 'insight') {
        uni.navigateTo({ url: '/pages/insight-prep/index?clientId=' + this.clientId })
      }
    },
    goTodo(p) {
      if (p.key === 'insight') {
        // ① 需求：无论未做问诊还是已做待确认，都回到问诊页（可补录 / 补客户确认）
        uni.navigateTo({ url: '/pages/insight-prep/index?clientId=' + this.clientId })
      } else {
        uni.showToast({ title: '该项等待知识底座样本接入', icon: 'none' })
      }
    },
    goEdit() {
      uni.navigateTo({ url: '/pages/clients/edit?id=' + this.clientId })
    },
    fmtTime(ts) {
      const d = new Date(ts)
      return d.toLocaleDateString('zh-CN') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    },
    fmtDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN')
    }
  }
}
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; }
.client-card { display: flex; align-items: center; gap: 14px; background: var(--green-grad); border-radius: var(--radius-lg); padding: 18px 16px; margin: 0 16px 16px; color: #fff; }
.cc-av { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; flex-shrink: 0; }
.cc-body { flex: 1; min-width: 0; }
.cc-name { font-size: 17px; font-weight: 800; color: #fff; }
.cc-meta { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.cc-meta .tag { font-size: 11px; padding: 3px 8px; border-radius: 999px; }
.tag-cream { background: rgba(255,255,255,.18); color: #fff; }
.tag-green { background: rgba(255,255,255,.18); color: #fff; }
.cc-note { font-size: 12px; color: rgba(255,255,255,.8); margin-top: 8px; line-height: 1.45; }
.cc-edit { font-size: 12px; color: rgba(255,255,255,.9); padding: 6px 10px; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; flex-shrink: 0; }
.sec { background: #fff; border-radius: var(--radius-lg); padding: 16px; margin: 0 16px 16px; box-shadow: var(--shadow-sm); }
.sec-h { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 14px; }
.em { font-size: 18px; }
.sec-tag { margin-left: auto; font-size: 11px; color: var(--orange); background: var(--orange-light); padding: 3px 10px; border-radius: 999px; font-weight: 700; }
.mot-track { display: flex; justify-content: space-between; }
.mot-node { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 20%; }
.mot-ic { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; background: #d8d3c8; }
.mot-node.done .mot-ic { background: var(--green); }
.mot-node.cur .mot-ic { background: var(--orange); box-shadow: 0 0 0 4px var(--orange-light); }
.mot-node.lock .mot-ic { color: #a89f92; }
.mot-t { font-size: 10px; color: var(--text-secondary); }
.mot-line { height: 4px; background: #e8e2d6; border-radius: 2px; margin: 12px 14px 0; overflow: hidden; }
.mot-line-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--orange)); border-radius: 2px; transition: width .3s; }
.rep-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed var(--border); }
.rep-item:last-child { border-bottom: none; }
.rep-ic { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: #f2eee5; flex-shrink: 0; }
.rep-ic.ok { background: var(--green-light); }
.rep-body { flex: 1; min-width: 0; }
.rep-top { display: flex; align-items: center; gap: 8px; }
.rep-name { font-size: 14px; font-weight: 800; color: var(--text); }
.rep-st { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.rep-st.ok { color: var(--green); background: var(--green-light); }
.rep-st.todo { color: var(--orange); background: var(--orange-light); }
.rep-st.lock { color: var(--text-secondary); background: #f2eee5; }
.rep-desc { font-size: 11px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5; }
.rep-lock { font-size: 11px; color: var(--orange); margin-top: 4px; }
.rep-ver { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.rep-arrow { font-size: 18px; color: #c8c2b6; flex-shrink: 0; }
.todo-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px dashed var(--border); }
.todo-row:last-child { border-bottom: none; }
.todo-dot { width: 8px; height: 8px; border-radius: 50%; background: #d8d3c8; flex-shrink: 0; }
.todo-dot.go { background: var(--orange); }
.todo-txt { flex: 1; font-size: 13px; color: var(--text); }
.todo-arrow { font-size: 16px; color: #c8c2b6; }
.gate { background: #fff7ef; border: 1px solid #f0dcc6; border-radius: var(--radius-lg); padding: 14px 16px; margin: 0 16px 16px; }
.gate-t { font-size: 13px; font-weight: 800; color: var(--orange); margin-bottom: 4px; }
.gate-d { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }
.tl-row { display: flex; gap: 10px; padding: 9px 0; }
.tl-dot { width: 8px; height: 8px; border-radius: 50%; background: #d8d3c8; margin-top: 5px; flex-shrink: 0; }
.tl-body { flex: 1; }
.tl-txt { font-size: 13px; color: var(--text); line-height: 1.5; }
.tl-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.bottom-space { height: 24px; }
</style>
