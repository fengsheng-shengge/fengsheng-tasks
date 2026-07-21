<template>
  <view class="page">
    <!-- HeroCard 用户等级+积分+slogan -->
    <HeroCard
      :level="store.level"
      :level-name="store.levelName"
      :points="store.points"
      :slogan="slogan"
    />

    <!-- SceneGrid 2×2 场景卡片 -->
    <SceneGrid :cards="sceneCards" />

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
          @click="navigateTo(tool.url, tool.tab)"
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
import HeroCard from '../../components/HeroCard.vue'
import SceneGrid from '../../components/SceneGrid.vue'
import DailyQuiz from '../../components/DailyQuiz.vue'

const store = useUserStore()
const slogan = ref('让服务者用独立价值赢得尊重')
const sceneCards = ref([])
const dailyQuiz = ref(null)

// 工具入口列表
const toolList = [
  { id: 'decode', name: '客户解码', icon: '🔍', desc: 'AI拆解真实需求', bgColor: '#e8f5e9', url: '/pages/decode/index', tab: false },
  { id: 'mentor', name: '开单导师', icon: '🎓', desc: '租赁开单陪练', bgColor: '#fff3ed', url: '/pages/mentor/index', tab: true },
  { id: 'quiz', name: '测评中心', icon: '📝', desc: '法官 · 模拟', bgColor: '#e3f2fd', url: '/pages/quiz/index', tab: true },
  { id: 'dict', name: '知识词典', icon: '📖', desc: '8域122词条', bgColor: '#f3e5f5', url: '/pages/dict/index', tab: true },
]

// 加载场景卡片数据
const loadSceneCards = () => {
  try {
    const data = require('../../data/scene_cards.json')
    sceneCards.value = data?.sceneCards || []
  } catch {
    // 硬编码兜底数据
    sceneCards.value = [
      {
        cardId: 'SCENE-01',
        scenarioTitle: '退租时房东扣押金',
        tags: ['退租', '押金'],
        color: '#3d5a3e',
        painPoint: '房东说我弄坏了墙面要扣押金'
      },
      {
        cardId: 'SCENE-02',
        scenarioTitle: '定金与订金分不清',
        tags: ['定金', '购房'],
        color: '#c46a3a',
        painPoint: '我交的定金能退吗？'
      },
      {
        cardId: 'SCENE-03',
        scenarioTitle: '买了学区房户口迁不出',
        tags: ['学区房', '户口'],
        color: '#3d5a3e',
        painPoint: '买了学区房户口迁不出'
      },
      {
        cardId: 'SCENE-04',
        scenarioTitle: '签了合同房东突然不租了',
        tags: ['租赁', '违约'],
        color: '#c46a3a',
        painPoint: '签了合同房东突然说不租了，租客问能怎么办？'
      }
    ]
  }
}

// 加载每日一题数据
const loadDailyQuiz = () => {
  try {
    const data = require('../../data/brand_and_schedule.json')
    slogan.value = data.brand?.heroSubtitle || '让服务者用独立价值赢得尊重'
    // 每日一题从 dailyQuestionSchedule.weeklySchedule 中按今天日期匹配
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const todayDay = days[today.getDay()]
    const todayQuiz = data.dailyQuestionSchedule?.weeklySchedule?.find(q => q.date === todayStr || q.day === todayDay) || data.dailyQuestionSchedule?.weeklySchedule?.[0]
    dailyQuiz.value = todayQuiz || null
  } catch {
    // 硬编码兜底数据
    dailyQuiz.value = {
      date: '2026-07-21',
      question: '客户说「这套房子太贵了，能不能便宜点」，经纪人正确的做法是？',
      options: [
        '直接降价，留住客户',
        '先了解客户预算和看房经历，再分析价格合理性',
        '推荐更便宜的其他房源',
        '告诉客户一分钱一分货'
      ],
      answer: 1,
      explanation: '客户说贵不一定真的是预算不够，可能是谈判策略，也可能是对市场行情不了解。正确做法是先了解客户的实际预算和看房经历，用数据帮客户分析价格合理性，展现专业价值。',
      earnedPoints: 5
    }
  }
}

// 答题获得积分
const onQuizEarned = (points) => {
  store.earnPoints(points)
  uni.showToast({
    title: `+${points} 积分`,
    icon: 'success',
    duration: 1500
  })
}

// 导航
const navigateTo = (url, isTab) => {
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
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/home/index')
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
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