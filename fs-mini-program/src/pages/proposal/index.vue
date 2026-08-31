<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 房源提案报告</view>
      <view class="h1">{{ insight && insight.clientName ? insight.clientName + ' 的提案' : '房源提案报告' }}</view>
      <view class="sub">需求关联 · 方案清单 · 持报告带看</view>
      <view class="ex" v-if="isExample">示例数据 · 仅供产品演示，非真实客户/房源</view>
    </view>

    <!-- MOT 闸门1状态 -->
    <view class="gate-ok" v-if="confirmed">
      <text class="gate-ic">✓</text>
      <text class="gate-t">需求已确认（MOT 闸门 1 通过）</text>
    </view>
    <view class="gate-lock" v-else>
      <text class="gate-ic">🔒</text>
      <text class="gate-t">需求尚未经客户确认，房源提案暂不开放</text>
    </view>

    <!-- 引擎说明 -->
    <view class="engine-note">
      ✓ 本报告由<text class="warn">风声居住服务生命周期</text>②阶段产出。片区 / 商圈 / 楼盘推荐与信服度核验，由专业服务者「知识库 + 规则引擎」消费本画像 + 真源后渲染。本样本为方法论示意，不替代真实方案。
      数据来源：民政部2026适老化标准。
    </view>

    <!-- 核心洞察（来自①需求洞察） -->
    <view class="sec" v-if="insight && insight.corePoint">
      <view class="sec-h"><text class="em">💡</text>核心洞察（来自①需求洞察报告）</view>
      <view class="core-box">
        <view class="core-p">{{ insight.corePoint }}</view>
        <view class="core-d" v-if="insight.corePointDetail">{{ insight.corePointDetail }}</view>
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
    <view class="sec" v-if="insight && insight.seven && insight.seven.length">
      <view class="sec-h"><text class="em">🎯</text>七维居住品质权重（来自①确认需求）</view>
      <view class="sv-row" v-for="(s, i) in insight.seven" :key="i">
        <view class="sv-name">{{ s.name }}<text class="sv-val">{{ s.weight }}</text></view>
        <view class="sv-track"><view class="sv-fill" :style="{ width: clampPct(s.weight) }"></view></view>
        <view class="sv-src" v-if="s.source">依据：{{ s.source }}</view>
      </view>
    </view>

    <!-- 生活锚点 -->
    <view class="sec" v-if="insight && insight.anchors && insight.anchors.length">
      <view class="sec-h"><text class="em">📍</text>生活锚点（服务者侧结合真源的输入）</view>
      <view class="an-row" v-for="(a, i) in insight.anchors" :key="i">
        <view class="an-k">{{ a.label }}</view>
        <view class="an-v">{{ a.value }}</view>
        <view class="an-src" v-if="a.source">来源：{{ a.source }}</view>
      </view>
    </view>

    <!-- 吸附度 M 试算 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🏠</text>吸附度 M 试算<text class="demo-tag">示意</text></view>
      <view class="method-note">
        吸附度 M = Σ(七维权重 × 房源七维匹配档) ÷ Σ权重        匹配档：优=1.0 / 良=0.75 / 中=0.5 / 差=0.25        此试算仅验证「权重×匹配」链路，不代表任何房源推荐。
      </view>
      <view class="demo-card" v-for="(h, i) in demoHouses" :key="i">
        <view class="dc-row"><view class="dc-k">房源</view><view class="dc-v">{{ h.name }} <text class="demo-flag">示意</text></view></view>
        <view class="dc-row"><view class="dc-k">总价（示意）</view><view class="dc-v">{{ h.price }}</view></view>
        <view class="dc-row"><view class="dc-k">吸附度 M</view><view class="dc-v">{{ h.m }} <text class="demo-flag">示意</text></view></view>
        <view class="dc-row"><view class="dc-k">信服度 S</view><view class="dc-v">{{ h.s }}</view></view>
        <view class="dc-row"><view class="dc-k">象限</view><view class="dc-v">{{ h.quad }}</view></view>
      </view>
    </view>

    <!-- 信服度 S 锁定 -->
    <view class="lock-box">
      <text class="lock-ic">🔒</text>
      <view class="lock-body">
        <view class="lock-t">信服度 S 待接入真源核验，本样本不参与排序</view>
        <view class="lock-d">信服度四支柱（价格真实性 / 租金真实性 / 流动性 / 确定性）须绑定住建委、贝壳成交、租赁备案等权威源方可计算。在 demo 状态下，四象限无法分辨「强推荐 / 诚实排除」，故统一标记为「待核验」。</view>
      </view>
    </view>

    <!-- 双维评估框架 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📊</text>双维评估框架（方法论示意）</view>
      <view class="quad">
        <view class="qd"><text class="warn">① 强推荐</text>{{ 'M≥75 且 S≥75（待真源核验后启用）' }}</view>
        <view class="qd"><text class="warn">② 诚实排除</text>{{ 'M<75 且 S≥75（待真源核验后启用）' }}</view>
        <view class="qd"><text class="warn">③ 补证据</text>{{ 'M≥75 且 S<75（待真源核验后启用）' }}</view>
        <view class="qd"><text class="warn">④ 淘汰</text>{{ 'M<75 且 S<75 / 触发雷区否决' }}</view>
      </view>
    </view>

    <!-- 全成本测算 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💰</text>全成本测算（方法示意，不渲染具体数字）</view>
      <view class="method-note">
        到手总成本 = 裸房价 + 契税（首套网签价×<text class="code">1%</text> / 二套×<text class="code">2%</text>，<text class="warn">待核验网签价</text>）
        + 中介费（约成交价×<text class="code">1.5%</text>，<text class="warn">待核实费率</text>）+ 其他交易税费。<br/>        月供 / 十年净值 / 回报率等强决策数字，<text class="warn">本样本不计算、不展示</text>，待接入真实网签价与租赁备案后，由服务者侧按三情景区间表达，并标注 source / asOf / 置信度。
      </view>
    </view>

    <!-- 下游交付说明 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🔗</text>下游交付说明（片区 / 商圈 / 楼盘归服务者侧）</view>
      <view class="method-note">
        <text class="warn">输入：</text>本画像的锚点（现住地、能量锚点、通勤方式/容忍、学情）+ 七维权重 + 向往 + 雷区。
        <text class="warn">处理：</text>专业服务者「知识库 + 规则引擎」结合真源（行政区划 / 学区划片 / 成交备案 / 通勤路网）计算候选片区 → 商圈 → 楼盘，并输出信服度 S（绑真源）。
        <text class="warn">本工具不越界做交付。</text>
      </view>
    </view>

    <view class="ft">本报告为方法论示意，不含任何真实房源推荐与价格测算。具体交易决策请结合专业判断与实地情况。</view>

    <view class="actions">
      <button class="btn-main" @tap="copyHTML">📋 复制报告 HTML</button>
      <button class="btn-line" @tap="copySummary">复制摘要</button>
    </view>
  </view>
