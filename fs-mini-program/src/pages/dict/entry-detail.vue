<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="!entry" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-if="entry">
      <!-- 词条头部 -->
      <view class="entry-header">
        <view class="entry-term">{{ entry.name }}</view>
        <view class="entry-meta-row">
          <text class="entry-domain-tag">{{ domainLabel(entry.domain) }}</text>
          <text class="entry-tool-tag">{{ entry.srcType }}</text>
          <text :class="['entry-strength-tag', strengthClass(entry.severity)]">
            {{ severityLabel(entry.severity) }}
          </text>
        </view>
      </view>

      <!-- 免费区域：专业理解 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">专业理解</text>
          <text class="section-badge free">免费</text>
        </view>
        <view class="section-content">
          <text class="content-text">{{ entry.def }}</text>
        </view>
      </view>

      <!-- 免费区域：出处来源 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">出处来源</text>
          <text class="section-badge free">免费</text>
        </view>
        <view class="section-content legal-content">
          <text class="content-text">{{ entry.source }}</text>
        </view>
      </view>

      <!-- 锁定区域：完整案例（5分） -->
      <view class="section locked-section">
        <view class="section-header">
          <text class="section-title">完整案例</text>
          <text v-if="fullCaseUnlocked" class="section-badge unlocked">已解锁</text>
          <text v-else class="section-badge locked">5 积分</text>
        </view>

        <view v-if="fullCaseUnlocked" class="section-content">
          <view v-if="entry.scene" class="case-block">
            <text class="case-label">场景应用</text>
            <text class="content-text case-text">{{ entry.scene }}</text>
          </view>
          <view v-if="entry.posSpeech" class="case-block">
            <text class="case-label">正面话术</text>
            <text class="content-text case-text">{{ entry.posSpeech }}</text>
          </view>
        </view>
        <view v-else class="locked-content" @click="unlockContent('fullCase', 5)">
          <view class="locked-overlay">
            <text class="locked-icon">🔒</text>
            <text class="locked-text">点击解锁（消耗 5 积分）</text>
            <text class="locked-hint">查看场景应用与正面话术，学习实战经验</text>
          </view>
        </view>
      </view>

      <!-- 锁定区域：经纪人备忘（3分） -->
      <view class="section locked-section">
        <view class="section-header">
          <text class="section-title">经纪人备忘</text>
          <text v-if="agentMemoUnlocked" class="section-badge unlocked">已解锁</text>
          <text v-else class="section-badge locked">3 积分</text>
        </view>

        <view v-if="agentMemoUnlocked" class="section-content memo-content">
          <view v-if="entry.attrs" class="case-block">
            <text class="case-label">属性标签</text>
            <text class="content-text memo-text">{{ entry.attrs }}</text>
          </view>
          <view v-if="entry.simpleAnswer" class="case-block">
            <text class="case-label">简明回答</text>
            <text class="content-text memo-text">{{ entry.simpleAnswer }}</text>
          </view>
        </view>
        <view v-else class="locked-content" @click="unlockContent('agentMemo', 3)">
          <view class="locked-overlay">
            <text class="locked-icon">🔒</text>
            <text class="locked-text">点击解锁（消耗 3 积分）</text>
            <text class="locked-hint">查看属性标签与简明回答，掌握要点</text>
          </view>
        </view>
      </view>

      <!-- 贡献入口 -->
      <view class="section">
        <view class="contribute-bar">
          <text class="contribute-title">觉得内容有误或想补充？</text>
          <view class="contribute-btns">
            <view class="contribute-btn" @click="contribute('correction')">
              <text class="contribute-btn-icon">✏️</text>
              <text class="contribute-btn-text">纠错</text>
            </view>
            <view class="contribute-btn" @click="contribute('verify')">
              <text class="contribute-btn-icon">✅</text>
              <text class="contribute-btn-text">验证</text>
            </view>
            <view class="contribute-btn" @click="contribute('question')">
              <text class="contribute-btn-icon">💬</text>
              <text class="contribute-btn-text">提问</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 底部 ICP -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'

const store = useUserStore()
const entry = ref(null)
const entryId = ref('')
const fullCaseUnlocked = ref(false)
const agentMemoUnlocked = ref(false)

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

