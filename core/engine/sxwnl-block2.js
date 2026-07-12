// core/engine/sxwnl-block2.js — Block 2 纯计算函数提取（从 index.html）
// 原位置: h:/Phone/index.html Block 2
// 提取日期: 2026-06-26
// 注意: 不使用 'use strict'，原始代码依赖隐式全局变量

// ═══ 1. DT 数据 + dt_calc + dt_T（原 lines 11389-11434） ═══
var dt_at=new Array( // TD - UT1 计算表
-4000,108371.7,-13036.80,392.000, 0.0000,
 -500, 17201.0,  -627.82, 16.170,-0.3413,
 -150, 12200.6,  -346.41,  5.403,-0.1593,
  150,  9113.8,  -328.13, -1.647, 0.0377,
  500,  5707.5,  -391.41,  0.915, 0.3145,
  900,  2203.4,  -283.45, 13.034,-0.1778,
 1300,   490.1,   -57.35,  2.085,-0.0072,
 1600,   120.0,    -9.81, -1.532, 0.1403,
 1700,    10.2,    -0.91,  0.510,-0.0370,
 1800,    13.4,    -0.72,  0.202,-0.0193,
 1830,     7.8,    -1.81,  0.416,-0.0247,
 1860,     8.3,    -0.13, -0.406, 0.0292,
 1880,    -5.4,     0.32, -0.183, 0.0173,
 1900,    -2.3,     2.06,  0.169,-0.0135,
 1920,    21.2,     1.69, -0.304, 0.0167,
 1940,    24.2,     1.22, -0.064, 0.0031,
 1960,    33.2,     0.51,  0.231,-0.0109,
 1980,    51.0,     1.29, -0.026, 0.0032,
 2000,    63.87,     0.1,      0,      0,
 2005,    64.7,     0.21,      0,      0,
 2012,    66.8,     0.22,      0,      0,
 2018,    69.0,     0.36,      0,      0,
 2028,    72.6
 //一次项记为x,则 10x=0.4秒/年*(2012-2005),解得x=0.28
);

function dt_ext(y,jsd){ var dy=(y-1820)/100; return -20+jsd*dy*dy; } //二次曲线外推

function dt_calc(y){ //计算世界时与原子时之差,传入年
 var y0=dt_at[dt_at.length-2]; //表中最后一年
 var t0=dt_at[dt_at.length-1]; //表中最后一年的deltatT
 if(y>=y0){
  var jsd=31; //sjd是y1年之后的加速度估计。瑞士星历表jsd=31,NASA网站jsd=32,skmap的jsd=29
  if(y>y0+100) return dt_ext(y,jsd);
  var v = dt_ext(y, jsd);       //二次曲线外推
  var dv= dt_ext(y0,jsd) - t0;  //ye年的二次外推与te的差
  return v - dv*(y0+100-y)/100;
 }
 var i,d=dt_at;
 for(var i=0;i<d.length;i+=5) if(y<d[i+5]) break;
 var t1=(y-d[i])/(d[i+5]-d[i])*10, t2=t1*t1, t3=t2*t1;
 return d[i+1] +d[i+2]*t1 +d[i+3]*t2 +d[i+4]*t3;
}

function dt_T(t){ return dt_calc(t/365.2425+2000)/86400.0; }  //传入儒略日(J2000起算),计算TD-UT(单位:日)

// ═══ 2. shiCha + taiYangShi + zb_calc + RTS1（原 lines 9084-9186） ═══
function shiCha(t,a,dL,E){ //时差计算
  t/=10;
  var L, t2=t*t,t3=t2*t,t4=t3*t,t5=t4*t;
  L = 1753469512 + 6283319653318*t + 529674*t2 + 432*t3 - 1124*t4 - 9*t5 + 630 * Math.cos(6+3*t);
  L = L/1000000000 + Math.PI; //太阳平黄经
  L = L - 20.5/rad - a + dL*Math.cos(E); //a是太阳视赤经
  L = rad2mrad(L);
  if(L>Math.PI) L-=pi2;
  return L;
}
function taiYangShi(jd,L,c){ //转入格林尼治时间UT及本地经度及时差，c=0返回本地平太阳时，c=时差就返回真太阳时,返回的单位是弧度
  var t=jd-L/pi2+c/pi2;
  JD.setFromJD(t+J2000);
  return JD.toStr().substr(12,8);
}

