<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" :value="kw" placeholder="搜客户问题 / 处理办法 / 法条" confirm-type="search"
        @input="onKw" @confirm="doSearch" />
      <text class="search-btn" @tap="doSearch">搜索</text>
    </view>

    <!-- 域模式：域标题 + 计数 -->
    <view v-if="mode === 'domain'" class="domain-head">
      <text class="dh-name">{{ domainName }}</text>
      <text class="dh-count">{{ total > 0 ? total + ' 个方案' : '' }}</text>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="state">⏳ 加载中…</view>
    <view v-else-if="error" class="state error">{{ error }}</view>
    <!-- 搜索模式无关键词时：显示搜索引导（区别于真正搜到 0 条） -->
    <view v-else-if="mode === 'search' && !kw && !entries.length" class="state search-tip">
      <view>🔍 输入客户问题搜索处理方案</view>
      <view style="font-size:11px;color:#aaa;margin-top:6px">如：独家委托到期、包过户没办成、房东扣押金…</view>
    </view>
    <view v-else-if="!entries.length" class="state">暂无方案</view>

    <!-- 方案卡片列表：客户问题 → 直接结论 → 处理要点 → 话术 → 红线 → 法源 -->
    <view class="sol-card" v-for="e in entries" :key="e.id">
      <!-- 头部：客户问题（结论性提问） -->
      <view class="sc-q">
        <text class="sc-qmark">问</text>
        <text class="sc-qtx">{{ e.consumerQ || e.name }}</text>
        <text class="sc-type" v-if="typeLabel(e)">{{ typeLabel(e) }}</text>
      </view>

      <!-- 直接结论（一句话） -->
      <view class="sc-ans" v-if="oneLine(e)">
        <text class="sc-anslab">答</text>
        <text class="sc-anstx">{{ oneLine(e) }}</text>
      </view>

      <!-- 展开详情：怎么处理 + 话术 + 红线 + 依据 -->
      <view class="sc-full" v-if="e._open">
        <!-- 处理要点 -->
        <view class="blk" v-if="cp(e).length">
          <view class="blk-h">💡 怎么处理</view>
          <view class="cp-item" v-for="(c, i) in cp(e)" :key="i"><text class="cp-dot"></text>{{ c }}</view>
        </view>
        <!-- 结论性说明 -->
        <view class="blk" v-if="e.def"><view class="blk-h">📌 结论依据</view><view class="blk-b">{{ e.def }}</view></view>
        <!-- 话术：说给客户听 -->
        <view class="blk" v-if="speech(e).length">
          <view class="blk-h">🗣️ 这么跟客户说</view>
          <view class="sp-item" v-for="(s, i) in speech(e)" :key="i"><text class="sp-ico">“</text>{{ s }}</view>
        </view>
        <!-- 红线：不能做的事 -->
        <view class="blk" v-if="redline(e).length">
          <view class="blk-h">🚫 千万别这么做</view>
          <view class="rl-item" v-for="(r, i) in redline(e)" :key="i">· {{ r }}</view>
        </view>
        <!-- 法源 -->
        <view class="blk" v-if="e.legalRef">
          <view class="blk-h">⚖ 依据</view>
          <view class="blk-b">{{ e.legalRef }}</view>
        </view>
        <view class="blk" v-if="e.source"><view class="blk-h">来源</view><view class="blk-b">{{ e.source }}</view></view>
        <view class="blk" v-if="e.lastVerified"><view class="blk-h">校验</view><view class="blk-b">{{ e.lastVerified }}</view></view>
      </view>

      <view class="sc-foot" @tap="toggle(e)">
        <text class="sc-openbtn">{{ e._open ? '收起 ▲' : '查看处理方案 ▼' }}</text>
      </view>
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
    oneLine(e) { return e.oneLineAnswer || e.ola || '' },
    // 话术：拼上消费向的话术（专业/共情）
    speech(e) {
      const ps = e.posSpeech || {}
      const out = []
      if (ps.professional) out.push(ps.professional)
      if (ps.empathy) out.push(ps.empathy)
      return out
    },
    // 红线：警示 + 禁区
    redline(e) {
      const ns = e.negSpeech || {}
      const out = []
      if (ns.warning) out.push(ns.warning)
      if (ns.redline) out.push(ns.redline)
      return out
    },
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

/* 方案卡片：客户问题 → 结论 → 处理 → 话术 → 红线 → 法源 */
.sol-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 13px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(61,90,62,0.05); }
.sc-q { display: flex; align-items: flex-start; gap: 7px; }
.sc-qmark { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: #3d5a3e; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.sc-qtx { flex: 1; font-size: 14.5px; font-weight: 700; color: #2b2b2b; line-height: 1.45; }
.sc-type { flex-shrink: 0; font-size: 10px; padding: 2px 7px; border-radius: 6px; background: #f0ece2; color: #888; }
.sc-ans { display: flex; align-items: flex-start; gap: 7px; margin-top: 8px; background: #eef3ec; border-radius: 9px; padding: 8px 10px; }
.sc-anslab { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: #c46a3a; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.sc-anstx { flex: 1; font-size: 12.5px; color: #3d5a3e; font-weight: 600; line-height: 1.55; }

.sc-full { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ece7dc; }
.sc-full .blk { margin-bottom: 9px; }
.sc-full .blk-h { font-size: 12px; font-weight: 700; color: #3d5a3e; margin-bottom: 4px; }
.sc-full .blk-b { font-size: 12.5px; color: #555; line-height: 1.65; }
.cp-item { display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; color: #555; line-height: 1.6; padding: 2px 0; }
.cp-dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #c46a3a; margin-top: 7px; }
.sp-item { display: flex; align-items: flex-start; gap: 5px; font-size: 12.5px; color: #444; line-height: 1.6; padding: 2px 0; }
.sp-ico { flex-shrink: 0; font-size: 14px; color: #c46a3a; font-weight: 800; line-height: 1.35; }
.rl-item { font-size: 12.5px; color: #a23a2e; line-height: 1.6; padding: 2px 0; }
.sc-foot { margin-top: 8px; }
.sc-openbtn { font-size: 12px; color: #c46a3a; font-weight: 700; }
.load-more, .load-end { text-align: center; font-size: 13px; padding: 14px 0; }
.load-more { color: #3d5a3e; font-weight: 700; }
.load-end { color: #bbb; }
</style>
