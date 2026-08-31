<template>
  <view class="page">
    <view class="hd">
      <view class="brand">风声 · 需求洞察问诊</view>
      <view class="h1">帮客户理清楚真正要什么</view>
      <view class="sub">不是查户口，是专业工具引导客户自己梳理——填完即生成需求画像</view>
    </view>

    <!-- 客户称呼 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🙋</text>客户称呼</view>
      <input class="inp" v-model="form.clientName" placeholder="如：林先生 / 王女士" maxlength="20" />
      <view class="link-row" v-if="clients.length" @tap="showClientPicker">
        <text class="link-label">关联客户档案</text>
        <text class="link-val">{{ linkedName || '选择客户（可选）' }}</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- 目的轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">🎯</text>目的轴（为什么买 / 卖 / 租）</view>
      <view class="seg">
        <view class="seg-i" v-for="t in bizTypes" :key="t" :class="form.bizType === t ? 'on' : ''" @tap="form.bizType = t">{{ t }}</view>
      </view>
      <input class="inp mt" v-model="form.purpose" placeholder="一句话动机：最想解决的是什么？（如：婚房首套稳定落脚）" maxlength="60" />
    </view>

    <!-- 时间轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">⏱</text>时间轴</view>
      <view class="g-name">近期 · 何时入住 / 多久内</view>
      <view class="chips">
        <view v-for="o in timeOpts" :key="o.key" :class="['chip', { on: timeKeys.includes(o.key) }]" @tap="toggleTime(o.key)">{{ o.label }}</view>
      </view>
      <input class="inp mt" v-model="form.time" :placeholder="isRent ? '补充一句（可选）：如：工作确定后入住' : '补充一句（可选）：如：半年内入住，先租房过渡'" maxlength="40" />
      <!-- 租赁专项（bizType === 租住 时显示） -->
      <view v-if="isRent" class="rent-section">
        <view class="rent-h">🏠 租赁专项需求</view>
        <!-- 租住时长 -->
        <view class="g-name">租住时长</view>
        <view class="chips">
          <view v-for="o in rentDurationOpts" :key="o.key" :class="['chip', { on: form.rentDuration === o.key }]" @tap="form.rentDuration = form.rentDuration === o.key ? '' : o.key">{{ o.label }}</view>
        </view>
        <!-- 入住时间 -->
        <view class="g-name mt">希望入住时间</view>
        <view class="chips">
          <view v-for="o in checkinOpts" :key="o.key" :class="['chip', { on: form.checkin === o.key }]" @tap="form.checkin = form.checkin === o.key ? '' : o.key">{{ o.label }}</view>
        </view>
        <!-- 付款方式 -->
        <view class="g-name mt">付款方式偏好</view>
        <view class="chips">
          <view v-for="o in paymentOpts" :key="o.key" :class="['chip', { on: form.payment === o.key }]" @tap="form.payment = form.payment === o.key ? '' : o.key">{{ o.label }}</view>
        </view>
        <!-- 家具家电配套 -->
        <view class="g-name mt">家具 · 家电配套要求</view>
        <view class="chips">
          <view v-for="o in furnitureOpts" :key="o.key" :class="['chip', { on: furnitureKeys.includes(o.key) }]" @tap="toggleFurniture(o.key)">{{ o.label }}</view>
        </view>
        <!-- 车位需求 -->
        <view class="g-name mt">车位需求</view>
        <view class="chips">
          <view v-for="o in parkingOpts" :key="o.key" :class="['chip', { on: form.parking === o.key }]" @tap="form.parking = form.parking === o.key ? '' : o.key">{{ o.label }}</view>
        </view>
        <!-- 宠物 -->
        <view class="g-name mt">宠物情况</view>
        <view class="chips">
          <view v-for="o in petOpts" :key="o.key" :class="['chip', { on: form.pet === o.key }]" @tap="form.pet = form.pet === o.key ? '' : o.key">{{ o.label }}</view>
        </view>
        <!-- 网线宽带 -->
        <view class="g-name mt">网络宽带</view>
        <view class="chips">
          <view v-for="o in netOpts" :key="o.key" :class="['chip', { on: netKeys.includes(o.key) }]" @tap="toggleNet(o.key)">{{ o.label }}</view>
        </view>
        <!-- 特殊要求 -->
        <input class="inp mt" v-model="form.rentNote" placeholder="其他特殊要求（可选）：如：接受首年租金上浮，需配合办理居住证" maxlength="100" />
      </view>
      <!-- 远期规划（购房场景显示） -->
      <view v-if="!isRent">
      <view class="g-name mt">远期 · 3-5 年规划</view>
      <view class="chips">
        <view v-for="o in timeFarOpts" :key="o.key" :class="['chip', { on: timeFarKeys.includes(o.key) }]" @tap="toggleTimeFar(o.key)">{{ o.label }}</view>
      </view>
      <input class="inp mt" v-model="form.timeFar" placeholder="补充一句（可选）：如：3 年后学区 / 二胎" maxlength="40" />
      </view>
      </view>

    <!-- 主体轴 -->
    <view class="sec">
      <view class="sec-h"><text class="em">👨‍👩‍👧</text>主体轴（谁住）</view>
      <view class="chips">
        <view v-for="o in subjectOpts" :key="o.key" :class="['chip', { on: subjectKeys.includes(o.key) }]" @tap="toggleSubject(o.key)">{{ o.label }}</view>
      </view>
      <input class="inp mt" v-model="form.subject" placeholder="补充一句（可选）：如：夫妻二人 + 计划 1 孩 + 偶尔父母" maxlength="40" />
    </view>

    <!-- 生活锚点 -->
    <view class="sec">
      <view class="sec-h"><text class="em">📍</text>生活锚点（越具体越好）</view>
      <view class="an-in" v-for="(a, i) in anchorDefs" :key="i">
        <view class="an-lab">{{ a.label }}</view>
        <view class="chips">
          <view v-for="o in anchorOpts(a.key)" :key="o.key" :class="['chip', { on: anchorKeys[a.key].includes(o.key) }]" @tap="toggleAnchorOpt(a.key, o.key)">{{ o.label }}</view>
        </view>
        <input class="inp mt" v-model="form.anchors[a.key]" :placeholder="a.ph" :maxlength="40" />
      </view>
    </view>

    <!-- 七维权重（要素点选） -->
    <view class="sec">
      <view class="sec-h"><text class="em">⚖️</text>七维居住品质权重</view>
      <view class="dim-intro">勾选您在意的要素（最多4项/维度），系统自动生成权重雷达图</view>

      <!-- 实时雷达图 -->
      <view class="radar-wrap" v-if="hasAnyDimSelected">
        <view class="radar-chart-title">您的七维权重分布</view>
        <view class="radar-svg-wrap">
          <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" class="radar-svg">
            <!-- 背景网格（同心5边形） -->
            <g stroke="#EDE5D6" stroke-width="1" fill="none">
              <polygon v-for="r in 5" :key="'bg'+r"
                :points="getHexPoints(50 * r)" />
            </g>
            <!-- 轴线 -->
            <g stroke="#D4C9BC" stroke-width="1">
              <line v-for="(pt, i) in axisEndPoints" :key="'ax'+i"
                x1="140" y1="140" :x2="pt.x" :y2="pt.y" />
            </g>
            <!-- 维度标签 -->
            <text v-for="(pt, i) in labelPoints" :key="'lb'+i"
              :x="pt.x" :y="pt.y"
              text-anchor="middle" dominant-baseline="middle"
              font-size="11" font-weight="700" :fill="pt.color || '#2C2C2C'">{{ pt.label }}</text>
            <!-- 数据多边形 -->
            <polygon
              :points="radarPolygonPoints"
              fill="rgba(0,200,83,0.2)"
              stroke="#00C853"
              stroke-width="2"
              stroke-linejoin="round" />
            <!-- 数据点 -->
            <circle v-for="(pt, i) in dataPoints" :key="'dp'+i"
              :cx="pt.x" :cy="pt.y" r="5"
              fill="#00C853" stroke="#fff" stroke-width="2" />
          </svg>
        </view>
        <!-- 权重数字列表 -->
        <view class="wt-list">
          <view class="wt-item" v-for="d in DIM_DEFS" :key="d.key">
            <text class="wt-name" :style="{ color: d.color }">{{ d.key }}</text>
            <text class="wt-pct">{{ computedWeights[d.key] }}%</text>
          </view>
        </view>
      </view>
      <view class="radar-empty" v-else>
        <text>👆 勾选下方要素，即可生成权重雷达图</text>
      </view>

      <!-- 各维度要素 -->
      <view class="dim-group" v-for="def in DIM_DEFS" :key="def.key">
        <view class="dim-label-row">
          <text class="dim-name">{{ def.icon }} {{ def.key }}</text>
          <text class="dim-count">{{ (form.dimKeys[def.key] || []).length }}/{{ def.items.length }}项</text>
        </view>
        <view class="dim-tips" v-if="def.tips">要点：{{ def.tips.join(' · ') }}</view>
        <view class="dim-chips">
          <view
            v-for="item in def.items" :key="item.key"
            :class="['dim-chip', { on: isDimItemSelected(def.key, item.key) }]"
            :style="isDimItemSelected(def.key, item.key) ? { background: def.color, borderColor: def.color } : {}"
            @tap="toggleDimItem(def.key, item.key)">
            {{ item.label }}
          </view>
        </view>
      </view>

      <view class="w-tip">权重来源＝客户自评（小程序采集）；归一化为 100%；点击已选项可取消。</view>
    </view>

    <!-- 核心洞察预览 -->
    <view class="sec">
      <view class="sec-h"><text class="em">💡</text>核心洞察（自动生成 · 实时预览）</view>
      <view class="core-prev"><text>{{ liveCore }}</text></view>
    </view>

    <!-- 需求确认闸门 -->
    <view class="conf" :class="form.confirmed ? 'on' : ''" @tap="form.confirmed = !form.confirmed">
      <view class="conf-box">{{ form.confirmed ? '✓' : '' }}</view>
      <view class="conf-txt">
        <view class="conf-t1">需求确认闸门</view>
        <view class="conf-t2">已与客户逐条核对、客户亲口确认后勾选。未确认＝暂不进入房源推荐与带看。</view>
      </view>
    </view>

    <view class="demo" @tap="fillDemo">填入示例（林先生婚房）快速体验</view>

    <!-- 客户选择弹层 -->
    <view class="mask" v-if="pickerShow" @tap="pickerShow = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-h">
          <text class="sheet-t">选择关联客户</text>
          <text class="sheet-x" @tap="pickerShow = false">✕</text>
        </view>
        <scroll-view class="sheet-list" scroll-y>
          <view class="sheet-item" v-for="c in clients" :key="c.id" @tap="pickClient(c)">
            <view class="sheet-av" :style="{ background: c.color }">{{ c.name[0] }}</view>
            <view class="sheet-body">
              <view class="sheet-n">{{ c.name }}</view>
              <view class="sheet-m">{{ c.rel || '客户' }} · {{ c.note || '' }}</view>
            </view>
            <text class="sheet-check" v-if="c.id === linkedId">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="ft">本工具仅做需求澄清，不推荐房源、不测算价格、不给买房结论</view>

    <view class="actions">
      <button class="btn-main" @tap="generate">生成需求洞察报告 →</button>
    </view>
  </view>
