// web/js/choose-ui.js — 择日助手（选日报告）前端模块
// 给定事项 + 月份，调用 /calendar/choose 获取基于「真实黄历宜忌 + 吉神/凶煞」排序的候选吉日。
// 事项→宜忌/神煞映射为《协纪辨方书》《选择宗镜》《玉匣记》通用通则（见后端 CHOOSE_EVENTS），
// 本模块仅负责展示与跳转，不参与吉凶判定。

import { API } from './api.js';
import { Router } from './router.js';

// ── 本命合参：干支冲合刑害（确定性规则，不捏造） ──
var GAN_ARR = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var ZHI_ARR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
// 六冲（地支相隔 6 位）
var LIU_CHONG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
// 六合
var LIU_HE = [[0,1],[2,5],[3,10],[4,9],[5,8],[6,7]];
// 三合局：申子辰 / 亥卯未 / 寅午戌 / 巳酉丑（下标=地支序号 子0丑1寅2卯3辰4巳5午6未7申8酉9戌10亥11）
var SAN_HE = [[8,0,4],[11,3,7],[2,6,10],[5,9,1]];
// 三刑：寅巳申（无恩）/ 丑戌未（恃势）/ 子卯（无礼）
var SAN_XING = [[2,5,8],[1,10,7],[0,3]];
// 六害：子未 / 丑午 / 寅巳 / 卯辰 / 申亥 / 酉戌
var LIU_HAI = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];

// 六十甲子纳音五行（标准经典纳音表，非捏造）：干支 → 五行
var NAYIN = {
  '甲子': '金', '乙丑': '金', '丙寅': '火', '丁卯': '火', '戊辰': '木', '己巳': '木',
  '庚午': '土', '辛未': '土', '壬申': '金', '癸酉': '金', '甲戌': '火', '乙亥': '火',
  '丙子': '水', '丁丑': '水', '戊寅': '土', '己卯': '土', '庚辰': '金', '辛巳': '金',
  '壬午': '木', '癸未': '木', '甲申': '水', '乙酉': '水', '丙戌': '土', '丁亥': '土',
  '戊子': '火', '己丑': '火', '庚寅': '木', '辛卯': '木', '壬辰': '水', '癸巳': '水',
  '甲午': '金', '乙未': '金', '丙申': '火', '丁酉': '火', '戊戌': '木', '己亥': '木',
  '庚子': '土', '辛丑': '土', '壬寅': '金', '癸卯': '金', '甲辰': '火', '乙巳': '火',
  '丙午': '水', '丁未': '水', '戊申': '土', '己酉': '土', '庚戌': '金', '辛亥': '金',
  '壬子': '木', '癸丑': '木', '甲寅': '水', '乙卯': '水', '丙辰': '土', '丁巳': '土',
  '戊午': '火', '己未': '火', '庚申': '木', '辛酉': '木', '壬戌': '水', '癸亥': '水'
};
// 五行生克（X → 目标）
var WX_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // X 生
var WX_KE = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };       // X 克

/** 纳音生克关系（纯函数）：日课某柱纳音 vs 本命年命纳音。
 *  仅标三种决策相关态：日课克本命(凶) / 日课生本命(吉) / 同五行(比和,平吉)；
 *  本命克日课(我克为财)、本命生日课(我生为泄) 属中性，不标注。 */
function _nayinRelation(dNayin, yNayin, ctx) {
  if (!dNayin || !yNayin) return [];
  if (dNayin === yNayin) return [{ type: '比和', label: '纳音比和', kind: 'good', ctx: ctx }];
  if (WX_SHENG[dNayin] === yNayin) return [{ type: '生', label: '纳音生', kind: 'good', ctx: ctx }];
  if (WX_KE[dNayin] === yNayin) return [{ type: '克', label: '纳音克', kind: 'bad', ctx: ctx }];
  return [];
}

function _zhiIdx(z) { return ZHI_ARR.indexOf(z); }

