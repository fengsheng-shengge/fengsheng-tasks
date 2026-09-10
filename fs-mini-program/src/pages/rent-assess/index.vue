<template>
  <view class="page">
    <!-- 顶部品牌 -->
    <view class="top-header">
      <view class="th-brand">🌿 风声</view>
      <view class="th-title">居住测评</view>
      <view class="th-sub">了解您的真实居住需求，找房更精准</view>
    </view>

    <!-- 模式切换 -->
    <view class="mode-tabs">
      <view
        :class="['mode-tab', { active: mode === 'renter' }]"
        @tap="mode = 'renter'">
        🔑 租房版
      </view>
      <view
        :class="['mode-tab', { active: mode === 'buyer' }]"
        @tap="mode = 'buyer'">
        🏠 购房版
      </view>
    </view>

    <!-- ========== 租房版住得好测评 ========== -->
    <view v-if="mode === 'renter'">
      <!-- 封面 -->
      <view v-if="phase_r === 'intro'" class="intro-card">
        <view class="ic-badge">租房专属版</view>
        <view class="ic-title">🏠 住得好测评</view>
        <view class="ic-sub">7 维度摸清您的真实居住需求</view>
        <view class="ic-dims">财务承受 · 通勤便利 · 安全健康 · 居住条件 · 房屋状况 · 社区配套 · 租约条款</view>
        <view class="ic-info">
          <text>⏱️ 约 5 分钟</text><text>📝 7 题</text><text>📊 居住画像报告</text>
        </view>
        <view class="ic-hint">测完可一键生成选房策展包，找到最适配的房源</view>
        <button class="ic-btn" @tap="startRent">开始测评 ›</button>
      </view>

      <!-- 答题中 -->
      <view v-if="phase_r === 'doing'" class="quiz-wrap">
        <view class="quiz-progress">
          <text>第 {{ q_r + 1 }} / {{ Q_R.length }} 题</text>
          <view class="prog-bar"><view class="prog-fill" :style="{ width: (q_r / Q_R.length * 100) + '%' }"></view></view>
        </view>
        <view class="q-card">
          <view class="q-dim-badge" :style="{ background: Q_R[q_r].dimColor + '22', color: Q_R[q_r].dimColor }">
            {{ Q_R[q_r].dimEmoji }} {{ Q_R[q_r].dim }}
          </view>
          <view class="q-text">{{ Q_R[q_r].q }}</view>
          <view class="q-opts">
            <view v-for="(o, i) in Q_R[q_r].opts" :key="i"
              :class="['q-opt', { sel: ans_r[q_r] === i }]"
              @tap="pickR(q_r, i)">
              <text class="q-opt-label">{{ String.fromCharCode(65 + i) }}</text>
              <text class="q-opt-text">{{ o.label }}</text>
              <text class="q-opt-score" v-if="ans_r[q_r] === i">{{ o.score }}分</text>
            </view>
          </view>
        </view>
        <view class="q-foot">
          <button class="q-prev" v-if="q_r > 0" @tap="q_r--">‹ 上一题</button>
          <button class="q-next" v-if="q_r < Q_R.length - 1" :disabled="ans_r[q_r] === undefined" @tap="q_r++">下一题 ›</button>
          <button class="q-submit" v-if="q_r === Q_R.length - 1" :disabled="ans_r[q_r] === undefined" @tap="submitRent">提交报告 ›</button>
        </view>
      </view>

      <!-- 结果 -->
      <view v-if="phase_r === 'result'" class="result-wrap">
        <view class="res-card">
          <view class="res-score-badge">
            <text class="rsb-num">{{ resScore_r }}</text>
            <text class="rsb-unit">/ 100</text>
          </view>
          <view class="res-label">居住需求综合指数</view>
          <view class="res-profile">
            <text class="rp-tag" :style="{ background: profileColor + '22', color: profileColor }">{{ profileLabel }}</text>
          </view>
          <view class="res-radar">
            <canvas canvas-id="radarR" id="radarR" class="radar-canvas"></canvas>
            <view class="radar-legend">
              <view v-for="d in Q_R" :key="d.key" class="rl-item">
                <text class="rl-dot" :style="{ background: d.dimColor }"></text>
                <text class="rl-name">{{ d.dim }}</text>
                <text class="rl-score">{{ resDims_r[d.key] }}分</text>
              </view>
            </view>
          </view>
          <view class="res-summary">
            <view class="res-summary-title">📋 居住画像摘要</view>
            <view class="res-summary-text">{{ summaryText_r }}</view>
          </view>
          <view class="res-insights">
            <view class="res-insights-title">🔑 选房重点关注</view>
            <view v-for="d in topDims_r" :key="d.key" class="ri-item">
              <text class="ri-emoji">{{ d.dimEmoji }}</text>
              <view>
                <view class="ri-dim">{{ d.dim }}</view>
                <view class="ri-tip">{{ d.tip }}</view>
              </view>
            </view>
          </view>
          <view class="res-type">
            <view class="res-type-title">🏡 推荐租赁类型</view>
            <view class="res-type-tags">
              <text class="rt-tag" v-for="t in recommendedTypes_r" :key="t">{{ t }}</text>
            </view>
            <view class="res-type-desc">{{ typeDesc_r }}</view>
          </view>
        </view>
        <view class="res-actions">
          <button class="ra-sync" @tap="syncToInsight">📤 同步到客户需求洞察</button>
          <button class="ra-again" @tap="resetRent">重新测评</button>
        </view>
      </view>
    </view>

    <!-- ========== 购房版（跳转现有测评页） ========== -->
    <view v-if="mode === 'buyer'" class="buyer-mode">
      <view class="buyer-card">
        <view class="bc-title">🏠 购房版住得好测评</view>
        <view class="bc-sub">基于七维度框架，购房场景专属题目</view>
        <view class="bc-info">已针对购房需求优化题库和结果解读</view>
        <button class="bc-btn" @tap="goBuyerAssess">前往测评 ›</button>
      </view>
    </view>

    <!-- 客户选择浮层 -->
    <view v-if="showSyncPicker" class="sync-overlay">
      <view class="so-head">
        <button class="so-back" @tap="showSyncPicker = false">‹</button>
        <view>
          <view class="so-title">选择同步客户</view>
          <view class="so-sub">测评结果将写入该客户的「需求洞察报告」</view>
        </view>
      </view>
      <scroll-view class="so-list" scroll-y="true">
        <view v-if="clientList.length === 0" class="so-empty">
          <view class="so-empty-icon">👤</view>
          <view class="so-empty-t">还没有客户</view>
          <view class="so-empty-s">请先到「客户档案」新建客户</view>
        </view>
        <view class="so-item" v-for="c in clientList" :key="c.id" @tap="doSyncToClient(c)">
          <view class="so-item-avatar">{{ c.surname }}</view>
          <view class="so-item-body">
            <view class="so-item-name">{{ c.name }}</view>
            <view class="so-item-meta">{{ c.rel }} · {{ c.stage || '未填阶段' }}</view>
          </view>
          <text class="so-item-arrow">›</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'

