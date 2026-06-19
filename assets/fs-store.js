/**
 * FSStore — 风声产品页面统一 localStorage 封装
 * 纯原生 JS，零依赖，IIFE 模式
 * 命名空间: fs:reply / fs:care / fs:quality / fs:assessment / fs:s1 / fs:knowledge
 */
(function () {
  'use strict';

  var STORE_PREFIX = 'fs:';
  var MAX_RECORDS = 20;

  /**
   * 获取指定命名空间下所有记录的原始 key
   * @param {string} ns - 命名空间
   * @returns {Array<string>}
   */
  function getRecordKeys(ns) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(ns + ':record:') === 0) {
        keys.push(k);
      }
    }
    return keys;
  }

  /**
   * 解析 JSON，失败返回 null
   * @param {string} raw
   * @returns {*}
   */
  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * 创建命名空间下的 API 对象
   * @param {string} ns - 完整命名空间，如 "fs:reply"
   * @returns {object}
   */
  function createStoreAPI(ns) {
    return {
      /**
       * 保存数据，自动附加 _time 时间戳
       * @param {*} data - 要保存的数据
       */
      save: function (data) {
        var record = typeof data === 'object' && data !== null ? data : { value: data };
        record._time = Date.now();

        var keys = getRecordKeys(ns);
        var maxIndex = 0;
        for (var i = 0; i < keys.length; i++) {
          var parts = keys[i].split(':record:');
          var idx = parseInt(parts[1], 10);
          if (!isNaN(idx) && idx > maxIndex) {
            maxIndex = idx;
          }
        }

        var newKey = ns + ':record:' + (maxIndex + 1);
        localStorage.setItem(newKey, JSON.stringify(record));

        // 超出上限时自动裁剪最旧的记录
        keys = getRecordKeys(ns);
        if (keys.length > MAX_RECORDS) {
          keys.sort(function (a, b) {
            var ia = parseInt(a.split(':record:')[1], 10);
            var ib = parseInt(b.split(':record:')[1], 10);
            return ia - ib;
          });
          var removeCount = keys.length - MAX_RECORDS;
          for (var r = 0; r < removeCount; r++) {
            localStorage.removeItem(keys[r]);
          }
        }
      },

      /**
       * 加载最新一条记录
       * @returns {*|null} 最新记录对象，无记录时返回 null
       */
      load: function () {
        var keys = getRecordKeys(ns);
        if (keys.length === 0) {
          return null;
        }

        keys.sort(function (a, b) {
          var ia = parseInt(a.split(':record:')[1], 10);
          var ib = parseInt(b.split(':record:')[1], 10);
          return ib - ia;
        });

        return safeParse(localStorage.getItem(keys[0]));
      },

      /**
       * 获取该命名空间下所有记录，按时间升序排列
       * @returns {Array}
       */
      list: function () {
        var keys = getRecordKeys(ns);
        var records = [];

        for (var i = 0; i < keys.length; i++) {
          var parsed = safeParse(localStorage.getItem(keys[i]));
          if (parsed !== null) {
            records.push(parsed);
          }
        }

        records.sort(function (a, b) {
          return (a._time || 0) - (b._time || 0);
        });

        return records;
      },

      /**
       * 清空该命名空间下所有记录
       */
      clear: function () {
        var keys = getRecordKeys(ns);
        for (var i = 0; i < keys.length; i++) {
          localStorage.removeItem(keys[i]);
        }
      },

      /**
       * 返回已保存记录数量
       * @returns {number}
       */
      count: function () {
        return getRecordKeys(ns).length;
      }
    };
  }

  /**
   * 初始化指定命名空间，返回 API 对象
   * @param {string} key - 命名空间标识，如 "reply"、"care"、"quality"、"assessment"、"s1"、"knowledge"
   * @returns {object} API 对象
   */
  function init(key) {
    var ns = STORE_PREFIX + key;
    return createStoreAPI(ns);
  }

  // ========== 便捷方法：进度保存 ==========
  var PROGRESS_KEY = STORE_PREFIX + 'quality:progress';

  function saveProgress(data) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function getProgress() {
    try { var d = localStorage.getItem(PROGRESS_KEY); return d ? JSON.parse(d) : null; } catch(e) { return null; }
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch(e) {}
  }

  // ========== 便捷方法：报告存储 ==========
  var REPORT_PREFIX = STORE_PREFIX + 'quality:report:';

  function saveReport(data) {
    try {
      var list = getReports();
      list.unshift(data);
      if (list.length > 20) list = list.slice(0, 20);
      localStorage.setItem(REPORT_PREFIX + 'list', JSON.stringify(list));
    } catch(e) {}
  }

  function getReports() {
    try { var d = localStorage.getItem(REPORT_PREFIX + 'list'); return d ? JSON.parse(d) : []; } catch(e) { return []; }
  }

  function deleteReport(index) {
    try {
      var list = getReports();
      if (index >= 0 && index < list.length) { list.splice(index, 1); }
      localStorage.setItem(REPORT_PREFIX + 'list', JSON.stringify(list));
    } catch(e) {}
  }

  // 导出到全局
  window.FSStore = {
    init: init,
    saveProgress: saveProgress,
    getProgress: getProgress,
    clearProgress: clearProgress,
    saveReport: saveReport,
    getReports: getReports,
    deleteReport: deleteReport
  };
})();