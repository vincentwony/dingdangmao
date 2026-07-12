// core/bazi.js — 八字格局/从格/喜用/四柱详断/刑冲合害
'use strict';

var Lunar = require("./lunar.js").Lunar;
var JD = require("./lunar.js").JD;
var { Qiulq } = require("./wuxing.js");
var { Bz } = require("./texts.js");

function int2(v){v=Math.floor(v);if(v<0)return v+1;return v;}
if(typeof global!=="undefined"&&!global.window)global.window=global;

function dayunjl(jd){
   var yue,w,k;
   var jd2 = jd+dt_T(jd);
   var w = XL.S_aLon( jd2/36525, -1 );
   var k = int2( (w/pi2*360+45+15*360)/30 );
   Lunar.calc(int2(jd+0.5));
   yue = k+2+60000000;
   yue = yue%12;
   if((2*yue-1)<0) Lunar.calc(int2(jd+0.5-30.601));
   yue = yue%12;
   // 前一节气
   var qi1 = Lunar.ZQ[(2*yue-1+24)%24];
   var v1 = qi_accurate2(qi1);
   var term1 = Lunar.jqmc[(2*yue-1+24)%24];
   var ds1 = JD.JD2str(qi1+J2000).trim();
   var date1 = ds1.substr(0,10);
   var time1 = JD.JD2str(v1+J2000).trim().substr(11,8);
   var lunar1 = _getLunarDateStr(int2(qi1+0.5));
   var out = term1 + date1 + ' 农历' + lunar1 + ' (' + time1 + ')';
   // 后一节气
   Lunar.calc(int2(jd+0.5));
   var qi2 = Lunar.ZQ[(2*yue+1+24)%24];
   if (yue == 0) Lunar.calc(int2(jd+0.5+365.25)), qi2 = Lunar.ZQ[(2*yue+1+24)%24];
   var v2 = qi_accurate2(qi2);
   var term2 = Lunar.jqmc[(2*yue+1+24)%24];
   var ds2 = JD.JD2str(qi2+J2000).trim();
   var date2 = ds2.substr(0,10);
   var time2 = JD.JD2str(v2+J2000).trim().substr(11,8);
   var lunar2 = _getLunarDateStr(int2(qi2+0.5));
   out += '<br>' + term2 + date2 + ' 农历' + lunar2 + ' (' + time2 + ')';
   return out;
}

function cxcf(str,find) {
    var s = str.split(find).length-1; 
    return s;
}
function Qiulq(paramInt1,paramInt2){
    var i = paramInt1 % 10;
    paramInt2 %= 10;
    paramInt1 = paramInt2;
    if (paramInt2 < i) {
      paramInt1 = paramInt2 + 10;
    }
    paramInt2 = paramInt1;
    if (i % 2 == 0)
    {
      paramInt2 = paramInt1;
      if ((paramInt1 - i) % 2 == 1) {
        paramInt2 = paramInt1 + 2;
      }
    }
    var s;
    s = (paramInt2 - i) % 10;
    if (s == 0) s = 10;
    return s;
}

var _selectedLiunianYear = null;
var _selectedDayunIndex = null;

function _applyHighlights() {
  var allHL = document.querySelectorAll('.bt-ln-highlight, .bt-dy-highlight');
  for (var i = 0; i < allHL.length; i++) {
    allHL[i].classList.remove('bt-ln-highlight', 'bt-dy-highlight');
  }
  if (_selectedLiunianYear != null) {
    var lnTable = document.querySelector('.bt-ln-table');
    if (lnTable) {
      var ths = lnTable.querySelectorAll('thead th');
      for (var j = 1; j < ths.length; j++) {
        if (ths[j].textContent.trim() === String(_selectedLiunianYear)) {
          ths[j].classList.add('bt-ln-highlight');
          var rows = lnTable.querySelectorAll('tbody tr');
          for (var r = 0; r < rows.length; r++) {
            var tds = rows[r].querySelectorAll('td');
            if (tds[j]) tds[j].classList.add('bt-ln-highlight');
          }
          break;
        }
      }
    }
  }
  if (_selectedDayunIndex != null) {
    var dyTable = document.querySelector('.bt-dy-card .bt-dy-table');
    if (!dyTable) dyTable = document.querySelector('.bt-dy-table');
    if (dyTable) {
      var dyThs = dyTable.querySelectorAll('thead th');
      if (dyThs[_selectedDayunIndex + 1]) {
        dyThs[_selectedDayunIndex + 1].classList.add('bt-dy-highlight');
      }
      var dyRows = dyTable.querySelectorAll('tbody tr');
      for (var r2 = 0; r2 < dyRows.length; r2++) {
        var dyTds = dyRows[r2].querySelectorAll('td');
        if (dyTds[_selectedDayunIndex + 1]) dyTds[_selectedDayunIndex + 1].classList.add('bt-dy-highlight');
      }
    }
  }
}

function selectLiunianYear(year) {
  var ob = window._lastBaziOb;
  if (!ob || !ob._sz || !ob._sz.dyn) return;
  _selectedLiunianYear = year;
  var baseYear = parseInt(ob._sz.dyn[0]);
  var dyIdx = Math.floor((year - baseYear) / 10);
  if (dyIdx < 0) dyIdx = 0;
  if (dyIdx > 11) dyIdx = 11;
  // 联动：先切换大运流年表到对应的大运
  if (dyIdx !== _selectedDayunIndex) {
    ChangeLn(dyIdx);
  }
  _selectedDayunIndex = dyIdx;
  _selectedLiunianYear = year;
  Lunar.LnCun = dyIdx;
  // 再更新流月到点击的特定年份
  var MGxh = window._lastMGxh || 0;
  var lyHtml = renderLiuyueTable(ob, year, MGxh);
  var lyContainer = DOMCache.get('liuyueContainer');
  if (lyContainer) lyContainer.innerHTML = lyHtml;
  _applyHighlights();
}

function ChangeLn(n){
  Lunar.LnCun = n;
  var ob = window._lastBaziOb;
  var MGxh = window._lastMGxh;
  if (!ob || !ob._sz || !ob._sz.dyn) return;

  var startYear = parseInt(ob._sz.dyn[n]);
  if (isNaN(startYear)) return;

  var lnHtml = renderLiunianTable(ob, startYear, 10, MGxh, (ob._sz.qnian || 1) + n * 10);
  var lnId = Lunar.tongbu == 1 ? 'FTLN' : 'Liunian';
  var lnContainer = document.getElementById(lnId);
  if (lnContainer) lnContainer.innerHTML = lnHtml;

  var lyHtml = renderLiuyueTable(ob, startYear, MGxh);
  var lyContainer = DOMCache.get('liuyueContainer');
  if (lyContainer) lyContainer.innerHTML = lyHtml;

  _selectedDayunIndex = n;
  _selectedLiunianYear = null;
  requestAnimationFrame(_applyHighlights);
}

// ====== 八字格局推算系统 ======
// 天干字符→索引
var _DG_GAN = {'甲':0,'乙':1,'丙':2,'丁':3,'戊':4,'己':5,'庚':6,'辛':7,'壬':8,'癸':9};
// 十二月支本气
var _DG_BENQI = ['癸','己','甲','乙','戊','丙','丁','己','庚','辛','戊','壬'];
// 十二月支中气（子卯午酉亥无中气）
var _DG_ZHONGQI = ['','辛','丙','','乙','戊','','丁','壬','','丁',''];
// 十二月支余气（子卯酉无余气）
var _DG_YUQI     = ['','癸','戊','','癸','庚','己','乙','戊','','辛','甲'];
// 人元司令表 (月支索引0-11 → [{d:起始日,s:'天干'},...])
var _DG_RYSL = {};
_DG_RYSL[2]  = [{d:7,s:'戊'},{d:14,s:'丙'},{d:99,s:'甲'}];   // 寅·立春后
_DG_RYSL[3]  = [{d:10,s:'甲'},{d:99,s:'乙'}];                 // 卯·惊蛰后
_DG_RYSL[4]  = [{d:9,s:'乙'},{d:19,s:'癸'},{d:99,s:'戊'}];    // 辰·清明后
_DG_RYSL[5]  = [{d:5,s:'戊'},{d:15,s:'庚'},{d:99,s:'丙'}];    // 巳·立夏后
_DG_RYSL[6]  = [{d:10,s:'丙'},{d:20,s:'己'},{d:99,s:'丁'}];   // 午·芒种后
_DG_RYSL[7]  = [{d:9,s:'丁'},{d:13,s:'乙'},{d:99,s:'己'}];    // 未·小暑后
_DG_RYSL[8]  = [{d:7,s:'戊'},{d:15,s:'壬'},{d:99,s:'庚'}];    // 申·立秋后
_DG_RYSL[9]  = [{d:10,s:'庚'},{d:99,s:'辛'}];                 // 酉·白露后
_DG_RYSL[10] = [{d:9,s:'辛'},{d:13,s:'丁'},{d:99,s:'戊'}];    // 戌·寒露后
_DG_RYSL[11] = [{d:7,s:'戊'},{d:15,s:'甲'},{d:99,s:'壬'}];    // 亥·立冬后
_DG_RYSL[0]  = [{d:10,s:'壬'},{d:20,s:'癸'},{d:99,s:'癸'}];   // 子·大雪后
_DG_RYSL[1]  = [{d:9,s:'癸'},{d:13,s:'辛'},{d:99,s:'己'}];    // 丑·小寒后

// 格局类型映射 (十神 → [格局名, 顺用(true)/逆用(false)])
var _DG_GEMAP = {
  '正官':['正官格',true], '七杀':['七杀格',false], '正财':['正财格',true],
  '偏财':['偏财格',true], '正印':['正印格',true], '偏印':['偏印格',false],
  '食神':['食神格',true], '伤官':['伤官格',false], '比肩':['建禄格',null],
  '劫财':['月劫格',null]
};

// ══════════════════════════════════════════════
//  子平术定格喜用神 — 新增辅助函数
//  参考：《子平术定格喜用神算法规范.md》
// ══════════════════════════════════════════════

// 五行索引→十神名（基于日干阴阳自动选正/偏）
// 参照规范 §4.3 "五行喜忌与十神喜忌的转换"
var _WX_TO_TG = [
  // rel=0 同我（比肩/劫财）: [阳干日主, 阴干日主]
  ['比肩','劫财'],
  // rel=1 我生（食神/伤官）
  ['食神','伤官'],
  // rel=2 我克（偏财/正财）
  ['偏财','正财'],
  // rel=3 克我（七杀/正官）: riWx+3 是克我之五行
  ['七杀','正官'],
  // rel=4 生我（偏印/正印）: riWx+4 是生我之五行
  ['偏印','正印']
];
function _wxToTenGod(wxIdx, riWxIdx) {
  var rel = (wxIdx - riWxIdx + 5) % 5;
  return _WX_TO_TG[rel][0]; // 默认返回阳性版本（简化）
}
function _wxToTenGodFull(wxIdx, riStemIdx) {
  var riWx = riStemIdx >> 1;
  var isYin = riStemIdx % 2; // 0=阳干, 1=阴干
  var rel = (wxIdx - riWx + 5) % 5;
  return _WX_TO_TG[rel][isYin];
}
function _wxListToTenGods(wxList, riWxIdx) {
  var r = [];
  for (var i = 0; i < wxList.length; i++) r.push(_wxToTenGod(wxList[i], riWxIdx));
  return r;
}

// 化格判定 — 参照规范 §3.1.3
// 检查日干与月干/时干是否五合，化后五行是否月令当旺
var _HUAHE_PAIRS = {
  '0,5': { wu:2, name:'甲己化土' },  // 甲己合化土
  '1,6': { wu:3, name:'乙庚化金' },  // 乙庚合化金
  '2,7': { wu:4, name:'丙辛化水' },  // 丙辛合化水
  '3,8': { wu:0, name:'丁壬化木' },  // 丁壬化木
  '4,9': { wu:1, name:'戊癸化火' }   // 戊癸化火
};
var _HUAHE_YUEWU = { 0:4, 1:2, 2:0, 3:0, 4:2, 5:1, 6:1, 7:2, 8:3, 9:3, 10:2, 11:4 };
// 子=水(4), 丑=土(2), 寅=木(0), 卯=木(0), 辰=土(2), 巳=火(1), 午=火(1), 未=土(2), 申=金(3), 酉=金(3), 戌=土(2), 亥=水(4)
// 辰戌丑未→土=2, 寅卯→木=0, 巳午→火=1, 申酉→金=3, 亥子→水=4
function checkHuaGe(ob) {
  var ri = ob.b3 % 10;
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b4 % 10]; // 年月时干（不含日干）
  var pillarNames = ['年干','月干','时干'];
  var pillarIdxs = [0, 1, 3]; // 年月时在stems数组中的逻辑位置
  for (var i = 0; i < 3; i++) {
    var oth = stems[i];
    var key = Math.min(ri, oth) + ',' + Math.max(ri, oth);
    var he = _HUAHE_PAIRS[key];
    if (!he) continue;
    // 检查化后五行在月令是否当旺
    var monthBranch = ob.b2 % 12;
    var yueWx = _HUAHE_YUEWU[monthBranch];
    if (he.wu !== yueWx) continue;
    // 检查争合：其他柱是否有同干干扰
    var hasConflict = false;
    for (var j = 0; j < 3; j++) {
      if (j === i) continue;
      if (stems[j] === ri || stems[j] === oth) hasConflict = true;
    }
    if (hasConflict) continue;
    // 化格成立
    return {
      type: he.name.replace('化','化') + '格',
      hePair: Lunar.Gan[ri] + Lunar.Gan[oth] + '合',
      huaWx: he.wu,
      huaWxName: Lunar.WuXingJ[he.wu],
      pillar: pillarNames[i]
    };
  }
  return null;
}

// 建禄/月劫判定表 — dayStemIdx → 建禄支(0-11) / 阳刃支(0-11)
// 甲禄在寅(2)刃在卯(3), 乙禄在卯(3)刃在寅(2), 依次类推
var _JIANLU_ZHI = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
var _YANGREN_ZHI = [3, 2, 6, 5, 6, 5, 9, 8, 0, 11];

// 层次评定 — 参照规范 §7.1
// 从 determineBaziPattern 提取为独立函数
function evaluateGrade(score) {
  var level, text;
  if (score >= 4) { level = '上等'; text = '格局清纯有力，相神得力，主富贵双全。'; }
  else if (score >= 2) { level = '中等'; text = '格局有扶有制，虽有瑕疵但不至于破格，主衣食丰足。'; }
  else if (score >= 0) { level = '下等'; text = '格局偏弱，用神无力或忌神当道，须大运扶起方有作为。'; }
  else { level = '破格'; text = '格局破败，用神被伤，忌神猖獗，主一生多舛。'; }
  return { score: score, level: level, text: text };
}

// ══════════════════════════════════════════════
//  日主强弱判定 — 完整子平术三要素算法
//  参照：《子平术_日主强弱算法.md》
// =============================================

// 十神关系系数
// 简化系数 — 参照规范 §3.3 得令评分（不区分正/偏，统合十神类目）
var _DM_REL_COEF_SIMPLE = { '比劫':2, '印':2, '食伤':-1, '财':-1, '官杀':-2 };
// 详细系数 — 参照规范 §5.2 得势评分（区分正/偏十神）
var _DM_REL_COEF = { '比肩':1.5, '劫财':1.2, '偏印':1.2, '正印':1.5, '食神':-0.8, '伤官':-1, '偏财':-0.8, '正财':-1, '七杀':-1.5, '正官':-1.2 };

// 通根类型系数 — 参照规范 §4.2
var _DM_ROOT_TYPE = { 'benQi':1.0, 'zhongQi':0.5, 'yuQi':0.2, 'yin':0.6 };

// 天干位置权重 — 参照规范 §5.3
var _DM_STEM_WEIGHT = { 'year':0.5, 'month':1.0, 'hour':0.8 };

// 地支位置权重 — 参照规范 §4.3（月支已在得令中计算）
var _DM_BRANCH_WEIGHT = { 'year':0.6, 'day':1.0, 'hour':0.8 };

// 禄/帝旺加倍表 — 参照规范 §4.5
var _DM_LU_DIWANG = [];
_DM_LU_DIWANG[0] = { lu:2, dw:3 };   // 甲:禄寅(2) 帝旺卯(3)
_DM_LU_DIWANG[1] = { lu:3, dw:2 };   // 乙:禄卯(3) 帝旺寅(2)
_DM_LU_DIWANG[2] = { lu:5, dw:6 };   // 丙:禄巳(5) 帝旺午(6)
_DM_LU_DIWANG[3] = { lu:6, dw:5 };   // 丁:禄午(6) 帝旺巳(5)
_DM_LU_DIWANG[4] = { lu:5, dw:6 };   // 戊:禄巳(5) 帝旺午(6)
_DM_LU_DIWANG[5] = { lu:6, dw:5 };   // 己:禄午(6) 帝旺巳(5)
_DM_LU_DIWANG[6] = { lu:8, dw:9 };   // 庚:禄申(8) 帝旺酉(9)
_DM_LU_DIWANG[7] = { lu:9, dw:8 };   // 辛:禄酉(9) 帝旺申(8)
_DM_LU_DIWANG[8] = { lu:11, dw:0 };  // 壬:禄亥(11) 帝旺子(0)
_DM_LU_DIWANG[9] = { lu:0, dw:11 };  // 癸:禄子(0) 帝旺亥(11)

// 空亡表 — 参照规范 §7.6
var _DM_KONGWANG = {};
_DM_KONGWANG[0] = [10,11]; // 甲子旬→戌亥
_DM_KONGWANG[1] = [10,11];
_DM_KONGWANG[2] = [10,11];
_DM_KONGWANG[3] = [10,11];
_DM_KONGWANG[4] = [10,11];
_DM_KONGWANG[5] = [10,11];
_DM_KONGWANG[6] = [10,11];
_DM_KONGWANG[7] = [10,11];
_DM_KONGWANG[8] = [10,11];
_DM_KONGWANG[9] = [10,11];
_DM_KONGWANG[10] = [8,9]; // 甲戌旬→申酉
_DM_KONGWANG[11] = [8,9];
_DM_KONGWANG[12] = [8,9];
_DM_KONGWANG[13] = [8,9];
_DM_KONGWANG[14] = [8,9];
_DM_KONGWANG[15] = [8,9];
_DM_KONGWANG[16] = [8,9];
_DM_KONGWANG[17] = [8,9];
_DM_KONGWANG[18] = [8,9];
_DM_KONGWANG[19] = [8,9];
_DM_KONGWANG[20] = [6,7]; // 甲申旬→午未
_DM_KONGWANG[21] = [6,7];
_DM_KONGWANG[22] = [6,7];
_DM_KONGWANG[23] = [6,7];
_DM_KONGWANG[24] = [6,7];
_DM_KONGWANG[25] = [6,7];
_DM_KONGWANG[26] = [6,7];
_DM_KONGWANG[27] = [6,7];
_DM_KONGWANG[28] = [6,7];
_DM_KONGWANG[29] = [6,7];
_DM_KONGWANG[30] = [4,5]; // 甲午旬→辰巳
_DM_KONGWANG[31] = [4,5];
_DM_KONGWANG[32] = [4,5];
_DM_KONGWANG[33] = [4,5];
_DM_KONGWANG[34] = [4,5];
_DM_KONGWANG[35] = [4,5];
_DM_KONGWANG[36] = [4,5];
_DM_KONGWANG[37] = [4,5];
_DM_KONGWANG[38] = [4,5];
_DM_KONGWANG[39] = [4,5];
_DM_KONGWANG[40] = [2,3]; // 甲辰旬→寅卯
_DM_KONGWANG[41] = [2,3];
_DM_KONGWANG[42] = [2,3];
_DM_KONGWANG[43] = [2,3];
_DM_KONGWANG[44] = [2,3];
_DM_KONGWANG[45] = [2,3];
_DM_KONGWANG[46] = [2,3];
_DM_KONGWANG[47] = [2,3];
_DM_KONGWANG[48] = [2,3];
_DM_KONGWANG[49] = [2,3];
_DM_KONGWANG[50] = [0,1]; // 甲寅旬→子丑
_DM_KONGWANG[51] = [0,1];
_DM_KONGWANG[52] = [0,1];
_DM_KONGWANG[53] = [0,1];
_DM_KONGWANG[54] = [0,1];
_DM_KONGWANG[55] = [0,1];
_DM_KONGWANG[56] = [0,1];
_DM_KONGWANG[57] = [0,1];
_DM_KONGWANG[58] = [0,1];
_DM_KONGWANG[59] = [0,1];

// 地支六合 — 参照规范 §7.1
var _DM_LIUHE = { '0,1':'土', '2,11':'木', '3,10':'火', '4,9':'金', '5,8':'水', '6,7':'土' };
// 地支三合 — 参照规范 §7.2
var _DM_SANHE = { '0,4,8':'水', '11,3,7':'木', '2,6,10':'火', '5,9,1':'金' };
// 地支三会 — 参照规范 §7.3
var _DM_SANHUI = { '2,3,4':'木', '5,6,7':'火', '8,9,10':'金', '11,0,1':'水' };
// 地支六冲 — 参照规范 §7.4
var _DM_CHONG = { '0':6, '6':0, '1':7, '7':1, '2':8, '8':2, '3':9, '9':3, '4':10, '10':4, '5':11, '11':5 };

// _dmGetRelFull: 计算天干对日主的详细十神名 — 参照规范 §1.4 / §5.2
function _dmGetRelFull(dayStemIdx, otherStemIdx) {
  var riWx = dayStemIdx >> 1;
  var oWx = otherStemIdx >> 1;
  var rel = (oWx - riWx + 5) % 5;
  var isSameYinYang = (dayStemIdx % 2) === (otherStemIdx % 2);
  if (rel === 0) return isSameYinYang ? '比肩' : '劫财';
  if (rel === 1) return isSameYinYang ? '食神' : '伤官';
  if (rel === 2) return isSameYinYang ? '偏财' : '正财';
  if (rel === 3) return isSameYinYang ? '七杀' : '正官';
  return isSameYinYang ? '偏印' : '正印';
}

// _dmGetRelSimple: 十神→简化类目（得令/得地用）— 参照规范 §3.3
function _dmGetRelSimple(ssName) {
  if (ssName === '比肩' || ssName === '劫财') return '比劫';
  if (ssName === '正印' || ssName === '偏印') return '印';
  if (ssName === '食神' || ssName === '伤官') return '食伤';
  if (ssName === '正财' || ssName === '偏财') return '财';
  if (ssName === '七杀' || ssName === '正官') return '官杀';
  return '?';
}

