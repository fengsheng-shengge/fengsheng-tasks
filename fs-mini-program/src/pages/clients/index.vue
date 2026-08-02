<template>
  <view class="page">
    <view class="section-header">
      <text class="section-title">客户档案</text>
      <text class="section-more">一次委托 · 终生服务</text>
      <button class="add-btn" @tap="openForm()">＋ 新建</button>
    </view>

    <view class="sample-bar" v-if="hasSamples">
      <text class="sample-bar-t">示例客户仅供演示参考 · 点击可清空</text>
      <button class="sample-clear" @tap="askClear">清空示例</button>
    </view>

    <view v-if="list.length === 0" class="empty">
      <view class="empty-ico">👥</view>
      <view class="empty-t">还没有客户档案</view>
      <view class="empty-s">从第一个开始，让每一次见面都有据可依</view>
      <button class="empty-btn" @tap="openForm()">＋ 立即建立第一个客户</button>
    </view>

    <view class="client-card" v-for="c in list" :key="c.id" :class="{ sample: c.seed }" @tap="openDetail(c)">
      <view class="avatar">{{ c.surname }}</view>
      <view class="info">
        <view class="nm">{{ c.name }}<text v-if="c.seed" class="sample-tag">示例</text></view>
        <view class="mt">{{ c.rel }} · {{ c.stage }}<text class="persona" :class="'p-' + c.pkey">{{ personaOf(c) }}</text></view>
      </view>
      <text class="stagebadge" :class="'st-' + statusKey(c.status)">{{ c.status }}</text>
    </view>

    <!-- 客户详情 -->
    <view class="overlay" :class="{ active: showDetail }">
      <view class="ov-nav">
        <button class="back" @tap="showDetail = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ detail.name }}</view><view class="sub">{{ detail.stage }} · {{ detail.status }}<text v-if="detailSrc && detailSrc.seed" class="sample-flag"> · 示例客户·仅供参考</text></view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <button class="btn-prep" @tap="openPrep(detailSrc)">🎯 准备这次见面（见面参谋）</button>
        <view class="sec dualaxis">
          <view class="h"><text class="em">🧭</text>双纵轴定位（我在服务 TA 的哪一段）</view>
          <view class="axis-row"><text class="axis-name">购5</text><view class="axis-chips">
            <text v-for="s in buyAxis" :key="s" class="achip" :class="{ on: detail.isBuy && detail.curSeg === s }">{{ s }}</text>
          </view></view>
          <view class="axis-row"><text class="axis-name">租4</text><view class="axis-chips">
            <text v-for="s in rentAxis" :key="s" class="achip" :class="{ on: !detail.isBuy && detail.curSeg === s }">{{ s }}</text>
            <text class="achip" :class="{ on: !detail.isBuy && detail.curSeg === '业主侧' }">业主侧</text>
          </view></view>
          <view class="rel-tag">关系类型：{{ detail.relationLabel }}</view>
        </view>
        <view class="sec"><view class="h"><text class="em">🎨</text>客户描摹（红蓝绿）</view><view>{{ detail.persona }}——{{ detail.personaTip }}</view></view>
        <view class="sec"><view class="h"><text class="em">🏷️</text>分层运营（A/B/C）</view><view>{{ detail.levelText }}</view></view>
        <view class="sec"><view class="h"><text class="em">🔄</text>服务进度回报（透明回报法）</view><text class="svc-progress">委托第 1 天：启动拍照/VR/上架/配对清单。
