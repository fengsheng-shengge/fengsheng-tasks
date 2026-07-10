<template>
  <view class="page">
    <!-- Hero 区域 -->
    <view class="hero">
      <view class="hero-title">风声助手</view>
      <view class="hero-sub">居住服务从业者的专属AI工具</view>
    </view>

    <!-- 产品入口 -->
    <view class="product-grid">
      <view class="product-card mentor-card" @click="goTo('mentor')">
        <view class="product-icon">🔥</view>
        <view class="product-name">开单导师</view>
        <view class="product-desc">租赁开单·AI陪练</view>
        <view class="product-tag">AI推荐</view>
      </view>

      <view class="product-card" @click="goTo('decode')">
        <view class="product-icon">🔑</view>
        <view class="product-name">客户解码器</view>
        <view class="product-desc">3个问题，读懂客户</view>
        <view class="product-tag">AI推荐</view>
      </view>

      <view class="product-card" @click="goTo('assess')">
        <view class="product-icon">🎯</view>
        <view class="product-name">品质测评</view>
        <view class="product-desc">知己知彼，服务更有底</view>
        <view class="product-tag free">免费</view>
      </view>

      <view class="product-card" @click="goTo('agent')">
        <view class="product-icon">🤖</view>
        <view class="product-name">Agent培养师</view>
        <view class="product-desc">打造你的专属AI助理</view>
        <view class="product-tag free">免费</view>
      </view>
    </view>

    <!-- 订阅入口（有订阅时显示） -->
    <view v-if="subscription" class="sub-banner" @click="goTo('subscribe')">
      <view class="sub-info">
        <view class="sub-name">🏆 {{ subscription.name }}</view>
        <view class="sub-expire">有效期至：{{ subscription.expireAt }}</view>
      </view>
      <view class="sub-arrow">→</view>
    </view>

    <!-- 登录引导（未登录时显示） -->
    <view v-if="!isLoggedIn" class="login-tip" @click="doLogin">
      <view class="login-text">登录后解锁完整功能</view>
      <view class="login-btn">微信一键登录</view>
    </view>

    <!-- 统计数据 -->
    <view class="stats-row">
      <view class="stat-item">
        <view class="stat-n">{{ stats.uv || '--' }}</view>
        <view class="stat-l">今日UV</view>
      </view>
      <view class="stat-item">
        <view class="stat-n">{{ stats.subs || '--' }}</view>
        <view class="stat-l">付费用户</view>
      </view>
    </view>

    <!-- ICP备案 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026041809号</text>
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
      subscription: null,
    }
  },
  computed: {
    isLoggedIn() {
      return useUserStore().isLoggedIn
    },
  },
  onLoad() {
    useUserStore().initFromStorage()
    this.loadData()
  },
  onShow() {
    uni.setStorageSync('__current_page', '/pages/index/index')
    track.pageview({ page: '/pages/index/index' })
  },
  methods: {
    async loadData() {
      try {
        const res = await uni.request({
          url: 'https://fengsheng.tech/api/stats?key=fs-admin-2026&product=mini-program',
        })
        if (res.data) {
          this.stats = res.data
        }
      } catch {}
    },
    goTo(page) {
      const map = {
        mentor: '/pages/mentor/index',
        decode: '/pages/decode/index',
        assess: '/pages/assess/index',
        agent: '/pages/agent/index',
        subscribe: '/pages/subscribe/index',
      }
      track.click(`home_goto_${page}`)
      const url = map[page] || map.decode
      if (page === 'decode' || page === 'assess' || page === 'agent') {
        uni.switchTab({ url })
      } else {
        uni.navigateTo({ url })
      }
    },
    async doLogin() {
      try {
        await useUserStore().login()
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch {
        // 登录失败不阻塞
      }
    },
  },
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.hero {
  text-align: center;
  padding: 60rpx 0 40rpx;
}
.hero-title {
  font-size: 48rpx;
  font-weight: 900;
  color: #3d5a3e;
  letter-spacing: 0.1em;
}
.hero-sub {
  font-size: 26rpx;
  color: #888;
  margin-top: 12rpx;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20rpx;
  padding: 0 10rpx;
}
.product-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.06);
}
.mentor-card {
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
}
.mentor-card .product-name {
  color: #fff;
}
.mentor-card .product-desc {
  color: rgba(255,255,255,0.8);
}
.mentor-card .product-tag {
  background: #c46a3a;
}
.product-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}
.product-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
}
.product-desc {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}
.product-tag {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: #3d5a3e;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.product-tag.free {
  background: #e8f5e9;
  color: #3d5a3e;
}

.login-tip {
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
  border-radius: 20rpx;
  padding: 30rpx;
  margin: 30rpx 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.login-text {
  color: #fff;
  font-size: 26rpx;
}
.login-btn {
  background: #fff;
  color: #3d5a3e;
  font-size: 24rpx;
  font-weight: 700;
  padding: 16rpx 28rpx;
  border-radius: 30rpx;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  margin: 40rpx 10rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.stat-item { text-align: center; }
.stat-n { font-size: 36rpx; font-weight: 900; color: #3d5a3e; }
.stat-l { font-size: 22rpx; color: #888; margin-top: 4rpx; }

.footer { text-align: center; padding: 20rpx; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
