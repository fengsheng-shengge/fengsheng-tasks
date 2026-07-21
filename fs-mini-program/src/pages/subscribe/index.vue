<template>
  <view class="page">
    <view class="header">
      <view class="title">订阅管理</view>
      <view class="sub">解锁完整功能，不限制次数</view>
    </view>

    <!-- 当前订阅状态 -->
    <view v-if="currentSub" class="current-card">
      <view class="current-badge">{{ currentSub.type === 'yearly' ? '🏆 年度会员' : '🥇 月度会员' }}</view>
      <view class="current-info">
        <view class="current-label">有效期至</view>
        <view class="current-date">{{ currentSub.expireAt || '永久' }}</view>
      </view>
      <view class="current-status">生效中</view>
    </view>

    <!-- 订阅方案 -->
    <view v-else class="plans-section">
      <!-- iOS端：虚拟支付禁令，显示联系客服 -->
      <view v-if="isIOS" class="ios-notice">
        <view class="ios-notice-title">iOS端订阅</view>
        <view class="ios-notice-text">因苹果政策，iOS端暂不支持在线订阅</view>
        <view class="ios-contact" @click="contactService">联系客服开通</view>
      </view>
      <!-- 非iOS端：正常显示订阅方案 -->
      <view v-else>
        <view class="plan-card" :class="{ popular: plan.popular }" v-for="plan in plans" :key="plan.key">
          <view v-if="plan.popular" class="popular-badge">推荐</view>
          <view class="plan-name">{{ plan.name }}</view>
          <view class="plan-price">
            <text class="price-symbol">¥</text>
            <text class="price-num">{{ plan.price }}</text>
            <text class="price-unit">/{{ plan.unit }}</text>
          </view>
          <view class="plan-desc">{{ plan.desc }}</view>
          <view class="plan-features">
            <view class="feature" v-for="f in plan.features" :key="f">
              <text class="feature-check">✓</text>
              <text class="feature-text">{{ f }}</text>
            </view>
          </view>
          <view class="plan-btn" @click="subscribe(plan.key)">立即订阅</view>
        </view>
      </view>
    </view>

    <!-- 免费vs付费对比 -->
    <view class="compare-section">
      <view class="compare-title">免费 vs 付费</view>
      <view class="compare-table">
        <view class="compare-row header-row">
          <view class="compare-cell">功能</view>
          <view class="compare-cell">免费</view>
          <view class="compare-cell">付费</view>
        </view>
        <view class="compare-row" v-for="row in compareData" :key="row.feature">
          <view class="compare-cell">{{ row.feature }}</view>
          <view class="compare-cell">{{ row.free }}</view>
          <view class="compare-cell highlight">{{ row.paid }}</view>
        </view>
      </view>
    </view>

    <!-- 说明 -->
    <view class="notice-section">
      <view class="notice-title">订阅说明</view>
      <view class="notice-text">
        · 订阅通过微信支付完成，自动续费可随时取消
        · 月度会员有效期30天，年度会员有效期365天
        · 解码器和品质测评均包含在订阅内
        · 如有疑问请联系客服：feedback@fengsheng.tech
      </view>
    </view>
    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { post } from '../../api/request'
import track from '../../utils/tracker'

const PLANS = [
  {
    key: 'monthly',
    name: '月度会员',
    price: 49,
    unit: '月',
    desc: '适合短期试用',
    popular: false,
    features: ['解码器不限次', '品质测评不限次', '7步法工具库', '历史记录保存'],
  },
  {
    key: 'yearly',
    name: '年度会员',
    price: 299,
    unit: '年',
    desc: '省¥289，适合长期使用',
    popular: true,
    features: ['解码器不限次', '品质测评不限次', '7步法工具库', '历史记录保存', '优先体验新功能', '专属客服支持'],
  },
]

const COMPARE = [
  { feature: '客户解码器', free: '每日1次', paid: '不限次' },
  { feature: '品质测评', free: '每月1次', paid: '不限次' },
  { feature: '7步法工具', free: '查看', paid: '查看+下载' },
  { feature: '历史记录', free: '不保存', paid: '永久保存' },
  { feature: '客服支持', free: '社区', paid: '专属1对1' },
]

