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
          <view class="entry-term">{{ entry.term }}</view>
          <view class="entry-meta">
            <text class="entry-domain">{{ entry.domain }}</text>
            <text class="entry-divider">|</text>
            <text class="entry-tool-type">{{ entry.toolType }}</text>
          </view>
        </view>
        <view class="entry-card-right">
          <view class="entry-strength" :class="strengthClass(entry.evidenceStrength)">
            {{ entry.evidenceStrength }}
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

// 域筛选标签
const domainTags = [
  { label: '全部', value: '' },
  { label: '房产交易', value: '房产交易' },
  { label: '租赁', value: '租赁' },
  { label: '金融', value: '金融' },
  { label: '装修', value: '装修' },
  { label: '物业', value: '物业' },
  { label: '社区', value: '社区' },
  { label: '政策', value: '政策' },
  { label: '其他', value: '其他' }
]

// 工具类型筛选标签
const toolTypeTags = [
  { label: '全部类型', value: '' },
  { label: '流程工具', value: '流程工具' },
  { label: '金融工具', value: '金融工具' },
  { label: '概念工具', value: '概念工具' }
]

const searchKeyword = ref('')
const activeDomain = ref('')
const activeToolType = ref('')
const allEntries = ref([])
const searchAliases = ref([])

// 加载词条数据
const loadEntries = () => {
  try {
    const data = require('../../data/entries.json')
    allEntries.value = data || []
  } catch {
    // 硬编码兜底
    allEntries.value = [
      {
        id: 'entry_001',
        term: '网签',
        domain: '房产交易',
        toolType: '流程工具',
        evidenceStrength: '高',
        understanding: '网签即网上签约，是指买卖双方在房地产管理部门的网上交易系统中签订房屋买卖合同的行为。',
        legalBasis: '《城市房地产管理法》第三十五条',
        fullCase: '某购房人在签约后，卖方以「家人不同意」为由拒绝配合网签。购房人持已签订的书面合同向法院起诉，法院认定书面合同具有法律效力。',
        agentMemo: '1. 签约前务必核实房源产权状态；2. 网签时确保合同金额与实际一致。'
      },
      {
        id: 'entry_002',
        term: '资金监管',
        domain: '房产交易',
        toolType: '流程工具',
        evidenceStrength: '高',
        understanding: '资金监管是指买卖双方将交易资金存入银行或第三方监管账户。',
        legalBasis: '《房地产经纪管理办法》第二十四条',
        fullCase: '买方支付100万首付款后，卖方用该笔资金偿还了个人债务，导致房屋无法过户。',
        agentMemo: '1. 无论是定金还是首付款，都建议走资金监管。'
      },
      {
        id: 'entry_003',
        term: '公积金贷款',
        domain: '金融',
        toolType: '金融工具',
        evidenceStrength: '高',
        understanding: '公积金贷款是指缴存住房公积金的职工享受的贷款，利率低于商业贷款。',
        legalBasis: '《住房公积金管理条例》第二十六条',
        fullCase: '客户王先生公积金账户余额3万元，采用组合贷方式，30年节省利息约18万元。',
        agentMemo: '1. 提前帮客户查询公积金可贷额度。'
      },
      {
        id: 'entry_004',
        term: '物业交割',
        domain: '物业',
        toolType: '流程工具',
        evidenceStrength: '中',
        understanding: '物业交割是指房屋过户后，买卖双方对房屋及其附属设施、费用等进行交接确认。',
        legalBasis: '《民法典》第五百九十八条',
        fullCase: '买方发现前业主欠缴物业费8000余元，物业公司拒绝办理过户手续。',
        agentMemo: '1. 提前1周预约物业交割时间。'
      },
      {
        id: 'entry_005',
        term: '租赁合同备案',
        domain: '租赁',
        toolType: '流程工具',
        evidenceStrength: '中',
        understanding: '租赁合同备案是指将房屋租赁合同在住房租赁监管平台进行登记备案。',
        legalBasis: '《商品房屋租赁管理办法》第十四条',
        fullCase: '租客小陈因租赁合同未备案，无法提供有效居住证明，孩子无法就近入学。',
        agentMemo: '1. 签约时主动提示租赁备案的好处和流程。'
      },
      {
        id: 'entry_006',
        term: '满五唯一',
        domain: '房产交易',
        toolType: '概念工具',
        evidenceStrength: '高',
        understanding: '「满五唯一」是指房屋持有满五年且为卖方家庭唯一住房，可免征个人所得税。',
        legalBasis: '财税〔2016〕23号文',
        fullCase: '买方看中一套房源，核实发现该房屋「满五唯一」，节省约10万元个税。',
        agentMemo: '1. 核实房产证满五年日期。'
      },
      {
        id: 'entry_007',
        term: '容积率',
        domain: '装修',
        toolType: '概念工具',
        evidenceStrength: '中',
        understanding: '容积率是指一个小区的地上总建筑面积与用地面积的比率。',
        legalBasis: '《城市居住区规划设计标准》（GB50180-2018）',
        fullCase: '客户在两个小区间犹豫，通过对比容积率选择了居住体验更好的小区。',
        agentMemo: '1. 容积率是衡量居住品质的重要指标。'
      },
      {
        id: 'entry_008',
        term: '共有产权房',
        domain: '政策',
        toolType: '概念工具',
        evidenceStrength: '高',
        understanding: '共有产权房是指政府与购房人按份共有产权的政策性商品住房。',
        legalBasis: '《关于试点城市发展共有产权住房的指导意见》（建保〔2014〕174号）',
        fullCase: '年轻夫妻预算80万，通过共有产权房以60万购得近郊两居室。',
        agentMemo: '1. 关注当地共有产权房申请条件。'
      }
    ]
  }
}

// 加载搜索别名
const loadAliases = () => {
  try {
    const data = require('../../data/search_aliases.json')
    searchAliases.value = data || []
  } catch {
    searchAliases.value = []
  }
}

// 通过别名查找 entryId 列表
const findByAlias = (keyword) => {
  const ids = []
  searchAliases.value.forEach(a => {
    if (a.alias.includes(keyword)) {
      ids.push(a.entryId)
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

  // 工具类型筛选
  if (activeToolType.value) {
    result = result.filter(e => e.toolType === activeToolType.value)
  }

  // 关键词搜索（支持词条名和别名匹配）
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim()
    const aliasEntryIds = findByAlias(kw)

    result = result.filter(e => {
      // 词条名匹配
      if (e.term.includes(kw)) return true
      // 别名匹配
      if (aliasEntryIds.includes(e.id)) return true
      // 域匹配
      if (e.domain.includes(kw)) return true
      // 工具类型匹配
      if (e.toolType.includes(kw)) return true
      return false
    })
  }

  return result
})

// 证据强度样式
const strengthClass = (strength) => {
  if (strength === '高') return 'strength-high'
  if (strength === '中') return 'strength-mid'
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

// 跳转词条详情
const goDetail = (entryId) => {
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