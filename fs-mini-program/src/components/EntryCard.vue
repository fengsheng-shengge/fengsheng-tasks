<template>
  <view
    class="entry-card"
    hover-class="entry-card--pressed"
    @tap="handleClick"
  >
    <view class="entry-card-header">
      <view class="entry-card-tags">
        <view
          v-if="entry.srcType"
          class="entry-card-tag entry-card-tag--tool"
        >
          <text class="entry-card-tag-text">{{ entry.srcType }}</text>
        </view>
        <view
          v-if="entry.severity"
          class="entry-card-tag entry-card-tag--evidence"
          :style="{ backgroundColor: evidenceColor.bg, color: evidenceColor.text }"
        >
          <text class="entry-card-tag-text">{{ severityLabel }}</text>
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
      <text v-if="entry.domain" class="entry-card-domain">{{ domainLabel }}</text>
      <text v-if="entry.def" class="entry-card-insight">{{ entrySummary }}</text>
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

// 域中文映射
const DOMAIN_LABEL_MAP = {
  daodejing: '道德经',
  trade: '交易',
  rental: '租赁',
  decor: '装修',
  homekeep: '家政',
  policy: '政策',
  talent: '人才',
  'quality-customer': '客户品质',
  'quality-server': '服务品质',
  stage: '阶段',
  dimension: '维度'
}

// 严重程度中文标签（hard=硬性约束 / soft=软性建议）
const severityLabel = computed(() => {
  const s = (props.entry.severity || '').toLowerCase()
  if (s === 'hard') return '硬性'
  if (s === 'soft') return '软性'
  return props.entry.severity || ''
})

// 域中文标签
const domainLabel = computed(() => {
  return DOMAIN_LABEL_MAP[props.entry.domain] || props.entry.domain || ''
})

// 定义摘要（取前 50 字）
const entrySummary = computed(() => {
  const def = props.entry.def || ''
  return def.length > 50 ? def.slice(0, 50) + '...' : def
})

const evidenceColor = computed(() => {
  const severity = (props.entry.severity || '').toLowerCase()
  if (severity === 'hard') {
    return { bg: 'rgba(61, 90, 62, 0.1)', text: '#3d5a3e' }
  }
  if (severity === 'soft') {
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