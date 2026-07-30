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

    <!-- 顶部 banner：墨绿渐变，告知升级中 -->
    <view class="upgrade-banner">
      <view class="ub-text">🎉 会员体系全新升级中，开放时间第一时间通知你</view>
    </view>

    <!-- 章节标题 -->
    <view class="sec-title">⏳ 功能预告</view>

    <!-- 预告卡 1：经纪人认证徽章（绿色图标底） -->
    <view class="preview-card">
      <view class="preview-icon green">🏆</view>
      <view class="preview-content">
        <view class="preview-title">经纪人认证徽章</view>
        <view class="preview-desc">完成认证即可在个人页展示专业徽章，提升客户信任</view>
        <view class="preview-tag">即将上线</view>
      </view>
    </view>

    <!-- 预告卡 2：进阶课程包（棕色图标底） -->
    <view class="preview-card">
      <view class="preview-icon brown">📚</view>
      <view class="preview-content">
        <view class="preview-title">进阶课程包</view>
        <view class="preview-desc">80+ 套谈判/带看/签约场景话术模板</view>
        <view class="preview-tag">即将上线</view>
      </view>
    </view>

    <!-- 预告卡 3：专属任务模板（橙色图标底） -->
    <view class="preview-card">
      <view class="preview-icon orange">🎁</view>
      <view class="preview-content">
        <view class="preview-title">专属任务模板</view>
        <view class="preview-desc">7 大场景任务包，新人 7 天上手</view>
        <view class="preview-tag">即将上线</view>
      </view>
    </view>

    <!-- CTA 按钮：墨绿圆角 999 -->
    <view class="cta-area">
      <button class="btn-green" @tap="notifyOpen">🔔 通知我开放</button>
      <view class="cta-tip">开放后通过站内信通知你</view>
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
    },
    notifyOpen() {
      uni.showToast({ title: '已订阅通知 · 开放后第一时间告诉你', icon: 'success' })
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

/* ========== 升级中 banner + 功能预告卡（VI 一致版 7.30） ========== */
.upgrade-banner {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%);
  color: #fff;
  padding: 14px 16px;
  border-radius: 12px;
  margin: 12px 0 14px;
  box-shadow: 0 4px 16px rgba(61, 90, 62, 0.10);
}
.ub-text { font-size: 14px; line-height: 1.4; font-weight: 500; }

.sec-title { font-size: 17px; font-weight: 700; color: #2b2b28; display: flex; align-items: center; gap: 6px; margin: 4px 0 12px; padding: 0 2px; }
.sec-title::before { content: ''; width: 4px; height: 16px; background: #3d5a3e; border-radius: 2px; }

.preview-card {
  background: #fff;
  border: 1px solid #f7f4ef;
  border-radius: 16px;
  padding: 16px 14px;
  margin: 0 0 12px;
  display: flex;
  align-items: flex-start;
  box-shadow: 0 2px 8px rgba(61, 90, 62, 0.05);
}
.preview-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-right: 12px;
  flex-shrink: 0;
}
.preview-icon.green { background: #eef3ec; }
.preview-icon.brown { background: #F5E8DC; }
.preview-icon.orange { background: #fbeee6; }
.preview-content { flex: 1; min-width: 0; }
.preview-title { font-size: 15px; font-weight: 600; color: #2b2b28; margin-bottom: 4px; }
.preview-desc { font-size: 12px; color: #8a837a; line-height: 1.55; }
.preview-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 8px;
  background: #eef3ec;
  color: #3d5a3e;
}

.cta-area { padding: 8px 0 4px; }
.cta-area .btn-green {
  width: 100%;
  background: #3d5a3e;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
}
.cta-tip { text-align: center; font-size: 12px; color: #8a837a; margin-top: 10px; }
</style>
