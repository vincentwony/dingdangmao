// 验证：夏令时（1986–1991 中国）校准模块 — Phase 1.2 回归
// 用法：node verify_dst.js
const { isDST, applyDST } = require('./lib/dst.js');

const cases = [
  // 区间内凌晨（跨日）：1987-07-01 00:30 → 标准时 1987-06-30 23:30
  { y:1987,m:7,d:1, h:0,min:30, mode:'auto', exp:{y:1987,m:6,d:30,h:23,min:30,applied:true} },
  // 区间内白天：1987-07-01 12:00 → 11:00
  { y:1987,m:7,d:1, h:12,min:0, mode:'auto', exp:{y:1987,m:7,d:1,h:11,min:0,applied:true} },
  // 非区间年：1985 不减
  { y:1985,m:7,d:1, h:12,min:0, mode:'auto', exp:{applied:false} },
  // 手动 off：不减
  { y:1987,m:7,d:1, h:12,min:0, mode:'off', exp:{applied:false} },
  // 手动 on：强制减（信任用户）
  { y:1987,m:7,d:1, h:12,min:0, mode:'on', exp:{y:1987,m:7,d:1,h:11,min:0,applied:true} },
  // 跨年边界：1986-05-04 00:30 → 1986-05-03 23:30
  { y:1986,m:5,d:4, h:0,min:30, mode:'auto', exp:{y:1986,m:5,d:3,h:23,min:30,applied:true} },
  // 1992 起暂停：不减
  { y:1992,m:7,d:1, h:12,min:0, mode:'auto', exp:{applied:false} },
  // 1991 末日（9-15）区间内；9-16 外
  { y:1991,m:9,d:15, h:12,min:0, mode:'auto', exp:{applied:true} },
  { y:1991,m:9,d:16, h:12,min:0, mode:'auto', exp:{applied:false} },
  // isDST 边界
  { y:1986,m:5,d:4, h:0,min:0, mode:'auto', exp:{inRange:true} },
  { y:1986,m:5,d:3, h:0,min:0, mode:'auto', exp:{inRange:false} }
];

let fail = 0;
cases.forEach(function(c) {
  const r = applyDST(c.y, c.m, c.d, c.h, c.min, c.mode);
  const ok = (c.exp.applied === undefined || r.applied === c.exp.applied)
    && (c.exp.inRange === undefined || r.inRange === c.exp.inRange)
    && (c.exp.y === undefined || r.y === c.exp.y)
    && (c.exp.m === undefined || r.m === c.exp.m)
    && (c.exp.d === undefined || r.d === c.exp.d)
    && (c.exp.h === undefined || r.h === c.exp.h)
    && (c.exp.min === undefined || r.min === c.exp.min);
  if (!ok) { fail++; console.log('❌ ' + JSON.stringify(c) + ' → ' + JSON.stringify(r)); }
  else console.log('✅ ' + c.y + '-' + c.m + '-' + c.d + ' ' + c.h + ':' + (c.min<10?'0':'') + c.min + ' ' + c.mode + ' → ' + r.y + '-' + r.m + '-' + r.d + ' ' + r.h + ':' + (r.min<10?'0':'') + r.min + ' applied=' + r.applied);
});

console.log('\n' + (fail ? '❌ ' + fail + ' 项失败' : '✅ 夏令时模块回归通过'));
process.exit(fail ? 1 : 0);
