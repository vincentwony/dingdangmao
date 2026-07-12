// web/js/archive-ui.js — 命盘档案管理
// localStorage 存取八字命盘记录

import { $ } from './dom-helpers.js';
import { State } from './state.js';

// ══════ BaziArchives 数据层 ══════
var BaziArchives = (function() {
  var KEY = 'bazi_archives';

  function getAll() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.filter(function(r) {
        return r && typeof r.id === 'string' && typeof r.name === 'string';
      });
    } catch(e) { console.warn('[BaziArchives] getAll parse error:', e); return []; }
  }

  function saveAll(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch(e) { console.warn('[BaziArchives] saveAll error:', e); return false; }
  }

  function genId() { return 'bz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

  return { getAll: getAll, saveAll: saveAll, genId: genId };
})();

// ══════ 状态 ══════
var _overlayEl = null;

/** 保存当前命盘（被 bazi-ui 的保存按钮调用） */
function saveCurrent(data) {
  if (!data) { alert('请先排盘，再保存命盘'); return false; }

  var record = {
    id: BaziArchives.genId(),
    savedAt: new Date().toISOString(),
    name: data.name || '未知',
    sex: data.sex || '男',
    pillars: data.pillars || {},
    bzInfo: data.bzInfo || '',  // 兼容旧档（2026-06-26 后新档不再保存此字段）
    lunarDate: data.lunarDate || '',
    jieQi: data.jieQi || '',
    zhenTaiYang: data.zhenTaiYang || '',
    jiShi: data.jiShi || '',
    geName: data.geName || '',
    congGe: data.congGe || {},
    wuxingScores: data.wuxingScores || null,
    dayun: data.dayun || null,
    b1: data.b1, b2: data.b2, b3: data.b3, b4: data.b4,
    MGxh: data.MGxh || 0,
    riBiao: data.riBiao || null,
    cards: data.cards || null,
    // V2 引擎数据
    cardsV2: data.cardsV2 || null,
    congGeV2: data.congGeV2 || null,
    geNameV2: data.geNameV2 || null,
    selectedEngine: data.selectedEngine || 'A',
    wuxingPct: data.wuxingPct || null,
    wuxingLevels: data.wuxingLevels || null,
    wuxingDetails: data.wuxingDetails || null
  };

  var list = BaziArchives.getAll();
  var max = 50; // 最大保存条数
  list.unshift(record);
  if (list.length > max) list = list.slice(0, max);

  if (BaziArchives.saveAll(list)) {
    return true;
  }
  return false;
}

/** 显示档案管理面板 */
function show() {
  if (!_overlayEl) buildOverlay();
  _renderList();
  _overlayEl.classList.add('show');
  _overlayEl.onclick = function(e) { if (e.target === _overlayEl) hide(); };
}

/** 隐藏 */
function hide() {
  if (_overlayEl) _overlayEl.classList.remove('show');
}

/** 构建面板 */
function buildOverlay() {
  _overlayEl = document.createElement('div');
  _overlayEl.className = 'bazi-archive-overlay';
  _overlayEl.setAttribute('role', 'dialog');
  _overlayEl.setAttribute('aria-modal', 'true');
  _overlayEl.setAttribute('aria-label', '命盘档案');
  _overlayEl.innerHTML =
    '<div class="bazi-archive-card">' +
      '<div class="bazi-archive-header">' +
        '<span class="bazi-archive-title"><i class="ti ti-archive"></i> 命盘档案</span>' +
        '<button class="bazi-archive-close" id="archiveCloseBtn">&times;</button>' +
      '</div>' +
      '<div class="bazi-archive-list" id="baziArchiveList">' +
        '<div class="bazi-archive-empty">暂无保存的命盘档案</div>' +
      '</div>' +
      '<div class="bazi-archive-actions-bar">' +
        '<button class="bazi-archive-btn-clear-all" id="archiveClearAllBtn">清空全部</button>' +
        '<button class="bazi-archive-btn-close-panel" id="archiveClosePanelBtn">关闭</button>' +
      '</div>' +
    '</div>';

  var closeBtn = _overlayEl.querySelector('#archiveCloseBtn');
  var closePanelBtn = _overlayEl.querySelector('#archiveClosePanelBtn');
  if (closeBtn) closeBtn.addEventListener('click', hide);
  if (closePanelBtn) closePanelBtn.addEventListener('click', hide);

  var clearBtn = _overlayEl.querySelector('#archiveClearAllBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      var list = BaziArchives.getAll();
      if (list.length === 0) return;
      if (confirm('确定要清空全部 ' + list.length + ' 条命盘档案吗？此操作不可恢复。')) {
        BaziArchives.saveAll([]);
        _renderList();
      }
    });
  }

  document.body.appendChild(_overlayEl);

  // ESC 关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _overlayEl && _overlayEl.classList.contains('show')) {
      hide();
    }
  });
}

