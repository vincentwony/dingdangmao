// server/lib/daymaster-strength.js
// ─────────────────────────────────────────────────────────────────────────────
// 日主强弱 · 权威判定引擎
// 依据：《日主强弱判定方法研究与实现方案.md》（用户校准版）
//   · 三维框架（§3）：得令（月令旺衰）/ 得地（地支通根）/ 得势（天干帮扶）
//   · 量化方案（§5 方案二 · 五步量化法）：A=日主+生扶得分, B=其余, A/B 比值定 7 级
//   · 旺/强分论（§2.1/§4）：得时为旺、党众为强，须分别陈述
//   · 墓库根规则（§6.1）：阳干逢库有根、阴干逢库通常无用
//   · 禄旺加倍（§4.5）：坐禄/帝旺根力最强
// 设计：独立于 gongxin-core，藏干采用标准子平（校正巳中/余互换等序位），
//       不 patch node_modules，由 routes/bazi.js 以覆盖层方式调用。
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

var core = require('gongxin-core');

// 天干 → 五行索引（甲乙木0 / 丙丁火1 / 戊己土2 / 庚辛金3 / 壬癸水4）
var GAN2WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
var WX = ['木', '火', '土', '金', '水'];
var _DG_GAN = core._DG_GAN;

// 复用 gongxin-core 的月令状态表 / 系数 / 十二长生（已按 MD 校准）
var STATUS_TABLE = core._YL_STATUS_TABLE;   // [五行][季节组] → 旺/相/休/囚/死
var seasonGroup = core._seasonGroup;        // 地支→季节组(0春1夏2秋3冬4四季)
// §5 方案二 Step3 月令旺度系数（旺2.0/相1.5/休0.8/囚0.7/死0.5），独立于 wuxing.js 的百分制
var YUELING_COEF = { '旺': 2.0, '相': 1.5, '休': 0.8, '囚': 0.7, '死': 0.5 };
var CS_WEIGHT = core._CS_WEIGHT;            // 十二长生能量
var CS_START = core._CS_START;
function csWeight(riGanIdx, zhiIdx) {
  return CS_WEIGHT[(zhiIdx - CS_START[riGanIdx] + 12) % 12];
}

// ─── 标准子平藏干（本/中/余），校正自 gongxin-core 的非标准序位 ───
// 地支序：子0丑1寅2卯3辰4巳5午6未7申8酉9戌10亥11
// 巳：本丙 / 中庚 / 余戊（原实现中气戊余气庚 → 已互换修正）
// 午：本丁 / 中己（单双藏，无余）
// 未：本己 / 中丁 / 余乙（阴干库根依此判定）
// 戌：本戊 / 中辛 / 余丁    亥：本壬 / 中甲 / 余戊
var BENQI  = ['癸', '己', '甲', '乙', '戊', '丙', '丁', '己', '庚', '辛', '戊', '壬'];
var ZHONGQI= ['',   '辛', '丙', '',   '乙', '庚', '己', '丁', '壬', '',   '辛', '甲'];
var YUQI   = ['',   '癸', '戊', '',   '癸', '戊', '',   '乙', '戊', '',   '丁', '戊'];

// 藏干分值（§5 方案二 Step2）：单藏6 / 双藏4+2 / 三藏3+2+1
function _zangScores(zhiIdx) {
  var n = (BENQI[zhiIdx] ? 1 : 0) + (ZHONGQI[zhiIdx] ? 1 : 0) + (YUQI[zhiIdx] ? 1 : 0);
  if (n <= 1) return [6, 0, 0];
  if (n === 2) return [4, 2, 0];
  return [3, 2, 1];
}

// 禄 / 帝旺（§4.5）
var LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];     // 甲禄寅…癸禄子
var DIWANG = [3, 2, 6, 5, 6, 5, 9, 8, 0, 11]; // 甲旺卯…癸旺亥

