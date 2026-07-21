<template>
  <view class="page">
    <!-- 用户卡片 -->
    <view class="user-card">
      <view class="user-card-bg"></view>
      <view class="user-card-content">
        <image class="user-avatar" :src="avatarUrl" mode="aspectFill" />
        <view class="user-info">
          <view class="user-name">{{ nickName || '未登录' }}</view>
          <view class="user-level">
            <view class="level-badge" :style="{ background: levelColor }">
              Lv{{ level }} {{ levelName }}
            </view>
          </view>
        </view>
        <view class="user-arrow" @click="goToProfile">
          <text class="arrow-icon">&#8250;</text>
        </view>
      </view>
    </view>

    <!-- 积分显示 -->
    <view class="points-card" @click="goToPoints">
      <view class="points-header">
        <view class="points-label">当前积分</view>
        <view class="points-more">查看详情 &#8250;</view>
      </view>
      <view class="points-value">{{ points }}</view>
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

    <!-- 菜单列表 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToPoints">
        <view class="menu-icon points-icon">&#9733;</view>
        <view class="menu-text">积分中心</view>
        <view class="menu-arrow">&#8250;</view>
      </view>
      <view class="menu-item" @click="goToContributions">
        <view class="menu-icon contrib-icon">&#9998;</view>
        <view class="menu-text">我的贡献</view>
        <view class="menu-arrow">&#8250;</view>
      </view>
      <view class="menu-item" @click="goToFavorites">
        <view class="menu-icon fav-icon">&#9829;</view>
        <view class="menu-text">我的收藏</view>
        <view class="menu-badge" v-if="favoriteCount > 0">{{ favoriteCount }}</view>
        <view class="menu-arrow">&#8250;</view>
      </view>
      <view class="menu-item" @click="goToSubscribe">
        <view class="menu-icon sub-icon">&#9830;</view>
        <view class="menu-text">订阅管理</view>
        <view class="menu-tag" v-if="subscriptionType">{{ subscriptionTypeText }}</view>
        <view class="menu-arrow">&#8250;</view>
      </view>
      <view class="menu-item" @click="goToAbout">
        <view class="menu-icon about-icon">&#9432;</view>
        <view class="menu-text">关于我们</view>
        <view class="menu-arrow">&#8250;</view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section">
      <view class="logout-btn" @click="handleLogout">退出登录</view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-version">version v1.0.0</text>
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

// 用户信息
const nickName = computed(() => userStore.nickname || '风声用户')
const avatarUrl = computed(() => userStore.avatar || '/static/default-avatar.png')
const level = computed(() => userStore.level || 1)
const levelName = computed(() => userStore.levelName || '见习经纪')
const points = computed(() => userStore.points || 0)
const subscriptionType = computed(() => userStore.subscription?.type || null)
const subscriptionTypeText = computed(() => {
  const map = { monthly: '月费', yearly: '年费' }
  return map[subscriptionType.value] || ''
})
const favoriteCount = ref(0)

// 等级配置
const levelConfig = [
  { level: 1, name: '见习经纪', min: 0, max: 99, color: '#b0b0b0' },
  { level: 2, name: '专业经纪', min: 100, max: 499, color: '#3d5a3e' },
  { level: 3, name: '资深经纪', min: 500, max: 1499, color: '#c46a3a' },
  { level: 4, name: '王牌经纪', min: 1500, max: 4999, color: '#d4a017' },
  { level: 5, name: '传奇经纪', min: 5000, max: 99999, color: '#8b00ff' },
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

const levelColor = computed(() => currentLevelConfig.value.color)

onMounted(() => {
  // 读取收藏数量
  const favs = uni.getStorageSync('fs_favorites') || []
  favoriteCount.value = favs.length
})

// 导航
function goToPoints() {
  uni.navigateTo({ url: '/pages/me/points' })
}

function goToContributions() {
  uni.navigateTo({ url: '/pages/me/contributions' })
}

function goToFavorites() {
  const favs = uni.getStorageSync('fs_favorites') || []
  if (favs.length === 0) {
    uni.showToast({ title: '暂无收藏', icon: 'none' })
    return
  }
  uni.showToast({ title: `已收藏 ${favs.length} 个词条`, icon: 'none' })
}

function goToSubscribe() {
  uni.navigateTo({ url: '/pages/pay/index' })
}

function goToAbout() {
  uni.showModal({
    title: '关于风声',
    content: '风声——居住服务行业知识库。\n\n8域122词条，覆盖交易流程、服务规范、行业标准等核心知识领域。\n\n让服务者用独立价值赢得尊重。',
    showCancel: false,
    confirmText: '知道了',
  })
}

function goToProfile() {
  uni.showToast({ title: '个人资料编辑功能开发中', icon: 'none' })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出登录后将返回登录页面',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 用户卡片 */
.user-card {
  margin: 20rpx 20rpx 0;
  border-radius: 24rpx;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.user-card-bg {
  height: 100rpx;
  background: linear-gradient(135deg, #3d5a3e 0%, #5a7d5b 100%);
}
.user-card-content {
  display: flex;
  align-items: center;
  padding: 0 24rpx 28rpx;
  margin-top: -40rpx;
}
.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  border: 4rpx solid #fff;
  background: #e0e0e0;
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  margin-left: 20rpx;
  padding-top: 40rpx;
}
.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
}
.user-level {
  margin-top: 8rpx;
}
.level-badge {
  display: inline-block;
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.user-arrow {
  padding-top: 40rpx;
  padding-left: 10rpx;
}
.arrow-icon {
  font-size: 36rpx;
  color: #bbb;
}

/* 积分卡片 */
.points-card {
  margin: 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.points-label {
  font-size: 26rpx;
  color: #888;
}
.points-more {
  font-size: 24rpx;
  color: #c46a3a;
}
.points-value {
  font-size: 64rpx;
  font-weight: 900;
  color: #3d5a3e;
  margin-top: 8rpx;
}
.progress-wrap {
  margin-top: 20rpx;
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

/* 菜单 */
.menu-section {
  margin: 0 20rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.points-icon {
  background: #fff3e0;
  color: #c46a3a;
}
.contrib-icon {
  background: #e8f5e9;
  color: #3d5a3e;
}
.fav-icon {
  background: #fce4ec;
  color: #e91e63;
}
.sub-icon {
  background: #e3f2fd;
  color: #1976d2;
}
.about-icon {
  background: #f3e5f5;
  color: #7b1fa2;
}
.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}
.menu-badge {
  background: #e91e63;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  margin-right: 12rpx;
}
.menu-tag {
  background: #e8f5e9;
  color: #3d5a3e;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-right: 12rpx;
}
.menu-arrow {
  font-size: 28rpx;
  color: #ccc;
}

/* 退出登录 */
.logout-section {
  margin: 40rpx 20rpx 0;
}
.logout-btn {
  text-align: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  font-size: 30rpx;
  color: #e74c3c;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

/* 底部 */
.footer {
  text-align: center;
  padding: 40rpx 20rpx 20rpx;
}
.footer-version {
  display: block;
  font-size: 22rpx;
  color: #bbb;
}
.footer-icp {
  display: block;
  font-size: 20rpx;
  color: #bbb;
  margin-top: 6rpx;
}
</style>