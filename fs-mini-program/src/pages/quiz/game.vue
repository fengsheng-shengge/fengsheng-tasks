<template>
  <view class="page">
    <!-- 游戏进行中 -->
    <view v-if="!gameFinished" class="game-body">
      <!-- 顶栏 -->
      <view class="game-header">
        <view class="back-btn" @click="goBack">
          <text class="back-icon"><</text>
        </view>
        <view class="game-title">{{ gameTitle }}</view>
        <view class="header-placeholder"></view>
      </view>

      <!-- 进度条 -->
      <view class="progress-section">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <view class="progress-text">
          <text>{{ currentIndex + 1 }} / {{ questions.length }}</text>
          <text class="progress-score">得分: {{ currentScore }}</text>
        </view>
      </view>

      <!-- 题目卡片 -->
      <view class="question-card">
        <view class="question-index">
          <text class="question-index-text">第 {{ currentIndex + 1 }} 题</text>
          <text v-if="currentQuestion.difficulty" class="question-difficulty">{{ currentQuestion.difficulty }}</text>
        </view>

        <!-- 场景描述（法官来了 / 客户模拟器） -->
        <view v-if="currentQuestion.scenario" class="question-scenario">
          <text class="question-scenario-label">场景</text>
          <text class="question-scenario-text">{{ currentQuestion.scenario }}</text>
        </view>

        <!-- 客户模拟器：客户头像与原话 -->
        <view v-if="currentQuestion.clientSays" class="question-client-says">
          <view v-if="currentQuestion.clientAvatar" class="question-client-info">
            <text class="question-client-avatar">{{ currentQuestion.clientAvatar }}</text>
            <text v-if="currentQuestion.clientMood" class="question-client-mood">· {{ currentQuestion.clientMood }}</text>
          </view>
          <text class="question-client-says-text">"{{ currentQuestion.clientSays }}"</text>
        </view>

        <view class="question-title">{{ currentQuestion.question }}</view>

        <!-- 选项 -->
        <view class="options-list" v-if="currentQuestion.options && currentQuestion.options.length">
          <view
            v-for="(opt, idx) in currentQuestion.options"
            :key="idx"
            :class="[
              'option-item',
              {
                'option-selected': selectedAnswer === idx,
                'option-correct': answered && idx === currentQuestion.correctIndex,
                'option-wrong': answered && selectedAnswer === idx && idx !== currentQuestion.correctIndex,
                'option-disabled': answered,
              }
            ]"
            @click="selectOption(idx)"
          >
            <view class="option-label">
              <text class="option-label-text">{{ optionLabels[idx] }}</text>
            </view>
            <text class="option-text">{{ typeof opt === 'string' ? opt : opt.text }}</text>
            <text v-if="answered && opt.level" class="option-level-tag" :class="'level-' + opt.level">{{ getLevelLabel(opt.level) }}</text>
            <text v-if="answered && typeof opt.score === 'number'" class="option-score-tag">{{ opt.score }}分</text>
            <view v-if="answered && idx === currentQuestion.correctIndex" class="option-check">
              <text class="option-check-text">V</text>
            </view>
          </view>
        </view>

        <!-- 无选项时（每日一题兜底）显示提示 -->
        <view v-else class="no-options-hint">
          <text class="no-options-text">本题暂无选项，请直接查看解析</text>
        </view>

        <!-- 答题反馈 -->
        <view v-if="showFeedback" class="feedback-section">
          <view :class="['feedback-card', isCorrect ? 'feedback-correct' : 'feedback-wrong']">
            <view class="feedback-header">
              <text class="feedback-icon">{{ isCorrect ? 'V' : 'X' }}</text>
              <text class="feedback-title">{{ isCorrect ? '回答正确！' : '回答错误' }}</text>
              <text v-if="isCorrect" class="feedback-points">+{{ pointsPerQuestion }}积分</text>
            </view>
            <!-- 解析：支持对象（法官/模拟器）与字符串两种结构 -->
            <view class="feedback-explanation" v-if="currentQuestion.explanation">
              <text class="feedback-explanation-label">解析：</text>
              <view v-if="typeof currentQuestion.explanation === 'object'" class="feedback-explanation-body">
                <view v-if="currentQuestion.explanation.judgment" class="exp-line">
                  <text class="exp-line-label">判决：</text>
                  <text class="exp-line-text">{{ currentQuestion.explanation.judgment }}</text>
                </view>
                <view v-if="currentQuestion.explanation.legalBasis" class="exp-line">
                  <text class="exp-line-label">法律依据：</text>
                  <text class="exp-line-text">{{ currentQuestion.explanation.legalBasis }}</text>
                </view>
                <view v-if="currentQuestion.explanation.professionalInsight" class="exp-line">
                  <text class="exp-line-label">专业洞察：</text>
                  <text class="exp-line-text">{{ currentQuestion.explanation.professionalInsight }}</text>
                </view>
                <view v-if="currentQuestion.explanation.keyPoints && currentQuestion.explanation.keyPoints.length" class="exp-line">
                  <text class="exp-line-label">要点：</text>
                  <view class="exp-keypoints">
                    <text v-for="(kp, i) in currentQuestion.explanation.keyPoints" :key="i" class="exp-keypoint">· {{ kp }}</text>
                  </view>
                </view>
                <view v-if="currentQuestion.explanation.realCase" class="exp-line">
                  <text class="exp-line-label">真实案例：</text>
                  <text class="exp-line-text">{{ currentQuestion.explanation.realCase }}</text>
                </view>
                <view v-if="currentQuestion.explanation.whyA || currentQuestion.explanation.whyB || currentQuestion.explanation.whyC || currentQuestion.explanation.whyD" class="exp-line">
                  <text class="exp-line-label">选项分析：</text>
                  <view class="exp-why-list">
                    <view v-if="currentQuestion.explanation.whyA" class="exp-why-item"><text class="exp-why-label">A：</text><text class="exp-line-text">{{ currentQuestion.explanation.whyA }}</text></view>
                    <view v-if="currentQuestion.explanation.whyB" class="exp-why-item"><text class="exp-why-label">B：</text><text class="exp-line-text">{{ currentQuestion.explanation.whyB }}</text></view>
                    <view v-if="currentQuestion.explanation.whyC" class="exp-why-item"><text class="exp-why-label">C：</text><text class="exp-line-text">{{ currentQuestion.explanation.whyC }}</text></view>
                    <view v-if="currentQuestion.explanation.whyD" class="exp-why-item"><text class="exp-why-label">D：</text><text class="exp-line-text">{{ currentQuestion.explanation.whyD }}</text></view>
                  </view>
                </view>
              </view>
              <text v-else class="feedback-explanation-text">{{ currentQuestion.explanation }}</text>
            </view>
          </view>
          <view class="next-btn" @click="nextQuestion">
            <text class="next-btn-text">{{ currentIndex < questions.length - 1 ? '下一题' : '查看结果' }}</text>
          </view>
        </view>

        <!-- 无选项时的查看解析按钮 -->
        <view v-if="!currentQuestion.options || !currentQuestion.options.length" class="next-btn no-options-btn" @click="showTextOnlyFeedback">
          <text class="next-btn-text">查看解析</text>
        </view>
      </view>

      <!-- 积分动画 -->
      <view v-if="showPointsAnimation" class="points-animation">
        <text class="points-animation-text">+{{ pointsPerQuestion }}</text>
      </view>
    </view>

    <!-- 游戏结束 -->
    <view v-else class="result-body">
      <view class="result-header">
        <view class="result-icon">{{ gameTitle === '法官来了' ? '法' : (gameTitle === '每日一题' ? '日' : '客') }}</view>
        <view class="result-title">挑战完成！</view>
        <view class="result-sub">{{ gameTitle }}</view>
      </view>

      <view class="result-score-card">
        <view class="result-score-label">最终得分</view>
        <view class="result-score-value">{{ currentScore }}</view>
        <view class="result-score-sub">共 {{ questions.length }} 题</view>
      </view>

      <view class="result-stats">
        <view class="result-stat-item">
          <view class="result-stat-num result-stat-correct">{{ correctCount }}</view>
          <view class="result-stat-label">答对</view>
        </view>
        <view class="result-stat-divider"></view>
        <view class="result-stat-item">
          <view class="result-stat-num result-stat-wrong">{{ questions.length - correctCount }}</view>
          <view class="result-stat-label">答错</view>
        </view>
        <view class="result-stat-divider"></view>
        <view class="result-stat-item">
          <view class="result-stat-num">{{ accuracyPercent }}%</view>
          <view class="result-stat-label">正确率</view>
        </view>
      </view>

      <!-- 答题回顾 -->
      <view class="review-section">
        <view class="review-title">答题回顾</view>
        <view v-for="(q, idx) in questions" :key="idx" class="review-item">
          <view class="review-question">
            <text :class="['review-status', userAnswers[idx] === q.correctIndex ? 'review-status-correct' : 'review-status-wrong']">
              {{ userAnswers[idx] === q.correctIndex ? 'V' : 'X' }}
            </text>
            <text class="review-question-text">{{ idx + 1 }}. {{ q.question }}</text>
          </view>
          <view v-if="userAnswers[idx] !== q.correctIndex" class="review-answer">
            <text class="review-answer-label">正确答案：</text>
            <text class="review-answer-text">{{ getOptionText(q, q.correctIndex) }}</text>
          </view>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="result-actions">
        <view class="retry-btn" @click="retryGame">
          <text class="retry-btn-text">再来一次</text>
        </view>
        <view class="share-btn" @click="shareResult">
          <text class="share-btn-text">分享成绩</text>
        </view>
        <view class="back-home-btn" @click="goBack">
          <text class="back-home-btn-text">返回测评</text>
        </view>
      </view>
    </view>

    <view class="footer">
      <text class="footer-icp">京ICP备2026044043号</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../store/user'
