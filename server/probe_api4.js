'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const lsr = lunisolar(new Date(2024, 5, 15)); // 甲辰年 午月
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 1) try getLuckDirection for some gods
for (const name of ['岁煞','月煞','驿马','岁马','天火','生气','月破','大時','黄幡','豹尾','灸退','飞廉']) {
  try {
    const r = lsr.theGods.getLuckDirection(name);
    if (r) {
      const [d24, god] = r;
      console.log(`getLuckDirection(${name}) => sign=${d24 && d24.sign && d24.sign.toString && d24.sign.toString()} dir=${d24 && d24.direction}`);
    } else {
      console.log(`getLuckDirection(${name}) => null`);
    }
  } catch(e){ console.log(`getLuckDirection(${name}) ERR ${e.message}`); }
}

// 2) dump a god object's full prototype/own keys for a 年神 if available
const yg = lsr.theGods.getGods('Y');
console.log('\n=== 年神 count', yg.length, 'keys:', yg.map(g=>g.key).join(' '));
for (const g of yg.slice(0,3)) {
  console.log('god', g.key, '| ownKeys:', Object.keys(g), '| proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(g)).join(','));
  console.log('  value?', g.value, '| godBase.value?', g.godBase && g.godBase.value, '| godBase.data keys:', g.godBase && Object.keys(g.godBase.data));
}
