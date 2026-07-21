<template>
  <view class="page">
    <view class="header">
      <view class="header-title">测评中心</view>
      <view class="header-sub">每日一练，提升专业能力</view>
    </view>

    <!-- 每日一题卡片 -->
    <view class="daily-card" v-if="dailyQuiz" @click="goDailyQuiz">
      <view class="daily-badge">
        <text class="daily-badge-text">每日一题</text>
      </view>
      <view class="daily-content">
        <view class="daily-date">{{ dailyQuiz.date }}</view>
        <view class="daily-title">{{ dailyQuiz.title }}</view>
        <view class="daily-desc">{{ dailyQuiz.description }}</view>
      </view>
      <view class="daily-action">
        <text class="daily-action-text">开始答题</text>
        <text class="daily-action-arrow">></text>
      </view>
    </view>

    <!-- 无每日一题时显示占位 -->
    <view v-else class="daily-card daily-empty">
      <view class="daily-badge">
        <text class="daily-badge-text">每日一题</text>
      </view>
      <view class="daily-content">
        <view class="daily-title">今日题目准备中</view>
        <view class="daily-desc">请稍后再来查看</view>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-section">
      <view class="stats-title">我的战绩</view>
      <view class="stats-grid">
        <view class="stat-card">
          <view class="stat-value" :style="{ color: '#3d5a3e' }">{{ accuracy }}%</view>
          <view class="stat-label">答题正确率</view>
        </view>
        <view class="stat-card">
          <view class="stat-value" :style="{ color: '#c46a3a' }">{{ store.points }}</view>
          <view class="stat-label">总积分</view>
        </view>
        <view class="stat-card">
          <view class="stat-value" :style="{ color: '#3d5a3e' }">{{ store.quizStats.streak }}</view>
          <view class="stat-label">连胜天数</view>
        </view>
      </view>
    </view>

    <!-- 游戏入口 -->
    <view class="game-section">
      <view class="section-title">游戏挑战</view>
      <view class="game-grid">
        <view class="game-card" @click="goGame('judge')">
          <view class="game-icon judge-icon">
            <text class="game-icon-text">法</text>
          </view>
          <view class="game-info">
            <view class="game-name">{{ judgeGame.title || '法官来了' }}</view>
            <view class="game-desc">{{ judgeGame.description || '法律知识问答挑战' }}</view>
            <view class="game-meta">
              <text class="game-meta-item">{{ judgeGame.questionCount || 0 }}题</text>
              <text class="game-meta-divider">|</text>
              <text class="game-meta-item">每题{{ judgeGame.pointsPerQuestion || 10 }}积分</text>
            </view>
          </view>
          <view class="game-arrow">></view>
        </view>

        <view class="game-card" @click="goGame('simulator')">
          <view class="game-icon simulator-icon">
            <text class="game-icon-text">客</text>
          </view>
          <view class="game-info">
            <view class="game-name">{{ simulatorGame.title || '客户模拟器' }}</view>
            <view class="game-desc">{{ simulatorGame.description || '场景应对模拟训练' }}</view>
            <view class="game-meta">
              <text class="game-meta-item">{{ simulatorGame.questionCount || 0 }}题</text>
              <text class="game-meta-divider">|</text>
              <text class="game-meta-item">每题{{ simulatorGame.pointsPerQuestion || 15 }}积分</text>
            </view>
          </view>
          <view class="game-arrow">></view>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { onShow } from '@dcloudio/uni-app'

const store = useUserStore()

const dailyQuiz = ref(null)
const judgeGame = ref({ title: '法官来了', description: '法律知识问答挑战', questionCount: 0, pointsPerQuestion: 10 })
const simulatorGame = ref({ title: '客户模拟器', description: '场景应对模拟训练', questionCount: 0, pointsPerQuestion: 15 })

const accuracy = computed(() => store.accuracy)

onMounted(() => {
  store.initFromStorage()
  loadDailyQuiz()
  loadGameData()
})

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/quiz/index')
})

