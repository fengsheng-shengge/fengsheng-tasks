<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · 带看复盘报告</view>
      <view class="h1">MOT③ 带看复盘</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <!-- 无数据引导 -->
    <view class="no-data" v-if="!reportData">
      <view class="nd-ico">📭</view>
      <view class="nd-t">还没有带看复盘报告</view>
      <view class="nd-s">请先完成带看执行记录</view>
      <button class="btn-primary" @tap="goEntry">→ 去录入带看分析</button>
    </view>

    <template v-else>
      <!-- 报告编号 + 意向标签 -->
      <view :class="['intent-badge', intentBadge.cls]">
        <text class="ib-label">{{ intentBadge.label }}</text>
        <text class="ib-sep">·</text>
        <text class="ib-date">{{ reportData.showingDate }}</text>
        <text class="ib-sep">·</text>
        <text class="ib-method">{{ methodLabel }}</text>
      </view>

      <!-- 关联洞察锚定 -->
      <view class="insight-card">
        <view class="ic-h">📋 关联洞察报告</view>
        <view class="ic-row">
          <view class="ic-chip">
            <view class="ic-chip-label">客户类型</view>
            <view class="ic-chip-val">{{ insightTypeLabels }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">核心动机</view>
            <view class="ic-chip-val">{{ insightCoreDim }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">总价预算</view>
            <view class="ic-chip-val">{{ insightBudget }}</view>
          </view>
        </view>
      </view>

      <!-- 房源满意度 -->
      <view class="section-hd"><view>🏠 带看房源反馈</view></view>
      <view class="feedback-card">
        <view v-for="(fb, idx) in reportData.propertyFeedback" :key="idx" class="fb-row">
          <view class="fb-prop">房源 {{ idx + 1 }}</view>
          <view class="stars">
            <text v-for="s in 5" :key="s" :class="['star', { on: s <= fb.satisfaction }]">★</text>
          </view>
          <view class="fb-comment" v-if="fb.comment">"{{ fb.comment }}"</view>
        </view>
      </view>

      <!-- 五秘诀执行情况 -->
      <view class="section-hd"><view>🗣️ 五秘诀执行复盘</view></view>
      <view class="secrets-card">
        <view v-for="(sec, idx) in fiveSecrets" :key="idx" class="sec-item">
          <view class="si-left">
            <view :class="['si-status', reportData.fiveSecretsExecution && reportData.fiveSecretsExecution[sec.key] ? 'done' : 'skip']">
              {{ reportData.fiveSecretsExecution && reportData.fiveSecretsExecution[sec.key] ? '✓' : '○' }}
            </view>
          </view>
          <view class="si-right">
            <view class="si-name">{{ sec.name }}</view>
            <view class="si-tip">{{ sec.tip }}</view>
            <view v-if="reportData.fiveSecretsExecution && reportData.fiveSecretsExecution[sec.key]" class="si-rating">
              评级：<text :class="['rating-tag', reportData.fiveSecretsExecution[sec.key].rating]">{{ ratingLabel(reportData.fiveSecretsExecution[sec.key].rating) }}</text>
            </view>
            <view v-else class="si-rating skip-text">未执行</view>
          </view>
        </view>
        <view class="exec-summary">
          <text class="exec-pct">{{ execPercent }}%</text>
          <text class="exec-label">执行率 · {{ execCount }}/{{ fiveSecrets.length }} 秘诀已执行</text>
        </view>
      </view>

      <!-- 整体效果 -->
      <view class="section-hd"><view>📊 整体效果</view></view>
      <view class="overall-card">
        <view class="oc-rating">
          <text class="oc-label">效果评级</text>
          <text :class="['rating-big', reportData.overallRating]">{{ overallRatingLabel }}</text>
        </view>
        <view class="oc-notes" v-if="reportData.notes">
          <text class="oc-label">执行备注</text>
          <text class="oc-text">{{ reportData.notes }}</text>
        </view>
      </view>

      <!-- 意向判断 -->
      <view class="section-hd"><view>🎯 意向判断</view></view>
      <view :class="['intent-card', intentBadge.cls]">
        <view class="intent-main">
          <text class="intent-level">{{ intentBadge.label }}</text>
          <text class="intent-reason" v-if="reportData.intentReason">{{ reportData.intentReason }}</text>
        </view>
        <view class="key-quote" v-if="reportData.keyQuote">
          <text class="kq-label">客户原话</text>
          <text class="kq-text">"{{ reportData.keyQuote }}"</text>
        </view>
      </view>

      <!-- 下一步行动 -->
      <view class="section-hd"><view>📌 下一步行动</view></view>
      <view class="action-card">
        <view class="ac-icon">→</view>
        <view class="ac-text" v-if="reportData.nextAction">{{ reportData.nextAction }}</view>
        <view class="ac-empty" v-else>待填写</view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 100px"></view>

      <!-- 底部按钮 -->
      <view class="bottom-bar">
        <button class="btn-ghost" @tap="goMOT">← MOT服务</button>
        <button class="btn-primary" @tap="shareReport">分享报告</button>
      </view>
    </template>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

const FIVE_SECRETS = [
  { name: '秘诀一：参数→生活', tip: '把平米/朝向/楼层翻译成生活场景', key: 'life' },
  { name: '秘诀二：依据三件套', tip: '数据/比较/核验，每条带依据', key: 'evidence' },
  { name: '秘诀三：缺点三步法', tip: '承认影响→改造可能性', key: 'defect' },
  { name: '秘诀四：四维坐标', tip: '建筑/街区/人群/市场四维定位', key: 'coord' },
  { name: '秘诀五：个性化话术', tip: '根据八类客户类型定制', key: 'custom' },
]

const RATING_MAP = { excellent: '优秀', good: '良好', fair: '一般', poor: '差' }
const INTENT_MAP = { high: '高意向', medium: '中意向', low: '低意向', terminated: '终止跟进' }
const INTENT_CLS = { high: 'high', medium: 'medium', low: 'low', terminated: 'terminated' }
const METHOD_MAP = { alone: '独自带看', accompanied: '陪同带看', virtual: '线上带看' }

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportData: null,
      fiveSecrets: FIVE_SECRETS,
    }
  },
  computed: {
    userStore() { return useUserStore() },
    insightData() {
      return (this.client && this.client.lifecycle && this.client.lifecycle.insightData) || null
    },
    intentBadge() {
      const lvl = this.reportData && this.reportData.intentLevel || 'medium'
      return { label: INTENT_MAP[lvl] || lvl, cls: INTENT_CLS[lvl] || 'medium' }
    },
    methodLabel() {
      const m = this.reportData && this.reportData.showingMethod || 'alone'
      return METHOD_MAP[m] || m
    },
    insightTypeLabels() {
      if (!this.insightData || !this.insightData.types || !this.insightData.types.length) return '未分型'
      const map = {
        commuter: '通勤敏感型', first_home: '首次置业型', family_kid: '有娃家庭型',
        improve: '改善置换型', elder: '养老宜居型', invest: '投资增值型',
        study: '陪读求学型', price: '纯价格敏感型'
      }
      return this.insightData.types.map(k => map[k] || k).join(' · ')
    },
    insightCoreDim() {
      if (!this.insightData || !this.insightData.dims || !this.insightData.dims.length) return '未标'
      const nameMap = { safety: '物质安全', health: '健康', conv: '便利', econ: '经济', comfort: '舒适', beauty: '美观', free: '自在' }
      return nameMap[this.insightData.dims[0]] || this.insightData.dims[0]
    },
    insightBudget() {
      if (!this.client) return '未填'
      return this.client.asset || this.client.note || '未填'
    },
    execCount() {
      const exec = this.reportData && this.reportData.fiveSecretsExecution || {}
      return this.fiveSecrets.filter(s => exec[s.key] && exec[s.key].executed).length
    },
    execPercent() {
      if (!this.reportData) return 0
      return Math.round((this.execCount / this.fiveSecrets.length) * 100)
    },
    overallRatingLabel() {
      const r = this.reportData && this.reportData.overallRating || 'good'
      return RATING_MAP[r] || r
    },
  },
  onLoad(options) {
    trackPageview('showing_report')
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
      const report = this.userStore.getShowingReport(this.clientId)
      this.reportData = (report && report.data) || null
    },
    ratingLabel(r) {
      return RATING_MAP[r] || r || '—'
    },
    goEntry() {
      uni.navigateTo({ url: '/package-mot/pages/showing/index?clientId=' + this.clientId })
    },
    goMOT() {
      uni.switchTab({ url: '/pages/mot/index' })
    },
    shareReport() {
      uni.showToast({ title: '报告分享功能开发中', icon: 'none' })
    },
  }
}
</script>

