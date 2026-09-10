// web/js/ziwei-ui.js — 紫微斗数 vanilla 模块（文墨天机风格方盘）
// 数据来源：后端 /api/v1/ziwei/astrolabe + /api/v1/ziwei/horoscope
// 复用 web/js/api.js 的 API.post（自动 HMAC 签名）
import { API } from './api.js';
import { parseClockTime } from './time-util.js';

// ════════════════════════════════════════════════════════════════
// localStorage 封装
// ════════════════════════════════════════════════════════════════
function _lsGet(k, d) {
  try { var v = localStorage.getItem(k); return v !== null ? v : d; } catch (e) { return d; }
}
function _lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch (e) {}
}

// ════════════════════════════════════════════════════════════════
// 状态
// ════════════════════════════════════════════════════════════════
var state = {
  form: {
    name: '', sex: '男', calType: 'solar',
    y: 1990, m: 5, d: 15,
    hour: 12, min: 0,
    zty: false,
    jd: 120, wd: 0,
    province: '', region: '', location: ''
  },
  astrolabe: null,
  horoscope: null,
  scope: 'native',   // native | decadal | yearly  → 展示为天盘/地盘/人盘
  targetYear: new Date().getFullYear(),
  selected: null,
  viewMode: _zwViewMode(), // feixing | sanhe | sihua（默认三合盘，可被设置覆盖）
  flyScope: 'ming-da', // ming-da（命宫+大限，默认）| all（12宫×4）
  flyPalace: null,     // 飞星视图：当前点选的“发出四化之宫”index
  sihuaFilter: null,   // null | 'A'|'B'|'C'|'D'（四化视图聚焦字母）
  patternFocus: null   // null | string[]（格局高亮：相关宫名集合）
};

// 4×4 方盘地支环位（子北午南卯东酉西）
var BRANCH_POS = {
  '巳': [0, 0], '午': [0, 1], '未': [0, 2], '申': [0, 3],
  '辰': [1, 0],                         '酉': [1, 3],
  '卯': [2, 0],                         '戌': [2, 3],
  '寅': [3, 0], '丑': [3, 1], '子': [3, 2], '亥': [3, 3]
};
var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
var MUTAGEN_LABEL = ['禄', '权', '科', '忌'];
var SCOPE_LABEL = { native: '天盘', decadal: '地盘', yearly: '人盘' };
var VIEW_LABEL = { feixing: '飞星', sanhe: '三合', sihua: '四化' };

// 紫微默认视图（来自设置 zw_viewMode；默认三合）
function _zwViewMode() { try { return localStorage.getItem('zw_viewMode') || 'sanhe'; } catch(e) { return 'sanhe'; } }

// 年干/宫干 四化表（中州/飞星派标准）：顺序 禄/权/科/忌
var MUTAGEN_MAP = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼']
};

// 飞星四化类型与配色
var FLY_TYPES = ['禄', '权', '科', '忌'];
var FLYING_COLOR = { '禄': '#2e7d32', '权': '#C41E0A', '科': '#7b4fb0', '忌': '#3a3a3a' };
// 飞星渐变深色端（与 FLYING_COLOR 同色系，勾出「深→亮」的流光层次）
var FLY_DARK = { '禄': '#1b5e20', '权': '#8f1407', '科': '#5a3582', '忌': '#222222' };
// 宫序（1=命宫 … 12=父母），用于三方四正几何（不能用数组 index，因命宫不固定位）
var PALACE_SEQ = { '命宫': 1, '兄弟': 2, '夫妻': 3, '子女': 4, '财帛': 5, '疾厄': 6, '迁移': 7, '交友': 8, '仆役': 8, '官禄': 9, '田宅': 10, '福德': 11, '父母': 12 };
state.flyFilter = { '禄': true, '权': true, '科': true, '忌': true };

// 主星五行（用于上色）
var STAR_WX = {
  '紫微': '土', '天机': '木', '太阳': '火', '武曲': '金', '天同': '水', '廉贞': '火',
  '天府': '土', '太阴': '水', '贪狼': '木', '巨门': '水', '天相': '水', '天梁': '土',
  '七杀': '金', '破军': '水', '左辅': '土', '右弼': '水', '文昌': '金', '文曲': '水',
  '禄存': '土', '天魁': '火', '天钺': '火', '擎羊': '金', '陀罗': '金', '火星': '火',
  '铃星': '火', '地空': '火', '地劫': '火', '红鸾': '水', '天喜': '水', '天姚': '水',
  '天马': '火', '化禄': '金', '化权': '木', '化科': '火', '化忌': '水'
};
function wxClass(starName) {
  var wx = STAR_WX[starName];
  return wx ? ('zw-wx-' + wx) : '';
}

function _pad2(n) { return String(n).padStart(2, '0'); }
function _shichenName(h, min) {
  var idx = Math.floor(((h + (min >= 30 ? 1 : 0) + 1) % 24) / 2);
  var names = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return names[idx] + '时';
}

// ════════════════════════════════════════════════════════════════
// 飞星 / 三合 计算
// ════════════════════════════════════════════════════════════════
// 星名 → 所在宫 index（主星优先，辅星补充）
function computeStarToPalace(palaces) {
  var map = {};
  palaces.forEach(function(p) {
    (p.majorStars || []).forEach(function(s) { map[s.name] = p.index; });
    (p.minorStars || []).forEach(function(s) { if (map[s.name] === undefined) map[s.name] = p.index; });
  });
  return map;
}

// 宫干四化飞星：每宫宫干 → 禄权科忌星名 → 星所在宫 = 飞入宫；同宫即自化
function computeFlyingStars(palaces) {
  var starToPalace = computeStarToPalace(palaces);
  var links = [];
  palaces.forEach(function(p) {
    var arr = MUTAGEN_MAP[p.heavenlyStem];
    if (!arr) return;
    for (var i = 0; i < 4; i++) {
      var starName = arr[i];
      var toIdx = starToPalace[starName];
      if (toIdx === undefined) continue;
      links.push({ from: p.index, to: toIdx, type: MUTAGEN_LABEL[i], star: starName, self: (toIdx === p.index) });
    }
  });
  return { links: links, starToPalace: starToPalace };
}

// 地支 → 盘内像素中心（viewBox 0..162 × 0..130，与盘容器 162:130 同比例 → 等比不拉伸，圆为真圆）
function branchCenter(branch) {
  var pos = BRANCH_POS[branch];
  if (!pos) return { x: 81, y: 65 };
  return { x: (pos[1] + 0.5) * 40.5, y: (pos[0] + 0.5) * 32.5 };
}

// 按宫 index 取宫（不要直接用 palaces[idx]：iztro 数组顺序未必等于 index 序号）
function palaceByIndex(palaces, idx) {
  for (var i = 0; i < palaces.length; i++) if (palaces[i].index === idx) return palaces[i];
  return null;
}

// 命宫 / 大限命宫 序号（供飞星默认过滤）
function getMingIdx(palaces) {
  var f = palaces.find(function(p) { return p.name === '命宫'; });
  return f ? f.index : 0;
}
function getDaIdx() {
  if (state.horoscope && state.horoscope.decadal && state.horoscope.decadal.index != null) {
    return state.horoscope.decadal.index;
  }
  return getMingIdx(state.astrolabe ? state.astrolabe.palaces : []);
}
function flyingLinksFiltered(links, palaces) {
  if (state.flyScope === 'all') return links;
  var ming = getMingIdx(palaces);
  var da = getDaIdx();
  return links.filter(function(l) { return l.from === ming || l.from === da; });
}

function mod12b1(n) { return ((n - 1) % 12 + 12) % 12 + 1; }

// 三方四正：本宫 + (本宫+4) + (本宫+8) 三合，+ (本宫+6) 对宫
function buildSeqBranchMap(palaces) {
  var m = {};
  palaces.forEach(function(p) { var s = PALACE_SEQ[p.name]; if (s) m[s] = p.earthlyBranch; });
  return m;
}
function sanheSet(name, seqBranchMap) {
  var seq = PALACE_SEQ[name];
  if (!seq) return [];
  return [mod12b1(seq + 4), mod12b1(seq + 8), mod12b1(seq + 6)]
    .map(function(s) { return seqBranchMap[s]; })
    .filter(Boolean);
}

// ════════════════════════════════════════════════════════════════
// 入口：show()
// ════════════════════════════════════════════════════════════════
export function show() {
  var root = document.getElementById('ziwei-vanilla-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ziwei-vanilla-root';
    var main = document.querySelector('.main-content') || document.body;
    main.appendChild(root);
  }
  window.__setActivePage('ziwei-vanilla-root');
  var topNav = document.querySelector('.top-nav');
  if (topNav) topNav.style.display = '';

  root.innerHTML = buildShellHTML();
  _bindForm();
  _bindSaved();
  _bindFlyFilter();
  _initAiPanel();
  _prefillFromBazi();
  _restoreForm();
  _initRegionCascader();
  _autoCalcIfReady();

  if (window.State) window.State.emit('page:changed', 'ziwei');
}

export function buildFormHTML() {
  return _formBlockHTML();
}

function buildShellHTML() {
  var vm = _zwViewMode();
  return ''
    + '<div class="zw-shell">'
    +   '<div class="zw-left">'
    +     _formBlockHTML()
    +     _scopeBlockHTML()
    +     _aiBlockHTML()
    +     _savedBlockHTML()
    +   '</div>'
    +   '<div class="zw-right">'
    +     '<div id="zw-view-panels">'
    +       '<div class="zw-view-panel' + (vm === 'feixing' ? ' active' : '') + '" data-view="feixing">' + _chartCardHTML('feixing') + '</div>'
    +       '<div class="zw-view-panel' + (vm === 'sanhe' ? ' active' : '') + '" data-view="sanhe">' + _chartCardHTML('sanhe') + '</div>'
    +       '<div class="zw-view-panel' + (vm === 'sihua' ? ' active' : '') + '" data-view="sihua"><div id="zw-sihua-card" class="zw-sihua-card"></div></div>'
    +     '</div>'
    +     _bottomTabsHTML()
    +     _patternsBlockHTML()
    +   '</div>'
    + '</div>';
}

