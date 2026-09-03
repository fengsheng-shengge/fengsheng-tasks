<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · 房源提案报告</view>
      <view class="h1">MOT② 房源提案录入</view>
      <view class="sub">绑定洞察报告 · 经纪人录入房源 · 生成提案方案</view>
    </view>

    <!-- 服务进度 -->
    <view class="progress-bar">
      <view v-for="(s, i) in steps" :key="i" :class="['pg-node', s.state]">
        <view class="pg-dot">{{ s.state === 'done' ? '✓' : i + 1 }}</view>
        <view class="pg-label">{{ s.label }}</view>
      </view>
    </view>

    <!-- 无洞察引导 -->
    <view class="no-insight" v-if="!insightData">
      <view class="ni-icon">🔒</view>
      <view class="ni-title">请先完成洞察报告</view>
      <view class="ni-sub">录入房源前需要先完成 MOT① 需求洞察报告</view>
      <button class="btn-ghost" @tap="goInsight">→ 去完成洞察报告</button>
    </view>

    <!-- 已有关联洞察 -->
    <template v-else>
      <!-- 客户锚定条 -->
      <view class="client-bar" v-if="client">
        <view class="cb-av">{{ client.surname }}</view>
        <view class="cb-body">
          <view class="cb-name">{{ client.name }}</view>
          <view class="cb-meta">{{ client.rel }} · {{ client.stage || '未知阶段' }}</view>
        </view>
        <view class="cb-tag">洞察已确认</view>
      </view>

      <!-- 洞察锚定卡 -->
      <view class="insight-card">
        <view class="ic-h">📋 关联洞察报告 <text class="ic-tag">v2 · {{ insightDate }}</text></view>
        <view class="ic-row">
          <view class="ic-chip">
            <view class="ic-chip-label">客户类型</view>
            <view class="ic-chip-val">{{ insightTypeLabels }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">核心动机</view>
            <view class="ic-chip-val">{{ insightCoreDim }}</view>
          </view>
          <view class="ic-chip">
            <view class="ic-chip-label">总价预算</view>
            <view class="ic-chip-val">{{ insightBudget }}</view>
          </view>
        </view>
        <view class="ic-dims" v-if="topDim">🔑 七维权重排序：<text style="font-weight:700">{{ topDim }}</text></view>
        <view class="ic-ins">
          <text style="font-weight:700">经纪人讲房提示：</text>
          {{ brokerTip }}
        </view>
      </view>

      <!-- 房源录入区 -->
      <view class="section-hd">
        <view>🏠 录入备选房源 <text class="sh-count">已录入 {{ properties.length }} 套</text></view>
        <view class="sh-add" @tap="addProperty">+ 添加房源</view>
      </view>

      <!-- 房源列表 -->
      <view v-if="properties.length === 0" class="empty-props">
        <view>📭 还没有录入房源</view>
        <view style="font-size:12px;color:#8a837a;margin-top:4px">点击上方「+ 添加房源」开始</view>
      </view>

      <view v-for="(p, idx) in properties" :key="p._id" class="prop-card">
        <view class="prop-top">
          <view :class="['prop-rank', { top1: idx === 0 }]">{{ idx + 1 }}</view>
          <view class="prop-body">
            <view class="prop-name">{{ p.name || '房源' + (idx + 1) }}</view>
            <view class="prop-addr">{{ p.address || '地址待填写' }}</view>
            <view class="prop-meta" v-if="p.tags && p.tags.length">
              <text class="prop-tag" v-for="t in p.tags" :key="t">{{ t }}</text>
            </view>
          </view>
          <view class="prop-score" v-if="p.score">{{ p.score }}<text>分</text></view>
        </view>

        <!-- 房源字段录入 -->
        <view class="prop-fields">
          <view class="field-row-2">
            <view class="field-row">
              <view class="field-label">总价（万元）</view>
              <input class="field-input" v-model="p.price" type="digit" placeholder="如 920" />
            </view>
            <view class="field-row">
              <view class="field-label">面积（㎡）</view>
              <input class="field-input" v-model="p.area" type="digit" placeholder="如 128" />
            </view>
          </view>
          <view class="field-row-2">
            <view class="field-row">
              <view class="field-label">户型</view>
              <input class="field-input" v-model="p.layout" placeholder="3室2厅2卫" />
            </view>
            <view class="field-row">
              <view class="field-label">楼层</view>
              <input class="field-input" v-model="p.floor" placeholder="中楼层/共26层" />
            </view>
          </view>
          <view class="field-row">
            <view class="field-label">朝向</view>
            <input class="field-input" v-model="p.orientation" placeholder="南向·客厅主卧全南" />
          </view>
        </view>

        <!-- 匹配理由 -->
        <view class="prop-fields" style="padding-top:0">
          <view class="field-label">匹配理由（必填 · 五秘诀②依据三件套）</view>
          <view class="reason-tag-row">
            <view v-for="rt in reasonTypes" :key="rt.key"
              :class="['reason-tag', { sel: p.reasonType === rt.key }]"
              @tap="p.reasonType = p.reasonType === rt.key ? '' : rt.key">{{ rt.label }}</view>
          </view>
          <textarea class="reason-input" v-model="p.reason" :placeholder="reasonPlaceholder" maxlength="200"></textarea>
          <view class="reason-count">{{ (p.reason || '').length }}/200</view>
        </view>

        <!-- 五秘诀话术推荐 -->
        <view class="secret-block" v-if="insightData && insightData.types && insightData.types.length">
          <view class="sb-label">💡 五秘诀话术提示 <text class="sb-client">{{ insightTypeLabels }}</text></view>
          <view class="sb-tips">
            <view class="sb-tip" v-for="(tip, ti) in filteredTips" :key="ti" :data-n="'1️⃣2️⃣3️⃣4️⃣5️⃣'.charAt(ti * 3) + '️⃣'">{{ tip }}</view>
          </view>
        </view>

        <!-- 删除按钮 -->
        <view class="prop-del" @tap="removeProperty(idx)">🗑 删除此房源</view>
      </view>

      <!-- 底部占位 -->
      <view style="height:100px"></view>

      <!-- 已生成报告入口 -->
      <view v-if="hasReport" class="report-entry" @tap="goReport">
        <view class="re-l"><view class="re-t">📄 已生成提案报告</view><view class="re-s" v-if="reportNo">{{ reportNo }}</view></view>
        <text class="re-arrow">查看 ›</text>
      </view>

      <!-- 底部按钮 -->
      <view class="bottom-bar">
        <view class="btn-secondary" @tap="saveDraft">存草稿</view>
        <view :class="['btn-primary', { disabled: !canSubmit }]" @tap="submitProposal">生成提案报告</view>
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
      insightData: null,
      properties: [],
      steps: [
        { label: '建档', state: 'done' },
        { label: '洞察', state: 'done' },
        { label: '提案', state: 'cur' },
        { label: '带看', state: 'locked' },
        { label: '复盘', state: 'locked' }
      ],
      reasonTypes: [
        { key: 'qty', label: '📊 数量依据' },
        { key: 'cmp', label: '⚖️ 比较说明' },
        { key: 'chk', label: '✅ 核验路径' }
      ],
      reasonPlaceholder: '说明该房源凭什么胜出——数量/比较/核验依据三选一',
      // 五秘诀话术（按客户类型映射）
      secretTips: {
        commuter: ['先讲通勤：地铁实测步行时间 × 分钟，高德/百度地图可查', '四维坐标：小区 → 最近地铁口步行分钟数，接驳方式（扶梯/直梯/地面）', '高铁/机场通达性：小区到火车站/机场打车时间'],
        first_home: ['先讲总价和月供：贷款方案（公积金/商贷/组合贷）让客户自己算出来', '参数→生活：89㎡=三口之家各有独立空间+未来可改', '风险透明：告知产权核查流程，首套最怕踩这步'],
        improve: ['先讲不可改条件：采光/空间/楼层——这些无法靠装修弥补', '参数→生活：128㎡=三代同堂各有独立空间，客厅面宽4.2米', '四维坐标：商业/学校/医院/公园各多远'],
        family_kid: ['先讲学校划片：对应哪所小学/中学，近三年是否稳定', '四维坐标：学校/接送/托管/安全各维度的实际距离', '安全细节：门禁/监控/人车分流等'],
        elder: ['先讲医疗配套：三甲医院/社区卫生站距离', '电梯/无障碍设施：总高多少层，有无担架电梯', '一层/低楼层方案：噪音/采光/潮湿问题需如实说'],
        invest: ['先讲租金回报：同户型近期租赁成交价，月租金/总价=回报率%', '板块规划：政府文件中未来3年有利好', '转手流动性：近6个月板块成交量排名'],
        study: ['先讲学校划片稳定性：9年一贯制优于6+3', '接送距离：步行/电动车各需几分钟', '托管配套：周边有无晚托/培训班'],
        price: ['先讲总价优势：同板块、同户型历史最低成交价', '性价比拆解：单价=总价÷面积，得房率=使用面积÷建筑面积', '谈判空间：近期同小区议价记录']
      },
      defaultTip: '先讲核心卖点：依据数量/比较/核验路径三件套之一说清为什么推荐这套'
    }
  },
  computed: {
    userStore() { return useUserStore() },
    insightDate() {
      if (!this.insightData) return ''
      const t = this.insightData.createdAt || this.insightData.savedAt || Date.now()
      const d = new Date(t)
      const p = n => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    },
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
      return (this.insightData.dims[0] ? nameMap[this.insightData.dims[0]] || this.insightData.dims[0] : '未标')
    },
    topDim() {
      if (!this.insightData || !this.insightData.scores) return ''
      const scores = this.insightData.scores
      const nameMap = { safety: '物质安全', health: '健康', conv: '便利', econ: '经济', comfort: '舒适', beauty: '美观', free: '自在' }
      const sorted = Object.entries(scores).sort((a, b) => (b[1] || 0) - (a[1] || 0))
      if (!sorted.length) return ''
      return nameMap[sorted[0][0]] || sorted[0][0] + '（' + sorted[0][1] + '分）'
    },
    insightBudget() {
      if (!this.client) return '未填'
      return this.client.asset || this.client.note || '未填'
    },
    brokerTip() {
      if (!this.insightData || !this.insightData.types || !this.insightData.types.length) {
        return '请完成洞察报告后，房源提案将自动关联讲房话术。'
      }
      const typeMap = {
        first_home: '首套刚需，重点讲总价+月供+产权核查，不催单',
        improve: '改善置换，重点先讲不可改条件（采光/空间/楼层），不先讲装修',
        commuter: '通勤敏感，重点实测地铁/公交通行时间，让客户感受而非想象',
        family_kid: '有娃家庭，重点讲学校划片+接送距离+安全配套',
        elder: '养老宜居，重点讲医疗配套+电梯+低楼层方案',
        invest: '投资型，重点讲租金回报+板块规划+转手流动性',
        study: '陪读家庭，重点讲学校划片稳定性+接送时间+托管配套',
        price: '价格敏感，重点讲性价比拆解+历史最低成交价+议价空间'
      }
      const t = this.insightData.types[0]
      return typeMap[t] || '根据洞察报告推荐适合的讲房重点'
    },
    filteredTips() {
      if (!this.insightData || !this.insightData.types || !this.insightData.types.length) {
        return [this.defaultTip]
      }
      const t = this.insightData.types[0]
      const tips = this.secretTips[t]
      return tips && tips.length ? tips : [this.defaultTip]
    },
    canSubmit() {
      return this.properties.length > 0 && this.properties.some(p => p.reason && p.reason.trim().length >= 10)
    },
    hasReport() {
      const r = this.userStore.getProposalReport(this.clientId)
      return !!r
    },
    reportNo() {
      const r = this.userStore.getProposalReport(this.clientId)
      return r ? r.reportNo : ''
    }
  },
  onLoad(options) {
    trackPageview('proposal')
    if (options && options.clientId) {
      this.clientId = options.clientId
      this.loadData()
    }
  },
  methods: {
    loadData() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return
      this.client = c
      this.insightData = (c.lifecycle && c.lifecycle.insightData) ? c.lifecycle.insightData : null
      // 加载已有提案草稿
      const report = this.userStore.getInsightReport(this.clientId)
      if (report && report.proposalData && report.proposalData.properties) {
        this.properties = report.proposalData.properties
      }
    },
    addProperty() {
      this.properties.push({
        _id: 'p_' + Date.now(),
        name: '',
        address: '',
        tags: [],
        price: '',
        area: '',
        layout: '',
        floor: '',
        orientation: '',
        reasonType: '',
        reason: '',
        score: ''
      })
    },
    removeProperty(idx) {
      uni.showModal({
        title: '删除房源',
        content: '确认删除第 ' + (idx + 1) + ' 套房源？',
        success: (res) => {
          if (res.confirm) this.properties.splice(idx, 1)
        }
      })
    },
    saveDraft() {
      const report = this.userStore.getInsightReport(this.clientId)
      if (report) {
        this.userStore.saveInsightData(this.clientId, {
          ...this.insightData,
          proposalData: { properties: this.properties }
        })
      }
      uni.showToast({ title: '草稿已保存', icon: 'none' })
    },
    submitProposal() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请先录入至少一套完整房源', icon: 'none' })
        return
      }
      uni.showModal({
        title: '生成提案报告',
        content: '确认后进入 MOT② 房源提案报告，房源将关联讲房话术。',
        confirmText: '确认生成',
        success: (res) => {
          if (res.confirm) {
            // 写提案报告数据（含房源 + 讲房话术类型）
            const proposalData = {
              properties: this.properties,
              types: this.insightData ? (this.insightData.types || []) : [],
              createdAt: Date.now()
            }
            this.userStore.completeProposal(this.clientId, proposalData)
            uni.showToast({ title: '提案报告已生成', icon: 'success' })
            setTimeout(() => {
              uni.redirectTo({ url: '/package-mot/pages/proposal/report?clientId=' + this.clientId })
            }, 600)
          }
        }
      })
    },
    goInsight() {
      if (this.clientId) {
        uni.navigateTo({ url: '/package-mot/pages/insight/index?clientId=' + this.clientId })
      } else {
        uni.showToast({ title: '请先选择客户', icon: 'none' })
      }
    },
    goReport() {
      if (this.clientId) {
        uni.navigateTo({ url: '/package-mot/pages/proposal/report?clientId=' + this.clientId })
      }
    }
  }
}
</script>

