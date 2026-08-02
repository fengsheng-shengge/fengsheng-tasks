<template>
  <view class="page">
    <view class="assess-tabs">
      <view class="assess-tab" :class="{ active: tab === 'living' }" @tap="tab = 'living'">住得好测评</view>
      <view class="assess-tab" :class="{ active: tab === 'service' }" @tap="tab = 'service'">服务者测评</view>
    </view>

    <view class="assess-card" v-if="tab === 'living'">
      <view class="ac-title">🏠 住得好测评</view>
      <view class="ac-desc">美好居住 7 维度自评：安全 / 健康 / 便利 / 经济 / 舒适 / 美观 / 自在</view>
      <view class="ac-meta"><text>⏱️ 5-8 分钟</text><text>📝 21 题</text><text>📊 七维雷达图</text></view>
      <button class="assess-btn" @tap="start('living')">开始测评</button>
    </view>

    <view class="assess-card" v-else>
      <view class="ac-title">👤 服务者能力测评</view>
      <view class="ac-desc">5 维度能力自评：专业 / 规范 / 沟通 / 工具 / 素养</view>
      <view class="ac-meta"><text>⏱️ 10-15 分钟</text><text>📝 75 题</text><text>📊 五维雷达图</text></view>
      <button class="assess-btn" @tap="start('service')">开始测评</button>
    </view>

    <view class="assess-note">真实测评 · 基于住得好七维与方法论五维框架 · 结果仅本地保存</view>
  </view>
</template>

<script>
export default {
  data() { return { tab: 'living' } },
  methods: {
    start(type) {
      uni.navigateTo({ url: '/pages/assess/quiz?type=' + type })
    }
  }
}
</script>

<style scoped>
.page { padding: 16px 14px 30px; }
.assess-tabs { display: flex; gap: 10px; margin-bottom: 16px; }
.assess-tab { flex: 1; text-align: center; padding: 10px; font-size: 14px; color: #8a837a; background: #fff; border-radius: 10px; border: 1px solid #e7e0d4; }
.assess-tab.active { color: #fff; background: #3d5a3e; border-color: #3d5a3e; font-weight: 700; }
.assess-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
.ac-title { font-size: 16px; font-weight: 700; color: #3d5a3e; }
.ac-desc { font-size: 12px; color: #8a837a; margin: 8px 0 14px; line-height: 1.6; }
.ac-meta { display: flex; gap: 12px; font-size: 11px; color: #b0a99e; margin-bottom: 14px; }
.assess-btn { background: #c46a3a; color: #fff; border-radius: 22px; font-size: 15px; font-weight: 700; padding: 12px; line-height: 1.2; }
.assess-btn:active { background: #b1542c; }
.assess-note { font-size: 11px; color: #b0a99e; text-align: center; line-height: 1.6; }
</style>
