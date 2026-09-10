import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lunisolar = require('lunisolar');
try { require('lunisolar/plugins/char8ex.js'); console.log('char8ex loaded'); } catch(e){ console.log('char8ex FAIL', e.message); }
try { require('lunisolar/plugins/char8.js'); console.log('char8 loaded'); } catch(e){ console.log('char8 FAIL', e.message); }

// 探测 char8 对象方法
function probeChar8(y,m,d,h,min){
  let c=null, way='';
  try { c = lunisolar.char8({year:y,month:m,day:d,hour:h,minute:min}); way='char8({})'; }
  catch(e){ try { c = lunisolar.fromYmdHms(y,m,d,h,min,0).char8(); way='fromYmdHms().char8()'; } catch(e2){} }
  if(!c){ console.log('NO char8 object'); return; }
  console.log(`\n[${y}-${m}-${d} ${h}:${min}] via ${way}`);
  console.log('  keys:', Object.keys(c).slice(0,60).join(','));
  for (const k of ['mingGong','shenGong','taiYuan','bodyPalace','minggong','shengong','taiyuan','palace','destinyPalace','MG','SG','TY']){
    if (c[k]!==undefined) console.log(`  c.${k} =`, typeof c[k]==='object'?JSON.stringify(c[k]):c[k]);
  }
}
probeChar8(1990,5,15,14,30);
probeChar8(2010,10,10,12,0);