<style scoped>
.page { padding: 0 0 120px; background: #f7f4ef; min-height: 100vh; }

.top { padding: 20px 20px 0; }
.brand { font-size: 11px; color: #3d5a3e; font-weight: 700; letter-spacing: 1px; }
.h1 { font-size: 22px; font-weight: 800; color: #1f2a24; margin: 4px 0 2px; }
.sub { font-size: 12px; color: #8a837a; margin-bottom: 14px; }

/* 进度条 */
.progress-bar { display: flex; align-items: center; margin: 0 20px 16px; }
.pg-node { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
.pg-node::before { content: ''; position: absolute; top: 11px; left: 50%; right: -50%; height: 2px; background: #ede5d6; }
.pg-node:last-child::before { display: none; }
.pg-dot { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2px solid #ede5d6; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #8a837a; z-index: 1; }
.pg-node.done .pg-dot { background: #3d5a3e; border-color: #3d5a3e; color: #fff; }
.pg-node.cur .pg-dot { background: #c46a3a; border-color: #c46a3a; color: #fff; }
.pg-node.locked .pg-dot { background: #f0ece2; border-color: #ede5d6; color: #ccc; }
.pg-label { font-size: 10px; color: #8a837a; text-align: center; white-space: nowrap; }
.pg-node.done .pg-label { color: #3d5a3e; }
.pg-node.cur .pg-label { color: #c46a3a; font-weight: 700; }
.pg-node.locked .pg-label { color: #ccc; }

/* 无洞察 */
.no-insight { margin: 40px 20px; text-align: center; }
.ni-icon { font-size: 48px; margin-bottom: 12px; }
.ni-title { font-size: 16px; font-weight: 700; color: #1f2a24; margin-bottom: 6px; }
.ni-sub { font-size: 13px; color: #8a837a; margin-bottom: 20px; line-height: 1.5; }
.btn-ghost { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; }

/* 客户锚定条 */
.client-bar { margin: 0 20px 16px; padding: 12px 14px; background: #eef3ec; border: 1.5px solid #c6d6c6; border-radius: 12px; display: flex; align-items: center; gap: 10px; }
.cb-av { width: 36px; height: 36px; border-radius: 50%; background: #c46a3a; color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cb-body { flex: 1; }
.cb-name { font-size: 14px; font-weight: 700; color: #1f2a24; }
.cb-meta { font-size: 11px; color: #8a837a; margin-top: 2px; }
.cb-tag { font-size: 10px; font-weight: 700; background: #3d5a3e; color: #fff; padding: 3px 8px; border-radius: 999px; }

/* 洞察锚定卡 */
.insight-card { margin: 0 20px 14px; padding: 14px; background: #fff; border-radius: 14px; border: 2px solid #ede5d6; }
.ic-h { font-size: 13px; font-weight: 800; color: #1f2a24; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.ic-tag { font-size: 10px; background: #eef3ec; color: #3d5a3e; padding: 2px 8px; border-radius: 999px; font-weight: 700; }
.ic-row { display: flex; gap: 8px; margin-bottom: 8px; }
.ic-chip { flex: 1; background: #f7f4ef; border-radius: 8px; padding: 8px 10px; }
.ic-chip-label { font-size: 10px; color: #8a837a; }
.ic-chip-val { font-size: 13px; font-weight: 700; color: #1f2a24; margin-top: 2px; }
.ic-dims { font-size: 11px; color: #8a837a; margin-top: 8px; line-height: 1.6; }
.ic-ins { font-size: 11px; color: #8a837a; background: #fff8e8; border-radius: 8px; padding: 8px 10px; margin-top: 8px; line-height: 1.5; }

/* 房源录入区标题 */
.section-hd { padding: 0 20px; font-size: 14px; font-weight: 800; color: #1f2a24; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.sh-count { font-size: 12px; font-weight: 600; color: #8a837a; }
.sh-add { font-size: 12px; font-weight: 700; color: #3d5a3e; background: #eef3ec; padding: 4px 12px; border-radius: 999px; }

.empty-props { margin: 0 20px 14px; background: #fff; border: 1.5px dashed #ede5d6; border-radius: 14px; padding: 30px; text-align: center; font-size: 14px; color: #8a837a; }
.report-entry { margin: 0 20px 14px; background: #eef6ef; border: 1px solid #c4dbc5; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
.re-l { flex: 1; }
.re-t { font-size: 14px; font-weight: 700; color: #3a8f5b; }
.re-s { font-size: 11px; color: #8a837a; margin-top: 2px; }
.re-arrow { font-size: 13px; color: #3a8f5b; font-weight: 700; }

/* 房源卡片 */
.prop-card { margin: 0 20px 14px; background: #fff; border-radius: 14px; border: 2px solid #ede5d6; overflow: hidden; }
.prop-top { display: flex; align-items: center; gap: 12px; padding: 14px 14px 10px; }
.prop-rank { width: 28px; height: 28px; border-radius: 50%; background: #9c7c3a; color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.prop-rank.top1 { background: #c46a3a; }
.prop-body { flex: 1; }
.prop-name { font-size: 15px; font-weight: 800; color: #1f2a24; }
.prop-addr { font-size: 12px; color: #8a837a; margin-top: 2px; }
.prop-meta { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.prop-tag { font-size: 10px; background: #f7f4ef; color: #5a524a; padding: 2px 7px; border-radius: 999px; border: 1px solid #ede5d6; }
.prop-score { font-size: 24px; font-weight: 800; color: #3d5a3e; flex-shrink: 0; }
.prop-score span { font-size: 12px; color: #8a837a; font-weight: 400; }

/* 房源字段 */
.prop-fields { padding: 0 14px 14px; }
.field-row { margin-bottom: 10px; }
.field-label { font-size: 11px; font-weight: 700; color: #8a837a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
.field-input { width: 100%; min-height: 44px; background: #f7f4ef; border: 1.5px solid #ede5d6; border-radius: 10px; padding: 10px 12px; font-size: 14px; color: #1f2a24; }
.field-input:focus { border-color: #3d5a3e; }
.field-hint { font-size: 10px; color: #8a837a; margin-top: 3px; }
.field-row-2 { display: flex; gap: 8px; }
.field-row-2 .field-row { flex: 1; }

/* 匹配理由 */
.reason-tag-row { display: flex; gap: 6px; margin-bottom: 6px; }
.reason-tag { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1.5px solid #ede5d6; color: #8a837a; cursor: pointer; transition: all .15s; }
.reason-tag.sel { background: #3d5a3e; border-color: #3d5a3e; color: #fff; }
.reason-input { width: 100%; background: #f7f4ef; border: 1.5px solid #ede5d6; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #1f2a24; min-height: 60px; resize: none; box-sizing: border-box; }
.reason-count { font-size: 10px; color: #8a837a; text-align: right; margin-top: 3px; }

/* 五秘诀话术 */
.secret-block { margin: 0 14px 14px; background: linear-gradient(135deg, #f6faf6, #f0f7f0); border: 1.5px solid #c6d6c6; border-radius: 10px; padding: 10px 12px; }
.sb-label { font-size: 11px; font-weight: 800; color: #3d5a3e; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
.sb-client { font-size: 10px; background: #c46a3a; color: #fff; padding: 2px 6px; border-radius: 999px; font-weight: 700; }
.sb-tips { display: flex; flex-direction: column; gap: 4px; }
.sb-tip { font-size: 11px; color: #5a524a; display: flex; align-items: flex-start; gap: 6px; line-height: 1.5; }

/* 删除按钮 */
.prop-del { padding: 10px 14px; font-size: 12px; color: #c0392b; text-align: center; border-top: 1px dashed #ede5d6; }

/* 底部按钮 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ede5d6; padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
.btn-primary { flex: 2; background: #3d5a3e; color: #fff; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 800; text-align: center; }
.btn-primary.disabled { background: #ccc; color: #fff; }
.btn-secondary { flex: 1; background: #f7f4ef; color: #5a524a; border: 1.5px solid #ede5d6; border-radius: 999px; padding: 14px; font-size: 14px; font-weight: 700; text-align: center; }
</style>
