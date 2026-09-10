// 锁定 iztro 大限方向规律：年干阴阳 × 性别 四组合
import iztro from 'iztro';
function decadalDir(y, m, d, t, sex) {
  const a = iztro.astro.bySolar(`${y}-${m}-${d}`, t, sex);
  const cd = a.rawDates.chineseDate;
  const sorted = a.palaces.filter(p => p.decadal && p.decadal.range)
    .sort((x, y) => x.decadal.range[0] - y.decadal.range[0]);
  const seq = sorted.map(p => p.name);
  // 命宫之后是 父母=逆序(-1)，兄弟=顺行(+1)
  const mpIdx = seq.indexOf('命宫');
  const next = seq[(mpIdx + 1) % 12];
  const dir = next === '父母' ? '逆(-1)' : (next === '兄弟' ? '顺(+1)' : '?' + next);
  console.log(`${y} ${cd.yearly[0]}${cd.yearly[1]} ${sex} [五行局${a.fiveElementsClass}]: 大限方向=${dir}  序:${seq.join('→')}`);
}
decadalDir(1990, 6, 15, 6, '男');   // 庚午 阳男
decadalDir(2000, 9, 1, 9, '女');    // 庚辰 阳女
decadalDir(1985, 3, 20, 0, '女');   // 乙丑 阴女
decadalDir(1987, 1, 1, 6, '男');    // 丁卯 阴男
decadalDir(1995, 1, 1, 11, '男');   // 甲戌 阳男
decadalDir(1988, 7, 7, 6, '女');    // 戊辰 阳女(戊阳)
decadalDir(1984, 5, 5, 0, '男');    // 甲子 阳男
decadalDir(1991, 2, 2, 3, '女');    // 辛未 阴女
