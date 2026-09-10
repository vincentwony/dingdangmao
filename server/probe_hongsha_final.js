'use strict';
const S = require('../core/shensha.js');
// 权威 2026 节气(公历) -> 节气月建
const JIE = [[1,5,'丑'],[2,4,'寅'],[3,5,'卯'],[4,5,'辰'],[5,5,'巳'],[6,5,'午'],
            [7,7,'未'],[8,7,'申'],[9,7,'酉'],[10,8,'戌'],[11,7,'亥'],[12,7,'子']];
function jieMB(m,d){ let b='丑'; const k=m*100+d; for(const [jm,jd,mb] of JIE){ if(k>=(jm*100+jd)) b=mb; else break; } return b; }
// 协纪 小红砂: 四孟(寅巳申亥)酉 / 四仲(卯午酉子)巳 / 四季(辰未戌丑)丑
function xiaoXie(mb,db){ const meng={寅:1,巳:1,申:1,亥:1},zhong={卯:1,午:1,酉:1,子:1},ji={辰:1,未:1,戌:1,丑:1};
  if(meng[mb]&&db==='酉')return true; if(zhong[mb]&&db==='巳')return true; if(ji[mb]&&db==='丑')return true; return false; }
// 玉匣记 大红砂: 春(寅卯辰)戌子 夏(巳午未)辰巳 秋(申酉戌)午未 冬(亥子丑)申戌
function daXie(mb,db){ const spr={寅:1,卯:1,辰:1},sum={巳:1,午:1,未:1},aut={申:1,酉:1,戌:1},win={亥:1,子:1,丑:1};
  if(spr[mb]&&(db==='戌'||db==='子'))return true; if(sum[mb]&&(db==='辰'||db==='巳'))return true;
  if(aut[mb]&&(db==='午'||db==='未'))return true; if(win[mb]&&(db==='申'||db==='戌'))return true; return false; }

let total=0, xiaoMatch=0, xiaoMiss=0, xiaoFalsePos=0;
let daCount=0, xiaoCorrectCount=0;
const exMiss=[], exFalse=[];
for(let m=1;m<=12;m++)for(let d=1;d<=31;d++){
  const dat=S.computeDayFromLunar(2026,m,d);
  if(!dat||!dat.dayGZ) continue;
  total++;
  const mb=dat.monthGZ?dat.monthGZ[1]:'?';
  const db=dat.dayGZ[1];
  const app=dat.hongsha;
  const correctX=xiaoXie(mb,db);          // 小红砂(协纪, 用引擎正确月支)
  const correctXindep=xiaoXie(jieMB(m,d),db); // 独立节气月建复核
  if(correctX!==correctXindep){ console.log('! 月支不一致(引擎vs权威):',m+'-'+d,'引擎'+mb,'权威'+jieMB(m,d)); }
  if(correctX){ xiaoCorrectCount++; }
  if(app===correctX) xiaoMatch++;
  else if(correctX&&!app){ xiaoMiss++; if(exMiss.length<10) exMiss.push(`漏标 ${m}-${d} ${dat.dayGZ} 月支=${mb}`); }
  else if(!correctX&&app){ xiaoFalsePos++; if(exFalse.length<10) exFalse.push(`误标 ${m}-${d} ${dat.dayGZ} 月支=${mb}`); }
  if(daXie(mb,db)) daCount++;
}
console.log(`\n=== 全年(公历驱动, 与线上一致) 小红砂核对 ===`);
console.log(`总天=${total}`);
console.log(`小红砂 协纪应标=${xiaoCorrectCount} 天`);
console.log(`app.hongsha 与协纪一致=${xiaoMatch}  漏标=${xiaoMiss}  误标=${xiaoFalsePos}`);
console.log('漏标示例:'); exMiss.forEach(e=>console.log('  '+e));
console.log('误标示例:'); exFalse.forEach(e=>console.log('  '+e));
console.log(`\n=== 大红砂(玉匣记) 全年应标=${daCount} 天; 当前 app 字段: 无(完全未标注) ===`);
