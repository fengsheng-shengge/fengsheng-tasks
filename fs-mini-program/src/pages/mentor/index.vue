<template>
  <view class="page">
    <!-- 顶部导师介绍 -->
    <view class="chat-header">
      <view class="header-top">
        <view class="header-left">
          <view class="mentor-avatar">
            <text class="avatar-icon">M</text>
          </view>
          <view class="header-info">
            <view class="header-title">开单导师</view>
            <view class="header-sub">租赁业务AI陪练</view>
          </view>
        </view>
        <view class="quota-badge" :class="{ 'quota-low': remainingQuota <= 1, 'quota-zero': remainingQuota === 0 }">
          <text class="quota-label">今日剩余</text>
          <text class="quota-num">{{ remainingQuota }}/{{ dailyLimit }}</text>
          <text class="quota-label">次</text>
        </view>
      </view>
      <view v-if="store.subscription && store.subscription.status === 'active'" class="vip-banner">
        <text class="vip-text">VIP 会员 · 无限畅聊</text>
      </view>
    </view>

    <!-- 快捷场景按钮 -->
    <view class="scene-bar">
      <scroll-view scroll-x class="scene-scroll">
        <view
          v-for="(scene, idx) in quickScenes"
          :key="idx"
          class="scene-chip"
          @click="sendQuickScene(scene)"
        >
          <text class="scene-icon">{{ scene.icon }}</text>
          <text class="scene-text">{{ scene.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 对话区 -->
    <scroll-view
      class="chat-body"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
      @scrolltoupper="loadMoreHistory"
      :upper-threshold="50"
    >
      <view v-if="hasMoreHistory" class="load-more">
        <text class="load-more-text" @click="loadMoreHistory">加载更多</text>
      </view>
      <view v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.role === 'user' ? 'msg-right' : 'msg-left'">
        <view v-if="msg.role === 'bot'" class="msg-avatar">
          <text class="bot-avatar-icon">M</text>
        </view>
        <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-bot']">
          <text class="msg-text">{{ msg.content }}</text>
        </view>
        <view v-if="msg.role === 'user'" class="msg-avatar">
          <text class="user-avatar-icon">我</text>
        </view>
      </view>
      <view v-if="streaming" class="msg-row msg-left">
        <view class="msg-avatar">
          <text class="bot-avatar-icon">M</text>
        </view>
        <view class="msg-bubble bubble-bot">
          <text class="msg-text">{{ streamBuffer }}<text class="cursor">|</text></text>
        </view>
      </view>
      <view v-if="loading && !streaming" class="msg-row msg-left">
        <view class="msg-avatar">
          <text class="bot-avatar-icon">M</text>
        </view>
        <view class="msg-bubble bubble-bot">
          <text class="msg-text typing">思考中...</text>
        </view>
      </view>
      <view class="chat-bottom-spacer"></view>
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="input-bar">
      <input
        class="chat-input"
        v-model="inputText"
        placeholder="问我任何开单问题..."
        confirm-type="send"
        @confirm="handleSend"
        :disabled="loading"
        :adjust-position="true"
        cursor-spacing="20"
      />
      <view class="send-btn" :class="{ active: inputText.trim() && !loading }" @click="handleSend">
        <text class="send-btn-text">发送</text>
      </view>
    </view>

    <!-- 付费墙弹窗 -->
    <view v-if="showPaywall" class="paywall-overlay" @click="closePaywall">
      <view class="paywall-card" @click.stop>
        <view class="paywall-close" @click="closePaywall">
          <text class="paywall-close-icon">X</text>
        </view>
        <view class="paywall-icon">M</view>
        <view class="paywall-title">今日免费额度已用完</view>
        <view class="paywall-sub">升级后即可无限畅聊</view>

        <view class="paywall-plans">
          <view class="plan-item" :class="{ 'plan-recommended': plan.recommended }" v-for="(plan, idx) in pricingPlans" :key="idx" @click="selectPlan(plan)">
            <view v-if="plan.recommended" class="plan-badge">推荐</view>
            <view class="plan-name">{{ plan.name }}</view>
            <view class="plan-price">
              <text class="plan-price-symbol">¥</text>
              <text class="plan-price-num">{{ plan.price }}</text>
              <text class="plan-price-unit">{{ plan.unit }}</text>
            </view>
            <view class="plan-desc">{{ plan.desc }}</view>
          </view>
        </view>

        <view class="paywall-points" @click="usePointsPay">
          <view class="points-left">
            <text class="points-icon">P</text>
            <text class="points-text">积分抵扣（{{ store.points }}积分可用）</text>
          </view>
          <view class="points-rate">100积分=¥1</view>
        </view>

        <view class="paywall-disclaimer">
          <text class="disclaimer-text">AI 建议仅供参考</text>
        </view>

        <view class="paywall-btn" @click="goPay">
          <text class="paywall-btn-text">立即开通</text>
        </view>
      </view>
    </view>

    <!-- 底部备案 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, getCurrentInstance } from 'vue'
import { useUserStore } from '../../store/user'
import { onShow } from '@dcloudio/uni-app'

const store = useUserStore()
const instance = getCurrentInstance()

const dailyLimit = 5
const remainingQuota = computed(() => store.remainingQuota)

// 对话状态
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const streaming = ref(false)
const streamBuffer = ref('')
const conversationId = ref('')
const scrollTop = ref(0)
const hasMoreHistory = ref(false)
const historyOffset = ref(0)

// 付费墙
const showPaywall = ref(false)
const selectedPlan = ref(null)

const pricingPlans = [
  { name: '单次', price: '0.99', unit: '/次', desc: '单次对话', type: 'once', recommended: false },
  { name: '月度', price: '9.9', unit: '/月', desc: '无限畅聊', type: 'monthly', recommended: true },
]

const quickScenes = [
  { icon: '1', label: '客户说太贵了', prompt: '客户说这套房子太贵了，我该怎么回应？' },
  { icon: '2', label: '客户犹豫不决', prompt: '客户看了好几套房子一直犹豫，怎么帮他下决心？' },
  { icon: '3', label: '客户说再考虑', prompt: '客户说"我再考虑考虑"，怎么跟进？' },
  { icon: '4', label: '客户要比较', prompt: '客户说要去别家比较一下，我该怎么留住他？' },
]

// 初始化
onMounted(() => {
  store.initFromStorage()
  loadChatHistory()
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'bot',
      content: '你好！我是风声开单导师，专注租赁业务陪练。告诉我你遇到的开单难题，我来帮你分析。',
    })
  }
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/mentor/index')
  store._resetDailyQuota()
})

