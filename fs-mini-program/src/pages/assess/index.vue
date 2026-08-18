<template>
  <view class="page">
    <view class="assess-tabs">
      <view class="assess-tab" :class="{ active: tab === 'a' }" @tap="tab = 'a'">品质测评</view>
      <view class="assess-tab" :class="{ active: tab === 'b' }" @tap="tab = 'b'">服务者测评</view>
    </view>

    <view class="assess-card" v-if="tab === 'a'">
      <view style="font-size:16px;font-weight:700">🏠 住得好测评</view>
      <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 14px;line-height:1.6">美好居住 7 维度评分：安全 / 健康 / 便利 / 经济 / 舒适 / 美观 / 自在</view>
      <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:14px"><text>⏱️ 5-8 分钟</text><text>📝 21 题</text><text>📊 雷达图报告</text></view>
      <button class="assess-btn" @tap="startLiving">开始测评</button>
    </view>

    <view class="assess-card" v-else>
      <view style="font-size:16px;font-weight:700">👤 服务者能力测评</view>
      <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 14px;line-height:1.6">5 维度能力评估：专业知识 / 服务规范 / 沟通能力 / 工具应用 / 职业素养</view>
      <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:14px"><text>⏱️ 10-15 分钟</text><text>📝 75 题</text><text>📊 能力雷达图</text></view>
      <button class="assess-btn" @tap="startService">开始测评</button>
    </view>

    <view class="note">两项测评均为自评，用于看清长短板、改进服务，结果仅存你本机。</view>
  </view>
</template>

<script>
import { trackPageview } from '../../utils/tracker'
export default {
  data() { return { tab: 'a' } },
  onShow() { trackPageview('assess') },
  methods: {
    startLiving() { uni.navigateTo({ url: '/pages/assess/quiz?type=living' }) },
    startService() { uni.navigateTo({ url: '/pages/assess/quiz?type=service' }) }
  }
}
</script>

<style scoped>
.page { padding: 16px 14px 30px; }
.assess-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.assess-tab { flex: 1; text-align: center; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 700; color: #8a857b; background: #fff; border: 1px solid #e7e0d4; }
.assess-tab.active { color: #fff; background: #3d5a3e; border-color: #3d5a3e; }
.assess-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 18px; }
.assess-btn { background: #3d5a3e; color: #fff; border-radius: 22px; font-size: 15px; font-weight: 700; padding: 12px; line-height: 1.2; margin: 0; }
.note { font-size: 11.5px; color: #b0a99e; line-height: 1.6; text-align: center; margin-top: 16px; }
</style>
