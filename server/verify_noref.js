'use strict';
// NOREF 神煞差分定正（第二批）：用《协纪辨方书》已锚定的参考源对 lunisolar 实际输出逐日差分
// 参考源均来自协纪卷六/卷七原文 + 考原，高置信度。续世编码为协纪正确值以暴露 lunisolar 偏差。
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const GZ = (v)=>GAN[v%10]+BR[v%12];

// 季节索引：mb=月支值；春=寅卯辰(2,3,4) 夏=巳午未(5,6,7) 秋=申酉戌(8,9,10) 冬=亥子丑(11,0,1)
function seasonOf(mb){ if(mb===2||mb===3||mb===4) return 0; if(mb===5||mb===6||mb===7) return 1; if(mb===8||mb===9||mb===10) return 2; return 3; }

// —— 黄道黑道十二神：天罡加建。青龍 子月申(8)，各神顺推。expected = (mb*2 + 8 + p) % 12 ——
// 注意：lunisolar 运行时神名用繁体，REF key 须与繁体一致
const HD = {青龍:0,明堂:1,天刑:2,朱雀:3,金匱:4,白虎:6,玉堂:7,天牢:8,玄武:9,司命:10,勾陳:11};
// —— 月神：按 mb(0-11=子月..亥月) 给出协纪规定日支 ——
const ARR = {
  // 官日/守日/相日/民日/王日（守日取邵泰衢校正后：春辰夏未秋戌冬丑）
  王日:[11,11,2,2,2,5,5,5,8,8,8,11],
  官日:[0,0,3,3,3,6,6,6,9,9,9,0],
  守日:[1,1,4,4,4,7,7,7,10,10,10,1],
  相日:[2,2,5,5,5,8,8,8,11,11,11,2],
  民日:[3,3,6,6,6,9,9,9,0,0,0,3],
  // 陽德(顺六阳,子月起午) / 陰德(逆六阴,寅月起酉)
  陽德:[6,8,10,0,2,4,6,8,10,0,2,4],
  陰德:[1,11,9,7,5,3,1,11,9,7,5,3],
  // 聖心/益後/續世（續世=益後+1，协纪卷六）
  聖心:[4,10,11,5,0,6,1,7,2,8,3,9],
  益後:[5,11,0,6,1,7,2,8,3,9,4,10],
  續世:[6,0,1,7,2,8,3,9,4,10,5,11], // 协纪正确值；lunisolar 实际为 [0,6,1,7,2,8,9,3,4,10,5,11]（偏差）
  // 天馬(顺六阳,寅月起午) / 兵禁(逆六阳,寅月起寅)
  天馬:[2,4,6,8,10,0,2,4,6,8,10,0],
  兵禁:[6,4,2,0,10,8,6,4,2,0,10,8],
  // 土符 / 大煞(月)
  土符:[8,0,1,5,9,2,6,10,3,7,11,4],
  大煞:[8,9,10,5,6,7,2,3,4,11,0,1],
  // 要安/玉宇/金堂/敬安/普護/福生（协纪卷六）
  要安:[7,1,2,8,3,9,4,10,5,11,6,0],
  玉宇:[8,2,3,9,4,10,5,11,6,0,7,1],
  金堂:[9,3,4,10,5,11,6,0,7,1,8,2],
  敬安:[0,6,7,1,8,2,9,3,10,4,11,5],
  普護:[1,7,8,2,9,3,10,4,11,5,0,6],
  福生:[2,8,9,3,10,4,11,5,0,6,1,7],
};
// 月空：天干（寅午戌→壬, 亥卯未→庚, 申子辰→丙, 巳酉丑→甲），按 mb 给天干值
const YUEKONG_STEM = [2,0,8,6,2,0,8,6,2,0,8,6]; // 丙甲壬庚循环（子月申子辰=丙...）

// REF: 返回 (mb, db, season, ds, dv) => 协纪是否成立
const REF = {};
for (const [name,p] of Object.entries(HD)) REF[name]=(mb,db)=>((mb*2+8+p)%12)===db;
for (const [name,arr] of Object.entries(ARR)) REF[name]=(mb,db)=>arr[mb]===db;
REF['月空']=(mb,db,season,ds)=>YUEKONG_STEM[mb]===ds;

const COVERED = new Set(['天德','天德合','月德','月德合','天赦','天恩','天願','月刑','月害','重日','復日','月德','月德合','天赦','月恩','四相','時德','母倉','鳴吠','鳴吠對','五富','往亡','月破','六合','三合','生氣','死氣','驛馬','死神','血支','時陽','兵寶','吉期','天巫','福德','土府','小時','月建','天喜','天醫','小耗','時陰','天火','月煞','九空','大耗','月厭','天賊','天倉','六儀','五合','除神','五離','王日']);

const start = new Date(2024,0,1), end = new Date(2027,11,31);
const dates=[]; for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) dates.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()));
const universe = new Set();
for (const dt of dates){ const l=lunisolar(dt); for(const g of l.theGods.getGoodGods()) universe.add(String(g)); for(const g of l.theGods.getBadGods()) universe.add(String(g)); }
const remaining = [...universe].filter(n=>!COVERED.has(n)).sort();

const results={}; for(const n of remaining) results[n]={fp:[],fn:[]};
for (const dt of dates){
  const l=lunisolar(dt);
  const mb=l.char8.month.branch.value, db=l.char8.day.branch.value, ds=l.char8.day.stem.value, dv=l.char8.day.value, s=seasonOf(mb);
  const good=l.theGods.getGoodGods().map(g=>String(g)), bad=l.theGods.getBadGods().map(g=>String(g));
  const has=n=>good.includes(n)||bad.includes(n);
  for (const name of remaining){
    const fn=REF[name]; if(!fn) continue;
    const refBool=!!fn(mb,db,s,ds,dv);
    const ls=has(name);
    if(ls&&!refBool) results[name].fp.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
    if(!ls&&refBool) results[name].fn.push(`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`);
  }
}
console.log('NOREF 神煞差分定正（第二批·协纪已锚定参考源） 2024-2027');
console.log('参考源：协纪辨方书 卷六（月神）/卷七（黄道黑道十二神）/考原\n');
let ok=0,diff=0,noref=0;
const okList=[],diffList=[],norefList=[];
for(const name of remaining){
  const r=results[name]; if(!REF[name]){noref++; norefList.push(name); continue;}
  if(r.fp.length===0&&r.fn.length===0){ok++; okList.push(name); console.log(`OK    ${name}`);}
  else{diff++; diffList.push(name); console.log(`DIFF  ${name} 多报=${r.fp.length} 漏报=${r.fn.length}`);
       if(r.fp.length) console.log(`        多报样例: ${r.fp.slice(0,3).join(' ')}`);
       if(r.fn.length) console.log(`        漏报样例: ${r.fn.slice(0,3).join(' ')}`);}
}
console.log(`\n总结: OK=${ok}  DIFF=${diff}  无独立参考源=${noref}  (剩余MD神煞总数=${remaining.length})`);
console.log(`已锚定一致: ${okList.join(' ')}`);
console.log(`偏差项: ${diffList.join(' ')}`);
console.log(`NOREF列表(${norefList.length}): ${norefList.join('、')}`);
