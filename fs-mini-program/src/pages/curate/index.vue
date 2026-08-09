<template>
  <view class="page">
    <!-- 头部定位：顾问简报三维度 -->
    <view class="hero">
      <view class="hero-title">顾问简报</view>
      <view class="hero-sub">从“带你看房的人”，变成“帮客户做家庭资产决策的顾问”</view>
      <view class="hero-tags">
        <text class="tag">顾问人设</text>
        <text class="tag">有形呈现</text>
        <text class="tag">证据决策</text>
      </view>
    </view>

    <!-- 产品介绍：让用户理解这页干嘛、能产出什么 -->
    <view class="intro">
      <view class="intro-t">这是什么</view>
      <view class="intro-b">顾问简报，是把一次客户沟通变成「有依据的决策建议」的工具。你填客户画像，它从真实知识库检索，产出：</view>
      <view class="intro-list">
        <text>① 破除客户固有误区（每条附政策 / 数据依据）</text>
        <text>② 立方案 · 分步行动时间轴</text>
        <text>③ 可一键转发给客户的长图简报</text>
      </view>
    </view>

    <!-- 测评结论预填提示 -->
    <view v-if="assessInfo" class="assess-tip">
      <text class="at-ico">✓</text>
      <text class="at-tx">已采集七维品质测评结论（{{ assessInfo.type === 'living' ? '住得好' : '服务者' }}，将带入简报作为客户自评维度）</text>
      <text class="at-clear" @tap="clearAssess">不用</text>
    </view>

    <!-- 入口一：快速生成（结构化客户画像） -->
    <view class="card">
      <view class="card-h"><text class="ci">📝</text>快速生成<text class="chip">约 2 分钟</text></view>
      <view class="card-sub">填客户结构化画像，秒出专属顾问简报：破误区 · 立方案 · 分步行动，每条挂真实依据。</view>
      <view v-if="!showForm">
        <button class="btn-main" @tap="showForm = true">填写客户画像 →</button>
      </view>
      <view v-else class="form">
        <view class="fld">
          <text class="lab">客户姓名</text>
          <input class="inp" :value="form.name" @input="onInput('name', $event)" placeholder="如：王女士" />
        </view>
        <view class="fld">
          <text class="lab">客户类型</text>
          <view class="seg">
            <text v-for="t in ctypes" :key="t" class="seg-i" :class="{ on: form.ctype === t }" @tap="form.ctype = t">{{ t }}</text>
          </view>
        </view>
        <view class="fld">
          <text class="lab">总预算（万元）</text>
          <input class="inp" type="digit" :value="form.budget" @input="onInput('budget', $event)" placeholder="如 800" />
        </view>
        <view class="fld">
          <text class="lab">购房 / 置业目的</text>
          <view class="seg">
            <text v-for="t in purposeOpts" :key="t" class="seg-i" :class="{ on: form.purpose === t }" @tap="form.purpose = t">{{ t }}</text>
          </view>
        </view>
        <view class="fld">
          <text class="lab">付款方式</text>
          <view class="seg">
            <text v-for="t in payTypeOpts" :key="t" class="seg-i" :class="{ on: form.payType === t }" @tap="form.payType = t">{{ t }}</text>
          </view>
        </view>
        <view class="fld">
          <text class="lab">家庭结构</text>
          <view class="seg">
            <text v-for="t in familyOpts" :key="t" class="seg-i" :class="{ on: form.family === t }" @tap="form.family = t">{{ t }}</text>
          </view>
        </view>
        <view class="fld">
          <text class="lab">关键时间事件</text>
          <input class="inp" :value="form.event" @input="onInput('event', $event)" placeholder="如 孩子 2027 年上小学" />
        </view>
        <view class="fld">
          <text class="lab">客户已有的想法（可多选）</text>
          <view class="chk" v-for="o in ideaOpts" :key="o" @tap="toggleIdea(o)">
            <text class="box" :class="{ on: form.ideas.includes(o) }">{{ form.ideas.includes(o) ? '✓' : '' }}</text>
            <text class="ck-tx">{{ o }}</text>
          </view>
          <input class="inp" :value="form.customIdea" @input="onInput('customIdea', $event)" placeholder="或自定义，如：先买后卖更安全" />
        </view>
        <button class="btn-main" @tap="genBrief">生成顾问简报 →</button>
      </view>
    </view>

    <!-- 入口二：语音录入（外部依赖，先占位） -->
    <view class="card">
      <view class="card-h"><text class="ci">🎙️</text>语音录入<text class="chip dim">即将上线</text></view>
      <view class="card-sub">带看途中对着微信录音，转写后自动抽取约束，生成简报。</view>
      <button class="btn-dis" disabled>录音生成（即将开放）</button>
    </view>

    <!-- 入口三：我的客户 -->
    <view class="card">
      <view class="card-h"><text class="ci">📇</text>我的客户<text class="chip">{{ clientList.length }} 位</text></view>
      <view class="card-sub">查看历史简报，一键重新生成最新政策版。</view>
      <button class="btn-line" @tap="goClients">打开客户档案 →</button>
    </view>

    <!-- 我的简报库 -->
    <view class="sec-h">我的顾问简报库<text class="sec-m">{{ lib.length }} 份</text></view>
    <view v-if="lib.length === 0" class="empty">还没有简报，点上方「快速生成」开始。</view>
    <view class="libitem" v-for="(l, i) in lib" :key="i" @tap="openPrep()">
      <view class="lt"><view class="t">{{ l.t }}</view><view class="s">{{ l.s }}</view></view>
      <text class="ok">已生成</text>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      showForm: false,
      ctypes: ['学区', '改善', '首置', '租赁', '业主售房'],
      purposeOpts: ['自住', '学区', '改善', '婚房', '投资'],
      payTypeOpts: ['全款', '按揭', '先买后卖', '先卖后买'],
      familyOpts: ['单身', '夫妻', '有孩家庭', '三代同堂'],
      ideaOpts: ['先买后卖更安全', '预算够买两居', '慢慢看不着急', '买名校旁才放心'],
      form: { name: '', ctype: '学区', budget: '', purpose: '自住', payType: '按揭', family: '夫妻', event: '', ideas: [], customIdea: '' },
      assessInfo: null
    }
  },
  computed: {
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients || [] },
    lib() { return (this.userStore.curatings || []).map(c => ({ t: c.t, s: c.s })) }
  },
  onShow() {
    try {
      const a = uni.getStorageSync('fs_last_assess')
      if (a && a.scores) this.assessInfo = a
    } catch (e) {}
  },
  onShareAppMessage() {
    return { title: '风声 · 顾问简报', path: '/pages/curate/index' }
  },
  methods: {
    onInput(field, e) {
      const v = (e.detail && e.detail.value) || (e.target && e.target.value) || ''
      this.form[field] = v
    },
    clearAssess() {
      this.assessInfo = null
      try { uni.removeStorageSync('fs_last_assess') } catch (e) {}
    },
    toggleIdea(o) {
      const i = this.form.ideas.indexOf(o)
      if (i >= 0) this.form.ideas.splice(i, 1)
      else this.form.ideas.push(o)
    },
    genBrief() {
      if (!this.form.name.trim()) { uni.showToast({ title: '请填写客户姓名', icon: 'none' }); return }
      if (!this.form.budget) { uni.showToast({ title: '请填写总预算', icon: 'none' }); return }
      const axisType = (this.form.ctype === '租赁' || this.form.ctype === '业主售房') ? 'buy' : 'buy'
      const dimensions = ['safe', 'health', 'conv', 'econ', 'comfort', 'beauty', 'free']
      const parts = []
      parts.push('客户类型：' + this.form.ctype)
      parts.push('预算' + this.form.budget + '万')
      parts.push('置业目的：' + this.form.purpose)
      parts.push('付款方式：' + this.form.payType)
      parts.push('家庭结构：' + this.form.family)
      if (this.form.event.trim()) parts.push('关键时间：' + this.form.event.trim())
      if (this.form.ideas.length) parts.push('已有想法：' + this.form.ideas.join('；'))
      if (this.form.customIdea.trim()) parts.push(this.form.customIdea.trim())
      let freeText = parts.join('；')
      // 七维品质测评结论预填 self 轨（1-5 → 0-10）
      let dimSelfScores = {}
      if (this.assessInfo && this.assessInfo.scores) {
        for (const k in this.assessInfo.scores) dimSelfScores[k] = Math.round(this.assessInfo.scores[k] * 2)
        freeText += '；已基于七维品质测评结论（客户自评带入）'
      }
      // 知识字典「加入简报」的真实词条，作为参考依据一并带入
      const kb = uni.getStorageSync('fs_brief_kb') || []
      if (kb.length) {
        freeText += '；参考依据：' + kb.map(s => s.title).join('、')
        uni.removeStorageSync('fs_brief_kb')
      }
      const url = '/package-curation/pages/curate-client/index?axisType=' + axisType +
        '&scenario=&freeText=' + encodeURIComponent(freeText) +
        '&dimensions=' + encodeURIComponent(dimensions.join(',')) +
        '&dimSelfScores=' + encodeURIComponent(JSON.stringify(dimSelfScores))
      uni.setStorageSync('briefDraft', { ...this.form, ideas: [...this.form.ideas], customIdea: this.form.customIdea })
      uni.navigateTo({ url })
    },
    openPrep(id) {
      let url = '/package-curation/pages/curate-prep/index'
      if (id) url += '?clientId=' + id
      uni.navigateTo({ url })
    },
    goClients() { uni.navigateTo({ url: '/pages/clients/index' }) }
  }
}
</script>

