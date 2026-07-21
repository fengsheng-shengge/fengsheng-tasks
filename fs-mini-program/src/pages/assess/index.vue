<template>
  <view class="page">
    <view class="header">
      <view class="title">品质测评</view>
      <view class="sub">6维度评估你的居住品质</view>
    </view>

    <!-- 测评未开始 -->
    <view v-if="!started" class="intro-section">
      <view class="intro-card">
        <view class="intro-icon">🎯</view>
        <view class="intro-title">居住品质六维测评</view>
        <view class="intro-desc">
          从安全、健康、便利、经济、舒适、美观6个维度，
          用30道题帮你量化居住品质，生成专属报告。
        </view>
        <view class="intro-stats">
          <view class="stat">
            <text class="stat-n">6</text>
            <text class="stat-l">维度</text>
          </view>
          <view class="stat">
            <text class="stat-n">30</text>
            <text class="stat-l">题目</text>
          </view>
          <view class="stat">
            <text class="stat-n">5</text>
            <text class="stat-l">分钟</text>
          </view>
        </view>
        <view class="start-btn" @click="startAssess">开始测评</view>
      </view>
    </view>

    <!-- 测评进行中 -->
    <view v-else-if="!result" class="quiz-section">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPct + '%' }"></view>
      </view>
      <view class="progress-text">
        第 {{ currentIndex + 1 }} / {{ questions.length }} 题
        <text class="dim-name">· {{ currentDim }}</text>
      </view>

      <view class="question-card">
        <view class="question-text">{{ currentQuestion.text }}</view>
        <view class="options">
          <view
            v-for="(opt, i) in currentQuestion.options"
            :key="i"
            class="option"
            :class="{ selected: answers[currentIndex] === i }"
            @click="selectAnswer(i)"
          >
            <text class="opt-label">{{ String.fromCharCode(65 + i) }}</text>
            <text class="opt-text">{{ opt.text }}</text>
          </view>
        </view>
      </view>

      <view class="nav-bar">
        <view class="nav-btn prev" v-if="currentIndex > 0" @click="prevQuestion">上一题</view>
        <view class="nav-btn next" @click="nextQuestion">
          {{ currentIndex === questions.length - 1 ? '提交测评' : '下一题' }}
        </view>
      </view>
    </view>

    <!-- 测评结果 -->
    <view v-else class="result-section">
      <view class="result-header">
        <view class="result-level">{{ result.level }}</view>
        <view class="result-score">{{ totalScore }}分</view>
      </view>

      <view class="score-grid">
        <view class="score-item" v-for="(score, dim) in result.scores" :key="dim">
          <view class="score-label">{{ dimLabels[dim] || dim }}</view>
          <view class="score-bar">
            <view class="score-fill" :style="{ width: score + '%' }"></view>
          </view>
          <view class="score-num">{{ score }}</view>
        </view>
      </view>

      <view class="report-card">
        <view class="report-title">测评报告</view>
        <view class="report-text">{{ result.report }}</view>
      </view>

      <view class="cta-banner" @click="goDecode">
        <text class="cta-text">想更懂客户？试试客户解码器 →</text>
      </view>

      <view class="retry-btn" @click="resetAssess">重新测评</view>
    </view>
    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script>
import { submitAssess } from '../../api/assess'
import track from '../../utils/tracker'

const DIM_LABELS = {
  safety: '安全', health: '健康', convenience: '便利',
  economy: '经济', comfort: '舒适', beauty: '美观',
}

