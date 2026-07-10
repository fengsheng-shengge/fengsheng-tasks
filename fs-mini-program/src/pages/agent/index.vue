<template>
  <view class="page">
    <view class="header">
      <view class="title">开单导师</view>
      <view class="sub">7步开单闭环 · 每步配工具</view>
    </view>

    <!-- 7步法概览 -->
    <view class="steps-section">
      <view
        v-for="(step, i) in steps"
        :key="i"
        class="step-card"
        @click="toggleStep(i)"
      >
        <view class="step-header">
          <view class="step-num">{{ i + 1 }}</view>
          <view class="step-info">
            <view class="step-name">{{ step.name }}</view>
            <view class="step-desc">{{ step.desc }}</view>
          </view>
          <view class="step-icon">{{ expanded === i ? '▾' : '▸' }}</view>
        </view>
        <view v-if="expanded === i" class="step-detail">
          <view class="detail-row">
            <text class="detail-label">做什么</text>
            <text class="detail-text">{{ step.what }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">话术</text>
            <text class="detail-text highlight">{{ step.script }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">铁律</text>
            <text class="detail-text">{{ step.rule }}</text>
          </view>
          <view class="tool-badge" v-if="step.tool">🛠 {{ step.tool }}</view>
        </view>
      </view>
    </view>

    <!-- 复制Prompt入口 -->
    <view class="prompt-section">
      <view class="prompt-card" @click="copyPrompt">
        <view class="prompt-icon">📋</view>
        <view class="prompt-info">
          <view class="prompt-title">复制扣子Bot Prompt</view>
          <view class="prompt-desc">复制Prompt到扣子平台创建你的业务助手</view>
        </view>
        <view class="prompt-arrow">→</view>
      </view>
    </view>

    <!-- CTA -->
    <view class="cta-banner" @click="goDecode">
      <text class="cta-text">实战练习 → 用解码器拆解客户需求</text>
    </view>
  </view>
</template>

<script>
import track from '../../utils/tracker'

const STEPS = [
  {
    name: '共情接纳',
    desc: '接住客户焦虑，拉近距离',
    what: '客户说"怕跌、不敢买、再看看"，直接点头认同',
    script: '现在买房犹豫、怕亏太正常了，换我也会慎重，毕竟不是小钱。',
    rule: '不反驳、不抬杠、不讲道理',
    tool: '客户解码器（五步情绪接纳模板）',
  },
  {
    name: '挖顾虑+探预算',
    desc: '摸清客户怕什么、图什么、预算多少',
    what: '不硬问"你预算多少"，用引导式话术',
    script: '我猜你不是不想买，是怕买了跌。预算大概在多少区间？不用精确，我好给你找合适的。',
    rule: '不硬问，用猜测+确认代替直接追问',
    tool: '客户解码器（顾虑挖掘模块）',
  },
  {
    name: '需求分层+预算匹配',
    desc: '帮客户排优先级，把需求和预算绑死',
    what: '教做减法，不做加法。只留3个核心需求',
    script: '咱们先定好，你首要的是自住方便，其次保值。预算内优先满足自住，不超支。',
    rule: '只留3个核心需求，砍掉其余',
    tool: '需求确认表',
  },
  {
    name: '拆解焦虑',
    desc: '把"怕买赔"的模糊焦虑，拆成3件小事',
    what: '用大白话拆，不用专业术语',
    script: '你看3件事：①配套齐的房子不容易跌 ②住5年以上短期涨跌不用在意 ③户型方正以后好卖。',
    rule: '只给3条判断标准，不超过',
    tool: '犹豫话术卡',
  },
  {
    name: '给3条选房标准',
    desc: '给客户好记、可自己判断的选房规矩',
    what: '给简单标准，不给复杂指标',
    script: '记住3条：①楼龄10年内 ②南北通透 ③步行10分钟有地铁。不符合的直接不看了。',
    rule: '标准不超过3条，客户自己能判断',
    tool: '选房标准卡',
  },
  {
    name: '精准匹配2-3套房源',
    desc: '只推2-3套，每套说清楚为什么推',
    what: '每套房源用一句话说清匹配点',
    script: '这套符合你3个核心需求中的2个，唯一缺点是楼层高，但价格比同小区低10%。',
    rule: '不超过3套，每套有明确推荐理由',
    tool: '房源匹配卡',
  },
  {
    name: '决策兜底',
    desc: '给客户最后的决策底气',
    what: '不催不逼，给退路和保障',
    script: '你可以先定下来，我有3天犹豫期。如果这两天发现不合适的，全额退。',
    rule: '给退路，不施压',
    tool: '决策兜底卡',
  },
]

const PROMPT_PREVIEW = `你是「风声·开单导师」，一位拥有20多年实战经验的资深业务教练。
你的核心使命：让新人也能像高手一样赢得客户信任、多开单。

核心方法论：7步开单闭环
①共情接纳 → ②挖顾虑+探预算 → ③需求分层 → ④拆解焦虑 → ⑤给选房标准 → ⑥精准匹配 → ⑦决策兜底

完整Prompt见：docs/风声租赁开单导师_系统Prompt_v5_7步法工具版_20260701.md`

export default {
  data() {
    return {
      steps: STEPS,
      expanded: 0,
    }
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/agent/index')
    track.pageview({ page: '/pages/agent/index' })
  },
  methods: {
    toggleStep(i) {
      this.expanded = this.expanded === i ? -1 : i
      track.click('agent_step_click', { step: i + 1 })
    },
    copyPrompt() {
      uni.setClipboardData({
        data: PROMPT_PREVIEW,
        success: () => {
          uni.showToast({ title: 'Prompt已复制', icon: 'success' })
          track.click('agent_copy_prompt')
        },
      })
    },
    goDecode() {
      track.click('agent_to_decode')
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

.steps-section { padding: 0 10rpx; }
.step-card { background: #fff; border-radius: 16rpx; margin-bottom: 12rpx; overflow: hidden; }
.step-header { display: flex; align-items: center; padding: 24rpx; }
.step-num { width: 48rpx; height: 48rpx; border-radius: 50%; background: #3d5a3e; color: #fff; font-size: 28rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; flex-shrink: 0; }
.step-info { flex: 1; }
.step-name { font-size: 30rpx; font-weight: 700; color: #222; }
.step-desc { font-size: 24rpx; color: #888; margin-top: 4rpx; }
.step-icon { font-size: 28rpx; color: #ccc; }

.step-detail { padding: 0 24rpx 24rpx; }
.detail-row { padding: 12rpx 0; border-top: 1rpx solid #f5f5f5; }
.detail-label { font-size: 24rpx; color: #aaa; display: block; margin-bottom: 4rpx; }
.detail-text { font-size: 28rpx; color: #444; line-height: 1.6; }
.detail-text.highlight { color: #3d5a3e; font-weight: 500; }
.tool-badge { display: inline-block; background: #e8f5e9; color: #3d5a3e; font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 20rpx; margin-top: 12rpx; }

.prompt-section { padding: 20rpx 10rpx; }
.prompt-card { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; }
.prompt-icon { font-size: 48rpx; margin-right: 20rpx; }
.prompt-info { flex: 1; }
.prompt-title { font-size: 28rpx; font-weight: 700; color: #222; }
.prompt-desc { font-size: 24rpx; color: #888; margin-top: 4rpx; }
.prompt-arrow { font-size: 32rpx; color: #ccc; }

.cta-banner { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 16rpx; padding: 24rpx; text-align: center; margin: 16rpx 10rpx; }
.cta-text { color: #fff; font-size: 26rpx; }
</style>
