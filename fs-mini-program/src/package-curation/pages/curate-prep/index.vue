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

      <view class="card">
        <view class="label">③ 一句自由诉求（选填）</view>
        <textarea class="ta" v-model="freeText" placeholder="如：800万改善三房，学区还是居住品质纠结" maxlength="120"></textarea>
      </view>

      <view v-if="clientName" class="client-bar">已关联客户：{{ clientName }}（准备结果将存入其认知卡）</view>

      <view class="hint">依据来自真实字典 decoder / see / nego，绝不编造；缺失依据诚实标注「依据整理中」。</view>
      <button class="btn-main" @tap="gen">⚡ 生成见面参谋</button>
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
        <view v-for="(a, i) in result.ask" :key="i" class="ask-item">{{ a.q }}</view>
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

      <!-- V3.0.11 拿得出手 · 呈现工具 -->
      <view class="export-section">
        <view class="export-h">🎁 拿得出手 · 呈现工具</view>
        <view class="export-sub">把这次策展变成可以直接给客户看的专业呈现</view>
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
        <button class="btn-main" @tap="save">✓ 存入客户认知卡</button>
        <button class="btn-line" @tap="result = null">← 修改重生成</button>
      </view>
      <view v-if="savedTip" class="saved-tip">{{ savedTip }}</view>
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
import { AXIS_GROUPS, DIMENSIONS, generateCuration } from '../../engine.js'
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
      selectedDims: [],
      freeText: '',
      clientId: null,
      clientName: '',
      result: null,
      savedTip: '',
      showPromptOverlay: false,
      promptTypes: getPromptTypes(),
      sharePayload: null
    }
  },
  computed: {
    currentNodes() {
      const g = AXIS_GROUPS.find(x => x.type === this.axisType)
      return g ? g.nodes : []
    },
    userStore() { return useUserStore() }
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
      // 切换纵轴时，节点默认回到该线的第一个
      const g = AXIS_GROUPS.find(x => x.type === type)
      this.axisNodeKey = g ? g.nodes[0].key : this.axisNodeKey
    },
    toggleDim(key) {
      const i = this.selectedDims.indexOf(key)
      if (i >= 0) this.selectedDims.splice(i, 1)
      else this.selectedDims.push(key)
    },
    gen() {
      this.result = generateCuration({
        axisType: this.axisType,
        axisNodeKey: this.axisNodeKey,
        dimensions: this.selectedDims,
        freeText: this.freeText
      })
      trackEvent('curate_generate', 'curate-prep', { axis: this.axisType, dims: this.selectedDims.length, sayN: this.result.say.length, followN: this.result.followups.length })
      this.savedTip = ''
      uni.pageScrollTo({ scrollTop: 0, duration: 200 })
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
      // 联动既有经营记录（时间线 + 记忆点 + 信任积分）
      this.userStore.addTimelineEvent(this.clientId, { type: '策展', summary: '见面参谋生成（' + this.result.axisLabel + ' · ' + this.result.say.length + ' 说 / ' + this.result.followups.length + ' 见后跟进）' })
      this.userStore.addMemoryPoint(this.clientId, '专业准备：基于真实字典生成见面参谋，每条可点开依据')
      this.userStore.markDone('curate')
      this.userStore.earnPoints(10, '完成见面参谋')
      trackEvent('curate_save', 'curate-prep', { clientId: this.clientId, axis: this.axisType })
      this.savedTip = '已存入「' + this.clientName + '」的认知卡 · 信任积分 +10'
      uni.showToast({ title: '已存入客户认知卡', icon: 'none' })
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
.export-section { background: #fff; border-radius: 14px; padding: 16px 14px; margin-bottom: 12px; border: 1px solid #efe9dd; }
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
</style>
