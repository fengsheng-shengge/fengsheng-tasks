<template>
  <view class="page">
    <!-- Hero 区域 -->
    <view class="hero">
      <view class="hero-title">风声助手</view>
      <view class="hero-sub">帮助服务者用独立价值赢得尊重</view>
    </view>

    <!-- 产品入口 -->
    <view class="product-grid">
      <view class="product-card mentor-card" @click="goToMentor">
        <view class="product-icon">🔥</view>
        <view class="product-name">开单导师</view>
        <view class="product-desc">租赁开单陪练</view>
        <view class="product-tag">推荐</view>
      </view>

      <view class="product-card" @click="goToKnowledge">
        <view class="product-icon">📚</view>
        <view class="product-name">知识底座</view>
        <view class="product-desc">8域122词条·行业知识图谱</view>
        <view class="product-tag free">免费</view>
      </view>
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
    goToMentor() {
      track.click('home_goto_mentor')
      uni.switchTab({ url: '/pages/mentor/index' })
    },
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
  font-size: 48rpx;
  font-weight: 900;
  color: #3d5a3e;
  letter-spacing: 0.1em;
}
.hero-sub {
  font-size: 26rpx;
  color: #888;
  margin-top: 12rpx;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20rpx;
  padding: 0 10rpx;
}
.product-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.06);
}
.mentor-card {
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
}
.mentor-card .product-name {
  color: #fff;
}
.mentor-card .product-desc {
  color: rgba(255,255,255,0.8);
}
.mentor-card .product-tag {
  background: #c46a3a;
}
.product-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}
.product-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
}
.product-desc {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}
.product-tag {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: #3d5a3e;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.product-tag.free {
  background: #e8f5e9;
  color: #3d5a3e;
}

.footer { text-align: center; padding: 20rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
