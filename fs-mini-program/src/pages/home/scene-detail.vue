<template>
  <view class="page">
    <!-- 场景头部信息 -->
    <view class="scene-header" v-if="card">
      <view class="scene-icon">{{ card.icon || '📋' }}</view>
      <view class="scene-title">{{ card.title }}</view>
      <view class="scene-domain">{{ card.domain }}</view>
      <view class="scene-desc">{{ card.description }}</view>
    </view>

    <!-- 加载中 -->
    <view v-if="!card" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-if="card">
      <!-- 客户原话示例列表 -->
      <view class="section">
        <view class="section-title">客户原话示例</view>
        <view class="quote-list">
          <view
            v-for="(scene, idx) in card.scenes"
            :key="idx"
            class="quote-card"
          >
            <view class="quote-bubble">
              <text class="quote-label">客户</text>
              <text class="quote-text">「{{ scene.customerQuote }}」</text>
            </view>
            <view class="decode-section">
              <text class="decode-label">AI 解码</text>
              <text class="decode-text">{{ scene.decode }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户输入区：输入客户原话 → AI 解码建议 -->
      <view class="section">
        <view class="section-title">试试你的客户原话</view>
        <view class="input-area">
          <textarea
            v-model="userInput"
            class="custom-input"
            placeholder="输入客户原话，让AI帮你解码真实需求..."
            :maxlength="300"
            auto-height
          />
          <view class="input-bar">
            <text class="char-count">{{ userInput.length }}/300</text>
            <view
              :class="['decode-btn', { disabled: !userInput.trim() || decoding }]"
              @click="doDecode"
            >
              {{ decoding ? '解码中...' : 'AI 解码' }}
            </view>
          </view>
        </view>

        <!-- AI 解码结果 -->
        <view v-if="decodeResult" class="decode-result">
          <view class="decode-result-header">
            <text class="result-title">AI 解码建议</text>
          </view>
          <view class="decode-result-content">
            <text class="result-text">{{ decodeResult }}</text>
          </view>
        </view>
      </view>

      <!-- 解锁完整案例 -->
      <view class="section">
        <view class="unlock-card">
          <view class="unlock-header">
            <text class="unlock-title">完整案例</text>
            <text class="unlock-cost">5 积分解锁</text>
          </view>
          <view class="unlock-desc">解锁后查看完整案例复盘，学习一线经纪人的实战技巧</view>
          <view v-if="caseUnlocked" class="unlock-content">
            <text class="case-text">{{ card.fullCase }}</text>
          </view>
          <view v-else class="unlock-btn-wrap">
            <view class="unlock-btn" @click="unlockCase">
              解锁完整案例（消耗 5 积分）
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
const card = ref(null)
const cardId = ref('')
const userInput = ref('')
const decoding = ref(false)
const decodeResult = ref('')
const caseUnlocked = ref(false)

// 加载场景卡片数据
const loadCard = (id) => {
  try {
    const data = require('../../data/scene_cards.json')
    const found = data.find(c => c.id === id)
    if (found) {
      card.value = found
      // 检查是否已解锁完整案例
      caseUnlocked.value = store.checkUnlocked(id, 'fullCase')
    }
  } catch {
    // 硬编码兜底
    const fallback = {
      'buyer_inquiry': {
        id: 'buyer_inquiry',
        title: '客户询价',
        domain: '房产交易',
        icon: '\uD83D\uDCB0',
        description: '客户询问房屋价格时，如何快速识别真实购买意向，避免被套价',
        scenes: [
          { customerQuote: '这套房子多少钱？还能便宜吗？', decode: '客户在比价阶段，核心诉求是确认预算匹配度。需要先了解客户已看房源数量和对标楼盘，判断是否真实买家。' },
          { customerQuote: '这个价格包含税费吗？能帮我算一下首付吗？', decode: '进入交易意向阶段，客户正在计算实际购房成本。这是切入金融方案和贷款服务的最佳时机。' }
        ],
        fullCase: '客户王女士在贝壳平台看到一套房源后，直接来电询问底价。经纪人小李没有直接报价，而是邀请王女士线下看房。在看房过程中，小李通过观察王女士对户型细节的关注点，判断出她更看重学区属性而非价格。最终以高于挂牌价3%成交。'
      }
    }
    card.value = fallback[id] || fallback['buyer_inquiry']
  }
}

// AI 解码（模拟）
const doDecode = () => {
  if (!userInput.value.trim() || decoding.value) return
  decoding.value = true
  decodeResult.value = ''

  setTimeout(() => {
    const text = userInput.value.trim()
    let result = ''
    if (text.includes('便宜') || text.includes('贵') || text.includes('价格')) {
      result = '客户在价格敏感阶段。建议：1) 不要直接让步，先确认客户预算范围；2) 用周边小区价格对比展示性价比；3) 如果客户确实预算有限，可以推荐同小区小户型或低楼层房源。关键话术：「这个价格在这个地段确实很有竞争力，我帮您对比一下周边同户型的价格，您会发现这套的性价比非常高。」'
    } else if (text.includes('贷款') || text.includes('首付') || text.includes('月供')) {
      result = '客户在测算购房能力。建议：1) 快速给出首付和月供的估算结果；2) 介绍公积金贷款和组合贷款的优势；3) 顺势推荐合作银行的金融方案。关键话术：「我帮您算一下，按照您的预算，首付大约XX万，月供XX元。另外我还可以帮您对接合作银行，争取更优惠的利率。」'
    } else if (text.includes('装修') || text.includes('翻新') || text.includes('改造')) {
      result = '客户关注房屋品质。建议：1) 区分是议价策略还是真实装修需求；2) 如果是议价策略，用数据说明装修成本并非想象中那么高；3) 推荐合作装修公司的一站式服务。关键话术：「这套房子的户型基础非常好，局部翻新一下就能达到很好的效果，我可以帮您推荐靠谱的装修团队。」'
    } else {
      result = '客户处于信息收集阶段。建议：1) 通过提问深入了解客户的具体需求（预算、面积、位置、学区等）；2) 邀请客户线下看房，在真实场景中建立信任；3) 根据客户反馈调整推荐策略。关键话术：「您对房子的主要需求是什么？预算大概在什么范围？我帮您筛选几套最匹配的房源，咱们约个时间实地看看。」'
    }
    decodeResult.value = result
    decoding.value = false
  }, 1000)
}

// 解锁完整案例
const unlockCase = () => {
  const result = store.unlockContent(card.value.id, 'fullCase', 5)
  if (result.success) {
    caseUnlocked.value = true
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

onLoad((options) => {
  cardId.value = options.cardId || ''
  store.initFromStorage()
  loadCard(cardId.value)
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

/* 场景头部 */
.scene-header {
  background: #ffffff;
  padding: 40rpx 32rpx;
  margin: 24rpx 24rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  text-align: center;
}

.scene-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.scene-title {
  font-size: 40rpx;
  font-weight: 900;
  color: #2c2c2c;
  margin-bottom: 10rpx;
}

.scene-domain {
  display: inline-block;
  font-size: 24rpx;
  color: #c46a3a;
  background: #fff3ed;
  padding: 6rpx 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.scene-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  max-width: 560rpx;
  margin: 0 auto;
}

/* 通用区块 */
.section {
  margin: 24rpx 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

/* 客户原话卡片 */
.quote-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.quote-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.quote-bubble {
  background: #e8f5e9;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 16rpx;
  position: relative;
}

.quote-bubble::after {
  content: '';
  position: absolute;
  bottom: -12rpx;
  left: 30rpx;
  border-width: 12rpx 10rpx 0;
  border-style: solid;
  border-color: #e8f5e9 transparent transparent;
}

.quote-label {
  font-size: 22rpx;
  color: #3d5a3e;
  font-weight: 700;
  margin-right: 10rpx;
}

.quote-text {
  font-size: 26rpx;
  color: #2c5a2e;
  line-height: 1.6;
}

.decode-section {
  padding: 0 4rpx;
}

.decode-label {
  font-size: 22rpx;
  color: #c46a3a;
  font-weight: 700;
  display: block;
  margin-bottom: 8rpx;
}

.decode-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
}

/* 输入区域 */
.input-area {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.custom-input {
  width: 100%;
  min-height: 100rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
}

.input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.char-count {
  font-size: 22rpx;
  color: #bbb;
}

.decode-btn {
  background: #3d5a3e;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
  padding: 14rpx 36rpx;
  border-radius: 32rpx;
  transition: opacity 0.2s;
}

.decode-btn.disabled {
  opacity: 0.4;
}

/* AI 解码结果 */
.decode-result {
  margin-top: 20rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  border-left: 6rpx solid #3d5a3e;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.decode-result-header {
  margin-bottom: 12rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3d5a3e;
}

.decode-result-content {
  padding: 0 4rpx;
}

.result-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
}

/* 解锁区域 */
.unlock-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.unlock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.unlock-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}

.unlock-cost {
  font-size: 24rpx;
  color: #c46a3a;
  font-weight: 700;
  background: #fff3ed;
  padding: 6rpx 16rpx;
  border-radius: 10rpx;
}

.unlock-desc {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.unlock-content {
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 20rpx;
}

.case-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
}

.unlock-btn-wrap {
  display: flex;
  justify-content: center;
}

.unlock-btn {
  background: linear-gradient(135deg, #c46a3a, #d4845a);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  padding: 18rpx 48rpx;
  border-radius: 40rpx;
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