</template>

<script>
/**
 * 客户需求洞察 · 问诊采集器（V4 探索步①输入端）
 * 与 pages/insight/index.vue（报告展示端）构成闭环：本页采集 → 组装 insight JSON → navigateTo 报告页。
 * 数据诚实：七维权重来源标注"客户/经纪人自评（小程序采集）"；核心洞察由权重+动机规则反射生成（只呈现客户自己填的，不给外部结论）；不渲染房源与价格。
 * 模型不进交付链：权重的"归一化 + 核心洞察"均为本地规则计算，无 LLM 调用。
 */
// 七维 + 关键要素（每维最多4项，多选后按选中数自动算权重）
const DIM_DEFS = [
  {
    key: '安全', icon: '🛡️', color: '#1B6B4A',
    tips: ['结构/消防/物业口碑', '社区稳定性', '周边治安'],
    items: [
      { key: 's1', label: '消防/逃生通道' },
      { key: 's2', label: '物业口碑' },
      { key: 's3', label: '社区封闭管理' },
      { key: 's4', label: '周边治安记录' }
    ]
  },
  {
    key: '经济', icon: '💰', color: '#C8956D',
    tips: ['首付承受上限', '月供占收入比', '持有成本'],
    items: [
      { key: 'e1', label: '首付压力小' },
      { key: 'e2', label: '月供不超收入40%' },
      { key: 'e3', label: '税费/中介费低' },
      { key: 'e4', label: '持有期间成本可控' }
    ]
  },
  {
    key: '便利', icon: '🚇', color: '#4A90A4',
    tips: ['地铁步行15分钟内', '超市/菜市场', '医院/学校'],
    items: [
      { key: 'c1', label: '地铁步行10分钟内' },
      { key: 'c2', label: '大型超市/菜场' },
      { key: 'c3', label: '三甲医院30分钟' },
      { key: 'c4', label: '学校/幼儿园' }
    ]
  },
  {
    key: '健康', icon: '🌿', color: '#4CAF50',
    tips: ['采光/通风', '噪音/污染', '绿化覆盖'],
    items: [
      { key: 'h1', label: '南向采光充足' },
      { key: 'h2', label: '无噪音/临街' },
      { key: 'h3', label: '园林/绿化好' },
      { key: 'h4', label: '空气流通' }
    ]
  },
  {
    key: '舒适', icon: '🏠', color: '#8D6E63',
    tips: ['得房率', '格局方正', '南北通透'],
    items: [
      { key: 'f1', label: '得房率>80%' },
      { key: 'f2', label: '格局方正' },
      { key: 'f3', label: '南北通透' },
      { key: 'f4', label: '层高/开间舒适' }
    ]
  },
  {
    key: '美观', icon: '🎨', color: '#9C27B0',
    tips: ['外立面', '园林/公区', '装修风格'],
    items: [
      { key: 'a1', label: '外立面整洁' },
      { key: 'a2', label: '园林景观好' },
      { key: 'a3', label: '大堂公区品质' },
      { key: 'a4', label: '室内装修风格' }
    ]
  },
  {
    key: '自在', icon: '🐱', color: '#FF7043',
    tips: ['邻里氛围', '宠物友好', '社区文化'],
    items: [
      { key: 'z1', label: '邻里氛围好' },
      { key: 'z2', label: '宠物友好' },
      { key: 'z3', label: '社区活动丰富' },
      { key: 'z4', label: '无奇葩规定' }
    ]
  }
]
const DIMS = DIM_DEFS.map(d => d.key)

