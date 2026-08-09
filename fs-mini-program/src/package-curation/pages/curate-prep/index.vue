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
        <view class="label">② 见面场景（精准匹配该场景建议）</view>
        <view class="scenarios">
          <view :class="['sc-item', { on: !scenario }]" @tap="scenario = ''">全场景</view>
          <view v-for="s in currentScenarios" :key="s.key" :class="['sc-item', { on: scenario === s.key }]" @tap="scenario = s.key">{{ s.name }}</view>
        </view>
      </view>

      <view class="card">
        <view class="label">③ 住得好七维 · 选客户关注的维度（可多选）</view>
        <view class="dims">
          <view v-for="d in dimensions" :key="d.key" :class="['dim-item', { on: selectedDims.includes(d.key) }]" @tap="toggleDim(d.key)">{{ d.name }}</view>
        </view>
        <view v-if="selectedDims.length" class="dim-score">
          <view class="ds-head">
            <view class="ds-tip">按锚点给分（0-10）· 打完让客户反向核对认同</view>
            <view class="ds-sw" :class="{ on: selfEvalOn }" @tap="selfEvalOn = !selfEvalOn">{{ selfEvalOn ? '客户自评：开' : '客户自评：关' }}</view>
          </view>
          <view v-for="dk in selectedDims" :key="dk" class="ds-row">
            <view class="ds-name">{{ dimName(dk) }}<text class="ds-info" @tap="toggleAnchor(dk)">ⓘ</text></view>
            <view v-if="anchorOpen === dk" class="ds-anchor">
              <view class="anc-sec"><b>定义</b>{{ dimDef(dk).def }}</view>
              <view class="anc-sec"><b>子维</b>{{ dimDef(dk).sub }}</view>
              <view class="anc-sec"><b>1-10 标尺</b>{{ dimDef(dk).scale }}</view>
              <view class="anc-sec"><b>↑ 升分信号</b>{{ dimDef(dk).up }}</view>
              <view class="anc-sec"><b>↓ 降分信号</b>{{ dimDef(dk).down }}</view>
              <view class="anc-sec"><b>让客户认同</b>{{ dimDef(dk).script }}</view>
            </view>
            <view class="ds-slider">
              <text class="ds-tag b">经纪人评</text>
              <slider class="sl" min="0" max="10" step="1" :value="dimScores[dk] || 0" show-value activeColor="#c46a3a" @change="onScore($event, dk)"></slider>
            </view>
            <view v-if="selfEvalOn" class="ds-slider">
              <text class="ds-tag s">客户自评</text>
              <slider class="sl" min="0" max="10" step="1" :value="dimSelfScores[dk] || 0" show-value activeColor="#3d5a3e" @change="onSelfScore($event, dk)"></slider>
            </view>
            <view v-if="selfEvalOn" class="self-quiz">
              <button class="sq-open" @tap="openSelfQuiz">📝 让客户答题自评（约 2 分钟，自动算分）</button>
              <view v-if="selfQuizOpen" class="sq-card">
                <view class="sq-head">
                  <text class="sq-prog">第 {{ selfQuizIdx + 1 }} / {{ selfQuizTotal }} 题</text>
                  <text class="sq-close" @tap="closeSelfQuiz">✕</text>
                </view>
                <view class="sq-q">{{ curSelfQ.text }}</view>
                <view class="sq-opts">
                  <view v-for="o in LIKERT" :key="o.v" :class="['sq-opt', { on: selfAnswers[curSelfQ.id] === o.v }]" @tap="pickSelf(o)">
                    <text class="sq-opt-v">{{ o.v }}</text>
                    <text class="sq-opt-t">{{ o.t }}</text>
                  </view>
                </view>
                <view class="sq-foot">
                  <button class="sq-btn ghost" v-if="selfQuizIdx > 0" @tap="prevSelf">上一题</button>
                  <view class="sq-spacer" v-else></view>
                  <button class="sq-btn primary" v-if="selfQuizIdx < selfQuizTotal - 1" :disabled="!selfAnswers[curSelfQ.id]" @tap="nextSelf">下一题</button>
                  <button class="sq-btn primary" v-else :disabled="!selfAnswers[curSelfQ.id]" @tap="submitSelfQuiz">生成自评</button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="label">④ 一句自由诉求（选填）</view>
        <textarea class="ta" v-model="freeText" placeholder="如：800万改善三房，学区还是居住品质纠结" maxlength="120"></textarea>
      </view>

      <view v-if="clientName" class="client-bar">已关联客户：{{ clientName }}（准备结果将存入其认知卡）</view>

      <view class="hint">依据来自真实字典 decoder / see / nego，绝不编造；缺失依据诚实标注「依据整理中」。</view>
      <view v-if="loadError" class="err-msg">{{ loadError }}</view>
      <button class="btn-main" @tap="gen" :disabled="loading">
        {{ loading ? '⏳ 策展中...' : '⚡ 生成见面参谋' }}
      </button>
    </block>

    <!-- 结果态 -->
    <block v-if="result">
      <view class="result-head">
        <view class="rh-axis">{{ result.axisLabel }}<text v-if="result.scenarioName" class="rh-scenario"> · {{ result.scenarioName }}</text></view>
        <view class="rh-dims" v-if="result.dimensionLabels.length">
          <text v-for="(d, i) in result.dimensionLabels" :key="i" class="dim-tag">{{ d }}</text>
        </view>
        <view v-if="result.recommendedTool" class="rh-tool">推荐呈现工具：{{ result.recommendedTool }}</view>
        <view class="honesty">{{ result.honesty.note }}</view>
      </view>

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

      <!-- MOT 四步 Tab（探索 → 提议 → 行动 → 确认，对齐 V3.2.7 原型）-->
      <view class="mot-tabs">
        <view v-for="(m, i) in motSteps" :key="m.key" :class="['mot-tab', { on: activeMot === i }]" @tap="activeMot = i">
          <text class="mt-ico">{{ m.icon }}</text>
          <text class="mt-lbl">{{ m.label }}</text>
        </view>
      </view>

      <view class="sec mot-sec">
        <view class="sec-h"><text class="em">{{ motSteps[activeMot].icon }}</text>{{ motSteps[activeMot].title }}<text class="mot-tag">{{ motSteps[activeMot].label }}</text></view>

        <!-- M1 探索 · 该问的 -->
        <block v-if="motSteps[activeMot].type === 'ask'">
          <view v-for="(a, i) in motSteps[activeMot].items" :key="i" class="ask-item">{{ a.q }}</view>
          <view v-if="!motSteps[activeMot].items.length" class="empty-mini">{{ motSteps[activeMot].empty }}</view>
        </block>

        <!-- M2 提议 · 该说的 FABE -->
        <block v-else-if="motSteps[activeMot].type === 'say'">
          <view v-for="(s, i) in motSteps[activeMot].items" :key="i" class="say-item">
            <view class="say-title">{{ s.title }}</view>
            <view class="say-point">{{ s.point }}</view>
            <view v-if="s.detail" class="say-detail">{{ s.detail }}</view>
            <view class="fabe">
              <view class="fabe-row"><text class="fabe-k">功能</text><text class="fabe-v">{{ s.fabe.f.text }}</text></view>
              <view class="fabe-row"><text class="fabe-k">优势</text><text class="fabe-v">{{ s.fabe.a.text }}</text></view>
              <view class="fabe-row"><text class="fabe-k">利益</text><text class="fabe-v">{{ s.fabe.b.text }}</text></view>
              <view class="fabe-row fabe-evidence">
                <text class="fabe-k">佐证</text>
                <view class="fabe-ev">
                  <text v-if="s.fabe.e.legal" class="ev-ok">✓ 法源：{{ s.fabe.e.legal }}</text>
                  <text v-else class="ev-wait">法源：依据整理中</text>
                  <text v-if="s.fabe.e.data" class="ev-ok">✓ 数据：{{ s.fabe.e.data }}</text>
                  <text v-else class="ev-wait">数据：待补充</text>
                  <text v-if="s.fabe.e.case" class="ev-ok">✓ 案例：{{ s.fabe.e.case }}</text>
                  <text v-else class="ev-wait">案例：待补充</text>
                </view>
              </view>
            </view>
          </view>
          <view v-if="!motSteps[activeMot].items.length" class="empty-mini">{{ motSteps[activeMot].empty }}</view>
        </block>

        <!-- M3 行动 · 该带的 -->
        <block v-else-if="motSteps[activeMot].type === 'bring'">
          <view v-for="(b, i) in motSteps[activeMot].items" :key="i" class="bring-item">
            <view class="bring-title">{{ b.title }}</view>
            <view class="bring-benefit">{{ b.benefit }}</view>
          </view>
          <view v-if="!motSteps[activeMot].items.length" class="empty-mini">{{ motSteps[activeMot].empty }}</view>
        </block>

        <!-- M4 确认 · 见后跟进 -->
        <block v-else-if="motSteps[activeMot].type === 'follow'">
          <view v-for="(f, i) in motSteps[activeMot].items" :key="i" class="follow-item">
            <view class="follow-theme">{{ f.theme }}</view>
            <view class="follow-text">{{ f.text }}</view>
          </view>
          <view v-if="!motSteps[activeMot].items.length" class="empty-mini">{{ motSteps[activeMot].empty }}</view>
        </block>
      </view>

      <!-- 七维洞察（双轨：经纪人评 + 客户自评，含雷达图）-->
      <view class="sec" v-if="dimsInsightEnabled">
        <view class="sec-h"><text class="em">🎯</text>七维需求洞察<text class="mot-tag">双轨</text></view>
        <view class="radar-wrap">
          <image class="radar" :src="radarUrlStr" :style="{ width: radarW + 'px', height: radarH + 'px' }"></image>
        </view>
        <view v-if="radarSelfEval" class="legend"><span class="lg lg-b"></span>经纪人评 <span class="lg lg-s"></span>客户自评</view>
        <view v-for="(it, i) in insightItems" :key="i" class="di-row">
          <view class="di-name">{{ it.name }}<text v-if="it.flag" class="di-flag">⚠ 差异大</text></view>
          <view class="di-bars">
            <view class="di-bar">
              <text class="di-lbl b">经纪</text>
              <view class="di-track"><view class="di-fill b" :style="{ width: (it.broker * 10) + '%' }"></view></view>
              <text class="di-v">{{ it.broker }}</text>
            </view>
            <view class="di-bar" v-if="radarSelfEval">
              <text class="di-lbl s">客户</text>
              <view class="di-track"><view class="di-fill s" :style="{ width: (it.self * 10) + '%' }"></view></view>
              <text class="di-v">{{ it.self }}</text>
            </view>
          </view>
        </view>
        <view class="di-conc">{{ result.dimsInsight.conclusion }}</view>
      </view>

      <!-- V3.0.11 拿得出手 · 呈现工具 -->
      <view class="export-section">
        <view class="export-h">🎁 拿得出手 · 呈现工具</view>
        <view class="export-sub">把这次策展变成可以直接给客户看的专业呈现</view>
        <view class="export-hero" @tap="goClientView">
          <view class="eh-left">
            <view class="eh-name">📱 客户可见页（有形呈现）</view>
            <view class="eh-desc">数据看板 + 真实案例 + 要点速览，一页式转发 / 打印给客户</view>
          </view>
          <view class="eh-arrow">›</view>
        </view>
        <view class="export-grid">
          <view class="export-card" @tap="copyHTML">
            <view class="ec-icon">🌐</view>
            <view class="ec-name">HTML报告</view>
            <view class="ec-desc">复制后在浏览器打开<br/>可直接打印为PDF</view>
          </view>
          <view class="export-card" @tap="showPromptPicker">
            <view class="ec-icon">🤖</view>
            <view class="ec-name">豆包提示词</view>
            <view class="ec-desc">复制后粘贴到豆包<br/>一键生成PPT/视频</view>
          </view>
        </view>
        <view class="export-grid" style="margin-top:8px">
          <view class="export-card export-mini" @tap="copySummary">
            <view class="ec-icon">📋</view>
            <view class="ec-name">摘要文本</view>
            <view class="ec-desc">快速复制要点<br/>微信直接发给客户</view>
          </view>
          <view class="export-card export-mini" @tap="shareReport">
            <view class="ec-icon">📤</view>
            <view class="ec-name">分享给同事</view>
            <view class="ec-desc">转发策展方案<br/>让同事也能参考</view>
          </view>
        </view>
      </view>

      <view class="actions">
        <button class="btn-main" @tap="save" v-if="!saved">✓ 存入客户认知卡</button>
        <button class="btn-line" @tap="result = null" v-if="!saved">← 修改重生成</button>
      </view>
      <view v-if="savedTip && !saved" class="saved-tip">{{ savedTip }}</view>

      <!-- 存完后的下一步引导 -->
      <view v-if="saved" class="next-steps">
        <view class="ns-head">✓ 已存入认知卡，接下来：</view>
        <view class="ns-item" @tap="goClientDetail">
          <text class="ns-icon">📋</text>
          <view class="ns-body">
            <view class="ns-title">去客户档案查看跟进待办</view>
            <view class="ns-desc">{{ result.followups.length }} 条见后跟进已写入「{{ clientName }}」的跟进待办</view>
          </view>
          <text class="ns-arrow">›</text>
        </view>
        <view class="ns-item" @tap="copySummary">
          <text class="ns-icon">💬</text>
          <view class="ns-body">
            <view class="ns-title">复制要点发客户</view>
            <view class="ns-desc">把该说的要点整理成微信消息，见面时直接用</view>
          </view>
          <text class="ns-arrow">›</text>
        </view>
        <view class="ns-item" @tap="copyHTML">
          <text class="ns-icon">🌐</text>
          <view class="ns-body">
            <view class="ns-title">生成 HTML 报告</view>
            <view class="ns-desc">专业呈现，浏览器打开即可给客户看</view>
          </view>
          <text class="ns-arrow">›</text>
        </view>
        <view class="ns-item" @tap="result = null">
          <text class="ns-icon">🔄</text>
          <view class="ns-body">
            <view class="ns-title">为下一个客户生成策展包</view>
            <view class="ns-desc">回到输入，开始服务下一位</view>
          </view>
          <text class="ns-arrow">›</text>
        </view>
      </view>
    </block>

    <!-- 豆包提示词选择浮层 -->
    <view class="overlay" :class="{ active: showPromptOverlay }">
      <view class="ov-nav">
        <button class="back" @tap="showPromptOverlay = false">‹</button>
        <view>
          <view style="font-size:17px;font-weight:700">豆包提示词</view>
          <view class="sub">选一种类型 · 复制后粘贴到豆包即可生成</view>
        </view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="prompt-card" v-for="p in promptTypes" :key="p.key" @tap="copyPrompt(p.key)">
          <view class="pc-head">
            <text class="pc-icon">{{ p.icon }}</text>
            <text class="pc-name">{{ p.name }}</text>
            <text class="pc-badge">{{ p.badge }}</text>
          </view>
          <view class="pc-desc">{{ p.desc }}</view>
          <view class="pc-action">点击复制提示词 →</view>
        </view>
        <view class="prompt-tip">
          <view class="pt-title">📌 使用方法</view>
          <view class="pt-step">1. 点击上方任意类型，提示词自动复制到剪贴板</view>
          <view class="pt-step">2. 打开豆包（doubao.com）或豆包App</view>
          <view class="pt-step">3. 粘贴提示词，豆包会根据策展内容生成PPT/视频/报告</view>
          <view class="pt-step">4. 生成后可二次编辑调整，加上你的个人风格</view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { AXIS_GROUPS, DIMENSIONS, SCENARIOS, generateCuration } from '../../engine.js'
