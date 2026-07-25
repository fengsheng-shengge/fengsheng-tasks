<template>
  <view class="page">
    <view class="chat-header">
      <view class="header-top">
        <view class="header-left">
          <view class="mentor-avatar">
            <text class="avatar-icon">M</text>
          </view>
          <view class="header-info">
            <view class="header-title">开单锦囊</view>
            <view class="header-sub">免费话术库 · 租赁实战</view>
          </view>
        </view>
        <view class="free-badge"><text class="free-label">免费</text></view>
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
    >
      <view v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.role === 'user' ? 'msg-right' : 'msg-left'">
        <view v-if="msg.role === 'bot'" class="msg-avatar">
          <text class="bot-avatar-icon">M</text>
        </view>
        <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-bot']">
          <text class="msg-text" user-select>{{ msg.content }}</text>
        </view>
        <view v-if="msg.role === 'user'" class="msg-avatar">
          <text class="user-avatar-icon">我</text>
        </view>
      </view>
      <view class="chat-bottom-spacer"></view>
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="input-bar">
      <input
        class="chat-input"
        v-model="inputText"
        placeholder="描述你遇到的开单难题..."
        confirm-type="send"
        @confirm="handleSend"
        :adjust-position="true"
        cursor-spacing="20"
      />
      <view class="send-btn" :class="{ active: inputText.trim() }" @click="handleSend">
        <text class="send-btn-text">发送</text>
      </view>
    </view>

    <!-- 底部备案 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { track } from '../../utils/tracker'

const messages = ref([])
const inputText = ref('')
const scrollTop = ref(0)

const quickScenes = [
  { icon: '1', label: '客户说太贵了', prompt: '客户说这套房子太贵了，我该怎么回应？' },
  { icon: '2', label: '客户犹豫不决', prompt: '客户看了好几套房子一直犹豫，怎么帮他下决心？' },
  { icon: '3', label: '客户说再考虑', prompt: '客户说"我再考虑考虑"，怎么跟进？' },
  { icon: '4', label: '客户要比较', prompt: '客户说要去别家比较一下，我该怎么留住他？' },
]

// 静态参考话术库（不调用 AI，符合"不做 AI 对话"铁律）
const TIP_LIBRARY = {
  price: '客户说太贵：先共情、再拆解价值，不急着降价。\n「我特别理解，租房也是一笔不小的开支，肯定要算清楚。这套房子的价格，主要对应三件事：①地段与通勤 ②装修与配套 ③后续维修响应。咱们先把您最在意的 1-2 个点锁定，我再帮您看看同预算里更匹配的几套。」\n用价值锚定替代价格谈判，客户更容易接受。',
  hesitate: '客户犹豫不决：用"小步决策"降低压力。\n「不急着今天定。您可以把看过的几套按"最满意 / 最担心"排个序，我把差异一条条讲清楚，您回家跟家人对一遍。真合适，慢一点也值得。」\n把大决定拆小，反而推进更快。',
  consider: '客户说再考虑：把"再考虑"翻译成具体卡点。\n「当然要慎重，毕竟要住好几年。您说考虑，通常是卡在某一个点没底——是价格、位置，还是担心后续服务？您直说，我帮您把那一点想透。」\n挖出真实顾虑，才能精准化解。',
  compare: '客户要去别家比：留住信任，不拦人。\n「应该多看看，货比三家才踏实。您去比的时候重点看三处：①同户型真实成交价 ②物业与维修响应速度 ③退租 / 转租条款。回来我帮您做张对比表。」\n用专业陪看赢得长期信任，而不是硬拦。',
}

const DEFAULT_TIP = '这是风声开单锦囊的参考话术，不是标准答案，请结合您对客户的真实判断使用。\n常见异议可试试上方四个场景；也可以告诉我客户的具体原话，我帮您拆一下应对思路。'

function matchTip(text) {
  if (/贵|价格|便宜|预算|划算/.test(text)) return TIP_LIBRARY.price
  if (/犹豫|不定|纠结|下不了|拿不准/.test(text)) return TIP_LIBRARY.hesitate
  if (/考虑|想想|再说|过两天/.test(text)) return TIP_LIBRARY.consider
  if (/比较|别家|再看|货比|其他家/.test(text)) return TIP_LIBRARY.compare
  return DEFAULT_TIP
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value += 9999
  })
}

function reply(text) {
  messages.value.push({ role: 'bot', content: matchTip(text) })
  saveChatHistory()
  scrollToBottom()
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  saveChatHistory()
  scrollToBottom()
  track.mentorMessageSent('free_input')
  reply(text)
}

function sendQuickScene(scene) {
  messages.value.push({ role: 'user', content: scene.prompt })
  saveChatHistory()
  scrollToBottom()
  track.mentorMessageSent('quick_scenario', scene.label)
  reply(scene.prompt)
}

function loadChatHistory() {
  try {
    const saved = uni.getStorageSync('fs_mentor_chat')
    if (saved && saved.length > 0) {
      messages.value = saved.slice(-50)
    }
  } catch (e) {
    // 忽略
  }
}

function saveChatHistory() {
  try {
    uni.setStorageSync('fs_mentor_chat', messages.value)
  } catch (e) {
    // 忽略
  }
}

onMounted(() => {
  loadChatHistory()
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'bot',
      content: '你好！我是风声开单锦囊，专注租赁业务常用话术与应对思路。\n点击下方场景，或描述你遇到的开单难题，我给你参考话术。',
    })
  }
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/mentor/index')
  track.pageview({ page: '/pages/mentor/index' })
})
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
.free-badge {
  background: rgba(255,255,255,0.15);
  border-radius: 24rpx;
  padding: 10rpx 24rpx;
}
.free-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
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