/** 渲染档案列表 */
function _renderList() {
  var listEl = document.getElementById('baziArchiveList');
  if (!listEl) return;

  var list = BaziArchives.getAll();

  if (list.length === 0) {
    listEl.innerHTML = '<div class="bazi-archive-empty"><i class="ti ti-archive-off" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>暂无保存的命盘档案</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    var p = r.pillars || {};
    var pillarStr = (p.year || '——') + '年 ' + (p.month || '——') + '月 ' + (p.day || '——') + '日 ' + (p.hour || '——') + '时';
    var dateStr = '';
    try {
      var d = new Date(r.savedAt);
      dateStr = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    } catch(e) { dateStr = r.savedAt || ''; }

    html += '<div class="bazi-archive-item" data-archive-id="' + r.id + '">' +
      '<div class="bazi-archive-item-info">' +
        '<div class="bazi-archive-item-name">' + _esc(r.name) + ' · ' + _esc(r.sex === '男' ? '乾造' : '坤造') + '</div>' +
        '<div class="bazi-archive-item-pillars">' + _esc(pillarStr) + '</div>' +
        '<div class="bazi-archive-item-date">' + _esc(dateStr) + ' · ' + _esc(r.geName || '') + '</div>' +
      '</div>' +
      '<div class="bazi-archive-item-actions">' +
        '<button class="bazi-archive-btn-load" data-load-id="' + r.id + '">查看</button>' +
        '<button class="bazi-archive-btn-del" data-del-id="' + r.id + '">删除</button>' +
      '</div>' +
    '</div>';
  }

  listEl.innerHTML = html;

  // 事件委托：单次绑定处理 查看/删除/整行点击
  if (!listEl._archiveDelegated) {
    listEl._archiveDelegated = true;
    listEl.addEventListener('click', function(e) {
      var loadBtn = e.target.closest('.bazi-archive-btn-load');
      var delBtn = e.target.closest('.bazi-archive-btn-del');
      var item = e.target.closest('.bazi-archive-item');
      if (loadBtn) {
        e.stopPropagation();
        viewArchive(loadBtn.getAttribute('data-load-id'));
      } else if (delBtn) {
        e.stopPropagation();
        deleteArchive(delBtn.getAttribute('data-del-id'));
      } else if (item) {
        viewArchive(item.getAttribute('data-archive-id'));
      }
    });
  }
}

/** 查看命盘 — 复用 bazi-ui.js renderResult（结果渲染在表单下方） */
function viewArchive(id) {
  var list = BaziArchives.getAll();
  var record = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { record = list[i]; break; }
  }
  if (!record) return;

  hide();

  // 重建完整 data 结构（与 API 返回格式一致，供 renderResult 消费）
  var data = {
    name: record.name,
    sex: record.sex,
    pillars: record.pillars || {},
    bzInfo: record.bzInfo || '',
    lunarDate: record.lunarDate || '',
    jieQi: record.jieQi || '',
    zhenTaiYang: record.zhenTaiYang || '',
    jiShi: record.jiShi || '',
    geName: record.geName || '',
    congGe: record.congGe || {},
    wuxingScores: record.wuxingScores || null,
    bzinfo: record.bzinfo || '',
    dayun: record.dayun || null,
    b1: record.b1, b2: record.b2, b3: record.b3, b4: record.b4,
    MGxh: record.MGxh || 0,
    riBiao: record.riBiao || null,
    cards: record.cards || null,
    // V2 引擎数据
    cardsV2: record.cardsV2 || null,
    congGeV2: record.congGeV2 || null,
    geNameV2: record.geNameV2 || null,
    selectedEngine: record.selectedEngine || 'A',
    wuxingPct: record.wuxingPct || null,
    wuxingLevels: record.wuxingLevels || null,
    wuxingDetails: record.wuxingDetails || null
  };

  // 设置全局状态（bazi-interact.js ChangeLn / selectLiunianYear 依赖）
  State.emit('bazi:result', {
    ob: {
      b1: record.b1, b2: record.b2, b3: record.b3, b4: record.b4,
      dayun: record.dayun || {}
    },
    MGxh: record.MGxh || 0
  });

  // 显示 bazi-root，隐藏日历
  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'none';
  var baziRoot = document.getElementById('bazi-root');
  if (!baziRoot) return;
  baziRoot.style.display = 'block';

  // 动态加载 bazi-ui（ES module 缓存保证只加载一次）
  import('./bazi-ui.js').then(function(mod) {
    var baziMod = (mod && mod.default) ? mod.default : mod;
    // 表单不存在时先构建，否则直接渲染结果
    if (!baziRoot.querySelector('.bazi-input-form') && baziMod && baziMod.show) {
      baziMod.show();
    }
    if (baziMod && baziMod.renderResult) {
      baziMod.renderResult(data, { skipWrapToggle: true });
    }
  });
}

/** 删除一条档案 */
function deleteArchive(id) {
  if (!confirm('确定要删除这条命盘档案吗？')) return;

  var list = BaziArchives.getAll();
  var newList = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) newList.push(list[i]);
  }
  if (BaziArchives.saveAll(newList)) _renderList();
}

function _esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default { show: show, hide: hide, saveCurrent: saveCurrent, BaziArchives: BaziArchives };