// 聊天历史持久化
function loadChatHistory() {
  try {
    const saved = uni.getStorageSync('fs_mentor_chat')
    if (saved && saved.length > 0) {
      messages.value = saved.slice(-50)
      historyOffset.value = saved.length - messages.value.length
      hasMoreHistory.value = historyOffset.value > 0
    }
    const savedConvId = uni.getStorageSync('fs_mentor_conv_id')
    if (savedConvId) {
      conversationId.value = savedConvId
    }
  } catch (e) {
    // 忽略
  }
}

function saveChatHistory() {
  try {
    uni.setStorageSync('fs_mentor_chat', messages.value)
    if (conversationId.value) {
      uni.setStorageSync('fs_mentor_conv_id', conversationId.value)
    }
  } catch (e) {
    // 忽略
  }
}

function loadMoreHistory() {
  if (!hasMoreHistory.value) return
  try {
    const saved = uni.getStorageSync('fs_mentor_chat')
    const start = Math.max(0, historyOffset.value - 20)
    const older = saved.slice(start, historyOffset.value)
    messages.value = [...older, ...messages.value]
    historyOffset.value = start
    hasMoreHistory.value = historyOffset.value > 0
  } catch (e) {
    // 忽略
  }
}

// 发送消息
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  // 检查配额
  const quotaResult = store.checkQuotaBeforeSendMessage()
  if (!quotaResult.canSend) {
    showPaywall.value = true
    return
  }

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  store.consumeQuota()
  saveChatHistory()
  scrollToBottom()

  await sendToAI(text)
}

function sendQuickScene(scene) {
  if (loading.value) return
  const quotaResult = store.checkQuotaBeforeSendMessage()
  if (!quotaResult.canSend) {
    showPaywall.value = true
    return
  }
  messages.value.push({ role: 'user', content: scene.prompt })
  store.consumeQuota()
  saveChatHistory()
  scrollToBottom()
  sendToAI(scene.prompt)
}

