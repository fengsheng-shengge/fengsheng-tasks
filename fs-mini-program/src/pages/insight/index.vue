<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 客户需求洞察报告</view>
      <view class="h1">{{ d.clientName || '客户' }} 的需求画像</view>
      <view class="sub">这是您亲口确认过的需求，不是推荐，是帮您理清楚</view>
      <view class="ex" v-if="d.isExample">示例数据 · 仅供产品演示，非真实客户</view>
    </view>

    <!-- 核心洞察 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💡</text>核心洞察</view>
      <view class="core">
        <view class="core-p">{{ d.corePoint }}</view>
        <view class="core-d" v-if="d.corePointDetail">{{ d.corePointDetail }}</view>
      </view>
    </view>

    <!-- 需求三轴 -->
    <view class="sec" v-if="axisRows.length">
      <view class="sec-h"><text class="em">🧭</text>需求三轴拆解</view>
      <view class="ax-row" v-for="(r, i) in axisRows" :key="i">
        <view class="ax-k">{{ r[0] }}</view>
        <view class="ax-v">{{ r[1] }}</view>
      </view>
    </view>

    <!-- 七维权重 -->
    <view class="sec" v-if="d.seven && d.seven.length">
      <view class="sec-h"><text class="em">🎯</text>七维居住品质权重</view>
      <view class="sv-row" v-for="(s, i) in d.seven" :key="i">
        <view class="sv-name">{{ s.name }}<text class="sv-val">{{ s.weight }}</text></view>
        <view class="sv-track"><view class="sv-fill" :style="{ width: clampPct(s.weight) }"></view></view>
        <view class="sv-src" v-if="s.source">依据：{{ s.source }}</view>
      </view>
    </view>

    <!-- 生活锚点 -->
    <view class="sec" v-if="d.anchors && d.anchors.length">
      <view class="sec-h"><text class="em">📍</text>生活锚点（脱敏回显）</view>
      <view class="an-row" v-for="(a, i) in d.anchors" :key="i">
        <view class="an-k">{{ a.label }}</view>
        <view class="an-v">{{ a.value }}</view>
        <view class="an-src" v-if="a.source">来源：{{ a.source }}</view>
      </view>
    </view>

    <!-- 需求确认记录 -->
    <view class="conf-card" :class="confirmed ? 'ok' : 'wait'">
      <view class="conf-seal" :class="confirmed ? '' : 'w'">{{ confirmed ? '已确认' : '待确认' }}</view>
      <view class="conf-txt">{{ confirmed ? '本需求画像已由客户亲口确认，作为后续服务的依据。' : '需求尚未经客户确认，暂不进入房源推荐与带看环节。' }}</view>
      <view class="conf-meta" v-if="confirmed">确认时间：{{ d.confirm.date }} ｜ 确认人：{{ d.confirm.by }}</view>
    </view>

    <!-- 下一步 -->
    <view class="next">
      <view class="next-t">下一步</view>
      <view class="next-d">{{ d.nextStep || '需求确认后，由服务者侧「知识库 + 规则引擎」结合真源生成房源提案报告，持报告带看。' }}</view>
    </view>

    <view class="ft">本页面仅呈现您确认过的需求，不含任何房源推荐与价格测算</view>

    <view class="actions">
      <button class="btn-main" @tap="copyHTML">📋 复制报告 HTML</button>
      <button class="btn-line" @tap="copySummary">复制摘要</button>
    </view>
  </view>
</template>

<script>
/**
 * 客户需求洞察报告（V4 探索步 · ①交付物）
 * 数据契约 DATA_CONTRACT（问诊引擎 v6 输出 → 本页输入）：
 *   insight = {
 *     clientName: string,
 *     isExample?: boolean,            // 示例数据标注（演示用）
 *     corePoint: string,              // 一句话核心洞察（不替客户下结论）
 *     corePointDetail?: string,
 *     threeAxis: { purpose:string, time:string, subject:string },  // 目的/时间/主体三轴
 *     seven: [{ name:'安全', weight:30, source:'客户痛点…' }],       // 七维权重（带依据）
 *     anchors: [{ label:'现住', value:'…', source:'客户自述' }],
 *     confirm: { confirmed:true, date:'2026-08-26', by:'客户本人' },
 *     nextStep?: string
 *   }
 * 铁律：只渲染客户确认过的需求；示例/未核验数据明确标注；不渲染房源与价格数字；不给"推荐买哪"结论。
 */
