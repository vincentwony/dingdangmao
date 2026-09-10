'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const lsr = lunisolar(new Date(2024, 0, 15)); // 甲辰年 某日
console.log('=== lsr.theGods keys ===');
console.log(Object.keys(lsr.theGods));
console.log('\n=== lsr.theGods.gods (if exists) ===');
if (lsr.theGods.gods) console.log(Object.keys(lsr.theGods.gods).slice(0, 5));
console.log('\n=== typeof getGods ===', typeof lsr.theGods.getGods);
try {
  const g = lsr.theGods.getGods ? lsr.theGods.getGods() : null;
  if (g) {
    console.log('getGods length', g.length);
    console.log('sample god obj:', JSON.stringify(g.slice(0,3), null, 1).slice(0,800));
  }
} catch(e){ console.log('getGods err', e.message); }
console.log('\n=== good gods sample ===');
const good = lsr.theGods.getGoodGods();
console.log('count', good.length, 'sample', good.slice(0,8));
console.log('typeof good[0]', typeof good[0], good[0] && good[0].toString && good[0].toString());
// try to find 岁煞 in detailed god list
try {
  const all = lsr.theGods.getGoodGods().concat(lsr.theGods.getBadGods());
  for (const x of all) {
    if (typeof x === 'object') console.log('OBJ god:', Object.keys(x), JSON.stringify(x).slice(0,200));
  }
} catch(e){ console.log('obj explore err', e.message); }
// explore the plugin's god definition map
console.log('\n=== theGods export ===', Object.keys(theGods));
console.log('theGods.theGods keys:', Object.keys(theGods.theGods).slice(0,10));