// =============================================
//  _assessDayMasterStrength(ob) — 参照规范全文
//  返回: { score, strength, details }
// =============================================
function _assessDayMasterStrength(ob) {
  var dayStem = ob.b3 % 10;
  var riWx = dayStem >> 1;
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var branches = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  var monthBranch = branches[1];

  // ── Step 1: 得令评分 — 参照规范 §3.3 ──
  var scoreLing = 0;
  var benQiM = _DG_BENQI[monthBranch];
  var zhongQiM = _DG_ZHONGQI[monthBranch];
  var yuQiM = _DG_YUQI[monthBranch];
  // 自动计算权重比例：1藏干=1.0, 2藏干=0.6/0.4, 3藏干=0.6/0.3/0.1
  var stemCount = (benQiM ? 1 : 0) + (zhongQiM ? 1 : 0) + (yuQiM ? 1 : 0);
  var wB = (stemCount === 1) ? 1.0 : ((stemCount === 2) ? 0.6 : 0.6);
  var wZ = (stemCount === 1) ? 0 : ((stemCount === 2) ? 0.4 : 0.3);
  var wY = (stemCount === 1) ? 0 : ((stemCount === 2) ? 0 : 0.1);
  if (benQiM && _DG_GAN[benQiM] !== undefined) {
    var relM = _dmGetRelFull(dayStem, _DG_GAN[benQiM]);
    scoreLing += wB * (_DM_REL_COEF_SIMPLE[_dmGetRelSimple(relM)] || 0);
  }
  if (zhongQiM && _DG_GAN[zhongQiM] !== undefined) {
    var relM2 = _dmGetRelFull(dayStem, _DG_GAN[zhongQiM]);
    scoreLing += wZ * (_DM_REL_COEF_SIMPLE[_dmGetRelSimple(relM2)] || 0);
  }
  if (yuQiM && _DG_GAN[yuQiM] !== undefined) {
    var relM3 = _dmGetRelFull(dayStem, _DG_GAN[yuQiM]);
    scoreLing += wY * (_DM_REL_COEF_SIMPLE[_dmGetRelSimple(relM3)] || 0);
  }
  var scLingRaw = scoreLing;
  scoreLing = scoreLing * 3; // 得令分权重×3

  // ── Step 2: 得地评分（通根）— 参照规范 §4.2~§4.5 ──
  // 关键规则：先检查地支是否有同五行根，若有则计算完整得分
  var scoreGen = 0;
  var rootDetails = [];
  var posMapB = { 0:'year', 2:'day', 3:'hour' };
  var posWeightB = { 'year':0.6, 'day':1.0, 'hour':0.8 };
  for (var bIdx = 0; bIdx < 4; bIdx++) {
    if (bIdx === 1) continue; // 月支已在得令中
    var branch = branches[bIdx];
    var bq = _DG_BENQI[branch], zq = _DG_ZHONGQI[branch], yq = _DG_YUQI[branch];
    // 检查是否有同五行根（本气/中气/余气）
    var hasRoot = false;
    if (bq && _DG_GAN[bq] !== undefined && (_DG_GAN[bq] >> 1) === riWx) hasRoot = true;
    else if (zq && _DG_GAN[zq] !== undefined && (_DG_GAN[zq] >> 1) === riWx) hasRoot = true;
    else if (yq && _DG_GAN[yq] !== undefined && (_DG_GAN[yq] >> 1) === riWx) hasRoot = true;
    if (!hasRoot) continue; // 无根则不计入通根

    // 有根：计算该支完整得分（含非同类藏干的消耗）
    var brScore = 0;
    var scB = (bq ? 1 : 0) + (zq ? 1 : 0) + (yq ? 1 : 0);
    var bwB = (scB === 1) ? 1.0 : ((scB === 2) ? 0.6 : 0.6);
    var bwZ = (scB === 1) ? 0 : ((scB === 2) ? 0.4 : 0.3);
    var bwY = (scB === 1) ? 0 : ((scB === 2) ? 0 : 0.1);
    if (bq && _DG_GAN[bq] !== undefined) {
      var ssB = _dmGetRelFull(dayStem, _DG_GAN[bq]);
      brScore += bwB * (_DM_REL_COEF[ssB] || 0);
    }
    if (zq && _DG_GAN[zq] !== undefined) {
      var ssB2 = _dmGetRelFull(dayStem, _DG_GAN[zq]);
      brScore += bwZ * (_DM_REL_COEF[ssB2] || 0);
    }
    if (yq && _DG_GAN[yq] !== undefined) {
      var ssB3 = _dmGetRelFull(dayStem, _DG_GAN[yq]);
      brScore += bwY * (_DM_REL_COEF[ssB3] || 0);
    }
    var posW = posWeightB[posMapB[bIdx]];
    // §4.5 坐禄/帝旺加倍规则（规范示例未用，保留为可选增强）
    // 若需启用，取消下行注释：
    // var luDw = _DM_LU_DIWANG[dayStem]; if (branch === luDw.lu || branch === luDw.dw) brScore *= 2;
    scoreGen += brScore * posW;
    rootDetails.push(posMapB[bIdx] + '有根_' + Lunar.Zhi[branch] + '(' + brScore.toFixed(2) + ')');
  }
  var scGenRaw = scoreGen;
  scoreGen = scoreGen * 2; // 通根分权重×2

  // ── Step 3: 得势评分 — 参照规范 §5.2~§5.4 ──
  var scoreShi = 0;
  var stemPos = { 0:'year', 1:'month', 3:'hour' };
  var stemPosW = { 'year':0.5, 'month':1.0, 'hour':0.8 };
  for (var sIdx = 0; sIdx < 4; sIdx++) {
    if (sIdx === 2) continue; // 日柱天干即日主本身
    var pKey = stemPos[sIdx];
    var sw = stemPosW[pKey];
    var relS = _dmGetRelFull(dayStem, stems[sIdx]);
    scoreShi += (_DM_REL_COEF[relS] || 0) * sw;
  }
  // 天干合化修正 — 参照规范 §5.4
  var gzArr = [ob.b1, ob.b2, ob.b3, ob.b4];
  var heAdjust = 0;
  // 检查月日·日时紧邻合化
  var heChecks = [[0,1,'year','month'],[1,2,'month','day'],[2,3,'day','hour']];
  for (var hi = 0; hi < heChecks.length; hi++) {
    var hc = heChecks[hi];
    var g1 = gzArr[hc[0]] % 10, g2 = gzArr[hc[1]] % 10;
    if (g1 === g2) continue;
    var heKey = Math.min(g1,g2) + ',' + Math.max(g1,g2);
    if (_HUAHE_PAIRS.hasOwnProperty(heKey)) {
      // 化神在月令当旺
      var hw = _HUAHE_PAIRS[heKey].wu;
      var yueWx = _HUAHE_YUEWU[branches[1]];
      if (hw === yueWx) {
        if (hw === yueWx) {
          // 检查是否有争合
          var conflict = false;
          for (var ck = 0; ck < 4; ck++) {
            if (ck !== hc[0] && ck !== hc[1] && (gzArr[ck] % 10 === g1 || gzArr[ck] % 10 === g2)) conflict = true;
          }
          if (!conflict) {
            // 合化成立，被合走的帮扶消失
            var g2Rel = _dmGetRelFull(dayStem, g2);
            var g2Simple = _dmGetRelSimple(g2Rel);
            if (g2Simple === '比劫' || g2Simple === '印') {
              heAdjust -= (_DM_REL_COEF[g2Rel] || 0) * stemPosW[hc[2]];
            }
          }
        }
      }
    }
  }
  scoreShi += heAdjust;
  var scShiRaw = scoreShi;
  scoreShi = scoreShi * 1; // 得势分权重×1

  // ── Step 4: 进阶修正 — 参照规范 §7 ──
  var correction = 0;

  // 7.1 地支六合 — 基于 md 文件 §7.1 扩展实现
  // 7.2 地支三合 — 基于 md 文件 §7.2 扩展实现
  // 7.3 地支三会 — 基于 md 文件 §7.3 扩展实现
  // 简化：检查是否有三会/三合局的成员
  var branchSet = {};
  for (var bi = 0; bi < 4; bi++) branchSet[branches[bi]] = 1;
  // 三会方检测
  var sanHuiKeys = ['2,3,4','5,6,7','8,9,10','11,0,1'];
  var sanHuiNames = ['木','火','金','水'];
  for (var shi = 0; shi < sanHuiKeys.length; shi++) {
    var parts = sanHuiKeys[shi].split(',');
    var a = parseInt(parts[0]), b = parseInt(parts[1]), c = parseInt(parts[2]);
    if (branchSet[a] && branchSet[b] && branchSet[c]) {
      if (sanHuiNames[shi] === Lunar.WuXingJ[riWx]) correction += 1.5;
      else correction -= 0.5;
      break;
    }
    // 半会（两支）
    if ((branchSet[a] && branchSet[b]) || (branchSet[b] && branchSet[c]) || (branchSet[a] && branchSet[c])) {
      if (sanHuiNames[shi] === Lunar.WuXingJ[riWx]) correction += 1.0; // 寅卯半会木=
      else correction -= 0.3;
      break;
    }
  }

  // 7.4 刑冲破害 — 基于 md 文件 §7.4 扩展实现
  // 检查六冲
  for (var bi = 0; bi < 4; bi++) {
    var chongZhi = _DM_CHONG[branches[bi]];
    if (chongZhi !== undefined && branchSet[chongZhi]) {
      // 日主的根被冲→力量减半
      if (bi === 2 || bi === 3) { // 日支/时支被冲影响大
        var hasRoot = false;
        if ((_DG_BENQI[branches[bi]] && (_DG_GAN[_DG_BENQI[branches[bi]]] >> 1) === riWx)) hasRoot = true;
        if (hasRoot) correction -= 0.5;
      }
      break; // 只计一次
    }
  }

  // 7.6 空亡 — 基于 md 文件 §7.6 扩展实现
  var dayGz = ob.b3;
  var xunStart = dayGz - (dayGz % 10);
  var kongWangZhi = _DM_KONGWANG[xunStart];
  if (kongWangZhi) {
    for (var bi = 0; bi < 4; bi++) {
      if (bi === 1) continue; // 月支通常不论空
      if (branches[bi] === kongWangZhi[0] || branches[bi] === kongWangZhi[1]) {
        // 空亡支为日主的根→力量减半 — 基于 md 文件 §7.6 扩展实现
        if ((_DG_BENQI[branches[bi]] && (_DG_GAN[_DG_BENQI[branches[bi]]] >> 1) === riWx)) {
          correction -= 0.3;
        }
      }
    }
  }

  // ── Step 5: 综合计算 ── 参照规范 §6.1
  var total = scoreLing + scoreGen + scoreShi + correction;

  // ── Step 6: 强弱判定 ── 参照规范 §6.2
  var strength, strengthLabel;
  if (total >= 5)      { strength = '极强'; strengthLabel = '日主旺极，需克泄耗来平衡'; }
  else if (total >= 3) { strength = '偏强'; strengthLabel = '日主偏旺，宜克泄耗'; }
  else if (total >= 1) { strength = '中和偏强'; strengthLabel = '日主略旺，接近平衡'; }
  else if (total >= -1) { strength = '中和'; strengthLabel = '日主力量适中，最佳状态'; }
  else if (total >= -3) { strength = '中和偏弱'; strengthLabel = '日主略弱，接近平衡'; }
  else if (total >= -5) { strength = '偏弱'; strengthLabel = '日主偏弱，宜生扶'; }
  else                  { strength = '极弱'; strengthLabel = '日主衰极，需大力生扶'; }

  // ── Step 7: 喜用神方向 ── 参照规范 §10
  var favorable, unfavorable;
  if (strength === '极强' || strength === '偏强') {
    // 身强 → 喜克泄耗
    favorable = { note: '宜克泄耗（官杀、食伤、财才）', wx: ['克我(官杀)','我生(食伤)','我克(财)'] };
    unfavorable = { note: '忌生扶（印、比劫）', wx: ['生我(印)','同我(比劫)'] };
  } else if (strength === '极弱' || strength === '偏弱') {
    // 身弱 → 喜生扶
    favorable = { note: '宜生扶（印、比劫）', wx: ['生我(印)','同我(比劫)'] };
    unfavorable = { note: '忌克泄耗（官杀、食伤、财才）', wx: ['克我(官杀)','我生(食伤)','我克(财)'] };
  } else if (strength === '从弱' || strength === '假从弱') {
    favorable = { note: '顺势从弱（财官食伤）', wx: ['克我(官杀)','我生(食伤)','我克(财)'] };
    unfavorable = { note: '逆势生扶（印、比劫）', wx: ['生我(印)','同我(比劫)'] };
  } else {
    favorable = { note: '视具体格局而定', wx: [] };
    unfavorable = { note: '视具体格局而定', wx: [] };
  }

  return {
    score: total,
    strength: strength,
    strengthLabel: strengthLabel,
    scoreLing: scoreLing,
    scoreGen: scoreGen,
    scoreShi: scoreShi,
    correction: correction,
    scLingRaw: scLingRaw,
    scGenRaw: scGenRaw,
    scShiRaw: scShiRaw,
    riWx: riWx,
    rootDetails: rootDetails,
    favorable: favorable,
    unfavorable: unfavorable
  };
}

function _dinggeGetSiLing(ob) {
  var yue = ob.b2 % 12;
  var jd = ob.bz_jd;
  // 确保 ZQ 为出生年数据
  Lunar.calc(int2(jd + 0.5));
  if ((2 * yue - 1) < 0) Lunar.calc(int2(jd + 0.5 - 30.601));
  // 月令节气起始日
  var qiIdx = (2 * yue - 1 + 24) % 24;
  var qiJD = qi_accurate2(Lunar.ZQ[qiIdx]);
  var days = jd - qiJD;
  if (days < 0) days = 0;
  var stages = _DG_RYSL[yue];
  var slGan = stages[0].s;
  for (var i = 0; i < stages.length; i++) {
    if (days < stages[i].d) { slGan = stages[i].s; break; }
  }
  var qiName = Lunar.jqmc[qiIdx];
  return { qiName: qiName, days: days.toFixed(1), slGan: slGan, yue: yue };
}

function _dinggeCheckTouGan(ob, slGan) {
  var slIdx = _DG_GAN[slGan];
  if (slIdx === undefined) return [];
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var pillars = ['年','月','日','时'];
  var result = [];
  for (var i = 0; i < 4; i++) {
    if (stems[i] === slIdx) result.push(pillars[i]);
  }
  return result;
}

function _dinggeAnalyzeSizhu(ob, geSS, isShunYong) {
  var dayStem = ob.b3 % 10;
  var ssList = [];
  var pillars = ['年','月','日','时'];
  var stemIndices = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  for (var i = 0; i < 4; i++) {
    var ss = Lunar.sshen(ob.b3, stemIndices[i]); // 使用完整60甲子索引
    ssList.push({ pillar: pillars[i], ss: ss, stem: stemIndices[i], gzIdx: [ob.b1,ob.b2,ob.b3,ob.b4][i] });
  }
  // 十神类目
  var xiangShen = [], jiShen = [], notes = [];
  // 顺用格: 正官喜财印忌伤官七杀, 正财喜食伤忌比劫, 正印喜官杀忌财, 食神喜财忌偏印
  // 逆用格: 七杀喜食伤/印忌财, 偏印喜食神/财忌正印, 伤官喜印/财忌正官
  if (isShunYong === true) {
    if (geSS === '正官') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') xiangShen.push(ssList[i].pillar + '财');
        if (ssList[i].ss === '正印' || ssList[i].ss === '偏印') xiangShen.push(ssList[i].pillar + '印');
        if (ssList[i].ss === '伤官') jiShen.push(ssList[i].pillar + '伤官');
        if (ssList[i].ss === '七杀') jiShen.push(ssList[i].pillar + '七杀');
      }
    } else if (geSS === '正财' || geSS === '偏财') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '食神' || ssList[i].ss === '伤官') xiangShen.push(ssList[i].pillar + '食伤');
        if (ssList[i].ss === '比肩' || ssList[i].ss === '劫财') jiShen.push(ssList[i].pillar + '比劫');
        if (ssList[i].ss === '正官' || ssList[i].ss === '七杀') jiShen.push(ssList[i].pillar + '官杀(泄财)');
      }
    } else if (geSS === '正印' || geSS === '偏印') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '正官' || ssList[i].ss === '七杀') xiangShen.push(ssList[i].pillar + '官杀');
        if (ssList[i].ss === '比肩' || ssList[i].ss === '劫财') xiangShen.push(ssList[i].pillar + '比劫');
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') jiShen.push(ssList[i].pillar + '财(破印)');
      }
    } else if (geSS === '食神') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') xiangShen.push(ssList[i].pillar + '财');
        if (ssList[i].ss === '七杀') xiangShen.push(ssList[i].pillar + '杀(食神制杀)');
        if (ssList[i].ss === '偏印') jiShen.push(ssList[i].pillar + '枭(夺食)');
      }
    }
  } else if (isShunYong === false) {
    if (geSS === '七杀') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '食神') xiangShen.push(ssList[i].pillar + '食神(制杀)');
        if (ssList[i].ss === '正印' || ssList[i].ss === '偏印') xiangShen.push(ssList[i].pillar + '印(化杀)');
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') jiShen.push(ssList[i].pillar + '财(滋杀)');
      }
    } else if (geSS === '偏印') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '食神') xiangShen.push(ssList[i].pillar + '食神(制枭)');
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') xiangShen.push(ssList[i].pillar + '财(破枭)');
        if (ssList[i].ss === '正印') jiShen.push(ssList[i].pillar + '正印(混杂)');
      }
    } else if (geSS === '伤官') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '正印' || ssList[i].ss === '偏印') xiangShen.push(ssList[i].pillar + '印(配印)');
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') xiangShen.push(ssList[i].pillar + '财(生财)');
        if (ssList[i].ss === '正官') jiShen.push(ssList[i].pillar + '官(伤官见官)');
      }
    } else if (geSS === '羊刃' || geSS === '建禄') {
      for (var i = 0; i < ssList.length; i++) {
        if (ssList[i].ss === '正官' || ssList[i].ss === '七杀') xiangShen.push(ssList[i].pillar + '官杀(制刃)');
        if (ssList[i].ss === '正财' || ssList[i].ss === '偏财') xiangShen.push(ssList[i].pillar + '财');
        if (ssList[i].ss === '比肩' || ssList[i].ss === '劫财') jiShen.push(ssList[i].pillar + '比劫(争锋)');
      }
    }
  }
  // 收集相神/忌神对应的十神名（去重）
  var xiangSSSet = {}, jiSSSet = {};
  for (var xi = 0; xi < xiangShen.length; xi++) {
    // 从 "年财"、"月印(化杀)" 等描述中提取基本十神关键词
    var desc = xiangShen[xi];
    if (desc.indexOf('财') >= 0) { xiangSSSet['正财'] = 1; xiangSSSet['偏财'] = 1; }
    if (desc.indexOf('印') >= 0 && desc.indexOf('破印') < 0 && desc.indexOf('混') < 0) { xiangSSSet['正印'] = 1; xiangSSSet['偏印'] = 1; }
    if (desc.indexOf('食神') >= 0) xiangSSSet['食神'] = 1;
    if (desc.indexOf('伤官') >= 0) xiangSSSet['伤官'] = 1;
    if (desc.indexOf('官杀') >= 0) { xiangSSSet['正官'] = 1; xiangSSSet['七杀'] = 1; }
    if (desc.indexOf('杀(食') >= 0) xiangSSSet['七杀'] = 1;
  }
  for (var ji = 0; ji < jiShen.length; ji++) {
    var jdesc = jiShen[ji];
    if (jdesc.indexOf('伤官') >= 0) jiSSSet['伤官'] = 1;
    if (jdesc.indexOf('七杀') >= 0) jiSSSet['七杀'] = 1;
    if (jdesc.indexOf('比劫') >= 0) { jiSSSet['比肩'] = 1; jiSSSet['劫财'] = 1; }
    if (jdesc.indexOf('官杀') >= 0) { jiSSSet['正官'] = 1; jiSSSet['七杀'] = 1; }
    if (jdesc.indexOf('破印') >= 0) { jiSSSet['正财'] = 1; jiSSSet['偏财'] = 1; }
    if (jdesc.indexOf('枭') >= 0) jiSSSet['偏印'] = 1;
    if (jdesc.indexOf('混杂') >= 0) jiSSSet['正印'] = 1;
    if (jdesc.indexOf('伤官见官') >= 0) jiSSSet['正官'] = 1;
    if (jdesc.indexOf('争锋') >= 0) { jiSSSet['比肩'] = 1; jiSSSet['劫财'] = 1; }
    if (jdesc.indexOf('滋杀') >= 0) { jiSSSet['正财'] = 1; jiSSSet['偏财'] = 1; }
  }
  var xiangSSArr = [], jiSSArr = [];
  for (var k in xiangSSSet) xiangSSArr.push(k);
  for (var k2 in jiSSSet) jiSSArr.push(k2);
  return {
    xiang: xiangShen, ji: jiShen, ssList: ssList,
    xiangSS: xiangSSArr, jiSS: jiSSArr,
    hasXiang: xiangShen.length > 0, jiCount: jiShen.length, jiZhi: false
  };
}

// ══════════════════════════════════════════════
//  八字定格 — 完整子平术定格（含从格/化格前置检查）
//  参照规范 §3 特殊格局、§7 数据结构
// ══════════════════════════════════════════════
function determineBaziPattern(ob) {
  if (!ob || ob.b3 === undefined) return '<div class="bz-dingge-step-body">请先排定八字后再定格。</div>';

  var dayStem = ob.b3 % 10;
  var monthBranch = ob.b2 % 12;
  var dayGan = Lunar.Gan[dayStem];
  var monthZhi = Lunar.Zhi[monthBranch];
  var benQiGan = _DG_BENQI[monthBranch];
  var benQiIdx = _DG_GAN[benQiGan];
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var pillars = ['年','月','日','时'];
  var gzArr = [ob.b1, ob.b2, ob.b3, ob.b4];

  var html = '';
  html += '<div class="bz-dingge-title"><i class="ti ti-list-details"></i> 八字格局</div>';

  // ─── 前置检查1：从格 ─── 参照规范 §3.1
  var congData = _getCongGeData(ob);
  if (congData) {
    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">一、四柱八字</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '日主 <span class="bz-dingge-highlight">' + dayGan + '</span>（' + Lunar.WuXing[dayStem] + '）　';
    html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js;
    html += '</div></div>';

    html += '<div class="bz-dingge-result">';
    html += '<div class="bz-dingge-geju">' + congData.congType + '</div>';
    html += '<div class="bz-dingge-grade">特殊格局 · 顺势而为</div>';
    html += '</div>';

    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">从格判定依据</div>';
    html += '<div class="bz-dingge-step-body" style="font-size:13px;">';
    html += '生助力量占 <span class="bz-dingge-highlight">' + congData.shengPct + '%</span>，';
    html += '克泄耗力量占 <span style="color:#C41E0A;font-weight:600;">' + congData.keXiePct + '%</span>。';
    html += '日主' + (congData.riHasBenQiRoot ? '有本气根' : '无本气根') + '，';
    html += (congData.riHasTianGanHelp ? '天干有印比' : '天干无助') + '。<br>';
    if (congData.congType.indexOf('从旺') >= 0 || congData.congType.indexOf('专旺') >= 0) {
      html += '日主极旺，满盘印比成势，顺从旺势取用。';
    } else {
      html += '日主极弱，克泄耗占绝对主导，不得不从。';
    }
    html += '</div></div>';
    return html;
  }

  // ─── 前置检查2：化格 ─── 参照规范 §3.1.3
  var huaData = checkHuaGe(ob);
  if (huaData) {
    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">一、四柱八字</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '日主 <span class="bz-dingge-highlight">' + dayGan + '</span>（' + Lunar.WuXing[dayStem] + '）　';
    html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js;
    html += '</div></div>';

    html += '<div class="bz-dingge-result">';
    html += '<div class="bz-dingge-geju">' + huaData.type + '</div>';
    html += '<div class="bz-dingge-grade">化合格局 · ' + huaData.hePair + ' → 化' + huaData.huaWxName + '</div>';
    html += '</div>';

    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">化格判定依据</div>';
    html += '<div class="bz-dingge-step-body" style="font-size:13px;">';
    html += '日干与' + huaData.pillar + '天干构成<span class="bz-dingge-highlight">' + huaData.hePair + '</span>，';
    html += '化后五行' + huaData.huaWxName + '在月令当旺，无争合，化格成立。';
    html += '</div></div>';
    return html;
  }

  // ─── 正格流程 ─── 参照规范 §2
  // 优先使用缓存的格局名（mingLiBaZi中已计算），避免重复调用有状态的_dinggeGetSiLing

  // Step 1-2: 月令司令（仅当缓存不可用时才调用）
  var geNameFromCache = ob._geName || '';
  var sl, slGanIdx, slSS;
  if (geNameFromCache && geNameFromCache.indexOf('从') < 0) {
    // 有缓存且非从格 → 直接使用，不重复计算
    sl = _dinggeGetSiLing(ob);
    slGanIdx = _DG_GAN[sl.slGan];
    slSS = Lunar.sshen(ob.b3, slGanIdx);
  } else {
    sl = _dinggeGetSiLing(ob);
    slGanIdx = _DG_GAN[sl.slGan];
    slSS = Lunar.sshen(ob.b3, slGanIdx);
  }

  // Step 3: 月令本气十神
  var benQiSS = Lunar.sshen(ob.b3, benQiIdx);

  // Step 4: 透干验证
  var touGanPillars = _dinggeCheckTouGan(ob, sl.slGan);
  var isGeZhen = touGanPillars.length > 0;

  // Step 5: 定格 — 司令不透干时降等按本气定格
  var effSS = slSS;
  var effLabel = '司令';
  if (!isGeZhen) {
    effSS = benQiSS;
    effLabel = '本气';
  }
  var geInfo = _DG_GEMAP[effSS];
  if (!geInfo) geInfo = [effSS + '格', null];
  var geName = ob._geName || geInfo[0];  // 优先使用缓存的格局名（唯一真相源）
  var isShunYong = geInfo[1];

  // Step 6: 四柱分析
  var sizhu = _dinggeAnalyzeSizhu(ob, effSS, isShunYong);

  // Step 7: 层次评估 — 参照规范 §7.1
  var score = 0;
  if (isGeZhen) score += 2;                        // 司令透干
  if (sizhu.hasXiang) score += 2;                  // 相神得力
  if (sizhu.jiCount === 0) score += 1;             // 无忌神
  else if (sizhu.jiCount >= 2) score -= 1;         // 忌神多
  if (touGanPillars.length >= 2) score += 1;       // 多柱透干
  if (sizhu.jiZhi) score += 1;                     // 忌神被制
  if (sizhu.jiCount > 0 && !sizhu.hasXiang) score -= 2; // 相神被制（有忌无相）
  // 格局混杂检查：官杀混杂、财印混杂
  var hasGuan = false, hasSha = false, hasYin = false, hasCai = false;
  for (var si = 0; si < sizhu.ssList.length; si++) {
    var s = sizhu.ssList[si].ss;
    if (s === '正官') hasGuan = true;
    if (s === '七杀') hasSha = true;
    if (s === '正印' || s === '偏印') hasYin = true;
    if (s === '正财' || s === '偏财') hasCai = true;
  }
  if (hasGuan && hasSha) score -= 2; // 官杀混杂
  if (hasYin && hasCai && (effSS === '正官' || effSS === '七杀')) score -= 1; // 财印交战（官杀格中不利）
  var grade = evaluateGrade(score);

  // ─── 输出 HTML ───

  // Step 1: 四柱八字
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">一、四柱八字</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '日主 <span class="bz-dingge-highlight">' + dayGan + '</span>（' + Lunar.WuXing[dayStem] + '）　';
  html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js;
  html += '</div></div>';

  // Step 2: 月令分析
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">二、月令提纲</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '月令 <span class="bz-dingge-gold">' + monthZhi + '</span>，';
  html += '本气 <span class="bz-dingge-gold">' + benQiGan + '</span>（' + Lunar.WuXing[_DG_GAN[benQiGan]] + '），';
  html += '本气十神：<span class="bz-dingge-highlight">' + benQiSS + '</span>。<br>';
  html += '节气：' + sl.qiName + '后 <span class="bz-dingge-gold">' + sl.days + '</span> 日，';
  html += '司令人元：<span class="bz-dingge-highlight">' + sl.slGan + '</span>（' + Lunar.WuXing[slGanIdx] + '）。';
  html += '</div></div>';

  // Step 3: 司令十神
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">三、' + effLabel + '十神定位</div>';
  html += '<div class="bz-dingge-step-body">';
  html += effLabel + ' <span class="bz-dingge-gold">' + (isGeZhen ? sl.slGan : benQiGan) + '</span> 对日主 <span class="bz-dingge-gold">' + dayGan + '</span>：';
  html += '<span class="bz-dingge-highlight">' + effSS + '</span>。';
  if (!isGeZhen) {
    html += '<br><span style="color:var(--color-warning);font-size:12px;">司令 ' + sl.slGan + '（' + slSS + '）未透干，降等以本气定格。</span>';
  }
  html += '</div></div>';

  // Step 4: 透干验证
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">四、透干验证</div>';
  html += '<div class="bz-dingge-step-body">';
  if (isGeZhen) {
    html += '司令 <span class="bz-dingge-gold">' + sl.slGan + '</span> 透出天干于：';
    html += '<span class="bz-dingge-highlight">' + touGanPillars.join('、') + '</span>柱 → ';
    html += '<span class="bz-dingge-gold">格局为真</span>（《滴天髓》：格之真者，月支之神，透于天干也）。';
  } else {
    html += '司令 <span class="bz-dingge-gold">' + sl.slGan + '</span> 未透出天干 → ';
    html += '<span style="color:var(--color-warning);">格局不真</span>，层次减等。';
  }
  html += '</div></div>';

  // Step 5: 格局判定
  html += '<div class="bz-dingge-result">';
  html += '<div class="bz-dingge-geju">' + geName + '</div>';
  if (isShunYong === true) {
    html += '<div class="bz-dingge-grade">顺用格局（喜扶助，忌克泄）</div>';
  } else if (isShunYong === false) {
    html += '<div class="bz-dingge-grade">逆用格局（喜制伏，忌生扶）</div>';
  } else {
    html += '<div class="bz-dingge-grade">特殊格局 · 身强须财官平衡</div>';
  }
  html += '</div>';

  // Step 6: 四柱配合
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">六、四柱配合分析</div>';
  html += '<div class="bz-dingge-step-body">';
  if (sizhu.xiang.length > 0) {
    html += '相神（辅格）：<span style="color:#5D8A7C;font-weight:600;">' + sizhu.xiang.join('、') + '</span><br>';
  } else {
    html += '相神（辅格）：<span style="color:var(--color-warning);">无得力相神</span><br>';
  }
  if (sizhu.ji.length > 0) {
    html += '忌神（损格）：<span style="color:#C41E0A;font-weight:600;">' + sizhu.ji.join('、') + '</span>';
  } else {
    html += '忌神（损格）：<span style="color:#5D8A7C;">无明显忌神</span>';
  }
  // 官杀混杂/财印混杂提示
  if (hasGuan && hasSha) html += '<br><span style="color:#C41E0A;font-size:12px;">⚠ 官杀混杂，格局受损。</span>';
  html += '</div></div>';

  // Step 7: 层次评定
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">七、格局层次评定</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '综合评分：<span class="bz-dingge-highlight">' + grade.level + '</span>（' + (grade.score >= 0 ? '+' : '') + grade.score + ' 分）。';
  html += grade.text;
  html += '</div></div>';

  // Step 8: 喜用神索引（为 determineXiYong 提供数据）
  html += '<div class="bz-dingge-step" style="margin-top:4px;">';
  html += '<div class="bz-dingge-step-label">八、喜用神索引</div>';
  html += '<div class="bz-dingge-step-body" style="font-size:13px;">';
  if (sizhu.xiangSS.length > 0) {
    html += '喜神（辅格十神）：<span style="color:#5D8A7C;font-weight:600;">' + sizhu.xiangSS.join('、') + '</span>';
  }
  if (sizhu.jiSS.length > 0) {
    html += (sizhu.xiangSS.length > 0 ? '　' : '') + '忌神（损格十神）：<span style="color:#C41E0A;font-weight:600;">' + sizhu.jiSS.join('、') + '</span>';
  }
  html += '</div></div>';

  return html;
}

