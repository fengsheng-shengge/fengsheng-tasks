<template>
  <view id="app">
    <view class="fs-header">
      <text class="fs-brand">风声助手</text>
      <text class="fs-tag">居住服务</text>
    </view>
    <view class="fs-content">
      <text class="fs-loading">加载中...</text>
    </view>
    <view class="fs-tab-bar">
      <navigator url="/pages/index/index" open-type="switchTab" class="tab-item">
        <text>🏠 首页</text>
      </navigator>
      <navigator url="/pages/decode/index" open-type="switchTab" class="tab-item">
        <text>🔍 解码器</text>
      </navigator>
      <navigator url="/pages/assess/index" open-type="switchTab" class="tab-item">
        <text>📊 测评</text>
      </navigator>
      <navigator url="/pages/profile/index" open-type="switchTab" class="tab-item">
        <text>👤 我的</text>
      </navigator>
    </view>
  </view>
</template>

<script>
export default {
  onLaunch() {
    console.log('风声助手 onLaunch')
    // 检查登录状态
    const token = uni.getStorageSync('fs_token')
    if (token) {
      console.log('已登录 token:', token)
    } else {
      console.log('未登录')
    }
  },
  onShow() {
    console.log('风声助手 onShow')
  },
  onHide() {
    console.log('风声助手 onHide')
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.fs-header {
  background: linear-gradient(135deg, #3d5a3e 0%, #5a7a5c 100%);
  color: white;
  padding: 30rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fs-brand {
  font-size: 36rpx;
  font-weight: 700;
}

.fs-tag {
  font-size: 22rpx;
  background: rgba(255,255,255,0.2);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.fs-content {
  padding: 40rpx;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fs-loading {
  color: #999;
  font-size: 28rpx;
}

.fs-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  border-top: 1rpx solid #eee;
  padding: 10rpx 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #999;
  padding: 10rpx 0;
}

.tab-item text {
  display: block;
}
</style>
