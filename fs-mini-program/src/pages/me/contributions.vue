<template>
  <view class="page">
    <!-- 贡献统计 -->
    <view class="stats-card">
      <view class="stat-item">
        <view class="stat-value">{{ totalContributions }}</view>
        <view class="stat-label">总贡献</view>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <view class="stat-value accepted">{{ acceptedCount }}</view>
        <view class="stat-label">已采纳</view>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <view class="stat-value pending">{{ pendingCount }}</view>
        <view class="stat-label">审核中</view>
      </view>
    </view>

    <!-- 贡献列表 -->
    <view class="section">
      <view class="section-title">贡献列表</view>
      <view v-if="contributions.length > 0" class="contrib-list">
        <view class="contrib-item" v-for="(item, idx) in contributions" :key="idx">
          <view class="contrib-top">
            <view :class="['contrib-type', typeClass(item.type)]">{{ typeLabel(item.type) }}</view>
            <view :class="['contrib-status', statusClass(item.status)]">{{ item.status }}</view>
          </view>
          <view class="contrib-entry" v-if="item.entryName">关联词条：{{ item.entryName }}</view>
          <view class="contrib-desc" v-if="item.description">{{ item.description }}</view>
          <view class="contrib-time">{{ item.time }}</view>
        </view>
      </view>
      <view class="empty-state" v-else>
        <view class="empty-icon">&#9998;</view>
        <text>暂无贡献记录</text>
        <text class="empty-hint">你的每一次贡献，都在帮助行业进步</text>
      </view>
    </view>

    <!-- 新建贡献 -->
    <view class="section">
      <view class="section-title">新建贡献</view>
      <view class="create-actions">
        <view class="create-btn" @click="openForm('correction')">
          <view class="create-icon correction-bg">&#10003;</view>
          <view class="create-info">
            <view class="create-name">纠错</view>
            <view class="create-points">+20分</view>
          </view>
        </view>
        <view class="create-btn" @click="openForm('verification')">
          <view class="create-icon verification-bg">&#9744;</view>
          <view class="create-info">
            <view class="create-name">验证</view>
            <view class="create-points">+10分</view>
          </view>
        </view>
        <view class="create-btn" @click="openForm('question')">
          <view class="create-icon question-bg">&#63;</view>
          <view class="create-info">
            <view class="create-name">提问</view>
            <view class="create-points">+10分</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 提交表单弹层 -->
    <view class="form-overlay" v-if="showForm" @click="closeForm">
      <view class="form-panel" @click.stop>
        <view class="form-header">
          <view class="form-title">{{ formTitle }}</view>
          <view class="form-close" @click="closeForm">&times;</view>
        </view>
        <view class="form-body">
          <!-- 词条选择 -->
          <view class="form-field">
            <view class="field-label">关联词条</view>
            <input
              class="field-input"
              v-model="formData.entryName"
              placeholder="请输入词条名称"
            />
          </view>

          <!-- 纠错：错误类型 + 正确内容 + 证据 -->
          <template v-if="formType === 'correction'">
            <view class="form-field">
              <view class="field-label">错误类型</view>
              <picker
                :range="errorTypes"
                @change="onErrorTypeChange"
              >
                <view class="picker-field">
                  {{ formData.errorType || '请选择错误类型' }}
                </view>
              </picker>
            </view>
            <view class="form-field">
              <view class="field-label">正确内容</view>
              <textarea
                class="field-textarea"
                v-model="formData.correctContent"
                placeholder="请填写正确的词条内容"
              />
            </view>
            <view class="form-field">
              <view class="field-label">证据/来源</view>
              <textarea
                class="field-textarea"
                v-model="formData.evidence"
                placeholder="请提供正确的依据或来源链接"
              />
            </view>
          </template>

          <!-- 验证：确认或反驳 -->
          <template v-if="formType === 'verification'">
            <view class="form-field">
              <view class="field-label">验证结论</view>
              <view class="radio-group">
                <view
                  :class="['radio-item', formData.verdict === 'confirm' ? 'radio-active' : '']"
                  @click="formData.verdict = 'confirm'"
                >
                  <view class="radio-dot"></view>
                  <text>确认</text>
                </view>
                <view
                  :class="['radio-item', formData.verdict === 'refute' ? 'radio-active' : '']"
                  @click="formData.verdict = 'refute'"
                >
                  <view class="radio-dot"></view>
                  <text>反驳</text>
                </view>
              </view>
            </view>
            <view class="form-field">
              <view class="field-label">验证说明</view>
              <textarea
                class="field-textarea"
                v-model="formData.description"
                placeholder="请说明验证的依据或理由"
              />
            </view>
          </template>

          <!-- 提问：问题 + 关联词条 -->
          <template v-if="formType === 'question'">
            <view class="form-field">
              <view class="field-label">问题内容</view>
              <textarea
                class="field-textarea"
                v-model="formData.question"
                placeholder="请输入你想提问的问题"
              />
            </view>
          </template>
        </view>
        <view class="form-footer">
          <view class="form-cancel" @click="closeForm">取消</view>
          <view class="form-submit" @click="submitContribution">提交</view>
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
import { post } from '../../api/request'