// 八字综合分析（喜用+定格+从格 三合一）
function showBaziAll() {
  if (!license_hasFeature('bazi_advanced')) { license_showPricing(); return; }
  var ob = window._lastBaziOb;
  if (!ob) {
    showToast('请先在八字排盘中填入信息并点击「确定」排盘', 'warn');
    return;
  }
  // 格局/喜用/从格已内联到 ob.bzinfo 卡片中，直接滚动到八字格局卡片
  var gejuCard = document.querySelector('[data-card-id="bz_geju"]');
  if (gejuCard) {
    gejuCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // 确保卡片展开
    if (gejuCard.classList.contains('collapsed')) {
      var hdr = gejuCard.querySelector('.card-header');
      if (hdr) toggleBaziCardCollapse(hdr);
    }
  } else {
    // 旧档案没有内联卡片 → 回退到 baziAllResult 面板渲染
    var panel = DOMCache.get('baziAllResult');
    if (!panel) return;
    var html = '';
    html += '<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px dashed #D4A574;">';
    html += determineBaziPattern(ob);
    html += '</div>';
    html += '<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px dashed #D4A574;">';
    html += determineXiyongshen(ob);
    html += '</div>';
    html += '<div style="margin-bottom:4px;">';
    html += determineCongGe(ob);
    html += '</div>';
    panel.innerHTML = html;
    _initBaziCollapsibles(panel);
    panel.classList.add('show');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ═══════════════════════════════════
//  八字命盘档案系统 — 保存/调取/删除/打印
//  文档按传统命理典籍规范撰写
// ═══════════════════════════════════

var BaziArchives = (function() {
  var STORAGE_KEY = 'bazi_archives';
  function getAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.filter(function(r) {
        return r && typeof r.id === 'string' && typeof r.name === 'string';
      });
    } catch(e) { console.warn('[BaziApp] getAll parse error:', e); return []; }
  }
  function saveAll(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); return true; }
    catch(e) { showToast('保存失败：存储空间不足，请清理旧档案后重试', 'error'); return false; }
  }
  function genId() { return 'bz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
  return { getAll: getAll, saveAll: saveAll, genId: genId };
})();

function _bzEsc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}



/** 保存当前八字命盘 —— 生成典籍体分析文档并存储 */
function saveBaziArchive() {
  var ob = window._lastBaziOb;
  if (!ob || !ob.bz_jn) { showToast('请先排盘，再保存命盘', 'warn'); return; }

  var now = new Date();
  var pad = function(n) { return ('0' + n).slice(-2); };
  var savedAt = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

  // 保存当前页面渲染结果（与八字排盘分析页面完全一致）
  var cal62 = DOMCache.get('Cal62');
  var docHTML = cal62 ? cal62.innerHTML : '';
  // 保存雷达图数据（Canvas 不能通过 HTML 保存，需单独序列化）
  var wuxingVals = ob._wuxingVals || (ob._congGeData && ob._congGeData.scores) || null;

  var record = {
    id: BaziArchives.genId(),
    savedAt: savedAt,
    name: Name_input.value || '未知',
    sex: Sex_input.value === '1' ? '男' : '女',
    sexLabel: Sex_input.value === '1' ? '乾造' : '坤造',
    yearPillar: ob.bz_jn,
    monthPillar: ob.bz_jy,
    dayPillar: ob.bz_jr,
    hourPillar: ob.bz_js,
    riGan: ob.bz_jr ? ob.bz_jr[0] : '',
    nayin0: ob._sz && ob._sz.ny ? ob._sz.ny[0] : '',
    // 完整分析文档
    documentHTML: docHTML,
    // 雷达图数据（用于档案阅览时重绘）
    wuxingVals: wuxingVals,
    // 堪舆师批注
    note: '',
    // 表单输入值（用于档案阅览时还原，确保大运流年 onclick 调用 ML_calc_ss 时读到正确数据）
    formInputs: {
      year: Cml_y ? Cml_y.value : '',
      month: Cml_m ? Cml_m.value : '',
      day: Cml_d ? Cml_d.value : '',
      hour: Cml_his ? Cml_his.value : '',
      calType: typeof gnlsel !== 'undefined' ? gnlsel.value : '0',
      lon: typeof Cp11_J !== 'undefined' ? Cp11_J.value : '',
      lat: typeof Cp11_W !== 'undefined' ? Cp11_W.value : '',
      tz: typeof Cn1 !== 'undefined' ? Cn1.value : '8'
    },
    // 大运/流年关键数据（ChangeLn 读取 _lastBaziOb._sz，必须在档案阅览时还原）
    szDyn: ob._sz && ob._sz.dyn ? ob._sz.dyn.slice() : null,
    szDy: ob._sz && ob._sz.dy ? ob._sz.dy.slice() : null,
    szDz: ob._sz && ob._sz.dz ? ob._sz.dz.slice() : null,
    szQnian: ob._sz ? ob._sz.qnian : 0,
    mgxh: window._lastMGxh || null,
    // 八字定格/喜用/从格分析所需完整数据快照（JSON 可序列化字段）
    obSnapshot: (function() {
      var s = {};
      // 四柱索引（determineXiyongshen 等需要）
      if (typeof ob.b1 !== 'undefined') s.b1 = ob.b1;
      if (typeof ob.b2 !== 'undefined') s.b2 = ob.b2;
      if (typeof ob.b3 !== 'undefined') s.b3 = ob.b3;
      if (typeof ob.b4 !== 'undefined') s.b4 = ob.b4;
      // 四柱干支
      s.bz_jn = ob.bz_jn || ''; s.bz_jy = ob.bz_jy || ''; s.bz_jr = ob.bz_jr || ''; s.bz_js = ob.bz_js || '';
      // 日期信息
      s.bz_jd = ob.bz_jd || 0; s.bzInfo2 = ob.bzInfo2 || ''; s.bzNyr = ob.bzNyr || ''; s.bzJQ = ob.bzJQ || '';
      s.bz_zty = ob.bz_zty || ''; s.bz_JS = ob.bz_JS || '';
      s._lunarMonth = ob._lunarMonth || ''; s._lunarDay = ob._lunarDay || ''; s._weekday = ob._weekday || '';
      // 格局数据
      s._px = ob._px || null;
      // 从格数据
      s._congGeData = ob._congGeData || null;
      // 五行力量
      s._wuxingVals = ob._wuxingVals || null;
      return s;
    })()
  };

  var list = BaziArchives.getAll();
  list.unshift(record);
  var maxArchives = license_getLimit('archive_max') || 50;
  if (list.length > maxArchives) list = list.slice(0, maxArchives);

  if (BaziArchives.saveAll(list)) {
    showToast('命盘已保存！' + record.name + ' · ' + record.sexLabel + ' '
      + record.yearPillar + '年 ' + record.monthPillar + '月 '
      + record.dayPillar + '日 ' + record.hourPillar + '时', 'success');
    // 刷新档案列表（如果面板已打开）
    _bzRenderList();
  }
}

/** 渲染档案列表 */
function _bzRenderList() {
  var listEl = DOMCache.get('baziArchiveList');
  if (!listEl) return;
  var list = BaziArchives.getAll();

  if (list.length === 0) {
    listEl.innerHTML = '<div class="bazi-archive-empty"><i class="ti ti-archive-off" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>暂无保存的命盘档案</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    html += '<div class="bazi-archive-item">' +
      '<div class="bazi-archive-item-info" onclick="viewBaziArchive(\'' + r.id + '\')">' +
        '<div class="bazi-archive-item-name">' + _bzEsc(r.name) + ' · ' + _bzEsc(r.sexLabel) + ' · 日主' + _bzEsc(r.riGan) + (r.note ? ' <span class="bazi-note-badge" title="有批注">📝</span>' : '') + '</div>' +
        '<div class="bazi-archive-item-pillars">' + _bzEsc(r.yearPillar) + '年 ' + _bzEsc(r.monthPillar) + '月 ' + _bzEsc(r.dayPillar) + '日 ' + _bzEsc(r.hourPillar) + '时</div>' +
        '<div class="bazi-archive-item-date">' + _bzEsc(r.nayin0) + ' · 保存于 ' + r.savedAt + '</div>' +
      '</div>' +
      '<div class="bazi-archive-item-actions">' +
        '<button class="bazi-archive-btn-load" onclick="event.stopPropagation();viewBaziArchive(\'' + r.id + '\')">阅览</button>' +
        '<button class="bazi-archive-btn-note" onclick="event.stopPropagation();editBaziNote(\'' + r.id + '\')">批注</button>' +
        '<button class="bazi-archive-btn-del" onclick="event.stopPropagation();deleteBaziArchive(\'' + r.id + '\')">删除</button>' +
      '</div>' +
    '</div>';
  }
  listEl.innerHTML = html;
}

/** 显示档案管理面板 */
function showBaziArchives() {
  var overlay = DOMCache.get('baziArchiveOverlay');
  if (!overlay) return;
  _bzRenderList();
  overlay.classList.add('show');
  overlay.onclick = function(e) { if (e.target === overlay) closeBaziArchives(); };
}

/** 关闭档案管理面板 */
function closeBaziArchives() {
  var overlay = DOMCache.get('baziArchiveOverlay');
  if (overlay) overlay.classList.remove('show');
}

/** 阅览已保存的命盘分析文档 */
function viewBaziArchive(id) {
  var list = BaziArchives.getAll();
  var record = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { record = list[i]; break; }
  }
  if (!record) { showToast('档案记录未找到', 'error'); return; }

  closeBaziArchives();

  // 还原表单输入值（确保档案中的大运/流年 onclick 调用 ML_calc_ss 时读到该命主的原始数据）
  if (record.formInputs) {
    var fi = record.formInputs;
    if (typeof Cml_y !== 'undefined' && Cml_y) Cml_y.value = fi.year || '';
    if (typeof Cml_m !== 'undefined' && Cml_m) Cml_m.value = fi.month || '';
    if (typeof Cml_d !== 'undefined' && Cml_d) Cml_d.value = fi.day || '';
    if (typeof Cml_his !== 'undefined' && Cml_his) Cml_his.value = fi.hour || '';
    if (typeof gnlsel !== 'undefined' && gnlsel) gnlsel.value = fi.calType || '0';
    if (typeof Cp11_J !== 'undefined' && Cp11_J) Cp11_J.value = fi.lon || '';
    if (typeof Cp11_W !== 'undefined' && Cp11_W) Cp11_W.value = fi.lat || '';
    if (typeof Cn1 !== 'undefined' && Cn1) Cn1.value = fi.tz || '8';
    if (typeof Name_input !== 'undefined' && Name_input) Name_input.value = record.name || '';
    if (typeof Sex_input !== 'undefined' && Sex_input) Sex_input.value = record.sex === '男' ? '1' : '0';
  }

  // 重建全局状态 _lastBaziOb（存档 HTML 中的 ChangeLn/ML_calc_ss 内联 onclick 依赖）
  // 优先通过静默重算; 回退到 obSnapshot
  if (record.formInputs) {
    try {
      var _bakHTML = record.documentHTML;
      ML_calc_ss(''); // 传空串(默认shishenx)，与 ML_calc 一致 → 同步 _lastBaziOb + _lastMGxh
      record.documentHTML = _bakHTML; // 恢复存档 HTML
    } catch(e) {
      // 静默重算失败→回退到快照还原
      if (record.szDyn && record.szDy && record.szDz) {
        var snap = record.obSnapshot || {};
        window._lastBaziOb = {
          b1: snap.b1, b2: snap.b2, b3: snap.b3, b4: snap.b4,
          bz_jn: snap.bz_jn || record.yearPillar || '',
          bz_jy: snap.bz_jy || record.monthPillar || '',
          bz_jr: snap.bz_jr || record.dayPillar || '',
          bz_js: snap.bz_js || record.hourPillar || '',
          bz_jd: snap.bz_jd || 0,
          bzInfo2: snap.bzInfo2 || '', bzNyr: snap.bzNyr || '', bzJQ: snap.bzJQ || '',
          bz_zty: snap.bz_zty || '', bz_JS: snap.bz_JS || '',
          _lunarMonth: snap._lunarMonth || '', _lunarDay: snap._lunarDay || '', _weekday: snap._weekday || '',
          _px: snap._px || null,
          _congGeData: snap._congGeData || null,
          _wuxingVals: snap._wuxingVals || null,
          _sz: { dyn: record.szDyn, dy: record.szDy, dz: record.szDz, qnian: record.szQnian || 0 }
        };
        window._lastMGxh = record.mgxh || null;
      }
    }
  }

  // 手动切换到八字页面（不用 showPage(1) 避免 ML_calc 覆盖渲染结果）
  closeFullDetail(true);
  _navPush({ id: 'bazi', label: '八字排盘·档案', restore: function() { backFromArchive(); } });
  if (typeof showHelp === 'function') showHelp(0);
  _highlightFab('tabBazi');
  _nianliMode = 0;
  var y0 = typeof Cal_y !== 'undefined' ? get_year_screen(Cal_y.value) : new Date().getFullYear();
  var m0 = typeof Cal_m !== 'undefined' ? (Cal_m.value - 0) : (new Date().getMonth() + 1);

  // 隐藏万年历、显示八字排盘区、隐藏信息卡片
  var wnlb = DOMCache.get('wnlb'); if (wnlb) wnlb.style.display = 'none';
  var bzppxt = DOMCache.get('bzppxt'); if (bzppxt) bzppxt.style.display = 'block';
  var infoCards = DOMCache.get('infoCards'); if (infoCards) infoCards.classList.add('page-hidden');
  // 档案阅览时隐藏整个基本信息卡片、显示返回键
  var _basicCard = document.querySelector('[data-card-id="bazi_basic"]'); if (_basicCard) _basicCard.style.display = 'none';
  var _backBtn = DOMCache.get('baziArchiveBack'); if (_backBtn) _backBtn.style.display = '';
  // 隐藏日历头部元素（节气栏、年月信息等）
  if (typeof _setCalHeaderVisible === 'function') _setCalHeaderVisible(false);
  // 隐藏日历浮层
  var pan = DOMCache.get('Cal_pan'); if (pan) pan.style.display = 'none';

  // 隐藏八字定格/喜用/从格面板
  var allPanel = DOMCache.get('baziAllResult');
  if (allPanel) allPanel.classList.remove('show');

  // 将保存的命盘文档渲染到八字结果区
  var cal62 = DOMCache.get('Cal62');
  if (cal62 && record.documentHTML) {
    cal62.innerHTML = record.documentHTML;
    // 如果有批注，插入到文档顶部
    if (record.note) {
      var noteDiv = document.createElement('div');
      noteDiv.className = 'bz-doc-note-card';
      noteDiv.innerHTML = '<div class="bz-doc-note-title"><i class="ti ti-pencil"></i> 堪舆师批注</div>' +
        '<div class="bz-doc-note-text">' + _bzEsc(record.note).replace(/\n/g, '<br>') + '</div>';
      cal62.insertBefore(noteDiv, cal62.firstChild);
    }
    // 初始化卡片折叠交互
    _initBaziCollapsibles(cal62);
    // 重绘雷达图（Canvas 需用保存的数据重新绘制）
    if (record.wuxingVals) {
      var radarOb = { _wuxingVals: record.wuxingVals };
      requestAnimationFrame(function() { _drawWuxingRadar(radarOb); });
    }
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (cal62) {
    cal62.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);"><i class="ti ti-alert-triangle" style="font-size:2rem;display:block;margin-bottom:8px;"></i>档案数据不完整，无法阅览</div>';
  }
}

/** 删除单条档案 */
function deleteBaziArchive(id) {
  showConfirm('确定要删除这条命盘档案吗？此操作不可恢复。', '删除确认').then(function(ok) {
    if (!ok) return;
    var list = BaziArchives.getAll();
    var newList = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) newList.push(list[i]);
    }
    if (BaziArchives.saveAll(newList)) _bzRenderList();
  });
}

/** 清空全部档案 */
function clearAllBaziArchives() {
  var list = BaziArchives.getAll();
  if (list.length === 0) return;
  showConfirm('确定要清空全部 ' + list.length + ' 条命盘档案吗？此操作不可恢复。', '清空确认').then(function(ok) {
    if (!ok) return;
    if (BaziArchives.saveAll([])) _bzRenderList();
  });
}

/** 批注功能 — 当前编辑的档案ID */
var _noteEditId = null;

/** 打开批注弹窗 */
function editBaziNote(id) {
  var list = BaziArchives.getAll();
  var record = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { record = list[i]; break; }
  }
  if (!record) { showToast('档案记录未找到', 'error'); return; }
  _noteEditId = id;
  var ta = DOMCache.get('baziNoteText');
  if (ta) ta.value = record.note || '';
  var overlay = DOMCache.get('baziNoteOverlay');
  if (overlay) overlay.classList.add('show');
}

/** 关闭批注弹窗 */
function closeBaziNote() {
  _noteEditId = null;
  var overlay = DOMCache.get('baziNoteOverlay');
  if (overlay) overlay.classList.remove('show');
}

/** 保存批注 */
function saveBaziNote() {
  if (!_noteEditId) return;
  var ta = DOMCache.get('baziNoteText');
  var text = ta ? ta.value.trim() : '';
  var list = BaziArchives.getAll();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === _noteEditId) {
      list[i].note = text;
      break;
    }
  }
  if (BaziArchives.saveAll(list)) {
    showToast('批注已保存', 'success');
    _bzRenderList();
  }
  closeBaziNote();
}

/** 打印八字命盘（A4标准版面） */
// ====== 八字喜用神推算系统 ======
// 月令→季节映射（用于调候）
// 地支索引0-11 → 季节: 0春 1夏 2秋 3冬
var _XYS_SEASON = [3,3,0,0,0,1,1,1,2,2,2,3]; // 子丑寅卯辰巳午未申酉戌亥

// 调候用神表: 日干索引 → 季节 → { tiaoHou: wuxingIndex, note: string }
var tiaoHouByPattern = {};
// 甲木
tiaoHouByPattern[0] = {};
tiaoHouByPattern[0][0] = { w:3, note:'春木旺盛，喜庚金修剪' };
tiaoHouByPattern[0][1] = { w:4, note:'夏木枯焦，喜壬水调候' };  // 夏→水
tiaoHouByPattern[0][2] = { w:1, note:'秋木凋零，喜丁火暖局' };  // 秋→火(actually 1=火, no: wuxing index: 0木1火2土3金4水)
tiaoHouByPattern[0][3] = { w:1, note:'冬木寒湿，喜丙火解冻' };  // 冬→火
// 乙木
tiaoHouByPattern[1] = {};
tiaoHouByPattern[1][0] = { w:3, note:'春木茂盛，喜辛金修剪' };
tiaoHouByPattern[1][1] = { w:4, note:'夏木干枯，喜癸水滋润' };
tiaoHouByPattern[1][2] = { w:1, note:'秋木凋落，喜丙火暖局' };
tiaoHouByPattern[1][3] = { w:1, note:'冬木僵硬，喜丙火暖局' };
// 丙火
tiaoHouByPattern[2] = {};
tiaoHouByPattern[2][0] = { w:4, note:'春火初生，喜壬水调济' };
tiaoHouByPattern[2][1] = { w:4, note:'夏火炎烈，喜壬水降温' };
tiaoHouByPattern[2][2] = { w:0, note:'秋火晦暗，喜甲木生扶' };
tiaoHouByPattern[2][3] = { w:0, note:'冬火微弱，喜甲木生扶' };
// 丁火
tiaoHouByPattern[3] = {};
tiaoHouByPattern[3][0] = { w:0, note:'春火微弱，喜甲木生扶' };
tiaoHouByPattern[3][1] = { w:4, note:'夏火过旺，喜癸水调候' };
tiaoHouByPattern[3][2] = { w:0, note:'秋火收敛，喜乙木生扶' };
tiaoHouByPattern[3][3] = { w:0, note:'冬火将熄，喜甲木救应' };
// 戊土
tiaoHouByPattern[4] = {};
tiaoHouByPattern[4][0] = { w:3, note:'春土疏松，喜庚金泄秀' };
tiaoHouByPattern[4][1] = { w:4, note:'夏土燥烈，喜壬水调候' };
tiaoHouByPattern[4][2] = { w:1, note:'秋土虚寒，喜丙火暖局' };
tiaoHouByPattern[4][3] = { w:1, note:'冬土冻结，喜丙火解冻' };
// 己土
tiaoHouByPattern[5] = {};
tiaoHouByPattern[5][0] = { w:1, note:'春土湿润，喜丙火暖局' };
tiaoHouByPattern[5][1] = { w:4, note:'夏土燥热，喜癸水调候' };
tiaoHouByPattern[5][2] = { w:1, note:'秋土湿寒，喜丙火暖局' };
tiaoHouByPattern[5][3] = { w:1, note:'冬土冻裂，喜丙火解冻' };
// 庚金
tiaoHouByPattern[6] = {};
tiaoHouByPattern[6][0] = { w:1, note:'春金顽钝，喜丁火煅造' };
tiaoHouByPattern[6][1] = { w:4, note:'夏金熔铸，喜壬水淬炼' };
tiaoHouByPattern[6][2] = { w:1, note:'秋金刚锐，喜丁火煅造' };
tiaoHouByPattern[6][3] = { w:1, note:'冬金寒脆，喜丙火暖局' };
// 辛金
tiaoHouByPattern[7] = {};
tiaoHouByPattern[7][0] = { w:1, note:'春金柔弱，喜丙火温暖' };
tiaoHouByPattern[7][1] = { w:4, note:'夏金融化，喜壬水淬炼' };
tiaoHouByPattern[7][2] = { w:1, note:'秋金清冷，喜丙火暖局' };
tiaoHouByPattern[7][3] = { w:1, note:'冬金寒凝，喜丙火暖局' };
// 壬水
tiaoHouByPattern[8] = {};
tiaoHouByPattern[8][0] = { w:2, note:'春水泛滥，喜戊土制水' };
tiaoHouByPattern[8][1] = { w:3, note:'夏水枯竭，喜申金发源' };
tiaoHouByPattern[8][2] = { w:2, note:'秋水通源，喜戊土制水' };
tiaoHouByPattern[8][3] = { w:1, note:'冬水寒凝，喜丙火暖局' };
// 癸水
tiaoHouByPattern[9] = {};
tiaoHouByPattern[9][0] = { w:3, note:'春水柔弱，喜庚金发源' };
tiaoHouByPattern[9][1] = { w:3, note:'夏水干涸，喜辛金发源' };
tiaoHouByPattern[9][2] = { w:1, note:'秋水清冷，喜丙火暖局' };
tiaoHouByPattern[9][3] = { w:1, note:'冬水冰寒，喜丙火暖局' };

