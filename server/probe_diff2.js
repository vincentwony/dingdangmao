'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 对每个 DIFF 神煞，提取其实际触发的 (月支 -> 日支集合)
const GODS = ['天火','月厭','天賊','天倉','九空','天狗','生氣','死氣','月破','驛馬'];
const map = {};
GODS.forEach(g=> map[g] = {}); // mb -> Set of db

const start = new Date(2024,0,1), end = new Date(2027,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const l = lunisolar(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
  const mb = l.char8.month.branch.value;
  const db = l.char8.day.branch.value;
  const good = l.theGods.getGoodGods().map(g=>String(g));
  const bad  = l.theGods.getBadGods().map(g=>String(g));
  for (const g of GODS){
    if (good.includes(g)||bad.includes(g)){
      if (!map[g][mb]) map[g][mb]=new Set();
      map[g][mb].add(db);
    }
  }
}
for (const g of GODS){
  console.log(`\n=== ${g} : 月支 -> 实际触发日支 ===`);
  const rows=[];
  for (let mb=0; mb<12; mb++){
    const s = map[g][mb];
    rows.push(`${BR[mb]}(${mb}):${s?[...s].sort((a,b)=>a-b).map(x=>BR[x]).join(''):'-'}`);
  }
  console.log(rows.join('  '));
}
