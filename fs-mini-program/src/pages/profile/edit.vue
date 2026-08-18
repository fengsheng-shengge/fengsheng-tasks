<template>
  <view class="page">
    <scroll-view class="body" scroll-y="true">
      <view class="tip">这些信息仅保存在你本机，用于生成更贴合的策展与话术，不会上传。</view>

      <view class="field">
        <text class="label">称呼 / 昵称</text>
        <view class="hint">客户看到的你的名字，如 风声·小林</view>
        <input class="inp" v-model="form.nickname" placeholder="如 风声·小林" maxlength="20" />
      </view>

      <view class="field">
        <text class="label">门店 / 机构</text>
        <view class="hint">你所在的门店或品牌，选填</view>
        <input class="inp" v-model="form.brokerStore" placeholder="选填" maxlength="40" />
      </view>

      <view class="field">
        <text class="label">联系电话</text>
        <view class="hint">留给客户回拨的号码，选填（仅在本地存，不外发）</view>
        <input class="inp" v-model="form.brokerPhone" placeholder="选填" type="number" maxlength="20" />
      </view>

      <view class="field">
        <text class="label">服务理念（一句话）</text>
        <view class="hint">你做这行的信条，会显示在职业档案里，如「帮人住得安心，比成交更重要」</view>
        <textarea class="inp" v-model="form.brokerSlogan" placeholder="选填，一句话说清你的服务态度" maxlength="60" />
      </view>
    </scroll-view>

    <view class="foot">
      <button class="btn-line" @tap="goBack">取消</button>
      <button class="btn-green" @tap="save">保存</button>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      form: { nickname: '', brokerStore: '', brokerPhone: '', brokerSlogan: '' }
    }
  },
  computed: {
    userStore() { return useUserStore() }
  },
  onLoad() {
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    const u = this.userStore
    this.form = {
      nickname: u.nickname || '',
      brokerStore: u.brokerStore || '',
      brokerPhone: u.brokerPhone || '',
      brokerSlogan: u.brokerSlogan || ''
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    save() {
      const nickname = (this.form.nickname || '').trim()
      if (!nickname) {
        uni.showToast({ title: '请填写称呼 / 昵称', icon: 'none' })
        return
      }
      this.userStore.updateBrokerProfile({
        nickname,
        brokerStore: (this.form.brokerStore || '').trim(),
        brokerPhone: (this.form.brokerPhone || '').trim(),
        brokerSlogan: (this.form.brokerSlogan || '').trim()
      })
      uni.showToast({ title: '已保存', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 500)
    }
  }
}
</script>

<style>
.page { display: flex; flex-direction: column; height: 100vh; background: #fff; box-sizing: border-box; }
.body { flex: 1; padding: 16px; box-sizing: border-box; }
.tip { font-size: 11.5px; color: #9a9a9a; line-height: 1.6; background: #f7f4ef; border: 1px solid #ece4d2; border-radius: 10px; padding: 10px 12px; margin-bottom: 16px; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.hint { font-size: 11.5px; color: #9a9a9a; line-height: 1.5; margin-bottom: 8px; }
.inp { width: 100%; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.foot { display: flex; gap: 10px; padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #efe9dd; }
.btn-green { flex: 1; background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin: 0; line-height: 1.2; }
.btn-line { flex: 0 0 auto; background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin: 0; line-height: 1.2; }
</style>
