<template>
  <view class="page">
    <view class="featured-cta">
      <view style="font-size:16px;font-weight:700">🎯 见面参谋（真实字典生成）</view>
      <view style="font-size:12px;opacity:.9;line-height:1.5;margin:4px 0 12px">基于真实字典，输入客户当下情况秒出专属「说 / 带 / 问 + 见后跟进」，每条挂真实依据，随客户不同而不同。</view>
      <button class="btn-cta" @tap="openPrep()">进入见面参谋 →</button>
    </view>
    <view class="featured-cta" style="background:#f3f0ea;color:#3d5a3e">
      <view style="font-size:16px;font-weight:700">📇 从客户档案生成</view>
      <view style="font-size:12px;opacity:.8;line-height:1.5;margin:4px 0 12px">选一个客户，自动带入其双纵轴阶段与诉求，生成专属参谋包并沉淀到认知卡。</view>
      <button class="btn-cta" style="background:#3d5a3e" @tap="showPicker = true">选择客户 →</button>
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
    <view v-if="lib.length === 0" class="empty">还没有策展，点上方「进入见面参谋」开始。</view>
    <view class="libitem" v-for="(l, i) in lib" :key="i" @tap="openPrep()">
      <view class="lt"><view class="t">{{ l.t }}</view><view class="s">{{ l.s }}</view></view>
      <text class="ok">已生成</text>
    </view>

    <!-- 选择客户浮层（用于「从客户档案生成」） -->
    <view class="overlay" :class="{ active: showPicker }">
      <view class="ov-nav">
        <button class="back" @tap="showPicker = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">选择客户</view><view class="sub">选后自动带入其双纵轴与诉求</view></view>
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
        <button class="btn-orange" @tap="useInCurate(tool)">在见面参谋中使用 →</button>
        <button class="btn-line" open-type="share" @tap="sharePayload = { title: '风声工具箱 · ' + tool.name, path: '/pages/curate/index' }">分享给同事/客户</button>
        <button class="btn-line" @tap="copyLink('/pages/curate/index')">复制小程序链接</button>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { methods, personaMap, toolbox } from '../../utils/v4data.js'
import { buildShareLink, copyLink, APP_SHARE_TITLE } from '../../utils/share.js'
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      methods: methods.map(m => ({ ...m, open: false })),
      toolbox: toolbox,
      showPicker: false,
      showToolOverlay: false,
      tool: {},
      sharePayload: null
    }
  },
  computed: {
    userStore() { return useUserStore() },
    clientList() { return this.userStore.clients },
    lib() {
      return this.userStore.curatings.map(c => ({ t: c.t, s: c.s }))
    }
  },
  onLoad() {
    // 客户档案页「去策展」事件：直接带客户进入真实引擎
    uni.$on('openCurateForm', (id) => {
      this.openPrep(id)
    })
  },
  onUnload() { uni.$off('openCurateForm') },
  onShareAppMessage() {
    return this.sharePayload || { title: APP_SHARE_TITLE, path: '/pages/curate/index' }
  },
  onShareTimeline() {
    return { title: '风声 · 见面策展工具', query: '' }
  },
  methods: {
    personaOf(c) { return (personaMap[c.pkey] || personaMap.red).tag },
    openPrep(id) {
      let url = '/package-curation/pages/curate-prep/index'
      if (id) url += '?clientId=' + id
      uni.navigateTo({ url })
    },
    pickClient(c) {
      this.showPicker = false
      this.openPrep(c.id)
    },
    goClients() {
      this.showPicker = false
      uni.switchTab({ url: '/pages/clients/index' })
    },
    showTool(t) {
      this.tool = t
      this.showToolOverlay = true
    },
    useInCurate(t) {
      this.showToolOverlay = false
      this.openPrep()
    },
    shareTitle() {
      return '我为客户准备了这次见面的专业方案，请查收'
    },
    setShareCurate() {
      this.sharePayload = { title: this.shareTitle(), path: '/pages/curate/index' }
    },
    copyCurateLink() {
      copyLink('/pages/curate/index', '链接已复制 · 客户在微信外也能打开')
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
.methodcard { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.mh { font-size: 15px; font-weight: 700; color: #2b2b2b; display: flex; align-items: center; }
.mh .arrow { margin-left: auto; color: #bbb; }
.ms { font-size: 12.5px; color: #777; margin-top: 6px; line-height: 1.6; }
.featured-cta { background: linear-gradient(135deg,#3d5a3e,#4d7050); color:#fff; border-radius:14px; padding:16px; margin-bottom:14px; }
.btn-cta { background:#fff; color:#3d5a3e; border:none; border-radius:999px; padding:11px 18px; font-size:14px; font-weight:700; }
.section-header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px; }
.section-title { font-size:15px; font-weight:700; color:#2b2b2b; }
.section-more { font-size:11px; color:#999; }
.libitem { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:12px 14px; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
.lt { flex:1; }
.lt .t { font-size:14px; font-weight:700; color:#2b2b2b; }
.lt .s { font-size:12px; color:#888; margin-top:2px; }
.ok { font-size:11px; color:#3d5a3e; background:#eef3ec; padding:3px 8px; border-radius:6px; font-weight:700; }
.overlay { position:fixed; inset:0; z-index:50; background:#f7f4ef; transform:translateY(100%); transition:transform .25s ease; pointer-events:none; display:flex; flex-direction:column; }
.overlay.active { transform:translateY(0); pointer-events:auto; }
.ov-nav { display:flex; align-items:center; gap:10px; padding:14px 16px; background:#fff; border-bottom:1px solid #e7e0d4; }
.ov-nav .back { background:none; border:none; font-size:22px; color:#3d5a3e; line-height:1; }
.ov-nav .sub { font-size:12px; color:#888; margin-top:2px; }
.ovcontent { flex:1; padding:16px; overflow-y:auto; padding-bottom:calc(10px + 110rpx + env(safe-area-inset-bottom)); }
.pick-item { background:#fff; border:1px solid #e7e0d4; border-radius:10px; padding:12px; margin-bottom:8px; }
.pi-name { font-size:15px; font-weight:700; color:#2b2b2b; }
.pi-meta { font-size:12px; color:#888; margin-top:2px; }
.btn-line { background:#fff; color:#c46a3a; border:1px solid #e7d3c2; border-radius:10px; padding:12px; font-size:14px; margin-top:8px; }
.btn-orange { background:#c46a3a; color:#fff; border-radius:10px; padding:12px; font-size:15px; margin-top:6px; }
.sec { background:#fff; border:1px solid #e7e0d4; border-radius:12px; padding:12px 14px; margin-bottom:10px; }
.sec .h { font-size:14px; font-weight:700; color:#2b2b2b; display:flex; align-items:center; gap:6px; margin-bottom:8px; }
.sec .em { font-size:15px; }
.sec-list { }
.sec-li { font-size:13px; color:#555; line-height:1.6; padding:4px 0; border-bottom:1px dashed #eee; }
</style>
