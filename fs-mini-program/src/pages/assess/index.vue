<template>
  <view class="page">
    <!-- Tab 切换 -->
    <view class="assess-tabs">
      <view class="assess-tab" :class="{ active: tab === 'a' }" @tap="tab = 'a'">🏠 住得好测评</view>
      <view class="assess-tab" :class="{ active: tab === 'b' }" @tap="tab = 'b'">👤 服务者能力</view>
    </view>

    <!-- ========== Tab A：住得好测评（7维度） ========== -->
    <view v-if="tab === 'a'">
      <!-- 封面 -->
      <view v-if="phase_a === 'intro'" class="intro-card">
        <view class="ic-title">🏠 住得好测评</view>
        <view class="ic-sub">美好居住 7 维度评分</view>
        <view class="ic-dims">安全 · 健康 · 便利 · 经济 · 舒适 · 美观 · 自在</view>
        <view class="ic-info"><text>⏱️ 约 5 分钟</text><text>📝 7 题</text><text>📊 雷达图报告</text></view>
        <view class="ic-hint">测完结果可一键同步到「需求洞察报告」</view>
        <button class="ic-btn" @tap="startA">开始测评</button>
      </view>

      <!-- 答题中 -->
      <view v-if="phase_a === 'doing'" class="quiz-wrap">
        <view class="quiz-progress">
          <text>第 {{ q_a + 1 }} / {{ Q_A.length }} 题</text>
          <view class="prog-bar"><view class="prog-fill" :style="{ width: ((q_a) / Q_A.length * 100) + '%' }"></view></view>
        </view>
        <view class="q-card">
          <view class="q-dim-badge" :style="{ background: Q_A[q_a].dimColor + '22', color: Q_A[q_a].dimColor }">
            {{ Q_A[q_a].dimEmoji }} {{ Q_A[q_a].dim }}
          </view>
          <view class="q-text">{{ Q_A[q_a].q }}</view>
          <view class="q-opts">
            <view v-for="(o, i) in Q_A[q_a].opts" :key="i"
              :class="['q-opt', { sel: ans_a[q_a] === i }]"
              @tap="pickA(q_a, i)">
              <text class="q-opt-label">{{ String.fromCharCode(65 + i) }}</text>
              <text class="q-opt-text">{{ o.label }}</text>
              <text class="q-opt-score" v-if="ans_a[q_a] === i">{{ o.label === '完全符合' ? 100 : o.label === '比较符合' ? 75 : o.label === '一般' ? 50 : o.label === '不太符合' ? 25 : 0 }}分</text>
            </view>
          </view>
        </view>
        <view class="q-foot">
          <button class="q-prev" v-if="q_a > 0" @tap="q_a--">‹ 上一题</button>
          <button class="q-next" v-if="q_a < Q_A.length - 1" :disabled="ans_a[q_a] === undefined" @tap="q_a++">下一题 ›</button>
          <button class="q-submit" v-if="q_a === Q_A.length - 1" :disabled="ans_a[q_a] === undefined" @tap="submitA">提交报告 →</button>
        </view>
      </view>

      <!-- 结果页 -->
      <view v-if="phase_a === 'result'" class="result-wrap">
        <view class="res-card">
          <view class="res-title">🏠 你的住得好评分</view>
          <view class="res-score">{{ resScore_a }}/100</view>
          <view class="res-label">{{ resLabel_a }}</view>
          <view class="res-radar">
            <canvas canvas-id="radarA" id="radarA" class="radar-canvas"></canvas>
            <view class="radar-legend">
              <view v-for="d in Q_A" :key="d.key" class="rl-item">
                <text class="rl-dot" :style="{ background: d.dimColor }"></text>
                <text class="rl-name">{{ d.dim }}</text>
                <text class="rl-score">{{ resDims_a[d.key] }}分</text>
              </view>
            </view>
          </view>
          <view class="res-insights">
            <view v-for="d in topDims_a" :key="d.key" class="ri-item">
              <text class="ri-emoji">{{ d.dimEmoji }}</text>
              <view>
                <view class="ri-dim">{{ d.dim }}</view>
                <view class="ri-tip">{{ d.tip }}</view>
              </view>
            </view>
          </view>
        </view>
        <view class="res-actions">
          <button class="ra-sync" @tap="syncToInsight">📤 同步到客户需求洞察</button>
          <button class="ra-again" @tap="resetA">重新测评</button>
        </view>
      </view>
    </view>
    <view v-if="tab === 'b'">
      <view v-if="phase_b === 'intro'" class="intro-card">
        <view class="ic-title">👤 服务者能力自评</view>
        <view class="ic-sub">5 维度能力评估</view>
        <view class="ic-dims">专业知识 · 服务规范 · 沟通能力 · 工具应用 · 职业素养</view>
        <view class="ic-info"><text>⏱️ 约 10 分钟</text><text>📝 15 题</text><text>📊 能力雷达图</text></view>
        <view class="ic-hint">了解自己在哪些维度领先，哪些需要专项提升</view>
        <button class="ic-btn" @tap="startB">开始自评</button>
      </view>

      <view v-if="phase_b === 'doing'" class="quiz-wrap">
        <view class="quiz-progress">
          <text>第 {{ q_b + 1 }} / {{ Q_B.length }} 题</text>
          <view class="prog-bar"><view class="prog-fill" :style="{ width: ((q_b) / Q_B.length * 100) + '%' }"></view></view>
        </view>
        <view class="q-card">
          <view class="q-dim-badge" :style="{ background: Q_B[q_b].dimColor + '22', color: Q_B[q_b].dimColor }">
            {{ Q_B[q_b].dimEmoji }} {{ Q_B[q_b].dim }}
          </view>
          <view class="q-text">{{ Q_B[q_b].q }}</view>
          <view class="q-opts">
            <view v-for="(o, i) in Q_B[q_b].opts" :key="i"
              :class="['q-opt', { sel: ans_b[q_b] === i }]"
              @tap="pickB(q_b, i)">
              <text class="q-opt-label">{{ String.fromCharCode(65 + i) }}</text>
              <text class="q-opt-text">{{ o.label }}</text>
              <text class="q-opt-score" v-if="ans_b[q_b] === i">{{ o.score }}分</text>
            </view>
          </view>
        </view>
        <view class="q-foot">
          <button class="q-prev" v-if="q_b > 0" @tap="q_b--">‹ 上一题</button>
          <button class="q-next" v-if="q_b < Q_B.length - 1" :disabled="ans_b[q_b] === undefined" @tap="q_b++">下一题 ›</button>
          <button class="q-submit" v-if="q_b === Q_B.length - 1" :disabled="ans_b[q_b] === undefined" @tap="submitB">提交报告 →</button>
        </view>
      </view>

      <view v-if="phase_b === 'result'" class="result-wrap">
        <view class="res-card">
          <view class="res-title">👤 服务者能力自评</view>
          <view class="res-score">{{ resScore_b }}/100</view>
          <view class="res-label">综合能力水平</view>
          <view class="res-radar">
            <canvas canvas-id="radarB" id="radarB" class="radar-canvas"></canvas>
            <view class="radar-legend">
              <view v-for="d in dimB" :key="d.key" class="rl-item">
                <text class="rl-dot" :style="{ background: d.color }"></text>
                <text class="rl-name">{{ d.name }}</text>
                <text class="rl-score">{{ resDims_b[d.key] }}分</text>
              </view>
            </view>
          </view>
          <view class="res-insights">
            <view v-for="d in topDims_b" :key="d.key" class="ri-item">
              <text class="ri-emoji">{{ d.emoji }}</text>
              <view>
                <view class="ri-dim">{{ d.name }}</view>
                <view class="ri-tip">{{ d.tip }}</view>
              </view>
            </view>
          </view>
        </view>
        <view class="res-actions">
          <button class="ra-again" @tap="resetB">重新自评</button>
        </view>
      </view>
    </view>

    <!-- ★ V3.7.2 同步到洞察：客户选择浮层 -->
    <view v-if="showSyncPicker" class="sync-overlay">
      <view class="so-head">
        <button class="so-back" @tap="showSyncPicker = false">‹</button>
        <view>
          <view class="so-title">选择同步客户</view>
          <view class="so-sub">测评七维结果将写入该客户的「需求洞察报告」</view>
        </view>
      </view>
      <scroll-view class="so-list" scroll-y="true">
        <view v-if="clientList.length === 0" class="so-empty">
          <view class="so-empty-icon">👤</view>
          <view class="so-empty-t">还没有客户</view>
          <view class="so-empty-s">请先到「客户档案」新建客户，再来同步测评结果</view>
        </view>
        <view class="so-item" v-for="c in clientList" :key="c.id" @tap="doSyncToClient(c)">
          <view class="so-item-avatar">{{ c.surname }}</view>
          <view class="so-item-body">
            <view class="so-item-name">{{ c.name }}</view>
            <view class="so-item-meta">{{ c.rel }} · {{ c.stage || '未填阶段' }}</view>
          </view>
          <view class="so-item-tag" v-if="hasInsightScores(c)">已同步</view>
          <view class="so-item-tag so-item-tag-warn" v-else-if="hasInsightScoresLegacy(c)">有洞察分值</view>
          <text class="so-item-arrow">›</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'