// 盘面卡片（feixing/sanhe 共用，含 SVG 叠加层）
function _chartCardHTML(mode) {
  var legend = '';
  if (mode === 'feixing') {
    var scopeBtns = '<div class="zw-fly-scope">'
      + '<button class="zw-fly-scope-btn active" data-scope="ming-da">命宫+大限</button>'
      + '<button class="zw-fly-scope-btn" data-scope="all">全部飞化</button>'
      + '</div>';
    var chips = FLY_TYPES.map(function(t) {
      return '<span class="zw-fly-chip active" data-type="' + t + '">' + t + '</span>';
    }).join('');
    legend = '<div class="zw-fly-filter">' + scopeBtns
      + '<div class="zw-fly-chips">' + chips + '</div>'
      + '<span class="zw-legend-note">点击宫位，高亮该宫飞出的四星耀；环=自化</span></div>';
  } else if (mode === 'sanhe') {
    legend = '<div class="zw-legend-note">三方四正（虚线）：本宫 + 三合两位 + 对宫 · 点击宫位高亮其三方四正</div>';
  } else if (mode === 'sihua') {
    legend = '<div class="zw-legend-note">A=禄 B=权 C=科 D=忌（标于星曜右侧） · 点下方表格字母聚焦对应宫</div>';
  }
  return ''
    + '<div class="zw-chart-card">'
    +   '<div class="zw-chart-wrap">'
    +     '<div class="zw-chart-canvas">'
    +       '<div class="zw-chart-grid" data-chart="' + mode + '"></div>'
    +       '<svg class="zw-overlay" data-overlay="' + mode + '" viewBox="0 0 162 130" preserveAspectRatio="none"></svg>'
    +     '</div>'
    +   '</div>'
    +   legend
    + '</div>'
    + '<div class="zw-detail"></div>';
}

function _formBlockHTML() {
  var years = '';
  for (var y = 2026; y >= 1920; y--) years += '<option value="' + y + '">' + y + '</option>';
  var months = '';
  for (var m = 1; m <= 12; m++) months += '<option value="' + m + '">' + m + '月</option>';
  var days = '';
  for (var d = 1; d <= 31; d++) days += '<option value="' + d + '">' + d + '日</option>';

  return ''
    + '<div class="zw-card zw-form">'
    +   '<div class="zw-card-title">紫微斗数 · 排盘</div>'
    +   '<div class="zw-form-row">'
    +     '<label>姓名</label><input id="zw-name" type="text" placeholder="可选" class="zw-input"/>'
    +   '</div>'
    +   '<div class="zw-form-row">'
    +     '<label>性别</label>'
    +     '<select id="zw-sex" class="zw-input"><option value="男">男</option><option value="女">女</option></select>'
    +   '</div>'
    +   '<div class="zw-form-row">'
    +     '<label>历法</label>'
    +     '<div class="zw-radio-group">'
    +       '<label><input type="radio" name="zw-cal" value="solar" checked/> 阳历</label>'
    +       '<label><input type="radio" name="zw-cal" value="lunar"/> 农历</label>'
    +     '</div>'
    +   '</div>'
    +   '<div class="zw-form-row zw-date-row">'
    +     '<select id="zw-y" class="zw-input">' + years + '</select>'
    +     '<select id="zw-m" class="zw-input">' + months + '</select>'
    +     '<select id="zw-d" class="zw-input">' + days + '</select>'
    +   '</div>'
    +   '<div class="zw-form-row">'
    +     '<label>时间</label><input id="zw-time" type="time" value="12:00" class="zw-input"/>'
    +   '</div>'
    +   '<div class="zw-form-row zw-time-hint">'
    +     '<span id="zw-shichen-hint">当前时辰：午时</span>'
    +   '</div>'
    +   '<div class="zw-form-row">'
    +     '<label>出生地</label>'
    +     '<div id="zw-region-wrap" class="zw-region-wrap"></div>'
    +     '<input type="hidden" id="zw-Jd_input" value="116.4"/>'
    +     '<input type="hidden" id="zw-Wd_input" value="39.9"/>'
    +   '</div>'
    +   '<div class="zw-recent-row">'
    +     '<span class="zw-recent-chip" data-prov="北京市" data-region="北京">北京</span>'
    +     '<span class="zw-recent-chip" data-prov="上海市" data-region="上海">上海</span>'
    +     '<span class="zw-recent-chip" data-prov="广东省" data-region="广州">广州</span>'
    +     '<span class="zw-recent-chip" data-prov="四川省" data-region="成都">成都</span>'
    +     '<span class="zw-recent-chip" data-prov="广东省" data-region="深圳">深圳</span>'
    +   '</div>'
    +   '<div class="zw-form-row zw-zty-row">'
    +     '<label>真太阳时</label>'
    +     '<label class="zw-toggle"><input type="checkbox" id="zw-zty"/><span class="zw-toggle-slider"></span></label>'
    +   '</div>'
    +   '<div class="zw-btn-row">'
    +     '<button id="zw-submit" class="zw-btn zw-btn-primary">排盘</button>'
    +     '<button id="zw-save" class="zw-btn zw-btn-ghost">保存此排盘</button>'
    +   '</div>'
    +   '<div id="zw-msg" class="zw-msg"></div>'
    + '</div>';
}

function _scopeBlockHTML() {
  var ty = new Date().getFullYear();
  return ''
    + '<div class="zw-card zw-scope">'
    +   '<div class="zw-card-title">运限</div>'
    +   '<div class="zw-radio-group zw-scope-tabs">'
    +     '<button class="zw-scope-btn active" data-scope="native">天盘</button>'
    +     '<button class="zw-scope-btn" data-scope="decadal">地盘</button>'
    +     '<button class="zw-scope-btn" data-scope="yearly">人盘</button>'
    +   '</div>'
    +   '<div class="zw-form-row zw-target-row" style="display:none">'
    +     '<label>目标年</label><input id="zw-target-year" type="number" class="zw-input" value="' + ty + '" min="1920" max="2100"/>'
    +     '<button id="zw-scope-apply" class="zw-btn">应用</button>'
    +   '</div>'
    +   '<div id="zw-scope-info" class="zw-scope-info"></div>'
    + '</div>';
}

function _aiBlockHTML() {
  return ''
    + '<div class="zw-card zw-ai">'
    +   '<div class="zw-card-title">AI 解读</div>'
    +   '<div class="zw-form-row">'
    +     '<input id="zw-ai-key" type="password" placeholder="DeepSeek API Key（本地保存）" class="zw-input"/>'
    +   '</div>'
    +   '<div class="zw-form-row">'
    +     '<button id="zw-ai-run" class="zw-btn zw-btn-primary">生成解读</button>'
    +   '</div>'
    +   '<div id="zw-ai-out" class="zw-ai-out"></div>'
    + '</div>';
}

function _savedBlockHTML() {
  return ''
    + '<div class="zw-card zw-saved">'
    +   '<div class="zw-card-title">已保存排盘 <span class="zw-saved-count" id="zw-saved-count"></span></div>'
    +   '<input id="zw-saved-search" class="zw-input zw-saved-search" type="text" placeholder="搜索姓名 / 备注 / 城市"/>'
    +   '<div id="zw-saved-list" class="zw-saved-list"></div>'
    + '</div>';
}

function _bottomTabsHTML() {
  var vm = _zwViewMode();
  return ''
    + '<div class="zw-bottom-tabs">'
    +   '<button class="zw-bottom-tab' + (vm === 'feixing' ? ' active' : '') + '" data-view="feixing">飞星</button>'
    +   '<button class="zw-bottom-tab' + (vm === 'sanhe' ? ' active' : '') + '" data-view="sanhe">三合</button>'
    +   '<button class="zw-bottom-tab' + (vm === 'sihua' ? ' active' : '') + '" data-view="sihua">四化</button>'
    + '</div>';
}

// ════════════════════════════════════════════════════════════════
// 格局判定卡（后端 detectPatterns 结果）
// ════════════════════════════════════════════════════════════════
function _patternsBlockHTML() {
  return ''
    + '<div class="zw-card zw-patterns-card" id="zw-patterns-card">'
    +   '<div class="zw-card-title">格局判定 <span class="zw-patterns-count" id="zw-patterns-count"></span></div>'
    +   '<div id="zw-patterns-list" class="zw-patterns-list"></div>'
    + '</div>';
}

// 12 宫标准名（用于判断 pattern.palaces 中哪些是真实宫名，可联动高亮）
var PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '仆役', '官禄', '田宅', '福德', '父母'];

function _renderPatterns() {
  var box = document.getElementById('zw-patterns-list');
  if (!box) return;
  var countEl = document.getElementById('zw-patterns-count');
  var patterns = (state.astrolabe && state.astrolabe.patterns) || [];
  if (countEl) countEl.textContent = patterns.length ? ('共 ' + patterns.length + ' 项') : '';
  if (!patterns.length) {
    box.innerHTML = '<div class="zw-patterns-empty">未判定出明显吉 / 煞格局</div>';
    return;
  }
  // 吉格在前，煞格在后；同级按乙→甲（甲级更罕见更醒目，但视觉上吉先煞后更清晰）
  var ji = patterns.filter(function(p) { return p.cat === '吉'; });
  var sha = patterns.filter(function(p) { return p.cat === '煞'; });
  var ordered = ji.concat(sha);

  var html = '';
  ordered.forEach(function(p) {
    var cls = p.cat === '吉' ? 'zw-pattern-ji' : 'zw-pattern-sha';
    var levelTag = p.level ? '<span class="zw-pattern-level">' + p.level + '级</span>' : '';
    var palNames = (p.palaces || []).filter(function(n) { return PALACE_NAMES.indexOf(n) >= 0; });
    var palText = palNames.length ? ('<span class="zw-pattern-pal"> · ' + palNames.join('、') + '</span>') : '';
    var dataNames = encodeURIComponent(JSON.stringify(palNames));
    html += '<div class="zw-pattern ' + cls + '" data-names="' + dataNames + '">'
      +   '<div class="zw-pattern-head">'
      +     '<span class="zw-pattern-cat">' + p.cat + '</span>'
      +     '<span class="zw-pattern-name">' + p.name + '</span>'
      +     levelTag
      +   '</div>'
      +   '<div class="zw-pattern-desc">' + p.desc + palText + '</div>'
      + '</div>';
  });
  box.innerHTML = html;

  box.querySelectorAll('.zw-pattern').forEach(function(el) {
    el.addEventListener('click', function() {
      var raw = el.getAttribute('data-names');
      var names = [];
      try { names = JSON.parse(decodeURIComponent(raw)) || []; } catch (e) {}
      // 再次点击同一格局 = 取消高亮
      if (state.patternFocus && _sameNames(state.patternFocus, names)) {
        state.patternFocus = null;
      } else {
        state.patternFocus = names.length ? names : null;
      }
      if (state.patternFocus) {
        // 切到三合视图，确保用户看到被高亮的命盘
        var tabs = document.querySelectorAll('.zw-bottom-tab');
        tabs.forEach(function(t) { if (t.getAttribute('data-view') === 'sanhe') t.click(); });
      }
      _markActivePattern();
      renderChart();
    });
  });
  _markActivePattern();
}

