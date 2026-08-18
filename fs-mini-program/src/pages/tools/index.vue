<template>
  <view class="page">
    <!-- 头部 -->
    <view class="tools-header">
      <view class="tools-title">🛠️ 顾问工具箱</view>
      <view class="tools-sub">专业工具支持日常业务开展</view>
    </view>

    <!-- 工具网格 -->
    <view class="tools-grid">
      <view
        v-for="t in tools"
        :key="t.id"
        class="tool-card"
        :class="t.color"
        @tap="openTool(t)"
      >
        <view class="tool-icon">{{ t.icon }}</view>
        <view class="tool-name">{{ t.name }}</view>
        <view class="tool-desc">{{ t.desc }}</view>
        <view class="tool-arrow">›</view>
      </view>
    </view>

    <!-- 常用话术模板（可展开真实内容） -->
    <view class="template-section">
      <view class="section-label">💡 常用话术模板</view>
      <view class="tp-tip">点开即看 · 基于风声方法论与话术九不准，给依据不给结论</view>

      <view
        class="tp-card"
        :class="{ open: tp._open }"
        v-for="tp in templates"
        :key="tp.id"
        @tap="toggleTemplate(tp)"
      >
        <view class="tp-header">
          <view class="tp-icon">{{ tp.icon }}</view>
          <view class="tp-info">
            <view class="tp-name">{{ tp.name }}</view>
            <view class="tp-desc">{{ tp.desc }}</view>
          </view>
          <view class="tp-arrow">{{ tp._open ? '▲' : '▼' }}</view>
        </view>

        <view class="tp-body" v-if="tp._open">
          <view class="sec">
            <view class="h"><text class="em">🎯</text>场景</view>
            <view class="sec-b">{{ tp.scene }}</view>
          </view>
          <view class="sec">
            <view class="h"><text class="em">📌</text>目标</view>
            <view class="sec-b">{{ tp.goal }}</view>
          </view>
          <view class="sec">
            <view class="h"><text class="em">🪜</text>话术要点</view>
            <view class="sec-li" v-for="(s, i) in tp.steps" :key="i">{{ s }}</view>
          </view>
          <view class="sec">
            <view class="h"><text class="em">💬</text>示范话术</view>
            <view class="sec-b example">{{ tp.example }}</view>
          </view>
          <view class="sec warn">
            <view class="h"><text class="em">⚠️</text>避坑提醒</view>
            <view class="sec-b">{{ tp.pitfalls }}</view>
          </view>
          <view class="ref">📚 {{ tp.ref }}</view>
        </view>
      </view>
    </view>

    <!-- 数据说明 -->
    <view class="knowledge-notice">
      <view class="notice-title">📚 数据说明</view>
      <view class="notice-text">本工具箱内容持续扩充中，话术模板均依据风声方法论整理，供参考使用；具体房源与政策信息请结合知识字典实时核实。如有疑问请联系门店主管。</view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { trackPageview, trackEvent } from '../../utils/tracker'
