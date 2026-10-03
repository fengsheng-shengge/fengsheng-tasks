<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · 谈判复盘报告</view>
      <view class="h1">MOT④ 谈判复盘</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <!-- 无数据引导 -->
    <view class="no-data" v-if="!reportData">
      <view class="nd-ico">⚔️</view>
      <view class="nd-t">还没有谈判记录</view>
      <view class="nd-s">请先录入谈判斡旋记录</view>
      <button class="btn-primary" @tap="goEntry">→ 去录入谈判</button>
    </view>

    <template v-else>
      <!-- 报告编号 -->
      <view class="report-meta">
        <text class="rm-no">{{ reportNo }}</text>
        <text class="rm-sep">·</text>
        <text class="rm-date">{{ reportData._savedAt || '' }}</text>
      </view>

      <!-- 谈判目标与筹码 -->
      <view class="section-hd"><view>🎯 我方策略</view></view>
      <view class="strategy-card">
        <view class="sc-row" v-if="reportData.goal">
          <view class="sc-label">谈判目标</view>
          <view class="sc-value">{{ reportData.goal }}</view>
        </view>
        <view class="sc-row" v-if="reportData.chips">
          <view class="sc-label">筹码清单</view>
          <view class="sc-value chips">{{ reportData.chips }}</view>
        </view>
        <view class="sc-row" v-if="reportData.strategy">
          <view class="sc-label">博弈策略</view>
          <view :class="['strategy-badge', reportData.strategy]">{{ strategyLabel }}</view>
        </view>
      </view>

      <!-- 对手分析 -->
      <view class="section-hd"><view>⚔️ 对手与立场</view></view>
      <view class="opponent-card" v-if="reportData.opponentStance">
        <view class="oc-stance">{{ reportData.opponentStance }}</view>
      </view>
      <view class="opponent-card empty" v-else>
        <text class="oc-empty">未填写对手立场</text>
      </view>

      <!-- 博弈进程可视化 -->
      <view class="section-hd"><view>📊 博弈进程</view></view>
      <view class="progress-card">
        <view class="pg-track">
          <view class="pg-label-left">我方底线</view>
          <view class="pg-bar">
            <view class="pg-fill" :style="{ width: progressFill + '%' }"></view>
          </view>
          <view class="pg-label-right">目标达成</view>
        </view>
        <view class="pg-score">
          <text class="pg-num">{{ progressPercent }}%</text>
          <text class="pg-label">目标达成率</text>
        </view>
      </view>

      <!-- 谈判结果 -->
      <view class="section-hd"><view>📋 谈判结果</view></view>
      <view :class="['result-card', resultCardClass]">
        <view class="rc-main" v-if="reportData.result">
          {{ reportData.result }}
        </view>
        <view class="rc-empty" v-else>待填写</view>
      </view>

      <!-- 下一步行动 -->
      <view class="section-hd"><view>📌 下一步行动</view></view>
      <view class="action-card">
        <view class="ac-icon">→</view>
        <view class="ac-text" v-if="reportData.nextAction">{{ reportData.nextAction }}</view>
        <view class="ac-empty" v-else>待填写</view>
      </view>

      <!-- 谈判要点提示 -->
      <view class="section-hd"><view>💡 谈判要点</view></view>
      <view class="tips-card">
        <view class="tip-item" v-for="(tip, idx) in tips" :key="idx">
          <text class="tip-ico">{{ tip.ico }}</text>
          <text class="tip-text">{{ tip.text }}</text>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 100px"></view>

      <!-- 底部按钮 -->
      <view class="bottom-bar">
        <button class="btn-ghost" @tap="goMOT">← MOT服务</button>
        <button class="btn-primary" @tap="goDeal">进入成交售后 →</button>
      </view>
    </template>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

const STRATEGY_MAP = {
  winwin: { label: '双赢方案', cls: 'winwin' },
  firm: { label: '坚守底线', cls: 'firm' },
  time: { label: '时间换空间', cls: 'time' },
  swap: { label: '条件互换', cls: 'swap' },
}

