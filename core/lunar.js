// core/lunar.js — 天文历算引擎（模块加载版）
// 2026-06-26: 从 vm.runInThisContext 沙箱改为 require() 模块加载
'use strict';

var fs = require('fs');
var path = require('path');
var noop = function() {};

// ═══ 浏览器桩 ═══
try { global.window = global; } catch(e) {}
global.document = {
  getElementById: function() { return null; },
  createElement: function(t) { return { tagName: (t || 'div').toUpperCase(), style: {}, value: '', text: '' }; },
  body: {}, hidden: false, addEventListener: noop,
  documentElement: { classList: { contains: function() { return false; } } },
  cookie: ''
};
try { global.navigator = {}; } catch(e) {}
global.localStorage = { _d: {}, getItem: function(k) { return this._d[k] || null; }, setItem: function(k, v) { this._d[k] = v; } };
global.J2000 = 2451545; global.curTZ = -8; global.rad = 180 * 3600 / Math.PI; global.radd = 180 / Math.PI;
global.matchMedia = function() { return { matches: false, addEventListener: noop }; };
global.window.matchMedia = global.matchMedia;
global.window.addEventListener = noop;
global.requestAnimationFrame = function(cb) { setTimeout(cb, 16); };
global.setCookie = noop; global.getCookie = function() { return null; };
global.Cal_T = {}; global.Cal_zb = {}; global.XMLHttpRequest = noop;
global.addOp = function(el, i, val) {
  if (el && el.options) el.options.push({ value: String(i), text: val });
};
global.Sel1 = { options: [{ value: '0', text: '默认' }], add: function(opt) { this.options.push(opt); } };
global.Sel2 = { options: [{ value: '0', text: '默认' }], add: function(opt) { this.options.push(opt); } };
global.Sel_yue = noop;

// ═══ wuxing 函数全局桩（mingLiBaZi 直接调用）═══
var wu = require('./wuxing.js');
global._DG_GAN = wu._DG_GAN;
global._DG_BENQI = wu._DG_BENQI;
global._DG_ZHONGQI = wu._DG_ZHONGQI;
global._DG_YUQI = wu._DG_YUQI;
global._cgGanWx = wu._cgGanWx;
global._cgSSKind = wu._cgSSKind;
global._cgIsShengZhu = wu._cgIsShengZhu;
global.Qiulq = wu.Qiulq;
global._CS_WEIGHT = wu._CS_WEIGHT;
global._CS_START = wu._CS_START;
global._csState = wu._csState;
global._csWeight = wu._csWeight;

// ═══ 渲染函数桩（必须在引擎加载前设置）═══
global.renderBaziTable = function(o) { return ''; };
global.renderDayunTable = function(o) { return ''; };
global.renderLiuNianTable = function(o) { return ''; };
global.renderLiunianTable = function(o) { return ''; };
global.renderLiuyueTable = function(o) { return ''; };
global.renderMinggongXingxingTable = function(o) { return ''; };
global.renderDayunTimeline = function(o) { return ''; };
global.renderNianZhu = function(o) { return ''; };
global.renderYueZhu = function(o) { return ''; };
global.renderRiZhu = function(o) { return ''; };
global.renderShiZhu = function(o) { return ''; };
global.renderTiaoHou = function(o) { return ''; };
global.renderLiuTong = function(o) { return ''; };
global.ChangeLn = function(n) {};
global._stripTags = function(s) { return (s || '').replace(/<[^>]*>/g, ''); };
global._ziZuoText = function(i) { return ''; };
global._kongwangText = function(i) { return ''; };
global._splitCangGan = function(s) { return (s || '').split('|'); };
global._splitFuXing = function(s) { return (s || '').split(','); };
global._formatShensha = function(s) { return s || ''; };
global._fmtShensha = function(gg) { return gg || ''; };
global._assessDayMasterStrength = function(o) { return {}; };
global._ganColorClass = function(i) { return ''; };
global._zhiColorClass = function(i) { return ''; };
global.showToast = function(msg, type, duration) { console.log('[toast]', type||'info', msg); };

// ═══ lunisolar ═══
var lunisolar = require('lunisolar');
var theGodsPkg = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPkg.theGods);

// ═══════════════════════════════════════════════════════════════
// 天文学引擎加载（2026-06-26: 从 index.html 提取为独立文件，vm 加载）
// 使用 vm.runInThisContext 保留原始全局作用域语义，但源文件独立管理
// ═══════════════════════════════════════════════════════════════

var vm = require('vm');
var enginePath = path.join(__dirname, 'engine', 'sxwnl-bundle.js');

// 读取并执行引擎文件（去掉首行注释和 module.exports 部分）
var engineSrc = fs.readFileSync(enginePath, 'utf8');

