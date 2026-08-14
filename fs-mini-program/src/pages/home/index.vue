<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="brand">风声<text class="brand-en">fengsheng</text></view>
      <view class="sub">{{ brokerName }} · 本地登录态</view>
    </view>

    <!-- Hero 轮播 -->
    <view class="hero-wrap">
      <swiper class="hero-carousel" :autoplay="true" :interval="3800" :circular="true" :current="heroIdx" @change="onHero">
        <swiper-item v-for="(s, i) in slides" :key="i">
          <view class="slide" @tap="onBannerTap(i)">
            <image :src="s.img" class="slide-img" mode="aspectFill"></image>
            <view class="hero-cap">
              <view class="ht">{{ s.ht }}</view>
              <view class="hs">{{ s.hs }}</view>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="hero-badge">风声 · 经纪人的决策参谋</view>
    </view>
    <view class="hero-dots">
      <view class="dot" :class="{ on: heroIdx === i }" v-for="(d, i) in slides" :key="i" @tap="goSlide(i)"></view>
    </view>

    <!-- 核心功能 -->
    <view class="section-header">
      <text class="section-title">核心功能</text>
      <text class="section-more" @tap="onFeatureMore()">全部 ›</text>
    </view>
    <view class="feature-grid">
      <view class="feature-card" @tap="trackFeature('curate')">
        <view class="feature-icon orange">💡</view>
        <view class="feature-name">顾问简报</view>
        <view class="feature-desc">购房选筹 · 售房定价 · 租房带看，全场景方案支持</view>
      </view>
      <view class="feature-card" @tap="trackFeature('assess')">
        <view class="feature-icon blue">📊</view>
        <view class="feature-name">品质测评</view>
        <view class="feature-desc">住得好 7 维 + 服务者 5 维，真实算分</view>
      </view>
      <view class="feature-card" @tap="trackFeature('knowledge')">
        <view class="feature-icon brown">📖</view>
        <view class="feature-name">知识字典</view>
        <view class="feature-desc">2464 条真实行业词条，随时查证</view>
      </view>
      <view class="feature-card" @tap="trackFeature('clients')">
        <view class="feature-icon green">👥</view>
        <view class="feature-name">客户档案</view>
        <view class="feature-desc">一次委托终生服务，每个客户都是资产</view>
      </view>
    </view>

    <!-- 今日待办（聚合客户未跟进项） -->
    <view class="card" v-if="todayFollowups.length">
      <view class="card-header">
        <view class="title">🔥 今日待办 <text class="count" style="color:var(--orange)">({{ todayFollowups.length }})</text></view>
        <view class="more" @tap="go('clients')">查看全部 ›</view>
      </view>
      <view class="todo-list">
        <view
          v-for="(f, i) in todayFollowups"
          :key="i"
          class="todo-item orange"
          @tap="goFollowup(f.clientId)"
        >
          <view class="todo-ic">💬</view>
          <view class="todo-txt">
            <view class="todo-t">{{ f.clientName }} · {{ f.theme }}</view>
            <view class="todo-m">
              <text class="tag tag-orange">{{ f.ltrust }}</text>
            </view>
          </view>
          <view class="todo-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 今日见面作战简报（基于客户档案 note + 历史策展 cognition 真实数据派生，不编造） -->
    <view class="card" v-if="warBrief.length">
      <view class="card-header">
        <view class="title">📋 今日见面作战简报</view>
        <view class="more" @tap="go('clients')">全部客户 ›</view>
      </view>
      <view class="brief-list">
        <view class="brief-item" v-for="(b, i) in warBrief" :key="i" @tap="goFollowup(b.id)">
          <view class="brief-av" :style="{ background: b.avatarColor }">{{ b.avatar }}</view>
          <view class="brief-body">
            <view class="brief-top">
              <text class="brief-name">{{ b.name }}</text>
              <text class="tag tag-cream">{{ b.tag }}</text>
            </view>
            <view class="brief-need" v-if="b.need">🎯 需求：{{ b.need }}</view>
            <view class="brief-grip" v-if="b.grip">💡 见面抓手：{{ b.grip }}</view>
            <view class="brief-empty" v-else>尚未生成策展 · 点此为其生成简报</view>
          </view>
          <view class="brief-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 快速生成 -->
    <view class="quick-card" @tap="go('curate')">
      <view class="qc-title">
        <view class="qc-ic">✨</view>
        <view class="t">
          <view class="qc-main">快速生成顾问简报</view>
          <view class="qc-sub">购房选筹 · 售房定价 · 租房带看 — 全场景支持</view>
        </view>
      </view>
      <view class="qc-input">
        <text class="ic">👤</text>
        <text class="placeholder">客户称呼 + 一句话描述需求…</text>
      </view>
      <view class="qc-hint">💡 自动识别业务类型，<text class="highlight-text">购房 / 售房 / 租房</text> 都能出方案</view>
      <view class="qc-btn"><text>🚀</text><text>开始生成简报</text></view>
    </view>

    <!-- 最近客户 -->
    <view class="card" v-if="recentClients.length">
      <view class="card-header">
        <view class="title">👥 最近客户</view>
        <view class="more" @tap="go('clients')">全部客户 ›</view>
      </view>
      <scroll-view class="recent-scroll" scroll-x>
        <view
          v-for="c in recentClients"
          :key="c.id"
          class="rc-card"
          @tap="goFollowup(c.id)"
        >
          <view class="rc-av" :style="{ background: c.avatarColor }">{{ c.avatar }}</view>
          <view class="rc-n">{{ c.name }}</view>
          <view class="rc-tags"><text class="tag tag-cream">{{ c.tag }}</text></view>
          <view class="rc-d">{{ c.lastFollow }}</view>
        </view>
        <view class="rc-card rc-more" @tap="go('clients')">
          <view class="rc-av" style="background:#EFE8DB">+</view>
          <view class="rc-n">更多</view>
        </view>
      </scroll-view>
    </view>

    <!-- 本周战绩 -->
    <view class="card">
      <view class="card-header">
        <view class="title">📊 服务战绩</view>
        <view class="more">本月目标 30 次</view>
      </view>
      <view class="stats-row">
        <view class="stat-card green">
          <view class="stat-num">{{ serviceCount }}</view>
          <view class="stat-lbl">真实<text class="stat-highlight">服务</text></view>
        </view>
        <view class="stat-card orange">
          <view class="stat-num">{{ (userStore.curatings || []).length }}</view>
          <view class="stat-lbl">生成<text class="stat-highlight">简报</text></view>
        </view>
        <view class="stat-card gold">
          <view class="stat-num">{{ points }}</view>
          <view class="stat-lbl">信任<text class="stat-highlight">积分</text></view>
        </view>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import hero1 from '../../static/hero1.png'
