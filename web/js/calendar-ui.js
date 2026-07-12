// web/js/calendar-ui.js — 月历渲染模块
// 从 API 加载日历数据并渲染月历表格
// 移植自 index.html 的 getLunar() / nianLiHTML() 等函数

import { State } from './state.js';
import { API } from './api.js';
import { $, $$, _highlightFab, _updateTopNavHeight, fmtDate } from './dom-helpers.js';

// ══════ 模块状态 ══════
var _currentY = 2026;
var _currentM = 6;
var _currentD = null;
var _containerEl = null;
var _selectedDay = null;

// ══════ 设置缓存（渲染前更新，避免循环内读 localStorage） ══════
var _setShowWulu = true;
var _setShowDaojiaMonth = true;
var _setShowDaojiaYear = true;
var _setShowJinshen = true;
var _setShowWufu = true;
var _setShowSiLiSiJue = true;
var _setShowYanggongJi = true;
var _setShowTiande = true;
var _setShowYuede = true;
var _setShowTianshe = true;

// ══════ DailyNotes 引用（由 note-ui 模块设置） ══════
var _DailyNotes = null;
function setDailyNotes(dn) { _DailyNotes = dn; }

// ══════ 天干地支常量 ══════
var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

// 吉凶颜色常量（统一管理，避免 4 处硬编码）
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
  _setShowTiande = _loadSet('showTiande', true);
  _setShowYuede = _loadSet('showYuede', true);
  _setShowTianshe = _loadSet('showTianshe', true);
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
  if (_setShowTianshe && dayData.isTianshe) html += '<span class="cal-badge cal-badge-tianshe">赦</span>';
  if (_setShowTiande && dayData.isTiande) html += '<span class="cal-badge cal-badge-tiande">德</span>';
  if (_setShowYuede && dayData.isYuede) html += '<span class="cal-badge cal-badge-yuede">月</span>';
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

  // 填充年月下拉框
  populateYearMonthSelects();
  window._dbg && window._dbg('下拉框已填充', true);

  // 设置初始值
  var selY = $('#Cal_y');
  var selM = $('#Cal_m');
  if (selY) selY.value = String(_currentY);
  if (selM) selM.value = String(_currentM);

  // 绑定事件
  bindEvents();
  window._dbg && window._dbg('事件已绑定', true);

  // 加载首屏（完成后高亮今天）
  loadAndRender(_currentY, _currentM).then(function() {
    selectDay(_currentY, _currentM, _currentD, true); // 静默高亮，不触发详情
    window._dbg && window._dbg('默认高亮今天: ' + _currentD, true);
  });
  window._dbg && window._dbg('loadAndRender 已触发', true);

  // 监听设置变更（State 事件 + DOM CustomEvent 双通道）
  function _onSettingsChanged() {
    _refreshSettings();
    loadAndRender(_currentY, _currentM);
  }
  State.on('settings:changed', _onSettingsChanged);
  window.addEventListener('settings:changed', _onSettingsChanged);

  // 监听记事变更 → 刷新红点（轻量，不重绘整个日历）
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

  // 监听页面切换 → 从年历/八字返回时重绘月历
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

  // 年份：1900-2100
  selY.innerHTML = '';
  for (var y = 1900; y <= 2100; y++) {
    var opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = y + '年';
    selY.appendChild(opt);
  }

  // 月份：1-12
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
  // 确定按钮
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

  // 今天按钮 — 跳回当前日期
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

  // 日历格点击委托
  var cal3 = $('#Cal3');
  if (cal3) {
    cal3.addEventListener('click', function(e) {
      // 详情节关按钮 — 阻止冒泡，独立处理
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

      // 跨月格：无操作
      if (cell.classList.contains('other-month')) return;

      selectDay(y, m, d);
    });
  }

  // 触摸滑动（月份切换）
  var touchStartX = 0;
  if (cal3) {
    cal3.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    cal3.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) {
          // 右滑 = 上个月
          changeMonth(-1);
        } else {
          // 左滑 = 下个月
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

  // 高亮前：清除旧选中格的详情节关状态 + 关闭浮层
  var oldSelected = document.querySelector('#Cal3 .cal-cell.detail-on');
  if (oldSelected) {
    oldSelected.classList.remove('detail-on');
    import('./detail-ui.js').then(function(mod) { mod.default.hide(); });
  }
  $$('#Cal3 .cal-cell').forEach(function(c) { c.classList.remove('selected', 'detail-on'); });
  var cell = document.querySelector('#Cal3 .cal-cell[data-year="' + y + '"][data-month="' + m + '"][data-day="' + d + '"]');
  if (cell) cell.classList.add('selected');

  // 更新 Cal2 标题栏
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

  // 加载单日详情
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

  // 显示加载状态
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
    // 尝试离线兜底
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

  // 构建当月日期索引 Map
  var dayMap = {};
  days.forEach(function(day) {
    dayMap[day.d] = day;
  });

  // 计算当月1日是星期几 (0=日, 1-6=一~六)
  var firstDayWeek = new Date(y, m - 1, 1).getDay();
  var daysInMonth = new Date(y, m, 0).getDate();

  // 构建表格
  var html = '<table><thead><tr>';
  var weekLabels = ['日','一','二','三','四','五','六'];
  for (var wi = 0; wi < 7; wi++) html += '<th>' + weekLabels[wi] + '</th>';
  html += '</tr></thead><tbody>';

  var cellCount = 0;
  var prevFill = firstDayWeek;

  html += '<tr>';
  // 上月边缘格（完整数据 + other-month 遮罩）
  for (var pf = 0; pf < prevFill; pf++) {
    var prevData = prevEdge[pf] || {};
    var prevY = m === 1 ? y - 1 : y;
    var prevM = m === 1 ? 12 : m - 1;
    html += renderEdgeCell(prevY, prevM, prevData.d || (prevFill > 0 ? 1 : 0), prevData);
    cellCount++;
  }

  // 当月日期
  for (var d = 1; d <= daysInMonth; d++) {
    if (cellCount % 7 === 0 && cellCount > 0) html += '</tr><tr>';
    var dayData = dayMap[d] || {};
    html += renderDayCell(y, m, d, dayData);
    cellCount++;
  }

  // 下月边缘格（完整数据 + other-month 遮罩）
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

  // 节日/节气优先显示（寿星历引擎为准）
  var ft = _resolveFestival(jq, dayData.solarFestival, dayData.lunarFestival);

  // 农历显示：初一 → "五月大"，节日节气则替换为节日名
  var lunarDisplay;
  if (ft.isFestival) {
    lunarDisplay = ft.text;
  } else if (lunarDayRaw === '初一' && lunarM) {
    var sizeLabel = daysInMonth >= 30 ? '大' : '小';
    lunarDisplay = lunarM + '月' + sizeLabel;
  } else {
    lunarDisplay = lunarDayToChinese(lunarDayRaw);
  }

  // 月相标志：朔(黑●) 望(金●) 上弦(◐) 下弦(◑)
  var moonDot = '';
  if (yx === '朔') moonDot = '<span style="color:#404040;font-size:10px;">●</span>';
  else if (yx === '望') moonDot = '<span style="color:#F0A000;font-size:10px;">●</span>';
  else if (yx === '上弦') moonDot = '<span style="color:#888;font-size:9px;">◐</span>';
  else if (yx === '下弦') moonDot = '<span style="color:#888;font-size:9px;">◑</span>';

  // 节气标志（仅非节日模式下与农历日并行显示）
  var jqFlag = (!ft.isFestival && jq) ? '<span style="color:#009000;font-size:8px;">◆</span>' : '';

  // 九星 — 吉=红色, 凶=黑色 (据 index.html ns.good ? '#c43d3d' : '#1e1e1e')
  var nsHtml = '';
  if (ns && ns.name) {
    var nsColor = ns.good ? COLOR_GOOD : COLOR_BAD;
    nsHtml = '<span class="ns-text" style="color:' + nsColor + '">' + ns.name + '</span>';
  }

  // 二十八宿
  var xiuHtml = xiu ? '<span class="xiu-text">' + xiu + '</span>' : '';

  // 可选徽章（受设置开关控制）
  var badges = _renderBadges(dayData);

  // 记事红点
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

  // 建除徽章 — 吉(黄道)=红色, 凶(黑道)=黑色 (据 index.html jcGood2 ? '#c43d3d' : '#1e1e1e')
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

  // 节日/节气优先显示
  var ft = _resolveFestival(dayData.jieQi, dayData.solarFestival, dayData.lunarFestival);

  // 农历显示：初一 → 月名大小，节日节气则替换
  var lunarDisplay;
  if (ft.isFestival) {
    lunarDisplay = ft.text;
  } else if (lunarDayRaw === '初一' && lunarM) {
    var sizeLabel = (dayData.lunarDaysInMonth || 30) >= 30 ? '大' : '小';
    lunarDisplay = lunarM + '月' + sizeLabel;
  } else {
    lunarDisplay = lunarDayToChinese(lunarDayRaw);
  }

  // 九星 — 吉=红色, 凶=黑色
  var nsHtml = '';
  if (ns && ns.name) {
    var nsColor = ns.good ? COLOR_GOOD : COLOR_BAD;
    nsHtml = '<span class="ns-text" style="color:' + nsColor + '">' + ns.name + '</span>';
  }
  var xiuHtml = xiu ? '<span class="xiu-text">' + xiu + '</span>' : '';

  var badges = _renderBadges(dayData);

  // 建除颜色 — 吉=红色, 凶=黑色
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
  // 年上起月法：甲己之年丙作首
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
    // lite.js 加载失败，显示静态日历
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
