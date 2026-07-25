<template>
  <view class="page">
    <view class="phase-banner"><text class="b">🟢 <b>免费养成期</b>：现仅用「积分」，<b>不收费</b>。会员与积分直购将在后续版本开通。</text></view>

    <view class="section-title-sm">会员方案 · 积分是硬通货</view>
    <view class="vip-grid">
      <view class="vip-card hot">
        <view class="vc-tag">当前</view>
        <view class="vc-name">免费版</view>
        <view class="vc-price">¥0</view>
        <view class="vc-pts">日活+任务+裂变赚分</view>
        <view class="vc-perk">基础功能 · 案例看摘要</view>
      </view>
      <view class="vip-card locked">
        <view class="vc-tag">升级后开通</view>
        <view class="vc-name">月度会员</view>
        <view class="vc-price">价格待定</view>
        <view class="vc-pts">600 分/月自动到账</view>
        <view class="vc-perk">信任徽章 · 数据导出 · 案例全文</view>
        <view class="vc-lock">后续版本开放</view>
      </view>
      <view class="vip-card locked">
        <view class="vc-tag">升级后开通</view>
        <view class="vc-name">年度会员</view>
        <view class="vc-price">价格待定</view>
        <view class="vc-pts">8400 分(含赠1200)</view>
        <view class="vc-perk">优先新案例 · 专属客服</view>
        <view class="vc-lock">后续版本开放</view>
      </view>
    </view>

    <view class="section-title-sm">积分直购 · 养成期免费赚</view>
    <view class="vip-grid">
      <view class="vip-card locked">
        <view class="vc-name">小包</view>
        <view class="vc-price">价格待定</view>
        <view class="vc-pts">100 分</view>
        <view class="vc-lock">升级后开通</view>
      </view>
      <view class="vip-card locked">
        <view class="vc-name">中包</view>
        <view class="vc-price">价格待定</view>
        <view class="vc-pts">300 分</view>
        <view class="vc-lock">升级后开通</view>
      </view>
      <view class="vip-card locked">
        <view class="vc-name">大包</view>
        <view class="vc-price">价格待定</view>
        <view class="vc-pts">650 分</view>
        <view class="vc-lock">升级后开通</view>
      </view>
    </view>

    <view class="invite-box">
      <view class="ib-title">邀请好友 · 一起养成</view>
      <view class="ib-code"><text>我的邀请码</text><text class="code">FS-****</text></view>
      <view class="ib-reward">好友注册并完成首策展，双方各得 <text class="hl">+120 积分</text>（每月上限 +600）。邀请功能即将开放。</view>
      <view class="btn-light" @click="onInvite">生成邀请码</view>
    </view>

    <view class="page-footer"><text class="footer-icp">京ICP备2026044043号</text></view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import track from '../../utils/tracker'

function onInvite() {
  uni.showToast({ title: '邀请功能即将开放', icon: 'none' })
}

onShow(() => {
  uni.setStorageSync('__current_page', '/pages/pay/index')
  track.pageview({ page: '/pages/pay/index' })
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f4ef; padding: 16px; }

.phase-banner { display: flex; align-items: center; gap: 8px; background: rgba(196,106,58,.10); border: 1px solid rgba(196,106,58,.28); border-radius: 10px; padding: 9px 12px; margin: 10px 0 12px; font-size: 12px; color: #9a5026; line-height: 1.5; }
.phase-banner .b { color: #9a5026; }
.phase-banner .b b { color: #c46a3a; }

.section-title-sm { font-size: 15px; font-weight: 700; color: #3d5a3e; margin: 18px 0 6px; }

.vip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin: 10px 0 4px; }
.vip-card { background: #fff; border: 1px solid #ece7dc; border-radius: 12px; padding: 13px 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.03); position: relative; }
.vip-card.hot { border: 1.5px solid #c46a3a; }
.vip-card .vc-tag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #c46a3a; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.vip-card .vc-name { font-size: 13px; font-weight: 700; color: #3d5a3e; }
.vip-card .vc-price { font-size: 20px; font-weight: 800; color: #c46a3a; margin: 5px 0 2px; }
.vip-card .vc-price .sm { font-size: 11px; font-weight: 600; }
.vip-card .vc-pts { font-size: 12px; color: #b8b1a6; }
.vip-card .vc-perk { font-size: 11px; color: #5a554c; margin-top: 6px; line-height: 1.5; }
.vip-card.locked { opacity: .55; filter: grayscale(.4); }
.vip-card.locked .vc-tag { background: #b9b1a4; }
.vip-card.locked .vc-price { font-size: 14px; font-weight: 700; color: #b9b1a4; }
.vip-card .vc-lock { font-size: 10px; color: #9a5026; margin-top: 6px; font-weight: 700; }

.invite-box { background: linear-gradient(135deg, #3d5a3e, #4d7050); color: #fff; border-radius: 14px; padding: 16px; margin: 16px 0; }
.invite-box .ib-title { font-size: 14px; font-weight: 700; }
.invite-box .ib-code { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.16); border-radius: 10px; padding: 10px 12px; margin: 10px 0; font-size: 13px; }
.invite-box .ib-code .code { letter-spacing: 2px; font-size: 16px; }
.invite-box .ib-reward { font-size: 12px; opacity: .92; line-height: 1.6; }
.invite-box .ib-reward .hl { font-weight: 700; }
.btn-light { background: #fff; color: #3d5a3e; border: none; border-radius: 999px; padding: 8px 16px; font-size: 13px; font-weight: 700; margin-top: 10px; display: inline-block; }
.btn-light:active { opacity: .8; }

.page-footer { text-align: center; padding: 18px 0 30px; }
.footer-icp { font-size: 10px; color: #bbb; }
</style>