/** 候选日某支柱 地支 vs 本命某支柱 的关系标注（纯函数，供测试）。
 *  ctx: '日' = 比本命日柱(日元)；'年' = 比本命年柱(年命/生肖)；'课年' = 比本命年柱(以日课年支)。仅用于展示区分，规则完全一致。 */
function _dayUserRelation(dayZhi, userZhi, ctx) {
  if (!ctx) ctx = '日';
  var a = _zhiIdx(dayZhi), b = _zhiIdx(userZhi);
  if (a < 0 || b < 0 || a === b) return [];
  function pair(arr) { return arr.indexOf(a) >= 0 && arr.indexOf(b) >= 0; }
  var out = [];
  if (LIU_CHONG.some(pair)) out.push({ type: '冲', label: '冲本命', kind: 'bad', ctx: ctx });
  if (LIU_HE.some(pair)) out.push({ type: '合', label: '六合', kind: 'good', ctx: ctx });
  if (SAN_HE.some(pair)) out.push({ type: '三合', label: '三合', kind: 'good', ctx: ctx });
  if (SAN_XING.some(pair)) out.push({ type: '刑', label: '三刑', kind: 'bad', ctx: ctx });
  if (LIU_HAI.some(pair)) out.push({ type: '害', label: '六害', kind: 'bad', ctx: ctx });
  return out;
}

/** 应用本命合参（七维度）：候选日 日支/年支 比 本命日柱(日元)/年命(地支)；
 *  候选日 日柱/年柱 纳音 分别比 本命年命纳音 与 本命日元纳音（双参照）。
 *  全部关系合并标注 + 同等级内按软权重重排；grade 吉凶定级不变。任一维度为空则忽略。
 *  userDayZhi：本命日柱地支；userYearPillar：本命年柱完整干支；userDayPillar：本命日柱完整干支。 */
function _applyBenming(days, userDayZhi, userYearPillar, userDayPillar) {
  if (!userDayZhi && !userYearPillar && !userDayPillar) return days;
  var userYearZhi = userYearPillar ? userYearPillar[1] : '';
  var userYearNayin = userYearPillar ? (NAYIN[userYearPillar] || '') : '';
  var userDayNayin = userDayPillar ? (NAYIN[userDayPillar] || '') : '';
  var WMAP = { '三合': 6, '合': 6, '生': 3, '比和': 2, '冲': -8, '刑': -4, '害': -4, '克': -10 };
  var arr = days.map(function(d) {
    var dayZhi = (d.gz && d.gz.day && d.gz.day[1]) || '';
    var yearZhi = (d.gz && d.gz.year && d.gz.year[1]) || '';
    var dayNayin = (d.gz && d.gz.day && NAYIN[d.gz.day]) || '';
    var yearNayin = (d.gz && d.gz.year && NAYIN[d.gz.year]) || '';
    var relDay = userDayZhi ? _dayUserRelation(dayZhi, userDayZhi, '日') : [];
    var relYear = userYearZhi ? _dayUserRelation(dayZhi, userYearZhi, '年') : [];
    var relYrYear = userYearZhi ? _dayUserRelation(yearZhi, userYearZhi, '课年') : [];
    var relDayN = (userYearNayin && dayNayin) ? _nayinRelation(dayNayin, userYearNayin, '日纳') : [];
    var relYrN = (userYearNayin && yearNayin) ? _nayinRelation(yearNayin, userYearNayin, '年纳') : [];
    var relDayN2 = (userDayNayin && dayNayin) ? _nayinRelation(dayNayin, userDayNayin, '日纳元') : [];
    var relYrN2 = (userDayNayin && yearNayin) ? _nayinRelation(yearNayin, userDayNayin, '年纳元') : [];
    var rel = relDay.concat(relYear, relYrYear, relDayN, relYrN, relDayN2, relYrN2);
    var w = 0;
    rel.forEach(function(r) { w += (WMAP[r.type] || 0); });
    var c = {}; for (var k in d) c[k] = d[k];
    c.benming = rel; c._bw = w;
    return c;
  });
  arr.sort(function(x, y) {
    var gr = { '吉': 0, '平': 1, '忌': 2 };
    if (gr[x.grade] !== gr[y.grade]) return gr[x.grade] - gr[y.grade];
    return (y.score + (y._bw || 0)) - (x.score + (x._bw || 0));
  });
  return arr;
}