// 住得好测评：7 维度 × 1 题
const Q_A = [
  { key: 'safety', dim: '物质安全', dimEmoji: '🛡', dimColor: '#c0392b',
    q: '你目前居住的房子，产权清晰、无纠纷风险，让你安心居住？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'health', dim: '健康', dimEmoji: '💪', dimColor: '#27ae60',
    q: '你居住的环境通风好、采光足、噪音低，有利于身心健康？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'conv', dim: '便利', dimEmoji: '🚇', dimColor: '#2f6fb0',
    q: '从家出发，通勤、购物、就医、孩子上学都方便，日常动线顺畅？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'econ', dim: '经济', dimEmoji: '💰', dimColor: '#e67e22',
    q: '目前的居住成本（房租/房贷 + 物业水电等）在你的收入中占比合理，不影响生活质量？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'comfort', dim: '舒适', dimEmoji: '🛋', dimColor: '#8e44ad',
    q: '房子户型方正、面积够用，收纳充足，居住起来很舒适？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'beauty', dim: '美观', dimEmoji: '🌿', dimColor: '#c46a3a',
    q: '小区绿化好、环境整洁、邻里素质高，视觉和心情都愉悦？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
  { key: 'free', dim: '自在', dimEmoji: '☀️', dimColor: '#7f8c8d',
    q: '在这里住，你感到自由、有归属感，家人各得其所、生活愉快？',
    opts: [
      { label: '完全符合', score: 100 }, { label: '比较符合', score: 75 },
      { label: '一般', score: 50 }, { label: '不太符合', score: 25 }, { label: '完全不符合', score: 0 }
    ] },
]

// 服务者能力：5 维度 × 3 题
const dimB = [
  { key: 'knowledge', name: '专业知识', emoji: '📚', color: '#3d5a3e',
    tip: '熟悉交易流程、法规政策，能回答客户专业问题' },
  { key: 'standard', name: '服务规范', emoji: '📋', color: '#2f6fb0',
    tip: '按标准流程服务，信息同步及时、有据可查' },
  { key: 'communicate', name: '沟通能力', emoji: '💬', color: '#c46a3a',
    tip: '能根据客户性格切频道，需求问得准、异议处理得好' },
  { key: 'tool', name: '工具应用', emoji: '🛠', color: '#e67e22',
    tip: '善用策展包、词典、案例库等工具提升服务效率' },
  { key: 'ethics', name: '职业素养', emoji: '⭐', color: '#8e44ad',
    tip: '诚信守信、把客户利益放前面、持续学习提升' },
]
const Q_B = [
  // 专业知识
  { key: 'knowledge', dim: '专业知识', dimEmoji: '📚', dimColor: '#3d5a3e',
    q: '你能清晰解释「满五唯一」「赎楼」「资金监管」等交易核心术语吗？',
    opts: [
      { label: '非常熟练，能举例说明', score: 100 }, { label: '基本能讲清楚', score: 75 },
      { label: '大概知道，但不够准确', score: 50 }, { label: '不太清楚，需要查资料', score: 25 }
    ] },
  { key: 'knowledge', dim: '专业知识', dimEmoji: '📚', dimColor: '#3d5a3e',
    q: '面对客户问「这套房能贷款多少」「税费怎么算」，你能当场给出准确数字吗？',
    opts: [
      { label: '随时能算出来', score: 100 }, { label: '带个计算器可以', score: 75 },
      { label: '需要回公司查', score: 50 }, { label: '经常说不清楚', score: 25 }
    ] },
  { key: 'knowledge', dim: '专业知识', dimEmoji: '📚', dimColor: '#3d5a3e',
    q: '本地最新的限购政策、利率区间、学区划片规则，你能说清楚吗？',
    opts: [
      { label: '随时准确说出来', score: 100 }, { label: '大概知道方向', score: 75 },
      { label: '不确定，需要核实', score: 50 }, { label: '经常答错', score: 25 }
    ] },
  // 服务规范
  { key: 'standard', dim: '服务规范', dimEmoji: '📋', dimColor: '#2f6fb0',
    q: '委托后第一天，你会主动给客户发「服务启动清单」吗？',
    opts: [
      { label: '每次都发，而且是书面版', score: 100 }, { label: '口头说一遍', score: 75 },
      { label: '想起来就说，想不起来就算了', score: 50 }, { label: '基本不说', score: 25 }
    ] },
  { key: 'standard', dim: '服务规范', dimEmoji: '📋', dimColor: '#2f6fb0',
    q: '每次带看结束后，你会当天给客户发带看小结吗？',
    opts: [
      { label: '每次都发书面小结', score: 100 }, { label: '口头说一下', score: 75 },
      { label: '偶尔发', score: 50 }, { label: '几乎不发', score: 25 }
    ] },
  { key: 'standard', dim: '服务规范', dimEmoji: '📋', dimColor: '#2f6fb0',
    q: '重要决策节点（出价/签约/贷款审批），你会 2 小时内主动告知客户吗？',
    opts: [
      { label: '每次都做到', score: 100 }, { label: '基本做到', score: 75 },
      { label: '有时忘了', score: 50 }, { label: '经常让客户来问', score: 25 }
    ] },
  // 沟通能力
  { key: 'communicate', dim: '沟通能力', dimEmoji: '💬', dimColor: '#c46a3a',
    q: '第一次见面 3 分钟内，你能判断出客户是结果导向/关系导向/理智型吗？',
    opts: [
      { label: '基本能判断准', score: 100 }, { label: '大概能感受到', score: 75 },
      { label: '接触几次才能判断', score: 50 }, { label: '分不清', score: 25 }
    ] },
  { key: 'communicate', dim: '沟通能力', dimEmoji: '💬', dimColor: '#c46a3a',
    q: '面对「太贵了」「我再想想」这类异议，你通常怎么回应？',
    opts: [
      { label: '有结构化的异议处理方法', score: 100 }, { label: '能说一些理由', score: 75 },
      { label: '跟着感觉走', score: 50 }, { label: '不知道怎么接', score: 25 }
    ] },
  { key: 'communicate', dim: '沟通能力', dimEmoji: '💬', dimColor: '#c46a3a',
    q: '你能根据客户性格（红蓝绿）调整自己的沟通方式吗？',
    opts: [
      { label: '有意识切换，沟通效果好', score: 100 }, { label: '偶尔会注意', score: 75 },
      { label: '基本用同一种方式', score: 50 }, { label: '从不区分', score: 25 }
    ] },
  // 工具应用
  { key: 'tool', dim: '工具应用', dimEmoji: '🛠', dimColor: '#e67e22',
    q: '每次见面之前，你会用「策展包」提前准备吗？',
    opts: [
      { label: '每次都认真准备', score: 100 }, { label: '重要客户会准备', score: 75 },
      { label: '偶尔准备', score: 50 }, { label: '基本不准备', score: 25 }
    ] },
  { key: 'tool', dim: '工具应用', dimEmoji: '🛠', dimColor: '#e67e22',
    q: '遇到专业问题（法条/政策/税费），你会查词典/案例库再回复客户吗？',
    opts: [
      { label: '每次都查依据再回复', score: 100 }, { label: '重要问题会查', score: 75 },
      { label: '偶尔查', score: 50 }, { label: '凭经验直接说', score: 25 }
    ] },
  { key: 'tool', dim: '工具应用', dimEmoji: '🛠', dimColor: '#e67e22',
    q: '你会用雷达图、客户描摹表等工具记录和呈现客户需求吗？',
    opts: [
      { label: '经常用，且给客户看', score: 100 }, { label: '自己记，但不给客户看', score: 75 },
      { label: '偶尔用', score: 50 }, { label: '不用这些工具', score: 25 }
    ] },
  // 职业素养
  { key: 'ethics', dim: '职业素养', dimEmoji: '⭐', dimColor: '#8e44ad',
    q: '面对客户关于房屋缺陷的询问，你会主动告知不利因素吗？',
    opts: [
      { label: '主动说，不隐瞒', score: 100 }, { label: '客户问才说', score: 75 },
      { label: '看情况决定说不说', score: 50 }, { label: '尽量不说，怕影响成交', score: 25 }
    ] },
  { key: 'ethics', dim: '职业素养', dimEmoji: '⭐', dimColor: '#8e44ad',
    q: '你会定期回访已成交客户，主动提供有价值的信息吗？',
    opts: [
      { label: '有计划地定期回访', score: 100 }, { label: '有回访但不定期', score: 75 },
      { label: '客户找我才回应', score: 50 }, { label: '成交后基本不联系', score: 25 }
    ] },
  { key: 'ethics', dim: '职业素养', dimEmoji: '⭐', dimColor: '#8e44ad',
    q: '过去 3 个月，你主动学习过多少次行业政策/专业知识（看资料/听课/请教同行）？',
    opts: [
      { label: '每月 2 次以上', score: 100 }, { label: '每月 1 次', score: 75 },
      { label: '偶尔', score: 50 }, { label: '几乎没有', score: 25 }
    ] },
]

export default {
  data() {
    return {
      tab: 'a',
      // 住得好
      phase_a: 'intro', q_a: 0, ans_a: {}, resDims_a: {}, resScore_a: 0, resLabel_a: '',
      // 服务者
      phase_b: 'intro', q_b: 0, ans_b: {}, resDims_b: {}, resScore_b: 0,
      // ★ V3.7.2 同步到洞察
      showSyncPicker: false,
    }
  },
  computed: {
    Q_A: () => Q_A,
    Q_B: () => Q_B,
    dimB: () => dimB,
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients },
    hasInsightScores() {
      return (c) => {
        const d = c.lifecycle && c.lifecycle.insightData
        // ★ V3.7.3 以「是否同步过测评」判定，而非是否有洞察分值
        return !!(d && d.assessSource && d.assessAt)
      }
    },
    hasInsightScoresLegacy() {
      return (c) => {
        const d = c.lifecycle && c.lifecycle.insightData
        // 旧数据：只有洞察分值但没有测评来源（如策展录入的七维），提示可覆盖
        return !!(d && d.scores && Object.keys(d.scores).length && !(d.assessSource && d.assessAt))
      }
    },
    topDims_a() {
      return Q_A.filter(d => this.resDims_a[d.key] >= 75)
        .sort((a, b) => this.resDims_a[b.key] - this.resDims_a[a.key])
        .slice(0, 3)
    },
    topDims_b() {
      return dimB.filter(d => this.resDims_b[d.key] >= 75)
        .sort((a, b) => this.resDims_b[b.key] - this.resDims_b[a.key])
        .slice(0, 3)
    },
  },
  onShow() { trackPageview('assess') },
  methods: {
    // 住得好
    startA() { this.phase_a = 'doing'; this.q_a = 0; this.ans_a = {} },
    pickA(idx, oIdx) { this.ans_a[idx] = oIdx; this.$forceUpdate && this.$forceUpdate() },
    submitA() {
      if (this.ans_a[this.q_a] === undefined) return
      const scores = {}
      Q_A.forEach(d => {
        const oIdx = this.ans_a[Q_A.indexOf(d)]
        scores[d.key] = oIdx !== undefined ? Q_A[Q_A.indexOf(d)].opts[oIdx].score : 50
      })
      this.resDims_a = scores
      const total = Object.values(scores).reduce((s, v) => s + v, 0) / Q_A.length
      this.resScore_a = Math.round(total)
      this.resLabel_a = this.resScore_a >= 85 ? '住得很棒！' : this.resScore_a >= 70 ? '居住体验良好' : this.resScore_a >= 55 ? '有提升空间' : '需要改善居住条件'
      this.phase_a = 'result'
      // 记录（带分值，可追溯）
      this.userStore.addAssessment({
        type: 'a', title: '住得好测评',
        scores: scores, total: this.resScore_a
      })
      this.userStore.markDone('assess')
      this.userStore.earnPoints(8, '完成品质测评')
      setTimeout(() => this.drawRadarA(), 300)
    },
    resetA() { this.phase_a = 'intro'; this.q_a = 0; this.ans_a = {} },
    // ★ V3.7.2 同步到洞察：打开客户选择浮层
    syncToInsight() {
      if (!this.resDims_a || !Object.keys(this.resDims_a).length) return
      if (!this.clientList.length) {
        uni.showToast({ title: '请先在「客户档案」新建客户', icon: 'none' })
        return
      }
      this.showSyncPicker = true
    },
    // 确认写入所选客户的洞察报告
    doSyncToClient(c) {
      const isReSync = this.hasInsightScores(c)
      const ok = this.userStore.applyAssessmentToClient(c.id, {
        type: 'a', title: '住得好测评',
        scores: this.resDims_a, total: this.resScore_a
      })
      this.showSyncPicker = false
      if (ok) {
        uni.showModal({
          title: isReSync ? '已更新 ✓' : '已同步 ✓',
          content: isReSync
            ? `已用本次测评结果更新「${c.name}」的洞察报告七维分值（来源标注同步刷新）。`
            : `住得好测评结果已写入「${c.name}」的需求洞察报告，可直接在洞察页查看雷达图。`,
          confirmText: '去洞察页',
          cancelText: '留在此页',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/package-mot/pages/insight/index?clientId=' + c.id })
            }
          }
        })
      } else {
        uni.showToast({ title: '同步失败，请重试', icon: 'none' })
      }
    },
    drawRadarA() {
      try {
        const ctx = uni.createCanvasContext('radarA', this)
        const W = 200, H = 200, CX = W / 2, CY = H / 2, R = 78
        const dims = Q_A; const n = dims.length
        const angleStep = (2 * Math.PI) / n
        // 背景圆
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2
            const x = CX + R * (r / 4) * Math.cos(angle)
            const y = CY + R * (r / 4) * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.closePath(); ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        // 轴线
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(CX, CY)
          ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
          ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        // 数据
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const s = Math.min(100, Math.max(0, this.resDims_a[dims[i].key] || 0))
          const x = CX + R * (s / 100) * Math.cos(angle)
          const y = CY + R * (s / 100) * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(61, 90, 62, 0.25)'; ctx.fill()
        ctx.strokeStyle = '#3d5a3e'; ctx.lineWidth = 2; ctx.stroke()
        ctx.draw()
      } catch (e) { console.warn('[radarA]', e) }
    },
    // 服务者
    startB() { this.phase_b = 'doing'; this.q_b = 0; this.ans_b = {} },
    pickB(idx, oIdx) { this.ans_b[idx] = oIdx; this.$forceUpdate && this.$forceUpdate() },
    submitB() {
      if (this.ans_b[this.q_b] === undefined) return
      const scores = {}
      dimB.forEach(d => {
        const qs = Q_B.filter(q => q.key === d.key)
        const avg = qs.reduce((s, q) => {
          const oIdx = this.ans_b[Q_B.indexOf(q)]
          return s + (oIdx !== undefined ? q.opts[oIdx].score : 50)
        }, 0) / qs.length
        scores[d.key] = Math.round(avg)
      })
      this.resDims_b = scores
      this.resScore_b = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / dimB.length)
      this.phase_b = 'result'
      this.userStore.addAssessment({
        type: 'b', title: '服务者能力自评',
        scores: scores, total: this.resScore_b
      })
      this.userStore.markDone('assess')
      this.userStore.earnPoints(8, '完成服务者自评')
      setTimeout(() => this.drawRadarB(), 300)
    },
    resetB() { this.phase_b = 'intro'; this.q_b = 0; this.ans_b = {} },
    drawRadarB() {
      try {
        const ctx = uni.createCanvasContext('radarB', this)
        const W = 200, H = 200, CX = W / 2, CY = H / 2, R = 78
        const dims = dimB; const n = dims.length
        const angleStep = (2 * Math.PI) / n
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const angle = i * angleStep - Math.PI / 2
            const x = CX + R * (r / 4) * Math.cos(angle)
            const y = CY + R * (r / 4) * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.closePath(); ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(CX, CY)
          ctx.lineTo(CX + R * Math.cos(angle), CY + R * Math.sin(angle))
          ctx.strokeStyle = '#e7e0d4'; ctx.lineWidth = 0.5; ctx.stroke()
        }
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = i * angleStep - Math.PI / 2
          const s = Math.min(100, Math.max(0, this.resDims_b[dims[i].key] || 0))
          const x = CX + R * (s / 100) * Math.cos(angle)
          const y = CY + R * (s / 100) * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(196, 106, 58, 0.25)'; ctx.fill()
        ctx.strokeStyle = '#c46a3a'; ctx.lineWidth = 2; ctx.stroke()
        ctx.draw()
      } catch (e) { console.warn('[radarB]', e) }
    },
  }
}
</script>