import { generateInsightReportHTML, generateInsightSummary } from '../../utils/report-template.js'

// V4 演示示例（标 isExample；七维权重合计 100，结构对齐生哥三轴方法论）
const EXAMPLE_INSIGHT = {
  clientName: '林先生 & 未婚妻',
  isExample: true,
  corePoint: '您最想解决的是「婚房首套的稳定落脚」，最舍不得的是「两个人刚起步的轻松感」',
  corePointDetail: '翻译成七维权重后，安全与自在分量最重、经济其次。您真正在意的，可能不只是房子本身，而是它能不能撑起您想要的生活。',
  threeAxis: {
    purpose: '自住 · 婚房首套（非投资）',
    time: '近期入住（半年内）+ 远期育儿（3 年后学区）',
    subject: '夫妻二人 + 计划 1 孩 + 偶尔父母同住'
  },
  seven: [
    { name: '安全', weight: 30, source: '老人偶尔同住，需电梯低楼层、社区安保' },
    { name: '经济', weight: 25, source: '首套预算 300 万刚性，月供敏感' },
    { name: '便利', weight: 20, source: '工作通勤 ≤40 分钟，近地铁' },
    { name: '健康', weight: 12, source: '新装修环保、采光通风' },
    { name: '舒适', weight: 7, source: '二人世界空间够用即可' },
    { name: '美观', weight: 4, source: '外立面与社区观感偏好' },
    { name: '自在', weight: 2, source: '暂非首要' }
  ],
  anchors: [
    { label: '现住', value: '朝阳区 · 望京 · 租住', source: '客户自述' },
    { label: '工作', value: '中关村 · 通勤方式地铁', source: '客户自述' },
    { label: '家庭', value: '未婚妻同行，计划 1 孩', source: '客户自述' },
    { label: '雷区', value: '无电梯老破小、临街噪音', source: '客户明确否决' },
    { label: '向往', value: '推窗见绿、安静独处', source: '客户勾选' }
  ],
  confirm: { confirmed: true, date: '2026-08-26', by: '客户本人（小程序确认）' },
  nextStep: '需求已确认。下一步：由服务者侧「知识库 + 规则引擎」结合真源生成房源提案报告，持报告带看。'
}

