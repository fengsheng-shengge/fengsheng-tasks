<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 需求洞察问诊</view>
      <view class="h1">帮客户理清楚真正要什么</view>
      <view class="sub">不是查户口，是专业工具引导客户自己梳理——填完即生成需求画像</view>
    </view>

    <!-- 客户称呼 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🙋</text>客户称呼</view>
      <input class="inp" v-model="form.clientName" placeholder="如：林先生 / 王女士" maxlength="20" />
      <view class="link-row" v-if="clients.length" @tap="showClientPicker">
        <text class="link-label">关联客户档案</text>
        <text class="link-val">{{ linkedName || '选择客户（可选）' }}</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- 目的轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🎯</text>目的轴（为什么买 / 卖 / 租）</view>
      <view class="seg">
        <view class="seg-i" v-for="t in bizTypes" :key="t" :class="form.bizType === t ? 'on' : ''" @tap="form.bizType = t">{{ t }}</view>
      </view>
      <input class="inp mt" v-model="form.purpose" placeholder="一句话动机：最想解决的是什么？（如：婚房首套稳定落脚）" maxlength="60" />
    </view>

    <!-- 时间轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">⏱</text>时间轴</view>
      <input class="inp" v-model="form.time" placeholder="近期：何时入住 / 多久内（如：半年内入住）" maxlength="40" />
      <input class="inp mt" v-model="form.timeFar" placeholder="远期：3-5 年规划（如：3 年后学区 / 二胎）" maxlength="40" />
    </view>

    <!-- 主体轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">👨‍👩‍👧</text>主体轴（谁住）</view>
      <input class="inp" v-model="form.subject" placeholder="家庭结构 / 同住人（如：夫妻二人 + 计划 1 孩 + 偶尔父母）" maxlength="40" />
    </view>

    <!-- 生活锚点 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📍</text>生活锚点（越具体越好）</view>
      <view class="an-in" v-for="(a, i) in anchorDefs" :key="i">
        <view class="an-lab">{{ a.label }}</view>
        <input class="inp" v-model="form.anchors[a.key]" :placeholder="a.ph" :maxlength="40" />
      </view>
    </view>

    <!-- 七维权重 -->
    <view class="sec">
      <view class="sec-h"><text class="em">⚖️</text>七维居住品质权重（滑动自评 1-5）</view>
      <view class="w-row" v-for="d in dims" :key="d">
        <view class="w-name">{{ d }}</view>
        <slider class="w-sl" min="1" max="5" step="1" :value="form.weights[d]" activeColor="#3D5A3E" backgroundColor="#EDE5D6" block-size="20" @change="onWeight($event, d)" @changing="onWeight($event, d)" />
        <view class="w-pct">{{ weightPct(d) }}%</view>
      </view>
      <view class="w-tip">实时归一化：七维合计 100%。权重来源＝客户 / 经纪人自评（小程序采集）。</view>
    </view>

    <!-- 核心洞察预览 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💡</text>核心洞察（自动生成 · 实时预览）</view>
      <view class="core-prev"><text>{{ liveCore }}</text></view>
    </view>

    <!-- 需求确认闸门 -->
    <view class="conf" :class="form.confirmed ? 'on' : ''" @tap="form.confirmed = !form.confirmed">
      <view class="conf-box">{{ form.confirmed ? '✓' : '' }}</view>
      <view class="conf-txt">
        <view class="conf-t1">需求确认闸门</view>
        <view class="conf-t2">已与客户逐条核对、客户亲口确认后勾选。未确认＝暂不进入房源推荐与带看。</view>
      </view>
    </view>

    <view class="demo" @tap="fillDemo">填入示例（林先生婚房）快速体验</view>

    <!-- 客户选择弹层 -->
    <view class="mask" v-if="pickerShow" @tap="pickerShow = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-h">
          <text class="sheet-t">选择关联客户</text>
          <text class="sheet-x" @tap="pickerShow = false">✕</text>
        </view>
        <scroll-view class="sheet-list" scroll-y>
          <view class="sheet-item" v-for="c in clients" :key="c.id" @tap="pickClient(c)">
            <view class="sheet-av" :style="{ background: c.color }">{{ c.name[0] }}</view>
            <view class="sheet-body">
              <view class="sheet-n">{{ c.name }}</view>
              <view class="sheet-m">{{ c.rel || '客户' }} · {{ c.note || '' }}</view>
            </view>
            <text class="sheet-check" v-if="c.id === linkedId">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="ft">本工具仅做需求澄清，不推荐房源、不测算价格、不给买房结论</view>

    <view class="actions">
      <button class="btn-main" @tap="generate">生成需求洞察报告 →</button>
    </view>
  </view>
