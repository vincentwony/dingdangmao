'use strict';
const L = require('lunisolar');
const S = require('../core/shensha.js');
// 权威 2026 节气(公历), 用于确定"节气月建"
// 小寒1-5 立春2-4 惊蛰3-5 清明4-5 立夏5-5 芒种6-5 小暑7-7 立秋8-7 白露9-7 寒露10-8 立冬11-7 大雪12-7
const JIE = [
  [1,5,'丑'],[2,4,'寅'],[3,5,'卯'],[4,5,'辰'],[5,5,'巳'],[6,5,'午'],
  [7,7,'未'],[8,7,'申'],[9,7,'酉'],[10,8,'戌'],[11,7,'亥'],[12,7,'子']
];
function jieMB(m,d){ // 取该日所属节气月建(立春前属丑月, 即上年小寒后)
  let branch='子'; // 1/1~1/4 仍属上年子月(大雪~小寒), 但1/5起丑
  for(const [jm,jd,mb] of JIE){ if((m*100+d) >= (jm*100+jd)) branch=mb; else break; }
  return branch;
}
// 12 个月中央抽样日
const samples = [[1,20,'丑'],[2,20,'寅'],[3,20,'卯'],[4,20,'辰'],[5,20,'巳'],[6,20,'午'],
                 [7,20,'未'],[8,20,'申'],[9,20,'酉'],[10,20,'戌'],[11,20,'亥'],[12,20,'子']];
console.log('抽样日 | 真实节气月建 | 引擎月支 | 日干支 | 是否差2');
for(const [m,d,exp] of samples){
  const o=L(new Date(2026,m-1,d));
  const dat=S.computeDayFromLunar(o.lunar.year,o.lunar.month,o.lunar.day);
  const eng = dat.monthGZ?dat.monthGZ[1]:'?';
  const diff = (BR_idx(eng)-BR_idx(exp)+12)%12;
  console.log(`${m}-${d} | ${exp} | ${eng} | ${dat.dayGZ} | 差${diff}位${diff===2?'  (引擎落后2)':''}`);
}
function BR_idx(z){ const Z=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']; return Z.indexOf(z); }