import { onLoad } from '@dcloudio/uni-app'

const store = useUserStore()

const optionLabels = ['A', 'B', 'C', 'D']

// 游戏参数
const gameId = ref('')
const gameTitle = ref('')
const quizId = ref('')

// 题目
const questions = ref([])
const currentIndex = ref(0)
const selectedAnswer = ref(-1)
const answered = ref(false)
const showFeedback = ref(false)
const isCorrect = ref(false)
const currentScore = ref(0)
const correctCount = ref(0)
const userAnswers = ref([])
const gameFinished = ref(false)
const showPointsAnimation = ref(false)
const pointsPerQuestion = ref(10)

const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
})

const currentQuestion = computed(() => {
  return questions.value[currentIndex.value] || {}
})

const accuracyPercent = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round((correctCount.value / questions.value.length) * 100)
})

onLoad((options) => {
  gameId.value = options.gameId || ''
  quizId.value = options.quizId || ''
  store.initFromStorage()
  loadQuestions()
})

onMounted(() => {
  uni.setStorageSync('__current_page', '/pages/quiz/game')
})

// 获取今日日期字符串与中文星期
function getTodayInfo() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return { todayStr, todayDay: days[today.getDay()] }
}

// 从周计划中匹配今日条目
function getTodayEntry(weeklySchedule) {
  if (!weeklySchedule || !weeklySchedule.length) return null
  const { todayStr, todayDay } = getTodayInfo()
  return weeklySchedule.find(q => q.date === todayStr || q.day === todayDay) || weeklySchedule[0]
}

