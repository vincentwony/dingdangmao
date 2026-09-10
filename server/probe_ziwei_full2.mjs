// 探针 stage2：iztro 顶层 API、格局、流年、庙旺表、飞星结构
import iztro from 'iztro';

console.log('=== iztro 顶层导出 ===');
console.log(Object.keys(iztro).join(', '));
for (const k of Object.keys(iztro)) {
  console.log('  ' + k + ' => ' + typeof iztro[k]);
}

console.log('\n=== iztro.astro 方法 ===');
for (const k of Object.keys(iztro.astro || {})) {
  console.log('  astro.' + k + ' => ' + typeof iztro.astro[k]);
}

console.log('\n=== iztro.star 探测（庙旺/亮度表）===');
try {
  console.log('star keys:', Object.keys(iztro.star).join(', '));
  if (iztro.star.getBrightness) console.log('getBrightness sample:', JSON.stringify(iztro.star.getBrightness('紫微', '子')));
} catch (e) { console.log('star err:', e.message); }

console.log('\n=== 五行局字段确认 ===');
const astro = iztro.astro.bySolar('1990-6-15', 6, '男');
console.log('fiveElementsClass:', astro.fiveElementsClass);
console.log('soul:', JSON.stringify(astro.soul), 'body:', JSON.stringify(astro.body));
console.log('earthlyBranchOfSoulPalace:', astro.earthlyBranchOfSoulPalace, 'earthlyBranchOfBodyPalace:', astro.earthlyBranchOfBodyPalace);

console.log('\n=== 飞星 fliesTo 结构 ===');
const mp = astro.palaces.find((p) => p.isMainPalace);
console.log('命宫 heavenlyStem:', mp.heavenlyStem);
try {
  const fly = mp.fliesTo('禄');
  console.log('命宫化禄 fliesTo =>', JSON.stringify(fly));
} catch (e) { console.log('fliesTo err:', e.message); }
try {
  console.log('命宫 mutagedPlaces =>', JSON.stringify(mp.mutagedPlaces));
} catch (e) { console.log('mutagedPlaces err:', e.message); }

console.log('\n=== 格局判定探测 ===');
console.log('palace 是否含 pattern:', 'pattern' in astro.palaces[0], '| patterns:', 'patterns' in astro.palaces[0]);
console.log('astro 是否含 pattern:', 'pattern' in astro, '| plugins:', JSON.stringify(astro.plugins));

console.log('\n=== 流年探测（palace.decadal / 其他方式）===');
console.log('命宫 decadal:', JSON.stringify(mp.decadal), 'ages:', JSON.stringify(mp.ages));
// 试 iztro.horoscope 独立 API
try {
  console.log('iztro.horoscope keys:', Object.keys(iztro.horoscope || {}));
} catch (e) { console.log('horoscope err:', e.message); }
