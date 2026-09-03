<template>
  <view class="page">
    <!-- 顶部：当前客户指示 -->
    <view class="client-bar" v-if="selectedClient" @tap="showClientPicker = true">
      <view class="cb-avatar">{{ selectedClient.surname }}</view>
      <view class="cb-info">
        <view class="cb-name">{{ selectedClient.name }}</view>
        <view class="cb-meta">{{ selectedClient.rel }} · {{ selectedClient.stage || '未填阶段' }}</view>
      </view>
      <text class="cb-arrow">›</text>
    </view>
    <view class="client-bar empty-bar" v-else @tap="showClientPicker = true">
      <text class="cb-empty-icon">👤</text>
      <text class="cb-empty-txt">请先选择服务客户</text>
      <text class="cb-arrow">›</text>
    </view>

    <!-- 空态引导 -->
    <view v-if="!selectedClient" class="guide-card">
      <view class="guide-t">选择客户后开启 MOT 服务流程</view>
      <view class="guide-s">七步服务闭环，帮客户买对房、买好房</view>
    </view>

    <!-- 七步骤卡片 -->
    <view v-else>
      <view class="steps-header">
        <text class="sh-title">服务全流程</text>
        <text class="sh-tip">顺序解锁 · 每步确认后进入下一阶段</text>
      </view>

      <view class="step-card" v-for="(step, idx) in steps" :key="step.key"
        :class="getStepClass(step.key)"
        @tap="onStepTap(step)">
        <!-- 序号圆 -->
        <view class="sc-left">
          <view class="sc-num" :class="getStepNumClass(step.key)">{{ step.key }}</view>
          <view class="sc-line" v-if="idx < steps.length - 1"></view>
        </view>
        <!-- 内容 -->
        <view class="sc-body">
          <view class="sc-title">{{ step.name }}</view>
          <view class="sc-sub">{{ step.desc }}</view>
          <!-- 状态标签 -->
          <view class="sc-status">
            <text v-if="stepStatus(step.key) === 'done'" class="st done-st">已完成</text>
            <text v-else-if="stepStatus(step.key) === 'active'" class="st active-st">进行中</text>
            <text v-else-if="stepStatus(step.key) === 'locked'" class="st locked-st">未解锁</text>
            <text v-if="stepTag(step.key)" class="st-tag">{{ stepTag(step.key) }}</text>
          </view>
          <!-- 行动按钮 -->
          <view v-if="stepStatus(step.key) !== 'locked'" class="sc-action" @tap.stop="onStepTap(step)">
            <button class="sc-btn" :class="stepStatus(step.key) === 'active' ? 'sc-btn-active' : 'sc-btn-view'">
              {{ stepStatus(step.key) === 'done' ? '查看报告 →' : step.actionLabel }}
            </button>
          </view>
        </view>
        <!-- 锁图标 -->
        <text v-if="stepStatus(step.key) === 'locked'" class="sc-lock">🔒</text>
        <text v-else-if="stepStatus(step.key) === 'done'" class="sc-check">✓</text>
      </view>
    </view>

    <!-- 客户选择浮层 -->
    <view v-if="showClientPicker" class="overlay active">
      <view class="ov-nav">
        <button class="back" @tap="showClientPicker = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">选择服务客户</view><view class="sub">选择一个客户开始 MOT 服务流程</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view v-if="clientList.length === 0" class="empty-list">还没有客户，请先去「客户档案」新建。</view>
        <view class="pick-item" v-for="c in clientList" :key="c.id" @tap="selectClient(c)">
          <view class="pi-name">{{ c.name }}</view>
          <view class="pi-meta">{{ c.rel }} · {{ c.stage || '未填' }} · {{ c.status }}</view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'

