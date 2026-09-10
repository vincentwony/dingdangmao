// server/ziwei_patterns.mjs — 紫微斗数格局判定器（纯函数，不依赖 iztro 流派）
// 规则来源：紫微斗数推算方法_完全版.md 第八章（甲级/乙级吉格、甲级/乙级煞格、特殊格局）
// 采用：星曜组合判定（与四化流派无关）；四化相关项用 star.mutagen（本程序年干四化=全书北派，内部一致）。
'use strict';

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZHI_IDX = {}; ZHI.forEach((z, i) => ZHI_IDX[z] = i);
const SANHE = {
  子: ['申', '子', '辰'], 申: ['申', '子', '辰'], 辰: ['申', '子', '辰'],
  亥: ['亥', '卯', '未'], 卯: ['亥', '卯', '未'], 未: ['亥', '卯', '未'],
  寅: ['寅', '午', '戌'], 午: ['寅', '午', '戌'], 戌: ['寅', '午', '戌'],
  巳: ['巳', '酉', '丑'], 酉: ['巳', '酉', '丑'], 丑: ['巳', '酉', '丑'],
};

export function triSet(branch) {
  const s = new Set(SANHE[branch]);
  s.add(branch);
  s.add(ZHI[(ZHI_IDX[branch] + 6) % 12]); // 对宫
  return s;
}

// 取一宫全部星（主星+辅星+杂耀）
function allStars(p) {
  if (!p) return [];
  return [...(p.majorStars || []), ...(p.minorStars || []), ...(p.adjectiveStars || [])];
}
function has(p, name) { return allStars(p).some(s => s.name === name); }
function hasMut(p, type) { return allStars(p).some(s => s.mutagen === type); }
function neighborPalaces(palaces, palace) {
  const z = palace.earthlyBranch;
  const prev = ZHI[(ZHI_IDX[z] - 1 + 12) % 12];
  const next = ZHI[(ZHI_IDX[z] + 1) % 12];
  const byZhi = {}; palaces.forEach(p => { byZhi[p.earthlyBranch] = p; });
  return [byZhi[prev], byZhi[next]];
}

