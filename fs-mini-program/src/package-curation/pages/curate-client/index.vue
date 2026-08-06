<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 客户建议</view>
      <view class="h1">{{ h1 }}</view>
      <view class="sub">{{ result.axisLabel }}<text v-if="result.scenarioName" class="rh-sc"> · {{ result.scenarioName }}</text></view>
      <view class="hon">法源真实标注 · 数据/案例持续补全，最终以专业判断为准</view>
    </view>

    <!-- 数据看板 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📊</text>数据看板</view>

      <block v-if="realData.length">
        <view class="dcard" v-for="(d, i) in realData" :key="i">
          <view class="dtitle">{{ d.label }}</view>
          <view class="dval">{{ d.text }}</view>
        </view>
      </block>
      <view v-else class="empty-mini">真实数据补入中 · 见面以专业判断为准</view>
    </view>

    <!-- 真实案例 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📁</text>真实案例</view>
      <block v-if="realCases.length">
        <view class="case" v-for="(c, i) in realCases" :key="i">
          <view class="ctag ok">真实案例</view>
          <view class="ctitle">{{ c.title }}</view>
          <view class="cbody">{{ c.body }}</view>
        </view>
      </block>
      <view v-else class="empty-mini">真实成交案例补入中 · 见面以专业判断为准</view>
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

    <!-- 我们对您居住需求的理解（对客视角，不使用内部术语）-->
    <view class="sec" v-if="dimsInsight && dimsInsight.enabled">
      <view class="sec-h"><text class="em">🎯</text>我们对您居住需求的理解</view>
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
      points: [],
      radarW: 250,
      radarH: 230,
      radarUrlStr: ''
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
    }
  },
  onLoad(options) {
    let dimScores = {}, dimSelfScores = {}, dimensions = []
    if (options) {
      this.axisType = options.axisType || 'buy'
      this.axisNodeKey = options.axisNodeKey || 'improve'
      this.scenario = options.scenario || ''
      this.freeText = options.freeText ? decodeURIComponent(options.freeText) : ''
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
    // 真实数据/案例：有则展示真实，无则诚实留白（不编造示意数据）
    this.realData = (res.say || [])
      .filter(s => s.fabe && s.fabe.e && s.fabe.e.data)
      .map(s => ({ label: s.title || s.fabe.f.text, text: s.fabe.e.data }))
    this.realCases = (res.say || [])
      .filter(s => s.fabe && s.fabe.e && s.fabe.e.case)
      .map(s => ({ title: s.title || s.fabe.f.text, body: s.fabe.e.case }))
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
        '&dimSelfScores=' + encodeURIComponent(JSON.stringify(this.dimSelfScores || {}))
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
.page { padding: 14px; background: #f7f4ef; min-height: 100vh; box-sizing: border-box; padding-bottom: calc(78px + env(safe-area-inset-bottom)); }
.hd { background: #3d5a3e; border-radius: 16px; padding: 18px 16px 14px; margin-bottom: 12px; }
.brand { font-size: 11px; color: rgba(255,255,255,0.85); letter-spacing: 1px; }
.h1 { font-size: 19px; font-weight: 700; color: #fff; margin-top: 6px; }
.sub { font-size: 13px; color: rgba(255,255,255,0.9); margin-top: 4px; }
.rh-sc { color: #f3c9a8; }
.hon { display: inline-block; margin-top: 10px; background: rgba(255,255,255,0.16); color: #fff; font-size: 10.5px; padding: 4px 10px; border-radius: 16px; }
.warn { background: #fff6e9; color: #9a6a2a; font-size: 11px; padding: 8px 12px; line-height: 1.5; border-radius: 10px; margin-bottom: 12px; border: 1px solid #f0d9c6; }
.sec { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.sec-h { font-size: 15px; font-weight: 700; color: #2b2b2b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.em { font-size: 16px; }
.stats { display: flex; gap: 8px; margin-bottom: 4px; }
.sc { flex: 1; background: #f7f4ef; border-radius: 12px; padding: 10px 8px; text-align: center; }
.snum { font-size: 20px; font-weight: 700; color: #3d5a3e; }
.snum.o { color: #c46a3a; }
.scap { font-size: 10.5px; color: #8a837a; margin-top: 3px; line-height: 1.3; }
.chart { margin-top: 10px; }
.cht { font-size: 12.5px; font-weight: 700; color: #4a443c; margin-bottom: 8px; }
.brow { display: flex; align-items: center; gap: 8px; margin: 7px 0; }
.bl { flex: 0 0 56px; font-size: 11.5px; color: #6b6359; }
.btrack { flex: 1; height: 14px; background: #efeae0; border-radius: 7px; overflow: hidden; }
.bfill { height: 100%; border-radius: 7px; }
.bv { flex: 0 0 40px; text-align: right; font-size: 12px; font-weight: 700; color: #4a443c; }
.cnote { font-size: 10px; color: #a59c8f; margin-top: 6px; line-height: 1.4; }
.dcard { background: #f7f4ef; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.dtitle { font-size: 13px; font-weight: 700; color: #2b2b2b; }
.dval { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.5; }
.case { background: #fdf3ec; border: 1px solid #f0d9c6; border-radius: 12px; padding: 11px 12px; }
.ctag { display: inline-block; background: #c46a3a; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; }
.ctag.ok { background: #3d5a3e; }
.ctitle { font-size: 13px; font-weight: 700; color: #7a4a2a; margin-top: 7px; line-height: 1.4; }
.cbody { font-size: 11.5px; color: #9a6a44; margin-top: 5px; line-height: 1.5; }
.cnote { font-size: 10px; color: #a59c8f; margin-top: 6px; line-height: 1.4; }
.pts { }
.pt { display: flex; align-items: flex-start; gap: 7px; padding: 7px 0; border-bottom: 1px dashed #e7e0d4; }
.pt:last-child { border-bottom: none; }
.dot { flex: 0 0 6px; height: 6px; border-radius: 50%; background: #c46a3a; margin-top: 6px; }
.ptx { flex: 1; font-size: 13px; color: #3a342c; line-height: 1.4; }
.lb { flex-shrink: 0; font-size: 10px; color: #3d5a3e; background: #eef3ec; padding: 2px 6px; border-radius: 5px; }
.empty-mini { font-size: 12px; color: #aaa; padding: 6px 0; }
/* 七维洞察（双轨）*/
.di-row { padding: 10px 0; border-bottom: 1px dashed #e7e0d4; }
.di-row:last-of-type { border-bottom: none; }
.di-name { font-size: 13.5px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.di-flag { font-size: 10.5px; font-weight: 700; color: #c0392b; background: #fdecea; padding: 2px 8px; border-radius: 10px; }
.di-bars { display: flex; flex-direction: column; gap: 5px; }
.di-bar { display: flex; align-items: center; gap: 8px; }
.di-lbl { flex-shrink: 0; width: 30px; font-size: 11px; font-weight: 700; }
.di-lbl.b { color: #c46a3a; }
.di-lbl.s { color: #3d5a3e; }
.di-track { flex: 1; height: 12px; background: #efeae0; border-radius: 6px; overflow: hidden; }
.di-fill { height: 100%; border-radius: 6px; }
.di-fill.b { background: #c46a3a; }
.di-fill.s { background: #3d5a3e; }
.di-v { flex-shrink: 0; width: 22px; text-align: right; font-size: 12px; font-weight: 700; color: #4a443c; }
.di-conc { margin-top: 10px; font-size: 12px; color: #3d5a3e; background: #eef3ec; border-radius: 8px; padding: 9px 11px; line-height: 1.55; }
/* 七维雷达图（V3.2.7 表现层补全）*/
.radar-wrap { display: flex; justify-content: center; padding: 6px 0 2px; }
.radar { display: block; }
.legend { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 11px; color: #6b6359; margin: 6px 0 2px; }
.lg { display: inline-block; width: 14px; height: 8px; border-radius: 4px; }
.lg-b { background: #c46a3a; }
.lg-s { background: #3d5a3e; }
.ft { padding: 14px; color: #8a837a; font-size: 11px; text-align: center; line-height: 1.6; }
.actions { margin-top: 4px; }
.btn-main { background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 12px; padding: 12px; font-size: 14px; margin-top: 8px; }
</style>