import hero2 from '../../static/hero2.png'
import hero3 from '../../static/hero3.png'
import hero4 from '../../static/hero4.png'
import { trackEvent } from '../../utils/tracker'
export default {
  data() {
    return {
      heroIdx: 0,
      slides: [
        { img: hero1, ht: '经纪人的决策参谋', hs: '购房 · 售房 · 租房，把专业方案装进口袋' },
        { img: hero2, ht: '从带看中介到决策顾问', hs: '拆需求 · 出方案 · 给话术 · 帮跟进，一次见面全用上' },
        { img: hero3, ht: '全场景方案支持', hs: '购房选筹 · 售房定价 · 租房带看，陪你落地铁律' },
        { img: hero4, ht: '一次委托 · 终生服务', hs: '客户即资产，售后飞轮转出信任与转介绍' }
      ]
    }
  },
  computed: {
    userStore() { return useUserStore() },
    brokerName() { return this.userStore.nickname || '风声用户' },
    points() { return this.userStore.points || 0 },
    // 真实服务动作数：由用户真实产品路径累计（seed 示例客户不计入，登录不计入服务次数）
    serviceCount() {
      const u = this.userStore
      const realClients = (u.clients || []).filter(c => !c.seed).length
      return (u.curatings ? u.curatings.length : 0)
           + realClients
           + (u.assessments ? u.assessments.length : 0)
           + (u.shares || 0)
    },
    // 最近客户（最多 6 个，取前 N 个）
    recentClients() {
      const palette = ['#3D5A3E', '#C46A3A', '#9c7c3a', '#5E7291', '#5c745d', '#d98a5c']
      return (this.userStore.clients || []).slice(0, 6).map((c, i) => ({
        id: c.id,
        name: c.name || '客户',
        avatar: (c.name || '客')[0],
        avatarColor: palette[i % palette.length],
        tag: c.ctype || (c.tags && c.tags[0]) || '购房',
          lastFollow: c.lastFollow || '今天跟进'
        }))
      },
      // V3.3 今日见面作战简报：基于客户档案 note + 历史策展 cognition 真实数据派生，不编造
      warBrief() {
        return this.recentClients
          .map(c => {
            const full = this.userStore.getClient(c.id) || {}
            const cog = (full.cognition && full.cognition.log && full.cognition.log[0]) || null
            const sayTitles = (cog && cog.sayTitles) || []
            const grip = sayTitles.length
              ? sayTitles[0]
              : (cog && cog.axisLabel ? ('已生成「' + cog.axisLabel + '」策展，可复用该说的要点') : '')
            return {
              id: c.id,
              name: c.name,
              avatar: c.avatar,
              avatarColor: c.avatarColor,
              tag: c.tag,
              need: full.note || '',
              grip
            }
          })
          .filter(b => b.need || b.grip)
          .slice(0, 3)
      },
      // 聚合所有客户未完成的见后跟进，搬到首页"今日待办"
      todayFollowups() {
      const out = []
      this.userStore.clients.forEach(c => {
        ;(c.followups || []).forEach(f => {
          if (!f.done) out.push({ clientId: c.id, clientName: c.name, theme: f.theme, ltrust: f.ltrust })
        })
      })
      return out.slice(0, 6)
    }
  },
  methods: {
    onHero(e) {
      this.heroIdx = e.detail.current
      const s = this.slides[this.heroIdx]
      trackEvent('banner_show', 'home', { slide: this.heroIdx, title: s && s.ht })
    },
    goSlide(i) {
      this.heroIdx = i
      const s = this.slides[i]
      trackEvent('banner_click', 'home', { slide: i, title: s && s.ht })
    },
    onBannerTap(i) {
      const s = this.slides[i]
      trackEvent('banner_click', 'home', { slide: i, title: s && s.ht })
    },
    trackFeature(tab) {
      trackEvent('feature_click', 'home', { feature: tab })
      this.go(tab)
    },
    onFeatureMore() {
      trackEvent('feature_more', 'home', {})
      this.go('tools')
    },
    go(tab) {
      const tabs = ['home', 'clients', 'curate', 'tools', 'profile']
      if (tabs.indexOf(tab) >= 0) uni.switchTab({ url: '/pages/' + tab + '/index' })
      else uni.navigateTo({ url: '/pages/' + tab + '/index' })
    },
    goFollowup(clientId) {
      this.userStore.focusClientId = clientId
      uni.navigateTo({ url: '/pages/clients/index' })
    }
  }
}
</script>

