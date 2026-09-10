// 探针 stage3：飞星结构、流年 getHoroscope、格局、长生起法
import iztro from 'iztro';

const astro = iztro.astro.bySolar('1990-6-15', 6, '男');
const mp = astro.palaces.find((p) => p.name === '命宫');
console.log('命宫:', mp ? mp.name + ' ' + mp.heavenlyStem + mp.earthlyBranch : 'NOT FOUND');
if (mp) {
  console.log('  命宫 isMainPalace=', mp.isMainPalace, 'isBodyPalace=', mp.isBodyPalace);
  try { console.log('  fliesTo(禄)=>', JSON.stringify(mp.fliesTo('禄'))); } catch (e) { console.log('  fliesTo err:', e.message); }
  try { console.log('  fliesTo(权)=>', JSON.stringify(mp.fliesTo('权'))); } catch (e) { console.log('  fliesTo err:', e.message); }
  try { console.log('  mutagedPlaces=>', JSON.stringify(mp.mutagedPlaces)); } catch (e) { console.log('  mutagedPlaces err:', e.message); }
}

console.log('\n=== getHoroscope 签名探测 ===');
console.log('typeof iztro.astro.getHoroscope =', typeof iztro.astro.getHoroscope);
// 常见签名：getHoroscope(astrolabe, birthYear) 或 (astrolabe, option)
try {
  const h = iztro.astro.getHoroscope(astro, 1990);
  console.log('getHoroscope(astro,1990) keys:', h ? Object.keys(h).join(', ') : 'null');
  if (h) console.log('  sample:', JSON.stringify(h).slice(0, 300));
} catch (e) { console.log('getHoroscope(astro,1990) err:', e.message); }
try {
  const h2 = iztro.astro.getHoroscope(astro, { year: 1990 });
  console.log('getHoroscope(astro,{year:1990}) keys:', h2 ? Object.keys(h2).join(', ') : 'null');
} catch (e) { console.log('getHoroscope(astro,{year}) err:', e.message); }

console.log('\n=== 格局判定探测 ===');
console.log('astro.plugins =', JSON.stringify(astro.plugins));
console.log('命宫 是否含 pattern/remark/horoscopeStars:', 'pattern' in mp, '|', 'remark' in mp, '|', 'horoscopeStars' in mp);
// 看 palaces 是否有任何 pattern 字段
const anyPat = astro.palaces.find((p) => 'pattern' in p);
console.log('任一 palace 含 pattern:', !!anyPat);

console.log('\n=== 长生起法（star.getchangsheng12 原型）===');
console.log('star.getchangsheng12.length(args)=', iztro.star.getchangsheng12.length);
console.log('star.getChangesheng12StartIndex.length=', iztro.star.getChangesheng12StartIndex.length);
try {
  // 试着传 (heavenlyStemIndex, earthlyBranchIndex) 看返回
  const cs = iztro.star.getchangsheng12(6, 0); // 武曲? 试探
  console.log('getchangsheng12(6,0) =>', JSON.stringify(cs).slice(0, 200));
} catch (e) { console.log('getchangsheng12 err:', e.message); }

console.log('\n=== palace 全部字段再确认（找 pattern 类字段）===');
const allKeys = new Set();
astro.palaces.forEach((p) => Object.keys(p).forEach((k) => allKeys.add(k)));
console.log([...allKeys].join(', '));
