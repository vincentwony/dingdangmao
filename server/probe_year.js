'use strict';
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 用 YMD 提取各年神实际触发的 年支->方位(日支值) 映射
const GODS = ['岁煞','灾煞','劫煞','岁德','岁德合','飞廉','大煞','黄幡','豹尾','灸退','岁马','岁刑','岁破','岁薄','岁德合'];
const map = {};
GODS.forEach(g=> map[g] = {});
const start = new Date(2024,0,1), end = new Date(2035,11,31);
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
  const l = lunisolar(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
  const yb = l.char8.year.branch.value;
  const all = l.theGods.getGods('YMD');
  for (const g of all){
    if (GODS.includes(g.key)){
      if (!map[g.key][yb]) map[g.key][yb]=new Set();
      map[g.key][yb].add(l.char8.day.branch.value); // 方位神，这里取当日支近似；年神方位其实是固定支
    }
  }
}
// 年神方位是固定的（与具体日无关），取每 年支 下 该神 出现的“代表性日支”——但更可靠是取 getLuckDirection
// 改用 getLuckDirection 取真正方位
console.log('=== 年神 方位（getLuckDirection）===');
for (const yr of [2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035]) {
  const l = lunisolar(new Date(yr,6,15));
  const yb = l.char8.year.branch.value;
  const row = [];
  for (const g of GODS){
    try{
      const r = l.theGods.getLuckDirection(g);
      row.push(`${g}=${r?r[0].sign.toString():'-'}`);
    }catch(e){ row.push(`${g}=ERR`); }
  }
  console.log(`${BR[yb]}(${yr}): `+row.join(' '));
}
