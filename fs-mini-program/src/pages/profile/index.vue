<template>
  <view class="page">
    <view class="profile-header" @tap="editNickname">
      <view class="profile-avatar">{{ brokerInitial }}</view>
      <view class="ph-text">
        <view class="profile-name">{{ brokerName }}</view>
        <view class="profile-tag">本地昵称 · 数据存你手机</view>
        <view class="ph-edit">点击设置昵称 ›</view>
      </view>
    </view>

    <view class="trust-card">
      <view class="tc-top">
        <view><view class="tc-num">{{ points }}<text class="unit">分</text></view><view class="tc-goal">信任积分 · 本月已服务 {{ serviceCount }} 次 / 目标 30 次</view></view>
        <view style="font-size:30px">⭐</view>
      </view>
      <view class="tc-bar"><view class="tc-fill" :style="{ width: fillPct + '%' }"></view></view>
      <view class="tc-rule">做真实服务才得分：见面策展 / 客户档案 / 品质测评 / 登录 · 攒分可解锁案例库</view>
    </view>

    <view class="phase-banner">🟢 <text style="font-weight:700">免费养成期</text>：现仅用「积分」，<text style="font-weight:700">不收费</text>。会员/积分直购将在后续版本开放。</view>

    <view class="section-title-sm">会员方案 · 积分是硬通货</view>
    <view class="vip-grid">
      <view class="vip-card hot"><view class="vc-tag">当前</view><view class="vc-name">免费版</view><view class="vc-price">¥0</view><view class="vc-pts">日活+任务得积分</view><view class="vc-perk">基础功能 · 案例看摘要</view></view>
      <view class="vip-card locked"><view class="vc-tag">后续版本</view><view class="vc-name">月度会员</view><view class="vc-price">价格待定<text class="unit"></text></view><view class="vc-pts">每月积分自动到账</view><view class="vc-perk">信任徽章 · 数据导出 · 案例全文</view><view class="vc-lock">后续版本开放</view></view>
      <view class="vip-card locked"><view class="vc-tag">后续版本</view><view class="vc-name">年度会员</view><view class="vc-price">价格待定<text class="unit"></text></view><view class="vc-pts">年度积分(含赠送)</view><view class="vc-perk">优先新案例 · 专属客服</view><view class="vc-lock">后续版本开放</view></view>
    </view>

    <view class="section-title-sm">积分直购 · 不想订阅也能买</view>
    <view class="vip-grid">
      <view class="vip-card locked"><view class="vc-name">小包</view><view class="vc-price">价格待定</view><view class="vc-pts">100 分</view><view class="vc-lock">后续版本开放</view></view>
      <view class="vip-card locked"><view class="vc-name">中包</view><view class="vc-price">价格待定</view><view class="vc-pts">300 分</view><view class="vc-lock">后续版本开放</view></view>
      <view class="vip-card locked"><view class="vc-name">大包</view><view class="vc-price">价格待定</view><view class="vc-pts">650 分</view><view class="vc-lock">后续版本开放</view></view>
    </view>
    <view style="font-size:11px;color:var(--muted);text-align:center;margin:-4px 0 10px">现所有核心交付物（策展包 / 案例 / 报告书）均用「做任务得的免费积分」兑换，养成期每月还赠体验金。</view>

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
      <view class="menu-item" @tap="toast('会员/订阅将在后续版本开放')"><view class="menu-icon">⭐</view><view class="menu-text">会员与订阅</view><view class="menu-badge">待</view></view>
      <view class="menu-item" @tap="toast('关于风声（模拟）')"><view class="menu-icon">ℹ️</view><view class="menu-text">关于风声</view><view class="menu-arrow">›</view></view>
    </view>
    <view class="icp">⚠️ 客户数据仅你可见，平台不收取、不用于撮合<view>帮助服务者用独立价值获得尊重</view></view>

    <!-- 轻量设置本地昵称（仅本地，不上云、不开账号体系） -->
    <view class="nick-mask" v-if="showNick" @tap="cancelNick">
      <view class="nick-sheet" @tap.stop>
        <view class="nick-title">设置你的昵称</view>
        <input class="nick-input" v-model="nickInput" placeholder="如：@小李 · 信义店" maxlength="20" :focus="showNick" />
        <view class="nick-tip">仅存你手机，不上云、不收数据</view>
        <view class="nick-btns">
          <button class="nick-btn cancel" @tap="cancelNick">取消</button>
          <button class="nick-btn ok" @tap="saveNick">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { copyLink, APP_SHARE_TITLE } from '../../utils/share.js'
export default {
  data() {
    return { showNick: false, nickInput: '' }
  },
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
    editNickname() {
      this.nickInput = this.brokerName === '风声用户' ? '' : this.brokerName
      this.showNick = true
    },
    saveNick() {
      if (this.userStore.setNickname(this.nickInput)) {
        this.showNick = false
        uni.showToast({ title: '已保存', icon: 'success' })
      } else {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
      }
    },
    cancelNick() { this.showNick = false },
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
.ph-text { flex: 1; }
.ph-edit { font-size: 12px; color: #c46a3a; margin-top: 4px; font-weight: 600; }
.nick-mask { position: fixed; left: 0; right: 0; bottom: 0; top: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; z-index: 99; }
.nick-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.nick-title { font-size: 16px; font-weight: 700; color: #2b2b2b; margin-bottom: 12px; }
.nick-input { background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 10px; padding: 12px; font-size: 15px; color: #2b2b2b; width: 100%; box-sizing: border-box; }
.nick-tip { font-size: 11px; color: #999; margin: 8px 0 14px; }
.nick-btns { display: flex; gap: 12px; }
.nick-btn { flex: 1; border-radius: 10px; font-size: 15px; padding: 12px 0; line-height: 1.2; margin: 0; }
.nick-btn.cancel { background: #f1ede6; color: #666; }
.nick-btn.ok { background: #3d5a3e; color: #fff; }
</style>
