import { State } from './state.js';
import { API } from './api.js';
import { $, $$, _highlightFab, _updateTopNavHeight, fmtDate } from './dom-helpers.js';

var _currentY = 2026;
var _currentM = 6;
var _currentD = null;
var _containerEl = null;
var _selectedDay = null;

var _setShowWulu = true;
var _setShowDaojiaMonth = true;
var _setShowDaojiaYear = true;
var _setShowJinshen = true;
var _setShowWufu = true;
var _setShowSiLiSiJue = true;
var _setShowYanggongJi = true;

var _DailyNotes = null;
function setDailyNotes(dn) { _DailyNotes = dn; }

var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

var COLOR_GOOD = '#c43d3d';  // 吉（红色）
var COLOR_BAD  = '#1e1e1e';  // 凶（黑色）

/** 读取日历设置（兼容 dom-helpers.js 的 '1'/'0' 和 app.html/settings-ui.js 的 'true'/'false' 双格式） */
function _loadSet(key, def) {
  try { var v = localStorage.getItem('cal_' + key); if (v === null) return def; return v === '1' || v === 'true'; }
  catch(e) { return def; }
}
/** 刷新设置缓存 */
function _refreshSettings() {
  _setShowWulu = _loadSet('showWulu', true);
  _setShowDaojiaMonth = _loadSet('showDaojiaMonth', true);
  _setShowDaojiaYear = _loadSet('showDaojiaYear', true);
  _setShowJinshen = _loadSet('showJinshenqisha', true);
  _setShowWufu = _loadSet('showWufu', true);
  _setShowSiLiSiJue = _loadSet('showSiLiSiJue', true);
  _setShowYanggongJi = _loadSet('showYanggongJi', true);
}

/** 农历日期数字→中文（1→初一, 15→十五, 20→二十, 29→廿九） */
function lunarDayToChinese(n) {
  var num = parseInt(n, 10);
  if (isNaN(num) || num < 1 || num > 30) return String(n);
  var CN = ['','一','二','三','四','五','六','七','八','九','十'];
  if (num <= 10) return '初' + CN[num];
  if (num < 20) return '十' + (num === 10 ? '' : CN[num - 10]);
  if (num === 20) return '二十';
  if (num < 30) return '廿' + CN[num - 20];
  return '三十';
}

/** 从寿星历节日字符串中提取第一个节日名并截断为3字（用于日历格精简显示） */
function _firstFestival(raw) {
  if (!raw || !raw.trim()) return '';
  var cleaned = raw.replace(/\([^)]*\)/g, '');  // 去掉括号注释
  var parts = cleaned.trim().split(/\s+/);
  var name = parts[0] || '';
  return name.length > 3 ? name.substring(0, 2) + '…' : name;
}

/** 解析节日/节气显示文本（优先级：节气 > 重大节日 > 次要节日） */
function _resolveFestival(jq, solarFes, lunarFes) {
  if (jq) return { text: jq, isFestival: true };
  if (solarFes && solarFes.trim()) return { text: _firstFestival(solarFes), isFestival: true };
  if (lunarFes && lunarFes.trim()) return { text: _firstFestival(lunarFes), isFestival: true };
  return { text: '', isFestival: false };
}

/** 渲染日历格徽章（无禄/金神七煞/倒家杀/五富） */
function _renderBadges(dayData) {
  var html = '';
  if (_setShowWufu && dayData.isWufu) html += '<span class="cal-badge cal-badge-wufu">富</span>';
  if (_setShowWulu && dayData.isWulu) html += '<span class="cal-badge cal-badge-wu">无</span>';
  if (dayData.isJinshenqisha && _setShowJinshen) html += '<span class="cal-badge cal-badge-sha">煞</span>';
  if ((_setShowDaojiaMonth && dayData.isDaojiaMonth) || (_setShowDaojiaYear && dayData.isDaojiaYear)) {
    html += '<span class="cal-badge cal-badge-dao">倒</span>';
  }
  if (_setShowSiLiSiJue && dayData.isSiLiSiJue) {
    var slsjData = dayData.silisiJue || {};
    var slsjChar = slsjData.type === '离' ? '离' : '绝';
    html += '<span class="cal-badge cal-badge-silisijue">' + slsjChar + '</span>';
  }
  if (_setShowYanggongJi && dayData.isYanggongJi) {
    html += '<span class="cal-badge cal-badge-yanggongji">忌</span>';
  }
  return html;
}

