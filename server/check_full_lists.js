'use strict';
var cal = require('./routes/calendar.js');
// 取几个适用日期：2024-1-13 续世(应成立) / 2024-8-7 益后(应成立) / 2024-10-18 圣心(应成立)
[[2024,1,13],[2024,8,7],[2024,10,18],[2024,10,12]].forEach(function(p){
  var y=p[0],m=p[1],d=p[2];
  var core=require('gongxin-core'); var c=core.computeDayFromLunar(y,m,d);
  var g=cal._getLsrGods(y,m,d,c);
  if(!g){console.log(y+'-'+m+'-'+d+' -> null');return;}
  console.log(y+'-'+m+'-'+d+' 吉='+g.good.length+' 凶='+g.bad.length);
  console.log('  吉神含 聖心:'+ (g.good.indexOf('聖心')>=0) + ' 益後:'+(g.good.indexOf('益後')>=0)+' 續世:'+(g.good.indexOf('續世')>=0));
  console.log('  吉神样例: '+ g.good.slice(0,20).join(' '));
});
