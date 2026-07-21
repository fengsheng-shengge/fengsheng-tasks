<template>
  <view class="page">
    <!-- 场景域头部 -->
    <view class="domain-header">
      <view class="domain-icon-lg">{{ icon }}</view>
      <view class="domain-info">
        <text class="domain-name-lg">{{ domainName }}</text>
        <view class="domain-stats">
          <text class="stat-item">词条 {{ entryCount }}</text>
          <text class="stat-item">工具卡 {{ toolCount }}</text>
        </view>
      </view>
    </view>

    <!-- 场景卡片列表 -->
    <view class="scene-list">
      <view class="list-title">场景卡片</view>
      <view v-if="sceneCards.length > 0">
        <view
          v-for="card in sceneCards"
          :key="card.cardId || card.id"
          class="scene-card-item"
          @click="onSceneClick(card)"
        >
          <view class="card-header">
            <text class="card-title">{{ card.scenarioTitle || card.title }}</text>
            <text class="card-arrow">→</text>
          </view>
          <text class="card-pain">{{ card.painPoint || card.description }}</text>
          <view v-if="card.tags" class="card-tags">
            <text v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">该场景域暂无场景卡片</text>
        <text class="empty-hint">内容持续更新中</text>
      </view>
    </view>

    <!-- 相关词条 -->
    <view class="entry-list">
      <view class="list-title">相关词条</view>
      <view v-if="filteredEntries.length > 0">
        <view
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="entry-item"
          @click="onEntryClick(entry)"
        >
          <text class="entry-icon">📋</text>
          <view class="entry-info">
            <text class="entry-name">{{ entry.name }}</text>
            <text class="entry-insight">{{ entry.insight }}</text>
          </view>
          <text class="entry-arrow">→</text>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">该场景域暂无词条</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { track } from '../../utils/tracker'

const domainId = ref('')
const domainName = ref('')
const icon = ref('🔍')
const entryCount = ref(0)
const toolCount = ref(0)
const allEntries = ref([])
const allSceneCards = ref([])

// 域映射：场景域 → entries.json 的 domain 字段
const DOMAIN_MAP = {
  'pre-contract': ['trade', 'rental'],
  'in-contract': ['trade', 'policy'],
  'post-contract': ['trade', 'homekeep'],
  'living': ['homekeep', 'decor'],
  'exit': ['rental', 'trade'],
  'career': ['talent', 'quality'],
}

// 域统计
const DOMAIN_STATS = {
  'pre-contract': { entryCount: 68, toolCount: 20 },
  'in-contract': { entryCount: 77, toolCount: 15 },
  'post-contract': { entryCount: 47, toolCount: 10 },
  'living': { entryCount: 69, toolCount: 15 },
  'exit': { entryCount: 68, toolCount: 12 },
  'career': { entryCount: 27, toolCount: 8 },
}

// 过滤词条
const filteredEntries = computed(() => {
  const domains = DOMAIN_MAP[domainId.value] || []
  return allEntries.value.filter(e => domains.includes(e.domain))
})

// 过滤场景卡片（从 scene_cards.json）
const sceneCards = computed(() => {
  // 第一版：展示所有场景卡片（场景卡片数量少，不按域过滤）
  return allSceneCards.value
})

onLoad((options) => {
  domainId.value = options.domainId || 'pre-contract'
  domainName.value = options.domainName || '签约前'
  icon.value = options.icon || '🔍'
  uni.setStorageSync('__current_page', '/pages/home/domain-list')
  track.pageview({ domainId: domainId.value, domainName: domainName.value })

  const stats = DOMAIN_STATS[domainId.value] || {}
  entryCount.value = stats.entryCount || 0
  toolCount.value = stats.toolCount || 0

  // 加载词条数据
  try {
    const data = require('../../data/entries.json')
    allEntries.value = data?.entries || data || []
  } catch {
    allEntries.value = []
  }

  // 加载场景卡片数据
  try {
    const data = require('../../data/scene_cards.json')
    allSceneCards.value = data?.sceneCards || data || []
  } catch {
    allSceneCards.value = []
  }
})

function onSceneClick(card) {
  const cardId = card.cardId || card.id
  track.contentClick(cardId, 'scene_card', 'domain_list')
  uni.navigateTo({ url: `/pages/home/scene-detail?cardId=${cardId}` })
}

function onEntryClick(entry) {
  track.contentClick(entry.id, 'entry', 'domain_list')
  uni.navigateTo({ url: `/pages/dict/entry-detail?entryId=${entry.id}` })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

.domain-header {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #3d5a3e 0%, #4a7a4b 100%);
  padding: 40rpx 32rpx;
  color: #ffffff;
}

.domain-icon-lg {
  font-size: 64rpx;
  margin-right: 24rpx;
}

.domain-info {
  flex: 1;
}

.domain-name-lg {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.domain-stats {
  display: flex;
  gap: 24rpx;
}

.stat-item {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.scene-list,
.entry-list {
  margin: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.list-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0ede7;
}

.scene-card-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f7f4ef;
}

.scene-card-item:active {
  background: #f7f4ef;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
}

.card-arrow {
  font-size: 28rpx;
  color: #c46a3a;
}

.card-pain {
  font-size: 26rpx;
  color: #7a8478;
  display: block;
  margin-bottom: 8rpx;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tag {
  font-size: 22rpx;
  color: #3d5a3e;
  background: rgba(61, 90, 62, 0.08);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.entry-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f7f4ef;
}

.entry-item:active {
  background: #f7f4ef;
}

.entry-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.entry-info {
  flex: 1;
}

.entry-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
  margin-bottom: 4rpx;
}

.entry-insight {
  font-size: 24rpx;
  color: #7a8478;
  display: block;
}

.entry-arrow {
  font-size: 28rpx;
  color: #c46a3a;
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #7a8478;
  display: block;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #bbb;
}
</style>
