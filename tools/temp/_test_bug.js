var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf8');
var re = /<script(?![^>]*type=\"module\")[^>]*>([\s\S]*?)<\/script>/gi;
var blocks = []; var m;
while ((m = re.exec(html)) !== null) { var c = m[1].trim(); if (c && !c.startsWith('{')) blocks.push(c); }
global.window = global;
global.document = { getElementById: function(){return null;}, createElement: function(t){return {tagName:(t||'DIV').toUpperCase(),value:'',text:'',style:{},appendChild:function(){},removeChild:function(){},setAttribute:function(){}};}, body:{}, hidden:false, addEventListener:function(){}, documentElement:{classList:{contains:function(){return false;}}} };
global.navigator = {}; global.localStorage = {_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
global.J2000=2451545;global.curTZ=-8;global.SCtmp=0;global.radd=180/Math.PI;
global.matchMedia=function(){return{matches:false,addEventListener:function(){}}};
global.requestAnimationFrame=function(cb){setTimeout(cb,16);};
global.XMLHttpRequest=function(){};
global.window.addEventListener=function(){};
global.setCookie=function(){};global.getCookie=function(){return null;};
global.Cal_T={};global.Cal_zb={};global.window.matchMedia=global.matchMedia;
function ie(code){try{eval(code);}catch(e){}}
var b2=blocks[1];
ie(blocks[0]);
var dtIdx=b2.indexOf('var dt_at'); var tickIdx=b2.indexOf('\nfunction tick()');
if(dtIdx>=0&&tickIdx>dtIdx)ie(b2.substring(dtIdx,tickIdx));
var scIdx=b2.indexOf('\nfunction shiCha('); var scEnd=b2.indexOf('\nfunction ',scIdx+10);
if(scIdx>=0&&scEnd>scIdx)ie(b2.substring(scIdx,scEnd));
var tickFnEnd=b2.indexOf('\nfunction ',tickIdx+10); var asIdx=b2.indexOf('\n// ====== 八字格局推算系统 ======');
if(tickFnEnd>=0&&tickFnEnd<asIdx){try{ie(b2.substring(tickFnEnd,asIdx));}catch(e){}}
global._fmtShensha=function(x){return x?x.join(' '):'';};global._rlog=function(){};
global.DOMCache={get:function(){return null;},cache:{}};
try{ie(b2.substring(asIdx));}catch(e){}

function gzToIdx(gz){var G=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];var Z=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];var g=G.indexOf(gz[0]),z=Z.indexOf(gz[1]);for(var i=g;;i+=10)if(i%12===z)return i;}

// BUG CASE: 丙午 甲午 辛酉 戊戌
var ob = {
  b1: gzToIdx('丙午')+6000000, b2: gzToIdx('甲午')+60000000,
  b3: gzToIdx('辛酉'), b4: gzToIdx('戊戌')+90000000,
  bz_jn:'丙午',bz_jy:'甲午',bz_jr:'辛酉',bz_js:'戊戌',
  _px:{yong:0,xi:1,ji:2,chou:3},
  _wuxingVals:{mu:0,huo:0,tu:0,jin:0,shui:0}
};

var cd = _computeCongGeData(ob);
console.log('=== 从格判定结果 ===');
console.log('congType:', cd.congType);
console.log('isCong:', cd.isCong);
console.log('grade:', cd.grade);
console.log('riGan:', cd.riGan, 'riWx:', cd.riWx);
console.log('yueZhi:', cd.yueZhi, 'yueWx:', cd.yueWx);
console.log('rootDetail:', cd.rootDetail);
console.log('result:', cd.result);
console.log('congShen:', cd.congShen);
console.log('scores:', JSON.stringify(cd.scores));
console.log('wuxingVals:', JSON.stringify(cd.wuxingVals));
console.log('');

// Test determineCongGe rendering
var html_out = determineCongGe(ob);
console.log('=== 渲染输出（去标签） ===');
console.log(html_out.replace(/<[^>]+>/g, '').substring(0, 500));
