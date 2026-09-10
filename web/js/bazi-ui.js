// web/js/bazi-ui.js — 八字排盘模块
// 表单输入 + API 调用 + 结果渲染

import { State } from './state.js';
import { API } from './api.js';
import { $, $$, _highlightFab, closeFullDetail } from './dom-helpers.js';
import { parseClockTime } from './time-util.js';

// ══════ localStorage 安全读写 ══════
function _lsGet(key, def) {
  try { var v = localStorage.getItem(key); return v !== null ? v : def; } catch(e) { return def; }
}
function _lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch(e) {}
}

// ══════ 全局桩函数 ══════
if (!window.showToast) {
  window.showToast = function(msg, type) { console.log('[toast]', type || 'info', msg); };
}
/** 天罗地网双算法切换 */
window._tldwSwitch = function(el) {
  var mode = el.getAttribute('data-mode');
  var toggle = el.parentElement;
  toggle.querySelectorAll('.engine-opt').forEach(function(o){ o.classList.toggle('active', o.getAttribute('data-mode') === mode); });
  document.querySelectorAll('.tldw-panel').forEach(function(p){ p.style.display = p.getAttribute('data-tldw') === mode ? '' : 'none'; });
};

/** 小儿关煞双面板切换（正统子平 / 民间） */
window._xiaoguanSwitch = function(el) {
  var mode = el.getAttribute('data-mode');
  var toggle = el.parentElement;
  toggle.querySelectorAll('.engine-opt').forEach(function(o){ o.classList.toggle('active', o.getAttribute('data-mode') === mode); });
  var wrap = el.closest('.ch-content') || document;
  wrap.querySelectorAll('.xg-panel').forEach(function(p){ p.style.display = p.getAttribute('data-xg') === mode ? '' : 'none'; });
};

window.toggleCardCollapse = function(el) {
  var card = el.closest('.card');
  if (card) card.classList.toggle('collapsed');
};

/** 渲染第伍章 · 小儿关煞 内容（数据来自服务端 xiaoErGuanSha） */
function _renderXiaoErGuanSha(xg) {
  if (!xg) return '';
  var h = '';
  // 警示条（常显）
  h += '<div class="xg-warn">⚠ ' + (xg.ageNote || '限 16 岁前参考 · 民俗说法仅供参考，不可迷信') + '</div>';

  // 性别横幅（分男女：明确本造性别，关煞按性别判定，不混为一谈）
  var sexCls = (xg.sex === 0) ? 'female' : 'male';
  var sexText = xg.sexText || (sexCls === 'female' ? '坤造·女命' : '乾造·男命');
  h += '<div class="xg-sex-banner xg-sex-' + sexCls + '">⚧ 命主：<b>' + sexText + '</b> · 关煞按本造性别分别判定</div>';

  // 面板切换
  h += '<div class="xg-toggle">';
  h += '<span class="engine-opt active" data-mode="zhengtong" style="cursor:pointer" onclick="window._xiaoguanSwitch(this)">正统子平</span>';
  h += '<span class="engine-opt" data-mode="minjian" style="cursor:pointer" onclick="window._xiaoguanSwitch(this)">民间三十六关 / 七十二煞</span>';
  h += '</div>';

  // ── 面板 A：正统子平 ──
  h += '<div class="xg-panel" data-xg="zhengtong">';
  (xg.zhengtong || []).forEach(function(z) {
    h += '<div class="xg-zt-card">';
    h += '<div class="xg-zt-title"><span class="xg-zt-gan">' + z.dayGan + '日</span> 七杀 <b>' + z.guan + '</b>（' + z.guanWx + '）为<strong>关</strong>，<b>' + z.guanXian.join('/') + '</b> 岁关卡；偏财 <b>' + z.sha + '</b>（' + z.shaWx + '）为<strong>煞</strong>，<b>' + z.shaXian.join('/') + '</b> 岁煞期</div>';
    h += '<div class="xg-zt-shen shen-' + (z.shenQiangRuo === '身强' ? 'qiang' : 'ruo') + '">命主 ' + z.shenQiangRuo + ' · ' + (z.shenQiangRuo === '身强' ? '关煞可挡，凶象减轻' : '身弱宜慎，幼年须护') + '</div>';
    h += '<div class="xg-zt-detail">' + z.detail + '</div>';
    h += '<div class="xg-chu">📚 ' + z.chu + '</div>';
    h += '</div>';
  });
  h += '</div>';

  // ── 面板 B：民间 ──
  h += '<div class="xg-panel" data-xg="minjian" style="display:none">';

  h += '<div class="xg-sub-h">民间三十六关 · 命中 <b>' + (xg.total36 || 0) + '</b> 项</div>';
  if (!xg.minjian36 || !xg.minjian36.length) {
    h += '<div class="xg-empty">未犯三十六关，可喜。</div>';
  } else {
    xg.minjian36.forEach(function(g) {
      h += '<div class="xg-guan-card' + (g.level === '重' ? ' lv-zhong' : (g.level === '中' ? ' lv-zhong2' : '')) + (g.heavy ? ' is-heavy' : '') + '">';
      h += '<div class="xg-guan-head"><span class="xg-guan-name">' + g.idx + '. ' + g.name + '</span>';
      // 性别标签：男命专属 / 女命偏重 / 男女通用
      if (g.sexLabel) h += '<span class="xg-sex-badge xg-sex-' + (g.applySex === 'male' ? 'male' : g.applySex === 'female' ? 'female' : 'both') + '">' + g.sexLabel + '</span>';
      if (g.level) h += '<span class="xg-level xg-level-' + g.level + '">' + g.level + '</span>';
      h += '</div>';
      h += '<div class="xg-guan-trigger">触发：' + g.trigger + '</div>';
      h += '<div class="xg-guan-yiyi"><span class="xg-tag">寓意</span>' + g.yiYi + '</div>';
      h += '<div class="xg-guan-jihou"><span class="xg-tag">忌讳</span>' + g.jiHou + '</div>';
      // 性别定级提示（阎王关按性别：女命偏重/男命较轻）；其余保留原 sexNote
      if (g.sexWeight) h += '<div class="xg-guan-sex xg-weight-' + (g.sexWeight.indexOf('女') >= 0 ? 'female' : 'male') + '">⚧ ' + g.sexWeight + '</div>';
      else if (g.sexNote) h += '<div class="xg-guan-sex">⚧ ' + g.sexNote + '</div>';
      h += '<div class="xg-chu">📚 ' + g.chu + ' · ' + g.conf + '</div>';
      h += '</div>';
    });
  }

  h += '<div class="xg-sub-h">民间七十二煞子集 · 命中 <b>' + (xg.total72 || 0) + '</b> 项 <span class="xg-minyi">民俗衍生（非正统八字典籍）</span></div>';
  if (!xg.minjian72 || !xg.minjian72.length) {
    h += '<div class="xg-empty">未犯衍生煞。</div>';
  } else {
    xg.minjian72.forEach(function(s) {
      h += '<div class="xg-sha-card">';
      h += '<div class="xg-guan-head"><span class="xg-guan-name">' + s.name + '</span>';
      if (s.sexLabel) h += '<span class="xg-sex-badge xg-sex-' + (s.applySex === 'male' ? 'male' : s.applySex === 'female' ? 'female' : 'both') + '">' + s.sexLabel + '</span>';
      h += '<span class="xg-minyi">民俗衍生</span></div>';
      h += '<div class="xg-guan-trigger">触发：' + s.trigger + '</div>';
      h += '<div class="xg-guan-yiyi"><span class="xg-tag">寓意</span>' + s.yiYi + '</div>';
      h += '<div class="xg-chu">📚 ' + s.chu + ' · ' + s.conf + '</div>';
      h += '</div>';
    });
  }
  h += '</div>'; // minjian panel

  return h;
}
// 别名：nianli-ui 中 onclick 引用了 _toggleCardCollapse（带下划线）
window._toggleCardCollapse = window.toggleCardCollapse;