// 判定规则表：test(ctx) 返回 false 表示不成立；返回 string[] 表示成立（列出相关宫名供高亮）
export const RULES = [
  // ===== 甲级吉格 =====
  { name: '紫府同宫', cat: '吉', level: '甲', desc: '紫微、天府同坐命宫（寅或申），大贵之命，一生享福',
    test: c => (c.mp.earthlyBranch === '寅' || c.mp.earthlyBranch === '申') && has(c.mp, '紫微') && has(c.mp, '天府') ? [c.mp.name] : false },
  { name: '紫府朝垣', cat: '吉', level: '甲', desc: '紫微在命，天府在三方，贵气十足',
    test: c => has(c.mp, '紫微') && c.triMp.some(p => has(p, '天府')) ? [c.mp.name, c.triMp.find(p => has(p, '天府')).name] : false },
  { name: '君臣庆会', cat: '吉', level: '甲', desc: '紫微坐命，左辅右弼同宫或三方会照，有助力事业顺遂',
    test: c => has(c.mp, '紫微') && (has(c.mp, '左辅') || has(c.mp, '右弼') || c.triMp.some(p => has(p, '左辅') || has(p, '右弼'))) ? [c.mp.name] : false },
  { name: '日月并明', cat: '吉', level: '甲', desc: '太阳在巳/午守命，太阴在戌/亥守迁移，光明磊落事业亨通',
    test: c => (c.mp.earthlyBranch === '巳' || c.mp.earthlyBranch === '午') && has(c.mp, '太阳') && has(c.migrate, '太阴') && (c.migrate.earthlyBranch === '戌' || c.migrate.earthlyBranch === '亥') ? [c.mp.name, c.migrate.name] : false },
  { name: '日月同临', cat: '吉', level: '甲', desc: '太阳太阴同宫（丑未）守命，一生多贵人',
    test: c => (c.mp.earthlyBranch === '丑' || c.mp.earthlyBranch === '未') && has(c.mp, '太阳') && has(c.mp, '太阴') ? [c.mp.name] : false },
  { name: '机月同梁', cat: '吉', level: '甲', desc: '天机、太阴、天同、天梁在三方会照，公职文教之命',
    test: c => ['天机', '太阴', '天同', '天梁'].every(n => c.triMp.some(p => has(p, n))) ? ['命宫三方四正'] : false },
  { name: '禄权科会', cat: '吉', level: '甲', desc: '化禄、化权、化科在三方会照（三奇嘉会），大吉名利双收',
    test: c => ['禄', '权', '科'].every(t => c.triMp.some(p => hasMut(p, t))) ? ['命宫三方四正'] : false },
  { name: '双禄交流', cat: '吉', level: '甲', desc: '禄存在命宫，化禄在三方（或反过来），财源广进',
    test: c => (has(c.mp, '禄存') && c.triMp.some(p => hasMut(p, '禄'))) || (hasMut(c.mp, '禄') && c.triMp.some(p => has(p, '禄存'))) ? [c.mp.name] : false },
  { name: '禄合鸳鸯', cat: '吉', level: '甲', desc: '禄存与化禄同宫，大富之命',
    test: c => c.palaces.some(p => has(p, '禄存') && hasMut(p, '禄')) ? ['命宫及三方'] : false },
  { name: '文星拱命', cat: '吉', level: '甲', desc: '文昌文曲在三方拱照命宫，聪明有文采',
    test: c => c.triMp.some(p => has(p, '文昌')) && c.triMp.some(p => has(p, '文曲')) ? ['命宫三方四正'] : false },
  { name: '文星振世', cat: '吉', level: '甲', desc: '文昌或文曲坐命，加化科，文贵之命',
    test: c => (has(c.mp, '文昌') || has(c.mp, '文曲')) && (hasMut(c.mp, '科') || c.triMp.some(p => hasMut(p, '科'))) ? [c.mp.name] : false },
  { name: '阳梁昌禄', cat: '吉', level: '甲', desc: '太阳、天梁、文昌、禄存同宫或三方，大贵考试必中',
    test: c => ['太阳', '天梁', '文昌', '禄存'].every(n => c.triMp.some(p => has(p, n))) ? ['命宫三方四正'] : false },
  { name: '机巨同临', cat: '吉', level: '甲', desc: '天机巨门同宫（卯酉），口才佳适合传播',
    test: c => (c.mp.earthlyBranch === '卯' || c.mp.earthlyBranch === '酉') && has(c.mp, '天机') && has(c.mp, '巨门') ? [c.mp.name] : false },
  { name: '武贪同行', cat: '吉', level: '甲', desc: '武曲贪狼同宫（丑未），先苦后甜中年发达',
    test: c => (c.mp.earthlyBranch === '丑' || c.mp.earthlyBranch === '未') && has(c.mp, '武曲') && has(c.mp, '贪狼') ? [c.mp.name] : false },
  { name: '火贪格', cat: '吉', level: '甲', desc: '火星与贪狼同宫，暴发之格',
    test: c => c.palaces.some(p => has(p, '火星') && has(p, '贪狼')) ? ['命宫及三方'] : false },
  { name: '铃贪格', cat: '吉', level: '甲', desc: '铃星与贪狼同宫，暴发之格（较火贪弱）',
    test: c => c.palaces.some(p => has(p, '铃星') && has(p, '贪狼')) ? ['命宫及三方'] : false },
  { name: '府相朝垣', cat: '吉', level: '甲', desc: '天府天相在三方拱照命宫，稳定之格',
    test: c => c.triMp.some(p => has(p, '天府')) && c.triMp.some(p => has(p, '天相')) ? ['命宫三方四正'] : false },
  { name: '月朗天门', cat: '吉', level: '甲', desc: '太阴在亥宫守命，大贵尤其夜晚生人',
    test: c => c.mp.earthlyBranch === '亥' && has(c.mp, '太阴') ? [c.mp.name] : false },
  { name: '日照雷门', cat: '吉', level: '甲', desc: '太阳在卯宫守命，大贵尤其白天生人',
    test: c => c.mp.earthlyBranch === '卯' && has(c.mp, '太阳') ? [c.mp.name] : false },
  { name: '石中隐玉', cat: '吉', level: '甲', desc: '巨门在午宫守命，加化禄或化权，先苦后甜',
    test: c => c.mp.earthlyBranch === '午' && has(c.mp, '巨门') && (hasMut(c.mp, '禄') || hasMut(c.mp, '权') || hasMut(c.mp, '科') || c.triMp.some(p => hasMut(p, '禄') || hasMut(p, '权') || hasMut(p, '科'))) ? [c.mp.name] : false },
  { name: '七杀朝斗', cat: '吉', level: '甲', desc: '七杀在寅/申宫守命，有威权',
    test: c => (c.mp.earthlyBranch === '寅' || c.mp.earthlyBranch === '申') && has(c.mp, '七杀') ? [c.mp.name] : false },
  { name: '英星入庙', cat: '吉', level: '甲', desc: '破军在子或午宫守命，有开创力',
    test: c => (c.mp.earthlyBranch === '子' || c.mp.earthlyBranch === '午') && has(c.mp, '破军') ? [c.mp.name] : false },

  // ===== 乙级吉格 =====
  { name: '科权逢迎', cat: '吉', level: '乙', desc: '化科在命，化权在三方，有名有权',
    test: c => hasMut(c.mp, '科') && c.triMp.some(p => hasMut(p, '权')) ? [c.mp.name] : false },
  { name: '禄文拱命', cat: '吉', level: '乙', desc: '禄存在三方，文昌文曲在命或三方，有名有利',
    test: c => c.triMp.some(p => has(p, '禄存')) && (has(c.mp, '文昌') || c.triMp.some(p => has(p, '文昌'))) && (has(c.mp, '文曲') || c.triMp.some(p => has(p, '文曲'))) ? ['命宫三方四正'] : false },
  { name: '明珠出海', cat: '吉', level: '乙', desc: '太阳在辰宫守命，太阴在戌宫守迁移，光明正大',
    test: c => c.mp.earthlyBranch === '辰' && has(c.mp, '太阳') && c.migrate.earthlyBranch === '戌' && has(c.migrate, '太阴') ? [c.mp.name, c.migrate.name] : false },
  { name: '月生沧海', cat: '吉', level: '乙', desc: '太阴在子宫守命，聪明温雅',
    test: c => c.mp.earthlyBranch === '子' && has(c.mp, '太阴') ? [c.mp.name] : false },
  { name: '财荫夹印', cat: '吉', level: '乙', desc: '化禄与天相夹命宫，一生有财',
    test: c => { const [a, b] = neighborPalaces(c.palaces, c.mp); const ok = (hasMut(a, '禄') && has(b, '天相')) || (hasMut(b, '禄') && has(a, '天相')); return ok ? [a.name, b.name] : false; } },
  { name: '辅弼拱主', cat: '吉', level: '乙', desc: '左辅右弼在三方拱命，多助力',
    test: c => c.triMp.some(p => has(p, '左辅')) && c.triMp.some(p => has(p, '右弼')) ? ['命宫三方四正'] : false },
  { name: '魁钺拱命', cat: '吉', level: '乙', desc: '天魁天钺在三方拱命，多贵人',
    test: c => c.triMp.some(p => has(p, '天魁')) && c.triMp.some(p => has(p, '天钺')) ? ['命宫三方四正'] : false },

  // ===== 甲级煞格 =====
  { name: '命里逢空', cat: '煞', level: '甲', desc: '地空或地劫坐命，一生多挫折',
    test: c => has(c.mp, '地空') || has(c.mp, '地劫') ? [c.mp.name] : false },
  { name: '空劫夹命', cat: '煞', level: '甲', desc: '地空地劫夹命宫，大凶',
    test: c => { const [a, b] = neighborPalaces(c.palaces, c.mp); const ok = (has(a, '地空') && has(b, '地劫')) || (has(a, '地劫') && has(b, '地空')); return ok ? [a.name, b.name] : false; } },
  { name: '羊陀夹忌', cat: '煞', level: '甲', desc: '擎羊陀罗夹化忌，大凶之格',
    test: c => { const jp = c.palaces.find(p => hasMut(p, '忌')); if (!jp) return false; const [a, b] = neighborPalaces(c.palaces, jp); return (has(a, '擎羊') && has(b, '陀罗')) || (has(a, '陀罗') && has(b, '擎羊')) ? [a.name, b.name] : false; } },
  { name: '火铃夹命', cat: '煞', level: '甲', desc: '火星铃星夹命宫，一生多灾',
    test: c => { const [a, b] = neighborPalaces(c.palaces, c.mp); const ok = (has(a, '火星') && has(b, '铃星')) || (has(a, '铃星') && has(b, '火星')); return ok ? [a.name, b.name] : false; } },
  { name: '刑囚夹印', cat: '煞', level: '甲', desc: '天刑、廉贞（囚）、天相（印）三方会照，牢狱之灾',
    test: c => c.triMp.some(p => has(p, '天刑')) && c.triMp.some(p => has(p, '廉贞')) && c.triMp.some(p => has(p, '天相')) ? ['命宫三方四正'] : false },
  { name: '铃昌陀武', cat: '煞', level: '甲', desc: '铃星、文昌、陀罗、武曲四星会照，大凶',
    test: c => ['铃星', '文昌', '陀罗', '武曲'].every(n => c.triMp.some(p => has(p, n))) ? ['命宫三方四正'] : false },
  { name: '巨火羊', cat: '煞', level: '甲', desc: '巨门、火星、擎羊三方会照，口舌是非',
    test: c => ['巨门', '火星', '擎羊'].every(n => c.triMp.some(p => has(p, n))) ? ['命宫三方四正'] : false },
  { name: '刑忌夹印', cat: '煞', level: '甲', desc: '天刑化忌夹天相，刑伤',
    test: c => { const tp = c.palaces.find(p => has(p, '天相')); if (!tp) return false; const [a, b] = neighborPalaces(c.palaces, tp); return (has(a, '天刑') && hasMut(b, '忌')) || (has(b, '天刑') && hasMut(a, '忌')) ? [a.name, b.name] : false; } },
  { name: '禄逢冲破', cat: '煞', level: '甲', desc: '化禄被化忌对冲，先吉后凶',
    test: c => c.palaces.some(p => hasMut(p, '禄') && (() => { const opp = c.byZhi[ZHI[(ZHI_IDX[p.earthlyBranch] + 6) % 12]]; return opp && hasMut(opp, '忌'); })()) ? ['命宫及三方'] : false },
  { name: '马落空亡', cat: '煞', level: '甲', desc: '天马逢地空或地劫，奔波无果',
    test: c => c.palaces.some(p => has(p, '天马') && (has(p, '地空') || has(p, '地劫'))) ? ['命宫及三方'] : false },
  { name: '日月反背', cat: '煞', level: '甲', desc: '太阳在亥/子守命，或太阴在巳/午守命（无吉星救），劳碌之命',
    test: c => ((c.mp.earthlyBranch === '亥' || c.mp.earthlyBranch === '子') && has(c.mp, '太阳')) || ((c.mp.earthlyBranch === '巳' || c.mp.earthlyBranch === '午') && has(c.mp, '太阴')) ? [c.mp.name] : false },
  { name: '杀拱廉贞', cat: '煞', level: '甲', desc: '七杀在迁移冲命，廉贞在命，凶险',
    test: c => has(c.mp, '廉贞') && has(c.migrate, '七杀') ? [c.mp.name, c.migrate.name] : false },

  // ===== 乙级煞格 =====
  { name: '忌冲福德', cat: '煞', level: '乙', desc: '化忌在迁移冲命（福德宫被冲），精神不安',
    test: c => hasMut(c.migrate, '忌') ? [c.migrate.name] : false },
  { name: '羊陀夹身', cat: '煞', level: '乙', desc: '擎羊陀罗夹身宫，后天多困',
    test: c => { const [a, b] = neighborPalaces(c.palaces, c.body); const ok = (has(a, '擎羊') && has(b, '陀罗')) || (has(a, '陀罗') && has(b, '擎羊')); return ok ? [a.name, b.name] : false; } },
  { name: '火铃夹身', cat: '煞', level: '乙', desc: '火星铃星夹身宫，后天多灾',
    test: c => { const [a, b] = neighborPalaces(c.palaces, c.body); const ok = (has(a, '火星') && has(b, '铃星')) || (has(a, '铃星') && has(b, '火星')); return ok ? [a.name, b.name] : false; } },
  { name: '命逢绝地', cat: '煞', level: '乙', desc: '命宫坐长生十二宫之绝位，先天根基弱',
    test: c => c.mp.changsheng12 === '绝' ? [c.mp.name] : false },
  { name: '桃花滚浪', cat: '煞', level: '乙', desc: '红鸾天喜坐命，加煞星，感情泛滥',
    test: c => { const sha = ['火星', '铃星', '擎羊', '陀罗', '地空', '地劫']; if (has(c.mp, '红鸾') && has(c.mp, '天喜') && sha.some(n => has(c.mp, n))) return [c.mp.name]; return false; } },
];

// 主入口：传入 iztro astrolabe 对象，返回命中格局数组
export function detectPatterns(astrolabe) {
  const palaces = astrolabe.palaces || [];
  const byZhi = {}; palaces.forEach(p => { byZhi[p.earthlyBranch] = p; });
  const mp = palaces.find(p => p.name === '命宫');
  const body = palaces.find(p => p.isBodyPalace) || mp;
  const migrate = byZhi[ZHI[(ZHI_IDX[mp.earthlyBranch] + 6) % 12]];
  const triMp = palaces.filter(p => triSet(mp.earthlyBranch).has(p.earthlyBranch));
  const ctx = { palaces, byZhi, mp, body, migrate, triMp };
  const out = [];
  for (const r of RULES) {
    let res;
    try { res = r.test(ctx); } catch (e) { res = false; }
    if (res) out.push({ name: r.name, cat: r.cat, level: r.level, desc: r.desc, palaces: Array.isArray(res) ? res : [] });
  }
  return out;
}
