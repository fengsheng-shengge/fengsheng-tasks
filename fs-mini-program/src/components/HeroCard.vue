<template>
  <view class="hero-card">
    <view class="hero-bg">
      <view class="hero-level-wrap">
        <text class="hero-level">Lv.{{ level }}</text>
        <text class="hero-level-name">{{ levelName }}</text>
      </view>
      <view class="hero-points-wrap">
        <text class="hero-points-label">积分</text>
        <text class="hero-points-value">{{ points }}</text>
      </view>
      <view class="hero-slogan-wrap">
        <text class="hero-slogan">{{ slogan }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  level: {
    type: Number,
    default: 1
  },
  levelName: {
    type: String,
    default: '见习经纪'
  },
  points: {
    type: Number,
    default: 0
  },
  slogan: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.hero-card {
  margin: 32rpx 24rpx;
  border-radius: 16px;
  overflow: hidden;
}

.hero-bg {
  background: linear-gradient(135deg, #3d5a3e 0%, #4a6b4b 40%, #3d5a3e 100%);
  padding: 40rpx 32rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-level-wrap {
  display: flex;
  align-items: baseline;
  margin-bottom: 24rpx;
}

.hero-level {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.hero-level-name {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: 700;
  margin-left: 12rpx;
}

.hero-points-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28rpx;
}

.hero-points-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 8rpx;
}

.hero-points-value {
  font-size: 72rpx;
  font-weight: 800;
  color: #c46a3a;
  line-height: 1;
  letter-spacing: 4rpx;
}

.hero-slogan-wrap {
  width: 100%;
  text-align: center;
}

.hero-slogan {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}
</style>