// 加载每日一题
function loadDailyQuiz() {
  try {
    // 从 dailyQuestionSchedule.weeklySchedule 中按今天日期匹配
    const data = require('../../data/brand_and_schedule.json')
    const weeklySchedule = data && data.dailyQuestionSchedule && data.dailyQuestionSchedule.weeklySchedule
    if (weeklySchedule && weeklySchedule.length) {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const todayDay = days[today.getDay()]
      const todayQuiz = weeklySchedule.find(q => q.date === todayStr || q.day === todayDay) || weeklySchedule[0]
      if (todayQuiz) {
        dailyQuiz.value = {
          date: todayQuiz.date || todayStr,
          title: todayQuiz.entryQuestion || '今日题目',
          description: todayQuiz.difficulty ? `${todayQuiz.difficulty}难度` : '来挑战今天的题目吧',
          id: todayQuiz.scenarioId || 'daily',
          scenarioId: todayQuiz.scenarioId,
        }
      }
    }
  } catch (e) {
    // 数据文件不存在，使用默认占位
    dailyQuiz.value = null
  }
}

// 加载游戏元数据
function loadGameData() {
  try {
    const judgeData = require('../../data/game_judge_quiz.json')
    if (judgeData) {
      judgeGame.value = {
        title: judgeData.gameName || '法官来了',
        description: judgeData.gameDesc || '法律知识问答挑战',
        questionCount: judgeData.questions ? judgeData.questions.length : 0,
        pointsPerQuestion: 10,
      }
    }
  } catch (e) {
    // 数据文件不存在，使用默认值
  }

  try {
    const simData = require('../../data/game_client_simulator.json')
    if (simData) {
      simulatorGame.value = {
        title: simData.gameName || '客户模拟器',
        description: simData.gameDesc || '场景应对模拟训练',
        questionCount: simData.scenarios ? simData.scenarios.length : 0,
        pointsPerQuestion: 15,
      }
    }
  } catch (e) {
    // 数据文件不存在，使用默认值
  }
}

function goDailyQuiz() {
  if (!dailyQuiz.value) return
  uni.navigateTo({
    url: `/pages/quiz/game?gameId=daily&quizId=${dailyQuiz.value.id || 'daily'}`,
  })
}

function goGame(gameId) {
  uni.navigateTo({
    url: `/pages/quiz/game?gameId=${gameId}`,
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding: 20rpx;
}

.header {
  padding: 30rpx 10rpx 20rpx;
}
.header-title {
  font-size: 40rpx;
  font-weight: 900;
  color: #3d5a3e;
}
.header-sub {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

/* 每日一题 */
.daily-card {
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
  border-radius: 20rpx;
  padding: 28rpx 30rpx;
  margin: 0 10rpx 20rpx;
  position: relative;
  display: flex;
  align-items: center;
}
.daily-card.daily-empty {
  background: linear-gradient(135deg, #bbb, #ccc);
}
.daily-badge {
  position: absolute;
  top: -12rpx;
  left: 30rpx;
  background: #c46a3a;
  border-radius: 16rpx;
  padding: 4rpx 20rpx;
}
.daily-badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 700;
}
.daily-content {
  flex: 1;
  padding-top: 12rpx;
}
.daily-date {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  margin-bottom: 6rpx;
}
.daily-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6rpx;
}
.daily-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
}
.daily-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.daily-action-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 700;
}
.daily-action-arrow {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
}

/* 统计卡片 */
.stats-section {
  padding: 0 10rpx;
  margin-bottom: 24rpx;
}
.stats-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}
.stats-grid {
  display: flex;
  gap: 16rpx;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.stat-value {
  font-size: 44rpx;
  font-weight: 900;
  margin-bottom: 8rpx;
}
.stat-label {
  font-size: 22rpx;
  color: #888;
}

/* 游戏入口 */
.game-section {
  padding: 0 10rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}
.game-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.game-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.game-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.judge-icon {
  background: #e8f5e9;
}
.simulator-icon {
  background: #fff3e0;
}
.game-icon-text {
  font-size: 36rpx;
  font-weight: 900;
  color: #3d5a3e;
}
.simulator-icon .game-icon-text {
  color: #c46a3a;
}
.game-info {
  flex: 1;
}
.game-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 6rpx;
}
.game-desc {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 8rpx;
}
.game-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.game-meta-item {
  font-size: 22rpx;
  color: #999;
}
.game-meta-divider {
  font-size: 22rpx;
  color: #ddd;
}
.game-arrow {
  font-size: 32rpx;
  color: #ccc;
  flex-shrink: 0;
}

.footer {
  text-align: center;
  padding: 30rpx 0 40rpx;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>