var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf8');
var re = /<script(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/gi;
var blocks = []; var m;
while ((m = re.exec(html)) !== null) { var c = m[1].trim(); if (c && !c.startsWith('{')) blocks.push(c); }

// Minimal stubs
global.window = global;
global.document = {
  getElementById: function(){return null;},
  createElement: function(t){return {tagName:(t||'DIV').toUpperCase(),value:'',text:'',style:{},appendChild:function(){},removeChild:function(){},setAttribute:function(){}};},
  body:{}, hidden:false, addEventListener:function(){},
  documentElement:{classList:{contains:function(){return false;}}}
};
global.navigator = {}; global.localStorage = {_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
global.J2000=2451545;global.curTZ=-8;global.SCtmp=0;global.radd=180/Math.PI;
global.matchMedia=function(){return{matches:false,addEventListener:function(){}}};
global.requestAnimationFrame=function(cb){setTimeout(cb,16);};
global.XMLHttpRequest=function(){};
global.window.addEventListener=function(){};
global.setCookie=function(){};global.getCookie=function(){return null;};
global.Cal_T={};global.Cal_zb={};
global.window.matchMedia=global.matchMedia;

var b2=blocks[1];
function ie(code){try{eval(code);}catch(e){}}

// Block 1 - Lunar engine
ie(blocks[0]);

// Helper extraction
var dtIdx=b2.indexOf('var dt_at');
var tickIdx=b2.indexOf('\nfunction tick()');
if(dtIdx>=0&&tickIdx>dtIdx)ie(b2.substring(dtIdx,tickIdx));

var scIdx=b2.indexOf('\nfunction shiCha(');
var scEnd=b2.indexOf('\nfunction ',scIdx+10);
if(scIdx>=0&&scEnd>scIdx)ie(b2.substring(scIdx,scEnd));

var tickFnEnd=b2.indexOf('\nfunction ',tickIdx+10);
var asIdx=b2.indexOf('\n// ====== 八字格局推算系统 ======');
if(tickFnEnd>=0&&tickFnEnd<asIdx){try{ie(b2.substring(tickFnEnd,asIdx));}catch(e){}}

// _fmtShensha stub
global._fmtShensha = function(x) { return x ? x.join(' ') : ''; };
global._rlog = function(){};

global.DOMCache={get:function(){return null;},cache:{}};
try{ie(b2.substring(asIdx));}catch(e){}

global.renderDayunTable=function(){return'';};
global.renderLiunianTable=function(){return'';};
global.renderLiuyueTable=function(){return'';};
global.renderMinggongXingxingTable=function(){return'';};

// Run test
JD.Y=1984;JD.M=2;JD.D=15;JD.h=12;JD.m=0;JD.s=0;
var jd=JD.toJD();
var bzjd=jd+curTZ/24-J2000;
global.Sel2s={vJ:116.40,vW:39.93};
Lunar.ZQ=[];Lunar.HS=[];Lunar.leap=0;Lunar.lun=[];
var ob={};
Lunar.mingLiBaZi(bzjd,116.40/radd,ob,'测试',1,0,0,'');
if(!ob._congGeData)ob._congGeData=_computeCongGeData(ob);
if(!ob._px)ob._px={yong:0,xi:1,ji:2,chou:3};
if(!ob._wuxingVals)ob._wuxingVals={mu:0,huo:0,tu:0,jin:0,shui:0};

console.log('四柱:',ob.bz_jn,ob.bz_jy,ob.bz_jr,ob.bz_js);
console.log('日主:',Lunar.Gan[ob.b3%10],' 五行=',Lunar.WuXingJ[(ob.b3%10)>>1]);

var xy=_getXiyongWx(ob);
console.log('格局:',xy.geName,'用神五行:',xy.yongWx.map(function(w){return Lunar.WuXingJ[w]}).join('/'),'忌神:',xy.jiWx.map(function(w){return Lunar.WuXingJ[w]}).join('/'));
console.log('');

function s(t){return t.replace(/<[^>]+>/g,'');}

console.log('═══ 年柱·祖上基调 ═══');
console.log(s(_renderNianZhu(ob,xy)));
console.log('');
console.log('═══ 月柱·事业内核 ═══');
console.log(s(_renderYueZhu(ob,xy)));
console.log('');
console.log('═══ 日柱·自我与婚姻 ═══');
console.log(s(_renderRiZhu(ob,xy)));
console.log('');
console.log('═══ 时柱·晚景归宿 ═══');
console.log(s(_renderShiZhu(ob,xy)));
