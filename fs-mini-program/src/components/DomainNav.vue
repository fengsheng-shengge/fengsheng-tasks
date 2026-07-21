<template>
  <view class="domain-nav">
    <text class="domain-nav-title">场景域</text>
    <scroll-view class="domain-nav-scroll" scroll-x show-scrollbar="false">
      <view
        v-for="d in domains"
        :key="d.id"
        class="domain-chip"
        @click="onDomainClick(d)"
      >
        <text class="domain-icon">{{ d.icon }}</text>
        <text class="domain-name">{{ d.name }}</text>
        <text class="domain-count">{{ d.entryCount }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { track } from '../utils/tracker'

// 6 大场景域数据
const domains = [
  { id: 'pre-contract', name: '签约前', icon: '🔍', entryCount: 68, toolCount: 20 },
  { id: 'in-contract', name: '签约中', icon: '✍️', entryCount: 77, toolCount: 15 },
  { id: 'post-contract', name: '签约后', icon: '📦', entryCount: 47, toolCount: 10 },
  { id: 'living', name: '居住中', icon: '🏠', entryCount: 69, toolCount: 15 },
  { id: 'exit', name: '退租出售', icon: '🚪', entryCount: 68, toolCount: 12 },
  { id: 'career', name: '职业成长', icon: '📈', entryCount: 27, toolCount: 8 },
]

function onDomainClick(d) {
  track.contentClick(d.id, 'domain', 'domain_nav')
  uni.navigateTo({ url: `/pages/home/domain-list?domainId=${d.id}&domainName=${d.name}&icon=${d.icon}` })
}
</script>

<style scoped>
.domain-nav {
  margin: 24rpx 0;
  padding: 0 24rpx;
}

.domain-nav-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #7a8478;
  margin-bottom: 16rpx;
  display: block;
}

.domain-nav-scroll {
  white-space: nowrap;
}

.domain-chip {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1rpx solid #f0ede7;
  border-radius: 999rpx;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  transition: all 0.2s;
}

.domain-chip:active {
  background: #3d5a3e;
  border-color: #3d5a3e;
}

.domain-chip:active .domain-name,
.domain-chip:active .domain-count,
.domain-chip:active .domain-icon {
  color: #ffffff;
}

.domain-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.domain-name {
  font-size: 26rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.domain-count {
  font-size: 22rpx;
  color: #c46a3a;
  margin-left: 8rpx;
  font-weight: 600;
}
</style>
