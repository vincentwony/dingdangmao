import { State } from './state.js';
import { $, _highlightFab } from './dom-helpers.js';

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
    }
  };
})();

var _overlayEl = null;
var _barY, _barM, _barD;

function open(y, m, d) {
  _barY = y || new Date().getFullYear();
  _barM = m || (new Date().getMonth() + 1);
  _barD = d || new Date().getDate();

  _highlightFab('tabNote');
  _openEditor(_barY, _barM, _barD);
}

/** 为当前选中日期打开（从导航触发） */
function openForSelected() {

  if (!_barY || !_barM || !_barD) {
    var now = new Date();
    _barY = now.getFullYear();
    _barM = now.getMonth() + 1;
    _barD = now.getDate();
  }
  _highlightFab('tabNote');
  _openEditor(_barY, _barM, _barD);
}

/** 内部打开编辑器 */
function _openEditor(y, m, d) {
  close();

  var existing = DailyNotes.get(y, m, d);

  var overlayEl = document.createElement('div');
  overlayEl.className = 'note-editor-overlay';
  overlayEl.id = 'noteEditorOverlay';
  overlayEl.addEventListener('click', function(ev) {
    if (ev.target === overlayEl) close();
  });

  overlayEl.innerHTML =
    '<div class="note-editor-card">' +
    '<div class="note-editor-title">' + y + '年' + m + '月' + d + '日 记事</div>' +
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

  if (saveBtn) saveBtn.addEventListener('click', function() { _doSave(y, m, d); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (deleteBtn) deleteBtn.addEventListener('click', function() { _doDelete(y, m, d); });

  overlayEl._keyHandler = function(ev) { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', overlayEl._keyHandler);

  setTimeout(function() {
    var ta = document.getElementById('noteEditorTextarea');
    if (ta) ta.focus();
  }, 150);
}

/** 关闭编辑器 */
function close() {
  if (_overlayEl) {
    if (_overlayEl._keyHandler) document.removeEventListener('keydown', _overlayEl._keyHandler);
    _overlayEl.remove();
    _overlayEl = null;
  }
}

/** 保存记事 */
function _doSave(y, m, d) {
  var ta = document.getElementById('noteEditorTextarea');
  if (!ta) return;
  DailyNotes.save(y, m, d, ta.value);
  close();
  _refreshNoteDot(y, m, d);
  State.emit('note:changed', { y: y, m: m, d: d });
}

/** 删除记事 */
function _doDelete(y, m, d) {
  DailyNotes.remove(y, m, d);
  close();
  _refreshNoteDot(y, m, d);
  State.emit('note:changed', { y: y, m: m, d: d });
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

function init() {
  State.on('date:selected', function(evt) {
    if (evt && evt.y && evt.m && evt.d) {
      _barY = evt.y; _barM = evt.m; _barD = evt.d;
    }
  });
}

export default { open: open, close: close, openForSelected: openForSelected, init: init, DailyNotes: DailyNotes };