// 提取纯计算代码：从 "Block 1" 标记处到 "全局注入" 标记处
var block1Start = engineSrc.indexOf('// ═══ Block 1');
var blockEnd = engineSrc.indexOf('// ═══ 全局注入（var → global');
if (block1Start >= 0 && blockEnd > block1Start) {
  var code = engineSrc.substring(block1Start, blockEnd);
  try {
    vm.runInThisContext(code, { filename: 'sxwnl-bundle' });
    console.log('[lunar] Engine bundle loaded (vm)');
  } catch(e) {
    console.error('[lunar] Engine bundle FAIL:', e.message);
    throw e;
  }
} else {
  console.error('[lunar] Invalid engine file structure');
  process.exit(1);
}

// ═══ dayunjl 依赖函数（手动注入供 core/bazi.js 的 dayunjl 使用）═══
global._yearToChinese = function(y) {
  var digits = ['〇','一','二','三','四','五','六','七','八','九'];
  var s = String(y), r = '';
  for (var i = 0; i < s.length; i++) r += digits[parseInt(s.charAt(i))];
  return r;
};
global._getLunarDateStr = function(intJD) {
  var Lunar = global.Lunar;
  Lunar.calc(intJD);
  var mk = global.int2((intJD - Lunar.HS[0]) / 30);
  if (mk < 13 && Lunar.HS[mk+1] <= intJD) mk++;
  var pyl = intJD - Lunar.HS[mk];
  var dayName = Lunar.rmc[pyl];
  var monStr = '';
  if (Lunar.leap && mk == Lunar.leap) monStr = '闰';
  if (mk == 0 || mk == 1) {
    if (mk == 0) monStr += '冬';
    if (mk == 1) monStr += '腊';
  } else monStr += Lunar.ym[mk];
  if (monStr.length < 3) monStr += '月';
  monStr += Lunar.dx[mk] > 29 ? '大' : '小';
  var Ds = Lunar.HS[2];
  for (var i = 0; i < 14; i++) {
    if (Lunar.ym[i] != '正' || (Lunar.leap == i && i)) continue;
    Ds = Lunar.HS[i];
    if (intJD < Ds) { Ds -= 365; break; }
  }
  Ds = Ds + 5810;
  var lunarYear = Math.floor(Ds / 365.2422 + 0.5) + 1984;
  return global._yearToChinese(lunarYear) + '年' + monStr + dayName;
};

// ═══ DOMCache 桩 ═══
global.DOMCache = { cache: {}, get: function(id) { return null; }, clear: function(id) {} };
global._lastBaziOb = null;
global._lastMGxh = 0;

// ═══ 注入 shensha-data 全局变量（_render_funcs.js 在沙箱中无法 require） ═══
var _sd = require('./shensha-data.js');
global._sd_ganColorClass = _sd._ganColorClass;
global._sd_zhiColorClass = _sd._zhiColorClass;
global._sd_ganFullName = _sd._ganFullName;
global._sd_SHENSHA_NAMES = _sd.SHENSHA_NAMES;
global._sd_SHENSHA_DETAIL = _sd.SHENSHA_DETAIL;
global._sd_LIUYUE_SHENSHA = _sd.LIUYUE_SHENSHA;
global._sd_MINGGONG_STAR_NAMES = _sd.MINGGONG_STAR_NAMES;
global._sd_MINGGONG_STAR_KOUJUE = _sd.MINGGONG_STAR_KOUJUE;

// ═══ 渲染函数注入（从 index.html 提取，服务端生成完整 bzinfo HTML）═══
try {
  var renderCode = fs.readFileSync(path.join(__dirname, '_render_funcs.js'), 'utf8');
  require('vm').runInThisContext(renderCode, { filename: 'render-funcs' });
  console.log('[lunar] Render funcs OK');
} catch(e) { console.error('[lunar] Render funcs FAIL:', e.message); }

// ═══ Lunar.sshenShort — 单字十神简写（"比""劫"…） ═══
global.Lunar.sshenShort = function(r, t) {
  var short = ['比','劫','食','伤','财','才','杀','官','枭','印'];
  var full = global.Lunar.sshen(r, t);
  var idx = global.Lunar.LiuQin.indexOf(full);
  return idx >= 0 ? (short[idx] || full) : full;
};

// ═══ 跨环境全局导出（浏览器 window.Lunar 可用）════
var _env = require('./env.js');
_env.ensureGlobal('Lunar', global.Lunar);
_env.ensureGlobal('JD', global.JD);
_env.ensureGlobal('ZB', global.ZB);

// ═══ 导出 ═══
module.exports = {
  JD: global.JD,
  ZB: global.ZB,
  XL: global.XL,
  SZJ: global.SZJ,
  Lunar: global.Lunar,
  J2000: 2451545,
  rad: 180 * 3600 / Math.PI,
  _lsrGetGods: function(y, m, d) {
    try { var lsr = lunisolar(new Date(y, m - 1, d)); return lsr.theGods; }
    catch(e) { return null; }
  },
  lunisolar: lunisolar
};