/** 读取用户保存的命盘档案（localStorage: bazi_archives） */
function _loadArchives() {
  try {
    var raw = localStorage.getItem('bazi_archives');
    if (!raw) return [];
    var l = JSON.parse(raw);
    return Array.isArray(l) ? l : [];
  } catch (e) { return []; }
}

/** 把用户输入/档案值规整为本命日支（取干支第 2 字的地支），非法返回 '' */
function _normZhi(s) {
  if (!s) return '';
  s = String(s).trim();
  if (!s) return '';
  var z = s.length >= 2 ? s[1] : s[0];
  return _zhiIdx(z) >= 0 ? z : '';
}

function _esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 本命合参下拉项：不参 + 各保存命盘（取 日柱 与 年命，编码为「日柱|年命」） */
function _benmingOptions() {
  var list = _loadArchives();
  var opts = '<option value="">不参本命</option>';
  list.forEach(function(r) {
    var p = r.pillars || {};
    var day = p.day || '';
    var year = p.year || '';
    if (!day && !year) return;
    var val = day + (year ? '|' + year : '');
    var tag = (day ? '日柱 ' + day : '') + (year ? (day ? ' · ' : '') + '年命 ' + year : '');
    opts += '<option value="' + val + '">' + _esc(r.name || '命盘') + '（' + tag + '）</option>';
  });
  return opts;
}

/** 三柱展示：年 月 日 干支（来自 computeDayFromLunar 真实节气干支） */
function _bazi3col(gz) {
  if (!gz) return '';
  var y = gz.year || '', m = gz.month || '', d = gz.day || '';
  if (!y && !m && !d) return '';
  return y + '年 ' + m + '月 ' + d + '日';
}

// 事项选项（key 须与 server/routes/calendar.js 的 CHOOSE_EVENTS 键名严格一致）
var EVENT_OPTIONS = [
  { key: 'jiahun', label: '嫁娶（结婚）' },
  { key: 'ruZhai', label: '移徙入宅（搬家）' },
  { key: 'kaiShi', label: '开市开业' },
  { key: 'dongTu', label: '动土修造' },
  { key: 'chuXing', label: '出行' },
  { key: 'anZang', label: '安葬' },
  { key: 'qiFu', label: '祈福祭祀' },
  { key: 'dingMeng', label: '订盟纳采（订婚）' },
  { key: 'qiuYi', label: '求医治病' },
  { key: 'qianYue', label: '签约交易' }
];

/** 初始化：注入「择日」按钮（点击跳转到独立页面 #choose） */
function init() {
  var header = document.getElementById('calHeaderBar');
  if (header && !document.getElementById('btnChoose')) {
    var btn = document.createElement('button');
    btn.id = 'btnChoose';
    btn.className = 'cal-header-btn choose-btn';
    btn.type = 'button';
    btn.innerHTML = '<i class="ti ti-calendar-star"></i> 择日';
    btn.addEventListener('click', function() { Router.navigate('choose'); });
    header.appendChild(btn);
  }
}

// 模块级状态：保存上次查询，重新进入择日页直接复原（不重查）
var _last = { event: '', y: 0, m: 0, benming: '', manualDay: '', manualYear: '', resultsHtml: '' };

