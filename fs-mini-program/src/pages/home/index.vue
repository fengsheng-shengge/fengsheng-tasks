<template>
  <view class="page">
    <!-- ★ V3.12 租房/购房纵轴切换器 -->
    <view class="axis-switcher">
      <view
        :class="['as-btn', { active: currentAxis === 'buy' }]"
        @tap="switchAxis('buy')">
        🏠 购房
      </view>
      <view
        :class="['as-btn', { active: currentAxis === 'rent' }]"
        @tap="switchAxis('rent')">
        🔑 租房
      </view>
    </view>

    <!-- 今天该做什么 · 智能待办（按 MOT 进度聚合，主动推下一步） -->
    <view class="todo-card" v-if="todayTodos.length">
      <view class="td-head">
        <text class="td-title">📌 今天该做什么</text>
        <text class="td-more" @tap="go('mot')">进服务流程 ›</text>
      </view>
      <view class="td-item" v-for="(t, i) in todayTodos" :key="i" @tap="goTodo(t)">
        <view class="td-step" :class="'s' + t.step">{{ t.step }}</view>
        <view class="td-body">
          <view class="td-name">{{ t.client }}<text class="td-action"> · {{ t.action }}</text></view>
          <view class="td-desc">{{ t.desc }}</view>
        </view>
        <text class="td-arrow">›</text>
      </view>
    </view>

    <!-- 一键开工：高频动作直达 -->
    <view class="quick-start">
      <view class="qs-item" @tap="goQuick('client')">
        <text class="qs-ico">👥</text><text class="qs-name">新建客户</text><text class="qs-desc">建档即开工</text>
      </view>
      <view class="qs-item" @tap="goQuick('prep')">
        <text class="qs-ico">🎯</text><text class="qs-name">见面参谋</text><text class="qs-desc">秒出作战结论</text>
      </view>
      <view class="qs-item" @tap="goQuick('search')">
        <text class="qs-ico">🔍</text><text class="qs-name">查服务方案</text><text class="qs-desc">5000+ 真实方案</text>
      </view>
    </view>

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

    <!-- 居住服务生命周期 -->
    <view class="lifecycle-section">
      <view class="ls-head">
        <text class="ls-title">居住服务生命周期</text>
        <text class="ls-more" @tap="toast('点任一步看说明')">点任一步看说明 ›</text>
      </view>
      <view class="ls-steps">
        <view class="ls-step" v-for="(step, i) in lifeSteps" :key="i" @tap="onStep(step, i)">
          <view class="ls-circle" :style="{ background: step.color }">{{ i + 1 }}</view>
          <text class="ls-name">{{ step.name }}</text>
        </view>
      </view>
      <view class="ls-desc">
        <text class="ls-desc-t">帮客户理清本轮需求：</text>
        <text class="ls-desc-v">三轴拆解 + 七维权重 + 客户亲口确认</text>
      </view>
    </view>

    <!-- ★ V3.12 租房纵轴专属入口 -->
    <view class="rent-banner" v-if="currentAxis === 'rent'">
      <view class="rb-header">
        <text class="rb-title">🔑 租房找房第一步</text>
        <text class="rb-sub">先做居住测评，找到最适合你的租赁类型</text>
      </view>
      <view class="rb-grid">
        <view class="rb-item" @tap="goRentAssess">
          <text class="rb-ico">📋</text>
          <text class="rb-name">居住测评</text>
          <text class="rb-desc">7维度摸清真实需求</text>
        </view>
        <view class="rb-item" @tap="goCalculator">
          <text class="rb-ico">🧮</text>
          <text class="rb-name">月租测算</text>
          <text class="rb-desc">40%法则算清预算</text>
        </view>
        <view class="rb-item" @tap="go('curate')">
          <text class="rb-ico">🏠</text>
          <text class="rb-name">匹配策展</text>
          <text class="rb-desc">按需求推荐适配房源</text>
        </view>
        <view class="rb-item" @tap="go('cases')">
          <text class="rb-ico">💡</text>
          <text class="rb-name">案例灵感</text>
          <text class="rb-desc">租房实战经验参考</text>
        </view>
      </view>
    </view>

    <!-- 到洞察 · 快捷入口 -->
    <view class="insight-quick">
      <view class="iq-head">
        <text class="iq-title">🎯 到洞察</text>
        <text class="iq-sub">建档 → 测评 → 出需求洞察报告</text>
      </view>
      <view class="iq-grid">
        <view class="iq-item" @tap="goAssess">
          <text class="iq-ico">🏠</text>
          <text class="iq-name">住得好测评</text>
          <text class="iq-desc">7 题摸清七维画像</text>
        </view>
        <view class="iq-item" @tap="go('curate')">
          <text class="iq-ico">📋</text>
          <text class="iq-name">见面策展</text>
          <text class="iq-desc">生成作战结论卡</text>
        </view>
        <view class="iq-item" @tap="go('clients')">
          <text class="iq-ico">👥</text>
          <text class="iq-name">客户档案</text>
          <text class="iq-desc">建档与需求记录</text>
        </view>
        <view class="iq-item" @tap="goCalculator">
          <text class="iq-ico">🧮</text>
          <text class="iq-name">测算工具</text>
          <text class="iq-desc">月租/月供一键算</text>
        </view>
      </view>
      <view class="iq-report" @tap="goLastInsight">
        <text class="iqr-l"><text class="iqr-ico">📄</text> 最近一份需求洞察报告</text>
        <text class="iqr-r" v-if="lastInsightName">{{ lastInsightName }} ›</text>
        <text class="iqr-r" v-else>去生成 ›</text>
      </view>
    </view>

    <!-- 我的客户看板 -->
    <view class="client-board" v-if="topClient">
      <view class="cb-head">
        <text class="cb-title">我的客户看板</text>
        <text class="cb-more" @tap="go('clients')">全部客户 ›</text>
      </view>
      <view class="cb-card" @tap="go('clients')">
        <view class="cb-avatar">{{ topClient.name[0] }}</view>
        <view class="cb-info">
          <view class="cb-name-row">
            <text class="cb-name">{{ topClient.name }}</text>
            <view class="cb-tags">
              <text class="cb-tag" v-for="(t, i) in topClient.tags" :key="i">{{ t }}</text>
            </view>
          </view>
          <text class="cb-report">已出 {{ topClient.doneReports }}/{{ topClient.totalReports }} 份报告</text>
          <text class="cb-next">下一步：{{ topClient.nextAction }}</text>
        </view>
      </view>
    </view>

    <!-- 无客户时占位 -->
    <view class="client-board client-board--empty" v-else>
      <view class="cb-head">
        <text class="cb-title">我的客户看板</text>
        <text class="cb-more" @tap="go('clients')">全部客户 ›</text>
      </view>
      <view class="cb-empty" @tap="go('curate')">
        <text class="cb-empty-ico">👥</text>
        <text class="cb-empty-t">暂无客户档案</text>
        <text class="cb-empty-s">从「见面策展」开始建立</text>
      </view>
    </view>

    <!-- 健康盯办入口 -->
    <view class="health-promo" @tap="go('health-todo')">
      <view class="hp-l">
        <view class="hp-t">🩺 健康盯办</view>
        <view class="hp-s">复诊 / 体检 / 用药，到期主动提醒，帮自己不失其所</view>
      </view>
      <view class="hp-r">进入 ›</view>
    </view>

    <!-- 案例 promo -->
    <view class="case-promo" @tap="go('cases')">
      <view class="cp-l"><view class="cp-t">🌟 优秀经纪人精选案例灵感库</view><view class="cp-s">按客户类型 / 业务场景筛选 · 免费翻阅顶尖实战</view></view>
      <view class="cp-r">进入 ›</view>
    </view>

    <view class="icp">风声 · 帮助服务者用独立价值获得尊重<view>客户数据仅你可见，平台不收取、不用于撮合</view></view>

    <!-- 反馈入口 -->
    <view class="fb-entry" @tap="openFeedback">
      <text class="fb-entry-t">有话说？帮我们把风声做得更好</text>
      <text class="fb-entry-a">›</text>
    </view>

    <!-- 反馈弹层 -->
    <feedback-popup :show.sync="fbShow" source="home" />
  </view>
