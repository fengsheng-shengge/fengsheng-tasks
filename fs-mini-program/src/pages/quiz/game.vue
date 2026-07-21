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
        </view>
        <view class="question-title">{{ currentQuestion.question }}</view>

        <!-- 选项 -->
        <view class="options-list">
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
            <view v-if="answered && idx === currentQuestion.correctIndex" class="option-check">
              <text class="option-check-text">V</text>
            </view>
          </view>
        </view>

        <!-- 答题反馈 -->
        <view v-if="showFeedback" class="feedback-section">
          <view :class="['feedback-card', isCorrect ? 'feedback-correct' : 'feedback-wrong']">
            <view class="feedback-header">
              <text class="feedback-icon">{{ isCorrect ? 'V' : 'X' }}</text>
              <text class="feedback-title">{{ isCorrect ? '回答正确！' : '回答错误' }}</text>
              <text v-if="isCorrect" class="feedback-points">+{{ pointsPerQuestion }}积分</text>
            </view>
            <view class="feedback-explanation" v-if="currentQuestion.explanation">
              <text class="feedback-explanation-label">解析：</text>
              <text class="feedback-explanation-text">{{ currentQuestion.explanation }}</text>
            </view>
          </view>
          <view class="next-btn" @click="nextQuestion">
            <text class="next-btn-text">{{ currentIndex < questions.length - 1 ? '下一题' : '查看结果' }}</text>
          </view>
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
        <view class="result-icon">{{ gameTitle === '法官来了' ? '法' : '客' }}</view>
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
  store.initFromStorage()
  loadQuestions()
})

onMounted(() => {
  uni.setStorageSync('__current_page', '/pages/quiz/game')
})