function _sameNames(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function _markActivePattern() {
  var box = document.getElementById('zw-patterns-list');
  if (!box) return;
  box.querySelectorAll('.zw-pattern').forEach(function(el) {
    var raw = el.getAttribute('data-names');
    var names = [];
    try { names = JSON.parse(decodeURIComponent(raw)) || []; } catch (e) {}
    var active = !!(state.patternFocus && _sameNames(state.patternFocus, names));
    el.classList.toggle('zw-pattern-active', active);
  });
}

// ════════════════════════════════════════════════════════════════
// 表单绑定 + 预填
// ════════════════════════════════════════════════════════════════
function _bindForm() {
  var submit = document.getElementById('zw-submit');
  if (submit) submit.addEventListener('click', function() { _calc(); });

  // 运限 tab
  var scopeBtns = document.querySelectorAll('.zw-scope-btn');
  scopeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      scopeBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.scope = btn.getAttribute('data-scope');
      var targetRow = document.querySelector('.zw-target-row');
      if (targetRow) targetRow.style.display = (state.scope === 'native') ? 'none' : '';
      _onScopeChange();
    });
  });

  var scopeApply = document.getElementById('zw-scope-apply');
  if (scopeApply) scopeApply.addEventListener('click', function() {
    var tyEl = document.getElementById('zw-target-year');
    if (tyEl) state.targetYear = parseInt(tyEl.value, 10) || new Date().getFullYear();
    _onScopeChange();
  });

  // 底部 tab
  var bottomTabs = document.querySelectorAll('.zw-bottom-tab');
  bottomTabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      bottomTabs.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.viewMode = btn.getAttribute('data-view');
      // 切换视图时清除临时高亮态
      state.flyPalace = null;
      state.selected = null;
      _renderViewPanels();
    });
  });

  // 时间输入同步时辰
  var timeEl = document.getElementById('zw-time');
  if (timeEl) timeEl.addEventListener('input', _syncShichenFromTime);

  // 最近城市快捷
  var chips = document.querySelectorAll('.zw-recent-chip');
  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var prov = this.getAttribute('data-prov');
      var region = this.getAttribute('data-region');
      if (window._rcSelectByRegion) window._rcSelectByRegion(prov, region, 'zw-');
    });
  });
}

function _bindFlyFilter() {
  var chips = document.querySelectorAll('.zw-fly-chip');
  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var t = chip.getAttribute('data-type');
      chip.classList.toggle('active');
      state.flyFilter[t] = chip.classList.contains('active');
      renderAllCharts();
    });
  });

  // 飞星范围切换：命宫+大限（默认）/ 全部飞化
  var scopeBtns = document.querySelectorAll('.zw-fly-scope-btn');
  scopeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      scopeBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.flyScope = btn.getAttribute('data-scope');
      state.flyPalace = null;
      var svg = document.querySelector('svg[data-overlay="feixing"]');
      if (svg && state.astrolabe) drawFlyingOverlay(svg, state.astrolabe.palaces);
      renderAllCharts();
    });
  });
}

function _initRegionCascader() {
  if (typeof initRegionCascader !== 'function') return;
  initRegionCascader('zw-region-wrap', {
    prefix: 'zw-',
    onChange: function(sel) {
      state.form.province = sel.provinceFull || '';
      state.form.region = sel.region || '';
      state.form.location = (sel.provinceFull || '') + ' ' + (sel.region || '');
      state.form.jd = sel.lon;
      state.form.wd = sel.lat;
      _lsSet('zw_province', state.form.province);
      _lsSet('zw_region', state.form.region);
      _lsSet('zw_jd', String(state.form.jd));
      _lsSet('zw_wd', String(state.form.wd));
    }
  });
}

function _syncShichenFromTime() {
  var timeEl = document.getElementById('zw-time');
  var hint = document.getElementById('zw-shichen-hint');
  if (!timeEl || !hint) return;
  var t = parseClockTime(timeEl.value);
  hint.textContent = '当前时辰：' + _shichenName(t.h, t.min);
}

function _prefillFromBazi() {
  try {
    var nameEl = document.getElementById('Name_input');
    var sexEl = document.getElementById('Sex_input');
    var yEl = document.getElementById('Cml_y'), mEl = document.getElementById('Cml_m');
    var dEl = document.getElementById('Cml_d'), hisEl = document.getElementById('Cml_his');
    if (nameEl && nameEl.value) state.form.name = nameEl.value;
    if (sexEl) state.form.sex = (sexEl.value === '0' ? '女' : '男');
    if (yEl && yEl.value) state.form.y = parseInt(yEl.value, 10) || state.form.y;
    if (mEl && mEl.value) state.form.m = parseInt(mEl.value, 10) || state.form.m;
    if (dEl && dEl.value) state.form.d = parseInt(dEl.value, 10) || state.form.d;
    if (hisEl && hisEl.value) {
      var parts = hisEl.value.split(':');
      state.form.hour = parseInt(parts[0], 10) || 12;
      state.form.min = parseInt(parts[1], 10) || 0;
    }
  } catch (e) {}
}

function _restoreForm() {
  state.form.name = _lsGet('zw_name', state.form.name);
  state.form.sex = _lsGet('zw_sex', state.form.sex);
  state.form.calType = _lsGet('zw_calType', state.form.calType);
  state.form.y = parseInt(_lsGet('zw_y', state.form.y), 10);
  state.form.m = parseInt(_lsGet('zw_m', state.form.m), 10);
  state.form.d = parseInt(_lsGet('zw_d', state.form.d), 10);
  state.form.hour = parseInt(_lsGet('zw_hour', state.form.hour), 10);
  state.form.min = parseInt(_lsGet('zw_min', state.form.min), 10);
  state.form.zty = _lsGet('zw_zty', 'false') === 'true';
  state.form.jd = parseFloat(_lsGet('zw_jd', state.form.jd)) || 120;
  state.form.wd = parseFloat(_lsGet('zw_wd', state.form.wd)) || 0;
  state.form.province = _lsGet('zw_province', state.form.province);
  state.form.region = _lsGet('zw_region', state.form.region);

  var oldTime = _lsGet('zw_time', null);
  if (oldTime !== null && !_lsGet('zw_hour', null)) {
    var idx = parseInt(oldTime, 10);
    if (!isNaN(idx)) {
      var h = idx * 2 - 1;
      if (h < 0) h = 23;
      state.form.hour = h;
      state.form.min = 0;
    }
  }

  _applyFormToInputs(state.form);
}

// 把一份 form 对象回填到所有表单控件（载入已保存排盘 / 恢复时复用）
function _applyFormToInputs(form) {
  var nameEl = document.getElementById('zw-name'); if (nameEl) nameEl.value = form.name;
  var sexEl = document.getElementById('zw-sex'); if (sexEl) sexEl.value = form.sex;
  var calEls = document.querySelectorAll('input[name="zw-cal"]');
  calEls.forEach(function(r) { r.checked = (r.value === form.calType); });
  var yEl = document.getElementById('zw-y'); if (yEl) yEl.value = form.y;
  var mEl = document.getElementById('zw-m'); if (mEl) mEl.value = form.m;
  var dEl = document.getElementById('zw-d'); if (dEl) dEl.value = form.d;
  var tEl = document.getElementById('zw-time'); if (tEl) tEl.value = _pad2(form.hour) + ':' + _pad2(form.min);
  var ztyEl = document.getElementById('zw-zty'); if (ztyEl) ztyEl.checked = form.zty;
  var jdEl = document.getElementById('zw-Jd_input'); if (jdEl) jdEl.value = form.jd;
  var wdEl = document.getElementById('zw-Wd_input'); if (wdEl) wdEl.value = form.wd;

  _syncShichenFromTime();

  if (form.province && form.region) {
    setTimeout(function() {
      if (window._rcSelectByRegion) window._rcSelectByRegion(form.province, form.region, 'zw-');
    }, 200);
  }
}

// ════════════════════════════════════════════════════════════════
// 保存排盘（localStorage，纯前端，不依赖后端 HMAC）
// ════════════════════════════════════════════════════════════════
var SAVED_KEY = 'zw_saved_charts';

function _getSaved() {
  try { var a = JSON.parse(localStorage.getItem(SAVED_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function _setSaved(arr) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); } catch (e) {} }
function _delSaved(id) {
  var a = _getSaved().filter(function(r) { return r.id !== id; });
  _setSaved(a);
  return a;
}

// 取当前表单的快照（仅存生辰输入，下次载入时重新计算，避免陈旧）
function _snapshotForm() {
  _readForm();
  var f = state.form;
  return {
    name: f.name, sex: f.sex, calType: f.calType,
    y: f.y, m: f.m, d: f.d, hour: f.hour, min: f.min,
    zty: f.zty, jd: f.jd, wd: f.wd,
    province: f.province, region: f.region, location: f.location
  };
}

function _saveCurrentChart() {
  var label = window.prompt('给这份排盘起个名字（可留空，默认用姓名）', state.form.name || '');
  if (label === null) return; // 用户取消
  label = label.trim();
  var form = _snapshotForm();
  var rec = {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 7),
    label: label || form.name || '未命名',
    form: form,
    createdAt: new Date().toISOString()
  };
  var arr = _getSaved();
  arr.unshift(rec);
  _setSaved(arr);
  _renderSavedList();
  var msg = document.getElementById('zw-msg');
  if (msg) msg.textContent = '已保存：' + rec.label;
}

