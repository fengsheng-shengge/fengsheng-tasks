<template>
  <view class="page">
    <view class="knowledge-banner">
      <view><text style="font-size:18px;font-weight:700">风声知识底座</text></view>
      <view style="font-size:12px;opacity:.85;line-height:1.5;margin-top:6px">词典 · 测评 · 案例，随时查阅（真实口径，非估算）</view>
    </view>

    <!-- 三模块分段切换 -->
    <view class="kg-tabs">
      <view class="kg-tab" :class="{ on: mod === 'dict' }" @tap="setMod('dict')">业务词典</view>
      <view class="kg-tab" :class="{ on: mod === 'assess' }" @tap="setMod('assess')">品质测评</view>
      <view class="kg-tab" :class="{ on: mod === 'cases' }" @tap="setMod('cases')">案例灵感</view>
    </view>

    <!-- 模块一：业务词典 -->
    <view v-if="mod === 'dict'">
      <view class="section-header"><text class="section-title">业务词典</text><text class="section-more">7 域 104 条</text></view>
      <view class="dict-grid">
        <view class="dict-card" v-for="(d, i) in domains" :key="i" @tap="toast(d.name + ' ' + d.count + '（模拟）')">
          <view class="dict-icon">{{ d.icon }}</view>
          <view class="dict-name">{{ d.name }}</view>
          <view class="dict-count">{{ d.count }}</view>
        </view>
      </view>
      <view class="icp">词条口径经全量核对（#111）<view>数据校对 5 步链路 · 禁止凭印象</view></view>
    </view>

    <!-- 模块二：品质测评 -->
    <view v-if="mod === 'assess'">
      <view class="section-header"><text class="section-title">品质测评</text><text class="section-more">已完成 {{ assessCount }} 次</text></view>
      <view class="kg-card">
        <view style="font-size:16px;font-weight:700">🏠 住得好测评</view>
        <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 12px;line-height:1.6">美好居住 7 维度评分：安全 / 健康 / 便利 / 经济 / 舒适 / 美观 / 自在</view>
        <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:12px"><text>⏱️ 5-8 分钟</text><text>📝 21 题</text><text>📊 雷达图报告</text></view>
        <button class="kg-btn" @tap="goAssess">开始测评</button>
      </view>
      <view class="kg-card">
        <view style="font-size:16px;font-weight:700">👤 服务者能力测评</view>
        <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 12px;line-height:1.6">5 维度能力评估：专业知识 / 服务规范 / 沟通能力 / 工具应用 / 职业素养</view>
        <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:12px"><text>⏱️ 10-15 分钟</text><text>📝 75 题</text><text>📊 能力雷达图</text></view>
        <button class="kg-btn" @tap="goAssess">开始测评</button>
      </view>
    </view>

    <!-- 模块三：案例灵感（预览 + 进完整页筛选） -->
    <view v-if="mod === 'cases'">
      <view class="section-header"><text class="section-title">案例灵感库</text><text class="section-more">{{ caseList.length }} 个 · 全部免费</text></view>
      <view class="kg-case" v-for="c in casePreview" :key="c.id" @tap="toggleCase(c)">
        <view class="kg-case-tags">
          <text class="kg-tag">{{ c.role }}</text><text class="kg-tag">{{ c.scene }}</text><text class="kg-tag">{{ c.mtd }}</text>
        </view>
        <view class="kg-case-title">{{ c.title }}</view>
        <view class="kg-case-preview">{{ c.preview }}</view>
        <view class="kg-case-full" v-if="c._open">
          <view class="blk"><view class="blk-h">背景</view><view class="blk-b">{{ c.full.bg }}</view></view>
          <view class="blk"><view class="blk-h">做法</view><view class="blk-b">{{ c.full.do }}</view></view>
          <view class="blk"><view class="blk-h">关键点</view><view class="blk-b">{{ c.full.key }}</view></view>
          <view class="blk"><view class="blk-h">可复用工具 / 话术</view><view class="blk-b">{{ c.full.tool }}</view></view>
        </view>
        <view class="kg-case-foot"><text class="kg-case-openbtn">{{ c._open ? '收起 ▲' : '展开全文 ▼' }}</text></view>
      </view>
      <button class="kg-btn block" @tap="goCases">查看全部 {{ caseList.length }} 个案例（按客户类型 / 场景筛选）›</button>
    </view>
  </view>
</template>

<script>
import { knowledgeDomains, casesData } from '../../utils/v4data.js'
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      mod: 'dict',
      domains: knowledgeDomains,
      caseList: casesData.map(c => ({ ...c, _open: false }))
    }
  },
  computed: {
    userStore() { return useUserStore() },
    assessCount() { return this.userStore.assessments.length },
    casePreview() { return this.caseList.slice(0, 3) }
  },
  methods: {
    setMod(m) { this.mod = m },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) },
    goAssess() { uni.navigateTo({ url: '/pages/assess/index' }) },
    goCases() { uni.navigateTo({ url: '/pages/cases/index' }) },
    toggleCase(c) { c._open = !c._open }
  }
}
</script>

<style scoped>
.knowledge-banner { background: linear-gradient(135deg,#3d5a3e,#4d7050); color:#fff; border-radius:14px; padding:16px; margin-bottom:14px; }
.kg-tabs { display:flex; gap:8px; background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:5px; margin-bottom:14px; }
.kg-tab { flex:1; text-align:center; font-size:14px; font-weight:700; color:#888; padding:9px 0; border-radius:9px; }
.kg-tab.on { background:#3d5a3e; color:#fff; }
.kg-card { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:14px; margin-bottom:12px; }
.kg-btn { background:#3d5a3e; color:#fff; border:none; border-radius:999px; padding:11px 18px; font-size:14px; font-weight:700; }
.kg-btn.block { width:100%; margin-top:6px; }
.kg-case { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:13px; margin-bottom:10px; }
.kg-case-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
.kg-tag { font-size:11px; padding:2px 8px; border-radius:6px; background:#f0ece2; color:#888; }
.kg-case-title { font-size:15px; font-weight:700; color:#2b2b2b; }
.kg-case-preview { font-size:12.5px; color:#666; margin-top:4px; line-height:1.5; }
.kg-case-full { margin-top:8px; }
.kg-case-full .blk { margin-bottom:8px; }
.kg-case-full .blk-h { font-size:12px; font-weight:700; color:#3d5a3e; margin-bottom:2px; }
.kg-case-full .blk-b { font-size:12.5px; color:#555; line-height:1.6; }
.kg-case-foot { margin-top:6px; }
.kg-case-openbtn { font-size:12px; color:#c46a3a; font-weight:700; }
</style>
