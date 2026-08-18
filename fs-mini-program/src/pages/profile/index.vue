<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="brand">风声<text class="brand-en">fengsheng</text></view>
      <view class="sub">{{ brokerName }} · 本地登录态</view>
    </view>

    <!-- 个人信息卡片 -->
    <view class="profile-header">
      <view class="avatar-wrap">
        <view class="avatar">{{ brokerInitial }}</view>
        <view class="level-badge">{{ points }} 分</view>
      </view>
      <view class="user-info">
        <view class="user-name">{{ brokerName }}</view>
        <view class="user-store">已服务 {{ serviceCount }} 次 · 目标 30 次</view>
      </view>
      <view class="profile-btn" @tap="goPage('/pages/profile/edit')">编辑资料</view>
    </view>

    <!-- 转发 / 复制 -->
    <view class="share-row">
      <button class="share-btn" open-type="share" style="border:none;outline:none">
        <view class="share-ic">📤</view>
        <view class="share-label">转发小程序卡片</view>
      </button>
      <view class="share-btn" @tap="copyMiniLink">
        <view class="share-ic">🔗</view>
        <view class="share-label">复制小程序链接</view>
      </view>
    </view>

    <!-- 业务功能菜单 -->
    <view class="menu-section">
      <view class="menu-title">业务中心</view>
      <view class="menu-list">
        <view class="menu-item" @tap="go('clients')">
          <view class="menu-icon" style="background:var(--green-bg)">👥</view>
          <view class="menu-info"><view class="menu-name">客户档案（{{ clientCount }} 位）</view></view>
          <view class="menu-arrow">›</view>
        </view>
        <view class="menu-item" @tap="go('cases')">
          <view class="menu-icon" style="background:var(--orange-bg)">⭐</view>
          <view class="menu-info"><view class="menu-name">案例灵感库</view></view>
          <view class="menu-arrow">›</view>
        </view>
        <view class="menu-item" @tap="go('curate')">
          <view class="menu-icon" style="background:var(--gold-bg)">💡</view>
          <view class="menu-info"><view class="menu-name">我的策展库</view></view>
          <view class="menu-arrow">›</view>
        </view>
        <view class="menu-item" @tap="goPage('/pages/profile/career')">
          <view class="menu-icon" style="background:var(--blue-bg)">🏅</view>
          <view class="menu-info"><view class="menu-name">职业档案</view></view>
          <view class="menu-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 系统功能菜单 -->
    <view class="menu-section">
      <view class="menu-title">系统设置</view>
      <view class="menu-list">
        <view class="menu-item" @tap="openPrivacy">
          <view class="menu-icon" style="background:var(--cream-dark)">🔒</view>
          <view class="menu-info"><view class="menu-name">隐私政策</view></view>
          <view class="menu-arrow">›</view>
        </view>
        <view class="menu-item" @tap="goPage('/pages/profile/data')">
          <view class="menu-icon" style="background:var(--cream-dark)">📦</view>
          <view class="menu-info"><view class="menu-name">数据导出 / 迁移</view></view>
          <view class="menu-arrow">›</view>
        </view>
        <view class="menu-item" @tap="goPage('/pages/profile/about')">
          <view class="menu-icon" style="background:var(--cream-dark)">ⓘ</view>
          <view class="menu-info"><view class="menu-name">关于风声</view></view>
          <view class="menu-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 数据说明 -->
    <view class="privacy-notice">
      <view class="notice-icon">⚠️</view>
      <view class="notice-text">客户数据仅你可见，平台不收取、不用于撮合<br/>帮助服务者用独立价值获得尊重</view>
    </view>

    <!-- 版本号 -->
    <view class="version-block">
      <view class="version-info">风声 v{{ appVersion }}</view>
      <view class="version-tip" v-if="false">若此版本号不是 v{{ appVersion }}，说明手机仍是旧包，请重新上传最新 zip</view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { copyLink, APP_SHARE_TITLE, APP_VERSION } from '../../utils/share.js'
import { trackPageview } from '../../utils/tracker'
export default {
  computed: {
    userStore() { return useUserStore() },
    appVersion() { return APP_VERSION },
    brokerName() { return this.userStore.nickname || '风声用户' },
    brokerInitial() { return (this.userStore.nickname || '风')[0] || '风' },
    points() { return this.userStore.points || 0 },
    clientCount() { return (this.userStore.clients || []).length },
    serviceCount() {
      const u = this.userStore
      const realClients = (u.clients || []).filter(c => !c.seed).length
      return (u.curatings ? u.curatings.length : 0)
           + realClients
           + (u.assessments ? u.assessments.length : 0)
           + (u.shares || 0)
    }
  },
  onShow() { trackPageview('profile') },
  methods: {
    go(tab) {
      if (['cases', 'clients'].includes(tab)) uni.navigateTo({ url: '/pages/' + tab + '/index' })
      else uni.switchTab({ url: '/pages/' + tab + '/index' })
    },
    goPage(url) { uni.navigateTo({ url }) },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) },
    openPrivacy() { uni.navigateTo({ url: '/pages/privacy/index' }) },
    copyMiniLink() {
      copyLink('/pages/assess/index', '小程序链接已复制 · 打开微信即可跳转')
    }
  },
  onShareAppMessage() {
    return { title: APP_SHARE_TITLE, path: '/pages/assess/index' }
  },
  onShareTimeline() {
    return { title: APP_SHARE_TITLE }
  }
}
</script>