// 七步骤定义
const STEPS = [
  { key: 1, name: '客户建档', desc: '新建客户信息，完善需求背景', actionLabel: '去建档 →', route: null },
  { key: 2, name: '需求洞察', desc: 'MOT① 七维分析 + 客户分型', actionLabel: '开始洞察 →', route: '/package-mot/pages/insight/index', gate: 'step2Confirmed' },
  { key: 3, name: '房源提案', desc: 'MOT② 匹配推荐 + 讲房话术', actionLabel: '录入提案 →', route: '/package-mot/pages/proposal/index', gate: 'step3Confirmed' },
  { key: 4, name: '带看分析', desc: 'MOT③ 讲房执行 + 意向判断', actionLabel: '开始带看 →', route: '/package-mot/pages/showing/index' },
  { key: 5, name: '谈判斡旋', desc: 'MOT④ 博弈策略 + 筹码清单', actionLabel: '录入谈判 →', route: null },
  { key: 6, name: '成交售后', desc: 'MOT⑤ 签约交付 + 里程碑', actionLabel: '录入成交 →', route: null },
  { key: 7, name: '持续维护', desc: 'MOT⑥ 关系健康 + 转介绍', actionLabel: '维护关系 →', route: null },
]

export default {
  data() {
    return {
      selectedClientId: null,
      showClientPicker: false,
      steps: STEPS
    }
  },
  computed: {
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients },
    selectedClient() {
      if (!this.selectedClientId) return null
      return this.userStore.getClient(this.selectedClientId)
    }
  },
  onLoad() {
    trackPageview('mot')
    // 尝试恢复上次选中的客户
    const last = uni.getStorageSync('fs_mot_client_id')
    if (last) {
      const c = this.userStore.getClient(last)
      if (c) this.selectedClientId = last
    }
  },
  onShow() {
    // 从其他页返回时刷新选中客户数据
    if (this.selectedClientId) {
      const c = this.userStore.getClient(this.selectedClientId)
      if (c) {
        // 刷新引用以防 store 变化
        this.selectedClientId = c.id
      }
    }
  },
  methods: {
    selectClient(c) {
      this.selectedClientId = c.id
      uni.setStorageSync('fs_mot_client_id', c.id)
      this.showClientPicker = false
    },
    getStepClass(key) {
      const st = this.stepStatus(key)
      return {
        'step-done': st === 'done',
        'step-active': st === 'active',
        'step-locked': st === 'locked',
      }
    },
    getStepNumClass(key) {
      const st = this.stepStatus(key)
      return {
        'num-done': st === 'done',
        'num-active': st === 'active',
        'num-locked': st === 'locked',
      }
    },
    stepStatus(key) {
      if (!this.selectedClient) return 'locked'
      const lc = this.selectedClient.lifecycle || {}
      const current = lc.currentStep || 1
      // ★ V3.7.3 以真实证据判定状态（兼容旧数据 currentStep 未推进的情况）
      const reports = this.selectedClient.reports || []
      const evidenceDone = {
        1: !!(lc.step1CompletedAt || lc.currentStep > 1),
        2: !!reports.find(r => r.type === 'insight' && r.confirmed),
        3: !!reports.find(r => r.type === 'proposal' && r.confirmed),
        4: !!reports.find(r => r.type === 'showing'),
      }
      // 步骤1：建档完成则 done，否则 active（新建客户即建档）
      if (key === 1) return evidenceDone[1] ? 'done' : 'active'
      // 已有对应报告 → 已完成
      if (evidenceDone[key]) return 'done'
      // 前置步骤全部完成 → 当前可进行
      let prevOk = true
      for (let k = 1; k < key; k++) {
        if (!evidenceDone[k]) { prevOk = false; break }
      }
      if (prevOk) return 'active'
      // 否则未解锁
      return 'locked'
    },
    stepTag(key) {
      if (!this.selectedClient || !this.selectedClient.reports) return null
      const reports = this.selectedClient.reports
      const map = { 2: 'insight', 3: 'proposal', 4: 'showing' }
      const type = map[key]
      if (!type) return null
      const r = reports.filter(r => r.type === type).sort((a, b) => b.createdAt - a.createdAt)[0]
      if (!r) return null
      return r.reportNo + (r.confirmed ? ' ✓' : ' · 草稿')
    },
    onStepTap(step) {
      const st = this.stepStatus(step.key)
      if (st === 'locked') {
        uni.showToast({ title: '请先完成前置步骤', icon: 'none' })
        return
      }
      // 步骤1：跳转客户档案（未建档→新建入口；已建档→档案详情）
      if (step.key === 1) {
        const st = this.stepStatus(1)
        if (st === 'done') {
          // tabBar 页无法 URL 带参，经 store.focusClientId 传递目标客户
          this.userStore.focusClientId = this.selectedClientId
          uni.switchTab({ url: '/pages/clients/index' })
        } else {
          uni.switchTab({ url: '/pages/clients/index' })
        }
        return
      }
      // 有路由的页面直接跳转
      if (step.route) {
        uni.navigateTo({ url: step.route + '?clientId=' + this.selectedClientId })
        return
      }
      // 其他步骤暂未实现
      uni.showToast({ title: step.name + ' 开发中，敬请期待', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { height: 100vh; padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); background: #f7f4ef; box-sizing: border-box; overflow-y: auto; -webkit-overflow-scrolling: touch; }

/* 客户条 */
.client-bar { display: flex; align-items: center; background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 16px; border: 1px solid #e7e0d4; cursor: pointer; }
.empty-bar { justify-content: center; gap: 8px; color: #8a837a; }
.cb-avatar { width: 42px; height: 42px; border-radius: 50%; background: #3d5a3e; color: #fff; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
.cb-info { flex: 1; }
.cb-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.cb-meta { font-size: 12px; color: #8a837a; margin-top: 2px; }
.cb-arrow { font-size: 20px; color: #ccc; }
.cb-empty-icon { font-size: 20px; }
.cb-empty-txt { font-size: 14px; color: #8a837a; }

/* 引导卡片 */
.guide-card { background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%); border-radius: 16px; padding: 24px 18px; text-align: center; }
.guide-t { color: #fff; font-size: 17px; font-weight: 700; margin-bottom: 6px; }
.guide-s { color: rgba(255,255,255,0.75); font-size: 13px; }

/* 步骤头部 */
.steps-header { margin-bottom: 16px; }
.sh-title { display: block; font-size: 18px; font-weight: 800; color: #3d5a3e; margin-bottom: 2px; }
.sh-tip { font-size: 12px; color: #8a837a; }

/* 步骤卡片 */
.step-card { display: flex; background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #e7e0d4; position: relative; }
.step-done { opacity: 0.75; }
.step-locked { opacity: 0.5; }

.sc-left { display: flex; flex-direction: column; align-items: center; margin-right: 14px; }
.sc-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.num-done { background: #3a8f5b; color: #fff; }
.num-active { background: #c46a3a; color: #fff; }
.num-locked { background: #e0d8cc; color: #aaa; }
.sc-line { width: 2px; flex: 1; background: #e7e0d4; margin-top: 6px; }

.sc-body { flex: 1; }
.sc-title { font-size: 15px; font-weight: 700; color: #2b2b2b; margin-bottom: 3px; }
.sc-sub { font-size: 12px; color: #8a837a; line-height: 1.5; }
.sc-status { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
.st { font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.done-st { background: #eef6ef; color: #3a8f5b; }
.active-st { background: #fff4ec; color: #c46a3a; }
.locked-st { background: #f0f0f0; color: #aaa; }
.st-tag { font-size: 10px; color: #8a837a; }

.sc-action { margin-top: 10px; }
.sc-btn { margin: 0; padding: 8px 16px; border-radius: 20px; font-size: 13px; display: inline-block; }
.sc-btn-active { background: #c46a3a; color: #fff; }
.sc-btn-view { background: #f0ece2; color: #3d5a3e; }

.sc-lock, .sc-check { font-size: 16px; position: absolute; top: 14px; right: 14px; }
.sc-check { color: #3a8f5b; }

/* 浮层 */
.overlay { position: fixed; inset: 0; background: #fff; z-index: 1000; display: flex; flex-direction: column; overflow: hidden; }
.ov-nav { display: flex; align-items: center; gap: 10px; padding: 14px 16px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); border-bottom: 1px solid #efe9dd; }
.back { margin: 0; width: 34px; height: 34px; border-radius: 50%; background: #f0ece2; color: #3d5a3e; font-size: 20px; line-height: 1; padding: 0; }
.sub { font-size: 12px; color: #999; }
.ovcontent { height: 0; flex: 1; padding: 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.pick-item { background: #fff; border: 1px solid #e7e0d4; border-radius: 10px; padding: 12px; margin-bottom: 10px; cursor: pointer; }
.pi-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.pi-meta { font-size: 12px; color: #888; margin-top: 2px; }
.empty-list { text-align: center; color: #aaa; font-size: 14px; padding: 40px 0; }
</style>