// 选项等级中文标签（客户模拟器）
function getLevelLabel(level) {
  const map = { methodology: '方法论', halfMethod: '半方法论', script: '话术', wrong: '错误' }
  return map[level] || level || ''
}

function loadQuestions() {
  if (gameId.value === 'judge') {
    // 法官来了
    gameTitle.value = '法官来了'
    pointsPerQuestion.value = 10
    let data = null
    try {
      data = require('../../data/game_judge_quiz.json')
    } catch (e) {
      data = null
    }
    if (data && data.questions && data.questions.length) {
      gameTitle.value = data.gameName || '法官来了'
      questions.value = data.questions.map((q, i) => {
        // correctOption 是字符串 "A"/"B" 等，需转换为索引
        const correctIndex = q.options.findIndex(o => o.id === q.correctOption)
        return {
          id: q.id,
          difficulty: q.difficulty,
          scenario: q.scenario,
          question: q.question,
          options: q.options,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          explanation: q.explanation,
          tags: q.tags,
          index: i,
        }
      })
      userAnswers.value = new Array(questions.value.length).fill(-1)
      return
    }
  } else if (gameId.value === 'simulator') {
    // 客户模拟器
    gameTitle.value = '客户模拟器'
    pointsPerQuestion.value = 15
    let data = null
    try {
      data = require('../../data/game_client_simulator.json')
    } catch (e) {
      data = null
    }
    if (data && data.scenarios && data.scenarios.length) {
      gameTitle.value = data.gameName || '客户模拟器'
      questions.value = data.scenarios.map((s, i) => {
        // 没有 correctOption，正确答案取 score 最高的选项
        const correctIndex = s.options.reduce((best, opt, idx) => (opt.score || 0) > (s.options[best].score || 0) ? idx : best, 0)
        return {
          id: s.id,
          difficulty: s.domain,
          scenario: s.scenario,
          clientAvatar: s.clientAvatar,
          clientMood: s.clientMood,
          clientSays: s.clientSays,
          question: '你会怎么回应？',
          options: s.options,
          correctIndex,
          explanation: s.analysis,
          index: i,
        }
      })
      userAnswers.value = new Array(questions.value.length).fill(-1)
      return
    }
  } else if (gameId.value === 'daily') {
    // 每日一题：从 dailyQuestionSchedule.weeklySchedule 匹配今日条目，
    // 再通过 scenarioId 关联到客户模拟器的对应场景
    gameTitle.value = '每日一题'
    pointsPerQuestion.value = 20
    let scheduleData = null
    let simData = null
    try {
      scheduleData = require('../../data/brand_and_schedule.json')
    } catch (e) {}
    try {
      simData = require('../../data/game_client_simulator.json')
    } catch (e) {}

    const weeklySchedule = scheduleData && scheduleData.dailyQuestionSchedule && scheduleData.dailyQuestionSchedule.weeklySchedule
    const todayEntry = getTodayEntry(weeklySchedule)
    const targetScenarioId = quizId.value || (todayEntry && todayEntry.scenarioId)
    const scenario = simData && simData.scenarios ? simData.scenarios.find(s => s.id === targetScenarioId) : null

    if (scenario) {
      // 找到关联场景，作为单题加载
      const correctIndex = scenario.options.reduce((best, opt, idx) => (opt.score || 0) > (scenario.options[best].score || 0) ? idx : best, 0)
      questions.value = [{
        id: scenario.id,
        difficulty: todayEntry ? todayEntry.difficulty : scenario.domain,
        scenario: scenario.scenario,
        clientAvatar: scenario.clientAvatar,
        clientMood: scenario.clientMood,
        clientSays: scenario.clientSays,
        question: '你会怎么回应？',
        options: scenario.options,
        correctIndex,
        explanation: scenario.analysis,
        index: 0,
      }]
      userAnswers.value = [-1]
      return
    }
    if (todayEntry) {
      // 找到今日条目但未匹配到场景，显示题目文本
      questions.value = [{
        id: todayEntry.scenarioId || 'daily',
        scenario: todayEntry.entryQuestion,
        question: todayEntry.entryQuestion,
        options: [],
        correctIndex: 0,
        explanation: '今日题目关联的场景数据暂未找到，请稍后重试。',
        index: 0,
      }]
      userAnswers.value = [-1]
      return
    }
  }

  // 兜底：加载失败
  questions.value = [
    {
      question: '题目加载失败，请返回重试',
      options: [{ id: 'A', text: '返回' }],
      correctIndex: 0,
      explanation: '',
    },
  ]
  userAnswers.value = [-1]
}

