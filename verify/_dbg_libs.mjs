import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('===== lunar-javascript =====');
try {
  const L = require('lunar-javascript');
  console.log('exports keys:', Object.keys(L).slice(0, 30));
  const { Solar } = L;
  const s = Solar.fromYmdHms(2000, 1, 1, 0, 30, 0);
  const lunar = s.getLunar();
  const ec = lunar.getEightChar();
  console.log('ec typeof:', typeof ec);
  console.log('ec methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ec)).filter(n => !n.startsWith('_')).slice(0, 60));
  // try common accessors
  for (const m of ['getYear', 'getMonth', 'getDay', 'getTime', 'getYearGanZhi', 'getYearInGanZhi', 'toString']) {
    try { console.log('  ec.' + m + '() =>', JSON.stringify(String(ec[m]()))); } catch (e) { console.log('  ec.' + m + ' ERR', e.message); }
  }
} catch (e) { console.log('lunarjs ERR', e.message); }

console.log('\n===== mystilight-8char =====');
try {
  const m = require('mystilight-8char');
  console.log('typeof:', typeof m, 'keys:', Object.keys(m));
  const pkg = require('mystilight-8char/package.json');
  console.log('package.main:', pkg.main, '| dist exists?', require('fs').existsSync(require('path').join(require('path').dirname(require.resolve('mystilight-8char/package.json')), pkg.main)));
  if (m.getCurrentEightCharJSON) {
    const r = m.getCurrentEightCharJSON({ year: 2000, month: 1, day: 1, hour: 0, minute: 30, sect: 2, gender: 1 });
    console.log('result keys:', Object.keys(r));
    console.log('pillars:', JSON.stringify(r.pillars));
  }
} catch (e) { console.log('mysti ERR', e.message); }

console.log('\n===== lunisolar =====');
try {
  const lunisolar = require('lunisolar');
  console.log('typeof lunisolar:', typeof lunisolar);
  const lsr = lunisolar(2000, 1, 1, 0, 30);
  console.log('lsr typeof:', typeof lsr);
  console.log('lsr.char8:', lsr.char8 && (typeof lsr.char8), lsr.char8 && Object.keys(lsr.char8).slice(0, 20));
  if (lsr.char8) {
    try { console.log('char8.toString():', lsr.char8.toString()); } catch (e) { console.log('toString ERR', e.message); }
    try { console.log('char8.year:', String(lsr.char8.year)); } catch (e) { console.log('year ERR', e.message); }
  }
  // try with Date object
  const lsr2 = lunisolar(new Date(2000, 0, 1, 0, 30));
  console.log('with Date -> char8.toString():', lsr2.char8 ? lsr2.char8.toString() : '(none)');
} catch (e) { console.log('lunisolar ERR', e.message); }
