<template>
  <view class="page">
    <view class="knowledge-banner">
      <view><text style="font-size:18px;font-weight:700">风声知识底座</text></view>
      <view style="font-size:12px;opacity:.85;line-height:1.5;margin-top:6px">词典 · 测评 · 案例，随时查阅（真实口径，非估算）</view>
    </view>

    <!-- 三模块分段切换 -->
    <view class="kg-tabs">
      <view class="kg-tab" :class="{ on: mod === 'dict' }" @tap="setMod('dict')">业务词典</view>
      <view class="kg-tab" :class="{ on: mod === 'assess' }" @tap="setMod('assess')">品质测评</view>
      <view class="kg-tab" :class="{ on: mod === 'cases' }" @tap="setMod('cases')">案例灵感</view>
    </view>

    <!-- 模块一：业务词典（真实词条） -->
    <view v-if="mod === 'dict'">
      <view class="section-header"><text class="section-title">业务词典</text><text class="section-more">{{ allEntries.length }} 条真实词条</text></view>
      <view class="dict-search">
        <input class="dict-input" v-model="kw" placeholder="搜词条：学区 / 公积金 / 产权 / 甲醛 / 违约…" confirm-type="search" />
      </view>
      <scroll-view scroll-x="true" enable-flex class="dict-chips">
        <view class="chip" :class="{ on: curDomain === '' }" @tap="curDomain = ''">全部</view>
        <view class="chip" v-for="d in dictDomains" :key="d.key" :class="{ on: curDomain === d.key }" @tap="curDomain = d.key">{{ d.key }}<text class="chip-n">{{ d.count }}</text></view>
      </scroll-view>
      <view class="dict-list">
        <view class="dict-entry" v-for="e in filteredEntries" :key="e.id" @tap="toggleEntry(e)">
          <view class="de-head">
            <text class="de-name">{{ e.name }}</text>
            <text v-if="e.hasLegal" class="de-badge">✓ 真实依据</text>
          </view>
          <view v-if="e._open" class="de-body">
            <view v-if="e.alias && e.alias.length" class="de-row"><text class="de-k">别名</text><text class="de-v">{{ e.alias.join('、') }}</text></view>
            <view v-if="e.cq" class="de-row"><text class="de-k">必问</text><text class="de-v">{{ e.cq }}</text></view>
            <view v-if="e.ola" class="de-row"><text class="de-k">销冠话术</text><text class="de-v">{{ e.ola }}</text></view>
            <view v-if="e.consumerBenefit" class="de-row"><text class="de-k">客户利益</text><text class="de-v">{{ e.consumerBenefit }}</text></view>
            <view v-if="e.cp && e.cp.length" class="de-row"><text class="de-k">常见误区</text><text class="de-v">{{ e.cp.join('；') }}</text></view>
            <view v-if="e.detail" class="de-row"><text class="de-k">详情</text><text class="de-v">{{ e.detail }}</text></view>
            <view class="de-row"><text class="de-k">依据</text><text class="de-v" :class="e.hasLegal ? 'de-legal-ok' : 'de-legal-wait'">{{ e.legalRef || '依据整理中' }}</text></view>
          </view>
        </view>
        <view v-if="filteredEntries.length === 0" class="empty">没有匹配的词条，换个关键词试试</view>
      </view>
      <view class="icp">词条口径经全量核对（#111）<view>数据校对 5 步链路 · 禁止凭印象</view></view>
    </view>

    <!-- 模块二：品质测评 -->
    <view v-if="mod === 'assess'">
      <view class="section-header"><text class="section-title">品质测评</text><text class="section-more">已完成 {{ assessCount }} 次</text></view>
      <view class="kg-card">
        <view style="font-size:16px;font-weight:700">🏠 住得好测评</view>
        <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 12px;line-height:1.6">美好居住 7 维度评分：安全 / 健康 / 便利 / 经济 / 舒适 / 美观 / 自在</view>
        <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:12px"><text>⏱️ 5-8 分钟</text><text>📝 21 题</text><text>📊 雷达图报告</text></view>
        <button class="kg-btn" @tap="goAssess">开始测评</button>
      </view>
      <view class="kg-card">
        <view style="font-size:16px;font-weight:700">👤 服务者能力测评</view>
        <view style="font-size:12px;color:var(--text-secondary);margin:8px 0 12px;line-height:1.6">5 维度能力评估：专业知识 / 服务规范 / 沟通能力 / 工具应用 / 职业素养</view>
        <view style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);margin-bottom:12px"><text>⏱️ 10-15 分钟</text><text>📝 75 题</text><text>📊 能力雷达图</text></view>
        <button class="kg-btn" @tap="goAssess">开始测评</button>
      </view>
    </view>

    <!-- 模块三：案例灵感（预览 + 进完整页筛选） -->
    <view v-if="mod === 'cases'">
      <view class="section-header"><text class="section-title">案例灵感库</text><text class="section-more">{{ caseList.length }} 个 · 全部免费</text></view>
      <view class="kg-case" v-for="c in casePreview" :key="c.id" @tap="toggleCase(c)">
        <view class="kg-case-tags">
          <text class="kg-tag">{{ c.role }}</text><text class="kg-tag">{{ c.scene }}</text><text class="kg-tag">{{ c.mtd }}</text>
        </view>
        <view class="kg-case-title">{{ c.title }}</view>
        <view class="kg-case-preview">{{ c.preview }}</view>
        <view class="kg-case-full" v-if="c._open">
          <view class="blk"><view class="blk-h">背景</view><view class="blk-b">{{ c.full.bg }}</view></view>
          <view class="blk"><view class="blk-h">做法</view><view class="blk-b">{{ c.full.do }}</view></view>
          <view class="blk"><view class="blk-h">关键点</view><view class="blk-b">{{ c.full.key }}</view></view>
          <view class="blk"><view class="blk-h">可复用工具 / 话术</view><view class="blk-b">{{ c.full.tool }}</view></view>
        </view>
        <view class="kg-case-foot"><text class="kg-case-openbtn">{{ c._open ? '收起 ▲' : '展开全文 ▼' }}</text></view>
      </view>
      <button class="kg-btn block" @tap="goCases">查看全部 {{ caseList.length }} 个案例（按客户类型 / 场景筛选）›</button>
    </view>
  </view>