export default {
  data() {
    return {
      tools: [
        { id: 'kb', icon: '📖', name: '知识字典', desc: '真实行业词条，主动搜依据', color: 'green', path: '/pages/knowledge/index', tab: false },
        { id: 'assess', icon: '📊', name: '品质测评', desc: '7 维确认客户真需求', color: 'orange', path: '/pages/assess/index', tab: false },
        { id: 'cases', icon: '⭐', name: '案例灵感库', desc: '顶尖实战免费翻阅', color: 'gold', path: '/pages/cases/index', tab: false },
        { id: 'curate', icon: '💡', name: '我的策展库', desc: '历史顾问简报沉淀', color: 'blue', path: '/pages/curate/index', tab: true }
      ],
      templates: [
        {
          id: 'intro',
          icon: '💬',
          name: '首次联系·自我介绍',
          desc: '加微信/电话首接通，建立专业可信第一印象',
          scene: '添加微信后首次打招呼，或电话首次接通（约 30 秒）。',
          goal: '让客户知道你是「帮他看清居住需求」的顾问，不是催成交的推销；建立安全感，约到一次真实沟通。',
          steps: [
            '报身份+来意：我是风声的居住顾问[姓名]，来帮你把「住得怎么样」理清楚',
            '去推销感：不是来催你做决定，先聊你的情况，再给依据',
            '轻量约定：占用你几分钟，了解现状和真实想法',
            '留口子：后面我整理参考发你，你自己判断'
          ],
          example: '「您好，我是风声的居住顾问[姓名]。打扰了——我是来帮您把"住得怎么样"这件事理清楚的，不是来催您做决定的。咱们先聊聊您现在的居住情况和真实想法，后面我再根据依据给您整理参考，您自己判断。大概占用您几分钟？」',
          pitfalls: '不包满意、不制造焦虑、不给结论——首联只建立信任，不下任何推荐。',
          ref: '可查依据：知识字典（真实行业词条）· 七维测评（确认客户真需求）'
        },
        {
          id: 'invite',
          icon: '🏡',
          name: '看房邀约话术',
          desc: '基于需求精准邀约，出发前先给简报',
          scene: '已了解客户大致需求，邀约实地看房。',
          goal: '基于已确认的需求精准邀约，降低无效带看；出发前先给简报，让客户带着问题看房。',
          steps: [
            '用七维/测评结果锚定优先项（如安全、通勤）',
            '给「为什么看这套」的依据，不替客户下结论',
            '明确时间，并承诺出发前发周边配套简报',
            '提醒：实地感受最关键，数据只是参考'
          ],
          example: '「根据咱们聊的[安全/通勤]优先，我筛了一套在[板块]的，理由是[具体依据：近地铁 X 米、满五唯一税费低]。我不替您下定论好不好，您实地感受最关键。这周六上午或周日下午，您哪个方便？我提前把周边配套简报发您。」',
          pitfalls: '不替机构承诺、不隐瞒风险——房源瑕疵与税费结构须如实说明。',
          ref: '可查依据：策展库（见面作战简报）· 知识字典（板块/税费词条）'
        },
        {
          id: 'objection',
          icon: '🛡️',
          name: '异议处理模板',
          desc: '客户说「再看看/太贵了/不急」怎么接',
          scene: '客户出现抗性：再看看、太贵了、还不急。',
          goal: '化解抗性不硬怼，回到依据，给选项不替结论，把对话拉回理性比较。',
          steps: [
            '先接住情绪：认可客户的谨慎，不反驳',
            '再给依据：用数据/规则说话，而非说服',
            '给选项不替结论：提供不同档位或方案由客户选',
            '留下一步：约好后续动作，不连环追问'
          ],
          example: '（针对「太贵了」）「我理解，买房是大额支出，谨慎太正常了。价格这块，我帮您拉一下同板块近半年的成交区间和这套的税费结构，您看数字自己判断值不值。如果超预算，我们也可以看[另一档]的，我都不替您做主，您说了算。」',
          pitfalls: '不贬同行、不制造焦虑、不给结论——只摆依据，决策权永远在客户。',
          ref: '可查依据：知识字典（法条/案例）· 七维测评（需求优先级）'
        },
        {
          id: 'followup',
          icon: '🔁',
          name: '跟进回访话术',
          desc: '看房后 48h / 第 7 天，沉淀信任不骚扰',
          scene: '看房后 48 小时、第 7 天轻触达（话术九不准：回访必执行）。',
          goal: '把「一次见面」变成「持续选他」；用增量价值回访，不连环 call、不制造焦虑。',
          steps: [
            '48h：问感受+补依据（把核实结果发客户）',
            '第 7 天：轻触达+给增量价值（新出房源/政策变动）',
            '留口子：有疑问随时找，不用急着回',
            '记录到「我的策展库」，形成持续跟进链路'
          ],
          example: '（48h）「昨天看的那套，您整体感受怎么样？有没有哪点想再确认？我把[采光/学区]的核实结果补发给您。您慢慢想，有疑问随时找我，不用急着回。」',
          pitfalls: '不跳过回访（九不准硬要求）、不制造焦虑、不连环 call——节奏由客户定。',
          ref: '可查依据：策展库（客户简报沉淀）· 我的策展库（跟进记录）'
        }
      ]
    }
  },
  onShow() {
    trackPageview('tools')
  },
  methods: {
    openTool(t) {
      if (t.tab) uni.switchTab({ url: t.path })
      else uni.navigateTo({ url: t.path })
    },
    toggleTemplate(tp) {
      tp._open = !tp._open
      if (tp._open) {
        trackEvent('script_open', 'tools', { id: tp.id, name: tp.name })
      }
    }
  }
}
</script>

