'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const dt = new Date(2024, 0, 10); // 2024-01-10
const l = lunisolar(dt);
console.log('lunar:', JSON.stringify(l.lunar && { day: l.lunar.day, month: l.lunar.month, leap: l.lunar.leap }));
console.log('lunarDay:', l.lunarDay, 'lunarMonth:', l.lunarMonth);
console.log('char8 keys:', Object.keys(l.char8));
console.log('day keys:', Object.keys(l.char8.day));
// try 节气
try { console.log('solarTerm:', l.solarTerm); } catch (e) { console.log('no solarTerm'); }
try { console.log('terms:', l.getSolarTerms && l.getSolarTerms()); } catch (e) { console.log('no getSolarTerms'); }
// inspect raw object for 节气
const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(l));
console.log('proto:', proto.filter(k => /term|solar|节气|jie/i.test(k)).join(','));
// look at all own + proto keys
const all = new Set();
let o = l;
while (o) { Object.getOwnPropertyNames(o).forEach(k => all.add(k)); o = Object.getPrototypeOf(o); }
console.log('term-ish:', [...all].filter(k => /term|solar|jie|qi/i.test(k)).join(','));
