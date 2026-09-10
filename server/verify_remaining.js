'use strict';
// 剩余神煞差分定正：对运行时实际产生的神煞，用协纪辨方书正统规则做独立参考源逐日差分
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
// 60 甲子序号
const STEM = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
function gz(name){ const s=STEM.indexOf(name[0]); const b=BR.indexOf(name[1]); for(let k=0;k<60;k++) if(k%10===s&&k%12===b) return k; return -1; }

// ===== 协纪独立参考源（仅收录公式确凿、无误判风险的家族）=====
// 三合局（月支 mb / 年支）-> 驿马/天火/月煞/九空
const YIMA    = {0:2,8:2,4:2, 11:5,3:5,7:5, 2:8,6:8,10:8, 5:11,9:11,1:11}; // 申子辰->寅 亥卯未->巳 寅午戌->申 巳酉丑->亥
const TIANHUO = {0:6,8:6,4:6, 11:3,3:3,7:3, 2:0,6:0,10:0, 5:9,9:9,1:9}; // 申子辰->午 亥卯未->卯 寅午戌->子 巳酉丑->酉
const YUESHA  = {0:7,8:7,4:7, 11:4,3:4,7:4, 2:1,6:1,10:1, 5:10,9:10,1:10}; // 灾煞/胎位
const JIUKONG = {0:10,8:10,4:10, 11:7,3:7,7:7, 2:4,6:4,10:4, 5:1,9:1,1:1};
const SANHE_OTHER = {0:[8,4],8:[0,4],4:[0,8], 11:[3,7],3:[11,7],7:[11,3], 2:[6,10],6:[2,10],10:[2,6], 5:[9,1],9:[5,1],1:[5,9]};

function badd(mb, off){ return (mb+off)%12; }

const REF = {
  // —— 月支简单偏移（协纪正统，公式确凿）——
  生氣:  (mb)=> badd(mb,10),   // 月建后十位
  死氣:  (mb)=> badd(mb,4),
  月破:  (mb)=> badd(mb,6),
  大耗:  (mb)=> badd(mb,6),    // 大耗即月破
  死神:  (mb)=> badd(mb,3),
  血支:  (mb)=> badd(mb,11),
  時陽:  (mb)=> badd(mb,10),
  兵寶:  (mb)=> badd(mb,1),
  吉期:  (mb)=> badd(mb,1),
  天巫:  (mb)=> badd(mb,2),
  福德:  (mb)=> badd(mb,2),
  土府:  (mb)=> mb,
  小時:  (mb)=> mb,
  月建:  (mb)=> mb,
  天喜:  (mb)=> badd(mb,8),
  天醫:  (mb)=> badd(mb,8),
  小耗:  (mb)=> badd(mb,5),    // 小耗 = 月破前一位
  時陰:  (mb)=> badd(mb,4),
  // —— 三合局（月支）——
  驛馬:  (mb)=> YIMA[mb],
  天火:  (mb)=> TIANHUO[mb],
  月煞:  (mb)=> YUESHA[mb],
  九空:  (mb)=> JIUKONG[mb],
  三合:  (mb,db)=> !!(SANHE_OTHER[mb] && SANHE_OTHER[mb].indexOf(db)>=0),
  // —— 月厌体系（月建逆推）——
  月厭:  (mb)=> badd(mb,11),
  天賊:  (mb)=> badd(mb,2),
  天倉:  (mb)=> badd(mb,3),
  六儀:  (mb)=> badd(mb,4),
  // 天狗：仅申月(8)亥日(10)（lunisolar 定义）
  天狗:  (mb,db)=> mb===8 && db===10,
  // —— 日支简单集合 ——
  五合:  (mb,db)=> db===2||db===3,          // 寅卯日
  除神:  (mb,db)=> db===8||db===9,          // 申酉日
  五離:  (mb,db)=> db===8||db===9,          // 申酉日
  // —— 王日（四季旺日，确凿）——
  王日:  (mb,db,s)=> [2,5,8,11][s]===db,     // 春寅夏午秋申冬子
};

// 访问器
const _ = (l,e)=> l.char8[e].branch.value;        // 日支/月支 0-11
const L = (l,e)=> l.char8[e].stem.value;           // 日干/月干 0-9
const BRANCH_OF = l => l.char8.day.branch.value;

const COVERED = new Set(['天德','天德合','月德','月德合','天赦','天恩','天願','月刑','月害','重日','復日','月德','月德合','天赦','月恩','四相','時德','母倉','鳴吠','鳴吠對','五富','往亡','月破','六合','三合','生氣','死氣','驛馬']);

// 运行时宇宙（MD）
const universe = new Set();
const start = new Date(2024,0,1), end = new Date(2027,11,31);
const dateList = [];
for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) dateList.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
for (const dt of dateList){
  const l = lunisolar(dt);
  for (const g of l.theGods.getGoodGods()) universe.add(String(g));
  for (const g of l.theGods.getBadGods()) universe.add(String(g));
}
const remaining = [...universe].filter(n=>!COVERED.has(n)).sort();

// 差分
const results = {};
for (const n of remaining) results[n] = {fp:[], fn:[]};
for (const dt of dateList){
  const l = lunisolar(dt);
  const mb = _(l,'month');
  const season = l.getSeasonIndex();
  const db = _(l,'day');
  const ds = L(l,'day');
  const dv = l.char8.day.value;
  const good = l.theGods.getGoodGods().map(g=>String(g));
  const bad  = l.theGods.getBadGods().map(g=>String(g));
  const has = n => good.includes(n)||bad.includes(n);
  for (const name of remaining){
    const refFn = REF[name];
    if (!refFn) continue; // 无独立参考源
    const refVal = refFn(mb,db,season,ds,dv);
    // 参考源返回：true/数字(目标日支) / 数组？统一为 "是否成立"
    let refBool;
    if (typeof refVal === 'boolean') refBool = refVal;
    else if (typeof refVal === 'number') refBool = (refVal === db);
    else refBool = false;
    const ls = has(name);
    if (ls && !refBool) results[name].fp.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
    if (!ls && refBool) results[name].fn.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
  }
}

console.log('剩余神煞差分定正（高置信家族） 2024-2027');
console.log('参考源：协纪辨方书正统规则（仅含公式确凿家族）\n');
let diffCount=0, okCount=0, noRefCount=0;
for (const name of remaining){
  const r = results[name];
  const fp = r.fp.length, fn = r.fn.length;
  if (!REF[name]) { noRefCount++; console.log(`NOREF  ${name}`); continue; }
  if (fp===0 && fn===0){ okCount++; console.log(`OK    ${name}`); }
  else { diffCount++; console.log(`DIFF  ${name}  多报=${fp} 漏报=${fn}`);
    if (fp) console.log('        多报样本: '+r.fp.slice(0,5).join(', ')+(fp>5?` ...(${fp})`:''));
    if (fn) console.log('        漏报样本: '+r.fn.slice(0,5).join(', ')+(fn>5?` ...(${fn})`:''));
  }
}
console.log(`\n总结: OK=${okCount}  DIFF=${diffCount}  无独立参考源=${noRefCount}  (剩余总数=${remaining.length})`);
console.log('注: DIFF 需结合协纪进一步人工复核（可能是流派差异或潜在 bug）；NOREF 表示该神煞需对照协纪独立重建参考源后再差分。');