const RENT_DURATION_OPTS = [
  { key: 'monthly', label: '短租（1-3月）' },
  { key: 'half', label: '半年租' },
  { key: 'one', label: '1 年' },
  { key: 'two', label: '2 年' },
  { key: 'long', label: '长租（2年以上）' }
]
const CHECKIN_OPTS = [
  { key: 'immediate', label: '立即入住' },
  { key: '1w', label: '1 周内' },
  { key: '1m', label: '1 个月内' },
  { key: '3m', label: '3 个月内' },
  { key: 'semester', label: '学期开始前' }
]
const PAYMENT_OPTS = [
  { key: 'monthly', label: '月付' },
  { key: 'quarter', label: '季付' },
  { key: 'semi', label: '半年付' },
  { key: 'annual', label: '年付' }
]
const FURNITURE_OPTS = [
  { key: 'full', label: '全配套（拎包入住）' },
  { key: 'partial', label: '部分配套' },
  { key: 'none', label: '空房（自己置办）' },
  { key: 'bed', label: '需提供床/床垫' },
  { key: 'ac', label: '需空调' },
  { key: 'washer', label: '需洗衣机' },
  { key: 'fridge', label: '需冰箱' },
  { key: 'kitchen', label: '需厨具' }
]
const PARKING_OPTS = [
  { key: 'need', label: '必须带车位' },
  { key: 'want', label: '最好有车位' },
  { key: 'no', label: '不需要' }
]
const PET_OPTS = [
  { key: 'none', label: '无宠物' },
  { key: 'cat', label: '有猫' },
  { key: 'dog', label: '有狗' },
  { key: 'other', label: '其他宠物' }
]
const NET_OPTS = [
  { key: 'fiber', label: '光纤宽带（必须）' },
  { key: 'wifi', label: 'Wi-Fi 覆盖全屋' },
  { key: '运营商要求', label: '可自选运营商' }
]

