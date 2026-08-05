<template>
  <view class="page">
    <view class="assess-tabs">
      <view class="assess-tab" :class="{ active: tab === 'a' }" @tap="tab = 'a'">品质测评</view>
      <view class="assess-tab" :class="{ active: tab === 'b' }" @tap="tab = 'b'">服务者测评</view>
    </view>
    <view class="assess-card">
      <view style="font-size:16px;font-weight:700">🏠 住得好测评</view>
      <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 14px;line-height:1.6">美好居住 7 维度评分：安全 / 健康 / 便利 / 经济 / 舒适 / 美观 / 自在</view>
      <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:14px"><text>⏱️ 5-8 分钟</text><text>📝 21 题</text><text>📊 雷达图报告</text></view>
      <button class="assess-btn" @tap="toast('测评 · 后续版本开放')">开始测评</button>
    </view>
    <view class="assess-card">
      <view style="font-size:16px;font-weight:700">👤 服务者能力测评</view>
      <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 14px;line-height:1.6">5 维度能力评估：专业知识 / 服务规范 / 沟通能力 / 工具应用 / 职业素养</view>
      <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:14px"><text>⏱️ 10-15 分钟</text><text>📝 75 题</text><text>📊 能力雷达图</text></view>
      <button class="assess-btn" @tap="toast('测评 · 后续版本开放')">开始测评</button>
    </view>
  </view>
</template>

<script>
export default {
  data() { return { tab: 'a' } },
  methods: { toast(m) { uni.showToast({ title: m, icon: 'none' }) } }
}
</script>
