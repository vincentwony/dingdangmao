// 重建 iztro 的三大流派规则：大限顺逆 / 长生基准 / 小限起宫
import iztro from 'iztro';

function load(y, m, d, t, sex) {
  const a = iztro.astro.bySolar(`${y}-${m}-${d}`, t, sex);
  const cd = a.rawDates.chineseDate;
  return { a, yearGan: cd.yearly[0], yearZhi: cd.yearly[1], dayGan: cd.daily[0], fiv: a.fiveElementsClass };
}

console.log('===== 一、大限顺逆（按 decadal.range 排序重建宫序）=====');
function decadalOrder(label, y, m, d, t, sex) {
  const { a } = load(y, m, d, t, sex);
  const sorted = a.palaces.filter(p => p.decadal && p.decadal.range)
    .sort((x, y) => x.decadal.range[0] - y.decadal.range[0]);
  console.log(`${label}: ` + sorted.map(p => `${p.name}(${p.decadal.range[0]})`).join(' → '));
}
decadalOrder('1990庚午男(阳男)', 1990, 6, 15, 6, '男');
decadalOrder('1985乙丑女(阴女)', 1985, 3, 20, 0, '女');
decadalOrder('1978戊午男(阳男)', 1978, 11, 8, 3, '男');

console.log('\n===== 二、长生基准（依五行局？）=====');
function changsheng(label, y, m, d, t, sex) {
  const { a, fiv } = load(y, m, d, t, sex);
  console.log(`${label} [五行局${fiv}]: ` + a.palaces.map(p => `${p.name}=${p.changsheng12}`).join(' '));
}
changsheng('1990火六局', 1990, 6, 15, 6, '男');
changsheng('1985土五局', 1985, 3, 20, 0, '女');
changsheng('1978木三局', 1978, 11, 8, 3, '男');
changsheng('1988金四局', 1988, 7, 7, 6, '女');
// 验证：火/土局长生应寅起，木局亥起，金局巳起，水局申起；一律顺行？
// 火六局命宫子：寅0卯1辰2巳3午4未5申6酉7戌8亥9子10=胎(索引10)
// 木三局命宫? 看输出

console.log('\n===== 三、小限起宫（各宫 ages 首个年龄 → 反推起宫+方向）=====');
function xiaoxian(label, y, m, d, t, sex) {
  const { a, yearZhi } = load(y, m, d, t, sex);
  // 找 ages[0] 最小的宫 = 起宫（1岁所在宫）
  let startPalace = null, minAge = 999;
  a.palaces.forEach(p => {
    const ages = p.ages || [];
    if (ages.length && ages[0] < minAge) { minAge = ages[0]; startPalace = p; }
  });
  console.log(`${label} [年${yearZhi}]: 起宫(最小age)=${startPalace ? startPalace.name + '(' + startPalace.earthlyBranch + ')' : '?'} age=${minAge}`);
  // 命宫 ages 首个
  const mp = a.palaces.find(p => p.name === '命宫');
  console.log(`   命宫 ages 前3: ${JSON.stringify((mp.ages || []).slice(0, 3))}`);
}
xiaoxian('1990庚午男', 1990, 6, 15, 6, '男');
xiaoxian('1985乙丑女', 1985, 3, 20, 0, '女');
xiaoxian('1978戊午男', 1978, 11, 8, 3, '男');
xiaoxian('1988戊辰女', 1988, 7, 7, 6, '女');
