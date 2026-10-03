<template>
  <view class="page">
    <!-- 顶部进度 -->
    <view class="progress-header">
      <view class="ph-brand">风声 · 引导问诊</view>
      <view class="ph-step">第 {{ currentStep }} / 5 步</view>
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: (currentStep / 5 * 100) + '%' }"></view>
      </view>
    </view>

    <!-- ========== Step 1：购房动机 ========== -->
    <view v-if="currentStep === 1" class="step-content" :key="1">
      <view class="step-question">这次买房是为了解决什么问题？</view>
      <view class="step-sub">选择最贴合的选项，系统将据此判断客户类型</view>
      <view class="option-grid">
        <view
          v-for="opt in step1Options"
          :key="opt.key"
          :class="['option-card', { selected: answers.motive === opt.key }]"
          @tap="selectMotive(opt)">
          <text class="oc-ico">{{ opt.ico }}</text>
          <text class="oc-label">{{ opt.label }}</text>
          <text class="oc-tip">{{ opt.tip }}</text>
        </view>
      </view>
    </view>

    <!-- ========== Step 2：入住时间 ========== -->
    <view v-else-if="currentStep === 2" class="step-content" :key="2">
      <view class="step-question">预期什么时候需要住进去？</view>
      <view class="step-sub">帮助判断购房紧迫程度，合理规划看房节奏</view>
      <view class="option-list">
        <view
          v-for="opt in step2Options"
          :key="opt.key"
          :class="['option-row', { selected: answers.timeline === opt.key }]"
          @tap="answers.timeline = opt.key">
          <text class="or-ico">{{ opt.ico }}</text>
          <view class="or-body">
            <text class="or-label">{{ opt.label }}</text>
            <text class="or-sub">{{ opt.sub }}</text>
          </view>
          <text class="or-check" v-if="answers.timeline === opt.key">✓</text>
        </view>
      </view>
    </view>

    <!-- ========== Step 3：预算区间 ========== -->
    <view v-else-if="currentStep === 3" class="step-content" :key="3">
      <view class="step-question">总价大概在什么范围？</view>
      <view class="step-sub">帮助过滤适配房源，生成精准策展方案</view>

      <view class="budget-display">
        <text class="bd-amount">{{ budgetDisplay }}</text>
        <text class="bd-unit">万</text>
      </view>

      <slider
        class="budget-slider"
        :min="100"
        :max="2000"
        :step="10"
        :value="answers.budgetMax"
        :block-size="22"
        active-color="#3d5a3e"
        background-color="#e8e4dc"
        @change="onBudgetChange" />

      <view class="budget-labels">
        <text>100万</text>
        <text>2000万</text>
      </view>

      <!-- 首付估算 -->
      <view class="downpay-info" v-if="answers.budgetMax">
        <text class="dpi-label">参考首付（30%）</text>
        <text class="dpi-val">{{ Math.round(answers.budgetMax * 0.3) }} 万</text>
      </view>

      <!-- 超标提醒 -->
      <view class="budget-warn" v-if="answers.budgetMax > 500">
        <text>⚠️ 预算超过 500 万，方案将侧重高端改善型匹配</text>
      </view>
    </view>

    <!-- ========== Step 4：区位与配套 ========== -->
    <view v-else-if="currentStep === 4" class="step-content" :key="4">
      <view class="step-question">对区位有什么偏好？</view>
      <view class="step-sub">多选最在意的配套，系统将据此筛选最优板块</view>

      <view class="option-grid-2">
        <view
          v-for="opt in step4Options"
          :key="opt.key"
          :class="['chip-card', { selected: answers.areas.includes(opt.key) }]"
          @tap="toggleArea(opt.key)">
          <text class="chip-ico">{{ opt.ico }}</text>
          <text class="chip-label">{{ opt.label }}</text>
        </view>
      </view>

      <view class="commute-row">
        <text class="cr-label">地铁通勤要求</text>
        <view class="cr-options">
          <view
            v-for="opt in commuteOptions"
            :key="opt.key"
            :class="['cr-btn', { selected: answers.commute === opt.key }]"
            @tap="answers.commute = opt.key">
            {{ opt.label }}
          </view>
        </view>
      </view>
    </view>

    <!-- ========== Step 5：家庭结构 ========== -->
    <view v-else-if="currentStep === 5" class="step-content" :key="5">
      <view class="step-question">家里几口人住？</view>
      <view class="step-sub">影响户型、楼层、学区等核心决策因素</view>

      <view class="option-list">
        <view
          v-for="opt in step5Options"
          :key="opt.key"
          :class="['option-row', { selected: answers.family === opt.key }]"
          @tap="answers.family = opt.key">
          <text class="or-ico">{{ opt.ico }}</text>
          <view class="or-body">
            <text class="or-label">{{ opt.label }}</text>
            <text class="or-sub">{{ opt.sub }}</text>
          </view>
          <text class="or-check" v-if="answers.family === opt.key">✓</text>
        </view>
      </view>
    </view>

    <!-- ========== 成果预览（全部完成后） ========== -->
    <view v-if="showResult" class="step-content result-view">
      <view class="result-header">
        <text class="rh-t">✅ 问诊完成</text>
        <text class="rh-s">需求画像已生成，可直接进入策展</text>
      </view>

      <view class="result-card">
        <view class="rc-row">
          <text class="rc-label">购房动机</text>
          <text class="rc-val">{{ motiveLabel }}</text>
        </view>
        <view class="rc-row">
          <text class="rc-label">入住时间</text>
          <text class="rc-val">{{ timelineLabel }}</text>
        </view>
        <view class="rc-row">
          <text class="rc-label">预算区间</text>
          <text class="rc-val">{{ budgetDisplay }}万</text>
        </view>
        <view class="rc-row">
          <text class="rc-label">区位偏好</text>
          <text class="rc-val">{{ areaLabels }}</text>
        </view>
        <view class="rc-row">
          <text class="rc-label">家庭结构</text>
          <text class="rc-val">{{ familyLabel }}</text>
        </view>
      </view>

      <!-- 自动推断的客户类型 -->
      <view class="result-types">
        <text class="rt-t">系统推断客户类型</text>
        <view class="rt-tags">
          <text v-for="t in inferredTypes" :key="t" class="rt-tag">{{ t }}</text>
        </view>
      </view>

      <!-- 需求摘要 -->
      <view class="result-summary">
        <text class="rs-t">📋 需求摘要</text>
        <text class="rs-text">{{ summaryText }}</text>
      </view>
    </view>

    <!-- 底部导航 -->
    <view class="bottom-nav">
      <button class="btn-back" v-if="currentStep > 1 && !showResult" @tap="prevStep">‹ 上一步</button>
      <view v-else></view>

      <button
        v-if="!showResult"
        class="btn-next"
        :disabled="!canNext"
        @tap="nextStep">
        {{ currentStep < 5 ? '下一步 ›' : '生成画像 ›' }}
      </button>
      <button
        v-else
        class="btn-confirm-result"
        @tap="confirmAndGoCurate">
        ✓ 确认并进入策展
      </button>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'