// 租房版住得好测评：7 维度 × 1 题（适配租住场景）
const Q_R = [
  { key: 'finance', dim: '财务承受', dimEmoji: '💰', dimColor: '#e67e22',
    q: '月租占月收入的比例，你认为多少是合理的？',
    tip: '财务承受是租房最核心的约束条件',
    opts: [
      { label: '不超过 25%，生活品质优先', score: 20 },
      { label: '25%-35%，合理平衡', score: 50 },
      { label: '35%-45%，经济紧张但可接受', score: 75 },
      { label: '超过 45%，愿意牺牲生活品质', score: 95 },
    ] },
  { key: 'transit', dim: '通勤便利', dimEmoji: '🚇', dimColor: '#2f6fb0',
    q: '从家到工作地，你最多能接受多长的单程通勤时间？',
    tip: '通勤时间直接影响每日幸福感和生活质量',
    opts: [
      { label: '15 分钟以内，越近越好', score: 95 },
      { label: '30 分钟以内，可接受', score: 75 },
      { label: '45 分钟以内，习惯了', score: 50 },
      { label: '超过 45 分钟，无所谓', score: 20 },
    ] },
  { key: 'safety', dim: '安全健康', dimEmoji: '🛡', dimColor: '#c0392b',
    q: '你对小区治安和居住安全最在意什么？',
    tip: '安全是基本需求，尤其是独居人群',
    opts: [
      { label: '门禁/监控完善，夜间有照明', score: 95 },
      { label: '周边治安好，邻里素质高', score: 75 },
      { label: '无特别要求，安全差不多就行', score: 50 },
      { label: '不太关注安全因素', score: 20 },
    ] },
  { key: 'condition', dim: '居住条件', dimEmoji: '🛋', dimColor: '#8e44ad',
    q: '楼层、朝向、通风、噪音，你最在意哪一点？',
    tip: '居住条件决定日常生活的舒适度',
    opts: [
      { label: '楼层：不想住太高 or 低楼层（老人/孩子）', score: 90 },
      { label: '朝向：必须朝南，采光要好', score: 85 },
      { label: '通风：南北通透，不能是暗间', score: 80 },
      { label: '噪音：临街/高架/广场舞不能忍', score: 90 },
      { label: '都不太在意，凑合能住就行', score: 30 },
    ] },
  { key: 'finish', dim: '房屋状况', dimEmoji: '🏠', dimColor: '#c46a3a',
    q: '你能接受什么装修程度的房子？',
    tip: '装修程度直接影响入住成本和时间',
    opts: [
      { label: '必须精装修，拎包入住', score: 90 },
      { label: '简装可以，接受自己添置家具', score: 70 },
      { label: '毛坯/老旧装修，接受改造', score: 40 },
      { label: '无所谓，能住就行', score: 20 },
    ] },
  { key: 'community', dim: '社区配套', dimEmoji: '🏬', dimColor: '#27ae60',
    q: '周边生活配套，你最离不开哪一项？',
    tip: '社区配套影响日常生活的便利程度',
    opts: [
      { label: '地铁/公交等公共交通', score: 90 },
      { label: '超市/菜市场/便利店', score: 80 },
      { label: '医院/药店（家里有老人）', score: 85 },
      { label: '公园/运动场所（锻炼需求）', score: 60 },
      { label: '配套无所谓，靠近公司就行', score: 50 },
    ] },
  { key: 'lease', dim: '租约条款', dimEmoji: '📄', dimColor: '#7f8c8d',
    q: '租约长短和特殊需求（宠物/落户），哪个对你更重要？',
    tip: '租约条款关系到居住稳定性和未来规划',
    opts: [
      { label: '必须长租（一年以上），稳定居住', score: 85 },
      { label: '可以短租（6个月内），保持灵活性', score: 50 },
      { label: '有宠物/孩子，必须接受宠物/落户', score: 90 },
      { label: '无所谓，正常签合同就行', score: 30 },
    ] },
]

