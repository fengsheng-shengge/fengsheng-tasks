<template>
  <view class="page">
    <!-- 套餐卡片 -->
    <view class="section">
      <view class="section-title">选择套餐</view>
      <view class="plan-list">
        <!-- 单次体验 -->
        <view
          :class="['plan-card', selectedPlan === 'single' ? 'plan-active' : '']"
          @click="selectPlan('single')"
        >
          <view class="plan-header">
            <view class="plan-name">单次体验</view>
            <view class="plan-price">
              <text class="price-symbol">&#165;</text>
              <text class="price-value">0.99</text>
              <text class="price-unit">/次</text>
            </view>
          </view>
          <view class="plan-desc">适合偶尔使用，按次付费</view>
          <view class="plan-check" v-if="selectedPlan === 'single'">&#10003;</view>
        </view>

        <!-- 月费 -->
        <view
          :class="['plan-card', 'plan-recommend', selectedPlan === 'monthly' ? 'plan-active' : '']"
          @click="selectPlan('monthly')"
        >
          <view class="plan-badge">推荐</view>
          <view class="plan-header">
            <view class="plan-name">月费</view>
            <view class="plan-price">
              <text class="price-symbol">&#165;</text>
              <text class="price-value">9.9</text>
              <text class="price-unit">/月</text>
            </view>
          </view>
          <view class="plan-desc">无限次数，性价比之选</view>
          <view class="plan-check" v-if="selectedPlan === 'monthly'">&#10003;</view>
        </view>

        <!-- 年费 -->
        <view
          :class="['plan-card', selectedPlan === 'yearly' ? 'plan-active' : '']"
          @click="selectPlan('yearly')"
        >
          <view class="plan-header">
            <view class="plan-name">年费</view>
            <view class="plan-price">
              <text class="price-symbol">&#165;</text>
              <text class="price-value">99</text>
              <text class="price-unit">/年</text>
            </view>
          </view>
          <view class="plan-desc">相当于每月仅 &#165;8.25，超值优惠</view>
          <view class="plan-check" v-if="selectedPlan === 'yearly'">&#10003;</view>
        </view>
      </view>
    </view>

    <!-- 积分抵扣 -->
    <view class="section">
      <view class="section-title">积分抵扣</view>
      <view class="points-section">
        <view class="points-info">
          <view class="points-label">可用积分</view>
          <view class="points-value">{{ points }}</view>
        </view>
        <view class="points-rule">
          <text>100积分 = &#165;1.00</text>
        </view>
        <view class="points-deduct">
          <view class="deduct-row">
            <text class="deduct-label">抵扣积分</text>
            <view class="deduct-control">
              <text class="deduct-btn" @click="decreasePoints">-</text>
              <text class="deduct-value">{{ deductPoints }}</text>
              <text class="deduct-btn" @click="increasePoints">+</text>
            </view>
          </view>
          <view class="deduct-result">
            抵扣金额：<text class="deduct-price">&#165;{{ deductAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 支付明细 -->
    <view class="section" v-if="selectedPlan">
      <view class="section-title">支付明细</view>
      <view class="pay-detail">
        <view class="detail-row">
          <text class="detail-label">套餐</text>
          <text class="detail-value">{{ planLabel }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">原价</text>
          <text class="detail-value">&#165;{{ planPrice.toFixed(2) }}</text>
        </view>
        <view class="detail-row" v-if="deductPoints > 0">
          <text class="detail-label">积分抵扣</text>
          <text class="detail-value discount">-&#165;{{ deductAmount.toFixed(2) }}</text>
        </view>
        <view class="detail-row total-row">
          <text class="detail-label">应付</text>
          <text class="detail-value total-price">&#165;{{ finalPrice.toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="pay-action">
      <button class="pay-btn" @click="handlePay" :disabled="!selectedPlan">
        {{ selectedPlan ? '立即支付 &#165;' + finalPrice.toFixed(2) : '请选择套餐' }}
      </button>
    </view>

    <!-- 免责声明 -->
    <view class="disclaimer">
      <text class="disclaimer-icon">&#9888;</text>
      <text>AI 建议仅供参考</text>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

const selectedPlan = ref('')
const deductPoints = ref(0)
const points = computed(() => userStore.points || 0)

const planPriceMap = {
  single: 0.99,
  monthly: 9.9,
  yearly: 99,
}

const planLabelMap = {
  single: '单次体验',
  monthly: '月费',
  yearly: '年费',
}

const planPrice = computed(() => planPriceMap[selectedPlan.value] || 0)
const planLabel = computed(() => planLabelMap[selectedPlan.value] || '')

const deductAmount = computed(() => {
  return Math.min(deductPoints.value / 100, planPrice.value)
})

const finalPrice = computed(() => {
  return Math.max(0, planPrice.value - deductAmount.value)
})

onMounted(() => {
  // 获取页面参数 plan
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage?.$page?.options || currentPage?.options || {}
  if (options.plan) {
    selectedPlan.value = options.plan
  }
})

function selectPlan(plan) {
  selectedPlan.value = plan
  deductPoints.value = 0
}

function increasePoints() {
  const maxDeduct = Math.min(points.value, Math.floor(planPrice.value * 100))
  if (deductPoints.value + 100 <= maxDeduct) {
    deductPoints.value += 100
  }
}

function decreasePoints() {
  if (deductPoints.value >= 100) {
    deductPoints.value -= 100
  }
}

function handlePay() {
  if (!selectedPlan.value) {
    uni.showToast({ title: '请选择套餐', icon: 'none' })
    return
  }
  uni.showToast({ title: '支付功能即将上线', icon: 'none', duration: 2000 })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 分区 */
.section {
  margin: 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
}

/* 套餐卡片 */
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.plan-card {
  position: relative;
  border: 2rpx solid #eee;
  border-radius: 20rpx;
  padding: 24rpx;
  transition: border-color 0.2s;
}
.plan-card.plan-active {
  border-color: #3d5a3e;
  background: #f8faf8;
}
.plan-card.plan-recommend {
  border-color: #c46a3a;
}
.plan-card.plan-recommend.plan-active {
  border-color: #c46a3a;
  background: #fef9f5;
}
.plan-badge {
  position: absolute;
  top: -1rpx;
  right: 20rpx;
  background: #c46a3a;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 0 0 12rpx 12rpx;
}
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.plan-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}
.plan-price {
  display: flex;
  align-items: baseline;
}
.price-symbol {
  font-size: 24rpx;
  color: #3d5a3e;
  font-weight: 600;
}
.price-value {
  font-size: 48rpx;
  font-weight: 900;
  color: #3d5a3e;
  line-height: 1;
}
.price-unit {
  font-size: 24rpx;
  color: #888;
  margin-left: 4rpx;
}
.plan-desc {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}
.plan-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 40rpx;
  height: 40rpx;
  background: #3d5a3e;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.plan-recommend .plan-check {
  background: #c46a3a;
}

