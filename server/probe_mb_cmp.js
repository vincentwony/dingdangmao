'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

function engMonthBranch(sy, sm, sd) {
  const o = L(new Date(sy, sm - 1, sd));
  const ln = o.lunar;
  const dat = shensha.computeDayFromLunar(ln.year, ln.month, ln.day);
  return dat;
}

const dates = [
  [2026,1,10],[2026,2,5],[2026,3,10],[2026,5,10],[2026,8,10],[2026,11,10]
];
console.log('日期        引擎月柱    npm lunisolar 月柱   引擎日柱   npm日柱');
for (const [y,m,d] of dates) {
  const dat = engMonthBranch(y,m,d);
  const o = L(new Date(y, m-1, d));
  // npm lunisolar 月柱/日柱
  const mgz = o.month ? null : null;
  // lunisolar 对象上的干支: 尝试字段
  const lunar = o.lunar;
  // 用 lunisolar 的 stem/branch 工具
  const monthGZ = o.monthGan ? (o.monthGan + o.monthZhi) : (o.lunar && o.lunar.monthGan ? (o.lunar.monthGan+o.lunar.monthZhi):'?');
  const dayGZ = o.dayGan && o.dayZhi ? (o.dayGan+o.dayZhi) : '?';
  console.log(`${y}-${m}-${d}   ${dat.monthGZ||'?'} (支${dat.monthGZ?dat.monthGZ[1]:'?'})    ${monthGZ}        ${dat.dayGZ}     ${dayGZ}`);
}
// 直接看 npm lunisolar 给的月/日干支字段
console.log('\n--- npm lunisolar 原始字段样例(2026-01-10) ---');
const o = L(new Date(2026,0,10));
console.log(JSON.stringify(o, null, 0).slice(0, 600));