</template>

<script>
import { DICT_DOMAINS, DICT_TOTAL } from '../../utils/dict.js'
import { useUserStore } from '../../store/user'
import { trackPageview, trackEvent } from '../../utils/tracker'
import hero1 from '@/static/hero1.png'
import hero2 from '@/static/hero2.png'
import hero3 from '@/static/hero3.png'
import hero4 from '@/static/hero4.png'
export default {
  data() {
    return {
      currentAxis: 'buy',  // ★ V3.12 纵轴：buy | rent
      dictDomains: DICT_DOMAINS,
      dictTotal: DICT_TOTAL,
      fbShow: false,
      heroIdx: 0,
      lifeSteps: [
        { name: '接触', color: '#4CAF50', key: 'contact', tip: 'L：初次接触，建立信任基础\nT：了解客户基本信息与需求意向\nR：挖掘真实需求与决策动机\nU：判断需求紧迫程度\nS：建立专业形象' },
        { name: '方案', color: '#2196F3', key: 'plan', tip: 'L：需求转化为可执行方案\nT：匹配合适的房源/服务\nR：风险评估与预案\nU：方案优势与价值呈现\nS：确认客户理解与认同' },
        { name: '行动', color: '#FF9800', key: 'action', tip: 'L：带看与实地考察\nT：细节观察与即时反馈\nR：谈判与条件确认\nU：促成决策\nS：推进成交流程' },
        { name: '成交', color: '#8D6E63', key: 'deal', tip: 'L：签约条件准备\nT：合同条款审核\nR：风险点再次确认\nU：签署合同\nS：完成交易闭环' },
        { name: '售后', color: '#2E7D32', key: 'followup', tip: 'L：交割确认\nT：售后服务跟进\nR：建立长期关系\nU：转介绍裂变\nS：LTRUST 信任沉淀' }
      ],
      slides: [
        { img: hero1, ht: '把专业装进口袋', hs: '顶尖经纪人的「方法论 + 工具箱」，一次见面全用上' },
        { img: hero2, ht: '住得更好的样子', hs: '从「说得多没依据」到「讲得准、有依据、做得多」' },
        { img: hero3, ht: '深耕你的商圈', hs: '把一个社区吃到骨头里——信任来自重复、专业、在场' },
        { img: hero4, ht: '一次委托 · 终生服务', hs: '售后飞轮转起来——被记住，才有转介绍与下一单' }
      ]
    }
  },
  computed: {
    points() { return this.userStore.points || 0 },
    serviceCount() {
      const u = this.userStore
      const realClients = (u.clients || []).filter(c => !c.seed).length
      return (u.curatings ? u.curatings.length : 0)
           + realClients
           + (u.assessments ? u.assessments.length : 0)
           + (u.shares || 0)
    },
    fillPct() { return Math.min(100, (this.serviceCount / 30) * 100) },
    userStore() { return useUserStore() },
    // 看板取第一个真实客户
    topClient() {
      const clients = (this.userStore.clients || []).filter(c => !c.seed)
      if (!clients.length) return null
      const c = clients[0]
      const done = c.reports ? c.reports.filter(r => r.done).length : 0
      const total = c.reports ? c.reports.length : 0
      return {
        name: c.name,
        tags: c.tags || [],
        doneReports: done,
        totalReports: total,
        nextAction: c.nextAction || '做①需求洞察问诊'
      }
    },
    // 最近一条洞察报告（含测评来源或已确认的）
    lastInsight() {
      const clients = (this.userStore.clients || []).filter(c => !c.seed)
      let best = null
      clients.forEach(c => {
        const ins = (c.lifecycle && c.lifecycle.insightData) ? c.lifecycle.insightData : null
        if (ins && (!best || (ins.assessAt || 0) > (best.assessAt || 0))) best = { c, ins }
      })
      return best
    },
    lastInsightName() { return this.lastInsight ? this.lastInsight.c.name : '' },
    // ★ V3.11 智能待办：按客户 MOT 进度聚合「下一步最该做的事」，最多 3 条
    todayTodos() {
      const clients = (this.userStore.clients || []).filter(c => !c.seed)
      const todos = []
      clients.forEach(c => {
        const lc = c.lifecycle || {}
        const reports = c.reports || []
        const insightConfirmed = !!reports.find(r => r.type === 'insight' && r.confirmed)
        const proposalConfirmed = !!reports.find(r => r.type === 'proposal' && r.confirmed)
        const hasShowing = !!reports.find(r => r.type === 'showing')
        const hasNegotiation = !!reports.find(r => r.type === 'negotiation')
        const hasDeal = !!reports.find(r => r.type === 'deal')
        const hasMaintain = !!reports.find(r => r.type === 'maintain')
        const current = lc.currentStep || 1
        // 优先级：活跃步骤 > 有草稿未确认 > 建档无洞察 > 无建档
        let todo = null
        if (hasMaintain) todo = { step: 7, clientId: c.id, client: c.name, action: '维护关系', desc: '已成交 · 关系健康 + 转介绍飞轮', route: '/package-mot/pages/maintain/index' }
        else if (hasDeal) todo = { step: 6, clientId: c.id, client: c.name, action: '成交售后', desc: '已成交 · 登记里程碑 + 售后计划', route: '/package-mot/pages/deal/index' }
        else if (hasNegotiation) todo = { step: 5, clientId: c.id, client: c.name, action: '谈判斡旋', desc: '进入谈判 · 筹码清单 + 博弈策略', route: '/package-mot/pages/negotiation/index' }
        else if (hasShowing) todo = { step: 4, clientId: c.id, client: c.name, action: '带看分析', desc: '已带看 · 意向判断 + 下一步行动', route: '/package-mot/pages/showing/index' }
        else if (proposalConfirmed) todo = { step: 3, clientId: c.id, client: c.name, action: '房源提案', desc: '洞察已确认 · 录入备选房源', route: '/package-mot/pages/proposal/index' }
        else if (insightConfirmed && (lc.insightData && lc.insightData.proposalData)) todo = { step: 3, clientId: c.id, client: c.name, action: '看提案报告', desc: '提案草稿已存 · 生成报告并确认', route: '/package-mot/pages/proposal/report' }
        else if (insightConfirmed) todo = { step: 3, clientId: c.id, client: c.name, action: '房源提案', desc: '洞察已确认 · 开始匹配房源', route: '/package-mot/pages/proposal/index' }
        else if (current >= 2 && lc.insightData && Object.keys(lc.insightData.scores || {}).length) todo = { step: 2, clientId: c.id, client: c.name, action: '确认洞察', desc: '已出七维画像 · 确认后解锁提案', route: '/package-mot/pages/insight/index' }
        else if (current >= 2) todo = { step: 2, clientId: c.id, client: c.name, action: '做需求洞察', desc: '已建档 · 出需求洞察报告', route: '/package-mot/pages/insight/index' }
        else todo = { step: 1, clientId: c.id, client: c.name, action: '补全档案', desc: '已建档 · 完善需求背景', route: '/pages/clients/index' }
        todos.push(todo)
      })
      return todos.slice(0, 3)
    }
  },
  methods: {
    onHero(e) {
      this.heroIdx = e.detail.current
      // 手动滑动轮播 → 记录 banner_click，供看板 click 口径统计
      trackEvent('banner_click', 'home', { index: e.detail.current })
    },
    goSlide(i) {
      this.heroIdx = i
      // dot 点击切换轮播 → 同上
      trackEvent('banner_click', 'home', { index: i })
    },
    goAssess() {
      trackEvent('feature_click', 'home', { feature: 'assess' })
      uni.navigateTo({ url: '/pages/assess/index' })
    },
    goLastInsight() {
      const li = this.lastInsight
      trackEvent('feature_click', 'home', { feature: 'last_insight' })
      if (li) uni.navigateTo({ url: '/package-mot/pages/insight/index?clientId=' + li.c.id })
      else { this.goAssess() }
    },
    go(tab) {
      trackEvent('feature_click', 'home', { feature: tab })
      const tabs = ['home', 'knowledge', 'curate', 'clients', 'profile']
      if (tabs.indexOf(tab) >= 0) uni.switchTab({ url: '/pages/' + tab + '/index' })
      else uni.navigateTo({ url: '/pages/' + tab + '/index' })
    },
    onStep(step, i) {
      // 生命周期五步说明弹窗
      uni.showModal({
        title: `${i + 1}. ${step.name}`,
        content: step.tip,
        showCancel: false,
        confirmText: '知道了'
      })
    },
    openFeedback() { this.fbShow = true },
    // 一键开工：高频动作直达
    goQuick(k) {
      trackEvent('feature_click', 'home', { feature: 'quick_' + k })
      if (k === 'client') {
        // 客户档案是 tabBar，经 focusClientId 传递"新建"意图由档案页处理
        this.userStore.focusClientId = '__new__'
        uni.switchTab({ url: '/pages/clients/index' })
      } else if (k === 'prep') {
        uni.navigateTo({ url: '/package-curation/pages/curate-prep/index' })
      } else if (k === 'search') {
        uni.navigateTo({ url: '/pages/knowledge/domain' })
      }
    },
    goDictSearch() { uni.navigateTo({ url: '/pages/knowledge/domain' }) },
    goTodo(t) {
      if (!t || !t.route) { this.go('mot'); return }
      // 客户档案是 tabBar 页，走 store.focusClientId
      if (t.route.indexOf('/pages/clients') === 0) {
        this.userStore.focusClientId = t.clientId
        uni.switchTab({ url: t.route })
        return
      }
      const sep = t.route.indexOf('?') >= 0 ? '&' : '?'
      uni.navigateTo({ url: t.route + sep + 'clientId=' + (t.clientId || '') })
    },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) },
    // ★ V3.12 纵轴切换：购房 <-> 租房
    switchAxis(axis) {
      if (this.currentAxis === axis) return
      this.currentAxis = axis
      uni.showToast({ title: axis === 'rent' ? '已切换至租房线' : '已切换至购房线', icon: 'none', duration: 1200 })
    },
    // ★ V3.12 跳转租住版居住测评
    goRentAssess() {
      trackEvent('feature_click', 'home', { feature: 'rent_assess' })
      uni.navigateTo({ url: '/pages/rent-assess/index' })
    },
    // ★ V3.12 跳转测算工具
    goCalculator() {
      uni.navigateTo({ url: '/pages/calculator/index' })
    }
  },
  onShow() { trackPageview('home') }
}
</script>

