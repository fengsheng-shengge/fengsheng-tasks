<template>
  <view class="page">
    <!-- 顶部话术库介绍 -->
    <view class="chat-header">
      <view class="header-top">
        <view class="header-left">
          <view class="mentor-avatar">
            <text class="avatar-icon">M</text>
          </view>
          <view class="header-info">
            <view class="header-title">开单话术库</view>
            <view class="header-sub">常见异议应对话术</view>
          </view>
        </view>
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
          <text class="msg-text">{{ msg.content }}</text>
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
        placeholder="输入客户异议关键词..."
        confirm-type="send"
        @confirm="handleSend"
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
import { ref, nextTick, onMounted } from 'vue'
import { track } from '../../utils/tracker'
import { onShow } from '@dcloudio/uni-app'

// 对话状态
const messages = ref([])
const inputText = ref('')
const scrollTop = ref(0)

// 静态话术库
const scriptLibrary = [
  {
    keywords: ['贵', '太贵', '价格', '多少钱', '便宜'],
    content: '客户说"太贵了"应对话术：\n\n1. 确认是预算不足还是觉得不值\n"理解您的顾虑，您是觉得总价超预算了，还是觉得这个价格不太值？"\n\n2. 拆持有成本\n"月供其实和您现在房租差不多，但这笔钱是存进自己房子里，不是给了房东。"\n\n3. 用数据锚定\n"这个小区同户型近90天成交均价在这个区间，这套定价是合理的。"',
  },
  {
    keywords: ['再看看', '考虑', '犹豫', '等等'],
    content: '客户说"再看看"应对话术：\n\n1. 理解不催\n"完全理解，买房是大事，多看看是对的。"\n\n2. 给留印象\n"这套房的核心优势是采光和动线，您看其他房时可以拿这个做参照。"\n\n3. 留跟进口子\n"我帮您把这套的六维测评发您，您对比着看，有疑问随时找我。"',
  },
  {
    keywords: ['家人', '商量', '老婆', '父母', '商量商量'],
    content: '客户说"要和家人商量"应对话术：\n\n1. 表示理解\n"应该的，买房是全家人的事。"\n\n2. 给可带走的对比卡\n"我帮您做了一份家庭版对比卡，把这套房的核心数据和您现在住的情况列在一起，方便家人一起看。"\n\n3. 预约全家看房\n"如果家人方便，可以一起来再看一次，我针对家人关心的点重点介绍。"',
  },
  {
    keywords: ['比较', '别家', '其他', '对比'],
    content: '客户说"去别家比较"应对话术：\n\n1. 不贬低竞品\n"多比较是好事，看得多心里才有底。"\n\n2. 给客观对比\n"我帮您做了一份房源对比表，把这套和同小区在售的另外两套放在一张表里，优劣势一目了然。"\n\n3. 留联系方式\n"您看完别的如果有疑问，随时问我，我帮您客观分析。"',
  },
]

const quickScenes = [
  { icon: '1', label: '客户说太贵了', prompt: '客户说这套房子太贵了' },
  { icon: '2', label: '客户犹豫不决', prompt: '客户一直犹豫不决' },
  { icon: '3', label: '客户说再考虑', prompt: '客户说再考虑考虑' },
  { icon: '4', label: '客户要比较', prompt: '客户说要去别家比较' },
]

// 初始化
onMounted(() => {
  loadChatHistory()
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'bot',
      content: '你好！我是风声开单话术库。选择下方场景或输入客户异议关键词，我来帮你匹配应对话术。',
    })
  }
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/mentor/index')
})

// 聊天历史持久化
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

// 匹配话术
function matchScript(text) {
  const lowerText = text.toLowerCase()
  for (const script of scriptLibrary) {
    for (const keyword of script.keywords) {
      if (lowerText.includes(keyword)) {
        return script.content
      }
    }
  }
  return null
}

// 发送消息
function handleSend() {
  const text = inputText.value.trim()
  if (!text) return

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  track.mentorMessageSent('free_input')
  saveChatHistory()
  scrollToBottom()

  // 静态话术匹配
  const matched = matchScript(text)
  if (matched) {
    messages.value.push({ role: 'bot', content: matched })
  } else {
    messages.value.push({
      role: 'bot',
      content: '暂时没有匹配到相关话术。你可以试试选择下方的常见场景，或者换个关键词搜索。',
    })
  }
  saveChatHistory()
  scrollToBottom()
}

function sendQuickScene(scene) {
  messages.value.push({ role: 'user', content: scene.prompt })
  track.mentorMessageSent('quick_scenario', scene.id || '')
  saveChatHistory()
  scrollToBottom()

  const matched = matchScript(scene.prompt)
  if (matched) {
    messages.value.push({ role: 'bot', content: matched })
  } else {
    messages.value.push({
      role: 'bot',
      content: '暂时没有匹配到相关话术，请换个场景试试。',
    })
  }
  saveChatHistory()
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value += 9999
  })
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
