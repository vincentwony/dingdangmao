import iztro from 'iztro';
import { detectPatterns } from './ziwei_patterns.mjs';

const samples = [
  { y: 1990, m: 6, d: 15, t: 6, sex: '男', label: '1990庚午男' },
  { y: 1984, m: 6, d: 1, t: 6, sex: '男', label: '1984甲子男' },
  { y: 2000, m: 9, d: 1, t: 9, sex: '女', label: '2000庚辰女' },
  { y: 1978, m: 11, d: 8, t: 3, sex: '男', label: '1978戊午男' },
  { y: 1996, m: 2, d: 20, t: 6, sex: '女', label: '1996丙子女' },
];
for (const s of samples) {
  const a = iztro.astro.bySolar(`${s.y}-${s.m}-${s.d}`, s.t, s.sex);
  const mp = a.palaces.find(p => p.name === '命宫');
  const pats = detectPatterns(a);
  const ji = pats.filter(p => p.cat === '吉').map(p => p.name);
  const sha = pats.filter(p => p.cat === '煞').map(p => p.name);
  console.log(`\n[${s.label}] 命宫=${mp.earthlyBranch}(${mp.heavenlyStem}) 吉${ji.length}/煞${sha.length}`);
  if (ji.length) console.log('  吉:', ji.join('、'));
  if (sha.length) console.log('  煞:', sha.join('、'));
}
