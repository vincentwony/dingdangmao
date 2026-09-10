'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

function mb(sy, sm, sd) {
  const o = L(new Date(sy, sm - 1, sd));
  const ln = o.lunar;
  const dat = shensha.computeDayFromLunar(ln.year, ln.month, ln.day);
  return { gz: dat.monthGZ, day: dat.dayGZ, lunar: ln.year+'-'+ln.month+'-'+ln.day+(ln.isLeap?'闰':'') };
}

console.log('=== 立春 2026-02-04 前后（立春当天应翻到 寅月）===');
for (const d of [1,2,3,4,5,6,7]) {
  const r = mb(2026,2,d);
  console.log(`2026-02-${d}  月柱=${r.gz} 日柱=${r.day} 农历=${r.lunar}`);
}
console.log('\n=== 大雪 2026-12-07 前后（大雪当天应翻到 子月）===');
for (const d of [5,6,7,8,9]) {
  const r = mb(2026,12,d);
  console.log(`2026-12-${d}  月柱=${r.gz} 日柱=${r.day} 农历=${r.lunar}`);
}