const TIPS = {
  winwin: [
    { ico: '🤝', text: '寻找双方利益交汇点，把饼做大而非切现有的饼' },
    { ico: '📋', text: '把对方诉求列出来，逐条讨论替代方案' },
    { ico: '⏰', text: '双赢不等于让步——明确自己的核心诉求绝不退让' },
  ],
  firm: [
    { ico: '📊', text: '用数据说话：近期成交记录、税费计算表、政策影响' },
    { ico: '🎯', text: '先确认对方底价，再亮出自己的底价，不要先报价' },
    { ico: '⏸️', text: '遇到僵局时主动暂停，给双方冷静期' },
  ],
  time: [
    { ico: '📈', text: '了解对方的时间压力：置换急不急、贷款什么时候到期' },
    { ico: '📅', text: '设置明确的时间节点，每轮谈判后约定下次时间' },
    { ico: '🚪', text: '适当表示"我还有其他客户也在谈"，给对方紧迫感' },
  ],
  swap: [
    { ico: '🔄', text: '让步必须是双向的：降价要换装修补贴、付款方式要换价格' },
    { ico: '📝', text: '每项让步都记录，最后打包谈判' },
    { ico: '✅', text: '口头协议后立即形成书面，防止对方反悔' },
  ],
}

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportData: null,
      reportNo: '',
    }
  },
  computed: {
    userStore() { return useUserStore() },
    strategyLabel() {
      const s = this.reportData && this.reportData.strategy || 'winwin'
      return STRATEGY_MAP[s] ? STRATEGY_MAP[s].label : s
    },
    progressPercent() {
      // 根据结果文本的积极程度估算
      const r = this.reportData && this.reportData.result || ''
      if (/达成|满意|接受|同意/.test(r)) return 85
      if (/差距|继续|还需/.test(r)) return 50
      if (/僵|破裂|终止/.test(r)) return 20
      return 60
    },
    progressFill() {
      return Math.min(100, Math.max(0, this.progressPercent))
    },
    resultCardClass() {
      const pct = this.progressPercent
      if (pct >= 75) return 'result-good'
      if (pct >= 45) return 'result-mid'
      return 'result-poor'
    },
    tips() {
      const s = this.reportData && this.reportData.strategy || 'winwin'
      return TIPS[s] || TIPS.winwin
    },
  },
  onLoad(options) {
    trackPageview('negotiation_report')
    if (options && options.clientId) {
      this.clientId = options.clientId
      this.loadData()
    }
  },
  onShow() { if (this.clientId) this.loadData() },
  methods: {
    loadData() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return
      this.client = c
      const reports = c.reports || []
      const report = reports
        .filter(r => r.type === 'negotiation')
        .sort((a, b) => b.createdAt - a.createdAt)[0]
      if (report) {
        this.reportNo = report.reportNo || ''
        this.reportData = report.data || null
        if (report.createdAt) {
          const d = new Date(report.createdAt)
          this.reportData = { ...this.reportData, _savedAt: `${d.getMonth()+1}月${d.getDate()}日` }
        }
      }
    },
    goEntry() {
      uni.navigateTo({ url: '/package-mot/pages/negotiation/index?clientId=' + this.clientId })
    },
    goMOT() {
      uni.switchTab({ url: '/pages/mot/index' })
    },
    goDeal() {
      uni.navigateTo({ url: '/package-mot/pages/deal/index?clientId=' + this.clientId })
    },
  }
}
</script>