function selectOption(idx) {
  if (answered.value) return

  selectedAnswer.value = idx
  answered.value = true
  showFeedback.value = true
  userAnswers.value[currentIndex.value] = idx

  const correct = idx === currentQuestion.value.correctIndex
  isCorrect.value = correct

  if (correct) {
    correctCount.value += 1
    currentScore.value += pointsPerQuestion.value
    store.recordAnswer(true)
    store.earnPoints(pointsPerQuestion.value, 'quiz')
    showPointsAnimation.value = true
    setTimeout(() => {
      showPointsAnimation.value = false
    }, 1500)
  } else {
    store.recordAnswer(false)
  }
}

// 无选项时的反馈（每日一题兜底）
function showTextOnlyFeedback() {
  if (answered.value) return
  answered.value = true
  showFeedback.value = true
  isCorrect.value = true
  correctCount.value += 1
  userAnswers.value[currentIndex.value] = 0
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1
    selectedAnswer.value = -1
    answered.value = false
    showFeedback.value = false
    isCorrect.value = false
  } else {
    gameFinished.value = true
  }
}

function getOptionText(question, idx) {
  if (!question || !question.options || !question.options.length) return ''
  const opt = question.options[idx]
  if (!opt) return ''
  return typeof opt === 'string' ? opt : (opt.text || '')
}

function retryGame() {
  currentIndex.value = 0
  selectedAnswer.value = -1
  answered.value = false
  showFeedback.value = false
  isCorrect.value = false
  currentScore.value = 0
  correctCount.value = 0
  userAnswers.value = new Array(questions.value.length).fill(-1)
  gameFinished.value = false
}