async function sendToAI(message) {
  loading.value = true
  streamBuffer.value = ''

  try {
    const task = uni.request({
      url: 'https://fengsheng.tech/mentor-api/chat',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': store.token ? `Bearer ${store.token}` : '',
      },
      data: {
        message,
        conversation_id: conversationId.value || undefined,
        user_id: store.userId || uni.getStorageSync('fs_user_id') || 'mini_user',
      },
      responseType: 'text',
      enableChunked: true,
      success: (res) => {
        parseSSE(res.data)
      },
      fail: (err) => {
        if (streamBuffer.value) {
          messages.value.push({ role: 'bot', content: streamBuffer.value })
          saveChatHistory()
        } else {
          messages.value.push({ role: 'bot', content: '网络异常，请检查网络后重试。' })
          saveChatHistory()
        }
        streaming.value = false
        loading.value = false
        streamBuffer.value = ''
        scrollToBottom()
      },
    })
  } catch (e) {
    messages.value.push({ role: 'bot', content: '网络异常，请检查网络后重试。' })
    saveChatHistory()
    loading.value = false
    scrollToBottom()
  }
}

function parseSSE(rawData) {
  const data = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
  const lines = data.split('\n')
  let fullText = ''

  for (const line of lines) {
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim()
      if (dataStr === '[DONE]') {
        continue
      }
      try {
        const json = JSON.parse(dataStr)
        if (json.conversation_id && !conversationId.value) {
          conversationId.value = json.conversation_id
          uni.setStorageSync('fs_mentor_conv_id', conversationId.value)
        }
        if (json.type === 'answer' && json.content) {
          // 逐字渲染
          streaming.value = true
          loading.value = false
          streamBuffer.value = json.content
          fullText = json.content
          scrollToBottom()
        }
        if (json.role === 'assistant' && json.type === 'answer' && json.content) {
          streamBuffer.value = json.content
          fullText = json.content
          streaming.value = true
          loading.value = false
        }
      } catch {
        // 非JSON行跳过
      }
    }
  }

  // 延迟收尾确保流式效果
  setTimeout(() => {
    if (streamBuffer.value) {
      messages.value.push({ role: 'bot', content: streamBuffer.value })
      saveChatHistory()
    }
    streaming.value = false
    loading.value = false
    streamBuffer.value = ''
    scrollToBottom()
  }, 300)
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value += 9999
  })
}

// 付费墙
function closePaywall() {
  showPaywall.value = false
  selectedPlan.value = null
}

function selectPlan(plan) {
  selectedPlan.value = plan
}

function usePointsPay() {
  if (store.points >= 100) {
    store.spendPoints(100)
    uni.showToast({ title: '已使用100积分抵扣', icon: 'success' })
    showPaywall.value = false
  } else {
    uni.showToast({ title: '积分不足', icon: 'none' })
  }
}

function goPay() {
  const plan = selectedPlan.value
  const query = plan ? `?type=${plan.type}&price=${plan.price}` : ''
  showPaywall.value = false
  uni.navigateTo({ url: '/pages/pay/index' + query })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: #3d5a3e;
  padding: 20rpx 30rpx 24rpx;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
}
.mentor-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.avatar-icon {
  font-size: 36rpx;
  font-weight: 900;
  color: #fff;
}
.header-info {
  display: flex;
  flex-direction: column;
}
.header-title {
  font-size: 36rpx;
  font-weight: 900;
  color: #fff;
}
.header-sub {
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 4rpx;
}

.quota-badge {
  background: rgba(255,255,255,0.15);
  border-radius: 24rpx;
  padding: 10rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.quota-badge.quota-low {
  background: rgba(255,200,100,0.25);
}
.quota-badge.quota-zero {
  background: rgba(255,100,80,0.3);
}
.quota-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.8);
}
.quota-num {
  font-size: 28rpx;
  font-weight: 900;
  color: #fff;
}