/** 显示择日独立页（由路由 #choose 调用）：渲染进 choose-root，恢复返回通道与上次结果 */
function show() {
  var root = document.getElementById('choose-root');
  if (!root) return;
  root.innerHTML = _pageHtml();
  bindPage(root);
  // ESC 键返回（仅在择日路由下生效）
  document.removeEventListener('keydown', _onEsc, true);
  document.addEventListener('keydown', _onEsc, true);
  if (_last.resultsHtml) {
    var results = root.querySelector('#chooseResults');
    if (results) results.innerHTML = _last.resultsHtml;
    _restoreControls(root);
  }
}

/** ESC 键返回监听（幂等：仅在当前路由为 choose 时触发） */
function _onEsc(e) {
  if (e.key === 'Escape' && Router.current && Router.current() === 'choose') back();
}

/** 返回日历页（页面内「返回」按钮 / ESC 共用） */
function back() {
  document.removeEventListener('keydown', _onEsc, true);
  Router.navigate('calendar');
}

/** 恢复上次查询的控件取值 */
function _restoreControls(root) {
  try {
    if (_last.event) { var ev = root.querySelector('#chooseEvent'); if (ev) ev.value = _last.event; }
    if (_last.y) { var y = root.querySelector('#chooseY'); if (y) y.value = String(_last.y); }
    if (_last.m) { var m = root.querySelector('#chooseM'); if (m) m.value = String(_last.m); }
    if (_last.benming !== undefined) { var b = root.querySelector('#chooseBenming'); if (b) b.value = _last.benming; }
    if (_last.manualDay) { var md = root.querySelector('#chooseBenmingManual'); if (md) md.value = _last.manualDay; }
    if (_last.manualYear) { var my = root.querySelector('#chooseYearManual'); if (my) my.value = _last.manualYear; }
  } catch (e) {}
}

function _pageHtml() {
  var now = new Date();
  var curY = (document.getElementById('Cal_y') || {}).value || now.getFullYear();
  var curM = (document.getElementById('Cal_m') || {}).value || (now.getMonth() + 1);
  var yOpts = '', mOpts = '';
  for (var y = 1900; y <= 2100; y++) yOpts += '<option value="' + y + '"' + (y == curY ? ' selected' : '') + '>' + y + '</option>';
  for (var m = 1; m <= 12; m++) mOpts += '<option value="' + m + '"' + (m == curM ? ' selected' : '') + '>' + m + '</option>';
  var evOpts = EVENT_OPTIONS.map(function(e) { return '<option value="' + e.key + '">' + e.label + '</option>'; }).join('');
  var bmOpts = _benmingOptions();
  return '' +
    '<div class="choose-page">' +
      '<div class="choose-page-bar">' +
        '<button id="chooseBack" class="choose-back-btn" type="button"><i class="ti ti-arrow-left"></i> 返回</button>' +
        '<span class="choose-page-title">择日助手</span>' +
      '</div>' +
      '<div class="choose-panel-inner">' +
        '<div class="choose-title">择日助手 <span class="choose-sub">依《协纪辨方书》择日通则，基于当日真实黄历宜忌与神煞</span></div>' +
        '<div class="choose-controls">' +
          '<label class="choose-field">事项<select id="chooseEvent" class="cal-header-sel">' + evOpts + '</select></label>' +
          '<label class="choose-field">月份<select id="chooseY" class="cal-header-sel">' + yOpts + '</select>年' +
            '<select id="chooseM" class="cal-header-sel cal-header-sel-sm">' + mOpts + '</select>月</label>' +
          '<button id="chooseGo" class="cal-header-btn choose-go">查询</button>' +
        '</div>' +
        '<div class="choose-controls choose-controls-2">' +
          '<label class="choose-field">本命合参<select id="chooseBenming" class="cal-header-sel">' + bmOpts + '</select></label>' +
          '<label class="choose-field">或填日柱<input id="chooseBenmingManual" class="cal-header-sel cal-header-sel-sm" placeholder="如 甲子" maxlength="2"></label>' +
          '<label class="choose-field">或填年命<input id="chooseYearManual" class="cal-header-sel cal-header-sel-sm" placeholder="如 丙午" maxlength="2"></label>' +
        '</div>' +
        '<div id="chooseResults" class="choose-results"></div>' +
      '</div>' +
    '</div>';
}

