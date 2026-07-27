<template>
  <view class="page">
    <!-- Hero 轮播 -->
    <swiper class="hero-carousel" :autoplay="true" :interval="3800" :circular="true" :current="heroIdx" @change="onHero">
      <swiper-item v-for="(s, i) in slides" :key="i">
        <view class="slide"><image :src="s.img" class="slide-img" mode="aspectFill"></image>
          <view class="hero-cap"><view class="ht">{{ s.ht }}</view><view class="hs">{{ s.hs }}</view></view>
        </view>
      </swiper-item>
    </swiper>
    <view class="hero-dots">
      <view class="dot" :class="{ on: heroIdx === i }" v-for="(d, i) in slides" :key="i" @tap="goSlide(i)"></view>
    </view>
    <view class="hero-badge">风声 · 智能工具包</view>

    <!-- 信任积分 -->
    <view class="trust-banner">
      <view class="tb-ico">⭐</view>
      <view class="tb-l">
        <view class="tb-lab">信任积分</view>
        <view class="tb-num">{{ points }}<text class="unit">分</text></view>
        <view class="tb-goal">本月目标 30 次服务动作 · 已得 {{ serviceCount }} 次</view>
        <view class="tb-bar"><view class="tb-fill" :style="{ width: fillPct + '%' }"></view></view>
      </view>
    </view>

    <!-- 搜索 -->
    <view class="search-bar" @tap="toast('搜索功能（模拟）')">
      <text class="icon">🔍</text><text class="text">搜索知识 / 工具 / 客户</text><text class="btn">搜索</text>
    </view>

    <!-- 核心功能 -->
    <view class="section-header"><text class="section-title">核心功能</text><text class="section-more">全部 ›</text></view>
    <view class="product-grid">
      <view class="product-card featured" @tap="go('curate')">
        <view class="product-icon orange">💡</view>
        <view class="product-name">见面策展</view>
        <view class="product-desc">见前策展 + 见后跟进，把零散认知变专业方案</view>
        <text class="product-tag hot">核心</text>
      </view>
      <view class="product-card" @tap="go('clients')">
        <view class="product-icon green">👥</view>
        <view class="product-name">客户档案</view>
        <view class="product-desc">一次委托终生服务，每个客户都是资产</view>
        <text class="product-tag free">私域</text>
      </view>
      <view class="product-card" @tap="go('knowledge')">
        <view class="product-icon brown">📖</view>
        <view class="product-name">知识字典</view>
        <view class="product-desc">7 域 104 条行业词条，随时查阅</view>
        <text class="product-tag free">免费</text>
      </view>
      <view class="product-card" @tap="go('assess')">
        <view class="product-icon blue">📊</view>
        <view class="product-name">品质测评</view>
        <view class="product-desc">住得好 7 维 + 服务者 5 维评分</view>
        <text class="product-tag free">免费</text>
      </view>
    </view>

    <!-- 案例 promo -->
    <view class="case-promo" @tap="go('cases')">
      <view class="cp-l"><view class="cp-t">🌟 优秀经纪人最佳案例灵感库</view><view class="cp-s">按客户类型 / 业务场景筛选 · 积分查阅顶尖实战</view></view>
      <view class="cp-r">进入 ›</view>
    </view>

    <!-- 今日跟进（V2.5 M3：把各客户待办跟进聚到首页，持续创造服务机会） -->
    <view class="section-header" v-if="todayFollowups.length"><text class="section-title">今日跟进</text><text class="section-more">带新价值 · 非营销</text></view>
    <view class="follow-card" v-for="(f, i) in todayFollowups" :key="i" @tap="goFollowup(f.clientId)">
      <view class="fc-top"><text class="fc-client">{{ f.clientName }}</text><text class="fc-theme">{{ f.theme }}</text></view>
      <view class="fc-text">{{ f.text }}</view>
      <view class="fc-lt">LTRUST · {{ f.ltrust }}</view>
    </view>
    <view class="follow-empty" v-if="!todayFollowups.length">暂无待跟进 · 去「见面策展」生成带新价值的跟进触点 ›</view>

    <!-- 6 方法论（b·P1-3：滑动引导，降低首屏认知负荷） -->
    <view class="section-header"><text class="section-title">6 大方法论</text><text class="section-more">← 左右滑动看全部 6 个</text></view>
    <scroll-view class="steps-row" scroll-x="true" enable-flex @scroll="onMethodScroll">
      <view class="step-card" v-for="(m, i) in methods" :key="i">
        <text class="step-num">方法 {{ i + 1 }}</text>
        <view class="step-title">{{ m.name }}</view>
        <view class="step-desc">{{ m.desc }}</view>
      </view>
    </scroll-view>
    <view class="step-dots"><view class="sd" v-for="(m, i) in methods" :key="'d' + i" :class="{ on: i === methodIdx }"></view></view>
    <view style="font-size:11px;color:var(--text-muted);margin:-4px 2px 14px;line-height:1.5">6 方法论的底层是 <text style="color:var(--green)">LTRUST 信任五维</text>（听 · 险 · 相关 · 低承 · 档案）——把每一次见面校准成信任，详见策展包内「LTRUST 校准」。</view>

    <view class="icp">风声 · 帮助服务者用独立价值获得尊重<view>客户数据仅你可见，平台不收取、不用于撮合</view></view>
  </view>