function zb_calc(T,L,fa){ //T是力学时,站点经纬L,fa
  var s,z=new Array(),z2=new Array(),z3=new Array();
  var dt  = JD.deltatT2(T); //TD-UT
  var jd  = T-dt; //得到J2000起算的的儒略数
  T/=36525; ZB.nutation(T); //章动计算
  var E  = ZB.hcjj(T)+ZB.dE; //真黄赤交角
  var dL = ZB.dL; //黄经章动
  var gst= ZB.gst(jd,dt) + ZB.dL*Math.cos(E); //真恒星时(不考虑非多项式部分)
  var ShiJ;

 //月球坐标测试
  XL.M_coord(T,z,-1,-1,-1); //月球坐标
  z[0]  = rad2mrad( z[0]+ZB.gxc_moonLon(T)+ZB.dL ); //补上月球光行差及章动
  z[1] += ZB.gxc_moonLat(T);

  z2[0] = z[0], z2[1] = z[1], z2[2] = z[2];
  ZB.llrConv( z2, E ); //转为赤道坐标

  ShiJ = rad2mrad(gst - L - z2[0]); //得到此刻天体时角
  if( ShiJ>Math.PI ) ShiJ -= pi2;

  z3[0] = (Math.PI/2-ShiJ); z3[1] = z2[1]; z3[2]=z2[2]/1.496e8; //转到相对于地平赤道分点的赤道坐标
  ZB.parallax(z3,ShiJ,fa,0); //视差修正
  ZB.llrConv(z3, Math.PI/2-fa ); //转到地平坐标(只改经纬度)
  z3[0] = rad2mrad( 0-Math.PI/2-z3[0] );
  if(z3[1]>0) z3[1] += ZB.AR2(z3[1]); //大气折射修正

  s  = '<b>月球的当日真分点地心坐标</b><br>';
  s += '视黄经 ' + rad2str(z[0],0);
  s += '视黄纬 ' + rad2str(z[1],0)+'<br>';
  s += '视赤经 ' + rad2str(z2[0],1);
  s += '视赤纬 ' + rad2str(z2[1],0)+'<br>';
  s += '径距离 ' + int2(z[2]+0.5)+'千米 ';
  s += '平时角 ' + rad2str(ShiJ,0) + '<br>';
  s += "方位角 " + rad2str(z3[0],0);
  s += "高度角 " + rad2str(z3[1],0) + "<br>";
  s += "亮面比例 " + ( int2(XL.moonIll(T)*100000+0.5)/1000 )+'% ';
  s += "站心视半径 " + (int2(XL.moonRad(z[2],z3[1])/60*100+0.5)/100)+"'<br>";

  XL.E_coord(T,z,-1); //地球坐标
  z[0]  = rad2mrad(z[0]+Math.PI+ZB.gxc_sunLon(T)+ZB.dL); //补上太阳光行差及章动
  z[1]  =-z[1] + ZB.gxc_sunLat(T); //z数组为太阳地心黄道视坐标

  z2[0] = z[0], z2[1] = z[1], z2[2] = z[2];
  ZB.llrConv( z2, E ); //z2太阳地心赤道坐标

  ShiJ = rad2mrad(gst - L - z2[0]); //得到此刻天体时角
  if( ShiJ>Math.PI ) ShiJ -= pi2;

  z3[0] = (Math.PI/2-ShiJ); z3[1] = z2[1]; z3[2]=z2[2]; //转到相对于地平赤道分点的赤道坐标
 //ZB.parallax(z3,ShiJ,fa,0); //视差修正
  ZB.llrConv( z3, Math.PI/2-fa );
  z3[0] = rad2mrad( 0-Math.PI/2-z3[0] );
  if(z3[1]>0) z3[1] += ZB.AR2(z3[1]); //大气折射修正
  z3[1] -= 8.794/rad/z3[2]*Math.cos(z3[1]); //直接在地平坐标中视差修正(这里把地球看为球形,精度比ZB.parallax()稍差一些)

  s += '<b>太阳的当日真分点地心坐标</b><br>';
  s += '视黄经 ' + rad2str(z[0],0);
  s += '视黄纬 ' + rad2str(z[1],0) + '<br>';
  s += '视赤经 ' + rad2str(z2[0],1);
  s += '视赤纬 ' + rad2str(z2[1],0) + '<br>';
  s += '径距离 ' + (int2(z2[2]*1000000+0.5)/1000000) + 'AU ';
  s += '平时角 ' + rad2str(ShiJ,0) + '<br>'; //天顶到天体视赤经的差
  s += '方位角 ' + rad2str(z3[0],0);
  s += '高度角 ' + rad2str(z3[1],0) + '<br>';

  var sc=shiCha(T,z2[0],dL,E); //时差
  var sc_str=rad2str(sc,1);
  sc_str = sc_str.substr(0,1)+sc_str.substr(6,10);

  s += '时差 ' + sc_str + '<br>';
  s += '本地平太阳时 ' + taiYangShi(jd,L,0)+' 真太阳时 '+ taiYangShi(jd,L,sc)+'<br>';

  return s;
}
function RTS1(jd,vJ,vW){
 SZJ.calcRTS(jd, 1, vJ, vW, -8); //升降计算,使用北时时间,-8指东8区
 var s, ob = SZJ.rts[0];
 JD.setFromJD(jd+J2000);
 s = '<b>该日期的详细信息 '+JD.toStr().substr(0,11)+'</b><br>';
 s += '晨光开始 '+ob.c +' 日出 '+ob.s +'<br>';
 s += '日上中天 '+ob.z +' 日落 '+ob.j +'<br>';
 s += '昏影终止 '+ob.h +' 昼长 '+ob.sj+'<br>';
 s += '光照时间 '+ob.ch+' 月出 '+ob.Ms+'<br>';
 s += '月上中天 '+ob.Mz+' 月落 '+ob.Mj+'<br>';
 return s;
}

