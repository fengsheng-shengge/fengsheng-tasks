<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · 房源提案报告</view>
      <view class="h1">MOT② 提案方案</view>
      <view class="sub" v-if="client">{{ client.name }} · {{ client.rel }}</view>
    </view>

    <!-- 无数据引导 -->
    <view class="no-data" v-if="!propsList.length">
      <view class="nd-ico">📭</view>
      <view class="nd-t">还没有提案报告</view>
      <view class="nd-s">请先录入备选房源并生成提案</view>
      <button class="btn-primary" @tap="goEntry">→ 去录入房源提案</button>
    </view>

    <template v-else>
      <!-- 报告编号 + 确认状态 -->
      <view class="gate-hint" v-if="!confirmed">
        <text>⚠️ 提案待双方确认，确认后解锁带看分析</text>
      </view>
      <view class="gate-ok" v-else>
        <text>✓ 提案已双方确认，带看分析已解锁</text>
      </view>

      <!-- 关联洞察锚定 -->
      <view class="insight-card">
        <view class="ic-h">📋 关联洞察报告</view>
        <view class="ic-row">
          <view class="ic-chip">
            <view class="ic-chip-label">客户类型</view>
            <view class="ic-chip-val">{{ insightTypeLabels }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">核心动机</view>
            <view class="ic-chip-val">{{ insightCoreDim }}</view>
          </view>
        </view>
      </view>

      <!-- 精选房源 -->
      <view class="section-hd">
        <view>🏠 精选房源 TOP {{ propsList.length }}</view>
      </view>
      <view v-for="(p, idx) in propsList" :key="p._id" class="prop-card">
        <view class="prop-top">
          <view :class="['prop-rank', { top1: idx === 0 }]">{{ idx + 1 }}</view>
          <view class="prop-body">
            <view class="prop-name">{{ p.name || '房源' + (idx + 1) }}</view>
            <view class="prop-addr">{{ p.address || '地址待填写' }}</view>
            <view class="prop-meta" v-if="p.tags && p.tags.length">
              <text class="prop-tag" v-for="t in p.tags" :key="t">{{ t }}</text>
            </view>
          </view>
        </view>
        <view class="prop-spec" v-if="p.price || p.area || p.layout">
          <text v-if="p.price" class="spec">{{ p.price }} 万</text>
          <text v-if="p.area" class="spec">{{ p.area }} ㎡</text>
          <text v-if="p.layout" class="spec">{{ p.layout }}</text>
        </view>
        <view class="prop-reason" v-if="p.reason">
          <view class="pr-label">🎯 匹配理由</view>
          <view class="pr-text">{{ p.reason }}</view>
        </view>
      </view>

      <!-- 讲房话术 -->
      <view class="section-hd"><view>🗣️ 讲房话术（按 {{ insightTypeLabels }}）</view></view>
      <view class="tips-card">
        <view class="tip" v-for="(tip, ti) in filteredTips" :key="ti">
          <text class="tip-ico">{{ '1️⃣2️⃣3️⃣4️⃣5️⃣'.charAt(ti * 3) + '️⃣' }}</text>
          <text class="tip-tx">{{ tip }}</text>
        </view>
      </view>

      <!-- 下一步引导 -->
      <view class="next-card">
        <view class="nc-h">下一步</view>
        <view class="nc-line" @tap="goShowing">
          <view class="nc-ico">🏃</view>
          <view class="nc-body">
            <view class="nc-t">进入带看分析</view>
            <view class="nc-s">MOT③ 讲房执行 + 意向判断</view>
          </view>
          <text class="nc-arrow">›</text>
        </view>
      </view>
    </template>
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
      report: null
    }
  },
  computed: {
    userStore() { return useUserStore() },
    insightData() {
      return (this.client && this.client.lifecycle && this.client.lifecycle.insightData) || null
    },
    propsList() {
      const d = (this.report && this.report.data) || (this.insightData && this.insightData.proposalData) || null
      return (d && d.properties) ? d.properties : []
    },
    confirmed() { return !!(this.report && this.report.confirmed) },
    agentConfirmed() { return !!(this.report && this.report.agentConfirmed) },
    clientConfirmed() { return !!(this.report && this.report.clientConfirmed) },
    reportNo() { return (this.report && this.report.reportNo) || '' },
    insightTypeLabels() {
      if (!this.insightData || !this.insightData.types || !this.insightData.types.length) return '未分型'
      const map = {
        commuter: '通勤敏感型', first_home: '首次置业型', family_kid: '有娃家庭型',
        improve: '改善置换型', elder: '养老宜居型', invest: '投资增值型',
        study: '陪读求学型', price: '纯价格敏感型'
      }
      return this.insightData.types.map(k => map[k] || k).join(' · ')
    },
    insightCoreDim() {
      if (!this.insightData || !this.insightData.dims || !this.insightData.dims.length) return '未标'
      const nameMap = { safety: '物质安全', health: '健康', conv: '便利', econ: '经济', comfort: '舒适', beauty: '美观', free: '自在' }
      return nameMap[this.insightData.dims[0]] || this.insightData.dims[0]
    },
    filteredTips() {
      const base = {
        commuter: ['先讲通勤：地铁实测步行时间 × 分钟，高德/百度地图可查', '四维坐标：小区 → 最近地铁口步行分钟数，接驳方式', '高铁/机场通达性：小区到火车站/机场打车时间'],
        first_home: ['先讲总价和月供：贷款方案让客户自己算出来', '参数→生活：89㎡=三口之家各有独立空间+未来可改', '风险透明：告知产权核查流程，首套最怕踩这步'],
        improve: ['先讲不可改条件：采光/空间/楼层——这些无法靠装修弥补', '参数→生活：128㎡=三代同堂各有独立空间', '四维坐标：商业/学校/医院/公园各多远'],
        family_kid: ['先讲学校划片：对应哪所小学/中学，近三年是否稳定', '四维坐标：学校/接送/托管/安全各维度的实际距离', '安全细节：门禁/监控/人车分流等'],
        elder: ['先讲医疗配套：三甲医院/社区卫生站距离', '电梯/无障碍设施：总高多少层，有无担架电梯', '一层/低楼层方案：噪音/采光/潮湿问题需如实说'],
        invest: ['先讲租金回报：同户型近期租赁成交价，月租金/总价=回报率%', '板块规划：政府文件中未来3年有利好', '转手流动性：近6个月板块成交量排名'],
        study: ['先讲学校划片稳定性：9年一贯制优于6+3', '接送距离：步行/电动车各需几分钟', '托管配套：周边有无晚托/培训班'],
        price: ['先讲总价优势：同板块、同户型历史最低成交价', '性价比拆解：单价=总价÷面积，得房率', '谈判空间：近期同小区议价记录']
      }
      if (!this.insightData || !this.insightData.types || !this.insightData.types.length) return ['根据洞察报告推荐适合的讲房重点']
      return base[this.insightData.types[0]] || ['根据洞察报告推荐适合的讲房重点']
    }
  },
  onLoad(options) {
    trackPageview('proposal_report')
    if (options && options.clientId) {
      this.clientId = options.clientId
      this.loadData()
    }
  },
  onShow() { if (this.clientId) this.loadData() },
  methods: {
    loadData() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return
      this.client = c
      this.report = this.userStore.getProposalReport(this.clientId)
    },
    goEntry() {
      uni.navigateTo({ url: '/package-mot/pages/proposal/index?clientId=' + this.clientId })
    },
    goShowing() {
      uni.navigateTo({ url: '/package-mot/pages/showing/index?clientId=' + this.clientId })
    }
  }
}
</script>

