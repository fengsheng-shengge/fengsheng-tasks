<template>
  <view class="page">
    <!-- HeroCard 用户等级+积分+slogan -->
    <HeroCard
      :level="store.level"
      :level-name="store.levelName"
      :points="store.points"
      subtitle="居住服务者的专业基础设施"
      slogan="记忆库 · 知识库 · 工具包"
    />

    <!-- P0-01: "客户说了什么"触发入口 -->
    <view class="trigger-input-card">
      <view class="trigger-input-row" @click="onTriggerInputClick">
        <text class="trigger-icon">💬</text>
        <input
          v-model="triggerInput"
          class="trigger-input"
          placeholder="客户说了什么？粘贴原话试试"
          placeholder-class="trigger-placeholder"
          confirm-type="search"
          @confirm="onTriggerSearch"
        />
        <view class="trigger-btn" @click.stop="onTriggerSearch">
          <text class="trigger-btn-text">→</text>
        </view>
      </view>

      <!-- 匹配结果 -->
      <view v-if="triggerResult" class="trigger-result">
        <view v-if="triggerResult.matched" class="trigger-matched">
          <view class="trigger-result-title">
            <text class="trigger-result-icon">✅</text>
            <text class="trigger-result-text">匹配到：{{ triggerResult.name }}</text>
          </view>
          <view class="trigger-result-actions">
            <view class="trigger-result-btn" @click="goMatchedEntry(triggerResult.id)">
              <text class="trigger-result-btn-text">查看词条</text>
            </view>
            <view class="trigger-result-btn secondary" @click="goMentorWithInput">
              <text class="trigger-result-btn-text">问导师</text>
            </view>
          </view>
        </view>
        <view v-else class="trigger-no-match">
          <text class="trigger-no-match-text">未匹配到相关内容，试试词典搜索或问导师</text>
          <view class="trigger-result-actions">
            <view class="trigger-result-btn" @click="goDictSearch">
              <text class="trigger-result-btn-text">搜词典</text>
            </view>
            <view class="trigger-result-btn secondary" @click="goMentorWithInput">
              <text class="trigger-result-btn-text">问导师</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- SceneGrid 2×2 场景卡片 -->
    <SceneGrid :cards="sceneCards" @scene-click="onSceneClick" />

    <!-- P1-05: 6大场景域导航 -->
    <DomainNav />

    <!-- DailyQuiz 每日一题 -->
    <DailyQuiz :quiz="dailyQuiz" @earned="onQuizEarned" />

    <!-- 工具栏快捷入口 ToolGrid -->
    <view class="tool-grid">
      <view class="tool-grid-title">快捷工具</view>
      <view class="tool-grid-body">
        <view
          v-for="tool in toolList"
          :key="tool.id"
          class="tool-item"
          @click="navigateTo(tool.url, tool.tab, tool.id)"
        >
          <view class="tool-icon" :style="{ background: tool.bgColor }">{{ tool.icon }}</view>
          <view class="tool-name">{{ tool.name }}</view>
          <view class="tool-desc">{{ tool.desc }}</view>
        </view>
      </view>
    </view>

    <!-- 底部 ICP 备案号 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { track } from '../../utils/tracker'
import HeroCard from '../../components/HeroCard.vue'
import SceneGrid from '../../components/SceneGrid.vue'
import DailyQuiz from '../../components/DailyQuiz.vue'
import DomainNav from '../../components/DomainNav.vue'

const store = useUserStore()
const sceneCards = ref([])
const dailyQuiz = ref(null)

// P0-01: "客户说了什么"触发入口
const triggerInput = ref('')
const triggerResult = ref(null)
const searchAliases = ref([])

// 工具入口列表
const toolList = [
  { id: 'decode', name: '客户解码', icon: '🔍', desc: 'AI拆解真实需求', bgColor: '#e8f5e9', url: '/pages/mentor/index', tab: true },
  { id: 'mentor', name: '开单导师', icon: '🎓', desc: '租赁开单陪练', bgColor: '#fff3ed', url: '/pages/mentor/index', tab: true },
  { id: 'quiz', name: '测评中心', icon: '📝', desc: '法官 · 模拟', bgColor: '#e3f2fd', url: '/pages/quiz/index', tab: true },
  { id: 'dict', name: '知识词典', icon: '📖', desc: '专业记忆库', bgColor: '#f3e5f5', url: '/pages/dict/index', tab: true },
]

// 加载场景卡片数据
const loadSceneCards = () => {
  try {
    const data = require('../../data/scene_cards.json')
    sceneCards.value = data?.sceneCards || []
  } catch {
    sceneCards.value = [
      { cardId: 'SCENE-01', scenarioTitle: '退租时房东扣押金', tags: ['退租', '押金'], painPoint: '房东说我弄坏了墙面要扣押金' },
      { cardId: 'SCENE-02', scenarioTitle: '定金与订金分不清', tags: ['定金', '购房'], painPoint: '我交的定金能退吗？' },
      { cardId: 'SCENE-03', scenarioTitle: '买了学区房户口迁不出', tags: ['学区房', '户口'], painPoint: '买了学区房户口迁不出' },
      { cardId: 'SCENE-04', scenarioTitle: '签了合同房东突然不租了', tags: ['租赁', '违约'], painPoint: '签了合同房东突然说不租了，租客问能怎么办？' }
    ]
  }
}

