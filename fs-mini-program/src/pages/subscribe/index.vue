<template>
  <view class="page">
    <view class="header">
      <view class="title">会员中心</view>
      <view class="sub">免费养成期 · 全部功能免费体验</view>
    </view>

    <view class="free-card">
      <view class="free-badge">免费养成期</view>
      <view class="free-title">会员功能即将上线</view>
      <view class="free-desc">当前阶段，风声全部核心功能（客户解码、品质测评、开单话术锦囊、案例与备忘解锁）均免费向居住服务者开放，无需付费。</view>
      <view class="free-note">付费能力将在产品主体升级为企业后开放，敬请期待。</view>
    </view>

    <view class="rights-section">
      <view class="rights-title">当前免费权益</view>
      <view class="right-item" v-for="(r, i) in rights" :key="i">
        <text class="right-dot">✓</text>
        <text class="right-text">{{ r }}</text>
      </view>
    </view>

    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script>
import track from '../../utils/tracker'

const RIGHTS = [
  '客户解码器：每日免费使用',
  '品质测评：免费作答',
  '开单话术锦囊：免费查看',
  '词条案例 / 经纪人备忘：积分免费解锁',
  '每日一题 / 答题测评：赚积分',
]

export default {
  data() {
    return { rights: RIGHTS }
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/subscribe/index')
    track.pageview({ page: '/pages/subscribe/index' })
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.header { padding: 30rpx 10rpx 20rpx; }
.title { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }
.sub { font-size: 24rpx; color: #888; margin-top: 8rpx; }

.free-card { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 20rpx; padding: 36rpx 30rpx; margin: 20rpx 10rpx; }
.free-badge { display: inline-block; background: rgba(255,255,255,0.2); color: #fff; font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 20rpx; }
.free-title { color: #fff; font-size: 34rpx; font-weight: 800; margin-top: 16rpx; }
.free-desc { color: rgba(255,255,255,0.92); font-size: 26rpx; line-height: 1.7; margin-top: 12rpx; }
.free-note { color: rgba(255,255,255,0.7); font-size: 22rpx; margin-top: 12rpx; }

.rights-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 16rpx 10rpx; }
.rights-title { font-size: 28rpx; font-weight: 700; color: #222; margin-bottom: 16rpx; }
.right-item { display: flex; align-items: center; padding: 12rpx 0; }
.right-dot { color: #3d5a3e; font-weight: 700; margin-right: 16rpx; }
.right-text { font-size: 26rpx; color: #444; }

.page-footer { text-align: center; padding: 24rpx 0 40rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
