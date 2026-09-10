'use strict';
// 验证 天恩/天願 覆盖：以 computeDayFromLunar(协纪) 为准，复刻 server 覆盖逻辑，对 2024-2027 全量比对
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const S = require('H:/Phone/core/shensha.js');

const STEM = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const I = (l,e,n=0) => 'month'===e ? l.getMonthBuilder(n)[0] : l.char8[e];
const _ = (l,e,n) => { let t=I(l,e,0); return n? t.branch.value%n : t.branch.value; };
const L = (l,e,n) => { let t=I(l,e,0); return n? t.stem.value%n : t.stem.value; };

// 复刻 calendar.js 覆盖逻辑
function applyOverride(good, bad, computed) {
  const truth = {
    '天德': !!computed.tiande, '天德合': !!computed.tiandeHe, '月德': !!computed.yuede,
    '月德合': !!computed.yuedeHe, '天赦': !!computed.tianshe,
    '天恩': !!computed.tianen, '天願': !!computed.tianyuan
  };
  Object.keys(truth).forEach(function(name) {
    const gi = good.indexOf(name), bi = bad.indexOf(name);
    if (truth[name]) {
      if (gi < 0) good.push(name);
      if (bi >= 0) bad.splice(bi, 1);
    } else {
      if (bi >= 0) bad.splice(bi, 1);
      if (name !== '天德' && gi >= 0) good.splice(gi, 1);
    }
  });
  return { good: good, bad: bad };
}

let fpTE = 0, fnTE = 0, fpTY = 0, fnTY = 0; // lunisolar 原始与协纪不一致
let ovDiffTE = 0, ovDiffTY = 0;               // 覆盖后相对协纪的偏差(应=0)
const samples = { te_extra:[], ty_wrong:[], ty_missing:[] };

const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const y = d.getFullYear(), m = d.getMonth()+1, day = d.getDate();
  const lsr = lunisolar(new Date(y, m-1, day));
  const goodRaw = lsr.theGods.getGoodGods().map(g => String(g));
  const badRaw = lsr.theGods.getBadGods().map(g => String(g));
  const hasRaw = n => goodRaw.includes(n) || badRaw.includes(n);

  const computed = S.computeDayFromLunar(y, m, day);
  if (!computed) continue;
  const refTE = !!computed.tianen;   // 协纪参考
  const refTY = !!computed.tianyuan;

  if (hasRaw('天恩') && !refTE) { fpTE++; if (samples.te_extra.length<4) samples.te_extra.push(`${y}-${m}-${day}`); }
  if (!hasRaw('天恩') && refTE) { fnTE++; }
  if (hasRaw('天願') && !refTY) { fpTY++; if (samples.ty_wrong.length<4) samples.ty_wrong.push(`${y}-${m}-${day}`); }
  if (!hasRaw('天願') && refTY) { fnTY++; if (samples.ty_missing.length<4) samples.ty_missing.push(`${y}-${m}-${day}`); }

  const good = goodRaw.slice(), bad = badRaw.slice();
  applyOverride(good, bad, computed);
  const hasOv = n => good.includes(n) || bad.includes(n);
  if (hasOv('天恩') !== refTE) ovDiffTE++;
  if (hasOv('天願') !== refTY) ovDiffTY++;
}

console.log('=== lunisolar 原始 vs 协纪辨方书 (2024-2027) ===');
console.log(`天恩: lunisolar多报(非协纪却报)=${fpTE}  漏报=${fnTE}`);
console.log(`天願: lunisolar多报(非协纪却报)=${fpTY}  漏报=${fnTY}`);
console.log('\n=== 覆盖后 vs 协纪 (应全部为 0) ===');
console.log(`天恩 覆盖后与协纪不符=${ovDiffTE}`);
console.log(`天願 覆盖后与协纪不符=${ovDiffTY}`);
console.log('\n=== 抽样 ===');
console.log('天恩 lunisolar多报样本(应被覆盖移除):', samples.te_extra.join(', ') || '(无)');
console.log('天願 lunisolar多报样本(应被覆盖移除):', samples.ty_wrong.join(', ') || '(无)');
console.log('天願 协纪该报lunisolar漏报样本(应被覆盖补入):', samples.ty_missing.join(', ') || '(无)');
const ok = (fpTE>0||fpTY>0) && ovDiffTE===0 && ovDiffTY===0;
console.log('\n结论:', ok ? '覆盖生效，天恩/天願已对齐协纪，无残留偏差 ✅' : '需检查 ❌');
