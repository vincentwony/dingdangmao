// server/verify_congge.js
// ══════════════════════════════════════════════════════════════════════════
// 八字从格 · 统一出口审计（P1）
// 校验 bazi-unified.getCongGe / getCongGeData 与权威引擎 A/B 7级 口径一致：
//   · 仅「旺极 / 弱极」两极端档成立从格（isCong=true），其余一律非从格；
//   · 旺极 → 专旺/从旺（喜生扶），弱极 → 从弱（喜克泄耗），真假依"无根无生扶"；
//   · 与日主强弱卡、五行力量图、喜用神卡同源（单一标准）。
// 运行：npm run test:congge
// ══════════════════════════════════════════════════════════════════════════
'use strict';

var dm = require('./lib/daymaster-strength.js');
var u = require('./lib/bazi-unified.js');

function gz(g, z) {
  for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return n;
  throw new Error('非法干支 g=' + g + ' z=' + z);
}
function mk(yG, yZ, mG, mZ, dG, dZ, hG, hZ) {
  return { b1: gz(yG, yZ), b2: gz(mG, mZ), b3: gz(dG, dZ), b4: gz(hG, hZ) };
}

var pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✅ ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + name + (detail ? '  ' + detail : '')); }
}

// ── 样本（ob 仅含 b1-b4，引擎只读天干地支序号）──
var cases = [
  {
    name: '甲子四柱（木极旺·水印相生）',
    ob: mk(0, 0, 0, 0, 0, 0, 0, 0),
    level: '旺极', isCong: true, strong: true,
    congMatch: /从旺|专旺/, label: 'A/B=34/0 → 旺极'
  },
  {
    name: '甲子甲子甲子丁卯（旺极·透食伤→假从旺）',
    ob: mk(0, 0, 0, 0, 0, 0, 3, 3),
    level: '旺极', isCong: true, strong: true, fake: true,
    congMatch: /假从旺|专旺/, label: 'A/B=33/1 → 旺极，丁火透干'
  },
  {
    name: '己巳己巳甲戌己巳（木极弱·火食伤旺）',
    ob: mk(5, 5, 5, 5, 0, 10, 5, 5),
    level: '弱极', isCong: true, weak: true, fake: false,
    congMatch: /从弱/, label: 'A/B=1/29.5 → 弱极，从儿(食伤)'
  },
  {
    name: '甲日寅月（很旺·非从格）',
    ob: mk(0, 0, 2, 2, 0, 2, 0, 0),
    level: '很旺', isCong: false,
    label: '很旺档不成立从格'
  }
];

console.log('═══ 从格统一出口审计 ═══');
cases.forEach(function (c) {
  console.log('\n[' + c.name + ']  ' + c.label);
  var d = dm.computeDayMasterStrength(c.ob);
  check('引擎档位=' + c.level, d.level === c.level, '实际=' + d.level);
  var g = u.getCongGeData(c.ob);
  check('isCong=' + c.isCong, g.isCong === c.isCong, '实际=' + g.isCong);
  if (c.strong) check('旺极标记(strongExtreme)', g.strongExtreme === true);
  if (c.weak) check('弱极标记(weakExtreme)', g.weakExtreme === true);
  if (c.isCong) {
    check('congType 命中 /' + (c.congMatch || '') + '/', c.congMatch.test(g.congType), '实际=' + g.congType);
    if (c.fake !== undefined) {
      var isFake = g.congType.indexOf('假') >= 0;
      check('真假一致(fake=' + c.fake + ')', isFake === c.fake, 'congType=' + g.congType);
    }
    // getCongGe 渲染与 getCongGeData 一致
    var html = u.getCongGe(c.ob);
    check('HTML 含「统一判定」标记', html.indexOf('统一判定') >= 0);
    check('HTML 含 congType', html.indexOf(g.congType) >= 0);
  } else {
    check('congType=非从格', g.congType === '非从格', '实际=' + g.congType);
    var html2 = u.getCongGe(c.ob);
    check('HTML 含「非从格」说明', html2.indexOf('非从格') >= 0);
  }
});

console.log('\n═══ 结果 ═══');
console.log('PASS=' + pass + '  FAIL=' + fail);
process.exit(fail === 0 ? 0 : 1);