// 通关五行表（克方五行 → 受克方五行 → 通关五行索引）
var _XYS_TONGGUAN = {
  '3,0': 4, // 金克木→水
  '0,2': 1, // 木克土→火
  '2,4': 3, // 土克水→金
  '4,1': 0, // 水克火→木
  '1,3': 2  // 火克金→土
};

// ══════════════════════════════════════════════
//  喜用神确定 — 格局驱动的完整子平术五神体系
//  参照规范 §4 喜用神确定算法
// ══════════════════════════════════════════════
// 各格局的喜用五行配置 — 参照规范 §4.1 / §4.2
// 值为五行索引数组：[用神五行, 喜神五行列表, 忌神五行列表, 仇神五行列表]
// 注意：五行索引 0=木 1=火 2=土 3=金 4=水
// 五行关系公式（已验证）：
//   同我 = riWx,  我生 = (riWx+1)%5,  我克 = (riWx+2)%5
//   克我 = (riWx+3)%5,  生我 = (riWx+4)%5
var _DXY_RULES = {};
// 正官格（顺用）: 《子平真诠》卷五"论正官":"正官为用，须财以生之，印以护之"
//   用神=财(我克)生官，喜神=印(生我)护官，忌神=伤官(我生)克官
_DXY_RULES['正官格'] = function(riWx) {
  return {
    yongWx: [(riWx+2)%5],       // 财生官（《子平真诠》）
    xiWx: [(riWx+4)%5],         // 印护官
    jiWx: [(riWx+1)%5],         // 伤官克官
    chouWx: [riWx]              // 比劫
  };
};
// 七杀格（逆用）: 用=我生(食), 喜=我生(食)+生我(印), 忌=我克(财滋杀)
_DXY_RULES['七杀格'] = function(riWx) {
  // 七杀格逆用：用=食神制杀，喜=食神+印化杀，忌=财生杀，仇=官混杀
  return {
    yongWx: [(riWx+1)%5],
    xiWx: [(riWx+1)%5, (riWx+4)%5],
    jiWx: [(riWx+2)%5],
    chouWx: [(riWx+3)%5]
  };
};
// 正财格（顺用）: 《子平真诠》卷五"论正财":"正财为用，喜食神以生之，官星以护之"
//   用神=食神(我生)生财，喜神=正官(克我)护财，忌神=比劫(同我)夺财
_DXY_RULES['正财格'] = function(riWx) {
  return {
    yongWx: [(riWx+1)%5],       // 食神生财（《子平真诠》）
    xiWx: [(riWx+3)%5],         // 官护财
    jiWx: [riWx],               // 比劫夺财
    chouWx: [(riWx+4)%5]        // 印
  };
};
// 偏财格（顺用）: 同正财
_DXY_RULES['偏财格'] = _DXY_RULES['正财格'];
// 正印格（顺用）: 《子平真诠》卷五"论正印":"正印为用，喜官星以生之"
//   用神=正官(克我)生印，喜神=比劫(同我)助身，忌神=正财(我克)坏印
_DXY_RULES['正印格'] = function(riWx) {
  return {
    yongWx: [(riWx+3)%5],       // 官生印（《子平真诠》）
    xiWx: [riWx],               // 比劫助身
    jiWx: [(riWx+2)%5],         // 财坏印
    chouWx: [(riWx+1)%5]        // 食伤
  };
};
// 偏印格（逆用）: 用=我生(食)+我克(财), 喜=我生(食)+我克(财), 忌=生我(正印混枭)
_DXY_RULES['偏印格'] = function(riWx) {
  return {
    yongWx: [(riWx+1)%5, (riWx+2)%5],
    xiWx: [(riWx+1)%5, (riWx+2)%5],
    jiWx: [(riWx+4)%5],
    chouWx: [(riWx+3)%5]
  };
};
// 食神格（顺用）: 用=我生(食), 喜=我克(财)+克我(杀食制), 忌=生我(枭夺食)
_DXY_RULES['食神格'] = function(riWx) {
  // 食神格顺用：用=食神，喜=财护食，忌=印夺食，仇=官杀破格
  return {
    yongWx: [(riWx+1)%5],
    xiWx: [(riWx+2)%5],
    jiWx: [(riWx+4)%5],
    chouWx: [(riWx+3)%5]
  };
};
// 伤官格（逆用）: 用=生我(印)+我克(财), 喜=生我(印)+我克(财), 忌=克我(正官)
_DXY_RULES['伤官格'] = function(riWx) {
  // 伤官格逆用：用=印制伤+财化伤，喜=同用神，忌=正官，仇=比劫生扶伤官
  return {
    yongWx: [(riWx+4)%5, (riWx+2)%5],
    xiWx: [(riWx+4)%5, (riWx+2)%5],
    jiWx: [(riWx+3)%5],
    chouWx: [riWx]
  };
};
// 建禄格: 《子平真诠》卷五"论建禄月劫":"建禄格，喜财官"
//   用神=官(克我)优先制比劫 + 财(我克)辅之，忌=比劫+印
_DXY_RULES['建禄格'] = function(riWx) {
  return {
    yongWx: [(riWx+3)%5, (riWx+2)%5],  // 官优先+财（《子平真诠》）
    xiWx: [(riWx+3)%5, (riWx+2)%5],
    jiWx: [riWx, (riWx+4)%5],
    chouWx: [riWx]
  };
};
// 月劫格: 用=克我(官杀)+我生(食伤), 喜=同上, 忌=同我(比劫)+生我(印)
_DXY_RULES['月劫格'] = function(riWx) {
  return {
    yongWx: [(riWx+3)%5, (riWx+1)%5],
    xiWx: [(riWx+3)%5, (riWx+1)%5],
    jiWx: [riWx, (riWx+4)%5],
    chouWx: [riWx]
  };
};

// 从格喜用配置 — 参照规范 §4.2
var _DXY_CONG_RULES = {};
_DXY_CONG_RULES['从财格'] = function(riWx) {
  // 从财: 用=我克(财), 喜=我生(食伤)+克我(官杀), 忌=生我(印)+同我(比劫)
  return { yongWx: [(riWx+2)%5], xiWx: [(riWx+1)%5, (riWx+3)%5], jiWx: [(riWx+4)%5, riWx], chouWx: [] };
};
_DXY_CONG_RULES['从官格'] = _DXY_CONG_RULES['从官杀格'] = function(riWx) {
  // 从官: 用=克我(官杀), 喜=我克(财), 忌=我生(食伤)+生我(印)
  return { yongWx: [(riWx+3)%5], xiWx: [(riWx+2)%5], jiWx: [(riWx+1)%5, (riWx+4)%5], chouWx: [] };
};
_DXY_CONG_RULES['从儿格'] = function(riWx) {
  // 从儿: 用=我生(食伤), 喜=我克(财), 忌=生我(印)+同我(比劫)
  return { yongWx: [(riWx+1)%5], xiWx: [(riWx+2)%5], jiWx: [(riWx+4)%5, riWx], chouWx: [] };
};
_DXY_CONG_RULES['从势格'] = function(riWx) {
  // 从势: 用=我克(财), 喜=克我(官)+我生(食), 忌=生我(印)+同我(比劫)
  return { yongWx: [(riWx+2)%5], xiWx: [(riWx+3)%5, (riWx+1)%5], jiWx: [(riWx+4)%5, riWx], chouWx: [] };
};
// 从旺五格
_DXY_CONG_RULES['曲直格'] = function() { return { yongWx:[0], xiWx:[4,0], jiWx:[3], chouWx:[] }; };
_DXY_CONG_RULES['炎上格'] = function() { return { yongWx:[1], xiWx:[0,1], jiWx:[4], chouWx:[] }; };
_DXY_CONG_RULES['稼穑格'] = function() { return { yongWx:[2], xiWx:[1,2], jiWx:[0], chouWx:[] }; };
_DXY_CONG_RULES['从革格'] = function() { return { yongWx:[3], xiWx:[2,3], jiWx:[1], chouWx:[] }; };
_DXY_CONG_RULES['润下格'] = function() { return { yongWx:[4], xiWx:[3,4], jiWx:[2], chouWx:[] }; };

// ====== 四柱动态详断引擎（2026-06-16）======
// 替代原有的 Bz.jzdc/Bz.shery/Bz.nlsrd/Bz.csscd 硬编码内容
// 基于八字排盘实际计算结果动态生成四柱解读

// 提取喜用五行列表（复用 determineXiyongshen 的格局驱动逻辑）
function _getXiyongWx(ob) {
  var dayStem = ob.b3 % 10;
  var riWx = dayStem >> 1;
  var monthBranch = ob.b2 % 12;
  var yongWxList = [], xiWxList = [], jiWxList = [], geName = ob._geName || '';

  try {
    var congData = (typeof _getCongGeData === 'function') ? _getCongGeData(ob) : (ob._congGeData || null);

    if (congData && congData.congType && congData.congType.indexOf('从') === 0) {
      // 从格 — 直接使用缓存的格局名
      geName = ob._geName || congData.congType;
      yongWxList = (typeof congData.congShenWx === 'number' && congData.congShenWx >= 0)
        ? [congData.congShenWx] : (congData.luckyWx && congData.luckyWx.length > 0 ? [congData.luckyWx[0]] : []);
      xiWxList = [];
      for (var lw = 0; lw < (congData.luckyWx || []).length; lw++) {
        if (congData.luckyWx[lw] !== yongWxList[0]) xiWxList.push(congData.luckyWx[lw]);
      }
      jiWxList = congData.unluckyWx || [];
    } else {
      // 正格 — 优先使用缓存的格局名
      if (!geName) {
        var benQiIdx = (_DG_GAN && _DG_BENQI) ? _DG_GAN[_DG_BENQI[monthBranch]] : (monthBranch * 2 % 10);
        if (typeof _dinggeGetSiLing === 'function' && typeof _dinggeCheckTouGan === 'function') {
          var sl = _dinggeGetSiLing(ob);
          var slGanIdx = _DG_GAN[sl.slGan];
          var slSS = Lunar.sshen(ob.b3, slGanIdx);
          var touGan = _dinggeCheckTouGan(ob, sl.slGan);
          var effSS = touGan.length > 0 ? slSS : Lunar.sshen(ob.b3, benQiIdx);
          var geInfo = _DG_GEMAP && _DG_GEMAP[effSS];
          geName = geInfo ? geInfo[0] : effSS + '格';
        } else {
          var benQiSS = Lunar.sshen(ob.b3, benQiIdx);
          var geInfo2 = _DG_GEMAP && _DG_GEMAP[benQiSS];
          geName = geInfo2 ? geInfo2[0] : benQiSS + '格';
        }
      }

      if (_DXY_RULES && _DXY_RULES[geName]) {
        var dxy = _DXY_RULES[geName](riWx);
        yongWxList = dxy.yongWx; xiWxList = dxy.xiWx; jiWxList = dxy.jiWx;
      }
    }
  } catch(e) {
    // 降级：返回空喜用，各渲染函数自行处理
    geName = '(格局分析暂不可用)';
  }

  // 合并用神+喜神为"喜用"集合
  var xySet = {};
  for (var i = 0; i < yongWxList.length; i++) xySet[yongWxList[i]] = 'yong';
  for (var i = 0; i < xiWxList.length; i++) { if (!xySet[xiWxList[i]]) xySet[xiWxList[i]] = 'xi'; }
  for (var i = 0; i < jiWxList.length; i++) { if (!xySet[jiWxList[i]]) xySet[jiWxList[i]] = 'ji'; }

  return { yongWx: yongWxList, xiWx: xiWxList, jiWx: jiWxList, xySet: xySet, geName: geName };
}

// 判断某干支五行是否在喜用集合中
function _wxInSet(wxIdx, xySet) {
  return xySet[wxIdx] === 'yong' ? '用神' : xySet[wxIdx] === 'xi' ? '喜神' : xySet[wxIdx] === 'ji' ? '忌神' : '';
}

// 藏干转十神列表（用于解读）
function _cgToSS(cangGan, riGanIdx) {
  var parts = [];
  for (var i = 0; i < cangGan.length; i++) {
    var gIdx = _DG_GAN[cangGan.charAt(i)];
    if (gIdx !== undefined) parts.push(Lunar.Gan[gIdx] + '(' + Lunar.sshen(riGanIdx, gIdx) + ')');
  }
  return parts;
}

// ── 年柱断：祖上与早年基调 ──
function _renderNianZhu(ob, xy) {
  var yGan = ob.b1 % 10, yZhi = ob.b1 % 12;
  var yGanWx = yGan >> 1, yZhiWx = (_DG_GAN[_DG_BENQI[yZhi]] || 0) >> 1;
  var ySS = Lunar.sshen(ob.b3, yGan);
  var cgParts = _cgToSS(Lunar.CangGan[yZhi], ob.b3);
  var cgStr = cgParts.join('、');
  var yGanTag = _wxInSet(yGanWx, xy.xySet);
  var yZhiTag = _wxInSet(yZhiWx, xy.xySet);

  var html = '<div class="bz-pillar-item"><strong>年柱（' + ob.bz_jn + '）·祖上基调</strong>';
  html += '年干' + Lunar.Gan[yGan] + '为<span class="bz-dingge-gold">' + ySS + '</span>，';
  html += '坐' + Lunar.Zhi[yZhi] + '（藏：' + cgStr + '）。';

  // 祖上判断
  if (yGanTag === '忌神' || yZhiTag === '忌神') {
    html += '年柱为忌，早年家境普通或祖业有损';
  } else if (yGanTag === '用神' || yZhiTag === '用神' || yGanTag === '喜神' || yZhiTag === '喜神') {
    html += '年柱为喜用，祖上根基扎实，早年得荫庇';
  } else {
    html += '年柱平淡，祖上无大起落，早年按部就班';
  }

  // 年干十神含义
  if (ySS === '正官' || ySS === '七杀') html += '，长辈中有公职或管理背景';
  if (ySS === '正印' || ySS === '偏印') html += '，祖辈重文教，家学有渊源';
  if (ySS === '正财' || ySS === '偏财') html += '，祖上从商或家境殷实';
  if (ySS === '比肩' || ySS === '劫财') html += '，祖业易散，白手起家之象';
  if (ySS === '食神' || ySS === '伤官') html += '，长辈有技艺或自由职业背景';

  html += '。16岁前运势' + (yGanTag === '忌神' ? '多波动，宜静不宜动' : '平顺，根基稳固') + '。</div>';
  return html;
}

