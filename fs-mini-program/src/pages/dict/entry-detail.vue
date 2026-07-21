<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="!entry" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-if="entry">
      <!-- 词条头部 -->
      <view class="entry-header">
        <view class="entry-term">{{ entry.term }}</view>
        <view class="entry-meta-row">
          <text class="entry-domain-tag">{{ entry.domain }}</text>
          <text class="entry-tool-tag">{{ entry.toolType }}</text>
          <text :class="['entry-strength-tag', strengthClass(entry.evidenceStrength)]">
            证据强度 {{ entry.evidenceStrength }}
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
          <text class="content-text">{{ entry.understanding }}</text>
        </view>
      </view>

      <!-- 免费区域：法律依据 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">法律依据</text>
          <text class="section-badge free">免费</text>
        </view>
        <view class="section-content legal-content">
          <text class="content-text">{{ entry.legalBasis }}</text>
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
          <text class="content-text case-text">{{ entry.fullCase }}</text>
        </view>
        <view v-else class="locked-content" @click="unlockContent('fullCase', 5)">
          <view class="locked-overlay">
            <text class="locked-icon">🔒</text>
            <text class="locked-text">点击解锁（消耗 5 积分）</text>
            <text class="locked-hint">查看完整案例复盘，学习实战经验</text>
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
          <text class="content-text memo-text">{{ entry.agentMemo }}</text>
        </view>
        <view v-else class="locked-content" @click="unlockContent('agentMemo', 3)">
          <view class="locked-overlay">
            <text class="locked-icon">🔒</text>
            <text class="locked-text">点击解锁（消耗 3 积分）</text>
            <text class="locked-hint">查看经纪人实战备忘，避坑要点</text>
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

// 加载词条详情
const loadEntry = (id) => {
  try {
    const data = require('../../data/entries.json')
    const found = data.find(e => e.id === id)
    if (found) {
      entry.value = found
      fullCaseUnlocked.value = store.checkUnlocked(id, 'fullCase')
      agentMemoUnlocked.value = store.checkUnlocked(id, 'agentMemo')
    }
  } catch {
    // 硬编码兜底
    entry.value = {
      id: 'entry_001',
      term: '网签',
      domain: '房产交易',
      toolType: '流程工具',
      evidenceStrength: '高',
      understanding: '网签即网上签约，是指买卖双方在房地产管理部门的网上交易系统中签订房屋买卖合同的行为。网签合同具有法律效力，是后续办理贷款、缴税、过户的必要前提。',
      legalBasis: '《城市房地产管理法》第三十五条：房地产转让、抵押，当事人应当依照本法第五章的规定办理权属登记。《不动产登记暂行条例》第十四条：因买卖、设定抵押权等申请不动产登记的，应当由当事人双方共同申请。',
      fullCase: '某购房人在签约后，卖方以「家人不同意」为由拒绝配合网签。购房人持已签订的书面合同向法院起诉，法院认定书面合同具有法律效力，判决卖方继续履行合同。但若当时直接网签，则可避免此纠纷。网签的核心价值在于：1) 锁定房源，防止一房二卖；2) 作为后续贷款、过户的法定前置条件；3) 网签合同条款受政府监管，保护买卖双方权益。',
      agentMemo: '1. 签约前务必核实房源产权状态（查封、抵押）；2. 网签时确保合同金额、付款方式与实际一致；3. 网签后立即下载合同备案回执；4. 提醒客户网签不等于过户，仍需关注后续流程节点。'
    }
    fullCaseUnlocked.value = store.checkUnlocked(id, 'fullCase')
    agentMemoUnlocked.value = store.checkUnlocked(id, 'agentMemo')
  }
}

// 证据强度样式
const strengthClass = (strength) => {
  if (strength === '高') return 'strength-high'
  if (strength === '中') return 'strength-mid'
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