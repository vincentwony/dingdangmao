// 探针：飞星语义理解 + 独立基准比对
// 全书北派 年干/宫干四化（禄权科忌）
const FOUR = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};
const TYPE = ['禄', '权', '科', '忌'];

import iztro from 'iztro';
const astro = iztro.astro.bySolar('1990-6-15', 6, '男'); // 命宫 戊子

// 1) iztro 飞星 API 真实语义
const mp = astro.palaces.find((p) => p.name === '命宫');
console.log('命宫:', mp.name, mp.heavenlyStem + mp.earthlyBranch);
for (const t of TYPE) {
  try { console.log(`  fliesTo(${t}) =>`, JSON.stringify(mp.fliesTo(t))); } catch (e) { console.log(`  fliesTo(${t}) err:`, e.message); }
}
try { console.log('  mutagedPlaces() =>', JSON.stringify(mp.mutagedPlaces())); } catch (e) { console.log('  mutagedPlaces() err:', e.message); }

// 2) 独立基准：每个宫宫干化出的星 -> 该星落在哪一宫
console.log('\n=== 独立基准：各宫宫干四化 -> 飞入宫 ===');
astro.palaces.forEach((src) => {
  const stem = src.heavenlyStem;
  const arr = FOUR[stem];
  if (!arr) return;
  const flies = TYPE.map((t, i) => {
    const star = arr[i];
    const dst = astro.palaces.find((p) =>
      (p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || []).some((s) => s.name === star)
    );
    return `${t}→${star}@${dst ? dst.name : '?'}`;
  });
  console.log(`  ${src.name}(${stem}) : ${flies.join('  ')}`);
});

// 3) 命宫戊干：贪狼禄 应在哪宫
const 贪狼宫 = astro.palaces.find((p) =>
  (p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || []).some((s) => s.name === '贪狼')
);
console.log('\n命宫戊干化禄=贪狼，贪狼实际落宫 =>', 贪狼宫 ? 贪狼宫.name + '(' + 贪狼宫.heavenlyStem + 贪狼宫.earthlyBranch + ')' : '未找到');