// ── 月柱断：性格内核与事业方向 ──
function _renderYueZhu(ob, xy) {
  var mGan = ob.b2 % 10, mZhi = ob.b2 % 12;
  var mGanWx = mGan >> 1, mZhiWx = (_DG_GAN[_DG_BENQI[mZhi]] || 0) >> 1;
  var mSS = Lunar.sshen(ob.b3, mGan);
  var benQi = _DG_BENQI[mZhi];
  var benQiSS = Lunar.sshen(ob.b3, _DG_GAN[benQi]);
  var mGanTag = _wxInSet(mGanWx, xy.xySet);
  var mZhiTag = _wxInSet(mZhiWx, xy.xySet);
  var monthNames = ['','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];

  var html = '<div class="bz-pillar-item"><strong>月柱（' + ob.bz_jy + '）·事业内核</strong>';
  html += monthNames[mZhi] + '月' + benQi + '为<span class="bz-dingge-gold">' + benQiSS + '</span>当令';

  if (mGan !== (_DG_GAN[benQi] || 0)) {
    html += '，' + Lunar.Gan[mGan] + '（' + mSS + '）透干';
  }

  html += '。格局：<span class="bz-dingge-geju" style="display:inline;font-size:13px;">' + xy.geName + '</span>。';

  // 性格判断
  if (benQiSS === '正官' || benQiSS === '七杀') html += '为人自律重规则，适合公职、管理、军警等结构化职业。';
  else if (benQiSS === '正财' || benQiSS === '偏财') html += '为人务实重利，善于商业策划或技术变现。';
  else if (benQiSS === '正印' || benQiSS === '偏印') html += '性格内敛善思，适合文教、研究、学术等知识型事业。';
  else if (benQiSS === '食神' || benQiSS === '伤官') html += '才华横溢，不拘一格，适合艺术、设计、自由职业等创意型工作。';
  else if (benQiSS === '比肩' || benQiSS === '劫财') html += '独立自主，竞争意识强，适合创业、竞技、体育等领域。';

  // 月柱喜忌
  var isXY = (mGanTag === '用神' || mGanTag === '喜神' || mZhiTag === '用神' || mZhiTag === '喜神');
  var isJi = (mGanTag === '忌神' || mZhiTag === '忌神');
  if (isXY) {
    html += '月柱为喜用，青年时期（17-32岁）事业根基稳固，贵人运佳。';
  } else if (isJi) {
    html += '月柱为忌，青年时期多劳少获，需加倍努力方能立足。';
  } else {
    html += '月柱喜忌参半，青年时期机遇与挑战并存。';
  }

  // 事业宫刑冲合害分析
  var mRels = _pillarRelations(ob, 1);
  if (mRels.hui.length > 0) {
    html += '◆ 月支参与三会局（' + mRels.hui[0].detail + '），事业格局宏大，易得团队/行业之势。';
  }
  if (mRels.sanhe.length > 0) {
    html += '◎ 月支参与三合局（' + mRels.sanhe[0].detail + '），事业有贵人/同盟助力，合作共赢。';
  }
  if (mRels.banhe.length > 0) {
    for (var bi = 0; bi < Math.min(mRels.banhe.length, 2); bi++) {
      html += '△ 月支' + mRels.banhe[bi].type + '（' + mRels.banhe[bi].detail + '），有潜在合作机会待开发。';
    }
  }
  for (var ci = 0; ci < mRels.chong.length; ci++) {
    if (mRels.chong[ci].type === '地支六冲') {
      html += '⚠ 月支逢冲（' + mRels.chong[ci].detail + '），事业环境多变、岗位/方向可能频繁调整。';
    }
  }
  for (var xi = 0; xi < mRels.xing.length; xi++) {
    html += '⚠ 月支逢刑（' + mRels.xing[xi].detail + '），职场需防口舌是非、合同纠纷或权力争斗。';
  }
  if (mRels.zhenghe.length > 0) {
    html += '⚠ 月柱逢争合（' + mRels.zhenghe[0].detail + '），事业选择上面临多方角力，需明确主次。';
  }
  html += '</div>';
  return html;
}

// ── 日柱断：自我意识与婚姻宫状态 ──
function _renderRiZhu(ob, xy) {
  var dGan = ob.b3 % 10, dZhi = ob.b3 % 12;
  var dGanWx = dGan >> 1;
  var riZhiSS = Lunar.sshen(ob.b3, (_DG_GAN && _DG_BENQI ? (_DG_GAN[_DG_BENQI[dZhi]] || 0) : 0));
  var strength = 50;
  try {
    var congData = (typeof _getCongGeData === 'function') ? _getCongGeData(ob) : (ob._congGeData || null);
    strength = (congData && typeof congData.shengZhuPct === 'number') ? congData.shengZhuPct : 50;
  } catch(e) { strength = 50; }

  // 强弱判断
  var qiangRuo = strength >= 80 ? '极强' : strength >= 60 ? '偏强' : strength >= 40 ? '中和' : strength >= 20 ? '偏弱' : '极弱';

  var html = '<div class="bz-pillar-item"><strong>日柱（' + ob.bz_jr + '）·自我与婚姻</strong>';
  html += '日主' + Lunar.Gan[dGan] + '（' + qiangRuo + '，生助' + strength.toFixed(0) + '%），';
  html += '坐' + Lunar.Zhi[dZhi] + '为<span class="bz-dingge-gold">' + riZhiSS + '</span>。';

  // 婚姻宫
  if (riZhiSS === '正财' || riZhiSS === '偏财') {
    html += '配偶务实重利，' + (riZhiSS === '正财' ? '勤俭持家' : '慷慨大方') + '，对日主事业有经济助力。';
  } else if (riZhiSS === '正官' || riZhiSS === '七杀') {
    html += '配偶能力强、有管理才能或公职背景，' + (riZhiSS === '正官' ? '关系和谐互敬' : '关系中带有约束感') + '。';
  } else if (riZhiSS === '正印' || riZhiSS === '偏印') {
    html += '配偶如师如母，体贴照顾，但' + (riZhiSS === '偏印' ? '偶有疏离感' : '关系温馨稳定') + '。';
  } else if (riZhiSS === '食神' || riZhiSS === '伤官') {
    html += '配偶有才艺或浪漫气质，' + (riZhiSS === '伤官' ? '需注意言语摩擦' : '关系轻松愉快') + '。';
  } else {
    html += '配偶与日主同气，如战友般并肩奋斗，但需注意财务共担问题。';
  }

  // 刑冲合害全面分析（据 bazi_core 15种底层关系引擎）
  var rels = _pillarRelations(ob, 2); // 日柱(2)与其他柱的关系
  // 伏吟
  var mZhi2 = ob.b2 % 12, sZhi2 = ob.b4 % 12;
  if (dZhi === mZhi2) html += '日支与月支伏吟，感情易倦怠、需新鲜感维系。';
  if (dZhi === sZhi2) html += '日时同支，晚年与配偶关系紧密、白头偕老之象。';

  // 六冲 → 婚姻波动
  for (var ri = 0; ri < rels.chong.length; ri++) {
    var rc = rels.chong[ri];
    if (rc.type === '地支六冲') {
      html += '⚠ 日支与' + rc.with + '支六冲（' + rc.detail + '），';
      if (rc.with === '月') html += '青年到中年婚姻易有波动、聚少离多。';
      else if (rc.with === '时') html += '晚年婚姻或与子女关系需用心调和。';
      else html += '早年家庭关系紧张、或祖上根基不稳波及婚姻。';
    }
  }

  // 六害 → 暗伤
  for (var ri2 = 0; ri2 < rels.hai.length; ri2++) {
    var rh = rels.hai[ri2];
    html += '⚠ 日支与' + rh.with + '支相害（' + rh.detail + '），婚姻中易有隐性问题、误会累积，需坦诚沟通。';
  }

  // 相刑 → 矛盾
  for (var ri3 = 0; ri3 < rels.xing.length; ri3++) {
    var rx = rels.xing[ri3];
    html += '⚠ 日支与' + rx.with + '支' + rx.type + '（' + rx.detail + '），婚姻中需防口舌纷争、外部压力或法律纠纷波及感情。';
  }

  // 合 → 助力
  for (var ri4 = 0; ri4 < rels.he.length; ri4++) {
    var rHe = rels.he[ri4];
    if (rHe.type === '地支六合') {
      html += '✓ 日支与' + rHe.with + '支六合（' + rHe.detail + '），婚姻宫得' + rHe.with + '柱合助，感情基础深厚。';
    } else if (rHe.type === '天干合') {
      html += '✓ 日主与' + rHe.with + '干相合（' + rHe.detail + '），夫妻/合作伙伴缘分深厚。';
    }
  }

  // 半合/三合 → 资源整合
  for (var ri5 = 0; ri5 < rels.banhe.length; ri5++) {
    var rb = rels.banhe[ri5];
    html += '△ 日支与' + rb.with + '支' + rb.type + '（' + rb.detail + '），婚姻中有第三方助力或资源共享。';
  }
  if (rels.sanhe.length > 0) {
    for (var ri6 = 0; ri6 < rels.sanhe.length; ri6++) {
      html += '◎ 日支参与三合局（' + rels.sanhe[ri6].detail + '），婚姻宫格局宏大，配偶助力显著。';
    }
  }
  if (rels.hui.length > 0) {
    for (var ri7 = 0; ri7 < rels.hui.length; ri7++) {
      html += '◆ 日支参与三会局（' + rels.hui[ri7].detail + '），婚姻宫气势磅礴，配偶家世或能力出众。';
    }
  }

  // 暗合 → 隐性关系
  for (var ri8 = 0; ri8 < rels.anhe.length; ri8++) {
    html += '◇ 日支与' + rels.anhe[ri8].with + '支暗合（' + rels.anhe[ri8].detail + '），需注意隐性桃花或不被外界所知的情感纠葛。';
  }

  // 破/绝 → 隐患
  for (var ri9 = 0; ri9 < rels.po.length; ri9++) {
    html += '⚠ 日支与' + rels.po[ri9].with + '支相破（' + rels.po[ri9].detail + '），小事易引发矛盾，需包容理解。';
  }
  for (var ri10 = 0; ri10 < rels.jue.length; ri10++) {
    html += '⚠ 日支与' + rels.jue[ri10].with + '支相绝（' + rels.jue[ri10].detail + '），某些阶段感情可能陷入绝境，需坚定信念。';
  }
  html += '</div>';
  return html;
}

// ── 时柱断：晚年归宿与子女/下属缘 ──
function _renderShiZhu(ob, xy) {
  var sGan = ob.b4 % 10, sZhi = ob.b4 % 12;
  var sGanWx = sGan >> 1, sZhiWx = (_DG_GAN[_DG_BENQI[sZhi]] || 0) >> 1;
  var sSS = Lunar.sshen(ob.b3, sGan);
  var sGanTag = _wxInSet(sGanWx, xy.xySet);
  var sZhiTag = _wxInSet(sZhiWx, xy.xySet);
  var isXY = (sGanTag === '用神' || sGanTag === '喜神' || sZhiTag === '用神' || sZhiTag === '喜神');
  var isJi = (sGanTag === '忌神' || sZhiTag === '忌神');

  // 检查戊癸合、丁壬合等日时干合
  var ganHePairs = { '甲己':true,'乙庚':true,'丙辛':true,'丁壬':true,'戊癸':true };
  var rGanChar = Lunar.Gan[ob.b3 % 10], sGanChar = Lunar.Gan[sGan];
  var heKey1 = rGanChar + sGanChar, heKey2 = sGanChar + rGanChar;
  var hasHe = ganHePairs[heKey1] || ganHePairs[heKey2];

  var html = '<div class="bz-pillar-item"><strong>时柱（' + ob.bz_js + '）·晚景归宿</strong>';
  html += '时干' + Lunar.Gan[sGan] + '为<span class="bz-dingge-gold">' + sSS + '</span>';

  if (hasHe) {
    html += '，与日主' + rGanChar + '相合（' + (heKey1 in ganHePairs ? heKey1 : heKey2) + '合），';
    html += '晚年有贵人合身，事业圆满或得贤孝子女';
  }

  html += '，坐' + Lunar.Zhi[sZhi] + '。';

  // 子女/下属判断
  if (sSS === '食神' || sSS === '伤官') html += '子女聪慧有才艺，但' + (sSS === '伤官' ? '管教需耐心' : '关系融洽如朋友') + '。';
  else if (sSS === '正官' || sSS === '七杀') html += '子女自律有成，' + (sSS === '七杀' ? '性格刚强独立' : '品行端正守规矩') + '。晚辈/下属中有得力干将。';
  else if (sSS === '正印' || sSS === '偏印') html += '晚年好静好学，与晚辈关系如师友。';
  else if (sSS === '正财' || sSS === '偏财') html += '子女务实有经济头脑，晚年物质无忧。';
  else html += '子女与己性格相似，相处如手足。';

  // 时柱喜忌
  if (isXY) {
    html += '时柱纯喜用，晚景优渥，事业善终，子女贤孝且具能力。';
  } else if (isJi) {
    html += '时柱为忌，晚年需注意健康与财务规划，子女助力有限。';
  } else {
    html += '晚年运势平稳，有得有失，知足常乐。';
  }
  html += '</div>';
  return html;
}

// ── 调候诊断：寒暖燥湿分析（据《穷通宝鉴》简化表）──
function _renderTiaoHou(ob) {
  var dayStem = ob.b3 % 10;
  var monthBranch = ob.b2 % 12;
  var seasonIdx = _XYS_SEASON[monthBranch];
  var seasonNames = ['春','夏','秋','冬'];
  var thInfo = tiaoHouByPattern[dayStem] && tiaoHouByPattern[dayStem][seasonIdx]
    ? tiaoHouByPattern[dayStem][seasonIdx] : null;
  if (!thInfo) return '';

  var needWx = thInfo.w; // 需要的调候五行
  var WXJ = Lunar.WuXingJ;

  // 检查原局是否有调候五行
  var stems = [ob.b1%10, ob.b2%10, ob.b3%10, ob.b4%10];
  var branches = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
  var hasTH = false, thCount = 0;
  for (var i = 0; i < 4; i++) {
    if ((stems[i] >> 1) === needWx) { hasTH = true; thCount++; }
    var cg = Lunar.CangGan[branches[i]];
    for (var j = 0; j < cg.length; j++) {
      var gIdx = _DG_GAN[cg.charAt(j)];
      if (gIdx !== undefined && (gIdx >> 1) === needWx) { hasTH = true; thCount++; }
    }
  }

  // 判断寒暖燥湿程度
  var fireCount = 0, waterCount = 0, metalCount = 0, woodCount = 0, earthCount = 0;
  for (var i = 0; i < 4; i++) {
    var sw = stems[i] >> 1;
    if (sw === 0) woodCount++; else if (sw === 1) fireCount++; else if (sw === 2) earthCount++;
    else if (sw === 3) metalCount++; else waterCount++;
    var bw = (_DG_GAN[_DG_BENQI[branches[i]]] || 0) >> 1;
    if (bw === 0) woodCount++; else if (bw === 1) fireCount++; else if (bw === 2) earthCount++;
    else if (bw === 3) metalCount++; else waterCount++;
  }

  var isDry = (seasonIdx === 1 || fireCount >= 4 || (fireCount >= 3 && waterCount === 0));
  var isCold = (seasonIdx === 3 || waterCount >= 4 || (waterCount >= 3 && fireCount === 0));
  var isDamp = (seasonIdx === 0 && waterCount >= 3);
  var isHotDry = (earthCount >= 4 && fireCount >= 3);

  var html = '<div class="bz-pillar-item" style="border-left:3px solid #5D8A7C;padding-left:8px;margin-top:6px;"><strong>🌡 调候诊断</strong><br>';
  html += '日主' + Lunar.Gan[dayStem] + '生' + seasonNames[seasonIdx] + '季';

  if (isDry) html += '，火炎土燥';
  else if (isCold) html += '，水冷金寒';
  else if (isDamp) html += '，春寒湿重';
  else if (isHotDry) html += '，燥土成势';
  else html += '，气候中和';

  html += '。《穷通宝鉴》调候指引：' + thInfo.note + '。';

  if (hasTH) {
    html += '原局' + (thCount >= 2 ? '充足' : '有') + WXJ[needWx] + '调候，' + (thCount >= 2 ? '寒暖燥湿基本平衡，身心较舒泰。' : '调候力量稍显不足，行' + WXJ[needWx] + '运时更佳。');
  } else {
    html += '<span style="color:#C41E0A;">原局缺' + WXJ[needWx] + '调候</span>，虽格局有成就，但身心隐忧不可忽视。行' + WXJ[needWx] + '运时身心更舒泰。';
    if (isDry) html += '纯火土运虽利事业，但易焦虑、皮肤干燥、睡眠不佳。';
    if (isCold) html += '纯水运虽有利有弊，但需注意关节、循环系统保养。';
    if (isHotDry) html += '土重埋金，需留意消化系统与代谢问题。';
  }
  html += '</div>';
  return html;
}

// ── 流通诊断：五行相生链检测 ──
function _renderLiuTong(ob) {
  // 收集全柱五行序列（天干→地支本气，按年→月→日→时顺序）
  var stems = [ob.b1%10, ob.b2%10, ob.b3%10, ob.b4%10];
  var branches = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
  var seq = []; // [{wx, pos}, ...]
  var posNames = ['年干','年支','月干','月支','日干','日支','时干','时支'];
  for (var i = 0; i < 4; i++) {
    seq.push({ wx: stems[i] >> 1, pos: posNames[i*2] });
    seq.push({ wx: (_DG_GAN[_DG_BENQI[branches[i]]] || stems[i]) >> 1, pos: posNames[i*2+1] });
  }

  // 检测连续相生链（木0→火1→土2→金3→水4→木0...）
  function nextWx(w) { return (w + 1) % 5; }
  var chains = [];
  var curChain = [seq[0]];
  for (var i = 1; i < seq.length; i++) {
    var prevWx = curChain[curChain.length - 1].wx;
    var curWx = seq[i].wx;
    if (curWx === nextWx(prevWx)) {
      curChain.push(seq[i]);
    } else {
      if (curChain.length >= 2) chains.push(curChain);
      curChain = [seq[i]];
    }
  }
  if (curChain.length >= 2) chains.push(curChain);

  // 统计全局五行
  var wxCount = [0,0,0,0,0];
  for (var i = 0; i < seq.length; i++) wxCount[seq[i].wx]++;
  var missing = [];
  var WXJ = Lunar.WuXingJ;
  for (var i = 0; i < 5; i++) { if (wxCount[i] === 0) missing.push(i); }

  var html = '<div class="bz-pillar-item" style="border-left:3px solid #8B6914;padding-left:8px;margin-top:6px;"><strong>🔄 流通诊断</strong><br>';

  if (chains.length === 0) {
    html += '全局五行各自孤立，无明显连续相生链。';
  } else {
    // 找最长链
    var longest = chains[0];
    for (var i = 1; i < chains.length; i++) {
      if (chains[i].length > longest.length) longest = chains[i];
    }
    html += '发现' + chains.length + '条相生链' + (chains.length > 1 ? '，' : '。');
    if (chains.length > 1) {
      for (var i = 0; i < Math.min(chains.length, 3); i++) {
        var c = chains[i];
        html += c.map(function(x){return WXJ[x.wx]}).join('→') + '（' + c[0].pos + '→' + c[c.length-1].pos + '）';
        if (i < Math.min(chains.length, 3) - 1) html += '；';
      }
      html += '。';
    } else {
      html += '最长链：' + longest.map(function(x){return WXJ[x.wx]}).join('→') + '（' + longest[0].pos + '→' + longest[longest.length-1].pos + '）。';
    }
  }

  // 全局流通评价
  var totalWx = 0;
  for (var i = 0; i < 5; i++) { if (wxCount[i] > 0) totalWx++; }
  if (totalWx >= 5 && chains.length >= 2) {
    html += '五行俱全且相生有序，气势流通顺畅，一生少大灾。';
  } else if (chains.length >= 2) {
    html += '气势有一定流通性，虽非五行俱全，但有相生路径可走。';
  } else if (chains.length === 1) {
    html += '流通路径较为单一，部分五行之气难以流转，遇大运填补助益较大。';
  } else {
    html += '五行之气缺乏流畅通道，性格偏执、运势起伏较大，宜寻求大运弥补。';
  }

  // 缺失警告
  if (missing.length > 0) {
    html += '<br><span style="color:#8B6914;">⚠ 缺' + missing.map(function(w){return WXJ[w]}).join('、') + '</span>。';
    if (missing.indexOf(3) >= 0) html += '缺金者需注意呼吸系统保养。';
    if (missing.indexOf(4) >= 0) html += '缺水者需注意肾水与泌尿系统。';
    if (missing.indexOf(0) >= 0) html += '缺木者需注意肝胆健康。';
    if (missing.indexOf(1) >= 0) html += '缺火者需注意心血管保养。';
    if (missing.indexOf(2) >= 0) html += '缺土者需注意脾胃消化。';
  }
  html += '</div>';
  return html;
}

function determineXiyongshen(ob) {
  if (!ob || !ob._px) {
    return '<div class="bz-dingge-step-body">请先排定八字后再查看喜用神。八字排盘时需要完整填入出生信息。</div>';
  }

  var dayStem = ob.b3 % 10;
  var riWx = dayStem >> 1; // 日主五行索引 0-4
  var monthBranch = ob.b2 % 12;
  var dayGan = Lunar.Gan[dayStem];
  var px = ob._px;
  var wxVals = ob._wuxingVals;
  var WXJ = Lunar.WuXingJ;
  var html = '';
  html += '<div class="bz-dingge-title"><i class="ti ti-star"></i> 八字喜用</div>';

  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var branches = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  var monthZhi = Lunar.Zhi[monthBranch];
  var seasonIdx = _XYS_SEASON[monthBranch];
  var seasonNames = ['春','夏','秋','冬'];

  // === Step 1: 四柱概览 ===
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">一、四柱八字概览</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '日主 <span class="bz-dingge-highlight">' + dayGan + '</span>（' + Lunar.WuXing[dayStem] + '）　|　';
  html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js;
  html += '</div></div>';

  // === Step 2: 月令格局 ===
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">二、月令格局</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '月令 <span class="bz-dingge-gold">' + monthZhi + '</span>（' + seasonNames[seasonIdx] + '季），';
  html += '月令为用神之源。《子平真诠》云："八字用神，专求月令。"';
  html += '</div></div>';

  // === Step 3: 格局喜用（核心 — 格局驱动的五神体系）===
  var congData = _getCongGeData(ob);
  var geName = '', dxyRule = null;
  var yongWxList = [], xiWxList = [], jiWxList = [], chouWxList = [];
  var ruleSource = '';

  if (congData) {
    // 从格喜用 — 直接复用 _computeCongGeData 已正确计算的 luckyWx/unluckyWx
    // 禁止通过键名去查规则表（键名归一化有 Bug：假从弱格·从财 → 假从财 → 找不到规则）
    geName = congData.congType;
    // 用神 = 从神本身（如从财→火、从官→金、从儿→木）
    yongWxList = (typeof congData.congShenWx === 'number' && congData.congShenWx >= 0)
      ? [congData.congShenWx] : (congData.luckyWx && congData.luckyWx.length > 0 ? [congData.luckyWx[0]] : []);
    // 喜神 = 全部顺势五行（除用神外）
    xiWxList = [];
    for (var _lw = 0; _lw < (congData.luckyWx || []).length; _lw++) {
      if (congData.luckyWx[_lw] !== yongWxList[0]) xiWxList.push(congData.luckyWx[_lw]);
    }
    jiWxList = congData.unluckyWx || [];
    chouWxList = []; // 从格无仇神（忌神直接破格，不经过仇神中转）
    ruleSource = '从格顺势';
  } else {
    // 正格喜用 — 参照规范 §4.1
    // 获取格局名
    // 优先使用缓存的格局名（mingLiBaZi中已计算）
    geName = ob._geName || '';
    if (!geName) {
    var benQiIdx2 = _DG_GAN[_DG_BENQI[monthBranch]];
    var sl = _dinggeGetSiLing(ob);
    var slGanIdx2 = _DG_GAN[sl.slGan];
    var slSS2 = Lunar.sshen(ob.b3, slGanIdx2);
    var touGan2 = _dinggeCheckTouGan(ob, sl.slGan);
    var effSS = touGan2.length > 0 ? slSS2 : Lunar.sshen(ob.b3, benQiIdx2);
    var geInfo2 = _DG_GEMAP[effSS];
    geName = geInfo2 ? geInfo2[0] : effSS + '格';
    }

    dxyRule = _DXY_RULES[geName];
    if (dxyRule) {
      var dxy2 = dxyRule(riWx);
      yongWxList = dxy2.yongWx; xiWxList = dxy2.xiWx; jiWxList = dxy2.jiWx; chouWxList = dxy2.chouWx;
    } else {
      // fallback：简化扶抑法
      yongWxList = [px.yong]; xiWxList = [px.xi]; jiWxList = [px.ji]; chouWxList = [px.chou];
    }
    ruleSource = '正格' + (geInfo2 && geInfo2[1] === true ? '顺用' : geInfo2 && geInfo2[1] === false ? '逆用' : '');
  }

  // 五行→十神转换（含阴阳正/偏区分）
  // 安全网：仇神不得与用神/喜神重叠（党助忌神者不应与用神相同）
  var _yxSet = {};
  for (var _yi = 0; _yi < yongWxList.length; _yi++) _yxSet[yongWxList[_yi]] = 1;
  for (var _yi = 0; _yi < xiWxList.length; _yi++) _yxSet[xiWxList[_yi]] = 1;
  var _chouFiltered = [];
  for (var _ci = 0; _ci < chouWxList.length; _ci++) {
    if (!_yxSet[chouWxList[_ci]]) _chouFiltered.push(chouWxList[_ci]);
  }
  chouWxList = _chouFiltered;

  var yongSSList = [], xiSSList = [], jiSSList = [], chouSSList = [];
  for (var ii = 0; ii < yongWxList.length; ii++) yongSSList.push(_wxToTenGodFull(yongWxList[ii], dayStem));
  for (var ii = 0; ii < xiWxList.length; ii++) xiSSList.push(_wxToTenGodFull(xiWxList[ii], dayStem));
  for (var ii = 0; ii < jiWxList.length; ii++) jiSSList.push(_wxToTenGodFull(jiWxList[ii], dayStem));
  for (var ii = 0; ii < chouWxList.length; ii++) chouSSList.push(_wxToTenGodFull(chouWxList[ii], dayStem));
  // 去重
  var _dedup = function(arr) { var seen = {}, r = []; for (var i = 0; i < arr.length; i++) { if (!seen[arr[i]]) { seen[arr[i]] = 1; r.push(arr[i]); } } return r; };
  yongSSList = _dedup(yongSSList); xiSSList = _dedup(xiSSList); jiSSList = _dedup(jiSSList); chouSSList = _dedup(chouSSList);

  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">三、格局喜用（' + ruleSource + '）</div>';
  html += '<div class="bz-dingge-step-body">';

  // 五神一览
  html += '<div class="bz-dingge-result" style="margin-top:0;">';
  html += '<div style="font-size:14px;font-weight:700;margin-bottom:6px;">格局：<span class="bz-dingge-geju" style="display:inline;font-size:14px;">' + geName + '</span></div>';
  html += '<div style="font-size:13px;line-height:2.0;">';
  html += '<span style="color:#C41E0A;font-weight:700;">用神：' + yongSSList.join('、') + '</span>';
  html += '（五行' + yongWxList.map(function(w){return WXJ[w]}).join('/') + '，成格之神）<br>';
  html += '<span style="color:#8B6914;font-weight:600;">喜神：' + xiSSList.join('、') + '</span>';
  html += '（五行' + xiWxList.map(function(w){return WXJ[w]}).join('/') + '，扶助用神）<br>';
  if (chouSSList.length > 0) {
    html += '<span style="color:#D98A20;">仇神：' + chouSSList.join('、') + '</span>';
    html += '（五行' + chouWxList.map(function(w){return WXJ[w]}).join('/') + '，党助忌神）<br>';
  }
  html += '<span style="color:var(--color-cinnabar-deep);">忌神：' + jiSSList.join('、') + '</span>';
  html += '（五行' + jiWxList.map(function(w){return WXJ[w]}).join('/') + '，破坏格局）<br>';
  html += '</div></div>';
  html += '</div></div>';

  // === Step 4: 调候参考（§2.3 调候修正）===
  var thInfo = tiaoHouByPattern[dayStem] && tiaoHouByPattern[dayStem][seasonIdx] ? tiaoHouByPattern[dayStem][seasonIdx] : { w: px.yong, note: '无特殊调候需求' };
  var thNeed = (seasonIdx === 1 || seasonIdx === 3);
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">四、调候参考</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '出生' + seasonNames[seasonIdx] + '季，';
  if (thNeed) html += '<span class="bz-dingge-gold">需要调候</span>。';
  else html += '调候需求不迫切。';
  html += '<br>调候指引：' + thInfo.note + ' → 调候五行：<span class="bz-dingge-gold">' + WXJ[thInfo.w] + '</span>。';

  // §2.3 调候修正：从格状态下调候让位于顺势
  if (congData && thNeed) {
    var thWx = thInfo.w;
    var thConflicts = false;
    for (var _ti = 0; _ti < jiWxList.length; _ti++) {
      if (jiWxList[_ti] === thWx) { thConflicts = true; break; }
    }
    if (thConflicts) {
      html += '<br><span style="color:#C41E0A;">⚠ 调候与从格矛盾：</span>调候需' + WXJ[thWx] + '，但从格忌' + WXJ[thWx] + '。';
      html += '按《子平真诠》"从格不可逆其旺势"，<b>以从格顺势为先，调候退居次位</b>。破格之灾大于失候之弊。';
    } else {
      // 调候五行与喜用不冲突 → 叠加强化
      html += '<br>调候五行' + WXJ[thWx] + '与喜用一致，<span style="color:#5D8A7C;">叠加强化</span>。';
    }
  }
  html += '</div></div>';

  // === Step 5: 通关参考（§2.3 通关检验）===
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">五、通关参考</div>';
  html += '<div class="bz-dingge-step-body">';
  var wxValsArr = [wxVals.mu, wxVals.huo, wxVals.tu, wxVals.jin, wxVals.shui];
  var sortedWx = [];
  for (var wi = 0; wi < 5; wi++) sortedWx.push({ idx: wi, val: wxValsArr[wi] });
  sortedWx.sort(function(a, b) { return b.val - a.val; });
  var tgFound = false, tgWxIdx = -1;
  for (var si = 0; si < sortedWx.length && !tgFound; si++) {
    for (var sj = si + 1; sj < sortedWx.length && !tgFound; sj++) {
      var key = sortedWx[si].idx + ',' + sortedWx[sj].idx;
      if (_XYS_TONGGUAN.hasOwnProperty(key) && sortedWx[si].val > 30 && sortedWx[sj].val > 15) {
        tgWxIdx = _XYS_TONGGUAN[key];
        html += '命局 <span class="bz-dingge-highlight">' + WXJ[sortedWx[si].idx] + '</span> 克 <span class="bz-dingge-highlight">' + WXJ[sortedWx[sj].idx] + '</span>（交战），';
        html += '通关用神：<span class="bz-dingge-gold">' + WXJ[tgWxIdx] + '</span>。';
        tgFound = true;
        // §2.3 通关检验：通关五行自动提升为用神候选（一举两得）
        if (tgWxIdx >= 0 && yongWxList.indexOf(tgWxIdx) < 0 && jiWxList.indexOf(tgWxIdx) < 0) {
          var tgSS = _wxToTenGodFull(tgWxIdx, dayStem);
          html += '<br>通关五行' + WXJ[tgWxIdx] + '（' + tgSS + '）非忌神，<span style="color:#5D8A7C;">可取为通关用神</span>。《子平真诠》卷五："通关者，引通两神之气也。"';
        }
      }
    }
  }
  if (!tgFound) html += '命局五行无明显交战，通关需求不迫切。';
  html += '</div></div>';

  // === Step 6: 真假用神检验 ===
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">六、真假用神检验</div>';
  html += '<div class="bz-dingge-step-body">';
  var yongWxMain = yongWxList[0];
  var yongTouGan = false, yongYouGen = false;
  for (var si = 0; si < 4; si++) {
    if ((stems[si] >> 1) === yongWxMain) yongTouGan = true;
  }
  for (var bi = 0; bi < 4; bi++) {
    var cg = Lunar.CangGan[branches[bi]];
    for (var ci = 0; ci < cg.length; ci++) {
      var cgGanIdx = _DG_GAN[cg.charAt(ci)];
      if (cgGanIdx !== undefined && (cgGanIdx >> 1) === yongWxMain) { yongYouGen = true; break; }
    }
    if (yongYouGen) break;
  }
  if (yongTouGan && yongYouGen) {
    html += '用神 <span class="bz-dingge-gold">' + WXJ[yongWxMain] + '</span> 透干通根 → <span style="color:#5D8A7C;font-weight:700;">真用神</span>。力量充足，能充分发挥平衡命局的作用。';
  } else if (yongTouGan || yongYouGen) {
    html += '用神 <span class="bz-dingge-gold">' + WXJ[yongWxMain] + '</span> ' + (yongTouGan ? '透干但根弱' : '有根但未透') + ' → <span style="color:#D98A20;font-weight:700;">偏真用神</span>。效果中等，需岁运引发加强。';
  } else {
    html += '用神 <span class="bz-dingge-gold">' + WXJ[yongWxMain] + '</span> 虚浮无根 → <span style="color:#C41E0A;font-weight:700;">假用神</span>。效果有限，需大运流年补根方能见功。';
  }
  html += '</div></div>';

  // === Step 7: 岁运喜忌参考 ===
  var jiWxMain = jiWxList[0] != null ? jiWxList[0] : px.ji;
  var chouWxMain = chouWxList.length > 0 ? chouWxList[0] : px.chou;
  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">七、岁运喜忌参考</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '大运行 <span class="bz-dingge-gold">' + yongSSList.join('、') + '</span>（五行' + yongWxList.map(function(w){return WXJ[w]}).join('/') + '）为吉，贵人相助，事业顺遂。<br>';
  html += '大运行 <span style="color:#C41E0A;">' + jiSSList.join('、') + '</span>（五行' + jiWxList.map(function(w){return WXJ[w]}).join('/') + '）为凶，需谨慎行事，以守为主。<br>';
  html += '《滴天髓》云："富贵虽定乎格局，穷通实系乎运途。"原局用神得力，逢吉运则锦上添花；原局用神无力，逢忌运则雪上加霜。';
  html += '</div></div>';

  // === 从格核心提示（保留现有详细内容）===
  if (congData) {
    html += '<div class="bz-dingge-step bz-section--red" style="margin-top:12px;">';
    html += '<div class="bz-dingge-step-label">八、从格核心提示（命主必读）</div>';
    html += '<div class="bz-dingge-step-body" style="font-size:13px;line-height:1.9;">';

    html += '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px;">一、命局简析</div>';
    html += '<p style="margin:2px 0 8px 0;">日主<span class="bz-dingge-highlight">' + dayGan + '</span>（五行属' + WXJ[riWx] + '），';
    if (congData.congType.indexOf('从弱') >= 0) {
      html += '生于' + Lunar.WuXingJ[_cgGanWx(_DG_BENQI[monthBranch])] + '旺之月（' + monthZhi + '），全局克泄耗力量占绝对主导，日主无本气根、无印比生扶，弱至极点，只能顺从旺势。<br>';
      html += '《滴天髓》云："阳干从气不从势，阴干从势无情义。"日主' + dayGan + '为';
      html += (dayStem % 2 === 0 ? '阳' : '阴') + '干，';
      html += (dayStem % 2 === 0 ? '需严格无根方能论从' : '从弱条件可略宽，独一印比亦可以假从论。') + '</p>';
    } else {
      html += '日主极旺，生于印比当令之月，满盘印比成势，财官食伤虚浮无根，日主强旺不可逆，只能顺其旺势取用。</p>';
    }

    html += '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px;">二、喜用神详解（顺势而取）</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px 0;">';
    html += '<tr style="background:rgba(212,184,102,0.12);"><th style="padding:4px 8px;border:1px solid #D4A574;">优先级</th><th style="padding:4px 8px;border:1px solid #D4A574;">类别</th><th style="padding:4px 8px;border:1px solid #D4A574;">五行</th><th style="padding:4px 8px;border:1px solid #D4A574;">对应天干</th><th style="padding:4px 8px;border:1px solid #D4A574;">对应地支</th><th style="padding:4px 8px;border:1px solid #D4A574;">命理作用</th></tr>';
    for (var lwi = 0; lwi < congData.luckyWx.length; lwi++) {
      var lw = congData.luckyWx[lwi];
      var roleLabel = lwi === 0 ? '第一喜神（用神）' : (lwi === 1 ? '第二喜神' : '第三喜神（次喜）');
      var roleDesc = lwi === 0 ? '全局最旺，顺势发财升官' : (lwi === 1 ? '助旺用神，锦上添花' : '间接助势，平衡流通');
      html += '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;color:#C41E0A;font-weight:700;">第' + (lwi+1) + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-weight:700;">' + roleLabel + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);color:#C41E0A;font-weight:700;">' + WXJ[lw] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);">' + congData.luckyGan[lwi] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);">' + congData.luckyZhi[lwi] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-size:11px;">' + roleDesc + '</td></tr>';
    }
    html += '</table>';

    html += '<div style="font-weight:700;color:var(--color-cinnabar-deep);margin-bottom:4px;">三、忌神警示（触之必凶）</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px 0;">';
    html += '<tr style="background:rgba(196,30,10,0.06);"><th style="padding:4px 8px;border:1px solid #D4A574;">危险等级</th><th style="padding:4px 8px;border:1px solid #D4A574;">五行</th><th style="padding:4px 8px;border:1px solid #D4A574;">对应天干</th><th style="padding:4px 8px;border:1px solid #D4A574;">对应地支</th><th style="padding:4px 8px;border:1px solid #D4A574;">破格后果</th></tr>';
    for (var uwi = 0; uwi < congData.unluckyWx.length; uwi++) {
      var uw = congData.unluckyWx[uwi];
      html += '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;color:#C41E0A;font-weight:700;">' + (uwi === 0 ? '第一忌神' : '第二忌神') + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);color:#8B1508;font-weight:700;">' + WXJ[uw] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);">' + congData.unluckyGan[uwi] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);">' + congData.unluckyZhi[uwi] + '</td>';
      html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-size:11px;">' + (uwi === 0 ? '直接破格，犯旺招灾' : '间接破格，生助忌神') + '，主破财、官非、病灾</td></tr>';
    }
    html += '</table>';

    html += '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px;">四、核心原则</div>';
    html += '<p style="margin:2px 0 8px 0;">';
    html += '从格之命，一生需<span style="color:#C41E0A;font-weight:700;">「顺势而不逆」</span>。逢喜神流年大运必发达，逢忌神必遭重挫。<br>';
    html += '《渊海子平》云："从格无根，方论从。"大运见印比即破，逢之需格外谨慎。<br>';
    html += '《子平真诠》："真从之格局，逢印比运即破。"破格时多应灾祸，事业反复，健康受损。';
    html += '</p>';

    html += '<div style="font-weight:700;color:#5D8A7C;margin-bottom:4px;">五、典籍参考</div>';
    html += '<p style="margin:2px 0 4px 0;font-size:12px;color:' + (document.documentElement.classList.contains('dark') ? '#9B8B78' : 'var(--text-secondary)') + ';">';
    html += '《滴天髓》："从得真者只论从，从神又有吉和凶。"<br>';
    html += '《三命通会》：';
    if (congData.congType.indexOf('从财') >= 0) html += '"从财格，喜食伤生财，忌比劫争财，印绶夺食。"<br>';
    else if (congData.congType.indexOf('从官') >= 0) html += '"从官杀格，喜财生官，忌食伤制杀，印绶化官。"<br>';
    else if (congData.congType.indexOf('从儿') >= 0) html += '"从儿格，喜比劫生食伤，食伤生财，忌印绶克食伤。"<br>';
    else html += '"从财、从杀、从儿，各有喜忌，不可一概论也。"<br>';
    html += '《渊海子平》："假从者，如人之根浅力薄，不能自立，局中虽有劫印，而自顾不暇，不得不从人也。"</p>';
    html += '</div></div>';
  }

  return html;
}

