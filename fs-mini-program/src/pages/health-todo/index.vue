<template>
  <view class="page">
    <view class="section-header">
      <text class="section-title">健康盯办</text>
      <text class="section-more">自己的健康 · 自己盯</text>
      <button class="add-btn" @tap="openForm()">＋ 新增</button>
    </view>

    <view class="tip-bar">
      <text class="tip-t">🩺 把复诊、体检、用药等健康事项记在这里，到期主动提醒，帮你不失其所。</text>
    </view>

    <view v-if="list.length === 0" class="empty">
      <view class="empty-ico">🩺</view>
      <view class="empty-t">还没有健康盯办项</view>
      <view class="empty-s">从第一件开始：复诊预约、年度体检、每日用药……</view>
      <button class="empty-btn" @tap="openForm()">＋ 立即新增一项</button>
    </view>

    <view class="todo-card" v-for="(it, i) in sortedList" :key="it.id" :class="{ done: it.done }" @tap="toggle(it)">
      <view class="tc-left">
        <view class="tc-check" :class="{ on: it.done }">{{ it.done ? '✓' : '' }}</view>
      </view>
      <view class="tc-body">
        <view class="tc-title">{{ it.title }}</view>
        <view class="tc-meta">
          <text class="tc-type" :class="'ty-' + it.type">{{ typeLabel(it.type) }}</text>
          <text class="tc-due" :class="{ overdue: isOverdue(it) && !it.done }">{{ dueText(it) }}</text>
        </view>
        <view class="tc-note" v-if="it.note">{{ it.note }}</view>
      </view>
      <view class="tc-ops" @tap.stop="openForm(it)">
        <text class="tc-edit">编辑</text>
      </view>
    </view>

    <!-- 新增 / 编辑表单 -->
    <view v-if="showForm" class="overlay active">
      <view class="ov-nav">
        <button class="back" @tap="closeForm()">‹</button>
        <view class="ov-title">{{ editingId ? '编辑盯办项' : '新增健康盯办' }}</view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="form-row">
          <text class="form-label">事项</text>
          <input class="form-input" v-model="form.title" placeholder="如：年度体检 / 复诊肝胆外科" maxlength="40" />
        </view>
        <view class="form-row">
          <text class="form-label">类型</text>
          <view class="type-chips">
            <text v-for="t in types" :key="t.k" class="tchip" :class="['ty-' + t.k, { on: form.type === t.k }]" @tap="form.type = t.k">{{ t.label }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">截止日期</text>
          <picker mode="date" :value="form.due" @change="onDue">
            <view class="form-input picker">{{ form.due || '选择日期' }}</view>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">备注</text>
          <textarea class="form-area" v-model="form.note" placeholder="可填地点、科室、准备事项等" maxlength="200" />
        </view>
        <view class="form-actions">
          <button class="btn-del" v-if="editingId" @tap="remove()">删除</button>
          <button class="btn-save" @tap="save()">保存</button>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const STORE_KEY = 'fs_health_todo_v1'
const types = [
  { k: 'revisit', label: '复诊' },
  { k: 'checkup', label: '体检' },
  { k: 'medicine', label: '用药' },
  { k: 'other', label: '其他' }
]

const list = ref([])
const showForm = ref(false)
const editingId = ref('')
const form = ref({ title: '', type: 'revisit', due: '', note: '' })

function load() {
  try { list.value = uni.getStorageSync(STORE_KEY) || [] } catch (e) { list.value = [] }
}
function persist() {
  uni.setStorageSync(STORE_KEY, list.value)
}

function typeLabel(k) {
  const m = { revisit: '复诊', checkup: '体检', medicine: '用药', other: '其他' }
  return m[k] || '其他'
}

const sortedList = computed(() => {
  return [...list.value].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due < b.due ? -1 : 1
  })
})

function dueText(it) {
  if (!it.due) return '未设日期'
  const today = new Date().toISOString().slice(0, 10)
  if (it.due === today) return '今天截止'
  return '截止 ' + it.due
}
function isOverdue(it) {
  if (!it.due) return false
  return it.due < new Date().toISOString().slice(0, 10)
}

function openForm(it) {
  if (it) {
    editingId.value = it.id
    form.value = { title: it.title, type: it.type, due: it.due, note: it.note }
  } else {
    editingId.value = ''
    form.value = { title: '', type: 'revisit', due: '', note: '' }
  }
  showForm.value = true
}
function closeForm() {
  showForm.value = false
  editingId.value = ''
}
function onDue(e) {
  form.value.due = e.detail.value
}
function save() {
  const f = form.value
  if (!f.title.trim()) {
    uni.showToast({ title: '请填写事项', icon: 'none' })
    return
  }
  if (editingId.value) {
    const idx = list.value.findIndex(x => x.id === editingId.value)
    if (idx > -1) list.value[idx] = { ...list.value[idx], title: f.title.trim(), type: f.type, due: f.due, note: f.note.trim() }
  } else {
    list.value.push({ id: 'h' + Date.now(), title: f.title.trim(), type: f.type, due: f.due, note: f.note.trim(), done: false, created: new Date().toISOString() })
  }
  persist()
  closeForm()
}
function remove() {
  list.value = list.value.filter(x => x.id !== editingId.value)
  persist()
  closeForm()
}
function toggle(it) {
  it.done = !it.done
  persist()
}

