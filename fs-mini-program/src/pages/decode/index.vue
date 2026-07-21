<template>
  <view class="page">
    <view class="header">
      <view class="title">客户解码器</view>
      <view class="sub">输入客户一句话，帮你拆解真实需求</view>
    </view>

    <!-- 输入区 -->
    <view class="input-section">
      <textarea
        v-model="inputText"
        class="input-box"
        placeholder="例：客户说随便看看，预算3000左右，想离地铁近的"
        :maxlength="500"
        auto-height
      />
      <view class="input-bar">
        <text class="char-count">{{ inputText.length }}/500</text>
        <view class="decode-btn" :class="{ disabled: !inputText.trim() || loading }" @click="doDecode">
          {{ loading ? '解码中...' : '开始解码' }}
        </view>
      </view>
    </view>

    <!-- 快捷场景 -->
    <view class="quick-section">
      <view class="quick-label">快捷输入</view>
      <view class="quick-list">
        <view class="quick-tag" v-for="q in quickInputs" :key="q" @click="inputText = q">
          {{ q }}
        </view>
      </view>
    </view>

    <!-- 解码结果 -->
    <view v-if="result" class="result-section">
      <view class="result-header">
        <text class="result-title">解码结果</text>
        <text class="result-cat">{{ result.category || '未知' }}</text>
      </view>

      <!-- 客户画像 -->
      <view v-if="result.profile" class="result-card">
        <view class="card-title">客户画像</view>
        <view class="card-row" v-for="(v, k) in result.profile" :key="k">
          <text class="row-label">{{ profileLabels[k] || k }}</text>
          <text class="row-value">{{ v }}</text>
        </view>
      </view>

      <!-- 洞察列表 -->
      <view v-if="result.insights && result.insights.length" class="result-card">
        <view class="card-title">需求洞察</view>
        <view class="insight-item" v-for="(ins, i) in result.insights" :key="i">
          <text class="insight-num">{{ i + 1 }}</text>
          <text class="insight-text">{{ ins.text || ins }}</text>
        </view>
      </view>

      <!-- 话术建议 -->
      <view v-if="result.suggestions && result.suggestions.length" class="result-card">
        <view class="card-title">话术建议</view>
        <view class="suggest-item" v-for="(sug, i) in result.suggestions" :key="i">
          <text class="suggest-text">{{ sug.text || sug }}</text>
        </view>
      </view>

      <!-- CTA -->
      <view class="cta-banner" @click="goAssess">
        <text class="cta-text">想深入了解客户？试试品质测评 →</text>
      </view>
    </view>

    <!-- 免费次数提示 -->
    <view v-if="!result && !loading" class="free-tip">
      <text class="free-text" v-if="!isIOS">每日免费1次 · 付费¥49/月不限次</text>
      <text class="free-text" v-else>每日免费1次 · 更多次数联系客服开通</text>
    </view>
    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script>
import { decodeCustomer } from '../../api/decode'
import track from '../../utils/tracker'

const QUICK_INPUTS = [
  '客户说随便看看，预算3000左右',
  '客户想租一居室，要离地铁近',
  '客户说预算有限，能不能便宜点',
  '客户是刚毕业的年轻人，想合租',
]

const PROFILE_LABELS = {
  lifeStage: '人生阶段',
  coreNeed: '核心需求',
  riskTolerance: '风险偏好',
  decisionStyle: '决策风格',
  source: '来源',
}

export default {
  data() {
    return {
      inputText: '',
      loading: false,
      result: null,
      quickInputs: QUICK_INPUTS,
      profileLabels: PROFILE_LABELS,
      isIOS: false,
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.isIOS = sysInfo.platform === 'ios'
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/decode/index')
    track.pageview({ page: '/pages/decode/index' })
  },
  methods: {
    async doDecode() {
      if (!this.inputText.trim() || this.loading) return
      this.loading = true
      this.result = null
      track.click('decode_submit')

      try {
        const res = await decodeCustomer(this.inputText.trim())
        this.result = res
        track.decode(res.category || 'unknown')
      } catch (err) {
        uni.showToast({ title: err.message || '解码失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goAssess() {
      track.click('decode_to_assess')
      uni.switchTab({ url: '/pages/assess/index' })
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.header { padding: 30rpx 10rpx 20rpx; }
.title { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }
.sub { font-size: 24rpx; color: #888; margin-top: 8rpx; }

.input-section { background: #fff; border-radius: 20rpx; padding: 24rpx; margin: 20rpx 10rpx; }
.input-box { width: 100%; min-height: 120rpx; font-size: 28rpx; line-height: 1.6; }
.input-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; }
.char-count { font-size: 22rpx; color: #bbb; }
.decode-btn { background: #3d5a3e; color: #fff; font-size: 28rpx; font-weight: 700; padding: 16rpx 40rpx; border-radius: 30rpx; }
.decode-btn.disabled { opacity: 0.4; }

.quick-section { padding: 0 10rpx; }
.quick-label { font-size: 24rpx; color: #888; margin-bottom: 12rpx; }
.quick-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.quick-tag { background: #e8f5e9; color: #3d5a3e; font-size: 24rpx; padding: 12rpx 20rpx; border-radius: 20rpx; }

.result-section { margin-top: 30rpx; }
.result-header { display: flex; align-items: center; justify-content: space-between; padding: 0 10rpx; margin-bottom: 16rpx; }
.result-title { font-size: 32rpx; font-weight: 700; color: #222; }
.result-cat { font-size: 24rpx; color: #3d5a3e; background: #e8f5e9; padding: 6rpx 20rpx; border-radius: 20rpx; }

.result-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 0 10rpx 16rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: #3d5a3e; margin-bottom: 16rpx; }
.card-row { display: flex; justify-content: space-between; padding: 8rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.row-label { font-size: 26rpx; color: #888; }
.row-value { font-size: 26rpx; color: #222; font-weight: 500; }

.insight-item { display: flex; align-items: flex-start; padding: 10rpx 0; }
.insight-num { font-size: 24rpx; font-weight: 700; color: #3d5a3e; margin-right: 12rpx; }
.insight-text { font-size: 26rpx; color: #444; flex: 1; }

.suggest-item { padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.suggest-text { font-size: 26rpx; color: #444; line-height: 1.6; }

.cta-banner { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 16rpx; padding: 24rpx; margin: 16rpx 10rpx; text-align: center; }
.cta-text { color: #fff; font-size: 26rpx; }

.free-tip { text-align: center; padding: 40rpx; }
.free-text { font-size: 24rpx; color: #aaa; }
.page-footer { text-align: center; padding: 24rpx 0 40rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
