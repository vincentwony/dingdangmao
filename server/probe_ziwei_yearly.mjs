// 探针：流年盘结构（修正姿势——用 astrolabe.horoscope(date, timeIdx) 实例方法）
import iztro from 'iztro';
const astro = iztro.astro.bySolar('1990-6-15', 6, '男');

console.log('=== 流年 yearly（targetYear=2026）===');
const horo = astro.horoscope(new Date(2026, 0, 1), 6);
console.log('horo keys:', Object.keys(horo).join(', '));
console.log('yearly type:', typeof horo.yearly, Array.isArray(horo.yearly) ? 'len=' + horo.yearly.length : '');
if (Array.isArray(horo.yearly) && horo.yearly[0]) {
  console.log('yearly[0] keys:', Object.keys(horo.yearly[0]).join(', '));
  console.log('yearly[0] sample:', JSON.stringify(horo.yearly[0]).slice(0, 500));
}
console.log('decadal type:', typeof horo.decadal, Array.isArray(horo.decadal) ? 'len=' + horo.decadal.length : '');
if (Array.isArray(horo.decadal) && horo.decadal[0]) console.log('decadal[0] sample:', JSON.stringify(horo.decadal[0]).slice(0, 300));
console.log('age:', JSON.stringify(horo.age));

console.log('\n=== 流年命宫定位（找 yearly 里 name=命宫 的宫）===');
if (Array.isArray(horo.yearly)) {
  const ym = horo.yearly.find((p) => p.name === '命宫');
  if (ym) {
    console.log('流年命宫:', ym.heavenlyStem + ym.earthlyBranch, 'majorStars:', (ym.majorStars || []).map((s) => s.name + (s.mutagen ? '(' + s.mutagen + ')' : '')).join(','));
    console.log('流年命宫 全部星:', (ym.majorStars || []).concat(ym.minorStars || [], ym.adjectiveStars || []).map((s) => s.name + (s.mutagen ? '(' + s.mutagen + ')' : '')).join(','));
  }
  // 流年四化应依流年天干（2026 丙午年，丙干四化：天同禄/天机权/文昌科/廉贞忌）
  console.log('流年天干应为 丙（2026丙午）→ 年干四化 天同禄/天机权/文昌科/廉贞忌');
  const allMut = {};
  horo.yearly.forEach((p) => {
    ['majorStars', 'minorStars', 'adjectiveStars'].forEach((k) => (p[k] || []).forEach((s) => { if (s.mutagen) (allMut[s.name] = allMut[s.name] || []).push(s.mutagen); }));
  });
  console.log('流年盘中带 mutagen 的星:', JSON.stringify(allMut));
}
