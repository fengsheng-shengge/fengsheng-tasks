// V3.0.11 策展报告 HTML 模板引擎
// 将策展引擎输出渲染为独立 HTML（自包含 CSS，可直接在浏览器打开/打印为 PDF/微信内分享）
// 铁律：数据诚实——只渲染引擎返回的真实数据，绝不编造；缺失依据照实标注

/**
 * 生成完整 HTML 报告字符串
 * @param {Object} curation - generateCuration() 的返回值
 * @param {Object} opts - { agentName, clientName, dateStr }
 * @returns {string} 完整 HTML 文档
 */
export function generateReportHTML(curation, opts = {}) {
  const agent = opts.agentName || '风声经纪人'
  const client = opts.clientName || ''
  const date = opts.dateStr || new Date().toLocaleDateString('zh-CN')
  const r = curation

  const sayHTML = (r.say || []).map((s, i) => `
    <div class="card say-card">
      <div class="say-num">${i + 1}</div>
      <div class="say-body">
        <div class="say-title">${esc(s.title)}</div>
        <div class="say-point">${esc(s.point)}</div>
        ${s.detail ? `<div class="say-detail">${esc(s.detail)}</div>` : ''}
        <div class="ref ${s.hasLegal ? 'ref-ok' : 'ref-wait'}">
          ${s.hasLegal ? '<span class="ref-icon">✓</span> 真实依据：' + esc(s.legalRef) : '经验要点 · 依据整理中'}
        </div>
      </div>
    </div>`).join('')

  const bringHTML = (r.bring || []).map(b => `
    <div class="bring-item">
      <div class="bring-title">${esc(b.title)}</div>
      <div class="bring-benefit">${esc(b.benefit)}</div>
    </div>`).join('')

  const askHTML = (r.ask || []).map((a, i) => `
    <div class="ask-item">
      <span class="ask-num">Q${i + 1}</span>
      <span class="ask-text">${esc(a.q)}</span>
    </div>`).join('')

  const followHTML = (r.followups || []).map(f => `
    <div class="follow-item">
      <div class="follow-theme">${esc(f.theme)}</div>
      <div class="follow-text">${esc(f.text)}</div>
    </div>`).join('')

  const dimTags = (r.dimensionLabels || []).map(d => `<span class="dim-tag">${esc(d)}</span>`).join('')
  const timelineHTML = (r.timeline || []).map(t => `
    <div class="tl-item">
      <div class="tl-icon">${t.icon}</div>
      <div class="tl-body">
        <div class="tl-phase">${esc(t.phase)}</div>
        <div class="tl-tip">${esc(t.tip)}</div>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
<title>见面策展报告 · ${esc(r.axisLabel)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif; background:#f7f4ef; color:#2b2b2b; line-height:1.6; padding:16px; max-width:680px; margin:0 auto; }
  .report-header { background:linear-gradient(135deg,#3d5a3e 0%,#2f4730 100%); border-radius:16px; padding:24px 20px; color:#fff; margin-bottom:16px; }
  .report-header .brand { font-size:12px; letter-spacing:2px; opacity:.7; text-transform:uppercase; }
  .report-header h1 { font-size:22px; font-weight:700; margin-top:4px; }
  .report-header .meta { font-size:13px; opacity:.8; margin-top:8px; display:flex; flex-wrap:wrap; gap:12px; }
  .report-header .meta span { display:inline-flex; align-items:center; gap:4px; }
  .axis-line { font-size:15px; font-weight:600; margin-top:10px; opacity:.95; }
  .dim-row { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; }
  .dim-tag { font-size:12px; background:rgba(255,255,255,.15); padding:4px 10px; border-radius:6px; }
  .honesty { margin-top:12px; font-size:12px; opacity:.75; line-height:1.5; }
  .timeline { background:#fff; border-radius:14px; padding:16px; margin-bottom:14px; border:1px solid #efe9dd; }
  .tl-item { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px dashed #eee; }
  .tl-item:last-child { border-bottom:none; }
  .tl-icon { font-size:22px; line-height:1; }
  .tl-phase { font-size:14px; font-weight:700; color:#3d5a3e; }
  .tl-tip { font-size:12px; color:#8a837a; margin-top:2px; }
  .section { margin-bottom:16px; }
  .sec-h { font-size:16px; font-weight:700; color:#2b2b2b; margin-bottom:10px; display:flex; align-items:center; gap:6px; padding-left:2px; }
  .sec-h .emoji { font-size:18px; }
  .sec-h .badge { font-size:11px; font-weight:400; color:#C8956D; background:#fbf6ee; padding:2px 8px; border-radius:6px; margin-left:auto; }
  .card { background:#fff; border-radius:12px; padding:14px; margin-bottom:10px; border:1px solid #efe9dd; }
  .say-card { display:flex; gap:12px; }
  .say-num { width:28px; height:28px; border-radius:50%; background:#3d5a3e; color:#fff; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .say-body { flex:1; min-width:0; }
  .say-title { font-size:15px; font-weight:700; color:#2b2b2b; }
  .say-point { font-size:13px; color:#444; margin-top:4px; line-height:1.55; }
  .say-detail { font-size:12px; color:#8a837a; margin-top:4px; line-height:1.5; }
  .ref { font-size:11px; margin-top:8px; padding:4px 8px; border-radius:6px; line-height:1.4; display:inline-block; }
  .ref-ok { background:#eef3ec; color:#3d5a3e; }
  .ref-wait { background:#f3f0ea; color:#8a837a; }
  .ref-icon { font-weight:700; }
  .bring-item { padding:8px 0; border-bottom:1px dashed #eee; }
  .bring-item:last-child { border-bottom:none; }
  .bring-title { font-size:14px; font-weight:600; color:#2b2b2b; }
  .bring-benefit { font-size:12px; color:#8a837a; margin-top:2px; }
  .ask-item { background:#eef3ec; border-radius:8px; padding:10px 12px; margin-bottom:8px; display:flex; align-items:flex-start; gap:8px; }
  .ask-num { font-size:12px; font-weight:700; color:#3d5a3e; flex-shrink:0; padding-top:1px; }
  .ask-text { font-size:13px; color:#2b5a3e; line-height:1.5; }
  .follow-item { padding:8px 0; border-bottom:1px dashed #eee; }
  .follow-item:last-child { border-bottom:none; }
  .follow-theme { font-size:13px; font-weight:700; color:#c46a3a; }
  .follow-text { font-size:12px; color:#555; margin-top:2px; line-height:1.5; }
  .empty-mini { font-size:12px; color:#aaa; padding:6px 0; }
  .report-footer { text-align:center; padding:20px 0 12px; font-size:11px; color:#aaa; line-height:1.6; }
  .report-footer .brand-line { color:#3d5a3e; font-weight:600; font-size:13px; margin-bottom:4px; }
  .report-footer .disclaimer { max-width:420px; margin:6px auto 0; opacity:.7; }
  @media print {
    body { background:#fff; padding:0; max-width:none; }
    .card { break-inside:avoid; }
    .report-header { break-inside:avoid; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">FENG SHENG · 见面策展报告</div>
    <h1>${esc(r.axisLabel)}</h1>
    <div class="meta">
      <span>📅 ${date}</span>
      ${client ? '<span>👤 客户：' + esc(client) + '</span>' : ''}
      <span>🧑‍💼 ${esc(agent)}</span>
    </div>
    ${dimTags ? '<div class="dim-row">' + dimTags + '</div>' : ''}
    <div class="honesty">${esc(r.honesty.note)}</div>
  </div>

  ${timelineHTML ? '<div class="timeline">' + timelineHTML + '</div>' : ''}

  <div class="section">
    <div class="sec-h"><span class="emoji">📢</span>该说的<span class="badge">每条挂真实依据</span></div>
    ${sayHTML || '<div class="empty-mini">暂无强相关条目</div>'}
  </div>

  <div class="section">
    <div class="sec-h"><span class="emoji">🏠</span>该带的<span class="badge">看房方向</span></div>
    <div class="card">${bringHTML || '<div class="empty-mini">暂无强相关条目，建议结合实勘补充</div>'}</div>
  </div>

  <div class="section">
    <div class="sec-h"><span class="emoji">❓</span>该问的<span class="badge">必问 · 探需求</span></div>
    ${askHTML || '<div class="empty-mini">暂无必问条目</div>'}
  </div>

  <div class="section">
    <div class="sec-h"><span class="emoji">💌</span>见后跟进<span class="badge">持续关怀</span></div>
    <div class="card">${followHTML || '<div class="empty-mini">暂无跟进条目</div>'}</div>
  </div>

  <div class="report-footer">
    <div class="brand-line">风声 · 帮服务者用独立价值获得尊重</div>
    <div>本报告由风声见面参谋基于真实字典生成，每条依据可追溯</div>
    <div class="disclaimer">报告内容仅供参考，具体交易决策请结合专业判断与实地情况</div>
  </div>
</body>
</html>`
}

/**
 * 生成简短报告摘要文本（用于分享卡片 / 复制摘要）
 */
export function generateReportSummary(curation, opts = {}) {
  const r = curation
  const agent = opts.agentName || '风声经纪人'
  const lines = []
  lines.push('【风声见面策展报告】')
  lines.push(r.axisLabel)
  if (r.dimensionLabels && r.dimensionLabels.length) {
    lines.push('关注维度：' + r.dimensionLabels.join('、'))
  }
  lines.push('')
  lines.push('📢 该说的（' + (r.say || []).length + '条）：')
  ;(r.say || []).slice(0, 3).forEach((s, i) => {
    lines.push((i + 1) + '. ' + s.title + '：' + (s.point || '').slice(0, 50))
  })
  lines.push('')
  lines.push('🏠 该带的（' + (r.bring || []).length + '条）')
  lines.push('❓ 该问的（' + (r.ask || []).length + '条）')
  lines.push('💌 见后跟进（' + (r.followups || []).length + '条）')
  lines.push('')
  lines.push(r.honesty.note)
  lines.push('—— ' + agent + ' · ' + (opts.dateStr || new Date().toLocaleDateString('zh-CN')))
  return lines.join('\n')
}

/**
 * 客户需求洞察报告 HTML 模板（V4 探索步·①交付物）
 * 数据诚实：只渲染客户确认过的需求画像；七维权重带 source；示例数据明确标注；
 * 不渲染任何未核验房源/房价数字；不给"推荐买哪套"的结论（呼应九不准）。
 * @param {Object} insight - 结构化需求洞察（契约见 insight 页 DATA_CONTRACT 注释）
 * @param {Object} opts - { agentName, clientName, dateStr }
 */
export function generateInsightReportHTML(insight, opts = {}) {
  const agent = opts.agentName || '风声经纪人'
  const client = opts.clientName || insight.clientName || ''
  const date = opts.dateStr || new Date().toLocaleDateString('zh-CN')
  const d = insight || {}
  const isEx = d.isExample

  const seven = validateSeven(d.seven)
  const sevenHTML = seven.map(s => `
    <div class="sv-row">
      <div class="sv-name">${esc(s.name)}</div>
      <div class="sv-track"><div class="sv-fill" style="width:${Math.max(2, Math.min(100, s.weight))}%"></div></div>
      <div class="sv-val">${esc(s.weight)}</div>
      ${s.source ? '<div class="sv-src">依据：' + esc(s.source) + '</div>' : ''}
    </div>`).join('')

  const axisHTML = (d.threeAxis || {})
  const axisRows = [
    ['目的', axisHTML.purpose],
    ['时间', axisHTML.time],
    ['主体', axisHTML.subject]
  ].filter(r => r[1]).map(r => `
    <div class="ax-row">
      <div class="ax-k">${esc(r[0])}</div>
      <div class="ax-v">${esc(r[1])}</div>
    </div>`).join('')

  const anchorHTML = (d.anchors || []).map(a => `
    <div class="an-row">
      <div class="an-k">${esc(a.label)}</div>
      <div class="an-v">${esc(a.value)}</div>
      ${a.source ? '<div class="an-src">来源：' + esc(a.source) + '</div>' : ''}
    </div>`).join('')

  const confirm = d.confirm || {}
  const confirmHTML = confirm.confirmed
    ? `<div class="conf-card ok">
         <div class="conf-seal">已确认</div>
         <div class="conf-txt">本需求画像已由客户亲口确认，作为后续服务的依据。</div>
         <div class="conf-meta">确认时间：${esc(confirm.date || date)} ｜ 确认人：${esc(confirm.by || '客户本人')}</div>
       </div>`
    : `<div class="conf-card wait">
         <div class="conf-seal w">待确认</div>
         <div class="conf-txt">需求尚未经客户确认，暂不进入房源推荐与带看环节。</div>
       </div>`

  const exampleBadge = isEx ? '<div class="ex-badge">示例数据 · 仅供产品演示，非真实客户</div>' : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
<title>客户需求洞察报告 · ${esc(client || '客户')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif; background:#f7f4ef; color:#2b2b2b; line-height:1.6; padding:16px; max-width:680px; margin:0 auto; }
  .report-header { background:linear-gradient(135deg,#3d5a3e 0%,#2f4730 100%); border-radius:16px; padding:24px 20px; color:#fff; margin-bottom:16px; }
  .report-header .brand { font-size:12px; letter-spacing:2px; opacity:.7; text-transform:uppercase; }
  .report-header h1 { font-size:21px; font-weight:700; margin-top:4px; }
  .report-header .meta { font-size:13px; opacity:.85; margin-top:8px; display:flex; flex-wrap:wrap; gap:12px; }
  .report-header .meta span { display:inline-flex; align-items:center; gap:4px; }
  .ex-badge { margin-top:12px; font-size:12px; background:rgba(196,106,58,.22); color:#ffd9c2; padding:6px 12px; border-radius:8px; display:inline-block; }
  .core { background:#fff; border-radius:14px; padding:18px; margin-bottom:14px; border:1px solid #efe9dd; border-left:5px solid #c46a3a; }
  .core-t { font-size:12px; color:#c46a3a; font-weight:700; letter-spacing:1px; margin-bottom:8px; }
  .core-p { font-size:16px; font-weight:700; color:#2b2b2b; line-height:1.5; }
  .core-d { font-size:13px; color:#555; margin-top:10px; line-height:1.6; }
  .sec { background:#fff; border-radius:14px; padding:16px; margin-bottom:14px; border:1px solid #efe9dd; }
  .sec-h { font-size:15px; font-weight:700; color:#2b2b2b; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .sec-h .em { font-size:17px; }
  .ax-row { display:flex; gap:12px; padding:10px 0; border-bottom:1px dashed #eee; }
  .ax-row:last-child { border-bottom:none; }
  .ax-k { flex:0 0 64px; font-size:13px; font-weight:700; color:#c46a3a; }
  .ax-v { flex:1; font-size:13px; color:#2b2b2b; line-height:1.5; }
  .sv-row { padding:10px 0; border-bottom:1px dashed #eee; }
  .sv-row:last-child { border-bottom:none; }
  .sv-name { font-size:13px; font-weight:700; color:#2b2b2b; margin-bottom:6px; }
  .sv-track { height:10px; background:#eee7dc; border-radius:6px; overflow:hidden; }
  .sv-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,#3d5a3e,#5c745d); }
  .sv-val { float:right; font-size:12px; font-weight:700; color:#3d5a3e; margin-top:-18px; }
  .sv-src { font-size:11px; color:#8a857b; margin-top:6px; }
  .an-row { padding:9px 0; border-bottom:1px dashed #eee; }
  .an-row:last-child { border-bottom:none; }
  .an-k { font-size:12px; font-weight:700; color:#c46a3a; }
  .an-v { font-size:13px; color:#2b2b2b; margin-top:2px; }
  .an-src { font-size:11px; color:#8a857b; margin-top:2px; }
  .conf-card { border-radius:14px; padding:16px; margin-bottom:14px; display:flex; flex-direction:column; gap:8px; }
  .conf-card.ok { background:#eef3ec; border:1px solid #c6d6c6; }
  .conf-card.wait { background:#f3f0ea; border:1px solid #e3ddd0; }
  .conf-seal { align-self:flex-start; font-size:13px; font-weight:800; color:#fff; background:#3d5a3e; padding:4px 16px; border-radius:999px; }
  .conf-seal.w { background:#8a857b; }
  .conf-txt { font-size:13px; color:#2b2b2b; line-height:1.5; }
  .conf-meta { font-size:11px; color:#8a857b; }
  .next { background:#fbf6ee; border:1px dashed #C8956D; border-radius:14px; padding:16px; margin-bottom:14px; }
  .next-t { font-size:13px; font-weight:700; color:#C8956D; margin-bottom:6px; }
  .next-d { font-size:12px; color:#6b665e; line-height:1.6; }
  .report-footer { text-align:center; padding:18px 0 12px; font-size:11px; color:#aaa; line-height:1.6; }
  .report-footer .brand-line { color:#3d5a3e; font-weight:600; font-size:13px; margin-bottom:4px; }
  @media print {
    body { background:#fff; padding:0; max-width:none; }
    .core,.sec,.conf-card,.next { break-inside:avoid; }
    .report-header { break-inside:avoid; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">FENG SHENG · 客户需求洞察报告</div>
    <h1>这是您亲口确认过的需求</h1>
    <div class="meta">
      <span>📅 ${date}</span>
      ${client ? '<span>👤 客户：' + esc(client) + '</span>' : ''}
      <span>🧑‍💼 ${esc(agent)}</span>
    </div>
    ${exampleBadge}
  </div>

  <div class="core">
    <div class="core-t">核心洞察</div>
    <div class="core-p">${esc(d.corePoint || '（待生成）')}</div>
    ${d.corePointDetail ? '<div class="core-d">' + esc(d.corePointDetail) + '</div>' : ''}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🧭</span>需求三轴拆解</div>
    ${axisHTML ? axisRows : '<div class="an-src">（待生成）</div>'}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🎯</span>七维居住品质权重</div>
    ${sevenHTML || '<div class="an-src">（待生成）</div>'}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">📍</span>生活锚点（脱敏回显）</div>
    ${anchorHTML || '<div class="an-src">（待生成）</div>'}
  </div>

  ${confirmHTML}

  <div class="next">
    <div class="next-t">下一步</div>
    <div class="next-d">${esc(d.nextStep || '需求确认后，由服务者侧「知识库 + 规则引擎」结合真源生成房源提案报告，持报告带看。')}</div>
  </div>

  <div class="report-footer">
    <div class="brand-line">风声 · 帮服务者用独立价值获得尊重</div>
    <div>本报告仅呈现客户确认过的需求，不含任何房源推荐与价格测算</div>
    <div>具体交易决策请结合专业判断与实地情况</div>
  </div>
</body>
</html>`
}

/**
 * 客户需求洞察报告 · 简短摘要（用于分享卡片 / 复制）
 */
export function generateInsightSummary(insight, opts = {}) {
  const d = insight || {}
  const agent = opts.agentName || '风声经纪人'
  const lines = []
  lines.push('【风声 · 客户需求洞察报告】')
  if (d.clientName) lines.push('客户：' + d.clientName)
  lines.push('')
  if (d.corePoint) lines.push('核心洞察：' + d.corePoint)
  lines.push('')
  const ax = d.threeAxis || {}
  if (ax.purpose) lines.push('目的轴：' + ax.purpose)
  if (ax.time) lines.push('时间轴：' + ax.time)
  if (ax.subject) lines.push('主体轴：' + ax.subject)
  lines.push('')
  const seven = validateSeven(d.seven)
  if (seven.length) {
    lines.push('七维权重：' + seven.map(s => s.name + ' ' + s.weight).join(' / '))
  }
  lines.push('')
  const c = d.confirm || {}
  lines.push(c.confirmed ? '需求状态：已确认（' + (c.date || '') + '）' : '需求状态：待确认')
  lines.push('—— ' + agent + ' · ' + (opts.dateStr || new Date().toLocaleDateString('zh-CN')))
  return lines.join('\n')
}

/**
 * 房源提案报告 HTML 模板（V4 MOT · ②服务提案）
 *
 * 数据来源（两路）：
 *   ① 真实客户已确认的 insight JSON（来自 insight-prep → insight 页 → 带入本页）
 *   ② 演示数据（当无真实 insight 时展示方法论链路）
 *
 * 数据诚实铁律：
 *   - 吸附度 M = Σ(七维权重 × 房源匹配档) ÷ Σ权重 —— 算法链路示意，非真实评测
 *   - 信服度 S = 待核验（须绑定住建委/贝壳成交/租赁备案等权威源）
 *   - 房源卡片明确标注「示意」/「待核验」，不渲染任何未核验房源/房价数字
 *   - 双维象限①②③在真源接入前统一标记为「待真源核验」，④为淘汰
 *   - 全成本测算只呈现方法公式，不渲染具体数字
 *   - 片区/商圈/楼盘推荐归服务者侧「知识库+规则引擎」结合真源输出
 *
 * @param {Object} proposal - 提案数据（见 DATA_CONTRACT 注释）
 * @param {Object} insight  - 对应的已确认需求洞察 JSON（可选，无则用演示数据）
 * @param {Object} opts     - { agentName, clientName, dateStr }
 */
export function generateProposalReportHTML(proposal, insight, opts = {}) {
  const agent = opts.agentName || '风声经纪人'
  const client = opts.clientName || (insight && insight.clientName) || proposal.clientName || ''
  const date = opts.dateStr || new Date().toLocaleDateString('zh-CN')
  const d = proposal || {}
  const isEx = !insight   // 无真实 insight → 全演示数据

  const seven = validateSeven(insight && insight.seven ? insight.seven : [])
  const sevenHTML = seven.map(s => `
    <div class="sv-row">
      <div class="sv-name">${esc(s.name)}</div>
      <div class="sv-track"><div class="sv-fill" style="width:${Math.max(2, Math.min(100, s.weight))}%"></div></div>
      <div class="sv-val">${esc(s.weight)}</div>
      ${s.source ? '<div class="sv-src">依据：' + esc(s.source) + '</div>' : ''}
    </div>`).join('')

  const anchorRows = insight && insight.anchors
    ? insight.anchors.map(a => `<div class="an-row"><div class="an-k">${esc(a.label)}</div><div class="an-v">${esc(a.value)}</div>${a.source ? '<div class="an-src">来源：' + esc(a.source) + '</div>' : ''}</div>`).join('')
    : '<div class="an-src">（待接入真实锚点数据）</div>'

  const axisRows = insight && insight.threeAxis
    ? [
        ['目的', insight.threeAxis.purpose],
        ['时间', insight.threeAxis.time],
        ['主体', insight.threeAxis.subject]
      ].filter(r => r[1]).map(r => `<div class="ax-row"><div class="ax-k">${esc(r[0])}</div><div class="ax-v">${esc(r[1])}</div></div>`).join('')
    : '<div class="an-src">（待接入真实需求轴）</div>'

  // 演示房源：只做方法论展示，数据全部标注示意/待核验
  const demoHouses = [
    { name: '示例楼盘 A', price: '待核验', rent: '待核验', area: '待核验', m: '—', s: '待核验', quad: '①②③ 待真源核验' },
    { name: '示例楼盘 B', price: '待核验', rent: '待核验', area: '待核验', m: '—', s: '待核验', quad: '④ 淘汰（雷区触发）' }
  ]
  const housesHTML = demoHouses.map(h => `
    <div class="demo-card">
      <div class="row"><span class="k">房源</span><span class="v">${esc(h.name)} <span class="demo-flag">示意</span></span></div>
      <div class="row"><span class="k">总价（示意）</span><span class="v">${esc(h.price)}</span></div>
      <div class="row"><span class="k">吸附度 M</span><span class="v">${esc(h.m)} <span class="demo-flag">示意</span></span></div>
      <div class="row"><span class="k">信服度 S</span><span class="v">${esc(h.s)}</span></div>
      <div class="row"><span class="k">象限</span><span class="v">${esc(h.quad)}</span></div>
    </div>`).join('')

  const insightConfirmed = !!(insight && insight.confirm && insight.confirm.confirmed)
  const gateNote = insightConfirmed
    ? '<div class="gate-ok">✓ 需求已确认（MOT 闸门 1 通过）</div>'
    : '<div class="gate-lock">🔒 需求尚未经客户确认，房源提案暂不开放。请先完成需求洞察问诊并请客户确认。</div>'

  const demoBadge = isEx ? '<div class="ex-badge">示例数据 · 仅供产品演示，非真实客户/房源</div>' : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0">
<title>房源提案报告 · ${esc(client || '客户')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif; background:#f7f4ef; color:#2b2b2b; line-height:1.6; padding:16px; max-width:680px; margin:0 auto; }
  .report-header { background:linear-gradient(135deg,#3d5a3e 0%,#2f4730 100%); border-radius:16px; padding:24px 20px; color:#fff; margin-bottom:16px; }
  .report-header .brand { font-size:12px; letter-spacing:2px; opacity:.7; text-transform:uppercase; }
  .report-header h1 { font-size:21px; font-weight:700; margin-top:4px; }
  .report-header .meta { font-size:13px; opacity:.85; margin-top:8px; display:flex; flex-wrap:wrap; gap:12px; }
  .report-header .meta span { display:inline-flex; align-items:center; gap:4px; }
  .ex-badge { margin-top:12px; font-size:12px; background:rgba(196,106,58,.22); color:#ffd9c2; padding:6px 12px; border-radius:8px; display:inline-block; }
  .gate-ok { background:#eef3ec; border:1px solid #c6d6c6; border-radius:10px; padding:12px 16px; font-size:13px; color:#3d5a3e; font-weight:600; margin-bottom:14px; }
  .gate-lock { background:#f3f0ea; border:1px dashed #c46a3a; border-radius:10px; padding:12px 16px; font-size:13px; color:#8a3d1c; margin-bottom:14px; }
  .core { background:#fff; border-radius:14px; padding:18px; margin-bottom:14px; border:1px solid #efe9dd; border-left:5px solid #c46a3a; }
  .core-t { font-size:12px; color:#c46a3a; font-weight:700; letter-spacing:1px; margin-bottom:8px; }
  .core-p { font-size:16px; font-weight:700; color:#2b2b2b; line-height:1.5; }
  .core-d { font-size:13px; color:#555; margin-top:10px; line-height:1.6; }
  .sec { background:#fff; border-radius:14px; padding:16px; margin-bottom:14px; border:1px solid #efe9dd; }
  .sec-h { font-size:15px; font-weight:700; color:#2b2b2b; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .sec-h .em { font-size:17px; }
  .ax-row { display:flex; gap:12px; padding:10px 0; border-bottom:1px dashed #eee; }
  .ax-row:last-child { border-bottom:none; }
  .ax-k { flex:0 0 64px; font-size:13px; font-weight:700; color:#c46a3a; }
  .ax-v { flex:1; font-size:13px; color:#2b2b2b; line-height:1.5; }
  .sv-row { padding:10px 0; border-bottom:1px dashed #eee; }
  .sv-row:last-child { border-bottom:none; }
  .sv-name { font-size:13px; font-weight:700; color:#2b2b2b; margin-bottom:6px; }
  .sv-track { height:10px; background:#eee7dc; border-radius:6px; overflow:hidden; }
  .sv-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,#3d5a3e,#5c745d); }
  .sv-val { float:right; font-size:12px; font-weight:700; color:#3d5a3e; margin-top:-18px; }
  .sv-src { font-size:11px; color:#8a857b; margin-top:6px; }
  .an-row { padding:9px 0; border-bottom:1px dashed #eee; }
  .an-row:last-child { border-bottom:none; }
  .an-k { font-size:12px; font-weight:700; color:#c46a3a; }
  .an-v { font-size:13px; color:#2b2b2b; margin-top:2px; }
  .an-src { font-size:11px; color:#8a857b; margin-top:2px; }
  .quad { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
  .qd { border:1px solid #e3ddd2; border-radius:10px; padding:10px; font-size:12px; background:#fcfbf8; }
  .qd b { display:block; color:#3d5a3e; margin-bottom:3px; }
  .method { font-size:13px; color:#7a756c; background:#faf8f3; border:1px dashed #d9cfbd; border-radius:10px; padding:12px; margin-top:8px; line-height:1.6; }
  .method code { background:#efe9df; padding:1px 5px; border-radius:5px; color:#2f4730; }
  .method b { color:#2b2b2b; }
  .lock { background:#f0eee9; border:1px solid #e3ddd2; border-radius:10px; padding:14px; margin-bottom:14px; color:#7a756c; font-size:13px; }
  .lock b { color:#2b2b2b; }
  .engine-note { background:#f3f7f1; border-left:4px solid #3d5a3e; padding:10px 14px; border-radius:8px; font-size:13px; color:#3a5040; margin-bottom:14px; line-height:1.6; }
  .demo-card { border:1.5px dashed #d9cfbd; background:#fbf8f2; border-radius:12px; padding:14px; margin:8px 0; }
  .demo-card .row { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; border-bottom:1px dotted #e7ddca; }
  .demo-card .row:last-child { border-bottom:none; }
  .demo-card .k { color:#7a756c; }
  .demo-card .v { font-weight:600; }
  .demo-flag { font-size:11px; color:#a99a82; background:#efe7d8; border-radius:6px; padding:1px 8px; vertical-align:super; margin-left:2px; }
  .report-footer { text-align:center; padding:18px 0 12px; font-size:11px; color:#aaa; line-height:1.6; }
  .report-footer .brand-line { color:#3d5a3e; font-weight:600; font-size:13px; margin-bottom:4px; }
  @media print { body { background:#fff; padding:0; max-width:none; } .core,.sec,.demo-card,.lock { break-inside:avoid; } .report-header { break-inside:avoid; } }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">FENG SHENG · 房源提案报告</div>
    <h1>需求关联 · 方案清单 · 持报告带看</h1>
    <div class="meta">
      <span>📅 ${date}</span>
      ${client ? '<span>👤 客户：' + esc(client) + '</span>' : ''}
      <span>🧑‍💼 ${esc(agent)}</span>
    </div>
    ${demoBadge}
  </div>

  ${gateNote}

  <div class="engine-note">
    ✓ 本报告由<b>风声居住服务生命周期</b>②阶段产出。片区 / 商圈 / 楼盘推荐与信服度核验，由专业服务者「知识库 + 规则引擎」消费本画像 + 真源后渲染。本样本为方法论示意，不替代真实方案。
  </div>

  <div class="core">
    <div class="core-t">核心洞察（来自①需求洞察报告）</div>
    <div class="core-p">${esc((insight && insight.corePoint) || '（待接入真实需求洞察）')}</div>
    ${(insight && insight.corePointDetail) ? '<div class="core-d">' + esc(insight.corePointDetail) + '</div>' : ''}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🧭</span>需求三轴拆解</div>
    ${axisRows || '<div class="an-src">（待生成）</div>'}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🎯</span>七维居住品质权重（来自①确认需求）</div>
    ${sevenHTML || '<div class="an-src">（待生成）</div>'}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">📍</span>生活锚点（服务者侧结合真源的输入）</div>
    ${anchorRows}
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🏠</span>吸附度 M 试算 <span class="demo-flag">示意</span></div>
    <div class="method">
      吸附度 M = Σ(七维权重 × 房源七维匹配档) ÷ Σ权重<br/>
      匹配档：优=1.0 / 良=0.75 / 中=0.5 / 差=0.25<br/>
      此试算仅验证「权重×匹配」链路，不代表任何房源推荐。
    </div>
    ${housesHTML}
  </div>

  <div class="lock">
    🔒 <b>信服度 S 待接入真源核验，本样本不参与排序。</b><br/>
    信服度四支柱（价格真实性 / 租金真实性 / 流动性 / 确定性）须绑定住建委、贝壳成交、租赁备案等权威源方可计算。在 demo 状态下，四象限无法分辨「强推荐 / 诚实排除」，故统一标记为「待核验」。
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">📊</span>双维评估框架（方法论示意）</div>
    <div class="quad">
      <div class="qd"><b>① 强推荐</b>M≥75 且 S≥75（待真源核验后启用）</div>
      <div class="qd"><b>② 诚实排除</b>M&lt;75 且 S≥75（待真源核验后启用）</div>
      <div class="qd"><b>③ 补证据</b>M≥75 且 S&lt;75（待真源核验后启用）</div>
      <div class="qd"><b>④ 淘汰</b>M&lt;75 且 S&lt;75 / 触发雷区否决</div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">💰</span>全成本测算（方法示意，不渲染具体数字）</div>
    <div class="method">
      到手总成本 = 裸房价 + 契税（首套网签价×<code>1%</code> / 二套×<code>2%</code>，<b>待核验网签价</b>）
      + 中介费（约成交价×<code>1.5%</code>，<b>待核实费率</b>）+ 其他交易税费。<br/>
      月供 / 十年净值 / 回报率等强决策数字，<b>本样本不计算、不展示</b>，待接入真实网签价与租赁备案后，由服务者侧按三情景区间表达，并标注 source / asOf / 置信度。
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="em">🔗</span>下游交付说明（片区 / 商圈 / 楼盘归服务者侧）</div>
    <div class="method">
      输入：本画像的<b>锚点（现住地、能量锚点、通勤方式/容忍、学情）+ 七维权重 + 向往 + 雷区</b>。<br/>
      处理：专业服务者「知识库 + 规则引擎」结合真源（行政区划 / 学区划片 / 成交备案 / 通勤路网）计算候选片区 → 商圈 → 楼盘，并输出信服度 S（绑真源）。<br/>
      本工具不越界做交付。
    </div>
  </div>

  <div class="report-footer">
    <div class="brand-line">风声 · 帮服务者用独立价值获得尊重</div>
    <div>本报告为方法论示意，不含任何真实房源推荐与价格测算</div>
    <div>具体交易决策请结合专业判断与实地情况</div>
  </div>
</body>
</html>`
}

/**
 * 房源提案报告 · 简短摘要（用于分享卡片 / 复制）
 */
export function generateProposalSummary(proposal, insight, opts = {}) {
  const agent = opts.agentName || '风声经纪人'
  const client = opts.clientName || (insight && insight.clientName) || ''
  const lines = []
  lines.push('【风声 · 房源提案报告】')
  if (client) lines.push('客户：' + client)
  const confirmed = insight && insight.confirm && insight.confirm.confirmed
  lines.push('需求确认：' + (confirmed ? '已确认（' + (insight.confirm.date || '') + '）' : '待确认'))
  if (insight && insight.corePoint) lines.push('核心洞察：' + insight.corePoint)
  const seven = validateSeven(insight && insight.seven ? insight.seven : [])
  if (seven.length) lines.push('七维权重：' + seven.map(s => s.name + ' ' + s.weight).join(' / '))
  lines.push('吸附度 M：待核验（须接入真实房源数据）')
  lines.push('信服度 S：待核验（须绑定权威源）')
  lines.push('—— ' + agent + ' · ' + (opts.dateStr || new Date().toLocaleDateString('zh-CN')))
  return lines.join('\n')
}

/**
 * 七维权重防御性校验（#V4-003 改进 · 小酒窝儿审核建议）
 * 上游 insight-prep 已将权重归一化到合计 100，但报告模板层补一道数值校验：
 *  1) 数值合法化：非有限 / NaN / 负数 / 超界 → clamp 到 [0, 100]
 *  2) 合计归一化：若合计偏离 100（超 EPS），按比例缩回 100，防 UI 错位与语义错误
 *  3) 收口一位小数，消除浮点噪声
 * 不改变维度顺序与依据文本，仅修正数值层；示例数据(30+25+20+15+5+3+2=100)校验后不变。
 */
function validateSeven(seven) {
  if (!Array.isArray(seven) || !seven.length) return []
  // 1) 基础合法化：非有限 / NaN / 负数 → 0（超界值暂不 clamp，交由归一化收敛到 [0,100]）
  const cleaned = seven.map(s => {
    const src = s && typeof s === 'object' ? s : {}
    let w = Number(src.weight)
    if (!isFinite(w) || isNaN(w)) w = 0
    if (w < 0) w = 0
    return { name: src.name, weight: w, source: src.source }
  })
  // 2) 合计归一化：若合计偏离 100（超 EPS），按比例缩放回 100，防 UI 错位与语义错误
  const total = cleaned.reduce((a, s) => a + s.weight, 0)
  const EPS = 0.5
  if (total > EPS && Math.abs(total - 100) > EPS) {
    cleaned.forEach(s => { s.weight = Math.round((s.weight / total) * 1000) / 10 })
  }
  // 3) 兜底 clamp + 小数收口：确保单值 ∈ [0, 100]，消除浮点噪声
  cleaned.forEach(s => {
    if (s.weight > 100) s.weight = 100
    if (s.weight < 0) s.weight = 0
    s.weight = Math.round(s.weight * 10) / 10
  })
  return cleaned
}

function esc(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
