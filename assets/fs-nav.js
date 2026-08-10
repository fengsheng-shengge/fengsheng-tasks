/**
 * 风声 (FengSheng) 统一导航栏组件
 * Pure vanilla JS, no dependencies, IIFE pattern
 * API: FSNav.init(title) — injects fixed/sticky nav bar with the given title
 * Style: 墨绿 #3d5a3e, warm tones, matches index.html
 *
 * Version: v1.0.0
 * Last updated: 2026-06-19
 */
;(function () {
  'use strict'

  var ID_PREFIX = 'fs-nav'
  var INJECTED = false

  /**
   * Inject the inline CSS stylesheet for the navigation bar.
   * All styles are self-contained and scoped under the #fs-nav-root ID.
   */
  function injectStyles() {
    if (INJECTED) return
    INJECTED = true

    var css = ''
      /* ===== Layout & Reset ===== */
      + '#' + ID_PREFIX + '-root,'
      + '#' + ID_PREFIX + '-root *{margin:0;padding:0;box-sizing:border-box}'
      + '#' + ID_PREFIX + '-root{'
      +   'position:sticky;top:0;left:0;right:0;z-index:1000;'
      +   'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;'
      +   '-webkit-font-smoothing:antialiased;'
      + '}'

      /* ===== Nav Bar ===== */
      + '#' + ID_PREFIX + '-bar{'
      +   'display:flex;align-items:center;justify-content:space-between;'
      +   'height:56px;padding:0 20px;'
      +   'background:linear-gradient(135deg,#3d5a3e 0%,#2c4430 100%);'
      +   'color:#fff;'
      +   'box-shadow:0 2px 12px rgba(44,68,48,.25);'
      +   'border-bottom:1px solid rgba(255,255,255,.08);'
      + '}'

      /* ===== Left: Logo ===== */
      + '#' + ID_PREFIX + '-left{'
      +   'display:flex;align-items:center;flex-shrink:0;'
      + '}'
      + '#' + ID_PREFIX + '-logo{'
      +   'display:inline-flex;align-items:center;gap:6px;'
      +   'font-size:16px;font-weight:700;color:#fff;text-decoration:none;'
      +   'letter-spacing:.5px;'
      +   'transition:opacity .2s;'
      +   '-webkit-tap-highlight-color:transparent;'
      + '}'
      + '#' + ID_PREFIX + '-logo:hover,'
      + '#' + ID_PREFIX + '-logo:active{opacity:.8}'
      + '#' + ID_PREFIX + '-logo-icon{font-size:18px;line-height:1}'

      /* ===== Center: Page Title ===== */
      + '#' + ID_PREFIX + '-center{'
      +   'flex:1;text-align:center;'
      +   'font-size:15px;font-weight:600;color:#fff;'
      +   'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
      +   'padding:0 12px;'
      +   'letter-spacing:.5px;'
      + '}'

      /* ===== Right: Back Link ===== */
      + '#' + ID_PREFIX + '-right{'
      +   'display:flex;align-items:center;flex-shrink:0;'
      + '}'
      + '#' + ID_PREFIX + '-back{'
      +   'display:inline-flex;align-items:center;gap:4px;'
      +   'padding:6px 14px;'
      +   'border-radius:6px;'
      +   'font-size:13px;font-weight:600;color:#fff;text-decoration:none;'
      +   'background:rgba(255,255,255,.12);'
      +   'border:1px solid rgba(255,255,255,.15);'
      +   'transition:all .2s;'
      +   'white-space:nowrap;'
      +   '-webkit-tap-highlight-color:transparent;'
      + '}'
      + '#' + ID_PREFIX + '-back:hover,'
      + '#' + ID_PREFIX + '-back:active{'
      +   'background:rgba(255,255,255,.2);'
      +   'border-color:rgba(255,255,255,.3);'
      + '}'
      + '#' + ID_PREFIX + '-back-arrow{font-size:15px;line-height:1}'
      + '#' + ID_PREFIX + '-back-text{font-size:13px}'

      /* ===== Responsive: Mobile (<= 640px) ===== */
      + '@media (max-width:640px){'
      +   '#' + ID_PREFIX + '-bar{padding:0 12px;height:52px}'
      +   '#' + ID_PREFIX + '-logo{font-size:14px}'
      +   '#' + ID_PREFIX + '-center{font-size:13px;padding:0 8px}'
      +   '#' + ID_PREFIX + '-back{padding:6px 10px}'
      +   '#' + ID_PREFIX + '-back-text{display:none}'
      +   '#' + ID_PREFIX + '-back-arrow{font-size:16px}'
      + '}'

    var style = document.createElement('style')
    style.id = ID_PREFIX + '-style'
    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * Build the navigation bar DOM structure and inject it at the top of <body>.
   * @param {string} title — The page title to display in the center.
   */
  function injectNav(title) {
    // Remove any previously injected nav to avoid duplicates
    var existing = document.getElementById(ID_PREFIX + '-root')
    if (existing) {
      existing.parentNode.removeChild(existing)
    }

    var safeTitle = (title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    var root = document.createElement('div')
    root.id = ID_PREFIX + '-root'

    root.innerHTML =
      '<div id="' + ID_PREFIX + '-bar">' +
        '<div id="' + ID_PREFIX + '-left">' +
          '<a id="' + ID_PREFIX + '-logo" href="/">' +
            '<span id="' + ID_PREFIX + '-logo-icon">&#127787;&#65039;</span>' +
            '<span>风声</span>' +
          '</a>' +
        '</div>' +
        '<div id="' + ID_PREFIX + '-center">' + safeTitle + '</div>' +
        '<div id="' + ID_PREFIX + '-right">' +
          '<a id="' + ID_PREFIX + '-back" href="/">' +
            '<span id="' + ID_PREFIX + '-back-arrow">&larr;</span>' +
            '<span id="' + ID_PREFIX + '-back-text">返回首页</span>' +
          '</a>' +
        '</div>' +
      '</div>'

    // Insert at the very beginning of <body>
    var body = document.body
    if (body.firstChild) {
      body.insertBefore(root, body.firstChild)
    } else {
      body.appendChild(root)
    }
  }

  /**
   * Public API: Initialize the navigation bar.
   * @param {string} title — The page title to display in the center of the nav bar.
   */
  function init(title) {
    injectStyles()
    injectNav(title)
  }

  // ---- Expose to window ----
  window.FSNav = {
    init: init
  }
})()