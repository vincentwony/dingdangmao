'use strict';
const L = require('lunisolar');
const S = require('../core/shensha.js');

// 12 个“节”(换月建) -> 月支
const JIE = {'立春':'寅','惊蛰':'卯','清明':'辰','立夏':'巳','芒种':'午','小暑':'未','立秋':'申','白露':'酉','寒露':'戌','立冬':'亥','大雪':'子','小寒':'丑'};

// 第1步：用引擎自身 solarTerm 采集 2026 全年 12 节 的公历日期
const jieDates = [];
for (let m=1;m<=12;m++) for (let d=1;d<=31;d++){
  let o; try{ o=L(new Date(2026,m-1,d)); }catch(e){ continue; }
  let dat; try{ dat=S.computeDayFromLunar(o.lunar.year,o.lunar.month,o.lunar.day); }catch(e){ continue; }
  if (dat && dat.solarTerm && JIE[dat.solarTerm]) jieDates.push({m,d,branch:JIE[dat.solarTerm]});
}
jieDates.sort((a,b)=>(a.m*100+a.d)-(b.m*100+b.d));
console.log('2026 十二节(月建) 由引擎 solarTerm 得出:');
jieDates.forEach(j=>console.log(`  ${j.m}-${j.d} -> ${j.branch}月`));

// 第2步：对任一天返回“正确节气月建”(取已过的最后一个节)
function jieMonthBranch(m,d){
  const key=m*100+d; let branch='子'; // 1/1 前属上年大雪后之子月
  for (const j of jieDates){ const jk=j.m*100+j.d; if(jk<=key) branch=j.branch; else break; }
  return branch;
}

function xiaoByBranch(mb,db){ const meng={寅:1,巳:1,申:1,亥:1},zhong={卯:1,午:1,酉:1,子:1},ji={辰:1,未:1,戌:1,丑:1};
  if(meng[mb]&&db==='酉')return true; if(zhong[mb]&&db==='巳')return true; if(ji[mb]&&db==='丑')return true; return false; }
// 玉匣记 大红砂
function daByBranch(mb,db){ const spr={寅:1,卯:1,辰:1},sum={巳:1,午:1,未:1},aut={申:1,酉:1,戌:1},win={亥:1,子:1,丑:1};
  if(spr[mb]&&(db==='戌'||db==='子'))return true; if(sum[mb]&&(db==='辰'||db==='巳'))return true;
  if(aut[mb]&&(db==='午'||db==='未'))return true; if(win[mb]&&(db==='申'||db==='戌'))return true; return false; }

let total=0, appTrue=0, miss=0, falsePos=0, bothNeg=0;
let mbSame=0, mbDiff=0; const mbEx=[];
const exXiao=[], exDa=[]; let daCount=0;
for (let m=1;m<=12;m++) for (let d=1;d<=31;d++){
  let o,dat; try{ o=L(new Date(2026,m-1,d)); }catch(e){ continue; }
  try{ dat=S.computeDayFromLunar(o.lunar.year,o.lunar.month,o.lunar.day); }catch(e){ continue; }
  if(!dat||!dat.dayGZ) continue;
  total++;
  const engMB = dat.monthGZ?dat.monthGZ[1]:'?';
  const corMB = jieMonthBranch(m,d);
  if(engMB===corMB) mbSame++; else { mbDiff++; if(mbEx.length<10) mbEx.push(`${m}-${d} 引擎=${engMB} 节气=${corMB} ${dat.dayGZ}`); }
  const correctX = xiaoByBranch(corMB, dat.dayGZ[1]);
  const app = dat.hongsha;
  if(correctX&&app) appTrue++;
  else if(!correctX&&!app) bothNeg++;
  else if(correctX&&!app){ miss++; if(exXiao.length<8) exXiao.push(`漏标 ${m}-${d} ${dat.dayGZ} 节气月支=${corMB}`); }
  else if(!correctX&&app){ falsePos++; if(exXiao.length<12) exXiao.push(`误标 ${m}-${d} ${dat.dayGZ} 节气月支=${corMB} 引擎月支=${engMB}`); }
  const da = daByBranch(corMB, dat.dayGZ[1]);
  if(da){ daCount++; if(exDa.length<10) exDa.push(`大红砂 ${m}-${d} ${dat.dayGZ} 节气月支=${corMB}`); }
}
console.log(`\n=== 根因: 引擎 Lmonth2 月支 vs 正确节气月建(引擎自身节气) ===`);
console.log(`全年 ${total} 天, 一致 ${mbSame}, 不一致 ${mbDiff}`);
console.log('月支不一致示例:'); mbEx.forEach(e=>console.log('  '+e));
console.log(`\n=== 小红砂(app hongsha) vs 协纪(节气月建) ===`);
console.log(`总天=${total}  正确且app标=${appTrue}  漏标=${miss}  误标=${falsePos}  都未标=${bothNeg}`);
console.log('小红砂 漏/误 示例:'); exXiao.forEach(e=>console.log('  '+e));
console.log(`\n=== 大红砂(玉匣记) 全年应标 ${daCount} 天, 当前 app 完全未标注 ===`);
exDa.forEach(e=>console.log('  '+e));
