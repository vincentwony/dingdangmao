import iztro from 'iztro';
const a = iztro.astro.bySolar('1990-6-15', 6, '男');
console.log('palaces 顺序(索引:名-地支-宫干):');
a.palaces.forEach((p, i) => console.log(`  ${i}: ${p.name}(${p.earthlyBranch}) 干${p.heavenlyStem} ${p.isBodyPalace ? '[身]' : ''}`));
// 验证三方四正(命宫): 命/财/官/迁 应 = 子/辰/申/午
const mp = a.palaces.find(p => p.name === '命宫');
console.log('\n命宫地支:', mp.earthlyBranch);
console.log('命宫 index:', a.palaces.indexOf(mp));
