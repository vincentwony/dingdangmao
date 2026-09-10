// 探针：用农历年复验流年命宫（太岁法）
import iztro from 'iztro';
const astro = iztro.astro.bySolar('1990-6-15', 6, '男');

function yearlyOf(date, label) {
  const horo = astro.horoscope(date, 6);
  const y = horo.yearly;
  const ymNative = astro.palaces.find((p) => p.index === y.index);
  console.log(`\n[${label}] targetDate=${date.toISOString().slice(0,10)}`);
  console.log('  流年干支:', y.heavenlyStem + y.earthlyBranch, '| index=', y.index, '| 流年命宫落本命:', ymNative.name + '(' + ymNative.heavenlyStem + ymNative.earthlyBranch + ')');
  console.log('  流年四化(mutagen):', JSON.stringify(y.mutagen));
  // 太岁法基准：流年地支所在本命宫
  const bench = astro.palaces.find((p) => p.earthlyBranch === y.earthlyBranch);
  console.log('  太岁法基准（流年地支' + y.earthlyBranch + '本命宫）:', bench.name, '→', bench.name === ymNative.name ? '✅一致' : '❌不一致');
  const FOUR = {甲:['廉贞','破军','武曲','太阳'],乙:['天机','天梁','紫微','太阴'],丙:['天同','天机','文昌','廉贞'],丁:['太阴','天同','天机','巨门'],戊:['贪狼','太阴','右弼','天机'],己:['武曲','贪狼','天梁','文曲'],庚:['太阳','武曲','太阴','天同'],辛:['巨门','太阳','文曲','文昌'],壬:['天梁','紫微','左辅','武曲'],癸:['破军','巨门','太阴','贪狼']};
  console.log('  流年天干四化应=', JSON.stringify(FOUR[y.heavenlyStem]), y.mutagen && JSON.stringify(FOUR[y.heavenlyStem]) === JSON.stringify(y.mutagen) ? '✅一致' : '❌不一致');
}

yearlyOf(new Date(2026, 0, 1), '2026-01-01（农历乙巳）');
yearlyOf(new Date(2026, 2, 1), '2026-03-01（农历丙午）');
yearlyOf(new Date(2025, 0, 1), '2025-01-01（农历甲辰）');
