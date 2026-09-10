// verify_ziwei_modules.mjs — 多样本比对 iztro 的大限/小限/长生 与独立基准
import iztro from 'iztro';
import * as B from './ziwei_baseline.mjs';

const samples = [
  { y: 1990, m: 6, d: 15, t: 6, sex: '男', label: '1990男午(火六局)' },
  { y: 1985, m: 3, d: 20, t: 0, sex: '女', label: '1985女子(逆)' },
  { y: 1978, m: 11, d: 8, t: 3, sex: '男', label: '1978男卯' },
  { y: 2000, m: 9, d: 1, t: 9, sex: '女', label: '2000女酉' },
  { y: 1995, m: 1, d: 1, t: 11, sex: '男', label: '1995男亥' },
  { y: 1988, m: 7, d: 7, t: 6, sex: '女', label: '1988女午' },
];

let fail = 0, total = 0;
const fails = [];
for (const s of samples) {
  const astro = iztro.astro.bySolar(`${s.y}-${s.m}-${s.d}`, s.t, s.sex);
  const cd = astro.rawDates.chineseDate;
  const yearGan = cd.yearly[0], yearZhi = cd.yearly[1];
  const dayGan = cd.daily[0];
  const fiv = astro.fiveElementsClass;
  console.log(`\n##### ${s.label} | 年${yearGan}${yearZhi} 日${dayGan}? 五行局${fiv} #####`);

  // 大限起运
  const baseDec = B.baselineDecadal(astro.palaces, fiv, yearGan, s.sex);
  astro.palaces.forEach(p => {
    if (!p.decadal || !p.decadal.range) return;
    const exp = baseDec[p.name] ? baseDec[p.name].start : null;
    const got = p.decadal.range[0];
    const ok = exp === got;
    total++;
    if (!ok) { fail++; fails.push(`[大限] ${s.label}/${p.name} 期望${exp} 实得${got}`); }
  });

  // 小限
  const baseAge = B.baselineAges(astro.palaces, yearZhi, s.sex);
  astro.palaces.forEach(p => {
    const b = baseAge[p.name] || [];
    const got = p.ages || [];
    const ok = got.length > 0 && got.every(a => b.includes(a)); // 集合包含（忽略上限差异）
    total++;
    if (!ok) { fail++; fails.push(`[小限] ${s.label}/${p.name} 基准前3=${JSON.stringify(b.slice(0,3))} 实得前3=${JSON.stringify(got.slice(0,3))}`); }
  });

  // 长生十二宫
  const baseCs = B.baselineChangsheng(astro.palaces, dayGan);
  astro.palaces.forEach(p => {
    const b = baseCs[p.name];
    const got = p.changsheng12;
    const ok = b === got;
    total++;
    if (!ok) { fail++; fails.push(`[长生] ${s.label}/${p.name}(${p.earthlyBranch}) 期望${b} 实得${got}`); }
  });
}

console.log(`\n==== 总计 ${total} 项校验，失败 ${fail} 项 ====`);
if (fails.length) { console.log('失败明细：'); fails.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);