// ══════ 模块状态 ══════
var _lastResult = null;

// 农历月名/日名
var _LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','十一','十二'];
var _LUNAR_DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

/** 显示八字页面 */
function show() {
  var root = document.getElementById('bazi-root');
  if (!root) return;
  // 集中式切换页面根：显示八字根，隐藏其它（含 home-root）
  window.__setActivePage('bazi-root');
  var oldResult = document.getElementById('baziResultArea');
  if (oldResult) oldResult.remove();
  _highlightFab('tabBazi');
  State.emit('page:changed', 'bazi');
  // 强制重建表单 (2026-06-27: 双引擎切换需要新版 action-bar)
  root.innerHTML = buildFormHTML();
  populateFormDefaults();
  bindFormEvents();
}

// ═══ 十二时辰映射 ═══
var _SHICHEN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var _SHICHEN_TIME = ['23:30','01:30','03:30','05:30','07:30','09:30','11:30','13:30','15:30','17:30','19:30','21:30'];
function _hourToShichenIdx(h, m) {
  var t = (h||0)*60 + (m||0);
  if (t < 60) return 0;        // 0:00–0:59 子
  if (t < 180) return 1;       // 1:00–2:59 丑
  if (t < 300) return 2;       // 3:00–4:59 寅
  if (t < 420) return 3;       // 5:00–6:59 卯
  if (t < 540) return 4;       // 7:00–8:59 辰
  if (t < 660) return 5;       // 9:00–10:59 巳
  if (t < 780) return 6;       // 11:00–12:59 午
  if (t < 900) return 7;       // 13:00–14:59 未
  if (t < 1020) return 8;      // 15:00–16:59 申
  if (t < 1140) return 9;      // 17:00–18:59 酉
  if (t < 1260) return 10;     // 19:00–20:59 戌
  if (t < 1380) return 11;     // 21:00–22:59 亥
  return 0;                    // 23:00–23:59 子
}
function _syncShichenFromTime() {
  var his = $('#Cml_his'); if (!his) return;
  var parts = (his.value || '08:30').split(':');
  var h = parseInt(parts[0],10) || 0, m = parseInt(parts[1],10) || 0;
  var idx = _hourToShichenIdx(h, m);
  var cells = $$('.bazi-shichen-cell');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.toggle('active', parseInt(cells[i].getAttribute('data-idx'),10) === idx);
  }
  var hint = $('#shichenHint');
  if (hint) hint.textContent = '当前时辰：' + _SHICHEN[idx] + '时';
}