load()
</script>

<style>
.page { background: #f7f4ef; min-height: 100vh; padding: 24rpx 24rpx 60rpx; }
.section-header { display: flex; align-items: center; padding: 8rpx 4rpx 20rpx; }
.section-title { font-size: 38rpx; font-weight: 800; color: #3d5a3e; }
.section-more { flex: 1; font-size: 24rpx; color: #9b9384; margin-left: 16rpx; }
.add-btn { background: #c46a3a; color: #fff; font-size: 26rpx; border-radius: 999rpx; padding: 6rpx 24rpx; line-height: 1.8; }
.tip-bar { background: #fff; border-radius: 18rpx; padding: 20rpx 24rpx; margin-bottom: 20rpx; }
.tip-t { font-size: 24rpx; color: #6b6356; line-height: 1.6; }
.empty { text-align: center; padding: 80rpx 40rpx; }
.empty-ico { font-size: 80rpx; }
.empty-t { font-size: 30rpx; color: #3d5a3e; font-weight: 700; margin-top: 16rpx; }
.empty-s { font-size: 24rpx; color: #9b9384; margin-top: 10rpx; }
.empty-btn { margin-top: 30rpx; background: #3d5a3e; color: #fff; border-radius: 999rpx; font-size: 26rpx; padding: 10rpx 36rpx; }
.todo-card { display: flex; align-items: center; background: #fff; border-radius: 18rpx; padding: 22rpx 22rpx; margin-bottom: 16rpx; }
.todo-card.done { opacity: 0.55; }
.tc-left { margin-right: 18rpx; }
.tc-check { width: 44rpx; height: 44rpx; border-radius: 50%; border: 3rpx solid #c7bfb0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26rpx; }
.tc-check.on { background: #3d5a3e; border-color: #3d5a3e; }
.tc-body { flex: 1; }
.tc-title { font-size: 30rpx; color: #2f2a22; font-weight: 600; }
.todo-card.done .tc-title { text-decoration: line-through; }
.tc-meta { display: flex; align-items: center; margin-top: 10rpx; }
.tc-type { font-size: 22rpx; padding: 2rpx 14rpx; border-radius: 999rpx; margin-right: 14rpx; }
.ty-revisit { background: #fdeede; color: #c46a3a; }
.ty-checkup { background: #e7f0e8; color: #3d5a3e; }
.ty-medicine { background: #e9eef7; color: #4a6fa5; }
.ty-other { background: #f0ece4; color: #8a8071; }
.tc-due { font-size: 22rpx; color: #9b9384; }
.tc-due.overdue { color: #c0392b; font-weight: 700; }
.tc-note { font-size: 23rpx; color: #8a8071; margin-top: 8rpx; line-height: 1.5; }
.tc-ops { margin-left: 12rpx; }
.tc-edit { font-size: 24rpx; color: #3d5a3e; background: #eef2ec; padding: 6rpx 18rpx; border-radius: 999rpx; }
.overlay { position: fixed; inset: 0; background: #f7f4ef; z-index: 50; display: none; flex-direction: column; }
.overlay.active { display: flex; }
.ov-nav { display: flex; align-items: center; padding: 24rpx; background: #fff; }
.back { font-size: 40rpx; color: #3d5a3e; background: transparent; }
.ov-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 700; color: #2f2a22; margin-right: 40rpx; }
.ovcontent { flex: 1; padding: 30rpx 30rpx 40rpx; }
.form-row { margin-bottom: 32rpx; }
.form-label { font-size: 26rpx; color: #6b6356; display: block; margin-bottom: 14rpx; }
.form-input { background: #fff; border-radius: 14rpx; padding: 22rpx; font-size: 28rpx; color: #2f2a22; }
.form-area { background: #fff; border-radius: 14rpx; padding: 22rpx; font-size: 28rpx; width: 100%; height: 160rpx; }
.picker { color: #2f2a22; }
.type-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.tchip { font-size: 24rpx; padding: 10rpx 26rpx; border-radius: 999rpx; background: #fff; color: #8a8071; }
.tchip.on { background: #3d5a3e; color: #fff; }
.form-actions { display: flex; gap: 20rpx; margin-top: 20rpx; }
.btn-save { flex: 1; background: #c46a3a; color: #fff; border-radius: 14rpx; font-size: 30rpx; padding: 20rpx; }
.btn-del { background: #f3e9e4; color: #c0392b; border-radius: 14rpx; font-size: 28rpx; padding: 20rpx 36rpx; }
</style>
