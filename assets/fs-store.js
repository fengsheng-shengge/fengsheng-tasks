/**
 * FSStore — 风声产品页面统一 localStorage 封装
 * 纯原生 JS，零依赖，IIFE 模式
 * 用法:
 *   FSStore.for('care').saveProgress({...})      // 保存答题进度
 *   FSStore.for('care').getProgress()             // 获取进度
 *   FSStore.for('care').clearProgress()           // 清空进度
 *   FSStore.for('care').saveReport({...})         // 保存报告到历史
 *   FSStore.for('care').getReports()              // 获取报告列表
 *   FSStore.for('care').deleteReport(index)       // 删除某条报告
 */
(function () {
  'use strict';

  var STORE_PREFIX = 'fs:';
  var MAX_RECORDS = 20;
  var cache = {};

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /**
   * 为某个 namespace 创建一个 store API 对象
   * @param {string} nsKey - 产品标识，如 'care' / 'quality' / 'reply' / 's1' / 'assessment'
   */
  function createStore(nsKey) {
    var ns = STORE_PREFIX + nsKey;
    var PROGRESS_KEY = ns + ':progress';
    var REPORT_KEY = ns + ':report:list';

    return {
      /* ===== 进度（答题中途保存） ===== */
      saveProgress: function (data) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch (e) {}
      },
      getProgress: function () {
        try {
          var d = localStorage.getItem(PROGRESS_KEY);
          return d ? JSON.parse(d) : null;
        } catch (e) { return null; }
      },
      clearProgress: function () {
        try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
      },

      /* ===== 报告历史 ===== */
      saveReport: function (data) {
        try {
          var list = this.getReports();
          // 一分钟内重复就跳过
          if (list.length > 0 && list[0]._time && (Date.now() - list[0]._time < 60000)) {
            return;
          }
          var record = typeof data === 'object' && data !== null ? data : { value: data };
          record._time = Date.now();
          list.unshift(record);
          if (list.length > MAX_RECORDS) list = list.slice(0, MAX_RECORDS);
          localStorage.setItem(REPORT_KEY, JSON.stringify(list));
        } catch (e) {}
      },
      getReports: function () {
        try {
          var d = localStorage.getItem(REPORT_KEY);
          return d ? JSON.parse(d) : [];
        } catch (e) { return []; }
      },
      deleteReport: function (index) {
        try {
          var list = this.getReports();
          if (index >= 0 && index < list.length) list.splice(index, 1);
          localStorage.setItem(REPORT_KEY, JSON.stringify(list));
        } catch (e) {}
      }
    };
  }

  /**
   * 获取指定 namespace 的 store（带缓存）
   */
  function forNs(nsKey) {
    if (!cache[nsKey]) cache[nsKey] = createStore(nsKey);
    return cache[nsKey];
  }

  // 导出到全局
  window.FSStore = {
    for: forNs,
    // 向后兼容：保留 quality 为默认 namespace 的便捷方法（旧版代码还能用）
    saveProgress: function (d) { return forNs('quality').saveProgress(d); },
    getProgress: function () { return forNs('quality').getProgress(); },
    clearProgress: function () { return forNs('quality').clearProgress(); },
    saveReport: function (d) { return forNs('quality').saveReport(d); },
    getReports: function () { return forNs('quality').getReports(); },
    deleteReport: function (i) { return forNs('quality').deleteReport(i); }
  };
})();
