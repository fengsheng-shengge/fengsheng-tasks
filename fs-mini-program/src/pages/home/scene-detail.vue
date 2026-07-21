<template>
  <view class="page">
    <!-- 场景头部信息 -->
    <view class="scene-header" v-if="card">
      <view class="scene-icon">📋</view>
      <view class="scene-title">{{ card.scenarioTitle }}</view>
      <view class="scene-domain">{{ card.tags?.join(' / ') || '' }}</view>
      <view class="scene-desc">{{ card.painPoint }}</view>
    </view>

    <!-- 加载中 -->
    <view v-if="!card" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-if="card">
      <!-- 专业视角 -->
      <view class="section" v-if="card.professionalTake">
        <view class="section-title">专业视角</view>
        <view class="info-card">
          <text class="info-text">{{ card.professionalTake }}</text>
        </view>
      </view>

      <!-- 法律依据 -->
      <view class="section" v-if="card.legalBasis">
        <view class="section-title">法律依据</view>
        <view class="info-card legal-card">
          <text class="info-text">{{ card.legalBasis }}</text>
        </view>
      </view>

      <!-- 相关案例 -->
      <view class="section" v-if="card.relatedCases && card.relatedCases.length">
        <view class="section-title">相关案例</view>
        <view class="tag-list">
          <view class="tag-item" v-for="c in card.relatedCases" :key="c">{{ c }}</view>
        </view>
      </view>

      <!-- 相关工具 -->
      <view class="section" v-if="card.relatedTools && card.relatedTools.length">
        <view class="section-title">相关工具</view>
        <view class="tag-list">
          <view class="tag-item" v-for="t in card.relatedTools" :key="t">{{ t }}</view>
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

// 加载场景卡片数据
const loadCard = (id) => {
  try {
    const data = require('../../data/scene_cards.json')
    const found = data.sceneCards?.find(c => c.cardId === id)
    if (found) {
      card.value = found
    }
  } catch {
    // 硬编码兜底
    const fallback = {
      'SCENE-01': {
        cardId: 'SCENE-01',
        scenarioTitle: '退租时房东扣押金',
        painPoint: '房东说我弄坏了墙面要扣押金',
        professionalTake: '正常居住损耗租客不担责，合同“小修自理”不含结构性问题。房东扣押金需举证实际损失，不能以“折旧”为由扣。',
        legalBasis: '《民法典》第710条（正常使用损耗不担责）、第712条（出租人维修义务）、第585条（违约金不得过分高于实际损失）',
        relatedCases: ['CASE-RNT-001', 'CASE-RNT-002'],
        relatedTools: ['RNT-008', 'RNT-020'],
        tags: ['退租', '押金', '自然损耗']
      }
    }
    card.value = fallback[id] || fallback['SCENE-01']
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

/* 信息卡片（专业视角 / 法律依据） */
.info-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  border-left: 6rpx solid #3d5a3e;
}

.info-card.legal-card {
  border-left-color: #c46a3a;
  background: #fffaf6;
}

.info-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
}

/* 标签列表（相关案例 / 相关工具） */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.tag-item {
  font-size: 24rpx;
  color: #3d5a3e;
  background: #e8f5e9;
  padding: 10rpx 22rpx;
  border-radius: 24rpx;
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