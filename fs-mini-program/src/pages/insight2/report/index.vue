<template>
  <view class="page">
    <!-- 头部 -->
    <view class="hd">
      <view class="brand">风声 · FENGSHENG</view>
      <view class="h1">客户需求洞察报告</view>
      <view class="sub">需求探索阶段（MOT②）· 生成于 {{ genStamp }}</view>
      <view class="badges">
        <text class="badge ver">版本 V{{ r.version || 1 }}</text>
        <text class="badge">{{ confirmed ? '🔑 需求已锁定' : '📝 需求草稿' }}</text>
        <text class="badge">🏠 {{ firstPurpose }}</text>
        <text class="badge">{{ confirmed ? '✅ 客户亲口确认' : '⏳ 待客户书面确认' }}</text>
      </view>
    </view>

    <view class="strip">
      <view class="sc"><view class="k">需求强度</view><view class="v must">{{ strengthText }}</view></view>
      <view class="sc"><view class="k">购房时间</view><view class="v urgent">{{ timelineText }}</view></view>
      <view class="sc"><view class="k">报告状态</view><view class="v" :class="confirmed ? 'ok' : 'must'">{{ confirmed ? '已确认' : '草稿' }}</view></view>
    </view>

    <!-- 草稿强警示 -->
    <view v-if="!confirmed" class="alert">
      <view class="alert-h">⚠️ 草稿报告 · 禁止用于房源推荐 / 生成带看</view>
      <view class="alert-b">本报告尚未经客户亲口确认，仅作为经纪人访谈记录使用，不得用于房源推荐、带看邀约、对外转发。完成归纳确认后，系统生成正式版本 V1。</view>
      <view class="devnote">开发埋点：草稿态（confirm.confirmed=false）不流入房源推荐接口与带看接口；确认后生成 V1，后续每次修改生成新版本，旧版本保留不覆盖。</view>
    </view>

    <!-- 核心洞察 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🎯</text>核心洞察<text class="tagx">六步探索结论</text></view>
      <view class="core">
        <view class="cl">第一动机 · 已锁定</view>
        <view class="cp">客户购房的第一动机是 {{ firstPurpose }}</view>
        <view class="cd">{{ coreDetail }}</view>
        <view class="chips">
          <text class="chip" :class="s.strength === 'must' ? 'hot' : ''">{{ strengthText }}</text>
          <text v-for="(p, i) in otherPurposes" :key="i" class="chip">{{ p }}</text>
          <text v-if="s.mine && s.mine.length" class="chip hot">雷区 {{ s.mine.length }} 项</text>
        </view>
      </view>
    </view>

    <!-- 三圈法则 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🗺️</text>选址定位｜三圈法则<text class="tagx">{{ mainCircleName }}</text></view>
      <view class="circles" :style="{ height: '250px' }">
        <view v-for="c in circleLayout" :key="c.k"
              class="citem"
              :class="c.main ? 'cmain' : ''"
              :style="{ width: c.size, height: c.size, left: c.left, top: c.top, borderColor: c.color, background: c.bg }">
          <text class="cname" :style="{ color: c.color }">{{ c.name }}</text>
          <text class="cplace" :style="{ color: c.color }">{{ c.place }}</text>
          <text v-if="c.main" class="cmain-t">主驱动</text>
        </view>
      </view>
      <view class="cnote">三圈独立计权 · 不做地理交集，优先主驱动圈片区，兼顾另外两圈</view>

      <view v-for="c in circleRows" :key="c.k" class="ly" :class="c.cls">
        <view class="lk">
          <text>{{ c.icon }} {{ c.name }}</text>
          <text class="give" :class="c.giveOk ? 'yes' : 'no'">{{ c.giveText }}</text>
          <text class="lt">{{ c.label }}</text>
        </view>
        <view class="lmeta">选定片区：{{ c.place }}<br />高频场景：{{ c.scene }}</view>
      </view>

      <view class="zb">
        <text class="zi">📍</text>
        <view class="zb-b">
          <view class="zt">{{ priority.title }}</view>
          <view class="zd">{{ priority.desc }}（片区以服务者结合真源核验为准）</view>
        </view>
      </view>
      <view class="sb">
        <view class="cl">经纪人复述确认话术</view>
        <view class="sq">{{ speech }}</view>
      </view>
    </view>

    <!-- 理想生活画面 -->
    <view class="sec">
      <view class="sec-h"><text class="em">✨</text>理想生活画面<text class="tagx">深挖追问 · 描绘法</text></view>
      <view class="ly lh"><view class="lk">🏠 屋内</view><view class="sq">{{ s.vision.indoor }}</view></view>
      <view class="ly ld"><view class="lk">🌳 小区内</view><view class="sq">{{ s.vision.community }}</view></view>
      <view class="ly ls"><view class="lk">🏘️ 周边配套</view><view class="sq">{{ s.vision.around }}</view></view>
      <view class="internal">
        <view class="it">🔒 经纪人内部 · 诉求分层（不对外）</view>
        <view class="ib">{{ s.layers || '表层：客户直接说出的要求；派生：要求背后的生活问题；隐性：家庭关系与长期舒适度。建议在下一次沟通后补全。' }}</view>
      </view>
    </view>

    <!-- 六维现状评估 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📊</text>六维现状评估<text class="tagx">1-2分=硬需求</text></view>
      <view class="cwrap">
        <canvas type="2d" id="radar" class="radar"></canvas>
      </view>
      <view class="legend">
        <text class="lg"><text class="dot hard"></text>硬需求 1-2分</text>
        <text class="lg"><text class="dot mid"></text>可选提升 3分</text>
        <text class="lg"><text class="dot high"></text>保持红线 4-5分</text>
      </view>
      <view class="dims">
        <view v-for="d in DIMS" :key="d" class="dim" :class="dimCls(d)">
          <text class="dim-b">{{ DIM_LABELS[d] }} · {{ s.dims[d] }}分</text>
          <text class="dim-x">{{ dimExtra(d) }}</text>
        </view>
      </view>
    </view>

    <!-- 预算边界 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💰</text>预算边界<text class="tagx">步骤 7</text></view>
      <view class="bg">
        <view class="bc"><view class="bk">总价区间</view><view class="bv">{{ s.budget.total || '待补充' }}</view></view>
        <view class="bc"><view class="bk">首付</view><view class="bv">{{ s.budget.down || '待补充' }}</view></view>
        <view class="bc"><view class="bk">月供可接受</view><view class="bv orange">{{ s.budget.month || '待补充' }}</view></view>
        <view class="bc"><view class="bk">资金来源</view><view class="bv">{{ fundText }}</view></view>
        <view class="bc full"><view class="bk">预算弹性</view><view class="bv orange">{{ LABELS[s.flex] || '待确认' }}</view></view>
      </view>
    </view>

    <!-- 决策链 -->
    <view class="sec">
      <view class="sec-h"><text class="em">👨‍👩‍👧</text>决策链<text class="tagx">步骤 8</text></view>
      <view v-for="(d, i) in deciders" :key="i" class="dr">
        <text class="drole">{{ d.role }}</text>
        <text class="dpow" :class="d.cls">{{ d.pow }}</text>
        <text class="dn">{{ d.note }}</text>
      </view>
      <view class="ib"><text class="ok">✓</text><text class="t">{{ s.invite ? '已主动邀请家人一起看房，减少后期变数' : '尚未邀约家人看房，建议下一步补上' }}</text></view>
    </view>

    <!-- 归纳总结 -->
    <view class="sec">
      <view class="sec-h"><text class="em">✅</text>归纳总结<text class="tagx">步骤 9-10</text></view>
      <view class="sb">
        <view class="sq">{{ recapQuote }}</view>
        <view class="cr">
          <view class="cc" :class="confirmed ? 'ok' : 'note'">{{ confirmed ? '✓ 客户已确认' : '⏳ 待客户确认' }}</view>
          <view class="cc note">{{ confirmTime }}</view>
        </view>
      </view>
    </view>

    <!-- 版本与留痕 -->
    <view class="fn">
      <view class="sec-h" style="margin-bottom:16rpx"><text class="em">🗂️</text>版本与留痕</view>
      <view class="fr"><text>报告编号</text><text class="frb">{{ r.reportNo || '—' }}</text></view>
      <view class="fr"><text>当前版本</text><text class="frb">V{{ r.version || 1 }}</text></view>
      <view class="fr"><text>确认时间</text><text>{{ r.confirm && r.confirm.date ? r.confirm.date : '尚未确认' }}</text></view>
      <view class="fr"><text>服务阶段</text><text>MOT② 需求探索 → 待进入 MOT③ 书面确认</text></view>
      <view class="fr"><text>状态</text><text>{{ confirmed ? '已确认 · 后续修改自动升版留痕，旧版本保留' : '草稿 · 不进房源推荐，不对外转发' }}</text></view>
      <view class="vh">
        <view v-if="!history.length" class="vr" style="color:var(--text-tertiary)">暂无历史版本</view>
        <view v-else>
          <view class="vh-t">历史版本（保留不覆盖）</view>
          <view v-for="(h, i) in history" :key="i" class="vr"><text>V{{ h.version }} · {{ h.time }}</text><text class="vrb">{{ h.confirmed ? '已确认' : '草稿' }}</text></view>
        </view>
      </view>
    </view>

    <!-- 客户极简版 -->
    <view class="fn client">
      <view class="sec-h" style="margin-bottom:16rpx"><text class="em">📎</text>客户极简版（可转发）<text class="tagx">已剥离内部信息</text></view>
      <view v-for="(row, i) in clientRows" :key="i" class="fr"><text>{{ row[0] }}</text><text class="frr">{{ row[1] }}</text></view>
      <view class="copy" @tap="copyClient">复制客户极简版文本</view>
      <view class="devnote">隔离规则：本区块不含六维评分、提问脚手架、表层 / 派生 / 隐性诉求分层、经纪人内部判断，仅保留客户可公开确认的需求事实。</view>
    </view>

    <view class="foot">风声 · FENGSHENG<br />风过炭自红 · 让服务者实现客户美好居住</view>

    <view class="fab">
      <view class="btn-main" @tap="editAgain">{{ confirmed ? '修改并升新版 →' : '返回继续编辑 →' }}</view>
      <view class="fabrow">
        <view class="btn-ghost" @tap="shareToClient">发给客户确认</view>
        <view class="btn-ghost" @tap="copyClient">复制极简版</view>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * MOT② 需求洞察 · 报告页（v1.3）
 * 数据落点：优先读 client.reports[] 中 engine=mot2-v1.3 的最新一条；
 * 无客户时（演示）读本机 fs_insight2_demo_reports；
 * options.draft=1 时读本机草稿，渲染草稿态（红色警示 + 禁止转发）。
 * 六维雷达用 canvas 2d 绘制（小程序不支持内联 SVG）。
 */
