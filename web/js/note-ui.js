// web/js/note-ui.js — 每日记事（独立页面 + 编辑器）
// 基于 localStorage 的简单记事本；重新设计：独立记事中心页 + 列表管理 + 任意日期编辑

import { State } from './state.js';
import { $, _highlightFab } from './dom-helpers.js';

// ══════ DailyNotes 数据层 ══════
var DailyNotes = (function() {
  var KEY = 'daily_notes';

  function _key(y, m, d) {
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }

  function _getAll() {
    try { var d = localStorage.getItem(KEY); return d ? JSON.parse(d) : {}; }
    catch(e) { console.warn('[DailyNotes] parse error:', e); return {}; }
  }

  function _saveAll(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
    catch(e) { console.warn('[DailyNotes] save error:', e); return false; }
  }

  return {
    get: function(y, m, d) {
      var all = _getAll();
      return all[_key(y, m, d)] || '';
    },
    has: function(y, m, d) {
      return this.get(y, m, d).trim().length > 0;
    },
    save: function(y, m, d, text) {
      var all = _getAll();
      var k = _key(y, m, d);
      var t = text.trim();
      if (t) { all[k] = t; }
      else { delete all[k]; }
      return _saveAll(all);
    },
    remove: function(y, m, d) {
      var all = _getAll();
      delete all[_key(y, m, d)];
      return _saveAll(all);
    },
    // 返回全部非空记事 [{key,y,m,d,text}]
    entries: function() {
      var all = _getAll();
      var arr = [];
      for (var k in all) {
        if (!all.hasOwnProperty(k)) continue;
        if (!((all[k] || '').trim())) continue;
        var p = k.split('-');
        arr.push({ key: k, y: +p[0], m: +p[1], d: +p[2], text: all[k] });
      }
      return arr;
    }
  };
})();

// ══════ 页面 / 编辑器状态 ══════
var _overlayEl = null;
var _noteRoot = null;
var _currentFilter = 'all';

var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// ══════ 记事中心页 ══════
function renderNotePage() {
  _noteRoot = document.getElementById('note-root');
  if (!_noteRoot) return;
  _renderShell();
  _renderList();
}

function _renderShell() {
  var now = new Date();
  var opts = '<option value="all">全部</option>';
  for (var i = 0; i < 12; i++) {
    var dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var y = dt.getFullYear(), m = dt.getMonth() + 1;
    var val = y + '-' + (m < 10 ? '0' : '') + m;
    opts += '<option value="' + val + '">' + y + '年' + m + '月</option>';
  }

  _noteRoot.innerHTML =
    '<div class="note-page">' +
      '<header class="note-page-head">' +
        '<div class="note-page-head-text">' +
          '<h2 class="note-page-title">每日记事</h2>' +
          '<p class="note-page-sub">记录每一天的重要备忘，日历上会以红点标记。所有记录仅保存在本设备。</p>' +
        '</div>' +
        '<button class="note-page-new" id="noteNewBtn">＋ 新建记事</button>' +
      '</header>' +
      '<div class="note-page-filter">' +
        '<label for="noteMonthSel">筛选月份</label>' +
        '<select id="noteMonthSel" class="note-select">' + opts + '</select>' +
        '<span class="note-page-count" id="noteCount"></span>' +
      '</div>' +
      '<div class="note-list" id="noteList"></div>' +
    '</div>';

  var sel = _noteRoot.querySelector('#noteMonthSel');
  sel.addEventListener('change', function() { _currentFilter = sel.value; _renderList(); });
  _noteRoot.querySelector('#noteNewBtn').addEventListener('click', function() { _openEditor(null, null, null); });
}

function _renderList() {
  var listEl = _noteRoot.querySelector('#noteList');
  if (!listEl) return;

  var entries = DailyNotes.entries();
  if (_currentFilter !== 'all') {
    entries = entries.filter(function(e) { return e.key.slice(0, 7) === _currentFilter; });
  }
  entries.sort(function(a, b) { return a.key < b.key ? 1 : -1; }); // 日期倒序

  var countEl = _noteRoot.querySelector('#noteCount');
  if (countEl) countEl.textContent = entries.length ? ('共 ' + entries.length + ' 条') : '';

  if (!entries.length) {
    listEl.innerHTML =
      '<div class="note-empty">' +
        '<div class="note-empty-icon">📝</div>' +
        '<p class="note-empty-title">还没有记事</p>' +
        '<p class="note-empty-desc">点击右上角「新建记事」，记录今天或任意日期的备忘。</p>' +
      '</div>';
    return;
  }

  var html = '';
  entries.forEach(function(e) {
    var dt = new Date(e.y, e.m - 1, e.d);
    var wk = WEEK[dt.getDay()];
    var preview = e.text.replace(/\s+/g, ' ');
    if (preview.length > 80) preview = preview.slice(0, 80) + '…';
    html +=
      '<article class="note-card" data-y="' + e.y + '" data-m="' + e.m + '" data-d="' + e.d + '">' +
        '<div class="note-card-date">' +
          '<span class="note-card-day">' + e.d + '</span>' +
          '<span class="note-card-meta">' + e.m + '月 · 周' + wk + '</span>' +
        '</div>' +
        '<div class="note-card-body">' +
          '<p class="note-card-text">' + _escapeHtml(preview) + '</p>' +
        '</div>' +
        '<div class="note-card-actions">' +
          '<button class="note-card-btn note-card-edit" data-act="edit">编辑</button>' +
          '<button class="note-card-btn note-card-del" data-act="del">删除</button>' +
        '</div>' +
      '</article>';
  });
  listEl.innerHTML = html;

  listEl.querySelectorAll('.note-card').forEach(function(card) {
    var y = +card.getAttribute('data-y'), m = +card.getAttribute('data-m'), d = +card.getAttribute('data-d');
    card.querySelector('.note-card-edit').addEventListener('click', function(ev) {
      ev.stopPropagation(); _openEditor(y, m, d);
    });
    card.querySelector('.note-card-del').addEventListener('click', function(ev) {
      ev.stopPropagation();
      if (window.confirm('确定删除 ' + y + '年' + m + '月' + d + '日 的记事？')) {
        DailyNotes.remove(y, m, d);
        _renderList();
        _refreshNoteDot(y, m, d);
      }
    });
    card.addEventListener('click', function() { _openEditor(y, m, d); });
  });
}