<style scoped>
/* ★ V3.12 纵轴切换器 */
.axis-switcher {
  display: flex;
  padding: 10px 16px 0;
  gap: 0;
}
.as-btn {
  flex: 1;
  text-align: center;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  color: #8a837a;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.as-btn.active {
  color: #3d5a3e;
  border-bottom-color: #3d5a3e;
  font-weight: 700;
}

/* ========== 一键开工 ========== */
.quick-start {
  display: flex; gap: 10px; margin: 10px 14px 0;
}
.qs-item {
  flex: 1; background: #fff; border-radius: 14px; padding: 12px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  border: 1px solid #e7e0d4; box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.qs-item:active { background: #f7f4ef; }
.qs-ico { font-size: 22px; }
.qs-name { font-size: 12.5px; font-weight: 700; color: #2b2b2b; }
.qs-desc { font-size: 10px; color: #999; }

/* ========== Hero ========== */
.hero-carousel { width: 100%; height: 168px; position: relative; }
.hero-dots { display: flex; justify-content: center; gap: 5px; position: absolute; bottom: 8px; left: 0; right: 0; z-index: 2; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.45); }
.dot.on { width: 14px; border-radius: 3px; background: #fff; }
.slide { width: 100%; height: 168px; position: relative; }

/* ========== 今天该做什么 · 智能待办 ========== */
.todo-card {
  background: #fff; border-radius: 16px; margin: 10px 14px 0;
  padding: 13px 14px 6px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.td-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.td-title { font-size: 15px; font-weight: 800; color: #c46a3a; }
.td-more { font-size: 12px; color: #c8956d; }
.td-item {
  display: flex; align-items: center; gap: 10px;
  background: #faf8f5; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px;
  border: 1px solid #f0ece4;
}
.td-item:active { background: #f3efe7; }
.td-step {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: #fff;
}
.td-step.s1 { background: #4CAF50; }
.td-step.s2 { background: #2196F3; }
.td-step.s3 { background: #FF9800; }
.td-step.s4 { background: #8D6E63; }
.td-step.s5 { background: #7E57C2; }
.td-step.s6 { background: #c0392b; }
.td-step.s7 { background: #2E7D32; }
.td-body { flex: 1; }
.td-name { font-size: 13px; font-weight: 700; color: #2b2b2b; }
.td-action { color: #c46a3a; font-weight: 700; }
.td-desc { font-size: 11px; color: #8a837a; margin-top: 2px; }
.td-arrow { font-size: 16px; color: #ccc; }

.slide-img { width: 100%; height: 100%; border-radius: 0; }
.hero-cap {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 100%);
  padding: 24px 16px 20px; box-sizing: border-box;
}
.ht { font-size: 17px; font-weight: 700; color: #fff; }
.hs { font-size: 12px; color: rgba(255,255,255,.82); margin-top: 4px; }

/* ========== 居住服务生命周期 ========== */
.lifecycle-section {
  background: #fff; border-radius: 16px; margin: 12px 14px 10px;
  padding: 14px 14px 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.ls-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ls-title { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.ls-more { font-size: 12px; color: #c8956d; }
.ls-steps {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.ls-step {
  display: flex; flex-direction: column; align-items: center;
  flex: 1; gap: 4px;
}
.ls-circle {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
}
.ls-name { font-size: 11px; color: #555; font-weight: 600; }
.ls-desc {
  background: #f7f4ef; border-radius: 8px; padding: 7px 10px;
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
}
.ls-desc-t { font-size: 12px; color: #8a7a68; }
.ls-desc-v { font-size: 12px; color: #5c4a36; font-weight: 600; }

/* ★ V3.12 租房纵轴专属入口 */
.rent-banner {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4a30 100%);
  border-radius: 16px;
  margin: 10px 14px;
  padding: 14px 14px 12px;
}
.rb-header { margin-bottom: 10px; }
.rb-title { font-size: 15px; font-weight: 700; color: #fff; display: block; margin-bottom: 2px; }
.rb-sub { font-size: 11px; color: rgba(255,255,255,.7); }
.rb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rb-item {
  background: rgba(255,255,255,.15);
  border-radius: 10px;
  padding: 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rb-ico { font-size: 20px; margin-bottom: 2px; }
.rb-name { font-size: 13px; font-weight: 700; color: #fff; }
.rb-desc { font-size: 10px; color: rgba(255,255,255,.7); }

/* ========== 到洞察 · 快捷入口 ========== */
.insight-quick {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4a30 100%);
  border-radius: 16px; margin: 0 14px 10px; padding: 14px 14px 12px;
}
.iq-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.iq-title { font-size: 15px; font-weight: 700; color: #fff; }
.iq-sub { font-size: 11px; color: rgba(255,255,255,.7); }
.iq-grid { display: flex; gap: 8px; }
.iq-item {
  flex: 1; background: rgba(255,255,255,.12); border-radius: 10px;
  padding: 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px;
}
.iq-item:active { background: rgba(255,255,255,.2); }
.iq-ico { font-size: 20px; }
.iq-name { font-size: 12px; color: #fff; font-weight: 600; }
.iq-desc { font-size: 10px; color: rgba(255,255,255,.68); text-align: center; }
.iq-report {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; background: rgba(255,255,255,.1);
  border-radius: 10px; padding: 9px 12px;
}
.iq-report:active { background: rgba(255,255,255,.18); }
.iqr-l { font-size: 12px; color: #fff; }
.iqr-ico { margin-right: 2px; }
.iqr-r { font-size: 12px; color: rgba(255,255,255,.85); font-weight: 600; }

/* ========== 我的客户看板 ========== */
.client-board {
  background: #fff; border-radius: 16px; margin: 0 14px 10px;
  padding: 14px 14px 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.client-board--empty { padding: 12px 14px; }
.cb-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cb-title { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.cb-more { font-size: 12px; color: #c8956d; }
.cb-card {
  display: flex; align-items: flex-start; gap: 12px;
  background: #faf8f5; border-radius: 12px; padding: 12px;
}
.cb-card:active { background: #f0ece4; }
.cb-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: #3d5a3e; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; flex-shrink: 0;
}
.cb-info { flex: 1; min-width: 0; }
.cb-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 4px; }
.cb-name { font-size: 14px; font-weight: 700; color: #2b2b2b; }
.cb-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.cb-tag {
  font-size: 11px; color: #8a6040; background: #f0e4d6;
  border-radius: 4px; padding: 1px 6px;
}
.cb-report { font-size: 12px; color: #888; display: block; }
.cb-next { font-size: 12px; color: #c46a3a; display: block; margin-top: 2px; }
.cb-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 16px; gap: 4px; background: #faf8f5; border-radius: 12px;
}
.cb-empty:active { background: #f0ece4; }
.cb-empty-ico { font-size: 28px; }
.cb-empty-t { font-size: 13px; color: #555; font-weight: 600; }
.cb-empty-s { font-size: 12px; color: #999; }

/* ========== 案例 ========== */
.health-promo {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #c46a3a 0%, #d98a55 100%);
  border-radius: 12px; margin: 0 14px 10px; padding: 14px 16px;
}
.health-promo:active { opacity: .9; }
.hp-l { flex: 1; }
.hp-t { font-size: 14px; font-weight: 700; color: #fff; }
.hp-s { font-size: 11.5px; color: rgba(255,255,255,.8); margin-top: 3px; }
.hp-r { font-size: 13px; color: rgba(255,255,255,.95); font-weight: 600; }

.case-promo {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #3d5a3e 0%, #4a6e4a 100%);
  border-radius: 12px; margin: 0 14px 10px; padding: 14px 16px;
}
.case-promo:active { opacity: .9; }
.cp-l { flex: 1; }
.cp-t { font-size: 14px; font-weight: 700; color: #fff; }
.cp-s { font-size: 11.5px; color: rgba(255,255,255,.75); margin-top: 3px; }
.cp-r { font-size: 13px; color: rgba(255,255,255,.9); font-weight: 600; }

/* ========== ICP + 反馈 ========== */
.icp { font-size: 11px; color: #bbb; text-align: center; margin: 12px 14px 0; line-height: 1.6; }
.fb-entry { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px 14px; margin: 10px 14px 20px; }
.fb-entry:active { background: #f7f4ef; }
.fb-entry-t { font-size: 13px; color: var(--text-secondary, #555); }
.fb-entry-a { font-size: 16px; color: var(--text-tertiary, #9a9a9a); }
</style>