function shareResult() {
  const shareText = `我在【风声】${gameTitle.value}中获得了${currentScore.value}分！正确率${accuracyPercent.value}%，快来挑战吧！`
  uni.setClipboardData({
    data: shareText,
    success: () => {
      uni.showToast({ title: '成绩已复制，分享给好友吧', icon: 'success', duration: 2000 })
    },
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  display: flex;
  flex-direction: column;
}

/* 游戏进行中 */
.game-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20rpx;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  font-size: 32rpx;
  font-weight: 700;
  color: #3d5a3e;
}
.game-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
}
.header-placeholder {
  width: 64rpx;
}

/* 进度条 */
.progress-section {
  padding: 10rpx 0 20rpx;
}
.progress-bar {
  height: 8rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3d5a3e, #5a7a5f);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #888;
}
.progress-score {
  color: #c46a3a;
  font-weight: 700;
}

/* 题目卡片 */
.question-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  flex: 1;
}
.question-index {
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}
.question-index-text {
  font-size: 24rpx;
  color: #3d5a3e;
  font-weight: 700;
  background: #e8f5e9;
  padding: 4rpx 20rpx;
  border-radius: 16rpx;
}
.question-difficulty {
  font-size: 22rpx;
  color: #c46a3a;
  background: #fff3e0;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  margin-left: 12rpx;
}

/* 场景描述 */
.question-scenario {
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.question-scenario-label {
  font-size: 22rpx;
  color: #888;
  font-weight: 700;
  display: block;
  margin-bottom: 8rpx;
}
.question-scenario-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}

/* 客户模拟器：客户原话 */
.question-client-says {
  background: #e8f5e9;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.question-client-info {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 8rpx;
}
.question-client-avatar {
  font-size: 24rpx;
  color: #3d5a3e;
  font-weight: 700;
}
.question-client-mood {
  font-size: 22rpx;
  color: #888;
}
.question-client-says-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  font-style: italic;
}

.question-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
  line-height: 1.6;
  margin-bottom: 28rpx;
}

/* 选项 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.option-item {
  display: flex;
  align-items: center;
  padding: 22rpx 20rpx;
  border: 2rpx solid #eee;
  border-radius: 16rpx;
  position: relative;
  transition: all 0.2s;
}
.option-item.option-disabled {
  pointer-events: none;
}
.option-item.option-selected {
  border-color: #3d5a3e;
  background: #f0f7f0;
}
.option-item.option-correct {
  border-color: #3d5a3e;
  background: #e8f5e9;
}
.option-item.option-wrong {
  border-color: #e57373;
  background: #ffebee;
}
.option-label {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f7f4ef;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.option-item.option-selected .option-label {
  background: #3d5a3e;
}
.option-item.option-selected .option-label-text {
  color: #fff;
}
.option-item.option-correct .option-label {
  background: #3d5a3e;
}
.option-item.option-correct .option-label-text {
  color: #fff;
}
.option-label-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #666;
}
.option-text {
  font-size: 28rpx;
  color: #444;
  flex: 1;
  line-height: 1.5;
}
.option-level-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 10rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}
.option-level-tag.level-methodology {
  background: #e8f5e9;
  color: #3d5a3e;
}
.option-level-tag.level-halfMethod {
  background: #fff3e0;
  color: #c46a3a;
}
.option-level-tag.level-script {
  background: #fff8e1;
  color: #f9a825;
}
.option-level-tag.level-wrong {
  background: #ffebee;
  color: #c62828;
}
.option-score-tag {
  font-size: 20rpx;
  color: #999;
  margin-left: 8rpx;
  flex-shrink: 0;
}
.option-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #3d5a3e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8rpx;
}
.option-check-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 700;
}

/* 无选项提示 */
.no-options-hint {
  text-align: center;
  padding: 30rpx 0;
}
.no-options-text {
  font-size: 26rpx;
  color: #999;
}
.no-options-btn {
  margin-top: 20rpx;
}

