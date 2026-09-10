'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

// 打印 2026 各公历月代表性日期的 引擎月支, 与"节气月建"期望值对照
// 节气月建: 立春寅(2/4) 惊蛰卯(3/5) 清明辰(4/5) 立夏巳(5/5) 芒种午(6/5) 小暑未(7/7)
//          立秋申(8/7) 白露酉(9/7) 寒露戌(10/8) 立冬亥(11/7) 大雪子(12/7) 小寒丑(1/5)
const expect = {
  '2026-01-10':'丑','2026-01-24':'丑','2026-02-05':'寅','2026-02-20':'寅','2026-03-10':'卯',
  '2026-04-10':'辰','2026-05-10':'巳','2026-06-10':'午','2026-07-10':'未','2026-08-10':'申',
  '2026-09-10':'酉','2026-10-10':'戌','2026-11-10':'亥','2026-12-10':'子'
};
console.log('日期        引擎月支  期望节气月建  一致?');
for (const k in expect) {
  const [y,m,d] = k.split('-').map(Number);
  const o = L(new Date(y, m-1, d));
  const ln = o.lunar;
  const dat = shensha.computeDayFromLunar(ln.year, ln.month, ln.day);
  const mb = dat.monthGZ ? dat.monthGZ[1] : '?';
  console.log(`${k}   ${mb}      ${expect[k]}        ${mb===expect[k]?'OK':'❌ 偏移'}`);
}
