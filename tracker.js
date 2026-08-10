(function () {
  'use strict';

  var STORAGE_UID = 'fs_uid';
  var STORAGE_SOURCE = 'fs_source';
  var STORAGE_PENDING = 'fs_pending_events';
  var STORAGE_SESSION = 'fs_session';
  var STORAGE_VISIT = 'fs_visit_count';
  var STORAGE_FIRST_VISIT = 'fs_first_visit';
  var ENDPOINT = '/api/event';
  var MAX_PENDING = 100;
  var HEARTBEAT_INTERVAL = 30000; // 30s heartbeat
  var SCROLL_DEPTHS = [25, 50, 75, 90, 100];
  var _sessionId = null;
  var _sessionStart = Date.now();
  var _pageStart = Date.now();
  var _accumulatedTime = 0;
  var _lastActive = Date.now();
  var _heartbeatTimer = null;
  var _scrollDepthsReported = {};
  var _pageProduct = null;

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

  function getVisitCount() {
    try {
      var count = parseInt(localStorage.getItem(STORAGE_VISIT) || '0', 10);
      return count;
    } catch (e) { return 0; }
  }

  function incrementVisitCount() {
    try {
      var count = getVisitCount();
      count++;
      localStorage.setItem(STORAGE_VISIT, String(count));
      return count;
    } catch (e) { return 1; }
  }

  function getFirstVisit() {
    try {
      var ts = localStorage.getItem(STORAGE_FIRST_VISIT);
      if (!ts) {
        ts = String(Date.now());
        localStorage.setItem(STORAGE_FIRST_VISIT, ts);
      }
      return parseInt(ts, 10);
    } catch (e) { return Date.now(); }
  }

  function getOrCreateSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_SESSION);
      if (raw) {
        var s = JSON.parse(raw);
        s.heartbeat_ts = Date.now();
        sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(s));
        _sessionId = s.id;
        _sessionStart = s.start_ts;
        return s;
      }
    } catch (e) {}
    // Create new session
    var session = {
      id: genUid(),
      start_ts: Date.now(),
      page_count: 1,
      heartbeat_ts: Date.now()
    };
    try {
      sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
    } catch (e) {}
    _sessionId = session.id;
    _sessionStart = session.start_ts;
    return session;
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_SESSION);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function updateSessionPageCount() {
    try {
      var s = getSession();
      if (s) {
        s.page_count = (s.page_count || 0) + 1;
        s.heartbeat_ts = Date.now();
        sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(s));
      }
    } catch (e) {}
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

  function detectProduct() {
    if (_pageProduct) return _pageProduct;
    try {
      var path = window.location.pathname;
      if (path === '/' || path === '') return 'home';
      var parts = path.split('/').filter(Boolean);
      if (parts.length > 0) return parts[0];
    } catch (e) {}
    return 'unknown';
  }

  function buildPayload(type, data) {
    var source = getSource();
    var session = getSession();
    return {
      type: type,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      uid: getUid(),
      session_id: _sessionId || (session ? session.id : null),
      session_start: _sessionStart,
      visit_count: getVisitCount(),
      product: detectProduct(),
      source: source,
      ts: Date.now(),
      ua: navigator.userAgent,
      screen: (window.screen ? window.screen.width + 'x' + window.screen.height : null),
      vp: (window.innerWidth + 'x' + window.innerHeight),
      locale: (navigator.language || null),
      time_on_page_ms: Date.now() - _pageStart,
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

  // ===== Public API =====
  window.fsTrack = function fsTrack(name, data) {
    try {
      queue(buildPayload(name || 'event', data || {}));
    } catch (e) {}
  };

  // ===== Click Tracking =====
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

  // ===== Scroll Depth Tracking =====
  function setupScrollTracking() {
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          checkScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function checkScrollDepth() {
    try {
      var docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      var winHeight = window.innerHeight;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var scrollPercent = Math.min(100, Math.round((scrollTop + winHeight) / docHeight * 100));

      for (var i = 0; i < SCROLL_DEPTHS.length; i++) {
        var depth = SCROLL_DEPTHS[i];
        if (scrollPercent >= depth && !_scrollDepthsReported[depth]) {
          _scrollDepthsReported[depth] = true;
          queue(buildPayload('scroll_depth', { depth: depth, scroll_pct: scrollPercent }));
        }
      }
    } catch (e) {}
  }

  // ===== Time-on-Page / Heartbeat =====
  function setupHeartbeat() {
    function beat() {
      var elapsed = Date.now() - _pageStart;
      queue(buildPayload('heartbeat', {
        elapsed_ms: elapsed,
        elapsed_sec: Math.round(elapsed / 1000)
      }));
    }
    _heartbeatTimer = setInterval(beat, HEARTBEAT_INTERVAL);
  }

  function trackPageLeave() {
    var elapsed = Date.now() - _pageStart;
    queue(buildPayload('page_leave', {
      elapsed_ms: elapsed,
      elapsed_sec: Math.round(elapsed / 1000),
      scroll_depths: Object.keys(_scrollDepthsReported).map(Number)
    }));
    flushPending();
  }

  // ===== Visibility Tracking (tab focus/blur) =====
  function setupVisibilityTracking() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // Tab hidden — record accumulated time
        _accumulatedTime += Date.now() - _lastActive;
        queue(buildPayload('visibility_hidden', {
          accumulated_ms: _accumulatedTime,
          accumulated_sec: Math.round(_accumulatedTime / 1000)
        }));
      } else {
        // Tab visible again
        _lastActive = Date.now();
        queue(buildPayload('visibility_visible', {
          accumulated_ms: _accumulatedTime,
          accumulated_sec: Math.round(_accumulatedTime / 1000)
        }));
      }
    });
  }

  // ===== Session End Tracking =====
  function trackSessionEnd() {
    var sessionDuration = Date.now() - _sessionStart;
    var pageDuration = Date.now() - _pageStart;
    var session = getSession();
    queue(buildPayload('session_end', {
      session_id: _sessionId,
      session_duration_ms: sessionDuration,
      session_duration_sec: Math.round(sessionDuration / 1000),
      page_duration_ms: pageDuration,
      page_duration_sec: Math.round(pageDuration / 1000),
      pages_in_session: session ? session.page_count : 1,
      scroll_depths: Object.keys(_scrollDepthsReported).map(Number)
    }));
    flushPending();
  }

  // ===== Feature-Specific Tracking =====
  function setupFeatureTracking() {
    // Search events
    document.addEventListener('click', function (e) {
      var target = e.target;
      // Search button or search submit
      if (target && (target.id === 'searchBtn' || target.closest('#searchBtn'))) {
        var input = document.getElementById('keywordInput') || document.getElementById('searchInput');
        var keyword = input ? input.value.trim() : '';
        queue(buildPayload('search', { keyword: keyword.slice(0, 100), source: 'search_button' }));
      }
      // Export button
      if (target && (target.id === 'exportBtn' || target.closest('#exportBtn'))) {
        queue(buildPayload('export', { source: 'export_button' }));
      }
      // Filter toggle
      if (target && (target.id === 'filterToggle' || target.closest('#filterToggle'))) {
        var isOpen = target.closest('#filterToggle');
        if (isOpen) {
          queue(buildPayload('filter_toggle', { action: isOpen.classList.contains('open') ? 'close' : 'open' }));
        }
      }
      // Filter chip
      var chip = target.closest('.filter-chip');
      if (chip) {
        queue(buildPayload('filter_select', {
          label: (chip.textContent || '').trim().slice(0, 50),
          active: chip.classList.contains('active')
        }));
      }
      // Scene tab
      var tab = target.closest('.scene-tab');
      if (tab) {
        queue(buildPayload('scene_tab', {
          scene: tab.getAttribute('data-scene') || '',
          label: (tab.textContent || '').trim().slice(0, 50)
        }));
      }
      // Active filter removal
      var removeBtn = target.closest('.af-remove');
      if (removeBtn) {
        queue(buildPayload('filter_remove', {
          label: (removeBtn.getAttribute('data-label') || '').slice(0, 50)
        }));
      }
      // Pagination
      var pageBtn = target.closest('.page-btn');
      if (pageBtn && !pageBtn.disabled) {
        queue(buildPayload('pagination', {
          page: pageBtn.textContent.trim(),
          action: pageBtn.classList.contains('active') ? 'current' : 'navigate'
        }));
      }
    }, true);

    // Form submissions
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form) return;
      if (form.id === 'reply-form') {
        var feedback = '';
        try { feedback = (form.querySelector('[name="feedback"]') || {}).value || ''; } catch (e) {}
        queue(buildPayload('reply_submit', {
          length: feedback.length,
          has_content: !!feedback.trim()
        }));
      }
      if (form.id === 'feedback-form') {
        var fbContent = '';
        var fbRating = null;
        try {
          fbContent = (form.querySelector('[name="content"]') || {}).value || '';
          fbRating = (form.querySelector('[name="rating"]') || {}).value || null;
        } catch (e) {}
        queue(buildPayload('feedback_submit', {
          length: fbContent.length,
          has_content: !!fbContent.trim(),
          rating: fbRating ? parseInt(fbRating, 10) : null
        }));
      }
    }, true);
  }

  // ===== Feedback Widget =====
  function setupFeedbackWidget() {
    // Check if feedback widget container already exists
    if (document.getElementById('fs-feedback-widget')) return;
    var container = document.createElement('div');
    container.id = 'fs-feedback-widget';
    container.setAttribute('aria-label', '使用反馈');
    container.innerHTML =
      '<button id="fs-feedback-btn" aria-label="反馈" title="反馈使用体验" style="position:fixed;bottom:80px;right:16px;z-index:9999;width:44px;height:44px;border-radius:50%;background:#3d5a3e;color:white;border:none;font-size:18px;cursor:pointer;box-shadow:0 2px 12px rgba(61,90,62,0.25);transition:all .2s;display:flex;align-items:center;justify-content:center" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">💬</button>' +
      '<div id="fs-feedback-panel" style="display:none;position:fixed;bottom:132px;right:16px;z-index:9999;width:320px;max-height:400px;background:white;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.15);border:1px solid rgba(61,90,62,0.12);overflow:hidden;font-family:-apple-system,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;font-size:13px;color:#1a2b26">' +
        '<div style="padding:14px 16px;background:#3d5a3e;color:white;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center">' +
          '<span>💬 使用反馈</span>' +
          '<button id="fs-feedback-close" style="background:none;border:none;color:rgba(255,255,255,0.8);font-size:18px;cursor:pointer;padding:0;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:12px 16px">' +
          '<p style="font-size:12px;color:#5a6b65;margin:0 0 10px 0;line-height:1.5">请告诉我们您的使用体验，帮助我们持续改进</p>' +
          '<div style="margin-bottom:10px">' +
            '<div style="font-size:11px;color:#5a6b65;margin-bottom:4px">评分</div>' +
            '<div id="fs-feedback-stars" style="display:flex;gap:4px">' +
              '<span data-star="1" style="font-size:22px;cursor:pointer;color:#ddd;transition:color .15s">★</span>' +
              '<span data-star="2" style="font-size:22px;cursor:pointer;color:#ddd;transition:color .15s">★</span>' +
              '<span data-star="3" style="font-size:22px;cursor:pointer;color:#ddd;transition:color .15s">★</span>' +
              '<span data-star="4" style="font-size:22px;cursor:pointer;color:#ddd;transition:color .15s">★</span>' +
              '<span data-star="5" style="font-size:22px;cursor:pointer;color:#ddd;transition:color .15s">★</span>' +
            '</div>' +
          '</div>' +
          '<textarea id="fs-feedback-content" placeholder="请描述您的使用体验、遇到的问题或改进建议..." style="width:100%;height:80px;padding:10px;border:1.5px solid rgba(61,90,62,0.12);border-radius:8px;font-size:13px;font-family:inherit;resize:none;outline:none;box-sizing:border-box;color:#1a2b26" onfocus="this.style.borderColor=\'#3d5a3e\'" onblur="this.style.borderColor=\'rgba(61,90,62,0.12)\'"></textarea>' +
          '<div style="display:flex;gap:8px;margin-top:10px">' +
            '<button id="fs-feedback-submit" style="flex:1;padding:10px;border:none;border-radius:8px;background:#3d5a3e;color:white;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s" onmouseover="this.style.background=\'#4a7a4b\'" onmouseout="this.style.background=\'#3d5a3e\'">提交反馈</button>' +
            '<button id="fs-feedback-cancel" style="padding:10px 16px;border:1px solid rgba(61,90,62,0.12);border-radius:8px;background:white;color:#5a6b65;font-size:13px;cursor:pointer">取消</button>' +
          '</div>' +
          '<div id="fs-feedback-thanks" style="display:none;text-align:center;padding:20px 0;color:#3d5a3e;font-weight:600;font-size:14px">✅ 感谢您的反馈！</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(container);

    var btn = document.getElementById('fs-feedback-btn');
    var panel = document.getElementById('fs-feedback-panel');
    var closeBtn = document.getElementById('fs-feedback-close');
    var submitBtn = document.getElementById('fs-feedback-submit');
    var cancelBtn = document.getElementById('fs-feedback-cancel');
    var content = document.getElementById('fs-feedback-content');
    var stars = document.querySelectorAll('#fs-feedback-stars span');
    var thanks = document.getElementById('fs-feedback-thanks');
    var selectedRating = 0;

    function openPanel() {
      panel.style.display = 'block';
      queue(buildPayload('feedback_panel_open', {}));
    }

    function closePanel() {
      panel.style.display = 'none';
      content.value = '';
      selectedRating = 0;
      stars.forEach(function (s) { s.style.color = '#ddd'; });
      thanks.style.display = 'none';
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.style.display === 'block') { closePanel(); return; }
      openPanel();
    });
    closeBtn.addEventListener('click', closePanel);
    cancelBtn.addEventListener('click', closePanel);

    // Star rating
    stars.forEach(function (s) {
      s.addEventListener('click', function () {
        selectedRating = parseInt(s.getAttribute('data-star'), 10);
        stars.forEach(function (ss) {
          var starVal = parseInt(ss.getAttribute('data-star'), 10);
          ss.style.color = starVal <= selectedRating ? '#f59e0b' : '#ddd';
        });
      });
      s.addEventListener('mouseenter', function () {
        var hoverVal = parseInt(s.getAttribute('data-star'), 10);
        stars.forEach(function (ss) {
          var starVal = parseInt(ss.getAttribute('data-star'), 10);
          ss.style.color = starVal <= hoverVal ? '#fbbf24' : '#ddd';
        });
      });
      s.addEventListener('mouseleave', function () {
        stars.forEach(function (ss) {
          var starVal = parseInt(ss.getAttribute('data-star'), 10);
          ss.style.color = starVal <= selectedRating ? '#f59e0b' : '#ddd';
        });
      });
    });

    submitBtn.addEventListener('click', function () {
      var text = content.value.trim();
      if (!text && selectedRating === 0) {
        content.style.borderColor = '#ef4444';
        content.placeholder = '请填写反馈内容或选择评分...';
        return;
      }
      queue(buildPayload('feedback_submit', {
        content: text.slice(0, 2000),
        rating: selectedRating || null,
        product: detectProduct()
      }));
      flushPending();
      // Show thanks
      document.querySelector('#fs-feedback-panel > div > div').style.display = 'none';
      thanks.style.display = 'block';
      setTimeout(function () {
        closePanel();
        document.querySelector('#fs-feedback-panel > div > div').style.display = '';
        thanks.style.display = 'none';
      }, 2000);
    });

    // Click outside to close
    document.addEventListener('click', function (e) {
      if (panel.style.display === 'block' && !container.contains(e.target)) {
        closePanel();
      }
    });
  }

  // ===== Init =====
  function init() {
    var session = getOrCreateSession();
    readSource();
    var visitCount = incrementVisitCount();
    var firstVisit = getFirstVisit();
    _pageProduct = detectProduct();

    // Page view with visit context
    queue(buildPayload('pageview', {
      session_id: session.id,
      session_page_count: session.page_count,
      visit_count: visitCount,
      days_since_first_visit: Math.floor((Date.now() - firstVisit) / 86400000),
      is_return_visitor: visitCount > 1
    }));

    setupAutoClick();
    setupScrollTracking();
    setupHeartbeat();
    setupVisibilityTracking();
    setupFeatureTracking();
    setupFeedbackWidget();
    flushPending();

    // Page leave
    window.addEventListener('beforeunload', trackPageLeave);
    window.addEventListener('pagehide', trackPageLeave);

    // Session end
    window.addEventListener('beforeunload', trackSessionEnd);
    window.addEventListener('pagehide', function () {
      trackSessionEnd();
    });

    // Online flush
    window.addEventListener('online', flushPending);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();