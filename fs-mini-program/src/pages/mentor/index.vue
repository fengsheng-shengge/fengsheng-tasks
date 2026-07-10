<template>
  <view class="page">
    <view class="chat-header">
      <view class="header-title">开单导师</view>
      <view class="header-sub">租赁开单陪练</view>
    </view>

    <scroll-view class="chat-body" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role === 'user' ? 'msg-right' : 'msg-left']">
        <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-bot']">
          <text class="msg-text">{{ msg.content }}</text>
        </view>
      </view>
      <view v-if="loading" class="msg-row msg-left">
        <view class="msg-bubble bubble-bot">
          <text class="msg-text typing">思考中...</text>
        </view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <input
        class="chat-input"
        v-model="inputText"
        placeholder="问我任何开单问题..."
        confirm-type="send"
        @confirm="sendMessage"
        :disabled="loading"
      />
      <view class="send-btn" :class="{ active: inputText.trim() && !loading }" @click="sendMessage">
        发送
      </view>
    </view>

    <view class="footer">
      <text class="footer-icp">京ICP备2026041809号</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      messages: [
        { role: 'bot', content: '你好！我是风声开单导师，专注租赁业务陪练。告诉我你遇到的开单难题，我来帮你分析。' }
      ],
      inputText: '',
      loading: false,
      conversationId: '',
      scrollTop: 0,
    }
  },
  methods: {
    async sendMessage() {
      const text = this.inputText.trim()
      if (!text || this.loading) return

      this.messages.push({ role: 'user', content: text })
      this.inputText = ''
      this.loading = true
      this.scrollToBottom()

      try {
        const res = await uni.request({
          url: 'https://fengsheng.tech/mentor-api/chat',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: {
            message: text,
            conversation_id: this.conversationId || undefined,
            user_id: uni.getStorageSync('fs_user_id') || 'mini_user',
          },
          responseType: 'text',
        })

        // Parse SSE stream - extract answer content
        let fullText = ''
        const rawData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        const lines = rawData.split('\n')
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim()
            if (dataStr === '[DONE]') continue
            try {
              const json = JSON.parse(dataStr)
              // Extract conversation_id
              if (json.conversation_id && !this.conversationId) {
                this.conversationId = json.conversation_id
              }
              // Extract answer from completed message
              if (json.type === 'answer' && json.content) {
                fullText += json.content
              }
              // Also check completed event with full content
              if (json.role === 'assistant' && json.type === 'answer' && json.content && !json.content.includes('delta')) {
                fullText = json.content
              }
            } catch {}
          }
        }

        this.messages.push({ role: 'bot', content: fullText || '抱歉，暂时无法回复，请稍后重试。' })
      } catch (e) {
        this.messages.push({ role: 'bot', content: '网络异常，请检查网络后重试。' })
      }

      this.loading = false
      this.scrollToBottom()
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = this.scrollTop + 999
      })
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f7f4ef; display: flex; flex-direction: column; }

.chat-header { background: #3d5a3e; padding: 24rpx 30rpx; }
.header-title { font-size: 36rpx; font-weight: 900; color: #fff; }
.header-sub { font-size: 24rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

.chat-body { flex: 1; padding: 20rpx; overflow-y: auto; }
.msg-row { display: flex; margin-bottom: 20rpx; }
.msg-left { justify-content: flex-start; }
.msg-right { justify-content: flex-end; }

.msg-bubble { max-width: 70%; padding: 20rpx 24rpx; border-radius: 20rpx; word-break: break-all; }
.bubble-bot { background: #fff; color: #333; border-bottom-left-radius: 6rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.bubble-user { background: #3d5a3e; color: #fff; border-bottom-right-radius: 6rpx; }
.msg-text { font-size: 28rpx; line-height: 1.6; }
.typing { color: #999; }

.input-bar { display: flex; align-items: center; padding: 16rpx 20rpx; background: #fff; border-top: 1rpx solid #eee; }
.chat-input { flex: 1; height: 72rpx; background: #f5f5f5; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.send-btn { margin-left: 16rpx; background: #ccc; color: #fff; font-size: 28rpx; font-weight: 700; padding: 14rpx 32rpx; border-radius: 36rpx; }
.send-btn.active { background: #3d5a3e; }

.footer { text-align: center; padding: 12rpx; background: #fff; }
.footer-icp { font-size: 20rpx; color: #bbb; }
</style>