function bindPage(root) {
  var go = root.querySelector('#chooseGo');
  if (go) go.addEventListener('click', function() {
    var ev = root.querySelector('#chooseEvent').value;
    var y = parseInt(root.querySelector('#chooseY').value, 10);
    var m = parseInt(root.querySelector('#chooseM').value, 10);
    _query(ev, y, m, root);
  });
  var backBtn = root.querySelector('#chooseBack');
  if (backBtn) backBtn.addEventListener('click', back);
  var results = root.querySelector('#chooseResults');
  if (results) results.addEventListener('click', function(e) {
    var v = e.target.closest && e.target.closest('.cdc-view');
    if (!v) return;
    var card = v.closest('.choose-day-card');
    if (!card) return;
    var y = parseInt(card.getAttribute('data-y'), 10);
    var m = parseInt(card.getAttribute('data-m'), 10);
    var d = parseInt(card.getAttribute('data-d'), 10);
    // 返回日历页并展开该日日课详情
    Router.navigate('calendar');
    setTimeout(function() {
      import('./calendar-ui.js').then(function(mod) { if (mod && mod.selectDay) mod.selectDay(y, m, d); }).catch(function() {});
    }, 30);
  });
}

function _query(ev, y, m, panel) {
  var results = (panel && panel.querySelector('#chooseResults')) || document.getElementById('chooseResults');
  if (!results) return;
  // 记录本次查询参数（供返回后复原）
  _last.event = ev; _last.y = y; _last.m = m;
  // 本命合参：下拉选中的保存命盘编码「日柱|年命(完整干支)」；手动输入可分别覆盖日柱 / 年命
  var userDay = '', userYear = '', userYearPillar = '', userDayPillar = '';
  if (panel) {
    var sel = panel.querySelector('#chooseBenming');
    var manualDay = panel.querySelector('#chooseBenmingManual');
    var manualYear = panel.querySelector('#chooseYearManual');
    _last.benming = sel ? sel.value : '';
    _last.manualDay = manualDay ? manualDay.value : '';
    _last.manualYear = manualYear ? manualYear.value : '';
    if (sel && sel.value) {
      var parts = sel.value.split('|');
      if (parts[0]) { userDay = _normZhi(parts[0]); userDayPillar = NAYIN[parts[0]] ? parts[0] : ''; }
      if (parts[1]) { userYear = _normZhi(parts[1]); userYearPillar = parts[1]; }
    }
    if (manualDay && manualDay.value) { userDay = _normZhi(manualDay.value); userDayPillar = NAYIN[manualDay.value] ? manualDay.value : ''; }
    if (manualYear && manualYear.value) { userYear = _normZhi(manualYear.value); userYearPillar = manualYear.value; }
  }
  results.innerHTML = '<div class="choose-loading"><i class="ti ti-loader-2"></i> 查询中…</div>';
  API.post('/calendar/choose', { event: ev, y: y, m: m }).then(function(r) {
    if (!r || !r.ok) {
      results.innerHTML = '<div class="choose-empty">查询失败：' + ((r && r.error) || '未知错误') + '</div>';
      return;
    }
    if (userDay || userYearPillar || userDayPillar) r.data.days = _applyBenming(r.data.days, userDay, userYearPillar, userDayPillar);
    r.data.benmingDay = userDay;
    r.data.benmingYear = userYear;
    r.data.benmingYearPillar = userYearPillar;
    results.innerHTML = _renderResultsHtml(r.data);
    _last.resultsHtml = results.innerHTML;   // 保存渲染结果，重新进入择日页直接复原
  }).catch(function(e) {
    results.innerHTML = '<div class="choose-empty">查询失败：' + ((e && e.message) || e) + '</div>';
  });
}