// ═══════════════════════════════════════════════════════════════
// _cgGanWx / _cgSSKind / _cgIsShengZhu 已统一至 wuxing.js
// bazi.js 内部通过全局变量调用（global._cgGanWx 等）
// 加载顺序: wuxing.js → bazi.js，确保全局已就绪
// ═══════════════════════════════════════════════════════════════

// ====== 刑冲合害统一引擎（据 bazi_core 15种底层关系 + 《三命通会》）======
// 天干关系
var _G_HE = { '甲己':'土','乙庚':'金','丙辛':'水','丁壬':'木','戊癸':'火' };   // 五合
var _G_CHONG = { '甲':'庚','乙':'辛','丙':'壬','丁':'癸','庚':'甲','辛':'乙','壬':'丙','癸':'丁' }; // 四冲

// 地支关系表
var _Z_LIUHE = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
var _Z_SANHE = { '申子辰':'水','亥卯未':'木','寅午戌':'火','巳酉丑':'金' }; // 三合局
var _Z_BANHE_SHENG = { '申子':'水','子申':'水','亥卯':'木','卯亥':'木','寅午':'火','午寅':'火','巳酉':'金','酉巳':'金' }; // 生地半合
var _Z_BANHE_MU = { '子辰':'水','辰子':'水','卯未':'木','未卯':'木','午戌':'火','戌午':'火','酉丑':'金','丑酉':'金' }; // 墓库半合
var _Z_SANHUI = { '亥子丑':'水','寅卯辰':'木','巳午未':'火','申酉戌':'金' }; // 三会局
var _Z_LIUCHONG = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
var _Z_LIUHAI = { '子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉' };
var _Z_SANXING = { '子卯':'无礼之刑','寅巳':'恃势之刑','巳申':'恃势之刑','寅申':'恃势之刑','丑戌':'无恩之刑','戌未':'无恩之刑','丑未':'无恩之刑' };
var _Z_ZIXING = { '辰':1,'午':1,'酉':1,'亥':1 }; // 自刑
var _Z_LIUPO = { '子':'酉','酉':'子','寅':'亥','亥':'寅','辰':'丑','丑':'辰','午':'卯','卯':'午','申':'巳','巳':'申','戌':'未','未':'戌' };
var _Z_ANHE = { '寅丑':1,'丑寅':1,'卯申':1,'申卯':1,'亥午':1,'午亥':1 }; // 暗合（部分常见组合）
var _Z_JUE = { '寅':'酉','酉':'寅','卯':'申','申':'卯','巳':'子','子':'巳','午':'亥','亥':'午' }; // 相绝
var _Z_LIUHE_WX = { '子丑':'土','寅亥':'木','卯戌':'火','辰酉':'金','巳申':'水','午未':'火' }; // 六合化五行

// 检测指定柱与其他柱的所有刑冲合害关系
// pIdx: 0=年,1=月,2=日,3=时
function _pillarRelations(ob, pIdx) {
  var pGan = Lunar.Gan[ob['b'+(pIdx+1)] % 10];
  var pZhi = Lunar.Zhi[ob['b'+(pIdx+1)] % 12];
  var result = { he:[], chong:[], hai:[], xing:[], po:[], anhe:[], jue:[], banhe:[], hui:[], sanhe:[], zhenghe:[] };

  for (var j = 0; j < 4; j++) {
    if (j === pIdx) continue;
    var qGan = Lunar.Gan[ob['b'+(j+1)] % 10], qZhi = Lunar.Zhi[ob['b'+(j+1)] % 12];
    var qLabel = ['年','月','日','时'][j];

    // 天干五合
    var gHeKey = pGan + qGan, gHeKey2 = qGan + pGan;
    if (_G_HE[gHeKey]) result.he.push({ with:qLabel, gan:qGan, type:'天干合', detail:pGan+qGan+'合'+_G_HE[gHeKey] });
    else if (_G_HE[gHeKey2]) result.he.push({ with:qLabel, gan:qGan, type:'天干合', detail:qGan+pGan+'合'+_G_HE[gHeKey2] });
    // 天干冲
    if (_G_CHONG[pGan] === qGan) result.chong.push({ with:qLabel, gan:qGan, type:'天干冲', detail:pGan+qGan+'相冲' });

    // 地支六合
    if (_Z_LIUHE[pZhi] === qZhi) result.he.push({ with:qLabel, zhi:qZhi, type:'地支六合', detail:pZhi+qZhi+'六合' });
    // 地支六冲
    if (_Z_LIUCHONG[pZhi] === qZhi) result.chong.push({ with:qLabel, zhi:qZhi, type:'地支六冲', detail:pZhi+qZhi+'六冲' });
    // 地支六害
    if (_Z_LIUHAI[pZhi] === qZhi) result.hai.push({ with:qLabel, zhi:qZhi, type:'六害', detail:pZhi+qZhi+'相害' });
    // 地支六破
    if (_Z_LIUPO[pZhi] === qZhi) result.po.push({ with:qLabel, zhi:qZhi, type:'六破', detail:pZhi+qZhi+'相破' });
    // 相绝
    if (_Z_JUE[pZhi] === qZhi) result.jue.push({ with:qLabel, zhi:qZhi, type:'相绝', detail:pZhi+qZhi+'相绝' });
    // 暗合
    var ak = pZhi + qZhi;
    if (_Z_ANHE[ak]) result.anhe.push({ with:qLabel, zhi:qZhi, type:'暗合', detail:pZhi+qZhi+'暗合' });
    // 相刑
    var xk = pZhi + qZhi, xk2 = qZhi + pZhi;
    if (_Z_SANXING[xk]) result.xing.push({ with:qLabel, zhi:qZhi, type:'相刑', detail:_Z_SANXING[xk] });
    else if (_Z_SANXING[xk2]) result.xing.push({ with:qLabel, zhi:qZhi, type:'相刑', detail:_Z_SANXING[xk2] });
    // 自刑（同柱）
    if (j !== pIdx && pZhi === qZhi && _Z_ZIXING[pZhi]) result.xing.push({ with:qLabel, zhi:qZhi, type:'自刑', detail:pZhi+pZhi+'自刑' });
    // 半合
    var bhKey = pZhi + qZhi;
    if (_Z_BANHE_SHENG[bhKey]) result.banhe.push({ with:qLabel, zhi:qZhi, type:'生地半合', detail:pZhi+qZhi+'半合'+_Z_BANHE_SHENG[bhKey]+'局' });
    if (_Z_BANHE_MU[bhKey]) result.banhe.push({ with:qLabel, zhi:qZhi, type:'墓库半合', detail:pZhi+qZhi+'半合'+_Z_BANHE_MU[bhKey]+'局' });
  }

  // 三合局检测（需要三柱配合）
  for (var k in _Z_SANHE) {
    var kk = k.charAt(0)+k.charAt(1)+k.charAt(2);
    if (pZhi === kk[0] || pZhi === kk[1] || pZhi === kk[2]) {
      var found = [pZhi];
      for (var j = 0; j < 4; j++) {
        if (j === pIdx) continue;
        var qz = Lunar.Zhi[ob['b'+(j+1)] % 12];
        if ((qz === kk[0] || qz === kk[1] || qz === kk[2]) && found.indexOf(qz) < 0) found.push(qz);
      }
      if (found.length >= 3) result.sanhe.push({ type:'三合局', detail:kk+'三合'+_Z_SANHE[k]+'局' });
      else if (found.length >= 2) result.banhe.push({ type:'半合(双支)', detail:found.join('')+'半合'+_Z_SANHE[k]+'局' });
    }
  }

  // 三会局检测
  for (var h in _Z_SANHUI) {
    if (pZhi === h[0] || pZhi === h[1] || pZhi === h[2]) {
      var f2 = [pZhi];
      for (var j = 0; j < 4; j++) {
        if (j === pIdx) continue;
        var qz = Lunar.Zhi[ob['b'+(j+1)] % 12];
        if ((qz === h[0] || qz === h[1] || qz === h[2]) && f2.indexOf(qz) < 0) f2.push(qz);
      }
      if (f2.length >= 3) result.hui.push({ type:'三会局', detail:h+'三会'+_Z_SANHUI[h]+'局' });
    }
  }

  // 争合检测：天干五合是否被争
  if (result.he.length > 0) {
    for (var hi = 0; hi < result.he.length; hi++) {
      if (result.he[hi].type === '天干合') {
        var heGan = result.he[hi].gan;
        var competitors = 1;
        for (var hj = hi+1; hj < result.he.length; hj++) {
          if (result.he[hj].type === '天干合' && result.he[hj].gan === heGan) competitors++;
        }
        if (competitors >= 2) result.zhenghe.push({ type:'争合', detail:'多柱争合' + pGan });
      }
    }
  }

  return result;
}

// ====== 十二长生能量表（据《三命通会》卷二·论五行旺相休囚死）======
// 日主天干在地支中的长生状态权重
// 地支→天干映射：查找日干在某支的状态 (0=绝, 1=胎, 2=养, 3=长生, 4=沐浴, 5=冠带, 6=临官, 7=帝旺, 8=衰, 9=病, 10=死, 11=墓)
// 权重: 临官/帝旺=1.0, 长生=0.7, 冠带=0.55, 墓库=0.4, 养=0.25, 沐浴/衰=0.2, 胎=0.15, 病=0.1, 死/绝=0.0
var _CS_WEIGHT = [0.7, 0.2, 0.55, 1.0, 1.0, 0.2, 0.1, 0.0, 0.4, 0.0, 0.15, 0.25];
// 十干长生起始地支索引（甲=亥10, 乙=午6, 丙=寅2, 丁=酉8, 戊=寅2, 己=酉8, 庚=巳4, 辛=子0, 壬=申7, 癸=卯3）
var _CS_START = [10,6,2,8,2,8,4,0,7,3];
// 获取日干在指定地支中的长生状态索引 (0=绝~11=墓)
function _csState(riGanIdx, zhiIdx) {
  var start = _CS_START[riGanIdx];
  return (zhiIdx - start + 12) % 12;
}
// 获取日干在指定地支中的长生权重
function _csWeight(riGanIdx, zhiIdx) {
  return _CS_WEIGHT[_csState(riGanIdx, zhiIdx)];
}

