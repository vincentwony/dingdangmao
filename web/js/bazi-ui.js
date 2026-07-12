// web/js/bazi-ui.js — 八字排盘模块
// 表单输入 + API 调用 + 结果渲染

import { State } from './state.js';
import { API } from './api.js';
import { $, $$, _highlightFab, closeFullDetail } from './dom-helpers.js';

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

window.toggleCardCollapse = function(el) {
  var card = el.closest('.card');
  if (card) card.classList.toggle('collapsed');
};
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
  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'none';
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  var root = document.getElementById('bazi-root');
  if (!root) return;
  var oldResult = document.getElementById('baziResultArea');
  if (oldResult) oldResult.remove();
  root.style.display = 'block';
  _highlightFab('tabBazi');
  State.emit('page:changed', 'bazi');
  // 强制重建表单 (2026-06-27: 双引擎切换需要新版 action-bar)
  root.innerHTML = buildFormHTML();
  populateFormDefaults();
  bindFormEvents();
}

/** 构建表单 HTML — 2026-06-29 美学重设计 */
function buildFormHTML() {
  return '<div class="bazi-header">' +
    '<div class="bazi-title">八字排盘分析</div>' +
    '<div class="bazi-action-bar">' +
      '<span class="engine-toggle">' +
        '<span class="engine-opt active" data-engine="A" title="《滴天髓》顺势派">A·滴天髓</span>' +
        '<span class="engine-opt" data-engine="B" title="《子平真诠》根气派">B·子平</span>' +
      '</span>' +
      '<button class="bazi-action-btn" id="baziBtnSave"><i class="ti ti-device-floppy"></i> 保存</button>' +
      '<button class="bazi-action-btn" id="baziBtnArchive"><i class="ti ti-archive"></i> 档案</button>' +
    '</div>' +
  '</div>' +
  '<div class="bazi-input-form">' +
    '<div class="bazi-card">' +
      '<div class="bazi-card-body">' +
        // ── 区块1：排盘人信息 ──
        '<div class="bazi-section"><div class="bazi-section-label">排盘人</div>' +
        '<div class="bazi-row cols-2">' +
          '<div class="bazi-field"><label class="bazi-label">姓名</label>' +
            '<input id="Name_input" type="text" value="未知" class="bazi-input" placeholder="姓名"></div>' +
          '<div class="bazi-field"><label class="bazi-label">性别</label>' +
            '<div class="bazi-sex-toggle" id="Sex_toggle">' +
              '<button class="bazi-sex-btn active" data-sex="1"><i class="ti ti-mars"></i> 男</button>' +
              '<button class="bazi-sex-btn" data-sex="0"><i class="ti ti-venus"></i> 女</button>' +
            '</div>' +
            '<input type="hidden" id="Sex_input" value="1">' +
          '</div>' +
        '</div></div>' +
        // ── 区块2：出生时间 ──
        '<div class="bazi-section"><div class="bazi-section-label">出生时间</div>' +
        '<div class="bazi-cal-tabs">' +
          '<button class="bazi-cal-tab active" data-cal="1"><i class="ti ti-calendar"></i> 公历</button>' +
          '<button class="bazi-cal-tab" data-cal="0"><i class="ti ti-moon"></i> 农历</button>' +
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
        '</div>' +
        '<div id="leapMonthRow" style="display:none;margin-top:4px;">' +
          '<span id="leapMonthStatus" class="bazi-leap-status"></span>' +
          '<label id="leapMonthLabel" class="bazi-leap-label" style="display:none;">' +
            '<input type="checkbox" id="chkLeapMonth" value="1"> 闰月' +
          '</label>' +
        '</div></div>' +
        // ── 区块3：出生地点 ──
        '<div class="bazi-section"><div class="bazi-section-label">出生地点</div>' +
        '<div class="bazi-field">' +
          '<div id="regionCascaderContainer"></div>' +
          '<input type="hidden" id="Jd_input" value="116.4">' +
          '<input type="hidden" id="Wd_input" value="39.9">' +
        '</div></div>' +
        // ── 提交 ──
        '<div class="bazi-submit-row">' +
          '<button class="bazi-action-btn bazi-action-go" id="baziBtnSubmit"><i class="ti ti-check"></i> 开始排盘</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
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
  // 引擎切换按钮
  var engineOpts = $$('.engine-opt');
  for (var ei = 0; ei < engineOpts.length; ei++) {
    if (!engineOpts[ei]._bound) {
      engineOpts[ei]._bound = true;
      engineOpts[ei].addEventListener('click', function() {
        var all = $$('.engine-opt');
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
    var timeStr = (($('#Cml_his') || {}).value || '08:30').split(':');
    var h = parseInt(timeStr[0], 10) || 12;
    var min = parseInt(timeStr[1], 10) || 0;
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
      jd: jd, wd: wd
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
  var wxScores = data.wuxingScores || (data.congGe && data.congGe.scores) || null;
  var wxDistHtml = '';
  if (wxScores) {
    wxDistHtml += '<div class="card" data-card-id="wx-dist">';
    wxDistHtml += '<div class="card-header"><span><i class="ti ti-chart-dots"></i> 五行力量分布</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
    wxDistHtml += '<div class="card-body">';
    var wxDetails = data.wuxingDetails || null;
    var wxLevels = data.wuxingLevels || null;
    wxDistHtml += _renderWxDist(wxScores);
    wxDistHtml += '</div></div>';
  }

  // ══════ 古籍章節式卡片渲染 ══════
  // 选中引擎：读取 toggle 状态
  var activeEngine = 'A';
  var activeOpt = document.querySelector('.engine-opt.active');
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
  } else if (data.bzinfo) {
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
        selectedEngine: (document.querySelector('.engine-opt.active') || {}).getAttribute('data-engine') || 'A',
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
  var colors = {木:'#4CAF50',火:'#F44336',土:'#FF9800',金:'#FFC107',水:'#2196F3'};
  var total = 0;
  for (var i = 0; i < order.length; i++) { total += scores[order[i].k] || 0; }
  if (total === 0) total = 1;
  var html = '<div class="wx-bar-wrap">';
  for (var i = 0; i < order.length; i++) {
    var o = order[i], v = scores[o.k] || 0, pct = Math.round(v / total * 100);
    var color = colors[o.n];
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
