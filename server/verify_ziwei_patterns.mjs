// verify_ziwei_patterns.mjs — 交叉校验：扫多样本，对每个命中的格局用独立不变量复核（防误报）
import iztro from 'iztro';
import { detectPatterns } from './ziwei_patterns.mjs';

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZHI_IDX = {}; ZHI.forEach((z, i) => ZHI_IDX[z] = i);
const SANHE = {
  子: ['申', '子', '辰'], 申: ['申', '子', '辰'], 辰: ['申', '子', '辰'],
  亥: ['亥', '卯', '未'], 卯: ['亥', '卯', '未'], 未: ['亥', '卯', '未'],
  寅: ['寅', '午', '戌'], 午: ['寅', '午', '戌'], 戌: ['寅', '午', '戌'],
  巳: ['巳', '酉', '丑'], 酉: ['巳', '酉', '丑'], 丑: ['巳', '酉', '丑'],
};
const allS = p => [...(p.majorStars || []), ...(p.minorStars || []), ...(p.adjectiveStars || [])];
const has = (p, n) => allS(p).some(s => s.name === n);
const hasMut = (p, t) => allS(p).some(s => s.mutagen === t);
const triSet = b => { const s = new Set(SANHE[b]); s.add(b); s.add(ZHI[(ZHI_IDX[b] + 6) % 12]); return s; };
const neighbors = (palaces, palace) => {
  const z = palace.earthlyBranch;
  const byZhi = {}; palaces.forEach(p => { byZhi[p.earthlyBranch] = p; });
  return [byZhi[ZHI[(ZHI_IDX[z] - 1 + 12) % 12]], byZhi[ZHI[(ZHI_IDX[z] + 1) % 12]]];
};