const userStore = useUserStore()

// 贡献数据
const contributions = ref([])
const totalContributions = computed(() => contributions.value.length)
const acceptedCount = computed(() => contributions.value.filter(c => c.status === '已采纳').length)
const pendingCount = computed(() => contributions.value.filter(c => c.status === '审核中').length)

// 新建贡献
const showForm = ref(false)
const formType = ref('correction')
const formData = ref({
  entryName: '',
  errorType: '',
  correctContent: '',
  evidence: '',
  verdict: 'confirm',
  description: '',
  question: '',
})

const errorTypes = ['事实错误', '表述不清', '信息过时', '数据错误', '格式错误', '其他']

const formTitle = computed(() => {
  const map = { correction: '纠错', verification: '验证', question: '提问' }
  return map[formType.value] || '贡献'
})

onMounted(() => {
  loadContributions()
})

function loadContributions() {
  const stored = uni.getStorageSync('fs_contributions') || []
  contributions.value = stored
}

function typeLabel(type) {
  const map = { correction: '纠错', verification: '验证', question: '提问' }
  return map[type] || type
}

function typeClass(type) {
  return 'type-' + type
}

function statusClass(status) {
  if (status === '已采纳') return 'status-accepted'
  if (status === '审核中') return 'status-pending'
  return 'status-rejected'
}

