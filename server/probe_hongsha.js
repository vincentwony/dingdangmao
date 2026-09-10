'use strict';
const L = require('lunisolar');
const shensha = require('../core/shensha.js');

function probe(sy, sm, sd) {
  const o = L(new Date(sy, sm - 1, sd));
  const ln = o.lunar;
  const m = ln.month; // 2026 无相关闰月，简化处理
  const dat = shensha.computeDayFromLunar(ln.year, m, ln.day);
  if (!dat) return { date: sy + '-' + sm + '-' + sd, err: 'null' };
  return {
    date: sy + '-' + sm + '-' + sd,
    gz: dat.dayGZ,
    monthBranch: dat.monthGZ ? dat.monthGZ[1] : '?',
    hongsha: dat.hongsha
  };
}

// 协纪起法: 孟(寅巳申亥)酉 / 仲(卯午酉子)巳 / 季(辰未戌丑)丑
function expectXiao(mb, db) {
  const meng = { 寅:1, 巳:1, 申:1, 亥:1 };
  const zhong = { 卯:1, 午:1, 酉:1, 子:1 };
  const ji = { 辰:1, 未:1, 戌:1, 丑:1 };
  if (meng[mb] && db === '酉') return true;
  if (zhong[mb] && db === '巳') return true;
  if (ji[mb] && db === '丑') return true;
  return false;
}

console.log('=== A. 立春边界(2026 立春=2/4) 酉日是否随节气月建翻转 ===');
const rows = [];
for (let i = 0; i < 50; i++) {
  const dt = new Date(2026, 0, 20 + i);
  const r = probe(2026, dt.getMonth() + 1, dt.getDate());
  if (r.gz && r.gz[1] === '酉') rows.push(r);
}
rows.forEach(r => {
  const exp = expectXiao(r.monthBranch, '酉');
  console.log(`${r.date} ${r.gz} 月支=${r.monthBranch} app=${r.hongsha} 协纪=${exp} ${r.hongsha===exp?'OK':'❌'}`);
});

console.log('\n=== B. 2026 全年: app 小红砂 vs 协纪起法 一致性 ===');
let total = 0, mismatch = 0, hits = 0;
for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= 31; d++) {
    let r; try { r = probe(2026, m, d); } catch (e) { continue; }
    if (r.err || !r.gz) continue;
    total++;
    const exp = expectXiao(r.monthBranch, r.gz[1]);
    if (exp) hits++;
    if (r.hongsha !== exp) { mismatch++; if (mismatch <= 15) console.log(`  不一致 ${r.date} ${r.gz} 月支=${r.monthBranch} app=${r.hongsha} 协纪=${exp}`); }
  }
}
console.log(`2026 共 ${total} 天, 协纪版小红砂命中 ${hits} 天, 与协纪不一致 ${mismatch} 天`);

console.log('\n=== C. dat 字段是否含"大红砂/大红沙/dahong"? ===');
const s = probe(2026, 5, 1);
const keys = Object.keys(s).join(',');
console.log('无(字段里只有 hongsha=小红砂), 大红砂相关字段:', /hong|da/.test(keys) ? '仅 hongsha' : '无');
