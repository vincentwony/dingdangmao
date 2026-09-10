// 验证：宜忌后置注入（大红砂/小红砂）— Phase 1.1 回归
// 用法：node verify_yi_ji.js
const router = require('./routes/calendar.js');
const _getLsrActs = router._getLsrActs;
const S = require('../core/shensha.js');

let daTotal = 0, daOk = 0, daMiss = 0;
let xiaoTotal = 0, xiaoOk = 0, xiaoMiss = 0;

for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= 31; d++) {
    let cd;
    try { cd = S.computeDayFromLunar(2026, m, d); } catch (e) { continue; }
    if (!cd || !cd.dayGZ) continue;
    const acts = _getLsrActs(2026, m, d);
    if (cd.dahongsha) {
      daTotal++;
      if ((acts.good || []).indexOf('百事吉（大红砂·吉）') >= 0) daOk++; else daMiss++;
    }
    if (cd.hongsha) {
      xiaoTotal++;
      if ((acts.bad || []).indexOf('小红砂（凶·忌百事）') >= 0) xiaoOk++; else xiaoMiss++;
    }
  }
}

console.log('大红砂日 ' + daTotal + ' 天 → 宜忌已注入 ' + daOk + ' 天，漏 ' + daMiss);
console.log('小红砂日 ' + xiaoTotal + ' 天 → 宜忌已注入 ' + xiaoOk + ' 天，漏 ' + xiaoMiss);

const pass = daMiss === 0 && xiaoMiss === 0 && daTotal > 0 && xiaoTotal > 0;
console.log(pass ? '✅ 宜忌后置注入回归通过' : '❌ 宜忌后置注入回归失败');
process.exit(pass ? 0 : 1);
