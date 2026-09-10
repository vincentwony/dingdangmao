'use strict';
// 抽取 88 个 NOREF 神煞在 2024-2027 运行时实际触发的「月支 -> 日干支值(0-59)」映射
// 目的：为后续逐条对照《协纪辨方书》卷九锚定独立参考源提供「lunisolar 实际值」数据
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GZ = (v)=>GAN[v%10]+ZHI[v%12];

// 与 verify_remaining_final 一致的 COVERED 集合（已覆盖/已锚定）
const COVERED = new Set(['天德','天德合','月德','月德合','天赦','天恩','天願','月刑','月害','重日','復日','月德','月德合','天赦','月恩','四相','時德','母倉','鳴吠','鳴吠對','五富','往亡','月破','六合','三合','生氣','死氣','驛馬','死神','血支','時陽','兵寶','吉期','天巫','福德','土府','小時','月建','天喜','天醫','小耗','時陰','天火','月煞','九空','大耗','月厭','天賊','天倉','六儀','五合','除神','五離','王日']);

const start = new Date(2024,0,1), end = new Date(2027,11,31);
const dates=[]; for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) dates.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()));

// 运行时实际宇宙
const universe = new Set();
for (const dt of dates){ const l=lunisolar(dt); for(const g of l.theGods.getGoodGods()) universe.add(String(g)); for(const g of l.theGods.getBadGods()) universe.add(String(g)); }
const remaining = [...universe].filter(n=>!COVERED.has(n)).sort();

// 每个神：map[month] = Set(dayValue)
const data = {}; for(const n of remaining) data[n] = Array.from({length:12},()=>new Set());
for (const dt of dates){
  const l=lunisolar(dt);
  const mb=l.char8.month.branch.value, dv=l.char8.day.value;
  const good=l.theGods.getGoodGods().map(g=>String(g)), bad=l.theGods.getBadGods().map(g=>String(g));
  const present=new Set([...good,...bad]);
  for(const n of remaining){ if(present.has(n)) data[n][mb].add(dv); }
}

// 输出：每个神，按月列出实际触发的日干支
const fs = require('fs');
let out = '';
let count=0;
for(const n of remaining){
  count++;
  out += `### ${n}  (月支->实际触发日干支)\n`;
  for(let m=0;m<12;m++){
    const set=[...data[n][m]].sort((a,b)=>a-b);
    const s = set.length? set.map(v=>GZ(v)).join(' ') : '—';
    out += `  月${m+1}(${ZHI[m]}): ${s}\n`;
  }
  out += '\n';
}
fs.writeFileSync('noref_actual.txt', out);
console.log(`抽取完成：运行时剩余神煞共 ${remaining.length} 个，实际映射已写入 noref_actual.txt`);
console.log('（其中含已静态校验的 九空/大煞，此处一并呈现其月支->日支实际值供复核）');