// ══════ 编辑器（支持日期选择） ══════
function _openEditor(y, m, d) {
  close();

  _highlightFab('tabNote');

  var now = new Date();
  var ty = y || now.getFullYear(), tm = m || (now.getMonth() + 1), td = d || now.getDate();
  var dateVal = ty + '-' + (tm < 10 ? '0' : '') + tm + '-' + (td < 10 ? '0' : '') + td;
  var existing = DailyNotes.get(ty, tm, td);

  var overlayEl = document.createElement('div');
  overlayEl.className = 'note-editor-overlay';
  overlayEl.id = 'noteEditorOverlay';
  overlayEl.addEventListener('click', function(ev) {
    if (ev.target === overlayEl) close();
  });

  overlayEl.innerHTML =
    '<div class="note-editor-card">' +
    '<div class="note-editor-title">' + (existing ? '编辑记事' : '新建记事') + '</div>' +
    '<div class="note-editor-date">' +
      '<label for="noteDateInput">日期</label>' +
      '<input type="date" id="noteDateInput" class="note-date-input" value="' + dateVal + '"/>' +
    '</div>' +
    '<textarea class="note-editor-textarea" id="noteEditorTextarea" placeholder="在此输入记事内容……">' +
    (existing ? _escapeHtml(existing) : '') +
    '</textarea>' +
    '<div class="note-editor-actions">' +
    '<span class="note-info" id="noteEditorInfo">' + (existing ? '已存记事' : '新记事') + '</span>' +
    '<button class="note-editor-close" id="noteBtnClose">关闭</button>' +
    (existing ? '<button class="note-editor-delete" id="noteBtnDelete">删除</button>' : '') +
    '<button class="note-editor-save" id="noteBtnSave">保存</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlayEl);
  _overlayEl = overlayEl;

  var saveBtn = overlayEl.querySelector('#noteBtnSave');
  var closeBtn = overlayEl.querySelector('#noteBtnClose');
  var deleteBtn = overlayEl.querySelector('#noteBtnDelete');

  if (saveBtn) saveBtn.addEventListener('click', _doSave);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (deleteBtn) deleteBtn.addEventListener('click', _doDelete);

  overlayEl._keyHandler = function(ev) { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', overlayEl._keyHandler);

  setTimeout(function() {
    var ta = document.getElementById('noteEditorTextarea');
    if (ta) ta.focus();
  }, 150);
}

/** 从日期输入框解析目标日期 */
function _targetYMD() {
  var inp = document.getElementById('noteDateInput');
  var val = inp ? inp.value : '';
  var p = (val || '').split('-');
  if (p.length === 3 && p[0] && p[1] && p[2]) {
    return { y: +p[0], m: +p[1], d: +p[2] };
  }
  var now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function _doSave() {
  var ta = document.getElementById('noteEditorTextarea');
  if (!ta) return;
  var t = _targetYMD();
  DailyNotes.save(t.y, t.m, t.d, ta.value);
  close();
  _refreshNoteDot(t.y, t.m, t.d);
  if (_noteRoot) _renderList();
  State.emit('note:changed', { y: t.y, m: t.m, d: t.d });
}

function _doDelete() {
  var t = _targetYMD();
  DailyNotes.remove(t.y, t.m, t.d);
  close();
  _refreshNoteDot(t.y, t.m, t.d);
  if (_noteRoot) _renderList();
  State.emit('note:changed', { y: t.y, m: t.m, d: t.d });
}

function close() {
  if (_overlayEl) {
    if (_overlayEl._keyHandler) document.removeEventListener('keydown', _overlayEl._keyHandler);
    _overlayEl.remove();
    _overlayEl = null;
  }
}

/** 刷新日历格上的红点 */
function _refreshNoteDot(y, m, d) {
  var cal3 = document.getElementById('Cal3');
  if (!cal3) return;
  var tds = cal3.querySelectorAll('td[data-year="' + y + '"][data-month="' + m + '"][data-day="' + d + '"]');
  for (var i = 0; i < tds.length; i++) {
    var td = tds[i];
    var sn = td.querySelector('.solar-num');
    if (!sn) continue;
    var oldDot = sn.querySelector('.daily-note-dot');
    var hasNote = DailyNotes.has(y, m, d);
    if (hasNote && !oldDot) {
      var dot = document.createElement('span');
      dot.className = 'daily-note-dot';
      sn.appendChild(dot);
    } else if (!hasNote && oldDot) {
      oldDot.remove();
    }
  }
}

function _escapeHtml(str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ══════ 兼容旧入口（日历可能调用，保留） ══════
function open(y, m, d) {
  _openEditor(y, m, d);
}
function openForSelected() {
  _openEditor(null, null, null);
}

// ══════ 监听日期选中事件（同步红点用，保留） ══════
function init() {
  State.on('date:selected', function(evt) {
    if (evt && evt.y && evt.m && evt.d) {
      // 仅用于潜在联动，当前记事页不依赖
    }
  });
}

export default { open: open, close: close, openForSelected: openForSelected, init: init, renderNotePage: renderNotePage, DailyNotes: DailyNotes };