</template>

<script>
import { methods } from '../../utils/v4data.js'
import { useUserStore } from '../../store/user'
import hero1 from '@/static/hero1.png'
import hero2 from '@/static/hero2.png'
import hero3 from '@/static/hero3.png'
import hero4 from '@/static/hero4.png'
export default {
  data() {
    return {
      methods,
      heroIdx: 0,
      methodIdx: 0,
      slides: [
        { img: hero1, ht: '把专业装进口袋', hs: '顶尖经纪人的「方法论 + 工具箱」，一次见面全用上' },
        { img: hero2, ht: '住得更好的样子', hs: '从「说得多没依据」到「讲得准、有依据、做得多」' },
        { img: hero3, ht: '深耕你的商圈', hs: '把一个社区吃到骨头里——信任来自重复、专业、在场' },
        { img: hero4, ht: '一次委托 · 终生服务', hs: '售后飞轮转起来——被记住，才有转介绍与下一单' }
      ]
    }
  },
  computed: {
    userStore() { return useUserStore() },
    // 真实积分：读 userStore，避免与「我的」页对不上（数据诚实铁律）
    points() { return this.userStore.points || 0 },
    // 真实服务动作数：与「我的」页同口径，不送假数据（seed 示例客户 / 登录不计入）
    serviceCount() {
      const u = this.userStore
      const realClients = (u.clients || []).filter(c => !c.seed).length
      return (u.curatings ? u.curatings.length : 0)
           + realClients
           + (u.assessments ? u.assessments.length : 0)
           + (u.shares || 0)
    },
    fillPct() { return Math.min(100, Math.round((this.serviceCount / 30) * 100)) },
    // V2.5 M3：聚合所有客户未完成的见后跟进，搬到首页"今日跟进"
    todayFollowups() {
      const out = []
      this.userStore.clients.forEach(c => {
        ;(c.followups || []).forEach(f => {
          if (!f.done) out.push({ clientId: c.id, clientName: c.name, theme: f.theme, text: f.text, ltrust: f.ltrust })
        })
      })
      return out.slice(0, 8)
    }
  },
  methods: {
    onHero(e) { this.heroIdx = e.detail.current },
    onMethodScroll(e) {
      // 卡宽 124 + 间距 10 = 134，按滚动位置联动进度圆点
      const i = Math.round((e.detail.scrollLeft || 0) / 134)
      this.methodIdx = Math.max(0, Math.min(5, i))
    },
    goSlide(i) { this.heroIdx = i },
    go(tab) {
      if (tab === 'clients' || tab === 'assess') uni.navigateTo({ url: '/pages/' + tab + '/index' })
      else uni.switchTab({ url: '/pages/' + tab + '/index' })
    },
    goFollowup(clientId) {
      // 客户档案页非 tabBar 页，须用 navigateTo；用 URL 参数带目标客户（$emit 在目标页 onLoad 前会丢失）
      uni.navigateTo({ url: '/pages/clients/index?focus=' + clientId })
    },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) }
  }
}
</script>

<style scoped>
.follow-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px; margin: 0 0 10px; }
.follow-card:active { background: #f7f4ef; }
.fc-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fc-client { font-size: 13px; font-weight: 700; color: #3d5a3e; }
.fc-theme { font-size: 13px; font-weight: 700; color: #c46a3a; }
.fc-text { font-size: 12.5px; color: #555; margin-top: 4px; line-height: 1.5; }
.fc-lt { font-size: 11px; color: #C8956D; margin-top: 3px; }
.follow-empty { font-size: 12.5px; color: #999; background: #fff; border: 1px dashed #e7e0d4; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 10px; }
/* b·P1-3：6 方法论滑动进度圆点 */
.step-dots { display: flex; justify-content: center; gap: 5px; margin: -2px 0 12px; }
.sd { width: 5px; height: 5px; border-radius: 50%; background: #d8d2c6; transition: all .2s; }
.sd.on { width: 14px; border-radius: 3px; background: #3d5a3e; }
</style>
