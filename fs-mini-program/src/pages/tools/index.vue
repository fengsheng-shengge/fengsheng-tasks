<template>
  <view class="page">
    <!-- 头部 -->
    <view class="tools-header">
      <view class="tools-title">🛠️ 顾问工具箱</view>
      <view class="tools-sub">专业工具支持日常业务开展</view>
    </view>

    <!-- 工具网格 -->
    <view class="tools-grid">
      <view
        v-for="t in tools"
        :key="t.id"
        class="tool-card"
        :class="t.color"
        @tap="openTool(t)"
      >
        <view class="tool-icon">{{ t.icon }}</view>
        <view class="tool-name">{{ t.name }}</view>
        <view class="tool-desc">{{ t.desc }}</view>
        <view class="tool-arrow">›</view>
      </view>
    </view>

    <!-- 常用话术模板 -->
    <view class="template-section">
      <view class="section-label">💡 常用话术模板</view>
      <view class="template-list">
        <view class="template-item" v-for="(tp, i) in templates" :key="i" @tap="toast('话术模板 · 后续版本开放')">
          <view class="template-icon">{{ tp.icon }}</view>
          <view class="template-info">
            <view class="template-name">{{ tp.name }}</view>
            <view class="template-desc">{{ tp.desc }}</view>
          </view>
          <view class="template-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 数据说明 -->
    <view class="knowledge-notice">
      <view class="notice-title">📚 数据说明</view>
      <view class="notice-text">本工具箱内容持续扩充中，如有疑问请联系门店主管。租住类知识库仍在完善，感谢您的反馈。</view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      tools: [
        { id: 'kb', icon: '📖', name: '知识字典', desc: '真实行业词条，主动搜依据', color: 'green', path: '/pages/knowledge/index', tab: false },
        { id: 'assess', icon: '📊', name: '品质测评', desc: '7 维确认客户真需求', color: 'orange', path: '/pages/assess/index', tab: false },
        { id: 'cases', icon: '⭐', name: '案例灵感库', desc: '顶尖实战免费翻阅', color: 'gold', path: '/pages/cases/index', tab: false },
        { id: 'curate', icon: '💡', name: '我的策展库', desc: '历史顾问简报沉淀', color: 'blue', path: '/pages/curate/index', tab: true }
      ],
      templates: [
        { icon: '💬', name: '首次联系·自我介绍', desc: '标准开场白模板' },
        { icon: '🏡', name: '看房邀约话术', desc: '高效邀约客户看房' },
        { icon: '📊', name: '异议处理模板', desc: '客户常见异议应对' }
      ]
    }
  },
  methods: {
    openTool(t) {
      if (t.tab) uni.switchTab({ url: t.path })
      else uni.navigateTo({ url: t.path })
    },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) }
  }
}
</script>