function _loadSaved(id) {
  var arr = _getSaved();
  var rec = null;
  for (var i = 0; i < arr.length; i++) { if (arr[i].id === id) { rec = arr[i]; break; } }
  if (!rec) return;
  state.form = Object.assign({}, state.form, rec.form);
  _applyFormToInputs(state.form);
  _calc();
}

function _renderSavedList() {
  var box = document.getElementById('zw-saved-list');
  if (!box) return;
  var countEl = document.getElementById('zw-saved-count');
  var searchEl = document.getElementById('zw-saved-search');
  var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  var arr = _getSaved().slice().sort(function(a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  if (countEl) countEl.textContent = arr.length ? ('共 ' + arr.length + ' 份') : '';
  if (!arr.length) {
    box.innerHTML = '<div class="zw-saved-empty">还没有保存的排盘。<br>填好生辰后点「保存此排盘」即可。</div>';
    return;
  }
  var html = '';
  arr.forEach(function(rec) {
    if (q) {
      var hay = ((rec.label || '') + ' ' + (rec.form.name || '') + ' ' + (rec.form.region || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return;
    }
    var f = rec.form;
    var meta = f.y + '-' + _pad2(f.m) + '-' + _pad2(f.d) + ' ' + _pad2(f.hour) + ':' + _pad2(f.min)
      + ' · ' + f.sex + ' · ' + (f.calType === 'lunar' ? '农历' : '阳历')
      + (f.region ? (' · ' + f.region) : '');
    html += '<div class="zw-saved-item">'
      +   '<div class="zw-saved-main">'
      +     '<div class="zw-saved-label">' + _esc(rec.label || '未命名') + '</div>'
      +     '<div class="zw-saved-meta">' + _esc(meta) + '</div>'
      +   '</div>'
      +   '<div class="zw-saved-actions">'
      +     '<button class="zw-btn zw-btn-mini zw-btn-primary" data-load="' + rec.id + '">载入</button>'
      +     '<button class="zw-btn zw-btn-mini zw-btn-danger" data-del="' + rec.id + '">删除</button>'
      +   '</div>'
      + '</div>';
  });
  box.innerHTML = html || '<div class="zw-saved-empty">没有匹配的排盘。</div>';
  box.querySelectorAll('[data-load]').forEach(function(b) {
    b.addEventListener('click', function() { _loadSaved(b.getAttribute('data-load')); });
  });
  box.querySelectorAll('[data-del]').forEach(function(b) {
    b.addEventListener('click', function() {
      if (window.confirm('确定删除这份排盘？')) {
        _delSaved(b.getAttribute('data-del'));
        _renderSavedList();
      }
    });
  });
}

function _bindSaved() {
  var saveBtn = document.getElementById('zw-save');
  if (saveBtn) saveBtn.addEventListener('click', _saveCurrentChart);
  var searchEl = document.getElementById('zw-saved-search');
  if (searchEl) searchEl.addEventListener('input', _renderSavedList);
  _renderSavedList();
}

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function _readForm() {
  var nameEl = document.getElementById('zw-name');
  var sexEl = document.getElementById('zw-sex');
  var yEl = document.getElementById('zw-y'), mEl = document.getElementById('zw-m'), dEl = document.getElementById('zw-d');
  var tEl = document.getElementById('zw-time');
  var calEl = document.querySelector('input[name="zw-cal"]:checked');
  var ztyEl = document.getElementById('zw-zty');
  var jdEl = document.getElementById('zw-Jd_input');
  var wdEl = document.getElementById('zw-Wd_input');

  var ct = parseClockTime(tEl ? tEl.value : '12:00');
  state.form = {
    name: nameEl ? nameEl.value.trim() : '',
    sex: sexEl ? sexEl.value : '男',
    calType: calEl ? calEl.value : 'solar',
    y: yEl ? parseInt(yEl.value, 10) : 1990,
    m: mEl ? parseInt(mEl.value, 10) : 5,
    d: dEl ? parseInt(dEl.value, 10) : 15,
    hour: ct.h,
    min: ct.min,
    zty: ztyEl ? ztyEl.checked : false,
    jd: jdEl ? parseFloat(jdEl.value) || 120 : 120,
    wd: wdEl ? parseFloat(wdEl.value) || 0 : 0,
    province: state.form.province,
    region: state.form.region,
    location: state.form.location
  };

  _lsSet('zw_name', state.form.name);
  _lsSet('zw_sex', state.form.sex);
  _lsSet('zw_calType', state.form.calType);
  _lsSet('zw_y', String(state.form.y));
  _lsSet('zw_m', String(state.form.m));
  _lsSet('zw_d', String(state.form.d));
  _lsSet('zw_hour', String(state.form.hour));
  _lsSet('zw_min', String(state.form.min));
  _lsSet('zw_zty', state.form.zty ? 'true' : 'false');
  _lsSet('zw_jd', String(state.form.jd));
  _lsSet('zw_wd', String(state.form.wd));
  _lsSet('zw_province', state.form.province);
  _lsSet('zw_region', state.form.region);
}

function _autoCalcIfReady() {
  if (state.form.y && state.form.m && state.form.d) {
    _calc();
  }
}

// ════════════════════════════════════════════════════════════════
// 计算：本命盘
// ════════════════════════════════════════════════════════════════
async function _calc() {
  _readForm();
  var msg = document.getElementById('zw-msg');
  if (msg) msg.textContent = '排盘中…';
  try {
    var payload = {
      calType: state.form.calType,
      y: state.form.y, m: state.form.m, d: state.form.d,
      hour: state.form.hour, min: state.form.min,
      sex: state.form.sex,
      jd: state.form.jd, wd: state.form.wd,
      zty: state.form.zty,
      location: state.form.location,
      province: state.form.province, region: state.form.region
    };
    var res = await API.post('/ziwei/astrolabe', payload);
    if (!res.ok) throw new Error(res.error || '排盘失败');
    state.astrolabe = res.data;
    state.selected = null;
    state.patternFocus = null;
    // 始终加载运限，飞星视图的「大限飞化」需要大限命宫 index
    await _loadHoroscope();
    renderChart();
    _renderSiHua();
    _renderPatterns();
    if (msg) msg.textContent = '';
  } catch (e) {
    if (msg) msg.textContent = '排盘失败：' + (e.message || e);
    console.error('[ziwei] calc error', e);
  }
}

async function _loadHoroscope() {
  if (!state.astrolabe) return;
  try {
    var payload = {
      calType: state.form.calType,
      y: state.form.y, m: state.form.m, d: state.form.d,
      hour: state.form.hour, min: state.form.min,
      sex: state.form.sex,
      jd: state.form.jd, wd: state.form.wd,
      zty: state.form.zty,
      targetYear: state.targetYear
    };
    var res = await API.post('/ziwei/horoscope', payload);
    if (res.ok) state.horoscope = res.data;
  } catch (e) {
    console.warn('[ziwei] horoscope load fail', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
// 运限切换
// ════════════════════════════════════════════════════════════════
function _onScopeChange() {
  if (state.scope === 'native') {
    var info = document.getElementById('zw-scope-info');
    if (info) info.textContent = '';
    renderChart();
    return;
  }
  var info = document.getElementById('zw-scope-info');
  if (info) info.textContent = '加载' + (state.scope === 'decadal' ? '地盘' : '人盘') + '…';
  _loadHoroscope().then(function() {
    _renderScopeInfo();
    renderChart();
  });
}

function _renderScopeInfo() {
  var info = document.getElementById('zw-scope-info');
  if (!info || !state.horoscope) return;
  var sc = state.scope === 'decadal' ? state.horoscope.decadal : state.horoscope.yearly;
  if (!sc) { info.textContent = '无运限数据'; return; }
  var scopeLabel = state.scope === 'decadal' ? '地盘' : '人盘';
  var mutagenText = (sc.mutagen || []).map(function(name, i) {
    return name + MUTAGEN_LABEL[i];
  }).join(' ');
  info.innerHTML = '<span class="zw-scope-year">' + state.targetYear + ' 年</span>'
    + ' · ' + scopeLabel + '四化：<span class="zw-mutagen-line">' + (mutagenText || '—') + '</span>';
}

// ════════════════════════════════════════════════════════════════
// 视图面板切换
// ════════════════════════════════════════════════════════════════
function _renderViewPanels() {
  var panels = document.querySelectorAll('.zw-view-panel');
  panels.forEach(function(p) {
    p.classList.toggle('active', p.getAttribute('data-view') === state.viewMode);
  });
  // 底部 tab 与面板保持单一事实来源
  var tabs = document.querySelectorAll('.zw-bottom-tab');
  tabs.forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-view') === state.viewMode);
  });
  if (state.viewMode === 'sihua') _renderSiHua();
}

// 设置变更（如“紫微默认视图”）即时生效：重新读取默认视图并刷新面板
if (window.State && window.State.on) {
  window.State.on('settings:changed', function() {
    var want = _zwViewMode(); // 读 zw_viewMode（面板变更时已别名同步写入）
    if (want !== state.viewMode) {
      state.viewMode = want;
      _renderViewPanels();
    }
  });
}

function _renderSiHua() {
  var box = document.getElementById('zw-sihua-card');
  if (!box || !state.astrolabe) return;
  var meta = state.astrolabe.meta;
  var cd = meta.rawDates && meta.rawDates.chineseDate;
  var yearStem = (cd && cd.yearly && cd.yearly[0]) || '';
  var list = meta.yearMutagen || MUTAGEN_MAP[yearStem] || ['', '', '', ''];
  var letters = ['A', 'B', 'C', 'D'];

  // 四化星所在宫
  var branchOf = {};
  state.astrolabe.palaces.forEach(function(p) { branchOf[p.index] = p.name; });
  var starToPalace = computeStarToPalace(state.astrolabe.palaces);

  var colors = ['zw-mutagen-禄', 'zw-mutagen-权', 'zw-mutagen-科', 'zw-mutagen-忌'];
  var rows = '';
  for (var i = 0; i < 4; i++) {
    var starName = list[i] || '';
    var idx = starToPalace[starName];
    var loc = (idx !== undefined && branchOf[idx]) ? branchOf[idx] : '—';
    var active = (state.sihuaFilter === letters[i]) ? ' active' : '';
    rows += '<div class="zw-sihua-row' + active + '" data-letter="' + letters[i] + '">'
      + '<span class="zw-sihua-label ' + colors[i] + '">' + letters[i] + ' ' + MUTAGEN_LABEL[i] + '</span>'
      + '<span class="zw-sihua-star">' + (starName || '—') + '</span>'
      + '<span class="zw-sihua-loc">' + loc + '</span></div>';
  }
  box.innerHTML = ''
    + '<div class="zw-sihua-title">' + yearStem + '年生年四化（A禄 B权 C科 D忌）</div>'
    + '<div class="zw-sihua-table">' + rows + '</div>'
    + '<div class="zw-sihua-note">盘面上对应星曜右侧已标 A/B/C/D；点击上表字母可聚焦该四化所在宫。</div>';

  // 绑定点击：聚焦/取消
  box.querySelectorAll('.zw-sihua-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var L = row.getAttribute('data-letter');
      state.sihuaFilter = (state.sihuaFilter === L) ? null : L;
      _renderSiHua();
      renderChart();
    });
  });
}

// ════════════════════════════════════════════════════════════════
// 渲染 4×4 命盘（三视图共用）
// ════════════════════════════════════════════════════════════════
export function renderChart() {
  renderChartInto(document.querySelector('.zw-chart-grid[data-chart="feixing"]'), 'feixing');
  renderChartInto(document.querySelector('.zw-chart-grid[data-chart="sanhe"]'), 'sanhe');
  renderChartInto(document.querySelector('.zw-chart-grid[data-chart="sihua"]'), 'sihua');
}
function renderAllCharts() { renderChart(); }

function _sihuaLetterMap() {
  var map = {};
  var ym = (state.astrolabe && state.astrolabe.meta && state.astrolabe.meta.yearMutagen) || [];
  var letters = ['A', 'B', 'C', 'D'];
  for (var i = 0; i < 4; i++) { if (ym[i]) map[ym[i]] = letters[i]; }
  return map;
}
function _sihuaFocusStar() {
  if (!state.sihuaFilter) return null;
  var idx = ['A', 'B', 'C', 'D'].indexOf(state.sihuaFilter);
  var ym = (state.astrolabe && state.astrolabe.meta && state.astrolabe.meta.yearMutagen) || [];
  return idx >= 0 ? (ym[idx] || null) : null;
}

function renderChartInto(gridEl, mode) {
  if (!gridEl) return;
  if (!state.astrolabe || !state.astrolabe.palaces) {
    gridEl.innerHTML = '<div class="zw-empty">请填写生辰后点击「排盘」</div>';
    return;
  }
  gridEl.innerHTML = '';
  var canvas = gridEl.parentElement;
  // 中央信息卡挂在 canvas 上，不会被上面的 gridEl.innerHTML 清除，需手动清理旧实例
  if (canvas) { var _oldInfo = canvas.querySelector('.zw-info-center'); if (_oldInfo) _oldInfo.remove(); }

  var palaces = state.astrolabe.palaces;
  var letterMap = (mode === 'sihua') ? _sihuaLetterMap() : null;
  var focusStar = (mode === 'sihua') ? _sihuaFocusStar() : null;

  // 飞星视图：计算当前应显示的链接及其目标星集合
  var flyTargets = null, flySource = null;
  if (mode === 'feixing') {
    var comp = computeFlyingStars(palaces);
    var links;
    if (state.flyPalace != null) {
      // 点击某宫：直接取该宫宫干四化飞出的全部星（不受「命宫+大限」范围限制）
      links = comp.links.filter(function(l) { return l.from === state.flyPalace; });
      flySource = state.flyPalace;
    } else {
      // 默认：命宫+大限飞化（与箭头一致），并高亮其目标星
      links = flyingLinksFiltered(comp.links, palaces);
    }
    flyTargets = {};
    links.forEach(function(l) { flyTargets[l.star] = l.type; });
  }

  palaces.forEach(function(p) {
    var pos = BRANCH_POS[p.earthlyBranch];
    if (!pos) return;
    var el = _renderPalace(p, pos, mode, letterMap, focusStar, flyTargets, flySource);
    el.style.gridRow = (pos[0] + 1) + ' / ' + (pos[0] + 2);
    el.style.gridColumn = (pos[1] + 1) + ' / ' + (pos[1] + 2);
    if (state.selected === p.index) el.classList.add('zw-palace-active');
    if (p.isBodyPalace) el.classList.add('zw-palace-body');
    if (mode === 'feixing' && flySource != null && flySource !== p.index) el.classList.add('zw-dim-fly');
    gridEl.appendChild(el);
  });

  // 中央信息卡：置于 4×4 命盘正中 2×2 空位（feixing/sanhe 视图）
  // 挂在 canvas 上绝对居中，z-index 高于连线 overlay，确保细线叠加时文字依旧清晰。
  if (mode !== 'sihua') {
    var infoCenter = document.createElement('div');
    infoCenter.className = 'zw-info-center';
    infoCenter.innerHTML = renderZiweiInfo(state.astrolabe.meta, state.astrolabe.palaces);
    if (canvas) canvas.appendChild(infoCenter);
  }

  var svg = canvas ? canvas.querySelector('svg[data-overlay="' + mode + '"]') : null;
  if (svg) {
    if (mode === 'feixing') drawFlyingOverlay(svg, palaces);
    else if (mode === 'sanhe') drawSanheOverlay(svg, palaces);
  }
}

// ════════════════════════════════════════════════════════════════
// 中央信息面板（生辰 · 四柱 · 大运 · 自化）
// 完全由接口真实数据驱动（meta + palaces），随表单排盘实时变化。
// 配色：天干 / 地支按五行色（木绿 / 火红 / 土橙 / 金紫 / 水蓝）套用。
// ════════════════════════════════════════════════════════════════

// 天干五行 / 阴阳
var GAN_WUXING = { 甲:'木', 乙:'木', 丙:'火', 丁:'火', 戊:'土', 己:'土', 庚:'金', 辛:'金', 壬:'水', 癸:'水' };
var GAN_YANG   = { 甲:1, 乙:0, 丙:1, 丁:0, 戊:1, 己:0, 庚:1, 辛:0, 壬:1, 癸:0 };
// 地支五行（本气）
var ZHI_WUXING = { 子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火', 午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水' };
// 地支本气天干
var ZHI_BENQI  = { 子:'癸', 丑:'己', 寅:'甲', 卯:'乙', 辰:'戊', 巳:'丙', 午:'丁', 未:'己', 申:'庚', 酉:'辛', 戌:'戊', 亥:'壬' };
// 五行 → 配色 token
var WX_COLOR = { 木:'green', 火:'red', 土:'orange', 金:'purple', 水:'blue' };
function _wxColorOfGan(g) { return WX_COLOR[GAN_WUXING[g]] || ''; }
function _wxColorOfZhi(z) { return WX_COLOR[ZHI_WUXING[z]] || ''; }

// 十神（相对日干）
function _shiShen(dayGan, gan) {
  if (!dayGan || !gan) return '';
  var dw = GAN_WUXING[dayGan], gw = GAN_WUXING[gan];
  if (!dw || !gw) return '';
  var woSheng = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };  // 我生
  var shengWo = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };  // 生我
  var woKe    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };  // 我克
  var keWo    = { 木:'金', 火:'水', 土:'木', 金:'火', 水:'土' };  // 克我
  var rel = dw === gw ? '同'
    : (woSheng[dw] === gw ? '我生'
    : (shengWo[dw] === gw ? '生我'
    : (woKe[dw] === gw ? '我克' : '克我')));
  var same = GAN_YANG[dayGan] === GAN_YANG[gan];
  switch (rel) {
    case '同':   return same ? '比肩' : '劫财';
    case '我生': return same ? '食神' : '伤官';
    case '生我': return same ? '偏印' : '正印';
    case '我克': return same ? '偏财' : '正财';
    case '克我': return same ? '七杀' : '正官';
  }
  return '';
}
var SHISHEN_SHORT = { 比肩:'比', 劫财:'劫', 食神:'食', 伤官:'伤', 正财:'财', 偏财:'才', 正官:'官', 七杀:'杀', 正印:'印', 偏印:'枭' };
function _shiShenShort(s) { return SHISHEN_SHORT[s] || s || ''; }

