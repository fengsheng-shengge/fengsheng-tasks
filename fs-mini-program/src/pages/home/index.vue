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
import { trackPageview } from '../../utils/tracker'
import hero1 from '@/static/hero1.png'
import hero2 from '@/static/hero2.png'
import hero3 from '@/static/hero3.png'
import hero4 from '@/static/hero4.png'
export default {
  data() {
    return {
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
    }
  },
  methods: {
    onHero(e) { this.heroIdx = e.detail.current },
    goSlide(i) { this.heroIdx = i },
    go(tab) {
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
    goDictSearch() { uni.navigateTo({ url: '/pages/knowledge/domain' }) },
    toast(m) { uni.showToast({ title: m, icon: 'none' }) }
  },
  onShow() { trackPageview('home') }
}
</script>

<style scoped>
/* ========== Hero ========== */
.hero-carousel { width: 100%; height: 168px; position: relative; }
.hero-dots { display: flex; justify-content: center; gap: 5px; position: absolute; bottom: 8px; left: 0; right: 0; z-index: 2; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.45); }
.dot.on { width: 14px; border-radius: 3px; background: #fff; }
.slide { width: 100%; height: 168px; position: relative; }
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
