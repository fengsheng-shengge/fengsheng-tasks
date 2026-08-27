<template>
  <view class="page">
    <!-- 搜索 -->
    <view class="search-wrap">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          placeholder="搜索客户姓名、标签或需求"
          :value="searchKey"
          @input="onSearch"
          confirm-type="search"
        />
        <text v-if="searchKey" class="search-clear" @tap="clearSearch">✕</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <scroll-view class="filter-scroll" scroll-x>
      <view
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ active: filterTab === tab.key }"
        :data-key="tab.key"
        @tap="onFilter"
      >{{ tab.label }}</view>
    </scroll-view>

    <!-- 客户列表 -->
    <view class="customer-list">
      <view v-if="filteredCustomers.length === 0" class="empty-state">
        <view class="empty-icon">👥</view>
        <view class="empty-title">暂无客户</view>
        <view class="empty-desc">点击右下角添加新客户</view>
      </view>

      <view
        v-for="c in filteredCustomers"
        :key="c.id"
        class="customer-card"
        @tap="openClient(c.id)"
      >
        <view class="customer-header">
          <view class="customer-avatar" :style="{ background: c.avatarColor }">{{ c.avatar }}</view>
          <view class="customer-info">
            <view class="customer-name">{{ c.name }}</view>
            <view class="customer-meta">
              <text class="tag" :class="'tag-' + c.businessColor">{{ c.businessIcon }} {{ c.businessTypeName }}</text>
              <text class="follow-date">{{ c.lastFollow }}</text>
            </view>
          </view>
          <view class="customer-arrow">›</view>
        </view>
        <view class="customer-note" v-if="c.note">{{ c.note }}</view>
        <view class="customer-tags" v-if="c.tags.length">
          <text v-for="(tag, idx) in c.tags" :key="idx" class="tag tag-cream">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- 反馈入口 -->
    <view class="feedback-entry" @tap="goFeedback">
      <text class="feedback-ic">💬</text>
      <view class="feedback-info">
        <view class="feedback-title">客户反馈</view>
        <view class="feedback-desc">查看客户反应与建议</view>
      </view>
      <view class="feedback-badge" v-if="feedbackCount > 0">{{ feedbackCount }}</view>
    </view>

    <!-- 添加按钮 -->
    <view class="fab-btn" @tap="addClient">
      <text class="fab-icon">+</text>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'
import { inferServiceLine, SERVICE_LINE_MAP, SERVICE_LINE_COLORS } from '../../utils/mot'
const PALETTE = ['#3D5A3E', '#C46A3A', '#9c7c3a', '#5E7291']
export default {
  data() {
    return {
      searchKey: '',
      filterTab: 'all',
      filterTabs: [
        { key: 'all', label: '全部' },
        { key: 'buy', label: '购房' },
        { key: 'sell', label: '售房' },
        { key: 'rent', label: '租住' },
        { key: 'host', label: '出租托管' },
        { key: 'decor', label: '家装' },
        { key: 'aging', label: '适老' },
        { key: 'elderly', label: '养老' },
        { key: 'asset', label: '资产' },
        { key: 'replace', label: '置换' }
      ]
    }
  },
  computed: {
    userStore() { return useUserStore() },
    feedbackCount() {
      let n = 0
      this.userStore.clients.forEach(c => { n += (c.feedbacks || []).length })
      return n
    },
    list() {
      return (this.userStore.clients || []).map((c, i) => {
        const lineKey = inferServiceLine(c)
        const meta = SERVICE_LINE_MAP[lineKey] || { icon: '🏠', name: '购房' }
        const colorMap = SERVICE_LINE_COLORS
        return {
          id: c.id,
          name: c.name || '客户',
          avatar: (c.name || '客')[0],
          avatarColor: PALETTE[i % PALETTE.length],
          businessColor: colorMap[lineKey] || 'green',
          businessIcon: meta.icon,
          businessTypeName: meta.name,
          typeKey: lineKey,
          lastFollow: c.lastFollow || '今天跟进',
          note: c.note || (c.brief ? '已生成顾问简报' : ''),
          tags: c.tags || (c.serviceLine ? [meta.name] : [])
        }
      })
    },
    filteredCustomers() {
      const k = this.searchKey.trim()
      return this.list.filter(c => {
        if (this.filterTab !== 'all' && c.typeKey !== this.filterTab) return false
        if (k) {
          const hay = (c.name + ' ' + c.tags.join(' ') + ' ' + (c.note || '')).toLowerCase()
          if (!hay.includes(k.toLowerCase())) return false
        }
        return true
      })
    }
  },
  onShow() {
    trackPageview('clients')
    // 支持从首页待办跳转聚焦某客户
    if (this.userStore.focusClientId) {
      const id = this.userStore.focusClientId
      this.userStore.focusClientId = null
      this.openClient(id)
    }
  },
  methods: {
    onSearch(e) { this.searchKey = (e.detail && e.detail.value) || '' },
    clearSearch() { this.searchKey = '' },
    onFilter(e) { this.filterTab = e.currentTarget.dataset.key },
    openClient(id) { uni.navigateTo({ url: '/pages/clients/detail?id=' + id }) },
    addClient() { uni.navigateTo({ url: '/pages/clients/edit' }) },
    goFeedback() { uni.navigateTo({ url: '/pages/clients/feedback' }) },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) }
  }
}
</script>
