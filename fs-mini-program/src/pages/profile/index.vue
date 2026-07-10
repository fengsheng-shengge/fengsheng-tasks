<template>
  <view class="page">
    <view class="header">
      <view class="title">我的</view>
    </view>

    <!-- 用户信息 -->
    <view class="user-card">
      <view class="avatar">
        <view class="avatar-default">👤</view>
      </view>
      <view class="user-info">
        <view class="user-name">风声用户</view>
        <view class="user-sub">居住服务从业者</view>
      </view>
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
          <view class="stat-n">{{ stats.days || 0 }}</view>
          <view class="stat-l">使用天数</view>
        </view>
      </view>
    </view>

    <view class="footer">
      <view class="footer-links">
        <text class="footer-link" @click="openPrivacy">隐私政策</text>
        <text class="footer-link-divider">|</text>
        <text class="footer-link" @click="openAgreement">用户协议</text>
      </view>
      <view class="footer-text">风声 · fengsheng.tech</view>
      <view class="footer-icp">京ICP备2026041809号</view>
      <view class="footer-ver">v1.1.0</view>
    </view>
  </view>
</template>

<script>
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
  onShow() {
    uni.setStorageSync('__current_page', '/pages/profile/index')
    track.pageview({ page: '/pages/profile/index' })
    this.loadStats()
  },
  methods: {
    loadStats() {
      const firstUse = uni.getStorageSync('fs_first_use')
      const days = firstUse ? Math.ceil((Date.now() - firstUse) / 86400000) : 0
      this.stats = { days }
    },
    onMenuClick(key) {
      track.click(`profile_menu_${key}`)
      switch (key) {
        case 'knowledge':
          uni.navigateTo({
            url: '/pages/webview/index?url=' + encodeURIComponent('https://fengsheng.tech/knowledge')
          })
          break
        case 'feedback':
          uni.showModal({ title: '意见反馈', content: '请发送邮件至 feedback@fengsheng.tech', showCancel: false })
          break
        case 'about':
          uni.showModal({ title: '关于风声', content: '风声 · 居住服务工具\nfengsheng.tech\n让服务者先被看见', showCancel: false })
          break
        case 'share':
          uni.setClipboardData({ data: '风声助手小程序，居住服务从业者的专属工具' })
          break
      }
    },
    openPrivacy() {
      uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent('https://fengsheng.tech/privacy.html') })
    },
    openAgreement() {
      uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent('https://fengsheng.tech/agreement.html') })
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
.avatar-default { width: 100%; height: 100%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #3d5a3e; }
.user-info { flex: 1; }
.user-name { font-size: 34rpx; font-weight: 700; color: #222; }
.user-sub { font-size: 24rpx; color: #888; margin-top: 6rpx; }

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

.footer { text-align: center; padding: 30rpx; }
.footer-links { margin-bottom: 12rpx; }
.footer-link { font-size: 24rpx; color: #3d5a3e; }
.footer-link-divider { font-size: 24rpx; color: #ddd; margin: 0 16rpx; }
.footer-text { font-size: 24rpx; color: #aaa; }
.footer-icp { font-size: 22rpx; color: #bbb; margin-top: 6rpx; }
.footer-ver { font-size: 22rpx; color: #ccc; margin-top: 4rpx; }
</style>
