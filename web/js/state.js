// web/js/state.js — 发布/订阅事件总线
// 所有 UI 模块通过此总线通信，零直接依赖

const State = (function() {
  'use strict';

  var _listeners = {};
  var _cache = {};

  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {function} fn - 回调函数，接收 data 参数
   */
  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名
   * @param {function} fn - 要取消的回调函数引用
   */
  function off(event, fn) {
    var arr = _listeners[event];
    if (arr) {
      _listeners[event] = arr.filter(function(f) { return f !== fn; });
    }
  }

  /**
   * 发布事件（同时缓存最近一次数据）
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  function emit(event, data) {
    _cache[event] = data;
    var arr = _listeners[event];
    if (arr) {
      arr.forEach(function(fn) {
        try { fn(data); } catch(e) {
          console.error('[State] 监听器错误 [' + event + ']:', e);
        }
      });
    }
  }

  /**
   * 获取事件的最近缓存数据
   * @param {string} event - 事件名
   * @returns {*} 缓存数据或 undefined
   */
  function getCache(event) {
    return _cache[event];
  }

  var api = {
    on: on,
    off: off,
    emit: emit,
    getCache: getCache,
    cache: _cache
  };

  // 挂到 window 供非模块脚本访问（bazi-interact.js 等）
  if (typeof window !== 'undefined') {
    window.State = api;
    // 清理旧全局变量（已迁移到 State 模块）
    delete window._lastBaziOb;
    delete window._lastMGxh;
  }

  return api;
})();

export { State };