// 独立不变量（直接源自文档构成条件，不复用规则 test）
function invariantOk(name, c) {
  const { palaces, mp, body, migrate, triMp } = c;
  const inTri = n => triMp.some(p => has(p, n));
  const hasMutInTri = t => triMp.some(p => hasMut(p, t));
  switch (name) {
    case '紫府同宫': return (mp.earthlyBranch === '寅' || mp.earthlyBranch === '申') && has(mp, '紫微') && has(mp, '天府');
    case '紫府朝垣': return has(mp, '紫微') && triMp.some(p => has(p, '天府'));
    case '君臣庆会': return has(mp, '紫微') && (has(mp, '左辅') || has(mp, '右弼') || inTri('左辅') || inTri('右弼'));
    case '日月并明': return (mp.earthlyBranch === '巳' || mp.earthlyBranch === '午') && has(mp, '太阳') && has(migrate, '太阴') && (migrate.earthlyBranch === '戌' || migrate.earthlyBranch === '亥');
    case '日月同临': return (mp.earthlyBranch === '丑' || mp.earthlyBranch === '未') && has(mp, '太阳') && has(mp, '太阴');
    case '机月同梁': return ['天机', '太阴', '天同', '天梁'].every(n => inTri(n));
    case '禄权科会': return ['禄', '权', '科'].every(t => hasMutInTri(t));
    case '双禄交流': return (has(mp, '禄存') && hasMutInTri('禄')) || (hasMut(mp, '禄') && triMp.some(p => has(p, '禄存')));
    case '禄合鸳鸯': return palaces.some(p => has(p, '禄存') && hasMut(p, '禄'));
    case '文星拱命': return inTri('文昌') && inTri('文曲');
    case '文星振世': return (has(mp, '文昌') || has(mp, '文曲')) && (hasMut(mp, '科') || hasMutInTri('科'));
    case '阳梁昌禄': return ['太阳', '天梁', '文昌', '禄存'].every(n => inTri(n));
    case '机巨同临': return (mp.earthlyBranch === '卯' || mp.earthlyBranch === '酉') && has(mp, '天机') && has(mp, '巨门');
    case '武贪同行': return (mp.earthlyBranch === '丑' || mp.earthlyBranch === '未') && has(mp, '武曲') && has(mp, '贪狼');
    case '火贪格': return palaces.some(p => has(p, '火星') && has(p, '贪狼'));
    case '铃贪格': return palaces.some(p => has(p, '铃星') && has(p, '贪狼'));
    case '府相朝垣': return inTri('天府') && inTri('天相');
    case '月朗天门': return mp.earthlyBranch === '亥' && has(mp, '太阴');
    case '日照雷门': return mp.earthlyBranch === '卯' && has(mp, '太阳');
    case '石中隐玉': return mp.earthlyBranch === '午' && has(mp, '巨门') && (hasMut(mp, '禄') || hasMut(mp, '权') || hasMut(mp, '科') || hasMutInTri('禄') || hasMutInTri('权') || hasMutInTri('科'));
    case '七杀朝斗': return (mp.earthlyBranch === '寅' || mp.earthlyBranch === '申') && has(mp, '七杀');
    case '英星入庙': return (mp.earthlyBranch === '子' || mp.earthlyBranch === '午') && has(mp, '破军');
    case '科权逢迎': return hasMut(mp, '科') && hasMutInTri('权');
    case '禄文拱命': return triMp.some(p => has(p, '禄存')) && (has(mp, '文昌') || inTri('文昌')) && (has(mp, '文曲') || inTri('文曲'));
    case '明珠出海': return mp.earthlyBranch === '辰' && has(mp, '太阳') && migrate.earthlyBranch === '戌' && has(migrate, '太阴');
    case '月生沧海': return mp.earthlyBranch === '子' && has(mp, '太阴');
    case '财荫夹印': { const [a, b] = neighbors(palaces, mp); return (hasMut(a, '禄') && has(b, '天相')) || (hasMut(b, '禄') && has(a, '天相')); }
    case '辅弼拱主': return inTri('左辅') && inTri('右弼');
    case '魁钺拱命': return inTri('天魁') && inTri('天钺');
    case '命里逢空': return has(mp, '地空') || has(mp, '地劫');
    case '空劫夹命': { const [a, b] = neighbors(palaces, mp); return (has(a, '地空') && has(b, '地劫')) || (has(a, '地劫') && has(b, '地空')); }
    case '羊陀夹忌': { const jp = palaces.find(p => hasMut(p, '忌')); if (!jp) return false; const [a, b] = neighbors(palaces, jp); return (has(a, '擎羊') && has(b, '陀罗')) || (has(a, '陀罗') && has(b, '擎羊')); }
    case '火铃夹命': { const [a, b] = neighbors(palaces, mp); return (has(a, '火星') && has(b, '铃星')) || (has(a, '铃星') && has(b, '火星')); }
    case '刑囚夹印': return inTri('天刑') && inTri('廉贞') && inTri('天相');
    case '铃昌陀武': return ['铃星', '文昌', '陀罗', '武曲'].every(n => inTri(n));
    case '巨火羊': return ['巨门', '火星', '擎羊'].every(n => inTri(n));
    case '刑忌夹印': { const tp = palaces.find(p => has(p, '天相')); if (!tp) return false; const [a, b] = neighbors(palaces, tp); return (has(a, '天刑') && hasMut(b, '忌')) || (has(b, '天刑') && hasMut(a, '忌')); }
    case '禄逢冲破': return palaces.some(p => hasMut(p, '禄') && (() => { const o = palaces.find(q => q.earthlyBranch === ZHI[(ZHI_IDX[p.earthlyBranch] + 6) % 12]); return o && hasMut(o, '忌'); })());
    case '马落空亡': return palaces.some(p => has(p, '天马') && (has(p, '地空') || has(p, '地劫')));
    case '日月反背': return ((mp.earthlyBranch === '亥' || mp.earthlyBranch === '子') && has(mp, '太阳')) || ((mp.earthlyBranch === '巳' || mp.earthlyBranch === '午') && has(mp, '太阴'));
    case '杀拱廉贞': return has(mp, '廉贞') && has(migrate, '七杀');
    case '忌冲福德': return hasMut(migrate, '忌');
    case '羊陀夹身': { const [a, b] = neighbors(palaces, body); return (has(a, '擎羊') && has(b, '陀罗')) || (has(a, '陀罗') && has(b, '擎羊')); }
    case '火铃夹身': { const [a, b] = neighbors(palaces, body); return (has(a, '火星') && has(b, '铃星')) || (has(a, '铃星') && has(b, '火星')); }
    case '命逢绝地': return mp.changsheng12 === '绝';
    case '桃花滚浪': { const sha = ['火星', '铃星', '擎羊', '陀罗', '地空', '地劫']; return has(mp, '红鸾') && has(mp, '天喜') && sha.some(n => has(mp, n)); }
    default: return false; // 未知名 → 视为不通过
  }
}

