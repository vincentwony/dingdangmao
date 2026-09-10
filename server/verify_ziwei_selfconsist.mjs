// verify_ziwei_selfconsist.mjs — 自证：用 iztro 流派规则重建基准，应与 iztro 原始 0 偏差
// 目的：证明算法引擎实现正确 + iztro 自洽（之前 178 失败纯属流派不同）
import iztro from 'iztro';
import * as B from './ziwei_baseline.mjs';

const WXJU_AGE = B.WXJU_AGE, ZHI = B.ZHI, ZHI_IDX = B.ZHI_IDX, PALACE_SEQ = B.PALACE_SEQ, CS12 = B.CS12;
const JU_WX = { '水二局': '水', '木三局': '木', '金四局': '金', '土五局': '土', '火六局': '火' };
const CS_START = { '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申' };

// iztro 派：大限一律命宫逆布(dir=-1)
function iztroDecadal(palaces, fiv) {
  const A = WXJU_AGE[fiv]; if (!A) return {};
  const mpSeq = PALACE_SEQ[palaces.find(p => p.name === '命宫').name];
  const dir = -1, out = {};
  palaces.forEach(p => {
    let s = mpSeq, steps = 0;
    while (s !== PALACE_SEQ[p.name] && steps < 12) { s = ((s - 1 + dir + 12) % 12) + 1; steps++; }
    const k = steps + 1; out[p.name] = { start: A + (k - 1) * 10, end: A + (k - 1) * 10 + 9 };
  });
  return out;
}
// iztro 派：长生依五行局，一律顺行(dir=+1)
function iztroChangsheng(palaces, fiv) {
  const startZhi = CS_START[JU_WX[fiv]], dir = +1, out = {};
  palaces.forEach(p => { out[p.name] = CS12[((ZHI_IDX[p.earthlyBranch] - ZHI_IDX[startZhi]) * dir % 12 + 12) % 12]; });
  return out;
}

const samples = [
  { y: 1990, m: 6, d: 15, t: 6, sex: '男' }, { y: 1985, m: 3, d: 20, t: 0, sex: '女' },
  { y: 1978, m: 11, d: 8, t: 3, sex: '男' }, { y: 2000, m: 9, d: 1, t: 9, sex: '女' },
  { y: 1995, m: 1, d: 1, t: 11, sex: '男' }, { y: 1988, m: 7, d: 7, t: 6, sex: '女' },
];
let fail = 0, total = 0; const fails = [];
for (const s of samples) {
  const a = iztro.astro.bySolar(`${s.y}-${s.m}-${s.d}`, s.t, s.sex);
  const fiv = a.fiveElementsClass;
  const dec = iztroDecadal(a.palaces, fiv), cs = iztroChangsheng(a.palaces, fiv);
  a.palaces.forEach(p => {
    if (p.decadal && p.decadal.range) { total++; if (dec[p.name].start !== p.decadal.range[0]) { fail++; fails.push(`[大限]${s.y}${s.sex}${p.name} 期望${dec[p.name].start} 实${p.decadal.range[0]}`); } }
    total++; if (cs[p.name] !== p.changsheng12) { fail++; fails.push(`[长生]${s.y}${s.sex}${p.name} 期望${cs[p.name]} 实${p.changsheng12}`); }
  });
}
console.log(`iztro流派重建基准 vs iztro原始：总计 ${total} 项，失败 ${fail} 项`);
if (fails.length) fails.forEach(f => console.log('  - ' + f));
process.exit(fail ? 1 : 0);
