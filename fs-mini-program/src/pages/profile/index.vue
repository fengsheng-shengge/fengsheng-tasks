<template>
  <view class="page">
    <view class="header">
      <view class="title">我的</view>
    </view>

    <!-- 用户信息 -->
    <view class="user-card">
      <view class="avatar" @click="doLogin">
        <image v-if="user.avatar" :src="user.avatar" class="avatar-img" mode="aspectFill" />
        <view v-else class="avatar-default">{{ user.isLoggedIn ? '👤' : '登录' }}</view>
      </view>
      <view class="user-info">
        <view class="user-name">{{ user.nickname || (user.isLoggedIn ? '风声用户' : '未登录') }}</view>
        <view class="user-sub">{{ subscriptionText }}</view>
      </view>
    </view>

    <!-- 订阅状态 -->
    <view v-if="subscription" class="sub-card" @click="goSubscribe">
      <view class="sub-left">
        <view class="sub-badge">{{ subscription.type === 'yearly' ? '🏆 年度' : '🥇 月度' }}</view>
        <view class="sub-expire">有效期至：{{ subscription.expireAt || '永久' }}</view>
      </view>
      <view class="sub-arrow">管理 →</view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-item" v-for="item in menuItems" :key="item.key" @click="onMenuClick(item.key)">
        <view class="menu-icon">{{ item.icon }}</view>
        <view class="menu-text">{{ item.text }}</view>
        <view class="menu-arrow">→</view>
      </view>
    </view>

    <!-- 统计 -->
    <view class="stats-section">
      <view class="stats-title">我的数据</view>
      <view class="stats-grid">
        <view class="stat-item">
          <view class="stat-n">{{ stats.decodeCount || 0 }}</view>
          <view class="stat-l">解码次数</view>
        </view>
        <view class="stat-item">
          <view class="stat-n">{{ stats.assessCount || 0 }}</view>
          <view class="stat-l">测评次数</view>
        </view>
        <view class="stat-item">
          <view class="stat-n">{{ stats.days || 0 }}</view>
          <view class="stat-l">使用天数</view>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="user.isLoggedIn" class="logout-btn" @click="doLogout">退出登录</view>

    <view class="footer">
      <view class="footer-text">风声 · fengsheng.tech</view>
      <view class="footer-icp">京ICP备2026041809号</view>
      <view class="footer-ver">v1.0.0</view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import track from '../../utils/tracker'

export default {
  data() {
    return {
      stats: {},
      menuItems: [
        { key: 'knowledge', icon: '📚', text: '知识底座' },
        { key: 'feedback', icon: '💬', text: '意见反馈' },
        { key: 'about', icon: 'ℹ️', text: '关于风声' },
        { key: 'share', icon: '📤', text: '分享给同事' },
      ],
    }
  },
  computed: {
    user() {
      const store = useUserStore()
      return {
        isLoggedIn: store.isLoggedIn,
        nickname: store.nickname,
        avatar: store.avatar,
      }
    },
    subscription() {
      return useUserStore().subscription
    },
    subscriptionText() {
      if (!this.user.isLoggedIn) return '登录后解锁完整功能'
      if (this.subscription) return `${this.subscription.type === 'yearly' ? '年度' : '月度'}会员`
      return '免费用户 · 每日1次解码'
    },
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/profile/index')
    track.pageview({ page: '/pages/profile/index' })
    this.loadStats()
  },
  methods: {
    loadStats() {
      const decodeCount = uni.getStorageSync('fs_decode_count') || 0
      const assessCount = uni.getStorageSync('fs_assess_count') || 0
      const firstUse = uni.getStorageSync('fs_first_use')
      const days = firstUse ? Math.ceil((Date.now() - firstUse) / 86400000) : 0
      this.stats = { decodeCount, assessCount, days }
    },
    async doLogin() {
      if (this.user.isLoggedIn) return
      try {
        await useUserStore().login()
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    },
    doLogout() {
      uni.showModal({
        title: '确认退出',
        content: '退出后需要重新登录',
        success: (res) => {
          if (res.confirm) {
            useUserStore().logout()
            uni.showToast({ title: '已退出', icon: 'none' })
          }
        },
      })
    },
    onMenuClick(key) {
      track.click(`profile_menu_${key}`)
      switch (key) {
        case 'knowledge':
          uni.navigateTo({ url: '/pages/index/index' })
          break
        case 'feedback':
          uni.showModal({ title: '意见反馈', content: '请发送邮件至 feedback@fengsheng.tech', showCancel: false })
          break
        case 'about':
          uni.showModal({ title: '关于风声', content: '风声 · 居住服务AI工具\nfengsheng.tech\n让服务者先被看见', showCancel: false })
          break
        case 'share':
          uni.setClipboardData({ data: '风声助手小程序，居住服务从业者的AI工具' })
          break
      }
    },
    goSubscribe() {
      uni.switchTab({ url: '/pages/subscribe/index' })
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.header { padding: 30rpx 10rpx 20rpx; }
.title { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }

.user-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin: 10rpx; display: flex; align-items: center; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; overflow: hidden; margin-right: 24rpx; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-default { width: 100%; height: 100%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #3d5a3e; }
.user-info { flex: 1; }
.user-name { font-size: 34rpx; font-weight: 700; color: #222; }
.user-sub { font-size: 24rpx; color: #888; margin-top: 6rpx; }

.sub-card { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 16rpx; padding: 24rpx; margin: 12rpx 10rpx; display: flex; align-items: center; justify-content: space-between; }
.sub-left { flex: 1; }
.sub-badge { color: #fff; font-size: 30rpx; font-weight: 700; }
.sub-expire { color: rgba(255,255,255,0.8); font-size: 24rpx; margin-top: 6rpx; }
.sub-arrow { color: #fff; font-size: 26rpx; }

.menu-section { background: #fff; border-radius: 16rpx; margin: 12rpx 10rpx; overflow: hidden; }
.menu-item { display: flex; align-items: center; padding: 28rpx 24rpx; border-bottom: 1rpx solid #f5f5f5; }
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 40rpx; margin-right: 20rpx; }
.menu-text { flex: 1; font-size: 30rpx; color: #333; }
.menu-arrow { font-size: 28rpx; color: #ccc; }

.stats-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 12rpx 10rpx; }
.stats-title { font-size: 28rpx; font-weight: 700; color: #222; margin-bottom: 16rpx; }
.stats-grid { display: flex; justify-content: space-around; }
.stat-item { text-align: center; }
.stat-n { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }
.stat-l { font-size: 22rpx; color: #888; margin-top: 4rpx; }

.logout-btn { text-align: center; font-size: 28rpx; color: #e74c3c; padding: 24rpx; margin: 20rpx 10rpx; background: #fff; border-radius: 16rpx; }

.footer { text-align: center; padding: 30rpx; }
.footer-text { font-size: 24rpx; color: #aaa; }
.footer-icp { font-size: 22rpx; color: #bbb; margin-top: 6rpx; }
.footer-ver { font-size: 22rpx; color: #ccc; margin-top: 4rpx; }
</style>