<style scoped>
.page { padding: 0 0 120px; background: #f7f4ef; min-height: 100vh; }

/* 顶部 */
.top { background: linear-gradient(135deg, #2f4730 0%, #1e3320 100%); padding: 26px 18px 20px; }
.brand { font-size: 11px; color: rgba(255,255,255,.6); letter-spacing: 1px; }
.h1 { font-size: 22px; font-weight: 800; color: #fff; margin-top: 4px; }
.sub { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 4px; }

/* 无数据 */
.no-data { padding: 80px 40px; text-align: center; }
.nd-ico { font-size: 44px; }
.nd-t { font-size: 16px; font-weight: 700; color: #2b2b2b; margin: 10px 0 4px; }
.nd-s { font-size: 13px; color: #8a837a; margin-bottom: 20px; }
.btn-primary { background: #3d5a3e; color: #fff; border-radius: 12px; padding: 12px; font-size: 15px; font-weight: 700; display: block; border: none; }

/* 意向徽章 */
.intent-badge { margin: 12px 14px 0; padding: 10px 14px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-size: 13px; }
.intent-badge.high { background: #eef6ef; border: 1px solid #c4dbc5; color: #2e7d32; }
.intent-badge.medium { background: #fff8ec; border: 1px solid #f0d8c4; color: #c46a3a; }
.intent-badge.low { background: #fff0f0; border: 1px solid #f0c4c4; color: #9e6060; }
.intent-badge.terminated { background: #f0f0f0; border: 1px solid #ddd; color: #888; }
.ib-sep { color: #bbb; }

/* 洞察锚定卡 */
.insight-card { background: #fff; border-radius: 14px; margin: 12px 14px 0; padding: 14px; border: 1px solid #e7e0d4; }
.ic-h { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.ic-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ic-chip { flex: 1; min-width: 100px; background: #faf8f5; border-radius: 10px; padding: 10px; }
.ic-chip-label { font-size: 11px; color: #8a837a; }
.ic-chip-val { font-size: 13px; font-weight: 700; color: #2b2b2b; margin-top: 3px; }

/* 区块标题 */
.section-hd { margin: 18px 14px 8px; font-size: 15px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; }

/* 房源反馈 */
.feedback-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.fb-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #f0ece4; }
.fb-row:last-child { border-bottom: none; padding-bottom: 0; }
.fb-prop { font-size: 12px; color: #8a837a; min-width: 50px; }
.stars { display: flex; gap: 2px; }
.star { font-size: 14px; color: #ddd; }
.star.on { color: #f5c518; }
.fb-comment { font-size: 12px; color: #8a837a; font-style: italic; margin-left: 6px; }

/* 五秘诀 */
.secrets-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.sec-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px dashed #f0ece4; }
.sec-item:last-of-type { border-bottom: none; }
.si-left { flex-shrink: 0; padding-top: 2px; }
.si-status { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
.si-status.done { background: #eef6ef; color: #3a8f5b; border: 1.5px solid #3a8f5b; }
.si-status.skip { background: #f5f5f5; color: #ccc; border: 1.5px solid #ddd; }
.si-right { flex: 1; }
.si-name { font-size: 13px; font-weight: 700; color: #2b2b2b; }
.si-tip { font-size: 11px; color: #8a837a; margin-top: 2px; }
.si-rating { font-size: 12px; color: #3d5a3e; margin-top: 4px; font-weight: 700; }
.si-rating.skip-text { color: #ccc; font-weight: 400; }
.rating-tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.rating-tag.excellent { background: #e8f5e9; color: #2e7d32; }
.rating-tag.good { background: #e3f2fd; color: #1565c0; }
.rating-tag.fair { background: #fff3e0; color: #e65100; }
.rating-tag.poor { background: #ffebee; color: #c62828; }
.exec-summary { margin-top: 12px; padding-top: 10px; border-top: 1px solid #ede5d6; display: flex; align-items: center; gap: 8px; }
.exec-pct { font-size: 22px; font-weight: 800; color: #3d5a3e; }
.exec-label { font-size: 12px; color: #8a837a; }

/* 整体效果 */
.overall-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; flex-direction: column; gap: 10px; }
.oc-rating { display: flex; align-items: center; gap: 10px; }
.oc-label { font-size: 12px; color: #8a837a; }
.rating-big { font-size: 18px; font-weight: 800; padding: 3px 10px; border-radius: 6px; }
.rating-big.excellent { background: #e8f5e9; color: #2e7d32; }
.rating-big.good { background: #e3f2fd; color: #1565c0; }
.rating-big.fair { background: #fff3e0; color: #e65100; }
.rating-big.poor { background: #ffebee; color: #c62828; }
.oc-notes { display: flex; flex-direction: column; gap: 4px; }
.oc-text { font-size: 13px; color: #2b2b2b; line-height: 1.6; }

/* 意向判断 */
.intent-card { margin: 0 14px 10px; padding: 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 10px; }
.intent-card.high { background: #e8f5e9; border: 1px solid #a5d6a7; }
.intent-card.medium { background: #fff3e0; border: 1px solid #ffcc80; }
.intent-card.low { background: #fff0f0; border: 1px solid #ef9a9a; }
.intent-card.terminated { background: #f5f5f5; border: 1px solid #e0e0e0; }
.intent-main { display: flex; flex-direction: column; gap: 4px; }
.intent-level { font-size: 18px; font-weight: 800; }
.intent-card.high .intent-level { color: #2e7d32; }
.intent-card.medium .intent-level { color: #e65100; }
.intent-card.low .intent-level { color: #9e6060; }
.intent-card.terminated .intent-level { color: #888; }
.intent-reason { font-size: 13px; color: #2b2b2b; line-height: 1.6; }
.key-quote { display: flex; flex-direction: column; gap: 4px; }
.kq-label { font-size: 11px; color: #8a837a; }
.kq-text { font-size: 13px; color: #5a524a; font-style: italic; line-height: 1.5; }

/* 下一步行动 */
.action-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; align-items: flex-start; gap: 10px; }
.ac-icon { font-size: 16px; color: #3d5a3e; font-weight: 800; flex-shrink: 0; }
.ac-text { font-size: 14px; color: #2b2b2b; line-height: 1.6; }
.ac-empty { font-size: 13px; color: #ccc; font-style: italic; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ede5d6; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
.btn-primary { flex: 2; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; text-align: center; border: none; }
.btn-ghost { flex: 1; background: #f7f4ef; color: #5a524a; border: 1.5px solid #ede5d6; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; text-align: center; }
</style>
