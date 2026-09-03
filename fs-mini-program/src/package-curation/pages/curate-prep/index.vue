<template>
  <view class="page">
    <!-- 输入态 -->
    <block v-if="!result">
      <view class="hero">
        <view class="h-title">见面参谋</view>
        <view class="h-sub">输入客户当下情况，秒出专属「说 / 带 / 问 + 见后跟进」，每条依据来自真实字典。</view>
      </view>

      <view class="card">
        <view class="label">① 人生双纵轴 · 当前阶段</view>
        <view class="seg">
          <view v-for="g in axisGroups" :key="g.type" :class="['seg-item', { on: axisType === g.type }]" @tap="pickAxis(g.type)">{{ g.label }}</view>
        </view>
        <view class="nodes">
          <view v-for="n in currentNodes" :key="n.key" :class="['node-item', { on: axisNodeKey === n.key }]" @tap="axisNodeKey = n.key">{{ n.name }}</view>
        </view>
      </view>

      <view class="card">
        <view class="label">② 住得好七维 · 客户关注（可多选）</view>
        <view class="dims">
          <view v-for="d in dimensions" :key="d.key" :class="['dim-item', { on: selectedDims.includes(d.key) }]" @tap="toggleDim(d.key)">{{ d.name }}</view>
        </view>
      </view>

      <!-- ★ V2.6 新增：洞察分值录入 -->
      <view class="card" v-if="selectedDims.length">
        <view class="label">★ ③ 住得好七维 · 权重分值（决定雷达图）</view>
        <view class="insight-tip">为已选维度打分数，0=不在意，100=极度在意</view>
        <view v-for="d in selectedDimsWithNames" :key="d.key" class="score-row">
          <text class="score-name">{{ d.name }}</text>
          <view class="score-stars">
            <text v-for="s in [20,40,60,80,100]" :key="s" :class="['star', { on: insightScores[d.key] >= s }]" @tap="setScore(d.key, s)">★</text>
          </view>
          <text class="score-val">{{ insightScores[d.key] || 0 }}分</text>
        </view>
      </view>

      <!-- ★ V2.6 新增：八类客户标签 + LTRUST -->
      <view class="card" v-if="selectedDims.length">
        <view class="label">★ ④ 客户类型 · 八分法（待确认）</view>
        <view class="insight-tip">系统推荐初判，可多选确认后锁定</view>
        <view class="type-tags">
          <view v-for="t in clientTypes" :key="t.key" :class="['type-tag', { on: selectedTypes.includes(t.key) }]" @tap="toggleType(t.key)">{{ t.label }}</view>
        </view>
        <view class="ltrust-row">
          <view class="label" style="margin-bottom:8px">★ ⑤ LTRUST 优先维度（选最高优先）</view>
          <view class="type-tags">
            <view v-for="l in ltrustOptions" :key="l.key" :class="['type-tag', l.key, { on: selectedLtrust === l.key }]" @tap="selectedLtrust = l.key">{{ l.label }}</view>
          </view>
        </view>
      </view>

      <!-- ★ V3.5 深层动因洞察模块（折叠） -->
      <view class="card deep-insight-card">
        <view class="deep-header" @tap="showDeepInsight = !showDeepInsight">
          <view class="label" style="margin-bottom:0">💡 深层动因洞察 <text class="deep-badge" v-if="hasDeepInsight">已填</text></view>
          <text class="deep-arrow">{{ showDeepInsight ? '▲' : '▼' }}</text>
        </view>
        <view class="deep-tip" v-if="!showDeepInsight">展开填写：触发动因 / 内心矛盾 / 底线与让步 · 经纪人内部使用</view>

        <block v-if="showDeepInsight">
          <!-- ① 触发动因 -->
          <view class="deep-section">
            <view class="ds-label">① 触发动因 <text class="ds-hint">最近什么事件促使您现在考虑买房/租房？</text></view>
            <view class="ds-grid">
              <view v-for="t in triggerEventOpts" :key="t.key"
                :class="['ds-tag', 'ds-trigger', { on: triggerEvents.includes(t.key) }]"
                @tap="toggleTag(triggerEvents, t.key)">{{ t.label }}</view>
            </view>
            <input class="deep-remark" v-model="triggerRemark" placeholder="客户原话补充（选填），如：客户说旧租约下月到期" />
          </view>

          <!-- ② 核心矛盾 -->
          <view class="deep-section">
            <view class="ds-label">② 内心矛盾 <text class="ds-hint">客户最纠结、最难取舍的是什么？</text></view>
            <textarea class="deep-conflict" v-model="customerConflict" placeholder="如：想要好学区但预算卡得紧，可以接受老破小；纠结通勤和面积之间的取舍……" maxlength="120"></textarea>
          </view>

          <!-- ③ 不可妥协底线 -->
          <view class="deep-section">
            <view class="ds-label">③ 不可妥协底线 <text class="ds-hint" style="color:#c0392b">红色·绝不退让</text></view>
            <view class="ds-grid">
              <view v-for="b in hardBottomOpts" :key="b.key"
                :class="['ds-tag', 'ds-bottom', { on: hardBottomLines.includes(b.key) }]"
                @tap="toggleTag(hardBottomLines, b.key)">{{ b.label }}</view>
            </view>
          </view>

          <!-- ④ 可妥协让步项 -->
          <view class="deep-section">
            <view class="ds-label">④ 可妥协让步项 <text class="ds-hint" style="color:#27ae60">绿色·可以牺牲</text></view>
            <view class="ds-grid">
              <view v-for="f in flexibleOpts" :key="f.key"
                :class="['ds-tag', 'ds-flex', { on: flexibleItems.includes(f.key) }]"
                @tap="toggleTag(flexibleItems, f.key)">{{ f.label }}</view>
            </view>
          </view>

          <!-- ★ V3.7 新增：⑤ 顾虑清单（痛苦与顾虑） -->
          <view class="deep-section">
            <view class="ds-label">⑤ 客户顾虑 <text class="ds-hint">客户心里担心但嘴上不一定说的，勾出来帮你见后跟进时更有针对性</text></view>
            <view class="ds-grid">
              <view v-for="r in riskOpts" :key="r.key"
                :class="['ds-tag', 'ds-risk', { on: riskItems.includes(r.key) }]"
                @tap="toggleTag(riskItems, r.key)">{{ r.label }}</view>
            </view>
          </view>

          <!-- ★ V3.7 新增：⑥ 决策人立场 -->
          <view class="deep-section">
            <view class="ds-label">⑥ 决策人立场 <text class="ds-hint">谁参与决策？每人最看重什么？家庭内部不统一是带看失败的常见原因</text></view>
            <view v-for="(dm, idx) in decisionMakerStances" :key="idx" class="dm-row">
              <input class="dm-name" v-model="dm.name" placeholder="姓名/关系，如：丈夫、婆婆" />
              <view class="dm-stances">
                <view v-for="s in stanceTypeOpts" :key="s.key"
                  :class="['dm-stance', { on: dm.stanceType === s.key }]"
                  @tap="dm.stanceType = (dm.stanceType === s.key ? '' : s.key)">{{ s.label }}</view>
              </view>
              <input class="dm-concern" v-model="dm.concern" placeholder="补充备注（选填）" />
              <text class="dm-del" @tap="decisionMakerStances.splice(idx, 1)">✕</text>
            </view>
            <view class="dm-add" @tap="decisionMakerStances.push({name:'',stanceType:'',concern:''})">+ 添加决策人</view>
          </view>

          <!-- ★ V3.7 新增：⑦ 理想生活画面 -->
          <view class="deep-section">
            <view class="ds-label">⑦ 理想生活画面 <text class="ds-hint">「买完房之后，理想的一天是什么样的？」</text></view>
            <textarea class="deep-conflict" v-model="lifeVision" placeholder="描述客户向往的生活：比如下班接孩子走十分钟回家，周末在阳台喝茶，老人在客厅看电视……帮客户把向往的画面说具体，提案时才有代入感" maxlength="120"></textarea>
          </view>
        </block>
      </view>

      <view class="card">
        <view class="label">⑤ 一句自由诉求（选填）</view>
        <textarea class="ta" v-model="freeText" placeholder="如：800万改善三房，学区还是居住品质纠结" maxlength="120"></textarea>
      </view>

      <view v-if="clientName" class="client-bar">已关联客户：{{ clientName }}（准备结果将存入其认知卡）</view>

      <view class="page-bottom">
        <view class="hint">依据来自真实字典 decoder / see / nego，绝不编造；缺失依据诚实标注「依据整理中」。</view>
        <view v-if="loadError" class="err-msg">{{ loadError }}</view>
        <button class="btn-main" @tap="gen" :disabled="loading">
          {{ loading ? '⏳ 策展中...' : '⚡ 生成见面参谋' }}
        </button>
      </view>

      <!-- V3.5 复述确认弹层 -->
      <view v-if="showConfirm" class="overlay active">
        <view class="ov-nav">
          <button class="back" @tap="showConfirm = false">‹ 返回</button>
          <view><view style="font-size:17px;font-weight:700">需求复述确认</view><view class="sub">和客户对齐后再生成策展</view></view>
        </view>
        <scroll-view class="ovcontent" scroll-y="true">
          <view class="confirm-tip">请与客户确认以下需求描述，无误后点击「确认并生成」</view>
          <textarea class="confirm-ta" v-model="confirmText" maxlength="300"></textarea>
          <view class="confirm-badges" v-if="triggerEvents.length || hardBottomLines.length">
            <view class="cb-section" v-if="triggerEvents.length">
              <text class="cb-title">触发：</text>
              <text class="cb-val">{{ triggerEvents.map(k => _triggerLabel(k)).filter(Boolean).join('、') }}</text>
            </view>
            <view class="cb-section" v-if="hardBottomLines.length">
              <text class="cb-title" style="color:#c0392b">底线：</text>
              <text class="cb-val" style="color:#c0392b">{{ hardBottomLines.map(k => _bottomLabel(k)).filter(Boolean).join('、') }}</text>
            </view>
          </view>
          <view class="confirm-hint">
            <text>💡 可直接复制这段话微信发给客户确认，或当面复述。确认无误后生成策展包。</text>
          </view>
        </scroll-view>
        <view class="ov-foot">
          <button class="btn-line foot-cancel" @tap="showConfirm = false">返回修改</button>
          <button class="btn-green foot-save" @tap="doGenerate">✓ 确认并生成策展</button>
        </view>
      </view>
    </block>

    <!-- 结果态 -->
    <block v-if="result">
      <view class="result-head">
        <view class="rh-axis">{{ result.axisLabel }}</view>
        <view class="rh-dims" v-if="result.dimensionLabels.length">
          <text v-for="(d, i) in result.dimensionLabels" :key="i" class="dim-tag">{{ d }}</text>
        </view>
        <view class="honesty">{{ result.honesty.note }}</view>
      </view>

      <!-- ★ V2.6 洞察确认闸门 -->
      <view v-if="hasInsightData && !insightConfirmed" class="insight-confirm-bar">
        <view class="icb-title">📋 洞察数据已录入</view>
        <view class="icb-sub">{{ confirmedTypeCount }}个客户标签 · {{ confirmedScoreCount }}个七维权重</view>
        <view class="icb-actions">
          <button class="btn-confirm" @tap="goInsightReport">→ 查看洞察报告</button>
          <button class="btn-edit" @tap="insightConfirmed = true">确认洞察 ✓</button>
        </view>
      </view>
      <view v-if="insightConfirmed" class="insight-ok-bar">✅ 洞察已确认 · 锁定提案闸门</view>

      <!-- 三段式时间轴 -->
      <view class="timeline">
        <view v-for="(t, i) in result.timeline" :key="i" class="tl-item">
          <view class="tl-icon">{{ t.icon }}</view>
          <view class="tl-body">
            <view class="tl-phase">{{ t.phase }}</view>
            <view class="tl-tip">{{ t.tip }}</view>
          </view>
        </view>
      </view>

      <!-- 说 -->
      <view class="sec">
        <view class="sec-h"><text class="em">📢</text>① 该说的（每条挂真实依据）</view>
        <view v-for="(s, i) in result.say" :key="i" class="say-item">
          <view class="say-title">{{ s.title }}</view>
          <view class="say-point">{{ s.point }}</view>
          <view v-if="s.detail" class="say-detail">{{ s.detail }}</view>
          <view :class="['ref', s.hasLegal ? 'ref-ok' : 'ref-wait']">
            <text v-if="s.hasLegal">真实法源 ✓ {{ s.legalRef }}</text>
            <text v-else>经验要点 · 依据整理中</text>
          </view>
        </view>
      </view>

      <!-- 带 -->
      <view class="sec">
        <view class="sec-h"><text class="em">🏠</text>② 该带的（看房 / 房源方向）</view>
        <view v-for="(b, i) in result.bring" :key="i" class="bring-item">
          <view class="bring-title">{{ b.title }}</view>
          <view class="bring-benefit">{{ b.benefit }}</view>
        </view>
        <view v-if="!result.bring.length" class="empty-mini">暂无强相关条目，建议结合实勘补充</view>
      </view>

      <!-- 问 -->
      <view class="sec">
        <view class="sec-h"><text class="em">❓</text>③ 该问的（必问 · 探需求）</view>
        <view v-for="(a, i) in result.ask" :key="i" class="ask-item">
          {{ a.q }}
        </view>
        <view v-if="!result.ask.length" class="empty-mini">暂无必问条目</view>
      </view>

      <!-- 跟 -->
      <view class="sec">
        <view class="sec-h"><text class="em">💌</text>④ 见后跟进（持续关怀）</view>
        <view v-for="(f, i) in result.followups" :key="i" class="follow-item">
          <view class="follow-theme">{{ f.theme }}</view>
          <view class="follow-text">{{ f.text }}</view>
        </view>
      </view>

      <view class="actions">
        <button class="btn-main" @tap="save">✓ 存入客户认知卡</button>
        <button class="btn-line" @tap="result = null">← 修改重生成</button>
      </view>
      <view v-if="savedTip" class="saved-tip">{{ savedTip }}</view>
    </block>
  </view>