const QUESTIONS = [
  // === 安全(5题) ===
  { dim: 'safety', text: '你的住所消防通道是否畅通？', options: [
    { text: '畅通无阻，定期检查', score: 10 },
    { text: '基本畅通', score: 6 },
    { text: '偶尔有杂物', score: 4 },
    { text: '经常被堵', score: 2 },
  ]},
  { dim: 'safety', text: '门锁和窗户安全防护如何？', options: [
    { text: '智能门锁+防盗窗', score: 10 },
    { text: '防盗门锁', score: 6 },
    { text: '普通门锁', score: 4 },
    { text: '老旧锁具', score: 2 },
  ]},
  { dim: 'safety', text: '燃气和电气设备是否定期检修？', options: [
    { text: '每年专业检修', score: 10 },
    { text: '偶尔检查', score: 6 },
    { text: '坏了才修', score: 4 },
    { text: '从没检查过', score: 2 },
  ]},
  { dim: 'safety', text: '小区安保措施如何？', options: [
    { text: '24小时保安+门禁+监控', score: 10 },
    { text: '有门禁和监控', score: 6 },
    { text: '只有门卫', score: 4 },
    { text: '无任何安保', score: 2 },
  ]},
  { dim: 'safety', text: '房屋结构是否存在安全隐患？', options: [
    { text: '新房/次新房，结构完好', score: 10 },
    { text: '老房但无裂缝渗漏', score: 6 },
    { text: '有轻微裂缝', score: 4 },
    { text: '有明显结构问题', score: 2 },
  ]},

  // === 健康(5题) ===
  { dim: 'health', text: '室内空气质量（甲醛等）是否检测过？', options: [
    { text: 'CMA检测达标', score: 10 },
    { text: '自测盒检测过', score: 6 },
    { text: '没测但通风好', score: 4 },
    { text: '从未检测', score: 2 },
  ]},
  { dim: 'health', text: '饮用水水质如何？', options: [
    { text: '净水器+检测合格', score: 10 },
    { text: '有净水器', score: 6 },
    { text: '直接饮用自来水', score: 4 },
    { text: '水质明显有问题', score: 2 },
  ]},
  { dim: 'health', text: '室内湿度是否适宜？', options: [
    { text: '恒温恒湿系统', score: 10 },
    { text: '有加湿器/除湿机', score: 6 },
    { text: '偶尔感觉干燥或潮湿', score: 4 },
    { text: '常年潮湿或有霉味', score: 2 },
  ]},
  { dim: 'health', text: '噪音水平是否影响睡眠？', options: [
    { text: '非常安静，睡眠质量好', score: 10 },
    { text: '偶尔有噪音但不影响睡眠', score: 6 },
    { text: '噪音较多，睡眠受影响', score: 4 },
    { text: '噪音严重，经常失眠', score: 2 },
  ]},
  { dim: 'health', text: '室内光照是否充足？', options: [
    { text: '全天自然采光充足', score: 10 },
    { text: '上午或下午有阳光', score: 6 },
    { text: '需要人工照明', score: 4 },
    { text: '几乎无自然光', score: 2 },
  ]},

  // === 便利(5题) ===
  { dim: 'convenience', text: '到最近的地铁站/公交站步行多久？', options: [
    { text: '5分钟以内', score: 10 },
    { text: '10分钟以内', score: 6 },
    { text: '15分钟以内', score: 4 },
    { text: '超过15分钟', score: 2 },
  ]},
  { dim: 'convenience', text: '周边生活配套（超市/医院/学校）齐全吗？', options: [
    { text: '步行10分钟全有', score: 10 },
    { text: '基本齐全', score: 6 },
    { text: '部分缺失', score: 4 },
    { text: '很不方便', score: 2 },
  ]},
  { dim: 'convenience', text: '停车是否方便？', options: [
    { text: '专属车位，充电桩齐全', score: 10 },
    { text: '小区有车位', score: 6 },
    { text: '路边停车，有时难找', score: 4 },
    { text: '完全没地方停车', score: 2 },
  ]},
  { dim: 'convenience', text: '快递外卖是否方便送达？', options: [
    { text: '快递柜+外卖送上楼', score: 10 },
    { text: '快递柜+下楼取外卖', score: 6 },
    { text: '需到小区门口取', score: 4 },
    { text: '外卖快递都不方便', score: 2 },
  ]},
  { dim: 'convenience', text: '周边休闲设施如何？', options: [
    { text: '公园商场餐饮齐全', score: 10 },
    { text: '有基本休闲配套', score: 6 },
    { text: '选择较少', score: 4 },
    { text: '几乎没有', score: 2 },
  ]},

  // === 经济(5题) ===
  { dim: 'economy', text: '住房支出占收入比例？', options: [
    { text: '30%以下', score: 10 },
    { text: '30-40%', score: 6 },
    { text: '40-50%', score: 4 },
    { text: '超过50%', score: 2 },
  ]},
  { dim: 'economy', text: '物业费是否合理？', options: [
    { text: '性价比高，服务匹配价格', score: 10 },
    { text: '合理', score: 6 },
    { text: '偏贵但能接受', score: 4 },
    { text: '太贵且服务差', score: 2 },
  ]},
  { dim: 'economy', text: '日常水电燃气费用？', options: [
    { text: '节能型，月均很低', score: 10 },
    { text: '正常水平', score: 6 },
    { text: '偏高', score: 4 },
    { text: '非常高', score: 2 },
  ]},
  { dim: 'economy', text: '房屋维修成本预期？', options: [
    { text: '新房无维修担忧', score: 10 },
    { text: '偶尔小修，费用可控', score: 6 },
    { text: '需要中修，有预算压力', score: 4 },
    { text: '大修迫在眉睫', score: 2 },
  ]},
  { dim: 'economy', text: '房产增值/保值预期？', options: [
    { text: '核心地段，保值增值强', score: 10 },
    { text: '成熟区域，保值稳定', score: 6 },
    { text: '一般区域', score: 4 },
    { text: '贬值风险大', score: 2 },
  ]},

  // === 舒适(5题) ===
  { dim: 'comfort', text: '室内隔音效果如何？', options: [
    { text: '几乎听不到噪音', score: 10 },
    { text: '偶尔有噪音', score: 6 },
    { text: '噪音较明显', score: 4 },
    { text: '严重影响睡眠', score: 2 },
  ]},
  { dim: 'comfort', text: '采光和通风条件？', options: [
    { text: '南北通透+阳光充足', score: 10 },
    { text: '采光通风尚可', score: 6 },
    { text: '采光一般', score: 4 },
    { text: '阴暗潮湿', score: 2 },
  ]},
  { dim: 'comfort', text: '室内温度是否舒适？', options: [
    { text: '中央空调/地暖，四季如春', score: 10 },
    { text: '有空调暖气', score: 6 },
    { text: '只有风扇或取暖器', score: 4 },
    { text: '冬冷夏热', score: 2 },
  ]},
  { dim: 'comfort', text: '居住空间是否够用？', options: [
    { text: '空间充裕，功能区齐全', score: 10 },
    { text: '刚好够用', score: 6 },
    { text: '略显拥挤', score: 4 },
    { text: '严重不够', score: 2 },
  ]},
  { dim: 'comfort', text: '卫浴设施舒适度？', options: [
    { text: '干湿分离+智能马桶+浴缸', score: 10 },
    { text: '干湿分离+基本设施', score: 6 },
    { text: '老旧但能用', score: 4 },
    { text: '设施破损不便', score: 2 },
  ]},

  // === 美观(5题) ===
  { dim: 'beauty', text: '室内装修和整洁度？', options: [
    { text: '精装+整洁有序', score: 10 },
    { text: '简装+基本整洁', score: 6 },
    { text: '装修老旧', score: 4 },
    { text: '杂乱无章', score: 2 },
  ]},
  { dim: 'beauty', text: '收纳空间是否充足？', options: [
    { text: '收纳系统完善', score: 10 },
    { text: '基本够用', score: 6 },
    { text: '经常不够用', score: 4 },
    { text: '完全没有收纳', score: 2 },
  ]},
  { dim: 'beauty', text: '窗外景观如何？', options: [
    { text: '花园/江景/城市天际线', score: 10 },
    { text: '小区绿化景观', score: 6 },
    { text: '普通街景', score: 4 },
    { text: '对着墙/垃圾站', score: 2 },
  ]},
  { dim: 'beauty', text: '家具风格是否协调？', options: [
    { text: '统一风格，品质感强', score: 10 },
    { text: '基本协调', score: 6 },
    { text: '混搭风格', score: 4 },
    { text: '杂乱不协调', score: 2 },
  ]},
  { dim: 'beauty', text: '绿植/装饰品布置？', options: [
    { text: '绿植丰富+艺术品点缀', score: 10 },
    { text: '有少量绿植', score: 6 },
    { text: '几乎没有装饰', score: 4 },
    { text: '完全没有', score: 2 },
  ]},
]

