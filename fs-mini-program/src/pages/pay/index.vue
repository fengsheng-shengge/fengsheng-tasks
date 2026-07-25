<template>
  <view class="page">
    <!-- 免费养成期说明 -->
    <view class="section">
      <view class="section-title">免费养成期</view>
      <view class="free-info">
        <view class="free-badge">免费</view>
        <view class="free-desc">当前处于免费养成期，全部功能免费使用</view>
      </view>
    </view>

    <!-- 功能说明 -->
    <view class="section">
      <view class="section-title">已开放功能</view>
      <view class="feature-list">
        <view class="feature-item">
          <text class="feature-icon">&#128218;</text>
          <view class="feature-text">
            <view class="feature-name">专业词条库</view>
            <view class="feature-sub">全量词条随时查阅</view>
          </view>
          <text class="feature-tag">免费</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">&#128172;</text>
          <view class="feature-text">
            <view class="feature-name">开单话术库</view>
            <view class="feature-sub">常见异议应对话术</view>
          </view>
          <text class="feature-tag">免费</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">&#127919;</text>
          <view class="feature-text">
            <view class="feature-name">每日一题</view>
            <view class="feature-sub">答题赚积分</view>
          </view>
          <text class="feature-tag">免费</text>
        </view>
      </view>
    </view>

    <!-- 即将上线 -->
    <view class="section">
      <view class="section-title">即将上线</view>
      <view class="coming-list">
        <view class="coming-item">
          <text class="coming-name">订阅会员</text>
          <text class="coming-status">敬请期待</text>
        </view>
        <view class="coming-item">
          <text class="coming-name">积分商城</text>
          <text class="coming-status">敬请期待</text>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 免费养成期，无需选择套餐
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 分区 */
.section {
  margin: 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
}

/* 免费说明 */
.free-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.free-badge {
  background: #3d5a3e;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
}
.free-desc {
  font-size: 28rpx;
  color: #555;
}

/* 功能列表 */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.feature-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f7f4ef;
  border-radius: 16rpx;
}
.feature-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.feature-text {
  flex: 1;
}
.feature-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.feature-sub {
  font-size: 22rpx;
  color: #888;
  margin-top: 4rpx;
}
.feature-tag {
  font-size: 22rpx;
  color: #3d5a3e;
  font-weight: 700;
  background: #e8f5e9;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
}

/* 即将上线 */
.coming-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.coming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #f7f4ef;
  border-radius: 16rpx;
}
.coming-name {
  font-size: 28rpx;
  color: #555;
}
.coming-status {
  font-size: 24rpx;
  color: #aaa;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 40rpx 20rpx 20rpx;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>
