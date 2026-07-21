<template>
  <view class="page">
    <!-- 积分头部 -->
    <view class="points-header">
      <view class="header-bg"></view>
      <view class="header-content">
        <view class="header-label">当前积分</view>
        <view class="header-value">{{ points }}</view>
        <view class="progress-wrap">
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
          <view class="progress-text">
            <text class="progress-current">{{ points }}/{{ nextLevelPoints }}</text>
            <text class="progress-next">升至 Lv{{ nextLevel }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 赚积分 -->
    <view class="section">
      <view class="section-title">
        <view class="title-icon earn-icon">&#9650;</view>
        <text>赚积分</text>
      </view>
      <view class="rule-list">
        <view class="rule-item" v-for="item in earnRules" :key="item.name">
          <view class="rule-left">
            <view class="rule-name">{{ item.name }}</view>
            <view class="rule-limit">{{ item.limit }}</view>
          </view>
          <view class="rule-points">+{{ item.points }}</view>
        </view>
      </view>
    </view>

    <!-- 花积分 -->
    <view class="section">
      <view class="section-title">
        <view class="title-icon spend-icon">&#9660;</view>
        <text>积分消耗</text>
      </view>
      <view class="rule-list">
        <view class="rule-item" v-for="item in spendRules" :key="item.name">
          <view class="rule-left">
            <view class="rule-name">{{ item.name }}</view>
          </view>
          <view class="rule-points spend">-{{ item.points }}</view>
        </view>
      </view>
    </view>

    <!-- 积分历史 -->
    <view class="section">
      <view class="section-title">
        <view class="title-icon history-icon">&#9776;</view>
        <text>积分记录</text>
      </view>
      <view class="history-list" v-if="pointsHistory.length > 0">
        <view class="history-item" v-for="(item, idx) in pointsHistory" :key="idx">
          <view class="history-left">
            <view class="history-reason">{{ item.reason }}</view>
            <view class="history-time">{{ item.time }}</view>
          </view>
          <view :class="['history-amount', item.amount > 0 ? 'amount-plus' : 'amount-minus']">
            {{ item.amount > 0 ? '+' + item.amount : item.amount }}
          </view>
        </view>
      </view>
      <view class="history-empty" v-else>
        <text>暂无积分记录</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

const points = computed(() => userStore.points || 0)
const level = computed(() => userStore.level || 1)

const levelConfig = [
  { level: 1, name: '见习经纪', min: 0, max: 99 },
  { level: 2, name: '专业经纪', min: 100, max: 499 },
  { level: 3, name: '资深经纪', min: 500, max: 1499 },
  { level: 4, name: '王牌经纪', min: 1500, max: 4999 },
  { level: 5, name: '传奇经纪', min: 5000, max: 99999 },
]

const currentLevelConfig = computed(() => {
  const lv = level.value
  return levelConfig.find(c => c.level === lv) || levelConfig[0]
})

const nextLevel = computed(() => {
  const lv = level.value
  const next = levelConfig.find(c => c.level === lv + 1)
  return next ? next.level : lv
})

const nextLevelPoints = computed(() => {
  const lv = level.value
  const next = levelConfig.find(c => c.level === lv + 1)
  return next ? next.min : 99999
})

const progressPercent = computed(() => {
  const cfg = currentLevelConfig.value
  if (cfg.max === 99999) return 100
  const range = cfg.max - cfg.min
  const current = points.value - cfg.min
  return Math.min(100, Math.max(0, Math.floor((current / range) * 100)))
})

// 赚积分规则
const earnRules = [
  { name: '每日一题答对', points: 5, limit: '每日1次' },
  { name: '客户模拟器通关', points: 15, limit: '每日1次' },
  { name: '法官来了答对', points: 10, limit: '每日3次' },
  { name: '纠错采纳', points: 20, limit: '无限制' },
  { name: '验证有效', points: 10, limit: '无限制' },
  { name: '提问入库', points: 10, limit: '无限制' },
  { name: '分享词条', points: 5, limit: '每条1次' },
]

// 积分消耗规则
const spendRules = [
  { name: '解锁完整案例', points: 5 },
  { name: '解锁经纪人备忘', points: 3 },
  { name: '解锁政策原文', points: 5 },
  { name: '免费月卡兑换', points: 2000 },
]

// 积分历史
const pointsHistory = computed(() => userStore.pointsHistory || [])
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 积分头部 */
.points-header {
  margin: 20rpx 20rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.header-bg {
  height: 80rpx;
  background: linear-gradient(135deg, #3d5a3e 0%, #5a7d5b 100%);
}
.header-content {
  padding: 28rpx 28rpx 24rpx;
  margin-top: -30rpx;
}
.header-label {
  font-size: 26rpx;
  color: #888;
}
.header-value {
  font-size: 80rpx;
  font-weight: 900;
  color: #3d5a3e;
  line-height: 1;
  margin-top: 8rpx;
}
.progress-wrap {
  margin-top: 24rpx;
}
.progress-bar {
  height: 10rpx;
  background: #e8e8e8;
  border-radius: 5rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3d5a3e, #c46a3a);
  border-radius: 5rpx;
  transition: width 0.3s ease;
}
.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #aaa;
}
.progress-next {
  color: #c46a3a;
}

/* 分区 */
.section {
  margin: 0 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.section-title {
  display: flex;
  align-items: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}
.title-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  margin-right: 12rpx;
}
.earn-icon {
  background: #e8f5e9;
  color: #3d5a3e;
}
.spend-icon {
  background: #fff3e0;
  color: #c46a3a;
}
.history-icon {
  background: #e3f2fd;
  color: #1976d2;
}

/* 规则列表 */
.rule-list {
  border-top: 1rpx solid #f0f0f0;
}
.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.rule-item:last-child {
  border-bottom: none;
}
.rule-left {
  flex: 1;
}
.rule-name {
  font-size: 28rpx;
  color: #333;
}
.rule-limit {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 4rpx;
}
.rule-points {
  font-size: 30rpx;
  font-weight: 700;
  color: #3d5a3e;
}
.rule-points.spend {
  color: #c46a3a;
}

/* 积分记录 */
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.history-item:last-child {
  border-bottom: none;
}
.history-left {
  flex: 1;
}
.history-reason {
  font-size: 28rpx;
  color: #333;
}
.history-time {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 4rpx;
}
.history-amount {
  font-size: 30rpx;
  font-weight: 700;
}
.amount-plus {
  color: #3d5a3e;
}
.amount-minus {
  color: #c46a3a;
}
.history-empty {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #bbb;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 20rpx;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>