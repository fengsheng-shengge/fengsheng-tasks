<template>
  <view class="page">
    <!-- Logo 区域 -->
    <view class="brand-area">
      <view class="brand-logo">
        <view class="logo-text">风声</view>
      </view>
      <view class="brand-tagline">居住服务者的专业基础设施</view>
      <view class="brand-sub-tagline">记忆库 · 知识库 · 工具包</view>
    </view>

    <!-- 功能列表 -->
    <view class="feature-list">
      <view class="feature-item">
        <text class="feature-icon">📖</text>
        <text class="feature-text">专业记忆库，241条词条随时查</text>
      </view>
      <view class="feature-item">
        <text class="feature-icon">🎯</text>
        <text class="feature-text">真实案例还原，高频场景全覆盖</text>
      </view>
      <view class="feature-item">
        <text class="feature-icon">⚖️</text>
        <text class="feature-text">法条实时校验，用对依据少纠纷</text>
      </view>
    </view>

    <!-- 登录按钮 -->
    <view class="login-section">
      <button
        class="wx-login-btn"
        :disabled="!agreed"
        :loading="loading"
        open-type="getPhoneNumber"
        @getphonenumber="handleGetPhoneNumber"
        @click="handleWxLogin"
      >
        <view class="btn-content">
          <text class="btn-icon">&#xe601;</text>
          <text>微信一键登录</text>
        </view>
      </button>

      <!-- 隐私政策 -->
      <view class="privacy-section">
        <view class="privacy-check" @click="toggleAgree">
          <view :class="['check-box', agreed ? 'checked' : '']">
            <text v-if="agreed" class="check-mark">&#10003;</text>
          </view>
          <text class="privacy-text">
            已阅读并同意
            <text class="privacy-link" @click.stop="openPrivacy">《隐私政策》</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 其他登录方式 -->
    <view class="other-login">
      <view class="divider-line"></view>
      <text class="divider-text">其他方式</text>
      <view class="divider-line"></view>
    </view>
    <view class="other-actions">
      <view class="other-btn" @click="handleSkipLogin">
        <text>游客模式</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '../../store/user'
import { wxLogin } from '../../api/auth'

const userStore = useUserStore()

const agreed = ref(true)
const loading = ref(false)

function toggleAgree() {
  agreed.value = !agreed.value
}

function openPrivacy() {
  uni.navigateTo({
    url: '/pages/webview/index?url=' + encodeURIComponent('https://fengsheng.tech/privacy')
  })
}

async function handleWxLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意隐私政策', icon: 'none' })
    return
  }

  loading.value = true

  try {
    // 1. 获取微信登录 code
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => {
          if (res.code) {
            resolve(res)
          } else {
            reject(new Error('微信登录凭证获取失败'))
          }
        },
        fail: (err) => reject(err),
      })
    })

    const { code } = loginRes

    // 2. 调用后端换取 token
    const res = await wxLogin()

    // 3. 存储用户数据到 store
    userStore.token = res.token
    userStore.openid = res.openid
    userStore.userId = res.userId
    userStore.isLoggedIn = true

    // 新用户赠送 50 积分
    if (res.isNewUser) {
      userStore.points = 50
    }

    uni.showToast({ title: '登录成功', icon: 'success' })

    // 4. 跳转首页
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/home/index' })
    }, 500)
  } catch (err) {
    console.error('登录失败:', err)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleGetPhoneNumber(e) {
  // 微信手机号授权回调
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    // 可在此处理手机号
    console.log('手机号授权成功')
  }
}

function handleSkipLogin() {
  uni.showModal({
    title: '游客模式',
    content: '游客模式下部分功能将受限，确定以游客身份进入吗？',
    success: (res) => {
      if (res.confirm) {
        uni.setStorageSync('fs_guest_mode', true)
        uni.reLaunch({ url: '/pages/home/index' })
      }
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40rpx;
}

/* Logo 区域 */
.brand-area {
  margin-top: 160rpx;
  text-align: center;
}
.brand-logo {
  margin-bottom: 24rpx;
}
.logo-text {
  font-size: 72rpx;
  font-weight: 900;
  color: #3d5a3e;
  letter-spacing: 0.3em;
}
.brand-tagline {
  font-size: 30rpx;
  color: #3d5a3e;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.brand-sub-tagline {
  font-size: 24rpx;
  color: #999;
  font-weight: 400;
  letter-spacing: 0.1em;
  margin-top: 8rpx;
}

/* 功能列表 */
.feature-list {
  margin: 0 60rpx 60rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.feature-item + .feature-item {
  border-top: 1rpx solid #f0f0f0;
}

.feature-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.feature-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.5;
}

/* 登录按钮 */
.login-section {
  width: 100%;
  margin-top: 100rpx;
}
.wx-login-btn {
  width: 100%;
  height: 96rpx;
  background: #3d5a3e;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.04em;
}
.wx-login-btn[disabled] {
  background: #b0b0b0;
}
.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

/* 隐私政策 */
.privacy-section {
  margin-top: 28rpx;
  display: flex;
  justify-content: center;
}
.privacy-check {
  display: flex;
  align-items: center;
}
.check-box {
  width: 34rpx;
  height: 34rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  margin-right: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.check-box.checked {
  background: #3d5a3e;
  border-color: #3d5a3e;
}
.check-mark {
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
.privacy-text {
  font-size: 24rpx;
  color: #888;
}
.privacy-link {
  color: #3d5a3e;
}

/* 其他登录方式 */
.other-login {
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: 100rpx;
}
.divider-line {
  flex: 1;
  height: 1rpx;
  background: #ddd;
}
.divider-text {
  font-size: 22rpx;
  color: #bbb;
  margin: 0 20rpx;
}
.other-actions {
  margin-top: 28rpx;
}
.other-btn {
  padding: 16rpx 40rpx;
  font-size: 26rpx;
  color: #888;
}

/* 底部 */
.footer {
  position: absolute;
  bottom: 60rpx;
  text-align: center;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>