// 服务线：购房 / 售房 / 租住 / 出租托管 / 家装 / 适老化升级 / 养老居住 / 资产管理 / 置换（可扩展）
const BIZ_TYPES = [
  { label: '购房', key: 'buy' },
  { label: '售房', key: 'sell' },
  { label: '租住', key: 'rent' },
  { label: '出租托管', key: 'host' },
  { label: '家装', key: 'decor' },
  { label: '适老化升级', key: 'aging' },
  { label: '养老居住', key: 'elderly' },
  { label: '资产管理', key: 'asset' },
  { label: '置换', key: 'replace' }
]

// 点选式选项（对齐「见面参谋」点选交互：先点选、再按需补充，降低手填负担）
const TIME_OPTS = [
  { key: 'soon', label: '半年内', txt: '半年内入住' },
  { key: 'y1', label: '1 年内', txt: '1 年内入住' },
  { key: 'y3', label: '3 年内', txt: '3 年内入住' },
  { key: 'y35', label: '3-5 年', txt: '3-5 年规划' },
  { key: 'y5', label: '5 年以上', txt: '5 年以上' },
  { key: 'watch', label: '观望中', txt: '观望中暂未定' }
]
const TIME_FAR_OPTS = [
  { key: 'edu', label: '学区/教育', txt: '学区教育' },
  { key: 'kid', label: '二胎/育儿', txt: '二胎育儿' },
  { key: 'parent', label: '赡养父母', txt: '赡养父母' },
  { key: 'replace', label: '置换升级', txt: '置换升级' },
  { key: 'retire', label: '退休养老', txt: '退休养老' },
  { key: 'none', label: '暂未规划', txt: '暂未规划' }
]
const SUBJECT_OPTS = [
  { key: 'solo', label: '独居', txt: '独居' },
  { key: 'couple', label: '夫妻二人', txt: '夫妻二人' },
  { key: 'kid1', label: '1 孩', txt: '1 孩' },
  { key: 'kid2', label: '2 孩', txt: '2 孩' },
  { key: 'parents', label: '与父母同住', txt: '与父母同住' },
  { key: 'multi', label: '多代同堂', txt: '多代同堂' },
  { key: 'elders', label: '长辈独居', txt: '长辈独居' },
  { key: 'pet', label: '养宠物', txt: '养宠物' }
]
const ANCHOR_OPTS = {
  live: [
    { key: 'rent', label: '租住', txt: '租住' },
    { key: 'own', label: '自有', txt: '自有住房' },
    { key: 'withParents', label: '与父母同住', txt: '与父母同住' },
    { key: 'dorm', label: '单位宿舍', txt: '单位宿舍' }
  ],
  work: [
    { key: 'metro', label: '地铁通勤', txt: '地铁通勤' },
    { key: 'drive', label: '自驾/打车', txt: '自驾或打车' },
    { key: 'home', label: '居家办公', txt: '居家办公' },
    { key: 'retired', label: '已退休', txt: '已退休' },
    { key: 'c30', label: '通勤≤30 分钟', txt: '通勤 30 分钟内' },
    { key: 'c60', label: '通勤 60 分钟可接受', txt: '通勤 60 分钟内可接受' }
  ],
  family: [
    { key: 'couple', label: '夫妻', txt: '夫妻二人' },
    { key: 'kid1', label: '1 孩', txt: '1 孩' },
    { key: 'kid2', label: '2 孩', txt: '2 孩' },
    { key: 'elders', label: '长辈同住', txt: '长辈同住' },
    { key: 'pet', label: '宠物', txt: '养宠物' }
  ],
  avoid: [
    { key: 'noElevator', label: '无电梯', txt: '无电梯' },
    { key: 'street', label: '临街噪音', txt: '临街噪音' },
    { key: 'top', label: '顶楼', txt: '顶楼' },
    { key: 'west', label: '西晒', txt: '西晒' },
    { key: 'old', label: '老破小', txt: '老破小' },
    { key: 'commercial', label: '商住', txt: '商住' },
    { key: 'far', label: '偏远', txt: '偏远' },
    { key: 'schoolUncertain', label: '学区不确定', txt: '学区不确定' }
  ],
  wish: [
    { key: 'quiet', label: '安静', txt: '安静' },
    { key: 'green', label: '近绿/公园', txt: '近公园绿地' },
    { key: 'metro', label: '近地铁', txt: '近地铁' },
    { key: 'school', label: '学区', txt: '学区资源' },
    { key: 'space', label: '大空间', txt: '空间充足' },
    { key: 'new', label: '新装修', txt: '新装修/精装' },
    { key: 'community', label: '社区氛围', txt: '社区氛围好' },
    { key: 'elderCare', label: '养老/医疗配套', txt: '养老医疗配套' }
  ]
}

