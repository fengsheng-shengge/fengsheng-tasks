<template>
  <view class="page">
    <!-- 顶部：关联客户 + 报告编号 -->
    <view class="report-header" v-if="client">
      <view class="rh-client">
        <view class="rh-avatar">{{ client.surname }}</view>
        <view>
          <view class="rh-name">{{ client.name }}</view>
          <view class="rh-meta">{{ client.rel }} · {{ client.stage || '未填阶段' }}</view>
        </view>
      </view>
      <view class="rh-reportno" v-if="reportNo">{{ reportNo }}</view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view v-for="t in tabs" :key="t.key" :class="['tab-item', { on: activeTab === t.key }]" @tap="activeTab = t.key">{{ t.label }}</view>
    </view>

    <!-- ========== Tab1：洞察摘要 ========== -->
    <view v-show="activeTab === 'summary'">
      <!-- 关联洞察确认状态 -->
      <view class="gate-hint" v-if="!confirmed">
        <text>⚠️ 洞察报告草稿，确认后解锁房源提案</text>
      </view>
      <view class="gate-ok" v-else>
        <text>✓ 洞察已确认，房源提案已解锁</text>
      </view>

      <!-- ★ V3.5 深层洞察摘要（经纪人内部使用，不对客户透出） -->
      <view class="deep-summary-card" v-if="deepInsight">
        <view class="dsc-title">🔍 深层洞察摘要</view>
        <view class="dsc-note">经纪人内部使用，不对客户透出</view>
        <view class="dsc-row" v-if="deepInsight.confirmText">
          <view class="dsc-label">需求确认原文</view>
          <view class="dsc-text">{{ deepInsight.confirmText }}</view>
        </view>
        <view class="dsc-row" v-if="triggerEventLabels.length">
          <view class="dsc-label">触发动因</view>
          <view class="dsc-tags">
            <text v-for="l in triggerEventLabels" :key="l" class="dsc-tag dsc-trigger">{{ l }}</text>
          </view>
          <view class="dsc-remark" v-if="deepInsight.triggerRemark">客户原话：{{ deepInsight.triggerRemark }}</view>
        </view>
        <view class="dsc-row" v-if="deepInsight.customerConflict">
          <view class="dsc-label">内心矛盾</view>
          <view class="dsc-conflict">{{ deepInsight.customerConflict }}</view>
        </view>
        <view class="dsc-two-col" v-if="bottomLineLabels.length || flexibleLabels.length">
          <view v-if="bottomLineLabels.length">
            <view class="dsc-label" style="color:#c0392b">不可妥协底线</view>
            <view class="dsc-tags">
              <text v-for="l in bottomLineLabels" :key="l" class="dsc-tag dsc-bottom">{{ l }}</text>
            </view>
          </view>
          <view v-if="flexibleLabels.length">
            <view class="dsc-label" style="color:#27ae60">可妥协让步</view>
            <view class="dsc-tags">
              <text v-for="l in flexibleLabels" :key="l" class="dsc-tag dsc-flex">{{ l }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 七维雷达图 -->
      <view class="card">
        <view class="card-title">七维分析</view>
        <view class="radar-wrap">
          <canvas canvas-id="radarCanvas" id="radarCanvas" class="radar-canvas"></canvas>
          <view class="radar-labels">
            <view v-for="d in radarDims" :key="d.key" class="radar-label">{{ d.name }}<text class="dim-score">{{ d.score }}</text></view>
          </view>
        </view>
        <view class="dim-edit-tip" v-if="assessSource">★ 七维分值来自「{{ assessSource }}」（综合 {{ assessTotal }} 分），可在测评页重新测评后覆盖</view>
        <view class="dim-edit-tip" v-else>经纪人可调整各维度分值（0-100分）</view>
      </view>

      <!-- 八类客户标签 -->
      <view class="card">
        <view class="card-title">客户类型（可多选）</view>
        <view class="type-tags">
          <view v-for="t in customerTypes" :key="t.key"
            :class="['type-tag', { on: selectedTypes.includes(t.key) }]"
            @tap="toggleType(t.key)">{{ t.label }}</view>
        </view>
        <view class="type-selected" v-if="selectedTypes.length">
          已选：{{ selectedTypes.map(k => customerTypes.find(t => t.key === k).label).join(' / ') }}
        </view>
      </view>

      <!-- LTRUST 矩阵 -->
      <view class="card">
        <view class="card-title">LTRUST 优先矩阵</view>
        <!-- ★ V2.6 优先维度高亮 -->
        <view class="ltrust-prio-bar" v-if="ltrustPrio">
          <text class="ltrust-prio-icon">{{ ltrustPrioIcon }}</text>
          <text>当前优先：{{ ltrustPrioLabel }} · 讲房话术将以此为核心</text>
        </view>
        <view class="ltrust-grid">
          <view v-for="item in ltrustItems" :key="item.type" :class="['lt-cell', 'lt-' + item.priority, { 'lt-top': isTopPrio(item.type) }]">
            <view class="lt-type">{{ item.type }} {{ item.label }}</view>
            <view class="lt-desc">{{ item.description }}</view>
            <view class="lt-priority">{{ item.priority === 'high' ? '● 高' : item.priority === 'medium' ? '○ 中' : '△ 低' }}</view>
          </view>
        </view>
      </view>

      <!-- 确认洞察按钮 -->
      <button class="btn-confirm" v-if="!confirmed" @tap="confirmInsight">✓ 确认洞察报告</button>
      <view class="confirmed-banner" v-else>✓ 此洞察已于 {{ confirmedAt }} 确认</view>
    </view>

    <!-- ========== Tab2：认知卡 ========== -->
    <view v-show="activeTab === 'cognition'">
      <view v-if="cognition.log && cognition.log.length">
        <view class="cog-count">共 {{ cognition.log.length }} 次见面参谋记录</view>
        <view class="card" v-for="(log, i) in cognition.log" :key="i">
          <view class="cog-date">{{ formatDate(log.at) }}</view>
          <view class="cog-row"><text class="cog-label">阶段</text><text class="cog-val">{{ log.axisLabel }}</text></view>
          <view class="cog-row" v-if="log.dims && log.dims.length"><text class="cog-label">关注</text>
            <text class="cog-val">{{ log.dims.join(' · ') }}</text>
          </view>
          <view class="cog-row" v-if="log.sayTitles && log.sayTitles.length"><text class="cog-label">说</text>
            <text class="cog-val">{{ log.sayTitles.slice(0, 3).join(' / ') }}</text>
          </view>
          <view class="cog-row" v-if="log.followThemes && log.followThemes.length"><text class="cog-label">跟进</text>
            <text class="cog-val">{{ log.followThemes.slice(0, 3).join(' / ') }}</text>
          </view>
        </view>
      </view>
      <view class="empty-cog" v-else>
        <view class="ec-icon">🧠</view>
        <view class="ec-t">暂无认知记录</view>
        <view class="ec-s">从「见面参谋」生成策展包后，认知数据自动沉淀在这里</view>
      </view>
    </view>

    <!-- ========== Tab3：行动计划 ========== -->
    <view v-show="activeTab === 'action'">
      <view class="card-title" style="margin-bottom:12px">LTRUST 优先事项</view>
      <view v-if="actionItems.length">
        <view class="action-item" v-for="(item, i) in actionItems" :key="i" @tap="toggleAction(i)">
          <text class="ai-check">{{ item.done ? '✓' : '○' }}</text>
          <view class="ai-body">
            <view class="ai-theme">{{ item.type }} {{ item.label }}</view>
            <view class="ai-desc">{{ item.description }}</view>
          </view>
          <text class="ai-priority" :class="'prio-' + item.priority">{{ item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低' }}</text>
        </view>
      </view>
      <view class="empty-action" v-else>
        <view>确认洞察报告后，行动计划将自动生成</view>
      </view>

      <view class="next-step" v-if="confirmed">
        <button class="btn-next" @tap="goToProposal">→ 生成房源提案报告</button>
      </view>
      <view class="next-step locked" v-else>
        <view class="locked-tip">请先确认洞察报告以解锁房源提案</view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

// 八类客户类型
const CUSTOMER_TYPES = [
  { key: 'commute', label: '通勤敏感型', anxiety: '上下班时间', priority: '真实通勤体感' },
  { key: 'family', label: '有娃家庭型', anxiety: '孩子成长空间', priority: '户型可变/学校/安全' },
  { key: 'first', label: '首次置业型', anxiety: '总价门槛', priority: '总价+月供+配套' },
  { key: 'improve', label: '改善置换型', anxiety: '住得更好', priority: '采光/空间/不可改条件' },
  { key: 'elderly', label: '养老宜居型', anxiety: '老了怎么办', priority: '医疗/电梯/配套/一层' },
  { key: 'invest', label: '投资增值型', anxiety: '钱生钱', priority: '租金回报/板块规划/转手' },
  { key: 'study', label: '陪读求学型', anxiety: '孩子上学', priority: '学校划片/接送/托管' },
  { key: 'price', label: '纯价格敏感型', anxiety: '钱要花得值', priority: '性价比/议价/同类对比' },
]

// 七维（与 curate-prep engine.js DIMENSIONS 对齐）
const DIMENSIONS = [
  { key: 'safety',  name: '物质安全', color: '#c0392b' },
  { key: 'health',  name: '健康',     color: '#27ae60' },
  { key: 'conv',   name: '便利',     color: '#2f6fb0' },
  { key: 'econ',   name: '经济',     color: '#e67e22' },
  { key: 'comfort',name: '舒适',     color: '#8e44ad' },
  { key: 'beauty', name: '美观',     color: '#c46a3a' },
  { key: 'free',   name: '自在',     color: '#7f8c8d' },
]

// LTRUST 六项
const LTRUST_ITEMS = [
  { type: 'L', label: '倾听', description: '客户明确表达的需求与关注点', priority: 'high' },
  { type: 'T', label: '信任', description: '需要优先建立信任的关键节点', priority: 'high' },
  { type: 'R', label: '风险', description: '需要主动防范的潜在风险', priority: 'medium' },
  { type: 'U', label: '紧迫', description: '时间敏感需要快速响应的行动', priority: 'medium' },
  { type: 'S', label: '信号', description: '已出现的关键决策信号', priority: 'medium' },
  { type: 'Trust', label: '缺口', description: '当前信任薄弱需要补足的环节', priority: 'low' },
]

export default {
  data() {
    return {
      clientId: null,
      client: null,
      reportNo: '',
      activeTab: 'summary',
      tabs: [
        { key: 'summary', label: '洞察摘要' },
        { key: 'cognition', label: '认知卡' },
        { key: 'action', label: '行动计划' },
      ],
      // 八类客户
      customerTypes: CUSTOMER_TYPES,
      selectedTypes: [],
      // 七维
      dimensions: DIMENSIONS,
      dimensionScores: {},
      // ★ V3.7.2 测评来源标注
      assessSource: '',
      assessTotal: 0,
      // ★ V3.8 类型/LTRUST 自动推荐标记（用户手动改过后不再覆盖）
      typesTouched: false,
      // LTRUST
      ltrustItems: LTRUST_ITEMS,
      ltrustMatrix: null,
      // 认知数据
      cognition: { log: [] },
      // 行动计划勾选
      actionDone: [],
      confirmed: false,
      confirmedAt: '',
    }
  },
  computed: {
    userStore() { return useUserStore() },
    radarDims() {
      return this.dimensions.map(d => ({
        ...d,
        score: this.dimensionScores[d.key] || 0
      }))
    },
    actionItems() {
      if (!this.ltrustMatrix) return this.ltrustItems
      return (this.ltrustMatrix.items || LTRUST_ITEMS).map((item, i) => ({
        ...item,
        done: !!this.actionDone[i]
      }))
    },
    // ★ V2.6 LTRUST 优先维度
    ltrustPrio() {
      return this.ltrustMatrix && this.ltrustMatrix.ltrustPrio ? this.ltrustMatrix.ltrustPrio : ''
    },
    ltrustPrioLabel() {
      const map = { safety: '物质安全', transit: '便利通勤', economy: '经济评估', beauty: '美观升级' }
      return map[this.ltrustPrio] || ''
    },
    ltrustPrioIcon() {
      const map = { safety: '🔴', transit: '🟡', economy: '🟢', beauty: '🔵' }
      return map[this.ltrustPrio] || '📋'
    },
    // V3.5 深层洞察
    deepInsight() {
      const id = this.clientId
      if (!id) return null
      const c = this.userStore.getClient(id)
      if (!c || !c.lifecycle || !c.lifecycle.insightData) return null
      return c.lifecycle.insightData
    },
    triggerEventLabels() {
      if (!this.deepInsight) return []
      const map = { family_birth:'家庭添丁', family_marriage:'新婚', family_elder:'老人同住',
        family_school:'子女入学', external_expiry:'原租约到期', external_transfer:'工作调动',
        external_commute:'通勤无法忍受', external_defect:'现有房屋缺陷',
        time_school:'入学落户节点', time_limit:'置换窗口期', time_other:'其他时间压力' }
      return (this.deepInsight.triggerEvents || []).map(k => map[k] || k).filter(Boolean)
    },
    bottomLineLabels() {
      if (!this.deepInsight) return []
      const map = { school:'学区资质', metro:'地铁距离', budget:'总价上限', floor:'楼层要求',
        orientation:'朝向', elevator:'必须有电梯', noise:'噪音控制', title:'产权清晰' }
      return (this.deepInsight.hardBottomLines || []).map(k => map[k] || k).filter(Boolean)
    },
    flexibleLabels() {
      if (!this.deepInsight) return []
      const map = { area:'面积', decoration:'装修标准', ratio:'梯户比', age:'楼龄',
        quality:'小区品质', orientation:'朝向', parking:'车位' }
      return (this.deepInsight.flexibleItems || []).map(k => map[k] || k).filter(Boolean)
    },
  },
  onLoad(options) {
    trackPageview('insight')
    if (options && options.clientId) {
      this.clientId = options.clientId
      this.loadClientData()
    }
  },
  onReady() {
    // 等 canvas 就绪后绘制雷达图
    setTimeout(() => this.drawRadar(), 300)
  },
  onShow() {
    // 每次进入刷新数据（可能从 curate-prep 回来数据有更新）
    if (this.clientId) this.loadClientData()
  },
  methods: {
    loadClientData() {
      const c = this.userStore.getClient(this.clientId)
      if (!c) return
      this.client = c
      this.cognition = c.cognition || { log: [] }

      // ★ V2.6：从 lifecycle.insightData 读取策展录入的七维分值+八类标签
      const insightData = (c.lifecycle && c.lifecycle.insightData) ? c.lifecycle.insightData : null
      if (insightData) {
        // 分数（key 对齐后直接用）
        this.dimensionScores = insightData.scores || {}
        // ★ V3.7.2 来源标注：分值来自品质测评
        this.assessSource = insightData.assessSource || ''
        this.assessTotal = insightData.assessTotal || 0
        // 八类标签（key 归一化：策展页 commuter/first_home → 洞察页 commute/first）
        const rawTypes = insightData.types || []
        this.selectedTypes = rawTypes.map(k => this._normalizeTypeKey(k)).filter(Boolean)
        // LTRUST 优先维度
        this.ltrustMatrix = insightData.ltrust ? { ltrustPrio: this._normalizeLtrustKey(insightData.ltrust) } : null
        // 轴标签（雷达图标题用）
        if (insightData.axisLabel) {
          this.cognition = this.cognition || {}
          this.cognition.axisLabel = insightData.axisLabel
        }
        // ★ V3.8 测评来源：自动推荐客户类型 + LTRUST（若用户未手动改过）
        const scores = this.dimensionScores || {}
        const hasScores = Object.keys(scores).length > 0
        const recommend = this._recommendFromScores(scores)
        if (!this.typesTouched && !this.selectedTypes.length && hasScores) {
          this.selectedTypes = recommend.types
        }
        if (!this.typesTouched && !this.ltrustMatrix && recommend.ltrust) {
          this.ltrustMatrix = { ltrustPrio: recommend.ltrust }
        }
      } else {
        // 降级：读旧 cognition.dimensionScores（向后兼容）
        this.dimensionScores = c.cognition && c.cognition.dimensionScores ? c.cognition.dimensionScores : {}
        this.selectedTypes = (c.cognition && c.cognition.customerType) ? c.cognition.customerType : []
        this.ltrustMatrix = (c.cognition && c.ltrustMatrix) ? c.ltrustMatrix : null
        // 从策展日志中还原维度分值
        if (Object.keys(this.dimensionScores).length === 0 && this.cognition.log && this.cognition.log.length) {
          const lastLog = this.cognition.log[0]
          if (lastLog.dims) {
            lastLog.dims.forEach(d => {
              const dim = DIMENSIONS.find(dm => dm.name === d)
              if (dim) this.dimensionScores[dim.key] = 70
            })
          }
        }
      }

      // 读确认态
      const report = this.userStore.getInsightReport(this.clientId)
      this.confirmed = !!(report && report.confirmed)
      this.reportNo = report ? report.reportNo : ''
      if (report && report.createdAt) {
        this.confirmedAt = this.formatDate(report.createdAt)
      }
    },
    toggleType(key) {
      const i = this.selectedTypes.indexOf(key)
      if (i >= 0) this.selectedTypes.splice(i, 1)
      else this.selectedTypes.push(key)
      this.typesTouched = true
      this.saveInsightData()
    },
    // ★ V2.6 LTRUST 优先判断
    isTopPrio(type) {
      const map = { safety: 'L', transit: 'T', economy: 'R', beauty: 'U' }
      return map[this.ltrustPrio] === type
    },
    // ★ V3.8 类型 key 归一化：策展页八分法 → 洞察页八类
    _normalizeTypeKey(k) {
      const map = {
        commuter: 'commute', first_home: 'first', family_kid: 'family',
        improve: 'improve', elder: 'elderly', invest: 'invest',
        study: 'study', price: 'price'
      }
      if (this.customerTypes.find(t => t.key === k)) return k
      return map[k] || ''
    },
    // ★ V3.8 LTRUST key 归一化：策展页 safety/transit/economy/beauty → 洞察页同一组
    _normalizeLtrustKey(k) {
      return { safety: 'safety', transit: 'transit', economy: 'economy', beauty: 'beauty' }[k] || k || ''
    },
    // ★ V3.8 由七维分值自动推荐客户类型 + LTRUST 优先项
    _recommendFromScores(scores) {
      const types = []
      const get = (k) => scores[k] || 0
      // 经济/便利高 → 通勤刚需 / 价格敏感
      if (get('econ') >= 70) types.push('price')
      if (get('conv') >= 70) types.push('commute')
      if (get('comfort') >= 70 && get('beauty') >= 60) types.push('improve')
      if (get('safety') >= 70 && get('free') >= 60) types.push('family')
      // 都不满足 → 至少给一个兜底
      if (!types.length) types.push('first')
      // LTRUST：最高分维度映射
      const ltrustMap = { safety: 'safety', conv: 'transit', econ: 'economy', beauty: 'beauty' }
      let bestKey = ''
      let bestScore = 0
      Object.keys(ltrustMap).forEach(k => {
        if (get(k) > bestScore) { bestScore = get(k); bestKey = k }
      })
      const ltrust = bestKey ? ltrustMap[bestKey] : ''
      return { types: types.slice(0, 3), ltrust }
    },
    saveInsightData() {
      this.userStore.saveInsightData(this.clientId, {
        dims: Object.keys(this.dimensionScores),
        scores: this.dimensionScores,
        types: this.selectedTypes,
        ltrust: (this.ltrustMatrix && this.ltrustMatrix.ltrustPrio) ? this.ltrustMatrix.ltrustPrio : '',
        // 保留深层洞察（saveInsightData 合并写入，避免覆盖）
        triggerEvents: this.deepInsight && this.deepInsight.triggerEvents || [],
        triggerRemark: this.deepInsight && this.deepInsight.triggerRemark || '',
        customerConflict: this.deepInsight && this.deepInsight.customerConflict || '',
        hardBottomLines: this.deepInsight && this.deepInsight.hardBottomLines || [],
        flexibleItems: this.deepInsight && this.deepInsight.flexibleItems || [],
        riskItems: this.deepInsight && this.deepInsight.riskItems || [],
        decisionMakerStances: this.deepInsight && this.deepInsight.decisionMakerStances || [],
        lifeVision: this.deepInsight && this.deepInsight.lifeVision || '',
        confirmText: this.deepInsight && this.deepInsight.confirmText || '',
      })
    },
    confirmInsight() {
      if (this.selectedTypes.length === 0) {
        uni.showToast({ title: '请先选择客户类型', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认洞察报告',
        content: '确认后将解锁房源提案，确定继续？',
        confirmText: '确认',
        success: (res) => {
          if (res.confirm) {
            // 先保存当前数据
            this.saveInsightData()
            this.userStore.confirmInsight(this.clientId)
            this.confirmed = true
            this.confirmedAt = this.formatDate(Date.now())
            const report = this.userStore.getInsightReport(this.clientId)
            this.reportNo = report ? report.reportNo : ''
            uni.showToast({ title: '洞察已确认，房源提案已解锁', icon: 'none' })
          }
        }
      })
    },
    toggleAction(i) {
      if (this.actionDone[i]) this.actionDone.splice(i, 1)
      else this.actionDone.splice(i, 0, true)
      this.$forceUpdate && this.$forceUpdate()
    },
    goToProposal() {
      if (!this.clientId) return
      if (!this.confirmed) {
        uni.showToast({ title: '请先确认洞察报告', icon: 'none' })
        return
      }
      uni.navigateTo({ url: '/package-mot/pages/proposal/index?clientId=' + this.clientId })
    },
    formatDate(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const p = n => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    // 绘制七维雷达图（Canvas）
    drawRadar() {
      try {
        const ctx = uni.createCanvasContext('radarCanvas', this)
        const W = 280, H = 200, CX = W / 2, CY = H / 2, R = 70
        const dims = this.dimensions
        const n = dims.length
        const angleStep = (2 * Math.PI) / n

        // 背景圆
        ctx.beginPath()
        for (let r = 1; r <= 4; r++) {
          const rr = R * (r / 4)
          for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2
            const x = CX + rr * Math.cos(angle)
            const y = CY + rr * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = '#e7e0d4'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }

        // 轴线
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(CX, CY)
          ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
          ctx.strokeStyle = '#e7e0d4'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }

        // 数据多边形
        const scoreSum = (score) => {
          const scoreVal = typeof score === 'number' ? score : 70
          return Math.min(100, Math.max(0, scoreVal))
        }
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const score = scoreSum(this.dimensionScores[dims[i].key] || 0)
          const r = R * (score / 100)
          const x = CX + r * Math.cos(angle)
          const y = CY + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(61, 90, 62, 0.25)'
        ctx.fill()
        ctx.strokeStyle = '#3d5a3e'
        ctx.lineWidth = 2
        ctx.stroke()

        // 数据点
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const score = scoreSum(this.dimensionScores[dims[i].key] || 0)
          const r = R * (score / 100)
          const x = CX + r * Math.cos(angle)
          const y = CY + r * Math.sin(angle)
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fillStyle = '#3d5a3e'
          ctx.fill()
        }

        ctx.draw()
      } catch (e) {
        console.warn('[radar] draw failed:', e)
      }
    }
  }
}
</script>

<style scoped>
.page { padding: 14px 14px 40px; background: #f7f4ef; min-height: 100vh; }

/* 报告头部 */
.report-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.rh-client { display: flex; align-items: center; gap: 10px; }
.rh-avatar { width: 38px; height: 38px; border-radius: 50%; background: #3d5a3e; color: #fff; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.rh-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.rh-meta { font-size: 12px; color: #8a837a; }
.rh-reportno { font-size: 11px; color: #aaa; background: #f0ece2; padding: 3px 8px; border-radius: 6px; }

/* Tab */
.tab-bar { display: flex; background: #fff; border-radius: 12px; padding: 4px; margin-bottom: 14px; border: 1px solid #e7e0d4; }
.tab-item { flex: 1; text-align: center; padding: 8px 0; font-size: 14px; color: #8a837a; border-radius: 8px; }
.tab-item.on { background: #3d5a3e; color: #fff; font-weight: 700; }

/* 卡片 */
.card { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.card-title { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }

/* 雷达图 */
.radar-wrap { display: flex; gap: 12px; align-items: center; }
.radar-canvas { width: 200px; height: 160px; }
.radar-labels { flex: 1; }
.radar-label { font-size: 12px; color: #555; margin-bottom: 6px; display: flex; justify-content: space-between; }
.dim-score { font-weight: 700; color: #3d5a3e; }
.dim-edit-tip { font-size: 11px; color: #aaa; margin-top: 6px; }

/* 闸门提示 */
.gate-hint { background: #fff4ec; border: 1px solid #f0d8c4; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #c46a3a; margin-bottom: 12px; }
.gate-ok { background: #eef6ef; border: 1px solid #c4dbc5; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #3a8f5b; margin-bottom: 12px; }

/* 八类标签 */
.type-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.type-tag { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; cursor: pointer; }
.type-tag.on { background: #3d5a3e; color: #fff; font-weight: 700; }
.type-selected { font-size: 12px; color: #3d5a3e; margin-top: 8px; font-weight: 700; }

/* LTRUST 矩阵 */
.ltrust-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lt-cell { border-radius: 10px; padding: 10px; }
.lt-high { background: #fff4ec; border: 1px solid #f0d8c4; }
.lt-medium { background: #fffef4; border: 1px solid #f0ecd0; }
.lt-low { background: #f7f4ef; border: 1px solid #e7e0d4; }
.lt-top { box-shadow: 0 0 0 2px #c46a3a; background: #fff0e8 !important; } /* ★ V2.6 优先维度高亮 */
.ltrust-prio-bar { background: #fff8e8; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #c46a3a; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ltrust-prio-icon { font-size: 18px; }
.lt-type { font-size: 13px; font-weight: 700; color: #3d5a3e; }
.lt-desc { font-size: 11px; color: #8a837a; margin-top: 2px; line-height: 1.4; }
.lt-priority { font-size: 11px; color: #c46a3a; margin-top: 4px; font-weight: 700; }

/* 确认按钮 */
.btn-confirm { background: #3d5a3e; color: #fff; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 700; margin: 16px 0; }
.confirmed-banner { background: #eef6ef; border: 1px solid #c4dbc5; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #3a8f5b; text-align: center; margin: 16px 0; }

/* 认知卡 */
.cog-count { font-size: 12px; color: #8a837a; margin-bottom: 10px; }
.cog-date { font-size: 12px; color: #aaa; margin-bottom: 6px; }
.cog-row { display: flex; gap: 10px; margin-bottom: 6px; }
.cog-label { font-size: 12px; color: #aaa; width: 32px; flex-shrink: 0; }
.cog-val { font-size: 12px; color: #555; flex: 1; line-height: 1.5; }
.empty-cog { text-align: center; padding: 40px 20px; }
.ec-icon { font-size: 48px; margin-bottom: 12px; }
.ec-t { font-size: 16px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.ec-s { font-size: 13px; color: #8a837a; line-height: 1.6; }

/* 行动计划 */
.action-item { display: flex; align-items: flex-start; gap: 10px; background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 10px; border: 1px solid #efe9dd; cursor: pointer; }
.ai-check { font-size: 18px; width: 22px; flex-shrink: 0; color: #3d5a3e; }
.ai-body { flex: 1; }
.ai-theme { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.ai-desc { font-size: 12px; color: #8a837a; margin-top: 3px; line-height: 1.5; }
.ai-priority { font-size: 11px; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
.prio-high { background: #fff4ec; color: #c46a3a; }
.prio-medium { background: #fffef4; color: #c8953a; }
.prio-low { background: #f7f4ef; color: #aaa; }
.empty-action { text-align: center; color: #aaa; font-size: 13px; padding: 30px; }
.next-step { margin-top: 20px; }
.btn-next { background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; }
.locked-tip { background: #f0ece2; border-radius: 10px; padding: 12px; font-size: 13px; color: #aaa; text-align: center; }

/* V3.5 深层洞察摘要卡 */
.deep-summary-card { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.dsc-title { font-size: 14px; font-weight: 700; color: #3d5a3e; margin-bottom: 4px; }
.dsc-note { font-size: 11px; color: #8a837a; margin-bottom: 10px; background: #f7f4ef; border-radius: 6px; padding: 3px 8px; display: inline-block; }
.dsc-row { margin-bottom: 10px; }
.dsc-label { font-size: 12px; font-weight: 700; color: #3d5a3e; margin-bottom: 5px; }
.dsc-text { background: #f7f4ef; border-radius: 8px; padding: 8px 10px; font-size: 13px; color: #2b2b2b; line-height: 1.6; }
.dsc-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.dsc-tag { padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.dsc-trigger { background: #fff8e8; color: #c46a3a; border: 1px solid #f0d8c4; }
.dsc-bottom { background: #fff0f0; color: #c0392b; border: 1px solid #f0c8c8; }
.dsc-flex { background: #eef6ef; color: #27ae60; border: 1px solid #c4dbc5; }
.dsc-remark { font-size: 11px; color: #8a837a; margin-top: 4px; font-style: italic; }
.dsc-conflict { background: #fff8f8; border-left: 3px solid #c0392b; padding: 6px 10px; border-radius: 0 8px 8px 0; font-size: 13px; color: #555; line-height: 1.5; }
.dsc-two-col { display: flex; gap: 12px; }
.dsc-two-col > view { flex: 1; }

</style>
