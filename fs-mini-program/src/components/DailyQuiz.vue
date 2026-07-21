<template>
  <view class="daily-quiz" v-if="quiz">
    <view class="quiz-header">
      <view class="quiz-header-left">
        <text class="quiz-title">每日一题</text>
        <text class="quiz-date">{{ quiz.date }}</text>
      </view>
      <view class="quiz-header-right">
        <text class="quiz-points">+{{ quiz.earnedPoints }} 积分</text>
      </view>
    </view>

    <!-- 未答题状态 -->
    <view v-if="!answered" class="quiz-body">
      <view class="quiz-question">{{ quiz.question }}</view>
      <view class="quiz-options">
        <view
          v-for="(opt, idx) in quiz.options"
          :key="idx"
          :class="['quiz-option', { selected: selectedOption === idx }]"
          @click="selectOption(idx)"
        >
          <text class="option-letter">{{ optionLetters[idx] }}</text>
          <text class="option-text">{{ opt }}</text>
        </view>
      </view>
      <view class="quiz-submit-wrap">
        <view
          :class="['quiz-submit-btn', { disabled: selectedOption === null }]"
          @click="submitAnswer"
        >
          {{ submitting ? '提交中...' : '提交答案' }}
        </view>
      </view>
    </view>

    <!-- 已答题状态 -->
    <view v-else class="quiz-result">
      <view :class="['result-banner', isCorrect ? 'correct' : 'wrong']">
        <text class="result-icon">{{ isCorrect ? '✓' : '✗' }}</text>
        <text class="result-text">{{ isCorrect ? '回答正确！' : '回答错误' }}</text>
        <text class="result-points">+{{ isCorrect ? quiz.earnedPoints : 0 }} 积分</text>
      </view>
      <view class="result-explanation">
        <text class="explanation-label">解析</text>
        <text class="explanation-text">{{ quiz.explanation }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  quiz: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['earned'])

const optionLetters = ['A', 'B', 'C', 'D']
const selectedOption = ref(null)
const answered = ref(false)
const isCorrect = ref(false)
const submitting = ref(false)

const selectOption = (idx) => {
  if (answered.value) return
  selectedOption.value = idx
}

const submitAnswer = () => {
  if (selectedOption.value === null || answered.value || submitting.value) return
  submitting.value = true

  setTimeout(() => {
    isCorrect.value = selectedOption.value === props.quiz.answer
    answered.value = true
    submitting.value = false

    if (isCorrect.value) {
      emit('earned', props.quiz.earnedPoints)
    }
  }, 600)
}
</script>

<style scoped>
.daily-quiz {
  margin: 24rpx 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #3d5a3e, #4a6b4b);
}

.quiz-header-left {
  display: flex;
  flex-direction: column;
}

.quiz-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

.quiz-date {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}

.quiz-points {
  font-size: 26rpx;
  color: #c46a3a;
  font-weight: 700;
  background: #ffffff;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.quiz-body {
  padding: 28rpx;
}

.quiz-question {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.quiz-option {
  display: flex;
  align-items: center;
  padding: 22rpx 20rpx;
  background: #f7f4ef;
  border-radius: 14rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.quiz-option.selected {
  border-color: #3d5a3e;
  background: #ecf5ec;
}

.option-letter {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #3d5a3e;
  background: #dcedc8;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.option-text {
  font-size: 26rpx;
  color: #444;
  line-height: 1.5;
  flex: 1;
}

.quiz-submit-wrap {
  margin-top: 24rpx;
  display: flex;
  justify-content: center;
}

.quiz-submit-btn {
  background: #3d5a3e;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  padding: 18rpx 80rpx;
  border-radius: 40rpx;
}

.quiz-submit-btn.disabled {
  opacity: 0.4;
}

/* 答题结果 */
.quiz-result {
  padding: 28rpx;
}

.result-banner {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.result-banner.correct {
  background: #e8f5e9;
}

.result-banner.wrong {
  background: #fce4ec;
}

.result-icon {
  font-size: 36rpx;
  font-weight: 900;
  margin-right: 12rpx;
}

.result-banner.correct .result-icon {
  color: #3d5a3e;
}

.result-banner.wrong .result-icon {
  color: #c62828;
}

.result-text {
  font-size: 28rpx;
  font-weight: 700;
  flex: 1;
}

.result-banner.correct .result-text {
  color: #3d5a3e;
}

.result-banner.wrong .result-text {
  color: #c62828;
}

.result-points {
  font-size: 26rpx;
  font-weight: 700;
  color: #c46a3a;
}

.result-explanation {
  padding: 20rpx;
  background: #f7f4ef;
  border-radius: 14rpx;
}

.explanation-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #3d5a3e;
  margin-bottom: 10rpx;
  display: block;
}

.explanation-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
}
</style>