// 四墓库地支（本气即库藏五行）：金库丑1 / 水库辰4 / 木库未7 / 火库戌10
function _kuBranch(riWx) {
  if (riWx === 3) return 1;   // 金 → 丑
  if (riWx === 4) return 4;   // 水 → 辰
  if (riWx === 0) return 7;   // 木 → 未
  if (riWx === 1) return 10;  // 火 → 戌
  return -1;                  // 土日主以辰戌丑未本气为根，非余气库
}

/**
 * 计算五维五行得分（供 A/B 比值使用，§5 方案二 Step1~4）
 * 天干：每干基础 1 分
 * 地支：藏干 6/4/2/3/2/1 分；月支额外乘「月令旺度系数」
 */
function _computeWxScores(ob) {
  var riGan = ob.b3 % 10, riWx = riGan >> 1;
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var zhi = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  var yueZhi = zhi[1];
  var yueSeason = seasonGroup(yueZhi);

  var scores = [0, 0, 0, 0, 0];

  // Step1 天干旺度（每柱天干基础分 1）
  for (var i = 0; i < 4; i++) {
    scores[GAN2WX[stems[i]]] += 1;
  }

  // Step2+3 地支藏干旺度（月支乘月令系数）
  for (var b = 0; b < 4; b++) {
    var z = zhi[b];
    var zs = _zangScores(z);
    var cands = [
      [BENQI[z], zs[0]],
      [ZHONGQI[z], zs[1]],
      [YUQI[z], zs[2]]
    ];
    for (var c = 0; c < 3; c++) {
      var g = cands[c][0];
      var base = cands[c][1];
      if (!g) continue;
      var gw = GAN2WX[_DG_GAN[g]];
      // 月支乘月令旺度系数（§5 方案二 Step3：旺2.0/相1.5/休0.8/囚0.7/死0.5）
      var coef = 1;
      if (b === 1) {
        var st = STATUS_TABLE[gw][yueSeason];
        coef = YUELING_COEF[st] || 1;
      }
      scores[gw] += base * coef;
    }
  }

  return scores;
}

/**
 * 主入口：返回结构化日主强弱结论
 */