// 大运表（从 palaces 的 decadal 聚合，按起运年龄升序取前 8 步）
function _buildDaYun(meta, palaces) {
  var fp = meta.fourPillars || {};
  var dayGan = (fp.day || '')[0] || '';
  var birthYear = parseInt(((meta.solarDate || '0').split('-')[0]), 10) || 0;
  var steps = (palaces || []).map(function (p) {
    var dec = p.decadal || {};
    return { stem: dec.heavenlyStem || '', branch: dec.earthlyBranch || '', range: dec.range || [0, 0] };
  }).filter(function (s) { return s.stem && s.branch; })
    .sort(function (a, b) { return a.range[0] - b.range[0]; })
    .slice(0, 8);
  var shen = [], zhishen = [], ages = [], years = [];
  steps.forEach(function (s) {
    var sTen = _shiShen(dayGan, s.stem);
    var bTen = _shiShen(dayGan, ZHI_BENQI[s.branch] || '');
    shen.push({ g: s.stem, s: sTen, c: _wxColorOfGan(s.stem) });
    zhishen.push({ z: s.branch, s: _shiShenShort(bTen), c: _wxColorOfZhi(s.branch) });
    ages.push(s.range[0] + '岁');
    years.push(String(birthYear + s.range[0]));
  });
  if (ages.length) ages[ages.length - 1] = ages[ages.length - 1].replace('岁', '虚岁');
  return { shen: shen, zhishen: zhishen, ages: ages, years: years };
}

// 字符上色：有 token 则包 <b class="c-token">，否则原样返回（黑字）
function _ipCol(t, c) { return c ? '<b class="c-' + c + '">' + t + '</b>' : t; }

