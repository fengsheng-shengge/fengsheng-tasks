<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top">
      <view class="brand">风声 · FENGSHENG</view>
      <view class="h1">客户需求洞察</view>
      <view class="sub">经纪人陪聊记录 · 六步探索 · 确认后生成报告</view>
      <view class="progress">
        <view v-for="(c, i) in progressChecks" :key="i" class="pg" :class="c ? 'on' : ''"></view>
      </view>
      <view class="pmeta">
        <text>{{ clientName ? ('客户：' + clientName) : '演示模式 · 未绑定客户' }}</text>
        <text class="badges">
          <text class="badge ver">V{{ version }}</text>
          <text class="badge" :class="state.confirmed ? 'ok' : 'draft'">{{ state.confirmed ? '已确认' : '草稿' }}</text>
        </text>
      </view>
    </view>

    <view v-if="!clientId" class="noclient">
      未绑定客户：当前为演示模式，报告只存在本机。正式使用请从「客户 → 客户驾驶舱 → 做需求洞察」进入。
    </view>

    <!-- ① 为什么买 -->
    <view class="card">
      <view class="ch2"><text class="sb">1</text>为什么买（目的轴）</view>
      <view class="st">购房动机（可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.purpose" :key="o.k" class="tag" :class="has('purpose', o.k) ? 'on' : ''" @tap="toggle('purpose', o.k)">{{ o.t }}</view>
      </view>
      <view class="st">需求强度（经纪人帮判断，单选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.strength" :key="o.k" class="tag wide" :class="state.strength === o.k ? 'on' : ''" @tap="set('strength', o.k)">{{ o.t }}</view>
      </view>
      <view class="swrow">
        <text>已确认：租房无法满足核心需求</text>
        <switch :checked="state.rentNo" color="#3D5A3E" @change="sw('rentNo', $event)" />
      </view>
    </view>

    <!-- ② 时间轴 -->
    <view class="card">
      <view class="ch2"><text class="sb">2</text>为什么是现在买</view>
      <view class="st">预计购房时间（单选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.timeline" :key="o.k" class="tag" :class="state.timeline === o.k ? 'on' : ''" @tap="set('timeline', o.k)">{{ o.t }}</view>
      </view>
    </view>

    <!-- ③ 主体轴 -->
    <view class="card">
      <view class="ch2"><text class="sb">3</text>谁住 · 住多久</view>
      <view class="st">居住成员（可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.members" :key="o.k" class="tag" :class="has('members', o.k) ? 'on' : ''" @tap="toggle('members', o.k)">{{ o.t }}</view>
      </view>
      <view class="st">打算住多久（单选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.duration" :key="o.k" class="tag" :class="state.duration === o.k ? 'on' : ''" @tap="set('duration', o.k)">{{ o.t }}</view>
      </view>
    </view>

    <!-- ④ 三圈法则 -->
    <view class="card">
      <view class="ch2"><text class="sb">4</text>三圈法则</view>
      <view class="tip">
        <text>每圈独立选权重：主驱动圈（唯一）优先，其余为约束。不强行找地理交集，在主圈内兼顾另外两圈。</text>
      </view>

      <view v-for="c in CIRCLES" :key="c.k" class="blk">
        <view class="blk-t">{{ c.icon }} {{ c.name }}</view>
        <view class="frow">
          <text class="fl">片区</text>
          <input class="inp" :value="state.circles[c.k].place" placeholder="片区名称" @input="onCircle(c.k, 'place', $event)" />
        </view>
        <view class="frow">
          <text class="fl">场景</text>
          <input class="inp" :value="state.circles[c.k].scene" placeholder="高频场景 / 约束" @input="onCircle(c.k, 'scene', $event)" />
        </view>
        <view class="tags">
          <view class="tag" :class="weightKey(c.k) === c.k + '_main' ? 'on' : ''" @tap="setWeight(c.k, 'main')">主驱动</view>
          <view class="tag" :class="weightKey(c.k) === c.k + '_mid' ? 'on' : ''" @tap="setWeight(c.k, 'mid')">重要约束</view>
          <view class="tag" :class="weightKey(c.k) === c.k + '_low' ? 'on' : ''" @tap="setWeight(c.k, 'low')">次要参考</view>
        </view>
        <view class="ckrow">
          <text>接受{{ TOL_TEXT[c.k] }}</text>
          <switch :checked="state.tolerance[c.k]" color="#3D5A3E" @change="onTol(c.k, $event)" />
        </view>
      </view>

      <view class="band">
        <text class="band-k">✅ 推荐关注带：</text>
        <text>{{ circlePriority.title }}｜{{ circlePriority.desc }}</text>
      </view>
    </view>

    <!-- ⑤ 深挖追问 -->
    <view class="card">
      <view class="ch2"><text class="sb">5</text>深挖追问</view>
      <view class="tip"><text>根据客户性格选追问方式（可多选），点选展开对应话术；画面层记录客户真实描绘。</text></view>

      <view class="st">追问方式（可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.methods" :key="o.k" class="tag" :class="has('methods', o.k) ? 'on' : ''" @tap="toggle('methods', o.k)">{{ o.t }}</view>
      </view>

      <!-- 描绘法：理想生活三层 -->
      <view v-if="has('methods', 'm_draw')" class="panel">
        <view class="panel-t">🎨 描绘法 · 让客户说出未来生活的画面</view>
        <view class="q">① 推开家门，你希望看到什么？最想待着不动的角落是哪？</view>
        <view class="q">② 下楼之后，小区里希望是什么样子？老人孩子活动、夜间安全？</view>
        <view class="q">③ 出小区步行10分钟内，买菜、就医、遛弯希望有什么？</view>
        <view class="st">理想生活画面（三层 · 客户原话）</view>
        <textarea class="ta" :value="state.vision.indoor" placeholder="🏠 屋内" @input="onVision('indoor', $event)" />
        <textarea class="ta" :value="state.vision.community" placeholder="🌳 小区内" @input="onVision('community', $event)" />
        <textarea class="ta" :value="state.vision.around" placeholder="🏘️ 周边配套" @input="onVision('around', $event)" />
      </view>

      <view v-if="has('methods', 'm_trace')" class="panel">
        <view class="panel-t">🔍 追溯法 · 适合偏理性客户</view>
        <view class="q">① 现在住的地方，哪里最不方便？从什么时候开始忍不了的？</view>
        <view class="q">② 这个问题出现多久了？之前试过什么办法解决？</view>
        <view class="q">③ 如果一直不解决，对你生活会有什么具体影响？</view>
        <textarea class="ta" :value="state.trace" placeholder="追溯法记录" @input="onText('trace', $event)" />
      </view>

      <view v-if="has('methods', 'm_stat')" class="panel">
        <view class="panel-t">📊 统计法 · 适合回答模糊的客户</view>
        <view class="q">① 之前看过哪些房？后来为什么没定？</view>
        <view class="q">② 有没有哪套心动过？最后差在哪？</view>
        <textarea class="ta" :value="state.stat" placeholder="统计法记录" @input="onText('stat', $event)" />
      </view>

      <view v-if="has('methods', 'm_cut')" class="panel">
        <view class="panel-t">✂️ 排除法 · 适合犹豫不决的客户</view>
        <view class="q">① 如果预算只能满足一个要求，你最不能妥协的是什么？</view>
        <view class="q">② 哪些要求其实可以往后放？</view>
        <textarea class="ta" :value="state.cut" placeholder="排除法记录" @input="onText('cut', $event)" />
      </view>

      <view class="st">雷区（绝对不能接受，可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.mine" :key="o.k" class="tag warn" :class="has('mine', o.k) ? 'on' : ''" @tap="toggle('mine', o.k)">{{ o.t }}</view>
      </view>

      <view class="st">向往（特别想要，可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.wish" :key="o.k" class="tag" :class="has('wish', o.k) ? 'on' : ''" @tap="toggle('wish', o.k)">{{ o.t }}</view>
      </view>

      <view class="st">分层记录（经纪人内部 · 不对外）</view>
      <textarea class="ta" :value="state.layers" placeholder="表层 / 派生 / 隐性" @input="onText('layers', $event)" />
      <view class="devnote">隔离规则：本栏与六维评分、提问脚手架仅经纪人可见，不会出现在「客户极简版（可转发）」中。</view>
    </view>

    <!-- ⑥ 六维现状评估 -->
    <view class="card">
      <view class="ch2"><text class="sb">6</text>六维现状评估</view>
      <view class="tip">
        <text>对现在住的房子每维打1-5分：1-2分自动展开痛点要素（=硬需求），3分可选提升，4-5分保持红线（新房不能比现状差）。</text>
      </view>

      <view v-for="d in DIMS" :key="d" class="blk">
        <view class="blk-t">{{ DIM_LABELS[d] }} <text class="kk">{{ DIM_TIPS[d] }}</text></view>
        <view class="scores">
          <view v-for="n in 5" :key="n" class="sc" :class="scoreCls(d, n)" @tap="setScore(d, n)">{{ n }}</view>
        </view>
        <view v-if="state.dims[d] <= 2" class="panel">
          <view class="panel-t">⚠️ {{ DIM_LABELS[d] }}打了{{ state.dims[d] }}分，具体哪项最难受？（点选1-2项）</view>
          <view class="tags">
            <view v-for="e in DIM_ELEMENTS[d]" :key="e" class="tag warn" :class="hasLow(d, e) ? 'on' : ''" @tap="toggleLow(d, e)">{{ clean(e) }}</view>
          </view>
        </view>
      </view>

      <view class="divider"></view>
      <view class="sumout">{{ dimSummary }}</view>
      <view class="blk">
        <view class="kv"><text class="k hard">🔴 硬需求：</text><text class="v">{{ hardList }}</text></view>
        <view class="kv"><text class="k redline">🟢 保持红线：</text><text class="v">{{ redlineList }}</text></view>
        <view class="kv"><text class="k opt">🟡 可选提升：</text><text class="v">{{ optList }}</text></view>
      </view>
    </view>

    <!-- ⑦ 预算 -->
    <view class="card">
      <view class="ch2"><text class="sb">7</text>具体预算</view>
      <view class="tip"><text>客户说"大概300万" → 追问"这是硬上限，还是遇到特别合适的能商量？"</text></view>
      <view class="frow"><text class="fl">总价</text><input class="inp" :value="state.budget.total" placeholder="如 300-330万" @input="onBudget('total', $event)" /></view>
      <view class="frow"><text class="fl">首付</text><input class="inp" :value="state.budget.down" placeholder="如 100万" @input="onBudget('down', $event)" /></view>
      <view class="frow"><text class="fl">月供</text><input class="inp" :value="state.budget.month" placeholder="如 8000元/月以内" @input="onBudget('month', $event)" /></view>
      <view class="st">预算弹性（单选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.flex" :key="o.k" class="tag" :class="state.flex === o.k ? 'on' : ''" @tap="set('flex', o.k)">{{ o.t }}</view>
      </view>
      <view class="st">资金来源（可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.fund" :key="o.k" class="tag" :class="has('fund', o.k) ? 'on' : ''" @tap="toggle('fund', o.k)">{{ o.t }}</view>
      </view>
    </view>

    <!-- ⑧ 决策人 -->
    <view class="card">
      <view class="ch2"><text class="sb">8</text>决策人</view>
      <view class="st">主决策人（单选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.mainDecider" :key="o.k" class="tag" :class="state.mainDecider === o.k ? 'on' : ''" @tap="set('mainDecider', o.k)">{{ o.t }}</view>
      </view>
      <view class="st">否决人（谁没来但有否决权，可多选）</view>
      <view class="tags">
        <view v-for="o in OPTIONS.veto" :key="o.k" class="tag warn" :class="has('veto', o.k) ? 'on' : ''" @tap="toggle('veto', o.k)">{{ o.t }}</view>
      </view>
      <view class="swrow">
        <text>已主动邀请家人一起看房</text>
        <switch :checked="state.invite" color="#3D5A3E" @change="sw('invite', $event)" />
      </view>
    </view>

    <!-- ⑨⑩ 归纳确认 -->
    <view class="card">
      <view class="ch2"><text class="sb">9-10</text>归纳确认闸门</view>
      <view class="tip"><text>把下面这段话念给客户听 → 客户点头/补充 → 打开开关锁定。未确认前报告为草稿，不进房源推荐。</text></view>
      <view class="sumout">{{ recapSpeech }}</view>
      <textarea class="ta" :value="state.recapNote" placeholder="经纪人可润色复述给客户" @input="onText('recapNote', $event)" />
      <view class="ckrow">
        <text>✅ 已和客户逐条核对、客户亲口确认</text>
        <switch :checked="state.confirmed" color="#3D5A3E" @change="onConfirm($event)" />
      </view>
      <view class="gate" :class="state.confirmed ? 'ok' : ''">
        {{ state.confirmed ? '✅ 已和客户逐条核对、客户亲口确认' : '🔒 未确认 · 报告为草稿，不进房源推荐' }}
      </view>
      <view v-if="!state.confirmed" class="prev-draft" @tap="previewDraft">👀 预览草稿（仅自己看，不对外）</view>
      <view class="devnote">版本规则：首次确认为 V{{ version }}；此后每次修改再确认生成新版本，旧版本保留不覆盖。</view>
    </view>

    <view class="foot">风声 · FENGSHENG<br />风过炭自红 · 让服务者实现客户美好居住</view>

    <view class="fab">
      <view class="btn-main" :class="state.confirmed ? '' : 'dis'" @tap="generate">{{ state.confirmed ? ('生成需求洞察报告 V' + version + ' →') : '请先完成客户确认' }}</view>
    </view>
  </view>
