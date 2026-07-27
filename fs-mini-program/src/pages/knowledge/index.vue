<template>
  <view class="page">
    <view class="knowledge-banner">
      <view><text style="font-size:18px;font-weight:700">风声知识底座</text></view>
      <view style="font-size:12px;opacity:.85;line-height:1.5;margin-top:6px">7 域 104 条行业词条（真实口径，非估算）</view>
    </view>
    <view class="section-header"><text class="section-title">业务词典</text></view>
    <view class="dict-grid">
      <view class="dict-card" v-for="(d, i) in domains" :key="i" @tap="toast(d.name + ' ' + d.count + '（模拟）')">
        <view class="dict-icon">{{ d.icon }}</view>
        <view class="dict-name">{{ d.name }}</view>
        <view class="dict-count">{{ d.count }}</view>
      </view>
    </view>
    <view class="icp">词条口径经小鱼儿全量核对（#111）<view>数据校对 5 步链路 · 禁止凭印象</view></view>
  </view>
</template>

<script>
import { knowledgeDomains } from '../../utils/v4data.js'
export default {
  data() { return { domains: knowledgeDomains } },
  methods: { toast(m) { uni.showToast({ title: m, icon: 'none' }) } }
}
</script>
