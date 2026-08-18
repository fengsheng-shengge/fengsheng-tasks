<template>
  <view class="page">
    <scroll-view class="body" scroll-y="true">
      <!-- 身份卡 -->
      <view class="id-card">
        <view class="id-avatar">{{ initial }}</view>
        <view class="id-info">
          <view class="id-name">{{ nickname }}</view>
          <view class="id-store">{{ store || '门店未填写' }}</view>
        </view>
        <view class="id-edit" @tap="goEdit">编辑</view>
      </view>
      <view class="id-slogan" v-if="slogan">「{{ slogan }}」</view>
      <view class="id-slogan empty" v-else @tap="goEdit">＋ 添加你的服务理念</view>

      <!-- 服务者能力测评 -->
      <view class="sec">
        <view class="sec-h">服务者能力测评</view>

        <block v-if="result">
          <view class="overall">
            <text class="overall-num">{{ overall.toFixed(1) }}</text>
            <text class="overall-max">/5 综合</text>
          </view>
          <view class="dim" v-for="d in dims" :key="d.key">
            <view class="dim-top"><text class="dim-name">{{ d.name }}</text><text class="dim-score">{{ (scores[d.key] || 0).toFixed(1) }}</text></view>
            <view class="dim-bar"><view class="dim-bar-in" :style="{ width: ((scores[d.key] || 0) / 5 * 100) + '%' }"></view></view>
          </view>
          <view class="advice">💡 提升建议：可优先补强「{{ lowNames }}」——对应人才字典五维，建议结合六大方法论与工具箱刻意练习。</view>
          <view class="re-take" @tap="goAssess">重新测评</view>
        </block>

        <block v-else>
          <view class="sec-b">完成一次服务者能力自评，看清专业、规范、沟通、工具、素养五个维度的长短板。</view>
          <button class="btn-green" @tap="goAssess">去测评（5 维 · 75 题）</button>
        </block>
      </view>

      <!-- 数据概览 -->
      <view class="sec">
        <view class="sec-h">我的数据</view>
        <view class="stat-row">
          <view class="stat"><text class="stat-num">{{ points }}</text><text class="stat-label">信任积分</text></view>
          <view class="stat"><text class="stat-num">{{ assessments }}</text><text class="stat-label">测评次数</text></view>
          <view class="stat"><text class="stat-num">{{ clients }}</text><text class="stat-label">客户数</text></view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { serviceDims } from '../../utils/assess-data.js'
import { trackPageview } from '../../utils/tracker'
export default {
  data() {
    return { dims: serviceDims, scores: {}, overall: 0, lowNames: '', result: false }
  },
  computed: {
    userStore() { return useUserStore() },
    nickname() { return this.userStore.nickname || '风声用户' },
    initial() { return (this.userStore.nickname || '风')[0] || '风' },
    store() { return this.userStore.brokerStore || '' },
    slogan() { return this.userStore.brokerSlogan || '' },
    points() { return this.userStore.points || 0 },
    assessments() { return (this.userStore.assessments || []).length },
    clients() { return (this.userStore.clients || []).length }
  },
  onShow() {
    trackPageview('profile_career')
    this.loadResult()
  },
  onLoad() {
    if (!this.userStore._initialized) this.userStore.initFromStorage()
  },
  methods: {
    loadResult() {
      try {
        const r = uni.getStorageSync('fs_last_assess')
        if (r && r.type === 'service' && r.scores) {
          this.scores = r.scores
          const vals = this.dims.map(d => r.scores[d.key] || 0)
          this.overall = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
          const low = this.dims.map(d => ({ name: d.name, s: r.scores[d.key] || 0 })).sort((a, b) => a.s - b.s).slice(0, 2)
          this.lowNames = low.map(x => x.name).join('、')
          this.result = true
        } else {
          this.result = false
        }
      } catch (e) { this.result = false }
    },
    goEdit() { uni.navigateTo({ url: '/pages/profile/edit' }) },
    goAssess() { uni.navigateTo({ url: '/pages/assess/quiz?type=service' }) }
  }
}
</script>

<style>
.page { height: 100vh; background: #f7f4ef; box-sizing: border-box; }
.body { height: 100%; padding: 16px; box-sizing: border-box; }
.id-card { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 16px; }
.id-avatar { width: 48px; height: 48px; border-radius: 50%; background: #3d5a3e; color: #fff; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.id-info { flex: 1; }
.id-name { font-size: 16px; font-weight: 800; color: #2b2b2b; }
.id-store { font-size: 12px; color: #9a9a9a; margin-top: 4px; }
.id-edit { font-size: 13px; color: #c46a3a; padding: 6px 12px; border: 1px solid #e7d3c2; border-radius: 8px; }
.id-slogan { margin: 10px 2px 0; font-size: 13px; color: #3d5a3e; font-style: italic; line-height: 1.6; }
.id-slogan.empty { color: #b0a99e; font-style: normal; }
.sec { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 16px; margin-top: 12px; }
.sec-h { font-size: 14px; font-weight: 800; color: #3d5a3e; margin-bottom: 12px; }
.sec-b { font-size: 13px; color: #555; line-height: 1.7; margin-bottom: 12px; }
.overall { display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px; }
.overall-num { font-size: 30px; font-weight: 800; color: #c46a3a; }
.overall-max { font-size: 12px; color: #b0a99e; }
.dim { margin-bottom: 10px; }
.dim-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
.dim-name { font-size: 13px; color: #3d5a3e; }
.dim-score { font-size: 13px; font-weight: 700; color: #c46a3a; }
.dim-bar { height: 8px; background: #f0ece2; border-radius: 5px; overflow: hidden; }
.dim-bar-in { height: 100%; background: linear-gradient(90deg, #c46a3a, #3d5a3e); }
.advice { font-size: 12.5px; color: #555; line-height: 1.7; background: #f7f4ef; border: 1px dashed #d9cfbe; border-radius: 10px; padding: 12px; margin-top: 8px; }
.re-take { text-align: center; font-size: 13px; color: #c46a3a; margin-top: 12px; }
.btn-green { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin: 0; line-height: 1.2; }
.stat-row { display: flex; }
.stat { flex: 1; text-align: center; }
.stat-num { display: block; font-size: 22px; font-weight: 800; color: #3d5a3e; }
.stat-label { font-size: 11px; color: #9a9a9a; }
</style>
