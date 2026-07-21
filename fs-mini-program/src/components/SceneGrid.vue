<template>
  <view class="scene-grid">
    <view class="grid-header">
      <text class="grid-title">场景实战</text>
      <text class="grid-sub">四大高频场景，练就客户洞察力</text>
    </view>
    <view class="grid-body">
      <view
        v-for="card in cards"
        :key="card.cardId"
        class="scene-card"
        :style="{ borderLeftColor: card.color || '#3d5a3e' }"
        @click="goDetail(card.cardId)"
      >
        <view class="scene-card-icon">📋</view>
        <view class="scene-card-title">{{ card.scenarioTitle }}</view>
        <view class="scene-card-domain">{{ card.tags?.[0] || '' }}</view>
        <view class="scene-card-desc">{{ card.painPoint }}</view>
        <view class="scene-card-arrow">&gt;</view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  cards: {
    type: Array,
    default: () => []
  }
})

const goDetail = (cardId) => {
  uni.navigateTo({
    url: `/pages/home/scene-detail?cardId=${cardId}`
  })
}
</script>

<style scoped>
.scene-grid {
  margin: 24rpx 24rpx;
}

.grid-header {
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}

.grid-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
}

.grid-sub {
  font-size: 24rpx;
  color: #999;
  margin-left: 16rpx;
}

.grid-body {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.scene-card {
  width: calc(50% - 10rpx);
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx 24rpx;
  margin-bottom: 20rpx;
  position: relative;
  border-left: 6rpx solid #3d5a3e;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;
}

.scene-card:active {
  transform: scale(0.97);
}

.scene-card-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.scene-card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 6rpx;
}

.scene-card-domain {
  display: inline-block;
  font-size: 20rpx;
  color: #c46a3a;
  background: #fff3ed;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.scene-card-desc {
  font-size: 22rpx;
  color: #888;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.scene-card-arrow {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  font-size: 24rpx;
  color: #ccc;
}
</style>