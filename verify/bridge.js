/**
 * bridge.js — 八字双管道验证桥接
 *
 * 用法:
 *   node bridge.js legacy <input.json>     → stdout: JSON
 *   node bridge.js modern <input.json>     → stdout: JSON
 *
 * 依赖：h:/Phone/core/index.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

// ═══ 桩环境 ═══
function _stub(name, val) {
  try { global[name] = val; }
  catch(e) { Object.defineProperty(global, name, {value:val, writable:true, configurable:true}); }
}
_stub('window', global);
_stub('navigator', { userAgent:'Node/verify', platform:'Win32' });
_stub('matchMedia', function(){return{matches:false,addEventListener:function(){},removeEventListener:function(){}};});
_stub('document', {getElementById:function(){return null},createElement:function(){return{style:{},appendChild:function(){}}},body:{classList:{add:function(){},remove:function(){}}}});
_stub('localStorage', {_d:{},getItem:function(k){return this._d[k]||null},setItem:function(k,v){this._d[k]=v}});
global.Cal3=null; global.Cal4=null; global.Cal2=null; global.YMBG=null;
global.Cal_y={value:'2024'}; global.Cal_m={value:'6'};
global.Sel2s={vJ:0, vW:0, options:[{value:'0',text:'默认'}]};
global.get_year_screen=function(y){return parseInt(y)||2024;};
global.get_month_screen=function(m){return parseInt(m)||1;};
global.showToast=function(){};
global._fmtShensha=function(gg){return gg||'';};
global.renderBaziTable=function(){return'';};
global.renderDayunTable=function(){return'';};

// ═══ 抑制模块加载时的 stdout 日志 ═══
var _origLog = console.log;
console.log = function(){};
// ═══ 加载 core/ (含 vm 沙箱 + 双管道) ═══
var core = require('../core/index.js');
// 恢复日志
console.log = _origLog;

// ═══ 辅助函数 ═══
var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var GAN_IDX = {'甲':0,'乙':1,'丙':2,'丁':3,'戊':4,'己':5,'庚':6,'辛':7,'壬':8,'癸':9};
var ZHI_IDX = {'子':0,'丑':1,'寅':2,'卯':3,'辰':4,'巳':5,'午':6,'未':7,'申':8,'酉':9,'戌':10,'亥':11};

function pillarToGZ(pillar) {
  var g = GAN_IDX[pillar[0]], z = ZHI_IDX[pillar[1]];
  var i = g;
  while (i % 12 !== z) i += 10;
  return i;
}

function pillarsToIndices(pillars) {
  return pillars.map(function(p) { return pillarToGZ(p); });
}

function gzToPillar(gzIdx) {
  return GAN[gzIdx % 10] + ZHI[gzIdx % 12];
}

function baziFromIndices(b1, b2, b3, b4) {
  return gzToPillar(b1) + ' ' + gzToPillar(b2) + ' ' + gzToPillar(b3) + ' ' + gzToPillar(b4);
}

function makeOb(b1, b2, b3, b4) {
  return {
    b1:b1, b2:b2, b3:b3, b4:b4,
    bz_jn: gzToPillar(b1),
    bz_jy: gzToPillar(b2),
    bz_jr: gzToPillar(b3),
    bz_js: gzToPillar(b4),
    bz_jd: 2445730, name:'', sex:1
  };
}

// ═══════════════════════════════════════════════════════
// LEGACY 管道分析 (tyme4j)
// ═══════════════════════════════════════════════════════
function analyzeLegacy(b1, b2, b3, b4) {
  var ob = makeOb(b1, b2, b3, b4);
  var cd = core._computeCongGeData(ob);

  var geName = '未知格局';
  try {
    if (cd && cd.isCong) {
      geName = cd.congType;
    } else {
      var riGanIdx = b3 % 10, mb = b2 % 12;
      var BENQI = core._DG_BENQI[mb];
      var bqIdx = core._DG_GAN[BENQI];
      if (bqIdx !== undefined) {
        geName = (typeof Lunar !== 'undefined' && Lunar.sshen)
          ? Lunar.sshen(riGanIdx, bqIdx) + '格' : '十神格';
      }
    }
  } catch(e) { geName = '计算异常'; }

  // 从格数据
  var patternDetail = '', warnings = [];
  if (cd) {
    if (cd.isCong) {
      patternDetail = '从格: ' + (cd.congType||'未知') + ' | 生助'+(cd.shengPct||0)+'% 克泄耗'+(cd.keXiePct||0)+'%';
    } else {
      patternDetail = '非从格 | 生助'+(cd.shengPct||0)+'% 克泄耗'+(cd.keXiePct||0)+'%';
    }
    if (cd.result) patternDetail += ' | ' + cd.result;
    if (cd.scores) warnings.push('⚠️ 旧管道使用固定分值(12/10/8/4/2)打分体系，无权威典籍支持');
  }

  // 喜用神 (从 _computeCongGeData 推导)
  var xiyong = 'N/A', xiyongReason = '';
  try {
    if (cd && cd.isCong) {
      if (cd.congType === '从财格') { xiyong = '财星'; xiyongReason = '从财格用神=财星(从神)'; }
      else if (cd.congType === '从杀格') { xiyong = '官杀'; xiyongReason = '从杀格用神=官杀(从神)'; }
      else if (cd.congType === '从儿格') { xiyong = '食伤'; xiyongReason = '从儿格用神=食伤(从神)'; }
      else { xiyong = '异党'; xiyongReason = '从格用神=所从之神'; }
    } else if (cd) {
      if (cd.shengPct >= cd.keXiePct) {
        xiyong = '克泄耗类(官杀/食伤/财星)';
        xiyongReason = '身强(生助'+cd.shengPct+'%≥'+cd.keXiePct+'%)→宜泄克耗';
      } else {
        xiyong = '生扶类(印星/比劫)';
        xiyongReason = '身弱(克泄耗'+cd.keXiePct+'%>'+cd.shengPct+'%)→宜生扶';
      }
    }
  } catch(e) { xiyongReason = '推导异常: '+e.message; }

  return {
    pattern: geName,
    congType: cd ? (cd.congType||'非从格') : 'N/A',
    isCong: cd ? !!cd.isCong : false,
    keXiePct: cd ? (cd.keXiePct||0) : 0,
    shengPct: cd ? (cd.shengPct||0) : 0,
    yongshen: xiyong,
    reasoning: patternDetail + ' | ' + xiyongReason,
    verified_by: ['code_review'],
    warnings: warnings
  };
}

// ═══════════════════════════════════════════════════════
// MODERN 管道分析 (MD 对齐)
// ═══════════════════════════════════════════════════════
function analyzeModern(b1, b2, b3, b4) {
  var ob = makeOb(b1, b2, b3, b4);
  var warnings = [];

  var wxCalc;
  try {
    wxCalc = core._computeAllWuxing(ob);
  } catch(e) {
    return {pattern:'N/A', yongshen:'N/A', reasoning:'_computeAllWuxing异常: '+e.message, verified_by:[], warnings:['⚠️ 五行计算失败']};
  }

  var md;
  try {
    if (typeof core._baziAnalysisWithTrace === 'function') {
      md = core._baziAnalysisWithTrace(ob, wxCalc);
    } else if (typeof core._baziAnalysis_md === 'function') {
      md = core._baziAnalysis_md(ob, wxCalc);
    }
  } catch(e) {
    return {pattern:'N/A', yongshen:'N/A', reasoning:'_baziAnalysis异常: '+e.message, verified_by:[], warnings:['⚠️ MD管道分析失败']};
  }

  if (!md || !md.pattern) {
    return {pattern:'N/A', yongshen:'N/A', reasoning:'MD管道返回空', verified_by:[], warnings:['⚠️ MD管道返回空']};
  }

  var patternName = md.pattern.type || '未知';
  if (md.pattern.isCong) patternName = md.pattern.congType || md.pattern.type;

  var xiyong = md.xiyong && md.xiyong.useGod ? md.xiyong.useGod.element : 'N/A';
  var likeGod = md.xiyong && md.xiyong.likeGod ? md.xiyong.likeGod.element : '';
  var fearGod = md.xiyong && md.xiyong.fearGod ? md.xiyong.fearGod.element : '';

  var rp = [];
  rp.push('日主'+ (md.dayMaster||'?') + (md.dayMasterWx||'') + ' | 强度'+ (md.strengthLevel||'?') + ' | 占比'+ (md.strengthPct||0) + '%');
  if (md.pattern.isCong) rp.push('从格: '+patternName+' (§4.2-4.3)');
  else if (md.pattern.isHua) rp.push('化气格: '+(md.pattern.huaType||'')+' (§4.3.6)');
  else rp.push('正格: '+(md.zhengge?md.zhengge.type:patternName)+' | '+(md.zhengge?md.zhengge.source:''));
  if (md.pattern.status) rp.push('格局'+md.pattern.status);
  if (md.pattern.grade) rp.push(md.pattern.grade);
  if (md.verify && !md.verify.passed) rp.push('验算未通过: '+(md.verify.issues||[]).join('; '));
  if (md.xiyong && md.xiyong.tiaoHou && md.xiyong.tiaoHou.needed) rp.push('调候: '+md.xiyong.tiaoHou.element+' — '+md.xiyong.tiaoHou.reason);

  var classicRefs = [];
  if (md.pattern.isCong) classicRefs.push('§4.2从格五条件');
  if (md.pattern.isHua) classicRefs.push('§4.3.6化气格');
  if (!md.pattern.isCong && !md.pattern.isHua) classicRefs.push('§3.3月令透干定格');
  if (md.xiyong) classicRefs.push('§5.2-5.4喜用神推导');
  if (md.verify) classicRefs.push('§6.2自洽验算');

  return {
    pattern: patternName,
    isCong: md.pattern.isCong||false,
    isHua: md.pattern.isHua||false,
    yongshen: xiyong, likeGod: likeGod, fearGod: fearGod,
    strengthLevel: md.strengthLevel||'?', strengthPct: md.strengthPct||0,
    verifyPassed: md.verify ? md.verify.passed : null,
    reasoning: rp.join(' | '),
    classicRef: classicRefs.length>0 ? classicRefs.join(', ') : 'N/A',
    verified_by: ['md_document','regression_test'],
    warnings: warnings
  };
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
var mode = process.argv[2] || 'modern';
var inputFile = process.argv[3];

var cases;
if (inputFile) {
  try {
    cases = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  } catch(e) {
    process.stderr.write('ERROR: cannot read input file: ' + e.message + '\n');
    process.exit(1);
  }
} else {
  // fallback: stdin
  var inputChunks = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(chunk) { inputChunks.push(chunk); });
  process.stdin.on('end', function() {
    try {
      run(JSON.parse(inputChunks.join('')));
    } catch(e) {
      process.stderr.write('JSON parse error: ' + e.message + '\n');
      process.exit(1);
    }
  });
  return;
}

run(cases);

function run(cases) {
  var results = [];
  for (var i = 0; i < cases.length; i++) {
    var tc = cases[i];
    var bIdx;
    if (tc.pillars && tc.pillars.length === 4) {
      bIdx = pillarsToIndices(tc.pillars);
    } else {
      bIdx = [tc.b1, tc.b2, tc.b3, tc.b4];
    }
    var b1 = bIdx[0], b2 = bIdx[1], b3 = bIdx[2], b4 = bIdx[3];

    var analysis;
    if (mode === 'legacy') {
      analysis = analyzeLegacy(b1, b2, b3, b4);
    } else {
      analysis = analyzeModern(b1, b2, b3, b4);
    }

    var baziStr = tc.pillars ? tc.pillars.join(' ') : baziFromIndices(b1, b2, b3, b4);

    results.push({
      id: tc.id, bazi: baziStr, sex: tc.sex||'乾', desc: tc.desc||'', source: tc.source||'',
      pattern: analysis.pattern, isCong: analysis.isCong||false, isHua: analysis.isHua||false,
      yongshen: analysis.yongshen||'N/A', likeGod: analysis.likeGod||'', fearGod: analysis.fearGod||'',
      strengthLevel: analysis.strengthLevel||'', strengthPct: analysis.strengthPct||0,
      keXiePct: analysis.keXiePct||0, shengPct: analysis.shengPct||0,
      reasoning: analysis.reasoning||'', classicRef: analysis.classicRef||'',
      verified_by: analysis.verified_by||[], verifyPassed: analysis.verifyPassed,
      warnings: analysis.warnings||[]
    });
  }
  process.stdout.write(JSON.stringify(results, null, 2));
}