export default {
  data() {
    return {
      d: {}
    }
  },
  computed: {
    confirmed() {
      return !!(this.d && this.d.confirm && this.d.confirm.confirmed)
    },
    axisRows() {
      const ax = (this.d && this.d.threeAxis) || {}
      return [
        ['目的', ax.purpose],
        ['时间', ax.time],
        ['主体', ax.subject]
      ].filter(r => r[1])
    }
  },
  onLoad(options) {
    if (options && options.insight) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.insight))
        if (parsed && parsed.corePoint) { this.d = parsed; return }
      } catch (e) { /* fallthrough to example */ }
    }
    this.d = JSON.parse(JSON.stringify(EXAMPLE_INSIGHT))
  },
  onShareAppMessage() {
    return {
      title: (this.d.clientName || '客户') + ' 的需求洞察报告 · 风声',
      path: '/pages/insight/index?insight=' + encodeURIComponent(JSON.stringify(this.d))
    }
  },
  methods: {
    clampPct(w) {
      const v = Math.max(2, Math.min(100, +(w || 0)))
      return v + '%'
    },
    getAgentName() {
      // 待接登录态：真实上线时从 userStore 取经纪人姓名
      return '风声经纪人'
    },
    getOpts() {
      return {
        agentName: this.getAgentName(),
        clientName: this.d.clientName || '',
        dateStr: new Date().toLocaleDateString('zh-CN')
      }
    },
    copyHTML() {
      const html = generateInsightReportHTML(this.d, this.getOpts())
      uni.setClipboardData({
        data: html,
        success: () => {
          uni.showModal({
            title: 'HTML 已复制',
            content: '已复制完整报告 HTML。可粘贴到浏览器地址栏或保存为 .html 查看，也可打印为 PDF。',
            showCancel: false,
            confirmText: '知道了'
          })
        },
        fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      })
    },
    copySummary() {
      const text = generateInsightSummary(this.d, this.getOpts())
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '摘要已复制', icon: 'none' }),
        fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 0; background: var(--cream); min-height: 100vh; box-sizing: border-box; padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); }
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-xl); padding: 56rpx 40rpx 44rpx; color: #fff; position: relative; overflow: hidden; margin: 0 0 24rpx; }
.brand { font-size: 22rpx; color: rgba(255,255,255,0.85); letter-spacing: 2rpx; }
.h1 { font-size: 40rpx; font-weight: 800; color: #fff; margin-top: 12rpx; line-height: 1.3; }
.sub { font-size: 26rpx; color: rgba(255,255,255,0.9); margin-top: 12rpx; }
.ex { display: inline-block; margin-top: 20rpx; background: rgba(196,106,58,.9); color: #fff; font-size: 22rpx; padding: 8rpx 22rpx; border-radius: 999rpx; }
.sec { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin-bottom: 24rpx; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 24rpx; display: flex; align-items: center; gap: 12rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid var(--divider); }
.em { font-size: 36rpx; }
.core { background: var(--cream); border-radius: var(--r-md); padding: 24rpx 28rpx; border-left: 8rpx solid var(--orange); }
.core-p { font-size: 30rpx; font-weight: 800; color: var(--text-primary); line-height: 1.5; }
.core-d { font-size: 25rpx; color: var(--text-secondary); margin-top: 14rpx; line-height: 1.7; }
.ax-row { display: flex; gap: 16rpx; padding: 16rpx 0; border-bottom: 2rpx dashed var(--border); }
.ax-row:last-child { border-bottom: none; }
.ax-k { flex: 0 0 84rpx; font-size: 26rpx; font-weight: 800; color: var(--orange); }
.ax-v { flex: 1; font-size: 27rpx; color: var(--text-primary); line-height: 1.6; }
.sv-row { padding: 18rpx 0; border-bottom: 2rpx dashed var(--border); }
.sv-row:last-child { border-bottom: none; }
.sv-name { font-size: 27rpx; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.sv-val { font-size: 26rpx; font-weight: 800; color: var(--green); }
.sv-track { height: 20rpx; background: var(--cream-dark); border-radius: 10rpx; overflow: hidden; }
.sv-fill { height: 100%; border-radius: 10rpx; background: linear-gradient(90deg, var(--green), var(--green-light)); }
.sv-src { font-size: 21rpx; color: var(--text-tertiary); margin-top: 10rpx; line-height: 1.5; }
.an-row { padding: 14rpx 0; border-bottom: 2rpx dashed var(--border); }
.an-row:last-child { border-bottom: none; }
.an-k { font-size: 24rpx; font-weight: 700; color: var(--orange); }
.an-v { font-size: 27rpx; color: var(--text-primary); margin-top: 4rpx; line-height: 1.6; }
.an-src { font-size: 21rpx; color: var(--text-tertiary); margin-top: 4rpx; }
.conf-card { border-radius: var(--r-lg); padding: 28rpx; margin-bottom: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.conf-card.ok { background: var(--green-bg); border: 2rpx solid #c6d6c6; }
.conf-card.wait { background: var(--cream-dark); border: 2rpx dashed var(--border); }
.conf-seal { align-self: flex-start; font-size: 24rpx; font-weight: 800; color: #fff; background: var(--green); padding: 6rpx 28rpx; border-radius: 999rpx; }
.conf-seal.w { background: var(--text-tertiary); }
.conf-txt { font-size: 26rpx; color: var(--text-primary); line-height: 1.6; }
.conf-meta { font-size: 22rpx; color: var(--text-tertiary); }
.next { background: var(--cream); border: 2rpx dashed #C8956D; border-radius: var(--r-lg); padding: 28rpx; margin-bottom: 24rpx; }
.next-t { font-size: 26rpx; font-weight: 800; color: var(--gold-text); margin-bottom: 10rpx; }
.next-d { font-size: 24rpx; color: var(--text-secondary); line-height: 1.7; }
.ft { padding: 24rpx; color: var(--text-tertiary); font-size: 22rpx; text-align: center; line-height: 1.7; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); display: flex; gap: 20rpx; box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { flex: 1; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; box-shadow: var(--shadow-accent); }
.btn-line { background: #fff; color: var(--green); border: 3rpx solid var(--green); border-radius: var(--r-md); padding: 30rpx 40rpx; font-size: 28rpx; font-weight: 700; }
</style>