export default {
  data() {
    return {
      mode: 'renter',
      // 租房版
      phase_r: 'intro',
      q_r: 0,
      ans_r: {},
      resDims_r: {},
      resScore_r: 0,
      summaryText_r: '',
      profileLabel: '',
      profileColor: '#3d5a3e',
      recommendedTypes_r: [],
      typeDesc_r: '',
      // 同步
      showSyncPicker: false,
    }
  },

  computed: {
    Q_R: () => Q_R,
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients },
    topDims_r() {
      return Q_R.filter(d => this.resDims_r[d.key] >= 75)
        .sort((a, b) => this.resDims_r[b.key] - this.resDims_r[a.key])
        .slice(0, 3)
    },
  },

  onShow() {
    trackPageview('rent-assess')
  },

  methods: {
    // 租房版
    startRent() { this.phase_r = 'doing'; this.q_r = 0; this.ans_r = {} },
    pickR(idx, oIdx) { this.ans_r[idx] = oIdx; this.$forceUpdate && this.$forceUpdate() },
    submitRent() {
      if (this.ans_r[this.q_r] === undefined) return
      const scores = {}
      Q_R.forEach((d, i) => {
        const oIdx = this.ans_r[i]
        scores[d.key] = oIdx !== undefined ? Q_R[i].opts[oIdx].score : 50
      })
      this.resDims_r = scores
      const total = Object.values(scores).reduce((s, v) => s + v, 0) / Q_R.length
      this.resScore_r = Math.round(total)

      // 生成画像标签
      this._deriveProfile()

      // 生成推荐租赁类型
      this._deriveTypes()

      // 生成居住画像摘要
      this._deriveSummary()

      this.phase_r = 'result'

      // 记录测评
      this.userStore.addAssessment({
        type: 'rent', title: '租住版住得好测评',
        scores: scores, total: this.resScore_r
      })
      this.userStore.earnPoints(8, '完成租住版测评')

      setTimeout(() => this.drawRadarR(), 300)
    },
    resetRent() { this.phase_r = 'intro'; this.q_r = 0; this.ans_r = {}; this.resDims_r = {} },
    _deriveProfile() {
      const s = this.resScore_r
      if (s >= 80) { this.profileLabel = '理想租住型'; this.profileColor = '#27ae60' }
      else if (s >= 65) { this.profileLabel = '务实租住型'; this.profileColor = '#2f6fb0' }
      else if (s >= 50) { this.profileLabel = '凑合租住型'; this.profileColor = '#e67e22' }
      else { this.profileLabel = '将就租住型'; this.profileColor = '#c0392b' }
    },
    _deriveTypes() {
      const f = this.resDims_r.finance || 50
      const t = this.resDims_r.transit || 50
      const s = this.resDims_r.safety || 50
      const c = this.resDims_r.condition || 50
      const types = []

      if (f >= 75) types.push('价格敏感型')
      if (t >= 75) types.push('通勤优先型')
      if (s >= 75) types.push('安全敏感型')
      if (c >= 80) types.push('舒适要求型')

      // 由最高分维度推导
      const sorted = Object.entries(this.resDims_r).sort((a, b) => b[1] - a[1])
      const topKey = sorted[0]?.[0] || ''
      if (topKey === 'finance') types.push('预算驱动型')
      if (topKey === 'transit') types.push('距离驱动型')
      if (topKey === 'safety') types.push('安全优先型')

      this.recommendedTypes_r = [...new Set(types)].slice(0, 4)

      // 推荐租赁类型
      if (f >= 80) { this.typeDesc_r = '建议整租独立居室，减少合租带来的不确定性，保障居住安全和个人空间。' }
      else if (f >= 60) { this.typeDesc_r = '可以考虑整租小户型或合租主卧，平衡预算与居住品质。' }
      else if (t >= 80) { this.typeDesc_r = '建议优先靠近公司选址，接受更高租金换取通勤时间，减少日常消耗。' }
      else if (s >= 80) { this.typeDesc_r = '建议选择有正规物业管理的小区，确认门禁和监控设施，同时可考虑品牌公寓。' }
      else { this.typeDesc_r = '建议结合通勤和预算综合考虑，优先保证日常生活的便利性。' }
    },
    _deriveSummary() {
      const parts = []
      const d = this.resDims_r
      if (d.finance >= 75) parts.push('对租金敏感，优先控制住房成本')
      if (d.transit >= 75) parts.push('通勤便利是核心需求，愿意为距离牺牲其他')
      if (d.safety >= 75) parts.push('安全是底线，门禁/监控/治安缺一不可')
      if (d.condition >= 80) parts.push('对居住条件要求高，楼层/朝向/噪音有明确偏好')
      if (d.finish >= 80) parts.push('倾向精装修，拎包入住减少麻烦')
      if (d.community >= 75) parts.push('周边配套直接影响幸福感，地铁/商超是刚需')
      if (d.lease >= 80) parts.push('需要稳定长租，宠物/落户等特殊条款必须满足')
      this.summaryText_r = parts.length ? parts.join('；') + '。' : '居住需求较为综合，各维度相对平衡。'
    },

    // 同步到洞察
    syncToInsight() {
      if (!this.resDims_r || !Object.keys(this.resDims_r).length) return
      if (!this.clientList.length) {
        uni.showToast({ title: '请先在「客户档案」新建客户', icon: 'none' })
        return
      }
      this.showSyncPicker = true
    },
    doSyncToClient(c) {
      // 将租住维度映射到七维框架
      const mapping = {
        finance: 'econ',
        transit: 'conv',
        safety: 'safety',
        condition: 'comfort',
        finish: 'comfort',
        community: 'conv',
        lease: 'free',
      }
      const mappedScores = {}
      Object.entries(this.resDims_r).forEach(([k, v]) => {
        mappedScores[mapping[k] || k] = v
      })

      const ok = this.userStore.applyAssessmentToClient(c.id, {
        type: 'rent', title: '租住版住得好测评',
        scores: mappedScores,
        total: this.resScore_r,
        assessSource: '租住版测评',
      })
      this.showSyncPicker = false
      if (ok) {
        uni.showModal({
          title: '已同步 ✓',
          content: `租住版测评结果已写入「${c.name}」的需求洞察（租住维度映射到七维框架）。`,
          confirmText: '去洞察页',
          cancelText: '留在此页',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/package-mot/pages/insight/index?clientId=' + c.id })
            }
          }
        })
      } else {
        uni.showToast({ title: '同步失败，请重试', icon: 'none' })
      }
    },

    // 购房版跳转
    goBuyerAssess() {
      uni.switchTab({ url: '/pages/assess/index' })
    },

    // 绘制雷达图
    drawRadarR() {
      try {
        const ctx = uni.createCanvasContext('radarR', this)
        const W = 200, H = 200, CX = W / 2, CY = H / 2, R = 78
        const dims = Q_R; const n = dims.length
        const angleStep = (2 * Math.PI) / n
        // 背景圆
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2
            const x = CX + R * (r / 4) * Math.cos(angle)
            const y = CY + R * (r / 4) * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        // 轴线
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(CX, CY)
          ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
          ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        // 数据
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const score = Math.min(100, Math.max(0, this.resDims_r[dims[i].key] || 0))
          const r = R * (score / 100)
          const x = CX + r * Math.cos(angle)
          const y = CY + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(61, 90, 62, 0.2)'; ctx.fill()
        ctx.strokeStyle = '#3d5a3e'; ctx.lineWidth = 2; ctx.stroke()
        // 数据点
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const score = Math.min(100, Math.max(0, this.resDims_r[dims[i].key] || 0))
          const r = R * (score / 100)
          ctx.beginPath()
          ctx.arc(CX + r * Math.cos(angle), CY + r * Math.sin(angle), 4, 0, 2 * Math.PI)
          ctx.fillStyle = '#3d5a3e'; ctx.fill()
        }
        ctx.draw()
      } catch (e) {
        console.warn('[radarR] draw failed:', e)
      }
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40px;
}