import { mapStores } from 'pinia'
import { useUserStore } from '../../../store/user.js'
import { trackPageview, trackEvent } from '../../../utils/tracker'
import {
  ENGINE, REPORT_TYPE, LABELS, DIMS, DIM_LABELS, DIM_TIPS, CIRCLES, TOL_TEXT,
  createDefaultState, normalize, loadDraft,
  dimGroups, hardUniq, weightInfo, mainCircle, circleData, circlePriority, circleSpeech,
  buildClientView, clientPlain, insightList, latestInsight, demoReports, stamp, clean
} from '../../../utils/insight2.js'

export default {
  data () {
    return {
      clientId: '',
      r: {},
      s: createDefaultState(),
      history: [],
      cw: 300,
      DIMS, DIM_LABELS, DIM_TIPS, LABELS
    }
  },
  computed: {
    ...mapStores(useUserStore),
    confirmed () { return !!(this.r.confirm && this.r.confirm.confirmed) },
    genStamp () { return stamp(this.r.generatedAt || Date.now()) },
    confirmTime () {
      return this.r.confirm && this.r.confirm.date ? ('确认于 ' + this.r.confirm.date) : '⏳ 待客户确认'
    },
    firstPurpose () {
      return (this.s.purpose && this.s.purpose.length) ? (LABELS[this.s.purpose[0]] || this.s.purpose[0]) : '需求探索'
    },
    otherPurposes () {
      return (this.s.purpose || []).slice(1).map(p => LABELS[p] || p)
    },
    strengthText () {
      return this.s.strength === 'must' ? '必须买' : this.s.strength === 'should' ? '应该买' : '可以买'
    },
    timelineText () { return LABELS[this.s.timeline] || '未定' },
    fundText () {
      return (this.s.fund || []).map(k => LABELS[k] || k).join('、') || '待补充'
    },
    coreDetail () {
      const members = (this.s.members || []).map(k => LABELS[k] || k).join('、') || '待补充'
      return '核心诉求：' + members + '，' + (LABELS[this.s.duration] || '') +
        '居住规划，硬需求：' + (hardUniq(this.s).join('、') || '待补充') + '。'
    },
    priority () { return circlePriority(this.s) },
    speech () { return circleSpeech(this.s) },
    mainCircleName () {
      const mc = mainCircle(this.s)
      return mc ? ('主驱动圈：' + mc.name) : '未指定主驱动圈'
    },
    circleRows () {
      return CIRCLES.slice().sort((a, b) => weightInfo(this.s, a.k).rank - weightInfo(this.s, b.k).rank)
        .map(c => {
          const w = weightInfo(this.s, c.k)
          const d = circleData(this.s, c.k)
          const tol = this.s.tolerance && this.s.tolerance[c.k]
          return {
            k: c.k, name: c.name, icon: c.icon, cls: w.cls, label: w.label,
            place: d.place || '待补充', scene: d.scene || '待补充',
            giveOk: w.rank !== 1 && !!tol,
            giveText: w.rank === 1 ? '不可让步' : (tol ? ('可让步 ' + TOL_TEXT[c.k]) : '不可让步')
          }
        })
    },
    circleLayout () {
      const W = this.cw
      const H = 250
      const pos = { life: [0.33, 0.56], work: [0.68, 0.36], social: [0.68, 0.76] }
      const base = Math.min(W, H) * 0.66
      return CIRCLES.map(c => {
        const w = weightInfo(this.s, c.k)
        const d = Math.round(base * (0.62 + 0.38 * w.w))
        const p = pos[c.k]
        return {
          k: c.k, name: c.name, color: c.color,
          place: circleData(this.s, c.k).place || '',
          main: w.rank === 1,
          size: d + 'px',
          left: Math.round(p[0] * W - d / 2) + 'px',
          top: Math.round(p[1] * H - d / 2) + 'px',
          bg: c.color === '#3D5A3E' ? 'rgba(61,90,62,.13)'
            : c.color === '#C46A3A' ? 'rgba(196,106,58,.13)' : 'rgba(122,106,85,.13)'
        }
      })
    },
    deciders () {
      const rows = [{ role: LABELS[this.s.mainDecider] || this.s.mainDecider || '待明确', cls: 'p1', pow: '主决策', note: '负责预算与房源初筛' }]
      const veto = (this.s.veto || []).filter(v => v !== 'veto_none')
      if (veto.length) {
        veto.forEach(v => rows.push({ role: LABELS[v] || v, cls: 'veto', pow: '一票否决', note: '未参与本次陪聊，需重点对齐' }))
      } else {
        rows.push({ role: '其他', cls: 'p2', pow: '无否决人', note: '决策集中，反馈通道清晰' })
      }
      return rows
    },
    recapQuote () {
      const mc = mainCircle(this.s)
      const place = mc ? (circleData(this.s, mc.k).place || '') : '待定'
      const vetoArr = (this.s.veto || []).filter(v => v !== 'veto_none')
      const vetoText = vetoArr.length ? vetoArr.map(v => LABELS[v] || v).join('、') : '无'
      return '我跟您确认一下：您主要是为了' + ((this.s.purpose || []).map(p => LABELS[p] || p).join('、') || '待明确') +
        '，计划' + (LABELS[this.s.timeline] || '') + '内' + this.strengthText + '，优先' + place +
        '片区，预算' + (this.s.budget.total || '') + '，硬需求' + (hardUniq(this.s).join('、') || '待补充') +
        '，否决人' + vetoText + '，对吗？'
    },
    clientRows () { return buildClientView(this.s) }
  },
  onLoad (options) {
    trackPageview('insight2-report')
    const o = options || {}
    this.clientId = o.clientId || ''
    try {
      const sys = uni.getSystemInfoSync()
      this.cw = (sys.windowWidth || 375) - 64
    } catch (e) {}

    if (o.draft === '1') {
      const d = loadDraft(this.clientId)
      this.s = normalize(d || createDefaultState())
      this.r = { version: this.s.version || 1, generatedAt: Date.now(), confirm: { confirmed: false } }
      this.history = []
    } else if (this.clientId) {
      const c = this.userStore.getClient(this.clientId)
      const latest = latestInsight(c)
      if (!latest) {
        uni.showToast({ title: '暂无洞察报告', icon: 'none' })
        setTimeout(() => uni.redirectTo({ url: '/pages/insight2/prep/index?clientId=' + this.clientId }), 800)
        return
      }
      this.r = latest
      this.s = normalize(latest.state || {})
      this.history = insightList(c).slice(0, -1).map(x => ({
        version: x.version, time: stamp(x.generatedAt), confirmed: !!(x.confirm && x.confirm.confirmed)
      }))
    } else {
      const list = demoReports()
      if (!list.length) {
        uni.showToast({ title: '暂无洞察报告', icon: 'none' })
        setTimeout(() => uni.redirectTo({ url: '/pages/insight2/prep/index' }), 800)
        return
      }
      this.r = list[list.length - 1]
      this.s = normalize(this.r.state || {})
      this.history = list.slice(0, -1).map(x => ({
        version: x.version, time: stamp(x.generatedAt), confirmed: !!(x.confirm && x.confirm.confirmed)
      }))
    }

    this.$nextTick(() => { setTimeout(() => this.drawRadar(), 120) })
  },
  onShareAppMessage () {
    trackEvent('insight_share', 'insight2-report', { clientId: this.clientId || 'local', version: this.r.version || 1 })
    return {
      title: '风声 · 客户需求洞察报告 V' + (this.r.version || 1),
      path: '/pages/insight2/report/index' + (this.clientId ? ('?clientId=' + this.clientId) : '')
    }
  },
  methods: {
    clean,
    dimCls (d) {
      const v = this.s.dims[d]
      return v <= 2 ? 'low' : v === 3 ? 'mid' : 'high'
    },
    dimExtra (d) {
      const v = this.s.dims[d]
      if (v > 2) return DIM_TIPS[d]
      const items = (this.s.low[d] || []).map(clean).join('、')
      return items ? ('痛点：' + items) : '待选痛点'
    },
    drawRadar () {
      const q = uni.createSelectorQuery()
      // #ifdef H5
      q.in(this)
      // #endif
      q.select('#radar').fields({ node: true, size: true }).exec(res => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        let dpr = 2
        try { dpr = uni.getSystemInfoSync().pixelRatio || 2 } catch (e) {}
        const w = res[0].width || 280
        const h = res[0].height || 240
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, w, h)

        const cx = w / 2
        const cy = h / 2 + 2
        const R = Math.min(w, h) / 2 - 30
        const n = DIMS.length
        const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n
        const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]

        // 网格
        ctx.lineWidth = 1
        ctx.strokeStyle = '#EDE5D6'
        for (let k = 1; k <= 5; k++) {
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const p = pt(i, R * k / 5)
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1])
          }
          ctx.closePath()
          ctx.stroke()
        }
        // 轴线
        for (let i = 0; i < n; i++) {
          const p = pt(i, R)
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(p[0], p[1])
          ctx.stroke()
        }
        // 数据多边形
        const vals = DIMS.map(d => this.s.dims[d] || 1)
        ctx.beginPath()
        vals.forEach((v, i) => {
          const p = pt(i, R * v / 5)
          if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1])
        })
        ctx.closePath()
        ctx.fillStyle = 'rgba(61,90,62,.16)'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#3D5A3E'
        ctx.stroke()
        // 顶点
        ctx.fillStyle = '#3D5A3E'
        vals.forEach((v, i) => {
          const p = pt(i, R * v / 5)
          ctx.beginPath()
          ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2)
          ctx.fill()
        })
        // 标签
        ctx.font = '12px -apple-system, sans-serif'
        ctx.textBaseline = 'middle'
        vals.forEach((v, i) => {
          const p = pt(i, R + 20)
          const a = ang(i)
          ctx.fillStyle = v <= 2 ? '#8A3E18' : v === 3 ? '#8A6A2F' : '#3D5A3E'
          ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? 'center' : (Math.cos(a) > 0 ? 'left' : 'right')
          ctx.fillText(DIM_LABELS[DIMS[i]] + ' ' + v, p[0], p[1])
        })
      })
    },
    copyClient () {
      uni.setClipboardData({
        data: clientPlain(this.s),
        success: () => uni.showToast({ title: '客户极简版已复制', icon: 'none' }),
        fail: () => uni.showToast({ title: '复制失败', icon: 'none' })
      })
    },
    shareToClient () {
      if (!this.confirmed) {
        uni.showModal({
          title: '草稿不可对外发送',
          content: '当前为草稿状态，禁止用于房源推荐、带看邀约与对外转发。请先完成客户确认。',
          showCancel: false
        })
        return
      }
      uni.showModal({
        title: '发给客户确认',
        content: '可点击右上角「···」转发给客户，或先复制极简版文本发送。',
        confirmText: '复制文本',
        cancelText: '知道了',
        success: (res) => { if (res.confirm) this.copyClient() }
      })
    },
    editAgain () {
      const url = '/pages/insight2/prep/index' + (this.clientId ? ('?clientId=' + this.clientId) : '')
      uni.redirectTo({ url })
    }
  }
}
</script>

