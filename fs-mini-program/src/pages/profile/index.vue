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
      <view class="tc-rule">做真实服务才得分：见面策展 / 客户档案 / 品质测评 / 登录 · 攒分可解锁案例库</view>
    </view>

    <view class="phase-banner">🟢 <text style="font-weight:700">免费养成期</text>：核心功能全部免费，<text style="font-weight:700">不收费</text>。更多增值能力打磨中，敬请期待。</view>

    <view class="coming-soon-card">
      <view class="cs-icon">⏳</view>
      <view class="cs-title">会员功能即将上线 · 敬请期待</view>
      <view class="cs-desc">为保障每位经纪人都能用上"专业工具夹"，我们正在打磨更多增值能力，<text style="font-weight:700">首批上线前不会收取任何费用</text>。</view>
      <view class="cs-tags">
        <view class="cs-tag">信任徽章</view>
        <view class="cs-tag">数据导出</view>
        <view class="cs-tag">案例全文</view>
        <view class="cs-tag">专属客服</view>
      </view>
      <view class="cs-foot">当前阶段：所有功能「做任务得积分」即可兑换，养成期每月还赠体验金。</view>
    </view>

    <view class="invite-box">
      <view class="ib-title">🌟 邀请同行 · 邀请有礼功能后续开放</view>
      <view class="ib-code"><text>我的邀请码</text><text style="letter-spacing:2px;font-size:16px;font-weight:700">FS-WJX-8829</text></view>
      <view class="ib-reward">邀请有礼功能后续开放 · 当前仅展示邀请码</view>
      <button class="btn-light" @tap="copyInvite">复制邀请码</button>
    </view>

    <view class="share-app-box">
      <view class="sab-title">📤 把风声分享给同行 / 客户</view>
      <view class="sab-desc">微信内转发小程序卡片；或复制链接发到微信外（短信 / 邮件都能打开）。</view>
      <view class="sab-btns">
        <button class="btn-light" open-type="share">转发小程序卡片</button>
        <button class="btn-light" @tap="copyMiniLink">复制小程序链接</button>
      </view>
    </view>

    <view class="menu-group">
      <view class="menu-item" @tap="go('clients')"><view class="menu-icon">👥</view><view class="menu-text">客户档案</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="go('cases')"><view class="menu-icon">🌟</view><view class="menu-text">案例灵感库 · 信任积分</view><view class="menu-badge">{{ points }}</view></view>
      <view class="menu-item" @tap="go('curate')"><view class="menu-icon">💡</view><view class="menu-text">我的策展库</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="toast('职业档案（模拟）')"><view class="menu-icon">🎖️</view><view class="menu-text">职业档案</view><view class="menu-arrow">›</view></view>
    </view>
    <view class="menu-group">
      <view class="menu-item" @tap="toast('数据导出/迁移（模拟）')"><view class="menu-icon">📦</view><view class="menu-text">数据导出 / 迁移</view><view class="menu-arrow">›</view></view>
      <view class="menu-item" @tap="toast('关于风声（模拟）')"><view class="menu-icon">ℹ️</view><view class="menu-text">关于风声</view><view class="menu-arrow">›</view></view>
    </view>
    <view class="icp">⚠️ 客户数据仅你可见，平台不收取、不用于撮合<view>帮助服务者用独立价值获得尊重</view></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { copyLink, APP_SHARE_TITLE } from '../../utils/share.js'
export default {
  computed: {
    userStore() { return useUserStore() },
    brokerName() { return this.userStore.nickname || '风声用户' },
    brokerInitial() { return (this.userStore.nickname || '风')[0] || '风' },
    points() { return this.userStore.points || 0 },
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
      if (tab === 'clients') uni.navigateTo({ url: '/pages/clients/index' })
      else uni.switchTab({ url: '/pages/' + tab + '/index' })
    },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) },
    copyInvite() {
      uni.setClipboardData({
        data: 'FS-WJX-8829',
        success: () => uni.showToast({ title: '邀请码已复制 · 邀请有礼功能后续开放', icon: 'none' })
      })
    },
    copyMiniLink() {
      copyLink('/pages/home/index', '小程序链接已复制 · 微信外也能打开')
    }
  },
  onShareAppMessage() {
    return { title: APP_SHARE_TITLE, path: '/pages/home/index' }
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

/* 功能预告占位卡（替代原会员方案+积分直购） */
.coming-soon-card {
  background: linear-gradient(180deg, #f7f4ef 0%, #f0ebe0 100%);
  border: 1px dashed #c8b89a;
  border-radius: 12px;
  padding: 18px 14px 14px;
  margin: 10px 0 14px;
  text-align: center;
}
.cs-icon { font-size: 28px; line-height: 1; margin-bottom: 6px; }
.cs-title { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.cs-desc { font-size: 12px; color: #5a554c; line-height: 1.6; padding: 0 4px; }
.cs-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 10px 0 8px; }
.cs-tag { font-size: 11px; color: #3d5a3e; background: #fff; border: 1px solid #c8b89a; border-radius: 999px; padding: 3px 10px; }
.cs-foot { font-size: 11px; color: #888; line-height: 1.5; margin-top: 4px; }
</style>
