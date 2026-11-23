<template>
  <view class="page">
    <!-- 品牌头 -->
    <view class="brand-header">
      <view class="bh-logo">🌿 风声</view>
      <view class="bh-sub">居住服务导师</view>
    </view>

    <!-- 客户信息卡 -->
    <view class="client-card">
      <view class="cc-avatar">{{ surname }}</view>
      <view class="cc-info">
        <view class="cc-name">{{ clientName }} 的选房方案</view>
        <view class="cc-date">生成日期：{{ formatDate(createdAt) }}</view>
      </view>
    </view>

    <!-- 核心诉求 -->
    <view class="section" v-if="summaryText">
      <view class="s-header">
        <text class="s-icon">📍</text>
        <text class="s-title">这次选房的核心诉求</text>
      </view>
      <view class="summary-text">{{ summaryText }}</view>
    </view>

    <!-- 客户类型标签 -->
    <view class="section" v-if="types && types.length">
      <view class="s-header">
        <text class="s-icon">🎯</text>
        <text class="s-title">画像标签</text>
      </view>
      <view class="type-tags">
        <text class="type-tag" v-for="t in types" :key="t">{{ t }}</text>
      </view>
    </view>

    <!-- 推荐方案（FABEs） -->
    <view class="section" v-if="fabes && fabes.length">
      <view class="s-header">
        <text class="s-icon">🏠</text>
        <text class="s-title">根据您的需求，我们整理了这些</text>
      </view>
      <view class="fabe-card" v-for="(f, i) in fabes" :key="i">
        <view class="fabe-header">
          <text class="fabe-type">{{ f.type }}</text>
          <text class="fabe-title">{{ f.title }}</text>
        </view>
        <view class="fabe-body">
          <view class="fabe-row">
            <text class="fr-label">F·特点</text>
            <text class="fr-text">{{ f.feature }}</text>
          </view>
          <view class="fabe-row">
            <text class="fr-label">A·优势</text>
            <text class="fr-text">{{ f.advantage }}</text>
          </view>
          <view class="fabe-row">
            <text class="fr-label">B·益处</text>
            <text class="fr-text">{{ f.benefit }}</text>
          </view>
          <view class="fabe-row">
            <text class="fr-label">E·证据</text>
            <text class="fr-text">{{ f.evidence }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 下次见面话题 -->
    <view class="section" v-if="topics && topics.length">
      <view class="s-header">
        <text class="s-icon">📝</text>
        <text class="s-title">下次见面我想和您聊聊</text>
      </view>
      <view class="topic-list">
        <view class="topic-item" v-for="(t, i) in topics" :key="i">
          <text class="ti-num">{{ i + 1 }}</text>
          <text class="ti-text">{{ t }}</text>
        </view>
      </view>
    </view>

    <!-- 经纪人信息 -->
    <view class="broker-card">
      <view class="bc-info">
        <text class="bc-label">专属经纪人</text>
        <text class="bc-name">{{ brokerName }}</text>
      </view>
      <button class="bc-btn" v-if="brokerPhone" @tap="callBroker">📞 联系经纪人</button>
    </view>

    <!-- 小程序码 -->
    <view class="wxacode-section">
      <text class="ws-title">长按识别小程序</text>
      <image class="wxacode-img" :src="wxacodeUrl" mode="aspectFit" v-if="wxacodeUrl"></image>
      <text class="ws-tip">打开风声小程序，查看完整方案</text>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <text>由 风声 · 居住服务导师 提供</text>
    </view>
  </view>
</template>

<script>
import { trackPageview } from '../../utils/tracker'

export default {
  data() {
    return {
      clientName: '客户',
      surname: '某',
      createdAt: '',
      summaryText: '',
      types: [],
      fabes: [],
      topics: [],
      brokerName: '专属经纪人',
      brokerPhone: '',
      wxacodeUrl: '',
    }
  },

  onLoad(options) {
    // 从 URL 参数读取数据
    // 参数格式: ?data=base64(JSON)
    // 也支持直接传字段: ?name=xxx&summary=xxx&types=xxx,...
    const d = options.data ? JSON.parse(decodeURIComponent(atob(options.data))) : {}

    this.clientName = d.clientName || d.name || '客户'
    this.surname = this.clientName.charAt(0)
    this.createdAt = d.createdAt || new Date().toISOString()
    this.summaryText = d.summaryText || d.summary || ''
    this.types = d.types || []
    this.fabes = d.fabes || []
    this.topics = d.topics || []
    this.brokerName = d.brokerName || '专属经纪人'
    this.brokerPhone = d.brokerPhone || ''

    // 加载小程序码
    this.loadWxacode()

    // 上报页面浏览
    trackPageview('/pages/briefing/index', '见面简报-' + this.clientName)

    uni.setNavigationBarTitle({ title: this.clientName + ' 的选房方案' })
  },

  methods: {
    formatDate(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    },
    loadWxacode() {
      // 获取见面简报小程序码（带 clientId scene 参数）
      uni.request({
        url: 'https://fengsheng.tech/api/wxacode',
        data: { scene: 'briefing', page: 'pages/briefing/index', width: 200 },
        success: (res) => {
          if (res.data && res.data.data) {
            this.wxacodeUrl = res.data.data
          }
        },
        fail: () => {
          // 无可用小程序码时静默忽略
        }
      })
    },
    callBroker() {
      if (this.brokerPhone) {
        uni.makePhoneCall({ phoneNumber: String(this.brokerPhone) })
      }
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40px;
}

/* 品牌头 */
.brand-header {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%);
  color: #fff;
  padding: 28px 20px 24px;
  text-align: center;
}
.bh-logo { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
.bh-sub { font-size: 13px; opacity: 0.75; }

/* 客户卡 */
.client-card {
  background: #fff;
  margin: -16px 16px 0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  position: relative;
  z-index: 1;
}
.cc-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #3d5a3e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}
.cc-name { font-size: 17px; font-weight: 700; color: #2b2b28; margin-bottom: 4px; }
.cc-date { font-size: 12px; color: #8a837a; }

/* 区块通用 */
.section {
  margin: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
}
.s-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.s-icon { font-size: 18px; }
.s-title { font-size: 15px; font-weight: 700; color: #2b2b28; }

/* 摘要文字 */
.summary-text {
  font-size: 14px;
  color: #4a4a44;
  line-height: 1.8;
  background: #f7f4ef;
  border-radius: 10px;
  padding: 12px 14px;
}

/* 类型标签 */
.type-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.type-tag {
  background: #eef3ec;
  color: #3d5a3e;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
}

/* FABE 卡片 */
.fabe-card {
  background: #fafaf8;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border-left: 3px solid #3d5a3e;
}
.fabe-card:last-child { margin-bottom: 0; }
.fabe-header { margin-bottom: 10px; }
.fabe-type {
  background: #3d5a3e;
  color: #fff;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  margin-right: 8px;
}
.fabe-title { font-size: 14px; font-weight: 700; color: #2b2b28; }
.fabe-body { display: flex; flex-direction: column; gap: 6px; }
.fabe-row { display: flex; gap: 8px; align-items: flex-start; }
.fr-label {
  font-size: 11px;
  font-weight: 700;
  color: #8a837a;
  width: 36px;
  flex-shrink: 0;
  padding-top: 1px;
}
.fr-text { font-size: 13px; color: #4a4a44; flex: 1; line-height: 1.5; }

/* 话题列表 */
.topic-list { display: flex; flex-direction: column; gap: 8px; }
.topic-item { display: flex; align-items: flex-start; gap: 10px; }
.ti-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #eef3ec;
  color: #3d5a3e;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ti-text { font-size: 14px; color: #4a4a44; flex: 1; line-height: 1.5; }

/* 经纪人卡 */
.broker-card {
  margin: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bc-label { font-size: 12px; color: #8a837a; display: block; }
.bc-name { font-size: 17px; font-weight: 700; color: #2b2b28; }
.bc-btn {
  background: #3d5a3e;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
}

/* 小程序码 */
.wxacode-section {
  margin: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ws-title { font-size: 13px; color: #8a837a; }
.wxacode-img {
  width: 180px;
  height: 180px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.ws-tip { font-size: 12px; color: #b8b1a6; }

/* 底部 */
.footer {
  text-align: center;
  padding: 20px 16px 8px;
  font-size: 11px;
  color: #b8b1a6;
}
</style>
