<template>
  <view
    class="entry-card"
    hover-class="entry-card--pressed"
    @tap="handleClick"
  >
    <view class="entry-card-header">
      <view class="entry-card-tags">
        <view
          v-if="entry.toolType"
          class="entry-card-tag entry-card-tag--tool"
        >
          <text class="entry-card-tag-text">{{ entry.toolType }}</text>
        </view>
        <view
          v-if="entry.evidenceStrength"
          class="entry-card-tag entry-card-tag--evidence"
          :style="{ backgroundColor: evidenceColor.bg, color: evidenceColor.text }"
        >
          <text class="entry-card-tag-text">{{ entry.evidenceStrength }}</text>
        </view>
      </view>
      <view
        class="entry-card-favorite"
        :class="{ 'entry-card-favorite--active': entry.isFavorited }"
        hover-class="entry-card-favorite--pressed"
        @tap.stop="handleFavorite"
      >
        <text class="entry-card-favorite-icon">
          {{ entry.isFavorited ? '\u2605' : '\u2606' }}
        </text>
      </view>
    </view>

    <view class="entry-card-body">
      <text class="entry-card-name">{{ entry.name }}</text>
      <text v-if="entry.domain" class="entry-card-domain">{{ entry.domain }}</text>
      <text v-if="entry.insight" class="entry-card-insight">{{ entry.insight }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click', 'favorite'])

const evidenceColor = computed(() => {
  const strength = (props.entry.evidenceStrength || '').toLowerCase()
  if (strength.includes('强') || strength.includes('高')) {
    return { bg: 'rgba(61, 90, 62, 0.1)', text: '#3d5a3e' }
  }
  if (strength.includes('中')) {
    return { bg: 'rgba(196, 106, 58, 0.1)', text: '#c46a3a' }
  }
  return { bg: 'rgba(153, 153, 153, 0.1)', text: '#999999' }
})

function handleClick() {
  emit('click')
}

function handleFavorite() {
  emit('favorite')
}
</script>

<style scoped>
.entry-card {
  padding: 24rpx 28rpx;
  margin: 0 24rpx 20rpx;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease;
}

.entry-card--pressed {
  transform: scale(0.98);
}

.entry-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.entry-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.entry-card-tag {
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
}

.entry-card-tag--tool {
  background-color: rgba(61, 90, 62, 0.1);
}

.entry-card-tag--tool .entry-card-tag-text {
  color: #3d5a3e;
}

.entry-card-tag-text {
  font-size: 20rpx;
  font-weight: 500;
}

.entry-card-favorite {
  padding: 4rpx 8rpx;
  flex-shrink: 0;
}

.entry-card-favorite--pressed {
  transform: scale(0.9);
}

.entry-card-favorite-icon {
  font-size: 36rpx;
  color: #cccccc;
}

.entry-card-favorite--active .entry-card-favorite-icon {
  color: #c46a3a;
}

.entry-card-body {
  display: flex;
  flex-direction: column;
}

.entry-card-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #333333;
  line-height: 1.4;
  margin-bottom: 4rpx;
}

.entry-card-domain {
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.entry-card-insight {
  font-size: 24rpx;
  color: #c46a3a;
  line-height: 1.5;
  padding: 12rpx 16rpx;
  background-color: #f7f4ef;
  border-radius: 8rpx;
  border-left: 4rpx solid #c46a3a;
}
</style>