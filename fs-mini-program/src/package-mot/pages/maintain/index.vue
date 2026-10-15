<template>
  <view class="page">
    <view class="top">
      <view class="brand">风声 · 持续维护</view>
      <view class="h1">MOT⑥ 关系维护</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <view v-if="reportNo" class="gate-ok">
      <text>✓ 维护记录已保存 · {{ reportNo }}</text>
    </view>

    <view class="card">
      <view class="card-title">❤️ 关系健康度</view>
      <view class="field"><text class="label">关系健康度（1-5）</text>
        <view class="stars">
          <text v-for="s in 5" :key="s" :class="['star', { on: s <= form.health }]" @tap="form.health = s">★</text>
        </view>
      </view>
      <view class="field"><text class="label">最近互动</text>
        <textarea class="inp" v-model="form.recentTouch" placeholder="最近一次联系/回访做了什么" maxlength="120"></textarea>
      </view>
    </view>

    <view class="card">
      <view class="card-title">🌟 转介绍飞轮</view>
      <view class="field"><text class="label">可转介绍线索（选填）</text>
        <textarea class="inp" v-model="form.referralLeads" placeholder="客户身边潜在需求：朋友/同事/亲戚" maxlength="200"></textarea>
      </view>
      <view class="field"><text class="label">下一步维护动作</text>
        <textarea class="inp" v-model="form.nextAction" placeholder="如：节假日问候、社区攻略推送、乔迁回访" maxlength="120"></textarea>
      </view>
    </view>

    <button class="btn-submit" @tap="submit">✓ 保存维护记录</button>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportNo: '',
      form: { health: 4, recentTouch: '', referralLeads: '', nextAction: '' }
    }
  },
  computed: { userStore() { return useUserStore() } },
  onLoad(options) {
    trackPageview('maintain')
    if (options && options.clientId) {
      this.clientId = options.clientId
      const c = this.userStore.getClient(this.clientId)
      if (c) {
        this.client = c
        const report = (c.reports || []).filter(r => r.type === 'maintain').sort((a, b) => b.createdAt - a.createdAt)[0]
        if (report) {
          this.reportNo = report.reportNo
          if (report.data) this.form = { ...this.form, ...report.data }
        }
      }
    }
  },
  methods: {
    submit() {
      if (!this.form.recentTouch.trim()) { uni.showToast({ title: '请填写最近互动', icon: 'none' }); return }
      uni.showModal({
        title: '保存维护记录',
        content: '确认保存本次维护记录？',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.userStore.completeMaintain(this.clientId, { ...this.form })
            uni.showToast({ title: '维护记录已保存', icon: 'success' })
            setTimeout(() => {
              const c = this.userStore.getClient(this.clientId)
              const report = (c.reports || []).filter(r => r.type === 'maintain').sort((a, b) => b.createdAt - a.createdAt)[0]
              this.reportNo = report ? report.reportNo : ''
            }, 400)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 0 0 60px; background: #f7f4ef; min-height: 100vh; box-sizing: border-box; }
.top { background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%); padding: 26px 18px 20px; }
.brand { font-size: 12px; color: rgba(255,255,255,.7); letter-spacing: 1px; }
.h1 { font-size: 20px; font-weight: 800; color: #fff; margin-top: 4px; }
.sub { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 4px; }
.gate-ok { background: #eef6ef; border: 1px solid #c4dbc5; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #3a8f5b; margin: 12px 14px 0; }
.card { background: #fff; border-radius: 14px; margin: 12px 14px 0; padding: 14px; border: 1px solid #e7e0d4; }
.card-title { font-size: 14px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.field { margin-bottom: 12px; }
.label { font-size: 12px; color: #8a837a; display: block; margin-bottom: 6px; }
.inp { width: 100%; min-height: 72px; background: #faf8f5; border: 1px solid #ede5d6; border-radius: 10px; padding: 10px; font-size: 13px; box-sizing: border-box; }
.stars { display: flex; gap: 6px; }
.star { font-size: 28px; color: #e0d8cc; }
.star.on { color: #f2a13c; }
.btn-submit { background: #c46a3a; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; margin: 18px 14px 0; }
</style>