<style scoped>
.page { height: 100vh; padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); background: #f7f4ef; box-sizing: border-box; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.assess-tabs { display: flex; gap: 8px; background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 4px; margin-bottom: 14px; }
.assess-tab { flex: 1; text-align: center; font-size: 13px; font-weight: 700; color: #888; padding: 8px 0; border-radius: 8px; }
.assess-tab.active { background: #3d5a3e; color: #fff; }

/* 封面 */
.intro-card { background: linear-gradient(135deg, #3d5a3e, #4d7050); border-radius: 16px; padding: 20px 16px; text-align: center; color: #fff; }
.ic-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
.ic-sub { font-size: 13px; opacity: .8; margin-bottom: 8px; }
.ic-dims { font-size: 11px; opacity: .7; margin-bottom: 10px; line-height: 1.5; }
.ic-info { display: flex; justify-content: center; gap: 16px; font-size: 11px; opacity: .8; margin-bottom: 10px; }
.ic-hint { font-size: 11px; color: rgba(255,255,255,.6); margin-bottom: 14px; }
.ic-btn { background: #fff; color: #3d5a3e; border-radius: 999px; padding: 11px 28px; font-size: 15px; font-weight: 700; display: inline-block; }

/* 答题 */
.quiz-wrap { }
.quiz-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 13px; color: #8a837a; }
.prog-bar { flex: 1; height: 4px; background: #e7e0d4; border-radius: 2px; overflow: hidden; }
.prog-fill { height: 100%; background: #3d5a3e; transition: width .3s; }
.q-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e7e0d4; margin-bottom: 14px; }
.q-dim-badge { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px; font-weight: 700; }
.q-text { font-size: 15px; font-weight: 700; color: #2b2b2b; line-height: 1.5; margin-bottom: 14px; }
.q-opts { display: flex; flex-direction: column; gap: 8px; }
.q-opt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f7f4ef; border-radius: 10px; border: 1.5px solid transparent; cursor: pointer; }
.q-opt.sel { background: #eef6ef; border-color: #3d5a3e; }
.q-opt-label { width: 22px; height: 22px; border-radius: 50%; background: #e7e0d4; color: #555; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-opt.sel .q-opt-label { background: #3d5a3e; color: #fff; }
.q-opt-text { flex: 1; font-size: 13.5px; color: #2b2b2b; }
.q-opt-score { font-size: 12px; color: #3d5a3e; font-weight: 700; }
.q-foot { display: flex; gap: 10px; justify-content: flex-end; }
.q-prev { background: #fff; color: #888; border: 1px solid #e7e0d4; border-radius: 20px; padding: 9px 16px; font-size: 13px; }
.q-next, .q-submit { background: #3d5a3e; color: #fff; border-radius: 20px; padding: 9px 16px; font-size: 13px; }
.q-submit { background: #c46a3a; }
button[disabled] { opacity: .45; }

/* 结果 */
.result-wrap { }
.res-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e7e0d4; margin-bottom: 12px; }
.res-title { font-size: 16px; font-weight: 800; color: #3d5a3e; text-align: center; margin-bottom: 8px; }
.res-score { font-size: 36px; font-weight: 900; color: #3d5a3e; text-align: center; line-height: 1.1; }
.res-label { font-size: 13px; color: #8a837a; text-align: center; margin-bottom: 14px; }
.res-radar { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 14px; }
.radar-canvas { width: 160px; height: 160px; flex-shrink: 0; }
.radar-legend { flex: 1; }
.rl-item { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.rl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rl-name { font-size: 11px; color: #555; flex: 1; }
.rl-score { font-size: 11px; font-weight: 700; color: #3d5a3e; }
.res-insights { border-top: 1px dashed #e7e0d4; padding-top: 12px; }
.ri-item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.ri-emoji { font-size: 20px; }
.ri-dim { font-size: 13px; font-weight: 700; color: #2b2b2b; }
.ri-tip { font-size: 12px; color: #8a837a; line-height: 1.4; margin-top: 2px; }
.res-actions { display: flex; flex-direction: column; gap: 8px; }
.ra-sync { background: #c46a3a; color: #fff; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 700; }
.ra-again { background: #fff; color: #3d5a3e; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px; font-size: 14px; }

/* ★ V3.7.2 同步到洞察：客户选择浮层 */
.sync-overlay { position: fixed; inset: 0; background: #fff; z-index: 1000; display: flex; flex-direction: column; overflow: hidden; }
.so-head { display: flex; align-items: center; gap: 12px; padding: 14px; border-bottom: 1px solid #efe9dd; }
.so-back { background: #f0ece2; border-radius: 10px; padding: 8px 12px; font-size: 16px; font-weight: 700; color: #3d5a3e; line-height: 1; }
.so-title { font-size: 17px; font-weight: 700; color: #2b2b2b; }
.so-sub { font-size: 11px; color: #8a837a; margin-top: 2px; }
.so-list { flex: 1; height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 10px 14px; box-sizing: border-box; }
.so-item { display: flex; align-items: center; gap: 12px; background: #f7f4ef; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.so-item-avatar { width: 38px; height: 38px; border-radius: 50%; background: #3d5a3e; color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.so-item-body { flex: 1; min-width: 0; }
.so-item-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.so-item-meta { font-size: 12px; color: #8a837a; margin-top: 2px; }
.so-item-tag { font-size: 11px; color: #27ae60; background: #eef6ef; border-radius: 8px; padding: 2px 8px; flex-shrink: 0; }
.so-item-tag-warn { color: #c46a3a; background: #fff4ec; }
.so-item-arrow { color: #ccc; font-size: 18px; flex-shrink: 0; }
.so-empty { text-align: center; padding: 60px 20px; }
.so-empty-icon { font-size: 48px; margin-bottom: 12px; }
.so-empty-t { font-size: 16px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.so-empty-s { font-size: 13px; color: #8a837a; line-height: 1.6; }
</style>
