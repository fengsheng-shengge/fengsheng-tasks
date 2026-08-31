<template>
  <view class="page">
    <view class="pp-title">风声隐私政策</view>
    <view class="pp-sub">最后更新：2026-08-01</view>

    <view class="pp-sec">
      <view class="pp-h">一、我们收集哪些信息</view>
      <view class="pp-b">· 您主动录入的客户信息（姓名、购房 / 租房意向、跟进备注等），用于帮您管理自己的客户档案；</view>
      <view class="pp-b">· 微信 openid / 用户标识，仅用于在本机标识您的身份；</view>
      <view class="pp-b">· 应用内产生的本地使用记录（如策展次数、测评记录），用于展示您的专业成长。</view>
    </view>

    <view class="pp-sec">
      <view class="pp-h">二、信息如何存储</view>
      <view class="pp-b">上述所有信息默认仅保存在您使用的手机本地（微信本地存储），<text class="pp-strong">不上传至任何服务器、不对外传输、不用于任何撮合或交易</text>。平台无法读取您的客户资料。</view>
    </view>

    <view class="pp-sec">
      <view class="pp-h">三、权限说明</view>
      <view class="pp-b">本应用不申请通讯录、位置、相册等敏感系统权限。分享功能使用微信原生转发能力，您可自主决定是否将内容分享给指定客户或同事。</view>
    </view>

    <view class="pp-sec">
      <view class="pp-h">四、您的权利</view>
      <view class="pp-b">您可随时在「客户档案」中删除任意客户，或在微信中清除小程序缓存以删除全部本地数据。删除后相关信息不可恢复。</view>
    </view>

    <view class="pp-sec">
      <view class="pp-h">五、联系方式</view>
      <view class="pp-b">如对本政策有疑问，可通过「我的 → 关于风声」反馈，或发送邮件至 privacy@fengsheng.tech。</view>
    </view>

    <view class="pp-sec">
      <view class="pp-h">六、政策更新</view>
      <view class="pp-b">我们可能因功能调整更新本政策，更新后将以应用内最新版本为准。持续使用即视为同意更新后的内容。</view>
    </view>

    <view class="pp-foot">风声 · 帮助服务者用独立价值获得尊重</view>
  </view>
</template>

<script>
import { trackPageview } from '../../utils/tracker'
export default {
  data() { return {} },
  onShow() { trackPageview('privacy') }
}
</script>

<style scoped>
.page { padding: 16px 16px calc(24px + env(safe-area-inset-bottom)); }
.pp-title { font-size: 19px; font-weight: 800; color: #2b2b28; }
.pp-sub { font-size: 12px; color: #b8b1a6; margin: 4px 0 18px; }
.pp-sec { margin-bottom: 18px; }
.pp-h { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 8px; }
.pp-b { font-size: 13px; color: #5a554c; line-height: 1.7; margin-bottom: 6px; }
.pp-strong { color: #c46a3a; font-weight: 600; }
.pp-foot { text-align: center; font-size: 11px; color: #b8b1a6; margin-top: 12px; line-height: 1.6; }
</style>
