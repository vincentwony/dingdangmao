'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

// 1) sample-date universe via different accessors
const lsr = lunisolar(new Date(2024, 5, 15));
for (const arg of ['Y','M','D','YMD','MD']) {
  const g = lsr.theGods.getGods(arg);
  console.log(`getGods('${arg}') count=${g.length}:`, g.map(x=>x.key).join(' '));
}
console.log('\nquery 年神:', (lsr.theGods.query('年神')||[]).map(x=>x.key).join(' '));
console.log('query 月神 count:', (lsr.theGods.query('月神')||[]).length);
console.log('query 日神 count:', (lsr.theGods.query('日神')||[]).length);

// 2) full-range universe (what the audit sees: getGoodGods()+getBadGods() default MD)
const universe = new Set();
const universeYMD = new Set();
const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const l = lunisolar(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  for (const g of l.theGods.getGoodGods()) universe.add(String(g));
  for (const g of l.theGods.getBadGods()) universe.add(String(g));
  for (const g of l.theGods.getGods('YMD')) universeYMD.add(g.key);
}
console.log('\n=== RUNTIME UNIVERSE (MD, getGood+getBad) over 2024-2027 ===');
console.log('count:', universe.size);
console.log([...universe].sort().join(' '));
console.log('\n=== RUNTIME UNIVERSE (YMD) over 2024-2027 ===');
console.log('count:', universeYMD.size);
console.log([...universeYMD].sort().join(' '));