/** 将公历日数渲染为数字图片（周末红字：img/cal-digit-red/1~31.jpg） */
function _dayImg(n, isWeekend) {
  if (isWeekend) {
    return '<img class="cal-digit" src="img/cal-digit-red/' + n + '.svg" alt="' + n + '">';
  }
  return '<img class="cal-digit" src="img/cal-digit/' + n + '.svg" alt="' + n + '">';
}

/** 初始化 */
function init(containerSel) {
  window._dbg && window._dbg('calendar-ui.init(' + containerSel + ')', true);
  _containerEl = $(containerSel);
  if (!_containerEl) {
    window._dbg && window._dbg('容器未找到: ' + containerSel, false);
    console.error('[calendar-ui] 容器未找到:', containerSel);
    return;
  }

  var now = new Date();
  _currentY = now.getFullYear();
  _currentM = now.getMonth() + 1;
  _currentD = now.getDate();
  window._dbg && window._dbg('当前日期: ' + _currentY + '-' + _currentM + '-' + _currentD, true);

  populateYearMonthSelects();
  window._dbg && window._dbg('下拉框已填充', true);

  var selY = $('#Cal_y');
  var selM = $('#Cal_m');
  if (selY) selY.value = String(_currentY);
  if (selM) selM.value = String(_currentM);

  bindEvents();
  window._dbg && window._dbg('事件已绑定', true);

  loadAndRender(_currentY, _currentM).then(function() {
    selectDay(_currentY, _currentM, _currentD, true); // 静默高亮，不触发详情
    window._dbg && window._dbg('默认高亮今天: ' + _currentD, true);
  });
  window._dbg && window._dbg('loadAndRender 已触发', true);

  function _onSettingsChanged() {
    _refreshSettings();
    loadAndRender(_currentY, _currentM);
  }
  State.on('settings:changed', _onSettingsChanged);
  window.addEventListener('settings:changed', _onSettingsChanged);

  State.on('note:changed', function(evt) {
    if (evt && evt.y && evt.m && evt.d && _DailyNotes) {
      var cal3 = document.getElementById('Cal3');
      if (!cal3) return;
      var tds = cal3.querySelectorAll('td[data-year="' + evt.y + '"][data-month="' + evt.m + '"][data-day="' + evt.d + '"]');
      for (var i = 0; i < tds.length; i++) {
        var sn = tds[i].querySelector('.solar-num');
        if (!sn) continue;
        var oldDot = sn.querySelector('.daily-note-dot');
        var hasNote = _DailyNotes.has(evt.y, evt.m, evt.d);
        if (hasNote && !oldDot) {
          var dot = document.createElement('span');
          dot.className = 'daily-note-dot';
          sn.appendChild(dot);
        } else if (!hasNote && oldDot) {
          oldDot.remove();
        }
      }
    }
  });

  State.on('page:changed', function(page) {
    if (page === 'calendar' && _containerEl) {
      loadAndRender(_currentY, _currentM);
    }
  });
}

/** 填充年月下拉框 */
function populateYearMonthSelects() {
  var selY = $('#Cal_y');
  var selM = $('#Cal_m');
  if (!selY || !selM) return;

  selY.innerHTML = '';
  for (var y = 1900; y <= 2100; y++) {
    var opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = y + '年';
    selY.appendChild(opt);
  }

  selM.innerHTML = '';
  for (var m = 1; m <= 12; m++) {
    var opt2 = document.createElement('option');
    opt2.value = String(m);
    opt2.textContent = m + '月';
    selM.appendChild(opt2);
  }
}