<style scoped>
.page { background: var(--cream); min-height: 100vh; padding-bottom: 260rpx; }
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: 0 0 48rpx 48rpx; padding: 56rpx 48rpx 52rpx; color: #fff; }
.brand { font-size: 22rpx; color: rgba(255,255,255,.85); letter-spacing: 2rpx; }
.h1 { font-size: 42rpx; font-weight: 800; margin-top: 10rpx; }
.sub { font-size: 24rpx; color: rgba(255,255,255,.78); margin-top: 6rpx; }
.badges { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 24rpx; }
.badge { font-size: 21rpx; background: rgba(255,255,255,.16); border: 2rpx solid rgba(255,255,255,.28); padding: 6rpx 22rpx; border-radius: 999rpx; }
.badge.ver { background: rgba(196,106,58,.92); border-color: rgba(255,255,255,.35); font-weight: 700; }

.strip { display: flex; gap: 16rpx; margin: -28rpx 40rpx 0; position: relative; z-index: 2; }
.sc { flex: 1; background: #fff; border-radius: 22rpx; padding: 20rpx 16rpx; box-shadow: 0 8rpx 24rpx rgba(42,62,43,.08); text-align: center; border: 2rpx solid var(--border); }
.k { font-size: 20rpx; color: var(--text-tertiary); }
.v { font-size: 27rpx; font-weight: 800; margin-top: 6rpx; }
.v.must { color: var(--orange-text); }
.v.urgent { color: var(--gold-text); }
.v.ok { color: var(--green); }

.alert { background: var(--orange-bg); border: 2rpx solid var(--orange); border-radius: var(--r-lg); margin: 24rpx 32rpx 0; padding: 28rpx; }
.alert-h { font-size: 28rpx; font-weight: 800; color: var(--orange-text); margin-bottom: 12rpx; }
.alert-b { font-size: 25rpx; color: var(--text-secondary); line-height: 1.7; }
.devnote { margin-top: 16rpx; background: #fff; border: 2rpx dashed var(--border); border-radius: 14rpx; padding: 18rpx; font-size: 21rpx; color: var(--text-tertiary); line-height: 1.7; }

.sec { background: #fff; border-radius: var(--r-lg); padding: 36rpx 32rpx; margin: 28rpx 32rpx 0; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.em { font-size: 34rpx; }
.tagx { margin-left: auto; font-size: 20rpx; color: var(--text-tertiary); font-weight: 500; background: var(--cream-dark); padding: 6rpx 20rpx; border-radius: 999rpx; }

.core { background: var(--green-bg); border-radius: var(--r-md); padding: 28rpx; border: 2rpx solid rgba(61,90,62,.16); border-left: 8rpx solid var(--green); }
.cl { font-size: 22rpx; color: var(--orange-text); font-weight: 700; letter-spacing: 1rpx; margin-bottom: 10rpx; }
.cp { font-size: 32rpx; font-weight: 800; color: var(--green-text); line-height: 1.6; }
.cd { font-size: 25rpx; color: var(--text-secondary); line-height: 1.7; margin-top: 10rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.chip { font-size: 23rpx; padding: 8rpx 20rpx; border-radius: 12rpx; background: #fff; border: 2rpx solid var(--border); color: var(--text-secondary); }
.chip.hot { background: var(--orange-bg); border-color: var(--orange); color: var(--orange-text); font-weight: 600; }

.circles { position: relative; width: 100%; }
.citem { position: absolute; border-radius: 50%; border-width: 3rpx; border-style: solid; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.citem.cmain { border-style: solid; border-width: 4rpx; }
.cname { font-size: 24rpx; font-weight: 700; }
.cplace { font-size: 21rpx; margin-top: 4rpx; opacity: .85; }
.cmain-t { font-size: 20rpx; font-weight: 800; color: var(--green); margin-top: 6rpx; }
.cnote { text-align: center; font-size: 22rpx; color: var(--text-secondary); margin-top: 16rpx; line-height: 1.6; }

.ly { border-radius: var(--r-md); padding: 24rpx 26rpx; margin-bottom: 20rpx; }
.ls { background: var(--cream-dark); border-left: 8rpx solid var(--text-tertiary); }
.ld { background: var(--orange-bg); border-left: 8rpx solid var(--orange); }
.lh { background: var(--green-bg); border-left: 8rpx solid var(--green); }
.lk { font-size: 25rpx; font-weight: 800; display: flex; align-items: center; gap: 10rpx; margin-bottom: 10rpx; }
.lt { margin-left: auto; font-size: 20rpx; color: var(--text-tertiary); font-weight: 500; }
.give { font-size: 19rpx; padding: 3rpx 14rpx; border-radius: 999rpx; }
.give.no { background: var(--orange-bg); color: var(--orange-text); }
.give.yes { background: var(--green-bg); color: var(--green); }
.lmeta { font-size: 24rpx; color: var(--text-secondary); line-height: 1.7; }

.zb { background: var(--green-bg); border: 2rpx solid rgba(61,90,62,.3); border-radius: var(--r-md); padding: 22rpx 26rpx; display: flex; gap: 16rpx; align-items: flex-start; }
.zi { font-size: 32rpx; }
.zb-b { flex: 1; }
.zt { font-size: 26rpx; font-weight: 700; color: var(--green-text); }
.zd { font-size: 23rpx; color: var(--text-secondary); margin-top: 6rpx; line-height: 1.7; }
.sb { background: var(--cream); border-radius: var(--r-md); padding: 26rpx; border: 2rpx solid var(--border); border-left: 8rpx solid var(--orange); margin-top: 20rpx; }
.sq { font-size: 25rpx; line-height: 1.9; color: var(--text-primary); }

.internal { border: 2rpx dashed var(--orange); background: #FFFCFA; border-radius: var(--r-md); padding: 22rpx 24rpx; margin-top: 20rpx; }
.it { font-size: 21rpx; font-weight: 800; color: var(--orange-text); letter-spacing: 1rpx; margin-bottom: 10rpx; }
.ib { font-size: 24rpx; color: var(--text-secondary); line-height: 1.75; }

.cwrap { display: flex; justify-content: center; padding: 8rpx 0; }
.radar { width: 100%; height: 480rpx; }
.legend { display: flex; gap: 24rpx; justify-content: center; margin: 16rpx 0; font-size: 21rpx; color: var(--text-secondary); }
.lg { display: flex; align-items: center; gap: 8rpx; }
.dot { width: 18rpx; height: 18rpx; border-radius: 50%; display: inline-block; }
.dot.hard { background: var(--orange-text); }
.dot.mid { background: var(--gold-text); }
.dot.high { background: var(--green); }
.dims { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.dim { width: 46%; border-radius: var(--r-md); padding: 20rpx 22rpx; box-sizing: border-box; }
.dim.low { background: var(--orange-bg); border: 2rpx solid var(--orange); }
.dim.mid { background: var(--gold-bg); border: 2rpx dashed var(--gold); }
.dim.high { background: var(--green-bg); border: 2rpx solid var(--green); }
.dim-b { display: block; font-size: 26rpx; font-weight: 800; margin-bottom: 6rpx; }
.dim.low .dim-b { color: var(--orange-text); }
.dim.mid .dim-b { color: var(--gold-text); }
.dim.high .dim-b { color: var(--green); }
.dim-x { font-size: 22rpx; color: var(--text-secondary); line-height: 1.6; }

.bg { display: flex; flex-wrap: wrap; gap: 16rpx; }
.bc { width: 47%; background: var(--cream); border-radius: var(--r-md); padding: 22rpx; border: 2rpx solid var(--border); box-sizing: border-box; }
.bc.full { width: 100%; }
.bk { font-size: 21rpx; color: var(--text-tertiary); margin-bottom: 8rpx; }
.bv { font-size: 28rpx; font-weight: 800; color: var(--green); }
.bv.orange { color: var(--orange-text); }

.dr { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; border-bottom: 2rpx solid var(--divider); }
.drole { width: 130rpx; font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.dpow { font-size: 21rpx; padding: 6rpx 20rpx; border-radius: 999rpx; flex-shrink: 0; }
.dpow.p1 { background: var(--green-bg); color: var(--green); }
.dpow.p2 { background: var(--orange-bg); color: var(--orange-text); }
.dpow.veto { background: var(--orange-bg); color: var(--orange-text); font-weight: 700; }
.dn { font-size: 22rpx; color: var(--text-secondary); flex: 1; }
.ib2 { display: flex; align-items: center; gap: 16rpx; background: var(--green-bg); border-radius: var(--r-md); padding: 22rpx 26rpx; margin-top: 20rpx; }
.ib { display: flex; align-items: center; gap: 16rpx; background: var(--green-bg); border-radius: var(--r-md); padding: 22rpx 26rpx; margin-top: 20rpx; }
.ok { color: var(--green); font-weight: 800; font-size: 30rpx; }
.t { font-size: 24rpx; line-height: 1.6; color: var(--text-secondary); flex: 1; }
.cr { display: flex; gap: 16rpx; margin-top: 20rpx; }
.cc { flex: 1; border-radius: var(--r-md); padding: 20rpx; text-align: center; font-size: 24rpx; }
.cc.ok { background: var(--green-bg); color: var(--green); font-weight: 700; border: 2rpx solid var(--green); }
.cc.note { background: var(--orange-bg); color: var(--orange-text); border: 2rpx dashed var(--orange); }

.fn { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin: 28rpx 32rpx 0; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.fn.client { border: 3rpx solid var(--green); }
.fr { display: flex; justify-content: space-between; gap: 20rpx; font-size: 24rpx; color: var(--text-secondary); padding: 14rpx 0; border-bottom: 2rpx dashed var(--divider); }
.fr text:first-child { color: var(--text-tertiary); flex-shrink: 0; }
.frr { text-align: right; }
.frb { color: var(--green); font-weight: 700; }
.vh { margin-top: 20rpx; font-size: 23rpx; color: var(--text-secondary); }
.vh-t { font-size: 21rpx; color: var(--text-tertiary); margin-bottom: 8rpx; }
.vr { display: flex; justify-content: space-between; border-bottom: 2rpx dashed var(--divider); padding: 10rpx 0; }
.vrb { color: var(--green); font-weight: 700; }
.copy { width: 100%; margin-top: 24rpx; height: 84rpx; line-height: 84rpx; text-align: center; border: 2rpx solid var(--green); border-radius: var(--r-md); background: #fff; color: var(--green); font-size: 26rpx; font-weight: 700; box-sizing: border-box; }

.foot { text-align: center; font-size: 22rpx; color: var(--text-tertiary); padding: 44rpx 32rpx 24rpx; line-height: 1.9; }
.fab { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 20rpx 32rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { background: linear-gradient(135deg, var(--green-deep), var(--green)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; text-align: center; box-shadow: 0 8rpx 24rpx rgba(42,62,43,.24); }
.fabrow { display: flex; gap: 20rpx; margin-top: 16rpx; }
.btn-ghost { flex: 1; background: #fff; border: 2rpx solid var(--border); color: var(--text-secondary); border-radius: var(--r-md); padding: 24rpx; font-size: 26rpx; text-align: center; }
</style>
