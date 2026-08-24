<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 客户建议</view>
      <view class="h1">{{ h1 }}</view>
      <view class="sub">{{ result.axisLabel }}<text v-if="result.scenarioName" class="rh-sc"> · {{ result.scenarioName }}</text></view>
      <view class="hon">法源真实标注 · 数据/案例持续补全，最终以专业判断为准</view>
    </view>

    <!-- 双视图切换（仅经纪人预览可见，客户场景隐藏内部切换器） -->
    <view class="view-switch" v-if="!isClient">
      <text class="vs-i" :class="{ on: view === 'broker' }" @tap="view = 'broker'">经纪人版 · 含话术</text>
      <text class="vs-i" :class="{ on: view === 'client' }" @tap="view = 'client'">客户版 · 纯方案</text>
    </view>

    <!-- 数据参考（经纪人版=数据看板；客户版=数据参考。有则展示，无数据客户侧隐藏以免空感） -->
    <view class="sec" v-if="view === 'broker' || realData.length">
      <view class="sec-h"><text class="em">📊</text>{{ isClient ? '数据参考' : '数据看板' }}</view>

      <block v-if="realData.length">
        <view class="dcard" v-for="(d, i) in realData" :key="i">
          <view class="dtitle"><text class="dtag">数据</text>{{ d.label }}</view>
          <view class="dval">{{ d.text }}</view>
          <view v-if="d.source" class="dsrc">来源：{{ d.source }}</view>
        </view>
      </block>
      <view v-else class="empty-mini">真实数据补入中 · 见面以专业判断为准</view>
    </view>

    <!-- 真实案例参考（经纪人版=真实案例；客户版=案例参考。有则展示，无数据客户侧隐藏） -->
    <view class="sec" v-if="view === 'broker' || realCases.length">
      <view class="sec-h"><text class="em">📁</text>{{ isClient ? '真实案例参考' : '真实案例' }}</view>
      <block v-if="realCases.length">
        <view class="case" v-for="(c, i) in realCases" :key="i">
          <view class="ctag ok">{{ isClient ? '案例参考' : '真实案例' }}</view>
          <view class="ctitle">{{ c.title }}</view>
          <view class="cbody">{{ c.body }}</view>
          <view v-if="c.source" class="csrc">来源：{{ c.source }}</view>
        </view>
      </block>
      <view v-else class="empty-mini">真实成交案例补入中 · 见面以专业判断为准</view>
    </view>

    <!-- 依据来源（常驻：强相关词条 legalRef+dataSource 100% 有料，立即建立专业可信；客户版称政策依据） -->
    <view class="sec" v-if="legalSources.length">
      <view class="sec-h"><text class="em">📜</text>{{ isClient ? '政策依据' : '依据来源' }}</view>
      <view class="dcard" v-for="(l, i) in legalSources" :key="i">
        <view class="dtitle"><text class="dtag">依据</text>{{ l.label }}</view>
        <view class="dval">{{ l.legal }}</view>
        <view v-if="l.source" class="dsrc">来源：{{ l.source }}</view>
      </view>
    </view>

    <!-- 要点速览 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💡</text>要点速览</view>
      <view class="pts">
        <view v-if="!points.length" class="empty-mini">该场景要点整理中 · 建议见面时结合专业判断补充</view>
        <block v-else>
          <view class="pt" v-for="(p, i) in points" :key="i">
            <view class="dot"></view>
            <view class="ptx">{{ p.title }}</view>
            <text v-if="p.legal" class="lb">✓ 法源</text>
          </view>
        </block>
      </view>
    </view>

    <!-- 方案分层（道法术器 · 知识库大脑组织，非模板套话） -->
    <view class="sec" v-if="layers.length">
      <view class="sec-h"><text class="em">🧠</text>方案分层 · 道法术器</view>
      <view class="empty-mini" v-if="view === 'client' && !clientLayerItems" style="margin-bottom:10px">以下为面向客户的方案与依据。</view>
      <view class="layer" v-for="(g, gi) in layers" :key="gi">
        <view class="layer-h"><text class="layer-name">{{ g.name }}</text><text class="layer-desc">{{ g.desc }}</text></view>
        <view class="layer-item" v-for="(it, ii) in g.items" :key="ii">
          <view class="li-title">{{ it.title }}<text v-if="it.hasLegal" class="lb">✓ 依据</text></view>
          <view class="li-ola" v-if="it.ola">{{ it.ola }}</view>
          <view class="li-cp" v-if="view === 'broker' && it.cp && it.cp.length">
            <text class="cp-t">操作要点：</text>
            <text class="cp-x" v-for="(c, ci) in it.cp" :key="ci">{{ c }}<text v-if="ci < it.cp.length - 1">；</text></text>
          </view>
          <view class="li-legal" v-if="it.legalRef">依据：{{ it.legalRef }}</view>
        </view>
      </view>
    </view>

    <!-- 我们对您居住需求的理解（对客视角，不使用内部术语）-->
    <view class="sec" v-if="dimsInsight && dimsInsight.enabled">
      <view class="sec-h"><text class="em">🎯</text>我们对您居住需求的理解</view>

      <!-- 综合居住品质评分卡（由录入维度加权得出，非编造） -->
      <view class="score-card">
        <view class="sc-left">
          <view class="sc-num">{{ avgScore }}<text class="sc-max">/10</text></view>
          <view class="sc-grade" :class="gradeClass">{{ grade }}</view>
        </view>
        <view class="sc-right">
          <view class="sc-tip">综合居住品质理解</view>
          <view class="sc-sub">基于录入的 {{ insightItems.length }} 个维度加权</view>
        </view>
      </view>

      <view class="radar-wrap">
        <image class="radar" :src="radarUrlStr" :style="{ width: radarW + 'px', height: radarH + 'px' }"></image>
      </view>
      <view v-if="radarSelfEval" class="legend"><span class="lg lg-b"></span>我们的理解 <span class="lg lg-s"></span>您的自评</view>
      <view v-for="(it, i) in insightItems" :key="i" class="di-row">
        <view class="di-name">{{ it.name }}<text v-if="it.flag" class="di-flag">待对齐</text></view>
        <view class="di-bars">
          <view class="di-bar"><text class="di-lbl b">我们</text><view class="di-track"><view class="di-fill b" :style="{ width: (it.broker * 10) + '%' }"></view></view><text class="di-v">{{ it.broker }}</text></view>
          <view class="di-bar" v-if="dimsInsight.selfEval"><text class="di-lbl s">您</text><view class="di-track"><view class="di-fill s" :style="{ width: (it.self * 10) + '%' }"></view></view><text class="di-v">{{ it.self }}</text></view>
        </view>
      </view>
      <view class="di-conc" v-if="dimsInsight.clientConclusion">{{ dimsInsight.clientConclusion }}</view>
    </view>

    <!-- 七维未评分引导卡（仅经纪人预览版；客户版隐藏保持纯净）-->
    <view class="sec guide-sec" v-else-if="!isClient && (!dimsInsight || !dimsInsight.enabled)">
      <view class="sec-h"><text class="em">🎯</text>我们对您居住需求的理解</view>
      <view class="guide-card">
        <view class="guide-ic">📝</view>
        <view class="guide-t">尚未完成七维打分</view>
        <view class="guide-d">在策展录入页为「住得好七维」选维度并打分（或让客户答题自评）后，这里会自动显示客户的<text class="guide-b">综合居住品质评分卡 + 雷达图</text>，让方案更有依据、客户更信服。</view>
      </view>
    </view>

    <view class="ft">本建议由您的专属服务顾问<br>通过「风声」整理提供</view>

    <view class="actions">
      <button class="btn-main" open-type="share">📤 转发给客户</button>
      <button class="btn-line" @tap="back">← 返回策展包</button>
    </view>
  </view>
