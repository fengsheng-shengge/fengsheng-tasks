<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 客户建议</view>
      <view class="h1">{{ h1 }}</view>
      <view class="sub">{{ result.axisLabel }}<text v-if="result.scenarioName" class="rh-sc"> · {{ result.scenarioName }}</text></view>
      <view class="hon">法源 100% 真实 · 数据/案例待补全</view>
    </view>

    <view class="warn">⚠ 当前知识库 dataRef / caseRef 覆盖率 0%，下方数据/案例为版式示意（公开政策），真实数据待小眼镜补入字典后自动替换。</view>

    <!-- 数据看板 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📊</text>数据看板</view>

      <block v-if="showDemoData">
        <view class="stats">
          <view class="sc" v-for="(s, i) in demoStats" :key="i">
            <view class="snum" :class="s.c">{{ s.num }}</view>
            <view class="scap">{{ s.cap }}</view>
          </view>
        </view>
        <view class="chart" v-for="(c, i) in demoCharts" :key="'c'+i">
          <view class="cht">{{ c.title }}</view>
          <view class="brow" v-for="(b, j) in c.bars" :key="j">
            <text class="bl">{{ b.label }}</text>
            <view class="btrack"><view class="bfill" :style="{ width: (b.val / b.max * 100) + '%', background: b.color }"></view></view>
            <text class="bv">{{ b.val }}{{ b.unit || '%' }}</text>
          </view>
          <view class="cnote">{{ c.note }}</view>
        </view>
      </block>

      <block v-else>
        <view class="dcard" v-for="(d, i) in realData" :key="i">
          <view class="dtitle">{{ d.label }}</view>
          <view class="dval">{{ d.text }}</view>
        </view>
      </block>
    </view>

    <!-- 真实案例 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📁</text>真实案例</view>
      <block v-if="showDemoCase">
        <view class="case">
          <view class="ctag">案例 · 示意</view>
          <view class="ctitle">{{ demoCase.title }}</view>
          <view class="cbody">{{ demoCase.body }}</view>
          <view class="cnote">※ 示意案例，待小眼镜补入真实成交案例（字典 caseRef 当前 0%）</view>
        </view>
      </block>
      <block v-else>
        <view class="case" v-for="(c, i) in realCases" :key="i">
          <view class="ctag ok">真实案例</view>
          <view class="ctitle">{{ c.title }}</view>
          <view class="cbody">{{ c.body }}</view>
        </view>
      </block>
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

    <view class="ft">本建议由您的专属服务顾问<br>通过「风声」整理提供</view>

    <view class="actions">
      <button class="btn-main" open-type="share">📤 转发给客户</button>
      <button class="btn-line" @tap="back">← 返回策展包</button>
    </view>
  </view>
</template>

<script>
import { generateCuration } from '../../engine.js'

const AXIS_TITLE = { buy: '购房', rent: '租住', sell: '出售', lease_out: '出租' }

export default {
  data() {
    return {
      axisType: 'buy',
      axisNodeKey: 'improve',
      scenario: '',
      freeText: '',
      result: { axisLabel: '', scenarioName: '', say: [] },
      showDemoData: true,
      showDemoCase: true,
      realData: [],
      realCases: [],
      points: [],
      demoStats: [
        { num: '15%', cap: '首套最低首付', c: 'g' },
        { num: '25%', cap: '二套最低首付', c: 'o' },
        { num: '2027', cap: '换购退税截止', c: 'g' }
      ],
      demoCharts: [
        {
          title: '首付比例下限（公开政策示意）',
          bars: [
            { label: '首套', val: 15, max: 30, unit: '%', color: '#3d5a3e' },
            { label: '二套', val: 25, max: 30, unit: '%', color: '#c46a3a' }
          ],
          note: '数据来源：各地差别化住房信贷政策（示意，待小眼镜补入字典真实数据）'
        },
        {
          title: '契税税率（公开政策示意）',
          bars: [
            { label: '首套>90㎡', val: 1.5, max: 3, unit: '%', color: '#3d5a3e' },
            { label: '二套', val: 2, max: 3, unit: '%', color: '#c46a3a' }
          ],
          note: '数据来源：契税优惠政策（示意，待小眼镜补入字典真实数据）'
        }
      ],
      demoCase: {
        title: '同小区换房客户：先卖后买 vs 先买后买 资金占用对比',
        body: '先卖后买：资金无缺口、但需短租过渡；先买后卖：免搬迁但二套首付+利率双高、月供压力大。结合退税政策，先卖后买更优。'
      }
    }
  },
  computed: {
    h1() {
      return '为您准备的' + (AXIS_TITLE[this.axisType] || '购房') + '建议'
    }
  },
  onLoad(options) {
    if (options) {
      this.axisType = options.axisType || 'buy'
      this.axisNodeKey = options.axisNodeKey || 'improve'
      this.scenario = options.scenario || ''
      this.freeText = options.freeText ? decodeURIComponent(options.freeText) : ''
    }
    const res = generateCuration({
      axisType: this.axisType,
      axisNodeKey: this.axisNodeKey,
      dimensions: [],
      freeText: this.freeText,
      scenario: this.scenario
    })
    this.result = res
    // 真实数据/案例：有则展示真实，无则展示示意
    this.realData = (res.say || [])
      .filter(s => s.fabe && s.fabe.e && s.fabe.e.data)
      .map(s => ({ label: s.title || s.fabe.f.text, text: s.fabe.e.data }))
    this.showDemoData = this.realData.length === 0
    this.realCases = (res.say || [])
      .filter(s => s.fabe && s.fabe.e && s.fabe.e.case)
      .map(s => ({ title: s.title || s.fabe.f.text, body: s.fabe.e.case }))
    this.showDemoCase = this.realCases.length === 0
    this.points = (res.say || []).map(s => ({
      title: (s.fabe && s.fabe.f && s.fabe.f.text) || s.title || '',
      legal: s.fabe && s.fabe.e && s.fabe.e.legal
    }))
  },
  onShareAppMessage() {
    return {
      title: '我为您准备了这次见面的专业建议 · 风声',
      path: '/package-curation/pages/curate-client/index?axisType=' + this.axisType + '&axisNodeKey=' + this.axisNodeKey + '&scenario=' + this.scenario + '&freeText=' + encodeURIComponent(this.freeText)
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
.ft { padding: 14px; color: #8a837a; font-size: 11px; text-align: center; line-height: 1.6; }
.actions { margin-top: 4px; }
.btn-main { background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 12px; padding: 12px; font-size: 14px; margin-top: 8px; }
</style>