// ====== 统一从格计算引擎 ======
// 五行力量打分 + 印星阻断 + 长生根气检查 + 加权从格判定 → 缓存到 ob._congGeData
// 所有消费方（determineCongGe、_getCongGeData、determineXiyongshen）共用此数据
function _computeCongGeData(ob) {
  var ganArr = [ob.bz_jn[0], ob.bz_jy[0], ob.bz_jr[0], ob.bz_js[0]];
  var zhiArr = [ob.bz_jn[1], ob.bz_jy[1], ob.bz_jr[1], ob.bz_js[1]];
  var riGan = ganArr[2];
  var riGanIdx = Lunar.Gan.indexOf(riGan);
  var riWx = _cgGanWx(riGan);
  var yueZhi = zhiArr[1];
  var yueZhiIdx = Lunar.Zhi.indexOf(yueZhi);
  var wxKeys = ['mu','huo','tu','jin','shui'];
  var WXJ = Lunar.WuXingJ;
  // 月令主宰天干索引（用于季节旺相休囚死权重）
  var i6 = Lunar.DZhuQ[yueZhiIdx];

  // === 第1步：五行力量打分（含季节权重 LiLiang 乘数）===
  var scores = { mu:0, huo:0, tu:0, jin:0, shui:0 };
  var shengZhuTotal = 0, keXieTotal = 0;
  var detailLines = [];

  // 天干（基础10/12分 × 季节权重）
  for (var i = 0; i < 4; i++) {
    var g = ganArr[i];
    var gIdx = Lunar.Gan.indexOf(g);
    var wx = gIdx >> 1;
    var kind = _cgSSKind(riGanIdx, gIdx);
    var basePts = (i === 2) ? 12 : 10;
    var multIdx = Qiulq(gIdx, i6);
    var mult = (multIdx >= 1 && multIdx <= 10) ? Lunar.LiLiang[multIdx] : 1.0;
    var pts = Math.round(basePts * mult);
    scores[wxKeys[wx]] = (scores[wxKeys[wx]] || 0) + pts;
    if (_cgIsShengZhu(kind)) shengZhuTotal += pts; else keXieTotal += pts;
    detailLines.push({ pos:'天干·' + ['年','月','日','时'][i], gan:g, wx:WXJ[wx], pts:pts, kind:kind });
  }

  // 地支藏干（四生支16:8:4，四库支18:9:3，丑特殊5:7）× 季节权重，月令+5分不加乘
  // 参照《渊海子平》藏干体系
  var _SI_SHENG = {0:1,3:1,6:1,9:1}; // 寅=2,巳=5,申=8,亥=11 -> 0-index: 2,5,8,11
  var _isSiSheng = {2:1,5:1,8:1,11:1};
  for (var j = 0; j < 4; j++) {
    var zIdx = Lunar.Zhi.indexOf(zhiArr[j]);
    var benQi = _DG_BENQI[zIdx];
    var zhongQi = _DG_ZHONGQI[zIdx];
    var yuQi = _DG_YUQI[zIdx];
    var posLabel = '地支·' + ['年','月','日','时'][j];
    // 四生支(寅巳申亥) 16:8:4, 四库支(辰戌丑未) 18:9:3, 子午卯酉无余气
    var isSiSheng = _isSiSheng[zIdx] ? true : false;
    var baseBQ = isSiSheng ? 16 : 18;
    var baseZQ = isSiSheng ? 8 : 9;
    var baseYQ = isSiSheng ? 4 : 3;
    // 丑特殊：中气5余气7（本气仍18）
    if (zIdx === 1) { baseZQ = 5; baseYQ = 7; }

    var benQiIdx = Lunar.Gan.indexOf(benQi);
    if (benQiIdx >= 0) {
      var multBQIdx = Qiulq(benQiIdx, i6);
      var multBQ = (multBQIdx >= 1 && multBQIdx <= 10) ? Lunar.LiLiang[multBQIdx] : 1.0;
      var ptsBQ = Math.round(baseBQ * multBQ);
      // 月令额外加成5分（不加乘数，为纯粹月令权重）
      if (j === 1) ptsBQ += 5;
      var wxBQ = benQiIdx >> 1;
      var kindBQ = _cgSSKind(riGanIdx, benQiIdx);
      scores[wxKeys[wxBQ]] = (scores[wxKeys[wxBQ]] || 0) + ptsBQ;
      if (_cgIsShengZhu(kindBQ)) shengZhuTotal += ptsBQ; else keXieTotal += ptsBQ;
      detailLines.push({ pos:posLabel+'本气', gan:benQi, wx:WXJ[wxBQ], pts:ptsBQ, kind:kindBQ });
    }
    if (zhongQi) {
      var zqIdx = Lunar.Gan.indexOf(zhongQi);
      if (zqIdx >= 0) {
        var multZQIdx = Qiulq(zqIdx, i6);
        var multZQ = (multZQIdx >= 1 && multZQIdx <= 10) ? Lunar.LiLiang[multZQIdx] : 1.0;
        var ptsZQ = Math.round(baseZQ * multZQ);
        var wxZQ = zqIdx >> 1;
        var kindZQ = _cgSSKind(riGanIdx, zqIdx);
        scores[wxKeys[wxZQ]] = (scores[wxKeys[wxZQ]] || 0) + ptsZQ;
        if (_cgIsShengZhu(kindZQ)) shengZhuTotal += ptsZQ; else keXieTotal += ptsZQ;
        detailLines.push({ pos:posLabel+'中气', gan:zhongQi, wx:WXJ[wxZQ], pts:ptsZQ, kind:kindZQ });
      }
    }
    if (yuQi) {
      var yqIdx = Lunar.Gan.indexOf(yuQi);
      if (yqIdx >= 0) {
        var multYQIdx = Qiulq(yqIdx, i6);
        var multYQ = (multYQIdx >= 1 && multYQIdx <= 10) ? Lunar.LiLiang[multYQIdx] : 1.0;
        var ptsYQ = Math.round(baseYQ * multYQ);
        var wxYQ = yqIdx >> 1;
        var kindYQ = _cgSSKind(riGanIdx, yqIdx);
        scores[wxKeys[wxYQ]] = (scores[wxKeys[wxYQ]] || 0) + ptsYQ;
        if (_cgIsShengZhu(kindYQ)) shengZhuTotal += ptsYQ; else keXieTotal += ptsYQ;
        detailLines.push({ pos:posLabel+'余气', gan:yuQi, wx:WXJ[wxYQ], pts:ptsYQ, kind:kindYQ });
      }
    }
  }

  // === 第2步：日主根气检查 ===
  var riHasRoot = false, riHasBenQiRoot = false, rootDetail = '';
  for (var rj = 0; rj < 4; rj++) {
    var rzIdx = Lunar.Zhi.indexOf(zhiArr[rj]);
    var rbenQi = _DG_BENQI[rzIdx];
    var rzhongQi = _DG_ZHONGQI[rzIdx];
    var ryuQi = _DG_YUQI[rzIdx];
    var rLabel = zhiArr[rj];
    if (_cgGanWx(rbenQi) === riWx) { riHasRoot = true; riHasBenQiRoot = true; rootDetail = rLabel + '本气' + rbenQi; break; }
    if (rzhongQi && _cgGanWx(rzhongQi) === riWx) { riHasRoot = true; rootDetail = rLabel + '中气' + rzhongQi; }
    if (!riHasRoot && ryuQi && _cgGanWx(ryuQi) === riWx) { riHasRoot = true; rootDetail = rLabel + '余气' + ryuQi; }
  }

  // === 第3步：藏干印比检测（真/假从格关键判定）===
  // 《渊海子平》: "若见印绶比肩，虽微亦假"
  var hasHiddenYinBi = false;   // 藏干中是否有印/比劫（本气除外，本气已单独判断）
  var hiddenYinBiList = [];     // [{pos, gan, kind, zhi}]
  var hasTianGanBiJie = false;  // 天干（除日主外）是否透印/比劫
  // 检测天干
  for (var tg = 0; tg < 4; tg++) {
    if (tg === 2) continue; // 跳过日主
    var tgIdx = Lunar.Gan.indexOf(ganArr[tg]);
    var tgKind = _cgSSKind(riGanIdx, tgIdx);
    if (_cgIsShengZhu(tgKind)) hasTianGanBiJie = true;
  }
  // 检测藏干（中气、余气中的印/比劫）
  for (var hj = 0; hj < 4; hj++) {
    var hzIdx = Lunar.Zhi.indexOf(zhiArr[hj]);
    var hzhongQi = _DG_ZHONGQI[hzIdx];
    var hyuQi = _DG_YUQI[hzIdx];
    if (hzhongQi) {
      var hzqIdx = Lunar.Gan.indexOf(hzhongQi);
      if (hzqIdx >= 0) {
        var hzqKind = _cgSSKind(riGanIdx, hzqIdx);
        if (_cgIsShengZhu(hzqKind)) {
          hasHiddenYinBi = true;
          hiddenYinBiList.push({pos: ['年','月','日','时'][hj]+'支', gan: hzhongQi, kind: hzqKind, zhi: zhiArr[hj]});
        }
      }
    }
    if (hyuQi) {
      var hyqIdx = Lunar.Gan.indexOf(hyuQi);
      if (hyqIdx >= 0) {
        var hyqKind = _cgSSKind(riGanIdx, hyqIdx);
        if (_cgIsShengZhu(hyqKind)) {
          hasHiddenYinBi = true;
          hiddenYinBiList.push({pos: ['年','月','日','时'][hj]+'支', gan: hyuQi, kind: hyqKind, zhi: zhiArr[hj]});
        }
      }
    }
  }

  // === 第4步：月令分析 ===
  var yueBenQi = _DG_BENQI[yueZhiIdx];
  var yueWx = _cgGanWx(yueBenQi);
  var yueSSKind = _cgSSKind(riGanIdx, Lunar.Gan.indexOf(yueBenQi));
  var yueIsYinBi = _cgIsShengZhu(yueSSKind);

  // === 十神分项得分 ===
  var ssScores = { '印':0, '比':0, '财':0, '官':0, '食伤':0 };
  for (var dl = 0; dl < detailLines.length; dl++) {
    ssScores[detailLines[dl].kind] = (ssScores[detailLines[dl].kind] || 0) + detailLines[dl].pts;
  }

  // === 月令加成 + 日主无根减半 ===
  var yueBonus = Math.round(ssScores[yueSSKind] * 0.2);
  if (yueBonus > 0) {
    if (_cgIsShengZhu(yueSSKind)) shengZhuTotal += yueBonus; else keXieTotal += yueBonus;
  }
  if (!riHasBenQiRoot) shengZhuTotal -= 6;
  var totalScore = shengZhuTotal + keXieTotal;
  var shengPct = totalScore > 0 ? Math.round(shengZhuTotal / totalScore * 1000) / 10 : 0;
  var keXiePct = totalScore > 0 ? Math.round(keXieTotal / totalScore * 1000) / 10 : 0;

  // === 第5步：从旺/从弱判定 ===
  var result = '', congShen = '', grade = '';
  var luckyEl = [], unluckyEl = [];
  var congShenWx = -1;
  var luckyWx = [], unluckyWx = [];

  var maxScore = -1, maxWx = '';
  for (var wx2 = 0; wx2 < 5; wx2++) {
    if (scores[wxKeys[wx2]] > maxScore) { maxScore = scores[wxKeys[wx2]]; maxWx = WXJ[wx2]; }
  }

  // 《子平真诠》从旺判定：生助>=80%即为从旺，月令是否印比决定真假
  if (shengPct >= 80) {
    if (!yueIsYinBi) {
      // 月令非印比但生助极旺→假从旺（仍为从格）
      result = '假从旺格'; congShen = '印比'; grade = '中等';
      luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
    } else if (ssScores['印'] > ssScores['比']) {
      result = '从旺格·从印'; congShen = '印星'; congShenWx = (riWx + 4) % 5;
      luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      grade = '上等';
    } else {
      var sameWxCount = 0;
      for (var pg = 0; pg < 4; pg++) { if (_cgGanWx(ganArr[pg]) === riWx) sameWxCount++; }
      if (sameWxCount >= 3) {
        var zhuanwangNames = ['曲直格(木)', '炎上格(火)', '稼穑格(土)', '从革格(金)', '润下格(水)'];
        result = '专旺格·' + zhuanwangNames[riWx];
      } else { result = '从旺格·从比'; }
      congShen = '比劫'; congShenWx = riWx;
      luckyEl = ['比劫', '印']; unluckyEl = ['财', '官杀', '食伤'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      grade = '上等';
    }
  } else if (shengPct >= 65 && shengPct < 80) {
    result = '假从旺格'; congShen = '印比';
    luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
    luckyWx = [(riWx + 4) % 5, riWx];
    unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
    grade = '中等';
  } else if (keXiePct >= 80 && !riHasBenQiRoot) {
    // 《渊海子平》: 藏干见印比则假从，纯顺势则真从
    var isFalseCongRuo = hasHiddenYinBi || hasTianGanBiJie;
    var prefix = isFalseCongRuo ? '假' : '真';
    if (ssScores['财'] > ssScores['官'] && ssScores['财'] > ssScores['食伤']) {
      result = prefix + '从弱格·从财'; congShen = '财星'; congShenWx = (riWx + 2) % 5;
      luckyEl = ['食伤', '财']; unluckyEl = ['印', '比劫'];
      luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx];
    } else if (ssScores['官'] > ssScores['财'] && ssScores['官'] > ssScores['食伤']) {
      result = prefix + '从弱格·从官杀'; congShen = '官杀'; congShenWx = (riWx + 3) % 5;
      luckyEl = ['财', '官杀']; unluckyEl = ['印', '比劫', '食伤'];
      luckyWx = [(riWx + 2) % 5, (riWx + 3) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx, (riWx + 1) % 5];
    } else if (ssScores['食伤'] > ssScores['财'] && ssScores['食伤'] > ssScores['官']) {
      result = prefix + '从弱格·从儿(食伤)'; congShen = '食伤'; congShenWx = (riWx + 1) % 5;
      luckyEl = ['比劫', '食伤', '财']; unluckyEl = ['印'];
      luckyWx = [riWx, (riWx + 1) % 5, (riWx + 2) % 5];
      unluckyWx = [(riWx + 4) % 5];
    } else {
      result = prefix + '从弱格·从势'; congShen = maxWx;
      luckyEl = ['食伤', '财', '官杀']; unluckyEl = ['印', '比劫'];
      luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx];
    }
    grade = isFalseCongRuo ? '上等（假从·有破格风险）' : '上等（真从·纯粹）';
  } else if (keXiePct >= 65 && keXiePct < 80 && !riHasBenQiRoot) {
    // 65-80%区间：自动判为假从弱格
    result = '假从弱格'; congShen = '异党';
    luckyEl = ['食伤', '财', '官杀']; unluckyEl = ['印', '比劫'];
    luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
    unluckyWx = [(riWx + 4) % 5, riWx];
    grade = '中等';
  } else {
    result = '非从格'; congShen = '—'; grade = '—';
  }

  var isCong = result.indexOf('从') >= 0 && result !== '非从格';

  // 动态生成大运流年提示（从 luckyWx/unluckyWx 推导，禁止硬编码）
  var WXJ = Lunar.WuXingJ; // ['木','火','土','金','水']
  var wxToZhi = [['寅','卯'],['巳','午'],['辰','戌','丑','未'],['申','酉'],['亥','子']];
  var buildWxZhiStr = function(wxArr) {
    var parts = [];
    for (var wi = 0; wi < wxArr.length; wi++) {
      var wxIdx = wxArr[wi];
      var zhiArr = wxToZhi[wxIdx] || [];
      parts.push(zhiArr.join('') + '（' + WXJ[wxIdx] + '）');
    }
    return parts.join('、');
  };
  var luckyZyStr = buildWxZhiStr(luckyWx);
  var unluckyZyStr = buildWxZhiStr(unluckyWx);

  var dangerYears = '';
  if (isCong && unluckyEl.length > 0) {
    // 大运：忌神十神运破格 / 流年：忌神地支旺年
    dangerYears = '大运见<span style="color:#C41E0A;font-weight:700;">' + unluckyEl.join('、') + '</span>运则破格。<br><br>';
    dangerYears += '流年吉凶：<br>';
    dangerYears += '· <span style="color:#5D8A7C;font-weight:700;">喜</span> ' + luckyZyStr + ' 旺年，顺势而昌；<br>';
    dangerYears += '· <span style="color:#C41E0A;font-weight:700;">忌</span> ' + unluckyZyStr + ' 旺年，逆势则破格招灾。<br>';
    // 平运提示：五行中不在喜神也不在忌神的，列为平运
    var neutralWx = [];
    for (var nw = 0; nw < 5; nw++) {
      if (luckyWx.indexOf(nw) < 0 && unluckyWx.indexOf(nw) < 0) neutralWx.push(nw);
    }
    if (neutralWx.length > 0) {
      dangerYears += '· 平运：' + buildWxZhiStr(neutralWx) + ' 旺年，不生克格局，可作平运。';
    }
  }

  var wxToGan = [['甲','乙'],['丙','丁'],['戊','己'],['庚','辛'],['壬','癸']];

  // 直接引用 dcwxll 主系统计算结果（唯一权威五行力量数据源）
  var wxVD = ob._wuxingVals || { mu:0,huo:0,tu:0,jin:0,shui:0,total:0 };
  var dcwxSz = ob._shengzhu || 0;   // 生助=印(生我)+比(同我)，直接来自 dcwxll
  var dcwxKx = ob._kexie || 0;      // 克泄耗，直接来自 dcwxll
  var dcwxTotal = dcwxSz + dcwxKx;
  var dcwxSzPct = dcwxTotal > 0 ? Math.round(dcwxSz / dcwxTotal * 1000) / 10 : 0;
  var dcwxKxPct = dcwxTotal > 0 ? Math.round(dcwxKx / dcwxTotal * 1000) / 10 : 0;

  var data = {
    ganArr: ganArr, zhiArr: zhiArr,
    riGan: riGan, riGanIdx: riGanIdx, riWx: riWx,
    yueZhi: yueZhi, yueZhiIdx: yueZhiIdx,
    scores: scores, detailLines: detailLines,
    shengZhuTotal: shengZhuTotal, keXieTotal: keXieTotal,
    totalScore: totalScore, shengPct: shengPct, keXiePct: keXiePct,
    riHasRoot: riHasRoot, riHasBenQiRoot: riHasBenQiRoot, rootDetail: rootDetail,
    hasHiddenYinBi: hasHiddenYinBi, hiddenYinBiList: hiddenYinBiList,
    hasTianGanBiJie: hasTianGanBiJie,
    // H6 fix: 计算天干是否有印比生助
    riHasTianGanHelp: (function() {
      var ganFull2 = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
      for (var tg2 = 0; tg2 < 4; tg2++) {
        if (tg2 === 2) continue;
        var tkind2 = _cgSSKind(riGanIdx, ganFull2[tg2]);
        if (_cgIsShengZhu(tkind2)) return true;
      }
      return false;
    })(),
    yueBenQi: yueBenQi, yueWx: yueWx, yueIsYinBi: yueIsYinBi, yueSSKind: yueSSKind,
    ssScores: ssScores,
    result: result, congShen: congShen, congType: isCong ? result : null,
    luckyEl: luckyEl, unluckyEl: unluckyEl,
    luckyWx: luckyWx, unluckyWx: unluckyWx,
    congShenWx: congShenWx,
    grade: grade, dangerYears: dangerYears, isCong: isCong,
    // 主计算五行力量（dcwxll体系，与 bzinfo 生克制化卡、日主强弱卡数值一致）
    wuxingVals: { mu: wxVD.mu, huo: wxVD.huo, tu: wxVD.tu, jin: wxVD.jin, shui: wxVD.shui,
                  total: wxVD.total, shengzhu: dcwxSz, kexie: dcwxKx,
                  shengPct: dcwxSzPct, kexiePct: dcwxKxPct },
    luckyGan: luckyWx.map(function(w){ return wxToGan[w].join('、'); }),
    luckyZhi: luckyWx.map(function(w){ return wxToZhi[w].join('、'); }),
    unluckyGan: unluckyWx.map(function(w){ return wxToGan[w].join('、'); }),
    unluckyZhi: unluckyWx.map(function(w){ return wxToZhi[w].join('、'); })
  };

  ob._congGeData = data;
  return data;
}

// 从格数据读取接口（读缓存，供 determinateXiyongshen 使用）
function _getCongGeData(ob) {
  var data = ob._congGeData || _computeCongGeData(ob);
  if (!data.isCong) return null;
  return {
    congType: data.congType,
    shengPct: data.shengPct, keXiePct: data.keXiePct,
    scores: data.scores, ssScores: data.ssScores,
    congShenWx: data.congShenWx,
    luckyWx: data.luckyWx, unluckyWx: data.unluckyWx,
    luckyGan: data.luckyGan, luckyZhi: data.luckyZhi,
    unluckyGan: data.unluckyGan, unluckyZhi: data.unluckyZhi,
    riWx: data.riWx, riGan: data.riGan,
    riHasBenQiRoot: data.riHasBenQiRoot,
    riHasRoot: data.riHasRoot,
    riHasTianGanHelp: data.riHasTianGanHelp
  };
}

// 从格分析渲染（纯HTML生成，数据统一来自 ob._congGeData）
function determineCongGe(ob) {
  var d = ob._congGeData || _computeCongGeData(ob);
  var WXJ = Lunar.WuXingJ;
  var wxKeys = ['mu','huo','tu','jin','shui'];

  var html = '<div class="bz-dingge-title"><i class="ti ti-sparkles"></i> 八字从格</div>';

  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">一、四柱概览</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js + '<br>';
  html += '日主 <span class="bz-dingge-highlight">' + d.riGan + '</span>（五行属' + WXJ[d.riWx] + '）<br>';
  html += '月令 <span class="bz-dingge-gold">' + d.yueZhi + '</span>（' + WXJ[d.yueWx] + '当令）<br>';
  html += '日主根气：' + (d.riHasBenQiRoot ? '<span class="bz-dingge-gold">有本气根（' + d.rootDetail + '）</span>' : (d.riHasRoot ? '<span class="bz-dingge-highlight">无本气根（仅' + d.rootDetail + '）</span>' : '<span class="bz-dingge-highlight">无根</span>')) + '</div></div>';

  html += '<div class="bz-dingge-step">';
  html += '<div class="bz-dingge-step-label">二、全局五行力量评分</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;">';
  html += '<tr style="background:rgba(212,184,102,0.1);"><th style="padding:4px 8px;border:1px solid #D4A574;">五行</th><th style="padding:4px 8px;border:1px solid #D4A574;">木</th><th style="padding:4px 8px;border:1px solid #D4A574;">火</th><th style="padding:4px 8px;border:1px solid #D4A574;">土</th><th style="padding:4px 8px;border:1px solid #D4A574;">金</th><th style="padding:4px 8px;border:1px solid #D4A574;">水</th></tr>';
  html += '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;font-size:11px;">十神计分<br>(从格判定)</td>';
  for (var wx3 = 0; wx3 < 5; wx3++) {
    html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;">' + (d.scores[wxKeys[wx3]] || 0) + '</td>';
  }
  html += '</tr></table>';
  html += '<div style="font-size:12px;line-height:1.8;margin-top:4px;">';
  html += '<strong>五行力量：</strong>生助（印比）<span class="bz-dingge-gold">' + d.wuxingVals.shengzhu + '分（' + d.wuxingVals.shengPct + '%）</span>　克泄耗（财官食伤）<span class="bz-dingge-highlight">' + d.wuxingVals.kexie + '分（' + d.wuxingVals.kexiePct + '%）</span>';
  html += '</div></div></div>';

  html += '<div class="bz-dingge-result">';
  html += '<div class="bz-dingge-geju">';
  html += d.isCong ? '<span class="bz-dingge-highlight">' + d.result + '</span>' : d.result;
  html += '</div>';
  html += '<div class="bz-dingge-grade">格局层次：' + d.grade + '</div>';
  html += '</div>';

  if (d.isCong) {
    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">三、格局判定</div>';
    html += '<div class="bz-dingge-step-body">';
    // 真/假从格判定依据
    var isFalseCong = d.result.indexOf('假') >= 0;
    html += '判定：<span class="bz-dingge-highlight">' + d.result + '</span>（' + (isFalseCong ? '假从' : '真从') + '）<br>';
    html += '从神：<span class="bz-dingge-gold">' + d.congShen + '</span><br>';
    html += '判定依据：克泄耗' + d.wuxingVals.kexiePct + '%（≥80%），日主' + (d.riHasBenQiRoot ? '有本气根' : (d.riHasRoot ? '无本气根（仅' + d.rootDetail + '）' : '完全无根')) + '。<br>';
    if (isFalseCong) {
      html += '<span style="color:#C41E0A;font-weight:700;">假从依据：</span>';
      if (d.hasTianGanBiJie) html += '天干透印/比劫；';
      if (d.hasHiddenYinBi) {
        var hNames = [];
        for (var hi = 0; hi < d.hiddenYinBiList.length; hi++) {
          var h = d.hiddenYinBiList[hi];
          hNames.push(h.pos + '[' + h.zhi + ']藏' + h.gan + '(' + h.kind + ')');
        }
        html += '藏干见印/比劫：' + hNames.join('、') + '；';
      }
      html += '<br>《渊海子平》："若见印绶比肩，虽微亦假。"<br>';
      html += '<span style="color:#D98A20;">⚠ 藏干忌神隐患：逢大运流年引动藏干，印比发力可致破格。见下文大运分析。</span>';
    } else {
      html += '<span style="color:#5D8A7C;font-weight:700;">真从依据：</span>天干地支及藏干均不见印比，全局纯粹顺势。<br>';
      html += '《渊海子平》："从格无根，方论从。纯而不杂者贵。"';
    }
    html += '</div></div>';

    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">四、喜忌划分（子平顺势原则）</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '喜神（顺势）：<span class="bz-dingge-gold">' + d.luckyEl.join('、') + '</span> — ' + d.luckyGan.join('、') + '（' + d.luckyZhi.join('、') + '）<br>';
    html += '忌神（逆势·破格）：<span style="color:#C41E0A;font-weight:700;">' + d.unluckyEl.join('、') + '</span> — ' + d.unluckyGan.join('、') + '（' + d.unluckyZhi.join('、') + '）<br>';
    if (isFalseCong && d.hiddenYinBiList.length > 0) {
      // 按十神类型归类，避免逐条重复
      var yinList = [], biList = [];
      for (var hi2 = 0; hi2 < d.hiddenYinBiList.length; hi2++) {
        var h2 = d.hiddenYinBiList[hi2];
        if (h2.kind.indexOf('印') >= 0) yinList.push(h2.pos + '[' + h2.zhi + ']藏' + h2.gan);
        else biList.push(h2.pos + '[' + h2.zhi + ']藏' + h2.gan);
      }
      // 获取月令本气五行作为描述
      var yueWxNames = ['木','火','土','金','水'];
      var yueBenqi = (typeof _DG_BENQI !== 'undefined') ? _DG_BENQI[ob.b2%12] : '';
      var yueGanIdx = (yueBenqi && typeof _DG_GAN !== 'undefined') ? (_DG_GAN[yueBenqi] || 0) : 0;
      var yueWx = yueWxNames[yueGanIdx >> 1] || '旺';

      html += '<span style="color:#D98A20;">⚠ 藏干忌神破格风险：</span><br>';
      if (yinList.length > 0) {
        html += '· <b>印星隐患</b>（' + yinList.join('、') + '）→ 全局火' + yueWx + '当令，印星深藏暂无大碍。但大运逢金水、流年遇申酉亥子时，藏干得生发力，印星生扶日主 → 破格招灾。<br>';
      }
      if (biList.length > 0) {
        html += '· <b>比劫隐患</b>（' + biList.join('、') + '）→ 比劫助身抗格，逢水运或亥子流年引动，日主得扶 → 从格动摇，事业反复。<br>';
      }
    }
    html += '</div></div>';

    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">五、大运流年（顺逆局分析）</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '<strong>顺局运（顺势而昌）：</strong><span class="bz-dingge-gold">' + d.luckyEl.join('、') + '运</span> — 财源广进，事业顺遂。<br>';
    html += '<strong>逆局破格运（逆势招灾）：</strong><span style="color:#C41E0A;font-weight:700;">' + d.unluckyEl.join('、') + '运</span> — 印比破格，防破财、健康、动荡。<br>';
    if (isFalseCong && d.hiddenYinBiList.length > 0) {
      html += '<span style="color:#D98A20;">⚠ 藏干引动警告：</span>假从格最忌大运/流年引动藏干忌神。如逢申酉（金）运年引动巳中庚金、戌中辛金，印星得生→日主得生扶→破格招灾。逢亥子（水）运年则比劫助身亦凶。<br>';
    }
    html += d.dangerYears + '</div></div>';

    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">六、典籍依据</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '《渊海子平·论从格》："从者，日主无根，四柱无生扶之意，满局财官食伤，日主弱极，不得不从。"<br>';
    html += '《三命通会·卷六》："从弱忌生扶，喜克泄。大运见生扶则灾，见克泄则福。"<br>';
    html += '《滴天髓》："假从者，如人之根浅力薄，不能自立，局中虽有劫印，而自顾不暇，不得不从人也。"<br>';
    html += '《星平会海·从格章》："假从者，藏干见印比，运逢生扶则破。"<br>';
    html += '《穷通宝鉴》："癸水至弱，达于天津。得龙而运，功化斯神。不畏火土，不论庚辛。合戊见火，化象斯真。"</div></div>';
  } else {
    html += '<div class="bz-dingge-step">';
    html += '<div class="bz-dingge-step-label">三、结论</div>';
    html += '<div class="bz-dingge-step-body">日主生助（印比）占比 ' + d.wuxingVals.shengPct + '%、克泄耗（财官食伤）占比 ' + d.wuxingVals.kexiePct + '%' +
      (d.riHasRoot ? '，日主有根' : '') + '，不满足从格条件。此造应按普通格局论命，可参阅「八字定格」及「八字喜用」分析。</div></div>';
  }

  return html;
}
module.exports={
  dayunjl,
  cxcf,
  _DG_RYSL,
  _DG_GEMAP,
  _WX_TO_TG,
  _wxToTenGod,
  _wxToTenGodFull,
  _wxListToTenGods,
  _HUAHE_PAIRS,
  _HUAHE_YUEWU,
  checkHuaGe,
  _JIANLU_ZHI,
  _YANGREN_ZHI,
  evaluateGrade,
  _DM_REL_COEF_SIMPLE,
  _DM_REL_COEF,
  _DM_ROOT_TYPE,
  _DM_STEM_WEIGHT,
  _DM_BRANCH_WEIGHT,
  _DM_LU_DIWANG,
  _DM_KONGWANG,
  _DM_LIUHE,
  _DM_SANHE,
  _DM_SANHUI,
  _DM_CHONG,
  _dmGetRelFull,
  _dmGetRelSimple,
  _assessDayMasterStrength,
  _dinggeGetSiLing,
  _dinggeCheckTouGan,
  _dinggeAnalyzeSizhu,
  determineBaziPattern,
  showBaziAll,
  BaziArchives,
  _bzEsc,
  saveBaziArchive,
  _bzRenderList,
  showBaziArchives,
  closeBaziArchives,
  viewBaziArchive,
  deleteBaziArchive,
  clearAllBaziArchives,
  _noteEditId,
  editBaziNote,
  closeBaziNote,
  saveBaziNote,
  _XYS_SEASON,
  tiaoHouByPattern,
  _XYS_TONGGUAN,
  _DXY_RULES,
  _DXY_CONG_RULES,
  _getXiyongWx,
  _wxInSet,
  _cgToSS,
  _renderNianZhu,
  _renderYueZhu,
  _renderRiZhu,
  _renderShiZhu,
  _renderTiaoHou,
  _renderLiuTong,
  determineXiyongshen,
  _G_HE,
  _G_CHONG,
  _Z_LIUHE,
  _Z_SANHE,
  _Z_BANHE_SHENG,
  _Z_BANHE_MU,
  _Z_SANHUI,
  _Z_LIUCHONG,
  _Z_LIUHAI,
  _Z_SANXING,
  _Z_ZIXING,
  _Z_LIUPO,
  _Z_ANHE,
  _Z_JUE,
  _Z_LIUHE_WX,
  _pillarRelations,
  _computeCongGeData,
  _getCongGeData,
  _computeCongGeDataV2,
  _getCongGeDataV2,
  determineCongGe
};
// ══════ 干支关系简报（新版格式）══════
// 推算依据：
//   天干五合 — 《三命通会》卷三：甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火
//   天干相克 — 五行相克：木克土、火克金、土克水、金克木、水克火
//   地支六合 — 《星平会海》：子丑合土、寅亥合木、卯戌合火、辰酉合金、巳申合水、午未合火
//   地支三合 — 申子辰水局、亥卯未木局、寅午戌火局、巳酉丑金局
//   地支半合 — 生地半合（申子/亥卯/寅午/巳酉）、墓库半合（子辰/卯未/午戌/酉丑）
//   地支三会 — 亥子丑水、寅卯辰木、巳午未火、申酉戌金
//   地支六冲 — 子午、丑未、寅申、卯酉、辰戌、巳亥
//   地支六害 — 子未、丑午、寅巳、卯辰、申亥、酉戌
//   地支三刑 — 子卯(无礼)、寅巳申(恃势)、丑戌未(无恩)
//   地支自刑 — 辰、午、酉、亥
//   地支六破 — 子酉、寅亥、辰丑、午卯、申巳、戌未
function _renderGanZhiBrief(b1,b2,b3,b4) {
  // ═══ 查找表已提升至模块级（行2373-2389），此处复用 _Z_LIUHE / _Z_SANHE 等 ═══
  var gans = [Lunar.Gan[b1%10], Lunar.Gan[b2%10], Lunar.Gan[b3%10], Lunar.Gan[b4%10]];
  var zhis = [Lunar.Zhi[b1%12], Lunar.Zhi[b2%12], Lunar.Zhi[b3%12], Lunar.Zhi[b4%12]];

  // ═══ 去重辅助 ═══
  var seen = {};
  function _add(arr, s) { if (!seen[s]) { seen[s] = 1; arr.push(s); } }

  // ═══ 天干：五合 + 五行相克 ═══
  var ganHe = [], ganKe = [];
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      var k1 = gans[i] + gans[j], k2 = gans[j] + gans[i];
      // 五合
      if (_G_HE[k1]) ganHe.push(k1 + '合化' + _G_HE[k1]);
      else if (_G_HE[k2]) ganHe.push(k2 + '合化' + _G_HE[k2]);
      // 五行相克: stemIdx>>1 = wuxingIdx (0木1火2土3金4水), (a+2)%5==b 即 a克b
      var wi = Lunar.Gan.indexOf(gans[i]) >> 1;
      var wj = Lunar.Gan.indexOf(gans[j]) >> 1;
      if ((wi + 2) % 5 === wj) _add(ganKe, gans[i] + gans[j] + '相克');
      else if ((wj + 2) % 5 === wi) _add(ganKe, gans[j] + gans[i] + '相克');
    }
  }

  // ═══ 地支：全类关系 ═══
  var zhiHe = [], zhiBanHe = [], zhiSanHe = [], zhiSanHui = [];
  var zhiChong = [], zhiHai = [], zhiXing = [], zhiPo = [];

  // 六合
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUHE[zhis[i]] === zhis[j]) {
        var k = zhis[i] < zhis[j] ? zhis[i] + zhis[j] : zhis[j] + zhis[i];
        _add(zhiHe, k + '合化' + (_Z_LIUHE_WX[k] || '土'));
      }
    }
  }

  // 三合局 + 半合
  for (var k3 in _Z_SANHE) {
    var found = [];
    for (var i = 0; i < 4; i++) { if (k3.indexOf(zhis[i]) >= 0) found.push(zhis[i]); }
    // 去重后计数（同支如巳巳不能算两个不同成员）
    var uniqF = []; for (var ui=0;ui<found.length;ui++){if(uniqF.indexOf(found[ui])<0)uniqF.push(found[ui]);}
    if (uniqF.length >= 3) {
      _add(zhiSanHe, k3 + '三合' + _Z_SANHE[k3] + '局');
    } else if (uniqF.length >= 2) {
      var key2 = uniqF.join('');
      var wx2 = _Z_BANHE_SHENG[key2] || _Z_BANHE_MU[key2] || '';
      if (wx2) _add(zhiBanHe, key2 + '半合' + wx2 + '局');
    }
  }

  // 三会局
  for (var h3 in _Z_SANHUI) {
    var f2 = [];
    for (var i = 0; i < 4; i++) { if (h3.indexOf(zhis[i]) >= 0) f2.push(zhis[i]); }
    var uniqH = []; for (var uh=0;uh<f2.length;uh++){if(uniqH.indexOf(f2[uh])<0)uniqH.push(f2[uh]);}
    if (uniqH.length >= 3) _add(zhiSanHui, h3 + '三会' + _Z_SANHUI[h3] + '局');
  }

  // 六冲
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUCHONG[zhis[i]] === zhis[j]) _add(zhiChong, zhis[i] + zhis[j] + '相冲');
    }
  }

  // 六害
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUHAI[zhis[i]] === zhis[j]) _add(zhiHai, zhis[i] + zhis[j] + '相害');
    }
  }

  // 相刑（三刑 + 自刑）
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      var kx = zhis[i] + zhis[j], ky = zhis[j] + zhis[i];
      if (_Z_SANXING[kx] || _Z_SANXING[ky]) {
        _add(zhiXing, (zhis[i] < zhis[j] ? kx : ky) + '相刑');
      }
    }
  }
  // 自刑：同支出现两次以上
  var ziCount = {};
  for (var i = 0; i < 4; i++) {
    var zi = zhis[i];
    ziCount[zi] = (ziCount[zi] || 0) + 1;
    if (_Z_ZIXING[zi] && ziCount[zi] >= 2) _add(zhiXing, zi + zi + '自刑');
  }

  // 六破
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUPO[zhis[i]] === zhis[j]) _add(zhiPo, zhis[i] + zhis[j] + '相破');
    }
  }

  // ═══ 组装：合→克→刑→冲→害→破 顺序 ═══
  var ganOut = ganHe.concat(ganKe).join(',');
  var zhiAll = zhiHe.concat(zhiBanHe).concat(zhiSanHe).concat(zhiSanHui)
    .concat(zhiXing).concat(zhiChong).concat(zhiHai).concat(zhiPo);
  var zhiOut = zhiAll.join(',');

  return {
    gan: ganOut || '天干无特殊关系',
    zhi: zhiOut || '地支无刑冲害合'
  };
}