import { useUserStore } from '../../store/user'
import { trackPageview } from '../../utils/tracker'

export default {
  data() {
    return {
      dims: DIMS,
      bizTypes: BIZ_TYPES.map(b => b.label),
      bizKeys: BIZ_TYPES.reduce((m, b) => { m[b.label] = b.key; return m }, {}),
      pickerShow: false,
      linkedId: '',
      linkedLine: '',
      timeOpts: TIME_OPTS,
      timeFarOpts: TIME_FAR_OPTS,
      subjectOpts: SUBJECT_OPTS,
      anchorOptsMap: ANCHOR_OPTS,
      timeKeys: [],
      timeFarKeys: [],
      subjectKeys: [],
      anchorKeys: { live: [], work: [], family: [], avoid: [], wish: [] },
      // 租赁专项选项
      rentDurationOpts: RENT_DURATION_OPTS,
      checkinOpts: CHECKIN_OPTS,
      paymentOpts: PAYMENT_OPTS,
      furnitureOpts: FURNITURE_OPTS,
      parkingOpts: PARKING_OPTS,
      petOpts: PET_OPTS,
      netOpts: NET_OPTS,
      furnitureKeys: [],
      netKeys: [],
      anchorKeys: { live: [], work: [], family: [], avoid: [], wish: [] },
      anchorDefs: [
        { key: 'live', label: '现住', ph: '当前居住情况（如：望京租住两居）' },
        { key: 'work', label: '工作', ph: '工作地 / 通勤方式（如：中关村·地铁）' },
        { key: 'family', label: '家庭', ph: '家庭状况（如：未婚妻同行·计划 1 孩）' },
        { key: 'avoid', label: '雷区', ph: '明确不要的（如：无电梯老破小·临街噪音）' },
        { key: 'wish', label: '向往', ph: '最向往的生活（如：推窗见绿·安静独处）' }
      ],
      form: {
        clientName: '',
        bizType: '购房',
        purpose: '',
        time: '',
        timeFar: '',
        subject: '',
        anchors: { live: '', work: '', family: '', avoid: '', wish: '' },
        dimKeys: {},   // { '安全': ['s1','s2'], '经济': ['e1'], ... } — 选中的要素 key 数组
        // 租赁专项字段
        rentDuration: '',
        checkin: '',
        payment: '',
        parking: '',
        pet: '',
        rentNote: '',
        confirmed: false
      }
    }
  },
  computed: {
    userStore() { return useUserStore() },
    // 权重归一化（computed 属性，供模板直接使用）
    computedWeights() {
      const raw = DIMS.map(d => Math.max(0, (this.form.dimKeys[d] || []).length))
      const total = raw.reduce((a, b) => a + b, 0)
      if (total === 0) return DIMS.reduce((m, d) => { m[d] = 0; return m }, {})
      const exact = raw.map(r => (r / total) * 100)
      const floor = exact.map(Math.floor)
      let rem = 100 - floor.reduce((a, b) => a + b, 0)
      const order = exact.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f)
      for (let k = 0; k < rem; k++) floor[order[k % order.length].i]++
      return DIMS.reduce((m, d, i) => { m[d] = floor[i]; return m }, {})
    },
    timeLabel() {
      return this.timeKeys.map(k => (TIME_OPTS.find(o => o.key === k) || {}).txt).filter(Boolean).join(' + ')
    },
    timeFarLabel() {
      return this.timeFarKeys.map(k => (TIME_FAR_OPTS.find(o => o.key === k) || {}).txt).filter(Boolean).join(' + ')
    },
    subjectLabel() {
      return this.subjectKeys.map(k => (SUBJECT_OPTS.find(o => o.key === k) || {}).txt).filter(Boolean).join(' + ')
    },
    anchorLabel() {
      return (k) => this.anchorKeys[k].map(ok => (ANCHOR_OPTS[k].find(o => o.key === ok) || {}).txt).filter(Boolean).join(' + ')
    },
    getHexPoints(r) {
      return DIMS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2
        return `${140 + r * Math.cos(angle)},${140 + r * Math.sin(angle)}`
      }).join(' ')
    },
    axisEndPoints() {
      return DIMS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2
        return { x: 140 + 110 * Math.cos(angle), y: 140 + 110 * Math.sin(angle) }
      })
    },
    // 雷达图：维度标签坐标（比端点再远10px）
    labelPoints() {
      const w = this.computedWeights()
      return DIMS.map((d, i) => {
        const def = DIM_DEFS[i]
        const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2
        const r = 125
        let x = 140 + r * Math.cos(angle)
        let y = 140 + r * Math.sin(angle)
        // 微调对齐
        if (i === 0) y -= 8
        if (i === 1 || i === 2) x += 4
        if (i === 4 || i === 5) x -= 4
        if (i === 3) y += 10
        return { x, y, label: d, color: def.color }
      })
    },
    // 雷达图数据多边形顶点
    dataPoints() {
      const w = this.computedWeights()
      const maxVal = Math.max(...DIMS.map((d, i) => w[d] || 0), 1)
      return DIMS.map((d, i) => {
        const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2
        const r = ((w[d] || 0) / 100) * 110
        return { x: 140 + r * Math.cos(angle), y: 140 + r * Math.sin(angle) }
      })
    },
    radarPolygonPoints() {
      return this.dataPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
    },
    clients() {
      const palette = ['#3D5A3E', '#C46A3A', '#9c7c3a', '#5E7291']
      return (this.userStore.clients || []).map((c, i) => ({
        id: c.id,
        name: c.name || '客户',
        rel: c.rel || '',
        note: c.note || '',
        color: palette[i % palette.length]
      }))
    },
    linkedName() {
      const hit = this.clients.find(c => c.id === this.linkedId)
      return hit ? hit.name : ''
    },
    liveCore() {
      return this.deriveCorePoint(this.form, this.normalizeWeights())
    }
  },
  onLoad(options) {
    trackPageview('insight-prep')
    if (!this.userStore._initialized) this.userStore.initFromStorage()
    if (options && options.clientId) this.linkedId = options.clientId
    if (options && options.serviceLine) {
      this.linkedLine = options.serviceLine
      const meta = (this.userStore.clients.find(c => c.id === this.linkedId) || {})
      // 优先用传入的服务线，其次用客户档案声明的服务线
      const line = this.linkedLine || meta.serviceLine || 'buy'
      const pair = BIZ_TYPES.find(b => b.key === line)
      if (pair) this.form.bizType = pair.label
    }
  },
  methods: {
    toggleTime(k) { this.toggle(this.timeKeys, k) },
    toggleTimeFar(k) { this.toggle(this.timeFarKeys, k) },
    toggleSubject(k) { this.toggle(this.subjectKeys, k) },
    toggleAnchorOpt(ak, k) { this.toggle(this.anchorKeys[ak], k) },
    toggle(arr, k) {
      const i = arr.indexOf(k)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(k)
    },
    anchorOpts(k) {
      return this.anchorOptsMap[k] || []
    },
    // 租赁专项
    toggleFurniture(k) { this.toggle(this.furnitureKeys, k) },
    toggleNet(k) { this.toggle(this.netKeys, k) },
    isDimItemSelected(dim, key) {
      return !!(this.form.dimKeys[dim] || []).includes(key)
    },
    toggleDimItem(dim, key) {
      if (!this.form.dimKeys[dim]) this.$set(this.form.dimKeys, dim, [])
      const arr = this.form.dimKeys[dim]
      const idx = arr.indexOf(key)
      if (idx >= 0) arr.splice(idx, 1)
      else if (arr.length < 4) arr.push(key) // 最多4项
      this.$set(this.form.dimKeys, dim, [...arr])
    },
    // 是否有任意维度选了要素
    hasAnyDimSelected() {
      return DIMS.some(d => (this.form.dimKeys[d] || []).length > 0)
    },
    // 当前是否为租赁场景
    isRent() {
      return this.form.bizType === '租住'
    },
    // 归一化权重数组（给 assembleInsight 用）
    normalizeWeights() {
      const w = this.computedWeights()
      return DIMS.map(d => ({
        name: d,
        weight: w[d] || 0,
        source: '客户自评（小程序采集）'
      }))
    },
    deriveCorePoint(form, seven) {
      const sorted = [...seven].filter(s => s.weight > 0).sort((a, b) => b.weight - a.weight)
      const top = sorted.slice(0, 2).map(s => s.name)
      const motif = (form.purpose || '').trim()
      let s = ''
      if (top[0] && top[1]) s = `您最看重的是「${top[0]}」与「${top[1]}」`
      else if (top[0]) s = `您最看重的是「${top[0]}」`
      if (motif) s += (s ? '，最想解决的是「' + motif + '」' : `最想解决的是「${motif}」`)
      if (!s) s = '继续填写动机与权重，系统将自动生成核心洞察。'
      return s
    },
    buildAnchors(form) {
      const map = { live: '现住', work: '工作', family: '家庭', avoid: '雷区', wish: '向往' }
      const out = []
      Object.keys(map).forEach(k => {
        const picked = this.anchorLabel(k)
        const v = (form.anchors[k] || '').trim()
        const combined = [picked, v].filter(Boolean).join(' + ')
        if (combined) out.push({ label: map[k], value: combined, source: v && picked ? '客户点选+补充（小程序采集）' : '客户自述（小程序采集）' })
      })
      return out
    },
    assembleInsight() {
      const f = this.form
      const seven = this.normalizeWeights()
      const corePoint = this.deriveCorePoint(f, seven)
      const corePointDetail = '以上权重由您自评得出，反映的是当下最在意的事，不是评断。后续可随沟通修正。'
      const threeAxis = {
        purpose: [f.bizType, f.purpose].filter(Boolean).join(' · '),
        time: [this.timeLabel, this.timeFarLabel, f.time, f.timeFar].filter(Boolean).join(' + '),
        subject: [this.subjectLabel, f.subject].filter(Boolean).join(' + ')
      }
      const dateStr = new Date().toISOString().slice(0, 10)
      return {
        clientName: (f.clientName || '').trim() || '未命名客户',
        corePoint,
        corePointDetail,
        threeAxis,
        seven,
        anchors: this.buildAnchors(f),
        confirm: {
          confirmed: !!f.confirmed,
          date: f.confirmed ? dateStr : '',
          by: f.confirmed ? '客户本人（小程序确认）' : ''
        },
        nextStep: f.confirmed
          ? '需求已确认。下一步：由服务者侧「知识库 + 规则引擎」结合真源生成房源提案报告，持报告带看。'
          : '需求待客户确认。确认后由服务者侧结合真源生成房源提案报告。'
      }
    },
    generate() {
      const f = this.form
      if (!f.clientName.trim()) {
        uni.showToast({ title: '先填客户称呼', icon: 'none' })
        return
      }
      if (!f.purpose.trim()) {
        uni.showToast({ title: '先填一句话动机', icon: 'none' })
        return
      }
      const insight = this.assembleInsight()
      const lineKey = this.bizKeys[this.form.bizType] || (this.linkedLine || 'buy')
      // V4 MOT：关联客户时落库（append-only 留痕，带服务线标记），供驾驶舱读取
      if (this.linkedId) {
        try {
          const linked = this.userStore.getClient(this.linkedId)
          if (linked) {
            const confirmedLabel = insight.confirm && insight.confirm.confirmed ? '（已确认）' : '（待确认）'
            this.userStore.saveClientReport(this.linkedId, {
              type: 'insight',
              name: '客户需求洞察报告',
              clientName: insight.clientName,
              serviceLine: lineKey,
              ...insight,
              source: '问诊采集（小程序）'
            })
            uni.showToast({ title: '已存入客户驾驶舱' + confirmedLabel, icon: 'none' })
          }
        } catch (e) {
          console.warn('[insight-prep] saveClientReport 失败', e)
        }
      }
      const url = '/pages/insight/index?insight=' + encodeURIComponent(JSON.stringify(insight)) +
        (this.linkedId ? '&clientId=' + this.linkedId + '&serviceLine=' + lineKey : '')
      uni.navigateTo({ url })
    },
    showClientPicker() { this.pickerShow = true },
    pickClient(c) {
      this.linkedId = c.id
      if (!this.form.clientName || this.form.clientName === '未命名客户') this.form.clientName = c.name
      this.pickerShow = false
      uni.showToast({ title: '已关联 ' + c.name, icon: 'none' })
    },
    fillDemo() {
      this.form = {
        clientName: '林先生 & 未婚妻',
        bizType: '购房',
        purpose: '婚房首套稳定落脚',
        time: '',
        timeFar: '',
        subject: '',
        anchors: {
          live: '朝阳区·望京·租住',
          work: '中关村·通勤地铁',
          family: '未婚妻同行·计划 1 孩',
          avoid: '无电梯老破小·临街噪音',
          wish: '推窗见绿·安静独处'
        },
        dimKeys: { 安全: ['s1', 's2', 's3'], 经济: ['e1', 'e2', 'e3'], 便利: ['c1', 'c2', 'c4'], 健康: ['h1', 'h3', 'h4'], 舒适: ['f2', 'f3'], 美观: ['a1', 'a2'], 自在: ['z1', 'z2'] },
        confirmed: true
      }
      this.timeKeys = ['soon']
      this.timeFarKeys = ['edu', 'kid']
      this.subjectKeys = ['couple', 'kid1', 'parents']
      this.anchorKeys = {
        live: ['rent'],
        work: ['metro', 'c30'],
        family: ['couple', 'kid1'],
        avoid: ['noElevator', 'street'],
        wish: ['green', 'quiet']
      }
      uni.showToast({ title: '已填入示例', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--cream); min-height: 100vh; box-sizing: border-box; padding-bottom: calc(160rpx + env(safe-area-inset-bottom)); }
.hd { background: linear-gradient(135deg, var(--green-deep), var(--green)); border-radius: var(--r-xl); padding: 48rpx 40rpx; color: #fff; margin-bottom: 24rpx; }
.brand { font-size: 22rpx; color: rgba(255,255,255,.85); letter-spacing: 2rpx; }
.h1 { font-size: 38rpx; font-weight: 800; color: #fff; margin-top: 12rpx; }
.sub { font-size: 24rpx; color: rgba(255,255,255,.9); margin-top: 12rpx; line-height: 1.5; }
.sec { background: #fff; border-radius: var(--r-lg); padding: 32rpx; margin-bottom: 24rpx; border: 2rpx solid var(--border); box-shadow: var(--shadow-sm); }
.sec-h { font-size: 30rpx; font-weight: 800; color: var(--text-primary); margin-bottom: 24rpx; display: flex; align-items: center; gap: 12rpx; padding-bottom: 20rpx; border-bottom: 2rpx solid var(--divider); }
.em { font-size: 34rpx; }
.inp { width: 100%; box-sizing: border-box; background: var(--cream); border: 2rpx solid var(--border); border-radius: var(--r-md); padding: 24rpx 28rpx; font-size: 28rpx; color: var(--text-primary); }
.mt { margin-top: 18rpx; }
.g-name { font-size: 24rpx; font-weight: 700; color: var(--green); margin: 6rpx 0 14rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip { padding: 14rpx 26rpx; background: var(--cream); border: 2rpx solid var(--border); border-radius: 999rpx; font-size: 26rpx; color: var(--text-secondary); font-weight: 700; }
.chip.on { background: var(--green); border-color: var(--green); color: #fff; }
.link-row { display: flex; align-items: center; gap: 12rpx; margin-top: 18rpx; background: var(--green-bg); border: 2rpx solid #c6d6c6; border-radius: var(--r-md); padding: 20rpx 24rpx; }
.link-label { font-size: 24rpx; font-weight: 700; color: var(--green); flex-shrink: 0; }
.link-val { flex: 1; font-size: 24rpx; color: var(--text-secondary); }
.link-arrow { font-size: 26rpx; color: var(--green); flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 28rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); max-height: 70vh; display: flex; flex-direction: column; }
.sheet-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sheet-t { font-size: 30rpx; font-weight: 800; color: var(--text-primary); }
.sheet-x { font-size: 32rpx; color: var(--text-tertiary); padding: 4rpx; }
.sheet-list { flex: 1; max-height: 52vh; }
.sheet-item { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 4rpx; border-bottom: 2rpx solid var(--border); }
.sheet-av { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.sheet-body { flex: 1; min-width: 0; }
.sheet-n { font-size: 28rpx; font-weight: 700; color: var(--text-primary); }
.sheet-m { font-size: 22rpx; color: var(--text-tertiary); margin-top: 4rpx; line-height: 1.4; }
.sheet-check { color: var(--green); font-size: 30rpx; font-weight: 800; }
.seg { display: flex; gap: 16rpx; }
.seg-i { flex: 1; text-align: center; padding: 22rpx 0; background: var(--cream); border: 2rpx solid var(--border); border-radius: var(--r-md); font-size: 28rpx; color: var(--text-secondary); font-weight: 700; }
.seg-i.on { background: var(--green); color: #fff; border-color: var(--green); }
.an-in { margin-bottom: 18rpx; }
.an-in:last-child { margin-bottom: 0; }
.an-lab { font-size: 24rpx; font-weight: 700; color: var(--orange); margin-bottom: 10rpx; }
.dim-intro { font-size: 22rpx; color: var(--text-tertiary); margin-bottom: 20rpx; line-height: 1.5; }
.radar-wrap { background: var(--cream); border-radius: var(--r-lg); padding: 24rpx; margin-bottom: 24rpx; text-align: center; }
.radar-chart-title { font-size: 24rpx; font-weight: 700; color: var(--text-primary); margin-bottom: 8rpx; }
.radar-svg-wrap { width: 280rpx; height: 280rpx; margin: 0 auto; }
.radar-svg { width: 100%; height: 100%; }
.wt-list { display: flex; flex-wrap: wrap; gap: 8rpx; justify-content: center; margin-top: 12rpx; }
.wt-item { display: flex; align-items: center; gap: 6rpx; background: #fff; border-radius: 20rpx; padding: 4rpx 14rpx; }
.wt-name { font-size: 22rpx; font-weight: 700; }
.wt-pct { font-size: 20rpx; color: var(--text-secondary); }
.radar-empty { text-align: center; padding: 32rpx; color: var(--text-tertiary); font-size: 26rpx; background: var(--cream); border-radius: var(--r-lg); margin-bottom: 24rpx; }
.dim-group { margin-top: 28rpx; }
.dim-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.dim-name { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
.dim-count { font-size: 22rpx; color: var(--text-tertiary); }
.dim-tips { font-size: 20rpx; color: var(--text-tertiary); margin-bottom: 10rpx; }
.dim-chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.dim-chip { padding: 12rpx 22rpx; background: var(--cream); border: 2rpx solid var(--border); border-radius: 999rpx; font-size: 24rpx; color: var(--text-secondary); font-weight: 700; transition: all .2s; }
.dim-chip.on { color: #fff; }
.w-tip { font-size: 21rpx; color: var(--text-tertiary); margin-top: 14rpx; line-height: 1.5; }
.core-prev { background: var(--cream); border-radius: var(--r-md); padding: 24rpx 28rpx; border-left: 8rpx solid var(--orange); font-size: 28rpx; font-weight: 700; color: var(--text-primary); line-height: 1.6; }
.conf { display: flex; align-items: flex-start; gap: 18rpx; background: #fff; border: 2rpx solid var(--border); border-radius: var(--r-lg); padding: 26rpx; margin-bottom: 24rpx; }
.conf.on { background: var(--green-bg); border-color: #c6d6c6; }
.conf-box { width: 40rpx; height: 40rpx; border-radius: 10rpx; border: 3rpx solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 900; color: #fff; }
.conf.on .conf-box { background: var(--green); border-color: var(--green); }
.conf-txt { flex: 1; }
.conf-t1 { font-size: 28rpx; font-weight: 800; color: var(--text-primary); }
.conf-t2 { font-size: 22rpx; color: var(--text-tertiary); margin-top: 6rpx; line-height: 1.5; }
.demo { text-align: center; font-size: 24rpx; color: var(--orange); padding: 10rpx 0 24rpx; }
.ft { padding: 8rpx 24rpx 20rpx; color: var(--text-tertiary); font-size: 21rpx; text-align: center; line-height: 1.6; }
.actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); box-shadow: 0 -8rpx 32rpx rgba(42,40,37,.08); z-index: 50; }
.btn-main { width: 100%; background: linear-gradient(135deg, var(--orange), var(--orange-light)); color: #fff; border-radius: var(--r-md); padding: 30rpx; font-size: 30rpx; font-weight: 800; box-shadow: var(--shadow-accent); }
</style>
