import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lunisolar = require('lunisolar');
try { require('lunisolar/plugins/char8ex.js'); } catch(e){}
const C = lunisolar.Char8;
console.log('Char8 static:', Object.keys(C).join(', '));
let inst;
try { inst = new C({year:1990,month:5,day:15,hour:14,minute:30}); }
catch(e){ console.log('new C err', e.message); process.exit(1); }
console.log('inst proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).filter(n=>/ming|shen|tai|gong|palace|mg|sg|ty/i.test(n)).join(', '));
for (const k of ['mingGong','shenGong','taiYuan','minggong','shengong','taiyuan','destinyPalace','bodyPalace']) {
  if (inst[k]!==undefined) console.log(`inst.${k} =`, typeof inst[k]==='object'?JSON.stringify(inst[k]):inst[k]);
}