.vip-banner {
  margin-top: 16rpx;
  background: linear-gradient(135deg, #c46a3a, #e08850);
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  text-align: center;
}
.vip-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

/* 快捷场景 */
.scene-bar {
  background: #fff;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
}
.scene-scroll {
  white-space: nowrap;
  display: flex;
  gap: 16rpx;
}
.scene-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: #f7f4ef;
  border: 1rpx solid #e8e4dc;
  border-radius: 32rpx;
  padding: 12rpx 24rpx;
  flex-shrink: 0;
}
.scene-icon {
  font-size: 24rpx;
  font-weight: 700;
  color: #3d5a3e;
}
.scene-text {
  font-size: 24rpx;
  color: #3d5a3e;
}

/* 对话区 */
.chat-body {
  flex: 1;
  padding: 20rpx 24rpx;
  overflow-y: auto;
}
.load-more {
  text-align: center;
  padding: 10rpx 0;
}
.load-more-text {
  font-size: 24rpx;
  color: #3d5a3e;
}
.msg-row {
  display: flex;
  margin-bottom: 24rpx;
  align-items: flex-start;
}
.msg-left {
  justify-content: flex-start;
}
.msg-right {
  justify-content: flex-end;
}
.msg-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0 12rpx;
}
.bot-avatar-icon {
  font-size: 28rpx;
  font-weight: 900;
  color: #fff;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #3d5a3e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar-icon {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #c46a3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.msg-bubble {
  max-width: 68%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  word-break: break-all;
}
.bubble-bot {
  background: #fff;
  color: #333;
  border-bottom-left-radius: 6rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.bubble-user {
  background: #3d5a3e;
  color: #fff;
  border-bottom-right-radius: 6rpx;
}
.msg-text {
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}
.typing {
  color: #999;
}
.cursor {
  color: #3d5a3e;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.chat-bottom-spacer {
  height: 20rpx;
}

/* 输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
}
.chat-input {
  flex: 1;
  height: 72rpx;
  background: #f7f4ef;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  color: #333;
}
.send-btn {
  margin-left: 16rpx;
  background: #ccc;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  padding: 14rpx 32rpx;
  border-radius: 36rpx;
  flex-shrink: 0;
}
.send-btn.active {
  background: #3d5a3e;
}
.send-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}

/* 付费墙弹窗 */
.paywall-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}
.paywall-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 32rpx;
  width: 100%;
  max-width: 600rpx;
  position: relative;
}
.paywall-close {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.paywall-close-icon {
  font-size: 24rpx;
  color: #999;
  font-weight: 700;
}
.paywall-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #3d5a3e;
  color: #fff;
  font-size: 40rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20rpx;
}
.paywall-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 8rpx;
}
.paywall-sub {
  text-align: center;
  font-size: 24rpx;
  color: #888;
  margin-bottom: 28rpx;
}

.paywall-plans {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.plan-item {
  flex: 1;
  background: #f7f4ef;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  position: relative;
  border: 2rpx solid transparent;
}
.plan-item.plan-recommended {
  border-color: #c46a3a;
  background: #fff8f3;
}
.plan-badge {
  position: absolute;
  top: -14rpx;
  left: 50%;
  transform: translateX(-50%);
  background: #c46a3a;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
}
.plan-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 8rpx;
}
.plan-price {
  margin-bottom: 6rpx;
}
.plan-price-symbol {
  font-size: 24rpx;
  color: #c46a3a;
  font-weight: 700;
}
.plan-price-num {
  font-size: 44rpx;
  font-weight: 900;
  color: #c46a3a;
}
.plan-price-unit {
  font-size: 22rpx;
  color: #888;
}
.plan-desc {
  font-size: 22rpx;
  color: #888;
}

.paywall-points {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}
.points-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.points-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #c46a3a;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.points-text {
  font-size: 24rpx;
  color: #555;
}
.points-rate {
  font-size: 22rpx;
  color: #c46a3a;
  font-weight: 700;
}

.paywall-disclaimer {
  text-align: center;
  margin-bottom: 20rpx;
}
.disclaimer-text {
  font-size: 22rpx;
  color: #bbb;
}

.paywall-btn {
  background: #c46a3a;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  padding: 22rpx;
  border-radius: 40rpx;
  text-align: center;
}
.paywall-btn-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.footer {
  text-align: center;
  padding: 12rpx;
  background: #fff;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>