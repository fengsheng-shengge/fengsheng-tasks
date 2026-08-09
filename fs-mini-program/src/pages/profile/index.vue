<template>
  <view class="page">
    <view class="profile-header">
      <view class="profile-avatar">{{ brokerInitial }}</view>
      <view><view class="profile-name">{{ brokerName }}</view><view class="profile-tag">本地登录态 · 数据存你手机</view></view>
    </view>

    <view class="trust-card">
      <view class="tc-top">
        <view><view class="tc-num">{{ points }}<text class="unit">分</text></view><view class="tc-goal">信任积分 · 本月已服务 {{ serviceCount }} 次 / 目标 30 次</view></view>
        <view style="font-size:30px">⭐</view>
      </view>
      <view class="tc-bar"><view class="tc-fill" :style="{ width: fillPct + '%' }"></view></view>
      <view class="tc-rule">做真实服务才得分：见面策展 / 客户档案 / 品质测评 / 登录 · 记录你的专业成长</view>
    </view>

    <view class="phase-banner">🟢 <text style="font-weight:700">免费体验期</text>：当前所有功能免费可用，专注做好每一次客户见面。</view>

    <view class="share-app-box">
      <view class="sab-title">📤 把风声分享给同行 / 客户</view>
      <view class="sab-desc">微信内转发小程序卡片；或复制链接，在微信聊天框粘贴即可打开小程序。</view>
      <view class="sab-btns">
        <button class="btn-light" open-type="share">转发小程序卡片</button>
        <button class="btn-light" @tap="copyMiniLink">复制小程序链接</button>
      </view>
    </view>

    <view class="menu-group">
      <view class="menu-item" @tap="go('clients')"><view class="menu-icon">👥</view><view class="menu-text">客户档案（{{ clientCount }} 位）</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="go('cases')"><view class="menu-icon">🌟</view><view class="menu-text">案例灵感库</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="go('curate')"><view class="menu-icon">💡</view><view class="menu-text">我的策展库</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="toast('职业档案 · 后续版本开放')"><view class="menu-icon">🎖️</view><view class="menu-text">职业档案</view><view class="menu-arrow">›</view></view>
    </view>
    <view class="menu-group">
      <view class="menu-item" @tap="openPrivacy"><view class="menu-icon">🔒</view><view class="menu-text">隐私政策</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="toast('数据导出 / 迁移 · 后续版本开放')"><view class="menu-icon">📦</view><view class="menu-text">数据导出 / 迁移</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="toast('关于风声 · 后续版本开放')"><view class="menu-icon">ℹ️</view><view class="menu-text">关于风声</view><view class="menu-arrow">›</view></view>
    </view>
    <view class="icp">⚠️ 客户数据仅你可见，平台不收取、不用于撮合<view>帮助服务者用独立价值获得尊重</view></view>
    <view class="ver">风声 v{{ appVersion }}<view class="ver-tip">若此版本号不是 v{{ appVersion }}，说明手机仍是旧包，请重新上传最新 zip</view></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { copyLink, APP_SHARE_TITLE, APP_VERSION } from '../../utils/share.js'
export default {
  computed: {
    userStore() { return useUserStore() },
    appVersion() { return APP_VERSION },
    brokerName() { return this.userStore.nickname || '风声用户' },
    brokerInitial() { return (this.userStore.nickname || '风')[0] || '风' },
    points() { return this.userStore.points || 0 },
    clientCount() { return (this.userStore.clients || []).length },
    // 真实服务动作数：由用户真实产品路径累计，不送假数据（seed 示例客户不计入，登录不计入服务次数）
    serviceCount() {
      const u = this.userStore
      const realClients = (u.clients || []).filter(c => !c.seed).length
      return (u.curatings ? u.curatings.length : 0)
           + realClients
           + (u.assessments ? u.assessments.length : 0)
           + (u.shares || 0)
    },
    fillPct() { return Math.min(100, Math.round((this.serviceCount / 30) * 100)) }
  },
  methods: {
    go(tab) {
      // 客户档案、案例灵感库已移出 tabBar → navigateTo；其余 tab → switchTab
      if (['cases', 'clients'].includes(tab)) uni.navigateTo({ url: '/pages/' + tab + '/index' })
      else uni.switchTab({ url: '/pages/' + tab + '/index' })
    },
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

<style scoped>
.share-app-box { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 14px; margin: 12px 0; }
.sab-title { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.sab-desc { font-size: 12px; color: #888; margin: 6px 0 10px; line-height: 1.5; }
.sab-btns { display: flex; gap: 10px; }
.sab-btns .btn-light { flex: 1; background: #f7f4ef; color: #3d5a3e; border: 1px solid #e7e0d4; border-radius: 10px; padding: 10px; font-size: 13px; }
.ver { text-align: center; color: #b0a99e; font-size: 12px; margin-top: 18px; line-height: 1.6; }
.ver-tip { font-size: 10.5px; color: #c0b8ac; margin-top: 2px; }

</style>