export default {
  data() {
    return {
      started: false,
      currentIndex: 0,
      answers: new Array(QUESTIONS.length).fill(-1),
      result: null,
      questions: QUESTIONS,
      dimLabels: DIM_LABELS,
    }
  },
  computed: {
    progressPct() {
      return ((this.currentIndex + 1) / this.questions.length * 100).toFixed(0)
    },
    currentQuestion() {
      return this.questions[this.currentIndex]
    },
    currentDim() {
      return DIM_LABELS[this.currentQuestion.dim] || this.currentQuestion.dim
    },
    totalScore() {
      if (!this.result || !this.result.scores) return 0
      return Object.values(this.result.scores).reduce((a, b) => a + b, 0)
    },
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/assess/index')
    track.pageview({ page: '/pages/assess/index' })
  },
  methods: {
    startAssess() {
      this.started = true
      this.currentIndex = 0
      this.answers = new Array(this.questions.length).fill(-1)
      this.result = null
      track.click('assess_start')
    },
    selectAnswer(i) {
      this.answers[this.currentIndex] = i
    },
    prevQuestion() {
      if (this.currentIndex > 0) this.currentIndex--
    },
    nextQuestion() {
      if (this.answers[this.currentIndex] === -1) {
        uni.showToast({ title: '请先选择答案', icon: 'none' })
        return
      }
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
      } else {
        this.submitAssess()
      }
    },
    async submitAssess() {
      const answers = this.questions.map((q, i) => ({
        dim: q.dim,
        score: q.options[this.answers[i]]?.score || 0,
      }))

      const scores = {}
      const dimCount = {}
      answers.forEach(a => {
        scores[a.dim] = (scores[a.dim] || 0) + a.score
        dimCount[a.dim] = (dimCount[a.dim] || 0) + 1
      })
      Object.keys(scores).forEach(k => {
        scores[k] = Math.round(scores[k] / dimCount[k] * 10)
      })
      const total = Object.values(scores).reduce((a, b) => a + b, 0)
      let level = 'C'
      if (total >= 500) level = 'A'
      else if (total >= 350) level = 'B'

      this.result = {
        scores,
        level,
        report: `你的居住品质综合评级${level}级。${level === 'A' ? '各方面表现优秀，继续保持！' : level === 'B' ? '整体不错，个别维度有提升空间。' : '多项维度需要改善，建议优先解决安全与健康问题。'}`,
      }
      track.assess(level)

      try {
        await submitAssess(answers)
      } catch {}
    },
    resetAssess() {
      this.started = false
      this.result = null
      this.answers = new Array(this.questions.length).fill(-1)
    },
    goDecode() {
      track.click('assess_to_decode')
      uni.switchTab({ url: '/pages/decode/index' })
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.header { padding: 30rpx 10rpx 20rpx; }
.title { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }
.sub { font-size: 24rpx; color: #888; margin-top: 8rpx; }

.intro-section { padding: 40rpx 10rpx; }
.intro-card { background: #fff; border-radius: 24rpx; padding: 50rpx 40rpx; text-align: center; }
.intro-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.intro-title { font-size: 36rpx; font-weight: 700; color: #222; }
.intro-desc { font-size: 26rpx; color: #888; line-height: 1.8; margin: 20rpx 0 30rpx; }
.intro-stats { display: flex; justify-content: center; gap: 60rpx; margin-bottom: 40rpx; }
.stat { text-align: center; }
.stat-n { display: block; font-size: 48rpx; font-weight: 900; color: #3d5a3e; }
.stat-l { font-size: 22rpx; color: #888; }
.start-btn { background: #3d5a3e; color: #fff; font-size: 32rpx; font-weight: 700; padding: 24rpx; border-radius: 40rpx; }

.progress-bar { height: 8rpx; background: #e0e0e0; border-radius: 4rpx; margin: 20rpx 10rpx; }
.progress-fill { height: 100%; background: #3d5a3e; border-radius: 4rpx; transition: width 0.3s; }
.progress-text { font-size: 24rpx; color: #888; padding: 0 10rpx; margin-bottom: 16rpx; }
.dim-name { color: #3d5a3e; }

.question-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin: 0 10rpx; }
.question-text { font-size: 32rpx; font-weight: 700; color: #222; line-height: 1.6; margin-bottom: 24rpx; }
.options { display: flex; flex-direction: column; gap: 12rpx; }
.option { display: flex; align-items: flex-start; padding: 20rpx; border: 2rpx solid #eee; border-radius: 12rpx; }
.option.selected { border-color: #3d5a3e; background: #e8f5e9; }
.opt-label { font-size: 28rpx; font-weight: 700; color: #3d5a3e; margin-right: 16rpx; }
.opt-text { font-size: 28rpx; color: #444; flex: 1; }

.nav-bar { display: flex; justify-content: space-between; padding: 24rpx 10rpx; }
.nav-btn { font-size: 28rpx; font-weight: 700; padding: 20rpx 50rpx; border-radius: 30rpx; }
.nav-btn.prev { background: #f0f0f0; color: #666; }
.nav-btn.next { background: #3d5a3e; color: #fff; }

.result-section { padding: 20rpx 10rpx; }
.result-header { text-align: center; padding: 30rpx 0; }
.result-level { font-size: 80rpx; font-weight: 900; color: #3d5a3e; }
.result-score { font-size: 32rpx; color: #888; }

.score-grid { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.score-item { display: flex; align-items: center; padding: 10rpx 0; }
.score-label { font-size: 26rpx; color: #444; width: 100rpx; }
.score-bar { flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; margin: 0 16rpx; overflow: hidden; }
.score-fill { height: 100%; background: #3d5a3e; border-radius: 8rpx; }
.score-num { font-size: 26rpx; font-weight: 700; color: #3d5a3e; width: 60rpx; text-align: right; }

.report-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.report-title { font-size: 28rpx; font-weight: 700; color: #3d5a3e; margin-bottom: 12rpx; }
.report-text { font-size: 26rpx; color: #444; line-height: 1.8; }

.cta-banner { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 16rpx; padding: 24rpx; text-align: center; margin-bottom: 16rpx; }
.cta-text { color: #fff; font-size: 26rpx; }
.retry-btn { text-align: center; font-size: 28rpx; color: #888; padding: 20rpx; }
.page-footer { text-align: center; padding: 24rpx 0 40rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>