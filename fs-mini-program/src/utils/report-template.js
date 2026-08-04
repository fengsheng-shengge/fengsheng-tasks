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

function esc(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