</template>

<script>
/**
 * 客户需求洞察 · 问诊采集器（V4 探索步①输入端）
 * 与 pages/insight/index.vue（报告展示端）构成闭环：本页采集 → 组装 insight JSON → navigateTo 报告页。
 * 数据诚实：七维权重来源标注"客户/经纪人自评（小程序采集）"；核心洞察由权重+动机规则反射生成（只呈现客户自己填的，不给外部结论）；不渲染房源与价格。
 * 模型不进交付链：权重的"归一化 + 核心洞察"均为本地规则计算，无 LLM 调用。
 */
const DIMS = ['安全', '经济', '便利', '健康', '舒适', '美观', '自在']

// 服务线：购房 / 售房 / 租住 / 出租托管 / 家装 / 资产管理 / 置换（可扩展）
const BIZ_TYPES = [
  { label: '购房', key: 'buy' },
  { label: '售房', key: 'sell' },
  { label: '租住', key: 'rent' },
  { label: '出租托管', key: 'host' },
  { label: '家装', key: 'decor' },
  { label: '资产管理', key: 'asset' },
  { label: '置换', key: 'replace' }
]

import { useUserStore } from '../../store/user'

export default {
  data() {
    return {
      dims: DIMS,
      bizTypes: BIZ_TYPES.map(b => b.label),
      bizKeys: BIZ_TYPES.reduce((m, b) => { m[b.label] = b.key; return m }, {}),
      pickerShow: false,
      linkedId: '',
      linkedLine: '',
      anchorDefs: [
        { key: 'live', label: '现住', ph: '当前居住情况（如：望京租住两居）' },
        { key: 'work', label: '工作', ph: '工作地 / 通勤方式（如：中关村·地铁）' },
        { key: 'family', label: '家庭', ph: '家庭状况（如：未婚妻同行·计划 1 孩）' },
        { key: 'avoid', label: '雷区', ph: '明确不要的（如：无电梯老破小·临街噪音）' },
        { key: 'wish', label: '向往', ph: '最向往的生活（如：推窗见绿·安静独处）' }
      ],
      form: {
        clientName: '',
        bizType: '购房',
        purpose: '',
        time: '',
        timeFar: '',
        subject: '',
        anchors: { live: '', work: '', family: '', avoid: '', wish: '' },
        weights: { 安全: 3, 经济: 3, 便利: 3, 健康: 3, 舒适: 3, 美观: 3, 自在: 3 },
        confirmed: false
      }
    }
  },
  computed: {
    userStore() { return useUserStore() },
    clients() {
      const palette = ['#3D5A3E', '#C46A3A', '#9c7c3a', '#5E7291']
      return (this.userStore.clients || []).map((c, i) => ({
        id: c.id,
        name: c.name || '客户',
        rel: c.rel || '',
        note: c.note || '',
        color: palette[i % palette.length]
      }))
    },
    linkedName() {
      const hit = this.clients.find(c => c.id === this.linkedId)
      return hit ? hit.name : ''
    },
    liveCore() {
      return this.deriveCorePoint(this.form, this.normalizeWeights(this.form.weights))
    }
  },
  onLoad(options) {
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    if (options && options.clientId) this.linkedId = options.clientId
    if (options && options.serviceLine) {
      this.linkedLine = options.serviceLine
      const meta = (this.userStore.clients.find(c => c.id === this.linkedId) || {})
      // 优先用传入的服务线，其次用客户档案声明的服务线
      const line = this.linkedLine || meta.serviceLine || 'buy'
      const pair = BIZ_TYPES.find(b => b.key === line)
      if (pair) this.form.bizType = pair.label
    }
  },
  methods: {
    onWeight(e, dim) {
      this.form.weights[dim] = e.detail.value
    },
    weightPct(dim) {
      const arr = this.normalizeWeights(this.form.weights)
      const hit = arr.find(s => s.name === dim)
      return hit ? hit.weight : 0
    },
    normalizeWeights(w) {
      const raw = DIMS.map(d => Math.max(0, +(w[d] || 0)))
      const total = raw.reduce((a, b) => a + b, 0)
      if (total === 0) return DIMS.map(d => ({ name: d, weight: 0, source: '客户/经纪人自评（小程序采集）' }))
      const exact = raw.map(r => (r / total) * 100)
      const floor = exact.map(Math.floor)
      let rem = 100 - floor.reduce((a, b) => a + b, 0)
      const order = exact.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f)
      for (let k = 0; k < rem; k++) floor[order[k % order.length].i]++
      return DIMS.map((d, i) => ({ name: d, weight: floor[i], source: '客户/经纪人自评（小程序采集）' }))
    },
    deriveCorePoint(form, seven) {
      const sorted = [...seven].filter(s => s.weight > 0).sort((a, b) => b.weight - a.weight)
      const top = sorted.slice(0, 2).map(s => s.name)
      const motif = (form.purpose || '').trim()
      let s = ''
      if (top[0] && top[1]) s = `您最看重的是「${top[0]}」与「${top[1]}」`
      else if (top[0]) s = `您最看重的是「${top[0]}」`
      if (motif) s += (s ? '，最想解决的是「' + motif + '」' : `最想解决的是「${motif}」`)
      if (!s) s = '继续填写动机与权重，系统将自动生成核心洞察。'
      return s
    },
    buildAnchors(form) {
      const map = { live: '现住', work: '工作', family: '家庭', avoid: '雷区', wish: '向往' }
      const out = []
      Object.keys(map).forEach(k => {
        const v = (form.anchors[k] || '').trim()
        if (v) out.push({ label: map[k], value: v, source: '客户自述（小程序采集）' })
      })
      return out
    },
    assembleInsight() {
      const f = this.form
      const seven = this.normalizeWeights(f.weights)
      const corePoint = this.deriveCorePoint(f, seven)
      const corePointDetail = '以上权重由您自评得出，反映的是当下最在意的事，不是评断。后续可随沟通修正。'
      const threeAxis = {
        purpose: [f.bizType, f.purpose].filter(Boolean).join(' · '),
        time: [f.time, f.timeFar].filter(Boolean).join(' + '),
        subject: f.subject
      }
      const dateStr = new Date().toISOString().slice(0, 10)
      return {
        clientName: (f.clientName || '').trim() || '未命名客户',
        corePoint,
        corePointDetail,
        threeAxis,
        seven,
        anchors: this.buildAnchors(f),
        confirm: {
          confirmed: !!f.confirmed,
          date: f.confirmed ? dateStr : '',
          by: f.confirmed ? '客户本人（小程序确认）' : ''
        },
        nextStep: f.confirmed
          ? '需求已确认。下一步：由服务者侧「知识库 + 规则引擎」结合真源生成房源提案报告，持报告带看。'
          : '需求待客户确认。确认后由服务者侧结合真源生成房源提案报告。'
      }
    },
    generate() {
      const f = this.form
      if (!f.clientName.trim()) {
        uni.showToast({ title: '先填客户称呼', icon: 'none' })
        return
      }
      if (!f.purpose.trim()) {
        uni.showToast({ title: '先填一句话动机', icon: 'none' })
        return
      }
      const insight = this.assembleInsight()
      const lineKey = this.bizKeys[this.form.bizType] || (this.linkedLine || 'buy')
      // V4 MOT：关联客户时落库（append-only 留痕，带服务线标记），供驾驶舱读取
      if (this.linkedId) {
        try {
          const linked = this.userStore.getClient(this.linkedId)
          if (linked) {
            const confirmedLabel = insight.confirm && insight.confirm.confirmed ? '（已确认）' : '（待确认）'
            this.userStore.saveClientReport(this.linkedId, {
              type: 'insight',
              name: '客户需求洞察报告',
              clientName: insight.clientName,
              serviceLine: lineKey,
              ...insight,
              source: '问诊采集（小程序）'
            })
            uni.showToast({ title: '已存入客户驾驶舱' + confirmedLabel, icon: 'none' })
          }
        } catch (e) {
          console.warn('[insight-prep] saveClientReport 失败', e)
        }
      }
      const url = '/pages/insight/index?insight=' + encodeURIComponent(JSON.stringify(insight)) +
        (this.linkedId ? '&clientId=' + this.linkedId + '&serviceLine=' + lineKey : '')
      uni.navigateTo({ url })
    },
    showClientPicker() { this.pickerShow = true },
    pickClient(c) {
      this.linkedId = c.id
      if (!this.form.clientName || this.form.clientName === '未命名客户') this.form.clientName = c.name
      this.pickerShow = false
      uni.showToast({ title: '已关联 ' + c.name, icon: 'none' })
    },
    fillDemo() {
      this.form = {
        clientName: '林先生 & 未婚妻',
        bizType: '购房',
        purpose: '婚房首套稳定落脚',
        time: '半年内入住',
        timeFar: '3 年后学区',
        subject: '夫妻二人 + 计划 1 孩 + 偶尔父母同住',
        anchors: {
          live: '朝阳区·望京·租住',
          work: '中关村·通勤地铁',
          family: '未婚妻同行·计划 1 孩',
          avoid: '无电梯老破小·临街噪音',
          wish: '推窗见绿·安静独处'
        },
        weights: { 安全: 5, 经济: 4, 便利: 4, 健康: 3, 舒适: 2, 美观: 1, 自在: 1 },
        confirmed: true
      }
      uni.showToast({ title: '已填入示例', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--cream); min-height: 100vh; box-sizing: border-box; padding-bottom: calc(160rpx + env(safe-area-inset-bottom)); }
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-xl); padding: 48rpx 40rpx; color: #fff; margin-bottom: 24rpx; }
.brand { font-size: 22rpx; color: rgba(255,255,255,.85); letter-spacing: 2rpx; }
.h1 { font-size: 38rpx; font-weight: 800; color: #fff; margin-top: 12rpx; }
.sub { font-size: 24rpx; color: rgba(255,255,255,.9); margin-top: 12rpx; line-height: 1.5; }
.sec { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin-bottom: 24rpx; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 24rpx; display: flex; align-items: center; gap: 12rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid var(--divider); }
.em { font-size: 34rpx; }
.inp { width: 100%; box-sizing: border-box; background: var(--cream); border: 2rpx solid var(--border); border-radius: var(--r-md); padding: 24rpx 28rpx; font-size: 28rpx; color: var(--text-primary); }
.mt { margin-top: 18rpx; }
.link-row { display: flex; align-items: center; gap: 12rpx; margin-top: 18rpx; background: var(--green-bg); border: 2rpx solid #c6d6c6; border-radius: var(--r-md); padding: 20rpx 24rpx; }
.link-label { font-size: 24rpx; font-weight: 700; color: var(--green); flex-shrink: 0; }
.link-val { flex: 1; font-size: 24rpx; color: var(--text-secondary); }
.link-arrow { font-size: 26rpx; color: var(--green); flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 28rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); max-height: 70vh; display: flex; flex-direction: column; }
.sheet-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sheet-t { font-size: 30rpx; font-weight: 800; color: var(--text-primary); }
.sheet-x { font-size: 32rpx; color: var(--text-tertiary); padding: 4rpx; }
.sheet-list { flex: 1; max-height: 52vh; }
.sheet-item { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 4rpx; border-bottom: 2rpx solid var(--border); }
.sheet-av { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.sheet-body { flex: 1; min-width: 0; }
.sheet-n { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
.sheet-m { font-size: 22rpx; color: var(--text-tertiary); margin-top: 4rpx; line-height: 1.4; }
.sheet-check { color: var(--green); font-size: 30rpx; font-weight: 800; }
.seg { display: flex; gap: 16rpx; }
.seg-i { flex: 1; text-align: center; padding: 22rpx 0; background: var(--cream); border: 2rpx solid var(--border); border-radius: var(--r-md); font-size: 28rpx; color: var(--text-secondary); font-weight: 700; }
.seg-i.on { background: var(--green); color: #fff; border-color: var(--green); }
.an-in { margin-bottom: 18rpx; }
.an-in:last-child { margin-bottom: 0; }
.an-lab { font-size: 24rpx; font-weight: 700; color: var(--orange); margin-bottom: 10rpx; }
.w-row { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 0; }
.w-name { flex: 0 0 90rpx; font-size: 27rpx; font-weight: 700; color: var(--text-primary); }
.w-sl { flex: 1; }
.w-pct { flex: 0 0 70rpx; text-align: right; font-size: 26rpx; font-weight: 800; color: var(--green); }
.w-tip { font-size: 21rpx; color: var(--text-tertiary); margin-top: 14rpx; line-height: 1.5; }
.core-prev { background: var(--cream); border-radius: var(--r-md); padding: 24rpx 28rpx; border-left: 8rpx solid var(--orange); font-size: 28rpx; font-weight: 700; color: var(--text-primary); line-height: 1.6; }
.conf { display: flex; align-items: flex-start; gap: 18rpx; background: #fff; border: 2rpx solid var(--border); border-radius: var(--r-lg); padding: 26rpx; margin-bottom: 24rpx; }
.conf.on { background: var(--green-bg); border-color: #c6d6c6; }
.conf-box { width: 40rpx; height: 40rpx; border-radius: 10rpx; border: 3rpx solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 900; color: #fff; }
.conf.on .conf-box { background: var(--green); border-color: var(--green); }
.conf-txt { flex: 1; }
.conf-t1 { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
.conf-t2 { font-size: 22rpx; color: var(--text-tertiary); margin-top: 6rpx; line-height: 1.5; }
.demo { text-align: center; font-size: 24rpx; color: var(--orange); padding: 10rpx 0 24rpx; }
.ft { padding: 8rpx 24rpx 20rpx; color: var(--text-tertiary); font-size: 21rpx; text-align: center; line-height: 1.6; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { width: 100%; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; box-shadow: var(--shadow-accent); }
</style>