// ★ V3.12 引导问诊 · 五步完成需求澄清
export default {
  data() {
    return {
      clientId: null,
      currentStep: 1,
      showResult: false,

      // 五步答案
      answers: {
        motive: '',       // step1
        timeline: '',     // step2
        budgetMax: 300,   // step3
        areas: [],        // step4
        commute: '',      // step4
        family: '',       // step5
      },

      // Step1 选项
      step1Options: [
        { key: 'first',    ico: '🏠', label: '刚需首套',     tip: '第一次买房，不确定怎么选' },
        { key: 'improve',  ico: '🏡', label: '改善置换',     tip: '住得不满意，想换更好的' },
        { key: 'study',    ico: '📚', label: '学区上学',     tip: '孩子教育是核心诉求' },
        { key: 'invest',  ico: '💰', label: '投资保值',     tip: '看中房产的资产属性' },
        { key: 'elder',    ico: '🌿', label: '给父母/养老',  tip: '为家中长辈或将来养老准备' },
        { key: 'gift',     ico: '🎁', label: '给子女置办',  tip: '帮孩子提前规划' },
      ],

      // Step2 选项
      step2Options: [
        { key: 'urgent', label: '越快越好',  sub: '3个月内必须入住', ico: '🔥' },
        { key: '3month', label: '3个月内',  sub: '有明确的时间窗口', ico: '⏰' },
        { key: '6month', label: '半年内',   sub: '有初步规划但不急', ico: '📅' },
        { key: '1year',  label: '一年内',   sub: '还在观望阶段',    ico: '🗓️' },
        { key: 'flex',  label: '还没想好',  sub: '时间灵活，先看起来', ico: '💭' },
      ],

      // Step4 区位选项
      step4Options: [
        { key: 'subway',  ico: '🚇', label: '近地铁' },
        { key: 'school',  ico: '🏫', label: '学区' },
        { key: 'hospital',ico: '🏥', label: '近医院' },
        { key: 'mall',    ico: '🛒', label: '商业配套' },
        { key: 'park',    ico: '🌳', label: '公园环境' },
        { key: 'quiet',   ico: '🤫', label: '安静不吵' },
        { key: 'newarea', ico: '🏗️', label: '新开发区' },
        { key: 'old',     ico: '🏚️', label: '成熟老区' },
      ],
      commuteOptions: [
        { key: '30min', label: '30分钟内' },
        { key: '60min', label: '60分钟内' },
        { key: 'any',   label: '无所谓' },
      ],

      // Step5 选项
      step5Options: [
        { key: 'single', label: '单身 / 独居',   sub: '一个人住',              ico: '🧑' },
        { key: 'couple', label: '夫妻 / 情侣',    sub: '两口之家，暂无孩子',    ico: '👫' },
        { key: 'family3',label: '三口之家',       sub: '孩子还小或学龄前',      ico: '👨‍👩‍👧' },
        { key: 'family4',label: '四口及以上',     sub: '多孩或与父母同住',      ico: '👨‍👩‍👧‍👦' },
        { key: 'elder',  label: '与父母同住',     sub: '照顾老人或被照顾',      ico: '👴' },
      ],
    }
  },

  computed: {
    userStore() { return useUserStore() },

    budgetDisplay() {
      return this.answers.budgetMax >= 1000
        ? (this.answers.budgetMax / 1000).toFixed(1) + '000'
        : this.answers.budgetMax
    },

    canNext() {
      if (this.currentStep === 1) return !!this.answers.motive
      if (this.currentStep === 2) return !!this.answers.timeline
      if (this.currentStep === 3) return this.answers.budgetMax > 0
      if (this.currentStep === 4) return this.answers.areas.length > 0
      if (this.currentStep === 5) return !!this.answers.family
      return false
    },

    // 推断的客户类型
    inferredTypes() {
      const types = []
      if (this.answers.motive === 'first') types.push('首次置业型')
      if (this.answers.motive === 'improve') types.push('改善置换型')
      if (this.answers.motive === 'study') types.push('陪读求学型')
      if (this.answers.motive === 'invest') types.push('投资增值型')
      if (this.answers.motive === 'elder') types.push('养老宜居型')

      if (this.answers.commute === '30min') types.push('通勤敏感型')
      if (this.answers.family === 'family3' || this.answers.family === 'family4') types.push('有娃家庭型')
      if (this.answers.budgetMax <= 200 && this.answers.motive === 'first') types.push('价格敏感型')

      return [...new Set(types)].slice(0, 4)
    },

    motiveLabel() {
      return this.step1Options.find(o => o.key === this.answers.motive)?.label || ''
    },
    timelineLabel() {
      return this.step2Options.find(o => o.key === this.answers.timeline)?.label || ''
    },
    familyLabel() {
      return this.step5Options.find(o => o.key === this.answers.family)?.label || ''
    },
    areaLabels() {
      return this.answers.areas.map(k => this.step4Options.find(o => o.key === k)?.label).filter(Boolean).join(' · ')
    },

    // 自动生成的需求摘要文本
    summaryText() {
      const parts = []
      const motiveMap = {
        first: '首次购房，主要关注总价门槛和月供压力',
        improve: '改善置换，核心诉求是住得更好（面积/朝向/配套）',
        study: '学区导向，优先考虑学校划片和接送便利性',
        invest: '投资视角，关注板块规划和租金回报率',
        elder: '养老宜居，安全（电梯/医疗）和便利是首选',
        gift: '为子女提前规划，兼顾自主和资产属性',
      }
      if (this.answers.motive) parts.push(motiveMap[this.answers.motive] || '')

      const timelineMap = {
        urgent: '购房紧迫，期望3个月内完成交易',
        '3month': '有明确3个月内入住计划',
        '6month': '半年内有购房意向，时间相对充裕',
        '1year': '一年内有规划，仍处于观望期',
        flex: '时间灵活，先做需求调研',
      }
      if (this.answers.timeline) parts.push(timelineMap[this.answers.timeline] || '')

      if (this.answers.budgetMax) {
        parts.push(`预算区间 ${this.budgetDisplay} 万（首付约 ${Math.round(this.answers.budgetMax * 0.3)} 万），月供压力需关注`)
      }
      if (this.answers.areas.length) {
        const labels = this.answers.areas.map(k => this.step4Options.find(o => o.key === k)?.label)
        parts.push(`重点关注：${labels.join('、')}`)
      }
      if (this.answers.commute === '30min') parts.push('对地铁通勤有明确要求（30分钟以内）')
      if (this.answers.family) {
        const fam = this.step5Options.find(o => o.key === this.answers.family)
        if (fam) parts.push(`家庭结构：${fam.label}`)
      }

      return parts.filter(Boolean).join('。') + '。'
    },
  },

  onLoad(options) {
    this.clientId = options.clientId || ''
    uni.setNavigationBarTitle({ title: '引导问诊' })
  },

  methods: {
    selectMotive(opt) {
      this.answers.motive = opt.key
    },
    onBudgetChange(e) {
      this.answers.budgetMax = e.detail.value
    },
    toggleArea(key) {
      const i = this.answers.areas.indexOf(key)
      if (i >= 0) this.answers.areas.splice(i, 1)
      else this.answers.areas.push(key)
    },
    prevStep() {
      if (this.currentStep > 1) this.currentStep--
    },
    nextStep() {
      if (this.currentStep < 5) {
        this.currentStep++
      } else {
        this.showResult = true
      }
    },
    confirmAndGoCurate() {
      const store = this.userStore
      const payload = {
        ...this.answers,
        motiveLabel: this.motiveLabel,
        timelineLabel: this.timelineLabel,
        familyLabel: this.familyLabel,
        areaLabels: this.areaLabels,
        inferredTypes: this.inferredTypes,
        summaryText: this.summaryText,
        budgetDisplay: this.budgetDisplay,
        createdAt: new Date().toISOString(),
      }
      const scores = this._estimateScoresFromAnswers()
      const insightPayload = {
        scores,
        assessSource: '引导问诊',
        assessTotal: Object.values(scores).reduce((a, b) => a + b, 0),
        types: this._inferTypeKeys(),
        ltrust: this._inferLtrust(),
      }

      // 无 clientId → 先创建临时客户
      if (!this.clientId) {
        const newClient = {
          id: 'diagnostic_' + Date.now(),
          name: '问诊客户_' + this.answers.motiveLabel,
          tags: this._inferTypeKeys(),
          lifecycle: {
            stage: 'diagnostic',
            diagnosticData: payload,
            insightData: insightPayload,
            createdAt: payload.createdAt,
          },
          createdAt: payload.createdAt,
        }
        store.clients.push(newClient)
        store.saveClients()
        this.clientId = newClient.id
      } else {
        // 有 clientId → 正常写入 lifecycle
        const c = store.getClient(this.clientId)
        if (c) {
          c.lifecycle = c.lifecycle || {}
          c.lifecycle.diagnosticData = payload
          c.lifecycle.insightData = {
            ...(c.lifecycle.insightData || {}),
            ...insightPayload,
          }
          store.saveClients()
        }
      }

      uni.showToast({ title: '画像已生成', icon: 'success', duration: 1500 })
      setTimeout(() => {
        uni.navigateTo({
          url: `/package-curation/pages/curate-prep/index?clientId=${this.clientId}&source=diagnostic`
        })
      }, 1500)
    },

    // 由回答推算七维分值
    _estimateScoresFromAnswers() {
      const scores = { safety: 60, health: 60, conv: 60, econ: 60, comfort: 60, beauty: 60, free: 60 }
      const m = this.answers.motive
      if (m === 'improve') { scores.comfort = 90; scores.beauty = 80 }
      if (m === 'study')   { scores.safety = 85; scores.health = 80 }
      if (m === 'elder')   { scores.safety = 90; scores.health = 85; scores.conv = 80 }
      if (m === 'invest')  { scores.econ = 90; scores.free = 70 }
      if (m === 'first')    { scores.econ = 80; scores.conv = 70 }
      if (this.answers.commute === '30min') scores.conv = Math.max(scores.conv, 80)
      if (this.answers.areas.includes('school')) scores.safety = Math.max(scores.safety, 80)
      if (this.answers.areas.includes('quiet')) scores.comfort = Math.max(scores.comfort, 75)
      if (this.answers.areas.includes('park')) { scores.health = Math.max(scores.health, 75); scores.free = Math.max(scores.free, 70) }
      return scores
    },

    _inferTypeKeys() {
      const keys = []
      const m = this.answers.motive
      const map = { first: 'first', improve: 'improve', study: 'study', invest: 'invest', elder: 'elderly' }
      if (map[m]) keys.push(map[m])
      if (this.answers.commute === '30min') keys.push('commute')
      if (['family3', 'family4'].includes(this.answers.family)) keys.push('family')
      return keys
    },

    _inferLtrust() {
      if (this.answers.motive === 'elder' || this.answers.areas.includes('hospital')) return 'safety'
      if (this.answers.commute === '30min') return 'transit'
      if (this.answers.motive === 'first' || this.answers.budgetMax <= 200) return 'economy'
      if (this.answers.motive === 'improve') return 'beauty'
      return 'safety'
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 100px;
}

/* 进度头部 */
.progress-header {
  background: #3d5a3e;
  color: #fff;
  padding: 20px 20px 16px;
  border-radius: 0 0 20px 20px;
}
.ph-brand {
  font-size: 13px;
  opacity: 0.75;
  margin-bottom: 8px;
}
.ph-step {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}
.progress-track {
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #ffd700;
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* 步骤内容 */
.step-content {
  padding: 20px 18px 120px;
}
.step-question {
  font-size: 22px;
  font-weight: 700;
  color: #2b2b28;
  margin-bottom: 6px;
  line-height: 1.4;
}
.step-sub {
  font-size: 13px;
  color: #8a837a;
  margin-bottom: 20px;
}

/* Step1 动机选项 */
.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.option-card {
  background: #fff;
  border: 2px solid #e8e4dc;
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s;
}
.option-card.selected {
  border-color: #3d5a3e;
  background: #eef3ec;
}
.oc-ico { font-size: 28px; margin-bottom: 4px; }
.oc-label { font-size: 15px; font-weight: 700; color: #2b2b28; }
.oc-tip { font-size: 11px; color: #8a837a; line-height: 1.4; }

/* Step2 时间选项 */
.option-list { display: flex; flex-direction: column; gap: 10px; }
.option-row {
  background: #fff;
  border: 2px solid #e8e4dc;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}
.option-row.selected { border-color: #3d5a3e; background: #eef3ec; }
.or-ico { font-size: 24px; flex-shrink: 0; }
.or-body { flex: 1; }
.or-label { font-size: 15px; font-weight: 700; color: #2b2b28; display: block; }
.or-sub { font-size: 12px; color: #8a837a; }
.or-check { font-size: 20px; color: #3d5a3e; font-weight: 700; }

/* Step3 预算 */
.budget-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  justify-content: center;
  margin: 20px 0 16px;
}
.bd-amount {
  font-size: 56px;
  font-weight: 800;
  color: #3d5a3e;
  line-height: 1;
}
.bd-unit { font-size: 18px; color: #8a837a; font-weight: 600; }
.budget-slider { margin: 0 4px; }
.budget-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8a837a;
  margin-top: 6px;
  padding: 0 4px;
}
.downpay-info {
  margin-top: 16px;
  background: #eef3ec;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dpi-label { font-size: 13px; color: #8a837a; }
.dpi-val { font-size: 16px; font-weight: 700; color: #3d5a3e; }
.budget-warn {
  margin-top: 12px;
  background: #fff8e1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #8a6d3b;
}

/* Step4 区位 */
.option-grid-2 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.chip-card {
  background: #fff;
  border: 2px solid #e8e4dc;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.chip-card.selected { border-color: #3d5a3e; background: #eef3ec; }
.chip-ico { font-size: 22px; }
.chip-label { font-size: 11px; color: #2b2b28; font-weight: 600; text-align: center; }
.commute-row {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  border: 2px solid #e8e4dc;
}
.cr-label { font-size: 14px; font-weight: 600; color: #2b2b28; display: block; margin-bottom: 10px; }
.cr-options { display: flex; gap: 8px; }
.cr-btn {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 8px;
  background: #f7f4ef;
  font-size: 13px;
  color: #8a837a;
  border: 2px solid #e8e4dc;
  transition: all 0.2s;
}
.cr-btn.selected { background: #3d5a3e; color: #fff; border-color: #3d5a3e; }

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
  border-radius: 16px 16px 0 0;
  z-index: 100;
}
.btn-back {
  background: none;
  border: none;
  color: #8a837a;
  font-size: 15px;
  padding: 10px 0;
}
.btn-next {
  background: #3d5a3e;
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 700;
}
.btn-next[disabled] { background: #ccc; color: #fff; }
.btn-confirm-result {
  background: #3d5a3e;
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 700;
}

/* 成果预览 */
.result-view { padding-top: 16px; }
.result-header { margin-bottom: 16px; }
.rh-t { font-size: 20px; font-weight: 700; color: #3d5a3e; display: block; }
.rh-s { font-size: 13px; color: #8a837a; }
.result-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  border: 2px solid #e8e4dc;
}
.rc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0ece4;
  font-size: 14px;
}
.rc-row:last-child { border-bottom: none; }
.rc-label { color: #8a837a; }
.rc-val { color: #2b2b28; font-weight: 600; text-align: right; flex: 1; margin-left: 12px; }
.result-types { margin-bottom: 14px; }
.rt-t { font-size: 13px; color: #8a837a; display: block; margin-bottom: 8px; }
.rt-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.rt-tag {
  background: #3d5a3e;
  color: #fff;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}
.result-summary {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  border: 2px solid #e8e4dc;
}
.rs-t { font-size: 13px; color: #8a837a; display: block; margin-bottom: 8px; }
.rs-text { font-size: 14px; color: #2b2b28; line-height: 1.7; }
</style>
