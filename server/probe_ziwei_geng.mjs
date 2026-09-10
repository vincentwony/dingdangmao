// 探针：取 iztro 在「庚年」实际吐出的四化（星曜 mutagen 字段）
import iztro from 'iztro';

function probe(y, m, d, t, sex) {
  const astro = iztro.astro.bySolar(`${y}-${m}-${d}`, t, sex);
  const cd = astro.rawDates.chineseDate;
  const yearStem = cd.yearly[0];
  const mut = {};
  astro.palaces.forEach((p) => {
    ['majorStars', 'minorStars', 'adjectiveStars'].forEach((k) => {
      (p[k] || []).forEach((s) => {
        if (s.mutagen) mut[s.name] = s.mutagen;
      });
    });
  });
  // 整理为 禄/权/科/忌 四星
  const byType = { 禄: [], 权: [], 科: [], 忌: [] };
  Object.entries(mut).forEach(([name, t]) => { if (byType[t]) byType[t].push(name); });
  return { yearStem, byType };
}

// 庚年示例：1990-06-15 午时（庚午年）；另取 2000-03-20（庚辰年）交叉验证
const a = probe(1990, 6, 15, 6, '男');
const b = probe(2000, 3, 20, 8, '女');
console.log('iztro 庚干四化 #1:', JSON.stringify(a));
console.log('iztro 庚干四化 #2:', JSON.stringify(b));
