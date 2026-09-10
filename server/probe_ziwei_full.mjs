// 探针：全面 dump iztro 一个完整命盘的结构，确认能力边界
import iztro from 'iztro';

const astro = iztro.astro.bySolar('1990-6-15', 6, '男'); // 午时

console.log('=== astro 顶层 keys ===');
console.log(Object.keys(astro).join(', '));

console.log('\n=== horoscope 类型 ===');
for (const k of Object.keys(astro.horoscope || {})) {
  console.log(k, '=>', typeof astro.horoscope[k]);
}

console.log('\n=== palace[0] 全部 keys ===');
console.log(Object.keys(astro.palaces[0]).join(', '));

console.log('\n=== palace[0] 一个星曜全部 keys（取第一个非空星）===');
const p0 = astro.palaces[0];
let star = null;
for (const k of ['majorStars', 'minorStars', 'adjectiveStars']) {
  if (p0[k] && p0[k].length) { star = p0[k][0]; break; }
}
if (star) console.log(JSON.stringify(star, null, 1));

console.log('\n=== palace[3] 完整（含宫名/干支/身宫/主宫/星）截断 ===');
console.log(JSON.stringify(astro.palaces[3], null, 1).slice(0, 1800));

console.log('\n=== 命宫/身宫定位 ===');
astro.palaces.forEach((p) => {
  const tags = [];
  if (p.isMainPalace) tags.push('命宫');
  if (p.isBodyPalace) tags.push('身宫');
  if (tags.length) console.log(p.name, p.heavenlyStem + p.earthlyBranch, tags.join('+'));
});

console.log('\n=== 五行局 / 紫微落宫 / 天府落宫 ===');
try { console.log('astro.palm:', JSON.stringify(astro.palm)); } catch (e) { console.log('no palm'); }
astro.palaces.forEach((p) => {
  const hs = (p.majorStars || []).map((s) => s.name);
  if (hs.includes('紫微') || hs.includes('天府')) {
    console.log(p.name, p.heavenlyStem + p.earthlyBranch, '主星:', hs.join(','));
  }
});

console.log('\n=== 大限 decadal 调用探测 ===');
try {
  const dec = astro.horoscope.decadal(0); // 从0岁起
  console.log('decadal(0) type:', typeof dec, Array.isArray(dec) ? 'array len=' + dec.length : '');
  if (Array.isArray(dec) && dec[0]) console.log('decadal[0] keys:', Object.keys(dec[0]).join(', '), JSON.stringify(dec[0]).slice(0, 400));
} catch (e) { console.log('decadal err:', e.message); }

console.log('\n=== 流年 yearly 调用探测 ===');
try {
  const yr = astro.horoscope.yearly(1990);
  console.log('yearly(1990) type:', typeof yr, Array.isArray(yr) ? 'array len=' + yr.length : '');
  if (Array.isArray(yr) && yr[0]) console.log('yearly[0] keys:', Object.keys(yr[0]).join(', '), JSON.stringify(yr[0]).slice(0, 400));
} catch (e) { console.log('yearly err:', e.message); }
