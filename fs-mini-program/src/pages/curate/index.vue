<template>
  <view class="page">
    <!-- 头部 -->
    <view class="generate-header">
      <view class="gen-title">✨ 快速生成简报</view>
      <view class="gen-sub">填客户结构化画像，自动拆解并生成完整方案</view>
    </view>

    <!-- 测评结论预填提示 -->
    <view v-if="assessInfo" class="assess-tip">
      <text class="at-ico">✓</text>
      <text class="at-tx">已采集七维品质测评结论（{{ assessInfo.type === 'living' ? '住得好' : '服务者' }}，将带入简报）</text>
      <text class="at-clear" @tap="clearAssess">不用</text>
    </view>

    <!-- ① 客户类型 -->
    <view class="type-section">
      <view class="section-label">① 选择客户类型</view>
      <view class="type-grid">
        <view
          v-for="t in ctypeOpts"
          :key="t.key"
          class="type-card"
          :class="[form.ctype === t.key ? 'active' : '', 'type-' + t.color]"
          @tap="form.ctype = t.key"
        >
          <view class="type-icon">{{ t.icon }}</view>
          <view class="type-name">{{ t.name }}</view>
          <view v-if="form.ctype === t.key" class="type-check">✓</view>
        </view>
      </view>
    </view>

    <!-- ② 客户称呼 -->
    <view class="form-section">
      <view class="section-label">② 客户称呼</view>
      <view class="form-input-wrap">
        <text class="input-icon">👤</text>
        <input class="form-input" placeholder="如：王女士、陈先生…" :value="form.name" @input="onInput('name', $event)" maxlength="20" />
      </view>
    </view>

    <!-- ③ 总预算 -->
    <view class="form-section">
      <view class="section-label">③ 总预算（万元）</view>
      <view class="form-input-wrap">
        <text class="input-icon">💰</text>
        <input class="form-input" type="digit" placeholder="如 800" :value="form.budget" @input="onInput('budget', $event)" />
      </view>
    </view>

    <!-- ④ 置业目的 -->
    <view class="type-section">
      <view class="section-label">④ 置业目的</view>
      <view class="type-grid">
        <view
          v-for="t in purposeOpts"
          :key="t.key"
          class="type-card"
          :class="[form.purpose === t.key ? 'active' : '', 'type-' + t.color]"
          @tap="form.purpose = t.key"
        >
          <view class="type-icon">{{ t.icon }}</view>
          <view class="type-name">{{ t.name }}</view>
          <view v-if="form.purpose === t.key" class="type-check">✓</view>
        </view>
      </view>
    </view>

    <!-- ⑤ 付款方式 -->
    <view class="type-section">
      <view class="section-label">⑤ 付款方式</view>
      <view class="type-grid">
        <view
          v-for="t in payTypeOpts"
          :key="t.key"
          class="type-card"
          :class="[form.payType === t.key ? 'active' : '', 'type-' + t.color]"
          @tap="form.payType = t.key"
        >
          <view class="type-icon">{{ t.icon }}</view>
          <view class="type-name">{{ t.name }}</view>
          <view v-if="form.payType === t.key" class="type-check">✓</view>
        </view>
      </view>
    </view>

    <!-- ⑥ 家庭结构 -->
    <view class="type-section">
      <view class="section-label">⑥ 家庭结构</view>
      <view class="type-grid">
        <view
          v-for="t in familyOpts"
          :key="t.key"
          class="type-card"
          :class="[form.family === t.key ? 'active' : '', 'type-' + t.color]"
          @tap="form.family = t.key"
        >
          <view class="type-icon">{{ t.icon }}</view>
          <view class="type-name">{{ t.name }}</view>
          <view v-if="form.family === t.key" class="type-check">✓</view>
        </view>
      </view>
    </view>

    <!-- ⑦ 关键时间事件 -->
    <view class="form-section">
      <view class="section-label">⑦ 关键时间事件</view>
      <view class="form-input-wrap">
        <text class="input-icon">📅</text>
        <input class="form-input" placeholder="如 孩子 2027 年上小学" :value="form.event" @input="onInput('event', $event)" />
      </view>
    </view>

    <!-- ⑧ 已有想法（可多选） -->
    <view class="form-section">
      <view class="section-label">⑧ 客户已有的想法（可多选）</view>
      <view class="idea-list">
        <view class="idea-item" v-for="o in ideaOpts" :key="o" @tap="toggleIdea(o)">
          <text class="idea-box" :class="{ on: form.ideas.includes(o) }">{{ form.ideas.includes(o) ? '✓' : '' }}</text>
          <text class="idea-tx">{{ o }}</text>
        </view>
      </view>
      <view class="form-input-wrap" style="margin-top:16rpx">
        <text class="input-icon">✍️</text>
        <input class="form-input" placeholder="或自定义，如：先买后卖更安全" :value="form.customIdea" @input="onInput('customIdea', $event)" />
      </view>
    </view>

    <!-- 生成按钮 -->
    <view class="generate-btn-wrap">
      <view class="generate-btn" @tap="genBrief">
        <text>🚀</text>
        <text>生成顾问简报</text>
      </view>
      <view class="btn-hint">预计 3 秒生成完整方案，包含误区、方案、话术</view>
    </view>

    <!-- 我的简报库 -->
    <view class="card" style="margin-top:32rpx">
      <view class="card-header">
        <view class="title">📚 我的顾问简报库</view>
        <view class="more">{{ lib.length }} 份</view>
      </view>
      <view v-if="lib.length === 0" class="empty-state">
        <view class="empty-icon">📭</view>
        <view class="empty-title">还没有简报</view>
        <view class="empty-desc">填上方画像，点生成开始</view>
      </view>
      <view class="libitem" v-for="(l, i) in lib" :key="i" @tap="openPrep()">
        <view class="lt"><view class="t">{{ l.t }}</view><view class="s">{{ l.s }}</view></view>
        <text class="ok">已生成</text>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'