</template>

<script>
import { AXIS_GROUPS, DIMENSIONS, generateCurationAsync } from '../../engine.js'
import { useUserStore } from '../../../store/user'
import { trackPageview } from '../../../utils/tracker'

export default {
  data() {
    return {
      axisGroups: AXIS_GROUPS,
      dimensions: DIMENSIONS,
      axisType: 'buy',
      axisNodeKey: 'improve',
      selectedDims: [],
      // ★ V2.6 洞察录入
      insightScores: {},   // { safety: 80, transit: 60, ... }
      selectedTypes: [],   // ['commuter', 'first_home']
      selectedLtrust: '',   // 'safety' | 'transit' | 'economy' | 'beauty'
      insightConfirmed: false,
      // ★ V3.5 深层动因洞察
      showDeepInsight: false,   // 展开态
      triggerEvents: [],        // ['family_birth','family_marriage','external_expiry',...]
      triggerRemark: '',        // 触发事件补充描述
      customerConflict: '',      // 客户内心矛盾（自由文本）
      hardBottomLines: [],      // 底线标签 ['school','metro','budget']
      flexibleItems: [],        // 可让步项 ['area','decoration','age']
      showConfirm: false,       // 复述确认弹层
      confirmText: '',          // 复述文案（可编辑）
      pendingResult: null,      // 确认后暂存策展结果
      // ★ 八类 + LTRUST 选项
      // V3.5 深层洞察选项
      triggerEventOpts: [
        { key: 'family_birth', label: '👶 家庭添丁' },
        { key: 'family_marriage', label: '💍 新婚' },
        { key: 'family_elder', label: '👴 老人同住' },
        { key: 'family_school', label: '🏫 子女入学' },
        { key: 'external_expiry', label: '📅 原租约到期' },
        { key: 'external_transfer', label: '🏢 工作调动' },
        { key: 'external_commute', label: '🚇 通勤无法忍受' },
        { key: 'external_defect', label: '🏠 现有房屋缺陷' },
        { key: 'time_school', label: '📋 入学落户节点' },
        { key: 'time_limit', label: '⏰ 置换窗口期' },
        { key: 'time_other', label: '📌 其他时间压力' },
      ],
      hardBottomOpts: [
        { key: 'school', label: '学区资质' },
        { key: 'metro', label: '地铁距离' },
        { key: 'budget', label: '总价上限' },
        { key: 'floor', label: '楼层要求' },
        { key: 'orientation', label: '朝向' },
        { key: 'elevator', label: '必须有电梯' },
        { key: 'noise', label: '噪音控制' },
        { key: 'title', label: '产权清晰' },
      ],
      flexibleOpts: [
        { key: 'area', label: '面积' },
        { key: 'decoration', label: '装修标准' },
        { key: 'ratio', label: '梯户比' },
        { key: 'age', label: '楼龄' },
        { key: 'quality', label: '小区品质' },
        { key: 'orientation', label: '朝向' },
        { key: 'parking', label: '车位' },
      ],
      clientTypes: [
        { key: 'commuter',    label: '通勤敏感型' },
        { key: 'first_home',  label: '首次置业型' },
        { key: 'family_kid',  label: '有娃家庭型' },
        { key: 'improve',     label: '改善置换型' },
        { key: 'elder',       label: '养老宜居型' },
        { key: 'invest',      label: '投资增值型' },
        { key: 'study',       label: '陪读求学型' },
        { key: 'price',       label: '纯价格敏感型' }
      ],
      ltrustOptions: [
        { key: 'safety',  label: '🔴 物质安全' },
        { key: 'transit', label: '🟡 便利通勤' },
        { key: 'economy', label: '🟢 经济评估' },
        { key: 'beauty',  label: '🔵 美观升级' }
      ],
      // ★ V3.7 新增：顾虑清单（第四层痛苦与顾虑）
      riskItems: [],          // ['fear_expensive','fear_family','fear_policy']
      riskOpts: [
        { key: 'fear_expensive', label: '💸 怕买贵' },
        { key: 'fear_mortgage',  label: '🏦 怕月供压力' },
        { key: 'fear_devalue',   label: '📉 怕后期贬值' },
        { key: 'fear_family',    label: '👥 怕家人意见不统一' },
        { key: 'fear_policy',    label: '📋 怕学区政策变动' },
        { key: 'fear_delivery',  label: '🔑 怕交房时间不确定' },
        { key: 'fear_liquidity', label: '🔄 怕流通性差' },
        { key: 'fear_quality',   label: '🏗️ 怕质量/维权风险' },
      ],
      // ★ V3.7 新增：决策人立场（第五层决策链）
      decisionMakerStances: [], // [{name, stanceType, concern}]
      stanceTypeOpts: [
        { key: 'commute',   label: '看重通勤' },
        { key: 'school',    label: '看重学区' },
        { key: 'budget',    label: '看重预算' },
        { key: 'floor',     label: '看重楼层/朝向' },
        { key: 'quality',   label: '看重品质/面积' },
        { key: 'safety',    label: '看重安全/产权' },
        { key: 'other',     label: '其他诉求' },
      ],
      // ★ V3.7 新增：理想生活画面（第三层目标与渴望）
      lifeVision: '',

      clientId: null,
      clientName: '',
      result: null,
      savedTip: '',
      loading: false,
      loadError: ''
    }
  },
  computed: {
    currentNodes() {
      const g = AXIS_GROUPS.find(x => x.type === this.axisType)
      return g ? g.nodes : []
    },
    userStore() { return useUserStore() },
    // ★ V2.6
    selectedDimsWithNames() {
      return this.selectedDims.map(k => {
        const d = DIMENSIONS.find(x => x.key === k)
        return { key: k, name: d ? d.name : k }
      })
    },
    hasInsightData() {
      return this.selectedDims.length > 0
    },
    confirmedTypeCount() { return this.selectedTypes.length },
    // V3.5 复述文案（自动生成预览）
    autoConfirmText() {
      const clientName = this.clientName || '客户'
      const g = this.axisGroups.find(x => x.type === this.axisType)
      const node = (g && g.nodes) ? g.nodes.find(n => n.key === this.axisNodeKey) : null
      const axis = node ? node.name : ''
      const triggers = this.triggerEvents.map(k => this._triggerLabel(k)).filter(Boolean)
      const conflict = this.customerConflict.trim()
      const bottoms = this.hardBottomLines.map(k => this._bottomLabel(k)).filter(Boolean)
      const flexes = this.flexibleItems.map(k => this._flexLabel(k)).filter(Boolean)
      let text = `根据与${clientName}的沟通，${clientName}`
      if (triggers.length) text += `因为【${triggers.join('、')}】`
      text += `打算${this.axisType === 'buy' ? '购房' : '租房'}`
      if (axis) text += `（${axis}）`
      if (conflict) text += `；比较纠结：${conflict}`
      if (bottoms.length) text += `；底线：${bottoms.join('、')}必须满足`
      if (flexes.length) text += `；${flexes.join('、')}可以适当妥协`
      text += '。'
      if (this.triggerRemark.trim()) text += ` 客户原话：${this.triggerRemark.trim()}`
      return text
    },
    hasDeepInsight() {
      return this.triggerEvents.length > 0 || this.customerConflict.trim() ||
             this.hardBottomLines.length > 0 || this.flexibleItems.length > 0 ||
             this.triggerRemark.trim() || this.riskItems.length > 0 ||
             this.decisionMakerStances.length > 0 || this.lifeVision.trim()
    },
    confirmedScoreCount() {
      return Object.keys(this.insightScores).filter(k => this.insightScores[k] > 0).length
    }
  },
  onLoad(options) {
    trackPageview('curate-prep')
    if (options && options.clientId) {
      this.clientId = options.clientId
      const c = this.userStore.getClient(options.clientId)
      if (c) {
        this.clientName = c.name
        // 由 rel / stage 预填纵轴，降低输入负担（R1）
        const rel = c.rel || ''
        this.axisType = (rel.indexOf('租') >= 0) ? 'rent' : 'buy'
        const stage = (c.stage || '') + (c.note || '')
        if (stage.indexOf('首套') >= 0 || stage.indexOf('婚') >= 0) this.axisNodeKey = 'first'
        else if (stage.indexOf('学区') >= 0 || stage.indexOf('教育') >= 0) this.axisNodeKey = 'edu'
        else if (stage.indexOf('适老') >= 0 || stage.indexOf('养老') >= 0) this.axisNodeKey = 'elder'
        else if (stage.indexOf('租') >= 0) this.axisNodeKey = 'start'
        else if (this.axisType === 'rent') this.axisNodeKey = 'start'
        if (c.note) this.freeText = c.note
      }
    }
  },
  methods: {
    pickAxis(type) {
      this.axisType = type
      // 切换纵轴时，节点默认回到该线的第一个
      const g = AXIS_GROUPS.find(x => x.type === type)
      this.axisNodeKey = g ? g.nodes[0].key : this.axisNodeKey
    },
    toggleDim(key) {
      const i = this.selectedDims.indexOf(key)
      if (i >= 0) this.selectedDims.splice(i, 1)
      else this.selectedDims.push(key)
      // 切换维度时重置分数
      if (i < 0 && !this.insightScores[key]) {
        this.insightScores[key] = 0
      }
    },
    // ★ V2.6 洞察录入
    toggleType(key) {
      const i = this.selectedTypes.indexOf(key)
      if (i >= 0) this.selectedTypes.splice(i, 1)
      else this.selectedTypes.push(key)
    },
    setScore(key, score) {
      // 点击已选分值 = 取消
      this.insightScores[key] = this.insightScores[key] === score ? 0 : score
    },
    goInsightReport() {
      if (!this.clientId) {
        uni.showToast({ title: '请先关联客户', icon: 'none' })
        return
      }
      const insightData = {
        axisType: this.axisType,
        axisNodeKey: this.axisNodeKey,
        dims: this.selectedDims,
        scores: { ...this.insightScores },
        types: [...this.selectedTypes],
        ltrust: this.selectedLtrust,
        freeText: this.freeText,
        axisLabel: this.result ? this.result.axisLabel : '',
        dimensionLabels: this.result ? this.result.dimensionLabels : []
      }
      // 先存数据
      this.userStore.saveInsightData(this.clientId, insightData)
      this.userStore.markDone('insight')
      this.userStore.earnPoints(15, '完成洞察录入')
      // 再跳转
      uni.navigateTo({ url: '/package-mot/pages/insight/index?clientId=' + this.clientId + '&from=curate' })
    },
    confirmInsight() {
      if (!this.clientId) return
      this.userStore.confirmInsight(this.clientId)
      this.insightConfirmed = true
      uni.showToast({ title: '洞察已确认 ✓', icon: 'none' })
    },
    gen() {
      // V3.5：有深层洞察时，先弹出确认层
      if (this.hasDeepInsight && !this.showConfirm) {
        this.confirmText = this.autoConfirmText
        this.showConfirm = true
        return
      }
      // 有深层洞察但用户点「确认」后的实际生成
      this.doGenerate()
    },
    doGenerate() {
      this.loading = true
      this.loadError = ''
      generateCurationAsync({
        axisType: this.axisType,
        axisNodeKey: this.axisNodeKey,
        dimensions: this.selectedDims,
        freeText: this.freeText,
        // ★ V3.6+V3.7 深层洞察全参数
        triggerEvents: this.triggerEvents,
        triggerRemark: this.triggerRemark,
        customerConflict: this.customerConflict,
        hardBottomLines: this.hardBottomLines,
        flexibleItems: this.flexibleItems,
        // V3.7 新增
        riskItems: this.riskItems,
        decisionMakerStances: this.decisionMakerStances,
        lifeVision: this.lifeVision,
      }).then(res => {
        this.result = res
        this.savedTip = ''
        this.loading = false
        this.showConfirm = false
        uni.pageScrollTo && uni.pageScrollTo({ scrollTop: 0, duration: 200 }) // 仅在结果页滚动回顶，不影响输入态
      }).catch(err => {
        console.error('[curation] generate failed:', err)
        this.loadError = '生成失败，请检查网络后重试'
        this.loading = false
      })
    },
    // V3.5 深层洞察辅助
    _triggerLabel(k) {
      return { family_birth: '家庭添丁', family_marriage: '新婚', family_elder: '老人同住',
               family_school: '子女入学', external_expiry: '原租约到期', external_transfer: '工作调动',
               external_commute: '通勤无法忍受', external_defect: '现有房屋缺陷',
               time_school: '入学落户节点', time_limit: '置换窗口期', time_other: '其他时间压力' }[k] || ''
    },
    _bottomLabel(k) {
      return { school: '学区资质', metro: '地铁距离', budget: '总价上限', floor: '楼层要求',
               orientation: '朝向', elevator: '必须有电梯', noise: '噪音控制', title: '产权清晰' }[k] || ''
    },
    _flexLabel(k) {
      return { area: '面积', decoration: '装修标准', ratio: '梯户比', age: '楼龄',
               quality: '小区品质', orientation: '朝向', parking: '车位' }[k] || ''
    },
    toggleTag(arr, key) {
      const i = arr.indexOf(key)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(key)
    },
    save() {
      if (!this.clientId) {
        uni.showToast({ title: '未关联客户，仅本地查看', icon: 'none' })
        this.savedTip = '未关联客户，建议从客户档案进入以沉淀认知卡'
        return
      }
      const sayTitles = this.result.say.map(s => s.title)
      const followThemes = this.result.followups.map(f => f.theme)
      this.userStore.saveCognition(this.clientId, {
        axisLabel: this.result.axisLabel,
        dims: this.result.dimensionLabels,
        sayTitles,
        followThemes,
        freeText: this.freeText
      })
      // ★ V2.6 洞察数据写入 client lifecycle（如果用户已填）
      if (this.hasInsightData) {
        this.userStore.saveInsightData(this.clientId, {
          axisType: this.axisType,
          axisNodeKey: this.axisNodeKey,
          dims: this.selectedDims,
          scores: { ...this.insightScores },
          types: [...this.selectedTypes],
          ltrust: this.selectedLtrust,
          freeText: this.freeText,
          axisLabel: this.result.axisLabel,
          dimensionLabels: this.result.dimensionLabels,
          // V3.5 深层洞察
          triggerEvents: [...this.triggerEvents],
          triggerRemark: this.triggerRemark,
          customerConflict: this.customerConflict,
          hardBottomLines: [...this.hardBottomLines],
          flexibleItems: [...this.flexibleItems],
          // V3.7 新增
          riskItems: [...this.riskItems],
          decisionMakerStances: JSON.parse(JSON.stringify(this.decisionMakerStances)),
          lifeVision: this.lifeVision,
          confirmText: this.confirmText,
          insightConfirmed: this.insightConfirmed,
        })
        this.userStore.markDone('insight')
        this.userStore.earnPoints(15, '完成洞察录入')
      }
      // 联动既有经营记录（时间线 + 记忆点 + 信任积分）
      this.userStore.addTimelineEvent(this.clientId, { type: '策展', summary: '见面参谋生成（' + this.result.axisLabel + ' · ' + this.result.say.length + ' 说 / ' + this.result.followups.length + ' 见后跟进）' })
      this.userStore.addMemoryPoint(this.clientId, '专业准备：基于真实字典生成见面参谋，每条可点开依据')
      this.userStore.markDone('curate')
      this.userStore.earnPoints(10, '完成见面参谋')
      this.savedTip = '已存入「' + this.clientName + '」的认知卡 · 信任积分 +10' + (this.hasInsightData ? ' · 洞察数据 +15' : '')
      uni.showToast({ title: '已存入客户认知卡', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { height: 100vh; padding: 14px; padding-bottom: calc(14px + 80px + env(safe-area-inset-bottom)); background: #f7f4ef; box-sizing: border-box; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.hero { background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%); border-radius: 16px; padding: 18px 16px; margin-bottom: 14px; }
.h-title { color: #fff; font-size: 20px; font-weight: 700; }
.h-sub { color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.6; margin-top: 6px; }
.card { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.label { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 10px; }
.seg { display: flex; gap: 8px; }
.seg-item { flex: 1; text-align: center; padding: 9px 0; background: #f0ece2; border-radius: 10px; font-size: 14px; color: #555; }
.seg-item.on { background: #3d5a3e; color: #fff; font-weight: 700; }
.nodes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.node-item { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; }
.node-item.on { background: #c46a3a; color: #fff; font-weight: 700; }
.dims { display: flex; flex-wrap: wrap; gap: 8px; }
.dim-item { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; }
.dim-item.on { background: #eef3ec; color: #3d5a3e; border: 1px solid #3d5a3e; font-weight: 700; }
.ta { width: 100%; height: 72px; background: #f7f4ef; border-radius: 10px; padding: 10px; font-size: 14px; box-sizing: border-box; color: #2b2b2b; }
.client-bar { background: #eef3ec; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #3d5a3e; margin-bottom: 10px; }
.hint { font-size: 11px; color: #C8956D; background: #fbf6ee; padding: 8px 10px; border-radius: 8px; margin-bottom: 12px; line-height: 1.5; }
.page-bottom { position: fixed; bottom: 0; left: 0; right: 0; background: #f7f4ef; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); z-index: 10; border-top: 1px solid #efe9dd; }
.btn-main { background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; margin-top: 8px; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 12px; padding: 12px; font-size: 14px; margin-top: 8px; }
.result-head { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.rh-axis { font-size: 16px; font-weight: 700; color: #2b2b2b; }
.rh-dims { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.dim-tag { font-size: 11px; color: #3d5a3e; background: #eef3ec; padding: 3px 8px; border-radius: 6px; }
.honesty { margin-top: 10px; font-size: 12px; color: #8a837a; line-height: 1.5; }
.timeline { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.tl-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #eee; }
.tl-item:last-child { border-bottom: none; }
.tl-icon { font-size: 20px; }
.tl-phase { font-size: 14px; font-weight: 700; color: #3d5a3e; }
.tl-tip { font-size: 12px; color: #8a837a; margin-top: 2px; line-height: 1.5; }
.sec { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.sec-h { font-size: 15px; font-weight: 700; color: #2b2b2b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.em { font-size: 16px; }
.say-item { background: #f7f4ef; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
.say-title { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.say-point { font-size: 13px; color: #444; margin-top: 4px; line-height: 1.55; }
.say-detail { font-size: 12px; color: #8a837a; margin-top: 4px; line-height: 1.5; }
.ref { font-size: 11px; margin-top: 6px; padding: 4px 8px; border-radius: 6px; line-height: 1.4; }
.ref-ok { background: #eef3ec; color: #3d5a3e; }
.ref-wait { background: #f3f0ea; color: #8a837a; }
.bring-item { padding: 8px 0; border-bottom: 1px dashed #eee; }
.bring-item:last-child { border-bottom: none; }
.bring-title { font-size: 14px; font-weight: 600; color: #2b2b2b; }
.bring-benefit { font-size: 12px; color: #8a837a; margin-top: 2px; }
.ask-item { background: #eef3ec; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; font-size: 13px; color: #2b5a3e; line-height: 1.5; }
.follow-item { padding: 8px 0; border-bottom: 1px dashed #eee; }
.follow-item:last-child { border-bottom: none; }
.follow-theme { font-size: 13px; font-weight: 700; color: #c46a3a; }
.follow-text { font-size: 12px; color: #555; margin-top: 2px; line-height: 1.5; }
.empty-mini { font-size: 12px; color: #aaa; padding: 6px 0; }
.actions { margin-top: 4px; }
.saved-tip { text-align: center; font-size: 12px; color: #3d5a3e; margin-top: 10px; }
.err-msg { background: #fff0f0; color: #c0392b; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; text-align: center; }
.btn-main:disabled { opacity: 0.6; }

/* V3.5 深层动因洞察 */
.deep-insight-card { padding-bottom: 6px; }
.deep-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
.deep-arrow { font-size: 13px; color: #8a837a; }
.deep-badge { background: #c46a3a; color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 10px; margin-left: 6px; font-weight: 400; }
.deep-tip { font-size: 11px; color: #C8956D; background: #fbf6ee; padding: 6px 10px; border-radius: 8px; margin-top: 6px; line-height: 1.5; }
.deep-section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e7e0d4; }
.deep-section:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.ds-label { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 8px; display: block; }
.ds-hint { font-size: 11px; font-weight: 400; color: #8a837a; margin-left: 4px; }
.ds-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 8px; }
.ds-tag { padding: 5px 10px; border-radius: 16px; font-size: 12px; border: 1.5px solid #e7e0d4; color: #555; background: #f7f4ef; }
.ds-tag.on { font-weight: 700; }
.ds-trigger.on { background: #fff8e8; border-color: #c8956d; color: #c46a3a; }
.ds-bottom.on { background: #fff0f0; border-color: #c0392b; color: #c0392b; }
.ds-flex.on { background: #eef6ef; border-color: #27ae60; color: #27ae60; }
.ds-risk.on { background: #fff3e0; border-color: #e67e22; color: #e67e22; }
.deep-remark { background: #f7f4ef; border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #555; margin-top: 6px; width: 100%; box-sizing: border-box; }
.deep-conflict { width: 100%; height: 70px; background: #f7f4ef; border-radius: 10px; padding: 8px 10px; font-size: 13px; color: #2b2b2b; box-sizing: border-box; margin-top: 6px; }

/* V3.7 决策人立场 */
.dm-row { background: #f7f4ef; border-radius: 10px; padding: 10px; margin-bottom: 8px; position: relative; }
.dm-name { background: #fff; border-radius: 8px; padding: 6px 10px; font-size: 13px; color: #2b2b2b; width: 100%; box-sizing: border-box; margin-bottom: 6px; }
.dm-stances { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.dm-stance { padding: 4px 9px; border-radius: 14px; font-size: 11px; color: #8a837a; border: 1.5px solid #e0d9cc; background: #fff; }
.dm-stance.on { background: #3d5a3e; color: #fff; border-color: #3d5a3e; font-weight: 700; }
.dm-concern { background: #fff; border-radius: 8px; padding: 5px 10px; font-size: 12px; color: #555; width: 100%; box-sizing: border-box; }
.dm-del { position: absolute; top: 8px; right: 10px; color: #c0392b; font-size: 16px; line-height: 1; }
.dm-add { color: #3d5a3e; font-size: 13px; padding: 8px 0; text-align: center; border: 1.5px dashed #c8d4c4; border-radius: 10px; margin-top: 4px; }

/* V3.5 复述确认弹层 */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; }
.overlay.active { display: flex; }
.ov-nav { background: #3d5a3e; color: #fff; display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
.back { background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 8px; padding: 6px 14px; font-size: 14px; }
.sub { font-size: 12px; opacity: 0.75; }
.ovcontent { height: 0; flex: 1; background: #f7f4ef; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px 14px 60px; }
.confirm-tip { background: #fff8e8; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #c46a3a; margin-bottom: 12px; line-height: 1.5; }
.confirm-ta { width: 100%; height: 130px; background: #fff; border-radius: 10px; padding: 12px; font-size: 14px; color: #2b2b2b; box-sizing: border-box; line-height: 1.6; margin-bottom: 12px; }
.confirm-badges { background: #fff; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
.cb-section { display: flex; gap: 6px; margin-bottom: 4px; font-size: 12px; }
.cb-section:last-child { margin-bottom: 0; }
.cb-title { font-weight: 700; color: #3d5a3e; flex-shrink: 0; }
.cb-val { color: #555; }
.confirm-hint { background: #eef3ec; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #3d5a3e; line-height: 1.5; }
.ov-foot { background: #fff; display: flex; gap: 10px; padding: 12px 14px; border-top: 1px solid #e7e0d4; }
.btn-green { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; }
.foot-cancel { flex: 1; }
.foot-save { flex: 2; }
.btn-green.foot-save { background: #3d5a3e; }


/* ★ V2.6 洞察录入 */
.insight-tip { font-size: 11px; color: #8a837a; margin-bottom: 10px; }
.score-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed #eee; }
.score-row:last-child { border-bottom: none; }
.score-name { font-size: 13px; color: #2b2b2b; width: 56px; flex-shrink: 0; }
.score-stars { display: flex; gap: 2px; flex: 1; }
.star { font-size: 16px; color: #ddd; transition: color 0.1s; }
.star.on { color: #c46a3a; }
.score-val { font-size: 11px; color: #c46a3a; width: 30px; text-align: right; flex-shrink: 0; }
.type-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.type-tag { padding: 5px 11px; border-radius: 20px; font-size: 12px; color: #3d5a3e; border: 1.5px solid #3d5a3e; background: #fff; }
.type-tag.on { background: #c46a3a; color: #fff; border-color: #c46a3a; }
.type-tag.safety.on { background: #c0392b; border-color: #c0392b; }
.type-tag.transit.on { background: #e67e22; border-color: #e67e22; }
.type-tag.economy.on { background: #27ae60; border-color: #27ae60; }
.type-tag.beauty.on { background: #2980b9; border-color: #2980b9; }
.ltrust-row { margin-top: 12px; }
.insight-confirm-bar { background: #fff8e8; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1.5px solid #f0d090; }
.icb-title { font-size: 14px; font-weight: 700; color: #c46a3a; }
.icb-sub { font-size: 11px; color: #8a837a; margin: 4px 0 10px; }
.icb-actions { display: flex; gap: 8px; }
.btn-confirm { flex: 2; background: #c46a3a; color: #fff; border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 700; }
.btn-edit { flex: 1; background: #fff; color: #3d5a3e; border: 1.5px solid #3d5a3e; border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 700; }
.insight-ok-bar { background: #eef3ec; color: #3d5a3e; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 700; margin-bottom: 12px; text-align: center; }
</style>