/** 构建表单 HTML — 古典卷轴 · 命主档案式（2026-07-14 重设计） */
function buildFormHTML() {
  var shichenGrid = '';
  for (var i = 0; i < _SHICHEN.length; i++) {
    shichenGrid += '<span class="bazi-shichen-cell" data-idx="' + i + '" data-time="' + _SHICHEN_TIME[i] + '">' + _SHICHEN[i] + '</span>';
  }
  return '' +
  '<div class="bazi-scroll">' +
    '<div class="bazi-scroll-rod top"></div>' +
    '<div class="bazi-form-title">八字排盘分析</div>' +
    // ── 命主档案卡 ──
    '<div class="bazi-profile-card">' +
      '<div class="bazi-avatar" id="baziAvatar">?</div>' +
      '<input id="Name_input" type="text" value="" class="bazi-name-input" placeholder="姓名">' +
      '<div class="bazi-sex-toggle" id="Sex_toggle">' +
        '<button class="bazi-sex-btn active" data-sex="1">男</button>' +
        '<button class="bazi-sex-btn" data-sex="0">女</button>' +
      '</div>' +
      '<input type="hidden" id="Sex_input" value="1">' +
      '<div class="bazi-profile-actions">' +
        '<div class="bazi-mode-pills" id="Engine_pills">' +
          '<span class="bazi-mode-pill active" data-engine="A" title="《滴天髓》顺势派">A·滴天髓</span>' +
          '<span class="bazi-mode-pill" data-engine="B" title="《子平真诠》根气派">B·子平</span>' +
        '</div>' +
        '<button class="bazi-action-btn" id="baziBtnSave">保存</button>' +
        '<button class="bazi-action-btn" id="baziBtnArchive">档案</button>' +
      '</div>' +
    '</div>' +
    // ── 表单主体 ──
    '<div class="bazi-input-form">' +
      // ── 出生时间 ──
      '<div class="bazi-section"><div class="bazi-section-label">出生时间</div>' +
      '<div class="bazi-cal-tabs">' +
        '<button class="bazi-cal-tab active" data-cal="1">公历</button>' +
        '<button class="bazi-cal-tab" data-cal="0">农历</button>' +
        '<input type="hidden" id="gnlsel" value="1">' +
      '</div>' +
      '<div class="bazi-row cols-4">' +
        '<div class="bazi-field"><label class="bazi-label">年</label>' +
          '<select id="Cml_y" class="bazi-input">' + _yearOptions() + '</select>' +
          '<input type="number" id="Cml_y_custom" class="bazi-input" placeholder="年" style="display:none" min="-4712" max="9999" disabled>' +
        '</div>' +
        '<div class="bazi-field"><label class="bazi-label">月</label>' +
          '<select id="Cml_m" class="bazi-input">' + _monthOptions(false) + '</select></div>' +
        '<div class="bazi-field"><label class="bazi-label">日</label>' +
          '<select id="Cml_d" class="bazi-input">' + _dayOptions(false) + '</select></div>' +
        '<div class="bazi-field"><label class="bazi-label">时间</label>' +
          '<input id="Cml_his" type="time" value="08:30" class="bazi-input"></div>' +
        '<div class="bazi-field"><label class="bazi-label">夏令时</label>' +
          '<select id="Dst_sel" class="bazi-input" title="1986–1991 年中国实行夏令时，期间出生北京时间实为 UTC+9，需减 1 小时为标准时再排盘。">' +
            '<option value="auto" selected>自动（1986–1991）</option>' +
            '<option value="on">强制修正</option>' +
            '<option value="off">不修正</option>' +
          '</select></div>' +
        '<div class="bazi-field"><label class="bazi-label">子时派</label>' +
          '<select id="ZiShi_sel" class="bazi-input" title="夜子时：23:00 起日柱换次日（本程序默认）。早子时：23:00 当日日柱不变，子时仍属当日。">' +
            '<option value="wan" selected>夜子时（默认）</option>' +
            '<option value="zao">早子时</option>' +
          '</select></div>' +
      '</div>' +
      '<div id="leapMonthRow" style="display:none;margin-top:4px;">' +
        '<span id="leapMonthStatus" class="bazi-leap-status"></span>' +
        '<label id="leapMonthLabel" class="bazi-leap-label" style="display:none;">' +
          '<input type="checkbox" id="chkLeapMonth" value="1"> 闰月' +
        '</label>' +
      '</div>' +
      '<div class="bazi-time-hint">' +
        '<span id="shichenHint">当前时辰：辰时</span>' +
        '<span class="bazi-now-link" id="baziNowBtn">使用当前时间</span>' +
      '</div>' +
      '<div class="bazi-shichen-grid" id="shichenGrid">' + shichenGrid + '</div>' +
      '</div>' +
      // ── 出生地点 ──
      '<div class="bazi-section"><div class="bazi-section-label">出生地点</div>' +
      '<div class="bazi-field">' +
        '<div id="regionCascaderContainer"></div>' +
        '<input type="hidden" id="Jd_input" value="116.4">' +
        '<input type="hidden" id="Wd_input" value="39.9">' +
      '</div>' +
      '<div class="bazi-recent">' +
        '<span class="bazi-recent-chip" data-prov="北京市" data-region="北京">北京</span>' +
        '<span class="bazi-recent-chip" data-prov="上海市" data-region="上海">上海</span>' +
        '<span class="bazi-recent-chip" data-prov="广东省" data-region="广州">广州</span>' +
        '<span class="bazi-recent-chip" data-prov="四川省" data-region="成都">成都</span>' +
        '<span class="bazi-recent-chip" data-prov="广东省" data-region="深圳">深圳</span>' +
      '</div>' +
      '</div>' +
      // ── 提交 ──
      '<div class="bazi-submit-row">' +
        '<button class="bazi-action-btn bazi-action-go" id="baziBtnSubmit">开始排盘</button>' +
      '</div>' +
    '</div>' +
    '<div class="bazi-scroll-rod bottom"></div>' +
  '</div>';
}

/** 填入默认值 */
function populateFormDefaults() {
  var now = new Date();
  var yEl = $('#Cml_y');
  var mEl = $('#Cml_m');
  var dEl = $('#Cml_d');
  if (yEl) yEl.value = now.getFullYear();
  if (mEl) mEl.value = now.getMonth() + 1;
  if (dEl) dEl.value = now.getDate();

  // 恢复记忆的默认城市（与“设置·默认城市”联动）
  var baziCity = _lsGet('bazi_city', '');
  if (baziCity) {
    var cityInput = $('#citySearchInput'); if (cityInput) cityInput.value = baziCity;
    var geoDisplay = $('#geoDisplay'); if (geoDisplay) geoDisplay.textContent = baziCity;
    var jdEl = $('#Jd_input'); if (jdEl) { var bj = _lsGet('bazi_jd', ''); if (bj) jdEl.value = bj; }
    var wdEl = $('#Wd_input'); if (wdEl) { var bw = _lsGet('bazi_wd', ''); if (bw) wdEl.value = bw; }
  }
}