<style scoped>
.page { padding: 14px; }
.hero { background: linear-gradient(135deg, #3d5a3e, #4d7050); color: #fff; border-radius: 16px; padding: 18px 16px; margin-bottom: 14px; }
.hero-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
.hero-sub { font-size: 12.5px; opacity: .9; line-height: 1.6; margin-top: 6px; }
.hero-tags { display: flex; gap: 8px; margin-top: 12px; }
.tag { font-size: 11px; background: rgba(255,255,255,.18); padding: 4px 10px; border-radius: 999px; }
.intro { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
.intro-t { font-size: 14px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.intro-b { font-size: 12.5px; color: #555; line-height: 1.6; }
.intro-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.intro-list text { font-size: 12.5px; color: #777; line-height: 1.5; }
.assess-tip { display: flex; align-items: center; gap: 8px; background: #eef3ec; border: 1px solid #cfe0cf; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; }
.at-ico { color: #3d5a3e; font-weight: 800; }
.at-tx { flex: 1; font-size: 12px; color: #3d5a3e; line-height: 1.5; }
.at-clear { font-size: 12px; color: #c46a3a; font-weight: 700; }
.card { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
.card-h { font-size: 16px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; }
.ci { margin-right: 6px; }
.chip { margin-left: auto; font-size: 11px; color: #c46a3a; background: #fbf6ee; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.chip.dim { color: #999; background: #f2f0ec; }
.card-sub { font-size: 12.5px; color: #777; line-height: 1.6; margin: 8px 0 12px; }
.btn-main { background: #c46a3a; color: #fff; border: none; border-radius: 999px; padding: 12px; font-size: 15px; font-weight: 700; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 4px; }
.btn-dis { background: #f2f0ec; color: #aaa; border: none; border-radius: 10px; padding: 12px; font-size: 14px; }
.form { margin-top: 4px; }
.fld { margin-bottom: 14px; }
.lab { font-size: 12.5px; color: #555; font-weight: 700; display: block; margin-bottom: 6px; }
.inp { background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 10px; padding: 10px 12px; font-size: 14px; color: #2b2b2b; }
.seg { display: flex; gap: 8px; flex-wrap: wrap; }
.seg-i { font-size: 13px; padding: 8px 14px; border-radius: 999px; background: #f7f4ef; border: 1px solid #e7e0d4; color: #666; }
.seg-i.on { background: #3d5a3e; color: #fff; border-color: #3d5a3e; }
.chk { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.box { width: 18px; height: 18px; border-radius: 5px; border: 1px solid #cbb; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; }
.box.on { background: #3d5a3e; border-color: #3d5a3e; }
.ck-tx { font-size: 13px; color: #555; }
.sec-h { display: flex; align-items: baseline; justify-content: space-between; margin: 16px 4px 10px; font-size: 15px; font-weight: 700; color: #2b2b2b; }
.sec-m { font-size: 11px; color: #999; font-weight: 400; }
.empty { background: #fff; border: 1px dashed #e7e0d4; border-radius: 12px; padding: 18px; text-align: center; color: #999; font-size: 13px; margin-bottom: 10px; }
.libitem { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.lt { flex: 1; }
.lt .t { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.lt .s { font-size: 12px; color: #888; margin-top: 2px; }
.ok { font-size: 11px; color: #3d5a3e; background: #eef3ec; padding: 3px 8px; border-radius: 6px; font-weight: 700; }
</style>
