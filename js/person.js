/* eslint-disable */
/**
 * person.js · 服务者能力聚合层
 * IIFE → window.Person
 * 统一封装 localStorage 读写 + 加权聚合公式 + 自动快照
 * LS_KEY: fs_person_v2
 * 兼容迁移: fs_care_profile / fs_exam_results / fs_practice_done
 */
(function(global) {
  'use strict';

  var LS_KEY = 'fs_person_v2';

  function Person() {
    var cfg = global.DOMAIN_CONFIG || {};
    var saved = _load();
    this.data = saved || _default();
    this.cfg = cfg;
  }

  // ===== 读取接口 =====

  Person.prototype.getAbilityProfile = function() {
    var dims = this.cfg.getDims ? this.cfg.getDims() : [];
    var self = this;
    return dims.map(function(dim) {
      var baseline = self._dimScore('careTest', dim.id) || 0;
      var exam     = self._dimScore('exam',     dim.id) || 0;
      var practice = self._dimScore('practice', dim.id) || 0;
      var rawScore = baseline * 0.3 + exam * 0.4 + practice * 0.3;
      var weighted = rawScore * (dim.weight || 0.14);
      var eth = self.cfg.getEthicsById ? self.cfg.getEthicsById(dim.eth) : null;
      return {
        dimId: dim.id,
        dimName: dim.name,
        emoji: dim.emoji,
        score: Math.round(rawScore),
        weightedScore: Math.round(weighted * 100),
        weight: dim.weight,
        ethId: dim.eth,
        ethName: eth ? eth.name : '',
        breakdown: { baseline: Math.round(baseline), exam: Math.round(exam), practice: Math.round(practice) },
      };
    });
  };

  Person.prototype.getEthicsProfile = function() {
    var profile = this.getAbilityProfile();
    var ethics = this.cfg.ETHICS || [];
    return ethics.map(function(eth) {
      var related = profile.filter(function(p) { return p.ethId === eth.id; });
      var avg = related.length ? Math.round(related.reduce(function(s,p){return s+p.score;},0) / related.length) : 0;
      return {
        id: eth.id, name: eth.name, emoji: eth.emoji, color: eth.color, desc: eth.desc,
        score: avg, dims: related.map(function(p){ return p.dimName; }),
      };
    });
  };

  Person.prototype.getGrowth = function() {
    return this.data.snapshots || [];
  };

  Person.prototype.getWeakDims = function() {
    return this.getAbilityProfile()
      .slice()
      .sort(function(a,b){ return a.score - b.score; })
      .slice(0, 2)
      .map(function(p){ return p.dimId; });
  };

  // ===== 写入接口 =====

  Person.prototype.submitCareTest = function(scores) {
    this.data.careTest = { ts: Date.now(), scores: scores };
    this._snapshot('careTest');
    this._save();
  };

  Person.prototype.submitExam = function(dimId, score) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (!this.data.exams[domain]) this.data.exams[domain] = {};
    var prev = this.data.exams[domain][dimId] || { best: 0, attempts: [] };
    prev.best = Math.max(prev.best, score);
    prev.attempts.push({ ts: Date.now(), score: score });
    this.data.exams[domain][dimId] = prev;
    this._snapshot('exam', dimId);
    this._save();
  };

  Person.prototype.submitPractice = function(sceneId, score) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (!this.data.practices[domain]) this.data.practices[domain] = {};
    this.data.practices[domain][sceneId] = { ts: Date.now(), score: score };
    this._snapshot('practice', sceneId);
    this._save();
  };

  // ===== 内部 =====

  Person.prototype._dimScore = function(source, dimId) {
    var domain = this.cfg.getCurrentDomain ? this.cfg.getCurrentDomain() : 'TRANSACTION';
    if (source === 'careTest') {
      return this.data.careTest && this.data.careTest.scores ? this.data.careTest.scores[dimId] : undefined;
    }
    if (source === 'exam') {
      var d = this.data.exams && this.data.exams[domain];
      return d && d[dimId] ? d[dimId].best : undefined;
    }
    if (source === 'practice') {
      var scenes = this.data.practices && this.data.practices[domain];
      if (!scenes) return undefined;
      var vals = Object.values(scenes);
      if (!vals.length) return undefined;
      return Math.round(vals.reduce(function(s,x){ return s + (x.score || 0); }, 0) / vals.length);
    }
  };

  Person.prototype._snapshot = function(trigger, extra) {
    var scores = {};
    var ethics = {};
    try {
      var profile = this.getAbilityProfile();
      profile.forEach(function(p) { scores[p.dimId] = p.score; });
      this.getEthicsProfile().forEach(function(e) { ethics[e.id] = e.score; });
    } catch(e) { /* 配置未加载时跳过 */ }
    var snap = {
      ts: Date.now(),
      trigger: trigger + (extra ? ':' + extra : ''),
      scores: scores,
      ethics: ethics,
    };
    if (!this.data.snapshots) this.data.snapshots = [];
    this.data.snapshots.push(snap);
    if (this.data.snapshots.length > 30) this.data.snapshots = this.data.snapshots.slice(-30);
  };

  Person.prototype._save = function() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch(e) {}
  };

  Person.prototype.getRawData = function() { return this.data; };

  // ===== 模块级工具 =====

  function _load() {
    try {
      var v2 = JSON.parse(localStorage.getItem(LS_KEY));
      if (v2) return v2;
    } catch(e) {}
    var migrated = _migrateV1();
    if (migrated) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(migrated)); } catch(e) {}
      return migrated;
    }
    return null;
  }

  function _migrateV1() {
    var result = _default();
    var v1Care = null, v1Exam = null;
    try { v1Care = JSON.parse(localStorage.getItem('fs_care_profile')); } catch(e) {}
    try { v1Exam = JSON.parse(localStorage.getItem('fs_exam_results')); } catch(e) {}
    if (v1Care && v1Care.scores) {
      result.careTest = { ts: v1Care.ts || Date.now(), scores: v1Care.scores };
    }
    if (v1Exam && typeof v1Exam === 'object') {
      result.exams.TRANSACTION = {};
      Object.keys(v1Exam).forEach(function(dimId) {
        var v = v1Exam[dimId];
        if (typeof v === 'number') {
          result.exams.TRANSACTION[dimId] = { best: v, attempts: [{ ts: Date.now(), score: v }] };
        } else if (v && typeof v.best === 'number') {
          result.exams.TRANSACTION[dimId] = v;
        }
      });
    }
    if (!v1Care && !v1Exam) return null;
    return result;
  }

  function _default() {
    return {
      careTest: null,
      exams: { TRANSACTION: {}, DECOR: {} },
      practices: { TRANSACTION: {}, DECOR: {} },
      roleId: null,
      consumerId: null,
      snapshots: [],
    };
  }

  global.Person = Person;
  global.PersonLS_KEY = LS_KEY;
})(typeof window !== 'undefined' ? window : globalThis);
