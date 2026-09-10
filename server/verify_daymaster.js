// server/verify_daymaster.js
// ════════════════════════════════════════════════════════════════════════
// 日主强弱 · 权威判定引擎 审计
// 依据《日主强弱判定方法研究与实现方案.md》§5 方案二 A/B 比值 7 级 + §6.1 墓库根
// 验证：覆盖层引擎 computeDayMasterStrength 对各经典格局给出权威 7 级结论，
//       且关煞三得法（computeXiaoErGuanSha）的 身强身弱 与主体口径一致。
// 运行：npm run test:daymaster
// ════════════════════════════════════════════════════════════════════════
'use strict';

var dm = require('./lib/daymaster-strength.js');
var guansha = require('./lib/guansha-rules.js');

var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 由天干/地支序号求干支序号（0-59，n%10=天干，n%12=地支）
function gz(g, z) {
  for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return n;
  throw new Error('非法干支 g=' + g + ' z=' + z);
}
// 构造极简 ob（仅 b1-b4，引擎只读取天干地支序号）
function mk(yG, yZ, mG, mZ, dG, dZ, hG, hZ) {
  return { b1: gz(yG, yZ), b2: gz(mG, mZ), b3: gz(dG, dZ), b4: gz(hG, hZ) };
}

var STRONG = ['比较旺', '很旺', '旺极'];
var WEAK = ['弱极', '很弱', '比较弱'];

// ── 黄金样本 ──
// expect 可为字符串或数组（边界档位）；dedi 为预期「得地」布尔（核心规则校验）
var cases = [
  { name: '甲日寅月（木旺得令·比劫多）', ob: mk(0, 0, 2, 2, 0, 2, 0, 0),
    expect: '很旺', dedi: true,
    note: '寅月木旺→得令；日支寅本气甲木→得地；三甲比劫→得势。应旺。' },

  { name: '甲日申月（木死失令）', ob: mk(4, 8, 8, 8, 0, 0, 1, 1),
    expect: ['比较弱', '很弱', '平衡'], dedi: false, deling: false,
    note: '申月秋金，木死→失令；四支无木根→失地；申中壬水暗生+甲乙比劫，A/B∈弱/平衡区，然绝不失旺。' },

  { name: '乙日未月（阴干库根不计·核心规则）', ob: mk(5, 7, 9, 7, 1, 9, 7, 5),
    expect: ['很弱', '比较弱'], dedi: false,
    note: '未为木库余气乙，阴干逢库无用→得地=false（§6.1）；失令，仅天干乙比劫得势。' },

  { name: '丙日午月（火旺得令）', ob: mk(2, 6, 4, 6, 2, 6, 2, 6),
    expect: ['比较旺', '很旺'], dedi: true,
    note: '午月火相旺→得令；支午本气丁火→得地；丙比劫→得势。A/B≈2.3→比较旺（仍属旺类）。' },

  { name: '壬日戌月（水死·印比生扶）', ob: mk(6, 6, 8, 10, 8, 6, 3, 7),
    expect: ['比较弱', '很弱'], dedi: false,
    note: '戌月四季，水死→失令；四支无水土根→失地；庚印+壬比劫得势，但火土重→弱。' },

  { name: '戊日辰月（土旺得令）', ob: mk(4, 10, 2, 4, 4, 6, 6, 8),
    expect: STRONG, dedi: true, deling: true,
    note: '辰月四季土旺→得令；年戌本气戊土→得地；戊比劫→得势。应旺类。' }
];

var pass = 0, fail = 0;
function fmtArr(a) { return Array.isArray(a) ? a.join('/') : a; }

console.log('═══ 日主强弱 · 权威判定引擎审计（文档 §5 方案二 A/B 7级 + §6.1）═══');
cases.forEach(function (c, i) {
  var r = dm.computeDayMasterStrength(c.ob);
  var okLevel = Array.isArray(c.expect) ? c.expect.indexOf(r.level) >= 0 : r.level === c.expect;
  var okDedi = (c.dedi === undefined) ? true : (r.dedi === c.dedi);
  var okDeling = (c.deling === undefined) ? true : (r.deling === c.deling);
  var ok = okLevel && okDedi && okDeling;
  if (ok) pass++; else fail++;
  console.log(
    (ok ? '✅' : '❌') + ' #' + (i + 1) + ' ' + c.name +
    '\n    日主=' + r.riGanName + r.riWxName +
    '  等级=' + r.level +
    '  [得令' + (r.deling ? '✓' : '✕') + ' 得地' + (r.dedi ? '✓' : '✕') + ' 得势' + (r.deshi ? '✓' : '✕') + ']' +
    '  A=' + r.A + ' B=' + r.B + ' A/B=' + r.ratio +
    (okLevel ? '' : '  ⚠期望等级=' + fmtArr(c.expect)) +
    (okDedi ? '' : '  ⚠期望得地=' + c.dedi) +
    (okDeling ? '' : '  ⚠期望得令=' + c.deling)
  );
  if (!ok) console.log('    ※ ' + c.note);
});

// ── 关煞三得法对齐验证 ──
console.log('\n═══ 关煞身强身弱 · 与权威引擎口径一致验证 ═══');
var gCases = [
  { name: '乙日未月', ob: mk(5, 7, 9, 7, 1, 9, 7, 5), expectShen: '身弱' },
  { name: '甲日寅月', ob: mk(0, 0, 2, 2, 0, 2, 0, 0), expectShen: '身强' },
  { name: '丙日午月', ob: mk(2, 6, 4, 6, 2, 6, 2, 6), expectShen: '身强' }
];
gCases.forEach(function (g) {
  var xg = guansha.computeXiaoErGuanSha(g.ob, 1);
  var sq = xg && xg.zhengtong && xg.zhengtong[0] ? xg.zhengtong[0].shenQiangRuo : '(无)';
  var ok = sq === g.expectShen;
  if (ok) pass++; else fail++;
  console.log((ok ? '✅' : '❌') + ' ' + g.name + ' → 关煞判定=' + sq + (ok ? '' : '  ⚠期望=' + g.expectShen));
});

console.log('\n═══ 结果：通过 ' + pass + ' / 失败 ' + fail + ' ═══');
process.exit(fail ? 1 : 0);