// 加载每日一题数据
const loadDailyQuiz = () => {
  try {
    const data = require('../../data/brand_and_schedule.json')
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const todayDay = days[today.getDay()]
    const todayQuiz = data.dailyQuestionSchedule?.weeklySchedule?.find(q => q.date === todayStr || q.day === todayDay) || data.dailyQuestionSchedule?.weeklySchedule?.[0]
    dailyQuiz.value = todayQuiz || null
  } catch {
    dailyQuiz.value = {
      date: '2026-07-21',
      question: '客户说「这套房子太贵了，能不能便宜点」，经纪人正确的做法是？',
      options: ['直接降价，留住客户', '先了解客户预算和看房经历，再分析价格合理性', '推荐更便宜的其他房源', '告诉客户一分钱一分货'],
      answer: 1,
      explanation: '客户说贵不一定真的是预算不够，可能是谈判策略。正确做法是先了解客户实际预算和看房经历，用数据帮客户分析价格合理性。',
      earnedPoints: 5
    }
  }
}

// 加载搜索别名（P0-01 触发匹配用）
const loadSearchAliases = () => {
  try {
    const data = require('../../data/search_aliases.json')
    searchAliases.value = data?.searchAliases || []
  } catch {
    searchAliases.value = []
  }
}

// P0-01: 触发输入条点击
const onTriggerInputClick = () => {
  track.triggerInputUse()
}

// P0-01: 触发搜索 — 用 search_aliases 做简易关键词匹配
const onTriggerSearch = () => {
  const input = (triggerInput.value || '').trim()
  if (!input) return

  // 匹配逻辑：遍历 searchAliases，检查 input 是否包含任一 alias
  let matched = null
  for (const item of searchAliases.value) {
    if (item.aliases && item.aliases.some(alias => input.includes(alias) || alias.includes(input))) {
      matched = item
      break
    }
  }

  if (matched) {
    triggerResult.value = { matched: true, id: matched.id, name: matched.name }
    track.triggerMatchSuccess(input, matched.id, 'alias')
  } else {
    triggerResult.value = { matched: false }
    track.triggerMatchSuccess(input, '', 'none')
  }
}

// P0-01: 跳转匹配到的词条
const goMatchedEntry = (entryId) => {
  track.triggerToDetail(triggerInput.value, entryId)
  track.contentClick(entryId, 'entry', 'trigger_input')
  uni.navigateTo({ url: `/pages/dict/entry-detail?entryId=${entryId}` })
}

// P0-01: 去词典搜索
const goDictSearch = () => {
  uni.switchTab({ url: '/pages/dict/index' })
}

// P0-01: 带输入去问导师
const goMentorWithInput = () => {
  if (triggerInput.value) {
    uni.setStorageSync('fs_mentor_preinput', triggerInput.value)
  }
  uni.switchTab({ url: '/pages/mentor/index' })
}

// 场景卡片点击（带埋点）
const onSceneClick = (cardId) => {
  track.contentClick(cardId, 'scene_card', 'scene_grid')
  uni.navigateTo({ url: `/pages/home/scene-detail?cardId=${cardId}` })
}

// 答题获得积分
const onQuizEarned = (points) => {
  store.earnPoints(points)
  track.pointsChange('earn', points, 'daily_quiz')
  uni.showToast({ title: `+${points} 积分`, icon: 'success', duration: 1500 })
}

// 导航（带埋点）
const navigateTo = (url, isTab, toolId) => {
  track.click('tool_' + toolId, { url })
  if (isTab) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

onLoad(() => {
  store.initFromStorage()
  loadSceneCards()
  loadDailyQuiz()
  loadSearchAliases()
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/home/index')
  track.pageview()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* P0-01: "客户说了什么"触发入口 */
.trigger-input-card {
  margin: 0 24rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.trigger-input-row {
  display: flex;
  align-items: center;
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 8rpx 8rpx 8rpx 20rpx;
}

.trigger-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.trigger-input {
  flex: 1;
  height: 72rpx;
  font-size: 26rpx;
  color: #333;
}

.trigger-placeholder {
  color: #b0b0b0;
  font-size: 26rpx;
}

.trigger-btn {
  width: 64rpx;
  height: 64rpx;
  background: #3d5a3e;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trigger-btn:active {
  opacity: 0.8;
}

.trigger-btn-text {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 700;
}

/* 匹配结果 */
.trigger-result {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.trigger-matched {
  display: flex;
  flex-direction: column;
}

.trigger-result-title {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.trigger-result-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.trigger-result-text {
  font-size: 28rpx;
  color: #3d5a3e;
  font-weight: 600;
}

.trigger-no-match-text {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 12rpx;
}

.trigger-result-actions {
  display: flex;
  gap: 16rpx;
}

.trigger-result-btn {
  flex: 1;
  background: #3d5a3e;
  border-radius: 10rpx;
  padding: 16rpx 0;
  text-align: center;
}

.trigger-result-btn.secondary {
  background: #c46a3a;
}

.trigger-result-btn-text {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
}

/* 工具栏 */
.tool-grid {
  margin: 24rpx 24rpx;
}

.tool-grid-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}

.tool-grid-body {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.tool-item {
  width: calc(50% - 10rpx);
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;
}

.tool-item:active {
  transform: scale(0.97);
}

.tool-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-bottom: 14rpx;
}

.tool-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 6rpx;
}

.tool-desc {
  font-size: 22rpx;
  color: #999;
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