function loadQuestions() {
  let data = null

  if (gameId.value === 'judge') {
    gameTitle.value = '法官来了'
    pointsPerQuestion.value = 10
    try {
      data = require('../../data/game_judge_quiz.json')
    } catch (e) {
      data = getDefaultJudgeQuestions()
    }
  } else if (gameId.value === 'simulator') {
    gameTitle.value = '客户模拟器'
    pointsPerQuestion.value = 15
    try {
      data = require('../../data/game_client_simulator.json')
    } catch (e) {
      data = getDefaultSimulatorQuestions()
    }
  } else {
    // 每日一题或其他
    gameTitle.value = '每日一题'
    pointsPerQuestion.value = 20
    try {
      data = require('../../data/brand_and_schedule.json')
      if (data && data.dailyQuiz && data.dailyQuiz.questions) {
        data = { questions: data.dailyQuiz.questions }
      }
    } catch (e) {
      data = getDefaultDailyQuestions()
    }
  }

  if (data && data.questions) {
    questions.value = data.questions.map((q, i) => ({
      ...q,
      index: i,
      correctIndex: q.correctIndex !== undefined ? q.correctIndex : q.correct,
    }))
    userAnswers.value = new Array(questions.value.length).fill(-1)
  } else {
    questions.value = [
      {
        question: '题目加载失败，请返回重试',
        options: ['返回'],
        correctIndex: 0,
        explanation: '',
      },
    ]
    userAnswers.value = [-1]
  }
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
  if (!question || !question.options) return ''
  const opt = question.options[idx]
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

// 默认题目数据 - 法官来了
function getDefaultJudgeQuestions() {
  return {
    title: '法官来了',
    questions: [
      {
        question: '根据《民法典》，租赁合同的期限最长不得超过多少年？',
        options: ['10年', '15年', '20年', '30年'],
        correctIndex: 2,
        explanation: '《民法典》第705条规定，租赁期限不得超过二十年。超过二十年的，超过部分无效。',
      },
      {
        question: '出租人出卖租赁房屋的，应当在出卖之前的合理期限内通知承租人，承租人享有什么权利？',
        options: ['优先购买权', '优先承租权', '优先使用权', '优先抵押权'],
        correctIndex: 0,
        explanation: '《民法典》第726条规定，出租人出卖租赁房屋的，承租人享有以同等条件优先购买的权利。',
      },
      {
        question: '承租人在租赁期限内死亡的，与其生前共同居住的人可以按照什么继续租赁？',
        options: ['需要重新签订合同', '原租赁合同', '按市场价格续租', '需要房东同意'],
        correctIndex: 1,
        explanation: '《民法典》第732条规定，承租人在房屋租赁期限内死亡的，与其生前共同居住的人或者共同经营人可以按照原租赁合同租赁该房屋。',
      },
      {
        question: '租赁合同未约定转租事项，承租人能否转租？',
        options: ['可以自由转租', '经出租人同意可以转租', '绝对不可以转租', '只需通知出租人即可'],
        correctIndex: 1,
        explanation: '《民法典》第716条规定，承租人经出租人同意，可以将租赁物转租给第三人。未经出租人同意转租的，出租人可以解除合同。',
      },
      {
        question: '租赁合同到期后，承租人继续使用租赁物，出租人没有提出异议的，原租赁合同效力如何？',
        options: ['自动终止', '变为不定期租赁', '自动续期一年', '需要重新签订'],
        correctIndex: 1,
        explanation: '《民法典》第734条规定，租赁期限届满，承租人继续使用租赁物，出租人没有提出异议的，原租赁合同继续有效，但租赁期限为不定期。',
      },
    ],
  }
}

// 默认题目数据 - 客户模拟器
function getDefaultSimulatorQuestions() {
  return {
    title: '客户模拟器',
    questions: [
      {
        question: '客户说"这套房子太贵了，我的预算不够"，你该如何回应？',
        options: [
          '直接推荐更便宜的房子',
          '先共情，了解具体预算差距，再分析性价比',
          '强调这套房子的优点',
          '告诉客户可以适当提高预算',
        ],
        correctIndex: 1,
        explanation: '先共情接纳客户的情绪，了解具体的预算差距，然后分析这套房子的性价比，让客户理解价值所在。',
      },
      {
        question: '客户看了多套房子后说"我再考虑考虑"，最佳跟进方式是？',
        options: [
          '每天打电话催促',
          '给客户足够的空间，一周后再联系',
          '约定一个具体的时间再联系，同时提供有帮助的信息',
          '直接放弃这个客户',
        ],
        correctIndex: 2,
        explanation: '约定具体时间再联系，给客户尊重感，同时在此期间提供房源信息或市场分析等有价值的内容。',
      },
      {
        question: '客户担心房价会跌，你该如何回应？',
        options: [
          '保证房价绝对不会跌',
          '用数据说话，分析区域市场趋势，帮助客户理性决策',
          '告诉客户担心是多余的',
          '建议客户等房价跌了再买',
        ],
        correctIndex: 1,
        explanation: '用客观数据分析市场趋势，帮助客户理性判断，而不是盲目保证或否定客户的担忧。',
      },
      {
        question: '客户要求看一套已经租出去的房子，你该怎么做？',
        options: [
          '直接拒绝',
          '先联系现有租客预约时间，告知客户实际情况',
          '带客户直接去看',
          '建议客户换一套',
        ],
        correctIndex: 1,
        explanation: '尊重现有租客的权益，提前预约，同时告知客户实际情况，体现专业和诚信。',
      },
      {
        question: '客户对房子满意但觉得押金太高，最佳处理方式是？',
        options: [
          '直接免除押金',
          '解释押金的必要性和退还机制，必要时协商分期支付',
          '坚持原价不变',
          '让客户自己想办法',
        ],
        correctIndex: 1,
        explanation: '耐心解释押金的用途和退还机制，展现灵活性但保持底线，必要时可协商分期支付方案。',
      },
    ],
  }
}

// 默认每日一题
function getDefaultDailyQuestions() {
  return {
    questions: [
      {
        question: '在租赁业务中，经纪人最重要的品质是什么？',
        options: ['口才好', '诚信和专业', '人脉广', '长得好看'],
        correctIndex: 1,
        explanation: '诚信和专业是经纪人的立身之本。只有真正为客户着想，才能建立长期信任关系。',
      },
    ],
  }
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
}
.question-index-text {
  font-size: 24rpx;
  color: #3d5a3e;
  font-weight: 700;
  background: #e8f5e9;
  padding: 4rpx 20rpx;
  border-radius: 16rpx;
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
.option-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #3d5a3e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.option-check-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 700;
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