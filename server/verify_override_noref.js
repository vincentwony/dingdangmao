'use strict';
// verify_override_noref.js — CI 校验：圣心/益后/续世 经 _getLsrGods 协纪覆盖后
// 与《协纪辨方书·卷六》正确值零偏差（覆盖 lunisolar 安装版 dist 的月支索引错位 bug）。
// 直接调用 routes/calendar.js 的真实 _getLsrGods（非逻辑副本），确保回归有效。
var path = require('path');
var core = require('gongxin-core');
var computeDayFromLunar = core.computeDayFromLunar;
var calendar = require(path.join(__dirname, 'routes', 'calendar.js'));
var _getLsrGods = calendar._getLsrGods;

// 协纪正确值（卷六）。圣心/益后/续世 月支→日支数组（下标0-11子→亥，值=日支序号）
var SHENGXIN = [4,10,11,5,0,6,1,7,2,8,3,9];
var YIHOU    = [5,11,0,6,1,7,2,8,3,9,4,10];
var XUSHI    = [6,0,1,7,2,8,3,9,4,10,5,11];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function refTruth(y,m,d){
  var c = computeDayFromLunar(y,m,d);
  var mb = ZHI.indexOf(c.monthGZ[1]);
  var db = ZHI.indexOf(c.dayGZ[1]);
  var present = function(arr){ return db === arr[mb]; };
  return { '聖心': present(SHENGXIN), '益後': present(YIHOU), '續世': present(XUSHI) };
}

var diffs = { '聖心':0,'益後':0,'續世':0 };
var total = 0;
[2024,2025,2026,2027].forEach(function(y){
  for (var m=1;m<=12;m++){
    var dn = new Date(y,m,0).getDate();
    for (var d=1; d<=dn; d++){
      var c = computeDayFromLunar(y,m,d);
      var g = _getLsrGods(y,m,d,c);
      var ref = refTruth(y,m,d);
      ['聖心','益後','續世'].forEach(function(nm){
        var present = g.good.indexOf(nm)>=0 || g.bad.indexOf(nm)>=0;
        total++;
        if (present !== ref[nm]) diffs[nm]++;
      });
    }
  }
});

var allZero = diffs['聖心']===0 && diffs['益後']===0 && diffs['續世']===0;
console.log('圣心/益后/续世 覆盖校验：每日天数=' + total + ' 偏差=' + JSON.stringify(diffs));
if (!allZero) {
  console.error('FAIL: 覆盖后与协纪存在偏差，请检查 routes/calendar.js 的 _getLsrGods');
  process.exit(1);
}
console.log('PASS: 圣心/益后/续世 与协纪辨方书·卷六 完全一致（0 偏差）');
