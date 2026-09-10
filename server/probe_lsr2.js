'use strict';
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

var lsr = lunisolar(new Date(2024, 2, 15)); // 2024-3-15
console.log('=== lsr keys ===');
console.log(Object.keys(lsr));
console.log('=== lsr.lunar keys ===');
try { console.log(Object.keys(lsr.lunar)); } catch(e){ console.log('no lunar', e.message); }
console.log('=== lsr.lunar sample ===');
try { console.log(JSON.stringify(lsr.lunar, function(k,v){ if(typeof v==='function') return 'FN'; return v; }, 0)); } catch(e){ console.log('err', e.message); }
console.log('=== theGods keys ===');
try { console.log(Object.keys(lsr.theGods)); } catch(e){ console.log('no theGods', e.message); }
console.log('=== monthGZ / dayGZ methods ===');
console.log('getMonthGZ:', typeof lsr.getMonthGZ, 'getDayGZ:', typeof lsr.getDayGZ);
console.log('monthGZ:', typeof lsr.monthGZ, 'dayGZ:', typeof lsr.dayGZ);
console.log('lunar.monthGZ:', lsr.lunar && lsr.lunar.monthGZ, 'lunar.dayGZ:', lsr.lunar && lsr.lunar.dayGZ);
console.log('lunar.monthBranch:', lsr.lunar && lsr.lunar.monthBranch, 'lunar.dayBranch:', lsr.lunar && lsr.lunar.dayBranch);