function renderZiweiInfo(meta, palaces) {
  if (!meta) meta = {};
  var fp = meta.fourPillars || {};
  var lunarYearGZ = fp.year || '';                                   // 壬戌
  var lunarMD = (meta.lunarDate || '').replace(/^.*?年/, '').replace(/日?$/, ''); // 四月十七
  var timeCN = meta.time || '';                                      // 午
  var lunar = lunarYearGZ + '年 ' + lunarMD + '日' + timeCN + '时';  // 壬戌年 四月十七日午时

  // 四柱：天干一行 / 地支一行
  var gan = [fp.year, fp.month, fp.day, fp.hour].map(function (x) {
    var g = (x || '')[0] || '';
    return '<span>' + _ipCol(g, _wxColorOfGan(g)) + '</span>';
  }).join('');
  var zhi = [fp.year, fp.month, fp.day, fp.hour].map(function (x) {
    var z = (x || '')[1] || '';
    return '<span>' + _ipCol(z, _wxColorOfZhi(z)) + '</span>';
  }).join('');
  var colBlock = ''
    + '<div class="ip-col"><div class="ip-col-title">节气四柱</div>'
    +   '<div class="ip-gan">' + gan + '</div><div class="ip-zhi">' + zhi + '</div></div>'
    + '<div class="ip-col"><div class="ip-col-title">非节气四柱</div>'
    +   '<div class="ip-gan">' + gan + '</div><div class="ip-zhi">' + zhi + '</div></div>';

  // 起运（命宫起运岁，取各宫 decadal.range[0] 最小值）
  var startAge = 0;
  var agesAll = (palaces || []).map(function (p) { return p.decadal && p.decadal.range ? p.decadal.range[0] : 999; })
    .filter(function (a) { return a < 999; });
  if (agesAll.length) startAge = Math.min.apply(null, agesAll);
  var qiYun = '出生后约' + startAge + '岁起运';

  // 大运
  var dy = _buildDaYun(meta, palaces);
  var shen = dy.shen.map(function (x) {
    return '<span><b class="' + (x.c ? 'c-' + x.c : '') + '">' + x.g + '</b>' + (x.s || '') + '</span>';
  }).join('');
  var zhishen = dy.zhishen.map(function (x) { return '<span>' + x.z + (x.s || '') + '</span>'; }).join('');
  var ages = dy.ages.map(function (x) { return '<span>' + x + '</span>'; }).join('');
  var years = dy.years.map(function (x) { return '<span>' + x + '</span>'; }).join('');

  // 自化图示（本命年干四化：禄权科忌）
  var ziHua = [ {q:'禄',c:'green'}, {q:'权',c:'purple'}, {q:'科',c:'blue'}, {q:'忌',c:''} ]
    .map(function (x) { return '<span>一' + _ipCol(x.q, x.c) + '</span>'; }).join(' ');

  return '<div class="zw-infopanel">'
    + '<div class="ip-head">'
    +   '<div>钟表时间: ' + (meta.solarDate || '') + ' ' + (meta.clockTime || '') + '</div>'
    +   '<div>农历: ' + lunar + '</div>'
    +   '<div>命主: ' + (meta.soul || '—') + ' 身主: ' + (meta.body || '—') + ' 子斗:' + (meta.earthlyBranchOfSoulPalace || '—') + '</div>'
    + '</div>'
    + '<div class="ip-pillars">' + colBlock + '</div>'
    + '<div class="ip-qiyun">' + qiYun + '</div>'
    + '<div class="ip-dayun">'
    +   '<div class="ip-dy-row ip-dy-shen">' + shen + '</div>'
    +   '<div class="ip-dy-row ip-dy-zhishen">' + zhishen + '</div>'
    +   '<div class="ip-dy-row ip-dy-age">' + ages + '</div>'
    +   '<div class="ip-dy-row ip-dy-year">' + years + '</div>'
    + '</div>'
    + '<div class="ip-zihua">自化图示: ' + ziHua + '</div>'
    + '</div>';
}

// 地支 → 方位文字（参照文墨天机图例）
var AZIMUTH = {
  '子': '正北方', '丑': '北偏东', '寅': '东偏北', '卯': '正东方',
  '辰': '东偏南', '巳': '南偏东', '午': '正南方', '未': '南偏西',
  '申': '西偏南', '酉': '正西方', '戌': '西偏北', '亥': '北偏西'
};
// 方位 → 边（用于 CSS 绝对定位）
var AZIMUTH_SIDE = {
  '子': 'n', '丑': 'n', '亥': 'n',
  '寅': 'e', '卯': 'e', '辰': 'e',
  '巳': 's', '午': 's', '未': 's',
  '申': 'w', '酉': 'w', '戌': 'w'
};

// 星耀配色（参照传统图例：主星红 / 辅星紫 / 煞星蓝 / 桃花红）
function _starColorClass(type) {
  if (type === 'major') return 'zw-c-red';
  if (type === 'soft') return 'zw-c-purple';
  if (type === 'tough') return 'zw-c-blue';
  if (type === 'flower') return 'zw-c-red';
  return '';
}
// 飞星目标四化 → 高亮类
function _flyCls(fly) {
  return fly ? ' zw-star-fly-target zw-star-fly-' + fly : '';
}

// 渲染单宫（mode: common/feixing/sanhe/sihua）—— 传统方盘：顶部星耀三行 + 中央小限大限 + 左下十二神 + 右下长生干支 + 底部红宫名
function _renderPalace(p, pos, mode, letterMap, focusStar, flyTargets, flySource) {
  var el = document.createElement('div');
  el.className = 'zw-palace';
  el.setAttribute('data-index', p.index);
  if (mode === 'feixing' && flySource === p.index) el.classList.add('zw-palace-fly-source');
  // 格局高亮：非相关宫变暗
  if (state.patternFocus && state.patternFocus.indexOf(p.name) < 0) {
    el.classList.add('zw-dim-pattern');
  }

  var scopeStars = null, scopeMutagen = null, isScopePalace = false;
  if (state.scope !== 'native' && state.horoscope) {
    var sc = state.scope === 'decadal' ? state.horoscope.decadal : state.horoscope.yearly;
    if (sc) {
      scopeStars = (sc.stars && sc.stars[p.index]) || [];
      scopeMutagen = sc.mutagen || [];
      isScopePalace = (sc.index === p.index);
    }
  }

  var lmap = (mode === 'sihua' && letterMap) ? letterMap : null;

  // ── 传统方盘内部布局 ──
  // 1) 星耀三行（名1 / 名2 / 庙旺灰字），顺序：主星 → 辅星 → 运曜(地盘/人盘) → 杂曜
  var stars = []
    .concat(p.majorStars || [])
    .concat(p.minorStars || [])
    .concat((scopeStars && scopeStars.length) ? scopeStars : [])
    .concat(p.adjectiveStars || [])
    .map(function (s) {
      return {
        name: s.name,
        brightness: s.brightness || '',
        color: _starColorClass(s.type),
        fly: flyTargets ? flyTargets[s.name] : null
      };
    });
  // 四化标记（禄/权/科/忌，年干四化）并行数组，顺序与 stars 一致
  var mutagenArr = []
    .concat((p.majorStars || []).map(function (s) { return s.mutagen || ''; }))
    .concat((p.minorStars || []).map(function (s) { return s.mutagen || ''; }))
    .concat((scopeStars && scopeStars.length) ? (scopeMutagen || []) : [])
    .concat((p.adjectiveStars || []).map(function (s) { return s.mutagen || ''; }));
  var r1 = [], r2 = [], r3 = [], r4 = [];
  stars.forEach(function (s, idx) {
    var base = 'zw-palace-cell ' + s.color + _flyCls(s.fly);
    // 四化文本：四化视图显示 A/B/C/D 字母，其余视图显示 禄/权/科/忌
    var m = mutagenArr[idx] || '';
    var letter = (lmap && lmap[s.name]) ? lmap[s.name] : '';
    var mTxt = (mode === 'sihua') ? letter : m;
    var mCls = '';
    if (mTxt) {
      mCls = (mode === 'sihua')
        ? 'zw-mutagen-txt-' + MUTAGEN_LABEL['ABCD'.indexOf(mTxt)]
        : 'zw-mutagen-txt-' + mTxt;
    }
    var mHtml = mTxt ? '<i class="zw-mutagen-i ' + mCls + '">' + mTxt + '</i>' : '';
    r1.push('<span class="' + base + '" data-star="' + s.name + '">' + (s.name[0] || '') + '</span>');
    r2.push('<span class="' + base + '" data-star="' + s.name + '">' + (s.name.length > 1 ? s.name[1] : '') + '</span>');
    r3.push('<span class="zw-palace-cell zw-c-gray' + _flyCls(s.fly) + '" data-star="' + s.name + '">' + s.brightness + '</span>');
    // 四化标记置于星名下方（第 4 行），与星列对齐
    r4.push('<span class="zw-palace-cell' + _flyCls(s.fly) + '">' + mHtml + '</span>');
  });
  var starsEl = document.createElement('div');
  starsEl.className = 'zw-palace-stars';
  starsEl.innerHTML = '<div class="zw-palace-row">' + r1.join('') + '</div>'
    + '<div class="zw-palace-row">' + r2.join('') + '</div>'
    + '<div class="zw-palace-row">' + r3.join('') + '</div>'
    + '<div class="zw-palace-row zw-palace-row-mutagen">' + r4.join('') + '</div>';
  el.appendChild(starsEl);

  // 2) 中央：流年 + 小限(各限5个) + 大限（加粗）
  var centerEl = document.createElement('div');
  centerEl.className = 'zw-palace-mid';
  // 流年（流年小限）：以生年地支所在宫为1岁，沿与小限相同的宫序推算
  var liuNianTxt = '';
  var _meta = state.astrolabe && state.astrolabe.meta;
  var _cd = _meta && _meta.rawDates && _meta.rawDates.chineseDate;
  var _birthBranch = _cd && _cd.yearly && _cd.yearly[1];
  if (_birthBranch && state.astrolabe.palaces) {
    var _bp = state.astrolabe.palaces.find(function (pp) { return pp.earthlyBranch === _birthBranch; });
    if (_bp && _bp.ages && _bp.ages.length) {
      var _k = ((_bp.ages[0] - 1) % 12 + 12) % 12 + 1; // 生年支宫的小限基础岁数(1~12)
      var _ln = (p.ages || []).map(function (a) { return a - _k + 1; });
      liuNianTxt = _ln.slice(0, 5).join(',');
    }
  }
  var agesTxt = (p.ages && p.ages.length) ? p.ages.slice(0, 5).join(',') : '';
  var rangeTxt = (p.decadal && p.decadal.range) ? p.decadal.range.join(' ~ ') : '';
  centerEl.innerHTML = '<div class="ln">流年：' + liuNianTxt + '</div>'
    + '<div class="ages">小限：' + agesTxt + '</div>'
    + '<div class="range">' + rangeTxt + '</div>';
  el.appendChild(centerEl);

  // 3) 左下：博士 / 将前 / 岁前 十二神（三行）
  var leftEl = document.createElement('div');
  leftEl.className = 'zw-palace-leftbot';
  var leftWords = [p.boshi12, p.jiangqian12, p.suiqian12].filter(Boolean);
  leftEl.innerHTML = leftWords.map(function (t) { return '<div>' + t + '</div>'; }).join('');
  el.appendChild(leftEl);

  // 4) 右下：十二长生 + 宫干支（干支加粗）
  var rightEl = document.createElement('div');
  rightEl.className = 'zw-palace-rightbot';
  var zhi = (p.heavenlyStem || '') + (p.earthlyBranch || '');
  var rightWords = [p.changsheng12, zhi].filter(Boolean);
  rightEl.innerHTML = rightWords.map(function (t) {
    return '<div class="zw-palace-vword' + (t === zhi ? ' bold' : '') + '">' + t + '</div>';
  }).join('');
  el.appendChild(rightEl);

  // 5) 底部：红色宫名（身宫/运限附加标签）
  var nameEl = document.createElement('div');
  nameEl.className = 'zw-palace-name';
  var tag = isScopePalace ? ' · ' + SCOPE_LABEL[state.scope] : '';
  nameEl.textContent = p.name + tag;
  el.appendChild(nameEl);

  // sanhe 视图：在三方四正宫内加脉冲节点（连线走宫间间隙，节点落在宫内）
  if (mode === 'sanhe' && state.astrolabe && state.astrolabe.palaces) {
    var _selIdx = (state.selected != null) ? state.selected : getMingIdx(state.astrolabe.palaces);
    var _sp = palaceByIndex(state.astrolabe.palaces, _selIdx);
    if (_sp) {
      var _seqMap = buildSeqBranchMap(state.astrolabe.palaces);
      var _isSource = (p.index === _selIdx);
      var _inSet = _isSource || sanheSet(_sp.name, _seqMap).indexOf(p.earthlyBranch) >= 0;
      if (_inSet) {
        var _node = document.createElement('div');
        _node.className = 'zw-sanhe-node ' + (_isSource ? 'zw-sanhe-node-source' : 'zw-sanhe-node-target');
        el.appendChild(_node);
      }
    }
  }

  // 四化视图聚焦：非目标四化星所在宫变暗
  if (mode === 'sihua' && focusStar) {
    var hasFocus = (p.majorStars || []).some(function(s) { return s.name === focusStar; })
      || (p.minorStars || []).some(function(s) { return s.name === focusStar; });
    if (!hasFocus) el.classList.add('zw-dim');
  }

  el.addEventListener('click', function() {
    if (state.patternFocus) { state.patternFocus = null; _markActivePattern(); }
    if (mode === 'feixing') {
      state.flyPalace = (state.flyPalace === p.index) ? null : p.index;
    } else {
      state.selected = (state.selected === p.index) ? null : p.index;
    }
    renderAllCharts();
    var panel = el.closest('.zw-view-panel');
    if (panel) showDetailInto(p, panel.querySelector('.zw-detail'));
  });

  return el;
}

