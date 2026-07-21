<template>
  <view class="validity-bar">
    <view class="validity-row">
      <text class="validity-icon">📅</text>
      <text class="validity-label">时效验证</text>
      <text class="validity-status" :class="statusClass">{{ statusText }}</text>
    </view>
    <view class="validity-meta">
      <text class="meta-item">最后更新：{{ lastVerified }}</text>
      <text class="meta-item" v-if="legalVersion">法条版本：{{ legalVersion }}</text>
    </view>
    <view v-if="legalBasis" class="validity-link" @click="viewOriginal">
      <text class="link-text">法条原文 →</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lastVerified: {
    type: String,
    default: '',
  },
  legalStatus: {
    type: String,
    default: '',
  },
  legalVersion: {
    type: String,
    default: '',
  },
  legalBasis: {
    type: String,
    default: '',
  },
})

const statusClass = computed(() => {
  const status = props.legalStatus
  if (status === '现行有效') return 'valid'
  if (status === '待验证' || status === '需确认') return 'warning'
  if (status === '已修订' || status === '部分失效') return 'danger'
  return 'warning' // 默认待验证
})

const statusText = computed(() => {
  return props.legalStatus || '待验证'
})

const lastVerified = computed(() => {
  return props.lastVerified || '未记录'
})

function viewOriginal() {
  // 复制法条原文到剪贴板
  if (props.legalBasis) {
    uni.setClipboardData({
      data: props.legalBasis,
      success: () => {
        uni.showToast({ title: '法条原文已复制', icon: 'success' })
      },
    })
  }
}
</script>

<style scoped>
.validity-bar {
  background: #f7f4ef;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin: 16rpx 0;
}

.validity-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.validity-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.validity-label {
  font-size: 26rpx;
  color: #7a8478;
  margin-right: 16rpx;
}

.validity-status {
  font-size: 26rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.validity-status.valid {
  color: #2d7d46;
  background: rgba(45, 125, 70, 0.08);
}

.validity-status.warning {
  color: #c46a3a;
  background: rgba(196, 106, 58, 0.08);
}

.validity-status.danger {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
}

.validity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #7a8478;
}

.validity-link {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 0;
}

.link-text {
  font-size: 26rpx;
  color: #3d5a3e;
  font-weight: 500;
}
</style>