export default {
  data() {
    return {
      ctypeOpts: [
        { key: '学区', name: '学区', icon: '🏫', color: 'green' },
        { key: '改善', name: '改善', icon: '🏠', color: 'orange' },
        { key: '首置', name: '首置', icon: '🔑', color: 'gold' },
        { key: '租赁', name: '租赁', icon: '📄', color: 'blue' },
        { key: '业主售房', name: '业主售房', icon: '💰', color: 'orange' }
      ],
      purposeOpts: [
        { key: '自住', name: '自住', icon: '🛋️', color: 'green' },
        { key: '学区', name: '学区', icon: '🎓', color: 'gold' },
        { key: '改善', name: '改善', icon: '✨', color: 'orange' },
        { key: '婚房', name: '婚房', icon: '💍', color: 'blue' },
        { key: '投资', name: '投资', icon: '📈', color: 'green' }
      ],
      payTypeOpts: [
        { key: '全款', name: '全款', icon: '💵', color: 'gold' },
        { key: '按揭', name: '按揭', icon: '🏦', color: 'green' },
        { key: '先买后卖', name: '先买后卖', icon: '🔁', color: 'orange' },
        { key: '先卖后买', name: '先卖后买', icon: '↔️', color: 'blue' }
      ],
      familyOpts: [
        { key: '单身', name: '单身', icon: '👤', color: 'blue' },
        { key: '夫妻', name: '夫妻', icon: '💑', color: 'orange' },
        { key: '有孩家庭', name: '有孩', icon: '👨‍👩‍👧', color: 'green' },
        { key: '三代同堂', name: '三代', icon: '👨‍👩‍👧‍👦', color: 'gold' }
      ],
      ideaOpts: ['先买后卖更安全', '预算够买两居', '慢慢看不着急', '买名校旁才放心'],
      form: { name: '', ctype: '学区', budget: '', purpose: '自住', payType: '按揭', family: '夫妻', event: '', ideas: [], customIdea: '' },
      assessInfo: null
    }
  },
  computed: {
    userStore() { return useUserStore() },
    lib() { return (this.userStore.curatings || []).map(c => ({ t: c.t, s: c.s })) }
  },
  onShow() {
    trackPageview('curate')
    try {
      const a = uni.getStorageSync('fs_last_assess')
      if (a && a.scores) this.assessInfo = a
    } catch (e) {}
  },
  onShareAppMessage() {
    return { title: '风声 · 顾问简报', path: '/pages/curate/index' }
  },
  methods: {
    onInput(field, e) {
      const v = (e.detail && e.detail.value) || (e.target && e.target.value) || ''
      this.form[field] = v
    },
    clearAssess() {
      this.assessInfo = null
      try { uni.removeStorageSync('fs_last_assess') } catch (e) {}
    },
    toggleIdea(o) {
      const i = this.form.ideas.indexOf(o)
      if (i >= 0) this.form.ideas.splice(i, 1)
      else this.form.ideas.push(o)
    },
    genBrief() {
      if (!this.form.name.trim()) { uni.showToast({ title: '请填写客户姓名', icon: 'none' }); return }
      if (!this.form.budget) { uni.showToast({ title: '请填写总预算', icon: 'none' }); return }
      const axisType = 'buy'
      const dimensions = ['safe', 'health', 'conv', 'econ', 'comfort', 'beauty', 'free']
      const parts = []
      parts.push('客户类型：' + this.form.ctype)
      parts.push('预算' + this.form.budget + '万')
      parts.push('置业目的：' + this.form.purpose)
      parts.push('付款方式：' + this.form.payType)
      parts.push('家庭结构：' + this.form.family)
      if (this.form.event.trim()) parts.push('关键时间：' + this.form.event.trim())
      if (this.form.ideas.length) parts.push('已有想法：' + this.form.ideas.join('；'))
      if (this.form.customIdea.trim()) parts.push(this.form.customIdea.trim())
      let freeText = parts.join('；')
      let dimSelfScores = {}
      if (this.assessInfo && this.assessInfo.scores) {
        for (const k in this.assessInfo.scores) dimSelfScores[k] = Math.round(this.assessInfo.scores[k] * 2)
        freeText += '；已基于七维品质测评结论（客户自评带入）'
      }
      const kb = uni.getStorageSync('fs_brief_kb') || []
      if (kb.length) {
        freeText += '；参考依据：' + kb.map(s => s.title).join('、')
        uni.removeStorageSync('fs_brief_kb')
      }
      const url = '/package-curation/pages/curate-client/index?axisType=' + axisType +
        '&scenario=&freeText=' + encodeURIComponent(freeText) +
        '&dimensions=' + encodeURIComponent(dimensions.join(',')) +
        '&dimSelfScores=' + encodeURIComponent(JSON.stringify(dimSelfScores))
      uni.setStorageSync('briefDraft', { ...this.form, ideas: [...this.form.ideas], customIdea: this.form.customIdea })
      uni.navigateTo({ url })
    },
    openPrep(id) {
      let url = '/package-curation/pages/curate-prep/index'
      if (id) url += '?clientId=' + id
      uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped>
.assess-tip { display: flex; align-items: center; gap: 12rpx; background: var(--green-bg); border: 2rpx solid #c6d6c6; border-radius: 24rpx; padding: 20rpx 24rpx; margin: 0 32rpx 24rpx; }
.at-ico { color: var(--green); font-weight: 800; font-size: 28rpx; }
.at-tx { flex: 1; font-size: 22rpx; color: var(--green); line-height: 1.5; }
.at-clear { font-size: 24rpx; color: var(--orange); font-weight: 700; }
.idea-list { padding: 0 32rpx; }
.idea-item { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; }
.idea-box { width: 40rpx; height: 40rpx; border-radius: 12rpx; border: 3rpx solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; flex-shrink: 0; }
.idea-box.on { background: var(--green); border-color: var(--green); }
.idea-tx { font-size: 28rpx; color: var(--text-primary); }
.libitem { background: #fff; border: 2rpx solid var(--border); border-radius: 24rpx; padding: 24rpx 28rpx; margin: 0 32rpx 16rpx; display: flex; align-items: center; gap: 16rpx; }
.lt { flex: 1; }
.lt .t { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
.lt .s { font-size: 24rpx; color: var(--text-tertiary); margin-top: 4rpx; }
.ok { font-size: 22rpx; color: var(--green); background: var(--green-bg); padding: 6rpx 16rpx; border-radius: 999rpx; font-weight: 700; }
</style>
