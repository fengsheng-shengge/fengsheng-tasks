<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="top-header">
      <view class="th-brand">🌿 风声</view>
      <view class="th-title">测算工具</view>
    </view>

    <!-- 工具切换 -->
    <view class="tool-tabs">
      <view
        :class="['tab-btn', { active: toolMode === 'rent' }]"
        @tap="switchTool('rent')">
        🔑 月租测算
      </view>
      <view
        :class="['tab-btn', { active: toolMode === 'buy' }]"
        @tap="switchTool('buy')">
        🏠 月供测算
      </view>
    </view>

    <!-- ========== 月租测算 ========== -->
    <view v-if="toolMode === 'rent'" class="calc-section">
      <view class="cs-title">月租可承受测算</view>
      <view class="cs-sub">帮您判断合理的月租预算，避免超支</view>

      <view class="input-group">
        <view class="ig-label">月收入（元）</view>
        <input
          class="ig-input"
          type="number"
          v-model="rent.monthlyIncome"
          placeholder="请输入月收入"
          @input="calcRent" />
      </view>

      <view class="input-group">
        <view class="ig-label">月固定支出（元）</view>
        <input
          class="ig-input"
          type="number"
          v-model="rent.monthlyExpense"
          placeholder="生活费/贷款等固定支出"
          @input="calcRent" />
      </view>

      <view class="input-group">
        <view class="ig-label">期望月租上限（元）</view>
        <input
          class="ig-input"
          type="number"
          v-model="rent.desiredRent"
          placeholder="可手动调整"
          @input="calcRent" />
      </view>

      <!-- 付款方式 -->
      <view class="payment-options">
        <view class="po-label">付款方式</view>
        <view class="po-btns">
          <view
            :class="['po-btn', { active: rent.paymentType === '押一付一' }]"
            @tap="rent.paymentType = '押一付一'; calcRent()">押一付一</view>
          <view
            :class="['po-btn', { active: rent.paymentType === '押一付三' }]"
            @tap="rent.paymentType = '押一付三'; calcRent()">押一付三</view>
          <view
            :class="['po-btn', { active: rent.paymentType === '半年付' }]"
            @tap="rent.paymentType = '半年付'; calcRent()">半年付</view>
          <view
            :class="['po-btn', { active: rent.paymentType === '年付' }]"
            @tap="rent.paymentType = '年付'; calcRent()">年付</view>
        </view>
      </view>

      <!-- 结果 -->
      <view class="result-card" v-if="rentResult">
        <view class="rc-header">📊 测算结果</view>

        <view class="rc-row primary">
          <text class="rcr-label">建议月租区间</text>
          <text class="rcr-val">{{ rentResult.suggestRange }}</text>
        </view>
        <view class="rc-row">
          <text class="rcr-label">房租/月收入比</text>
          <text class="rcr-val" :class="rentResult.ratioClass">{{ rentResult.ratio }}%</text>
        </view>
        <view class="rc-row" v-if="rentResult.initCost">
          <text class="rcr-label">首次租金成本</text>
          <text class="rcr-val">{{ rentResult.initCost }}</text>
        </view>
        <view class="rc-row" v-if="rentResult.monthlyPressure">
          <text class="rcr-label">月资金压力</text>
          <text class="rcr-val" :class="rentResult.pressureClass">{{ rentResult.monthlyPressure }}</text>
        </view>

        <view class="rc-warning" v-if="rentResult.warning">
          <text>⚠️ {{ rentResult.warning }}</text>
        </view>

        <view class="rc-tip" v-if="rentResult.tip">
          💡 {{ rentResult.tip }}
        </view>
      </view>
    </view>

    <!-- ========== 月供测算 ========== -->
    <view v-if="toolMode === 'buy'" class="calc-section">
      <view class="cs-title">购房月供测算</view>
      <view class="cs-sub">主流商业贷款计算，结果与银行基本一致</view>

      <view class="input-group">
        <view class="ig-label">房屋总价（万元）</view>
        <input
          class="ig-input"
          type="digit"
          v-model="buy.totalPrice"
          placeholder="请输入总价"
          @input="calcBuy" />
      </view>

      <view class="input-group">
        <view class="ig-label">首付比例</view>
        <view class="po-btns">
          <view
            v-for="opt in buy.downPaymentOptions"
            :key="opt"
            :class="['po-btn sm', { active: buy.downPayment === opt }]"
            @tap="buy.downPayment = opt; calcBuy()">{{ opt }}</view>
        </view>
      </view>

      <view class="input-group">
        <view class="ig-label">贷款类型</view>
        <view class="po-btns">
          <view
            :class="['po-btn', { active: buy.loanType === '商贷' }]"
            @tap="buy.loanType = '商贷'; calcBuy()">商贷</view>
          <view
            :class="['po-btn', { active: buy.loanType === '公积金' }]"
            @tap="buy.loanType = '公积金'; calcBuy()">公积金</view>
          <view
            :class="['po-btn', { active: buy.loanType === '组合贷' }]"
            @tap="buy.loanType = '组合贷'; calcBuy()">组合贷</view>
        </view>
      </view>

      <view class="input-group">
        <view class="ig-label">贷款年限</view>
        <view class="po-btns">
          <view
            v-for="opt in buy.loanTermOptions"
            :key="opt"
            :class="['po-btn sm', { active: buy.loanTerm === opt }]"
            @tap="buy.loanTerm = opt; calcBuy()">{{ opt }}年</view>
        </view>
      </view>

      <view class="input-group" v-if="buy.loanType !== '公积金'">
        <view class="ig-label">商贷利率（%）LPR 5Y 基准 3.5%（2026年9月）</view>
        <input
          class="ig-input"
          type="digit"
          v-model="buy.commercialRate"
          placeholder="3.5"
          @input="calcBuy" />
      </view>
      <view class="input-group" v-if="buy.loanType === '公积金'">
        <view class="ig-label">公积金利率（%）</view>
        <input
          class="ig-input"
          type="digit"
          v-model="buy.公积金Rate"
          placeholder="2.60"
          @input="calcBuy" />
      </view>

      <!-- 结果 -->
      <view class="result-card" v-if="buyResult">
        <view class="rc-header">📊 测算结果</view>

        <view class="rc-row primary">
          <text class="rcr-label">月供</text>
          <text class="rcr-val">{{ buyResult.monthlyPayment }} 元</text>
        </view>
        <view class="rc-row">
          <text class="rcr-label">贷款本金</text>
          <text class="rcr-val">{{ buyResult.loanAmount }} 万</text>
        </view>
        <view class="rc-row">
          <text class="rcr-label">总利息</text>
          <text class="rcr-val">{{ buyResult.totalInterest }} 万</text>
        </view>
        <view class="rc-row">
          <text class="rcr-label">本息合计</text>
          <text class="rcr-val">{{ buyResult.totalPayment }} 万</text>
        </view>
        <view class="rc-row">
          <text class="rcr-label">首付</text>
          <text class="rcr-val">{{ buyResult.downPayment }} 万</text>
        </view>

        <view class="rc-warning" v-if="buyResult.warning">
          <text>⚠️ {{ buyResult.warning }}</text>
        </view>
        <view class="rc-tip" v-if="buyResult.tip">
          💡 {{ buyResult.tip }}
        </view>
      </view>
    </view>

    <!-- 备注 -->
    <view class="disclaimer">
      <text>数据来源：5年期LPR（2026年9月执行，1年期3.0%），公积金利率同步更新。实际利率因城市政策、个人征信而异，以银行审批为准。</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      toolMode: 'rent', // 'rent' | 'buy'

      // 月租测算
      rent: {
        monthlyIncome: '',
        monthlyExpense: '',
        desiredRent: '',
        paymentType: '押一付三',
      },

      // 月供测算
      buy: {
        totalPrice: '',
        downPayment: '30%',
        downPaymentOptions: ['20%', '30%', '40%', '50%'],
        loanType: '商贷',
        loanTerm: 30,
        loanTermOptions: [15, 20, 25, 30],
        commercialRate: '3.5',
        公积金Rate: '2.60',
      },

      rentResult: null,
      buyResult: null,
    }
  },

  onLoad() {
    uni.setNavigationBarTitle({ title: '测算工具' })
  },

  methods: {
    // ========== 月租测算 ==========
    calcRent() {
      const income = parseFloat(this.rent.monthlyIncome) || 0
      const expense = parseFloat(this.rent.monthlyExpense) || 0
      const desired = parseFloat(this.rent.desiredRent) || 0

      if (income <= 0) { this.rentResult = null; return }

      const disposable = income - expense
      const suggestRent = Math.round(disposable * 0.4) // 40% 法则
      const ratio = income > 0 ? Math.round((desired || suggestRent) / income * 100) : 0

      const ratioClass = ratio > 50 ? 'warn' : ratio > 40 ? 'warn-mid' : 'ok'
      const ratioLabel = ratio > 50 ? '⚠️ 偏高' : ratio > 40 ? '⚡ 注意' : '✅ 合理'

      // 首付成本
      let initCost = null
      if (desired || suggestRent) {
        const rent = desired || suggestRent
        const map = {
          '押一付一': rent * 2,
          '押一付三': rent * 4,
          '半年付': rent * 6.5,
          '年付': rent * 13,
        }
        initCost = Math.round(map[this.rent.paymentType] || rent * 4) + ' 元'
      }

      const warning = ratio > 50
        ? `房租占收入 ${ratio}%，超过 50% 警戒线，生活压力较大`
        : ratio > 40
        ? `房租占收入 ${ratio}%，接近 40% 上限，需谨慎`
        : null

      const pressure = income - expense - (desired || suggestRent)
      const pressureClass = pressure < 0 ? 'warn' : pressure < income * 0.1 ? 'warn-mid' : 'ok'
      const pressureLabel = pressure < 0 ? '⚠️ 超支' : pressure < income * 0.1 ? '⚡ 紧张' : '✅ 宽裕'

      const suggestLow = Math.round(disposable * 0.3)
      const suggestHigh = Math.round(disposable * 0.4)

      this.rentResult = {
        suggestRange: `${suggestLow} ~ ${suggestHigh} 元`,
        ratio: ratio,
        ratioClass,
        initCost,
        monthlyPressure: pressureLabel,
        pressureClass,
        warning,
        tip: `建议房租不超过可支配收入的 40%，${suggestLow}~${suggestHigh} 元是较为舒适的区间`,
      }
    },

    // ========== 切换工具时重算 ==========
    switchTool(mode) {
      this.toolMode = mode
      this.$nextTick(() => {
        if (mode === 'rent') this.calcRent()
        else this.calcBuy()
      })
    },

    // ========== 月供测算 ==========
    calcBuy() {
      const totalPrice = parseFloat(this.buy.totalPrice) || 0
      if (totalPrice <= 0) { this.buyResult = null; return }

      const downPct = parseFloat(this.buy.downPayment) / 100
      const downPayment = totalPrice * downPct
      const loanAmount = totalPrice - downPayment
      const years = this.buy.loanTerm
      const months = years * 12

      let monthlyRate = 0
      if (this.buy.loanType === '商贷' || this.buy.loanType === '组合贷') {
        monthlyRate = (parseFloat(this.buy.commercialRate) || 4.2) / 100 / 12
      } else {
        monthlyRate = (parseFloat(this.buy.公积金Rate) || 3.1) / 100 / 12
      }

      // 注意：输入单位是万元，但公式需要元
      const loanAmountYuan = loanAmount * 10000  // 万元 → 元

      // 等额本息月供公式: M = P * [r(1+r)^n] / [(1+r)^n - 1]
      const r = monthlyRate
      const n = months
      const factor = Math.pow(1 + r, n)
      const monthlyPayment = Math.round(loanAmountYuan * (r * factor) / (factor - 1))
      const totalPaymentYuan = monthlyPayment * months
      const totalInterest = ((totalPaymentYuan - loanAmountYuan) / 10000).toFixed(2)  // 万元

      const warning = monthlyPayment > 15000
        ? `月供 ${monthlyPayment.toLocaleString()} 元较高，建议确认家庭收支是否可覆盖`
        : null

      const tip = `贷款 ${loanAmount.toFixed(1)} 万（${this.buy.downPayment}首付），${years}年还清，总利息约 ${totalInterest} 万`

      this.buyResult = {
        monthlyPayment: monthlyPayment.toLocaleString(),
        loanAmount: loanAmount.toFixed(1),
        totalInterest: totalInterest,
        totalPayment: (totalPaymentYuan / 10000).toFixed(2),
        downPayment: downPayment.toFixed(1),
        warning,
        tip,
      }
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f4ef;
  padding-bottom: 40px;
}

.top-header {
  background: linear-gradient(135deg, #3d5a3e 0%, #2f4730 100%);
  color: #fff;
  padding: 20px 18px 16px;
  border-radius: 0 0 20px 20px;
}
.th-brand { font-size: 13px; opacity: 0.75; margin-bottom: 4px; }
.th-title { font-size: 20px; font-weight: 700; }

.tool-tabs {
  display: flex;
  gap: 10px;
  padding: 14px 18px 0;
}
.tab-btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #8a837a;
  background: #fff;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.tab-btn.active {
  color: #3d5a3e;
  border-color: #3d5a3e;
  background: #eef3ec;
}

.calc-section {
  padding: 16px 18px;
}
.cs-title { font-size: 18px; font-weight: 700; color: #2b2b28; margin-bottom: 4px; }
.cs-sub { font-size: 13px; color: #8a837a; margin-bottom: 16px; }

.input-group {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 2px solid #e8e4dc;
}
.ig-label { font-size: 13px; font-weight: 600; color: #8a837a; margin-bottom: 8px; }
.ig-input {
  width: 100%;
  font-size: 20px;
  font-weight: 700;
  color: #2b2b28;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
}

.payment-options { margin-bottom: 10px; }
.po-label { font-size: 13px; font-weight: 600; color: #8a837a; margin-bottom: 8px; }
.po-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.po-btn {
  padding: 8px 14px;
  border-radius: 8px;
  background: #fff;
  border: 2px solid #e8e4dc;
  font-size: 13px;
  color: #8a837a;
  transition: all 0.2s;
  cursor: pointer;
}
.po-btn.sm { padding: 6px 10px; font-size: 12px; }
.po-btn.active { background: #3d5a3e; color: #fff; border-color: #3d5a3e; }

/* 结果卡 */
.result-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  border: 2px solid #3d5a3e;
  margin-top: 4px;
}
.rc-header { font-size: 15px; font-weight: 700; color: #3d5a3e; margin-bottom: 12px; }
.rc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0ece4;
  font-size: 14px;
}
.rc-row:last-of-type { border-bottom: none; }
.rc-row.primary { border-bottom: 2px solid #e8e4dc; margin-bottom: 4px; }
.rcr-label { color: #8a837a; }
.rcr-val { font-weight: 700; color: #2b2b28; }
.rcr-val.warn { color: #c0392b; }
.rcr-val.warn-mid { color: #c8953a; }
.rcr-val.ok { color: #3d5a3e; }

.rc-warning {
  margin-top: 12px;
  background: #fff5f5;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #c0392b;
  border: 1px solid #f5c6c6;
}
.rc-tip {
  margin-top: 10px;
  background: #f7faf7;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #3d5a3e;
  line-height: 1.6;
}

.disclaimer {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: #b8b1a6;
}
</style>
