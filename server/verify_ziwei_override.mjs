// verify_ziwei_override.mjs — 模拟后端覆盖层，验证覆盖后输出符合倪师传统派（全书北派）
import iztro from 'iztro';
import * as B from './ziwei_baseline.mjs';

const WXJU_AGE = B.WXJU_AGE;
const PALACE_SEQ = B.PALACE_SEQ;
const GAN_YINYANG = B.GAN_YINYANG;

// 样本覆盖 年干阴阳 × 性别 全组合；traditional 大限方向：阳男阴女顺 / 阴男阳女逆
const samples = [
  { y: 1990, m: 6, d: 15, t: 6, sex: '男', label: '1990庚午男(阳男/应顺)' },
  { y: 2000, m: 9, d: 1, t: 9, sex: '女', label: '2000庚辰女(阳女/应逆)' },
  { y: 1985, m: 3, d: 20, t: 0, sex: '女', label: '1985乙丑女(阴女/应顺)' },
  { y: 1987, m: 1, d: 1, t: 6, sex: '男', label: '1987丙寅男(阳男/应顺)' },
  { y: 1978, m: 11, d: 8, t: 3, sex: '男', label: '1978戊午男(阳男/应顺)' },
  { y: 1988, m: 7, d: 7, t: 6, sex: '女', label: '1988戊辰女(阳女/应逆)' },
  { y: 1984, m: 5, d: 5, t: 1, sex: '男', label: '1984甲子男(阳男/应顺)' },
  { y: 1991, m: 2, d: 2, t: 11, sex: '女', label: '1991庚午女(阳女/应逆)' },
];

let fail = 0, total = 0; const fails = [];
for (const s of samples) {
  const a = iztro.astro.bySolar(`${s.y}-${s.m}-${s.d}`, s.t, s.sex);
  const cd = a.rawDates.chineseDate;
  const yearGan = cd.yearly[0];
  const yearZhi = cd.yearly[1];
  const dayGan = cd.daily[0];
  const fiv = a.fiveElementsClass;
  // 模拟后端覆盖层
  const ctx = {
    decadal: B.baselineDecadal(a.palaces, fiv, yearGan, s.sex),
    ages: B.baselineAges(a.palaces, yearZhi, s.sex),
    changsheng: B.baselineChangsheng(a.palaces, dayGan),
  };
  const covered = a.palaces.map(p => ({
    name: p.name,
    decadal: ctx.decadal[p.name] ? { start: ctx.decadal[p.name].start, end: ctx.decadal[p.name].end } : null,
    ages: ctx.ages[p.name] || [],
    changsheng: ctx.changsheng[p.name] || '',
  }));

  // 1) 起运年龄：命宫 decadal.start == 五行局起运年龄
  const mp = covered.find(p => p.name === '命宫');
  const expectStart = WXJU_AGE[fiv];
  total++;
  if (mp.decadal.start !== expectStart) { fail++; fails.push(`${s.label}: 起运年龄期望${expectStart} 实${mp.decadal.start}`); }

  // 2) 大限方向：传统派 阳男阴女顺(+1)/阴男阳女逆(-1)
  const tradDir = ((GAN_YINYANG[yearGan] === 1 && s.sex === '男') || (GAN_YINYANG[yearGan] === 0 && s.sex === '女')) ? '顺' : '逆';
  const sorted = covered.filter(p => p.decadal).sort((x, y) => x.decadal.start - y.decadal.start);
  const seq = sorted.map(p => p.name);
  const next = seq[(seq.indexOf('命宫') + 1) % 12];
  const actualDir = next === '兄弟' ? '顺' : (next === '父母' ? '逆' : '?');
  total++;
  if (actualDir !== tradDir) { fail++; fails.push(`${s.label}: 大限方向期望${tradDir} 实${actualDir} (序:${seq.join('→')})`); }

  // 3) 长生：覆盖后非空（值由传统派基准给出，已与文档日干五行法对齐）
  covered.forEach(p => { total++; if (!p.changsheng) { fail++; fails.push(`${s.label}/${p.name}: 长生空`); } });

  // 4) 小限：命宫 ages 非空且间隔12
  total++;
  if (!(mp.ages.length && mp.ages[1] - mp.ages[0] === 12)) { fail++; fails.push(`${s.label}: 小限命宫间隔非12 (${mp.ages.slice(0,3).join(',')})`); }

  // 5) 小限起宫一致性：1岁小限应落「起宫地支」对应宫（文档小限起宫表，非命宫）
  const startZhi = B.XIAOXIAN_START[yearZhi][s.sex];
  const palaceByZhi = {}; a.palaces.forEach(p => { palaceByZhi[p.earthlyBranch] = p.name; });
  const age1Palace = covered.find(p => p.ages.includes(1));
  total++;
  if (age1Palace && age1Palace.name !== palaceByZhi[startZhi]) { fail++; fails.push(`${s.label}: 1岁小限应在${startZhi}(${palaceByZhi[startZhi]}宫) 实${age1Palace.name}宫`); }

  console.log(`${s.label}: 局=${fiv} 起运=${mp.decadal.start} 大限=${actualDir}(期${tradDir}) 长生命宫=${mp.changsheng} 小限起宫=${startZhi}`);
}
// 文档明例校验：男命子年生，1岁辰宫→2岁卯宫→3岁寅宫→4岁丑宫（逆行），《紫微斗数全书》安小限诀
{
  const ex = iztro.astro.bySolar('1984-6-1', 0, '男'); // 1984-06-01 确为甲子年（春节2/2后）
  const cd = ex.rawDates.chineseDate;
  const ages = B.baselineAges(ex.palaces, cd.yearly[1], '男');
  const seq1to4 = [1, 2, 3, 4].map(age => ex.palaces.find(p => ages[p.name].includes(age)).earthlyBranch);
  const expect = ['辰', '卯', '寅', '丑'];
  total++;
  if (JSON.stringify(seq1to4) !== JSON.stringify(expect)) { fail++; fails.push(`文档明例(子年男)小限1-4岁 期望辰卯寅丑 实${seq1to4.join('')}`); }
  console.log(`文档明例(子年男): 小限1-4岁=${seq1to4.join('→')} (期望辰→卯→寅→丑)`);
}

console.log(`\n=== 传统派覆盖层验证: ${total - fail}/${total} 通过, ${fail} 失败 ===`);
if (fails.length) console.log('失败项:\n' + fails.join('\n'));
process.exit(fail ? 1 : 0);