</template>

<script>
/**
 * MOT② 需求洞察 · 问诊页（v1.3）
 * 数据落点：确认后写入 client.reports[]（type=insight, engine=mot2-v1.3），
 * 由 mot.js 的闸门1（gateInsightConfirmed）接管「未确认 → 提案禁用」。
 */
import { mapStores } from 'pinia'
import { useUserStore } from '../../../store/user.js'
import { trackPageview, trackEvent } from '../../../utils/tracker'
import {
  ENGINE, REPORT_TYPE, LABELS, DIMS, DIM_LABELS, DIM_TIPS, CIRCLES, TOL_TEXT,
  createDefaultState, normalize, loadDraft, saveDraft, clearDraft,
  dimGroups, hardUniq, circlePriority, recapText, strengthText,
  nextVersionFor, saveDemoReport, reportNo, dateStr
} from '../../../utils/insight2.js'

const OPTIONS = {
  purpose: [
    { k: 'child_school', t: '🎒 孩子上学' }, { k: 'elder', t: '👴 老人同住/养老' },
    { k: 'marriage', t: '💍 结婚婚房' }, { k: 'upgrade', t: '🏠 改善换大' },
    { k: 'commute', t: '🚇 通勤便利' }, { k: 'invest', t: '💰 投资保值' }
  ],
  strength: [
    { k: 'must', t: '🔴 必须买 · 有明确时间节点' },
    { k: 'should', t: '🟡 应该买 · 有痛点无死线' },
    { k: 'can', t: '🟢 可以买 · 改善可等' }
  ],
  timeline: [
    { k: 'half', t: '半年内' }, { k: 'one', t: '1年内' }, { k: 'three', t: '1-3年' },
    { k: 'threePlus', t: '3年以上' }, { k: 'unsure', t: '没想好' }
  ],
  members: [
    { k: 'couple', t: '夫妻' }, { k: 'kid1', t: '1孩' }, { k: 'kid2', t: '2孩' },
    { k: 'elderLive', t: '老人同住' }, { k: 'pet', t: '宠物' }
  ],
  duration: [{ k: 'd3', t: '3年内' }, { k: 'd35', t: '3-5年' }, { k: 'd510', t: '5-10年' }, { k: 'dLong', t: '长期' }],
  methods: [
    { k: 'm_draw', t: '🎨 描绘法' }, { k: 'm_trace', t: '🔍 追溯法' },
    { k: 'm_stat', t: '📊 统计法' }, { k: 'm_cut', t: '✂️ 排除法' }
  ],
  mine: [
    { k: 'mine_elevator', t: '🚫 无电梯' }, { k: 'mine_light', t: '🚫 采光差' },
    { k: 'mine_noise', t: '🚫 临街吵' }, { k: 'mine_leak', t: '🚫 顶层漏水' },
    { k: 'mine_property', t: '🚫 物业差' }
  ],
  wish: [
    { k: 'wish_through', t: '✨ 南北通透' }, { k: 'wish_window', t: '✨ 落地窗' },
    { k: 'wish_park', t: '✨ 近公园' }, { k: 'wish_deco', t: '✨ 精装修' },
    { k: 'wish_balcony', t: '✨ 大阳台' }
  ],
  flex: [{ k: 'rigid', t: '刚性' }, { k: 'flex5', t: '可上浮5%' }, { k: 'flex10', t: '可上浮10%' }],
  fund: [{ k: 'own', t: '自有' }, { k: 'parents', t: '父母支持' }, { k: 'loan', t: '组合贷' }],
  mainDecider: [{ k: 'self', t: '本人' }, { k: 'spouse', t: '配偶' }, { k: 'parents', t: '父母' }, { k: 'other', t: '其他' }],
  veto: [{ k: 'veto_spouse', t: '配偶' }, { k: 'veto_parents', t: '父母' }, { k: 'veto_none', t: '无' }]
}

