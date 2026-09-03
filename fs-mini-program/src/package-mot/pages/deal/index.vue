<template>
  <view class="page">
    <view class="top">
      <view class="brand">风声 · 成交售后</view>
      <view class="h1">MOT⑤ 签约交付</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <view v-if="reportNo" class="gate-ok">
      <text>✓ 成交售后已登记 · {{ reportNo }}</text>
    </view>

    <view class="card">
      <view class="card-title">🤝 签约信息</view>
      <view class="field"><text class="label">成交日期</text>
        <picker mode="date" :value="form.dealDate" @change="form.dealDate = $event.detail.value">
          <view class="picker-btn">{{ form.dealDate || '选择日期' }}</view>
        </picker>
      </view>
      <view class="field"><text class="label">成交总价（万元）</text>
        <input class="inp" v-model="form.price" type="digit" placeholder="如 920" />
      </view>
      <view class="field"><text class="label">成交房源</text>
        <input class="inp" v-model="form.property" placeholder="小区 / 楼栋 / 房号" />
      </view>
    </view>

    <view class="card">
      <view class="card-title">🗓️ 交付里程碑</view>
      <view class="field"><text class="label">后续节点（选填）</text>
        <textarea class="inp" v-model="form.milestones" placeholder="如：贷款审批、过户、交房、物业交接…" maxlength="200"></textarea>
      </view>
    </view>

    <view class="card">
      <view class="card-title">💌 售后计划（转介绍飞轮）</view>
      <view class="field"><text class="label">售后跟进计划</text>
        <textarea class="inp" v-model="form.afterPlan" placeholder="交房后主动跟进什么？如：乔迁回访、家具家电清单、社区攻略" maxlength="200"></textarea>
      </view>
    </view>

    <view class="btn-row">
      <button class="btn-submit" @tap="submit">✓ 登记成交</button>
      <button class="btn-next" v-if="reportNo" @tap="goMaintain">进入持续维护 →</button>
    </view>
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
      form: { dealDate: '', price: '', property: '', milestones: '', afterPlan: '' }
    }
  },
  computed: { userStore() { return useUserStore() } },
  onLoad(options) {
    trackPageview('deal')
    if (options && options.clientId) {
      this.clientId = options.clientId
      const c = this.userStore.getClient(this.clientId)
      if (c) {
        this.client = c
        const report = (c.reports || []).filter(r => r.type === 'deal').sort((a, b) => b.createdAt - a.createdAt)[0]
        if (report) {
          this.reportNo = report.reportNo
          if (report.data) this.form = { ...this.form, ...report.data }
        }
      }
    }
    const d = new Date()
    this.form.dealDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  },
  methods: {
    submit() {
      if (!this.form.price) { uni.showToast({ title: '请填写成交总价', icon: 'none' }); return }
      uni.showModal({
        title: '登记成交',
        content: '确认登记本次成交？成交后将解锁持续维护。',
        confirmText: '确认登记',
        success: (res) => {
          if (res.confirm) {
            this.userStore.completeDeal(this.clientId, { ...this.form })
            uni.showToast({ title: '成交已登记', icon: 'success' })
            setTimeout(() => {
              const c = this.userStore.getClient(this.clientId)
              const report = (c.reports || []).filter(r => r.type === 'deal').sort((a, b) => b.createdAt - a.createdAt)[0]
              this.reportNo = report ? report.reportNo : ''
            }, 400)
          }
        }
      })
    },
    goMaintain() {
      uni.navigateTo({ url: '/package-mot/pages/maintain/index?clientId=' + this.clientId })
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
.inp { width: 100%; background: #faf8f5; border: 1px solid #ede5d6; border-radius: 10px; padding: 10px; font-size: 13px; box-sizing: border-box; }
.picker-btn { background: #faf8f5; border: 1px solid #ede5d6; border-radius: 10px; padding: 10px; font-size: 13px; color: #2b2b2b; }
.btn-row { display: flex; gap: 10px; margin: 18px 14px 0; }
.btn-submit { flex: 1.4; background: #c46a3a; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; }
.btn-next { flex: 1; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; }
</style>