// 加载词条详情
const loadEntry = (id) => {
  try {
    // entries.json 是数组
    const data = require('../../data/entries.json')
    const list = Array.isArray(data) ? data : []
    const found = list.find(e => e.id === id)
    if (found) {
      entry.value = found
      fullCaseUnlocked.value = store.checkUnlocked(id, 'fullCase')
      agentMemoUnlocked.value = store.checkUnlocked(id, 'agentMemo')
    }
  } catch {
    // 硬编码兜底（结构与 entries.json 一致）
    entry.value = {
      id: 'DDJ-001',
      domain: 'daodejing',
      name: '天道规律',
      alias: '顺势而为、市场规律',
      def: '市场的规律不以个人意志转移——供需决定价格，信息差决定效率，信任决定成交。服务者要顺势而非逆势。',
      source: '《道德经》第十六章「致虚极，守静笃，万物并作，吾以观复」',
      srcType: '经典智慧',
      attrs: '规律认知+顺势思维+市场洞察+信息差利用',
      scene: '市场波动判断、价格策略制定、服务节奏把握、客户预期管理',
      posSpeech: '【专业版】市场供需关系是价格的根本决定因素，我们顺应当前市场态势制定策略，比逆势操作成功率更高。【共情版】别跟市场对着干，该降的时候别硬扛，该涨的时候别犹豫，顺势才能成。',
      negSpeech: '【专业版】违反市场规律的操作必然失败，任何试图对抗供需关系的策略都是无效的。',
      consumerQ: '为什么我的房子卖不出去/租不出去？是不是市场不好？',
      simpleAnswer: '市场有自己的节奏，供大于求就降价，供不应求就涨价。你卖不出去不是你不努力，是时机和定价没对上，顺势调整比硬扛更聪明。',
      consumerBenefit: '不跟市场较劲，省下的是时间和心情',
      severity: 'soft'
    }
    fullCaseUnlocked.value = store.checkUnlocked(id, 'fullCase')
    agentMemoUnlocked.value = store.checkUnlocked(id, 'agentMemo')
  }
}

// 严重程度样式（hard=硬性 / soft=软性）
const strengthClass = (strength) => {
  const v = (strength || '').toLowerCase()
  if (v === 'hard') return 'strength-high'
  if (v === 'soft') return 'strength-mid'
  return 'strength-low'
}

// 解锁内容
const unlockContent = (contentType, cost) => {
  const result = store.unlockContent(entry.value.id, contentType, cost)
  if (result.success) {
    if (contentType === 'fullCase') {
      fullCaseUnlocked.value = true
    } else if (contentType === 'agentMemo') {
      agentMemoUnlocked.value = true
    }
    uni.showToast({
      title: result.alreadyUnlocked ? '已解锁' : '解锁成功',
      icon: 'success'
    })
  } else {
    uni.showToast({
      title: result.message || '积分不足',
      icon: 'none'
    })
  }
}

// 贡献操作
const contribute = (type) => {
  const typeNames = {
    correction: '纠错',
    verify: '验证',
    question: '提问'
  }
  uni.showToast({
    title: `已收到${typeNames[type]}反馈，感谢贡献`,
    icon: 'none',
    duration: 2000
  })
}

onLoad((options) => {
  entryId.value = options.entryId || ''
  store.initFromStorage()
  loadEntry(entryId.value)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

.loading-wrap {
  padding: 120rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 词条头部 */
.entry-header {
  background: linear-gradient(135deg, #3d5a3e, #4a6b4b);
  padding: 40rpx 32rpx 36rpx;
  margin: 24rpx 24rpx;
  border-radius: 20rpx;
}

.entry-term {
  font-size: 44rpx;
  font-weight: 900;
  color: #ffffff;
  margin-bottom: 16rpx;
}

.entry-meta-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.entry-domain-tag {
  font-size: 22rpx;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  padding: 6rpx 18rpx;
  border-radius: 8rpx;
}

.entry-tool-tag {
  font-size: 22rpx;
  color: #c46a3a;
  background: #ffffff;
  padding: 6rpx 18rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.entry-strength-tag {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 18rpx;
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

/* 通用区块 */
.section {
  margin: 24rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}

.section-badge {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.section-badge.free {
  background: #e8f5e9;
  color: #3d5a3e;
}

.section-badge.unlocked {
  background: #e8f5e9;
  color: #3d5a3e;
}

.section-badge.locked {
  background: #fff3ed;
  color: #c46a3a;
}

.section-content {
  padding: 24rpx 28rpx;
}

.content-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
}

.legal-content {
  background: #fafbf9;
}

.case-text {
  font-size: 26rpx;
  line-height: 1.9;
}

.case-block {
  margin-bottom: 20rpx;
}

.case-block:last-child {
  margin-bottom: 0;
}

.case-label {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #c46a3a;
  margin-bottom: 8rpx;
}

.memo-content {
  background: #fffbf5;
}

.memo-text {
  white-space: pre-line;
}

/* 锁定内容 */
.locked-section {
  position: relative;
}

.locked-content {
  padding: 40rpx 28rpx;
  background: #fafafa;
}

.locked-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 0;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
}

.locked-icon {
  font-size: 48rpx;
  margin-bottom: 16rpx;
}

.locked-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #c46a3a;
  margin-bottom: 8rpx;
}

.locked-hint {
  font-size: 24rpx;
  color: #999;
}

/* 贡献入口 */
.contribute-bar {
  padding: 28rpx;
}

.contribute-title {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 20rpx;
}

.contribute-btns {
  display: flex;
  gap: 20rpx;
}

.contribute-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f7f4ef;
  border-radius: 14rpx;
  padding: 20rpx 0;
}

.contribute-btn-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.contribute-btn-text {
  font-size: 24rpx;
  color: #555;
  font-weight: 600;
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