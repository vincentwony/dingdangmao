'use strict';
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

function setsFor(y,m,d){
  var lsr = lunisolar(new Date(y,m-1,d));
  var g = lsr.theGods;
  var good = g.getGoodGods().map(String);
  var bad = g.getBadGods().map(String);
  var ymd = (g.getGods ? g.getGods('YMD') : null);
  var ymdNames = ymd ? ymd.map(String) : null;
  return {
    date: y+'-'+m+'-'+d,
    inGood: good.indexOf('聖心')>=0,
    inBad: bad.indexOf('聖心')>=0,
    inYMD: ymdNames ? ymdNames.indexOf('聖心')>=0 : 'n/a',
    goodCount: good.length,
    ymdCount: ymdNames ? ymdNames.length : 'n/a',
    goodSample: good.slice(0,12).join(','),
  };
}
// 2024-1-5 协纪说 圣心 correct=true（寅月子... 实际需核对）
[[2024,1,5],[2024,3,15],[2024,7,15],[2024,11,15],[2025,1,5]].forEach(function(p){
  console.log(JSON.stringify(setsFor(p[0],p[1],p[2])));
});
// 列出 getGods('YMD') 中是否含 益後/續世
var lsr = lunisolar(new Date(2024,0,5));
var ymd = lsr.theGods.getGods('YMD').map(String);
console.log('YMD has 益後:', ymd.indexOf('益後')>=0, ' 續世:', ymd.indexOf('續世')>=0, ' 聖心:', ymd.indexOf('聖心')>=0);
console.log('YMD total:', ymd.length);
console.log('YMD sample:', ymd.slice(0,40).join(','));
