// 七维需求雷达图（SVG base64 image，H5 / 微信小程序通用）
// 避免 canvas 2d 跨端绘制时机差异；输出为 data URL，可直接用于 <image src="...">。

export function svgToDataUrl(svg) {
  try {
    const bytes = new TextEncoder().encode(svg)
    let b64 = ''
    if (typeof uni !== 'undefined' && uni.arrayBufferToBase64) {
      b64 = uni.arrayBufferToBase64(bytes.buffer)
    } else if (typeof Buffer !== 'undefined') {
      b64 = Buffer.from(bytes).toString('base64')
    } else {
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      b64 = btoa(binary)
    }
    return 'data:image/svg+xml;base64,' + b64
  } catch (e) {
    console.error('[radar] svgToDataUrl failed:', e.message)
    return ''
  }
}

export function buildRadarSvg(opts) {
  const { W, H, dims, broker, self, selfEval } = opts
  const n = dims.length
  if (!n) return ''
  const cx = W / 2
  const cy = H / 2 + 4
  const R = Math.min(W, H) / 2 - 34

  const pts = (vals) => {
    let s = ''
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const rr = (R * (vals[i] || 0)) / 10
      s += `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)} `
    }
    return s
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`

  // 网格 4 圈 + 轴线
  for (let r = 1; r <= 4; r++) {
    const vals = Array(n).fill((r * 10) / 4)
    svg += `<polygon points="${pts(vals)}" fill="none" stroke="#e7e0d4" stroke-width="1"/>`
  }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    svg += `<line x1="${cx}" y1="${cy}" x2="${cx + R * Math.cos(a)}" y2="${cy + R * Math.sin(a)}" stroke="#eceae1" stroke-width="1"/>`
  }

  const anyB = (broker || []).some((x) => x > 0)
  const anyS = selfEval && (self || []).some((x) => x > 0)

  // 客户自评多边形（虚线，画在底层）
  if (anyS) {
    svg += `<polygon points="${pts(self)}" fill="rgba(61,90,62,.18)" stroke="#3d5a3e" stroke-width="2" stroke-dasharray="5,4"/>`
  }
  // 经纪人评多边形
  if (anyB) {
    svg += `<polygon points="${pts(broker)}" fill="rgba(196,106,58,.22)" stroke="#c46a3a" stroke-width="2"/>`
  }

  // 维度标签 + 差异告警
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const bi = +(broker[i] || 0)
    const si = selfEval ? +(self[i] || 0) : 0
    const diff = selfEval ? Math.abs(bi - si) : 0
    const color = diff > 3 ? '#c0392b' : '#3d5a3e'
    const weight = diff > 3 ? 'bold' : 'normal'
    const label = dims[i] + (diff > 3 ? ' ⚠' : '')
    svg += `<text x="${cx + (R + 14) * Math.cos(a)}" y="${cy + (R + 14) * Math.sin(a) + 3}" text-anchor="middle" fill="${color}" font-size="10" font-weight="${weight}" font-family="sans-serif">${label}</text>`
  }

  // 空态
  if (!anyB && !anyS) {
    svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#b5b0a4" font-size="12" font-family="sans-serif">待经纪人在上一步录入</text>`
  }

  svg += '</svg>'
  return svg
}

// 便捷：直接生成可用于 <image> 的 data URL
export function buildRadarDataUrl(opts) {
  const svg = buildRadarSvg(opts)
  return svg ? svgToDataUrl(svg) : ''
}
