<template>
  <view class="page">
    <!-- 顶部：关联客户 + 报告编号 -->
    <view class="report-header" v-if="client">
      <view class="rh-client">
        <view class="rh-avatar">{{ client.surname }}</view>
        <view>
          <view class="rh-name">{{ client.name }}</view>
          <view class="rh-meta">{{ client.rel }}</view>
        </view>
      </view>
      <view class="rh-reportno" v-if="reportNo">{{ reportNo }}</view>
    </view>

    <!-- ★ V3.13 新增：看前方法论指引卡 -->
    <view class="pre-showing-guide" v-if="preShowingGuide">
      <view class="psg-header">
        <text class="psg-ico">🎯</text>
        <text class="psg-title">看前方法论指引</text>
        <text class="psg-badge" :style="{ background: preShowingGuide.color }">{{ preShowingGuide.typeLabel }}</text>
      </view>
      <view class="psg-body">
        <view class="psg-tip" v-for="(tip, i) in preShowingGuide.tips" :key="i">
          <text class="psg-tip-ico">{{ tip.ico }}</text>
          <text class="psg-tip-text">{{ tip.text }}</text>
        </view>
      </view>
      <view class="psg-checklist">
        <view v-for="(item, i) in preShowingGuide.checklist" :key="i" class="psg-check" @tap="toggleChecklist(i)">
          <text :class="['psg-check-icon', checkedItems[i] ? 'done' : '']">{{ checkedItems[i] ? '✓' : '○' }}</text>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 步骤指示器 -->
    <view class="step-indicator">
      <view v-for="(s, i) in steps" :key="i" :class="['si-dot', { on: currentStep === i, done: currentStep > i }]">
        <view v-if="currentStep > i" class="si-check">✓</view>
        <text v-else>{{ i + 1 }}</text>
      </view>
      <view class="si-label">{{ steps[currentStep].title }}</view>
    </view>

    <!-- ========== Step 1：带看基本信息 ========== -->
    <view v-show="currentStep === 0">
      <view class="step-title">{{ steps[0].title }}</view>
      <view class="step-sub">{{ steps[0].subtitle }}</view>

      <view class="card">
        <view class="field"><text class="label">带看日期</text>
          <picker mode="date" :value="form.showingDate" @change="form.showingDate = $event.detail.value">
            <view class="picker-btn">{{ form.showingDate || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field"><text class="label">带看方式</text>
          <view class="opt">
            <view v-for="o in methodOpts" :key="o.value" :class="{ on: form.showingMethod === o.value }" @tap="form.showingMethod = o.value">{{ o.label }}</view>
          </view>
        </view>
        <view class="field"><text class="label">带看套数</text>
          <view class="opt">
            <view v-for="n in [1,2,3,4,5]" :key="n" :class="{ on: form.propertyCount === n }" @tap="form.propertyCount = n">{{ n }}套</view>
          </view>
        </view>
      </view>

      <!-- 房源满意度反馈 -->
      <view class="card" v-if="form.propertyCount">
        <view class="card-title">房源满意度反馈</view>
        <view v-for="n in form.propertyCount" :key="n" class="prop-feedback">
          <view class="pf-name">房源 {{ n }}</view>
          <view class="field"><text class="label">满意度（1-5星）</text>
            <view class="stars">
              <text v-for="s in 5" :key="s" :class="['star', { on: s <= (form.feedback[n-1] && form.feedback[n-1].satisfaction) }]" @tap="setSatisfaction(n, s)">★</text>
            </view>
          </view>
          <view class="field"><text class="label">客户反馈（选填）</text>
            <textarea class="inp" v-model="form.feedback[n-1].comment" placeholder="客户对这套房的评价或顾虑..." maxlength="80"></textarea>
          </view>
        </view>
      </view>

      <button class="btn-next" @tap="nextStep">下一步 →</button>
    </view>

    <!-- ========== Step 2：讲房执行评估 ========== -->
    <view v-show="currentStep === 1">
      <view class="step-title">{{ steps[1].title }}</view>
      <view class="step-sub">{{ steps[1].subtitle }}</view>

      <view class="card">
        <view class="card-title">五秘诀执行情况</view>
        <view v-for="(sec, i) in fiveSecrets" :key="i" class="sec-row">
          <view class="sr-header">
            <text class="sr-name">{{ sec.name }}</text>
            <text class="sr-tip">{{ sec.tip }}</text>
          </view>
          <view class="sr-exec">
            <view :class="['exec-btn', form.secrets[i].executed ? 'on' : '']" @tap="form.secrets[i].executed = !form.secrets[i].executed">
              {{ form.secrets[i].executed ? '✓ 已执行' : '未执行' }}
            </view>
            <view class="exec-rating" v-if="form.secrets[i].executed">
              <text v-for="r in ['excellent','good','fair','poor']" :key="r"
                :class="['rating-btn', { on: form.secrets[i].rating === r }]"
                @tap="form.secrets[i].rating = r">
                {{ ratingLabels[r] }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="field"><text class="label">整体效果评级</text>
          <view class="opt">
            <view v-for="o in ratingOpts" :key="o.value" :class="{ on: form.overallRating === o.value }" @tap="form.overallRating = o.value">{{ o.label }}</view>
          </view>
        </view>
        <view class="field"><text class="label">执行备注（选填）</text>
          <textarea class="inp" v-model="form.notes" placeholder="本次讲房执行的亮点或待改进之处..." maxlength="120"></textarea>
        </view>
      </view>

      <view class="btn-row">
        <button class="btn-back" @tap="prevStep">← 上一步</button>
        <button class="btn-next" @tap="nextStep">下一步 →</button>
      </view>
    </view>

    <!-- ========== Step 3：客户意向判断 ========== -->
    <view v-show="currentStep === 2">
      <view class="step-title">{{ steps[2].title }}</view>
      <view class="step-sub">{{ steps[2].subtitle }}</view>

      <view class="card">
        <view class="field"><text class="label">意向等级</text>
          <view class="opt intent-opts">
            <view v-for="o in intentOpts" :key="o.value" :class="['intent-btn', o.value, { on: form.intentLevel === o.value }]" @tap="form.intentLevel = o.value">{{ o.label }}</view>
          </view>
        </view>
        <view class="field"><text class="label">意向判断理由</text>
          <textarea class="inp" v-model="form.intentReason" placeholder="为什么判断是这个意向等级..." maxlength="120"></textarea>
        </view>
        <view class="field"><text class="label">客户关键原话（选填）</text>
          <textarea class="inp" v-model="form.keyQuote" placeholder="客户说的原话，可以是意向信号，也可以是顾虑..." maxlength="120"></textarea>
        </view>
        <view class="field"><text class="label">下一步行动</text>
          <textarea class="inp" v-model="form.nextAction" placeholder="基于本次带看，接下来应该做什么..." maxlength="120"></textarea>
        </view>
      </view>

      <view class="btn-row">
        <button class="btn-back" @tap="prevStep">← 上一步</button>
        <button class="btn-submit" @tap="submit">✓ 完成带看分析</button>
      </view>
    </view>
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

const RATING_LABELS = { excellent: '优秀', good: '良好', fair: '一般', poor: '差' }

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportNo: '',
      currentStep: 0,
      steps: [
        { title: '带看基本信息', subtitle: '时间、方式、带看套数与客户反馈' },
        { title: '讲房执行评估', subtitle: '五秘诀执行情况与效果评级' },
        { title: '客户意向判断', subtitle: '意向等级与下一步行动' },
      ],
      methodOpts: [
        { value: 'alone', label: '独自带看' },
        { value: 'accompanied', label: '陪同带看' },
        { value: 'virtual', label: '线上带看' },
      ],
      ratingOpts: [
        { value: 'excellent', label: '优秀' },
        { value: 'good', label: '良好' },
        { value: 'fair', label: '一般' },
        { value: 'poor', label: '差' },
      ],
      intentOpts: [
        { value: 'high', label: '高意向' },
        { value: 'medium', label: '中意向' },
        { value: 'low', label: '低意向' },
        { value: 'terminated', label: '终止' },
      ],
      fiveSecrets: FIVE_SECRETS,
      ratingLabels: RATING_LABELS,
      form: {
        showingDate: '',
        showingMethod: 'alone',
        propertyCount: 1,
        feedback: [{ satisfaction: 3, comment: '' }],
        secrets: FIVE_SECRETS.map(() => ({ executed: false, rating: null })),
        overallRating: 'good',
        notes: '',
        intentLevel: 'medium',
        intentReason: '',
        keyQuote: '',
        nextAction: '',
      },
      // ★ V3.13 看前清单勾选状态
      checkedItems: [],
    }
  },
  computed: {
    userStore() { return useUserStore() },
    // ★ V3.13 看前方法论指引：由洞察结论自动生成
    preShowingGuide() {
      const c = this.client
      if (!c || !c.lifecycle || !c.lifecycle.insightData) return null
      const insight = c.lifecycle.insightData
      const types = insight.types || []
      const topType = types[0] || ''

      const guideMap = {
        first_home: {
          typeLabel: '首套刚需', color: '#c46a3a',
          tips: [
            { ico: '💰', text: '重点用「总价÷360个月」算每月真实成本，让客户感受不是在花钱，是在存资产' },
            { ico: '🛡', text: '主动告知产权核查流程，消除首套房对风险的焦虑，不催单' },
            { ico: '📊', text: '对比租房 vs 买房 5 年总支出，用数据建立信任' },
          ],
          checklist: ['提前确认客户资质（社保/流水）可贷款额度', '准备好 3 套不同价位的备选房源', '带好贝壳成交记录作为谈价依据'],
        },
        improve: {
          typeLabel: '改善置换', color: '#27ae60',
          tips: [
            { ico: '🏗', text: '先带看不可改条件：采光/朝向/承重墙/格局；先不谈装修，让客户自己发现潜力' },
            { ico: '📐', text: '面积置换比：算清楚现有住房卖掉能腾出多少首付' },
            { ico: '⏱', text: '明确告知置换窗口期（先买后卖 vs 先卖后买）各风险点' },
          ],
          checklist: ['核实现有住房挂牌价和带看量', '确认客户资质和贷款方案', '准备 2 套不同面积段备选'],
        },
        commuter: {
          typeLabel: '通勤敏感', color: '#2f6fb0',
          tips: [
            { ico: '⏱', text: '不要口头说「地铁很近」，带客户实地走一趟，记录真实步行时间' },
            { ico: '🗺', text: '展示早高峰和晚高峰两条通勤路线的耗时对比' },
            { ico: '🏠', text: '评估居家办公可能性，面积需求是否可以灵活' },
          ],
          checklist: ['提前查好地铁/公交换乘方案', '带客户实地测一次通勤路线', '准备 3 套不同通勤时间的备选'],
        },
        family_kid: {
          typeLabel: '有娃家庭', color: '#8e44ad',
          tips: [
            { ico: '🏫', text: '提前查好教育局划片表，确认目标学校名额和落户年限要求' },
            { ico: '🛡', text: '小区安全性：门禁、人车分流、儿童活动区逐一核实' },
            { ico: '👶', text: '关注户型可改造性：三房能否满足两个孩子的独立空间需求' },
          ],
          checklist: ['提前查学校划片和名额情况', '确认小区安全配套和托管资源', '准备 2 套学校划片内外的备选'],
        },
        elder: {
          typeLabel: '养老宜居', color: '#e67e22',
          tips: [
            { ico: '🏥', text: '附近三甲医院/社区卫生站步行可达距离是底线，必须实地确认' },
            { ico: '🏢', text: '电梯和低楼层方案：明确客户能接受的最高楼层' },
            { ico: '👣', text: '小区无障碍设施和物业服务态度实地感受' },
          ],
          checklist: ['提前确认电梯品牌和维保情况', '实地走访周边医院/卫生站', '了解物业紧急响应机制'],
        },
        invest: {
          typeLabel: '投资增值', color: '#16a085',
          tips: [
            { ico: '📊', text: '租金回报率公式：月租金 × 12 ÷ 房价，要求 ≥ 3% 才算合格' },
            { ico: '📈', text: '展示板块规划：地铁/学校/商业在建工程，标注兑现时间节点' },
            { ico: '🔄', text: '查近 3 年同小区同户型涨幅 vs 板块均幅，判断成长性' },
          ],
          checklist: ['查近 6 个月同户型租金成交价', '核实板块规划落地时间和不确定性', '准备 2 套租金回报率 ≥ 3% 的备选'],
        },
      }

      return guideMap[topType] || guideMap['first_home']
    },
  },
  onLoad(options) {
    trackPageview('showing')
    if (options && options.clientId) {
      this.clientId = options.clientId
      this.loadClientData()
    }
    // 默认今天
    const d = new Date()
    this.form.showingDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  },
  methods: {
    loadClientData() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return
      this.client = c
      // 读现有带看报告（草稿回显）
      const report = this.userStore.getShowingReport(this.clientId)
      if (report && report.data) {
        this.form = { ...this.form, ...report.data }
        this.reportNo = report.reportNo
      }
    },
    setSatisfaction(n, score) {
      if (!this.form.feedback[n-1]) this.form.feedback[n-1] = { satisfaction: score, comment: '' }
      else this.form.feedback[n-1].satisfaction = score
    },
    nextStep() {
      if (this.currentStep === 0) {
        if (!this.form.showingDate) { uni.showToast({ title: '请选择带看日期', icon: 'none' }); return }
        if (!this.form.propertyCount) { uni.showToast({ title: '请选择带看套数', icon: 'none' }); return }
      }
      if (this.currentStep < 2) {
        this.currentStep++
      }
    },
    prevStep() {
      if (this.currentStep > 0) this.currentStep--
    },
    // ★ V3.13 看前清单勾选
    toggleChecklist(i) {
      if (!this.checkedItems) this.checkedItems = []
      if (this.checkedItems[i]) this.checkedItems.splice(i, 1)
      else this.checkedItems.push(i)
    },
    submit() {
      if (!this.form.intentLevel) { uni.showToast({ title: '请判断意向等级', icon: 'none' }); return }
      uni.showModal({
        title: '完成带看分析',
        content: '确定提交本次带看分析报告？',
        confirmText: '提交',
        success: (res) => {
          if (res.confirm) {
            // 构建带看数据
            const fiveSecretsExecution = {}
            this.fiveSecrets.forEach((sec, i) => {
              fiveSecretsExecution[sec.key] = { ...this.form.secrets[i] }
            })
            const showingData = {
              showingDate: this.form.showingDate,
              showingMethod: this.form.showingMethod,
              propertyCount: this.form.propertyCount,
              propertyFeedback: this.form.feedback.slice(0, this.form.propertyCount),
              fiveSecretsExecution,
              overallRating: this.form.overallRating,
              notes: this.form.notes,
              intentLevel: this.form.intentLevel,
              intentReason: this.form.intentReason,
              keyQuote: this.form.keyQuote,
              nextAction: this.form.nextAction,
            }
            this.userStore.completeShowing(this.clientId, showingData)
            uni.showToast({ title: '带看分析已保存', icon: 'success' })
            setTimeout(() => {
              uni.redirectTo({ url: '/package-mot/pages/showing/report?clientId=' + this.clientId })
            }, 1200)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 14px 14px 40px; background: #f7f4ef; min-height: 100vh; }

/* ★ V3.13 看前方法论指引卡 */
.pre-showing-guide { margin: 0 14px 14px; background: #fff; border-radius: 14px; padding: 14px; border-left: 4px solid #3d5a3e; }
.psg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.psg-ico { font-size: 18px; }
.psg-title { font-size: 15px; font-weight: 800; color: #1f2a24; flex: 1; }
.psg-badge { font-size: 11px; color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 700; }
.psg-body { margin-bottom: 10px; }
.psg-tip { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.psg-tip-ico { font-size: 13px; flex-shrink: 0; }
.psg-tip-text { font-size: 12px; color: #4a5046; line-height: 1.5; }
.psg-checklist { border-top: 1px solid #ede5d6; padding-top: 10px; display: flex; flex-direction: column; gap: 5px; }
.psg-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5046; cursor: pointer; }
.psg-check-icon { font-size: 13px; color: #c4c0b8; }
.psg-check-icon.done { color: #3d5a3e; font-weight: 800; }

/* 报告头部 */
.report-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.rh-client { display: flex; align-items: center; gap: 10px; }
.rh-avatar { width: 38px; height: 38px; border-radius: 50%; background: #3d5a3e; color: #fff; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.rh-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.rh-meta { font-size: 12px; color: #8a837a; }
.rh-reportno { font-size: 11px; color: #aaa; background: #f0ece2; padding: 3px 8px; border-radius: 6px; }

/* 步骤指示器 */
.step-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; background: #fff; border-radius: 12px; padding: 12px 16px; border: 1px solid #e7e0d4; }
.si-dot { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: #e7e0d4; color: #aaa; }
.si-dot.on { background: #c46a3a; color: #fff; }
.si-dot.done { background: #3a8f5b; color: #fff; }
.si-check { font-size: 14px; }
.si-label { flex: 1; font-size: 14px; font-weight: 700; color: #3d5a3e; }

/* 步骤标题 */
.step-title { font-size: 18px; font-weight: 800; color: #3d5a3e; margin-bottom: 4px; }
.step-sub { font-size: 13px; color: #8a837a; margin-bottom: 16px; }

/* 卡片 */
.card { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 14px; border: 1px solid #efe9dd; }
.card-title { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 12px; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 7px; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt > view { padding: 7px 14px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; cursor: pointer; }
.opt > view.on { background: #3d5a3e; color: #fff; }
.inp { width: 100%; min-height: 44px; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.picker-btn { background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #2b2b2b; }

/* 房源反馈 */
.prop-feedback { background: #f7f4ef; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.pf-name { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.stars { display: flex; gap: 6px; }
.star { font-size: 24px; color: #e7e0d4; cursor: pointer; }
.star.on { color: #f5c518; }

/* 五秘诀 */
.sec-row { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #e7e0d4; }
.sec-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.sr-header { margin-bottom: 8px; }
.sr-name { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.sr-tip { font-size: 11px; color: #aaa; margin-left: 6px; }
.sr-exec { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.exec-btn { padding: 6px 12px; border-radius: 8px; font-size: 13px; background: #f0ece2; color: #555; cursor: pointer; }
.exec-btn.on { background: #eef6ef; color: #3a8f5b; border: 1px solid #3a8f5b; }
.exec-rating { display: flex; gap: 6px; }
.rating-btn { padding: 4px 10px; border-radius: 6px; font-size: 12px; background: #f0ece2; color: #555; }
.rating-btn.on { background: #3d5a3e; color: #fff; }

/* 意向按钮 */
.intent-opts { gap: 8px; }
.intent-btn { flex: 1; text-align: center; padding: 9px 0; border-radius: 8px; font-size: 13px; }
.intent-btn.high.on { background: #3a8f5b; color: #fff; }
.intent-btn.medium.on { background: #c8953a; color: #fff; }
.intent-btn.low.on { background: #999; color: #fff; }
.intent-btn.terminated.on { background: #c0392b; color: #fff; }

/* 按钮 */
.btn-row { display: flex; gap: 12px; margin-top: 16px; }
.btn-next, .btn-submit { flex: 1; background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; }
.btn-back { flex: 1; background: #fff; color: #3d5a3e; border: 1px solid #e7e0d4; border-radius: 12px; padding: 13px; font-size: 15px; }
</style>
