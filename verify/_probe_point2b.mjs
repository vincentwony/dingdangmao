import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lunisolar = require('lunisolar');
try { require('lunisolar/plugins/char8ex.js'); } catch(e){ console.log('char8ex FAIL', e.message); }
console.log('lunisolar top methods:', Object.keys(lunisolar).join(', '));
// 找 char8 相关
const charKeys = Object.keys(lunisolar).filter(k=>/char|ming|shen|tai|gong|palace|eight/i.test(k));
console.log('char/ming/shen related:', charKeys.join(', '));
// 尝试各入口
const y=1990,m=5,d=15,h=14,min=30;
for (const name of charKeys){
  try { const fn=lunisolar[name]; if(typeof fn==='function'){ const r=fn({year:y,month:m,day:d,hour:h,minute:min}); console.log(`\n${name}({{...}}) =>`, typeof r, r?Object.keys(r).slice(0,40).join(','):r); } } catch(e){ console.log(`${name} err:`, e.message.slice(0,60)); }
}
// 也试 fromYmdHms 返回对象上有无 char8 方法
try {
  const o = lunisolar.fromYmdHms(y,m,d,h,min,0);
  console.log('\nfromYmdHms keys:', Object.keys(o).join(', '));
  for (const k of ['char8','char8ex','eightChar','bazi','getChar8']) if(o[k]) console.log('  o.'+k+' exists');
} catch(e){ console.log('fromYmdHms err', e.message.slice(0,60)); }