/* 积分抵扣 */
.points-section {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}
.points-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.points-label {
  font-size: 26rpx;
  color: #888;
}
.points-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #3d5a3e;
}
.points-rule {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 6rpx;
}
.points-deduct {
  margin-top: 20rpx;
  background: #f7f4ef;
  border-radius: 16rpx;
  padding: 20rpx;
}
.deduct-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.deduct-label {
  font-size: 28rpx;
  color: #555;
}
.deduct-control {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.deduct-btn {
  width: 52rpx;
  height: 52rpx;
  background: #fff;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #3d5a3e;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.deduct-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  min-width: 80rpx;
  text-align: center;
}
.deduct-result {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #888;
  text-align: right;
}
.deduct-price {
  color: #c46a3a;
  font-weight: 700;
}

/* 支付明细 */
.pay-detail {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
}
.detail-label {
  font-size: 26rpx;
  color: #888;
}
.detail-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}
.detail-value.discount {
  color: #c46a3a;
}
.total-row {
  border-top: 1rpx solid #f0f0f0;
  margin-top: 8rpx;
  padding-top: 16rpx;
}
.total-price {
  color: #c46a3a !important;
  font-size: 36rpx !important;
  font-weight: 900 !important;
}

/* 支付按钮 */
.pay-action {
  margin: 32rpx 20rpx;
}
.pay-btn {
  width: 100%;
  height: 96rpx;
  background: #c46a3a;
  border-radius: 48rpx;
  border: none;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.04em;
}
.pay-btn[disabled] {
  background: #ccc;
}

/* 免责声明 */
.disclaimer {
  text-align: center;
  font-size: 24rpx;
  color: #aaa;
  padding: 0 20rpx;
}
.disclaimer-icon {
  color: #c46a3a;
  margin-right: 6rpx;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 40rpx 20rpx 20rpx;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>