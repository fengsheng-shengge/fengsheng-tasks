<template>
  <view class="page">
    <view class="featured-cta">
      <view style="font-size:16px;font-weight:700">🎯 见面参谋（新版）</view>
      <view style="font-size:12px;opacity:.9;line-height:1.5;margin:4px 0 12px">基于真实字典，输入客户情况秒出专属「说 / 带 / 问 + 见后跟进」，每条挂真实依据。</view>
      <button class="btn-cta" @tap="openPrep()">进入见面参谋 →</button>
    </view>
    <view class="featured-cta" style="background:#f3f0ea;color:#3d5a3e">
      <view style="font-size:16px;font-weight:700">＋ 新建一次策展（旧版）</view>
      <view style="font-size:12px;opacity:.8;line-height:1.5;margin:4px 0 12px">输入接触背景与性格，生成「说 / 带 / 问 + 见后跟进」。</view>
      <button class="btn-cta" style="background:#3d5a3e" @tap="showForm = true">开始策展 →</button>
    </view>

    <view class="section-header"><text class="section-title">方法论文献</text><text class="section-more">6 方法论 · 7 工具箱</text></view>
    <view class="methodcard" v-for="(m, i) in methods" :key="i" :class="{ open: m.open }" @tap="m.open = !m.open">
      <view class="mh"><text>{{ m.icon }}</text>{{ m.n }} {{ m.name }}<text class="arrow">›</text></view>
      <view class="ms">{{ m.desc }}</view>
    </view>

    <!-- V2.1.1a P0-3：工具箱（独立可用） -->
    <view class="section-header" style="margin-top:14px"><text class="section-title">工具箱（独立可用）</text><text class="section-more">点开即用 · 不依赖策展</text></view>
    <view class="toolcard" v-for="(t, i) in toolbox" :key="i" @tap="showTool(t)">
      <view class="th"><text class="ti">{{ t.icon }}</text>{{ t.name }}<text class="tchip">{{ t.mtd }}</text></view>
      <view class="ts">{{ t.one }}</view>
    </view>

    <view class="section-header" style="margin-top:14px"><text class="section-title">我的策展库</text><text class="section-more">{{ lib.length }} 次</text></view>
    <view v-if="lib.length === 0" class="empty">还没有策展，点上方「＋ 新建一次策展」开始。</view>
    <view class="libitem" v-for="(l, i) in lib" :key="i" @tap="openResult">
      <view class="lt"><view class="t">{{ l.t }}</view><view class="s">{{ l.s }}</view></view>
      <text class="ok">已生成</text>
    </view>

    <!-- 新建策展表单 -->
    <view class="overlay" :class="{ active: showForm }">
      <view class="ov-nav">
        <button class="back" @tap="showForm = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">新建策展</view><view class="sub">描述这次接触背景</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="field"><text class="label">关联客户（可选）</text>
          <view class="client-pick" @tap="showPicker = true">
            <text v-if="selectedClientId">{{ pickedClientName }}（已选 · 自动带入角色与性格）</text>
            <text v-else class="ph">点此选择客户，或留空新建</text>
          </view>
        </view>
        <view class="field"><text class="label">客户角色</text>
          <view class="opt"><view v-for="o in roles" :key="o" :class="{ on: form.role === o }" @tap="form.role = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">接触类型</text>
          <view class="opt"><view v-for="o in types" :key="o" :class="{ on: form.type === o }" @tap="form.type = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">客户性格（决定沟通频道）</text>
          <view class="opt">
            <view class="p-r" :class="{ on: selPersona === 'red' }" @tap="selPersona = 'red'">🔴 结果导向</view>
            <view class="p-b" :class="{ on: selPersona === 'blue' }" @tap="selPersona = 'blue'">🔵 关系导向</view>
            <view class="p-g" :class="{ on: selPersona === 'green' }" @tap="selPersona = 'green'">🟢 理智型</view>
          </view>
        </view>
        <view class="field"><text class="label">接触目标（北极星）</text>
          <view class="opt"><view v-for="o in goals" :key="o" :class="{ on: form.goal === o }" @tap="form.goal = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">补充背景（选填）</text>
          <textarea placeholder="如：90后婚房夫妻，预算300万，看重学区与通勤…" v-model="form.bg"></textarea>
        </view>
        <view style="font-size:11px;color:var(--brown);background:#fbf6ee;padding:8px 10px;border-radius:8px;margin-bottom:12px">依据将来自真实字典 decoder / see / nego，绝不编造。</view>
        <button class="btn-orange" @tap="genCuration">⚡ 生成见前策展包</button>
      </scroll-view>
    </view>

    <!-- 选择客户浮层 -->
    <view class="overlay" :class="{ active: showPicker }">
      <view class="ov-nav">
        <button class="back" @tap="showPicker = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">选择客户</view><view class="sub">选后自动带入角色与性格</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="pick-item" v-for="c in clientList" :key="c.id" @tap="pickClient(c)">
          <view class="pi-name">{{ c.name }}</view>
          <view class="pi-meta">{{ c.rel }} · {{ c.stage }} · {{ personaOf(c) }}</view>
        </view>
        <view v-if="clientList.length === 0" class="empty">还没有客户，去「客户」页新建。</view>
        <button class="btn-line" @tap="goClients">＋ 去客户页新建</button>
      </scroll-view>
    </view>

    <!-- 见前策展包结果 -->
    <view class="overlay" :class="{ active: showResult }">
      <view class="ov-nav">
        <button class="back" @tap="showResult = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">见前策展包</view><view class="sub">{{ resultSub }}</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="channel">{{ channelText }}</view>
        <view class="score"><view class="num">86</view><view class="tx">本次策展信心分</view><view class="tx-sub">命中 <text style="font-weight:700">记忆点 ×2</text> · 赢面较裸聊 +37%</view></view>

        <view class="sec"><view class="h"><text class="em">🎯</text>① 仪式感设计<text class="mtd">准备</text></view>
          <view class="sec-list"><view class="sec-li">提前 <text class="hl">10 分钟</text>到场，门口迎接并称呼「林先生 / 李小姐」</view><view class="sec-li">备好鞋套、饮水、户型图册，体现专业准备</view><view class="sec-li">开场 30 秒说明今日看房动线，给掌控感</view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">📄</text>② 专业依据（书面化先行法）<text class="mtd">方法②</text></view>
          <view class="sec-list"><view class="sec-li">学区划片以每年 4 月公示为准，本房对应 XX 小学，近三年无调整</view><view class="sec-li">首套公积金贷款额度与利率，按当前政策测算月供</view></view>
          <view class="ref">依据：XX 区教育局 2025 入学政策 · 公积金管理中心现行利率表</view>
        </view>
        <view class="sec"><view class="h"><text class="em">❓</text>③ 需求三板斧话术（客制化沟通法）<text class="mtd">方法④</text></view>
          <view class="sec-list"><view class="sec-li" v-for="(q, i) in resultQ" :key="i">{{ q }}</view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">🏠</text>④ 房源亮点卡<text class="mtd">工具④</text></view>
          <view class="sec-list"><view class="sec-li"><text style="font-weight:700">匹配点 1（学区）</text>：对应核心诉求 A——落户即入读，近三年划片稳定</view><view class="sec-li"><text style="font-weight:700">匹配点 2（通勤）</text>：对应核心诉求 B——地铁 8 分钟，直达 CBD</view><view class="sec-li"><text style="font-weight:700">匹配点 3（户型）</text>：对应核心诉求 C——南向三开间，婚房改儿童房便利</view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">🛡</text>⑤ 异议预案 + 难题顶上<text class="mtd">方法⑤</text></view>
          <view class="sec-list"><view class="sec-li">「单价偏高」→ 用<text class="hl">总价＝单价×得房率</text>拆解，对比同小区近 3 月成交</view><view class="sec-li"><text style="font-weight:700">难题顶上</text>：遇产权/贷款卡关，识别→拉法务/代书，明确说「我找专家一起帮你确认」</view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">💌</text>⑥ 见后跟进（售后飞轮法 · 按客户阶段生成）<text class="mtd">方法⑥</text></view>
          <view class="sec-list">
            <view class="sec-li" v-for="(f, i) in resultFollowups" :key="i">
              <text style="font-weight:700">{{ f.theme }}</text>：{{ f.text }}
              <view class="lt-ref">LTRUST · {{ f.ltrust }}</view>
            </view>
          </view>
          <view class="sec-list"><view class="sec-li"><text style="font-weight:700">成交后服务清单</text>：1 周入住礼包 / 1 月回访 / 6 月行情报告 / 1 年节气问候 + 年检</view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">🛡️</text>LTRUST 信任校准（方法论底层支撑）<text class="mtd">LTRUST</text></view>
          <view class="ltrust-list">
            <view class="ltrust-row"><view class="ltrust-ck">✓</view><view class="ltrust-tx"><text style="font-weight:700">L 听</text> · 开场 3 问 / 需求三板斧已嵌入<view class="ltrust-map">对应 ③</view></view></view>
            <view class="ltrust-row"><view class="ltrust-ck">✓</view><view class="ltrust-tx"><text style="font-weight:700">T 险</text> · 主动说 1 个风险已嵌入<view class="ltrust-map">对应 ⑤</view></view></view>
            <view class="ltrust-row"><view class="ltrust-ck">✓</view><view class="ltrust-tx"><text style="font-weight:700">R 相关</text> · 客制化频道已匹配<view class="ltrust-map">对应 ① / ④</view></view></view>
            <view class="ltrust-row"><view class="ltrust-ck">✓</view><view class="ltrust-tx"><text style="font-weight:700">U 低承</text> · 留 1 个低承诺跟进<view class="ltrust-map">对应 ⑥</view></view></view>
            <view class="ltrust-row"><view class="ltrust-ck" :class="{ off: !saved }">{{ saved ? '✓' : '○' }}</view><view class="ltrust-tx"><text style="font-weight:700">S 档案</text> · 点保存即写入客户档案<view class="ltrust-map">见下方按钮</view></view></view>
          </view>
          <view class="ltrust-prog"><text>{{ ltCount }}</text><view class="bar"><view class="bar-fill" :style="{ width: ltFill }"></view></view></view>
        </view>
        <view class="sec"><view class="h"><text class="em">⭐</text>本次信任度（决定 +信任积分）</view>
          <view class="trust-stars"><text class="ts" :class="{ on: i < trustScore }" v-for="(s, i) in 5" :key="i" @tap="setTrust(i + 1)">★</text></view>
          <view class="trust-rate-cap">信任度 {{ trustScore }}/5 · 存档案将记录本次信任度</view>
        </view>
        <button class="btn-green" @tap="saveCuration">✓ 保存到我的客户档案</button>
        <button class="btn-line" open-type="share" @tap="setShareCurate">分享给客户</button>
        <button class="btn-line" @tap="copyCurateLink">复制链接给客户</button>
      </scroll-view>
    </view>

    <!-- 工具示例浮层 -->
    <view class="overlay" :class="{ active: showToolOverlay }">
      <view class="ov-nav">
        <button class="back" @tap="showToolOverlay = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ tool.name }}</view><view class="sub">{{ tool.mtd }} · 工具示例</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="sec"><view class="h"><text class="em">🎯</text>一句话用途</view><view>{{ tool.one }}</view></view>
        <view class="sec"><view class="h"><text class="em">📌</text>示例</view>
          <view class="sec-list"><view class="sec-li" v-for="(s, i) in tool.sample" :key="i">{{ s }}</view></view>
        </view>
        <button class="btn-orange" @tap="useInCurate(tool)">在策展中使用 →</button>
        <button class="btn-line" open-type="share" @tap="sharePayload = { title: '风声工具箱 · ' + tool.name, path: '/pages/curate/index' }">分享给同事/客户</button>
        <button class="btn-line" @tap="copyLink('/pages/curate/index')">复制小程序链接</button>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { methods, personaMap, personaQ, toolbox, getFollowups } from '../../utils/v4data.js'