// 横排星耀块（星名 + 亮度/四化上下两行），用于新版单宫
function _starBlockEl(star, scopeMutagen, kind, letter, flyType) {
  var se = document.createElement('span');
  se.className = 'zw-star-block ' + (kind === 'major' ? 'zw-star-block-major' : 'zw-star-block-minor') + ' ' + wxClass(star.name);
  if (flyType) se.classList.add('zw-star-block-fly-target', 'zw-star-block-fly-' + flyType);

  // 星名（完整）
  var name = document.createElement('span');
  name.className = 'zw-star-block-name';
  name.textContent = star.name;
  se.appendChild(name);

  // 庙旺利陷（完整字，紧跟星名）
  if (star.brightness) {
    var br = document.createElement('span');
    br.className = 'zw-bright ' + _brightClass(star.brightness);
    br.textContent = star.brightness;
    se.appendChild(br);
  }
  // 四化（禄权科忌，完整字）
  if (star.mutagen) {
    var m = document.createElement('span');
    m.className = 'zw-mutagen zw-mutagen-' + star.mutagen;
    m.textContent = star.mutagen;
    se.appendChild(m);
  }
  if (scopeMutagen && scopeMutagen.indexOf(star.name) >= 0) {
    var idx = scopeMutagen.indexOf(star.name);
    var sm = document.createElement('span');
    sm.className = 'zw-mutagen zw-mutagen-scope zw-mutagen-' + MUTAGEN_LABEL[idx];
    sm.textContent = MUTAGEN_LABEL[idx];
    se.appendChild(sm);
  }
  // 四化视图聚焦字母（A/B/C/D）
  if (letter) {
    var l = document.createElement('sup');
    l.className = 'zw-sihua-letter zw-sihua-letter-' + letter;
    l.textContent = letter;
    se.appendChild(l);
  }

  return se;
}

function _starEl(star, scopeMutagen, kind, letter, flyType) {
  var se = document.createElement('span');
  se.className = 'zw-star ' + (kind === 'major' ? 'zw-star-major' : 'zw-star-minor') + ' ' + wxClass(star.name);
  if (flyType) se.classList.add('zw-star-fly-target', 'zw-star-fly-' + flyType);
  se.textContent = star.name;
  if (letter) {
    var l = document.createElement('sup');
    l.className = 'zw-sihua-letter zw-sihua-letter-' + letter;
    l.textContent = letter;
    se.appendChild(l);
  }
  if (star.mutagen) {
    var m = document.createElement('sup');
    m.className = 'zw-mutagen zw-mutagen-' + star.mutagen;
    m.textContent = star.mutagen;
    se.appendChild(m);
  }
  if (star.brightness) {
    var br = document.createElement('sub');
    br.className = 'zw-bright ' + _brightClass(star.brightness);
    br.textContent = star.brightness;
    se.appendChild(br);
  }
  if (scopeMutagen && scopeMutagen.indexOf(star.name) >= 0) {
    var idx = scopeMutagen.indexOf(star.name);
    var sm = document.createElement('sup');
    sm.className = 'zw-mutagen zw-mutagen-scope zw-mutagen-' + MUTAGEN_LABEL[idx];
    sm.textContent = MUTAGEN_LABEL[idx];
    se.appendChild(sm);
  }
  return se;
}

function _brightClass(b) {
  if (b === '庙' || b === '旺' || b === '得' || b === '利') return 'zw-bright-good';
  if (b === '陷') return 'zw-bright-bad';
  return '';
}