function openForm(type) {
  formType.value = type
  formData.value = {
    entryName: '',
    errorType: '',
    correctContent: '',
    evidence: '',
    verdict: 'confirm',
    description: '',
    question: '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function onErrorTypeChange(e) {
  formData.value.errorType = errorTypes[e.detail.value]
}

async function submitContribution() {
  // 基础校验
  if (!formData.value.entryName.trim()) {
    uni.showToast({ title: '请填写关联词条', icon: 'none' })
    return
  }

  if (formType.value === 'correction') {
    if (!formData.value.errorType) {
      uni.showToast({ title: '请选择错误类型', icon: 'none' })
      return
    }
    if (!formData.value.correctContent.trim()) {
      uni.showToast({ title: '请填写正确内容', icon: 'none' })
      return
    }
  }

  if (formType.value === 'verification' && !formData.value.description.trim()) {
    uni.showToast({ title: '请填写验证说明', icon: 'none' })
    return
  }

  if (formType.value === 'question' && !formData.value.question.trim()) {
    uni.showToast({ title: '请填写问题内容', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交中...' })

  try {
    const payload = {
      type: formType.value,
      entryName: formData.value.entryName,
      userId: userStore.userId || uni.getStorageSync('fs_user_id'),
      ...formData.value,
    }

    await post('/api/contribution', payload)

    // 本地也保存一份
    const newContrib = {
      type: formType.value,
      entryName: formData.value.entryName,
      status: '审核中',
      time: new Date().toLocaleString('zh-CN'),
      description: formType.value === 'correction'
        ? `错误类型：${formData.value.errorType}`
        : formType.value === 'verification'
          ? formData.value.description
          : formData.value.question,
    }
    const stored = uni.getStorageSync('fs_contributions') || []
    stored.unshift(newContrib)
    uni.setStorageSync('fs_contributions', stored)
    contributions.value = stored

    uni.hideLoading()
    uni.showToast({ title: '提交成功', icon: 'success' })
    showForm.value = false
  } catch (err) {
    uni.hideLoading()
    // 即使网络失败也本地保存
    const newContrib = {
      type: formType.value,
      entryName: formData.value.entryName,
      status: '审核中',
      time: new Date().toLocaleString('zh-CN'),
      description: formType.value === 'correction'
        ? `错误类型：${formData.value.errorType}`
        : formType.value === 'verification'
          ? formData.value.description
          : formData.value.question,
    }
    const stored = uni.getStorageSync('fs_contributions') || []
    stored.unshift(newContrib)
    uni.setStorageSync('fs_contributions', stored)
    contributions.value = stored
    showForm.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40rpx;
}

/* 统计卡片 */
.stats-card {
  display: flex;
  align-items: center;
  margin: 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.stat-item {
  flex: 1;
  text-align: center;
}
.stat-value {
  font-size: 44rpx;
  font-weight: 900;
  color: #3d5a3e;
}
.stat-value.accepted {
  color: #3d5a3e;
}
.stat-value.pending {
  color: #c46a3a;
}
.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}
.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}

/* 分区 */
.section {
  margin: 0 20rpx 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}

/* 贡献列表 */
.contrib-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.contrib-item:last-child {
  border-bottom: none;
}
.contrib-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.contrib-type {
  font-size: 24rpx;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  color: #fff;
}
.type-correction {
  background: #e74c3c;
}
.type-verification {
  background: #3d5a3e;
}
.type-question {
  background: #1976d2;
}
.contrib-status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
}
.status-accepted {
  background: #e8f5e9;
  color: #3d5a3e;
}
.status-pending {
  background: #fff3e0;
  color: #c46a3a;
}
.status-rejected {
  background: #fce4ec;
  color: #c62828;
}
.contrib-entry {
  font-size: 26rpx;
  color: #555;
  margin-top: 8rpx;
}
.contrib-desc {
  font-size: 24rpx;
  color: #888;
  margin-top: 4rpx;
  word-break: break-all;
}
.contrib-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 6rpx;
}

.empty-state {
  text-align: center;
  padding: 48rpx 0;
}
.empty-icon {
  font-size: 60rpx;
  color: #ddd;
  margin-bottom: 12rpx;
}
.empty-state text {
  display: block;
  font-size: 26rpx;
  color: #bbb;
}
.empty-hint {
  margin-top: 8rpx;
  font-size: 22rpx !important;
  color: #ccc !important;
}

/* 新建贡献按钮 */
.create-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}
.create-btn {
  flex: 1;
  background: #f7f4ef;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.create-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #fff;
  margin-bottom: 10rpx;
}
.correction-bg {
  background: #e74c3c;
}
.verification-bg {
  background: #3d5a3e;
}
.question-bg {
  background: #1976d2;
}
.create-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}
.create-points {
  font-size: 22rpx;
  color: #c46a3a;
  margin-top: 4rpx;
}

/* 表单弹层 */
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.form-panel {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  overflow-y: auto;
}
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 28rpx 0;
}
.form-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
}
.form-close {
  font-size: 44rpx;
  color: #bbb;
  line-height: 1;
  padding: 0 8rpx;
}
.form-body {
  padding: 24rpx 28rpx;
}
.form-field {
  margin-bottom: 24rpx;
}
.field-label {
  font-size: 26rpx;
  color: #555;
  margin-bottom: 10rpx;
}
.field-input {
  height: 76rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.field-textarea {
  width: 100%;
  height: 160rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.picker-field {
  height: 76rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  display: flex;
  align-items: center;
}
.radio-group {
  display: flex;
  gap: 20rpx;
}
.radio-item {
  display: flex;
  align-items: center;
  padding: 16rpx 28rpx;
  background: #f7f4ef;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #888;
}
.radio-item.radio-active {
  background: #e8f5e9;
  color: #3d5a3e;
}
.radio-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 14rpx;
  border: 3rpx solid #ccc;
  margin-right: 12rpx;
  box-sizing: border-box;
}
.radio-active .radio-dot {
  border-color: #3d5a3e;
  background: #3d5a3e;
}
.form-footer {
  display: flex;
  padding: 20rpx 28rpx 40rpx;
  gap: 20rpx;
}
.form-cancel {
  flex: 1;
  text-align: center;
  padding: 22rpx;
  background: #f7f4ef;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #888;
}
.form-submit {
  flex: 2;
  text-align: center;
  padding: 22rpx;
  background: #3d5a3e;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 20rpx;
}
.footer-icp {
  font-size: 20rpx;
  color: #bbb;
}
</style>