let total = 0, fail = 0; const fails = []; const seen = new Set();
const N = 150;
const allNames = ['紫府同宫','紫府朝垣','君臣庆会','日月并明','日月同临','机月同梁','禄权科会','双禄交流','禄合鸳鸯','文星拱命','文星振世','阳梁昌禄','机巨同临','武贪同行','火贪格','铃贪格','府相朝垣','月朗天门','日照雷门','石中隐玉','七杀朝斗','英星入庙','科权逢迎','禄文拱命','明珠出海','月生沧海','财荫夹印','辅弼拱主','魁钺拱命','命里逢空','空劫夹命','羊陀夹忌','火铃夹命','刑囚夹印','铃昌陀武','巨火羊','刑忌夹印','禄逢冲破','马落空亡','日月反背','杀拱廉贞','忌冲福德','羊陀夹身','火铃夹身','命逢绝地','桃花滚浪'];
for (let i = 0; i < N; i++) {
  const y = 1950 + Math.floor(Math.random() * 60);
  const m = 1 + Math.floor(Math.random() * 12);
  const d = 1 + Math.floor(Math.random() * 28);
  const t = Math.floor(Math.random() * 12);
  const sex = Math.random() < 0.5 ? '男' : '女';
  let a;
  try { a = iztro.astro.bySolar(`${y}-${m}-${d}`, t, sex); } catch (e) { continue; }
  const palaces = a.palaces;
  const byZhi = {}; palaces.forEach(p => { byZhi[p.earthlyBranch] = p; });
  const mp = palaces.find(p => p.name === '命宫');
  const body = palaces.find(p => p.isBodyPalace) || mp;
  const migrate = byZhi[ZHI[(ZHI_IDX[mp.earthlyBranch] + 6) % 12]];
  const triMp = palaces.filter(p => triSet(mp.earthlyBranch).has(p.earthlyBranch));
  const c = { palaces, mp, body, migrate, triMp };
  const pats = detectPatterns(a);
  const detected = new Set(pats.map(p => p.name));
  for (const p of pats) {
    total++;
    seen.add(p.name);
    if (!invariantOk(p.name, c)) { fail++; fails.push(`${y}-${m}-${d}/${sex}: ${p.name} 不变量失败(误报)`); }
  }
  // 对称检查：不变量为真但判定器未报 → 漏报
  for (const name of allNames) {
    if (!detected.has(name) && invariantOk(name, c)) {
      fail++; fails.push(`${y}-${m}-${d}/${sex}: ${name} 应命中但未报(漏报)`);
    }
  }
}
console.log(`扫描 ${N} 盘，命中格局校验 ${total} 次，失败 ${fail} 次`);
const missing = allNames.filter(n => !seen.has(n));
console.log(`覆盖到的格局: ${seen.size}/${allNames.length}`);
if (missing.length) console.log('未触发(可能抽样未覆盖，非必为bug):', missing.join('、'));
if (fails.length) { console.log('\n误报:'); console.log(fails.slice(0, 20).join('\n')); }
process.exit(fail ? 1 : 0);
