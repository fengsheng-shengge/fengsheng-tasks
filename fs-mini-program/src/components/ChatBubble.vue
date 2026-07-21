<template>
  <view class="chat-bubble" :class="isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'">
    <view class="chat-bubble-avatar">
      <view
        class="chat-bubble-avatar-inner"
        :class="isUser ? 'chat-bubble-avatar-inner--user' : 'chat-bubble-avatar-inner--ai'"
      >
        <text class="chat-bubble-avatar-text">{{ isUser ? '我' : 'AI' }}</text>
      </view>
    </view>

    <view class="chat-bubble-content">
      <view
        class="chat-bubble-body"
        :class="isUser ? 'chat-bubble-body--user' : 'chat-bubble-body--assistant'"
      >
        <text class="chat-bubble-text">{{ message.content }}</text>
      </view>

      <view
        v-if="message.evidence && message.evidence.length"
        class="chat-bubble-evidence"
      >
        <text class="chat-bubble-evidence-label">依据</text>
        <view
          v-for="(item, idx) in message.evidence"
          :key="idx"
          class="chat-bubble-evidence-item"
        >
          <text class="chat-bubble-evidence-text">{{ item }}</text>
        </view>
      </view>

      <view class="chat-bubble-footer">
        <text class="chat-bubble-time">{{ formatTime(message.timestamp) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const isUser = computed(() => props.message.role === 'user')

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
</script>

<style scoped>
.chat-bubble {
  display: flex;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.chat-bubble--user {
  flex-direction: row-reverse;
}

.chat-bubble--assistant {
  flex-direction: row;
}

.chat-bubble-avatar {
  flex-shrink: 0;
  padding-top: 4rpx;
}

.chat-bubble-avatar-inner {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-bubble-avatar-inner--user {
  background-color: #3d5a3e;
}

.chat-bubble-avatar-inner--ai {
  background-color: #c46a3a;
}

.chat-bubble-avatar-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

.chat-bubble-content {
  max-width: 520rpx;
  display: flex;
  flex-direction: column;
}

.chat-bubble--user .chat-bubble-content {
  align-items: flex-end;
}

.chat-bubble--assistant .chat-bubble-content {
  align-items: flex-start;
}

.chat-bubble-body {
  padding: 18rpx 22rpx;
  border-radius: 16rpx;
  word-break: break-all;
}

.chat-bubble-body--user {
  background-color: #3d5a3e;
  border-bottom-right-radius: 4rpx;
}

.chat-bubble-body--user .chat-bubble-text {
  color: #ffffff;
}

.chat-bubble-body--assistant {
  background-color: #ffffff;
  border-bottom-left-radius: 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.chat-bubble-body--assistant .chat-bubble-text {
  color: #333333;
}

.chat-bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
}

.chat-bubble-evidence {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  background-color: rgba(196, 106, 58, 0.06);
  border-radius: 10rpx;
  border-left: 6rpx solid #c46a3a;
  width: 100%;
}

.chat-bubble-evidence-label {
  font-size: 22rpx;
  font-weight: 600;
  color: #c46a3a;
  display: block;
  margin-bottom: 6rpx;
}

.chat-bubble-evidence-item {
  margin-bottom: 4rpx;
}

.chat-bubble-evidence-item:last-child {
  margin-bottom: 0;
}

.chat-bubble-evidence-text {
  font-size: 22rpx;
  color: #888888;
  line-height: 1.5;
}

.chat-bubble-footer {
  margin-top: 8rpx;
}

.chat-bubble-time {
  font-size: 20rpx;
  color: #cccccc;
}
</style>