</template>

<script>
/**
 * 房源提案报告（V4 MOT · ②服务提案交付物）
 *
 * 数据来源（两路）：
 *   ① 真实客户已确认的 insight JSON（来自 insight/index.vue 传入）
 *   ② 演示数据（当无真实 insight 时展示方法论链路）
 *
 * MOT 闸门 1：需求未确认 → 提案锁定，提示先完成需求洞察问诊
 * 数据诚实：所有未核验/示例数据明确标注「待核验/示意」；不渲染任何未核验房源/房价数字
 *
 * 落库：当有关联客户 ID 时，保存 type='proposal' 报告到 client.reports[] + 写时间线
 */
import { generateProposalReportHTML, generateProposalSummary } from '../../utils/report-template.js'
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'

// 演示数据（无真实 insight 时展示方法论链路）
const EXAMPLE_PROPOSAL = {
  clientName: '林先生 & 未婚妻'
}
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
    { name: '健康', weight: 15, source: '新装修环保、采光通风' },
    { name: '舒适', weight: 5, source: '二人世界空间够用即可' },
    { name: '美观', weight: 3, source: '外立面与社区观感偏好' },
    { name: '自在', weight: 2, source: '暂非首要' }
  ],
  anchors: [
    { label: '现住', value: '朝阳区 · 望京 · 租住', source: '客户自述' },
    { label: '工作', value: '中关村 · 通勤方式地铁', source: '客户自述' },
    { label: '家庭', value: '未婚妻同行，计划 1 孩', source: '客户自述' },
    { label: '雷区', value: '无电梯老破小、临街噪音', source: '客户明确否决' },
    { label: '向往', value: '推窗见绿、安静独处', source: '客户勾选' }
  ],
  confirm: { confirmed: true, date: '2026-08-27', by: '客户本人（小程序确认）' }
}

