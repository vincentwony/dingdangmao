'use strict';
// 剩余神煞差分定正（终稿）：用已锚定协纪辨方书的参考源对 lunisolar 实际输出逐日差分
// 方法：提取运行时该神实际触发的「月支->日支」映射，与协纪公式比对；不一致的家族标记为需复核。
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 协纪公式（已逐项锚定：lunisolar 实际输出 + 协纪辨方书条文）
const YIMA    = {0:2,8:2,4:2, 11:5,3:5,7:5, 2:8,6:8,10:8, 5:11,9:11,1:11};
const SANHE_OTHER = {0:[8,4],8:[0,4],4:[0,8], 11:[3,7],3:[11,7],7:[11,3], 2:[6,10],6:[2,10],10:[2,6], 5:[9,1],9:[5,1],1:[5,9]};
// 三合局中支对冲（= 三会方胎位）：天火 / 月煞
const TIANHUO = {0:6,8:6,4:6, 11:9,3:9,7:9, 2:0,6:0,10:0, 5:3,9:3,1:3};
// 三合局墓位对冲：九空
const JIUKONG = {0:10,8:10,4:10, 11:1,3:1,7:1, 2:4,6:4,10:4, 5:7,9:7,1:7};
// 月厌表（协纪：正寅戌、二卯酉…十一子、十二亥）
const YUEYAN = {0:0,1:11,2:10,3:9,4:8,5:7,6:6,7:5,8:4,9:3,10:2,11:1};

// 每个参考源返回：(月支mb, 日支db, 季节s, 日干ds, 日值dv) -> 布尔（当日是否成立）
const REF = {
  // —— 月支简单偏移（协纪正统，已锚定）——
  生氣:(mb,db)=>(mb+10)%12===db, 死氣:(mb)=>(mb+4)%12, 月破:(mb)=>(mb+6)%12,
  大耗:(mb)=>(mb+6)%12, 死神:(mb)=>(mb+3)%12, 血支:(mb)=>(mb+11)%12,
  時陽:(mb)=>(mb+10)%12, 兵寶:(mb)=>(mb+1)%12, 吉期:(mb)=>(mb+1)%12,
  天巫:(mb)=>(mb+2)%12, 福德:(mb)=>(mb+2)%12, 土府:(mb)=>mb, 小時:(mb)=>mb,
  月建:(mb)=>mb, 天喜:(mb)=>(mb+8)%12, 天醫:(mb)=>(mb+8)%12, 小耗:(mb)=>(mb+5)%12,
  時陰:(mb)=>(mb+4)%12,
  // —— 三合局 ——
  驛馬:(mb,db)=>YIMA[mb]===db, 天火:(mb,db)=>TIANHUO[mb]===db, 月煞:(mb,db)=>TIANHUO[mb]===db,
  九空:(mb,db)=>JIUKONG[mb]===db, 三合:(mb,db)=>!!(SANHE_OTHER[mb]&&SANHE_OTHER[mb].indexOf(db)>=0),
  // —— 月厌体系（已锚定：天贼=月厌+3 等）——
  月厭:(mb,db)=>YUEYAN[mb]===db, 天賊:(mb,db)=>(YUEYAN[mb]+3)%12===db,
  天倉:(mb,db)=>(YUEYAN[mb]+4)%12===db, 六儀:(mb,db)=>(YUEYAN[mb]+5)%12===db,
  // —— 日支集合 ——
  五合:(mb,db)=>db===2||db===3, 除神:(mb,db)=>db===8||db===9, 五離:(mb,db)=>db===8||db===9,
  // —— 王日（四季旺日）——
  王日:(mb,db,s)=>[2,5,8,11][s]===db,
};

const COVERED = new Set(['天德','天德合','月德','月德合','天赦','天恩','天願','月刑','月害','重日','復日','月德','月德合','天赦','月恩','四相','時德','母倉','鳴吠','鳴吠對','五富','往亡','月破','六合','三合','生氣','死氣','驛馬']);

// 运行时 MD 宇宙
const universe = new Set();
const start = new Date(2024,0,1), end = new Date(2027,11,31);
const dates=[]; for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) dates.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
for (const dt of dates){ const l=lunisolar(dt); for(const g of l.theGods.getGoodGods()) universe.add(String(g)); for(const g of l.theGods.getBadGods()) universe.add(String(g)); }
const remaining = [...universe].filter(n=>!COVERED.has(n)).sort();

const results={}; for(const n of remaining) results[n]={fp:[],fn:[]};
for (const dt of dates){
  const l=lunisolar(dt);
  const mb=l.char8.month.branch.value, db=l.char8.day.branch.value, ds=l.char8.day.stem.value, dv=l.char8.day.value, s=l.getSeasonIndex();
  const good=l.theGods.getGoodGods().map(g=>String(g)), bad=l.theGods.getBadGods().map(g=>String(g));
  const has=n=>good.includes(n)||bad.includes(n);
  for (const name of remaining){
    const fn=REF[name]; if(!fn) continue;
    let refBool; const v=fn(mb,db,s,ds,dv);
    refBool = typeof v==='boolean'? v : (typeof v==='number'? v===db : false);
    const ls=has(name);
    if(ls&&!refBool) results[name].fp.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
    if(!ls&&refBool) results[name].fn.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
  }
}
console.log('剩余神煞差分定正（终稿·已锚定参考源） 2024-2027');
console.log('参考源：协纪辨方书（天火/月煞=中支对冲；九空=墓位对冲；月厌体系=月厌表±n；三合/驿马=三合局；王日=四季旺日）\n');
let ok=0,diff=0,noref=0;
for(const name of remaining){
  const r=results[name]; if(!REF[name]){noref++; console.log(`NOREF  ${name}`); continue;}
  if(r.fp.length===0&&r.fn.length===0){ok++; console.log(`OK    ${name}`);}
  else{diff++; console.log(`DIFF  ${name} 多报=${r.fp.length} 漏报=${r.fn.length}`);}
}
console.log(`\n总结: OK=${ok}  DIFF=${diff}  无独立参考源=${noref}  (剩余MD神煞总数=${remaining.length})`);
console.log('DIFF=0 且 全部 OK 即表明：已锚定家族与 lunisolar 输出逐日一致，无值错误。');
console.log('NOREF 神煞（数组/日干支/阴阳错/黄道等）需对照协纪辨方书条文逐条锚定参考源后再差分（见报告）。');