function computeDayMasterStrength(ob) {
  var riGan = ob.b3 % 10;
  var riWx = riGan >> 1;
  var isYang = (riGan % 2 === 0);
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var zhi = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  var yueZhi = zhi[1];
  var yueSeason = seasonGroup(yueZhi);

  // ── 得令（§3.1）：月令对日主五行的旺相休囚死 ──
  var yueStatus = STATUS_TABLE[riWx][yueSeason]; // 旺/相/休/囚/死
  var deling = (yueStatus === '旺' || yueStatus === '相');

  // ── 得地（§3.2/§4/§6.1）：地支通根，区分阳/阴干库根 + 禄旺加倍 ──
  var dedi = false;
  var rootList = [];
  var kuB = _kuBranch(riWx);
  for (var b = 0; b < 4; b++) {
    if (b === 1) continue; // 月支已计入得令
    var z = zhi[b];
    var zs = _zangScores(z);
    var cands = [
      { g: BENQI[z], score: zs[0], level: '本气' },
      { g: ZHONGQI[z], score: zs[1], level: '中气' },
      { g: YUQI[z], score: zs[2], level: '余气' }
    ];
    for (var c = 0; c < 3; c++) {
      var cd = cands[c];
      if (!cd.g) continue;
      if (GAN2WX[_DG_GAN[cd.g]] !== riWx) continue;
      // 墓库余气根：阳干有根 / 阴干通常无用（§6.1）
      var isKuRoot = (kuB >= 0 && z === kuB && cd.level === '余气');
      if (isKuRoot && !isYang) continue; // 阴干逢库无用 → 不计
      // 禄旺加倍（§4.5）
      var csw = csWeight(riGan, z);
      if (z === LU[riGan] || z === DIWANG[riGan]) csw *= 2;
      dedi = true;
      rootList.push({
        zhi: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][z],
        level: cd.level,
        isKuRoot: isKuRoot,
        changsheng: csw
      });
    }
  }

  // ── 得势（§3.3）：天干比劫/印星生扶 ──
  var deshi = false;
  var shiList = [];
  for (var s = 0; s < 4; s++) {
    if (s === 2) continue; // 日主自身
    var sw = GAN2WX[stems[s]];
    if (sw === riWx) { deshi = true; shiList.push(['比劫', ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][stems[s]]]); }
    else if (sw === (riWx + 4) % 5) { deshi = true; shiList.push(['印', ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][stems[s]]]); }
  }

  // ── A/B 比值 7 级（§5 方案二 Step4~5）──
  var scores = _computeWxScores(ob);
  var A = scores[riWx] + scores[(riWx + 4) % 5]; // 日主 + 生我(印)
  var B = scores[(riWx + 1) % 5] + scores[(riWx + 2) % 5] + scores[(riWx + 3) % 5];
  var ratio = (B > 0) ? (A / B) : 999;

  var level, label;
  if (A < 1.5) { level = '弱极'; }
  else if (ratio < 0.3) { level = '很弱'; }
  else if (A >= 4 && ratio < 0.8) { level = '比较弱'; }
  else if (ratio <= 1.3) { level = '平衡'; }
  else if (ratio <= 2.5) { level = '比较旺'; }
  else if (B >= 2) { level = '很旺'; }
  else { level = '旺极'; }

  // 喜用方向（由强弱推导，§10）
  var favorable, unfavorable;
  if (level === '弱极' || level === '很弱' || level === '比较弱') {
    favorable = '生扶（印、比劫）';
    unfavorable = '克泄耗（官杀、食伤、财）';
  } else if (level === '比较旺' || level === '很旺' || level === '旺极') {
    favorable = '克泄耗（官杀、食伤、财）';
    unfavorable = '生扶（印、比劫）';
  } else {
    favorable = '视具体格局权衡';
    unfavorable = '不宜偏颇';
  }

  // 旺/强分论（§2.1/§4）：得令=旺，得地或得势=强
  var wang = deling;
  var qiang = dedi || deshi;

  return {
    riGan: riGan,
    riWx: riWx,
    riGanName: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][riGan],
    riWxName: WX[riWx],
    // 权威 7 级
    level: level,
    label: level,
    // 三维
    deling: deling,
    dedi: dedi,
    deshi: deshi,
    // 旺/强分论
    wang: wang,
    qiang: qiang,
    // A/B 明细
    A: Math.round(A * 100) / 100,
    B: Math.round(B * 100) / 100,
    ratio: Math.round(ratio * 100) / 100,
    scores: scores.map(function (v) { return Math.round(v * 100) / 100; }),
    // 辅助明细
    yueStatus: yueStatus,
    rootList: rootList,
    shiList: shiList,
    favorable: favorable,
    unfavorable: unfavorable,
    // 人类可读结论
    conclusion: _buildConclusion(level, wang, qiang, deling, dedi, deshi)
  };
}

function _buildConclusion(level, wang, qiang, deling, dedi, deshi) {
  var parts = [];
  parts.push('日主' + level);
  var dim = [];
  dim.push(deling ? '得令' : '失令');
  dim.push(dedi ? '得地' : '失地');
  dim.push(deshi ? '得势' : '失势');
  parts.push('（' + dim.join('·') + '）');
  if (wang && qiang) parts.push('；得时且党众，身强力壮');
  else if (wang && !qiang) parts.push('；得时令之气（旺）而根气稍弱');
  else if (!wang && qiang) parts.push('；虽失令而根气党众（强）');
  else parts.push('；失时失势，弱而需扶');
  return parts.join('');
}

module.exports = {
  computeDayMasterStrength: computeDayMasterStrength,
  _computeWxScores: _computeWxScores
};
