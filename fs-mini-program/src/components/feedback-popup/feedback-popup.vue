<template>
  <view class="fp-mask" v-if="show" @tap="close">
    <view class="fp-sheet" @tap.stop>
      <view class="fp-head">
        <text class="fp-title">意见反馈</text>
        <text class="fp-x" @tap="close">✕</text>
      </view>
      <view class="fp-sub">用得不顺？缺功能？想说啥都行，我们逐条看。</view>

      <!-- 评分 -->
      <view class="fp-rate">
        <text class="fp-label">总体感受</text>
        <view class="fp-stars">
          <text
            v-for="i in 5"
            :key="i"
            class="fp-star"
            :class="{ on: rating >= i }"
            @tap="setRating(i)">★</text>
        </view>
        <text class="fp-rate-txt" v-if="rateText">{{ rateText }}</text>
      </view>

      <!-- 内容 -->
      <view class="fp-field">
        <textarea
          class="fp-ta"
          v-model="content"
          :maxlength="200"
          placeholder="比如：生成简报时有点卡 / 想要 XX 功能 / 某个词条看不懂…"
          placeholder-class="fp-ph" />
        <text class="fp-count">{{ content.length }}/200</text>
      </view>

      <!-- 联系方式 -->
      <view class="fp-field">
        <input
          class="fp-in"
          v-model="contact"
          placeholder="选填：手机号 / 微信号，方便我们回访"
          placeholder-class="fp-ph" />
      </view>

      <button class="fp-btn" :class="{ off: !canSubmit }" :disabled="submitting || !canSubmit" @tap="submit">
        {{ submitting ? '提交中…' : '提交反馈' }}
      </button>
      <view class="fp-note">风声团队会认真读每一条 · 选填联系方式可获回访</view>
    </view>
  </view>
</template>

<script>
import { trackEvent } from '../../utils/tracker'

const BASE = 'https://fengsheng.tech'

// 复用 tracker 的匿名 uid（同源关联），无则生成同格式
function fbUid() {
  try {
    let u = uni.getStorageSync('fs_track_uid')
    if (!u) {
      u = 'mp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      uni.setStorageSync('fs_track_uid', u)
    }
    return u
  } catch (e) {
    return 'mp_anon'
  }
}

export default {
  name: 'FeedbackPopup',
  props: {
    show: { type: Boolean, default: false },
    // 触发来源页（埋点用）：home / profile 等
    source: { type: String, default: 'mini' }
  },
  data() {
    return { rating: 0, content: '', contact: '', submitting: false }
  },
  computed: {
    rateText() {
      const map = ['', '很不满意', '不太满意', '一般', '满意', '很满意']
      return map[this.rating] || ''
    },
    canSubmit() {
      return this.rating > 0 && this.content.trim().length > 0 && !this.submitting
    }
  },
  watch: {
    show(v) {
      if (v) {
        this.rating = 0
        this.content = ''
        this.contact = ''
        this.submitting = false
        trackEvent('feedback_open', this.source, {})
      }
    }
  },
  methods: {
    setRating(i) { this.rating = i },
    close() { this.$emit('update:show', false) },
    submit() {
      if (!this.canSubmit) return
      this.submitting = true
      // 联系方式选填：并入 content（后端 /api/feedback 仅存 content+rating，不单独存 contact）
      const final = this.contact.trim()
        ? (this.content.trim() + '｜联系方式:' + this.contact.trim())
        : this.content.trim()
      try {
        uni.request({
          url: BASE + '/api/feedback',
          method: 'POST',
          data: {
            uid: fbUid(),
            type: 'reply_submit',
            product: 'mini-program',
            rating: this.rating,
            content: final
          },
          success: (res) => {
            this.submitting = false
            if (res && res.data && res.data.ok) {
              trackEvent('feedback_submit', this.source, { rating: this.rating })
              uni.showToast({ title: '反馈已收到，感谢！', icon: 'success' })
              this.$emit('update:show', false)
              this.$emit('submitted', { rating: this.rating })
            } else {
              uni.showToast({ title: '提交失败，请重试', icon: 'none' })
            }
          },
          fail: () => {
            this.submitting = false
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          }
        })
      } catch (e) {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.fp-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, .45);
  z-index: 200;
  display: flex; align-items: flex-end;
}
.fp-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.fp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.fp-title { font-size: 34rpx; font-weight: 800; color: var(--text-primary, #1f2a24); }
.fp-x { font-size: 36rpx; color: var(--text-tertiary, #9a9a9a); padding: 4rpx 8rpx; }
.fp-sub { font-size: 24rpx; color: var(--text-secondary, #555); margin-bottom: 24rpx; }
.fp-rate { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.fp-label { font-size: 26rpx; font-weight: 700; color: var(--text-primary, #1f2a24); }
.fp-stars { display: flex; gap: 8rpx; }
.fp-star { font-size: 44rpx; color: #ddd; line-height: 1; }
.fp-star.on { color: #f5a623; }
.fp-rate-txt { font-size: 24rpx; color: var(--orange, #c46a3a); font-weight: 700; }
.fp-field { position: relative; margin-bottom: 16rpx; }
.fp-ta {
  width: 100%; height: 160rpx;
  background: var(--cream, #faf7f0);
  border: 2rpx solid var(--border, #ede5d6);
  border-radius: 16rpx;
  padding: 20rpx; box-sizing: border-box;
  font-size: 26rpx; color: var(--text-primary, #1f2a24);
}
.fp-ph { color: #b5b0a6; font-size: 24rpx; }
.fp-count { position: absolute; right: 16rpx; bottom: 12rpx; font-size: 20rpx; color: var(--text-tertiary, #9a9a9a); }
.fp-in {
  width: 100%; height: 80rpx;
  background: var(--cream, #faf7f0);
  border: 2rpx solid var(--border, #ede5d6);
  border-radius: 16rpx;
  padding: 0 20rpx; box-sizing: border-box;
  font-size: 26rpx; color: var(--text-primary, #1f2a24);
}
.fp-btn {
  margin-top: 12rpx;
  height: 88rpx; line-height: 88rpx;
  background: var(--green, #3d5a3e); color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx; font-weight: 700;
  text-align: center;
}
.fp-btn::after { border: none; }
.fp-btn.off { opacity: .45; }
.fp-note { margin-top: 14rpx; text-align: center; font-size: 22rpx; color: var(--text-tertiary, #9a9a9a); }
</style>
