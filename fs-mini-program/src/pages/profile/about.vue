<template>
  <view class="page">
    <scroll-view class="body" scroll-y="true">
      <view class="brand-block">
        <view class="brand-name">风声<text class="brand-en">fengsheng</text></view>
        <view class="brand-slogan">风过炭自红</view>
        <view class="brand-mission">帮助服务者用独立价值获得尊重</view>
      </view>

      <view class="sec">
        <view class="sec-h">我们是什么</view>
        <view class="sec-b">风声是经纪人的「见面策展工具」——把你在见面前后沉淀的专业，变成客户能直接感知的价值：更懂他的居住建议、更专业的看房策略、更可信的跟进陪伴。</view>
      </view>

      <view class="sec">
        <view class="sec-h">炭火模型</view>
        <view class="sec-b">「风过炭自红」是我们对专业价值的理解：</view>
        <view class="model-row"><text class="model-k">炭</text><text class="model-v">扎实的专业底座——真实知识、合规流程、诚恳态度，是烧不掉的本身。</text></view>
        <view class="model-row"><text class="model-k">火</text><text class="model-v">被看见的专业——一次见面、一份策展、一句到位的话，让价值显形。</text></view>
        <view class="model-row"><text class="model-k">风</text><text class="model-v">客户自传播——当他真心认可，口碑自然替你吹远。</text></view>
      </view>

      <view class="sec">
        <view class="sec-h">我们的哲学</view>
        <view class="sec-b">取意《道德经》：自知、自胜、自强、知足。先把人做好、把专业做扎实，生意与尊重是「不失其所」之后的自然结果，而非追逐的目标。</view>
      </view>

      <view class="sec">
        <view class="sec-h">数据诚实承诺</view>
        <view class="sec-b">所有居住建议与依据，来自风声真实知识字典，不编造数字、不替机构下结论。客户数据仅你本机可见，平台不收取、不用于撮合。</view>
      </view>

      <view class="version-block">风声 v{{ appVersion }}</view>
    </scroll-view>
  </view>
</template>

<script>
import { APP_VERSION } from '../../utils/share.js'
export default {
  data() { return { appVersion: APP_VERSION } }
}
</script>

<style>
.page { height: 100vh; background: #f7f4ef; box-sizing: border-box; }
.body { height: 100%; padding: 16px; box-sizing: border-box; }
.brand-block { background: #3d5a3e; border-radius: 16px; padding: 24px 18px; text-align: center; margin-bottom: 14px; }
.brand-name { font-size: 24px; font-weight: 800; color: #fff; }
.brand-en { font-size: 13px; font-weight: 400; color: #cfe0d2; margin-left: 6px; }
.brand-slogan { font-size: 16px; color: #f0c9a8; margin-top: 8px; letter-spacing: 2px; }
.brand-mission { font-size: 12.5px; color: #d7e3d9; margin-top: 10px; line-height: 1.6; }
.sec { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 16px; margin-bottom: 12px; }
.sec-h { font-size: 14px; font-weight: 800; color: #3d5a3e; margin-bottom: 8px; }
.sec-b { font-size: 13px; color: #555; line-height: 1.7; }
.model-row { display: flex; gap: 10px; margin-top: 8px; }
.model-k { flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%; background: #c46a3a; color: #fff; font-size: 14px; font-weight: 700; text-align: center; line-height: 28px; }
.model-v { flex: 1; font-size: 13px; color: #555; line-height: 1.6; }
.version-block { text-align: center; font-size: 12px; color: #b0a99e; padding: 8px 0 20px; }
</style>
