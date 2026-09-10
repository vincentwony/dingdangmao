'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const gz = v => GAN[v % 10] + ZHI[v % 12];

const TARGETS = ['九坎','地囊','氣往亡','長星','短星'];
const byItem = {}; for (const t of TARGETS) byItem[t] = [];
const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const l = lunisolar(dt);
  const all = l.theGods.getGoodGods().map(x=>String(x)).concat(l.theGods.getBadGods().map(x=>String(x)));
  for (const t of TARGETS) if (all.includes(t)) {
    byItem[t].push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()} lm${l.lunar.month}d${l.lunar.day} ${gz(l.char8.day.value)}`);
  }
}
for (const t of TARGETS) {
  console.log(`\n##### ${t} (共 ${byItem[t].length} 天)`);
  // 九坎/地囊 按月支汇总；長星/短星 按(lm,ld)汇总；氣往亡 按节气附近
  if (t==='九坎' || t==='地囊') {
    const m = {};
    for (const s of byItem[t]) {
      const lm = +s.match(/lm(\d+)/)[1];
      const g = s.match(/ ([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])$/)[1];
      (m[lm] = m[lm]||new Set()).add(g);
    }
    for (const lm of Object.keys(m).sort((a,b)=>a-b)) console.log(`  农历${lm}月: ${[...m[lm]].join(' ')}`);
  } else if (t==='長星' || t==='短星') {
    const m = {};
    for (const s of byItem[t]) {
      const lm = +s.match(/lm(\d+)/)[1]; const ld = +s.match(/d(\d+)/)[1];
      (m[lm] = m[lm]||new Set()).add(ld);
    }
    for (const lm of Object.keys(m).sort((a,b)=>a-b)) console.log(`  农历${lm}月: 日${[...m[lm]].sort((a,b)=>a-b).join(',')}`);
  } else {
    console.log(byItem[t].slice(0,40).join('\n'));
    if (byItem[t].length>40) console.log(`  ...(省略 ${byItem[t].length-40} 条)`);
  }
}
