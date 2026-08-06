// V3.0.11 豆包提示词生成器
// 将策展引擎输出转化为结构化豆包提示词，经纪人复制后直接粘贴到豆包生成 PPT / 视频 / 详细报告
// 设计原则：提示词自包含（含完整上下文+输出要求），无需经纪人二次编辑即可用

/**
 * 生成 PPT 提示词（用于客户见面展示）
 * @param {Object} curation - generateCuration() 的返回值
 * @param {Object} opts - { agentName, clientName }
 * @returns {string} 可直接粘贴到豆包的提示词
 */
export function generatePPTPrompt(curation, opts = {}) {
  const r = curation
  const agent = opts.agentName || '（经纪人姓名）'
  const client = opts.clientName || '（客户姓名）'

  const sayPoints = (r.say || []).map((s, i) =>
    `第${i + 1}点：${s.title}\n  - 核心话术：${s.point || ''}\n  - 详细说明：${s.detail || ''}\n  - 依据：${s.hasLegal ? s.legalRef : '经验要点（依据整理中）'}`
  ).join('\n\n')

  const bringPoints = (r.bring || []).map(b =>
    `- ${b.title}：${b.benefit || ''}`
  ).join('\n')

  const askPoints = (r.ask || []).map((a, i) => `Q${i + 1}：${a.q}`).join('\n')

  const followPoints = (r.followups || []).map(f =>
    `- ${f.theme}：${f.text}`
  ).join('\n')

  return `你是一位资深房产经纪人的数字助手。请根据以下见面策展方案，帮我生成一份专业的客户展示PPT（大约8-12页）。

## 客户背景
- 客户类型：${r.axisLabel}
- 关注维度：${(r.dimensionLabels || []).join('、') || '综合'}
- 经纪人：${agent}
- 客户：${client}

## 策展内容

### 一、该说的（核心讲解要点）
${sayPoints}

### 二、该带的（看房/房源方向）
${bringPoints}

### 三、该问的（必问清单）
${askPoints}

### 四、见后跟进计划
${followPoints}

## PPT 要求
1. 风格：专业、温暖、值得信赖。主色调墨绿色(#3d5a3e)配暖橙色(#c46a3a)，背景米白色(#f7f4ef)
2. 封面页：标题「${r.axisLabel} · 专业见面方案」，副标题经纪人姓名+日期
3. 目录页：列出4个板块（该说的/该带的/该问的/见后跟进）
4. 内容页：每个"该说的"要点单独一页，突出核心话术，底部小字标注依据来源
5. 看房方向页：用卡片式布局展示推荐方向
6. 必问清单页：用问答卡形式呈现
7. 跟进计划页：用时间轴或卡片展示后续关怀节奏
8. 尾页：品牌语「风声 · 帮服务者用独立价值获得尊重」+ 联系方式占位
9. 每页文字精炼，重点突出，适合手机竖屏查看
10. 语言风格：真诚专业，不使用绝对化用语（如"最佳""第一"等）`
}

/**
 * 生成视频脚本提示词（用于短视频/朋友圈视频）
 * @param {Object} curation - generateCuration() 的返回值
 * @param {Object} opts - { agentName, clientName }
 * @returns {string} 可直接粘贴到豆包的提示词
 */
export function generateVideoPrompt(curation, opts = {}) {
  const r = curation
  const agent = opts.agentName || '（经纪人姓名）'

  const sayHighlights = (r.say || []).slice(0, 3).map((s, i) =>
    `要点${i + 1}：${s.title} —— ${s.point || ''}`
  ).join('\n')

  const askHighlights = (r.ask || []).slice(0, 2).map((a, i) => `问题${i + 1}：${a.q}`).join('\n')

  return `你是一位房产经纪人的数字助手。请根据以下见面策展要点，帮我写一段60秒的短视频脚本（适合发朋友圈/视频号）。

## 策展背景
- 客户场景：${r.axisLabel}
- 关注：${(r.dimensionLabels || []).join('、') || '综合需求'}

## 核心要点
${sayHighlights}

## 需要了解的
${askHighlights}

## 脚本要求
1. 开头（0-5秒）：用一个真实的客户场景切入，引发共鸣（如"最近有客户问了我一个问题..."）
2. 正文（5-45秒）：围绕上面${(r.say || []).length}个要点展开，用大白话讲解，每条配一个生活化的比喻
3. 结尾（45-60秒）：总结一个专业观点 + 邀请互动（如"你家买房时最看重什么？评论区聊聊"）
4. 语言风格：真诚、接地气、有专业感但不端着
5. 避免绝对化用语，所有观点要有依据支撑
6. 请给出分镜建议（每段标注画面建议+口播文字）
7. 口播人设：${agent}，资深房产经纪人`
}

