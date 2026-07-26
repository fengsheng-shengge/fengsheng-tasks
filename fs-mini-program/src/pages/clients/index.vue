<template>
  <view class="page">
    <view class="section-header">
      <text class="section-title">客户档案</text>
      <text class="section-more">一次委托 · 终生服务</text>
      <button class="add-btn" @tap="openForm()">＋ 新建</button>
    </view>

    <view v-if="list.length === 0" class="empty">还没有客户，点右上角「＋ 新建」建立第一个。</view>

    <view class="client-card" v-for="c in list" :key="c.id" @tap="openDetail(c)">
      <view class="avatar">{{ c.surname }}</view>
      <view class="info">
        <view class="nm">{{ c.name }}</view>
        <view class="mt">{{ c.rel }} · {{ c.stage }}<text class="persona" :class="'p-' + c.pkey">{{ personaOf(c) }}</text></view>
      </view>
      <text class="stagebadge" :class="'st-' + statusKey(c.status)">{{ c.status }}</text>
    </view>

    <!-- 客户详情 -->
    <view class="overlay" :class="{ active: showDetail }">
      <view class="ov-nav">
        <button class="back" @tap="showDetail = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ detail.name }}</view><view class="sub">{{ detail.stage }} · {{ detail.status }}</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="sec"><view class="h"><text class="em">🎨</text>客户描摹（红蓝绿）</view><view>{{ detail.persona }}——{{ detail.personaTip }}</view></view>
        <view class="sec"><view class="h"><text class="em">🏷️</text>分层运营（A/B/C）</view><view>{{ detail.levelText }}</view></view>
        <view class="sec"><view class="h"><text class="em">🔄</text>服务进度回报（透明回报法）</view><text class="svc-progress">委托第 1 天：启动拍照/VR/上架/配对清单。
每周 1 次：带看次数、买方反应、同栋最新成交。
关键节点：有出价 2 小时内电话 + 书面同步。</text></view>
        <view class="sec"><view class="h"><text class="em">💎</text>客户资产</view><view>{{ detail.asset }}</view></view>
        <view class="sec" v-if="detail.note"><view class="h"><text class="em">📝</text>备注</view><view>{{ detail.note }}</view></view>
        <view class="sec" v-if="detail.addr"><view class="h"><text class="em">📍</text>小区 / 地址</view><view>{{ detail.addr }}</view></view>
        <button class="btn-green" @tap="openForm(detailSrc)">✎ 编辑客户</button>
        <button class="btn-red" @tap="delClient(detailSrc)">🗑 删除客户</button>
        <button class="btn-line" @tap="openCurate(detailSrc)">为本次接触生成策展包 →</button>
      </scroll-view>
    </view>

    <!-- 新建/编辑客户表单 -->
    <view class="overlay" :class="{ active: showForm }">
      <view class="ov-nav">
        <button class="back" @tap="closeForm">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ editingId ? '编辑客户' : '新建客户' }}</view><view class="sub">信息越全，策展越准</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="field"><text class="label">姓氏（头像）</text><input class="inp" v-model="form.surname" placeholder="如 林" /></view>
        <view class="field"><text class="label">称呼 / 全名</text><input class="inp" v-model="form.name" placeholder="如 林先生 & 未婚妻" /></view>
        <view class="field"><text class="label">角色</text>
          <view class="opt"><view v-for="o in relOpts" :key="o" :class="{ on: form.rel === o }" @tap="form.rel = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">双纵轴阶段</text>
          <input class="inp" v-model="form.stage" placeholder="如 购房线 / ①首套" />
          <view class="opt wrap"><view v-for="o in stageOpts" :key="o" :class="{ on: form.stage === o }" @tap="form.stage = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">性格频道</text>
          <view class="opt"><view class="p-r" :class="{ on: form.pkey === 'red' }" @tap="form.pkey='red'">🔴 结果</view><view class="p-b" :class="{ on: form.pkey === 'blue' }" @tap="form.pkey='blue'">🔵 关系</view><view class="p-g" :class="{ on: form.pkey === 'green' }" @tap="form.pkey='green'">🟢 理智</view></view>
        </view>
        <view class="field"><text class="label">分层</text>
          <view class="opt"><view v-for="o in levelOpts" :key="o" :class="{ on: form.level === o }" @tap="form.level = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">状态</text>
          <view class="opt"><view v-for="o in statusOpts" :key="o" :class="{ on: form.status === o }" @tap="form.status = o">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">小区 / 地址</text><input class="inp" v-model="form.addr" placeholder="选填" /></view>
        <view class="field"><text class="label">备注（核心诉求 / 敏感点）</text><textarea class="inp" v-model="form.note" placeholder="如 90后婚房，预算300万，看重学区与通勤" /></view>
        <button class="btn-green" @tap="saveForm">✓ {{ editingId ? '保存修改' : '创建客户' }}</button>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { personaMap, levelMap } from '../../utils/v4data.js'
