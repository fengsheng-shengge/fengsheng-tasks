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
    <view v-if="showDetail" class="overlay active">
      <view class="ov-nav">
        <button class="back" @tap="showDetail = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ detail.name }}</view><view class="sub">{{ detail.stage }} · {{ detail.status }}<text v-if="detailSrc && detailSrc.seed" class="sample-flag"> · 示例客户·仅供参考</text></view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <button class="btn-prep" @tap="openPrep(detailSrc)">🎯 准备这次见面（见面参谋）</button>
        <view class="sec dualaxis">
          <view class="h"><text class="em">🧭</text>双纵轴定位（我在服务 TA 的哪一段）</view>
          <view class="axis-row" v-if="detail.isBuy"><text class="axis-name">购5</text><view class="axis-chips">
            <text v-for="s in buyAxis" :key="s" class="achip" :class="{ on: detail.curSeg === s }">{{ s }}</text>
          </view></view>
          <view class="axis-row" v-else><text class="axis-name">租4</text><view class="axis-chips">
            <text v-for="s in rentAxis" :key="s" class="achip" :class="{ on: detail.curSeg === s }">{{ s }}</text>
            <text class="achip" :class="{ on: detail.curSeg === '业主侧' }">业主侧</text>
          </view></view>
          <view class="rel-tag">关系类型：{{ detail.relationLabel }}<text v-if="!detail.stage" class="rel-hint"> · 尚未填写阶段</text></view>
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
        <!-- ★ V3.7 深层洞察沉淀（经纪人人认知积累） -->
        <view class="sec deep-insight-sec" v-if="hasDeepInsight">
          <view class="h"><text class="em">🔍</text>深层洞察 <text class="di-badge">MOT① 积累</text></view>
          <view class="di-note">经纪人人认知积累，不对客户透出</view>
          <!-- 触发动因 -->
          <view class="di-row" v-if="deepTriggerEvents.length">
            <view class="di-label">触发动因</view>
            <view class="di-tags">
              <text v-for="l in deepTriggerEvents" :key="l" class="di-tag trigger">{{ l }}</text>
            </view>
            <view class="di-remark" v-if="deepTriggerRemark">客户原话：{{ deepTriggerRemark }}</view>
          </view>
          <!-- 内心矛盾 -->
          <view class="di-row" v-if="deepConflict">
            <view class="di-label">内心矛盾</view>
            <view class="di-conflict">{{ deepConflict }}</view>
          </view>
          <!-- 底线 vs 让步 -->
          <view class="di-two-col" v-if="deepBottomLines.length || deepFlexible.length">
            <view v-if="deepBottomLines.length">
              <view class="di-label" style="color:#c0392b">不可妥协底线</view>
              <view class="di-tags">
                <text v-for="l in deepBottomLines" :key="l" class="di-tag bottom">{{ l }}</text>
              </view>
            </view>
            <view v-if="deepFlexible.length">
              <view class="di-label" style="color:#27ae60">可妥协让步</view>
              <view class="di-tags">
                <text v-for="l in deepFlexible" :key="l" class="di-tag flex">{{ l }}</text>
              </view>
            </view>
          </view>
          <!-- ★ V3.7 新增：顾虑清单 -->
          <view class="di-row" v-if="deepRisks.length">
            <view class="di-label">客户顾虑</view>
            <view class="di-tags">
              <text v-for="l in deepRisks" :key="l" class="di-tag risk">{{ l }}</text>
            </view>
          </view>
          <!-- ★ V3.7 新增：决策人立场 -->
          <view class="di-row" v-if="deepDecisionMakers.length">
            <view class="di-label">决策人立场</view>
            <view class="di-dm" v-for="(dm, i) in deepDecisionMakers" :key="i">
              <text class="dm-name">{{ dm.name || '决策人' }}</text>
              <text class="dm-stance" v-if="dm.stanceType">{{ stanceTypeLabel(dm.stanceType) }}</text>
              <text class="dm-concern" v-if="dm.concern"> · {{ dm.concern }}</text>
            </view>
          </view>
          <!-- ★ V3.7 新增：理想生活画面 -->
          <view class="di-row" v-if="deepLifeVision">
            <view class="di-label">理想生活画面</view>
            <view class="di-life-vision">{{ deepLifeVision }}</view>
          </view>
          <!-- CTA -->
          <view class="di-cta">在「见面参谋」持续更新 →</view>
        </view>
        <view class="sec deep-insight-sec" v-else>
          <view class="h"><text class="em">🔍</text>深层洞察 <text class="di-badge">MOT①</text></view>
          <view class="di-empty">尚未积累深层洞察。完成「见面参谋」后，客户的触发动因、内心矛盾、底线等会自动沉淀到这里。</view>
        </view>
      </scroll-view>
      <view class="ov-foot">
        <button class="btn-line" @tap="openSupplement(detailSrc)">✎ 补充信息</button>
        <button class="btn-green" @tap="openForm(detailSrc)">✎ 编辑档案</button>
      </view>
      <view class="ov-foot">
        <button class="btn-red" @tap="askDel(detailSrc)">🗑 删除客户</button>
        <button class="btn-curate" @tap="openCurate(detailSrc)">🗺️ 生成策展包 →</button>
      </view>
    </view>

    <!-- 新建/编辑客户表单 -->
    <view v-if="showForm" class="overlay active">
      <view class="ov-nav">
        <button class="back" @tap="closeForm">‹</button>
        <view><view style="font-size:17px;font-weight:700">{{ editingId ? '编辑客户' : '新建客户' }}</view><view class="sub">信息越全，策展越准</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="field"><text class="label">姓氏（头像）</text><input class="inp" v-model="form.surname" placeholder="如 林" /></view>
        <view class="field"><text class="label">称呼 / 全名</text><input class="inp" v-model="form.name" placeholder="如 林先生 & 未婚妻" /></view>
        <view class="field"><text class="label">角色 <text class="field-tip">选「买房客户」或「租客」，阶段会自动过滤</text></text>
          <view class="opt"><view v-for="o in relOpts" :key="o" :class="{ on: form.rel === o }" @tap="form.rel = o; onRelChange(o)">{{ o }}</view></view>
        </view>
        <view class="field"><text class="label">双纵轴阶段 <text class="field-tip">根据角色自动过滤</text></text>
          <input class="inp" v-model="form.stage" placeholder="点击下方选项选择" />
          <view class="opt wrap"><view v-for="o in filteredStageOpts" :key="o" :class="{ on: form.stage === o }" @tap="form.stage = o">{{ o }}</view></view>
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
        <view class="field"><text class="label">小区 / 地址</text><input class="inp" v-model="form.addr" placeholder="选填，可后续补充" /></view>
        <view class="field"><text class="label">备注（核心诉求 / 敏感点 / 购房原因）</text><textarea class="inp" v-model="form.note" placeholder="不必一次写全，后续可在客户详情页「补充信息」持续更新。如：90后婚房，预算300万，看重学区"></textarea></view>
      </scroll-view>
      <view class="ov-foot">
        <button class="btn-line foot-cancel" @tap="closeForm">取消</button>
        <button class="btn-green foot-save" @tap="saveForm">✓ {{ editingId ? '保存修改' : '创建客户' }}</button>
      </view>
    </view>

    <!-- 补充信息浮层（从详情页快速追加，不覆盖已有内容） -->
    <view v-if="showSupplement" class="overlay active">
      <view class="ov-nav">
        <button class="back" @tap="showSupplement = false">‹</button>
        <view><view style="font-size:17px;font-weight:700">补充客户信息</view><view class="sub">随时补充，不限一次</view></view>
      </view>
      <scroll-view class="ovcontent" scroll-y="true">
        <view class="supp-tip">以下字段可部分填写，保存后自动追加到客户档案</view>
        <view class="field"><text class="label">称呼 / 全名</text><input class="inp" v-model="suppForm.name" placeholder="如 林先生 & 未婚妻" /></view>
        <view class="field"><text class="label">角色</text><view class="opt"><view v-for="o in relOpts" :key="o" :class="{ on: suppForm.rel === o }" @tap="suppForm.rel = o">{{ o }}</view></view></view>
        <view class="field"><text class="label">双纵轴阶段</text><view class="opt wrap"><view v-for="o in filteredStageOptsSupp" :key="o" :class="{ on: suppForm.stage === o }" @tap="suppForm.stage = o">{{ o }}</view></view></view>
        <view class="field"><text class="label">小区 / 地址</text><input class="inp" v-model="suppForm.addr" placeholder="选填" /></view>
        <view class="field"><text class="label">备注（补充本次了解到的新信息）</text><textarea class="inp" v-model="suppForm.note" placeholder="如：客户提到父母会来住，想了解电梯房；预算可浮动到330万"></textarea></view>
      </scroll-view>
      <view class="ov-foot">
        <button class="btn-line foot-cancel" @tap="showSupplement = false">取消</button>
        <button class="btn-green foot-save" @tap="saveSupplement">✓ 保存补充</button>
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
import { trackPageview } from '../../utils/tracker'
export default {
  data() {
    return {
      showDetail: false,
      showForm: false,
      editingId: null,
      detail: {},
      detailSrc: null,
      // 补充信息浮层
      showSupplement: false,
      suppClientId: null,
      suppForm: { name: '', rel: '买房客户', stage: '', addr: '', note: '' },
      confirmShow: false,
      confirmTitle: '',
      confirmContent: '',
      confirmMode: '',
      delTarget: null,
      form: this.blankForm(),
      relOpts: ['买房客户', '租客', '业主', '房东'],
      stageOpts: ['购房线 / ①首套','购房线 / ②改善','购房线 / ③教育','购房线 / ④升级','购房线 / ⑤适老','租住线 / ①起步','租住线 / ②改善','租住线 / ③家庭','租住线 / ④品质','业主侧'],
      buyStages: ['购房线 / ①首套','购房线 / ②改善','购房线 / ③教育','购房线 / ④升级','购房线 / ⑤适老'],
      rentStages: ['租住线 / ①起步','租住线 / ②改善','租住线 / ③家庭','租住线 / ④品质','业主侧'],
      levelOpts: ['A', 'B', 'C'],
      statusOpts: ['跟进中', '已成交', '已流失'],
      buyAxis: ['①首套', '②改善', '③教育', '④升级', '⑤适老'],
      rentAxis: ['①起步', '②改善', '③家庭', '④品质']
    }
  },
  computed: {
    userStore() { return useUserStore() },
    list() { return this.userStore.clients },
    hasSamples() { return this.userStore.clients.some(c => c.seed) },
    // ★ V3.7 深层洞察（从 lifecycle.insightData 读取）
    hasDeepInsight() {
      if (!this.detailSrc) return false
      const d = this.detailSrc.lifecycle && this.detailSrc.lifecycle.insightData
      return !!(d && (
        (d.triggerEvents && d.triggerEvents.length) ||
        (d.customerConflict && d.customerConflict.trim()) ||
        (d.hardBottomLines && d.hardBottomLines.length) ||
        (d.flexibleItems && d.flexibleItems.length) ||
        (d.riskItems && d.riskItems.length) ||
        (d.decisionMakerStances && d.decisionMakerStances.length) ||
        (d.lifeVision && d.lifeVision.trim())
      ))
    },
    deepTriggerEvents() {
      const map = { family_birth:'家庭添丁', family_marriage:'新婚', family_elder:'老人同住',
        family_school:'子女入学', external_expiry:'原租约到期', external_transfer:'工作调动',
        external_commute:'通勤无法忍受', external_defect:'现有房屋缺陷',
        time_school:'入学落户节点', time_limit:'置换窗口期', time_other:'其他时间压力' }
      const d = this._insightData()
      return (d && d.triggerEvents || []).map(k => map[k] || k)
    },
    deepTriggerRemark() {
      const d = this._insightData()
      return d && d.triggerRemark || ''
    },
    deepConflict() {
      const d = this._insightData()
      return d && d.customerConflict || ''
    },
    deepBottomLines() {
      const map = { school:'学区资质', metro:'地铁距离', budget:'总价上限', floor:'楼层要求',
        orientation:'朝向', elevator:'必须有电梯', noise:'噪音控制', title:'产权清晰' }
      const d = this._insightData()
      return (d && d.hardBottomLines || []).map(k => map[k] || k)
    },
    deepFlexible() {
      const map = { area:'面积', decoration:'装修标准', ratio:'梯户比', age:'楼龄',
        quality:'小区品质', orientation:'朝向', parking:'车位' }
      const d = this._insightData()
      return (d && d.flexibleItems || []).map(k => map[k] || k)
    },
    deepRisks() {
      const map = { fear_expensive:'怕买贵', fear_mortgage:'怕月供压力', fear_devalue:'怕后期贬值',
        fear_family:'怕家人意见不统一', fear_policy:'怕学区政策变动', fear_delivery:'怕交房时间不确定',
        fear_liquidity:'怕流通性差', fear_quality:'怕质量/维权风险' }
      const d = this._insightData()
      return (d && d.riskItems || []).map(k => map[k] || k)
    },
    deepDecisionMakers() {
      return (this._insightData() && this._insightData().decisionMakerStances) || []
    },
    deepLifeVision() {
      const d = this._insightData()
      return d && d.lifeVision || ''
    },
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
    // 同步确保 storage 已就绪：页面 onShow 时 webview 必然已就绪，可直接读 storage，
    // 不必等 App 的 200ms 延迟（App 延迟 init 仅作兜底）。initFromStorage 内部已按
    // 「fs_clients key 是否存在」区分首次启动(seed 示例)与用户清空(不回弹)，空态真实可达。
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    trackPageview('clients')
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
    filteredStageOpts() {
      if (!this.form.rel || this.form.rel === '买房客户' || this.form.rel === '业主') return this.buyStages
      if (this.form.rel === '租客' || this.form.rel === '房东') return this.rentStages
      return this.buyStages
    },
    filteredStageOptsSupp() {
      const rel = this.suppForm ? this.suppForm.rel : this.form.rel
      if (!rel || rel === '买房客户' || rel === '业主') return this.buyStages
      if (rel === '租客' || rel === '房东') return this.rentStages
      return this.buyStages
    },
    // 切换角色时，清空已选的不在列表内的阶段
    onRelChange(rel) {
      const list = (rel === '买房客户' || rel === '业主') ? this.buyStages : this.rentStages
      if (this.form.stage && !list.includes(this.form.stage)) this.form.stage = ''
    },
    // 补充信息入口
    openSupplement(c) {
      this.suppClientId = c.id
      this.suppForm = { name: c.name || '', rel: c.rel || '买房客户', stage: c.stage || '', addr: c.addr || '', note: '' }
      this.showDetail = false
      this.showSupplement = true
    },
    saveSupplement() {
      if (!this.suppClientId) return
      const existing = this.userStore.getClient(this.suppClientId)
      if (!existing) return
      const updates = {}
      if (this.suppForm.name.trim()) updates.name = this.suppForm.name
      updates.rel = this.suppForm.rel
      if (this.suppForm.stage) updates.stage = this.suppForm.stage
      if (this.suppForm.addr) updates.addr = this.suppForm.addr
      // 备注追加而非覆盖
      const newNote = this.suppForm.note.trim()
      if (newNote) updates.note = existing.note ? (existing.note + '\n【' + this._fmtNow() + '补充】' + newNote) : newNote
      this.userStore.updateClient(this.suppClientId, updates)
      uni.showToast({ title: '已补充信息', icon: 'none' })
      this.showSupplement = false
    },
    _fmtNow() {
      const d = new Date(); const p = n => String(n).padStart(2,'0')
      return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate())
    },
    openCurate(c) {
      // 先写入 storage，再切 tab，避免「点了没反应」的困惑
      this.userStore._set('fs_curate_client_id', c.id)
      this.showDetail = false
      setTimeout(() => {
        uni.switchTab({ url: '/pages/curate/index' })
      }, 80)
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
    },
    _insightData() {
      return (this.detailSrc && this.detailSrc.lifecycle && this.detailSrc.lifecycle.insightData) || null
    },
    stanceTypeLabel(key) {
      const map = { commute:'看重通勤', school:'看重学区', budget:'看重预算',
        floor:'看重楼层/朝向', quality:'看重品质/面积', safety:'看重安全/产权', other:'其他诉求' }
      return map[key] || key
    }
  }
}
</script>

