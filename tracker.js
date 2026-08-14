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

  function buildPayload(type, data) {
    var source = getSource();
    var path = window.location.pathname || '/';
    return {
      type: type,
      url: window.location.href,
      page: path,
      product: (path.charAt(0) === '/' ? path.slice(1) : path).replace(/\//g, '-') || 'home',
      title: document.title,
      referrer: document.referrer,
      uid: getUid(),
      source: source,
      ts: Date.now(),
      ua: navigator.userAgent,
      screen: (window.screen ? window.screen.width + 'x' + window.screen.height : null),
      vp: (window.innerWidth + 'x' + window.innerHeight),
      locale: (navigator.language || null),
      data: data || {}
    };
  }

  var RETRY_MAX = 3;
  var RETRY_BACKOFF = 1000;

  function trySend(list, retryCount) {
    if (!list || !list.length) return;
    if (!navigator.onLine) return;
    retryCount = retryCount || 0;
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
          var sentKeys = {};
          for (var si = 0; si < snapshot.length; si++) {
            sentKeys[hashEvent(snapshot[si])] = true;
          }
          for (var i = 0; i < current.length; i++) {
            if (!sentKeys[hashEvent(current[i])]) remaining.push(current[i]);
          }
          setPending(remaining);
        } else if (retryCount < RETRY_MAX) {
          setTimeout(function () {
            trySend(list, retryCount + 1);
          }, RETRY_BACKOFF * (retryCount + 1));
        }
      };
      xhr.onerror = function () {
        if (retryCount < RETRY_MAX) {
          setTimeout(function () {
            trySend(list, retryCount + 1);
          }, RETRY_BACKOFF * (retryCount + 1));
        }
      };
      xhr.send(body);
    } catch (e) {
      if (retryCount < RETRY_MAX) {
        setTimeout(function () {
          trySend(list, retryCount + 1);
        }, RETRY_BACKOFF * (retryCount + 1));
      }
    }
  }

  function hashEvent(evt) {
    try {
      var h = 0;
      var s = JSON.stringify(evt);
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        h = ((h << 5) - h) + c;
        h = h & h;
      }
      return 'h' + h;
    } catch (e) {
      return 'h0';
    }
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
      var chatFab = document.getElementById('chatFab');
      if (chatFab) {
        chatFab.addEventListener('click', function () {
          queue(buildPayload('coze_chat_open', {
            source: window.location.pathname,
            page_title: document.title
          }));
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

  function setupSendBeacon() {
    try {
      window.addEventListener('beforeunload', function () {
        var pending = getPending();
        if (pending.length && navigator.sendBeacon) {
          var blob = new Blob([JSON.stringify(pending)], { type: 'application/json' });
          navigator.sendBeacon(ENDPOINT, blob);
          setPending([]);
        }
      });
    } catch (e) {}
  }

  function setupScrollDepth() {
    try {
      var depths = [25, 50, 75, 100];
      var reported = {};
      var scrollHandler = function () {
        var scrollTop = window.scrollY || window.pageYOffset || 0;
        var docHeight = Math.max(
          document.body.scrollHeight, document.documentElement.scrollHeight,
          document.body.offsetHeight, document.documentElement.offsetHeight,
          document.body.clientHeight, document.documentElement.clientHeight
        );
        var winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        if (docHeight <= winHeight) return;
        var pct = Math.round((scrollTop + winHeight) / docHeight * 100);
        for (var i = 0; i < depths.length; i++) {
          var d = depths[i];
          if (pct >= d && !reported[d]) {
            reported[d] = true;
            queue(buildPayload('scroll_depth', { depth: d }));
          }
        }
      };
      window.addEventListener('scroll', throttle(scrollHandler, 500));
    } catch (e) {}
  }

  function throttle(fn, wait) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn();
      }
    };
  }

  function init() {
    readSource();
    queue(buildPayload('pageview', {}));
    setupAutoClick();
    setupCozeBot();
    setupReplyForm();
    setupSendBeacon();
    setupScrollDepth();
    flushPending();
    window.addEventListener('online', flushPending);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();