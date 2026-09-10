'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const lsr = lunisolar(new Date(2024, 5, 15));
const all = lsr.theGods.getGods();
console.log('total gods in getGods:', all.length);
const keys = all.map(g => g.godBase && g.godBase.data && g.godBase.data.key);
console.log('all keys:', keys.join(' '));
console.log('\n--- full object of first 2 gods ---');
for (const g of all.slice(0,2)) {
  console.log(JSON.stringify(g, (kk,vv)=> kk==='lsr'?undefined:vv, 1).slice(0,1500));
}
// look for 岁煞 specifically by scanning all keys
console.log('\ncontains 岁?', keys.filter(k=>k&&k.includes('岁')));
console.log('contains 煞?', keys.filter(k=>k&&k.includes('煞')));
// find 驿/马
console.log('contains 马?', keys.filter(k=>k&&k.includes('马')));
console.log('contains 生气?', keys.filter(k=>k==='生气'));
