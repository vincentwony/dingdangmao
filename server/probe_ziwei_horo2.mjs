// 探针：坐实 horo.yearly 的 name/干支/palaceNames/mutagen 语义
import iztro from 'iztro';
const astro = iztro.astro.bySolar('1990-6-15', 6, '男');
const horo = astro.horoscope(new Date(2026, 0, 1), 6);

function show(name, sc) {
  if (!sc) { console.log(name, 'NULL'); return; }
  console.log(`\n=== ${name} ===`);
  console.log('  name        :', sc.name);
  console.log('  heavenlyStem:', sc.heavenlyStem, ' earthlyBranch:', sc.earthlyBranch);
  console.log('  index       :', sc.index);
  console.log('  palaceNames :', JSON.stringify(sc.palaceNames));
  console.log('  mutagen     :', JSON.stringify(sc.mutagen));
  if (sc.yearlyDecStar !== undefined) console.log('  yearlyDecStar:', JSON.stringify(sc.yearlyDecStar));
}

show('horo.yearly', horo.yearly);
show('horo.decadal', horo.decadal);
console.log('\n=== horo.age ===');
console.log(JSON.stringify(horo.age, null, 1));

// 本命盘 12 宫 干支 + index
console.log('\n=== 本命盘 12 宫 (index / name / 干支) ===');
astro.palaces.forEach((p) => console.log(`  [${p.index}] ${p.name} ${p.heavenlyStem}${p.earthlyBranch}`));

// 验证 yearly.mutagen 是否等于 yearly 天干的四化
const FOUR = {
  甲:['廉贞','破军','武曲','太阳'],乙:['天机','天梁','紫微','太阴'],丙:['天同','天机','文昌','廉贞'],
  丁:['太阴','天同','天机','巨门'],戊:['贪狼','太阴','右弼','天机'],己:['武曲','贪狼','天梁','文曲'],
  庚:['太阳','武曲','太阴','天同'],辛:['巨门','太阳','文曲','文昌'],壬:['天梁','紫微','左辅','武曲'],癸:['破军','巨门','太阴','贪狼']
};
console.log('\n=== 一致性检查 ===');
console.log('yearly 天干:', horo.yearly.heavenlyStem, '→ 该干四化应为:', JSON.stringify(FOUR[horo.yearly.heavenlyStem]), '| iztro给:', JSON.stringify(horo.yearly.mutagen),
  JSON.stringify(FOUR[horo.yearly.heavenlyStem]) === JSON.stringify(horo.yearly.mutagen) ? '✅内部一致' : '❌内部矛盾');

// 流年太岁法基准：2026丙午，太岁地支午 → 本命盘地支午的宫
const nativeByBranch = astro.palaces.find((p) => p.earthlyBranch === '午');
console.log('太岁法：流年命宫应落本命', nativeByBranch.name, '(' + nativeByBranch.heavenlyStem + nativeByBranch.earthlyBranch + ')');
const iztroYm = astro.palaces.find((p) => p.index === horo.yearly.index);
console.log('iztro：流年命宫落本命', iztroYm.name, '(' + iztroYm.heavenlyStem + iztroYm.earthlyBranch + ')');
console.log('→ 太岁法 vs iztro:', nativeByBranch.name === iztroYm.name ? '✅一致' : '❌不一致(流派分歧/bug)');
