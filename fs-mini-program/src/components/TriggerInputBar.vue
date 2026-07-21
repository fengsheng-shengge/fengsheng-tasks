<template>
  <view class="trigger-bar">
    <view class="trigger-icon">💬</view>
    <input
      class="trigger-input"
      v-model="inputText"
      :placeholder="placeholder"
      placeholder-class="trigger-placeholder"
      confirm-type="search"
      @confirm="onTrigger"
      @focus="onFocus"
    />
    <view class="trigger-arrow" @click="onTrigger">→</view>
  </view>

  <!-- 匹配结果浮层 -->
  <view v-if="showResults" class="trigger-results">
    <view class="results-header">
      <text class="results-title">💡 客户可能在问</text>
      <text class="results-close" @click="closeResults">×</text>
    </view>
    <view v-if="results.length > 0">
      <view
        v-for="item in results"
        :key="item.id"
        class="result-item"
        @click="onResultClick(item)"
      >
        <text class="result-icon">📋</text>
        <text class="result-name">{{ item.name }}</text>
        <text class="result-arrow">查看 →</text>
      </view>
      <view class="result-mentor" @click="goToMentor">
        <text class="mentor-icon">🤖</text>
        <text class="mentor-text">找导师分析</text>
        <text class="mentor-arrow">→</text>
      </view>
    </view>
    <view v-else class="results-empty">
      <text class="empty-text">没找到相关内容，问问导师？</text>
      <button class="empty-btn" @click="goToMentor">找导师</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { trackTriggerInputUse, trackTriggerMatchSuccess, trackTriggerToDetail } from '../utils/tracker'

const props = defineProps({
  placeholder: {
    type: String,
    default: '客户说了什么？如"房东不肯退我押金"',
  },
})

const emit = defineEmits(['match', 'nomatch'])

const inputText = ref('')
const showResults = ref(false)
const results = ref([])

// 加载 search_aliases 和 entries
let aliases = []
let entries = []
try {
  const aliasData = require('../data/search_aliases.json')
  aliases = aliasData?.aliases || aliasData || []
} catch {}
try {
  const entriesData = require('../data/entries.json')
  entries = entriesData?.entries || entriesData || []
} catch {}

// 简单分词（按空格+标点分割）
function segment(text) {
  return text
    .replace(/[,，。！？、；：""''（）()\[\]【】\s]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 0)
}

// 匹配逻辑
function triggerMatch(input) {
  const words = segment(input)
  const matches = []
  const seen = new Set()

  // 1. 精确匹配 alias
  words.forEach(word => {
    aliases.forEach(a => {
      const aliasText = a.alias || a.name || ''
      if (aliasText === word && !seen.has(a.entryId)) {
        const entry = entries.find(e => e.id === a.entryId)
        if (entry) {
          matches.push({ id: entry.id, name: entry.name, score: 100 })
          seen.add(a.entryId)
        }
      }
    })
  })

  // 2. 包含匹配 alias
  words.forEach(word => {
    aliases.forEach(a => {
      const aliasText = a.alias || a.name || ''
      if (aliasText.includes(word) && !seen.has(a.entryId)) {
        const entry = entries.find(e => e.id === a.entryId)
        if (entry) {
          matches.push({ id: entry.id, name: entry.name, score: 60 })
          seen.add(a.entryId)
        }
      }
    })
  })

  // 3. 直接匹配词条名
  entries.forEach(entry => {
    if (!seen.has(entry.id)) {
      const entryName = entry.name || ''
      if (words.some(w => entryName.includes(w))) {
        matches.push({ id: entry.id, name: entry.name, score: 40 })
        seen.add(entry.id)
      }
    }
  })

  // 去重+排序+取前 5
  return matches.sort((a, b) => b.score - a.score).slice(0, 5)
}

// 触发匹配
function onTrigger() {
  const input = inputText.value.trim()
  if (!input) return

  trackTriggerInputUse()

  const matched = triggerMatch(input)
  results.value = matched
  showResults.value = true

  if (matched.length > 0) {
    trackTriggerMatchSuccess(input, matched.length, matched[0].id)
    emit('match', matched)
  } else {
    emit('nomatch')
  }
}

// 输入框获得焦点
function onFocus() {
  trackTriggerInputUse()
}

// 点击匹配结果
function onResultClick(item) {
  trackTriggerToDetail(inputText.value, item.id, 'entry')
  uni.navigateTo({ url: `/pages/dict/entry-detail?entryId=${item.id}` })
  closeResults()
}

// 跳转导师
function goToMentor() {
  trackTriggerToDetail(inputText.value, '', 'mentor')
  uni.switchTab({ url: '/pages/mentor/index' })
  closeResults()
}

// 关闭结果
function closeResults() {
  showResults.value = false
}
</script>

<style scoped>
.trigger-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  margin: 24rpx;
  border: 3rpx solid #c46a3a;
  box-shadow: 0 2rpx 12rpx rgba(196, 106, 58, 0.08);
}

.trigger-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.trigger-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  height: 48rpx;
}

.trigger-placeholder {
  color: #bbb;
  font-size: 28rpx;
}

.trigger-arrow {
  color: #c46a3a;
  font-size: 36rpx;
  padding: 0 8rpx;
}

/* 匹配结果浮层 */
.trigger-results {
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0ede7;
}

.results-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #3d5a3e;
}

.results-close {
  font-size: 36rpx;
  color: #bbb;
  padding: 0 8rpx;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f7f4ef;
}

.result-item:active {
  background: #f7f4ef;
}

.result-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.result-name {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
}

.result-arrow {
  font-size: 24rpx;
  color: #c46a3a;
}

.result-mentor {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  margin-top: 8rpx;
}

.result-mentor:active {
  background: #f7f4ef;
}

.mentor-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.mentor-text {
  flex: 1;
  font-size: 28rpx;
  color: #3d5a3e;
  font-weight: 600;
}

.mentor-arrow {
  font-size: 24rpx;
  color: #3d5a3e;
}

.results-empty {
  text-align: center;
  padding: 24rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #7a8478;
  display: block;
  margin-bottom: 16rpx;
}

.empty-btn {
  background: #3d5a3e;
  color: #ffffff;
  border-radius: 999rpx;
  font-size: 26rpx;
  padding: 12rpx 40rpx;
}
</style>
