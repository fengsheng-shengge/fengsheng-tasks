// ============================================================
// tracker.js v2.0 · 风声埋点 SDK
// 对应作战方案 v1.2 · 110人验证线
// 小扣子（技术侧）
//
// 功能：
//   - 自动识别产品（根据 URL path）
//   - 自动上报 pageview（sendBeacon 优先，XHR 兜底）
//   - 滚动深度追踪（25%/50%/75%/100%）
//   - 点击事件追踪（data-fs-track 属性）
//   - utm_source/medium/campaign/ref 来源归因
//   - 离线队列 + 恢复后补发
//   - 暴露 window.fsTrack / fsGetUid / fsSetProduct
// ============================================================
(function () {
  'use strict';

  var STORAGE_UID = 'fs_uid';
  var STORAGE_SOURCE = 'fs_source';
  var STORAGE_PENDING = 'fs_pending_events';
  var ENDPOINT = '/api/event';
  var MAX_PENDING = 100;
  var BATCH_SIZE = 10;

  // ---- 产品路径映射 ----
  var PRODUCT_MAP = [
    { rx: /\/breeder/,       name: 'breeder' },
    { rx: /\/knowledge/,     name: 'knowledge' },
    { rx: /\/shuowenjiedao/, name: 'shuowenjiedao' },
    { rx: /\/dashboard/,     name: 'dashboard' },
    { rx: /\/reply/,         name: 'reply' },
    { rx: /\/goals/,         name: 'goals' },
    { rx: /\/assessment/,    name: 'assessment' },
    { rx: /\/care-test/,     name: 'care-test' },
    { rx: /\/quality-test/,  name: 'quality-test' },
    { rx: /\/s1-report/,     name: 's1-report' },
    { rx: /\/about/,         name: 'about' },
    { rx: /\/privacy/,       name: 'privacy' },
    { rx: /\/guide/,         name: 'guide' },
    { rx: /\/index|\/$/,     name: 'index' }
  ];

  var _customProduct = '';

  function detectProduct() {
    if (_customProduct) return _customProduct;
    var path = window.location.pathname;
    for (var i = 0; i < PRODUCT_MAP.length; i++) {
      if (PRODUCT_MAP[i].rx.test(path)) return PRODUCT_MAP[i].name;
    }
    return 'other';
  }

  // ---- UID ----
  function genUid() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var arr = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (var i = 0; i < 8; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    var s = '';
    for (var j = 0; j < 8; j++) s += chars.charAt(arr[j] % chars.length);
    return s;
  }

  function getUid() {
    try {
      var uid = localStorage.getItem(STORAGE_UID);
      if (!uid) {
        uid = genUid();
        localStorage.setItem(STORAGE_UID, uid);
      }
      return uid;
    } catch (e) {
      return genUid();
    }
  }

  // ---- 来源归因 ----
  function parseUtm() {
    try {
      var cached = localStorage.getItem(STORAGE_SOURCE);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    var params = new URLSearchParams(window.location.search);
    var source = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      ref: document.referrer || ''
    };

    if (source.utm_source || source.utm_campaign || source.ref) {
      try { localStorage.setItem(STORAGE_SOURCE, JSON.stringify(source)); } catch (_) {}
    }
    return source;
  }

  var _source = parseUtm();

  // ---- 离线队列 ----
  function getPending() {
    try {
      var raw = localStorage.getItem(STORAGE_PENDING);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function savePending(list) {
    try { localStorage.setItem(STORAGE_PENDING, JSON.stringify(list)); } catch (_) {}
  }

  function enqueue(event) {
    var list = getPending();
    if (list.length >= MAX_PENDING) list.shift();
    list.push(event);
    savePending(list);
  }

  function dequeue(n) {
    var list = getPending();
    if (list.length === 0) return [];
    var batch = list.splice(0, n);
    savePending(list);
    return batch;
  }

  // ---- 发送 ----
  function sendViaBeacon(payload) {
    try {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      return navigator.sendBeacon(ENDPOINT, blob);
    } catch (_) { return false; }
  }

  function sendViaXHR(payload) {
    return new Promise(function (resolve) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) resolve(xhr.status >= 200 && xhr.status < 300);
        };
        xhr.onerror = function () { resolve(false); };
        xhr.timeout = 5000;
        xhr.ontimeout = function () { resolve(false); };
        xhr.send(JSON.stringify(payload));
      } catch (_) { resolve(false); }
    });
  }

  function trySend(events) {
    if (!events || events.length === 0) return;
    var payload = events.length === 1 ? events[0] : events;
    if (!navigator.onLine) {
      events.forEach(function (e) { enqueue(e); });
      return;
    }
    var ok = sendViaBeacon(payload);
    if (!ok) {
      sendViaXHR(payload).then(function (success) {
        if (!success) events.forEach(function (e) { enqueue(e); });
      });
    }
  }

  function flushPending() {
    if (!navigator.onLine) return;
    var batch = dequeue(BATCH_SIZE);
    if (batch.length === 0) return;
    var payload = batch.length === 1 ? batch[0] : batch;
    if (!sendViaBeacon(payload)) {
      sendViaXHR(payload).then(function (success) {
        if (!success) batch.forEach(function (e) { enqueue(e); });
      });
    }
  }

  // ---- 构建事件 ----
  function buildPayload(eventType, data) {
    var product = detectProduct();
    var payload = {
      event_type: eventType,
      uid: getUid(),
      product: product,
      page: window.location.pathname,
      utm_source: _source.utm_source,
      utm_medium: _source.utm_medium,
      utm_campaign: _source.utm_campaign,
      ref: _source.ref,
      data: data || {}
    };
    return payload;
  }

  // ---- 公开 API ----
  function fsTrack(eventType, data) {
    var payload = buildPayload(eventType, data);
    trySend([payload]);
  }

  function fsGetUid() {
    return getUid();
  }

  function fsSetProduct(name) {
    _customProduct = String(name);
  }

  window.fsTrack = fsTrack;
  window.fsGetUid = fsGetUid;
  window.fsSetProduct = fsSetProduct;

  // ---- 自动上报 ----
  // 1) pageview
  var pageSent = false;
  function sendPageview() {
    if (pageSent) return;
    pageSent = true;
    fsTrack('pageview', { title: document.title });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(sendPageview, 1);
  } else {
    document.addEventListener('DOMContentLoaded', sendPageview);
  }

  // 2) 滚动深度（25/50/75/100）
  var scrollFired = {};
  var scrollTicking = false;
  function checkScrollDepth() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return;
    var pct = Math.round((window.scrollY / docH) * 100);
    var levels = [25, 50, 75, 100];
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      if (pct >= lv && !scrollFired[lv]) {
        scrollFired[lv] = true;
        fsTrack('scroll_depth', { depth: lv });
      }
    }
  }

  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        checkScrollDepth();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // 3) data-fs-track 点击
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-fs-track]');
    if (!el) return;
    var name = el.getAttribute('data-fs-track');
    var label = el.getAttribute('data-fs-label') || el.textContent.trim().slice(0, 100);
    fsTrack('click', { name: name, label: label });
  }, true);

  // 4) 回复表单提交
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.closest) return;
    var isReply = form.closest('#reply-form') || form.closest('.reply-form') || form.id === 'reply-form';
    if (isReply) {
      fsTrack('reply_submit', {});
    }
  }, true);

  // 5) Coze 聊天打开
  var cozeObserver = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType === 1) {
          if (node.querySelector && node.querySelector('[class*="coze"]')) {
            fsTrack('coze_chat_open', {});
            cozeObserver.disconnect();
            return;
          }
        }
      }
    }
  });
  cozeObserver.observe(document.body, { childList: true, subtree: true });

  // 6) 离线/在线恢复
  window.addEventListener('online', function () {
    flushPending();
  });

  // 7) 页面离开时 flush pending
  window.addEventListener('beforeunload', function () {
    var batch = dequeue(BATCH_SIZE);
    if (batch.length === 0) return;
    sendViaBeacon(batch);
  });

  // 8) 定期 flush（每 30 秒）
  setInterval(flushPending, 30000);

})();