import { buildRadarDataUrl } from '../../radar.js'
import { livingQuestions, LIKERT } from '../../../utils/assess-data.js'
import { useUserStore } from '../../../store/user'
import { trackEvent } from '../../../utils/tracker'
import { generateReportHTML, generateReportSummary } from '../../../utils/report-template.js'
import { getPromptTypes, generatePrompt } from '../../../utils/doubao-prompt.js'

export default {
  data() {
    return {
      axisGroups: AXIS_GROUPS,
      dimensions: DIMENSIONS,
      axisType: 'buy',
      axisNodeKey: 'improve',
      scenario: '',
      selectedDims: [],
      freeText: '',
      dimScores: {},
      dimSelfScores: {},
      anchorOpen: null,
      selfEvalOn: false,
      selfQuizOpen: false,
      selfAnswers: {},
      selfQuizIdx: 0,
      clientId: null,
      clientName: '',
      result: null,
      savedTip: '',
      saved: false,
      showPromptOverlay: false,
      activeMot: 0,
      radarW: 250,
      radarH: 230,
      radarUrlStr: '',
      promptTypes: getPromptTypes(),
      sharePayload: null,
      loading: false,
      loadError: ''
    }
  },
  computed: {
    currentNodes() {
      const g = AXIS_GROUPS.find(x => x.type === this.axisType)
      return g ? g.nodes : []
    },
    currentScenarios() {
      const sc = SCENARIOS[this.axisType] || {}
      return Object.entries(sc).map(([key, val]) => ({ key, name: val.name, icon: val.icon }))
    },
    userStore() { return useUserStore() },
    insightItems() {
      if (!this.result || !this.result.dimsInsight) return []
      return this.result.dimsInsight.items.filter(i => i.hasBroker)
    },
    // MOT 四步 Tab：探索→提议→行动→确认（对齐 V3.2.7 原型）
    motSteps() {
      if (!this.result) return []
      return [
        { key: 'explore', label: 'M1 探索', icon: '❓', title: '该问的（探需求）', items: this.result.ask, type: 'ask', empty: '暂无必问条目 · 建议结合专业判断补充' },
        { key: 'propose', label: 'M2 提议', icon: '📢', title: '该说的（FABE · 每条挂真实依据）', items: this.result.say, type: 'say', empty: '暂无匹配词条 · 该场景知识库持续完善中' },
        { key: 'act', label: 'M3 行动', icon: '🏠', title: '该带的（看房 / 房源方向）', items: this.result.bring, type: 'bring', empty: '暂无强相关条目，建议结合实勘补充' },
        { key: 'confirm', label: 'M4 确认', icon: '💌', title: '见后跟进（持续关怀）', items: this.result.followups, type: 'follow', empty: '暂无跟进条目' }
      ]
    },
    dimsInsightEnabled() {
      return this.result && this.result.dimsInsight && this.result.dimsInsight.enabled
    },
    radarSelfEval() {
      return !!(this.result && this.result.dimsInsight && this.result.dimsInsight.selfEval)
    },
    radarDims() {
      return (this.selectedDims || []).map(k => this.dimName(k))
    },
    radarBroker() {
      return (this.selectedDims || []).map(k => +(this.dimScores[k] || 0))
    },
    radarSelf() {
      return (this.selectedDims || []).map(k => +(this.dimSelfScores[k] || 0))
    },
    radarUrl() {
      // 保留计算属性供外部使用；页面实际用 radarUrlStr（data 属性，在生成时一次性计算）
      if (!this.dimsInsightEnabled || !this.radarDims.length) return ''
      return buildRadarDataUrl({
        W: this.radarW,
        H: this.radarH,
        dims: this.radarDims,
        broker: this.radarBroker,
        self: this.radarSelf,
        selfEval: this.radarSelfEval
      })
    },
    // 客户自评问卷（复用真实题库 livingQuestions，21 题）
    curSelfQ() {
      return livingQuestions[this.selfQuizIdx] || {}
    },
    selfQuizTotal() {
      return livingQuestions.length
    },
  },
  onLoad(options) {
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
  onShareAppMessage() {
    return this.sharePayload || { title: '风声 · 见面策展工具', path: '/package-curation/pages/curate-prep/index' }
  },
  onShareTimeline() {
    return { title: '风声 · 见面策展工具', query: '' }
  },
  methods: {
    pickAxis(type) {
      this.axisType = type
      this.scenario = ''
      const g = AXIS_GROUPS.find(x => x.type === type)
      this.axisNodeKey = g ? g.nodes[0].key : this.axisNodeKey
    },
    toggleDim(key) {
      const i = this.selectedDims.indexOf(key)
      if (i >= 0) this.selectedDims.splice(i, 1)
      else this.selectedDims.push(key)
    },
    dimName(key) {
      const d = DIMENSIONS.find(x => x.key === key)
      return d ? d.name : key
    },
    dimDef(key) {
      const d = DIMENSIONS.find(x => x.key === key) || {}
      return { def: d.def || '', sub: d.sub || '', scale: d.scale || '', up: d.up || '', down: d.down || '', script: d.script || '' }
    },
    toggleAnchor(key) {
      this.anchorOpen = this.anchorOpen === key ? null : key
    },
    onScore(e, key) {
      this.$set(this.dimScores, key, e.detail.value)
    },
    onSelfScore(e, key) {
      this.$set(this.dimSelfScores, key, e.detail.value)
    },
    // ===== 客户自评问卷：真实题库自动算七维分（替代手滑滑块，更真实、数据诚实）=====
    openSelfQuiz() {
      this.selfQuizOpen = true
      this.selfQuizIdx = 0
      this.selfAnswers = {}
    },
    closeSelfQuiz() {
      this.selfQuizOpen = false
    },
    pickSelf(o) {
      this.$set(this.selfAnswers, this.curSelfQ.id, o.v)
    },
    nextSelf() {
      if (this.selfQuizIdx < livingQuestions.length - 1) this.selfQuizIdx++
    },
    prevSelf() {
      if (this.selfQuizIdx > 0) this.selfQuizIdx--
    },
    submitSelfQuiz() {
      const scores = this.calcSelfScores(this.selfAnswers)
      Object.keys(scores).forEach(k => this.$set(this.dimSelfScores, k, scores[k]))
      this.selfQuizOpen = false
      uni.showToast({ title: '客户自评已生成', icon: 'success' })
    },
    calcSelfScores(answers) {
      // 问卷 1-5 Likert → 按维度求均值 → ×2 转 0-10（与现有手滑分制一致，雷达图/客户页无需改动）
      const dims = (this.selectedDims && this.selectedDims.length) ? this.selectedDims : livingQuestions.map(q => q.dim)
      const out = {}
      dims.forEach(dk => {
        const qs = livingQuestions.filter(q => q.dim === dk)
        const valid = qs.filter(q => answers[q.id])
        if (!valid.length) return
        const sum = valid.reduce((a, q) => a + (answers[q.id] || 0), 0)
        out[dk] = Math.round((sum / valid.length) * 2 * 10) / 10
      })
      return out
    },
    gen() {
      this.loading = true
      this.loadError = ''
      // V3.0.13：静态策展数据（634 条精编 slim 包）已覆盖 购/租/售 三线，作为主路径；
      // 实时 API（generateCurationAsync）为 V3.1 增强，待后端数据齐备后启用，避免线上返回稀疏数据。
      Promise.resolve(generateCuration({
        axisType: this.axisType,
        axisNodeKey: this.axisNodeKey,
        dimensions: this.selectedDims,
        freeText: this.freeText,
        scenario: this.scenario,
        dimScores: this.dimScores,
        dimSelfScores: this.dimSelfScores
      })).then(res => {
        this.result = res
        trackEvent('curate_generate', 'curate-prep', { axis: this.axisType, scenario: this.scenario, dims: this.selectedDims.length, sayN: this.result.say.length, followN: this.result.followups.length })
        this.savedTip = ''
        this.loading = false
        this.activeMot = 0
        this.radarUrlStr = (this.dimsInsightEnabled && this.radarDims.length)
          ? buildRadarDataUrl({ W: this.radarW, H: this.radarH, dims: this.radarDims, broker: this.radarBroker, self: this.radarSelf, selfEval: this.radarSelfEval })
          : ''
        uni.pageScrollTo({ scrollTop: 0, duration: 200 })
      }).catch(err => {
        console.error('[curation] generate failed:', err)
        this.loadError = '生成失败，请检查网络后重试'
        this.loading = false
      })
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
      // 把见后跟进写入客户档案 followups[]（可操作待办，不再是"只存了标签"）
      if (this.result.followups && this.result.followups.length) {
        this.userStore.addFollowups(this.clientId, this.result.followups.map(f => ({
          theme: f.theme,
          text: f.text,
          ltrust: '持续关怀'
        })))
      }
      // 联动既有经营记录（时间线 + 记忆点 + 信任积分）
      this.userStore.addTimelineEvent(this.clientId, { type: '策展', summary: '见面参谋生成（' + this.result.axisLabel + ' · ' + this.result.say.length + ' 说 / ' + this.result.followups.length + ' 见后跟进）' })
      this.userStore.addMemoryPoint(this.clientId, '专业准备：基于真实字典生成见面参谋，每条可点开依据')
      this.userStore.markDone('curate')
      this.userStore.earnPoints(10, '完成见面参谋')
      trackEvent('curate_save', 'curate-prep', { clientId: this.clientId, axis: this.axisType })
      this.savedTip = '已存入「' + this.clientName + '」的认知卡 · 信任积分 +10'
      this.saved = true
      uni.showToast({ title: '已存入客户认知卡', icon: 'none' })
    },
    goClientDetail() {
      uni.navigateTo({ url: '/pages/clients/index' })
      setTimeout(() => {
        uni.$emit('openClientDetail', this.clientId)
      }, 300)
    },
    // V3.0.11 呈现工具
    getAgentName() {
      const u = this.userStore
      return (u && u.profile && u.profile.name) || '风声经纪人'
    },
    getReportOpts() {
      return {
        agentName: this.getAgentName(),
        clientName: this.clientName || '',
        dateStr: new Date().toLocaleDateString('zh-CN')
      }
    },
    copyHTML() {
      const html = generateReportHTML(this.result, this.getReportOpts())
      uni.setClipboardData({
        data: html,
        success: () => {
          trackEvent('report_copy_html', 'curate-prep', { sayN: this.result.say.length })
          uni.showModal({
            title: 'HTML已复制',
            content: '已复制完整报告HTML。请打开手机浏览器，粘贴到地址栏或保存为.html文件即可查看，也可打印为PDF。',
            showCancel: false,
            confirmText: '知道了'
          })
        },
        fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      })
    },
    copySummary() {
      const text = generateReportSummary(this.result, this.getReportOpts())
      uni.setClipboardData({
        data: text,
        success: () => {
          trackEvent('report_copy_summary', 'curate-prep', {})
          uni.showToast({ title: '摘要已复制 · 可直接粘贴发送', icon: 'none' })
        },
        fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
      })
    },
    showPromptPicker() {
      this.showPromptOverlay = true
    },
    copyPrompt(type) {
      const prompt = generatePrompt(type, this.result, this.getReportOpts())
      uni.setClipboardData({
        data: prompt,
        success: () => {
          trackEvent('report_copy_prompt', 'curate-prep', { type })
          this.showPromptOverlay = false
          uni.showModal({
            title: '提示词已复制',
            content: '请打开豆包（doubao.com），粘贴提示词即可生成。生成后可二次编辑调整。',
            showCancel: true,
            confirmText: '去豆包',
            cancelText: '知道了',
            success: (res) => {
              if (res.confirm) {
                // 小程序内无法直接打开外部链接，提示用户
                uni.showToast({ title: '请在浏览器打开 doubao.com', icon: 'none' })
              }
            }
          })
        },
        fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
      })
    },
    shareReport() {
      this.sharePayload = {
        title: '我为你准备了这次见面的专业方案 · 风声策展',
        path: '/package-curation/pages/curate-prep/index'
      }
      trackEvent('report_share', 'curate-prep', {})
      uni.showToast({ title: '点击右上角分享给同事', icon: 'none' })
    },
    goClientView() {
      const q = [
        'axisType=' + this.axisType,
        'axisNodeKey=' + this.axisNodeKey,
        'scenario=' + this.scenario,
        'freeText=' + encodeURIComponent(this.freeText || ''),
        'dimensions=' + encodeURIComponent((this.selectedDims || []).join(',')),
        'dimScores=' + encodeURIComponent(JSON.stringify(this.dimScores || {})),
        'dimSelfScores=' + encodeURIComponent(JSON.stringify(this.dimSelfScores || {}))
      ].join('&')
      trackEvent('curate_client_enter', 'curate-prep', { axis: this.axisType, scenario: this.scenario })
      uni.navigateTo({ url: '/package-curation/pages/curate-client/index?' + q })
    }
  }
}
</script>

<style scoped>
.page { padding: 14px; background: #f7f4ef; min-height: 100vh; box-sizing: border-box; }
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
.scenarios { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sc-item { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; }
.sc-item.on { background: #3d5a3e; color: #fff; font-weight: 700; }
.dims { display: flex; flex-wrap: wrap; gap: 8px; }
.dim-item { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; }
.dim-item.on { background: #eef3ec; color: #3d5a3e; border: 1px solid #3d5a3e; font-weight: 700; }
.ta { width: 100%; height: 72px; background: #f7f4ef; border-radius: 10px; padding: 10px; font-size: 14px; box-sizing: border-box; color: #2b2b2b; }
.client-bar { background: #eef3ec; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #3d5a3e; margin-bottom: 10px; }
.hint { font-size: 11px; color: #C8956D; background: #fbf6ee; padding: 8px 10px; border-radius: 8px; margin-bottom: 12px; line-height: 1.5; }
.btn-main { background: #c46a3a; color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 12px; padding: 12px; font-size: 14px; margin-top: 8px; }
.result-head { background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.rh-axis { font-size: 16px; font-weight: 700; color: #2b2b2b; }
.rh-scenario { font-size: 14px; font-weight: 500; color: #c46a3a; }
.rh-tool { font-size: 12px; color: #3d5a3e; background: #eef3ec; padding: 4px 8px; border-radius: 6px; margin-top: 6px; display: inline-block; }
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
.mot-tag { font-size: 11px; font-weight: 700; color: #fff; background: #3d5a3e; padding: 2px 9px; border-radius: 10px; margin-left: auto; flex-shrink: 0; }
.fabe { margin-top: 8px; background: #fff; border: 1px solid #e7e0d4; border-radius: 8px; padding: 8px 10px; }
.fabe-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px dashed #f0ece2; }
.fabe-row:last-child { border-bottom: none; }
.fabe-k { flex-shrink: 0; width: 32px; font-size: 12px; font-weight: 700; color: #c46a3a; line-height: 1.5; }
.fabe-v { flex: 1; font-size: 12px; color: #444; line-height: 1.55; }
.fabe-ev { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.ev-ok { align-self: flex-start; font-size: 11px; color: #3d5a3e; background: #eef3ec; border-radius: 5px; padding: 3px 7px; line-height: 1.45; }
.ev-wait { font-size: 11px; color: #aaa; line-height: 1.45; }
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
.export-section { background: #fff; border-radius: 14px; padding: 16px 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.export-hero { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #3d5a3e, #4d6e4e); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.export-hero:active { opacity: 0.92; }
.eh-left { flex: 1; min-width: 0; }
.eh-name { font-size: 15px; font-weight: 700; color: #fff; }
.eh-desc { font-size: 11.5px; color: rgba(255,255,255,0.85); margin-top: 3px; line-height: 1.4; }
.eh-arrow { font-size: 22px; color: #f3c9a8; flex-shrink: 0; }
.export-h { font-size: 16px; font-weight: 700; color: #3d5a3e; }
.export-sub { font-size: 12px; color: #8a837a; margin-top: 4px; line-height: 1.5; }
.export-grid { display: flex; gap: 10px; margin-top: 12px; }
.export-card { flex: 1; background: linear-gradient(135deg, #f7f4ef, #fff); border: 1px solid #e7e0d4; border-radius: 12px; padding: 14px 12px; text-align: center; }
.export-card.export-mini { padding: 10px 8px; }
.export-card:active { background: #f0ece2; }
.ec-icon { font-size: 28px; margin-bottom: 6px; }
.export-mini .ec-icon { font-size: 22px; }
.ec-name { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.export-mini .ec-name { font-size: 13px; }
.ec-desc { font-size: 11px; color: #8a837a; margin-top: 4px; line-height: 1.4; }
.overlay { position: fixed; inset: 0; z-index: 50; background: #f7f4ef; transform: translateY(100%); transition: transform .25s ease; pointer-events: none; display: flex; flex-direction: column; }
.overlay.active { transform: translateY(0); pointer-events: auto; }
.ov-nav { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #e7e0d4; }
.ov-nav .back { background: none; border: none; font-size: 22px; color: #3d5a3e; line-height: 1; }
.ov-nav .sub { font-size: 12px; color: #888; margin-top: 2px; }
.ovcontent { flex: 1; padding: 16px; overflow-y: auto; padding-bottom: calc(10px + 110rpx + env(safe-area-inset-bottom)); }
.prompt-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.prompt-card:active { background: #f7f4ef; }
.pc-head { display: flex; align-items: center; gap: 8px; }
.pc-icon { font-size: 22px; }
.pc-name { font-size: 15px; font-weight: 700; color: #2b2b2b; flex: 1; }
.pc-badge { font-size: 10px; color: #c46a3a; background: #fbf6ee; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.pc-desc { font-size: 12px; color: #777; margin-top: 6px; line-height: 1.5; }
.pc-action { font-size: 13px; color: #3d5a3e; font-weight: 700; margin-top: 8px; }
.prompt-tip { background: #eef3ec; border-radius: 12px; padding: 14px; margin-top: 6px; }
.pt-title { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 8px; }
.pt-step { font-size: 12px; color: #555; line-height: 1.6; padding: 2px 0; }
.next-steps { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 14px; margin-top: 12px; }
.ns-head { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 12px; }
.ns-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #e7e0d4; }
.ns-item:last-child { border-bottom: none; }
.ns-item:active { background: #f7f4ef; }
.ns-icon { font-size: 24px; flex-shrink: 0; }
.ns-body { flex: 1; min-width: 0; }
.ns-title { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.ns-desc { font-size: 12px; color: #8a837a; margin-top: 2px; line-height: 1.4; }
.ns-arrow { font-size: 20px; color: #c8956d; flex-shrink: 0; }
.err-msg { background: #fff0f0; color: #c0392b; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px; text-align: center; }
.btn-main:disabled { opacity: 0.6; }
/* ===== 七维评分（V3.2 生产化）===== */
/* 客户自评问卷（真实题库，自动算七维分）*/
.self-quiz { margin-top: 10px; }
.sq-open { background: #eef3ec; color: #3d5a3e; border: 1px solid #c9d8c9; border-radius: 10px; font-size: 13px; font-weight: 700; padding: 10px; line-height: 1.3; }
.sq-card { margin-top: 8px; background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 14px; }
.sq-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sq-prog { font-size: 12px; color: #8a837a; font-weight: 700; }
.sq-close { font-size: 16px; color: #b0a99e; padding: 0 4px; }
.sq-q { font-size: 15px; font-weight: 700; color: #2b2b2b; line-height: 1.5; margin-bottom: 14px; }
.sq-opts { display: flex; flex-direction: column; gap: 8px; }
.sq-opt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e7e0d4; border-radius: 9px; background: #f7f4ef; }
.sq-opt.on { border-color: #3d5a3e; background: #eef3ec; }
.sq-opt-v { width: 22px; height: 22px; border-radius: 50%; background: #3d5a3e; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sq-opt-t { font-size: 13px; color: #555; }
.sq-foot { display: flex; gap: 10px; margin-top: 14px; }
.sq-spacer { flex: 1; }
.sq-btn { flex: 1; border-radius: 20px; font-size: 14px; font-weight: 700; padding: 10px; line-height: 1.2; }
.sq-btn.ghost { background: #fff; color: #8a837a; border: 1px solid #e7e0d4; }
.sq-btn.primary { background: #3d5a3e; color: #fff; }
.sq-btn.primary[disabled] { background: #c9c4ba; color: #f0ece2; }
.dim-score { margin-top: 12px; background: #f7f4ef; border-radius: 12px; padding: 12px; }
.ds-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.ds-tip { font-size: 11.5px; color: #8a837a; line-height: 1.4; flex: 1; }
.ds-sw { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #8a837a; background: #fff; border: 1px solid #e0d8c8; border-radius: 14px; padding: 5px 12px; }
.ds-sw.on { color: #fff; background: #3d5a3e; border-color: #3d5a3e; }
.ds-row { padding: 10px 0; border-bottom: 1px dashed #e7e0d4; }
.ds-row:last-child { border-bottom: none; }
.ds-name { font-size: 14px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; gap: 6px; }
.ds-info { font-size: 13px; color: #c46a3a; background: #fbf6ee; border: 1px solid #f0d9c6; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 18px; }
.ds-anchor { margin: 8px 0; background: #fff; border: 1px solid #e7e0d4; border-radius: 10px; padding: 10px 12px; }
.anc-sec { font-size: 11.5px; color: #555; line-height: 1.55; padding: 3px 0; }
.anc-sec b { color: #3d5a3e; margin-right: 4px; }
.ds-slider { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.ds-tag { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }
.ds-tag.b { color: #c46a3a; background: #fbf1ea; }
.ds-tag.s { color: #3d5a3e; background: #eef3ec; }
.sl { flex: 1; }
/* 七维洞察（结果）*/
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
/* ===== MOT 四步 Tab（V3.2.7 表现层补全）===== */
.mot-tabs { display: flex; background: #fff; border-radius: 12px; padding: 4px; margin-bottom: 12px; border: 1px solid #efe9dd; }
.mot-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; font-size: 12px; color: #8a837a; border-radius: 8px; }
.mot-tab.on { background: #3d5a3e; color: #fff; font-weight: 700; }
.mt-ico { font-size: 16px; line-height: 1.1; }
.mt-lbl { font-size: 11px; }
.mot-sec { margin-bottom: 12px; }
.radar-wrap { display: flex; justify-content: center; padding: 6px 0 2px; }
.radar { display: block; }
.legend { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 11px; color: #6b6359; margin: 6px 0 2px; }
.lg { display: inline-block; width: 14px; height: 8px; border-radius: 4px; }
.lg-b { background: #c46a3a; }
.lg-s { background: #3d5a3e; }
</style>
