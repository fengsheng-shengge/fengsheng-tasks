<template>
  <view class="page">
    <view class="top">
      <view class="brand">风声 · 谈判斡旋</view>
      <view class="h1">MOT④ 谈判策略</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <view v-if="reportNo" class="gate-ok">
      <text>✓ 谈判记录已保存 · {{ reportNo }}</text>
    </view>

    <view class="card">
      <view class="card-title">🎯 谈判目标与筹码</view>
      <view class="field"><text class="label">我方谈判目标</text>
        <textarea class="inp" v-model="form.goal" placeholder="这一轮想谈成什么？如：把成交价谈到 X 万以内" maxlength="120"></textarea>
      </view>
      <view class="field"><text class="label">我方筹码清单</text>
        <textarea class="inp" v-model="form.chips" placeholder="手里有哪些牌？如：付款快、已交诚意金、可接受周期" maxlength="200"></textarea>
      </view>
    </view>

    <view class="card">
      <view class="card-title">⚔️ 对手与立场</view>
      <view class="field"><text class="label">对方关键立场</text>
        <textarea class="inp" v-model="form.opponentStance" placeholder="对方最在意什么、底线在哪里" maxlength="120"></textarea>
      </view>
      <view class="field"><text class="label">博弈策略</text>
        <view class="opt">
          <view v-for="o in strategyOpts" :key="o.value" :class="{ on: form.strategy === o.value }" @tap="form.strategy = o.value">{{ o.label }}</view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">📝 谈判结果与跟进</view>
      <view class="field"><text class="label">结果小结</text>
        <textarea class="inp" v-model="form.result" placeholder="这轮谈下来的结果与差距" maxlength="120"></textarea>
      </view>
      <view class="field"><text class="label">下一步行动</text>
        <textarea class="inp" v-model="form.nextAction" placeholder="接下来推进什么？" maxlength="120"></textarea>
      </view>
    </view>

    <view class="btn-row">
      <button class="btn-submit" @tap="submit">✓ 保存谈判记录</button>
      <button class="btn-report" v-if="reportNo" @tap="goReport">📋 查看报告</button>
    </view>
    <view class="btn-next-row" v-if="reportNo">
      <button class="btn-next" @tap="goDeal">进入成交售后 →</button>
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
      strategyOpts: [
        { value: 'winwin', label: '双赢方案' },
        { value: 'firm', label: '坚守底线' },
        { value: 'time', label: '时间换空间' },
        { value: 'swap', label: '条件互换' },
      ],
      form: {
        goal: '', chips: '', opponentStance: '', strategy: 'winwin', result: '', nextAction: ''
      }
    }
  },
  computed: { userStore() { return useUserStore() } },
  onLoad(options) {
    trackPageview('negotiation')
    if (options && options.clientId) {
      this.clientId = options.clientId
      const c = this.userStore.getClient(this.clientId)
      if (c) {
        this.client = c
        const report = (c.reports || []).filter(r => r.type === 'negotiation').sort((a, b) => b.createdAt - a.createdAt)[0]
        if (report) {
          this.reportNo = report.reportNo
          if (report.data) this.form = { ...this.form, ...report.data }
        }
      }
    }
  },
  methods: {
    submit() {
      if (!this.form.goal.trim()) { uni.showToast({ title: '请填写谈判目标', icon: 'none' }); return }
      uni.showModal({
        title: '保存谈判记录',
        content: '确认保存本次谈判斡旋记录？',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.userStore.completeNegotiation(this.clientId, { ...this.form })
            uni.showToast({ title: '谈判记录已保存', icon: 'success' })
            setTimeout(() => {
              const c = this.userStore.getClient(this.clientId)
              const report = (c.reports || []).filter(r => r.type === 'negotiation').sort((a, b) => b.createdAt - a.createdAt)[0]
              this.reportNo = report ? report.reportNo : ''
            }, 400)
          }
        }
      })
    },
    goDeal() {
      uni.navigateTo({ url: '/package-mot/pages/deal/index?clientId=' + this.clientId })
    },
    goReport() {
      uni.navigateTo({ url: '/package-mot/pages/negotiation/report?clientId=' + this.clientId })
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
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt view { font-size: 12px; padding: 7px 12px; border-radius: 8px; background: #f0ece4; color: #6a5a45; }
.opt view.on { background: #3d5a3e; color: #fff; }
.btn-row { display: flex; gap: 10px; margin: 18px 14px 0; }
.btn-submit { flex: 1.4; background: #c46a3a; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; }
.btn-report { flex: 1; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; }
.btn-next-row { margin: 10px 14px 0; }
.btn-next { background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; width: 100%; }
</style>
