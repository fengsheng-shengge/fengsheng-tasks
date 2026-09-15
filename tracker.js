(function () {
  'use strict';

  var STORAGE_UID = 'fs_uid';
  var STORAGE_SOURCE = 'fs_source';
  var STORAGE_PENDING = 'fs_pending_events';
  var ENDPOINT = '/api/event';
  var MAX_PENDING = 100;

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
      return 'anon-' + genUid();
    }
  }

  function readSource() {
    try {
      var existing = sessionStorage.getItem(STORAGE_SOURCE);
      if (existing) return JSON.parse(existing);
    } catch (e) {}

    var source = {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      ref: null,
      source: null,
      raw: null
    };

    try {
      var params = new URLSearchParams(window.location.search);
      source.utm_source = params.get('utm_source');
      source.utm_medium = params.get('utm_medium');
      source.utm_campaign = params.get('utm_campaign');
      source.ref = params.get('ref');
      source.source = params.get('source');

      if (!source.ref && document.referrer) {
        try {
          var host = new URL(document.referrer).hostname;
          if (host && host.indexOf(window.location.hostname) === -1) {
            source.ref = host;
          }
        } catch (e) {}
      }
      source.raw = window.location.search || null;

      if (source.utm_source || source.utm_medium || source.utm_campaign || source.ref || source.source) {
        try { sessionStorage.setItem(STORAGE_SOURCE, JSON.stringify(source)); } catch (e) {}
      }
    } catch (e) {}

    return source;
  }

  function getSource() {
    try {
      var s = sessionStorage.getItem(STORAGE_SOURCE);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return readSource();
  }

  function getPending() {
    try {
      var raw = localStorage.getItem(STORAGE_PENDING);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setPending(list) {
    try {
      if (list.length > MAX_PENDING) list = list.slice(list.length - MAX_PENDING);
      localStorage.setItem(STORAGE_PENDING, JSON.stringify(list));
    } catch (e) {}
  }

  function deriveProduct() {
    var path = window.location.pathname;
    // 根目录HTML文件映射
    var fileMap = {
      '/': 'index',
      '/index.html': 'index',
      '/breeder.html': 'breeder',
      '/assessment.html': 'assessment',
      '/knowledge.html': 'knowledge',
      '/shuowenjiedao.html': 'shuowenjiedao',
      '/about.html': 'about',
      '/course.html': 'course',
      '/works.html': 'works',
      '/partner.html': 'partner',
      '/skills.html': 'skills',
      '/standard.html': 'standard',
      '/okr.html': 'okr',
      '/agent-academy.html': 'agent-academy'
    };
    if (fileMap[path] !== undefined) return fileMap[path];
    // 子目录路径
    var m = path.match(/^\/([a-z0-9-]+)/);
    if (!m) return 'other';
    var whitelist = {
      'quality-test':1,'reply':1,'assessment':1,'breeder':1,
      'knowledge':1,'care-test':1,'s1-report':1,'dashboard':1,
      'shuowenjiedao':1,'goals':1,'about':1
    };
    return whitelist[m[1]] ? m[1] : 'other';
  }

  function buildPayload(type, data) {
    var source = getSource();
    return {
      type: type,
      event_type: type,       // v2.2: 兼容后端event_type字段
      url: window.location.href,
      page: window.location.pathname,  // v2.2: 显式传page字段
      product: deriveProduct(),         // v2.2: 显式传product字段
      title: document.title,
      referrer: document.referrer,
      uid: getUid(),
      utm_source: source.utm_source || null,    // v2.2: 扁平化utm字段
      utm_medium: source.utm_medium || null,
      utm_campaign: source.utm_campaign || null,
      ref: source.ref || null,
      source: source,
      ts: Date.now(),
      ua: navigator.userAgent,
      screen: (window.screen ? window.screen.width + 'x' + window.screen.height : null),
      vp: (window.innerWidth + 'x' + window.innerHeight),
      locale: (navigator.language || null),
      data: data || {}
    };
  }

  function trySend(list) {
    if (!list || !list.length) return;
    if (!navigator.onLine) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', ENDPOINT, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 5000;
      var snapshot = list.slice();
      var body = JSON.stringify(snapshot);

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          var current = getPending();
          var remaining = [];
          var sSent = JSON.stringify(snapshot);
          for (var i = 0; i < current.length; i++) {
            var s = JSON.stringify(current[i]);
            if (sSent.indexOf(s) === -1) remaining.push(current[i]);
          }
          setPending(remaining);
        }
      };
      xhr.onerror = function () {};
      xhr.send(body);
    } catch (e) {}
  }

  function queue(event) {
    var list = getPending();
    list.push(event);
    setPending(list);
    try {
      setTimeout(function () { trySend(list); }, 0);
    } catch (e) {}
  }

  function flushPending() {
    trySend(getPending());
  }

  window.fsTrack = function fsTrack(name, data) {
    try {
      queue(buildPayload(name || 'event', data || {}));
    } catch (e) {}
  };

  // v3.0: 测评完成率追踪
  window.fsTrackStart = function fsTrackStart(stepName) {
    try {
      queue(buildPayload('funnel_start', { step: stepName || 'default', product: deriveProduct() }));
    } catch (e) {}
  };
  window.fsTrackComplete = function fsTrackComplete(stepName) {
    try {
      queue(buildPayload('funnel_complete', { step: stepName || 'default', product: deriveProduct() }));
    } catch (e) {}
  };

  function trackClick(el) {
    if (!el) return;
    var label = el.getAttribute('aria-label') || el.getAttribute('data-track') || el.textContent || el.name || '';
    label = (label || '').toString().trim().slice(0, 100);
    var role = el.getAttribute('data-role') || el.tagName.toLowerCase();
    var href = el.getAttribute('href') || '';
    queue(buildPayload('click', {
      label: label,
      role: role,
      href: href ? href.slice(0, 200) : null
    }));
  }

  function setupAutoClick() {
    document.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el !== document) {
        if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('data-track') || el.hasAttribute('role')) {
          trackClick(el);
          return;
        }
        el = el.parentElement;
      }
    }, true);
  }

  function setupCozeBot() {
    try {
      var chatBox = document.getElementById('coze-chat');
      if (chatBox) {
        chatBox.addEventListener('click', function () {
          queue(buildPayload('coze_chat_open', {}));
        });
      }
    } catch (e) {}
  }

  function setupReplyForm() {
    try {
      var form = document.getElementById('reply-form');
      if (!form) return;
      form.addEventListener('submit', function () {
        var feedback = '';
        try { feedback = (form.querySelector('[name="feedback"]') || {}).value || ''; } catch (e) {}
        queue(buildPayload('reply_submit', {
          length: feedback.length,
          has_content: !!feedback.trim()
        }));
      });
    } catch (e) {}
  }

  function init() {
    readSource();
    queue(buildPayload('pageview', {}));
    setupAutoClick();
    setupCozeBot();
    setupReplyForm();
    // removed: queue() already schedules send via setTimeout, flushPending() caused duplicate events
    window.addEventListener('online', flushPending);
    // v3.0: 停留时长追踪
    var _fsEnterTime = Date.now();
    var _fsDurationReported = false;
    function reportDuration() {
      if (_fsDurationReported) return;
      _fsDurationReported = true;
      var dur = Math.round((Date.now() - _fsEnterTime) / 1000);
      queue(buildPayload('duration', {
        seconds: dur,
        product: deriveProduct()
      }));
    }
    // 页面离开时上报
    window.addEventListener('beforeunload', reportDuration);
    // 页面切到后台时上报（移动端友好）
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') reportDuration();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