/** 绑定表单事件 */
function bindFormEvents() {
  var submitBtn = $('#baziBtnSubmit');
  if (submitBtn && !submitBtn._bound) {
    submitBtn._bound = true;
    submitBtn.addEventListener('click', doCalculate);
  }
  // 年份选择器
  var ySel = $('#Cml_y');
  if (ySel && !ySel._bound) {
    ySel._bound = true;
  }
  // 引擎切换按钮（命主档案卡内 pills）
  var engineOpts = $$('.bazi-mode-pill');
  for (var ei = 0; ei < engineOpts.length; ei++) {
    if (!engineOpts[ei]._bound) {
      engineOpts[ei]._bound = true;
      engineOpts[ei].addEventListener('click', function() {
        var all = $$('.bazi-mode-pill');
        for (var aj = 0; aj < all.length; aj++) all[aj].classList.remove('active');
        this.classList.add('active');
        // 如果已有结果，立即用另一套引擎数据重新渲染（无需重新提交）
        if (_lastResult) {
          var engine = this.getAttribute('data-engine');
          var data = Object.assign({}, _lastResult);
          if (engine === 'B') {
            data.cards = data.cardsV2 || data.cards;
            data.geName = data.geNameV2 || data.geName;
            data.congGe = data.congGeV2 || data.congGe;
          }
          renderResult(data, { skipWrapToggle: true });
        }
      });
    }
  }

  // 性别按钮切换（_bound 守卫防止 show() 重复调用累积监听器）
  var sexBtns = document.querySelectorAll('.bazi-sex-btn');
  for (var si = 0; si < sexBtns.length; si++) {
    if (sexBtns[si]._bound) continue;
    sexBtns[si]._bound = true;
    sexBtns[si].addEventListener('click', function() {
      var val = this.dataset.sex;
      for (var sj = 0; sj < sexBtns.length; sj++) sexBtns[sj].classList.remove('active');
      this.classList.add('active');
      var hidden = $('#Sex_input');
      if (hidden) hidden.value = val;
    });
  }

  // 历法 tab 切换 → 更新月/日选项 + 闰月行
  var calTabs = document.querySelectorAll('.bazi-cal-tab');
  for (var ci = 0; ci < calTabs.length; ci++) {
    if (calTabs[ci]._bound) continue;
    calTabs[ci]._bound = true;
    calTabs[ci].addEventListener('click', function() {
      var val = this.dataset.cal;
      for (var cj = 0; cj < calTabs.length; cj++) calTabs[cj].classList.remove('active');
      this.classList.add('active');
      var hidden = $('#gnlsel');
      if (hidden) hidden.value = val;
      _updateMonthDayOptions();
    });
  }

  // 年份变更 → 农历模式下重查闰月
  var ySel = $('#Cml_y');
  if (ySel && !ySel._boundYear) {
    ySel._boundYear = true;
    ySel.addEventListener('change', function() {
      var calType = ($('#gnlsel') || {}).value || '1';
      if (calType === '0') _checkLeapMonth();
    });
  }

  var saveBtn = $('#baziBtnSave');
  if (saveBtn && !saveBtn._bound) {
    saveBtn._bound = true;
    saveBtn.addEventListener('click', doSave);
  }

  var archiveBtn = $('#baziBtnArchive');
  if (archiveBtn && !archiveBtn._bound) {
    archiveBtn._bound = true;
    archiveBtn.addEventListener('click', function() {
      import('./archive-ui.js').then(function(mod) {
        var archiveMod = (mod && mod.default) ? mod.default : mod;
        if (archiveMod && archiveMod.show) archiveMod.show();
      });
    });
  }

  // 省→地区二级联动（优先）
  if (typeof initRegionCascader === 'function') {
    initRegionCascader('regionCascaderContainer');
  }
  // 回退：卡片网格
  else if (typeof initGeoCards === 'function') {
    initGeoCards('geoCardContainer');
  }
  // 回退：旧文本框搜索
  else if (typeof initCitySearch === 'function') {
    initCitySearch();
  }

  // ── 十二时辰网格 click ──
  var shichenGrid = $('#shichenGrid');
  if (shichenGrid && !shichenGrid._bound) {
    shichenGrid._bound = true;
    shichenGrid.addEventListener('click', function(e) {
      var cell = e.target.closest('.bazi-shichen-cell');
      if (!cell) return;
      var t = cell.getAttribute('data-time');
      var his = $('#Cml_his');
      if (his) his.value = t;
      _syncShichenFromTime();
    });
  }
  // ── 时间 input 变化同步时辰 ──
  var hisEl = $('#Cml_his');
  if (hisEl && !hisEl._boundShi) {
    hisEl._boundShi = true;
    hisEl.addEventListener('input', _syncShichenFromTime);
  }
  // ── 使用当前时间 ──
  var nowBtn = $('#baziNowBtn');
  if (nowBtn && !nowBtn._bound) {
    nowBtn._bound = true;
    nowBtn.addEventListener('click', function() {
      var now = new Date();
      var yEl = $('#Cml_y'), mEl = $('#Cml_m'), dEl = $('#Cml_d'), hhEl = $('#Cml_his');
      if (yEl) yEl.value = now.getFullYear();
      if (mEl) mEl.value = now.getMonth() + 1;
      if (dEl) dEl.value = now.getDate();
      if (hhEl) hhEl.value = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
      _syncShichenFromTime();
      if ((($('#gnlsel') || {}).value || '1') === '0') _updateMonthDayOptions();
    });
  }
  // ── 最近城市快捷 ──
  var chips = $$('.bazi-recent-chip');
  for (var ri = 0; ri < chips.length; ri++) {
    if (chips[ri]._bound) continue;
    chips[ri]._bound = true;
    chips[ri].addEventListener('click', function() {
      var prov = this.getAttribute('data-prov'), region = this.getAttribute('data-region');
      if (window._rcSelectByRegion) window._rcSelectByRegion(prov, region);
    });
  }
  // ── 初始同步时辰高亮 ──
  _syncShichenFromTime();

  // ── 姓名输入同步头像 ──
  var nameInput = $('#Name_input');
  var avatar = $('#baziAvatar');
  if (nameInput && avatar && !nameInput._boundAvatar) {
    nameInput._boundAvatar = true;
    function _updateAvatar() {
      var v = (nameInput.value || '').trim();
      avatar.textContent = v ? v.charAt(0) : '?';
    }
    nameInput.addEventListener('input', _updateAvatar);
    _updateAvatar();
  }
}

/** 年份选项 */
function _yearOptions() {
  var now = new Date();
  var thisYear = now.getFullYear();
  var s = '';
  // 1900~2100 用 select，超出范围用 input 手动输入（-4712~9999）
  for (var yy = 2100; yy >= 1900; yy--) {
    s += '<option value="' + yy + '"' + (yy === 1984 ? ' selected' : '') + '>' + yy + '年</option>';
  }
  return s;
}
/** 月份选项（公历=数字月，农历=中文月名） */
function _monthOptions(isLunar) {
  var s = '';
  for (var mm = 1; mm <= 12; mm++) {
    s += '<option value="' + mm + '">' + (isLunar ? _LUNAR_MONTHS[mm-1] : mm) + '月</option>';
  }
  return s;
}
/** 日选项（公历=1-31日，农历=初一~三十） */
function _dayOptions(isLunar) {
  var s = '';
  var maxD = isLunar ? 30 : 31;
  for (var dd = 1; dd <= maxD; dd++) {
    s += '<option value="' + dd + '"' + (dd === 15 ? ' selected' : '') + '>' + (isLunar ? _LUNAR_DAYS[dd-1] : dd + '日') + '</option>';
  }
  return s;
}
/** 历法切换时更新月/日下拉选项并智能检测闰月 */
function _updateMonthDayOptions() {
  var calType = ($('#gnlsel') || {}).value || '1';
  var isLunar = calType === '0';
  var mSel = $('#Cml_m'), dSel = $('#Cml_d');
  var curM = mSel ? parseInt(mSel.value, 10) || 1 : 1;
  var curD = dSel ? parseInt(dSel.value, 10) || 15 : 15;
  if (mSel) mSel.innerHTML = _monthOptions(isLunar);
  if (dSel) dSel.innerHTML = _dayOptions(isLunar);
  if (mSel) mSel.value = Math.min(curM, 12);
  if (dSel) {
    var maxD = isLunar ? 30 : 31;
    dSel.value = Math.min(curD, maxD);
  }
  if (isLunar) _checkLeapMonth(); else _hideLeapRow();
}

/** 获取用户选择的年份（支持 select + 自定义输入） */
function _getYear() {
  return parseInt(($('#Cml_y') || {}).value, 10);
}

