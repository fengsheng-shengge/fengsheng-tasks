<template>
  <view class="page">
    <view class="knowledge-banner">
      <view><text style="font-size:18px;font-weight:700">知识字典</text></view>
      <view style="font-size:12px;opacity:.85;line-height:1.5;margin-top:6px">按业务场景主动检索真实词条，点「加入简报」调进客户报告当依据（真实口径，非估算）</view>
    </view>

    <!-- 三模块分段切换 -->
    <view class="kg-tabs">
      <view class="kg-tab" :class="{ on: mod === 'dict' }" @tap="setMod('dict')">业务词典</view>
      <view class="kg-tab" :class="{ on: mod === 'assess' }" @tap="setMod('assess')">品质测评</view>
      <view class="kg-tab" :class="{ on: mod === 'cases' }" @tap="setMod('cases')">案例灵感</view>
    </view>

    <!-- 模块一：业务词典（搜索条件 + 多维筛选） -->
    <view v-if="mod === 'dict'">
      <view class="search-row">
        <text class="s-ico">🔍</text>
        <input class="s-inp" :value="searchKw" @input="onKw" placeholder="搜关键词，如：物业、满五、贷款、学区、税" />
        <text v-if="searchKw" class="s-clear" @tap="clearKw">✕</text>
      </view>

      <!-- 多维搜索条件 -->
      <view class="facet">
        <view class="facet-h">用户类型</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="c in kbFacets.clientTypes" :key="c" :class="{ on: selClientTypes.includes(c) }" @tap="toggleFacet('selClientTypes', c)">{{ c }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">业务阶段</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="s in kbFacets.stages" :key="s" :class="{ on: selStages.includes(s) }" @tap="toggleFacet('selStages', s)">{{ s }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">业务域</view>
        <scroll-view class="facet-scroll" scroll-x="true">
          <view class="facet-chips">
            <text class="f-chip" v-for="d in kbFacets.domains" :key="d.key" :class="{ on: selDomains.includes(d.key) }" @tap="toggleFacet('selDomains', d.key)">{{ d.cn }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="facet">
        <view class="facet-h">工具类型</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="t in kbFacets.toolTypes" :key="t" :class="{ on: selToolTypes.includes(t) }" @tap="toggleFacet('selToolTypes', t)">{{ t }}</text>
        </view>
      </view>

      <view class="filter-bar">
        <text>命中 {{ results.length }} 条 · 已选 {{ selections.length }} 条</text>
        <text v-if="hasFilter" class="clear" @tap="clearFilter">清空条件</text>
      </view>

      <view class="kg-entry" v-for="(e, i) in results" :key="i">
        <view class="ke-top">
          <text class="ke-title">{{ e.title }}</text>
          <text class="ke-dom">{{ e.domainCn }}</text>
        </view>
        <view class="ke-tags" v-if="e.stage.length || e.toolType">
          <text class="ke-tag" v-for="(s, si) in e.stage" :key="'s'+si">{{ s }}</text>
          <text class="ke-tag tool" v-if="e.toolType">{{ e.toolType }}</text>
        </view>
        <view class="ke-sum">{{ e.summary }}</view>
        <view class="ke-foot">
          <text class="ke-src" v-if="e.src">来源：{{ e.src }}</text>
          <text class="ke-add" :class="{ on: isSel(e.id) }" @tap="toggleSel(e)">{{ isSel(e.id) ? '✓ 已加入' : '+ 加入简报' }}</text>
        </view>
      </view>

      <view v-if="results.length === 0" class="empty">没搜到，调一下上方搜索条件试试。</view>

      <view v-if="selections.length" class="sel-tray">
        <view class="st-top"><text>本次简报已选 {{ selections.length }} 条依据</text><text class="st-clear" @tap="clearSel">清空</text></view>
        <view class="st-list">
          <text class="st-item" v-for="(s, i) in selections" :key="i">{{ s.title }}</text>
        </view>
        <button class="btn-main" @tap="goGenerate">带这些依据，去生成顾问简报 →</button>
      </view>
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

    <!-- 模块三：案例灵感 -->
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
import { kbFacets, kbSearch } from '../../utils/knowledge-search.js'
import { casesData } from '../../utils/v4data.js'
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      mod: 'dict',
      kbFacets,
      kbSearch,
      searchKw: '',
      selClientTypes: [],
      selStages: [],
      selDomains: [],
      selToolTypes: [],
      results: kbSearch,
      selections: []
    }
  },
  computed: {
    userStore() { return useUserStore() },
    assessCount() { return this.userStore.assessments.length },
    caseList() { return casesData.map(c => ({ ...c, _open: false })) },
    casePreview() { return this.caseList.slice(0, 3) },
    hasFilter() {
      return this.selClientTypes.length || this.selStages.length || this.selDomains.length || this.selToolTypes.length || !!this.searchKw.trim()
    }
  },
  onShow() {
    this.selections = uni.getStorageSync('fs_brief_kb') || []
  },
  watch: {
    searchKw() { this.runFilter() }
  },
  methods: {
    setMod(m) { this.mod = m },
    onKw(e) { this.searchKw = (e.detail && e.detail.value) || (e.target && e.target.value) || '' },
    clearKw() { this.searchKw = ''; this.runFilter() },
    toggleFacet(arr, val) {
      const cur = this[arr]
      const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]
      this[arr] = next
      this.runFilter()
    },
    clearFilter() {
      this.selClientTypes = []
      this.selStages = []
      this.selDomains = []
      this.selToolTypes = []
      this.searchKw = ''
      this.runFilter()
    },
    runFilter() {
      const kw = this.searchKw.trim().toLowerCase()
      const ct = this.selClientTypes, st = this.selStages, dm = this.selDomains, tt = this.selToolTypes
      this.results = this.kbSearch.filter(e => {
        if (ct.length && !e.clientType.some(c => ct.includes(c))) return false
        if (st.length && !e.stage.some(s => st.includes(s))) return false
        if (dm.length && !dm.includes(e.domain)) return false
        if (tt.length && !tt.includes(e.toolType)) return false
        if (kw) {
          const hay = (e.title + ' ' + e.summary + ' ' + e.domainCn + ' ' + e.clientType.join(' ') + ' ' + e.stage.join(' ') + ' ' + e.toolType).toLowerCase()
          if (hay.indexOf(kw) < 0) return false
        }
        return true
      })
    },
    isSel(id) { return this.selections.some(s => s.id === id) },
    toggleSel(e) {
      const i = this.selections.findIndex(s => s.id === e.id)
      if (i >= 0) this.selections.splice(i, 1)
      else this.selections.push({ id: e.id, title: e.title })
      uni.setStorageSync('fs_brief_kb', this.selections)
    },
    clearSel() { this.selections = []; uni.setStorageSync('fs_brief_kb', []) },
    goGenerate() { uni.switchTab({ url: '/pages/curate/index' }) },
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
.search-row { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e7e0d4; border-radius:999px; padding:9px 14px; margin-bottom:12px; }
.s-ico { font-size:14px; }
.s-inp { flex:1; font-size:14px; color:#2b2b2b; }
.s-clear { color:#bbb; font-size:14px; padding:0 4px; }
.facet { margin-bottom:10px; }
.facet-h { font-size:12px; font-weight:700; color:#6b6359; margin:0 0 6px 2px; }
.facet-chips { display:flex; flex-wrap:wrap; gap:6px; }
.facet-scroll { white-space:nowrap; }
.facet-scroll .facet-chips { flex-wrap:nowrap; }
.f-chip { display:inline-block; font-size:12px; padding:6px 12px; border-radius:999px; background:#f7f4ef; border:1px solid #e7e0d4; color:#666; }
.f-chip.on { background:#3d5a3e; color:#fff; border-color:#3d5a3e; }
.filter-bar { display:flex; align-items:center; justify-content:space-between; font-size:12px; color:#999; margin:6px 2px 10px; }
.filter-bar .clear { color:#c46a3a; font-weight:700; }
.kg-entry { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:13px; margin-bottom:10px; }
.ke-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.ke-title { font-size:15px; font-weight:700; color:#2b2b2b; }
.ke-dom { font-size:11px; color:#c46a3a; background:#fbf6ee; padding:2px 8px; border-radius:6px; flex-shrink:0; }
.ke-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
.ke-tag { font-size:10.5px; color:#6b6359; background:#f0ece2; padding:2px 7px; border-radius:5px; }
.ke-tag.tool { color:#3d5a3e; background:#eef3ec; }
.ke-sum { font-size:12.5px; color:#555; margin-top:6px; line-height:1.6; }
.ke-foot { display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
.ke-src { font-size:11px; color:#a99; }
.ke-add { font-size:12px; font-weight:700; color:#3d5a3e; background:#eef3ec; padding:5px 12px; border-radius:999px; }
.ke-add.on { color:#fff; background:#3d5a3e; }
.empty { background:#fff; border:1px dashed #e7e0d4; border-radius:12px; padding:18px; text-align:center; color:#999; font-size:13px; margin-bottom:10px; }
.sel-tray { background:#fff8f0; border:1px solid #e7d3c2; border-radius:14px; padding:14px; margin:6px 0 14px; }
.st-top { display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:700; color:#2b2b2b; }
.st-clear { font-size:12px; color:#c46a3a; font-weight:700; }
.st-list { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0; }
.st-item { font-size:11px; color:#555; background:#fff; border:1px solid #e7e0d4; border-radius:6px; padding:3px 8px; }
.btn-main { background:#c46a3a; color:#fff; border:none; border-radius:999px; padding:12px; font-size:15px; font-weight:700; }
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
