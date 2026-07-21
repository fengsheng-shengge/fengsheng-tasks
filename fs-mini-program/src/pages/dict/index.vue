<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">&#x1F50D;</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索词条或别名..."
          placeholder-style="color: #bbb;"
          @input="onSearchInput"
          @confirm="doSearch"
          confirm-type="search"
        />
        <text v-if="searchKeyword" class="search-clear" @click="clearSearch">&#x2715;</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tags">
          <view
            v-for="tag in domainTags"
            :key="tag.value"
            :class="['filter-tag', { active: activeDomain === tag.value }]"
            @click="switchDomain(tag.value)"
          >
            {{ tag.label }}
          </view>
        </view>
      </scroll-view>
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tags">
          <view
            v-for="tag in toolTypeTags"
            :key="tag.value"
            :class="['filter-tag', 'tool-tag', { active: activeToolType === tag.value }]"
            @click="switchToolType(tag.value)"
          >
            {{ tag.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <text class="stats-text">共 {{ filteredEntries.length }} 个词条</text>
      <text v-if="activeDomain || activeToolType" class="stats-reset" @click="resetFilters">清除筛选</text>
    </view>

    <!-- 词条列表 -->
    <view class="entry-list">
      <view
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="entry-card"
        @click="goDetail(entry.id)"
      >
        <view class="entry-card-left">
          <view class="entry-term">{{ entry.name }}</view>
          <view class="entry-meta">
            <text class="entry-domain">{{ domainLabel(entry.domain) }}</text>
            <text class="entry-divider">|</text>
            <text class="entry-tool-type">{{ entry.srcType }}</text>
          </view>
        </view>
        <view class="entry-card-right">
          <view class="entry-strength" :class="strengthClass(entry.severity)">
            {{ severityLabel(entry.severity) }}
          </view>
          <text class="entry-arrow">&gt;</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredEntries.length === 0" class="empty-state">
        <text class="empty-icon">&#x1F4DA;</text>
        <text class="empty-text">没有找到匹配的词条</text>
        <text class="empty-hint">试试其他关键词或筛选条件</text>
      </view>
    </view>

    <!-- 底部 ICP -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { track } from '../../utils/tracker'

// 域中文映射
const DOMAIN_LABEL_MAP = {
  daodejing: '道德经',
  trade: '交易',
  rental: '租赁',
  decor: '装修',
  homekeep: '家政',
  policy: '政策',
  talent: '人才',
  'quality-customer': '客户品质',
  'quality-server': '服务品质',
  stage: '阶段',
  dimension: '维度'
}

const domainLabel = (d) => DOMAIN_LABEL_MAP[d] || d || ''

// 严重程度中文标签（hard=硬性约束 / soft=软性建议）
const severityLabel = (s) => {
  const v = (s || '').toLowerCase()
  if (v === 'hard') return '硬性'
  if (v === 'soft') return '软性'
  return s || ''
}

// 域筛选标签（value 为 entries.json 中实际的 domain 值）
const domainTags = [
  { label: '全部', value: '' },
  { label: '道德经', value: 'daodejing' },
  { label: '交易', value: 'trade' },
  { label: '租赁', value: 'rental' },
  { label: '装修', value: 'decor' },
  { label: '家政', value: 'homekeep' },
  { label: '政策', value: 'policy' },
  { label: '人才', value: 'talent' },
  { label: '客户品质', value: 'quality-customer' },
  { label: '服务品质', value: 'quality-server' },
  { label: '阶段', value: 'stage' },
  { label: '维度', value: 'dimension' }
]

// 来源类型筛选标签（value 为 entries.json 中实际的 srcType 值）
const toolTypeTags = [
  { label: '全部类型', value: '' },
  { label: '经典智慧', value: '经典智慧' },
  { label: '法律', value: '法律' },
  { label: '行政法规', value: '行政法规' },
  { label: '部门规章', value: '部门规章' },
  { label: '国家标准', value: '国家标准' },
  { label: '行业标准', value: '行业标准' },
  { label: '政策文件', value: '政策文件' },
  { label: '风声原创', value: '风声原创' }
]

const searchKeyword = ref('')
const activeDomain = ref('')
const activeToolType = ref('')
const allEntries = ref([])
const searchAliases = ref([])

// 加载词条数据
const loadEntries = () => {
  try {
    // entries.json 是数组（不是对象），直接赋值即可
    const data = require('../../data/entries.json')
    allEntries.value = Array.isArray(data) ? data : []
  } catch {
    // 硬编码兜底（结构与 entries.json 一致）
    allEntries.value = [
      {
        id: 'DDJ-001',
        domain: 'daodejing',
        name: '天道规律',
        alias: '顺势而为、市场规律',
        def: '市场的规律不以个人意志转移——供需决定价格，信息差决定效率，信任决定成交。服务者要顺势而非逆势。',
        source: '《道德经》第十六章',
        srcType: '经典智慧',
        attrs: '规律认知+顺势思维',
        scene: '市场波动判断、价格策略制定',
        posSpeech: '【专业版】市场供需关系是价格的根本决定因素。【共情版】别跟市场对着干，顺势才能成。',
        negSpeech: '【专业版】违反市场规律的操作必然失败。',
        consumerQ: '为什么我的房子卖不出去？',
        simpleAnswer: '市场有自己的节奏，顺势调整比硬扛更聪明。',
        consumerBenefit: '不跟市场较劲，省下的是时间和心情',
        severity: 'soft'
      },
      {
        id: 'TRD-001',
        domain: 'trade',
        name: '真房源',
        alias: '真实房源、假房源',
        def: '真房源是指房源信息真实存在、真实在售、真实价格、真实图片的房源。',
        source: '《房地产经纪管理办法》',
        srcType: '部门规章',
        attrs: '真实性+合规',
        scene: '房源发布、客户带看',
        posSpeech: '【专业版】所有发布房源均经过核验。',
        negSpeech: '【专业版】发布虚假房源属违规行为。',
        consumerQ: '网上房源是真的吗？',
        simpleAnswer: '正规平台会对房源进行核验，建议选择承诺真房源的平台。',
        consumerBenefit: '不被假房源浪费时间',
        severity: 'hard'
      },
      {
        id: 'RNT-001',
        domain: 'rental',
        name: '长租公寓',
        alias: '品牌公寓、集中式公寓',
        def: '长租公寓是由专业机构运营、集中管理的租赁住房产品。',
        source: '《住房租赁条例》',
        srcType: '行政法规',
        attrs: '集中运营+标准化服务',
        scene: '租房选择、租约签订',
        posSpeech: '【专业版】长租公寓提供标准化服务与维修响应。',
        negSpeech: '【专业版】警惕租金贷等违规收费。',
        consumerQ: '长租公寓好不好？',
        simpleAnswer: '长租公寓服务标准化，但要警惕租金贷和隐形收费。',
        consumerBenefit: '省心但要防坑',
        severity: 'hard'
      }
    ]
  }
}

// 加载搜索别名
const loadAliases = () => {
  try {
    const data = require('../../data/search_aliases.json')
    // search_aliases.json 是对象 { version, generated, searchAliases: [...] }
    searchAliases.value = (data && data.searchAliases) || []
  } catch {
    searchAliases.value = []
  }
}

// 通过别名查找 entryId 列表
const findByAlias = (keyword) => {
  const ids = []
  searchAliases.value.forEach(a => {
    if (a.aliases && a.aliases.some(al => al.includes(keyword))) {
      ids.push(a.id)
    }
  })
  return ids
}

// 筛选后的词条列表
const filteredEntries = computed(() => {
  let result = allEntries.value

  // 域筛选
  if (activeDomain.value) {
    result = result.filter(e => e.domain === activeDomain.value)
  }

  // 来源类型筛选（srcType 可能是组合值，用 includes 匹配）
  if (activeToolType.value) {
    result = result.filter(e => e.srcType && e.srcType.includes(activeToolType.value))
  }

  // 关键词搜索（支持词条名、别名、定义、来源类型匹配）
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim()
    const aliasEntryIds = findByAlias(kw)

    result = result.filter(e => {
      // 词条名匹配
      if (e.name && e.name.includes(kw)) return true
      // 别名匹配（entry.alias 为字符串）
      if (e.alias && e.alias.includes(kw)) return true
      // 定义匹配
      if (e.def && e.def.includes(kw)) return true
      // 搜索别名表匹配
      if (aliasEntryIds.includes(e.id)) return true
      // 域匹配
      if (e.domain && e.domain.includes(kw)) return true
      // 来源类型匹配
      if (e.srcType && e.srcType.includes(kw)) return true
      return false
    })
  }

  return result
})

// 严重程度样式（hard=硬性 / soft=软性）
const strengthClass = (strength) => {
  const v = (strength || '').toLowerCase()
  if (v === 'hard') return 'strength-high'
  if (v === 'soft') return 'strength-mid'
  return 'strength-low'
}

// 搜索处理
const onSearchInput = () => {
  // 实时过滤通过 computed 自动处理
}

const doSearch = () => {
  // 确认搜索时触发搜索
}

const clearSearch = () => {
  searchKeyword.value = ''
}

// 切换域筛选
const switchDomain = (value) => {
  activeDomain.value = activeDomain.value === value ? '' : value
}

// 切换工具类型筛选
const switchToolType = (value) => {
  activeToolType.value = activeToolType.value === value ? '' : value
}

// 重置筛选
const resetFilters = () => {
  activeDomain.value = ''
  activeToolType.value = ''
  searchKeyword.value = ''
}

// 跳转词条详情（带埋点 P0-02）
const goDetail = (entryId) => {
  track.contentClick(entryId, 'entry', 'dictionary')
  uni.navigateTo({
    url: `/pages/dict/entry-detail?entryId=${entryId}`
  })
}

onLoad(() => {
  loadEntries()
  loadAliases()
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/dict/index')
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 搜索栏 */
.search-bar {
  padding: 20rpx 24rpx;
  background: #ffffff;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f7f4ef;
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.search-clear {
  font-size: 28rpx;
  color: #bbb;
  padding: 4rpx 12rpx;
}

/* 筛选区域 */
.filter-section {
  background: #ffffff;
  padding: 0 24rpx 20rpx;
}

.filter-scroll {
  white-space: nowrap;
  margin-bottom: 12rpx;
}

.filter-scroll:last-child {
  margin-bottom: 0;
}

.filter-tags {
  display: flex;
  gap: 14rpx;
}

.filter-tag {
  display: inline-block;
  font-size: 24rpx;
  color: #666;
  background: #f7f4ef;
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-tag.active {
  background: #3d5a3e;
  color: #ffffff;
}

.tool-tag.active {
  background: #c46a3a;
  color: #ffffff;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 32rpx;
}

.stats-text {
  font-size: 24rpx;
  color: #999;
}

.stats-reset {
  font-size: 24rpx;
  color: #c46a3a;
  font-weight: 600;
}

/* 词条列表 */
.entry-list {
  padding: 0 24rpx;
}

.entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: transform 0.2s;
}

.entry-card:active {
  transform: scale(0.98);
}

.entry-card-left {
  flex: 1;
}

.entry-term {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 8rpx;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.entry-domain {
  font-size: 22rpx;
  color: #c46a3a;
  background: #fff3ed;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.entry-divider {
  font-size: 20rpx;
  color: #ddd;
}

.entry-tool-type {
  font-size: 22rpx;
  color: #888;
}

.entry-card-right {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.entry-strength {
  font-size: 20rpx;
  font-weight: 700;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
}

.strength-high {
  background: #e8f5e9;
  color: #3d5a3e;
}

.strength-mid {
  background: #fff8e1;
  color: #f57c00;
}

.strength-low {
  background: #fce4ec;
  color: #c62828;
}

.entry-arrow {
  font-size: 28rpx;
  color: #ccc;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #bbb;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 30rpx 20rpx 40rpx;
}

.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>