<style scoped>
.page { padding: 0 0 120px; background: #f7f4ef; min-height: 100vh; box-sizing: border-box; }
.top { background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%); padding: 26px 18px 20px; }
.brand { font-size: 12px; color: rgba(255,255,255,.7); letter-spacing: 1px; }
.h1 { font-size: 20px; font-weight: 800; color: #fff; margin-top: 4px; }
.sub { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 4px; }
.gate-hint { background: #fff4ec; border: 1px solid #f0d8c4; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #c46a3a; margin: 12px 14px 0; }
.gate-ok { background: #eef6ef; border: 1px solid #c4dbc5; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #3a8f5b; margin: 12px 14px 0; }
.no-data { padding: 80px 40px; text-align: center; }
.nd-ico { font-size: 44px; }
.nd-t { font-size: 16px; font-weight: 700; color: #2b2b2b; margin: 10px 0 4px; }
.nd-s { font-size: 13px; color: #8a837a; margin-bottom: 20px; }
.btn-primary { background: #3d5a3e; color: #fff; border-radius: 12px; padding: 12px; font-size: 15px; font-weight: 700; }

.insight-card { background: #fff; border-radius: 14px; margin: 12px 14px 0; padding: 14px; border: 1px solid #e7e0d4; }
.ic-h { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.ic-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ic-chip { flex: 1; min-width: 120px; background: #faf8f5; border-radius: 10px; padding: 10px; }
.ic-chip-label { font-size: 11px; color: #8a837a; }
.ic-chip-val { font-size: 13px; font-weight: 700; color: #2b2b2b; margin-top: 3px; }

.section-hd { display: flex; align-items: center; justify-content: space-between; margin: 16px 14px 8px; }
.section-hd view { font-size: 15px; font-weight: 700; color: #2b2b2b; }

.prop-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.prop-top { display: flex; align-items: flex-start; gap: 10px; }
.prop-rank { width: 24px; height: 24px; border-radius: 50%; background: #e0d8cc; color: #8a837a; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.prop-rank.top1 { background: #c46a3a; color: #fff; }
.prop-body { flex: 1; }
.prop-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.prop-addr { font-size: 12px; color: #8a837a; margin-top: 2px; }
.prop-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.prop-tag { font-size: 10px; background: #f0ece4; color: #7a6a55; border-radius: 5px; padding: 2px 6px; }
.prop-spec { display: flex; gap: 10px; margin-top: 10px; }
.spec { font-size: 13px; font-weight: 700; color: #c46a3a; background: #fff4ec; padding: 3px 8px; border-radius: 6px; }
.prop-reason { background: #faf8f5; border-radius: 10px; padding: 10px; margin-top: 10px; }
.pr-label { font-size: 11px; color: #8a837a; margin-bottom: 4px; }
.pr-text { font-size: 13px; color: #2b2b2b; line-height: 1.6; }

.tips-card { background: #fff; border-radius: 14px; margin: 0 14px 10px; padding: 14px; border: 1px solid #e7e0d4; }
.tip { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px dashed #f0ece4; }
.tip:last-child { border-bottom: none; }
.tip-ico { font-size: 13px; }
.tip-tx { font-size: 13px; color: #2b2b2b; line-height: 1.6; flex: 1; }

.next-card { background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%); border-radius: 14px; margin: 16px 14px 0; padding: 14px; }
.nc-h { font-size: 12px; color: rgba(255,255,255,.7); margin-bottom: 8px; }
.nc-line { display: flex; align-items: center; background: rgba(255,255,255,.12); border-radius: 10px; padding: 12px; }
.nc-ico { font-size: 22px; margin-right: 10px; }
.nc-body { flex: 1; }
.nc-t { font-size: 15px; font-weight: 700; color: #fff; }
.nc-s { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 2px; }
.nc-arrow { font-size: 20px; color: rgba(255,255,255,.8); }
</style>
