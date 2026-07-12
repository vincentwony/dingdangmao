// web/js/dom-helpers.js — DOM 工具函数
// 从 index.html 提取的通用工具函数

'use strict';

/** 简写选择器 */
function $(sel, ctx) {
  return (ctx || document).querySelector(sel);
}
function $$(sel, ctx) {
  return (ctx || document).querySelectorAll(sel);
}

/** 导航按钮高亮管理 */
function _highlightFab(activeId) {
  $$('.top-nav-tabs .tab-item').forEach(function(btn) {
    btn.classList.remove('tab-active');
    btn.setAttribute('aria-selected', 'false');
  });
  var btn = document.getElementById(activeId);
  if (btn) {
    btn.classList.add('tab-active');
    btn.setAttribute('aria-selected', 'true');
  }
}

/** 测量并更新顶部导航栏高度 CSS 变量 */
function _updateTopNavHeight() {
  var nav = document.querySelector('.top-nav');
  if (nav) {
    var h = nav.offsetHeight;
    document.documentElement.style.setProperty('--top-nav-height', h + 'px');
  }
}

/** 日历标签设置存取 */
function saveCalSetting(key, val) {
  try { localStorage.setItem('cal_' + key, val ? '1' : '0'); } catch(e) {}
}
function loadCalSetting(key, def) {
  try {
    var v = localStorage.getItem('cal_' + key);
    if (v === null) return def;
    return v === '1';
  } catch(e) { return def; }
}
function _rdCBool(key, def) {
  return loadCalSetting(key, def !== false);
}

/** 格式化日期为 YYYY-MM-DD */
function fmtDate(y, m, d) {
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

/** 折叠卡片 */
function toggleCardCollapse(headerEl) {
  var card = headerEl.closest('.card');
  if (card) card.classList.toggle('collapsed');
}

/** 关闭详情浮层 */
function closeFullDetail() {
  var overlay = document.getElementById('fullDetailOverlay');
  if (overlay) overlay.style.display = 'none';
}

/** 空操作 */
function noop() {}

export {
  $, $$,
  _highlightFab,
  _updateTopNavHeight,
  saveCalSetting, loadCalSetting, _rdCBool,
  fmtDate,
  toggleCardCollapse,
  closeFullDetail,
  noop
};
