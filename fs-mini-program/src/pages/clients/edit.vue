<template>
  <view class="page">
    <scroll-view class="body" scroll-y="true">
      <view class="field">
        <text class="label">姓氏（头像）</text>
        <view class="hint">用于生成客户头像首字，不填则自动取"称呼"首字</view>
        <input class="inp" v-model="form.surname" placeholder="如 林" />
      </view>
      <view class="field">
        <text class="label">称呼 / 全名</text>
        <view class="hint">怎么叫这位客户都行，如 林先生、晓雯、林先生 & 未婚妻</view>
        <input class="inp" v-model="form.name" placeholder="如 林先生 & 未婚妻" />
      </view>
      <view class="field">
        <text class="label">服务类型</text>
        <view class="hint">客户当前委托您做哪类居住服务——决定生命周期闭环归属，之后可随时开启新服务线</view>
        <view class="opt"><view v-for="o in serviceOpts" :key="o.key" :class="{ on: form.serviceLine === o.key }" @tap="form.serviceLine = o.key">{{ o.name }}</view></view>
      </view>
      <view class="field">
        <text class="label">角色</text>
        <view class="hint">您当前在服务哪类人——决定后续话术与跟进节奏</view>
        <view class="opt"><view v-for="o in relOpts" :key="o" :class="{ on: form.rel === o }" @tap="form.rel = o">{{ o }}</view></view>
      </view>
      <view class="field">
        <text class="label">人生阶段（双纵轴）</text>
        <view class="hint">客户处在买房/租房的哪个人生节点，选准了才能说对话</view>
        <view class="stage-groups">
          <view class="stage-group" v-for="g in stageGroups" :key="g.title">
            <view class="stage-group-title">{{ g.title }}<text class="stage-group-meta"> {{ g.meta }}</text></view>
            <view class="opt">
              <view v-for="o in g.opts" :key="o.full" :class="{ on: form.stage === o.full }" @tap="form.stage = o.full">{{ o.short }}</view>
            </view>
          </view>
        </view>
      </view>
      <view class="field">
        <text class="label">性格频道（沟通偏好）</text>
        <view class="hint">据此调整您的表达方式：🔴结果型=急性子、要效率、直接给结论；🔵关系型=慢热、重信任、先聊人再聊房；🟢理智型=爱分析、要数据、给对比表</view>
        <view class="opt"><view class="p-r" :class="{ on: form.pkey === 'red' }" @tap="form.pkey='red'">🔴 结果</view><view class="p-b" :class="{ on: form.pkey === 'blue' }" @tap="form.pkey='blue'">🔵 关系</view><view class="p-g" :class="{ on: form.pkey === 'green' }" @tap="form.pkey='green'">🟢 理智</view></view>
      </view>
      <view class="field">
        <text class="label">分层（投入优先级）</text>
        <view class="hint">您打算给这位客户多少精力：A 重点（高意向/高客单，优先跟）；B 常规；C 潜在长线</view>
        <view class="opt"><view v-for="o in levelOpts" :key="o" :class="{ on: form.level === o }" @tap="form.level = o">{{ o }}</view></view>
      </view>
      <view class="field">
        <text class="label">状态</text>
        <view class="hint">当前跟进进展，便于成交后复盘、流失后归因</view>
        <view class="opt"><view v-for="o in statusOpts" :key="o" :class="{ on: form.status === o }" @tap="form.status = o">{{ o }}</view></view>
      </view>
      <view class="field">
        <text class="label">小区 / 地址</text>
        <view class="hint">客户关注或已购的小区，选填</view>
        <input class="inp" v-model="form.addr" placeholder="选填" />
      </view>
      <view class="field">
        <text class="label">备注（核心诉求 / 敏感点）</text>
        <view class="hint">记下他最在意的（学区/通勤/预算）和最忌讳的（别提等）——见面前后都能直接用</view>
        <textarea class="inp" v-model="form.note" placeholder="如 90后婚房，预算300万，看重学区与通勤" />
      </view>

      <view v-if="editingId" class="del-btn" @tap="askDel">🗑 删除该客户</view>
    </scroll-view>

    <view class="foot">
      <button class="btn-line" @tap="goBack">取消</button>
      <button class="btn-green" @tap="saveForm">{{ editingId ? '保存修改' : '创建客户' }}</button>
    </view>

    <!-- 删除确认弹窗 -->
    <view class="modal-mask" v-if="confirmShow" @tap="confirmCancel">
      <view class="modal" @tap.stop>
        <view class="modal-title">{{ confirmTitle }}</view>
        <view class="modal-content">{{ confirmContent }}</view>
        <view class="modal-btns">
          <button class="modal-btn cancel" @tap="confirmCancel">取消</button>
          <button class="modal-btn ok" @tap="confirmOk">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '../../store/user'