/**
 * 生成详细分析报告提示词（用于深度客户分析文档）
 * @param {Object} curation - generateCuration() 的返回值
 * @param {Object} opts - { agentName, clientName, freeText }
 * @returns {string} 可直接粘贴到豆包的提示词
 */
export function generateReportPrompt(curation, opts = {}) {
  const r = curation
  const agent = opts.agentName || '（经纪人姓名）'
  const client = opts.clientName || '（客户姓名）'
  const freeText = opts.freeText || r.freeText || ''

  const sayDetail = (r.say || []).map((s, i) =>
    `${i + 1}. ${s.title}
   话术：${s.point || ''}
   补充：${s.detail || ''}
   依据：${s.hasLegal ? s.legalRef : '经验要点'}`
  ).join('\n\n')

  return `你是一位房产经纪人的数字分析助手。请根据以下见面策展数据，帮我生成一份2-3页的详细客户分析报告（Word文档格式）。

## 客户信息
- 客户：${client}
- 阶段：${r.axisLabel}
- 关注维度：${(r.dimensionLabels || []).join('、') || '综合'}
- 自由诉求：${freeText || '（未填写）'}
- 经纪人：${agent}

## 策展数据

### 核心讲解要点
${sayDetail}

### 看房方向
${(r.bring || []).map(b => '- ' + b.title + '：' + (b.benefit || '')).join('\n')}

### 必问清单
${(r.ask || []).map((a, i) => (i + 1) + '. ' + a.q).join('\n')}

### 跟进计划
${(r.followups || []).map(f => '- ' + f.theme + '：' + f.text).join('\n')}

### 数据诚实性说明
${r.honesty.note}

## 报告要求
1. 报告标题：「${client} · ${r.axisLabel} · 客户见面分析报告」
2. 第一部分「客户画像」：根据阶段+维度+自由诉求，分析客户可能的心理状态、决策模式、核心顾虑
3. 第二部分「专业建议」：基于策展数据，给出针对性的专业建议（每条建议引用上方依据）
4. 第三部分「行动清单」：列出见面前准备、见面中执行、见面后跟进的checklist
5. 第四部分「风险提示」：标注需要特别注意的事项（如政策变化、资格核验等）
6. 语言风格：专业但不晦涩，经纪人能直接用于客户沟通
7. 所有数据来源标注清楚，不确定的内容标注"建议进一步核实"
8. 避免绝对化用语，保持客观中立`
}

/**
 * 生成提示词选择列表
 */
export function getPromptTypes() {
  return [
    {
      key: 'ppt',
      icon: '📊',
      name: 'PPT 提示词',
      desc: '生成客户见面展示PPT（8-12页），直接粘贴到豆包即可生成',
      badge: '最常用'
    },
    {
      key: 'video',
      icon: '🎬',
      name: '视频脚本提示词',
      desc: '生成60秒短视频脚本（含分镜建议），适合朋友圈/视频号',
      badge: '引流利器'
    },
    {
      key: 'report',
      icon: '📄',
      name: '详细报告提示词',
      desc: '生成2-3页深度客户分析报告（Word格式），适合复杂客户场景',
      badge: '深度场景'
    }
  ]
}

/**
 * 根据类型生成对应提示词
 */
export function generatePrompt(type, curation, opts = {}) {
  switch (type) {
    case 'ppt': return generatePPTPrompt(curation, opts)
    case 'video': return generateVideoPrompt(curation, opts)
    case 'report': return generateReportPrompt(curation, opts)
    default: return generatePPTPrompt(curation, opts)
  }
}