<style scoped>
/* ========== 顾问工具箱 ========== */
.tools-header { margin-bottom: 14px; }
.tools-title { font-size: 19px; font-weight: 800; color: var(--green-dark, #2f4730); }
.tools-sub { font-size: 12.5px; color: var(--text-secondary, #8a837a); margin-top: 3px; }

.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.tool-card { background: var(--card, #fff); border-radius: 14px; padding: 15px 14px; box-shadow: var(--shadow-sm, 0 2px 8px rgba(61,90,62,.05)); border: 1px solid var(--border-light, #f7f4ef); position: relative; overflow: hidden; }
.tool-card:active { transform: scale(0.97); }
.tool-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 9px; }
.tool-icon { background: var(--green-light, #eef3ec); }
.tool-card.orange .tool-icon { background: var(--orange-light, #fbeee6); }
.tool-card.gold .tool-icon { background: #F5E8DC; }
.tool-card.blue .tool-icon { background: #e8f0f5; }
.tool-name { font-size: 14.5px; font-weight: 700; color: var(--text, #2b2b28); margin-bottom: 3px; }
.tool-desc { font-size: 11px; color: var(--text-secondary, #8a837a); line-height: 1.5; }
.tool-arrow { position: absolute; right: 12px; top: 14px; color: var(--text-muted, #b8b1a6); font-size: 18px; }

/* ========== 话术模板 ========== */
.template-section { margin-bottom: 18px; }
.section-label { font-size: 17px; font-weight: 700; color: var(--text, #2b2b28); display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.section-label::before { content: ''; width: 4px; height: 16px; background: var(--green, #3d5a3e); border-radius: 2px; }
.tp-tip { font-size: 11px; color: var(--text-secondary, #8a837a); margin: 0 2px 12px; line-height: 1.5; }

.tp-card { background: var(--card, #fff); border: 1px solid var(--border-light, #f7f4ef); border-radius: 14px; padding: 13px 14px; margin-bottom: 10px; box-shadow: var(--shadow-sm, 0 2px 8px rgba(61,90,62,.05)); }
.tp-card.open { border-color: var(--green, #3d5a3e); }
.tp-header { display: flex; align-items: center; gap: 11px; }
.tp-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--orange-light, #fbeee6); display: flex; align-items: center; justify-content: center; font-size: 19px; flex-shrink: 0; }
.tp-info { flex: 1; min-width: 0; }
.tp-name { font-size: 14.5px; font-weight: 700; color: var(--text, #2b2b28); }
.tp-desc { font-size: 11.5px; color: var(--text-secondary, #8a837a); margin-top: 2px; line-height: 1.45; }
.tp-arrow { color: var(--text-muted, #b8b1a6); font-size: 13px; flex-shrink: 0; }

.tp-body { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border, #ece7dc); }
.tp-body .sec { background: var(--bg, #f7f4ef); border: none; box-shadow: none; margin-bottom: 9px; padding: 11px 12px; }
.tp-body .sec.warn { background: #fbf3ee; }
.tp-body .sec-b { font-size: 12.5px; color: var(--text, #2b2b28); line-height: 1.65; }
.tp-body .sec-b.example { color: var(--muted, #5a554c); background: #fff; border-radius: 9px; padding: 10px 11px; border: 1px solid var(--border, #ece7dc); }
.tp-body .ref { font-size: 11px; color: var(--brown, #C8956D); background: #fbf6ee; padding: 6px 10px; border-radius: 8px; display: inline-block; margin-top: 2px; }

/* ========== 数据说明 ========== */
.knowledge-notice { background: var(--card, #fff); border-radius: 14px; padding: 14px; box-shadow: var(--shadow-sm, 0 2px 8px rgba(61,90,62,.05)); border: 1px solid var(--border-light, #f7f4ef); }
.notice-title { font-size: 13.5px; font-weight: 700; color: var(--green, #3d5a3e); margin-bottom: 6px; }
.notice-text { font-size: 11.5px; color: var(--text-secondary, #8a837a); line-height: 1.65; }
.bottom-space { height: 12px; }
</style>
