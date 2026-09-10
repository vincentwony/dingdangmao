// 探针：深入 horo.yearly / horo.decadal 结构 + 流年命宫定位
import iztro from 'iztro';
const astro = iztro.astro.bySolar('1990-6-15', 6, '男');
const horo = astro.horoscope(new Date(2026, 0, 1), 6);

function dumpScope(name, scope) {
  console.log(`\n=== ${name} ===`);
  if (!scope) { console.log('  (null)'); return; }
  console.log('  keys:', Object.keys(scope).join(', '));
  console.log('  index:', scope.index, ' range:', JSON.stringify(scope.range));
  console.log('  mutagen:', JSON.stringify(scope.mutagen));
  if (Array.isArray(scope.stars)) {
    console.log('  stars len:', scope.stars.length);
    scope.stars.forEach((palaceStars, i) => {
      if (Array.isArray(palaceStars) && palaceStars.length) {
        console.log(`    [${i}] ` + palaceStars.map((s) => s.name + (s.mutagen ? '(' + s.mutagen + ')' : '')).join('、'));
      }
    });
  }
}
dumpScope('horo.yearly', horo.yearly);
dumpScope('horo.decadal', horo.decadal);

console.log('\n=== horo 顶层导航 ===');
console.log('horo.palace type:', typeof horo.palace, horo.palace ? Object.keys(horo.palace).join(',') : '');
console.log('horo.astrolabe type:', typeof horo.astrolabe, horo.astrolabe && horo.astrolabe.palaces ? 'palaces=' + horo.astrolabe.palaces.length : '');
if (horo.astrolabe && horo.astrolabe.palaces) {
  const ym = horo.astrolabe.palaces.find((p) => p.name === '命宫');
  console.log('本命盘 命宫:', ym.heavenlyStem + ym.earthlyBranch);
}

// 流年命宫定位：yearly.index 指向本命盘哪个宫？
console.log('\n=== 流年命宫定位（yearly.index=' + horo.yearly.index + '）===');
const nativePalaces = astro.palaces;
const ymNative = nativePalaces.find((p) => p.index === horo.yearly.index);
console.log('yearly.index 对应的本命宫:', ymNative ? ymNative.name + '(' + ymNative.heavenlyStem + ymNative.earthlyBranch + ')' : 'NOT FOUND');

// 独立基准：2026 丙午年，流年命宫应为太岁地支"午"所在本命宫
const branchOfYear = '午';
const nativeByBranch = nativePalaces.find((p) => p.earthlyBranch === branchOfYear);
console.log('独立基准：太岁地支午 所在本命宫 =', nativeByBranch ? nativeByBranch.name + '(' + nativeByBranch.heavenlyStem + nativeByBranch.earthlyBranch + ')' : 'NOT FOUND');
console.log('→ 流年命宫应落在:', nativeByBranch ? nativeByBranch.name : '?', '| iztro 给的 yearly.index 命宫 =', ymNative ? ymNative.name : '?', ymNative && nativeByBranch && ymNative.name === nativeByBranch.name ? '✅一致' : '❌不一致');