<style scoped>
.page { height: 100vh; padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); background: #f7f4ef; box-sizing: border-box; overflow-y: auto; -webkit-overflow-scrolling: touch; }
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
.overlay { position: fixed; inset: 0; background: #fff; z-index: 1000; display: flex; flex-direction: column; }
.ov-nav { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #efe9dd; }
.back { margin: 0; width: 34px; height: 34px; border-radius: 50%; background: #f0ece2; color: #3d5a3e; font-size: 20px; line-height: 1; padding: 0; }
.sub { font-size: 12px; color: #999; }
.ovcontent { height: 0; flex: 1; padding: 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
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
.rel-hint { color: #aaa; font-weight: 400; }
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
.ov-foot { background: #fff; border-top: 1px solid #efe9dd; padding: 10px 16px; padding-bottom: calc(10px + 60px + env(safe-area-inset-bottom)); display: flex; gap: 10px; z-index: 1001; }
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
/* V3.7 深层洞察沉淀区 */
.deep-insight-sec { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 13.5px; line-height: 1.6; }
.deep-insight-sec .h { font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.di-badge { font-size: 10px; background: #fff8e8; color: #c8956d; padding: 1px 6px; border-radius: 6px; margin-left: 6px; font-weight: 700; }
.di-note { font-size: 11px; color: #aaa; margin-bottom: 10px; background: #f7f4ef; border-radius: 6px; padding: 3px 8px; display: inline-block; }
.di-empty { font-size: 12.5px; color: #8a837a; line-height: 1.6; }
.di-row { margin-bottom: 10px; }
.di-label { font-size: 12px; font-weight: 700; color: #3d5a3e; margin-bottom: 5px; }
.di-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.di-tag { padding: 3px 9px; border-radius: 10px; font-size: 12px; }
.di-tag.trigger { background: #fff8e8; color: #c46a3a; border: 1px solid #f0d8c4; }
.di-tag.bottom { background: #fff0f0; color: #c0392b; border: 1px solid #f0c8c8; }
.di-tag.flex { background: #eef6ef; color: #27ae60; border: 1px solid #c4dbc5; }
.di-tag.risk { background: #f3f0ea; color: #8a7250; border: 1px solid #e0d4bc; }
.di-remark { font-size: 11px; color: #8a837a; margin-top: 3px; font-style: italic; }
.di-conflict { background: #fff8f8; border-left: 3px solid #c0392b; padding: 5px 8px; border-radius: 0 6px 6px 0; font-size: 13px; color: #555; }
.di-two-col { display: flex; gap: 10px; }
.di-two-col > view { flex: 1; }
.di-dm { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.dm-name { font-size: 12px; font-weight: 700; color: #2b2b2b; }
.dm-stance { font-size: 11px; background: #f0ece2; color: #555; padding: 2px 7px; border-radius: 6px; }
.dm-concern { font-size: 11px; color: #8a837a; }
.di-life-vision { background: #f7f4ef; border-radius: 8px; padding: 8px 10px; font-size: 13px; color: #3d5a3e; line-height: 1.6; }
.di-cta { font-size: 12px; color: #c46a3a; font-weight: 700; margin-top: 10px; text-align: right; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; color: #3d5a3e; margin-bottom: 6px; }
.inp { width: 100%; min-height: 44px; background: #f7f4ef; border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.opt { display: flex; flex-wrap: wrap; gap: 8px; }
.opt.wrap { margin-top: 8px; }
.opt > view { padding: 7px 12px; background: #f0ece2; border-radius: 8px; font-size: 13px; color: #555; border: 1px solid transparent; }
.opt > view.on { background: #3d5a3e; color: #fff; }
.btn-curate { background: #c46a3a; color: #fff; border-radius: 10px; padding: 12px; font-size: 14px; margin-top: 8px; }
.supp-tip { background: #fff8e8; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #c8956d; margin-bottom: 14px; line-height: 1.5; }
.field-tip { font-size: 11px; font-weight: 400; color: #C8956D; }

</style>