/** 查询闰月 API，显示明确状态（无静默降级） */
var _leapCheckTimer = null;
function _checkLeapMonth() {
  var y = _getYear();
  if (!y || y < -4712) { _showLeapStatus('年份无效'); return; }
  _showLeapStatus('查询中…');
  clearTimeout(_leapCheckTimer);
  _leapCheckTimer = setTimeout(function() {
    API.get('/calendar/leap-month?y=' + y).then(function(res) {
      if (res.ok && res.data && res.data.leap > 0) {
        _showLeapRow(res.data.leap, res.data.leapName);
      } else if (res.ok && res.data) {
        _showLeapNone();
      } else {
        _showLeapStatus('闰月查询失败');
      }
    }).catch(function(e) {
      _showLeapStatus('闰月查询失败: ' + (e.message || '网络错误'));
    });
  }, 200);
}

function _showLeapRow(leapMonth, leapName) {
  var row = document.getElementById('leapMonthRow');
  var chk = document.getElementById('chkLeapMonth');
  var status = document.getElementById('leapMonthStatus');
  var label = document.getElementById('leapMonthLabel');
  var curM = parseInt(($('#Cml_m') || {}).value, 10) || 1;
  var name = leapName || ('闰' + _LUNAR_MONTHS[leapMonth-1] + '月');
  if (row) row.style.display = '';
  if (status) status.textContent = '';
  if (label) {
    label.style.display = 'flex';
    label.innerHTML = '<input type="checkbox" id="chkLeapMonth" value="1"' + (chk && chk.checked ? ' checked' : '') + '> ' + name;
  }
  // 如果当前月份不等于闰月，取消勾选
  if (document.getElementById('chkLeapMonth') && curM !== leapMonth) {
    document.getElementById('chkLeapMonth').checked = false;
  }
}

function _showLeapNone() {
  var row = document.getElementById('leapMonthRow');
  var status = document.getElementById('leapMonthStatus');
  var label = document.getElementById('leapMonthLabel');
  if (row) row.style.display = '';
  if (status) { status.textContent = '本年无闰月'; status.style.color = 'var(--text-muted)'; }
  if (label) label.style.display = 'none';
}

function _showLeapStatus(msg) {
  var row = document.getElementById('leapMonthRow');
  var status = document.getElementById('leapMonthStatus');
  var label = document.getElementById('leapMonthLabel');
  if (row) row.style.display = '';
  if (status) { status.textContent = msg; status.style.color = msg.indexOf('失败') >= 0 ? 'var(--color-cinnabar)' : 'var(--text-muted)'; }
  if (label) label.style.display = 'none';
}

function _hideLeapRow() {
  var row = document.getElementById('leapMonthRow');
  if (row) row.style.display = 'none';
}

/** 初始化城市搜索 */
function initCitySearch() {
  var input = $('#citySearchInput');
  var results = $('#citySearchResults');
  var geoDisplay = $('#geoDisplay');
  var JWv = window._JWv;
  if (!input || !results || !JWv) return;

  var cities = [];
  for (var i = 0; i < JWv.length; i++) {
    var prov = JWv[i];
    for (var j = 1; j < prov.length; j++) {
      cities.push({ name: prov[j].substr(4), code: prov[j].substr(0, 4), province: prov[0] });
    }
  }

  var selectedCity = null;

  function selectCity(city) {
    selectedCity = city;
    input.value = city.province + ' ' + city.name;
    results.style.display = 'none';
    if (window._JWdecode) {
      var v = new window._JWdecode(city.code);
      var jd = Math.round((-v.J * 180 / Math.PI) * 100) / 100;
      var wd = Math.round((v.W * 180 / Math.PI) * 100) / 100;
      $('#Jd_input').value = jd;
      $('#Wd_input').value = wd;
      if (geoDisplay) geoDisplay.textContent = city.province + ' ' + city.name;
      // 记忆默认城市（供“设置·默认城市”联动）
      _lsSet('bazi_jd', String(jd));
      _lsSet('bazi_wd', String(wd));
      _lsSet('bazi_city', city.province + ' ' + city.name);
    }
  }

  var timer;
  input.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      var q = input.value.trim();
      if (!q || (selectedCity && q === selectedCity.province + ' ' + selectedCity.name)) {
        results.style.display = 'none'; return;
      }
      var matches = [];
      for (var k = 0; k < cities.length; k++) {
        if (cities[k].name.indexOf(q) >= 0 || cities[k].province.indexOf(q) >= 0) {
          matches.push(cities[k]);
          if (matches.length >= 8) break;
        }
      }
      if (matches.length === 0) { results.style.display = 'none'; return; }
      var html = '';
      for (var m = 0; m < matches.length; m++) {
        html += '<div class="bazi-city-search-item" data-idx="' + m + '">' +
          '<span class="city-name">' + matches[m].name + '</span>' +
          '<span class="city-prov">' + matches[m].province + '</span></div>';
      }
      results.innerHTML = html;
      results.style.display = 'block';
      var items = results.querySelectorAll('.bazi-city-search-item');
      for (var n = 0; n < items.length; n++) {
        (function(idx) {
          items[idx].addEventListener('click', function() { selectCity(matches[idx]); });
        })(n);
      }
    }, 350);
  });

  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = 'none';
    }
  });
}

