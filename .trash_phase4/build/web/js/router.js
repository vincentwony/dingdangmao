import { State } from './state.js';

const Router = (function() {
  'use strict';

  var _routes = {};
  var _currentRoute = '';

  /**
   * 注册路由处理函数
   * @param {string} pattern - 路由模式（如 'calendar', 'bazi'）
   * @param {function} handler - 处理函数，接收完整 hash
   */
  function register(pattern, handler) {
    _routes[pattern] = handler;
  }

  /**
   * 导航到指定 hash
   * @param {string} hash - 目标 hash（不含 # 前缀）
   */
  function navigate(hash) {
    window.location.hash = hash;
  }

  /** 获取当前路由 */
  function current() {
    return _currentRoute;
  }

  /** hashchange 事件处理 */
  function _onHashChange() {
    var hash = window.location.hash.replace('#', '') || 'calendar';
    _currentRoute = hash;

    var matched = false;
    for (var pattern in _routes) {
      if (_routes.hasOwnProperty(pattern)) {
        if (hash === pattern || hash.indexOf(pattern + '/') === 0) {
          _routes[pattern](hash);
          matched = true;
          break;
        }
      }
    }

    State.emit('route:changed', { route: hash, matched: matched });
  }

  /** 初始化 */
  function init() {
    window.addEventListener('hashchange', _onHashChange);

    if (window.location.hash) {
      _onHashChange();
    } else {
      navigate('calendar');
    }
  }

  return {
    register: register,
    navigate: navigate,
    current: current,
    init: init
  };
})();

export { Router };