const DIM_ELEMENTS = {
  safety: ['e_结构老化', 'e_消防隐患', 'e_物业失管', 'e_社区治安'],
  convenience: ['e_地铁远', 'e_无电梯', 'e_超市少', 'e_医院远'],
  health: ['e_采光差', 'e_噪音大', 'e_通风差', 'e_绿化少'],
  comfort: ['e_格局差', 'e_得房率低', 'e_不通透'],
  beauty: ['e_外立面旧', 'e_园林差', 'e_装修旧'],
  freedom: ['e_邻里疏远', 'e_宠物不便', 'e_社区活动少']
}

export default {
  data () {
    return {
      clientId: '',
      clientName: '',
      version: 1,
      state: createDefaultState(),
      OPTIONS, DIMS, DIM_LABELS, DIM_TIPS, CIRCLES, TOL_TEXT, DIM_ELEMENTS
    }
  },
  computed: {
    ...mapStores(useUserStore),
    client () {
      return this.clientId ? this.userStore.getClient(this.clientId) : null
    },
    groups () {
      return dimGroups(this.state)
    },
    hardList () { return hardUniq(this.state).join('、') || '暂无' },
    redlineList () { return this.groups.red.join('、') || '暂无' },
    optList () { return this.groups.opt.join('、') || '暂无' },
    dimSummary () {
      return DIMS.map(d => DIM_LABELS[d] + ' ' + this.state.dims[d] + '分').join('　')
    },
    recapSpeech () { return recapText(this.state) },
    circlePriority () { return circlePriority(this.state) },
    progressChecks () {
      const s = this.state
      return [
        s.purpose.length > 0,
        !!s.timeline,
        s.members.length > 0,
        s.wLife === 'life_main' || s.wWork === 'work_main' || s.wSocial === 'social_main',
        s.methods.length > 0,
        true,
        !!s.budget.total,
        !!s.mainDecider,
        s.confirmed
      ]
    }
  },
  onLoad (options) {
    trackPageview('insight2-prep')
    const cid = (options && options.clientId) || ''
    this.clientId = cid
    const draft = loadDraft(cid)
    this.state = normalize(draft || createDefaultState())
    const c = cid ? this.userStore.getClient(cid) : null
    if (cid) this.clientName = c ? (c.name || c.surname || '') : ''
    // 版本号：绑定客户按档案累计，演示模式按本机报告累计 —— 保证改版只升不覆盖
    this.version = nextVersionFor(c, cid)
  },
  methods: {
    clean (k) { return String(k || '').replace(/^e_/, '') },
    has (group, k) { return this.state[group].indexOf(k) >= 0 },
    toggle (group, k) {
      const arr = this.state[group].slice()
      const i = arr.indexOf(k)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(k)
      this.state[group] = arr
      this.persist()
    },
    set (group, k) {
      this.state[group] = k
      this.persist()
    },
    sw (key, e) {
      this.state[key] = !!e.detail.value
      this.persist()
    },
    hasLow (dim, k) { return (this.state.low[dim] || []).indexOf(k) >= 0 },
    toggleLow (dim, k) {
      if (this.state.dims[dim] > 2) return
      const arr = (this.state.low[dim] || []).slice()
      const i = arr.indexOf(k)
      if (i >= 0) arr.splice(i, 1)
      else if (arr.length < 2) arr.push(k)
      else { uni.showToast({ title: '最多选 2 项', icon: 'none' }); return }
      this.state.low[dim] = arr
      this.persist()
    },
    setScore (dim, n) {
      this.state.dims[dim] = n
      if (n > 2) this.state.low[dim] = []
      this.persist()
    },
    scoreCls (dim, n) {
      const s = this.state.dims[dim]
      if (n > s) return ''
      if (s <= 2) return 'on low'
      if (s === 3) return 'on mid'
      return 'on high'
    },
    weightKey (k) {
      return k === 'life' ? this.state.wLife : k === 'work' ? this.state.wWork : this.state.wSocial
    },
    /** 主驱动圈唯一：选中 main 时，其余圈自动降为「重要约束」 */
    setWeight (k, level) {
      const key = k === 'life' ? 'wLife' : k === 'work' ? 'wWork' : 'wSocial'
      this.state[key] = k + '_' + level
      if (level === 'main') {
        CIRCLES.forEach(c => {
          if (c.k === k) return
          const ck = c.k === 'life' ? 'wLife' : c.k === 'work' ? 'wWork' : 'wSocial'
          if (this.state[ck] === c.k + '_main') this.state[ck] = c.k + '_mid'
        })
      }
      this.persist()
    },
    onCircle (k, f, e) {
      this.state.circles[k][f] = e.detail.value
      this.persist()
    },
    onTol (k, e) {
      this.state.tolerance[k] = !!e.detail.value
      this.persist()
    },
    onVision (k, e) { this.state.vision[k] = e.detail.value; this.persist() },
    onText (k, e) { this.state[k] = e.detail.value; this.persist() },
    onBudget (f, e) {
      this.state.budget[f] = e.detail.value
      this.persist()
    },
    onConfirm (e) {
      this.state.confirmed = !!e.detail.value
      this.persist()
    },
    persist () { saveDraft(this.clientId, this.state) },

    /** 草稿预览：跳报告页并标记 draft=1，渲染红色草稿警示且禁止转发 */
    previewDraft () {
      saveDraft(this.clientId, this.state)
      const url = '/pages/insight2/report/index?draft=1' + (this.clientId ? ('&clientId=' + this.clientId) : '')
      uni.navigateTo({ url })
    },

    generate () {
      if (!this.state.confirmed) {
        uni.showToast({ title: '请先完成客户确认', icon: 'none' })
        return
      }
      // 首页入口进入时未绑定客户：生成前先选一次归属，避免报告只落本机、进不了客户档案与闸门1
      if (!this.clientId) {
        // 微信 showActionSheet 上限 6 项：最多 5 个客户 + 1 个本机选项
        const list = (this.userStore.clients || []).slice(0, 5)
        if (list.length) {
          const names = list.map(c => (c.name || c.surname || '未命名客户'))
          names.push('仅保存在本机（演示）')
          uni.showActionSheet({
            itemList: names,
            success: (res) => {
              const idx = res.tapIndex
              if (idx < list.length) {
                this.clientId = list[idx].id
                this.clientName = list[idx].name || list[idx].surname || ''
              }
              this.doSave()
            }
          })
          return
        }
      }
      this.doSave()
    },

    doSave () {
      trackEvent('insight_generate', 'insight2-prep', { clientId: this.clientId || 'local', version: this.version })
      const client = this.clientId ? this.userStore.getClient(this.clientId) : null
      // 版本号在归属确定后再算：关联客户后按该客户档案累计，保证改版只升不覆盖
      const version = nextVersionFor(client, this.clientId)
      const s = Object.assign({}, this.state)
      s.generatedAt = Date.now()
      s.confirmedAt = Date.now()
      s.version = version

      const report = {
        type: REPORT_TYPE,
        engine: ENGINE,
        name: '需求洞察报告',
        version: version,
        reportNo: reportNo(s, version),
        serviceLine: (client && client.serviceLine) || 'buy',
        generatedAt: Date.now(),
        // 闸门1 只认 report.confirm.confirmed —— 必须写全
        confirm: { confirmed: true, date: dateStr(new Date()), by: '客户本人（小程序确认）' },
        clientId: this.clientId,
        clientName: this.clientName,
        state: s
      }

      if (this.clientId) {
        this.userStore.saveClientReport(this.clientId, report)
        clearDraft(this.clientId)
        uni.redirectTo({ url: '/pages/insight2/report/index?clientId=' + this.clientId })
      } else {
        // 演示模式：未绑定客户档案，落本机，供演示与验收
        saveDemoReport(report)
        clearDraft('')
        uni.redirectTo({ url: '/pages/insight2/report/index' })
      }
    }
  }
}
</script>