import { useUserStore } from '../../store/user'
export default {
  data() {
    return {
      showDetail: false,
      showForm: false,
      editingId: null,
      detail: {},
      detailSrc: null,
      form: this.blankForm(),
      relOpts: ['买房客户', '租客', '业主', '房东'],
      stageOpts: ['购房线 / ①首套','购房线 / ②改善','购房线 / ③教育','购房线 / ④升级','购房线 / ⑤适老','租住线 / ①起步','租住线 / ②改善','租住线 / ③家庭','租住线 / ④品质','业主侧'],
      levelOpts: ['A', 'B', 'C'],
      statusOpts: ['跟进中', '已成交', '已流失']
    }
  },
  computed: {
    userStore() { return useUserStore() },
    list() { return this.userStore.clients }
  },
  methods: {
    blankForm() {
      return { surname: '', name: '', rel: '买房客户', stage: '', pkey: 'red', level: 'A', status: '跟进中', addr: '', note: '' }
    },
    personaOf(c) { return (personaMap[c.pkey] || personaMap.red).tag },
    statusKey(s) { return ({ '跟进中': 'ing', '已成交': 'done', '已流失': 'lost' })[s] || 'ing' },
    openDetail(c) {
      this.detailSrc = c
      const pm = personaMap[c.pkey] || personaMap.red
      const lm = levelMap[c.level] || levelMap.C
      this.detail = {
        name: c.name, stage: c.stage, status: c.status, asset: c.asset, note: c.note, addr: c.addr,
        persona: pm.tag, personaTip: pm.tip,
        levelText: lm.tag + ' ｜ 维护动作：' + lm.act + ' ｜ 频率：' + lm.freq
      }
      this.showDetail = true
    },
    openForm(c) {
      this.showDetail = false
      if (c) {
        this.editingId = c.id
        this.form = { surname: c.surname, name: c.name, rel: c.rel, stage: c.stage, pkey: c.pkey, level: c.level, status: c.status, addr: c.addr || '', note: c.note || '' }
      } else {
        this.editingId = null
        this.form = this.blankForm()
      }
      this.showForm = true
    },
    closeForm() { this.showForm = false },
    saveForm() {
      if (!this.form.name || !this.form.name.trim()) { uni.showToast({ title: '请填写称呼 / 全名', icon: 'none' }); return }
      if (!this.form.surname) this.form.surname = (this.form.name || '客')[0]
      const payload = { ...this.form }
      if (this.editingId) {
        this.userStore.updateClient(this.editingId, payload)
        uni.showToast({ title: '已保存修改', icon: 'none' })
      } else {
        this.userStore.addClient(payload)
        this.userStore.markDone('profile')
        this.userStore.earnPoints(5, '完善客户档案')
        uni.showToast({ title: '客户已创建 · +5 积分', icon: 'none' })
      }
      this.showForm = false
    },
    delClient(c) {
      uni.showModal({
        title: '删除客户',
        content: '确定删除「' + c.name + '」？此操作不可恢复。',
        success: (r) => { if (r.confirm) { this.userStore.removeClient(c.id); this.showDetail = false; uni.showToast({ title: '已删除', icon: 'none' }) } }
      })
    },
    openCurate(c) {
      this.showDetail = false
      uni.$emit('openCurateForm', c.id)
      uni.switchTab({ url: '/pages/curate/index' })
    }
  }
}
</script>

<style scoped>
.page { padding: 14px 14px 30px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.section-title { font-size: 18px; font-weight: 800; color: #3d5a3e; }
.section-more { font-size: 12px; color: #C8956D; flex: 1; }
.add-btn { margin: 0; padding: 6px 14px; background: #3d5a3e; color: #fff; font-size: 13px; border-radius: 20px; line-height: 1.6; }
.empty { background: #fff; border: 1px dashed #e7e0d4; border-radius: 12px; padding: 24px; text-align: center; color: #999; font-size: 13px; }
.client-card { display: flex; align-items: center; background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.avatar { width: 42px; height: 42px; border-radius: 50%; background: #f0ece2; color: #3d5a3e; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
.info { flex: 1; min-width: 0; }
.nm { font-size: 15px; font-weight: 700; color: #2b2b2b; }
.mt { font-size: 12px; color: #888; margin-top: 2px; display: flex; align-items: center; flex-wrap: wrap; }
.persona { margin-left: 6px; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
.p-red { background: #fde8e6; color: #c0392b; }
.p-blue { background: #e6f0fa; color: #2f6fb0; }
.p-green { background: #e6f5ec; color: #3a8f5b; }
.stagebadge { font-size: 11px; padding: 3px 8px; border-radius: 8px; white-space: nowrap; }
.st-ing { background: #fff4ec; color: #c46a3a; }
.st-done { background: #eef6ef; color: #3a8f5b; }
.st-lost { background: #f0f0f0; color: #999; }
.overlay { position: fixed; inset: 0; background: #fff; transform: translateX(100%); transition: transform .25s ease; z-index: 50; display: flex; flex-direction: column; }
.overlay.active { transform: translateX(0); }
.ov-nav { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #efe9dd; }
.back { margin: 0; width: 34px; height: 34px; border-radius: 50%; background: #f0ece2; color: #3d5a3e; font-size: 20px; line-height: 1; padding: 0; }
.sub { font-size: 12px; color: #999; }
.ovcontent { flex: 1; padding: 16px; }
.sec { background: #f7f4ef; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 13.5px; line-height: 1.6; }
.sec .h { font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.em { margin-right: 4px; }
.svc-progress { white-space: pre-line; font-size: 12.5px; color: #555; }
.btn-green { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin-top: 6px; }
.btn-red { background: #fff; color: #c0392b; border: 1px solid #f0c4bd; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.inp { width: 100%; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt.wrap { margin-top: 8px; }
.opt > view { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; border: 1px solid transparent; }
.opt > view.on { background: #3d5a3e; color: #fff; }
.p-r.on { background: #c0392b; }
.p-b.on { background: #2f6fb0; }
.p-g.on { background: #3a8f5b; }
</style>
