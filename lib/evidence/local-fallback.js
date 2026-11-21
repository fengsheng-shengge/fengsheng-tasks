// local-fallback.js
// ============================================================
// 通用本地 entries.json 搜索 fallback
// 当 Worker /api/search/v2 /api/entry /api/knowledge-stats
// 在本地预览（pages.dev / localhost / 离线 HTML）不可用时，
// 自动降级到 /data/entries.json 做同等结构的本地搜索。
//
// 暴露全局：window.LocalFallback
//   .searchV2(query, opts)  → { query, results, total, hint }  ← 同 Worker search/v2
//   .searchSuggest(query)    → [{ value, entryType }, ...]      ← 同 Worker search/suggest
//   .getEntry(id)            → entry object 或 null             ← 同 Worker /api/entry
//   .getRelated(id, limit)   → [entry, ...]                     ← 同 Worker /api/entry/related
//   .getStats()              → { total, domains, entryTypes }   ← 同 Worker /api/knowledge-stats
//
// 纯前端零依赖，缓存 entries 到 localStorage 防重复 fetch。
// ============================================================

(function(global) {
  var CACHE_KEY = 'fs_entries_cache';
  var CACHE_TTL = 60 * 60 * 1000; // 1 小时

  var entriesPromise = null;

  function loadEntries() {
    if (entriesPromise) return entriesPromise;
    entriesPromise = new Promise(function(resolve) {
      // 先试 localStorage 缓存
      try {
        var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL) {
          resolve(cached.data);
          return;
        }
      } catch(e) {}

      // 再 fetch entries.json（加 cache-bust）
      fetch('/data/entries.json?t=' + Date.now())
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(data) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({timestamp: Date.now(), data: data})); } catch(e) {}
          resolve(data || []);
        })
        .catch(function() { resolve([]); });
    });
    return entriesPromise;
  }

  // 分词：按中英文边界 + 常见标点
  function tokenize(q) {
    var lower = (q || '').toLowerCase().trim();
    if (!lower) return [];
    // 提取中文词（每个汉字单独算 + 连续英文数字算）
    var tokens = lower.match(/[\u4e00-\u9fa5]+|[a-z0-9]+/g) || [];
    // 2 字以上才算有效关键词（避免单个字噪音）
    return tokens.filter(function(t) { return t.length >= 1; });
  }

  // ========== 主要 API ==========

  // 模拟 GET /api/search/v2?q=xxx[&entryType=XX][&domain=XX][&page=N][&pageSize=N]
  global.LocalFallback = {
    version: '1.0',
    isAvailable: function() { return true; },  // 本地 fallback 永远可用

    searchV2: function(query, opts) {
      opts = opts || {};
      return loadEntries().then(function(all) {
        var q = (query || '').trim();
        if (!q || q.length < 1) {
          return { query: q, results: [], total: 0, hint: '请提供搜索关键词' };
        }

        var qLower = q.toLowerCase();
        var tokens = tokenize(q);
        var entryType = (opts.entryType || '').toUpperCase() || null;
        var domain = (opts.domain || '').trim() || null;
        var page = Math.max(parseInt(opts.page || '1', 10), 1);
        var pageSize = Math.min(Math.max(parseInt(opts.pageSize || '20', 10), 1), 50);

        var scored = [];
        for (var i = 0; i < all.length; i++) {
          var e = all[i];
          if (entryType && e.entryType !== entryType) continue;
          if (domain && e.domain !== domain) continue;

          var name = (e.name || '').toLowerCase();
          var summary = (e.summary || '').toLowerCase();
          var detail = (e.detail || '').toLowerCase();
          var consumerQ = (e.consumerQ || '').toLowerCase();
          var domainF = (e.domain || '').toLowerCase();
          var tagsStr = ((e.tags && typeof e.tags === 'object') ? Object.values(e.tags).join(' ') : (e.tags || '')).toLowerCase();
          var hay = [name, summary, detail, consumerQ, domainF, tagsStr].join(' ');

          var score = 0;
          if (name === qLower) score += 100;
          else if (name.indexOf(qLower) >= 0) score += 50;
          if (consumerQ === qLower) score += 80;
          else if (consumerQ.indexOf(qLower) >= 0) score += 30;
          if (summary.indexOf(qLower) >= 0) score += 25;
          if (detail.indexOf(qLower) >= 0) score += 15;

          // 多关键词加分：每个 token 都命中 +20
          var hitAll = tokens.length > 0 && tokens.every(function(t) { return hay.indexOf(t) >= 0; });
          if (hitAll) score += 20 + tokens.length * 5;

          if (score > 0) scored.push({ e: e, score: score });
        }

        scored.sort(function(a, b) { return b.score - a.score; });
        var total = scored.length;
        var start = (page - 1) * pageSize;
        var results = scored.slice(start, start + pageSize).map(function(x) { return x.e; });

        return { query: q, results: results, total: total, hint: total === 0 ? '没有找到相关条目，试试换个关键词' : null };
      });
    },

    // 模拟 GET /api/search/suggest?q=xxx
    searchSuggest: function(query) {
      return loadEntries().then(function(all) {
        var q = (query || '').toLowerCase().trim();
        if (!q || q.length < 1) return [];
        var matches = [];
        for (var i = 0; i < all.length; i++) {
          var e = all[i];
          var name = (e.name || '').toLowerCase();
          var cq = (e.consumerQ || '').toLowerCase();
          if (name.indexOf(q) >= 0 || cq.indexOf(q) >= 0) {
            matches.push({ value: e.name, entryType: e.entryType || '', id: e.id || '' });
            if (matches.length >= 8) break;
          }
        }
        return matches;
      });
    },

    // 模拟 GET /api/entry?id=XXX
    getEntry: function(id) {
      return loadEntries().then(function(all) {
        for (var i = 0; i < all.length; i++) {
          if (all[i].id === id) return all[i];
        }
        return null;
      });
    },

    // 模拟 GET /api/entry/related?id=XXX&limit=N
    getRelated: function(id, limit) {
      limit = limit || 10;
      return loadEntries().then(function(all) {
        var target = null;
        for (var i = 0; i < all.length; i++) { if (all[i].id === id) { target = all[i]; break; } }
        if (!target) return [];
        // 同 domain 优先 → 同 entryType → 其他
        var sameDomain = [], sameType = [], other = [];
        for (var j = 0; j < all.length; j++) {
          if (all[j].id === id) continue;
          if (all[j].domain === target.domain) sameDomain.push(all[j]);
          else if (all[j].entryType === target.entryType) sameType.push(all[j]);
          else other.push(all[j]);
        }
        return sameDomain.concat(sameType).concat(other).slice(0, limit);
      });
    },

    // 模拟 GET /api/knowledge-stats（返回结构与 Worker 完全一致）
    getStats: function() {
      return loadEntries().then(function(all) {
        var domainCounts = {}, entryTypes = {};
        for (var i = 0; i < all.length; i++) {
          if (all[i].domain) domainCounts[all[i].domain] = (domainCounts[all[i].domain] || 0) + 1;
          if (all[i].entryType) entryTypes[all[i].entryType] = (entryTypes[all[i].entryType] || 0) + 1;
        }
        // Worker 返回: domains: [{domain, count, samples: [...], sample_ids: [...]}]
        var domainList = Object.keys(domainCounts).sort(function(a,b){ return domainCounts[b] - domainCounts[a]; });
        var domains = domainList.map(function(d) {
          var samples = [], sampleIds = [];
          for (var j = 0; j < all.length; j++) {
            if (all[j].domain === d && samples.length < 3) {
              samples.push(all[j].name || all[j].title || all[j].id);
              sampleIds.push(all[j].id);
            }
            if (samples.length >= 3) break;
          }
          return { domain: d, count: domainCounts[d], samples: samples, sample_ids: sampleIds };
        });
        return {
          total_entries: all.length,
          total_domains: domainList.length,
          domains: domains,
          updatedAt: all.length > 0 ? (all[0].updatedAt || all[0].createdAt || new Date().toISOString()) : null
        };
      });
    },

    // 通用 helper：先试 Worker fetch，404/网络错降级到 LocalFallback.fn
    // 用法：LocalFallback.withFallback('/api/search/v2?q=xxx', (url)=>fetch(url), 'searchV2', opts)
    withFallback: function(url, fetchFn, fallbackFnName, opts) {
      return fetchFn(url).then(function(resp) {
        if (resp.ok) return resp.json();
        throw new Error('HTTP ' + resp.status);
      }).catch(function() {
        var fn = LocalFallback[fallbackFnName];
        if (typeof fn === 'function') return fn(opts || {});
        throw new Error('LocalFallback.' + fallbackFnName + ' not found');
      });
    },

    // 直接根据 URL path 自动路由：用 LocalFallback.auto('/api/search/v2?q=xxx')
    auto: function(url) {
      var parsed = new URL(url, location.origin);
      var path = parsed.pathname;
      var q = parsed.searchParams.get('q') || '';
      if (path === '/api/search/v2') {
        return LocalFallback.searchV2(q, {
          entryType: parsed.searchParams.get('entryType'),
          domain: parsed.searchParams.get('domain'),
          page: parsed.searchParams.get('page'),
          pageSize: parsed.searchParams.get('pageSize')
        });
      }
      if (path === '/api/search/suggest') return LocalFallback.searchSuggest(q);
      if (path === '/api/entry') return LocalFallback.getEntry(parsed.searchParams.get('id'));
      if (path === '/api/entry/related') return LocalFallback.getRelated(parsed.searchParams.get('id'), parsed.searchParams.get('limit'));
      if (path === '/api/knowledge-stats') return LocalFallback.getStats();
      // 未知路径：仍试 fetch（可能有 Worker 或本地静态文件）
      return fetch(url).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
    }
  };

})(window);