export default {
  data() {
    return {
      plans: PLANS,
      compareData: COMPARE,
      isIOS: false,
    }
  },
  computed: {
    currentSub() {
      return useUserStore().subscription
    },
  },
  onLoad() {
    // iOS虚拟支付禁令检测
    const sysInfo = uni.getSystemInfoSync()
    this.isIOS = sysInfo.platform === 'ios'
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/subscribe/index')
    track.pageview({ page: '/pages/subscribe/index' })
  },
  methods: {
    contactService() {
      uni.showModal({
        title: '联系客服',
        content: '请发送邮件至 feedback@fengsheng.tech\n或添加客服微信开通订阅',
        showCancel: false,
      })
    },
    async subscribe(planKey) {
      track.click('subscribe_click', { plan: planKey })

      // 检查登录
      const store = useUserStore()
      if (!store.isLoggedIn) {
        uni.showModal({
          title: '请先登录',
          content: '订阅需要先登录',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              store.login().then(() => {
                uni.showToast({ title: '登录成功', icon: 'success' })
              }).catch(() => {})
            }
          },
        })
        return
      }

      // 尝试调用订阅API
      try {
        const res = await post('/api/subscribe', {
          productId: planKey,
          amount: planKey === 'monthly' ? 4900 : 29900,
        })

        if (res.prepayId) {
          // 调起微信支付
          uni.requestPayment({
            provider: 'wxpay',
            timeStamp: res.timeStamp,
            nonceStr: res.nonceStr,
            package: res.package,
            signType: res.signType,
            paySign: res.paySign,
            success: () => {
              uni.showToast({ title: '订阅成功！', icon: 'success' })
              track.subscribe(planKey)
            },
            fail: () => {
              uni.showToast({ title: '支付已取消', icon: 'none' })
            },
          })
        } else {
          // MVP阶段：没有微信支付，提示联系客服
          uni.showModal({
            title: '订阅成功（测试）',
            content: `已选择${planKey === 'yearly' ? '年度' : '月度'}会员\nMVP阶段暂未接入支付\n联系客服开通：feedback@fengsheng.tech`,
            showCancel: false,
          })
          track.subscribe(planKey, { status: 'mock' })
        }
      } catch (err) {
        uni.showToast({ title: err.message || '订阅失败', icon: 'none' })
      }
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.header { padding: 30rpx 10rpx 20rpx; }
.title { font-size: 40rpx; font-weight: 900; color: #3d5a3e; }
.sub { font-size: 24rpx; color: #888; margin-top: 8rpx; }

.current-card { background: linear-gradient(135deg, #3d5a3e, #5a7a5f); border-radius: 20rpx; padding: 30rpx; margin: 20rpx 10rpx; display: flex; align-items: center; }
.current-badge { color: #fff; font-size: 32rpx; font-weight: 700; }
.current-info { flex: 1; margin-left: 20rpx; }
.current-label { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.current-date { font-size: 28rpx; color: #fff; margin-top: 4rpx; }
.current-status { background: rgba(255,255,255,0.2); color: #fff; font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 20rpx; }

.plans-section { padding: 20rpx 10rpx; }

.ios-notice { background: #fff; border-radius: 20rpx; padding: 60rpx 40rpx; text-align: center; margin-bottom: 20rpx; }
.ios-notice-title { font-size: 36rpx; font-weight: 700; color: #3d5a3e; margin-bottom: 16rpx; }
.ios-notice-text { font-size: 28rpx; color: #888; margin-bottom: 32rpx; }
.ios-contact { background: #3d5a3e; color: #fff; font-size: 30rpx; padding: 20rpx 0; border-radius: 48rpx; }

.plan-card { background: #fff; border-radius: 20rpx; padding: 36rpx 30rpx; margin-bottom: 16rpx; position: relative; overflow: hidden; }
.plan-card.popular { border: 4rpx solid #3d5a3e; }
.popular-badge { position: absolute; top: 0; right: 0; background: #3d5a3e; color: #fff; font-size: 22rpx; padding: 6rpx 20rpx; border-bottom-left-radius: 16rpx; }
.plan-name { font-size: 34rpx; font-weight: 700; color: #222; }
.plan-price { margin: 16rpx 0; }
.price-symbol { font-size: 28rpx; color: #3d5a3e; font-weight: 700; }
.price-num { font-size: 56rpx; color: #3d5a3e; font-weight: 900; }
.price-unit { font-size: 26rpx; color: #888; }
.plan-desc { font-size: 24rpx; color: #888; }
.plan-features { margin: 20rpx 0; }
.feature { display: flex; align-items: center; padding: 8rpx 0; }
.feature-check { color: #3d5a3e; font-size: 28rpx; margin-right: 12rpx; font-weight: 700; }
.feature-text { font-size: 26rpx; color: #444; }
.plan-btn { background: #3d5a3e; color: #fff; font-size: 32rpx; font-weight: 700; text-align: center; padding: 24rpx; border-radius: 40rpx; }

.compare-section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin: 16rpx 10rpx; }
.compare-title { font-size: 28rpx; font-weight: 700; color: #222; margin-bottom: 16rpx; }
.compare-table { width: 100%; }
.compare-row { display: flex; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.compare-row.header-row { font-weight: 700; color: #888; }
.compare-cell { flex: 1; font-size: 26rpx; color: #444; text-align: center; }
.compare-cell:first-child { text-align: left; color: #666; }
.compare-cell.highlight { color: #3d5a3e; font-weight: 500; }

.notice-section { padding: 24rpx 10rpx; }
.notice-title { font-size: 24rpx; color: #888; margin-bottom: 8rpx; }
.notice-text { font-size: 22rpx; color: #aaa; line-height: 2; }
.page-footer { text-align: center; padding: 24rpx 0 40rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