/* 答题反馈 */
.feedback-section {
  margin-top: 24rpx;
}
.feedback-card {
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}
.feedback-correct {
  background: #e8f5e9;
  border: 1rpx solid #a5d6a7;
}
.feedback-wrong {
  background: #ffebee;
  border: 1rpx solid #ef9a9a;
}
.feedback-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.feedback-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}
.feedback-correct .feedback-icon {
  background: #3d5a3e;
}
.feedback-wrong .feedback-icon {
  background: #e57373;
}
.feedback-title {
  font-size: 28rpx;
  font-weight: 700;
  flex: 1;
}
.feedback-correct .feedback-title {
  color: #3d5a3e;
}
.feedback-wrong .feedback-title {
  color: #c62828;
}
.feedback-points {
  font-size: 26rpx;
  font-weight: 700;
  color: #c46a3a;
}
.feedback-explanation {
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(0,0,0,0.08);
}
.feedback-explanation-label {
  font-size: 24rpx;
  color: #888;
  font-weight: 700;
}
.feedback-explanation-text {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.feedback-explanation-body {
  margin-top: 8rpx;
}
.exp-line {
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.exp-line:last-child {
  margin-bottom: 0;
}
.exp-line-label {
  font-size: 24rpx;
  color: #3d5a3e;
  font-weight: 700;
  flex-shrink: 0;
}
.exp-line-text {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.exp-keypoints {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin-top: 4rpx;
}
.exp-keypoint {
  font-size: 24rpx;
  color: #555;
  line-height: 1.5;
}
.exp-why-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 4rpx;
}
.exp-why-item {
  display: flex;
  align-items: flex-start;
  gap: 6rpx;
}
.exp-why-label {
  font-size: 24rpx;
  color: #c46a3a;
  font-weight: 700;
  flex-shrink: 0;
}

.next-btn {
  background: #3d5a3e;
  border-radius: 40rpx;
  padding: 22rpx;
  text-align: center;
}
.next-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

/* 积分动画 */
.points-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  animation: pointsFloat 1.5s ease-out forwards;
  pointer-events: none;
}
.points-animation-text {
  font-size: 56rpx;
  font-weight: 900;
  color: #c46a3a;
  text-shadow: 0 4rpx 12rpx rgba(196, 106, 58, 0.3);
}
@keyframes pointsFloat {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.5);
  }
  30% {
    opacity: 1;
    transform: translate(-50%, -80%) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -120%) scale(1);
  }
}

/* 游戏结束 */
.result-body {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-header {
  text-align: center;
  padding: 40rpx 0 30rpx;
}
.result-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
  color: #fff;
  font-size: 44rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}
.result-title {
  font-size: 40rpx;
  font-weight: 900;
  color: #222;
}
.result-sub {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

.result-score-card {
  background: linear-gradient(135deg, #3d5a3e, #5a7a5f);
  border-radius: 24rpx;
  padding: 40rpx 60rpx;
  text-align: center;
  margin-bottom: 24rpx;
  width: 100%;
}
.result-score-label {
  font-size: 26rpx;
  color: rgba(255,255,255,0.7);
  margin-bottom: 8rpx;
}
.result-score-value {
  font-size: 80rpx;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  margin-bottom: 8rpx;
}
.result-score-sub {
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
}

.result-stats {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  width: 100%;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.result-stat-item {
  flex: 1;
  text-align: center;
}
.result-stat-num {
  font-size: 40rpx;
  font-weight: 900;
  margin-bottom: 6rpx;
}
.result-stat-correct {
  color: #3d5a3e;
}
.result-stat-wrong {
  color: #e57373;
}
.result-stat-label {
  font-size: 22rpx;
  color: #888;
}
.result-stat-divider {
  width: 2rpx;
  height: 48rpx;
  background: #eee;
}

/* 答题回顾 */
.review-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  width: 100%;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.review-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 16rpx;
}
.review-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.review-item:last-child {
  border-bottom: none;
}
.review-question {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.review-status {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
  margin-top: 4rpx;
}
.review-status-correct {
  background: #3d5a3e;
}
.review-status-wrong {
  background: #e57373;
}
.review-question-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.5;
  flex: 1;
}
.review-answer {
  margin-top: 8rpx;
  padding-left: 48rpx;
}
.review-answer-label {
  font-size: 22rpx;
  color: #888;
}
.review-answer-text {
  font-size: 22rpx;
  color: #3d5a3e;
  font-weight: 500;
}

/* 结果页操作按钮 */
.result-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 40rpx;
}
.retry-btn {
  background: #3d5a3e;
  border-radius: 40rpx;
  padding: 22rpx;
  text-align: center;
}
.retry-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}
.share-btn {
  background: #fff;
  border: 2rpx solid #c46a3a;
  border-radius: 40rpx;
  padding: 22rpx;
  text-align: center;
}
.share-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #c46a3a;
}
.back-home-btn {
  text-align: center;
  padding: 10rpx;
}
.back-home-btn-text {
  font-size: 26rpx;
  color: #888;
}

.footer {
  text-align: center;
  padding: 20rpx;
  background: #f7f4ef;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>
