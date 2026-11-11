/**
 * evidence-link.js
 * ────────────────────────────────────────────────────────
 * Evidence Schema v0.1 前端渲染组件
 * 用法：EvidenceLink.render(container, adaptedEntry)
 *       或：EvidenceLink.renderAll('#evidence-section', adaptedEntries)
 *
 * 不依赖任何框架（React/Vue 等），纯原生 DOM。
 * 组件契约由 EvidenceAdapter 输出的 flattenEvidence 提供。
 */

(function (global) {
  'use strict';

  // ============ 组件依赖（全局） ============
  // 页面需要先引入 data-adapter.js
  const Adapter = global.EvidenceAdapter;

  // ============ CSS（自注入） ============
  const CSS_INJECTED = Symbol.for('evidence_link_css');
  if (typeof document !== 'undefined' && !window[CSS_INJECTED]) {
    const style = document.createElement('style');
    style.textContent = `
      .ev-panel {
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        padding: 12px 16px;
        margin-top: 8px;
        background: #fafafa;
        font-size: 12.5px;
      }
      .ev-panel-title {
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ev-panel-title::before { content: '🔗'; }

      .ev-list { display: flex; flex-direction: column; gap: 8px; }
      .ev-item {
        border-left: 3px solid #ccc;
        padding: 6px 10px;
        background: #fff;
        border-radius: 4px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .ev-item-clickable { border-left-color: #2563eb; }
      .ev-item-clickable:hover { background: #eff6ff; }
      .ev-item-gray { opacity: 0.55; }

      .ev-badge {
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        padding: 2px 7px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
        letter-spacing: 0.5px;
      }
      .ev-badge-law { background: #2d7a3e; }
      .ev-badge-policy { background: #3b5998; }
      .ev-badge-case { background: #8b4513; }
      .ev-badge-data { background: #008080; }
      .ev-badge-experience { background: #7d7d7d; }

      .ev-body { flex: 1; min-width: 0; }
      .ev-title {
        font-weight: 500;
        color: #333;
        line-height: 1.5;
        word-break: break-all;
      }
      .ev-title-clickable {
        color: #2563eb;
        cursor: pointer;
        text-decoration: underline dotted;
      }
      .ev-source {
        font-size: 11px;
        color: #888;
        margin-top: 3px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ev-source-item { white-space: nowrap; }
      .ev-authority { font-weight: 600; }

      .ev-pending {
        font-size: 11px;
        color: #999;
        font-style: italic;
      }

      .ev-caveat {
        margin-top: 10px;
        padding: 8px 10px;
        background: #fff8e1;
        border: 1px solid #ffe082;
        border-radius: 6px;
        font-size: 11.5px;
        line-height: 1.6;
      }
      .ev-caveat-title { font-weight: 600; color: #b8860b; margin-bottom: 4px; }
      .ev-caveat-row { margin-top: 2px; }
      .ev-caveat-label { color: #888; font-weight: 500; }
      .ev-caveat-risk { color: #c44a32; }
      .ev-caveat-no { color: #b8860b; }

      .ev-blevel {
        display: inline-block;
        margin-top: 6px;
        font-size: 10.5px;
        color: #888;
        background: #f5f5f5;
        padding: 3px 8px;
        border-radius: 3px;
      }
      .ev-blevel::before { content: '⚠️ '; }

      .ev-l3-blocked {
        background: #fff5f5;
        border: 1px solid #fecaca;
        padding: 10px 14px;
        border-radius: 8px;
        color: #c44a32;
        font-weight: 600;
        font-size: 13px;
        text-align: center;
      }
      .ev-l3-blocked::before { content: '🚫 '; }

      .ev-empty {
        font-size: 12px;
        color: #aaa;
        font-style: italic;
        text-align: center;
        padding: 12px;
      }

      /* 证据包导出区块 */
      .ev-export-row {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed #e0e0e0;
      }
      .ev-export-btn {
        background: #fff;
        border: 1px solid #2563eb;
        color: #2563eb;
        padding: 4px 12px;
        border-radius: 14px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 500;
      }
      .ev-export-btn:hover { background: #eff6ff; }
    `;
    document.head.appendChild(style);
    window[CSS_INJECTED] = true;
  }

  // ============ 核心渲染 ============

  /**
   * 渲染单条 adaptedEntry 的证据包到 container。
   * @param {HTMLElement} container 容器（已有内容会被覆盖）
   * @param {object} adaptedEntry 已通过 EvidenceAdapter.adaptEntry 处理的 entry
   * @param {object} opts { show_caveat, show_blevel, show_export }
   */
  function render(container, adaptedEntry, opts) {
    opts = Object.assign({ show_caveat: true, show_blevel: true, show_export: true }, opts);
    if (!container) return;
    container.innerHTML = '';

    // L3 硬拦截 → 直接显示禁止提示
    if (adaptedEntry && adaptedEntry.l3_blocked) {
      const blocked = document.createElement('div');
      blocked.className = 'ev-l3-blocked';
      blocked.textContent = '此条目被 L3 红线硬拦截，暂不展示';
      container.appendChild(blocked);
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'ev-panel';

    const title = document.createElement('div');
    title.className = 'ev-panel-title';
    title.textContent = '依据来源';
    panel.appendChild(title);

    if (!adaptedEntry || !adaptedEntry.evidence || adaptedEntry.evidence.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ev-empty';
      empty.textContent = '待核验中，依据即将上线';
      panel.appendChild(empty);
      container.appendChild(panel);
      return;
    }

    // 证据列表
    const evList = document.createElement('div');
    evList.className = 'ev-list';
    const flat = Adapter.flattenEvidence(adaptedEntry);

    for (const ev of flat) {
      evList.appendChild(renderEvidenceItem(ev));
    }
    panel.appendChild(evList);

    // B 级标签
    if (opts.show_blevel && adaptedEntry.b_level_tag) {
      const blevel = document.createElement('div');
      blevel.className = 'ev-blevel';
      blevel.textContent = '服务者经验参考，供辅助判断，不作为法定/政策依据';
      panel.appendChild(blevel);
    }

    // Caveat（四要素）
    if (opts.show_caveat && adaptedEntry.caveat && hasAny(adaptedEntry.caveat)) {
      panel.appendChild(renderCaveat(adaptedEntry.caveat));
    }

    // 导出按钮（占位：等 html2canvas 接入）
    if (opts.show_export) {
      const row = document.createElement('div');
      row.className = 'ev-export-row';
      const btn = document.createElement('button');
      btn.className = 'ev-export-btn';
      btn.textContent = '📥 导出依据（图片）';
      btn.disabled = true;
      btn.title = 'W2 上线';
      row.appendChild(btn);
      panel.appendChild(row);
    }

    container.appendChild(panel);
  }

  function renderEvidenceItem(ev) {
    const item = document.createElement('div');
    item.className = 'ev-item ' + (ev.clickable ? 'ev-item-clickable' : 'ev-item-gray');

    const badge = document.createElement('span');
    badge.className = `ev-badge ev-badge-${ev.type}`;
    badge.textContent = ev.type_label;
    item.appendChild(badge);

    const body = document.createElement('div');
    body.className = 'ev-body';

    const title = document.createElement(ev.clickable ? 'a' : 'span');
    title.className = 'ev-title' + (ev.clickable ? ' ev-title-clickable' : '');
    title.textContent = ev.title;
    if (ev.clickable) {
      title.href = ev.url;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
    }
    body.appendChild(title);

    const source = document.createElement('div');
    source.className = 'ev-source';

    const srcName = document.createElement('span');
    srcName.className = 'ev-source-item';
    srcName.textContent = ev.source_name;
    source.appendChild(srcName);

    const auth = document.createElement('span');
    auth.className = 'ev-source-item ev-authority';
    auth.style.color = ev.authority_color;
    auth.textContent = `[${ev.authority_label}]`;
    source.appendChild(auth);

    if (ev.verified_date) {
      const vd = document.createElement('span');
      vd.className = 'ev-source-item';
      vd.textContent = `核验 ${ev.verified_date}`;
      source.appendChild(vd);
    }

    body.appendChild(source);
    item.appendChild(body);

    if (!ev.clickable) {
      const pending = document.createElement('div');
      pending.className = 'ev-pending';
      pending.textContent = '链接待补';
      body.appendChild(pending);
    }

    return item;
  }

  function renderCaveat(c) {
    const box = document.createElement('div');
    box.className = 'ev-caveat';

    const title = document.createElement('div');
    title.className = 'ev-caveat-title';
    title.textContent = '使用边界';
    box.appendChild(title);

    if (c.advantage) addRow(box, '优势', c.advantage);
    if (c.risk)      addRow(box, '风险', c.risk, 'ev-caveat-risk');
    if (c.scope)     addRow(box, '适用范围', c.scope);
    if (c.no_commit) addRow(box, '不承诺', c.no_commit, 'ev-caveat-no');

    return box;
  }

  function addRow(box, label, value, cls) {
    const row = document.createElement('div');
    row.className = 'ev-caveat-row ' + (cls || '');
    row.innerHTML = `<span class="ev-caveat-label">${label}：</span>${value}`;
    box.appendChild(row);
  }

  function hasAny(c) {
    return ['advantage', 'risk', 'scope', 'no_commit'].some(k => c[k]);
  }

  // ============ 批量 ============

  /**
   * 在一个 container 里批量渲染多条 entry 的证据链。
   */
  function renderAll(container, rawEntries, opts) {
    if (!container) return;
    container.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'font-size:12px;color:#666;font-weight:600;margin-bottom:8px;';
    header.textContent = `📚 共 ${rawEntries.length} 条依据`;
    container.appendChild(header);

    for (const raw of rawEntries) {
      const adapted = Adapter.adaptEntry(raw);
      const box = document.createElement('div');
      // 每条独立 panel
      render(box, adapted, Object.assign({ show_export: false }, opts || {}));
      container.appendChild(box);
    }
  }

  const EvidenceLink = { render, renderAll, CONSTANTS: Adapter.CONSTANTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceLink;
  } else {
    global.EvidenceLink = EvidenceLink;
  }
})(typeof window !== 'undefined' ? window : globalThis);