import { trackPageview, trackEvent } from '../../utils/tracker'
export default {
  data() {
    return {
      editingId: null,
      form: this.blankForm(),
      serviceOpts: [
        { key: 'buy', name: '购房' },
        { key: 'sell', name: '售房' },
        { key: 'rent', name: '租住' },
        { key: 'host', name: '出租托管' },
        { key: 'decor', name: '家装' },
        { key: 'aging', name: '适老化升级' },
        { key: 'elderly', name: '养老居住' },
        { key: 'asset', name: '资产管理' },
        { key: 'replace', name: '置换' }
      ],
      relOpts: ['买房客户', '租客', '业主', '房东'],
      stageGroups: [
        { title: '购房线', meta: '5 段 · 买房人生', opts: [
          { full: '购房线 / ①首套', short: '① 首套' },
          { full: '购房线 / ②改善', short: '② 改善' },
          { full: '购房线 / ③教育', short: '③ 教育' },
          { full: '购房线 / ④升级', short: '④ 升级' },
          { full: '购房线 / ⑤适老', short: '⑤ 适老' }
        ] },
        { title: '租住线', meta: '4 段 · 租房人生', opts: [
          { full: '租住线 / ①起步', short: '① 起步' },
          { full: '租住线 / ②改善', short: '② 改善' },
          { full: '租住线 / ③家庭', short: '③ 家庭' },
          { full: '租住线 / ④品质', short: '④ 品质' }
        ] },
        { title: '业主侧', meta: '已买房的人', opts: [
          { full: '业主侧', short: '业主侧' }
        ] }
      ],
      levelOpts: ['A', 'B', 'C'],
      statusOpts: ['跟进中', '已成交', '已流失'],
      confirmShow: false, confirmTitle: '', confirmContent: ''
    }
  },
  computed: {
    userStore() { return useUserStore() }
  },
  onLoad(query) {
    trackPageview('clients-edit')
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    if (query && query.id) {
      const c = this.userStore.getClient(query.id)
      if (c) {
        this.editingId = c.id
        this.form = { surname: c.surname, name: c.name, rel: c.rel, stage: c.stage, pkey: c.pkey, level: c.level, status: c.status, addr: c.addr || '', note: c.note || '', serviceLine: c.serviceLine || 'buy' }
      }
    }
  },
  methods: {
    blankForm() {
      return { surname: '', name: '', rel: '买房客户', stage: '', pkey: 'red', level: 'A', status: '跟进中', addr: '', note: '', serviceLine: 'buy' }
    },
    goBack() { uni.navigateBack() },
    saveForm() {
      if (!this.form.name || !this.form.name.trim()) { uni.showToast({ title: '请填写称呼 / 全名', icon: 'none' }); return }
      if (!this.form.surname) this.form.surname = (this.form.name || '客')[0]
      trackEvent('client_save', 'clients-edit', { isNew: !this.editingId, line: this.form.serviceLine || '' })
      const payload = { ...this.form }
      let ok = false
      try {
        if (this.editingId) {
          this.userStore.updateClient(this.editingId, payload)
        } else {
          this.userStore.addClient(payload)
          this.userStore.markDone('profile')
          this.userStore.earnPoints(5, '完善客户档案')
        }
        ok = true
      } catch (e) {
        console.error('[client-edit] saveForm 异常', e)
        try { if (!this.editingId) this.userStore.addClient(payload) } catch (_) {}
      }
      uni.showToast({
        title: this.editingId ? (ok ? '已保存修改' : '保存失败，请重试') : (ok ? '客户已创建 · +5 积分' : '创建失败，请重试'),
        icon: 'none'
      })
      if (ok) setTimeout(() => uni.navigateBack(), 600)
    },
    askDel() {
      this.confirmTitle = '删除客户'
      this.confirmContent = '确定删除「' + (this.form.name || '该客户') + '」？此操作不可恢复。'
      this.confirmShow = true
    },
    confirmCancel() { this.confirmShow = false },
    confirmOk() {
      this.confirmShow = false
      try { this.userStore.removeClient(this.editingId) } catch (e) {}
      uni.showToast({ title: '已删除', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 500)
    }
  }
}
</script>

<style>
/* 独立页（navigateTo 进入，非 tab 页 → 无原生 tabBar 遮挡，底部按钮天然可点） */
.page { display: flex; flex-direction: column; height: 100vh; background: #fff; box-sizing: border-box; }
.body { flex: 1; padding: 16px; box-sizing: border-box; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.hint { font-size: 11.5px; color: #9a9a9a; line-height: 1.5; margin-bottom: 8px; }
.inp { width: 100%; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt > view { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; border: 1px solid transparent; }
.opt > view.on { background: #3d5a3e; color: #fff; }
.p-r.on { background: #c0392b; } .p-b.on { background: #2f6fb0; } .p-g.on { background: #3a8f5b; }
/* 人生阶段三组分隔 */
.stage-groups { display: flex; flex-direction: column; gap: 12px; }
.stage-group { background: #faf7f0; border: 1px solid #ece4d2; border-radius: 10px; padding: 10px 12px; }
.stage-group-title { font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 8px; }
.stage-group-meta { font-size: 11px; font-weight: 400; color: #9a9a9a; margin-left: 4px; }
.del-btn { margin-top: 8px; text-align: center; color: #c0392b; font-size: 14px; padding: 12px; border: 1px solid #f0c4bd; border-radius: 10px; background: #fff; }
/* foot 只在页面底部，避让 iPhone 底部安全区即可（非 tab 页无原生 tabBar） */
.foot { display: flex; gap: 10px; padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #efe9dd; }
.btn-green { flex: 1; background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin: 0; line-height: 1.2; }
.btn-line { flex: 0 0 auto; background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin: 0; line-height: 1.2; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1100; display: flex; align-items: center; justify-content: center; }
.modal { width: 82%; max-width: 320px; background: #fff; border-radius: 14px; padding: 22px 20px 16px; box-sizing: border-box; }
.modal-title { font-size: 16px; font-weight: 800; color: #2b2b2b; margin-bottom: 10px; }
.modal-content { font-size: 13.5px; color: #666; line-height: 1.6; margin-bottom: 18px; }
.modal-btns { display: flex; gap: 12px; }
.modal-btn { flex: 1; margin: 0; border-radius: 10px; padding: 11px; font-size: 15px; line-height: 1.2; }
.modal-btn.cancel { background: #f0ece2; color: #555; }
.modal-btn.ok { background: #c0392b; color: #fff; }
</style>