export default {
  data() {
    return {
      insight: null,
      clientId: '',
      serviceLine: 'buy',
      isExample: false
    }
  },
  computed: {
    confirmed() {
      return !!(this.insight && this.insight.confirm && this.insight.confirm.confirmed)
    },
    axisRows() {
      const ax = (this.insight && this.insight.threeAxis) || {}
      return [
        ['目的', ax.purpose],
        ['时间', ax.time],
        ['主体', ax.subject]
      ].filter(r => r[1])
    },
    demoHouses() {
      return [
        { name: '示例楼盘 A', price: '待核验', m: '—', s: '待核验', quad: '①②③ 待真源核验' },
        { name: '示例楼盘 B', price: '待核验', m: '—', s: '待核验', quad: '④ 淘汰（雷区触发）' }
      ]
    }
  },
  onLoad(options) {
    trackPageview('proposal')
    if (options && options.insight) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.insight))
        this.insight = parsed
        this.isExample = !!(parsed && parsed.isExample)
      } catch (e) { /* fallthrough to example */ }
    }
    if (options && options.clientId) this.clientId = options.clientId
    if (options && options.serviceLine) this.serviceLine = options.serviceLine
    if (!this.insight) {
      this.insight = JSON.parse(JSON.stringify(EXAMPLE_INSIGHT))
      this.isExample = true
    }
  },
  onShow() {
    // 关联客户时，若需求已确认，保存提案报告到客户档案（幂等：同一客户同一报告只落一次）
    if (this.clientId && this.confirmed) {
      const userStore = useUserStore()
      if (!userStore._initialized) userStore.initFromStorage()
      const existing = userStore.getClient(this.clientId)
      if (existing) {
        const already = (existing.reports || []).some(r => r.type === 'proposal')
        if (!already) {
          userStore.saveClientReport(this.clientId, {
            type: 'proposal',
            name: '房源提案报告',
            clientName: this.insight.clientName || '未命名客户',
            serviceLine: this.serviceLine,
            insight: this.insight,
            source: '提案报告页（小程序）'
          })
          uni.showToast({ title: '已存入客户驾驶舱', icon: 'none' })
        }
      }
    }
  },
  onShareAppMessage() {
    return {
      title: (this.insight && this.insight.clientName || '客户') + ' 的房源提案报告 · 风声',
      path: '/pages/proposal/index?insight=' + encodeURIComponent(JSON.stringify(this.insight || {}))
    }
  },
  methods: {
    clampPct(w) {
      const v = Math.max(2, Math.min(100, +(w || 0)))
      return v + '%'
    },
    getAgentName() {
      const userStore = useUserStore()
      return userStore.nickname || '风声经纪人'
    },
    getOpts() {
      return {
        agentName: this.getAgentName(),
        clientName: this.insight && this.insight.clientName || '',
        dateStr: new Date().toLocaleDateString('zh-CN')
      }
    },
    copyHTML() {
      const html = generateProposalReportHTML(EXAMPLE_PROPOSAL, this.insight, this.getOpts())
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
      const text = generateProposalSummary(EXAMPLE_PROPOSAL, this.insight, this.getOpts())
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
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-xl); padding: 56rpx 40rpx 44rpx; color: #fff; margin: 0 0 24rpx; }
.brand { font-size: 22rpx; color: rgba(255,255,255,.85); letter-spacing: 2rpx; }
.h1 { font-size: 40rpx; font-weight: 800; color: #fff; margin-top: 12rpx; line-height: 1.3; }
.sub { font-size: 26rpx; color: rgba(255,255,255,.9); margin-top: 12rpx; }
.ex { display: inline-block; margin-top: 20rpx; background: rgba(196,106,58,.9); color: #fff; font-size: 22rpx; padding: 8rpx 22rpx; border-radius: 999rpx; }
.gate-ok { display: flex; align-items: flex-start; gap: 14rpx; background: var(--green-bg); border: 2rpx solid #c6d6c6; border-radius: var(--r-lg); padding: 24rpx 28rpx; margin: 0 24rpx 24rpx; }
.gate-ic { font-size: 30rpx; flex-shrink: 0; }
.gate-t { font-size: 26rpx; font-weight: 700; color: var(--green); line-height: 1.5; }
.gate-lock { display: flex; align-items: flex-start; gap: 14rpx; background: #fbf0e2; border: 2rpx dashed var(--orange); border-radius: var(--r-lg); padding: 24rpx 28rpx; margin: 0 24rpx 24rpx; }
.gate-lock .gate-ic { font-size: 30rpx; }
.gate-lock .gate-t { font-size: 26rpx; font-weight: 700; color: #8a3d1c; line-height: 1.5; }
.engine-note { background: var(--green-bg); border-left: 8rpx solid var(--green); padding: 20rpx 24rpx; margin: 0 24rpx 24rpx; border-radius: 0 var(--r-lg) var(--r-lg) 0; font-size: 24rpx; color: #3a5040; line-height: 1.7; }
.sec { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin: 0 24rpx 24rpx; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 24rpx; display: flex; align-items: center; gap: 12rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid var(--divider); }
.em { font-size: 36rpx; }
.demo-tag { font-size: 20rpx; background: #fbf6ee; color: var(--orange); padding: 4rpx 14rpx; border-radius: 999rpx; margin-left: auto; }
.core-box { background: var(--cream); border-radius: var(--r-md); padding: 24rpx 28rpx; border-left: 8rpx solid var(--orange); }
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
.method-note { background: #faf8f3; border: 1rpx dashed var(--border); border-radius: var(--r-md); padding: 20rpx 24rpx; font-size: 24rpx; color: var(--text-secondary); line-height: 1.7; }
.method-note .code { background: var(--cream-dark); padding: 2rpx 10rpx; border-radius: 6rpx; color: var(--green-deep); font-size: 24rpx; }
.method-note .warn { color: #c46a3a; font-weight: 700; border-bottom: 1rpx solid rgba(196,106,58,.4); }
.qd text { display: block; color: var(--green); margin-bottom: 4rpx; font-size: 25rpx; }
.demo-card { border: 3rpx dashed var(--border); background: #fbf8f2; border-radius: var(--r-lg); padding: 24rpx; margin-top: 16rpx; }
.dc-row { display: flex; justify-content: space-between; padding: 10rpx 0; border-bottom: 1rpx dotted #e7ddca; }
.dc-row:last-child { border-bottom: none; }
.dc-k { font-size: 25rpx; color: var(--text-tertiary); }
.dc-v { font-size: 25rpx; font-weight: 700; color: var(--text-primary); }
.demo-flag { font-size: 20rpx; color: #a99a82; background: #efe7d8; border-radius: 6rpx; padding: 1rpx 10rpx; vertical-align: super; margin-left: 4rpx; }
.lock-box { display: flex; gap: 18rpx; background: var(--cream-dark); border: 2rpx solid var(--border); border-radius: var(--r-lg); padding: 28rpx; margin: 0 24rpx 24rpx; }
.lock-ic { font-size: 36rpx; flex-shrink: 0; }
.lock-body { flex: 1; }
.lock-t { font-size: 26rpx; font-weight: 800; color: var(--text-primary); }
.lock-d { font-size: 22rpx; color: var(--text-tertiary); margin-top: 10rpx; line-height: 1.6; }
.quad { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 10rpx; }
.qd { border: 2rpx solid var(--border); border-radius: var(--r-md); padding: 18rpx; font-size: 24rpx; background: var(--cream); }
.qd text { display: block; color: var(--green); margin-bottom: 4rpx; font-size: 25rpx; }
.ft { padding: 8rpx 24rpx 20rpx; color: var(--text-tertiary); font-size: 22rpx; text-align: center; line-height: 1.7; margin: 0 24rpx; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); display: flex; gap: 20rpx; box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { flex: 1; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; box-shadow: var(--shadow-accent); }
.btn-line { background: #fff; color: var(--green); border: 3rpx solid var(--green); border-radius: var(--r-md); padding: 30rpx 40rpx; font-size: 28rpx; font-weight: 700; }
</style>