/** 绑定事件 */
function bindEvents() {

  var btn = $('#btnChangeMonth');
  if (btn) {
    btn.addEventListener('click', function() {
      var selY = $('#Cal_y');
      var selM = $('#Cal_m');
      if (selY && selM) {
        var y = parseInt(selY.value, 10);
        var m = parseInt(selM.value, 10);
        if (y && m) {
          _currentY = y;
          _currentM = m;
          loadAndRender(y, m);
        }
      }
    });
  }

  var btnToday = $('#btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', function() {
      var now = new Date();
      _currentY = now.getFullYear();
      _currentM = now.getMonth() + 1;
      _currentD = now.getDate();
      var selY = $('#Cal_y');
      var selM = $('#Cal_m');
      if (selY) selY.value = String(_currentY);
      if (selM) selM.value = String(_currentM);
      loadAndRender(_currentY, _currentM).then(function() {
        selectDay(_currentY, _currentM, _currentD);
      });
    });
  }

  var cal3 = $('#Cal3');
  if (cal3) {
    cal3.addEventListener('click', function(e) {

      if (e.target.closest('.cal-detail-toggle')) {
        e.stopPropagation();
        var toggle = e.target.closest('.cal-detail-toggle');
        var cell = toggle.closest('.cal-cell');
        if (!cell) return;
        var y = parseInt(cell.dataset.year, 10);
        var m = parseInt(cell.dataset.month, 10);
        var d = parseInt(cell.dataset.day, 10);
        if (!y || !m || !d) return;
        _toggleDetailForDay(cell, y, m, d);
        return;
      }

      var cell = e.target.closest('.cal-cell');
      if (!cell) return;
      var y = parseInt(cell.dataset.year, 10);
      var m = parseInt(cell.dataset.month, 10);
      var d = parseInt(cell.dataset.day, 10);
      if (!y || !m || !d) return;

      if (cell.classList.contains('other-month')) return;

      selectDay(y, m, d);
    });
  }

  var touchStartX = 0;
  if (cal3) {
    cal3.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    cal3.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) {

          changeMonth(-1);
        } else {

          changeMonth(1);
        }
      }
    });
  }
}

/** 切换月份 */
function changeMonth(delta) {
  _currentM += delta;
  if (_currentM > 12) { _currentM = 1; _currentY++; }
  if (_currentM < 1) { _currentM = 12; _currentY--; }

  var selY = $('#Cal_y');
  var selM = $('#Cal_m');
  if (selY) selY.value = String(_currentY);
  if (selM) selM.value = String(_currentM);

  loadAndRender(_currentY, _currentM);
  State.emit('month:changed', { y: _currentY, m: _currentM });
}

/** 选中某天
 *  @param {boolean} [silent] - true=只高亮不触发事件（初始加载用） */
function selectDay(y, m, d, silent) {
  _selectedDay = { y: y, m: m, d: d };

  var oldSelected = document.querySelector('#Cal3 .cal-cell.detail-on');
  if (oldSelected) {
    oldSelected.classList.remove('detail-on');
    import('./detail-ui.js').then(function(mod) { mod.default.hide(); });
  }
  $$('#Cal3 .cal-cell').forEach(function(c) { c.classList.remove('selected', 'detail-on'); });
  var cell = document.querySelector('#Cal3 .cal-cell[data-year="' + y + '"][data-month="' + m + '"][data-day="' + d + '"]');
  if (cell) cell.classList.add('selected');

  updateCal2(y, m, d);

  if (!silent) {
    State.emit('date:selected', { y: y, m: m, d: d });
  }
}

/** 切换日课详情显隐（迷你开关回调）
 *  默认关闭；点击开关后切换 ON/OFF 并控制浮层 */
function _toggleDetailForDay(cell, y, m, d) {
  var isOn = cell.classList.toggle('detail-on');
  import('./detail-ui.js').then(function(mod) {
    var detail = mod.default;
    if (isOn) {
      detail.show(y, m, d);
    } else {
      detail.hide();
    }
  });
}