// ═══ 全局注入（模块作用域函数 → global） ═══
if (typeof dt_at !== 'undefined') global.dt_at = dt_at;
if (typeof dt_calc !== 'undefined') global.dt_calc = dt_calc;
if (typeof dt_T !== 'undefined') global.dt_T = dt_T;
if (typeof shiCha !== 'undefined') { global.shiCha = shiCha; }
if (typeof taiYangShi !== 'undefined') { global.taiYangShi = taiYangShi; }
if (typeof zb_calc !== 'undefined') { global.zb_calc = zb_calc; }
if (typeof RTS1 !== 'undefined') { global.RTS1 = RTS1; }

// ═══ 模块导出 ═══
module.exports = {
  dt_at: (typeof dt_at !== 'undefined') ? dt_at : null,
  dt_calc: (typeof dt_calc !== 'undefined') ? dt_calc : null,
  dt_T: (typeof dt_T !== 'undefined') ? dt_T : null,
  shiCha: (typeof shiCha !== 'undefined') ? shiCha : null,
  taiYangShi: (typeof taiYangShi !== 'undefined') ? taiYangShi : null,
  zb_calc: (typeof zb_calc !== 'undefined') ? zb_calc : null,
  RTS1: (typeof RTS1 !== 'undefined') ? RTS1 : null
};