</template>

<script>
import { generateCuration } from '../../engine.js'
import { buildRadarDataUrl } from '../../radar.js'

const AXIS_TITLE = { buy: '购房', rent: '租住', sell: '出售', lease_out: '出租' }

export default {
  data() {
    return {
      axisType: 'buy',
      axisNodeKey: 'improve',
      scenario: '',
      freeText: '',
      result: { axisLabel: '', scenarioName: '', say: [] },
      dimsInsight: null,
      dimensions: [],
      dimScores: {},
      dimSelfScores: {},
      realData: [],
      realCases: [],
      legalSources: [],
      points: [],
      radarW: 250,
      radarH: 230,
      radarUrlStr: '',
      view: 'broker',
      isClient: false
    }
  },
  computed: {
    h1() {
      return '为您准备的' + (AXIS_TITLE[this.axisType] || '购房') + '建议'
    },
    insightItems() {
      if (!this.dimsInsight) return []
      return this.dimsInsight.items.filter(i => i.hasBroker)
    },
    radarSelfEval() {
      return !!(this.dimsInsight && this.dimsInsight.selfEval)
    },
    radarDims() {
      return this.insightItems.map(i => i.name)
    },
    radarBroker() {
      return this.insightItems.map(i => +(i.broker || 0))
    },
    avgScore() {
      const arr = this.radarBroker.filter(v => v > 0)
      if (!arr.length) return '—'
      const sum = arr.reduce((a, b) => a + b, 0)
      return (Math.round((sum / arr.length) * 10) / 10).toFixed(1)
    },
    grade() {
      const v = parseFloat(this.avgScore)
      if (isNaN(v)) return '—'
      if (v >= 4.0) return 'A'
      if (v >= 3.0) return 'B'
      return 'C'
    },
    gradeClass() {
      return this.grade === 'A' ? 'a' : this.grade === 'B' ? 'b' : 'c'
    },
    radarSelf() {
      return this.insightItems.map(i => +(i.self || 0))
    },
    radarUrl() {
      if (!this.dimsInsight || !this.dimsInsight.enabled || !this.radarDims.length) return ''
      return buildRadarDataUrl({
        W: this.radarW,
        H: this.radarH,
        dims: this.radarDims,
        broker: this.radarBroker,
        self: this.radarSelf,
        selfEval: this.radarSelfEval
      })
    },
    layers() {
      return (this.result && this.result.layers) || []
    }
  },
  onLoad(options) {
    let dimScores = {}, dimSelfScores = {}, dimensions = []
    if (options) {
      this.axisType = options.axisType || 'buy'
      this.axisNodeKey = options.axisNodeKey || 'improve'
      this.scenario = options.scenario || ''
      this.freeText = options.freeText ? decodeURIComponent(options.freeText) : ''
      // 客户专属视图：分享出去强制 client 版，隐藏经纪人内部切换器（生哥 08-24 反馈）
      if (options.view === 'client') { this.view = 'client'; this.isClient = true }
      try { dimScores = options.dimScores ? JSON.parse(decodeURIComponent(options.dimScores)) : {} } catch (e) { dimScores = {} }
      try { dimSelfScores = options.dimSelfScores ? JSON.parse(decodeURIComponent(options.dimSelfScores)) : {} } catch (e) { dimSelfScores = {} }
      try {
        dimensions = options.dimensions ? decodeURIComponent(options.dimensions).split(',').filter(Boolean) : []
      } catch (e) { dimensions = [] }
    }
    // 兜底：未显式传维度时，用打过分的维度还原（避免七维洞察在客户页丢失）
    if (!dimensions.length) {
      dimensions = Array.from(new Set([...Object.keys(dimScores), ...Object.keys(dimSelfScores)]))
    }
    this.dimensions = dimensions
    this.dimScores = dimScores
    this.dimSelfScores = dimSelfScores
    const res = generateCuration({
      axisType: this.axisType,
      axisNodeKey: this.axisNodeKey,
      dimensions,
      freeText: this.freeText,
      scenario: this.scenario,
      dimScores,
      dimSelfScores
    })
    this.result = res
    this.dimsInsight = res.dimsInsight || null
    // 真实数据/案例：优先用 engine 解耦收集的数据源（含无 ola/cp 的强相关词条），无则退回 say 内 fabe.e 兜底；有则展示真实，无则诚实留白（不编造示意数据）
    this.realData = (res.dataSources && res.dataSources.length)
      ? res.dataSources
      : (res.say || [])
          .filter(s => s.fabe && s.fabe.e && s.fabe.e.data)
          .map(s => ({ label: s.title || s.fabe.f.text, text: s.fabe.e.data }))
    this.realCases = (res.caseSources && res.caseSources.length)
      ? res.caseSources
      : (res.say || [])
          .filter(s => s.fabe && s.fabe.e && s.fabe.e.case)
          .map(s => ({ title: s.title || s.fabe.f.text, body: s.fabe.e.case }))
    // 依据来源（常驻）：legalRef + dataSource，强相关词条 100% 有料，立即建立专业可信
    this.legalSources = (res.legalSources && res.legalSources.length) ? res.legalSources : []
    // 客户页要点速览：仅保留 FABE 结构完整的条目（避免把 broker 笔记式 title 漏给客户）
    this.points = (res.say || [])
      .filter(s => s && s.fabe && s.fabe.f && s.fabe.f.text)
      .map(s => ({
        title: s.fabe.f.text,
        legal: s.fabe.e && s.fabe.e.legal
      }))
    this.radarUrlStr = (this.dimsInsight && this.dimsInsight.enabled && this.radarDims.length)
      ? buildRadarDataUrl({ W: this.radarW, H: this.radarH, dims: this.radarDims, broker: this.radarBroker, self: this.radarSelf, selfEval: this.radarSelfEval })
      : ''
  },
  onShareAppMessage() {
    return {
      title: '我为您准备了这次见面的专业建议 · 风声',
      path: '/package-curation/pages/curate-client/index?axisType=' + this.axisType +
        '&axisNodeKey=' + this.axisNodeKey +
        '&scenario=' + this.scenario +
        '&freeText=' + encodeURIComponent(this.freeText) +
        '&dimensions=' + encodeURIComponent((this.dimensions || []).join(',')) +
        '&dimScores=' + encodeURIComponent(JSON.stringify(this.dimScores || {})) +
        '&dimSelfScores=' + encodeURIComponent(JSON.stringify(this.dimSelfScores || {})) +
        '&view=client'
    }
  },
  methods: {
    back() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
/* 套用 review plan 设计语言：降噪放大（14px 正文、24rpx+ 间距、28rpx 卡片圆角） */
.page { padding: 0; background: var(--cream); min-height: 100vh; box-sizing: border-box; padding-bottom: calc(180rpx + env(safe-area-inset-bottom)); }
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-xl); padding: 56rpx 40rpx 44rpx; color: #fff; position: relative; overflow: hidden; margin: 0 0 24rpx; }
.brand { font-size: 22rpx; color: rgba(255,255,255,0.85); letter-spacing: 2rpx; }
.h1 { font-size: 40rpx; font-weight: 800; color: #fff; margin-top: 12rpx; line-height: 1.3; }
.sub { font-size: 26rpx; color: rgba(255,255,255,0.9); margin-top: 12rpx; }
.rh-sc { color: #f3c9a8; }
.hon { display: inline-block; margin-top: 20rpx; background: rgba(255,255,255,0.16); color: #fff; font-size: 22rpx; padding: 10rpx 24rpx; border-radius: 999rpx; }
.warn { background: var(--orange-bg); color: #9a6a2a; font-size: 22rpx; padding: 20rpx 24rpx; line-height: 1.6; border-radius: var(--r-md); margin-bottom: 24rpx; border: 2rpx solid #f0d9c6; }
.sec { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin-bottom: 24rpx; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 24rpx; display: flex; align-items: center; gap: 12rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid var(--divider); }
.em { font-size: 36rpx; }
.stats { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.sc { flex: 1; background: var(--cream); border-radius: var(--r-md); padding: 20rpx 16rpx; text-align: center; }
.snum { font-size: 40rpx; font-weight: 800; color: var(--green); }
.snum.o { color: var(--orange); }
.scap { font-size: 22rpx; color: var(--text-tertiary); margin-top: 8rpx; line-height: 1.4; }
.chart { margin-top: 20rpx; }
.cht { font-size: 26rpx; font-weight: 700; color: #4a443c; margin-bottom: 16rpx; }
.brow { display: flex; align-items: center; gap: 16rpx; margin: 14rpx 0; }
.bl { flex: 0 0 112rpx; font-size: 23rpx; color: var(--text-secondary); }
.btrack { flex: 1; height: 28rpx; background: var(--cream-dark); border-radius: 14rpx; overflow: hidden; }
.bfill { height: 100%; border-radius: 14rpx; }
.bv { flex: 0 0 80rpx; text-align: right; font-size: 24rpx; font-weight: 700; color: #4a443c; }
.cnote { font-size: 20rpx; color: var(--text-tertiary); margin-top: 12rpx; line-height: 1.5; }
.dcard { background: var(--cream); border-radius: var(--r-md); padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.dtitle { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
.dval { font-size: 24rpx; color: var(--text-secondary); margin-top: 8rpx; line-height: 1.6; }
.case { background: var(--orange-bg); border: 2rpx solid #f0d9c6; border-radius: var(--r-md); padding: 22rpx 24rpx; }
.ctag { display: inline-block; background: var(--orange); color: #fff; font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999rpx; }
.ctag.ok { background: var(--green); }
.ctitle { font-size: 26rpx; font-weight: 700; color: #7a4a2a; margin-top: 14rpx; line-height: 1.5; }
.cbody { font-size: 23rpx; color: #9a6a44; margin-top: 10rpx; line-height: 1.6; }
.pts { }
.pt { display: flex; align-items: flex-start; gap: 14rpx; padding: 16rpx 0; border-bottom: 2rpx dashed var(--border); }
.pt:last-child { border-bottom: none; }
.dot { flex: 0 0 12rpx; height: 12rpx; border-radius: 50%; background: var(--orange); margin-top: 12rpx; }
.ptx { flex: 1; font-size: 26rpx; color: #3a342c; line-height: 1.6; }
.lb { flex-shrink: 0; font-size: 20rpx; color: var(--green); background: var(--green-bg); padding: 4rpx 12rpx; border-radius: var(--r-sm); }
.empty-mini { font-size: 24rpx; color: var(--text-tertiary); padding: 12rpx 0; }
/* 七维洞察（双轨）*/
.di-row { padding: 20rpx 0; border-bottom: 2rpx dashed var(--border); }
.di-row:last-of-type { border-bottom: none; }
.di-name { font-size: 27rpx; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.di-flag { font-size: 21rpx; font-weight: 700; color: #c0392b; background: #fdecea; padding: 4rpx 16rpx; border-radius: 999rpx; }
.di-bars { display: flex; flex-direction: column; gap: 10rpx; }
.di-bar { display: flex; align-items: center; gap: 16rpx; }
.di-lbl { flex-shrink: 0; width: 60rpx; font-size: 23rpx; font-weight: 700; }
.di-lbl.b { color: var(--orange); }
.di-lbl.s { color: var(--green); }
.di-track { flex: 1; height: 24rpx; background: var(--cream-dark); border-radius: 12rpx; overflow: hidden; }
.di-fill { height: 100%; border-radius: 12rpx; }
.di-fill.b { background: var(--orange); }
.di-fill.s { background: var(--green); }
.di-v { flex-shrink: 0; width: 44rpx; text-align: right; font-size: 24rpx; font-weight: 700; color: #4a443c; }
.di-conc { margin-top: 20rpx; font-size: 24rpx; color: var(--green); background: var(--green-bg); border-radius: var(--r-md); padding: 18rpx 22rpx; line-height: 1.6; }
/* 综合居住品质评分卡 */
.score-card { display: flex; align-items: center; gap: 28rpx; background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-lg); padding: 28rpx 32rpx; margin-bottom: 24rpx; }
.sc-left { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; }
.sc-num { font-size: 56rpx; font-weight: 800; color: #fff; line-height: 1; }
.sc-max { font-size: 24rpx; font-weight: 600; color: rgba(255,255,255,.7); margin-left: 4rpx; }
.sc-grade { margin-top: 8rpx; font-size: 26rpx; font-weight: 800; color: #fff; background: rgba(255,255,255,.22); border-radius: 999rpx; padding: 4rpx 22rpx; }
.sc-grade.a { color: #fff; background: rgba(255,255,255,.28); }
.sc-grade.b { color: #fff; background: rgba(255,255,255,.16); }
.sc-grade.c { color: #ffe2d0; background: rgba(196,106,58,.9); }
.sc-right { flex: 1; }
.sc-tip { font-size: 28rpx; font-weight: 700; color: #fff; line-height: 1.4; }
.sc-sub { font-size: 22rpx; color: rgba(255,255,255,.85); margin-top: 8rpx; line-height: 1.5; }
/* 数据条目标签 */
.dtag { display: inline-block; font-size: 20rpx; font-weight: 700; color: var(--green); background: var(--green-bg); border-radius: var(--r-sm); padding: 2rpx 12rpx; margin-right: 12rpx; vertical-align: middle; }
.dsrc { font-size: 21rpx; color: var(--text-tertiary); margin-top: 10rpx; line-height: 1.5; border-top: 2rpx dashed var(--border); padding-top: 10rpx; }
.csrc { font-size: 21rpx; color: #9a6a44; margin-top: 10rpx; line-height: 1.5; border-top: 2rpx dashed #f0d9c6; padding-top: 10rpx; }
/* 七维未评分引导卡 */
.guide-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 36rpx 24rpx; background: var(--cream); border-radius: var(--r-md); border: 2rpx dashed var(--border); }
.guide-ic { font-size: 56rpx; margin-bottom: 12rpx; }
.guide-t { font-size: 28rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 10rpx; }
.guide-d { font-size: 23rpx; color: var(--text-secondary); line-height: 1.7; }
.guide-b { color: var(--green); font-weight: 700; }
/* 七维雷达图 */
.radar-wrap { display: flex; justify-content: center; padding: 12rpx 0 4rpx; }
.radar { display: block; }
.legend { display: flex; align-items: center; justify-content: center; gap: 28rpx; font-size: 22rpx; color: var(--text-secondary); margin: 12rpx 0 4rpx; }
.lg { display: inline-block; width: 28rpx; height: 16rpx; border-radius: 8rpx; }
.lg-b { background: var(--orange); }
.lg-s { background: var(--green); }
.ft { padding: 28rpx; color: var(--text-tertiary); font-size: 22rpx; text-align: center; line-height: 1.7; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); display: flex; gap: 20rpx; box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { flex: 1; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border-radius: var(--r-md); padding: 32rpx; font-size: 32rpx; font-weight: 800; box-shadow: var(--shadow-accent); }
.btn-line { background: #fff; color: var(--green); border: 3rpx solid var(--green); border-radius: var(--r-md); padding: 32rpx; font-size: 28rpx; font-weight: 700; }
/* 双视图切换 */
.view-switch { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.vs-i { flex: 1; text-align: center; font-size: 24rpx; font-weight: 700; color: var(--text-secondary); padding: 20rpx 0; border-radius: var(--r-sm); background: #fff; border: 3rpx solid var(--border); }
.vs-i.on { background: var(--green); color: #fff; border-color: var(--green); box-shadow: var(--shadow-brand); }
/* 道法术器分层 */
.layer { background: linear-gradient(180deg, #fff, var(--cream-dark)); border-radius: var(--r-lg); padding: 28rpx; margin-bottom: 24rpx; border: 3rpx solid var(--border); }
.layer-h { display: flex; align-items: baseline; gap: 16rpx; margin-bottom: 16rpx; padding-bottom: 16rpx; border-bottom: 2rpx solid var(--divider); }
.layer-name { font-size: 30rpx; font-weight: 800; color: var(--green); }
.layer-desc { font-size: 22rpx; color: var(--text-tertiary); }
.layer-item { padding: 16rpx 0; border-bottom: 2rpx dashed var(--divider); }
.layer-item:last-child { border-bottom: none; }
.li-title { font-size: 28rpx; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 14rpx; }
.li-ola { font-size: 26rpx; color: #4a443c; margin-top: 8rpx; line-height: 1.7; }
.li-cp { font-size: 24rpx; color: var(--text-secondary); margin-top: 8rpx; line-height: 1.6; }
.cp-t { font-weight: 700; color: var(--orange); }
.li-legal { font-size: 22rpx; color: var(--green); background: var(--green-bg); border-radius: var(--r-sm); padding: 8rpx 16rpx; margin-top: 10rpx; line-height: 1.6; }
</style>