</template>

<script>
import { casesData } from '../../utils/v4data.js'
import { useUserStore } from '../../store/user'
import ENTRIES from '../../utils/entries_slim.js'

// 真实法源判定（与策展引擎同口径）：仅真实 legalRef 挂徽标，缺失诚实标注
function realLegal(ref) {
  if (!ref) return false
  const s = String(ref).trim()
  return !/待补充|待核|无|—|^-$|^\s*$/.test(s) && s.length >= 4
}
// 顶层为 {decoder:[], see:[], nego:[]}，拍平为词条数组
const RAW = Array.isArray(ENTRIES) ? ENTRIES : Object.values(ENTRIES).flat()
const ALL = RAW.map(e => ({ ...e, hasLegal: realLegal(e.legalRef) }))

export default {
  data() {
    return {
      mod: 'dict',
      kw: '',
      curDomain: '',
      allEntries: ALL,
      caseList: casesData.map(c => ({ ...c, _open: false }))
    }
  },
  computed: {
    userStore() { return useUserStore() },
    assessCount() { return this.userStore.assessments.length },
    casePreview() { return this.caseList.slice(0, 3) },
    // 真实语义域（签约前 / 签约中 …）动态聚合，带计数
    dictDomains() {
      const map = {}
      this.allEntries.forEach(e => {
        const k = e.domain || '其他'
        map[k] = (map[k] || 0) + 1
      })
      return Object.keys(map).map(k => ({ key: k, count: map[k] }))
    },
    filteredEntries() {
      let list = this.allEntries
      if (this.curDomain) list = list.filter(e => (e.domain || '其他') === this.curDomain)
      const kw = (this.kw || '').trim()
      if (kw) {
        const low = kw.toLowerCase()
        list = list.filter(e => {
          const s = [e.name, (e.alias || []).join(' '), e.cq, e.ola, (e.cp || []).join(' '), e.detail, e.consumerBenefit, e.legalRef]
            .filter(Boolean).join(' ').toLowerCase()
          return s.includes(low)
        })
      }
      return list
    }
  },
  methods: {
    setMod(m) { this.mod = m },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) },
    goAssess() { uni.navigateTo({ url: '/pages/assess/index' }) },
    goCases() { uni.navigateTo({ url: '/pages/cases/index' }) },
    toggleCase(c) { c._open = !c._open },
    toggleEntry(e) { e._open = !e._open }
  }
}
</script>