global._renderGanZhiBrief = _renderGanZhiBrief;
// MD格局函数已移至core/patterns.js


function _computeCongGeDataV2(ob) {
  var ganArr = [ob.bz_jn[0], ob.bz_jy[0], ob.bz_jr[0], ob.bz_js[0]];
  var zhiArr = [ob.bz_jn[1], ob.bz_jy[1], ob.bz_jr[1], ob.bz_js[1]];
  var riGan = ganArr[2];
  var riGanIdx = Lunar.Gan.indexOf(riGan);
  var riWx = _cgGanWx(riGan);
  var yueZhi = zhiArr[1];
  var yueZhiIdx = Lunar.Zhi.indexOf(yueZhi);
  var wxKeys = ['mu','huo','tu','jin','shui'];
  var WXJ = Lunar.WuXingJ;
  // 月令主宰天干索引（用于季节旺相休囚死权重）
  var i6 = Lunar.DZhuQ[yueZhiIdx];

  // === 第1步：五行力量打分（含季节权重 LiLiang 乘数）===
  var scores = { mu:0, huo:0, tu:0, jin:0, shui:0 };
  var shengZhuTotal = 0, keXieTotal = 0;
  var detailLines = [];

  // 天干（基础10/12分 × 季节权重）
  for (var i = 0; i < 4; i++) {
    var g = ganArr[i];
    var gIdx = Lunar.Gan.indexOf(g);
    var wx = gIdx >> 1;
    var kind = _cgSSKind(riGanIdx, gIdx);
    var basePts = (i === 2) ? 12 : 10;
    var multIdx = Qiulq(gIdx, i6);
    var mult = (multIdx >= 1 && multIdx <= 10) ? Lunar.LiLiang[multIdx] : 1.0;
    var pts = Math.round(basePts * mult);
    scores[wxKeys[wx]] = (scores[wxKeys[wx]] || 0) + pts;
    if (_cgIsShengZhu(kind)) shengZhuTotal += pts; else keXieTotal += pts;
    detailLines.push({ pos:'天干·' + ['年','月','日','时'][i], gan:g, wx:WXJ[wx], pts:pts, kind:kind });
  }

  // 地支藏干（四生支16:8:4，四库支18:9:3，丑特殊5:7）× 季节权重，月令+5分不加乘
  // 参照《渊海子平》藏干体系
  var _SI_SHENG = {0:1,3:1,6:1,9:1}; // 寅=2,巳=5,申=8,亥=11 -> 0-index: 2,5,8,11
  var _isSiSheng = {2:1,5:1,8:1,11:1};
  for (var j = 0; j < 4; j++) {
    var zIdx = Lunar.Zhi.indexOf(zhiArr[j]);
    var benQi = _DG_BENQI[zIdx];
    var zhongQi = _DG_ZHONGQI[zIdx];
    var yuQi = _DG_YUQI[zIdx];
    var posLabel = '地支·' + ['年','月','日','时'][j];
    // 四生支(寅巳申亥) 16:8:4, 四库支(辰戌丑未) 18:9:3, 子午卯酉无余气
    var isSiSheng = _isSiSheng[zIdx] ? true : false;
    var baseBQ = isSiSheng ? 16 : 18;
    var baseZQ = isSiSheng ? 8 : 9;
    var baseYQ = isSiSheng ? 4 : 3;
    // 丑特殊：中气5余气7（本气仍18）
    if (zIdx === 1) { baseZQ = 5; baseYQ = 7; }

    var benQiIdx = Lunar.Gan.indexOf(benQi);
    if (benQiIdx >= 0) {
      var multBQIdx = Qiulq(benQiIdx, i6);
      var multBQ = (multBQIdx >= 1 && multBQIdx <= 10) ? Lunar.LiLiang[multBQIdx] : 1.0;
      var ptsBQ = Math.round(baseBQ * multBQ);
      // 月令额外加成5分（不加乘数，为纯粹月令权重）
      if (j === 1) ptsBQ += 5;
      var wxBQ = benQiIdx >> 1;
      var kindBQ = _cgSSKind(riGanIdx, benQiIdx);
      scores[wxKeys[wxBQ]] = (scores[wxKeys[wxBQ]] || 0) + ptsBQ;
      if (_cgIsShengZhu(kindBQ)) shengZhuTotal += ptsBQ; else keXieTotal += ptsBQ;
      detailLines.push({ pos:posLabel+'本气', gan:benQi, wx:WXJ[wxBQ], pts:ptsBQ, kind:kindBQ });
    }
    if (zhongQi) {
      var zqIdx = Lunar.Gan.indexOf(zhongQi);
      if (zqIdx >= 0) {
        var multZQIdx = Qiulq(zqIdx, i6);
        var multZQ = (multZQIdx >= 1 && multZQIdx <= 10) ? Lunar.LiLiang[multZQIdx] : 1.0;
        var ptsZQ = Math.round(baseZQ * multZQ);
        var wxZQ = zqIdx >> 1;
        var kindZQ = _cgSSKind(riGanIdx, zqIdx);
        scores[wxKeys[wxZQ]] = (scores[wxKeys[wxZQ]] || 0) + ptsZQ;
        if (_cgIsShengZhu(kindZQ)) shengZhuTotal += ptsZQ; else keXieTotal += ptsZQ;
        detailLines.push({ pos:posLabel+'中气', gan:zhongQi, wx:WXJ[wxZQ], pts:ptsZQ, kind:kindZQ });
      }
    }
    if (yuQi) {
      var yqIdx = Lunar.Gan.indexOf(yuQi);
      if (yqIdx >= 0) {
        var multYQIdx = Qiulq(yqIdx, i6);
        var multYQ = (multYQIdx >= 1 && multYQIdx <= 10) ? Lunar.LiLiang[multYQIdx] : 1.0;
        var ptsYQ = Math.round(baseYQ * multYQ);
        var wxYQ = yqIdx >> 1;
        var kindYQ = _cgSSKind(riGanIdx, yqIdx);
        scores[wxKeys[wxYQ]] = (scores[wxKeys[wxYQ]] || 0) + ptsYQ;
        if (_cgIsShengZhu(kindYQ)) shengZhuTotal += ptsYQ; else keXieTotal += ptsYQ;
        detailLines.push({ pos:posLabel+'余气', gan:yuQi, wx:WXJ[wxYQ], pts:ptsYQ, kind:kindYQ });
      }
    }
  }

  // === 第2步：日主根气检查 ===
  var riHasRoot = false, riHasBenQiRoot = false, rootDetail = '';
  for (var rj = 0; rj < 4; rj++) {
    var rzIdx = Lunar.Zhi.indexOf(zhiArr[rj]);
    var rbenQi = _DG_BENQI[rzIdx];
    var rzhongQi = _DG_ZHONGQI[rzIdx];
    var ryuQi = _DG_YUQI[rzIdx];
    var rLabel = zhiArr[rj];
    if (_cgGanWx(rbenQi) === riWx) { riHasRoot = true; riHasBenQiRoot = true; rootDetail = rLabel + '本气' + rbenQi; break; }
    if (rzhongQi && _cgGanWx(rzhongQi) === riWx) { riHasRoot = true; rootDetail = rLabel + '中气' + rzhongQi; }
    if (!riHasRoot && ryuQi && _cgGanWx(ryuQi) === riWx) { riHasRoot = true; rootDetail = rLabel + '余气' + ryuQi; }
  }

  // === 第3步：藏干印比检测（真/假从格关键判定）===
  // 《渊海子平》: "若见印绶比肩，虽微亦假"
  var hasHiddenYinBi = false;   // 藏干中是否有印/比劫（本气除外，本气已单独判断）
  var hiddenYinBiList = [];     // [{pos, gan, kind, zhi}]
  var hasTianGanBiJie = false;  // 天干（除日主外）是否透印/比劫
  // 检测天干
  for (var tg = 0; tg < 4; tg++) {
    if (tg === 2) continue; // 跳过日主
    var tgIdx = Lunar.Gan.indexOf(ganArr[tg]);
    var tgKind = _cgSSKind(riGanIdx, tgIdx);
    if (_cgIsShengZhu(tgKind)) hasTianGanBiJie = true;
  }
  // 检测藏干（中气、余气中的印/比劫）
  for (var hj = 0; hj < 4; hj++) {
    var hzIdx = Lunar.Zhi.indexOf(zhiArr[hj]);
    var hzhongQi = _DG_ZHONGQI[hzIdx];
    var hyuQi = _DG_YUQI[hzIdx];
    if (hzhongQi) {
      var hzqIdx = Lunar.Gan.indexOf(hzhongQi);
      if (hzqIdx >= 0) {
        var hzqKind = _cgSSKind(riGanIdx, hzqIdx);
        if (_cgIsShengZhu(hzqKind)) {
          hasHiddenYinBi = true;
          hiddenYinBiList.push({pos: ['年','月','日','时'][hj]+'支', gan: hzhongQi, kind: hzqKind, zhi: zhiArr[hj]});
        }
      }
    }
    if (hyuQi) {
      var hyqIdx = Lunar.Gan.indexOf(hyuQi);
      if (hyqIdx >= 0) {
        var hyqKind = _cgSSKind(riGanIdx, hyqIdx);
        if (_cgIsShengZhu(hyqKind)) {
          hasHiddenYinBi = true;
          hiddenYinBiList.push({pos: ['年','月','日','时'][hj]+'支', gan: hyuQi, kind: hyqKind, zhi: zhiArr[hj]});
        }
      }
    }
  }

  // === 第4步：月令分析 ===
  var yueBenQi = _DG_BENQI[yueZhiIdx];
  var yueWx = _cgGanWx(yueBenQi);
  var yueSSKind = _cgSSKind(riGanIdx, Lunar.Gan.indexOf(yueBenQi));
  var yueIsYinBi = _cgIsShengZhu(yueSSKind);

  // === 十神分项得分 ===
  var ssScores = { '印':0, '比':0, '财':0, '官':0, '食伤':0 };
  for (var dl = 0; dl < detailLines.length; dl++) {
    ssScores[detailLines[dl].kind] = (ssScores[detailLines[dl].kind] || 0) + detailLines[dl].pts;
  }

  // === 月令加成 + 日主无根减半 ===
  var yueBonus = Math.round(ssScores[yueSSKind] * 0.2);
  if (yueBonus > 0) {
    if (_cgIsShengZhu(yueSSKind)) shengZhuTotal += yueBonus; else keXieTotal += yueBonus;
  }
  if (!riHasBenQiRoot) shengZhuTotal -= 6;
  var totalScore = shengZhuTotal + keXieTotal;
  var shengPct = totalScore > 0 ? Math.round(shengZhuTotal / totalScore * 1000) / 10 : 0;
  var keXiePct = totalScore > 0 ? Math.round(keXieTotal / totalScore * 1000) / 10 : 0;

  // === 第5步：从旺/从弱判定 ===
  var result = '', congShen = '', grade = '';
  var luckyEl = [], unluckyEl = [];
  var congShenWx = -1;
  var luckyWx = [], unluckyWx = [];

  var maxScore = -1, maxWx = '';
  for (var wx2 = 0; wx2 < 5; wx2++) {
    if (scores[wxKeys[wx2]] > maxScore) { maxScore = scores[wxKeys[wx2]]; maxWx = WXJ[wx2]; }
  }

  // 《子平真诠》从旺判定：生助>=80%即为从旺，月令是否印比决定真假
  if (shengPct >= 80) {
    if (!yueIsYinBi) {
      // 月令非印比但生助极旺→假从旺（仍为从格）
      result = '假从旺格'; congShen = '印比'; grade = '中等';
      luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
    } else if (ssScores['印'] > ssScores['比']) {
      result = '从旺格·从印'; congShen = '印星'; congShenWx = (riWx + 4) % 5;
      luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      grade = '上等';
    } else {
      var sameWxCount = 0;
      for (var pg = 0; pg < 4; pg++) { if (_cgGanWx(ganArr[pg]) === riWx) sameWxCount++; }
      if (sameWxCount >= 3) {
        var zhuanwangNames = ['曲直格(木)', '炎上格(火)', '稼穑格(土)', '从革格(金)', '润下格(水)'];
        result = '专旺格·' + zhuanwangNames[riWx];
      } else { result = '从旺格·从比'; }
      congShen = '比劫'; congShenWx = riWx;
      luckyEl = ['比劫', '印']; unluckyEl = ['财', '官杀', '食伤'];
      luckyWx = [(riWx + 4) % 5, riWx];
      unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      grade = '上等';
    }
  } else if (shengPct >= 65 && shengPct < 80) {
    result = '假从旺格'; congShen = '印比';
    luckyEl = ['印', '比劫']; unluckyEl = ['财', '官杀'];
    luckyWx = [(riWx + 4) % 5, riWx];
    unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
    grade = '中等';
  } else if (keXiePct >= 80 && !riHasBenQiRoot && !hasTianGanBiJie) {  // V2: 天干见印比→不从
    // 《渊海子平》: 藏干见印比则假从，纯顺势则真从
    var isFalseCongRuo = hasHiddenYinBi || hasTianGanBiJie;
    var prefix = isFalseCongRuo ? '假' : '真';
    if (ssScores['财'] > ssScores['官'] && ssScores['财'] > ssScores['食伤']) {
      result = prefix + '从弱格·从财'; congShen = '财星'; congShenWx = (riWx + 2) % 5;
      luckyEl = ['食伤', '财']; unluckyEl = ['印', '比劫'];
      luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx];
    } else if (ssScores['官'] > ssScores['财'] && ssScores['官'] > ssScores['食伤']) {
      result = prefix + '从弱格·从官杀'; congShen = '官杀'; congShenWx = (riWx + 3) % 5;
      luckyEl = ['财', '官杀']; unluckyEl = ['印', '比劫', '食伤'];
      luckyWx = [(riWx + 2) % 5, (riWx + 3) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx, (riWx + 1) % 5];
    } else if (ssScores['食伤'] > ssScores['财'] && ssScores['食伤'] > ssScores['官']) {
      result = prefix + '从弱格·从儿(食伤)'; congShen = '食伤'; congShenWx = (riWx + 1) % 5;
      luckyEl = ['比劫', '食伤', '财']; unluckyEl = ['印'];
      luckyWx = [riWx, (riWx + 1) % 5, (riWx + 2) % 5];
      unluckyWx = [(riWx + 4) % 5];
    } else {
      result = prefix + '从弱格·从势'; congShen = maxWx;
      luckyEl = ['食伤', '财', '官杀']; unluckyEl = ['印', '比劫'];
      luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
      unluckyWx = [(riWx + 4) % 5, riWx];
    }
    grade = isFalseCongRuo ? '上等（假从·有破格风险）' : '上等（真从·纯粹）';
  } else if (keXiePct >= 65 && keXiePct < 80 && !riHasBenQiRoot && !hasTianGanBiJie) {  // V2: 天干见印比→不从
    // 65-80%区间：自动判为假从弱格
    result = '假从弱格'; congShen = '异党';
    luckyEl = ['食伤', '财', '官杀']; unluckyEl = ['印', '比劫'];
    luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
    unluckyWx = [(riWx + 4) % 5, riWx];
    grade = '中等';
  } else {
    result = '非从格'; congShen = '—'; grade = '—';
  }

  var isCong = result.indexOf('从') >= 0 && result !== '非从格';

  // 动态生成大运流年提示（从 luckyWx/unluckyWx 推导，禁止硬编码）
  var WXJ = Lunar.WuXingJ; // ['木','火','土','金','水']
  var wxToZhi = [['寅','卯'],['巳','午'],['辰','戌','丑','未'],['申','酉'],['亥','子']];
  var buildWxZhiStr = function(wxArr) {
    var parts = [];
    for (var wi = 0; wi < wxArr.length; wi++) {
      var wxIdx = wxArr[wi];
      var zhiArr = wxToZhi[wxIdx] || [];
      parts.push(zhiArr.join('') + '（' + WXJ[wxIdx] + '）');
    }
    return parts.join('、');
  };
  var luckyZyStr = buildWxZhiStr(luckyWx);
  var unluckyZyStr = buildWxZhiStr(unluckyWx);

  var dangerYears = '';
  if (isCong && unluckyEl.length > 0) {
    // 大运：忌神十神运破格 / 流年：忌神地支旺年
    dangerYears = '大运见<span style="color:#C41E0A;font-weight:700;">' + unluckyEl.join('、') + '</span>运则破格。<br><br>';
    dangerYears += '流年吉凶：<br>';
    dangerYears += '· <span style="color:#5D8A7C;font-weight:700;">喜</span> ' + luckyZyStr + ' 旺年，顺势而昌；<br>';
    dangerYears += '· <span style="color:#C41E0A;font-weight:700;">忌</span> ' + unluckyZyStr + ' 旺年，逆势则破格招灾。<br>';
    // 平运提示：五行中不在喜神也不在忌神的，列为平运
    var neutralWx = [];
    for (var nw = 0; nw < 5; nw++) {
      if (luckyWx.indexOf(nw) < 0 && unluckyWx.indexOf(nw) < 0) neutralWx.push(nw);
    }
    if (neutralWx.length > 0) {
      dangerYears += '· 平运：' + buildWxZhiStr(neutralWx) + ' 旺年，不生克格局，可作平运。';
    }
  }

  var wxToGan = [['甲','乙'],['丙','丁'],['戊','己'],['庚','辛'],['壬','癸']];

  // 直接引用 dcwxll 主系统计算结果（唯一权威五行力量数据源）
  var wxVD = ob._wuxingVals || { mu:0,huo:0,tu:0,jin:0,shui:0,total:0 };
  var dcwxSz = ob._shengzhu || 0;   // 生助=印(生我)+比(同我)，直接来自 dcwxll
  var dcwxKx = ob._kexie || 0;      // 克泄耗，直接来自 dcwxll
  var dcwxTotal = dcwxSz + dcwxKx;
  var dcwxSzPct = dcwxTotal > 0 ? Math.round(dcwxSz / dcwxTotal * 1000) / 10 : 0;
  var dcwxKxPct = dcwxTotal > 0 ? Math.round(dcwxKx / dcwxTotal * 1000) / 10 : 0;

  var data = {
    ganArr: ganArr, zhiArr: zhiArr,
    riGan: riGan, riGanIdx: riGanIdx, riWx: riWx,
    yueZhi: yueZhi, yueZhiIdx: yueZhiIdx,
    scores: scores, detailLines: detailLines,
    shengZhuTotal: shengZhuTotal, keXieTotal: keXieTotal,
    totalScore: totalScore, shengPct: shengPct, keXiePct: keXiePct,
    riHasRoot: riHasRoot, riHasBenQiRoot: riHasBenQiRoot, rootDetail: rootDetail,
    hasHiddenYinBi: hasHiddenYinBi, hiddenYinBiList: hiddenYinBiList,
    hasTianGanBiJie: hasTianGanBiJie,
    // H6 fix: 计算天干是否有印比生助
    riHasTianGanHelp: (function() {
      var ganFull2 = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
      for (var tg2 = 0; tg2 < 4; tg2++) {
        if (tg2 === 2) continue;
        var tkind2 = _cgSSKind(riGanIdx, ganFull2[tg2]);
        if (_cgIsShengZhu(tkind2)) return true;
      }
      return false;
    })(),
    yueBenQi: yueBenQi, yueWx: yueWx, yueIsYinBi: yueIsYinBi, yueSSKind: yueSSKind,
    ssScores: ssScores,
    result: result, congShen: congShen, congType: isCong ? result : null,
    luckyEl: luckyEl, unluckyEl: unluckyEl,
    luckyWx: luckyWx, unluckyWx: unluckyWx,
    congShenWx: congShenWx,
    grade: grade, dangerYears: dangerYears, isCong: isCong,
    // 主计算五行力量（dcwxll体系，与 bzinfo 生克制化卡、日主强弱卡数值一致）
    wuxingVals: { mu: wxVD.mu, huo: wxVD.huo, tu: wxVD.tu, jin: wxVD.jin, shui: wxVD.shui,
                  total: wxVD.total, shengzhu: dcwxSz, kexie: dcwxKx,
                  shengPct: dcwxSzPct, kexiePct: dcwxKxPct },
    luckyGan: luckyWx.map(function(w){ return wxToGan[w].join('、'); }),
    luckyZhi: luckyWx.map(function(w){ return wxToZhi[w].join('、'); }),
    unluckyGan: unluckyWx.map(function(w){ return wxToGan[w].join('、'); }),
    unluckyZhi: unluckyWx.map(function(w){ return wxToZhi[w].join('、'); })
  };

  ob._congGeDataV2 = data;
  return data;
}

// 从格数据读取接口（读缓存，供 determinateXiyongshen 使用）



// V2 引擎辅助 — 读缓存
function _getCongGeDataV2(ob) {
  if (!ob._congGeDataV2) _computeCongGeDataV2(ob);
  var d = ob._congGeDataV2;
  if (!d.isCong) return null;
  return {
    congType: d.congType, shengPct: d.shengPct, keXiePct: d.keXiePct,
    luckyWx: d.luckyWx, unluckyWx: d.unluckyWx,
    luckyEl: d.luckyEl, unluckyEl: d.unluckyEl,
    congShen: d.congShen, congShenWx: d.congShenWx,
    hasTianGanBiJie: d.hasTianGanBiJie, hasHiddenYinBi: d.hasHiddenYinBi,
    hiddenYinBiList: d.hiddenYinBiList, grade: d.grade,
    scores: d.scores, riHasRoot: d.riHasRoot,
    result: d.result, isCong: d.isCong
  };
}
