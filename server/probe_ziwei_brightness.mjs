// probe_ziwei_brightness.mjs — 抽查 iztro 庙旺利陷(brightness) 与公认标准表是否一致
import iztro from 'iztro';

const a = iztro.astro.bySolar('1990-6-15', 6, '男');
console.log('五行局:', a.fiveElementsClass);
console.log('命宫地支:', a.palaces.find(p => p.name === '命宫').earthlyBranch);
console.log('--- 主星 brightness (宫:星=亮度) ---');
const want = {};
a.palaces.forEach(p => {
  const stars = [...(p.majorStars || []), ...(p.minorStars || []), ...(p.adjectiveStars || [])];
  stars.forEach(s => {
    if (['紫微','天府','太阳','太阴','贪狼','巨门','天机','天同','廉贞','武曲','破军','七杀'].includes(s.name)) {
      console.log(`${p.earthlyBranch}(${p.name}): ${s.name}=${s.brightness || '(无)'}`);
    }
  });
});
console.log('\n--- 紫微落宫检查 ---');
const ziwei = a.palaces.flatMap(p => (p.majorStars||[]).map(s => ({p, s}))).find(x => x.s.name === '紫微');
console.log('紫微在', ziwei.p.earthlyBranch, '宫, brightness=', ziwei.s.brightness);