<style scoped>
.knowledge-banner { background: linear-gradient(135deg,#3d5a3e,#4d7050); color:#fff; border-radius:14px; padding:16px; margin-bottom:14px; }
.kg-tabs { display:flex; gap:8px; background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:5px; margin-bottom:14px; }
.kg-tab { flex:1; text-align:center; font-size:14px; font-weight:700; color:#888; padding:9px 0; border-radius:9px; }
.kg-tab.on { background:#3d5a3e; color:#fff; }
.kg-card { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:14px; margin-bottom:12px; }
.kg-btn { background:#3d5a3e; color:#fff; border:none; border-radius:999px; padding:11px 18px; font-size:14px; font-weight:700; }
.kg-btn.block { width:100%; margin-top:6px; }
.kg-case { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:13px; margin-bottom:10px; }
.kg-case-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
.kg-tag { font-size:11px; padding:2px 8px; border-radius:6px; background:#f0ece2; color:#888; }
.kg-case-title { font-size:15px; font-weight:700; color:#2b2b2b; }
.kg-case-preview { font-size:12.5px; color:#666; margin-top:4px; line-height:1.5; }
.kg-case-full { margin-top:8px; }
.kg-case-full .blk { margin-bottom:8px; }
.kg-case-full .blk-h { font-size:12px; font-weight:700; color:#3d5a3e; margin-bottom:2px; }
.kg-case-full .blk-b { font-size:12.5px; color:#555; line-height:1.6; }
.kg-case-foot { margin-top:6px; }
.kg-case-openbtn { font-size:12px; color:#c46a3a; font-weight:700; }
/* 真实词典模块（ascii 类名，合规真机编译） */
.dict-search { margin-bottom:10px; }
.dict-input { background:#fff; border:1px solid #e7e0d4; border-radius:10px; padding:10px 12px; font-size:14px; color:#2b2b2b; width:100%; box-sizing:border-box; }
.dict-chips { white-space:nowrap; display:flex; gap:8px; margin-bottom:12px; }
.chip { flex:0 0 auto; padding:7px 12px; background:#f0ece2; border-radius:999px; font-size:13px; color:#555; }
.chip.on { background:#3d5a3e; color:#fff; font-weight:700; }
.chip-n { margin-left:6px; font-size:11px; opacity:.7; }
.dict-list { }
.dict-entry { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:13px 14px; margin-bottom:10px; }
.de-head { display:flex; align-items:center; gap:8px; }
.de-name { font-size:15px; font-weight:700; color:#2b2b2b; flex:1; }
.de-badge { font-size:11px; color:#3d5a3e; background:#eef3ec; padding:2px 8px; border-radius:6px; font-weight:700; }
.de-body { margin-top:10px; border-top:1px dashed #eee; padding-top:10px; }
.de-row { display:flex; gap:8px; margin-bottom:8px; align-items:flex-start; }
.de-k { flex:0 0 64px; font-size:12px; font-weight:700; color:#c46a3a; padding-top:1px; }
.de-v { flex:1; font-size:13px; color:#444; line-height:1.6; }
.de-legal-ok { color:#3d5a3e; font-weight:600; }
.de-legal-wait { color:#8a837a; }
.empty { background:#fff; border:1px dashed #e7e0d4; border-radius:12px; padding:18px; text-align:center; color:#999; font-size:13px; margin-bottom:10px; }
.icp { font-size:11px; color:#aaa; text-align:center; margin-top:8px; line-height:1.6; }
</style>
