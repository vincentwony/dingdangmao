// server/lib/true-solar.js — 真太阳时换算（紫微/八字通用）
// 公式来源：《真太阳时修正技术参数.md》§4.1
//   真太阳时 = 标准时 + (λ/15 − TZ) × 3600 + EoT(秒)
// 其中 EoT 采用 Meeus 近似公式，精度约 0.5 分钟。
'use strict';

function _isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function _daysInMonth(y, m) {
  var days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (_isLeapYear(y)) days[2] = 29;
  return days[m];
}

function _dayOfYear(y, m, d) {
  var n = d;
  for (var i = 1; i < m; i++) n += _daysInMonth(y, i);
  return n;
}

function _pad(n) {
  return String(n).padStart(2, '0');
}

function _lastDayOfMonth(y, m) {
  // new Date(y, m, 0) 返回第 m 个月的最后一天（本地时）
  return new Date(y, m, 0).getDate();
}

/**
 * 应用真太阳时修正
 * @param {number} stdY 标准历年
 * @param {number} stdM 标准历月
 * @param {number} stdD 标准历日
 * @param {number} h   标准时小时（0-23）
 * @param {number} min 标准时分钟（0-59）
 * @param {number} lon 经度（东经为正，如 116.4）
 * @param {number} tz  时区（默认东八区 +8）
 * @returns {{y:number,m:number,d:number,h:number,min:number,totalOffsetSec:number,clockTime:string,trueSolarTime:string}}
 */
function applyTrueSolar(stdY, stdM, stdD, h, min, lon, tz) {
  tz = tz == null ? 8 : Number(tz);
  lon = Number(lon) || 120;

  var n = _dayOfYear(stdY, stdM, stdD);
  var B = (360 / 365) * (n - 81) * Math.PI / 180;
  var eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  var eotSec = Math.round(eotMin * 60);
  var longCorrSec = Math.round((lon / 15 - tz) * 3600);
  var totalOffset = longCorrSec + eotSec;

  var stdSec = h * 3600 + min * 60;
  // 以标准历日 0 点为起点的连续秒数（含跨日偏移），再拆回「日期偏移 + 当日秒数」
  var total = stdSec + totalOffset;
  var dayDelta = Math.floor(total / 86400);
  var trueSec = ((total % 86400) + 86400) % 86400;
  var tsH = Math.floor(trueSec / 3600);
  var tsM = Math.floor((trueSec % 3600) / 60);

  // 应用跨日偏移（修正量可能 >1 天，用循环保证月/年进位正确）
  var y = stdY, m = stdM, d = stdD + dayDelta;
  if (d < 1) {
    do {
      m--;
      if (m < 1) { y--; m = 12; }
      d += _daysInMonth(y, m);
    } while (d < 1);
  } else {
    while (d > _daysInMonth(y, m)) {
      d -= _daysInMonth(y, m);
      m++;
      if (m > 12) { y++; m = 1; }
    }
  }

  return {
    y: y, m: m, d: d,
    h: tsH, min: tsM,
    totalOffsetSec: totalOffset,
    clockTime: _pad(h) + ':' + _pad(min),
    trueSolarTime: _pad(tsH) + ':' + _pad(tsM)
  };
}

module.exports = { applyTrueSolar: applyTrueSolar };
