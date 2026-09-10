<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · 签约交付报告</view>
      <view class="h1">MOT⑤ 签约交付</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <!-- 无数据引导 -->
    <view class="no-data" v-if="!reportData">
      <view class="nd-ico">🤝</view>
      <view class="nd-t">还没有成交记录</view>
      <view class="nd-s">请先登记成交信息</view>
      <button class="btn-primary" @tap="goEntry">→ 去录入成交</button>
    </view>

    <template v-else>
      <!-- 成交摘要徽章 -->
      <view class="deal-badge">
        <view class="db-icon">🎉</view>
        <view class="db-info">
          <view class="db-title">恭喜成交！</view>
          <view class="db-prop" v-if="reportData.property">{{ reportData.property }}</view>
          <view class="db-price" v-if="reportData.price">{{ reportData.price }} 万元</view>
        </view>
        <view class="db-date" v-if="reportData.dealDate">{{ reportData.dealDate }}</view>
      </view>

      <!-- 关联洞察锚定 -->
      <view class="insight-card" v-if="insightData">
        <view class="ic-h">📋 关联需求洞察</view>
        <view class="ic-row">
          <view class="ic-chip" v-if="insightData.types && insightData.types.length">
            <view class="ic-chip-label">客户类型</view>
            <view class="ic-chip-val">{{ insightTypeLabel }}</view>
          </view>
          <view class="ic-chip" v-if="insightData.dims && insightData.dims.length">
            <view class="ic-chip-label">核心动机</view>
            <view class="ic-chip-val">{{ insightDimLabel }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">预算匹配</view>
            <view class="ic-chip-val">{{ matchPrice }}</view>
          </view>
        </view>
      </view>

      <!-- 交付里程碑 -->
      <view class="section-hd"><view>🗓️ 交付里程碑</view></view>
      <view class="milestones-card">
        <view class="ms-item" v-for="(ms, idx) in milestones" :key="idx" :class="{ done: ms.done, future: !ms.done }">
          <view class="ms-dot">
            <text v-if="ms.done" class="ms-check">✓</text>
            <text v-else class="ms-num">{{ idx + 1 }}</text>
          </view>
          <view class="ms-line" v-if="idx < milestones.length - 1"></view>
          <view class="ms-body">
            <view class="ms-name">{{ ms.name }}</view>
            <view class="ms-date" v-if="ms.date">{{ ms.date }}</view>
            <view class="ms-note" v-if="ms.note">{{ ms.note }}</view>
          </view>
        </view>
      </view>

      <!-- 售后计划 -->
      <view class="section-hd"><view>💌 售后计划（转介绍飞轮）</view></view>
      <view class="after-card" v-if="reportData.afterPlan">
        <text class="after-text">{{ reportData.afterPlan }}</text>
      </view>
      <view class="after-card empty" v-else>
        <text class="after-empty">暂无售后计划</text>
      </view>

      <!-- 转介绍线索 -->
      <view class="section-hd"><view>🌟 转介绍价值</view></view>
      <view class="referral-card">
        <view class="rc-prompt">这张单子预计能带来多少转介绍？</view>
        <view class="referral-options">
          <view v-for="o in referralOpts" :key="o.value" :class="['ro-item', { on: reportData.referralExpect === o.value }]"
            @tap="reportData.referralExpect = o.value">
            <text class="ro-ico">{{ o.ico }}</text>
            <text class="ro-label">{{ o.label }}</text>
          </view>
        </view>
      </view>

      <!-- 经纪人备注 -->
      <view class="section-hd"><view>📝 经纪人备注</view></view>
      <view class="notes-card">
        <textarea class="notes-inp" v-model="reportData.agentNotes" placeholder="总结本次服务的亮点与不足，为下一单做准备…" maxlength="300"></textarea>
        <view class="notes-count">{{ (reportData.agentNotes || '').length }}/300</view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 100px"></view>

      <!-- 底部按钮 -->
      <view class="bottom-bar">
        <button class="btn-ghost" @tap="goMOT">← MOT服务</button>
        <button class="btn-primary" @tap="goMaintain">进入持续维护 →</button>
      </view>
    </template>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

const REFERRAL_OPTS = [
  { value: 'high', label: '高（≥2组）', ico: '🌟' },
  { value: 'medium', label: '中（1组）', ico: '⭐' },
  { value: 'low', label: '待培育', ico: '🌱' },
]

// 标准二手房交付节点
const MILESTONE_TEMPLATES = [
  { name: '签约', key: 'sign', note: '定金/意向金已付' },
  { name: '贷款审批', key: 'loan', note: '商业/公积金贷款材料提交' },
  { name: '过户', key: 'transfer', note: '产权过户登记' },
  { name: '交房', key: 'handover', note: '钥匙交接、物业结算' },
]

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportData: null,
      reportNo: '',
      referralOpts: REFERRAL_OPTS,
    }
  },
  computed: {
    userStore() { return useUserStore() },
    insightData() {
      return (this.client && this.client.lifecycle && this.client.lifecycle.insightData) || null
    },
    insightTypeLabel() {
      const map = {
        commuter: '通勤敏感型', first_home: '首次置业型', family_kid: '有娃家庭型',
        improve: '改善置换型', elder: '养老宜居型', invest: '投资增值型',
        study: '陪读求学型', price: '纯价格敏感型'
      }
      const t = this.insightData && this.insightData.types && this.insightData.types[0] || ''
      return map[t] || t || '未分型'
    },
    insightDimLabel() {
      const nameMap = { safety: '物质安全', health: '健康', conv: '便利', econ: '经济', comfort: '舒适', beauty: '美观', free: '自在' }
      const d = this.insightData && this.insightData.dims && this.insightData.dims[0] || ''
      return nameMap[d] || d || '未标'
    },
    matchPrice() {
      if (!this.client) return '—'
      const budget = this.client.asset || ''
      const deal = this.reportData && this.reportData.price || ''
      return deal ? `${deal}万（成交）` : budget || '—'
    },
    milestones() {
      // 根据成交价格估算节点，标注已完成
      const price = parseFloat(this.reportData.price) || 0
      const isFullCash = price > 0 // 简化判断：实际应从报告中读
      return MILESTONE_TEMPLATES.map((ms, i) => ({
        ...ms,
        done: i === 0, // 签约默认已完成
        date: '',
      }))
    },
  },
  onLoad(options) {
    trackPageview('deal_report')
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
        .filter(r => r.type === 'deal')
        .sort((a, b) => b.createdAt - a.createdAt)[0]
      if (report) {
        this.reportNo = report.reportNo || ''
        this.reportData = report.data ? { ...report.data } : {}
      }
    },
    goEntry() {
      uni.navigateTo({ url: '/package-mot/pages/deal/index?clientId=' + this.clientId })
    },
    goMOT() {
      uni.switchTab({ url: '/pages/mot/index' })
    },
    goMaintain() {
      uni.navigateTo({ url: '/package-mot/pages/maintain/index?clientId=' + this.clientId })
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

/* 成交徽章 */
.deal-badge { margin: 12px 14px 0; background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.db-icon { font-size: 32px; }
.db-info { flex: 1; }
.db-title { font-size: 16px; font-weight: 800; color: #fff; }
.db-prop { font-size: 12px; color: rgba(255,255,255,.85); margin-top: 3px; }
.db-price { font-size: 20px; font-weight: 800; color: #ffd54f; margin-top: 2px; }
.db-date { font-size: 12px; color: rgba(255,255,255,.7); }

/* 洞察锚定 */
.insight-card { background: #fff; border-radius: 14px; margin: 12px 14px 0; padding: 14px; border: 1px solid #e7e0d4; }
.ic-h { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.ic-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ic-chip { flex: 1; min-width: 100px; background: #faf8f5; border-radius: 10px; padding: 10px; }
.ic-chip-label { font-size: 11px; color: #8a837a; }
.ic-chip-val { font-size: 13px; font-weight: 700; color: #2b2b2b; margin-top: 3px; }

.section-hd { margin: 18px 14px 8px; font-size: 15px; font-weight: 700; color: #2b2b2b; }

/* 里程碑 */
.milestones-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; display: flex; flex-direction: column; }
.ms-item { display: flex; gap: 12px; position: relative; }
.ms-item.future { opacity: 0.6; }
.ms-dot { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: #e0e0e0; color: #fff; }
.ms-item.done .ms-dot { background: #3a8f5b; }
.ms-check { color: #fff; font-size: 12px; }
.ms-num { color: #aaa; }
.ms-line { position: absolute; left: 11px; top: 24px; width: 2px; height: 20px; background: #e0e0e0; }
.ms-item.done .ms-line { background: #3a8f5b; }
.ms-body { flex: 1; padding-bottom: 14px; }
.ms-name { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.ms-date { font-size: 12px; color: #8a837a; margin-top: 2px; }
.ms-note { font-size: 12px; color: #aaa; margin-top: 2px; }

/* 售后计划 */
.after-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.after-text { font-size: 14px; color: #2b2b2b; line-height: 1.7; }
.after-empty { font-size: 13px; color: #ccc; font-style: italic; }

/* 转介绍 */
.referral-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.rc-prompt { font-size: 13px; color: #8a837a; margin-bottom: 10px; }
.referral-options { display: flex; gap: 10px; }
.ro-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 10px; background: #f0ece4; cursor: pointer; border: 2px solid transparent; }
.ro-item.on { background: #eef6ef; border-color: #3a8f5b; }
.ro-ico { font-size: 20px; }
.ro-label { font-size: 12px; color: #5a524a; font-weight: 600; text-align: center; }
.ro-item.on .ro-label { color: #2e7d32; }

/* 备注 */
.notes-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.notes-inp { width: 100%; min-height: 100px; background: #faf8f5; border: 1px solid #ede5d6; border-radius: 10px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.notes-count { text-align: right; font-size: 11px; color: #aaa; margin-top: 4px; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ede5d6; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
.btn-primary { flex: 2; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; text-align: center; border: none; }
.btn-ghost { flex: 1; background: #f7f4ef; color: #5a524a; border: 1.5px solid #ede5d6; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; text-align: center; }
</style>
