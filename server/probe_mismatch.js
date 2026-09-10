'use strict';
// 提取 13 个 MISMATCH 神煞在 lunisolar 运行时(2024-2027)逐月支触发日干支全集
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const gz = v => GAN[v % 10] + ZHI[v % 12];

const TARGETS = ['了戾','地火','大會','天狗','孤辰','孤陽','專日','小會','義日','行狠','陰道沖陽','陰錯','陰陽俱錯'];

const start = new Date(2024, 0, 1), end = new Date(2027, 11, 31);
const byItem = {}; for (const t of TARGETS) byItem[t] = Array.from({ length: 12 }, () => new Set());

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const l = lunisolar(dt);
  const mb = l.char8.month.branch.value;
  const dv = l.char8.day.value;
  const g = String(gz(dv));
  const all = l.theGods.getGoodGods().map(x => String(x)).concat(l.theGods.getBadGods().map(x => String(x)));
  for (const t of TARGETS) if (all.includes(t)) byItem[t][mb].add(g);
}

for (const t of TARGETS) {
  console.log(`\n##### ${t} (月支 -> 触发日干支)`);
  for (let mb = 0; mb < 12; mb++) {
    const s = [...byItem[t][mb]].sort((a, b) => gzVal(a) - gzVal(b));
    if (s.length) console.log(`  ${ZHI[mb]}月(${mb}): ${s.join(' ')}`);
  }
}
function gzVal(s) { const i = GAN.indexOf(s[0]); const j = ZHI.indexOf(s[1]); for (let v = 0; v < 60; v++) if (v % 10 === i && v % 12 === j) return v; return -1; }
