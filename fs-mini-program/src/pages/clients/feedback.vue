<template>
  <view class="page">
    <view class="head">
      <text class="head-t">客户反馈</text>
      <text class="head-s">见面后客户真实的反应与建议 · 共 {{ list.length }} 条</text>
    </view>

    <view class="empty" v-if="list.length === 0">
      <view class="empty-ic">💬</view>
      <view class="empty-t">暂无反馈</view>
      <view class="empty-d">在客户档案里记录「见面反馈」，会出现在这里</view>
    </view>

    <scroll-view class="body" scroll-y="true" v-else>
      <view class="fb" v-for="(f, i) in list" :key="i" @tap="open(f.clientId)">
        <view class="fb-top">
          <text class="fb-client">{{ f.clientName }}</text>
          <text class="fb-mood" v-if="f.mood">{{ f.mood }}</text>
          <text class="fb-time">{{ f.time }}</text>
        </view>
        <view class="fb-content">{{ f.content }}</view>
        <view class="fb-action" v-if="f.action">➡️ {{ f.action }}</view>
      </view>
      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'
export default {
  data() { return { list: [] } },
  computed: {
    userStore() { return useUserStore() }
  },
  onShow() {
    trackPageview('clients_feedback')
    this.load()
  },
  onLoad() {
    if (!this.userStore._initialized) this.userStore.initFromStorage()
  },
  methods: {
    fmt(ts) {
      const d = new Date(ts)
      const p = n => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    load() {
      const arr = []
      ;(this.userStore.clients || []).forEach(c => {
        ;(c.feedbacks || []).forEach(fb => {
          arr.push({
            clientId: c.id,
            clientName: c.name || '客户',
            mood: fb.mood || '',
            content: fb.content || '',
            action: fb.action || '',
            time: this.fmt(fb.at)
          })
        })
      })
      arr.sort((a, b) => (b.time < a.time ? -1 : 1))
      this.list = arr
    },
    open(id) { uni.navigateTo({ url: '/pages/clients/edit?clientId=' + id }) }
  }
}
</script>

<style>
.page { height: 100vh; background: #f7f4ef; box-sizing: border-box; display: flex; flex-direction: column; }
.head { padding: 16px 16px 10px; }
.head-t { display: block; font-size: 17px; font-weight: 800; color: #2b2b2b; }
.head-s { display: block; font-size: 12px; color: #9a9a9a; margin-top: 4px; }
.body { flex: 1; padding: 0 16px; box-sizing: border-box; }
.fb { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.fb-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.fb-client { font-size: 14px; font-weight: 700; color: #3d5a3e; }
.fb-mood { font-size: 11px; color: #c46a3a; background: #f7f4ef; border-radius: 6px; padding: 2px 8px; }
.fb-time { font-size: 11px; color: #b0a99e; margin-left: auto; }
.fb-content { font-size: 13px; color: #444; line-height: 1.6; }
.fb-action { font-size: 12px; color: #3d5a3e; margin-top: 6px; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-ic { font-size: 44px; opacity: .5; }
.empty-t { font-size: 15px; color: #555; margin-top: 10px; }
.empty-d { font-size: 12px; color: #9a9a9a; margin-top: 6px; }
.bottom-space { height: 20px; }
</style>