<style scoped>
.hero-wrap { position: relative; width: 100%; }
.hero-carousel { width: 100%; height: 210px; }
.slide { position: relative; width: 100%; height: 210px; }
.slide-img { width: 100%; height: 210px; display: block; }
.hero-cap {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 16px 16px 18px;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.6) 100%);
  color: #fff;
}
.ht { font-size: 18px; font-weight: 800; letter-spacing: .5px; }
.hs { font-size: 12px; opacity: .92; margin-top: 5px; line-height: 1.45; }
.hero-badge {
  position: absolute; top: 12px; left: 12px; z-index: 3;
  background: rgba(0,0,0,.42); color: #fff; font-size: 11px;
  padding: 4px 11px; border-radius: 20px; backdrop-filter: blur(2px);
}
.hero-dots { display: flex; justify-content: center; gap: 6px; margin: 9px 0 2px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(0,0,0,.18); transition: all .2s; }
.dot.on { background: var(--orange, #C46A3A); width: 16px; border-radius: 3px; }

/* 核心功能 */
.section-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 10px; }
.section-title { font-size: 17px; font-weight: 800; color: var(--text-primary, #1f2a24); }
.section-more { font-size: 12px; color: var(--text-muted, #8a8f8a); }
.feature-grid { display: flex; flex-wrap: wrap; justify-content: space-between; padding: 0 16px; }
.feature-card { width: 48.5%; background: #fff; border-radius: 14px; padding: 14px 13px; margin-bottom: 10px; box-sizing: border-box; box-shadow: 0 2px 10px rgba(0,0,0,.04); }
.feature-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 9px; }
.feature-icon.orange { background: rgba(196,106,58,.12); }
.feature-icon.blue { background: rgba(94,114,145,.12); }
.feature-icon.brown { background: rgba(156,124,58,.12); }
.feature-icon.green { background: rgba(61,90,62,.12); }
.feature-name { font-size: 14px; font-weight: 800; color: var(--text-primary, #1f2a24); margin-bottom: 4px; }
.feature-desc { font-size: 11px; color: var(--text-muted, #8a8f8a); line-height: 1.5; }

/* 今日见面作战简报 */
.brief-list { display: flex; flex-direction: column; }
.brief-item { display: flex; align-items: center; gap: 11px; padding: 11px 0; border-bottom: 1px dashed #eee; }
.brief-item:last-child { border-bottom: none; }
.brief-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; font-weight: 700; flex-shrink: 0; }
.brief-body { flex: 1; min-width: 0; }
.brief-top { display: flex; align-items: center; gap: 7px; }
.brief-name { font-size: 14px; font-weight: 700; color: #1f2a24; }
.brief-need { font-size: 12px; color: #555; margin-top: 3px; line-height: 1.45; }
.brief-grip { font-size: 12px; color: #c46a3a; margin-top: 3px; line-height: 1.45; }
.brief-empty { font-size: 12px; color: #aaa; margin-top: 3px; }
.brief-arrow { font-size: 18px; color: #c8c2b6; flex-shrink: 0; }
</style>