import { buildShareLink, copyLink, APP_SHARE_TITLE } from '../../utils/share.js'
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      methods: methods.map(m => ({ ...m, open: false })),
      toolbox: toolbox,
      showForm: false,
      showResult: false,
      showPicker: false,
      showToolOverlay: false,
      tool: {},
      sharePayload: null,
      selPersona: 'red',
      form: { role: '买房客户', type: '带看', goal: '留好印象', bg: '' },
      roles: ['买房客户', '租客', '业主', '房东'],
      types: ['带看', '面谈', '电话', '线上'],
      goals: ['留好印象', '持续选他', '最终成交'],
      selectedClientId: null,
      resultFollowups: [],
      channelText: '',
      resultQ: [],
      resultSub: '',
      trustScore: 4,
      saved: false,
      ltCount: '4/5 已覆盖',
      ltFill: '80%'
    }
  },
  computed: {
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients },
    pickedClientName() {
      const c = this.userStore.getClient(this.selectedClientId)
      return c ? c.name : ''
    },
    lib() {
      return this.userStore.curatings.map(c => ({ t: c.t, s: c.s }))
    }
  },
  onLoad() {
    uni.$on('openCurateForm', (id) => {
      if (id) this.preselectClient(id)
      this.showForm = true
    })
  },
  onUnload() { uni.$off('openCurateForm') },
  onShareAppMessage() {
    return this.sharePayload || { title: APP_SHARE_TITLE, path: '/pages/curate/index' }
  },
  onShareTimeline() {
    return { title: '风声 · 见面策展工具', query: 'clientId=' + (this.selectedClientId || '') }
  },
  methods: {
    personaOf(c) { return (personaMap[c.pkey] || personaMap.red).tag },
    openPrep() {
      uni.navigateTo({ url: '/package-curation/pages/curate-prep/index' })
    },
    preselectClient(id) {
      const c = this.userStore.getClient(id)
      if (!c) return
      this.selectedClientId = id
      this.form.role = c.rel
      this.selPersona = c.pkey
    },
    pickClient(c) {
      this.selectedClientId = c.id
      this.form.role = c.rel
      this.selPersona = c.pkey
      this.showPicker = false
      uni.showToast({ title: '已选「' + c.name + '」· 带入角色与性格', icon: 'none' })
    },
    goClients() {
      this.showPicker = false
      // V2.7：客户档案已提升为 tabBar 页，用 switchTab
      uni.switchTab({ url: '/pages/clients/index' })
    },
    openResult() { this.showResult = true },
    genCuration() {
      const p = personaMap[this.selPersona]
      this.channelText = '🎯 沟通频道：' + p.tag + '——' + p.tip
      this.resultQ = personaQ[this.selPersona]
      const who = this.selectedClientId ? this.pickedClientName : '本次接触'
      this.resultSub = who + ' · ' + this.form.role + ' · ' + p.tag
      // V2.5 M1：按所选客户双纵轴阶段（或角色兜底）动态生成 ≤5 条见后跟进
      const stage = this.selectedClientId ? (this.userStore.getClient(this.selectedClientId) || {}).stage : null
      this.resultFollowups = getFollowups(stage, this.form.role)
      this.resetLtrust()
      this.showForm = false
      this.showResult = true
      uni.showToast({ title: '已按「' + p.tag + '」生成策展包', icon: 'none' })
    },
    setTrust(n) {
      this.trustScore = n
      this.ltCount = n + '/5'
      this.ltFill = (n * 20) + '%'
    },
    resetLtrust() {
      this.trustScore = 4
      this.saved = false
      this.ltCount = '4/5 已覆盖'
      this.ltFill = '80%'
    },
    saveCuration() {
      const u = this.userStore
      // 1) 真实写入策展记录（信任度仅记录，不重复计分）
      u.addCurating({
        clientId: this.selectedClientId || null,
        t: this.form.role + ' · ' + (this.selPersona === 'red' ? '🔴结果' : this.selPersona === 'blue' ? '🔵关系' : '🟢理智'),
        s: '含6段+跟进 · 信任' + this.trustScore + '/5',
        trust: this.trustScore
      })
      // 2) 更新所选客户双纵轴（阶段/资产/状态）
      if (this.selectedClientId) {
        u.updateClient(this.selectedClientId, { status: '跟进中', asset: '已策展 · ' + (this.form.bg || '见前策展包已生成') })
        // 2.5) 把本次生成的见后跟进写入客户档案 followups[]
        if (this.resultFollowups.length) {
          u.addFollowups(this.selectedClientId, this.resultFollowups)
        }
        // 2.6) 写接触时间线（策展）+ 自动记忆点（客户记住专业准备）
        u.addTimelineEvent(this.selectedClientId, { type: '策展', summary: '生成见前策展包（说/带/问 + ' + this.resultFollowups.length + ' 条见后跟进）' })
        u.addMemoryPoint(this.selectedClientId, '专业准备：提前策展 + 书面依据 + 见后仍有跟进触点')
      }
      // 3) 点亮「完成策展」任务并真实发放 +10 信任积分（信任度星级仅记录，不重复计分）
      u.markDone('curate')
      u.earnPoints(10, '完成见面策展')
      this.saved = true
      this.ltCount = '5/5 已覆盖'
      this.ltFill = '100%'
      uni.showToast({ title: '已存入客户档案 · 任务 +10 积分', icon: 'none' })
      setTimeout(() => { this.showResult = false }, 900)
    },
    showTool(t) {
      this.tool = t
      this.showToolOverlay = true
    },
    useInCurate(t) {
      this.showToolOverlay = false
      this.showForm = true
      this.form.bg = (this.form.bg ? this.form.bg + '\n' : '') + '【参考工具：' + t.name + '】' + t.one
    },
    shareTitle() {
      const who = this.selectedClientId ? this.pickedClientName : '您'
      return '我为' + who + '准备了这次见面的专业方案，请查收'
    },
    setShareCurate() {
      this.sharePayload = {
        title: this.shareTitle(),
        path: '/pages/curate/index?clientId=' + (this.selectedClientId || '')
      }
    },
    copyCurateLink() {
      copyLink('/pages/curate/index?clientId=' + (this.selectedClientId || ''), '链接已复制 · 客户在微信外也能打开')
    }
  }
}
</script>

<style scoped>
.toolcard { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.th { font-size: 15px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; }
.ti { margin-right: 6px; }
.tchip { margin-left: auto; font-size: 11px; color: #C8956D; background: #fbf6ee; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.ts { font-size: 12.5px; color: #777; margin-top: 4px; line-height: 1.5; }
.empty { background: #fff; border: 1px dashed #e7e0d4; border-radius: 12px; padding: 18px; text-align: center; color: #999; font-size: 13px; margin-bottom: 10px; }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt > view { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; border: 1px solid transparent; }
.opt > view.on { background: #3d5a3e; color: #fff; }
.p-r.on { background: #c0392b; }
.p-b.on { background: #2f6fb0; }
.p-g.on { background: #3a8f5b; }
.client-pick { background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 12px; font-size: 14px; color: #3d5a3e; }
.client-pick .ph { color: #aaa; }
.pick-item { background: #fff; border: 1px solid #e7e0d4; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
.pi-name { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.pi-meta { font-size: 12px; color: #888; margin-top: 2px; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.btn-orange { background: #c46a3a; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin-top: 6px; }
.lt-ref { font-size: 11px; color: #C8956D; margin-top: 3px; line-height: 1.4; }
</style>