/** 更新 Cal2 标题栏 */
function updateCal2(y, m, d) {
  var cal2 = $('#Cal2');
  if (!cal2) return;

  API.post('/calendar/day', { y: y, m: m, d: d }).then(function(result) {
    if (result.ok) {
      var data = result.data;
      var gz = data.yearGZ || '';
      var xiu = data.xiu || '';
      var jc = data.jianchu || '';
      var lunarStr = (data.lunarMonthName || '') + '月' + (data.lunarDayName || '');
      cal2.innerHTML = gz + '年 ' + (data.monthGZ || '') + '月 ' + (data.dayGZ || '') + '日 ' +
        '[' + xiu + '宿] [' + jc + '] ' + lunarStr;
    }
  }).catch(function() {
    cal2.innerHTML = fmtDate(y, m, d);
  });
}

/** 从 API 加载并渲染 */
async function loadAndRender(y, m) {
  if (!_containerEl) return;

  _currentY = y;
  _currentM = m;
  _refreshSettings(); // 渲染前同步设置
  window._dbg && window._dbg('loadAndRender: ' + y + '/' + m, true);

  var cal3 = $('#Cal3');
  if (cal3) cal3.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">加载中...</div>';

  try {
    window._dbg && window._dbg('正在请求 API...', true);
    var result = await API.post('/calendar/month', { y: y, m: m });
    window._dbg && window._dbg('API 响应: ok=' + result.ok + ' took=' + result.took + 'ms', result.ok);

    if (result.ok) {
      renderMonth(result.data);
      window._dbg && window._dbg('renderMonth 完成, ' + result.data.days.length + '天', true);
      State.emit('calendar:rendered', { y: y, m: m });
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch(e) {
    window._dbg && window._dbg('API 失败: ' + e.message, false);
    console.error('[calendar-ui] 加载失败:', e);
    if (cal3) {
      cal3.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-cinnabar);">' +
        '加载失败，请检查网络连接<br><small>' + e.message + '</small></div>';
    }

    tryOfflineRender(y, m);
  }
}

/** 渲染月份 */
function renderMonth(data) {
  var y = data.y;
  var m = data.m;
  var days = data.days;
  var prevEdge = data.prevEdge || [];
  var nextEdge = data.nextEdge || [];

  var dayMap = {};
  days.forEach(function(day) {
    dayMap[day.d] = day;
  });

  var firstDayWeek = new Date(y, m - 1, 1).getDay();
  var daysInMonth = new Date(y, m, 0).getDate();

  var html = '<table><thead><tr>';
  var weekLabels = ['日','一','二','三','四','五','六'];
  for (var wi = 0; wi < 7; wi++) html += '<th>' + weekLabels[wi] + '</th>';
  html += '</tr></thead><tbody>';

  var cellCount = 0;
  var prevFill = firstDayWeek;

  html += '<tr>';

  for (var pf = 0; pf < prevFill; pf++) {
    var prevData = prevEdge[pf] || {};
    var prevY = m === 1 ? y - 1 : y;
    var prevM = m === 1 ? 12 : m - 1;
    html += renderEdgeCell(prevY, prevM, prevData.d || (prevFill > 0 ? 1 : 0), prevData);
    cellCount++;
  }

  for (var d = 1; d <= daysInMonth; d++) {
    if (cellCount % 7 === 0 && cellCount > 0) html += '</tr><tr>';
    var dayData = dayMap[d] || {};
    html += renderDayCell(y, m, d, dayData);
    cellCount++;
  }

  var nextFill = (7 - (cellCount % 7)) % 7;
  for (var nf = 0; nf < nextFill; nf++) {
    var nextData = nextEdge[nf] || {};
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    html += renderEdgeCell(nextY, nextM, nextData.d || (nf + 1), nextData);
  }

  html += '</tr></tbody></table>';

  var cal3 = $('#Cal3');
  if (cal3) cal3.innerHTML = html;

  updateCal2TitleSimple(y, m);
}

/** 渲染当月日期格 */
function renderDayCell(y, m, d, dayData) {
  var lunarDayRaw = dayData.lunarD;  // 初一/十五...
  var gzDay = (dayData.gz && dayData.gz.day) || '';
  var duty = dayData.jianChu || '';
  var dutyGood = dayData.jianChuGood !== false;  // 默认true(吉)
  var xiu = dayData.xiu || '';
  var ns = dayData.nineStar;
  var yx = dayData.yueXiang || '';  // 月相：朔/望/上弦/下弦
  var jq = dayData.jieQi || '';     // 节气
  var lunarM = dayData.lunarM || '';  // 农历月份数字名
  var daysInMonth = dayData.lunarDaysInMonth || 30;

  var ft = _resolveFestival(jq, dayData.solarFestival, dayData.lunarFestival);

  var lunarDisplay;
  if (ft.isFestival) {
    lunarDisplay = ft.text;
  } else if (lunarDayRaw === '初一' && lunarM) {
    var sizeLabel = daysInMonth >= 30 ? '大' : '小';
    lunarDisplay = lunarM + '月' + sizeLabel;
  } else {
    lunarDisplay = lunarDayToChinese(lunarDayRaw);
  }

  var moonDot = '';
  if (yx === '朔') moonDot = '<span style="color:#404040;font-size:10px;">●</span>';
  else if (yx === '望') moonDot = '<span style="color:#F0A000;font-size:10px;">●</span>';
  else if (yx === '上弦') moonDot = '<span style="color:#888;font-size:9px;">◐</span>';
  else if (yx === '下弦') moonDot = '<span style="color:#888;font-size:9px;">◑</span>';

  var jqFlag = (!ft.isFestival && jq) ? '<span style="color:#009000;font-size:8px;">◆</span>' : '';

  var nsHtml = '';
  if (ns && ns.name) {
    var nsColor = ns.good ? COLOR_GOOD : COLOR_BAD;
    nsHtml = '<span class="ns-text" style="color:' + nsColor + '">' + ns.name + '</span>';
  }

  var xiuHtml = xiu ? '<span class="xiu-text">' + xiu + '</span>' : '';

  var badges = _renderBadges(dayData);

  var noteDot = '';
  if (_DailyNotes && _DailyNotes.has(y, m, d)) {
    noteDot = '<span class="daily-note-dot"></span>';
  }

  var _dow = new Date(y, m - 1, d).getDay();
  var isWeekend = (_dow === 0 || _dow === 6);
  var weekendClass = isWeekend ? ' weekend' : '';

  var selectedClass = '';
  if (_selectedDay && _selectedDay.y === y && _selectedDay.m === m && _selectedDay.d === d) {
    selectedClass = ' selected';
  }

  var dutyColor = dutyGood ? COLOR_GOOD : COLOR_BAD;

  return '<td class="cal-cell' + weekendClass + selectedClass + '" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
    '<span class="solar-num">' + _dayImg(d, isWeekend) + moonDot + noteDot + '</span>' +
    '<span class="lunar-num' + (ft.isFestival ? ' lunar-festival' : '') + '">' + lunarDisplay + jqFlag + '</span>' +
    '<span class="gz-text">' + gzDay + '</span>' +
    xiuHtml + nsHtml +
    '<span class="duty-badge" style="color:' + dutyColor + '">' + duty + '</span>' +
    badges +
    '<button class="cal-detail-toggle" title="钤印查阅日课" aria-label="钤印查阅日课"><span class="seal-char">印</span></button>' +
    '</td>';
}

/** 渲染跨月边缘格（完整数据 + 遮罩，不可点击） */
function renderEdgeCell(y, m, d, dayData) {
  var lunarDayRaw = dayData.lunarD;
  var gzDay = (dayData.gz && dayData.gz.day) || '';
  var duty = dayData.jianChu || '';
  var dutyGood = dayData.jianChuGood !== false;
  var xiu = dayData.xiu || '';
  var ns = dayData.nineStar;
  var lunarM = dayData.lunarM || '';

  var ft = _resolveFestival(dayData.jieQi, dayData.solarFestival, dayData.lunarFestival);

  var lunarDisplay;
  if (ft.isFestival) {
    lunarDisplay = ft.text;
  } else if (lunarDayRaw === '初一' && lunarM) {
    var sizeLabel = (dayData.lunarDaysInMonth || 30) >= 30 ? '大' : '小';
    lunarDisplay = lunarM + '月' + sizeLabel;
  } else {
    lunarDisplay = lunarDayToChinese(lunarDayRaw);
  }

  var nsHtml = '';
  if (ns && ns.name) {
    var nsColor = ns.good ? COLOR_GOOD : COLOR_BAD;
    nsHtml = '<span class="ns-text" style="color:' + nsColor + '">' + ns.name + '</span>';
  }
  var xiuHtml = xiu ? '<span class="xiu-text">' + xiu + '</span>' : '';

  var badges = _renderBadges(dayData);

  var dutyColor = dutyGood ? COLOR_GOOD : COLOR_BAD;

  var _edow = new Date(y, m - 1, d).getDay();
  var _eweekend = (_edow === 0 || _edow === 6);

  return '<td class="cal-cell other-month" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
    '<span class="solar-num">' + _dayImg(d, _eweekend) + '</span>' +
    '<span class="lunar-num' + (ft.isFestival ? ' lunar-festival' : '') + '">' + lunarDisplay + '</span>' +
    '<span class="gz-text">' + gzDay + '</span>' +
    xiuHtml + nsHtml +
    '<span class="duty-badge" style="color:' + dutyColor + '">' + duty + '</span>' +
    badges +
    '</td>';
}

/** 简单更新 Cal2 标题栏 */
function updateCal2TitleSimple(y, m) {
  var cal2 = $('#Cal2');
  if (!cal2) return;

  var gzY = ganZhiYear(y);
  var gzM = ganZhiMonth(y, m);
  cal2.innerHTML = gzY + '年 ' + gzM + '月';
}

/** 年份干支 */
function ganZhiYear(y) {
  var baseYear = 1984;
  var diff = y - baseYear;
  var idx = ((diff % 60) + 60) % 60;
  return GAN[idx % 10] + ZHI[idx % 12];
}

/** 月份干支 */
function ganZhiMonth(y, m) {

  var gzY = ganZhiYear(y);
  var gIdx = GAN.indexOf(gzY[0]);
  var startGan = [2,4,6,8,0][Math.floor(gIdx / 2)]; // 丙戊庚壬甲
  var mGanIdx = (startGan + (m - 1)) % 10;
  var mZhiIdx = (2 + (m - 1)) % 12; // 正月建寅
  return GAN[mGanIdx] + ZHI[mZhiIdx];
}

/** 离线兜底（加载 lite.js 本地计算基础日历） */
async function tryOfflineRender(y, m) {
  try {
    var lite = await import('./lite.js');
    if (lite && lite.renderMonth) {
      lite.renderMonth(y, m, $('#Cal3'));
    }
  } catch(e) {

    var cal3 = $('#Cal3');
    if (cal3) {
      renderStaticCalendar(y, m, cal3);
    }
  }
}

/** 静态日历（纯公历，无天文依赖） */
function renderStaticCalendar(y, m, container) {
  var daysInMonth = new Date(y, m, 0).getDate();
  var firstDayWeek = new Date(y, m - 1, 1).getDay();

  var html = '<table><thead><tr>';
  var labels = ['日','一','二','三','四','五','六'];
  for (var i = 0; i < 7; i++) html += '<th>' + labels[i] + '</th>';
  html += '</tr></thead><tbody><tr>';

  var col = 0;
  for (var pf = 0; pf < firstDayWeek; pf++) {
    html += '<td class="cal-cell other-month"><span class="solar-num">-</span></td>';
    col++;
  }
  for (var d = 1; d <= daysInMonth; d++) {
    if (col % 7 === 0 && col > 0) html += '</tr><tr>';
    var _sdow = new Date(y, m - 1, d).getDay();
    var _sweekend = (_sdow === 0 || _sdow === 6);
    html += '<td class="cal-cell" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
      '<span class="solar-num">' + _dayImg(d, _sweekend) + '</span>' +
      '</td>';
    col++;
  }
  html += '</tr></tbody></table>';
  container.innerHTML = html;
}

export default { init: init, changeMonth: changeMonth, selectDay: selectDay, setDailyNotes: setDailyNotes };