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

      <!-- 9 组搜索条件（对齐网站版知识词典） -->
      <view class="facet">
        <view class="facet-h">① 用户类型</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="c in kbFacets.clientTypes" :key="c" :class="{ on: selClientTypes.includes(c) }" @tap="toggleFacet('selClientTypes', c)">{{ c }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">② 业务阶段（客户生命周期）</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="s in kbFacets.stages" :key="s" :class="{ on: selStages.includes(s) }" @tap="toggleFacet('selStages', s)">{{ s }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">③ 代码域</view>
        <scroll-view class="facet-scroll" scroll-x="true">
          <view class="facet-chips">
            <text class="f-chip" v-for="d in kbFacets.domains" :key="d.key" :class="{ on: selDomains.includes(d.key) }" @tap="toggleFacet('selDomains', d.key)">{{ d.cn }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="facet">
        <view class="facet-h">④ 业务职能域</view>
        <scroll-view class="facet-scroll" scroll-x="true">
          <view class="facet-chips">
            <text class="f-chip" v-for="s in kbFacets.sceneDomains" :key="s" :class="{ on: selSceneDomains.includes(s) }" @tap="toggleFacet('selSceneDomains', s)">{{ s }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="facet">
        <view class="facet-h">⑤ 知识层级（道法术器）</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="l in kbFacets.layers" :key="l" :class="{ on: selLayers.includes(l) }" @tap="toggleFacet('selLayers', l)">{{ l }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">⑥ 词条类型</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="t in kbFacets.entryTypes" :key="t" :class="{ on: selEntryTypes.includes(t) }" @tap="toggleFacet('selEntryTypes', t)">{{ t }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">⑦ 风险等级</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="s in kbFacets.severities" :key="s" :class="{ on: selSeverities.includes(s) }" @tap="toggleFacet('selSeverities', s)">{{ s }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">⑧ 优先级</view>
        <view class="facet-chips">
          <text class="f-chip" v-for="p in kbFacets.priorities" :key="p" :class="{ on: selPriorities.includes(p) }" @tap="toggleFacet('selPriorities', p)">{{ p }}</text>
        </view>
      </view>
      <view class="facet">
        <view class="facet-h">⑨ 业务场景</view>
        <scroll-view class="facet-scroll" scroll-x="true">
          <view class="facet-chips">
            <text class="f-chip" v-for="s in kbFacets.subScenes" :key="s" :class="{ on: selSubScenes.includes(s) }" @tap="toggleFacet('selSubScenes', s)">{{ s }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="filter-bar">
        <text>命中 {{ results.length }} 条 · 已选 {{ selections.length }} 条</text>
        <text v-if="hasFilter" class="clear" @tap="clearFilter">清空条件</text>
      </view>

      <view class="kg-entry" v-for="(e, i) in results" :key="i">
        <view class="ke-top">
          <text class="ke-title">{{ e.title }}</text>
          <text class="ke-dom" v-if="e.domainCn">{{ e.domainCn }}</text>
        </view>
        <view class="ke-tags">
          <text class="ke-tag layer" v-if="e.layer">{{ e.layer }}</text>
          <text class="ke-tag sev" :class="sevClass(e.severity)" v-if="e.severity">{{ e.severity }}</text>
          <text class="ke-tag pri" v-if="e.priority">{{ e.priority }}</text>
          <text class="ke-tag et" v-if="e.entryType">{{ e.entryType }}</text>
          <text class="ke-tag" v-for="(s, si) in e.stage" :key="'s'+si">{{ s }}</text>
          <text class="ke-tag" v-if="e.subScene">{{ e.subScene }}</text>
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
import { trackPageview } from '../../utils/tracker'
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
      selSceneDomains: [],
      selLayers: [],
      selEntryTypes: [],
      selSeverities: [],
      selPriorities: [],
      selSubScenes: [],
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
      return this.selClientTypes.length || this.selStages.length || this.selDomains.length || this.selToolTypes.length || this.selSceneDomains.length || this.selLayers.length || this.selEntryTypes.length || this.selSeverities.length || this.selPriorities.length || this.selSubScenes.length || !!this.searchKw.trim()
    }
  },
  onShow() {
    trackPageview('knowledge')
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
      this.selSceneDomains = []
      this.selLayers = []
      this.selEntryTypes = []
      this.selSeverities = []
      this.selPriorities = []
      this.selSubScenes = []
      this.searchKw = ''
      this.runFilter()
    },
    runFilter() {
      const kw = this.searchKw.trim().toLowerCase()
      const ct = this.selClientTypes, st = this.selStages, dm = this.selDomains, tt = this.selToolTypes
      const sd = this.selSceneDomains, ly = this.selLayers, et = this.selEntryTypes
      const sv = this.selSeverities, pr = this.selPriorities, ss = this.selSubScenes
      this.results = this.kbSearch.filter(e => {
        if (ct.length && !e.clientType.some(c => ct.includes(c))) return false
        if (st.length && !e.stage.some(s => st.includes(s))) return false
        if (dm.length && !dm.includes(e.domain)) return false
        if (tt.length && !tt.includes(e.toolType)) return false
        if (sd.length && (!e.sceneDomain || !sd.includes(e.sceneDomain))) return false
        if (ly.length && (!e.layer || !ly.includes(e.layer))) return false
        if (et.length && (!e.entryType || !et.includes(e.entryType))) return false
        if (sv.length && (!e.severity || !sv.includes(e.severity))) return false
        if (pr.length && (!e.priority || !pr.includes(e.priority))) return false
        if (ss.length && (!e.subScene || !ss.includes(e.subScene))) return false
        if (kw) {
          const hay = (e.title + ' ' + e.summary + ' ' + e.domainCn + ' ' + e.clientType.join(' ') + ' ' + e.stage.join(' ') + ' ' + e.subScene + ' ' + e.sceneDomain + ' ' + e.layer + ' ' + e.entryType).toLowerCase()
          if (hay.indexOf(kw) < 0) return false
        }
        return true
      })
    },
    sevClass(s) {
      if (s === '红线') return 'red'
      if (s === '提醒') return 'mid'
      return 'soft'
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
/* 套用 review 设计语言：墨绿/暖橙 VI + 14px 字号节奏，降噪放大 */
.knowledge-banner { background: linear-gradient(135deg, var(--green-deep), var(--green)); color:#fff; border-radius: var(--r-lg); padding: 36rpx 32rpx; margin: 0 0 24rpx; }
.knowledge-banner view:first-child { font-size: 36rpx; font-weight: 800; }
.knowledge-banner view:last-child { font-size: 24rpx; opacity:.85; line-height:1.6; margin-top:12rpx; }
.kg-tabs { display:flex; gap:12rpx; background:#fff; border:2rpx solid var(--border); border-radius: var(--r-md); padding:8rpx; margin-bottom:24rpx; }
.kg-tab { flex:1; text-align:center; font-size:26rpx; font-weight:700; color:var(--text-secondary); padding:16rpx 0; border-radius: var(--r-sm); }
.kg-tab.on { background: var(--green); color:#fff; }
.search-row { display:flex; align-items:center; gap:16rpx; background:#fff; border:3rpx solid var(--border); border-radius: var(--r-pill); padding:24rpx 28rpx; margin-bottom:24rpx; }
.s-ico { font-size:32rpx; }
.s-inp { flex:1; font-size:28rpx; color:var(--text-primary); }
.s-clear { color:var(--text-tertiary); font-size:28rpx; padding:0 8rpx; }
.facet { margin-bottom:24rpx; }
.facet-h { font-size:26rpx; font-weight:700; color:var(--text-secondary); margin:0 0 16rpx 4rpx; }
.facet-chips { display:flex; flex-wrap:wrap; gap:16rpx; }
.facet-scroll { white-space:nowrap; }
.facet-scroll .facet-chips { flex-wrap:nowrap; }
.f-chip { display:inline-block; font-size:24rpx; padding:14rpx 32rpx; border-radius: var(--r-pill); background:#fff; border:3rpx solid var(--border); color:var(--text-secondary); }
.f-chip.on { background: var(--green); color:#fff; border-color: var(--green); box-shadow: var(--shadow-accent); }
.filter-bar { display:flex; align-items:center; justify-content:space-between; font-size:24rpx; color:var(--text-tertiary); margin:8rpx 4rpx 16rpx; }
.filter-bar .clear { color:var(--orange); font-weight:700; }
.kg-entry { background:#fff; border:2rpx solid var(--border); border-radius: var(--r-lg); padding:32rpx; margin-bottom:20rpx; box-shadow: var(--shadow-sm); transition: transform .15s; }
.kg-entry:active { transform: scale(.99); }
.ke-top { display:flex; align-items:baseline; justify-content:space-between; gap:16rpx; }
.ke-title { font-size:30rpx; font-weight:800; color:var(--text-primary); }
.ke-dom { font-size:22rpx; color:var(--orange); background: var(--orange-bg); padding:6rpx 16rpx; border-radius: var(--r-sm); flex-shrink:0; }
.ke-tags { display:flex; flex-wrap:wrap; gap:10rpx; margin-top:16rpx; }
.ke-tag { font-size:22rpx; color:var(--text-secondary); background: var(--cream-dark); padding:6rpx 16rpx; border-radius: var(--r-sm); }
.ke-tag.tool { color:var(--green); background: var(--green-bg); }
.ke-tag.layer { color:#7a4a2a; background: var(--orange-bg); font-weight:700; }
.ke-tag.sev { color:#fff; }
.ke-tag.sev.red { background:#c0392b; }
.ke-tag.sev.mid { background:#d98b2b; }
.ke-tag.sev.soft { background:#5a8a5a; }
.ke-tag.pri { color:var(--green); background: var(--green-bg); }
.ke-tag.et { color:var(--text-secondary); background: var(--cream-dark); }
.ke-sum { font-size:26rpx; color:var(--text-secondary); margin-top:16rpx; line-height:1.7; }
.ke-foot { display:flex; align-items:center; justify-content:space-between; margin-top:20rpx; }
.ke-src { font-size:22rpx; color:var(--text-tertiary); }
.ke-add { font-size:24rpx; font-weight:700; color:var(--green); background: var(--green-bg); padding:12rpx 28rpx; border-radius: var(--r-pill); }
.ke-add.on { color:#fff; background: var(--green); }
.empty { background:#fff; border:2rpx dashed var(--border); border-radius: var(--r-lg); padding:48rpx 32rpx; text-align:center; color:var(--text-tertiary); font-size:26rpx; margin-bottom:20rpx; }
.sel-tray { background: var(--orange-bg); border:2rpx solid #f0cdba; border-radius: var(--r-lg); padding:32rpx; margin:16rpx 0 24rpx; }
.st-top { display:flex; align-items:center; justify-content:space-between; font-size:26rpx; font-weight:700; color:var(--text-primary); }
.st-clear { font-size:24rpx; color:var(--orange); font-weight:700; }
.st-list { display:flex; flex-wrap:wrap; gap:12rpx; margin:20rpx 0; }
.st-item { font-size:22rpx; color:var(--text-secondary); background:#fff; border:2rpx solid var(--border); border-radius: var(--r-sm); padding:8rpx 16rpx; }
.btn-main { background: linear-gradient(135deg, var(--orange), var(--orange-light)); color:#fff; border:none; border-radius: var(--r-md); padding:32rpx; font-size:32rpx; font-weight:800; box-shadow: var(--shadow-accent); }
.kg-card { background:#fff; border:2rpx solid var(--border); border-radius: var(--r-lg); padding:32rpx; margin-bottom:24rpx; }
.kg-btn { background: var(--green); color:#fff; border:none; border-radius: var(--r-pill); padding:24rpx 36rpx; font-size:28rpx; font-weight:700; }
.kg-btn.block { width:100%; margin-top:12rpx; }
.kg-case { background:#fff; border:2rpx solid var(--border); border-radius: var(--r-lg); padding:32rpx; margin-bottom:20rpx; }
.kg-case-tags { display:flex; flex-wrap:wrap; gap:12rpx; margin-bottom:16rpx; }
.kg-tag { font-size:22rpx; padding:6rpx 16rpx; border-radius: var(--r-sm); background: var(--cream-dark); color:var(--text-secondary); }
.kg-case-title { font-size:30rpx; font-weight:800; color:var(--text-primary); }
.kg-case-preview { font-size:26rpx; color:var(--text-secondary); margin-top:12rpx; line-height:1.6; }
.kg-case-full { margin-top:20rpx; }
.kg-case-full .blk { margin-bottom:20rpx; }
.kg-case-full .blk-h { font-size:26rpx; font-weight:700; color:var(--green); margin-bottom:8rpx; }
.kg-case-full .blk-b { font-size:26rpx; color:var(--text-secondary); line-height:1.7; }
.kg-case-foot { margin-top:12rpx; }
.kg-case-openbtn { font-size:24rpx; color:var(--orange); font-weight:700; }
</style>
