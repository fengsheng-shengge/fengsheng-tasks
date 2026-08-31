<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" :value="kw" placeholder="搜索词条 / 问题 / 法条" confirm-type="search"
        @input="onKw" @confirm="doSearch" />
      <text class="search-btn" @tap="doSearch">搜索</text>
    </view>

    <!-- 域模式：域标题 + 计数 -->
    <view v-if="mode === 'domain'" class="domain-head">
      <text class="dh-name">{{ domainName }}</text>
      <text class="dh-count">{{ total > 0 ? total + ' 条' : '' }}</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">⏳ 加载中…</view>
    <view v-else-if="error" class="state">{{ error }}</view>
    <view v-else-if="!entries.length" class="state">暂无词条</view>

    <!-- 词条列表 -->
    <view class="entry-card" v-for="e in entries" :key="e.id" @tap="toggle(e)">
      <view class="ec-top">
        <text class="ec-name">{{ e.name }}</text>
        <text class="ec-type" v-if="typeLabel(e)">{{ typeLabel(e) }}</text>
      </view>
      <view class="ec-ans" v-if="e.oneLineAnswer">{{ e.oneLineAnswer }}</view>
      <view class="ec-ref" :class="{ real: isRealLegal(e.legalRef) }">
        {{ isRealLegal(e.legalRef) ? '⚖ ' + e.legalRef : '依据整理中' }}
      </view>

      <!-- 展开详情 -->
      <view class="ec-full" v-if="e._open">
        <view class="blk" v-if="e.def"><view class="blk-h">释义</view><view class="blk-b">{{ e.def }}</view></view>
        <view class="blk" v-if="e.consumerQ"><view class="blk-h">客户常问</view><view class="blk-b">{{ e.consumerQ }}</view></view>
        <view class="blk" v-if="cp(e).length">
          <view class="blk-h">关键点</view>
          <view class="cp-item" v-for="(c, i) in cp(e)" :key="i">· {{ c }}</view>
        </view>
        <view class="blk" v-if="e.source"><view class="blk-h">来源</view><view class="blk-b">{{ e.source }}</view></view>
        <view class="blk" v-if="e.lastVerified"><view class="blk-h">校验</view><view class="blk-b">{{ e.lastVerified }}</view></view>
      </view>
      <view class="ec-foot" v-if="e.def || cp(e).length"><text class="ec-openbtn">{{ e._open ? '收起 ▲' : '展开全文 ▼' }}</text></view>
    </view>

    <!-- 域模式：加载更多 -->
    <view v-if="mode === 'domain' && hasMore" class="load-more" @tap="loadMore">
      {{ loadingMore ? '加载中…' : '加载更多' }}
    </view>
    <view v-else-if="mode === 'domain' && entries.length" class="load-end">已加载全部</view>
  </view>
</template>

<script>
import { API_BASE, isRealLegal, fetchDomainEntries, searchEntries } from '../../utils/dict.js'
import { trackPageview, trackEvent } from '../../utils/tracker'

const TYPE_LABEL = { LAW: '法条', PROC: '流程', RISK: '风险', CASE: '案例', STD: '标准', POL: '政策', TERM: '术语' }
const PAGE_SIZE = 200

export default {
  data() {
    return {
      mode: 'domain',       // domain | search
      domainKey: '',
      domainName: '',
      kw: '',
      entries: [],
      total: 0,
      offset: 0,
      hasMore: false,
      loading: false,
      loadingMore: false,
      error: ''
    }
  },
  methods: {
    isRealLegal,
    onKw(e) { this.kw = e.detail.value },
    cp(e) { return Array.isArray(e.corePoint) ? e.corePoint : (e.corePoint ? [e.corePoint] : []) },
    typeLabel(e) { return TYPE_LABEL[e.entryType] || '' },
    toggle(e) { e._open = !e._open },
    async loadDomain() {
      this.loading = true
      this.error = ''
      try {
        const resp = await fetchDomainEntries(this.domainKey, 0, PAGE_SIZE)
        const list = (resp.entries || []).map(e => ({ ...e, _open: false }))
        this.entries = list
        this.total = resp.total || list.length
        this.offset = list.length
        this.hasMore = this.entries.length < this.total
      } catch (e) {
        this.error = '加载失败，请检查网络后重试'
      }
      this.loading = false
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      try {
        const resp = await fetchDomainEntries(this.domainKey, this.offset, PAGE_SIZE)
        const list = (resp.entries || []).map(e => ({ ...e, _open: false }))
        this.entries = this.entries.concat(list)
        this.offset += list.length
        this.hasMore = this.entries.length < this.total
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
      this.loadingMore = false
    },
    async doSearch() {
      const q = (this.kw || '').trim()
      if (q.length < 2) { uni.showToast({ title: '请输入至少 2 个字', icon: 'none' }); return }
      this.mode = 'search'
      this.loading = true
      this.error = ''
      this.entries = []
      try {
        const resp = await searchEntries(q)
        this.entries = (resp.results || []).map(e => ({ ...e, _open: false }))
        this.total = resp.total || this.entries.length
        trackEvent('dict_search', 'knowledge', { q })
      } catch (e) {
        this.error = '搜索失败，请稍后再试'
      }
      this.loading = false
    }
  },
  onLoad(options) {
    this.kw = options.q || ''
    if (options.domain) {
      this.mode = 'domain'
      this.domainKey = options.domain
      this.domainName = options.name ? decodeURIComponent(options.name) : options.domain
      this.loadDomain()
    } else if (this.kw) {
      this.mode = 'search'
      this.doSearch()
    }
  },
  onShow() { trackPageview('knowledge-domain') }
}
</script>

<style scoped>
.page { padding: 12px 14px 24px; }
.search-bar { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e7e0d4; border-radius: 999px; padding: 6px 6px 6px 14px; margin-bottom: 14px; }
.search-input { flex: 1; font-size: 14px; }
.search-btn { background: #3d5a3e; color: #fff; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 999px; }
.domain-head { display: flex; align-items: baseline; gap: 8px; margin: 2px 0 12px; }
.dh-name { font-size: 17px; font-weight: 700; color: #2b2b2b; }
.dh-count { font-size: 12px; color: #999; }
.state { text-align: center; color: #999; font-size: 13px; padding: 40px 0; }
.entry-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 13px; margin-bottom: 10px; }
.ec-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ec-name { font-size: 15px; font-weight: 700; color: #2b2b2b; flex: 1; }
.ec-type { font-size: 10px; padding: 2px 7px; border-radius: 6px; background: #f0ece2; color: #888; }
.ec-ans { font-size: 12.5px; color: #555; margin-top: 5px; line-height: 1.5; }
.ec-ref { font-size: 11px; margin-top: 6px; color: #c8956d; }
.ec-ref.real { color: #3d5a3e; }
.ec-full { margin-top: 8px; }
.ec-full .blk { margin-bottom: 8px; }
.ec-full .blk-h { font-size: 12px; font-weight: 700; color: #3d5a3e; margin-bottom: 2px; }
.ec-full .blk-b { font-size: 12.5px; color: #555; line-height: 1.6; }
.cp-item { font-size: 12.5px; color: #555; line-height: 1.7; }
.ec-foot { margin-top: 6px; }
.ec-openbtn { font-size: 12px; color: #c46a3a; font-weight: 700; }
.load-more, .load-end { text-align: center; font-size: 13px; padding: 14px 0; }
.load-more { color: #3d5a3e; font-weight: 700; }
.load-end { color: #bbb; }
</style>
