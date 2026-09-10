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
var _today = null;          // 真实今天（用于高亮锚点）

// ══════ DailyNotes 引用（由 note-ui 模块设置） ══════
var _DailyNotes = null;
function setDailyNotes(dn) { _DailyNotes = dn; }

// ══════ 天干地支常量 ══════
var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

// 吉凶颜色常量（统一管理，避免 4 处硬编码）
var COLOR_GOOD = 'var(--ss-good-text)';  // 吉 → 引用神煞墙 token（金），与神煞墙一致，消除"吉=红"不一致
var COLOR_BAD  = 'var(--ss-bad-text)';   // 凶 → 引用神煞墙 token（红）

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

// ── 设置读取（与设置面板 cal_/zw_ 键一致）──
function _calSetBool(key, def) { try { var v = localStorage.getItem(key); return v === null ? def : (v === 'true'); } catch(e) { return def; } }
function _calSetStr(key, def) { try { var v = localStorage.getItem(key); return v === null ? def : v; } catch(e) { return def; } }

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

/** 渲染日历格徽章（无禄/金神七煞/倒家杀/五富等）。
 *  所有神煞/特殊日已改为常显，不再受设置开关控制。 */
function _renderBadges(dayData) {
  var html = '';
  if (dayData.isTianshe) html += '<span class="cal-badge cal-badge-tianshe">赦</span>';
  if (dayData.isTiande) html += '<span class="cal-badge cal-badge-tiande">德</span>';
  if (dayData.isYuede) html += '<span class="cal-badge cal-badge-yuede">月</span>';
  if (dayData.isWufu) html += '<span class="cal-badge cal-badge-wufu">富</span>';
  if (dayData.isWulu) html += '<span class="cal-badge cal-badge-wu">无</span>';
  if (dayData.isJinshenqisha) html += '<span class="cal-badge cal-badge-sha">煞</span>';
  if (dayData.isDaojiaMonth || dayData.isDaojiaYear) {
    html += '<span class="cal-badge cal-badge-dao">倒</span>';
  }
  if (dayData.isSiLiSiJue) {
    var slsjData = dayData.silisiJue || {};
    var slsjChar = slsjData.type === '离' ? '离' : '绝';
    html += '<span class="cal-badge cal-badge-silisijue">' + slsjChar + '</span>';
  }
  if (dayData.isYanggongJi) {
    html += '<span class="cal-badge cal-badge-yanggongji">忌</span>';
  }
  if (dayData.isHongSha) {
    html += '<span class="cal-badge cal-badge-hongsha" title="小红砂（凶）">砂</span>';
  }
  if (dayData.isDaHongSha) {
    html += '<span class="cal-badge cal-badge-dahongsha" title="大红砂（吉）· 百事吉">大</span>';
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
  _today = { y: _currentY, m: _currentM, d: _currentD };
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

  // 加载首屏（完成后默认展示今天的日课详情）
  loadAndRender(_currentY, _currentM).then(function() {
    selectDay(_currentY, _currentM, _currentD); // 高亮今天 + 内联展开详情
    window._dbg && window._dbg('首屏默认展示今天: ' + _currentD, true);
  });
  window._dbg && window._dbg('loadAndRender 已触发', true);

  // Phase 3.1 — 懒加载并初始化择日助手（独立模块，避免静态循环依赖）
  try {
    import('./choose-ui.js').then(function(m) { if (m && m.init) m.init(); }).catch(function() {});
  } catch (e) { /* 择日模块可选，失败不影响日历 */ }

  // 首页“快速选择日期”→ 定位到月历并展开当日详情
  State.on('home:goto-date', function(p) {
    if (!p || !p.y) return;
    _currentY = p.y; _currentM = p.m; _currentD = p.d;
    var selY = $('#Cal_y'); if (selY) selY.value = String(p.y);
    var selM = $('#Cal_m'); if (selM) selM.value = String(p.m);
    loadAndRender(p.y, p.m).then(function() {
      selectDay(p.y, p.m, p.d); // 高亮 + 内联展开详情
    });
  });

  // 监听记事变更 → 刷新红点（轻量，不重绘整个日历）
  State.on('note:changed', function(evt) {
    if (evt && evt.y && evt.m && evt.d && _DailyNotes) {
      var cal3 = document.getElementById('Cal3');
      if (!cal3) return;
      var tds = cal3.querySelectorAll('.cal-cell[data-year="' + evt.y + '"][data-month="' + evt.m + '"][data-day="' + evt.d + '"]');
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

  // 监听页面切换 → 从年历/八字返回时重绘月历并恢复选中日详情
  State.on('page:changed', function(page) {
    if (page === 'calendar' && _containerEl) {
      loadAndRender(_currentY, _currentM).then(function() {
        var sd = _selectedDay || _today;
        if (sd && sd.y === _currentY && sd.m === _currentM) selectDay(sd.y, sd.m, sd.d);
      });
    }
  });

  // 设置变更 → 仅当影响显示的项变化时才重绘月历（避免无关开关触发重绘）
  var _relKeys = ['cal_weekStart', 'cal_primaryDisplay', 'cal_showJieqi', 'cal_enableReminders'];
  var _lastRel = _relKeys.map(function(k) { return _calSetStr(k, ''); }).join('|');
  function _maybeRerenderCalendar() {
    var now = _relKeys.map(function(k) { return _calSetStr(k, ''); }).join('|');
    if (now !== _lastRel) {
      _lastRel = now;
      if (_currentY && _currentM) loadAndRender(_currentY, _currentM);
    }
  }
  State.on('settings:changed', _maybeRerenderCalendar);
  // 提醒变更 → 重绘以更新铃铛
  State.on('reminders:changed', function() {
    if (_currentY && _currentM) loadAndRender(_currentY, _currentM);
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

  // 上一月 / 下一月 箭头
  var btnPrev = $('#btnPrevMonth');
  if (btnPrev) btnPrev.addEventListener('click', function() { changeMonth(-1); });
  var btnNext = $('#btnNextMonth');
  if (btnNext) btnNext.addEventListener('click', function() { changeMonth(1); });

  // 日历格点击委托：点格 = 高亮 + 就地展开日课；再点当天 = 收起
  var cal3 = $('#Cal3');
  if (cal3) {
    cal3.addEventListener('click', function(e) {
      var cell = e.target.closest('.cal-cell');
      if (!cell) return;

      // 跨月格：无操作
      if (cell.classList.contains('other-month')) return;

      var y = parseInt(cell.dataset.year, 10);
      var m = parseInt(cell.dataset.month, 10);
      var d = parseInt(cell.dataset.day, 10);
      if (!y || !m || !d) return;

      // 再次点击已展开的当天 → 收起详情（保留高亮）
      if (cell.classList.contains('detail-on')) {
        cell.classList.remove('detail-on');
        import('./detail-ui.js').then(function(mod) { mod.default.hide(); });
        return;
      }

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

/** 选中某天：高亮 +（非静默时）在日历下方内联展开日课详情
 *  @param {boolean} [silent] - true=只高亮不展开详情（当前基本不再使用） */
function selectDay(y, m, d, silent) {
  _selectedDay = { y: y, m: m, d: d };

  $$('#Cal3 .cal-cell').forEach(function(c) { c.classList.remove('selected', 'detail-on'); });
  var cell = document.querySelector('#Cal3 .cal-cell[data-year="' + y + '"][data-month="' + m + '"][data-day="' + d + '"]');
  if (cell) {
    cell.classList.add('selected');
    if (!silent) cell.classList.add('detail-on');
  }

  // 更新 Cal2 标题栏
  updateCal2(y, m, d);

  if (!silent) {
    import('./detail-ui.js').then(function(mod) { mod.default.show(y, m, d); });
    State.emit('date:selected', { y: y, m: m, d: d });
  } else {
    import('./detail-ui.js').then(function(mod) { mod.default.hide(); });
  }
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

  // 计算当月1日是星期几 (0=日, 1-6=一~六) + 周起始设置
  var firstDow = new Date(y, m - 1, 1).getDay();
  var weekStart = _calSetStr('cal_weekStart', 'sun');
  var dowOrder = (weekStart === 'mon') ? [1,2,3,4,5,6,0] : [0,1,2,3,4,5,6];
  var prevFill = dowOrder.indexOf(firstDow); // 上月边缘格数量
  var daysInMonth = new Date(y, m, 0).getDate();

  // 构建星期表头 + 日期网格（CSS Grid 卡片式）
  var html = '<div class="cal-weekhead">';
  var CN_WD = ['日','一','二','三','四','五','六'];
  for (var wi = 0; wi < 7; wi++) {
    var dnum = dowOrder[wi];
    var wkCls = (dnum === 0 || dnum === 6) ? 'cal-wd weekend' : 'cal-wd';
    html += '<span class="' + wkCls + '">' + CN_WD[dnum] + '</span>';
  }
  html += '</div><div class="cal-body">';

  var cellCount = 0;

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

  html += '</div>';

  var cal3 = $('#Cal3');
  if (cal3) {
    cal3.innerHTML = html;
    if (_calSetStr('cal_primaryDisplay', 'solar') === 'lunar') cal3.classList.add('lunar-primary');
    else cal3.classList.remove('lunar-primary');
  }

  updateCal2TitleSimple(y, m);
  _renderJqTopBar(data);
}

/** 填充节气顶栏：月建 + 当月节气 */
function _renderJqTopBar(data) {
  var bar = document.getElementById('jqTopBar');
  if (!bar || !data) return;
  var days = data.days || [];
  var terms = [];
  days.forEach(function(day) { if (day.jieQi) terms.push(day.jieQi); });
  // 月建取当月月中(15日附近)的干支月 —— 节气交节必在月初，月中必已入当月节气所属干支月，
  // 避免「首日月建」比「当月交节后月建」落后一位导致的顶栏月建与节气错位。
  var curDays = days.filter(function(d){ return d && !d.other && d.d && d.gz && d.gz.month; });
  var midDay = null;
  curDays.forEach(function(d){
    if (!midDay || Math.abs(d.d - 15) < Math.abs(midDay.d - 15)) midDay = d;
  });
  var mbFull = (midDay && midDay.gz && midDay.gz.month) ? midDay.gz.month : '';
  var parts = [];
  if (mbFull) parts.push('<span class="jq-tag jq-tag-jq">节气</span><span class="jq-branch">' + mbFull + '月</span>');
  if (terms.length && _calSetBool('cal_showJieqi', true)) {
    parts.push('<span class="jq-label">本月节气</span> ' + terms.map(function(t) {
      return '<span class="jq-term">' + t + '</span>';
    }).join('<span class="jq-sep">·</span>'));
  }
  bar.innerHTML = parts.length
    ? parts.join('<span class="jq-sep">　</span>')
    : ('公元 ' + data.y + ' 年 ' + data.m + ' 月');
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
  if (yx === '朔') moonDot = '<span style="color:var(--moon-new);font-size:10px;">●</span>';
  else if (yx === '望') moonDot = '<span style="color:var(--moon-full);font-size:10px;">●</span>';
  else if (yx === '上弦') moonDot = '<span style="color:var(--moon-quarter);font-size:9px;">◐</span>';
  else if (yx === '下弦') moonDot = '<span style="color:var(--moon-quarter);font-size:9px;">◑</span>';

  // 节气标志（仅非节日模式下与农历日并行显示，受“显示节气”开关控制）
  var jqFlag = (!ft.isFestival && jq && _calSetBool('cal_showJieqi', true)) ? '<span style="color:var(--color-jieqi);font-size:8px;">◆</span>' : '';

  // 九星 — 吉=金(--ss-good-text), 凶=红(--ss-bad-text)，与神煞墙一致
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

  // 提醒铃铛（仅当开启“日期提醒”且当日有提醒）
  var remDot = '';
  if (_calSetBool('cal_enableReminders', false) && window.Reminders) {
    var _rems = window.Reminders.forDate(y, m, d);
    if (_rems.length) remDot = '<span class="cal-reminder-dot" title="' + _rems.map(function(r){ return r.title || '提醒'; }).join('、') + '"></span>';
  }

  var _dow = new Date(y, m - 1, d).getDay();
  var isWeekend = (_dow === 0 || _dow === 6);
  var weekendClass = isWeekend ? ' weekend' : '';

  var selectedClass = '';
  if (_selectedDay && _selectedDay.y === y && _selectedDay.m === m && _selectedDay.d === d) {
    selectedClass = ' selected';
  }

  // 今天高亮锚点
  var isToday = (_today && _today.y === y && _today.m === m && _today.d === d);
  var todayClass = isToday ? ' today' : '';
  var todayMark = isToday ? '<span class="today-mark">今</span>' : '';

  // 建除徽章 — 吉(黄道)=金(--ss-good-text), 凶(黑道)=红(--ss-bad-text)，与神煞墙一致
  var dutyColor = dutyGood ? COLOR_GOOD : COLOR_BAD;

  return '<div class="cal-cell' + weekendClass + selectedClass + todayClass + '" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
    todayMark +
    '<span class="solar-num">' + _dayImg(d, isWeekend) + moonDot + noteDot + remDot + '</span>' +
    '<span class="lunar-num' + (ft.isFestival ? ' lunar-festival' : '') + '">' + lunarDisplay + jqFlag + '</span>' +
    '<span class="gz-text">' + gzDay + '</span>' +
    xiuHtml + nsHtml +
    '<span class="duty-badge" style="color:' + dutyColor + '">' + duty + '</span>' +
    badges +
    '</div>';
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

  // 九星 — 吉=金, 凶=红（引用神煞墙 token）
  var nsHtml = '';
  if (ns && ns.name) {
    var nsColor = ns.good ? COLOR_GOOD : COLOR_BAD;
    nsHtml = '<span class="ns-text" style="color:' + nsColor + '">' + ns.name + '</span>';
  }
  var xiuHtml = xiu ? '<span class="xiu-text">' + xiu + '</span>' : '';

  var badges = _renderBadges(dayData);

  // 建除颜色 — 吉=金, 凶=红（引用神煞墙 token）
  var dutyColor = dutyGood ? COLOR_GOOD : COLOR_BAD;

  var _edow = new Date(y, m - 1, d).getDay();
  var _eweekend = (_edow === 0 || _edow === 6);

  return '<div class="cal-cell other-month" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
    '<span class="solar-num">' + _dayImg(d, _eweekend) + '</span>' +
    '<span class="lunar-num' + (ft.isFestival ? ' lunar-festival' : '') + '">' + lunarDisplay + '</span>' +
    '<span class="gz-text">' + gzDay + '</span>' +
    xiuHtml + nsHtml +
    '<span class="duty-badge" style="color:' + dutyColor + '">' + duty + '</span>' +
    badges +
    '</div>';
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
  var firstDow = new Date(y, m - 1, 1).getDay();
  var weekStart = _calSetStr('cal_weekStart', 'sun');
  var dowOrder = (weekStart === 'mon') ? [1,2,3,4,5,6,0] : [0,1,2,3,4,5,6];
  var firstDayWeek = dowOrder.indexOf(firstDow);

  var html = '<div class="cal-weekhead">';
  var CN_WD = ['日','一','二','三','四','五','六'];
  for (var i = 0; i < 7; i++) {
    var dnum = dowOrder[i];
    var lc = (dnum === 0 || dnum === 6) ? 'cal-wd weekend' : 'cal-wd';
    html += '<span class="' + lc + '">' + CN_WD[dnum] + '</span>';
  }
  html += '</div><div class="cal-body">';

  var col = 0;
  for (var pf = 0; pf < firstDayWeek; pf++) {
    html += '<div class="cal-cell other-month"><span class="solar-num">-</span></div>';
    col++;
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var _sdow = new Date(y, m - 1, d).getDay();
    var _sweekend = (_sdow === 0 || _sdow === 6);
    html += '<div class="cal-cell" data-year="' + y + '" data-month="' + m + '" data-day="' + d + '">' +
      '<span class="solar-num">' + _dayImg(d, _sweekend) + '</span>' +
      '</div>';
    col++;
  }
  html += '</div>';
  container.innerHTML = html;
}

export default { init: init, changeMonth: changeMonth, selectDay: selectDay, setDailyNotes: setDailyNotes };
