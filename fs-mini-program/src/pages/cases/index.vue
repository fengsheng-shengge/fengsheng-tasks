<template>
  <view class="page">
    <view class="cases-wallet">
      <view><view class="lab">我的信任积分</view><view class="num">{{ points }}<text class="unit">分</text></view></view>
      <view style="display:flex;flex-direction:column;gap:6px">
        <button class="earn" @tap="scrollEarn">如何赚积分 ›</button>
        <button class="earn" open-type="share">分享案例给客户 ›</button>
        <button class="earn" @tap="copyLink('/pages/cases/index', '小程序链接已复制 · 打开微信即可跳转')">复制小程序链接 ›</button>
      </view>
    </view>

    <view class="filter-block">
      <view class="filter-label">按客户类型</view>
      <scroll-view class="chips" scroll-x="true" enable-flex>
        <text class="chip" :class="{ on: role === 'all' }" @tap="setRole('all')">全部</text>
        <text class="chip" :class="{ on: role === r }" v-for="r in roleOpts" :key="r" @tap="setRole(r)">{{ r }}</text>
      </scroll-view>
    </view>
    <view class="filter-block">
      <view class="filter-label">按业务场景</view>
      <scroll-view class="chips" scroll-x="true" enable-flex>
        <text class="chip" :class="{ on: scene === 'all' }" @tap="setScene('all')">全部</text>
        <text class="chip" :class="{ on: scene === s }" v-for="s in sceneOpts" :key="s" @tap="setScene(s)">{{ s }}</text>
      </scroll-view>
    </view>

    <view class="section-header"><text class="section-title">精选案例库</text><text class="section-more">{{ filtered.length }} 个案例 · 全部免费</text></view>
    <view v-if="filtered.length === 0" class="icp">该筛选下暂无案例</view>
    <view class="case-card" :class="{ open: c._open }" v-for="c in filtered" :key="c.id" @tap="toggleCase(c)">
      <view class="case-tags">
        <text class="ctag role">{{ c.role }}</text><text class="ctag scene">{{ c.scene }}</text><text class="ctag mtd">{{ c.mtd }}</text>
      </view>
      <view class="case-title">{{ c.title }}</view>
      <view class="case-preview">{{ c.preview }}</view>
      <view class="case-full" v-if="c._open">
        <view class="blk"><view class="blk-h">背景</view><view class="blk-b">{{ c.full.bg }}</view></view>
        <view class="blk"><view class="blk-h">做法</view><view class="blk-b">{{ c.full.do }}</view></view>
        <view class="blk"><view class="blk-h">关键点</view><view class="blk-b">{{ c.full.key }}</view></view>
        <view class="blk"><view class="blk-h">可复用工具 / 话术</view><view class="blk-b">{{ c.full.tool }}</view></view>
      </view>
      <view class="case-foot">
        <text class="case-openbtn" @tap.stop="toggleCase(c)">{{ c._open ? '收起 ▲' : '展开全文 ▼' }}</text>
      </view>
    </view>

    <view class="section-header" style="margin-top:6px"><text class="section-title">如何获得积分</text></view>
    <view class="earn-card">
      <view class="earn-row" v-for="t in earn" :key="t.id">
        <text class="et">{{ t.t }}</text><text class="ep">+{{ t.p }}</text>
        <text class="eb" :class="{ done: userStore.isDone(t.id) }" @tap="doEarn(t)">{{ userStore.isDone(t.id) ? '已得' : '领取' }}</text>
      </view>
    </view>
    <view class="icp">积分由真实服务动作获得：完成见面策展 / 建客户档案 / 做测评 / 登录后才可领取<view>案例来自顶尖经纪人实战 · 经风声整理</view></view>
    <view id="earnCard" style="height:1px"></view>
  </view>
</template>

<script>
import { casesData, earnTasks } from '../../utils/v4data.js'
import { copyLink } from '../../utils/share.js'
import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'
export default {
  data() {
    return {
      role: 'all', scene: 'all',
      roleOpts: ['买房客户', '租客', '业主', '房东'],
      sceneOpts: ['房产交易', '租赁', '整装家居', '家政保洁', '适老'],
      cases: casesData.map(c => ({ ...c, _open: false })),
      earn: earnTasks.map(t => ({ ...t }))
    }
  },
  computed: {
    userStore() { return useUserStore() },
    points() { return this.userStore.points },
    filtered() {
      return this.cases.filter(c => (this.role === 'all' || c.role === this.role) && (this.scene === 'all' || c.scene === this.scene))
    }
  },
  onShow() { trackPageview('cases') },
  methods: {
    setRole(r) { this.role = r },
    setScene(s) { this.scene = s },
    toggleCase(c) { c._open = !c._open },
    // 真实完成态：每个任务对应产品路径的真实动作
    realDone(id) {
      const u = this.userStore
      switch (id) {
        case 'curate': return u.curatings.length > 0
        case 'profile': return u.clients.length > 0
        case 'assess': return u.assessments.length > 0
        case 'share': return u.shares > 0 || !!u.doneFlags.share
        case 'login': return !!u.doneFlags.login
        default: return false
      }
    },
    doEarn(t) {
      if (this.userStore.isDone(t.id)) return
      if (!this.realDone(t.id)) { uni.showToast({ title: '先去完成：' + t.t, icon: 'none' }); return }
      this.userStore.markDone(t.id)
      this.userStore.earnPoints(t.p, t.t)
      uni.showToast({ title: '+' + t.p + ' 积分 · ' + t.t, icon: 'none' })
    },
    scrollEarn() {
      uni.pageScrollTo({ selector: '#earnCard', duration: 300 })
    }
  },
  onShareAppMessage() {
    return {
      title: '风声 · 顶尖经纪人实战案例库，值得一看',
      path: '/pages/cases/index'
    }
  },
  onShareTimeline() {
    return { title: '风声 · 顶尖经纪人实战案例库' }
  }
}
</script>
