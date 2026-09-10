'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

const dates = [[2026,1,10],[2026,2,5],[2026,3,10],[2026,5,10],[2026,8,10],[2026,11,10]];
console.log('日期        引擎月柱   npm月柱   引擎日柱   npm日柱   月支一致?');
for (const [y,m,d] of dates) {
  const o = L(new Date(y, m-1, d));
  const ln = o.lunar;
  const dat = shensha.computeDayFromLunar(ln.year, ln.month, ln.day);
  const npmMGZ = (o.monthGan||'?') + (o.monthZhi||'?');
  const npmDGZ = (o.dayGan||'?') + (o.dayZhi||'?');
  const engMB = dat.monthGZ ? dat.monthGZ[1] : '?';
  const npmMB = o.monthZhi || '?';
  console.log(`${y}-${m}-${d}   ${dat.monthGZ||'?'}      ${npmMGZ}    ${dat.dayGZ}     ${npmDGZ}    ${engMB===npmMB?'OK':'❌ '+engMB+'vs'+npmMB}`);
}
