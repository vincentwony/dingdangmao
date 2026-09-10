'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

// value->节气名(1起): 1小寒 2立春 3雨水 4惊蛰 5春分 6清明 7谷雨 8立夏 9小满 10芒种
// 11夏至 12小暑 13大暑 14立秋 15处暑 16白露 17秋分 18寒露 19霜降 20立冬 21小雪 22大雪 23冬至 24小寒
// 12个"节"(换月建): 立春2 惊蛰4 清明6 立夏8 芒种10 小暑12 立秋14 白露16 寒露18 立冬20 大雪22 小寒24
const JIE = {2:'寅',4:'卯',6:'辰',8:'巳',10:'午',12:'未',14:'申',16:'酉',18:'戌',20:'亥',22:'子',24:'丑'};

// 提取 2026 各"节"的公历日期
const jieDates = []; // {date, branch}
for (let m=1;m<=12;m++){
  for (let d=1;d<=31;d++){
    let o; try{ o=L(new Date(2026,m-1,d)); }catch(e){ continue; }
    const t = o.solarTerm;
    if (t && t.value && JIE[t.value]) jieDates.push({y:2026,m,d,branch:JIE[t.value]});
  }
}
jieDates.sort((a,b)=> (a.m*100+a.d)-(b.m*100+b.d));
console.log('2026 十二节(月建)日期:');
jieDates.forEach(j=>console.log(`  ${j.m}-${j.d} -> ${j.branch}月`));

// 对 2026 任意一天，返回所在节气月建
function jieMonthBranch(y,m,d){
  const key = m*100+d;
  let branch = '丑'; // 默认(1/1前=上年大雪后子月? 用首个节前回退)
  // 小寒(1月)前属于上年子月(大雪~小寒)
  for (const j of jieDates){
    const jk = j.m*100+j.d;
    if (jk <= key) branch = j.branch; else break;
  }
  return branch;
}

// 协纪 小红砂: 孟(寅巳申亥)酉 / 仲(卯午酉子)巳 / 季(辰未戌丑)丑
function xiaoByBranch(mb, db){
  const meng={寅:1,巳:1,申:1,亥:1}, zhong={卯:1,午:1,酉:1,子:1}, ji={辰:1,未:1,戌:1,丑:1};
  if (meng[mb]&&db==='酉') return true;
  if (zhong[mb]&&db==='巳') return true;
  if (ji[mb]&&db==='丑') return true;
  return false;
}

// 全量差分: 引擎 hongsha vs 正确节气月建小红砂
let total=0, appTrue=0, appFalse=0, miss=0, falsePos=0;
const examples=[];
for (let m=1;m<=12;m++){
  for (let d=1;d<=31;d++){
    let o, dat; try{ o=L(new Date(2026,m-1,d)); }catch(e){ continue; }
    try{ dat = shensha.computeDayFromLunar(o.lunar.year, o.lunar.month, o.lunar.day); }catch(e){ continue; }
    if (!dat || !dat.dayGZ) continue;
    total++;
    const correct = xiaoByBranch(jieMonthBranch(2026,m,d), dat.dayGZ[1]);
    const app = dat.hongsha;
    if (correct && app) appTrue++;
    if (!correct && !app) appFalse++; // 都判非红砂
    if (correct && !app){ miss++; if(examples.length<10) examples.push(`漏标 ${2026}-${m}-${d} ${dat.dayGZ} 节气月支=${jieMonthBranch(2026,m,d)}`); }
    if (!correct && app){ falsePos++; if(examples.length<20) examples.push(`误标 ${2026}-${m}-${d} ${dat.dayGZ} 节气月支=${jieMonthBranch(2026,m,d)} 引擎月支=${dat.monthGZ?dat.monthGZ[1]:'?'}`); }
  }
}
console.log(`\n2026 全年: 总天=${total}, 正确且app标=${appTrue}, 正确且app未标(漏)=${miss}, 错误但app标(误)=${falsePos}, 都未标=${appFalse}`);
console.log('示例(漏标/误标):');
examples.forEach(e=>console.log('  '+e));
