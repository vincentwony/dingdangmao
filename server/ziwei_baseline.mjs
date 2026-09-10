// ziwei_baseline.mjs — 紫微斗数专项独立基准（不依赖 iztro）
// 派别约定：全书北派（庚干天同忌）；长生依日干五行，阳顺阴逆；大限/小限按《紫微斗数全书》算法
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ZHI_IDX = {}; ZHI.forEach((z, i) => ZHI_IDX[z] = i);
export const GAN_YINYANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 }; // 1阳 0阴
export const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
export const PALACE_SEQ = { '命宫': 1, '兄弟': 2, '夫妻': 3, '子女': 4, '财帛': 5, '疾厄': 6, '迁移': 7, '交友': 8, '仆役': 8, '官禄': 9, '田宅': 10, '福德': 11, '父母': 12 };
export const WXJU_AGE = { '水二局': 2, '木三局': 3, '金四局': 4, '土五局': 5, '火六局': 6 };
export const XIAOXIAN_START = {
  '子': { 男: '辰', 女: '午' }, '丑': { 男: '卯', 女: '未' }, '寅': { 男: '寅', 女: '申' },
  '卯': { 男: '丑', 女: '酉' }, '辰': { 男: '子', 女: '戌' }, '巳': { 男: '亥', 女: '亥' },
  '午': { 男: '戌', 女: '子' }, '未': { 男: '酉', 女: '丑' }, '申': { 男: '申', 女: '寅' },
  '酉': { 男: '未', 女: '卯' }, '戌': { 男: '子', 女: '辰' }, '亥': { 男: '巳', 女: '巳' }
};
export const CHANGSHENG_START = { '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申' };
export const CS12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

function stepsBetween(fromSeq, toSeq, dir) {
  if (fromSeq === toSeq) return 0;
  let s = fromSeq, steps = 0;
  while (s !== toSeq && steps < 12) { s = ((s - 1 + dir + 12) % 12) + 1; steps++; }
  return steps;
}

// 大限 range：命宫起，阳男阴女顺(+1)/阴男阳女逆(-1)，每限10年
export function baselineDecadal(palaces, fiveElementsClass, yearGan, sex) {
  const A = WXJU_AGE[fiveElementsClass];
  if (!A) return {};
  const mp = palaces.find(p => p.name === '命宫');
  const mpSeq = PALACE_SEQ[mp.name];
  const dir = ((GAN_YINYANG[yearGan] === 1 && sex === '男') || (GAN_YINYANG[yearGan] === 0 && sex === '女')) ? +1 : -1;
  const out = {};
  palaces.forEach(p => {
    const seq = PALACE_SEQ[p.name];
    const k = stepsBetween(mpSeq, seq, dir) + 1;
    out[p.name] = { start: A + (k - 1) * 10, end: A + (k - 1) * 10 + 9 };
  });
  return out;
}

// 小限 ages：年支+性别起宫，男逆女顺，每年一宫
export function baselineAges(palaces, yearZhi, sex) {
  const startZhi = XIAOXIAN_START[yearZhi][sex];
  const dir = sex === '男' ? -1 : +1;
  const out = {};
  palaces.forEach(p => { out[p.name] = []; });
  const palaceByZhi = {};
  palaces.forEach(p => { palaceByZhi[p.earthlyBranch] = p.name; });
  for (let age = 1; age <= 120; age++) {
    const steps = age - 1;
    const zhi = ZHI[((ZHI_IDX[startZhi] + dir * steps) % 12 + 12) % 12];
    const pname = palaceByZhi[zhi];
    if (pname) out[pname].push(age);
  }
  return out;
}

// 长生十二宫：日干五行长生起点，阳顺阴逆
export function baselineChangsheng(palaces, dayGan) {
  const wx = GAN_WX[dayGan];
  const startZhi = CHANGSHENG_START[wx];
  const dir = GAN_YINYANG[dayGan] === 1 ? +1 : -1;
  const out = {};
  palaces.forEach(p => {
    const steps = ((ZHI_IDX[p.earthlyBranch] - ZHI_IDX[startZhi]) * dir % 12 + 12) % 12;
    out[p.name] = CS12[steps];
  });
  return out;
}