// ════════════════════════════════════════════════════════════════
// SVG 叠加：飞星
// ════════════════════════════════════════════════════════════════
function drawFlyingOverlay(svg, palaces) {
  var comp = computeFlyingStars(palaces);
  var links;
  if (state.flyPalace != null) {
    // 点击某宫：画该宫宫干四化飞出的全部箭头（不受「命宫+大限」范围限制）
    links = comp.links.filter(function(l) { return l.from === state.flyPalace; });
  } else {
    links = flyingLinksFiltered(comp.links, palaces);
  }
  var html = '<defs>';
  // 每型：箭头 + 同色系渐变（深→亮，勾流光层次）+ 柔光滤镜
  FLY_TYPES.forEach(function(t) {
    html += '<marker id="fx-arrow-' + t + '" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 Z" fill="' + FLYING_COLOR[t] + '"/></marker>';
    html += '<linearGradient id="fx-grad-' + t + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="162" y2="130">'
      + '<stop offset="0" stop-color="' + FLY_DARK[t] + '"/>'
      + '<stop offset="1" stop-color="' + FLYING_COLOR[t] + '"/></linearGradient>';
  });
  html += '<filter id="fx-glow" x="-60%" y="-60%" width="220%" height="220%">'
    + '<feGaussianBlur stdDeviation="0.5" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>';
  html += '</defs>';

  // 自化环（在箭头下层）：渐变描边 + 柔光 + 流动虚线
  links.forEach(function(l) {
    if (!l.self || !state.flyFilter[l.type]) return;
    var c = branchCenter(palaceByIndex(palaces, l.from).earthlyBranch);
    html += '<circle class="fly-self fly-' + l.type + '" cx="' + c.x + '" cy="' + c.y + '" r="7.2" fill="none" stroke="url(#fx-grad-' + l.type + ')" stroke-width="0.6" stroke-dasharray="2.6 1.9" filter="url(#fx-glow)"/>';
    html += '<text class="fly-' + l.type + '" x="' + c.x + '" y="' + (c.y - 9) + '" font-size="3.6" font-weight="700" fill="' + FLYING_COLOR[l.type] + '" text-anchor="middle">' + l.type + '</text>';
  });

  // 飞星箭头（向外弯曲，少压字）：渐变描边 + 柔光 + 流动虚线
  links.forEach(function(l) {
    if (l.self || !state.flyFilter[l.type]) return;
    var a = branchCenter(palaceByIndex(palaces, l.from).earthlyBranch);
    var b = branchCenter(palaceByIndex(palaces, l.to).earthlyBranch);
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.hypot(dx, dy) || 1;
    var ox = -dy / len * 11.7, oy = dx / len * 11.7;
    html += '<path class="fly-link fly-' + l.type + '" d="M' + a.x + ' ' + a.y + ' Q' + (mx + ox) + ' ' + (my + oy) + ' ' + b.x + ' ' + b.y
      + '" fill="none" stroke="url(#fx-grad-' + l.type + ')" stroke-width="0.55" stroke-linecap="round" stroke-dasharray="2.6 1.9" opacity="0.9" filter="url(#fx-glow)" marker-end="url(#fx-arrow-' + l.type + ')"/>';
    // 目标宫中心点：实心核心 + 涟漪脉冲
    html += '<circle class="fly-target-core fly-' + l.type + '" cx="' + b.x + '" cy="' + b.y + '" r="2.6" fill="' + FLYING_COLOR[l.type] + '" opacity="0.8"/>';
    html += '<circle class="fly-target-ripple fly-' + l.type + '" cx="' + b.x + '" cy="' + b.y + '" r="2.6"/>';
  });

  svg.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// SVG 叠加：三合（三方四正 · 创意连线）
//   曲线代替直线，控制点统一外凸；
//   朱砂→鎏金渐变 + 柔光发光；虚线流动。节点在 _renderPalace 中渲染于宫内。
// ════════════════════════════════════════════════════════════════
function _sanheLink(a, c) {
  var mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
  var dx = c.x - a.x, dy = c.y - a.y;
  var len = Math.hypot(dx, dy) || 1;
  var nx = -dy / len, ny = dx / len;        // 法向
  var bow = 9;                              // 弧高（用户单位）
  var cx = mx + nx * bow, cy = my + ny * bow;
  // 让弧始终外凸、绕开正中信息区（盘心 81,65）
  if (Math.hypot(cx - 81, cy - 65) < Math.hypot(mx - 81, my - 65)) {
    cx = mx - nx * bow; cy = my - ny * bow;
  }
  return '<path class="sh-link" d="M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + c.x + ' ' + c.y
    + '" fill="none" stroke="url(#sh-grad)" stroke-width="0.55" stroke-linecap="round"'
    + ' stroke-dasharray="2.6 1.9" filter="url(#sh-glow)"/>';
}

function drawSanheOverlay(svg, palaces) {
  var selIdx = (state.selected != null) ? state.selected : (function() {
    var f = palaces.find(function(p) { return p.name === '命宫'; });
    return f ? f.index : 0;
  })();
  var seqBranchMap = buildSeqBranchMap(palaces);
  var sp = palaceByIndex(palaces, selIdx);
  if (!sp) { svg.innerHTML = ''; return; }

  var a = branchCenter(sp.earthlyBranch);
  var set = sanheSet(sp.name, seqBranchMap);

  var html = '<defs>'
    + '<linearGradient id="sh-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="162" y2="130">'
    +   '<stop offset="0" stop-color="#C41E0A"/>'
    +   '<stop offset="0.5" stop-color="#D8552A"/>'
    +   '<stop offset="1" stop-color="#E0A63C"/>'
    + '</linearGradient>'
    + '<filter id="sh-glow" x="-60%" y="-60%" width="220%" height="220%">'
    +   '<feGaussianBlur stdDeviation="0.5" result="b"/>'
    +   '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>'
    + '</defs>';

  // 本宫 → 三合两位 + 对宫（共 3 条曲线）
  set.forEach(function(b) {
    html += _sanheLink(a, branchCenter(b));
  });

  svg.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// 宫详情
// ════════════════════════════════════════════════════════════════
export function showDetail(p) {
  // zw-detail 是 class（每个视图面板各一个），必须用 active 面板的实例
  var panel = document.querySelector('.zw-view-panel.active');
  var box = panel ? panel.querySelector('.zw-detail') : document.querySelector('.zw-detail');
  showDetailInto(p, box);
}
function showDetailInto(p, box) {
  if (!box) return;
  if (!p) { box.innerHTML = ''; return; }
  var html = ''
    + '<div class="zw-detail-card">'
    +   '<div class="zw-detail-head">' + p.name + ' <span class="zw-detail-branch">' + p.heavenlyStem + p.earthlyBranch + '</span>'
    +     (p.isBodyPalace ? '<span class="zw-badge-body">身宫</span>' : '') + '</div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">大限</span><span>' + (p.decadal && p.decadal.range ? p.decadal.range[0] + '-' + p.decadal.range[1] + '岁' : '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">小限</span><span>' + (p.ages && p.ages.length ? p.ages.join('、') : '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">本命主星</span><span>' + (p.majorStars.length ? p.majorStars.map(function(s) { return s.name + (s.mutagen ? '(' + s.mutagen + ')' : '') + (s.brightness ? '[' + s.brightness + ']' : ''); }).join('、') : '（空宫）') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">辅星</span><span>' + (p.minorStars.length ? p.minorStars.map(function(s) { return s.name + (s.mutagen ? '(' + s.mutagen + ')' : '') + (s.brightness ? '[' + s.brightness + ']' : ''); }).join('、') : '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">杂曜</span><span>' + (p.adjectiveStars.length ? p.adjectiveStars.map(function(s) { return s.name; }).join('、') : '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">长生</span><span>' + (p.changsheng12 || '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">博士</span><span>' + (p.boshi12 || '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">将前</span><span>' + (p.jiangqian12 || '—') + '</span></div>'
    +   '<div class="zw-detail-row"><span class="zw-detail-k">岁前</span><span>' + (p.suiqian12 || '—') + '</span></div>'
    +   (state.horoscope && state.scope !== 'native' ? _detailScopeRow(p) : '')
    + '</div>';
  box.innerHTML = html;
}

function _detailScopeRow(p) {
  if (!state.horoscope) return '';
  var sc = state.scope === 'decadal' ? state.horoscope.decadal : state.horoscope.yearly;
  var stars = (sc && sc.stars && sc.stars[p.index]) || [];
  if (!stars.length) return '';
  var label = state.scope === 'decadal' ? '运曜' : '流曜';
  return '<div class="zw-detail-row"><span class="zw-detail-k">' + label + '</span><span>' + stars.map(function(s) { return s.name; }).join('、') + '</span></div>';
}

// ════════════════════════════════════════════════════════════════
// AI 解读
// ════════════════════════════════════════════════════════════════
function _initAiPanel() {
  var keyEl = document.getElementById('zw-ai-key');
  if (keyEl) keyEl.value = _lsGet('zw_ai_key', '');
  var runBtn = document.getElementById('zw-ai-run');
  if (runBtn) runBtn.addEventListener('click', function() { _runAi(); });
}

export function buildAiPrompt() {
  if (!state.astrolabe) return '请解读此紫微斗数命盘（未排盘）。';
  var meta = state.astrolabe.meta;
  var lines = [];
  lines.push('请解读以下紫微斗数命盘：');
  lines.push('性别：' + (meta.gender || '') + '，生辰：' + (meta.solarDate || '') + ' ' + (meta.clockTime || '') + '（' + (meta.lunarDate || '') + '）');
  lines.push('五行局：' + (meta.fiveElementsClass || '') + '，命主：' + (meta.soul || '') + '，身主：' + (meta.body || ''));
  lines.push('');
  lines.push('十二宫星曜分布（含庙旺利陷）：');
  state.astrolabe.palaces.forEach(function(p) {
    var stars = p.majorStars.map(function(s) { return s.name + (s.mutagen ? '(' + s.mutagen + ')' : '') + (s.brightness ? '[' + s.brightness + ']' : ''); })
      .concat(p.minorStars.map(function(s) { return s.name + (s.mutagen ? '(' + s.mutagen + ')' : '') + (s.brightness ? '[' + s.brightness + ']' : ''); }));
    lines.push('· ' + p.name + '(' + p.heavenlyStem + p.earthlyBranch + ')：' + (stars.length ? stars.join('、') : '空宫') + (p.isBodyPalace ? ' [身宫]' : ''));
  });
  if (state.astrolabe.patterns && state.astrolabe.patterns.length) {
    lines.push('');
    lines.push('格局判定：');
    state.astrolabe.patterns.forEach(function(p) {
      lines.push('· [' + p.cat + p.level + '] ' + p.name + '：' + p.desc);
    });
  }
  if (state.scope !== 'native' && state.horoscope) {
    var sc = state.scope === 'decadal' ? state.horoscope.decadal : state.horoscope.yearly;
    if (sc) {
      lines.push('');
      lines.push('当前查看：' + (state.scope === 'decadal' ? '地盘（大限）' : '人盘（流年）') + ' ' + state.targetYear + ' 年');
      lines.push('运限四化：' + (sc.mutagen || []).map(function(n, i) { return n + MUTAGEN_LABEL[i]; }).join(' '));
    }
  }
  lines.push('');
  lines.push('请从命宫格局、财官、感情、健康等方面专业解读，并指出大限流年的关键节点。');
  return lines.join('\n');
}

async function _runAi() {
  var keyEl = document.getElementById('zw-ai-key');
  var out = document.getElementById('zw-ai-out');
  var runBtn = document.getElementById('zw-ai-run');
  if (!keyEl || !out) return;
  var apiKey = keyEl.value.trim();
  _lsSet('zw_ai_key', apiKey);
  if (!apiKey) { out.textContent = '请先填写 DeepSeek API Key（仅本地保存，不上传服务端之外的任何地方）。'; return; }
  if (!state.astrolabe) { out.textContent = '请先排盘再生成解读。'; return; }

  var prompt = buildAiPrompt();
  out.textContent = '解读生成中…';
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '生成中…'; }
  try {
    await _streamInterpret(prompt, apiKey, function(delta) {
      out.textContent += delta;
      out.scrollTop = out.scrollHeight;
    });
    if (out.textContent === '解读生成中…') out.textContent = '（解读为空，可能 Key 无效）';
  } catch (e) {
    out.textContent = '解读失败：' + (e.message || e);
  } finally {
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '生成解读'; }
  }
}

async function _streamInterpret(prompt, apiKey, onDelta) {
  var resp = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, apiKey: apiKey })
  });
  if (!resp.ok) {
    var j = await resp.json().catch(function() { return {}; });
    throw new Error(j.error || ('HTTP ' + resp.status));
  }
  var reader = resp.body.getReader();
  var decoder = new TextDecoder();
  var buf = '';
  while (true) {
    var r = await reader.read();
    if (r.done) break;
    buf += decoder.decode(r.value, { stream: true });
    var lines = buf.split('\n');
    buf = lines.pop() || '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('data: ') !== 0) continue;
      var data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        var obj = JSON.parse(data);
        if (obj.delta && obj.delta.text) onDelta(obj.delta.text);
      } catch (e) {}
    }
  }
}
