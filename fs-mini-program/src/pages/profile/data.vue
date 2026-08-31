<template>
  <view class="page">
    <scroll-view class="body" scroll-y="true">
      <view class="tip">所有数据仅存储在你本机，导出为一份 JSON 备份，换设备或清缓存前可先用它留存。导入会按 id 合并客户、覆盖档案字段，不影响已存在的真实数据。</view>

      <!-- 导出 -->
      <view class="sec">
        <view class="sec-h">导出备份</view>
        <view class="sec-b">点「生成并复制」，把本地全部风声数据复制到剪贴板，自行保存到备忘录或文件。</view>
        <button class="btn-green" @tap="exportData">生成并复制</button>
        <textarea class="json" :value="exportJson" :disabled="true" placeholder="点击上方按钮生成" />
      </view>

      <!-- 导入 -->
      <view class="sec">
        <view class="sec-h">导入备份</view>
        <view class="sec-b">把之前导出的 JSON 粘贴到下方，点「导入合并」恢复数据。</view>
        <textarea class="json" v-model="importText" placeholder="在此粘贴导出的 JSON" />
        <button class="btn-line" @tap="importData">导入合并</button>
      </view>

      <view class="warn">⚠️ 数据不上传任何服务器，请自行妥善保管备份文本。</view>
    </scroll-view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackEvent, trackPageview } from '../../utils/tracker'
export default {
  data() {
    return { exportJson: '', importText: '' }
  },
  computed: {
    userStore() { return useUserStore() }
  },
  onLoad() {
    trackPageview('profile-data')
    if (!this.userStore._initialized) this.userStore.initFromStorage()
  },
  methods: {
    exportData() {
      const info = uni.getStorageInfoSync()
      const keys = (info.keys || []).filter(k => k.indexOf('fs_') === 0)
      const data = {}
      keys.forEach(k => { try { data[k] = uni.getStorageSync(k) } catch (e) {} })
      this.exportJson = JSON.stringify(data, null, 2)
      uni.setClipboardData({
        data: this.exportJson,
        success: () => uni.showToast({ title: '已复制 · 共 ' + keys.length + ' 项', icon: 'none' }),
        fail: () => uni.showToast({ title: '复制失败，请手动选择', icon: 'none' })
      })
      trackEvent('backup_export', 'profile', { count: keys.length })
    },
    importData() {
      const raw = (this.importText || '').trim()
      if (!raw) { uni.showToast({ title: '请先粘贴 JSON', icon: 'none' }); return }
      let parsed
      try { parsed = JSON.parse(raw) } catch (e) {
        uni.showToast({ title: 'JSON 格式有误', icon: 'none' }); return
      }
      const store = this.userStore
      let merged = 0
      // 客户：按 id 合并
      if (parsed.fs_clients) {
        try { merged += store.mergeClients(JSON.parse(parsed.fs_clients)) } catch (e) {}
      }
      // 经纪人档案字段
      const patch = {}
      if (parsed.fs_broker_store !== undefined) patch.brokerStore = parsed.fs_broker_store
      if (parsed.fs_broker_phone !== undefined) patch.brokerPhone = parsed.fs_broker_phone
      if (parsed.fs_broker_slogan !== undefined) patch.brokerSlogan = parsed.fs_broker_slogan
      if (parsed.fs_nickname !== undefined) patch.nickname = parsed.fs_nickname
      if (Object.keys(patch).length) store.updateBrokerProfile(patch)
      // 策展 / 测评记录
      if (parsed.fs_curatings) { try { store.curatings = JSON.parse(parsed.fs_curatings); store._persist() } catch (e) {} }
      if (parsed.fs_assessments) { try { store.assessments = JSON.parse(parsed.fs_assessments); store._persist() } catch (e) {} }
      uni.showToast({ title: '导入完成 · 合并 ' + merged + ' 位客户', icon: 'none' })
      trackEvent('backup_import', 'profile', { count: merged })
    }
  }
}
</script>

<style>
.page { height: 100vh; background: #f7f4ef; box-sizing: border-box; }
.body { height: 100%; padding: 16px; box-sizing: border-box; }
.tip { font-size: 11.5px; color: #9a9a9a; line-height: 1.6; background: #fff; border: 1px solid #ece4d2; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
.sec { background: #fff; border: 1px solid #e7e0d4; border-radius: 14px; padding: 16px; margin-bottom: 12px; }
.sec-h { font-size: 14px; font-weight: 800; color: #3d5a3e; margin-bottom: 6px; }
.sec-b { font-size: 12.5px; color: #555; line-height: 1.6; margin-bottom: 12px; }
.json { width: 100%; height: 150px; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.5; box-sizing: border-box; color: #555; margin: 10px 0; }
.btn-green { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 11px; font-size: 14px; margin: 0; line-height: 1.2; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 11px; font-size: 14px; margin: 0; line-height: 1.2; }
.warn { font-size: 11px; color: #b0a99e; line-height: 1.6; text-align: center; padding: 4px 10px 20px; }
</style>
