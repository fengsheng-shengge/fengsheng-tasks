<template>
  <view class="page">
    <!-- 答题阶段 -->
    <block v-if="phase === 'quiz'">
      <view class="q-head">
        <text class="q-title">{{ set.title }}</text>
        <text class="q-prog">第 {{ idx + 1 }} / {{ set.total }} 题</text>
      </view>
      <view class="progress"><view class="progress-in" :style="{ width: ((idx) / set.total * 100) + '%' }"></view></view>

      <view class="q-card">
        <view class="q-dim">{{ dimName }}</view>
        <view class="q-text">{{ cur.text }}</view>
        <view class="q-opts">
          <view class="q-opt" v-for="o in LIKERT" :key="o.v" :class="{ on: answers[cur.id] === o.v }" @tap="pick(o.v)">
            <text class="q-opt-v">{{ o.v }}</text>
            <text class="q-opt-t">{{ o.t }}</text>
          </view>
        </view>
      </view>

      <view class="q-foot">
        <button class="q-btn ghost" v-if="idx > 0" @tap="prev">上一题</button>
        <view class="q-spacer" v-else></view>
        <button class="q-btn primary" :disabled="!answers[cur.id]" @tap="next">
          {{ idx === set.total - 1 ? '提交测评' : '下一题' }}
        </button>
      </view>
    </block>

    <!-- 结果阶段 -->
    <block v-else>
      <view class="r-head">
        <text class="r-title">{{ set.title }} · 报告</text>
        <text class="r-sub">基于真实维度框架自评，仅供参考与改进方向</text>
      </view>

      <view class="radar-wrap">
        <canvas type="2d" id="radar" class="radar"></canvas>
        <view v-if="radarFail" class="radar-fallback">雷达图暂不可用，详见下方维度评分</view>
      </view>

      <view class="r-dims">
        <view class="r-dim" v-for="d in set.dims" :key="d.key">
          <view class="r-dim-top">
            <text class="r-dim-name">{{ d.name }}</text>
            <text class="r-dim-score">{{ scores[d.key].toFixed(1) }}<text class="r-dim-max">/5</text></text>
          </view>
          <view class="r-bar"><view class="r-bar-in" :style="{ width: (scores[d.key] / 5 * 100) + '%' }"></view></view>
          <text class="r-dim-desc">{{ d.desc }}</text>
        </view>
      </view>

      <view class="r-tip">
        <text class="r-tip-h">💡 提升建议</text>
        <text class="r-tip-b">{{ advice }}</text>
      </view>

      <button class="r-btn" @tap="restart">重新测评</button>
    </block>
  </view>
</template>

<script>
import { ASSESS_SETS, LIKERT } from '../../utils/assess-data.js'
export default {
  data() {
    return {
      type: 'living',
      set: { title: '', dims: [], questions: [], total: 0 },
      LIKERT,
      phase: 'quiz',
      idx: 0,
      answers: {},
      scores: {},
      advice: '',
      radarFail: false
    }
  },
  onLoad(query) {
    this.type = (query && query.type) || 'living'
    this.set = ASSESS_SETS[this.type] || ASSESS_SETS.living
    uni.setNavigationBarTitle({ title: this.set.title })
  },
  computed: {
    cur() { return this.set.questions[this.idx] || {} },
    dimName() {
      const d = this.set.dims.find(x => x.key === this.cur.dim)
      return d ? (d.group ? d.group + ' · ' + d.name : d.name) : ''
    }
  },
  methods: {
    pick(v) {
      this.$set(this.answers, this.cur.id, v)
    },
    next() {
      if (!this.answers[this.cur.id]) return
      if (this.idx < this.set.total - 1) {
        this.idx++
      } else {
        this.submit()
      }
    },
    prev() { if (this.idx > 0) this.idx-- },
    submit() {
      const scores = {}
      this.set.dims.forEach(d => {
        const qs = this.set.questions.filter(q => q.dim === d.key)
        const sum = qs.reduce((a, q) => a + (this.answers[q.id] || 0), 0)
        scores[d.key] = qs.length ? sum / qs.length : 0
      })
      this.scores = scores
      this.advice = this.buildAdvice(scores)
      this.phase = 'result'
      this.$nextTick(() => { this.drawRadar() })
    },
    buildAdvice(scores) {
      // 取最低两个维度给建议
      const arr = this.set.dims.map(d => ({ name: d.name, s: scores[d.key] })).sort((a, b) => a.s - b.s)
      const low = arr.slice(0, 2)
      const tips = {
        living: '居住体验可优先补强「' + low.map(x => x.name).join('、') + '」——这两项是「住得好」的短板，可结合真实词典对应条目给客户更针对性的居住建议。',
        service: '服务能力可优先补强「' + low.map(x => x.name).join('、') + '」——对应人才字典五维，建议结合六大方法论与工具箱刻意练习，提升客户信任与转化。'
      }
      return tips[this.type] || '持续在短板维度投入，是复利式成长的关键。'
    },
    drawRadar() {
      try {
        const query = uni.createSelectorQuery().in(this)
        query.select('#radar').fields({ node: true, size: true }).exec((res) => {
          if (!res || !res[0] || !res[0].node) { this.radarFail = true; return }
          const canvas = res[0].node
          const dpr = uni.getSystemInfoSync().pixelRatio || 2
          const w = res[0].width
          const h = res[0].height
          canvas.width = w * dpr
          canvas.height = h * dpr
          const ctx = canvas.getContext('2d')
          ctx.scale(dpr, dpr)
          this.renderRadar(ctx, w, h)
        })
      } catch (e) {
        this.radarFail = true
      }
    },
    renderRadar(ctx, w, h) {
      const dims = this.set.dims
      const n = dims.length
      const cx = w / 2
      const cy = h / 2 + 4
      const R = Math.min(w, h) / 2 - 28
      ctx.clearRect(0, 0, w, h)
      // 网格圈
      ctx.strokeStyle = '#e7e0d4'
      ctx.lineWidth = 1
      for (let ring = 1; ring <= 5; ring++) {
        ctx.beginPath()
        for (let i = 0; i <= n; i++) {
          const ang = -Math.PI / 2 + i * 2 * Math.PI / n
          const r = R * ring / 5
          const x = cx + r * Math.cos(ang)
          const y = cy + r * Math.sin(ang)
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // 轴线 + 标签
      ctx.fillStyle = '#3d5a3e'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i * 2 * Math.PI / n
        const x = cx + R * Math.cos(ang)
        const y = cy + R * Math.sin(ang)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(x, y)
        ctx.strokeStyle = '#e7e0d4'
        ctx.stroke()
        const lx = cx + (R + 14) * Math.cos(ang)
        const ly = cy + (R + 14) * Math.sin(ang)
        ctx.fillText(dims[i].name, lx, ly)
      }
      // 数据多边形
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const k = i % n
        const ang = -Math.PI / 2 + k * 2 * Math.PI / n
        const val = (this.scores[dims[k].key] || 0) / 5
        const r = R * Math.max(0.02, val)
        const x = cx + r * Math.cos(ang)
        const y = cy + r * Math.sin(ang)
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(196,106,58,0.22)'
      ctx.fill()
      ctx.strokeStyle = '#c46a3a'
      ctx.lineWidth = 2
      ctx.stroke()
      // 顶点
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i * 2 * Math.PI / n
        const val = (this.scores[dims[i].key] || 0) / 5
        const r = R * Math.max(0.02, val)
        const x = cx + r * Math.cos(ang)
        const y = cy + r * Math.sin(ang)
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fillStyle = '#c46a3a'
        ctx.fill()
      }
    },
    restart() {
      this.phase = 'quiz'
      this.idx = 0
      this.answers = {}
      this.scores = {}
      this.advice = ''
    }
  }
}
</script>

