'use strict';
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);
var core = require('gongxin-core');
var computeDayFromLunar = core.computeDayFromLunar;
var SHENGXIN = [4,10,11,5,0,6,1,7,2,8,3,9];
var YIHOU    = [5,11,0,6,1,7,2,8,3,9,4,10];
var XUSHI    = [6,0,1,7,2,8,3,9,4,10,5,11];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
function raw(y,m,d){
  var lsr = lunisolar(new Date(y,m-1,d));
  var good = lsr.theGods.getGoodGods().map(String);
  return { '聖心': good.indexOf('聖心')>=0, '益後': good.indexOf('益後')>=0, '續世': good.indexOf('續世')>=0 };
}
var out = { '聖心':[], '益後':[], '續世':[] };
[2024,2025,2026,2027].forEach(function(y){
  for (var m=1;m<=12;m++){
    var dn=new Date(y,m,0).getDate();
    for (var d=1;d<=dn;d++){
      var c = computeDayFromLunar(y,m,d);
      var mb = ZHI.indexOf(c.monthGZ[1]), db = ZHI.indexOf(c.dayGZ[1]);
      var r = raw(y,m,d);
      var correct = { '聖心': db===SHENGXIN[mb], '益後': db===YIHOU[mb], '續世': db===XUSHI[mb] };
      ['聖心','益後','續世'].forEach(function(nm){
        if (r[nm] !== correct[nm]) out[nm].push(y+'-'+m+'-'+d+' raw='+(r[nm]?1:0)+' correct='+(correct[nm]?1:0));
      });
    }
  }
});
Object.keys(out).forEach(function(nm){
  console.log(nm+' DIFF count='+out[nm].length);
  console.log('  sample: '+out[nm].slice(0,8).join(' | '));
});
