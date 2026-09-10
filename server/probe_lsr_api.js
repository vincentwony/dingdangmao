'use strict';
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

function inspect(y,m,d){
  var lsr = lunisolar(new Date(y, m-1, d));
  var good = lsr.theGods.getGoodGods().map(function(g){return String(g);});
  var bad  = lsr.theGods.getBadGods().map(function(g){return String(g);});
  var tg = lsr.lunar.monthGZ, dg = lsr.lunar.dayGZ;
  var info = {
    date: y+'-'+m+'-'+d,
    monthGZ: (lsr.lunar.monthGZ||''),
    dayGZ: (lsr.lunar.dayGZ||''),
    monthBranch: (lsr.lunar.monthBranch||''),
    dayBranch: (lsr.lunar.dayBranch||''),
    monthGZ_calc: (lsr.getMonthGZ?String(lsr.getMonthGZ()):'?'),
    dayGZ_calc: (lsr.getDayGZ?String(lsr.getDayGZ()):'?'),
    shengxin_in_good: good.indexOf('聖心')>=0,
    yihou_in_good: good.indexOf('益後')>=0,
    xushi_in_good: good.indexOf('續世')>=0,
    shengxin_in_bad: bad.indexOf('聖心')>=0,
    yihou_in_bad: bad.indexOf('益後')>=0,
    xushi_in_bad: bad.indexOf('續世')>=0,
  };
  console.log(JSON.stringify(info,null,0));
}

// 选几个不同月支的日期探测月支来源
[
  [2024,1,15],[2024,2,15],[2024,3,15],[2024,4,15],[2024,5,15],[2024,6,15],
  [2024,7,15],[2024,8,15],[2024,9,15],[2024,10,15],[2024,11,15],[2024,12,15]
].forEach(function(p){ inspect(p[0],p[1],p[2]); });
