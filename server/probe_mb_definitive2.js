'use strict';
const S = require('../core/shensha.js');
// computeDayFromLunar 实际接收【公历】y/m/d(路由层如此调用), 内部转农历。
// 权威 2026 节气(公历)用于确定节气月建:
// 小寒1-5 立春2-4 惊蛰3-5 清明4-5 立夏5-5 芒种6-5 小暑7-7 立秋8-7 白露9-7 寒露10-8 立冬11-7 大雪12-7
const JIE = [[1,5,'丑'],[2,4,'寅'],[3,5,'卯'],[4,5,'辰'],[5,5,'巳'],[6,5,'午'],
            [7,7,'未'],[8,7,'申'],[9,7,'酉'],[10,8,'戌'],[11,7,'亥'],[12,7,'子']];
function jieMB(m,d){ let b='丑'; const k=m*100+d; for(const [jm,jd,mb] of JIE){ if(k>=(jm*100+jd)) b=mb; else break; } return b; }
const Z=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const samples=[[1,20,'丑'],[2,20,'寅'],[3,20,'卯'],[4,20,'辰'],[5,20,'巳'],[6,20,'午'],
              [7,20,'未'],[8,20,'申'],[9,20,'酉'],[10,20,'戌'],[11,20,'亥'],[12,20,'子']];
console.log('公历抽样 | 真实节气月建 | 引擎月支 | 日干支 | 偏移(引擎-真实, mod12)');
for(const [m,d,exp] of samples){
  const dat=S.computeDayFromLunar(2026,m,d);
  const eng=dat.monthGZ?dat.monthGZ[1]:'?';
  const diff=(Z.indexOf(eng)-Z.indexOf(exp)+12)%12;
  console.log(`${m}-${d} | ${exp} | ${eng} | ${dat.dayGZ} | 偏移${diff}${diff===0?'  ✓一致':''}`);
}