/** 单日候选卡 HTML（纯函数，供测试） */
function _dayCardHtml(d) {
  var reasons = (d.reasons || []).map(function(r) { return '<span class="cdc-reason">' + r + '</span>'; }).join('');
  var bm = '';
  if (d.benming && d.benming.length) {
    bm = d.benming.map(function(r) {
      var ctxTxt = ({ '日': '本命日支', '年': '本命年命', '课年': '日课年支', '日纳': '日柱纳音·年命', '年纳': '年柱纳音·年命', '日纳元': '日柱纳音·日元', '年纳元': '年柱纳音·日元' })[r.ctx] || '本命';
      return '<span class="cdc-bm cdc-bm-' + r.kind + '" title="' + r.label + '（' + ctxTxt + '合参）">' + r.label + '<small class="cdc-bm-ctx">' + r.ctx + '</small></span>';
    }).join('');
  }
  return '<div class="choose-day-card grade-' + d.grade + '" data-y="' + d.y + '" data-m="' + d.m + '" data-d="' + d.d + '">' +
    '<div class="cdc-head">' +
      '<span class="cdc-date">' + d.y + '年' + d.m + '月' + d.d + '日</span>' +
      '<span class="cdc-lunar">' + (d.lunarD || '') + '</span>' +
      '<span class="cdc-gz" title="日课干支（节气真干支）">' + _bazi3col(d.gz) + '</span>' +
      '<span class="cdc-jc">' + (d.jianChu || '') + '日</span>' +
      '<span class="cdc-grade grade-' + d.grade + '">' + d.grade + '</span>' +
    '</div>' +
    '<div class="cdc-reasons">' + reasons + '</div>' +
    (bm ? '<div class="cdc-benming">本命：' + bm + '</div>' : '') +
    '<button class="cdc-view" type="button">查看日课</button>' +
  '</div>';
}

/** 渲染整个择日结果（纯函数，供测试）：候选日 + 诸事不宜日 + 出处 */
function _renderResultsHtml(data) {
  if (!data || !data.days) return '<div class="choose-empty">暂无数据</div>';
  var h = '';
  h += '<div class="choose-meta">事项：<b>' + (data.label || '') + '</b> · ' + data.y + '年' + data.m + '月 · 共' + data.total + '天' +
       '<div class="choose-ref">' + (data.ref || '') + '</div>' +
       (data.benmingDay || data.benmingYear ? '<div class="choose-benming-note">已按本命' + (data.benmingDay ? '日支「' + data.benmingDay + '」' : '') + (data.benmingYear ? (data.benmingDay ? ' 与' : '') + '年命「' + data.benmingYear + '」' : '') + '合参（含日课年柱冲合、年命与日元纳音生克）：冲/刑/害/纳音克仅影响同等级内排序，不改吉凶定级</div>' : '') + '</div>';
  var cands = data.days.filter(function(d) { return d.grade !== '忌'; });
  h += '<div class="choose-section-title">推荐候选日（' + cands.length + '）</div>';
  if (!cands.length) h += '<div class="choose-empty">本月无推荐候选日，见下方「诸事不宜」。</div>';
  cands.forEach(function(d) { h += _dayCardHtml(d); });
  if (data.avoidDays && data.avoidDays.length) {
    h += '<details class="choose-avoid"><summary>本月诸事不宜日（' + data.avoidDays.length + '）</summary>';
    data.avoidDays.forEach(function(d) {
      h += '<div class="choose-avoid-row"><span class="ca-d">' + d.m + '月' + d.d + '日</span>' +
           '<span class="ca-lunar">' + (d.lunarD || '') + '</span>' +
           '<span class="ca-reason">' + (d.reason || '') + '</span></div>';
    });
    h += '</details>';
  }
  h += '<div class="choose-sources">参考：' + (data.sources || []).join('；') + '</div>';
  return h;
}

export { init, show, back, _renderResultsHtml, _dayCardHtml, _dayUserRelation, _applyBenming, _bazi3col, _normZhi, ZHI_ARR };