/** 执行排盘 */
async function doCalculate() {
  var submitBtn = $('#baziBtnSubmit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '计算中...'; }

  try {
    var name = ($('#Name_input') || {}).value || '未知';
    var sex = ($('#Sex_input') || {}).value === '0' ? '女' : '男';
    var calType = ($('#gnlsel') || {}).value === '0' ? 'nongli' : 'gongli';
    var y = _getYear();
    var m = parseInt(($('#Cml_m') || {}).value, 10);
    var d = parseInt(($('#Cml_d') || {}).value, 10);
    var _ct = parseClockTime(($('#Cml_his') || {}).value || '08:30');
    var h = _ct.h, min = _ct.min;
    var jd = parseFloat(($('#Jd_input') || {}).value) || 116.4;
    var wd = parseFloat(($('#Wd_input') || {}).value) || 39.9;
    // 闰月标记（仅农历时有效）
    var isLeap = ($('#chkLeapMonth') || {}).checked ? true : false;

    if (!y || !m || !d) {
      alert('请输入完整的出生日期');
      return;
    }

    var payload = {
      name: name, sex: sex, calType: calType,
      y: y, m: m, d: d, h: h, min: min,
      jd: jd, wd: wd,
      dst: (document.getElementById('Dst_sel') || {}).value || 'auto',
      ziShi: (document.getElementById('ZiShi_sel') || {}).value || 'wan'
    };
    if (calType === 'nongli') payload.isLeap = isLeap;

    var result = await API.post('/bazi', payload);

    if (result.ok) {
      _lastResult = result.data;
      State.emit('bazi:result', {
        ob: {
          b1: result.data.b1, b2: result.data.b2,
          b3: result.data.b3, b4: result.data.b4,
          dayun: result.data.dayun || {}
        },
        MGxh: result.data.MGxh || 0
      });
      renderResult(result.data);
    } else {
      alert('排盘失败: ' + (result.error || '未知错误'));
    }
  } catch(e) {
    alert('请求失败: ' + e.message);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ti ti-check"></i> 开始排盘'; }
  }
}

/** 渲染排盘结果 */
function renderResult(data, opts) {
  opts = opts || {};
  var baziRoot = document.getElementById('bazi-root');
  if (!baziRoot) return;
  var p = data.pillars || {};

  if (!opts.skipWrapToggle) {
    var calRoot = document.getElementById('cal-root');
    if (calRoot) calRoot.style.display = 'none';
  }

  var resultEl = document.getElementById('baziResultArea');
  if (!resultEl) {
    resultEl = document.createElement('div');
    resultEl.id = 'baziResultArea';
    resultEl.style.cssText = 'margin-top:1rem;padding-top:1rem;border-top:2px solid var(--border-gold);';
    baziRoot.appendChild(resultEl);
  }
  var html = '';

  	  // ══════ 基本信息卡片 — 古风卷轴式 ══════
	  var rb = data.riBiao || {};
	  var geoDisplay = document.getElementById("geoDisplay");
	  var geoText = geoDisplay ? geoDisplay.textContent : "";
	  var jq = rb.solarTerms || {};
	  var jqText = "";
	  if (jq.termA) {
	    // 智能前后表述：根据天数值正负决定"前"/"后"
	    var _dA = jq.daysAfterA, _hA = jq.hoursAfterA;
	    var _preA = _dA < 0 || (_dA === 0 && _hA < 0) ? "前" : "后";
	    var _dB = jq.daysBeforeB, _hB = jq.hoursBeforeB;
	    var _preB = _dB < 0 || (_dB === 0 && _hB < 0) ? "后" : "前";
	    jqText = "出生于" + jq.termA + _preA + "<span class=\"ri-biao-red\">" + Math.abs(_dA) + "</span>天" + Math.abs(_hA) + "小时，" +
	      jq.termB + _preB + "<span class=\"ri-biao-red\">" + Math.abs(_dB) + "</span>天" + Math.abs(_hB) + "小时";
	  }
	  var _biRow = function(label, val, accent) {
	    var cls = accent ? " bi-row bi-row-accent" + accent : " bi-row";
	    return "<div class=\"" + cls + "\"><span class=\"bi-label\">" + label + "</span><span class=\"bi-val\">" + (val || "—") + "</span></div>";
	  };
	  var _biRowLg = function(label, val) {
	    return "<div class=\"bi-row bi-row-accent-gold\"><span class=\"bi-label\">" + label + "</span><span class=\"bi-val bi-val-large\">" + (val || "—") + "</span></div>";
	  };

	  html += "<div class=\"basic-info-card\">";
	  html += "<div class=\"basic-info-header\"><i class=\"ti ti-id\"></i> 基本信息</div>";
	  html += "<div class=\"basic-info-body\">";

	  // — 身份 —
	  html += "<div class=\"bi-section\">";
	  html += _biRow("姓名", data.name);
	  html += _biRow("性别", data.sex === "男" ? "乾造" : "坤造");
	  html += "</div>";

	  // — 时间 —
	  html += "<div class=\"bi-divider\"><span>时 间</span></div>";
	  html += "<div class=\"bi-section\">";
	  html += _biRowLg("农历", data.lunarDate);
	  html += _biRow("阳历", rb.gongliDate);
	  html += _biRow("真太阳时", rb.ztyDate || "与阳历一致");
	  html += "</div>";

	  // — 属相 —
	  html += "<div class=\"bi-divider\"><span>属 相</span></div>";
	  html += "<div class=\"bi-section\">";
	  html += "<div class=\"bi-grid-2\">";
	  html += _biRow("生肖", "<span class=\"bi-tag bi-tag-gold\">" + (rb.shengXiao || "—") + "</span>");
	  html += _biRow("星座", "<span class=\"bi-tag bi-tag-teal\">" + (rb.xingZuo || "—") + "</span>");
	  html += _biRow("星宿", rb.xiu);
	  html += _biRow("空亡", rb.kongWang);
	  html += "</div></div>";

	  // — 星命 —
	  html += "<div class=\"bi-divider\"><span>星 命</span></div>";
	  html += "<div class=\"bi-section\">";
	  html += "<div class=\"bi-grid-2\">";
	  html += _biRow("胎元", rb.taiYuan);
	  html += _biRow("胎息", rb.taiXi);
	  html += _biRow("命宫", rb.mingGong);
	  html += _biRow("身宫", rb.shenGong);
	  html += _biRow("命卦", rb.mingGua);
	  html += _biRow("人元", rb.renYuan);
	  html += "</div></div>";

	  // — 时地 —
	  html += "<div class=\"bi-divider\"><span>时 地</span></div>";
	  html += "<div class=\"bi-section\">";
	  html += _biRow("出生地区", geoText || "—");
	  html += "</div>";
	  if (jqText) {
	    html += "<div class=\"bi-row-jieqi\">🌱 <strong>出生节气</strong>&ensp;" + jqText + "</div>";
	  }

	  html += "</div></div>";


  // 五行分布条形图 — 插入到五行力量卡片(bz_wuxing)正上方
  // 优先采用权威日主强弱引擎的五行得分（与 A/B 比值同源），数组转为 _renderWxDist 所需对象
  var wxScores = null;
  if (data.dayMasterScores) {
    var _dms = data.dayMasterScores;
    wxScores = { mu: _dms[0], huo: _dms[1], tu: _dms[2], jin: _dms[3], shui: _dms[4] };
  } else {
    wxScores = data.wuxingScores || (data.congGe && data.congGe.scores) || null;
  }
  var wxDistHtml = '';
  if (wxScores) {
    wxDistHtml += '<div class="card" data-card-id="wx-dist">';
    wxDistHtml += '<div class="card-header"><span><i class="ti ti-chart-dots"></i> 五行力量分布 <em class="wx-dist-tag">日主强弱明细</em></span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
    wxDistHtml += '<div class="card-body">';
    var wxDetails = data.wuxingDetails || null;
    var wxLevels = data.wuxingLevels || null;
    wxDistHtml += _renderWxDist(wxScores);
    wxDistHtml += '</div></div>';
  }

  // ══════ 古籍章節式卡片渲染 ══════
  // 选中引擎：读取 toggle 状态
  var activeEngine = 'A';
  var activeOpt = document.querySelector('.bazi-mode-pill.active');
  if (activeOpt) activeEngine = activeOpt.getAttribute('data-engine') || 'A';
  var cards = (activeEngine === 'B' && data.cardsV2 && data.cardsV2.length)
    ? data.cardsV2 : (data.cards || []);
  // 同时更新格局名和从格数据
  if (activeEngine === 'B') {
    data.geName = data.geNameV2 || data.geName;
    data.congGe = data.congGeV2 || data.congGe;
  }
  if (cards && cards.length) {
    // ── 章節定義 ──
    var CHAPTERS = [
      { key: 'core',    label: '核心命盘', sub: '四柱 · 大运 · 流年', collapsed: true },
      { key: 'pattern', label: '格局分析', sub: '日主 · 格局 · 用神', collapsed: true },
      { key: 'element', label: '五行十神', sub: '生克 · 制化 · 干支', collapsed: true },
      { key: 'ref',     label: '命理参考', sub: '胎元 · 神煞 · 称骨', collapsed: true }
    ];
    var CH_NUM = ['壹','貳','叄','肆'];

    // ── 卡片歸章（MAP 提升至外部避免每次調用重建） ──
    var _CHAPTER_PREFIX = ['bt_', 'baziLiunian', 'baziLiuyue', 'baziMinggong', 'bzjc'];
    var _CHAPTER_IDS = [
      null, // core: 前綴匹配，見上方
      ['bz_rizhu', 'bz_geju', 'bz_xiyong', 'bz_congge', 'bz_zonghe'],
      ['bz_wuxing', 'bz_shengke', 'bz_shishen', 'bz_tiangan'],
      ['bz_taiyuan', 'bz_jishen', 'bz_zhongliang', 'bz_minggong', 'bz_sizhu', 'bz_riduan', 'bz_tianluodiwang', 'bz_kuigang']
    ];
    function _chapterIdx(cid) {
      for (var p = 0; p < _CHAPTER_PREFIX.length; p++) {
        if (cid.indexOf(_CHAPTER_PREFIX[p]) === 0) return 0;
      }
      for (var g = 1; g < _CHAPTER_IDS.length; g++) {
        if (_CHAPTER_IDS[g].indexOf(cid) !== -1) return g;
      }
      return -1;
    }

    var buckets = [[], [], [], []], unassigned = [];
    for (var ci = 0; ci < cards.length; ci++) {
      var gi = _chapterIdx(cards[ci].id);
      (gi >= 0 && gi < 4 ? buckets[gi] : unassigned).push(cards[ci]);
    }

    // ── 渲染章節結構 ──
    for (var bg = 0; bg < buckets.length; bg++) {
      var bucket = buckets[bg];
      if (!bucket.length) continue;
      var ch = CHAPTERS[bg];
      var cls = ch.collapsed ? ' ch-collapsed' : '';
      html += '<div class="chapter' + cls + '" data-chapter="' + ch.key + '">';
      html += '<div class="chapter-head">';
      html += '<div class="ch-marker ch-marker-' + ch.key + '"><span>' + CH_NUM[bg] + '</span></div>';
      html += '<div class="ch-info"><div class="ch-title">' + ch.label + '</div><div class="ch-sub">' + ch.sub + '</div></div>';
      html += '<div class="ch-tail"><span class="ch-count">' + bucket.length + ' 则</span><i class="ti ti-chevron-down ch-arrow"></i></div>';
      html += '</div>';
      html += '<div class="chapter-body"><div class="ch-rule"></div>';
      html += '<div class="ch-content" data-ch-content="' + ch.key + '"></div>';
      html += '</div></div>';
    }
    html += '<div data-ch-unassigned></div>';
  }
  // ══════ 第伍章 · 小儿关煞（常显，独立于 cards 桶，数据来自 xiaoErGuanSha） ══════
  if (data.xiaoErGuanSha) {
    var xg = data.xiaoErGuanSha;
    var xgCount = (xg.total36 || 0) + (xg.total72 || 0);
    html += '<div class="chapter ch-xiaoguan" data-chapter="xiaoguan">';
    html += '<div class="chapter-head">';
    html += '<div class="ch-marker ch-marker-xiaoguan"><span>伍</span></div>';
    html += '<div class="ch-info"><div class="ch-title">小儿关煞</div><div class="ch-sub">正统子平 · 民间关煞</div></div>';
    html += '<div class="ch-tail"><span class="ch-count">' + xgCount + ' 项</span><i class="ti ti-chevron-down ch-arrow"></i></div>';
    html += '</div>';
    html += '<div class="chapter-body"><div class="ch-rule"></div>';
    html += '<div class="ch-content" data-ch-content="xiaoguan"></div>';
    html += '</div></div>';
  }

  if (data.bzinfo && !(cards && cards.length)) {
    // 回退：DOM 手术
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.bzinfo;
    if (wxDistHtml) {
      var wuxingMarker = tempDiv.querySelector('[data-card-id="bz_wuxing"]');
      if (wuxingMarker) {
        var parentCard = wuxingMarker.closest('.card');
        if (parentCard && parentCard.parentNode) {
          var wxFragment = document.createRange().createContextualFragment(wxDistHtml);
          parentCard.parentNode.insertBefore(wxFragment, parentCard);
        }
      } else {
        tempDiv.insertAdjacentHTML('beforeend', wxDistHtml);
      }
    }
    html += tempDiv.innerHTML;
  }

  resultEl.innerHTML = html;
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ══════ DOM 注入卡片內容 + 默認折疊 + 狀態記憶 ══════
  (function _injectChapterContent() {
    var wxInjected = false;
    for (var g = 0; g < buckets.length; g++) {
      var el = resultEl.querySelector('.ch-content[data-ch-content="' + CHAPTERS[g].key + '"]');
      if (!el) continue;
      var h = '';
      for (var i = 0; i < buckets[g].length; i++) {
        if (buckets[g][i].id === 'bz_wuxing' && wxDistHtml) { h += wxDistHtml; wxInjected = true; }
        h += buckets[g][i].body;
      }
      el.innerHTML = h;
    }
    // ── 第伍章 小儿关煞 内容注入 ──
    if (data.xiaoErGuanSha) {
      var xgEl = resultEl.querySelector('.ch-content[data-ch-content="xiaoguan"]');
      if (xgEl) xgEl.innerHTML = _renderXiaoErGuanSha(data.xiaoErGuanSha);
    }
    var ua = resultEl.querySelector('[data-ch-unassigned]');
    if (ua && unassigned.length) {
      var uh = '';
      for (var j = 0; j < unassigned.length; j++) uh += unassigned[j].body;
      ua.innerHTML = uh;
    }
    if (wxDistHtml && !wxInjected) {
      var last = resultEl.querySelector('.ch-content:last-of-type');
      if (last) last.insertAdjacentHTML('beforeend', wxDistHtml);
    }

    // ── 移除服務端注入的 inline onclick，避免與事件委派雙重toggle ──
    var inlineHdrs = resultEl.querySelectorAll('.card-header[onclick]');
    for (var hi = 0; hi < inlineHdrs.length; hi++) {
      inlineHdrs[hi].removeAttribute('onclick');
    }

    // ── 全局默認折疊所有數據卡片 ──
    var allCards = resultEl.querySelectorAll('.card[data-card-id]');
    for (var ac = 0; ac < allCards.length; ac++) {
      allCards[ac].classList.add('collapsed');
    }

    // ── 恢復用戶展開的卡片（localStorage 記憶） ──
    var expanded = [];
    try { expanded = JSON.parse(localStorage._bazi_cards_expanded || '[]'); } catch(e) {}
    for (var ec = 0; ec < expanded.length; ec++) {
      var cardEl = resultEl.querySelector('.card[data-card-id="' + expanded[ec] + '"]');
      if (cardEl) cardEl.classList.remove('collapsed');
    }
  })();

  // 統一事件委派：章節折疊 + 卡片折疊（含狀態持久化）
  // 只设置一次（innerHTML 替换后子元素全部重建，但事件委托在父容器上无需重建）
  if (!resultEl._cardClickHandler) {
    resultEl._cardClickHandler = function(e) {
      var chHead = e.target.closest('.chapter-head');
      if (chHead) {
        var chapter = chHead.closest('.chapter');
        if (chapter) chapter.classList.toggle('ch-collapsed');
        return;
      }
      var cardHead = e.target.closest('.card-header');
      if (cardHead) {
        var card = cardHead.closest('.card');
        if (!card) return;
        card.classList.toggle('collapsed');
        // 持久化卡片折疊狀態
        var cid = card.getAttribute('data-card-id');
        if (cid) {
          try {
            var exp = JSON.parse(localStorage._bazi_cards_expanded || '[]');
            var idx = exp.indexOf(cid);
            if (card.classList.contains('collapsed')) {
              if (idx !== -1) exp.splice(idx, 1);  // 折疊→移出列表
            } else {
              if (idx === -1) exp.push(cid);        // 展開→加入列表
            }
            localStorage._bazi_cards_expanded = JSON.stringify(exp);
          } catch(e) {}
        }
      }
    };
    resultEl.addEventListener('click', resultEl._cardClickHandler);
  }
}

function doSave() {
  if (!_lastResult) { alert('请先排盘'); return; }
  import('./archive-ui.js').then(function(mod) {
    var archiveMod = (mod && mod.default) ? mod.default : mod;
    if (archiveMod && archiveMod.saveCurrent) {
      var ok = archiveMod.saveCurrent({
        name: ($('#Name_input') || {}).value || '未知',
        sex: ($('#Sex_input') || {}).value === '0' ? '女' : '男',
        pillars: _lastResult.pillars || {},
        bzInfo: _lastResult.bzInfo || '', lunarDate: _lastResult.lunarDate || '',
        jieQi: _lastResult.jieQi || '', zhenTaiYang: _lastResult.zhenTaiYang || '',
        jiShi: _lastResult.jiShi || '', geName: _lastResult.geName || '',
        congGe: _lastResult.congGe || {}, wuxingScores: _lastResult.wuxingScores || null,
        bzinfo: '', dayun: _lastResult.dayun || null,
        b1: _lastResult.b1, b2: _lastResult.b2, b3: _lastResult.b3, b4: _lastResult.b4,
        MGxh: _lastResult.MGxh || 0,
        riBiao: _lastResult.riBiao || null,
        cards: _lastResult.cards || null,
        // V2 引擎数据
        cardsV2: _lastResult.cardsV2 || null,
        congGeV2: _lastResult.congGeV2 || null,
        geNameV2: _lastResult.geNameV2 || null,
        // 当前选中引擎
        selectedEngine: (document.querySelector('.bazi-mode-pill.active') || {}).getAttribute('data-engine') || 'A',
        wuxingPct: _lastResult.wuxingPct || null,
        wuxingLevels: _lastResult.wuxingLevels || null,
        wuxingDetails: _lastResult.wuxingDetails || null
      });
      alert(ok ? '命盘已保存！' : '保存失败');
    }
  });
}

/** 五行分布条形图（wuxingScores: {mu,huo,tu,jin,shui}） */
function _renderWxDist(scores) {
  var order = [{k:'mu',n:'木'},{k:'huo',n:'火'},{k:'tu',n:'土'},{k:'jin',n:'金'},{k:'shui',n:'水'}];
  var wxVar = {'木':'--bt-gan-wood','火':'--bt-gan-fire','土':'--bt-gan-earth','金':'--bt-gan-metal','水':'--bt-gan-water'};  // 五行色统一引用 --bt-gan-* token（与八字细盘同问真色板，消除 Material 通用色硬编码）
  var total = 0;
  for (var i = 0; i < order.length; i++) { total += scores[order[i].k] || 0; }
  if (total === 0) total = 1;
  var html = '<div class="wx-bar-wrap">';
  for (var i = 0; i < order.length; i++) {
    var o = order[i], v = scores[o.k] || 0, pct = Math.round(v / total * 100);
    var color = 'var(' + wxVar[o.n] + ')';
    html += '<div class="wx-bar-item">';
    html += '<span class="wx-bar-label" style="color:' + color + '">' + o.n + '</span>';
    html += '<span class="wx-bar-bg"><span class="wx-bar-fill" style="width:' + pct + '%;background:' + color + ';"></span></span>';
    html += '<span class="wx-bar-pct">' + pct + '%</span>';
    html += '<span class="wx-bar-val">' + v.toFixed(1) + '</span>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

export default { show: show, renderResult: renderResult };
