'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const lsr = lunisolar(new Date(2024, 5, 15)); // 甲辰年 午月(建午)
// get all gods detailed
const all = lsr.theGods.getGods();
for (const g of all) {
  const k = g.godBase && g.godBase.data && g.godBase.data.key;
  if (['岁煞','月煞','生气','驿马','岁马','大時','天火','月破','月建','兵宝'].includes(k)) {
    console.log('===', k, '=== cate=', g.godBase.data.cate);
    console.log(JSON.stringify(g, (kk,vv)=> kk==='lsr'?undefined:vv, 1).slice(0, 1200));
    console.log('--- raw god obj keys:', Object.keys(g), '| godBase keys:', Object.keys(g.godBase||{}));
    console.log('--- supple:', JSON.stringify(g.supple));
    console.log('');
  }
}
// explore theGods.theGods definition store
console.log('\n=== theGods.theGods categories ===');
const tg = theGods.theGods;
console.log(Object.keys(tg));
for (const cat of Object.keys(tg)) {
  const c = tg[cat];
  if (c && typeof c === 'object') {
    console.log(cat, '->', Array.isArray(c)? 'array len '+c.length : Object.keys(c).slice(0,5));
  }
}