<style scoped>
.page { padding: 16px 14px 30px; }
.q-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.q-title { font-size: 17px; font-weight: 800; color: #3d5a3e; }
.q-prog { font-size: 12px; color: #b0a99e; }
.progress { height: 6px; background: #f0ece2; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
.progress-in { height: 100%; background: #3d5a3e; transition: width .2s; }
.q-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 18px; min-height: 240px; }
.q-dim { font-size: 12px; font-weight: 700; color: #c46a3a; margin-bottom: 10px; }
.q-text { font-size: 17px; font-weight: 700; color: #2b2b2b; line-height: 1.5; margin-bottom: 20px; }
.q-opts { display: flex; flex-direction: column; gap: 10px; }
.q-opt { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #e7e0d4; border-radius: 10px; background: #f7f4ef; }
.q-opt.on { border-color: #3d5a3e; background: #eef3ec; }
.q-opt-v { width: 24px; height: 24px; border-radius: 50%; background: #3d5a3e; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-opt-t { font-size: 14px; color: #555; }
.q-foot { display: flex; gap: 12px; margin-top: 16px; }
.q-spacer { flex: 1; }
.q-btn { flex: 1; border-radius: 22px; font-size: 15px; font-weight: 700; padding: 12px; line-height: 1.2; }
.q-btn.ghost { background: #fff; color: #8a837a; border: 1px solid #e7e0d4; }
.q-btn.primary { background: #3d5a3e; color: #fff; }
.q-btn.primary[disabled] { background: #c9c4ba; color: #f0ece2; }
.r-head { margin-bottom: 12px; }
.r-title { font-size: 17px; font-weight: 800; color: #3d5a3e; display: block; }
.r-sub { font-size: 11px; color: #b0a99e; line-height: 1.5; }
.radar-wrap { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 8px; margin-bottom: 14px; }
.radar { width: 100%; height: 280px; display: block; }
.radar-fallback { font-size: 12px; color: #b0a99e; text-align: center; padding: 20px; }
.r-dims { display: flex; flex-direction: column; gap: 10px; }
.r-dim { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px; }
.r-dim-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.r-dim-name { font-size: 14px; font-weight: 700; color: #3d5a3e; }
.r-dim-score { font-size: 16px; font-weight: 800; color: #c46a3a; }
.r-dim-max { font-size: 11px; color: #b0a99e; font-weight: 400; }
.r-bar { height: 8px; background: #f0ece2; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
.r-bar-in { height: 100%; background: linear-gradient(90deg, #c46a3a, #3d5a3e); transition: width .3s; }
.r-dim-desc { font-size: 11px; color: #8a837a; line-height: 1.5; }
.r-tip { background: #f7f4ef; border: 1px dashed #d9cfbe; border-radius: 12px; padding: 14px; margin: 14px 0; }
.r-tip-h { font-size: 13px; font-weight: 700; color: #3d5a3e; display: block; margin-bottom: 6px; }
.r-tip-b { font-size: 13px; color: #555; line-height: 1.6; }
.r-btn { background: #3d5a3e; color: #fff; border-radius: 22px; font-size: 15px; font-weight: 700; padding: 13px; line-height: 1.2; margin-top: 6px; }
</style>