/* 顶部 */
.top-header {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%);
  color: #fff;
  padding: 28px 20px 24px;
  border-radius: 0 0 24px 24px;
}
.th-brand { font-size: 13px; opacity: 0.7; margin-bottom: 6px; }
.th-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
.th-sub { font-size: 13px; opacity: 0.75; }

/* 模式切换 */
.mode-tabs {
  display: flex;
  gap: 10px;
  padding: 14px 18px 0;
}
.mode-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #8a837a;
  background: #fff;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.mode-tab.active {
  color: #3d5a3e;
  border-color: #3d5a3e;
  background: #eef3ec;
}

/* 封面 */
.intro-card {
  margin: 16px;
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  border: 1px solid #e7e0d4;
}
.ic-badge {
  display: inline-block;
  background: #fff8e8;
  color: #c46a3a;
  border: 1px solid #f0d8c4;
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}
.ic-title { font-size: 24px; font-weight: 800; color: #2b2b28; margin-bottom: 6px; }
.ic-sub { font-size: 14px; color: #8a837a; margin-bottom: 12px; }
.ic-dims { font-size: 12px; color: #3d5a3e; font-weight: 600; margin-bottom: 12px; line-height: 1.6; }
.ic-info { display: flex; justify-content: center; gap: 16px; margin-bottom: 12px; }
.ic-info text { font-size: 12px; color: #8a837a; }
.ic-hint { font-size: 12px; color: #b8b1a6; margin-bottom: 16px; }
.ic-btn {
  background: linear-gradient(135deg, #3d5a3e, #2f4730);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 700;
  width: 100%;
}

/* 答题 */
.quiz-wrap { padding: 16px 18px; }
.quiz-progress { margin-bottom: 14px; }
.quiz-progress text { font-size: 14px; color: #8a837a; display: block; margin-bottom: 8px; }
.prog-bar { height: 4px; background: #e7e0d4; border-radius: 2px; overflow: hidden; }
.prog-fill { height: 100%; background: #3d5a3e; border-radius: 2px; transition: width 0.3s; }
.q-card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #e7e0d4; }
.q-dim-badge { display: inline-block; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 700; margin-bottom: 12px; }
.q-text { font-size: 17px; color: #2b2b28; font-weight: 700; line-height: 1.5; margin-bottom: 16px; }
.q-opts { display: flex; flex-direction: column; gap: 8px; }
.q-opt { background: #f7f4ef; border: 2px solid transparent; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
.q-opt.sel { border-color: #3d5a3e; background: #eef3ec; }
.q-opt-label { font-size: 13px; font-weight: 700; color: #8a837a; width: 20px; flex-shrink: 0; }
.q-opt.sel .q-opt-label { color: #3d5a3e; }
.q-opt-text { font-size: 14px; color: #4a4a44; flex: 1; }
.q-opt-score { font-size: 13px; font-weight: 700; color: #3d5a3e; flex-shrink: 0; }
.q-foot { display: flex; gap: 10px; justify-content: flex-end; }
.q-prev { background: #fff; color: #8a837a; border: 2px solid #e7e0d4; border-radius: 20px; padding: 10px 18px; font-size: 14px; font-weight: 600; }
.q-next, .q-submit { background: #3d5a3e; color: #fff; border: none; border-radius: 20px; padding: 10px 18px; font-size: 14px; font-weight: 700; }
.q-next[disabled], .q-submit[disabled] { background: #ccc; }

/* 结果 */
.result-wrap { padding: 16px 18px; }
.res-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #e7e0d4; margin-bottom: 16px; }
.res-score-badge { text-align: center; margin-bottom: 4px; }
.rsb-num { font-size: 56px; font-weight: 900; color: #3d5a3e; line-height: 1; }
.rsb-unit { font-size: 18px; color: #8a837a; font-weight: 600; }
.res-label { text-align: center; font-size: 13px; color: #8a837a; margin-bottom: 12px; }
.res-profile { text-align: center; margin-bottom: 16px; }
.rp-tag { display: inline-block; padding: 4px 16px; border-radius: 16px; font-size: 14px; font-weight: 700; }
.res-radar { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 16px; }
.radar-canvas { width: 160px; height: 160px; flex-shrink: 0; }
.radar-legend { flex: 1; }
.rl-item { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.rl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rl-name { font-size: 12px; color: #8a837a; flex: 1; }
.rl-score { font-size: 12px; font-weight: 700; color: #3d5a3e; }
.res-summary { background: #f7f4ef; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
.res-summary-title { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.res-summary-text { font-size: 13px; color: #4a4a44; line-height: 1.7; }
.res-insights { margin-bottom: 16px; }
.res-insights-title { font-size: 14px; font-weight: 700; color: #2b2b28; margin-bottom: 10px; }
.ri-item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.ri-emoji { font-size: 22px; flex-shrink: 0; }
.ri-dim { font-size: 14px; font-weight: 700; color: #2b2b28; margin-bottom: 2px; }
.ri-tip { font-size: 12px; color: #8a837a; line-height: 1.4; }
.res-type { border-top: 1px solid #f0ece4; padding-top: 14px; }
.res-type-title { font-size: 14px; font-weight: 700; color: #2b2b28; margin-bottom: 8px; }
.res-type-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.rt-tag { background: #eef3ec; color: #3d5a3e; border-radius: 16px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
.res-type-desc { font-size: 13px; color: #4a4a44; line-height: 1.6; background: #fff8e8; border-radius: 8px; padding: 10px 12px; }
.res-actions { display: flex; gap: 10px; }
.ra-sync { flex: 1; background: #3d5a3e; color: #fff; border: none; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 700; }
.ra-again { background: #fff; color: #8a837a; border: 2px solid #e7e0d4; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 600; }

/* 购房版 */
.buyer-mode { padding: 16px 18px; }
.buyer-card { background: #fff; border-radius: 16px; padding: 24px 20px; text-align: center; border: 1px solid #e7e0d4; }
.bc-title { font-size: 20px; font-weight: 800; color: #2b2b28; margin-bottom: 6px; }
.bc-sub { font-size: 14px; color: #8a837a; margin-bottom: 8px; }
.bc-info { font-size: 13px; color: #b8b1a6; margin-bottom: 16px; }
.bc-btn { background: #3d5a3e; color: #fff; border: none; border-radius: 24px; padding: 13px; font-size: 15px; font-weight: 700; }

/* 客户同步浮层 */
.sync-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; flex-direction: column;
}
.so-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; background: #fff; border-radius: 0 0 16px 16px; }
.so-back { background: #f7f4ef; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 18px; color: #3d5a3e; line-height: 36px; text-align: center; padding: 0; }
.so-title { font-size: 16px; font-weight: 700; color: #2b2b28; }
.so-sub { font-size: 12px; color: #8a837a; }
.so-list { flex: 1; background: #fff; margin-top: 8px; }
.so-empty { text-align: center; padding: 60px 20px; }
.so-empty-icon { font-size: 48px; margin-bottom: 12px; }
.so-empty-t { font-size: 16px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.so-empty-s { font-size: 13px; color: #8a837a; }
.so-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #f0ece4; }
.so-item-avatar { width: 40px; height: 40px; border-radius: 50%; background: #3d5a3e; color: #fff; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.so-item-name { font-size: 15px; font-weight: 700; color: #2b2b28; }
.so-item-meta { font-size: 12px; color: #8a837a; }
.so-item-arrow { font-size: 18px; color: #b8b1a6; margin-left: auto; }
</style>
