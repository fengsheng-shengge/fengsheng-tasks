/**
 * 风声全局引导横幅组件
 * 每个子页面首次访问时，显示一条可关闭的引导提示
 * 关闭后记录 localStorage，不再显示
 *
 * 用法：FSNavGuide.show('knowledge', '知识库', '你可以在这里搜索专业词条...')
 * Version: 1.0.0
 */
;(function() {
  'use strict'

  var GUIDE_KEY = 'fs_guide_closed'

  function getClosed() {
    try { return JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}') } catch(e) { return {} }
  }

  function setClosed(pageId) {
    var closed = getClosed()
    closed[pageId] = true
    localStorage.setItem(GUIDE_KEY, JSON.stringify(closed))
  }

  function show(pageId, title, message) {
    var closed = getClosed()
    if (closed[pageId]) return

    var banner = document.createElement('div')
    banner.id = 'fs-guide-banner'
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(44,95,58,.06);border-bottom:1px solid rgba(44,95,58,.1);font-size:13px;color:#3d5a3e;line-height:1.5;position:sticky;top:56px;z-index:999'
    banner.innerHTML = '<span style="font-size:16px;flex-shrink:0">ℹ️</span>'
      + '<span style="flex:1"><strong>' + title + '</strong> · ' + message + '</span>'
      + '<button onclick="this.parentElement.remove();FSNavGuide._close(\'' + pageId + '\')" style="background:none;border:none;font-size:18px;cursor:pointer;color:rgba(44,95,58,.5);padding:0 4px;line-height:1;flex-shrink:0">×</button>'

    var navRoot = document.getElementById('fs-nav-root')
    if (navRoot && navRoot.nextSibling) {
      navRoot.parentNode.insertBefore(banner, navRoot.nextSibling)
    } else {
      document.body.insertBefore(banner, document.body.firstChild)
    }
  }

  window.FSNavGuide = {
    show: show,
    _close: setClosed
  }
})()