<style scoped>
.page { background: var(--cream); min-height: 100vh; padding-bottom: 200rpx; }
.top { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: 0 0 40rpx 40rpx; padding: 40rpx 36rpx 32rpx; color: #fff; }
.brand { font-size: 22rpx; color: rgba(255,255,255,.85); letter-spacing: 2rpx; }
.h1 { font-size: 36rpx; font-weight: 800; margin-top: 8rpx; }
.sub { font-size: 23rpx; color: rgba(255,255,255,.78); margin-top: 6rpx; }
.progress { display: flex; gap: 6rpx; margin: 20rpx 0 12rpx; }
.pg { flex: 1; height: 8rpx; background: rgba(255,255,255,.25); border-radius: 4rpx; }
.pg.on { background: #fff; }
.pmeta { display: flex; justify-content: space-between; align-items: center; font-size: 23rpx; color: rgba(255,255,255,.85); }
.badges { display: flex; gap: 10rpx; }
.badge { font-size: 20rpx; padding: 4rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.18); }
.badge.ver { background: rgba(196,106,58,.92); font-weight: 700; }
.badge.ok { background: #fff; color: var(--green); font-weight: 700; }
.noclient { margin: 20rpx 24rpx 0; background: var(--orange-bg); border: 2rpx dashed var(--orange); border-radius: var(--r-md); padding: 20rpx 24rpx; font-size: 23rpx; color: var(--orange-text); line-height: 1.7; }

.card { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin: 20rpx 24rpx 0; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.ch2 { font-size: 32rpx; font-weight: 800; color: var(--green); display: flex; align-items: center; gap: 14rpx; margin-bottom: 20rpx; }
.sb { background: linear-gradient(135deg, var(--green-deep), var(--green)); color: #fff; width: 52rpx; height: 52rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.st { font-size: 26rpx; font-weight: 600; color: var(--text-secondary); margin: 24rpx 0 10rpx; }
.tip { background: var(--green-bg); border: 2rpx solid rgba(61,90,62,.2); border-radius: var(--r-md); padding: 20rpx; font-size: 24rpx; color: var(--green-text); line-height: 1.7; }
.q { background: var(--cream); padding: 16rpx 18rpx; border-radius: 12rpx; margin: 10rpx 0; font-size: 24rpx; color: var(--text-secondary); line-height: 1.7; }

.tags { display: flex; flex-wrap: wrap; gap: 14rpx; }
.tag { border: 2rpx solid var(--border); border-radius: 14rpx; padding: 14rpx 22rpx; font-size: 25rpx; background: #fff; color: var(--text-secondary); }
.tag.wide { flex: 1 1 100%; }
.tag.on { border-color: var(--green); background: var(--green-bg); color: var(--green-text); font-weight: 700; }
.tag.warn.on { border-color: var(--orange); background: var(--orange-bg); color: var(--orange-text); }

.blk { background: var(--cream); border: 2rpx solid var(--border); border-radius: var(--r-md); padding: 20rpx; margin: 16rpx 0; }
.blk-t { font-size: 27rpx; font-weight: 700; color: var(--text-primary); margin-bottom: 12rpx; }
.kk { font-size: 21rpx; color: var(--text-tertiary); font-weight: 400; }
.frow { display: flex; align-items: center; gap: 14rpx; margin: 10rpx 0; }
.fl { font-size: 24rpx; color: var(--text-secondary); flex-shrink: 0; width: 70rpx; }
.inp { flex: 1; border: 2rpx solid var(--border); border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 25rpx; background: #fff; color: var(--text-primary); }
.ta { width: 100%; border: 2rpx solid var(--border); border-radius: 12rpx; padding: 18rpx; font-size: 25rpx; background: #fff; color: var(--text-primary); margin: 10rpx 0; min-height: 120rpx; box-sizing: border-box; }
.swrow, .ckrow { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 14rpx 0; font-size: 25rpx; color: var(--text-secondary); }

.scores { display: flex; gap: 12rpx; margin: 12rpx 0; }
.sc { width: 72rpx; height: 72rpx; border: 2rpx solid var(--border); border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; background: #fff; color: var(--text-secondary); }
.sc.on { color: #fff; }
.sc.on.low { background: var(--orange-text); border-color: var(--orange-text); }
.sc.on.mid { background: var(--gold-text); border-color: var(--gold-text); }
.sc.on.high { background: var(--green); border-color: var(--green); }

.panel { background: #fff; border-radius: var(--r-md); padding: 20rpx; margin: 16rpx 0; border: 2rpx dashed var(--border); }
.panel-t { font-size: 24rpx; font-weight: 700; color: var(--orange-text); margin-bottom: 10rpx; }
.divider { height: 2rpx; background: var(--divider); margin: 24rpx 0; }
.sumout { background: var(--green-bg); border: 2rpx solid rgba(61,90,62,.24); border-radius: var(--r-md); padding: 20rpx; font-size: 25rpx; color: var(--green-text); line-height: 1.8; }
.kv { display: flex; gap: 10rpx; padding: 8rpx 0; font-size: 25rpx; }
.k { flex-shrink: 0; font-weight: 700; }
.k.hard { color: var(--orange-text); }
.k.redline { color: var(--green); }
.k.opt { color: var(--gold-text); }
.v { flex: 1; color: var(--text-primary); line-height: 1.6; }

.band { background: var(--green-bg); border: 2rpx solid rgba(61,90,62,.24); border-radius: var(--r-md); padding: 20rpx; font-size: 24rpx; color: var(--green-text); line-height: 1.7; margin-top: 16rpx; }
.band-k { font-weight: 800; }
.gate { background: var(--orange-bg); border: 2rpx dashed var(--orange); border-radius: var(--r-md); padding: 20rpx; font-size: 24rpx; color: var(--orange-text); line-height: 1.7; margin: 16rpx 0; }
.gate.ok { background: var(--green-bg); border: 2rpx solid var(--green); color: var(--green-text); }
.devnote { background: #fff; border: 2rpx dashed var(--border); border-radius: 12rpx; padding: 16rpx; font-size: 21rpx; color: var(--text-tertiary); line-height: 1.7; margin-top: 12rpx; }
.prev-draft { margin-top: 16rpx; text-align: center; padding: 22rpx; border: 2rpx dashed var(--green); border-radius: var(--r-md); color: var(--green); font-size: 26rpx; font-weight: 700; }
.foot { text-align: center; font-size: 22rpx; color: var(--text-tertiary); padding: 40rpx 0 20rpx; line-height: 1.9; }

.fab { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 20rpx 32rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { background: linear-gradient(135deg, var(--green-deep), var(--green)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; text-align: center; box-shadow: 0 8rpx 24rpx rgba(42,62,43,.24); }
.btn-main.dis { background: var(--cream-dark); color: var(--text-tertiary); box-shadow: none; }
</style>
