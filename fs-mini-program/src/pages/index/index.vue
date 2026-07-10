<template>
  <view class="page">
    <!-- Hero 区域 -->
    <view class="hero">
      <view class="hero-title">风声</view>
      <view class="hero-sub">居住服务行业知识库</view>
      <view class="hero-desc">8域122词条 · 行业知识图谱</view>
    </view>

    <!-- 知识底座入口 -->
    <view class="product-card" @click="goToKnowledge">
      <view class="product-icon">📚</view>
      <view class="product-name">知识底座</view>
      <view class="product-desc">交易流程 · 服务规范 · 行业标准</view>
      <view class="product-tag free">免费</view>
    </view>

    <!-- 文字引导（不调用任何接口） -->
    <view class="guide-text">
      想体验更多功能？访问 fengsheng.tech
    </view>

    <!-- ICP备案 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026041809号</text>
    </view>
  </view>
</template>

<script>
import track from '../../utils/tracker'

export default {
  onShow() {
    uni.setStorageSync('__current_page', '/pages/index/index')
    track.pageview({ page: '/pages/index/index' })
  },
  methods: {
    goToKnowledge() {
      track.click('home_goto_knowledge')
      uni.navigateTo({
        url: '/pages/webview/index?url=' + encodeURIComponent('https://fengsheng.tech/knowledge')
      })
    },
  },
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.hero {
  text-align: center;
  padding: 60rpx 0 40rpx;
}
.hero-title {
  font-size: 56rpx;
  font-weight: 900;
  color: #3d5a3e;
  letter-spacing: 0.2em;
}
.hero-sub {
  font-size: 30rpx;
  color: #555;
  margin-top: 12rpx;
  font-weight: 600;
}
.hero-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.product-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 36rpx 30rpx;
  margin: 20rpx 10rpx;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.06);
}
.product-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}
.product-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
}
.product-desc {
  font-size: 26rpx;
  color: #888;
  margin-top: 8rpx;
}
.product-tag {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: #e8f5e9;
  color: #3d5a3e;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.guide-text {
  text-align: center;
  font-size: 24rpx;
  color: #aaa;
  padding: 40rpx 20rpx;
}

.footer { text-align: center; padding: 20rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
