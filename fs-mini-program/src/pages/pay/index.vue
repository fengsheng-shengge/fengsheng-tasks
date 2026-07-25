<template>
  <view class="page">
    <view class="free-card">
      <view class="free-icon">🎁</view>
      <view class="free-title">付费功能即将上线</view>
      <view class="free-desc">风声当前处于免费养成期，积分可免费解锁案例与备忘，无需充值。付费充值能力将在产品主体升级后开放。</view>
    </view>
    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import track from '../../utils/tracker'

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/pay/index')
  track.pageview({ page: '/pages/pay/index' })
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f4ef; display: flex; align-items: center; justify-content: center; }
.free-card { background: #fff; border-radius: 24rpx; padding: 60rpx 40rpx; margin: 40rpx; text-align: center; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06); }
.free-icon { font-size: 80rpx; }
.free-title { font-size: 34rpx; font-weight: 800; color: #3d5a3e; margin: 20rpx 0 12rpx; }
.free-desc { font-size: 26rpx; color: #888; line-height: 1.7; }
.page-footer { position: fixed; bottom: 40rpx; left: 0; right: 0; text-align: center; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