每周 1 次：带看次数、买方反应、同栋最新成交。
关键节点：有出价 2 小时内电话 + 书面同步。</text></view>
        <view class="sec"><view class="h"><text class="em">💎</text>客户资产</view><view>{{ detail.asset }}</view></view>
        <view class="sec" v-if="detail.note"><view class="h"><text class="em">📝</text>备注</view><view>{{ detail.note }}</view></view>
        <view class="sec" v-if="detail.addr"><view class="h"><text class="em">📍</text>小区 / 地址</view><view>{{ detail.addr }}</view></view>
        <view class="sec" v-if="(detailSrc.timeline || []).length">
          <view class="h"><text class="em">🕒</text>接触时间线</view>
          <view class="tl" v-for="(t, i) in detailSrc.timeline" :key="i">
            <text class="tl-type" :class="ttCls(t.type)">{{ t.type }}</text>
            <view class="tl-body"><view class="tl-sum">{{ t.summary }}</view><view class="tl-at">{{ fmtDate(t.at) }}</view></view>
          </view>
        </view>
        <view class="sec" v-if="(detailSrc.followups || []).filter(f => !f.done).length">
          <view class="h"><text class="em">💌</text>跟进待办（带新价值 · 非催）</view>
          <view class="fl" v-for="(f, i) in detailSrc.followups.filter(x => !x.done)" :key="i">
            <view class="fl-theme">{{ f.theme }}</view>
            <view class="fl-text">{{ f.text }}</view>
            <view class="fl-lt">LTRUST · {{ f.ltrust }}</view>
          </view>
        </view>
        <view class="sec" v-if="(detailSrc.memoryPoints || []).length">
          <view class="h"><text class="em">⭐</text>记忆点（客户记住你的瞬间）</view>
          <view class="mp" v-for="(m, i) in detailSrc.memoryPoints" :key="i">
            <view class="mp-point">{{ m.point }}</view>
            <view class="mp-at">{{ fmtDate(m.at) }}</view>
          </view>
        </view>
        <view class="sec cognition" v-if="detailSrc.cognition">
          <view class="h"><text class="em">🧠</text>认知卡（越服务越懂客户）</view>
          <block v-if="(detailSrc.cognition.known || []).length || (detailSrc.cognition.signals || []).length">
            <view class="cog-sub">已知偏好</view>
            <view class="cog-chips"><text v-for="(k, i) in detailSrc.cognition.known" :key="i" class="cog-chip">{{ k }}</text></view>
            <view class="cog-sub">决策信号 / 关怀点</view>
            <view class="cog-chips"><text v-for="(s, i) in detailSrc.cognition.signals" :key="i" class="cog-chip signal">{{ s }}</text></view>
            <view class="cog-count">已沉淀 {{ (detailSrc.cognition.log || []).length }} 次见面参谋</view>
          </block>
          <view v-else class="cog-empty">暂无认知沉淀。准备一次见面后，客户的偏好与信号会自动长在这里。</view>
        </view>
      </scroll-view>
      <view class="ov-foot">
        <button class="btn-green" @tap="openForm(detailSrc)">✎ 编辑客户</button>
        <button class="btn-red" @tap="askDel(detailSrc)">🗑 删除客户</button>
        <button class="btn-line" @tap="openCurate(detailSrc)">为本次接触生成策展包 →</button>
      </view>
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
      </scroll-view>
      <view class="ov-foot">
        <button class="btn-line foot-cancel" @tap="closeForm">取消</button>
        <button class="btn-green foot-save" @tap="saveForm">✓ {{ editingId ? '保存修改' : '创建客户' }}</button>
      </view>
    </view>

    <!-- 自定义确认弹窗（不依赖系统模态框，真机 / H5 一致可用，避开 uni Web 版 showModal 缺陷） -->
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
      confirmShow: false,
      confirmTitle: '',
      confirmContent: '',
      confirmMode: '',
      delTarget: null,
      form: this.blankForm(),
      relOpts: ['买房客户', '租客', '业主', '房东'],
      stageOpts: ['购房线 / ①首套','购房线 / ②改善','购房线 / ③教育','购房线 / ④升级','购房线 / ⑤适老','租住线 / ①起步','租住线 / ②改善','租住线 / ③家庭','租住线 / ④品质','业主侧'],
      levelOpts: ['A', 'B', 'C'],
      statusOpts: ['跟进中', '已成交', '已流失'],
      buyAxis: ['①首套', '②改善', '③教育', '④升级', '⑤适老'],
      rentAxis: ['①起步', '②改善', '③家庭', '④品质']
    }
  },
  computed: {
    userStore() { return useUserStore() },
    list() { return this.userStore.clients },
    hasSamples() { return this.userStore.clients.some(c => c.seed) }
  },
  onLoad(query) {
    uni.$on('openClientDetail', (id) => {
      const c = this.userStore.getClient(id)
      if (c) this.openDetail(c)
    })
    // 首页「今日跟进」经 URL 参数直达指定客户详情（V2.5 M3）
    if (query && query.focus) {
      setTimeout(() => {
        const c = this.userStore.getClient(query.focus)
        if (c) this.openDetail(c)
      }, 300)
    }
  },
  onUnload() { uni.$off('openClientDetail') },
  // V2.7：客户档案已提升为 tabBar 页，tabBar 页无法 URL 带参。
  // 首页「今日跟进」改将目标客户写入 store.focusClientId，此处 onShow 读取并打开详情后清空。
  onShow() {
    // 兜底 seed：极端情况（mp-weixin 真机冷启动 onLaunch 时序、storage 异常清空）导致
    // clients 仍为空时，进入 tab 时再补一次 seed，避免「完全空白、连 empty 文案也看不到」。
    // 已 seed 过（含用户主动删光）则不再塞回，让空态真实可达。
    // 注意：必须等 initFromStorage(_initialized) 完成，否则会与 App 的 200ms 延迟 init 竞态，
    // 在 reload 后读出旧的 seeded=false 而重复塞回示例（见 store._initialized）。
    if (this.userStore._initialized && !this.userStore.seeded && this.userStore.clients.length === 0) this.userStore.seedClients()
    const fid = this.userStore.focusClientId
    if (fid) {
      this.userStore.focusClientId = null
      const c = this.userStore.getClient(fid)
      if (c) this.openDetail(c)
    }
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
      const isBuy = (c.stage || '').startsWith('购房线')
      const curSeg = (c.stage || '').split(' / ')[1] || ''
      const relLabel = ({ '买房客户': '买方', '租客': '租客', '业主': '业主', '房东': '房东' })[c.rel] || c.rel
      this.detail = {
        name: c.name, stage: c.stage, status: c.status, asset: c.asset, note: c.note, addr: c.addr,
        persona: pm.tag, personaTip: pm.tip,
        levelText: lm.tag + ' ｜ 维护动作：' + lm.act + ' ｜ 频率：' + lm.freq,
        isBuy, curSeg, relationLabel: relLabel
      }
      this.showDetail = true
    },
    ttCls(type) {
      return { '策展': 'tt-curate', '见面': 'tt-meeting', '跟进': 'tt-followup' }[type] || ''
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
      this.askDel(c)
    },
    askDel(c) {
      this.delTarget = c
      this.confirmMode = 'del'
      this.confirmTitle = '删除客户'
      this.confirmContent = '确定删除「' + c.name + '」？此操作不可恢复。'
      this.confirmShow = true
    },
    askClear() {
      const n = this.userStore.clients.filter(x => x.seed).length
      this.confirmMode = 'clear'
      this.confirmTitle = '清空示例客户'
      this.confirmContent = '将删除全部 ' + n + ' 张示例客户（真实客户不受影响）。确定？'
      this.confirmShow = true
    },
    confirmOk() {
      if (this.confirmMode === 'del' && this.delTarget) {
        this.userStore.removeClient(this.delTarget.id)
        this.showDetail = false
        uni.showToast({ title: '已删除', icon: 'none' })
      } else if (this.confirmMode === 'clear') {
        const n = this.userStore.clearSamples()
        uni.showToast({ title: '已清空 ' + n + ' 张示例', icon: 'none' })
      }
      this.confirmShow = false
    },
    confirmCancel() { this.confirmShow = false },
    openCurate(c) {
      this.showDetail = false
      uni.$emit('openCurateForm', c.id)
      uni.switchTab({ url: '/pages/curate/index' })
    },
    // V3.0：进入见面参谋（分包非 tab 页），携带 clientId 以便沉淀认知卡
    openPrep(c) {
      this.showDetail = false
      uni.navigateTo({ url: '/package-curation/pages/curate-prep/index?clientId=' + (c && c.id) })
    },
    fmtDate(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const p = n => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
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
.empty { background: #fff; border: 1px dashed #e7e0d4; border-radius: 12px; padding: 32px 20px; text-align: center; color: #999; font-size: 13px; }
.empty-ico { font-size: 44px; line-height: 1; margin-bottom: 10px; }
.empty-t { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.empty-s { font-size: 12px; color: #8a837a; line-height: 1.55; margin-bottom: 18px; }
.empty-btn { display: inline-block; margin: 0; background: #3d5a3e; color: #fff; font-size: 14px; font-weight: 700; padding: 11px 22px; border-radius: 22px; line-height: 1.4; }
.empty-btn:active { background: #2f4730; }
.sample-bar { display: flex; align-items: center; justify-content: space-between; background: #f7f4ef; border: 1px dashed #d9cfbe; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; }
.sample-bar-t { font-size: 12px; color: #8a837a; }
.sample-clear { margin: 0; background: #fff; color: #b08a5a; border: 1px solid #e0cdab; font-size: 12px; padding: 5px 12px; border-radius: 16px; line-height: 1.4; }
.sample-clear:active { background: #f3ead9; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1100; display: flex; align-items: center; justify-content: center; }
.modal { width: 82%; max-width: 320px; background: #fff; border-radius: 14px; padding: 22px 20px 16px; box-sizing: border-box; }
.modal-title { font-size: 16px; font-weight: 800; color: #2b2b2b; margin-bottom: 10px; }
.modal-content { font-size: 13.5px; color: #666; line-height: 1.6; margin-bottom: 18px; }
.modal-btns { display: flex; gap: 12px; }
.modal-btn { flex: 1; margin: 0; border-radius: 10px; padding: 11px; font-size: 15px; line-height: 1.2; }
.modal-btn.cancel { background: #f0ece2; color: #555; }
.modal-btn.ok { background: #c0392b; color: #fff; }
.client-card { display: flex; align-items: center; background: #fff; border: 1px solid #e7e0d4; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
/* 示例客户：灰化 + 虚线框 + 角标，明确「仅参考、非真实客户」 */
.client-card.sample { opacity: .6; background: #f4f2ed; border-style: dashed; }
.client-card.sample:active { opacity: .75; }
.client-card.sample .avatar { background: #e6e3dc; color: #9a948a; }
.client-card.sample .nm { color: #8a837a; }
.sample-tag { margin-left: 6px; font-size: 10px; font-weight: 400; padding: 1px 6px; border-radius: 6px; background: #e6e3dc; color: #9a948a; vertical-align: middle; }
.sample-flag { color: #b0a99e; }
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
.overlay { position: fixed; inset: 0; background: #fff; transform: translateX(100%); transition: transform .25s ease; z-index: 1000; display: flex; flex-direction: column; }
.overlay.active { transform: translateX(0); }
.ov-nav { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #efe9dd; }
.back { margin: 0; width: 34px; height: 34px; border-radius: 50%; background: #f0ece2; color: #3d5a3e; font-size: 20px; line-height: 1; padding: 0; }
.sub { font-size: 12px; color: #999; }
.ovcontent { flex: 1; padding: 16px; }
.sec { background: #f7f4ef; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 13.5px; line-height: 1.6; }
.sec .h { font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.em { margin-right: 4px; }
.svc-progress { white-space: pre-line; font-size: 12.5px; color: #555; }
.dualaxis .axis-row { display: flex; align-items: center; margin: 7px 0; }
.axis-name { font-size: 12px; font-weight: 800; color: #3d5a3e; width: 30px; flex-shrink: 0; }
.axis-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.achip { font-size: 11px; padding: 3px 8px; border-radius: 8px; background: #f0ece2; color: #aaa; border: 1px solid #e7e0d4; }
.achip.on { background: #3d5a3e; color: #fff; border-color: #3d5a3e; font-weight: 700; }
.rel-tag { font-size: 12px; color: #C8956D; margin-top: 6px; font-weight: 700; }
.tl { display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px dashed #e7e0d4; }
.tl:last-child { border-bottom: none; }
.tl-type { font-size: 11px; padding: 2px 7px; border-radius: 6px; height: fit-content; flex-shrink: 0; }
.tt-curate { background: #e6f0fa; color: #2f6fb0; }
.tt-meeting { background: #eef6ef; color: #3a8f5b; }
.tt-followup { background: #fff4ec; color: #c46a3a; }
.tl-body { flex: 1; min-width: 0; }
.tl-sum { font-size: 13px; color: #3d5a3e; line-height: 1.5; }
.tl-at { font-size: 11px; color: #999; margin-top: 2px; }
.fl { padding: 8px 0; border-bottom: 1px dashed #e7e0d4; }
.fl:last-child { border-bottom: none; }
.fl-theme { font-size: 13px; font-weight: 700; color: #2b2b2b; }
.fl-text { font-size: 12.5px; color: #555; margin-top: 2px; line-height: 1.5; }
.fl-lt { font-size: 11px; color: #C8956D; margin-top: 2px; }
.mp { padding: 8px 0; border-bottom: 1px dashed #e7e0d4; }
.mp:last-child { border-bottom: none; }
.mp-point { font-size: 13px; color: #3d5a3e; line-height: 1.5; }
.mp-at { font-size: 11px; color: #999; margin-top: 2px; }
.btn-green { background: #3d5a3e; color: #fff; border-radius: 10px; padding: 12px; font-size: 15px; margin-top: 6px; }
/* V3.0 修复：原生 tabBar 永远盖在 webview 之上，必须把底部操作按钮移出滚动区、
   固定到 overlay 底部并预留 tabBar 高度(110rpx)+安全区，确保真机可点 */
.ov-foot { background: #fff; border-top: 1px solid #efe9dd; padding: 10px 16px; padding-bottom: calc(10px + 110rpx + env(safe-area-inset-bottom)); display: flex; gap: 10px; z-index: 1001; }
.ov-foot .btn-green, .ov-foot .btn-red, .ov-foot .btn-line { flex: 1; margin-top: 0; }
.ov-foot .foot-cancel { flex: 0 0 auto; }
.btn-red { background: #fff; color: #c0392b; border: 1px solid #f0c4bd; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.btn-line { background: #fff; color: #c46a3a; border: 1px solid #e7d3c2; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.btn-prep { background: linear-gradient(135deg, #c46a3a 0%, #b1542c 100%); color: #fff; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.cognition .cog-sub { font-size: 12px; font-weight: 700; color: #3d5a3e; margin: 6px 0 6px; }
.cog-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cog-chip { font-size: 12px; padding: 4px 10px; border-radius: 8px; background: #eef3ec; color: #3d5a3e; }
.cog-chip.signal { background: #fff4ec; color: #c46a3a; }
.cog-count { font-size: 11px; color: #8a837a; margin-top: 10px; }
.cog-empty { font-size: 12.5px; color: #8a837a; line-height: 1.6; }
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