<style scoped>
.page { padding: 0 0 120px; background: #f7f4ef; min-height: 100vh; }

.top { background: linear-gradient(135deg, #2f4730 0%, #1e3320 100%); padding: 26px 18px 20px; }
.brand { font-size: 11px; color: rgba(255,255,255,.6); letter-spacing: 1px; }
.h1 { font-size: 22px; font-weight: 800; color: #fff; margin-top: 4px; }
.sub { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 4px; }

.no-data { padding: 80px 40px; text-align: center; }
.nd-ico { font-size: 44px; }
.nd-t { font-size: 16px; font-weight: 700; color: #2b2b2b; margin: 10px 0 4px; }
.nd-s { font-size: 13px; color: #8a837a; margin-bottom: 20px; }
.btn-primary { background: #3d5a3e; color: #fff; border-radius: 12px; padding: 12px; font-size: 15px; font-weight: 700; display: block; border: none; margin: 0 auto; }

.report-meta { margin: 12px 14px 0; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #8a837a; }
.rm-sep { color: #ddd; }
.rm-no { font-weight: 700; color: #3d5a3e; }

.section-hd { margin: 18px 14px 8px; font-size: 15px; font-weight: 700; color: #2b2b2b; }

/* 策略卡 */
.strategy-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; flex-direction: column; gap: 10px; }
.sc-row { display: flex; flex-direction: column; gap: 4px; }
.sc-label { font-size: 11px; color: #8a837a; }
.sc-value { font-size: 14px; color: #2b2b2b; line-height: 1.6; }
.sc-value.chips { color: #3d5a3e; font-weight: 600; }
.strategy-badge { display: inline-block; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
.strategy-badge.winwin { background: #e8f5e9; color: #2e7d32; }
.strategy-badge.firm { background: #e3f2fd; color: #1565c0; }
.strategy-badge.time { background: #fff3e0; color: #e65100; }
.strategy-badge.swap { background: #f3e5f5; color: #6a1b9a; }

/* 对手卡 */
.opponent-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.oc-stance { font-size: 14px; color: #2b2b2b; line-height: 1.6; }
.oc-empty { font-size: 13px; color: #ccc; font-style: italic; }

/* 进度条 */
.progress-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; flex-direction: column; gap: 12px; }
.pg-track { display: flex; align-items: center; gap: 8px; }
.pg-label-left, .pg-label-right { font-size: 11px; color: #8a837a; white-space: nowrap; }
.pg-bar { flex: 1; height: 8px; background: #f0ece4; border-radius: 4px; overflow: hidden; }
.pg-fill { height: 100%; background: linear-gradient(90deg, #3a8f5b, #c46a3a); border-radius: 4px; transition: width 0.6s ease; }
.pg-score { display: flex; align-items: center; gap: 8px; }
.pg-num { font-size: 24px; font-weight: 800; color: #3d5a3e; }
.pg-label { font-size: 12px; color: #8a837a; }

/* 结果卡 */
.result-card { margin: 0 14px 10px; padding: 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 6px; }
.result-good { background: #e8f5e9; border: 1px solid #a5d6a7; }
.result-mid { background: #fff3e0; border: 1px solid #ffcc80; }
.result-poor { background: #fff0f0; border: 1px solid #ef9a9a; }
.result-card .rc-main { font-size: 14px; color: #2b2b2b; line-height: 1.6; }
.result-card .rc-empty { font-size: 13px; color: #ccc; font-style: italic; }

/* 下一步行动 */
.action-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; align-items: flex-start; gap: 10px; }
.ac-icon { font-size: 16px; color: #3d5a3e; font-weight: 800; flex-shrink: 0; }
.ac-text { font-size: 14px; color: #2b2b2b; line-height: 1.6; }
.ac-empty { font-size: 13px; color: #ccc; font-style: italic; }

/* 要点提示 */
.tips-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; flex-direction: column; gap: 12px; }
.tip-item { display: flex; align-items: flex-start; gap: 10px; }
.tip-ico { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.tip-text { font-size: 13px; color: #5a524a; line-height: 1.6; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ede5d6; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
.btn-primary { flex: 2; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; text-align: center; border: none; }
.btn-ghost { flex: 1; background: #f7f4ef; color: #5a524a; border: 1.5px solid #ede5d6; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; text-align: center; }
</style>
