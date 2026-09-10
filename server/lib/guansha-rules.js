// server/lib/guansha-rules.js
// ════════════════════════════════════════════════════════════════════════
// 小儿关煞推算规则库（纯数据 + 谓词引擎）
//
// 数据来源（已按用户《小儿关煞古籍校准规则.md》定稿，2026-07-15）：
//   模块一 · 正统子平   —— 《渊海子平》《三命通会》
//   模块二 · 民间三十六关 —— 《关煞百中经》《星平会海》《象吉通书》
//   模块三 · 民间七十二煞(子集) —— 清代道教抄本衍生（标注「民俗衍生」）
//
// 文献校验结论（实现时固化）：
//   ✅ 8 关与多重独立传世歌诀逐字吻合：将军箭 / 百日关 / 四柱关 / 阎王关 /
//      铁蛇关 / 白虎关 / 取命关 / 天吊关 （《百中经》《星平会海》《象吉通书》
//      《鳌头》《黄历解秘》《生育礼俗》一致）。
//   ⚠ 6 处存在「用户校准版 vs 通行歌诀版」流派分歧，按用户校准文件取值，
//      并在下方对应规则注释中标明分歧点，便于后续追溯：
//      千日关 / 铁蛇关 / 断桥关 / 金锁关 / 四季关 / 夜啼关。
//
// 接口：computeXiaoErGuanSha(ob, sex) -> 结构化结果对象（供前端第伍章渲染）
// ════════════════════════════════════════════════════════════════════════
'use strict';

// 日主强弱 · 权威判定引擎（覆盖层，与八字主体「日主强弱·权威判定」同源）
// 小儿关煞的「身强身弱」简判统一升级为权威口径，消除双结论矛盾
var dmStrength = require('./daymaster-strength.js');

// ── 天干 / 地支常量 ──
var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干五行
var STEM_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
// 地支本气五行
var BENQI = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
// 地支藏干（本气 + 中气），用于「得地」简判
var ZANG = {
  子: ['癸'], 丑: ['己', '癸'], 寅: ['甲', '丙'], 卯: ['乙'], 辰: ['戊', '乙'],
  巳: ['丙', '庚'], 午: ['丁', '己'], 未: ['己', '丁'], 申: ['庚', '壬'], 酉: ['辛'], 戌: ['戊', '辛'], 亥: ['壬', '甲']
};
// 生我者（印）五行
var SHENG_WO = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
// 年干五行（用于铁蛇关等）
function stemEl(g) { return STEM_EL[g] || ''; }

// 纳音五行（年命）——优先用 gongxin-core，失败则降级为空（白虎关不触发）
var _Lunar = null;
try { _Lunar = require('gongxin-core').Lunar; } catch (e) { _Lunar = null; }
function nayinWx(b1) {
  if (_Lunar && typeof _Lunar.nayin === 'function') {
    var s = _Lunar.nayin(b1);
    // 六十甲子纳音末字即五行：海中金→金、炉中火→火、大林木→木、涧下水→水、路旁土→土
    if (s && s.length) return s[s.length - 1];
  }
  return '';
}

// 季节（月支）
function seasonOf(z) {
  if (z === '寅' || z === '卯' || z === '辰') return '春';
  if (z === '巳' || z === '午' || z === '未') return '夏';
  if (z === '申' || z === '酉' || z === '戌') return '秋';
  return '冬'; // 亥子丑
}
// 三合局（年/日支 → 局 key）
function comboOf(z) {
  if (z === '申' || z === '子' || z === '辰') return '水'; // 申子辰
  if (z === '寅' || z === '午' || z === '戌') return '火'; // 寅午戌
  if (z === '亥' || z === '卯' || z === '未') return '木'; // 亥卯未
  if (z === '巳' || z === '酉' || z === '丑') return '金'; // 巳酉丑
  return '';
}
// 月支 → 月序（正月=1 … 腊月=12）
function monthIdxOf(zhi) {
  // 寅→1, 卯→2, 辰→3, 巳→4, 午→5, 未→6, 申→7, 酉→8, 戌→9, 亥→10, 子→11, 丑→12
  var map = { 寅: 1, 卯: 2, 辰: 3, 巳: 4, 午: 5, 未: 6, 申: 7, 酉: 8, 戌: 9, 亥: 10, 子: 11, 丑: 12 };
  return map[zhi] || 0;
}
// 地支相冲
var CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
function isChong(a, b) { return CHONG[a] === b; }
// 地支相刑（无礼/无恩/恃势）
function hasXing(branches) {
  var s = {};
  branches.forEach(function (z) { s[z] = true; });
  if (s['子'] && s['卯']) return true;
  if ((s['寅'] && s['巳']) || (s['寅'] && s['申']) || (s['巳'] && s['申'])) return true;
  if ((s['丑'] && s['戌']) || (s['丑'] && s['未']) || (s['戌'] && s['未'])) return true;
  return false;
}
// 羊刃（年干 → 刃支），用于血光煞
var YANG_REN = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };

// ════════════════════════════════════════════════════════════════════════
// 构建推算上下文 ctx（从 ob 抽取所有需要的干支/五行/三合/空亡等）
// ════════════════════════════════════════════════════════════════════════
function buildCtx(ob, sex) {
  var b1 = ob.b1 || 0, b2 = ob.b2 || 0, b3 = ob.b3 || 0, b4 = ob.b4 || 0;
  function gz(idx) { return (GAN[idx % 10] || '') + (ZHI[idx % 12] || ''); }
  var yearGZ = ob.bz_jn || gz(b1);
  var monthGZ = ob.bz_jy || gz(b2);
  var dayGZ = ob.bz_jr || gz(b3);
  var hourGZ = ob.bz_js || gz(b4);

  var yearGan = yearGZ[0], yearZhi = yearGZ[1];
  var monthGan = monthGZ[0], monthZhi = monthGZ[1];
  var dayGan = dayGZ[0], dayZhi = dayGZ[1];
  var hourGan = hourGZ[0], hourZhi = hourGZ[1];

  // 空亡（以日柱 60 序推算）
  var dgi = b3;
  var kw1 = ZHI[((Math.floor(dgi / 10) * 10 + 10) % 60) % 12];
  var kw2 = ZHI[((Math.floor(dgi / 10) * 10 + 11) % 60) % 12];

  // 水旺（金井关）：四柱中水支(子亥)+水干(壬癸) 计数
  var branches = [yearZhi, monthZhi, dayZhi, hourZhi];
  var gans = [yearGan, monthGan, dayGan, hourGan];
  var waterStrong = branches.filter(function (z) { return z === '子' || z === '亥'; }).length
    + gans.filter(function (g) { return g === '壬' || g === '癸'; }).length >= 2;

  return {
    sex: (sex === 0 || sex === 1) ? sex : (ob.sex === 0 || ob.sex === 1 ? ob.sex : 1),
    yearGan: yearGan, yearZhi: yearZhi,
    monthGan: monthGan, monthZhi: monthZhi,
    dayGan: dayGan, dayZhi: dayZhi,
    hourGan: hourGan, hourZhi: hourZhi,
    yearGanEl: stemEl(yearGan),
    yearNaYinWx: nayinWx(b1),
    season: seasonOf(monthZhi),
    monthIdx: monthIdxOf(monthZhi),
    threeComboYear: comboOf(yearZhi),
    kongWang: [kw1, kw2],
    branches: branches,
    gans: gans,
    waterStrong: waterStrong
  };
}

// ════════════════════════════════════════════════════════════════════════
// 模块一 · 正统子平表（日干 → 七杀关 / 偏财煞 → 河洛生数 → 关限岁）
// 河洛生数：水1 火2 木3 金4 土5；关限岁 = 生数 / 生数+5
// ════════════════════════════════════════════════════════════════════════
var ZT_TABLE = {
  '甲': { guan: '庚', guanWx: '金', guanXian: [4, 9], sha: '己', shaWx: '土', shaXian: [5, 10] },
  '乙': { guan: '辛', guanWx: '金', guanXian: [4, 9], sha: '戊', shaWx: '土', shaXian: [5, 10] },
  '丙': { guan: '壬', guanWx: '水', guanXian: [1, 6], sha: '辛', shaWx: '金', shaXian: [4, 9] },
  '丁': { guan: '癸', guanWx: '水', guanXian: [1, 6], sha: '庚', shaWx: '金', shaXian: [4, 9] },
  '戊': { guan: '甲', guanWx: '木', guanXian: [3, 8], sha: '癸', shaWx: '水', shaXian: [1, 6] },
  '己': { guan: '乙', guanWx: '木', guanXian: [3, 8], sha: '壬', shaWx: '水', shaXian: [1, 6] },
  '庚': { guan: '丙', guanWx: '火', guanXian: [2, 7], sha: '乙', shaWx: '木', shaXian: [3, 8] },
  '辛': { guan: '丁', guanWx: '火', guanXian: [2, 7], sha: '甲', shaWx: '木', shaXian: [3, 8] },
  '壬': { guan: '戊', guanWx: '土', guanXian: [5, 10], sha: '丁', shaWx: '火', shaXian: [2, 7] },
  '癸': { guan: '己', guanWx: '土', guanXian: [5, 10], sha: '丙', shaWx: '火', shaXian: [2, 7] }
};

// 身强身弱 —— 统一采用权威日主强弱引擎结论（文档 §5 方案二 A/B 7级 + 旺/强分论）
// 7 级映射：
//   身弱：弱极 / 很弱 / 比较弱
//   身强：比较旺 / 很旺 / 旺极
//   平衡：有根气党众（强）则身强，否则身弱（保守，幼年宜护）
function computeShenFromDm(dm) {
  if (['弱极', '很弱', '比较弱'].indexOf(dm.level) >= 0) return '身弱';
  if (['比较旺', '很旺', '旺极'].indexOf(dm.level) >= 0) return '身强';
  return dm.qiang ? '身强' : '身弱';
}

function computeZhengTong(c, dm) {
  var t = ZT_TABLE[c.dayGan];
  if (!t) return null;
  var sq = computeShenFromDm(dm);
  var strong = sq === '身强';
  var detail =
    c.dayGan + '日，七杀' + t.guan + '为关，' + t.guanXian.join('/') + '岁关卡；' +
    '偏财' + t.sha + '为煞，' + t.shaXian.join('/') + '岁煞期。命主' + sq + '，' +
    (strong ? '关煞可挡，凶象减轻' : '身弱宜慎，幼年须护') + '。';
  return [{
    dayGan: c.dayGan,
    guan: t.guan, guanWx: t.guanWx, guanXian: t.guanXian,
    sha: t.sha, shaWx: t.shaWx, shaXian: t.shaXian,
    shenQiangRuo: sq,
    detail: detail,
    chu: '渊海子平·论小儿关煞例 / 三命通会'
  }];
}

// 民俗常见凶性评级（仅用于前端强调，非单一典籍定论，标注「民俗通说」）
var LEVEL_MAP = {
  '将军箭': '重', '白虎关': '重', '阎王关': '重', '取命关': '重', '铁蛇关': '中',
  '落井关': '中', '金井关': '中', '水火关': '中', '断肠关': '中', '天吊关': '中',
  '鬼门关': '中', '雷公关': '中', '血光煞': '中', '空亡煞': '中'
};

// ════════════════════════════════════════════════════════════════════════
// 模块二 · 民间三十六关（谓词引擎）
// 每条：{ idx, name, trigger(原文), yiYi(寓意), jiHou(忌讳/化解), chu, conf, test(ctx) }
// 注：trigger 为《关煞百中经》原文判定；test 为可机器校验的谓词实现。
// ════════════════════════════════════════════════════════════════════════
var GUANSHA_36 = [
  { idx: 1, name: '百日关',
    trigger: '寅申巳亥月生辰戌丑未时；子午卯酉月生寅申巳亥时；辰戌丑未月生子午卯酉时',
    yiYi: '主惊风吐奶', jiHou: '百日内忌远行、出大门、走外婆家',
    chu: '百中经、星平会海', conf: '定稿',
    test: function (c) {
      return (['寅', '申', '巳', '亥'].indexOf(c.monthZhi) >= 0 && ['辰', '戌', '丑', '未'].indexOf(c.hourZhi) >= 0)
        || (['子', '午', '卯', '酉'].indexOf(c.monthZhi) >= 0 && ['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0)
        || (['辰', '戌', '丑', '未'].indexOf(c.monthZhi) >= 0 && ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 2, name: '千日关',
    trigger: '午年寅/申/巳/亥时；甲乙马头、丙丁猴鸡、庚辛虎、戊己蛇、壬癸丑亥时',
    yiYi: '三岁内易跌扑惊风', jiHou: '忌外婆祖堂、远途坐车登高',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准取「午年+时支」年支视角；通行诀有「甲乙马龙头」日干版，此处两者皆纳。
    test: function (c) {
      return (c.yearZhi === '午' && ['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0)
        || (['甲', '乙'].indexOf(c.dayGan) >= 0 && c.hourZhi === '午')
        || (['丙', '丁'].indexOf(c.dayGan) >= 0 && ['申', '酉'].indexOf(c.hourZhi) >= 0)
        || (['庚', '辛'].indexOf(c.dayGan) >= 0 && c.hourZhi === '寅')
        || (['戊', '己'].indexOf(c.dayGan) >= 0 && c.hourZhi === '巳')
        || (['壬', '癸'].indexOf(c.dayGan) >= 0 && ['丑', '亥'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 3, name: '四季关',
    trigger: '春生巳丑；夏遇申辰；秋逢未亥；冬见寅卯',
    yiYi: '换季受惊发热', jiHou: '四季交替节气勿受惊受凉',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准「春巳丑/夏申辰/秋未亥/冬寅卯」；通行诀有「春丑巳/夏龙猴…」差异，采用用户校准。
    test: function (c) {
      return (c.season === '春' && ['巳', '丑'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['申', '辰'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['未', '亥'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['寅', '卯'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 4, name: '四柱关',
    trigger: '正七巳亥时、二八辰戌时、三九卯酉时、四十寅申时、五十一月丑未时、六十二月子午时',
    yiYi: '易母子分离、摔伤', jiHou: '忌坐孩童轿、近动土修造',
    chu: '星平会海、象吉通书', conf: '定稿',
    test: function (c) {
      return ([1, 7].indexOf(c.monthIdx) >= 0 && ['巳', '亥'].indexOf(c.hourZhi) >= 0)
        || ([2, 8].indexOf(c.monthIdx) >= 0 && ['辰', '戌'].indexOf(c.hourZhi) >= 0)
        || ([3, 9].indexOf(c.monthIdx) >= 0 && ['卯', '酉'].indexOf(c.hourZhi) >= 0)
        || ([4, 10].indexOf(c.monthIdx) >= 0 && ['寅', '申'].indexOf(c.hourZhi) >= 0)
        || ([5, 11].indexOf(c.monthIdx) >= 0 && ['丑', '未'].indexOf(c.hourZhi) >= 0)
        || ([6, 12].indexOf(c.monthIdx) >= 0 && ['子', '午'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 5, name: '阎王关',
    trigger: '春丑未时、夏辰戌时、秋子午时、冬寅卯时；女命凶性偏重',
    yiYi: '阴煞侵扰重病', jiHou: '忌寺庙、丧葬、中元普渡',
    chu: '百中经', conf: '定稿', applySex: 'female', sexNote: '女命凶性偏重',
    test: function (c) {
      return (c.season === '春' && ['丑', '未'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['辰', '戌'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['子', '午'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['寅', '卯'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 6, name: '鬼门关',
    trigger: '子、丑、寅月生人（任意时辰）',
    yiYi: '易梦魇惊吓发热', jiHou: '忌走夜路、荒坟、阴庙',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '丑', '寅'].indexOf(c.monthZhi) >= 0; } },
  { idx: 7, name: '将军箭',
    trigger: '春酉戌辰时、夏未卯子时、秋寅午丑时、冬亥申巳时；仅男命主凶',
    yiYi: '主外伤血光破相', jiHou: '忌将军庙、弓箭、刀械',
    chu: '百中经盲派诀', conf: '定稿', applySex: 'male', sexNote: '仅男命主凶，女命凶势减半',
    test: function (c) {
      return (c.season === '春' && ['酉', '戌', '辰'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['未', '卯', '子'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['寅', '午', '丑'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['亥', '申', '巳'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 8, name: '铁蛇关',
    trigger: '年干金见戌、火见未申、木见辰、水见丑寅；辰戌丑未时生人',
    yiYi: '痘疹凶险、忌猫狗咬伤', jiHou: '忌马路、金属器物',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准「年干五行查时支 + 辰戌丑未时」；通行另有「年纳音五行」查法，此处采用用户校准（年干五行）。
    test: function (c) {
      return (c.yearGanEl === '金' && c.hourZhi === '戌')
        || (c.yearGanEl === '火' && ['未', '申'].indexOf(c.hourZhi) >= 0)
        || (c.yearGanEl === '木' && c.hourZhi === '辰')
        || (c.yearGanEl === '水' && ['丑', '寅'].indexOf(c.hourZhi) >= 0)
        || ['辰', '戌', '丑', '未'].indexOf(c.hourZhi) >= 0;
    } },
  { idx: 9, name: '浴盆关',
    trigger: '春戌未、夏丑辰、秋丑戌、冬未辰（月令+时支）',
    yiYi: '初生洗浴易水呛惊风', jiHou: '初生洗浴防水呛受凉',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (c.season === '春' && ['戌', '未'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['丑', '辰'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['丑', '戌'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['未', '辰'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 10, name: '断桥关',
    trigger: '正月寅、二月卯、三月申、四月丑、五月戌、六月酉、七月辰、八月巳、九月午、十月未、冬月亥、腊月子',
    yiYi: '防水厄坠桥', jiHou: '忌独木桥、竹桥、渡河',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准逐月固定时支；另一通行诀作「正寅二兔三猴…」月序错位，采用用户校准。
    test: function (c) {
      var m = { 1: '寅', 2: '卯', 3: '申', 4: '丑', 5: '戌', 6: '酉', 7: '辰', 8: '巳', 9: '午', 10: '未', 11: '亥', 12: '子' };
      return m[c.monthIdx] === c.hourZhi;
    } },
  { idx: 11, name: '深水关',
    trigger: '春寅申、夏未、秋酉、冬丑（月令+时支）',
    yiYi: '清明七夕不可近水边', jiHou: '忌河、井、池塘',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (c.season === '春' && ['寅', '申'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && c.hourZhi === '未')
        || (c.season === '秋' && c.hourZhi === '酉')
        || (c.season === '冬' && c.hourZhi === '丑');
    } },
  { idx: 12, name: '水火关',
    trigger: '春巳、夏午、秋未、冬子时；子午卯酉见午、寅申巳亥见寅、辰戌丑未见未',
    yiYi: '防开水热油炭火烫伤溺水', jiHou: '忌开水、热油、炭火',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (c.season === '春' && c.hourZhi === '巳')
        || (c.season === '夏' && c.hourZhi === '午')
        || (c.season === '秋' && c.hourZhi === '未')
        || (c.season === '冬' && c.hourZhi === '子')
        || (['子', '午', '卯', '酉'].indexOf(c.monthZhi) >= 0 && c.hourZhi === '午')
        || (['寅', '申', '巳', '亥'].indexOf(c.monthZhi) >= 0 && c.hourZhi === '寅')
        || (['辰', '戌', '丑', '未'].indexOf(c.monthZhi) >= 0 && c.hourZhi === '未');
    } },
  { idx: 13, name: '夜啼关',
    trigger: '亥子丑时、子午卯酉时生人',
    yiYi: '整夜啼哭怕光、心神不宁', jiHou: '安神定志、避强光',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准「亥子丑/子午卯酉时」；通行诀作「春午/夏酉/秋子/冬卯时」，采用用户校准。
    test: function (c) { return ['子', '午', '卯', '酉', '亥', '丑'].indexOf(c.hourZhi) >= 0; } },
  { idx: 14, name: '雷公关',
    trigger: '亥子丑月、寅卯巳午年生人',
    yiYi: '防跌伤惊吓', jiHou: '打雷忌登高、触碰铁器',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return ['亥', '子', '丑'].indexOf(c.monthZhi) >= 0 || ['寅', '卯', '巳', '午'].indexOf(c.yearZhi) >= 0;
    } },
  { idx: 15, name: '鸡飞关',
    trigger: '辰戌丑未时生人',
    yiYi: '突受惊风', jiHou: '忌看杀鸡、活鸡扑身',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['辰', '戌', '丑', '未'].indexOf(c.hourZhi) >= 0; } },
  { idx: 16, name: '落井关',
    trigger: '午、卯、酉时生人；命带井宿',
    yiYi: '近水井水坑大忌、易落水', jiHou: '忌近水井、水坑',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 17, name: '和尚关',
    trigger: '子午卯酉时忌辰戌丑未；辰戌丑未时忌子午卯酉；寅申巳亥互见',
    yiYi: '体虚受惊', jiHou: '忌随母入寺庙、见僧道',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0 && ['辰', '戌', '丑', '未'].indexOf(c.monthZhi) >= 0)
        || (['辰', '戌', '丑', '未'].indexOf(c.hourZhi) >= 0 && ['子', '午', '卯', '酉'].indexOf(c.monthZhi) >= 0)
        || (['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0 && ['寅', '申', '巳', '亥'].indexOf(c.monthZhi) >= 0);
    } },
  { idx: 18, name: '白虎关',
    trigger: '火年（纳音）子、金年卯、水土年午、木年酉时；申酉秋月生人加重',
    yiYi: '多发血光跌伤、麻疹重症', jiHou: '忌血光、跌伤',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      var hit = (c.yearNaYinWx === '火' && c.hourZhi === '子')
        || (c.yearNaYinWx === '金' && c.hourZhi === '卯')
        || ((c.yearNaYinWx === '水' || c.yearNaYinWx === '土') && c.hourZhi === '午')
        || (c.yearNaYinWx === '木' && c.hourZhi === '酉');
      return hit;
    },
    heavy: function (c) { return ['申', '酉'].indexOf(c.monthZhi) >= 0; } },
  { idx: 19, name: '取命关',
    trigger: '甲乙丙丁日申子辰时；戊己庚日亥卯未时；辛壬癸日寅午戌时',
    yiYi: '急症高烧', jiHou: '忌高空、丧葬、普渡道场',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (['甲', '乙', '丙', '丁'].indexOf(c.dayGan) >= 0 && ['申', '子', '辰'].indexOf(c.hourZhi) >= 0)
        || (['戊', '己', '庚'].indexOf(c.dayGan) >= 0 && ['亥', '卯', '未'].indexOf(c.hourZhi) >= 0)
        || (['辛', '壬', '癸'].indexOf(c.dayGan) >= 0 && ['寅', '午', '戌'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 20, name: '短命关',
    trigger: '子午卯酉时生人',
    yiYi: '幼时体弱、小病迁延难养', jiHou: '悉心调养',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 21, name: '急脚关',
    trigger: '春亥子、夏卯未、秋寅戌、冬辰戌（月令+时支）',
    yiYi: '腿脚易磕碰摔伤', jiHou: '忌看建房动土',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (c.season === '春' && ['亥', '子'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['卯', '未'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['寅', '戌'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['辰', '戌'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 22, name: '金锁关',
    trigger: '戌亥申酉时；男辰戌、女丑未时生人',
    yiYi: '幼年忌佩戴金银锁', jiHou: '忌佩戴金银锁、金属首饰',
    chu: '百中经', conf: '定稿',
    // ⚠ 流派分歧：用户校准「戌亥申酉时 + 男辰戌/女丑未时」；通行诀作「正七申/二八酉/三九戌…」按月支，采用用户校准。
    test: function (c) {
      return ['戌', '亥', '申', '酉'].indexOf(c.hourZhi) >= 0
        || (c.sex === 1 && ['辰', '戌'].indexOf(c.hourZhi) >= 0)
        || (c.sex === 0 && ['丑', '未'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 23, name: '天吊关',
    trigger: '申子辰巳午时、寅午戌辰午时、亥卯未申午时、巳酉丑卯子时（年支三合配时支）',
    yiYi: '易坠跌', jiHou: '忌爬山、夜路、高处玩耍',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      var map = { '水': ['巳', '午'], '火': ['辰', '午'], '木': ['申', '午'], '金': ['卯', '子'] };
      var req = map[c.threeComboYear];
      return req ? req.indexOf(c.hourZhi) >= 0 : false;
    } },
  { idx: 24, name: '断肠关',
    trigger: '甲乙午未时、丙寅辰巳时、庚子寅时、壬癸丑时（日干配时支）',
    yiYi: '易惊风心神不安', jiHou: '忌观看屠宰杀猪羊',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (['甲', '乙'].indexOf(c.dayGan) >= 0 && ['午', '未'].indexOf(c.hourZhi) >= 0)
        || (c.dayGan === '丙' && ['寅', '辰', '巳'].indexOf(c.hourZhi) >= 0)
        || (c.dayGan === '庚' && ['子', '寅'].indexOf(c.hourZhi) >= 0)
        || (['壬', '癸'].indexOf(c.dayGan) >= 0 && c.hourZhi === '丑');
    } },
  { idx: 25, name: '五鬼关',
    trigger: '子辰、丑卯、寅寅、卯丑、辰子、巳亥、午戌、未申、申酉、酉未、戌午、亥巳（日支配时支）',
    yiYi: '夜间多梦惊悸', jiHou: '忌坟地、棺木旁',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      var m = { '子': '辰', '丑': '卯', '寅': '寅', '卯': '丑', '辰': '子', '巳': '亥', '午': '戌', '未': '申', '申': '酉', '酉': '未', '戌': '午', '亥': '巳' };
      return m[c.dayZhi] === c.hourZhi;
    } },
  { idx: 26, name: '直难关',
    trigger: '子午卯酉时生人',
    yiYi: '幼年少平安', jiHou: '忌利器',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 27, name: '埋儿关',
    trigger: '子午卯酉时生人',
    yiYi: '亲子缘薄', jiHou: '宜过继、拜干爹干妈；忌看出殡丧葬',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 28, name: '撞命关',
    trigger: '子午卯酉时生人',
    yiYi: '孩童莽撞好动、频发意外', jiHou: '看顾防磕碰摔伤',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 29, name: '无情关',
    trigger: '春寅酉子、夏戌亥巳、秋申丑、冬子午；寅申巳亥、子午卯酉互见',
    yiYi: '亲子缘分薄', jiHou: '寄养、认外姓长辈可解',
    chu: '百中经', conf: '定稿',
    test: function (c) {
      return (c.season === '春' && ['寅', '酉', '子'].indexOf(c.hourZhi) >= 0)
        || (c.season === '夏' && ['戌', '亥', '巳'].indexOf(c.hourZhi) >= 0)
        || (c.season === '秋' && ['申', '丑'].indexOf(c.hourZhi) >= 0)
        || (c.season === '冬' && ['子', '午'].indexOf(c.hourZhi) >= 0)
        || (['寅', '申', '巳', '亥'].indexOf(c.monthZhi) >= 0 && ['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0)
        || (['子', '午', '卯', '酉'].indexOf(c.monthZhi) >= 0 && ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0);
    } },
  { idx: 30, name: '金桥关',
    trigger: '寅申巳亥时生人',
    yiYi: '过桥远游受惊呕吐', jiHou: '过桥、远游需谨慎',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0; } },
  { idx: 31, name: '迷魂关',
    trigger: '子午卯酉时生人',
    yiYi: '易失神、夜游受惊昏迷', jiHou: '安神勿受惊',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 32, name: '吞啖关',
    trigger: '子午卯酉时生人',
    yiYi: '谨防异物呛噎、食道重症', jiHou: '防积食、异物',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 33, name: '断魂关',
    trigger: '子午卯酉时生人',
    yiYi: '受惊易高热昏迷', jiHou: '安神避阴邪',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 34, name: '鸡鸣关',
    trigger: '子午卯酉时生人',
    yiYi: '凌晨鸡啼时分易惊醒啼哭', jiHou: '安神勿骤惊',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['子', '午', '卯', '酉'].indexOf(c.hourZhi) >= 0; } },
  { idx: 35, name: '金井关',
    trigger: '酉戌亥时 + 命局水旺/近水',
    yiYi: '合并鸡飞、落井两关风险，防水溺', jiHou: '忌近水井、蓄水池',
    chu: '百中经衍生', conf: '定稿',
    test: function (c) { return ['酉', '戌', '亥'].indexOf(c.hourZhi) >= 0 && c.waterStrong; } },
  { idx: 36, name: '休庵关',
    trigger: '辰戌丑未时生人',
    yiYi: '久居古旧庵堂荒庙不利', jiHou: '忌久居古旧庵堂、荒庙、废弃祠堂',
    chu: '百中经', conf: '定稿',
    test: function (c) { return ['辰', '戌', '丑', '未'].indexOf(c.hourZhi) >= 0; } }
];

// ════════════════════════════════════════════════════════════════════════
// 模块三 · 民间七十二煞标准子集（民俗衍生，清代道教抄本）
// 每条：{ name, trigger, yiYi, chu, conf, test(ctx, hits) }
//   hits = { 关名: true/false }（36 关命中映射，供衍生煞引用）
// ════════════════════════════════════════════════════════════════════════
var GUANSHA_72 = [
  { name: '冲天煞', trigger: '年支三合巳午，时支见寅申',
    yiYi: '幼年易高处跌落、爬高摔伤', chu: '民俗衍生·非正统八字典籍', conf: '定稿（民俗衍生）',
    test: function (c) {
      return (c.yearZhi === '巳' || c.yearZhi === '午' || c.threeComboYear === '火')
        && ['寅', '申'].indexOf(c.hourZhi) >= 0;
    } },
  { name: '埋见煞', trigger: '命带埋儿关，年柱带墓库',
    yiYi: '同埋儿关，亲子缘薄，宜拜干亲', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return hits['埋儿关'] && ['辰', '戌', '丑', '未'].indexOf(c.yearZhi) >= 0; } },
  { name: '血光煞', trigger: '年干庚辛丙丁，时支见羊刃、金刃',
    yiYi: '幼年多磕碰、刀伤、破皮流血', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c) {
      return ['庚', '辛', '丙', '丁'].indexOf(c.yearGan) >= 0
        && (YANG_REN[c.yearGan] === c.hourZhi || c.hourZhi === '酉');
    } },
  { name: '惊啼煞', trigger: '亥子时生人、叠加夜啼关',
    yiYi: '夜夜惊啼、入睡困难、胆小畏黑', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return ['亥', '子'].indexOf(c.hourZhi) >= 0 && hits['夜啼关']; } },
  { name: '水火煞', trigger: '水火关叠加、纳音水火交战',
    yiYi: '汤烫、火烧、溺水双重隐患', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return hits['水火关'] && (c.yearNaYinWx === '水' || c.yearNaYinWx === '火'); } },
  { name: '路逢煞', trigger: '驿马逢劫煞，寅申巳亥时生人',
    yiYi: '外出路途受惊、磕碰、小型外伤', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c) { return ['寅', '申', '巳', '亥'].indexOf(c.hourZhi) >= 0; } },
  { name: '宅凶煞', trigger: '四柱地支多刑冲，命带五鬼',
    yiYi: '居家多病、夜间无故哭闹不安', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return hits['五鬼关'] && hasXing(c.branches); } },
  { name: '太岁小儿煞', trigger: '出生月支冲当年太岁地支',
    yiYi: '当年易突发小病、无故惊吓', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c) { return isChong(c.monthZhi, c.yearZhi); } },
  { name: '雷霆煞', trigger: '正七子时、二八寅时、三九辰时、四十午时、五十一申时、六二戌时',
    yiYi: '打雷易受惊吓、惊厥跌扑', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c) {
      var m = { 1: '子', 7: '子', 2: '寅', 8: '寅', 3: '辰', 9: '辰', 4: '午', 10: '午', 5: '申', 11: '申', 6: '戌', 12: '戌' };
      return m[c.monthIdx] === c.hourZhi;
    } },
  { name: '夜游煞', trigger: '亥子时 + 自带天吊关',
    yiYi: '深夜起身游走、意识恍惚失神', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return ['亥', '子'].indexOf(c.hourZhi) >= 0 && hits['天吊关']; } },
  { name: '将军煞', trigger: '男命带将军箭',
    yiYi: '同将军箭，外伤血光风险加重', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    applySex: 'male',
    test: function (c, hits) { return c.sex === 1 && hits['将军箭']; } },
  { name: '天吊煞', trigger: '天吊关叠加寅申驿马',
    yiYi: '登高坠跌、高处惊吓频繁发作', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return hits['天吊关'] && ['寅', '申'].indexOf(c.hourZhi) >= 0; } },
  { name: '汤火煞', trigger: '水火关重见巳午火、子亥水',
    yiYi: '重度烫伤、溺水高危', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) { return hits['水火关'] && ['巳', '午', '子', '亥'].indexOf(c.hourZhi) >= 0; } },
  { name: '井厄煞', trigger: '落井关 + 辰丑水库地支',
    yiYi: '靠近水井、蓄水池极易遇险', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) {
      return hits['落井关'] && ['辰', '丑'].some(function (z) { return c.branches.indexOf(z) >= 0; });
    } },
  { name: '屠宰煞', trigger: '断肠关 + 巳酉金旺',
    yiYi: '见宰杀牲畜易高热惊风', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) {
      return hits['断肠关'] && ['巳', '酉'].some(function (z) { return c.branches.indexOf(z) >= 0; });
    } },
  { name: '空亡煞', trigger: '任意关煞叠加十空亡',
    yiYi: '体弱难养、精神萎靡少气', chu: '民俗衍生', conf: '定稿（民俗衍生）',
    test: function (c, hits) {
      var anyHit = Object.keys(hits).some(function (k) { return hits[k]; });
      return anyHit && (c.kongWang.indexOf(c.yearZhi) >= 0 || c.kongWang.indexOf(c.hourZhi) >= 0);
    } }
];

// ════════════════════════════════════════════════════════════════════════
// 主入口：computeXiaoErGuanSha(ob, sex) -> 结构化结果
// ════════════════════════════════════════════════════════════════════════
function computeXiaoErGuanSha(ob, sex) {
  var c = buildCtx(ob, sex);

  // 权威日主强弱（与八字主体「日主强弱·权威判定」同源，关煞三得法一并升级）
  var _dm = dmStrength.computeDayMasterStrength(ob);

  // 模块一：正统子平（恒有 1 条）
  var zhengtong = computeZhengTong(c, _dm) || [];

  // 模块二：三十六关（仅返回命中项）
  var hits = {};
  var minjian36 = [];
  GUANSHA_36.forEach(function (g) {
    var applySex = g.applySex || 'both'; // 'male' 仅男命主凶 / 'female' 女命偏重 / 'both' 男女皆同
    var hit = false;
    try { hit = !!g.test(c); } catch (e) { hit = false; }
    // ⚠ 性别门控：仅男命主凶的关煞（将军箭），女命不计入凶煞名单，
    //    以免男女混列误导。女命排盘根本不出现该关，实现「分男女」而非仅加注。
    if (applySex === 'male' && c.sex !== 1) hit = false;
    hits[g.name] = hit;
    if (hit) {
      var item = {
        idx: g.idx, name: g.name, trigger: g.trigger,
        yiYi: g.yiYi, jiHou: g.jiHou, chu: g.chu, conf: g.conf,
        hit: true, applySex: applySex
      };
      if (g.sexNote) item.sexNote = g.sexNote;
      if (LEVEL_MAP[g.name]) item.level = LEVEL_MAP[g.name];
      // ⚠ 阎王关：女命凶性偏重、男命较轻 —— 按性别定级，明确区分男女凶性，不混为一谈
      if (g.name === '阎王关') {
        item.sexWeight = (c.sex === 0) ? '女命偏重' : '男命较轻';
        item.level = (c.sex === 0) ? '重' : '中';
      }
      // 性别标签（前端渲染用）
      if (applySex === 'male') item.sexLabel = '男命专属';
      else if (applySex === 'female') item.sexLabel = '女命偏重';
      else item.sexLabel = '男女通用';
      if (g.heavy && g.heavy(c)) item.heavy = true;
      minjian36.push(item);
    }
  });

  // 模块三：七十二煞子集（仅返回命中项，可引用 hits）
  var minjian72 = [];
  GUANSHA_72.forEach(function (g) {
    var hit = false;
    try { hit = !!g.test(c, hits); } catch (e) { hit = false; }
    if (hit) {
      var applySex = g.applySex || 'both';
      var it = {
        name: g.name, trigger: g.trigger, yiYi: g.yiYi,
        chu: g.chu, conf: g.conf, hit: true, applySex: applySex
      };
      if (applySex === 'male') it.sexLabel = '男命专属';
      else if (applySex === 'female') it.sexLabel = '女命偏重';
      else it.sexLabel = '男女通用';
      minjian72.push(it);
    }
  });

  return {
    ageNote: '限 16 岁前参考 · 民俗说法仅供参考，不可迷信',
    sex: c.sex,
    sexText: c.sex === 1 ? '乾造·男命' : '坤造·女命',
    zhengtong: zhengtong,
    minjian36: minjian36,
    minjian72: minjian72,
    total36: minjian36.length,
    total72: minjian72.length
  };
}

module.exports = {
  GAN: GAN, ZHI: ZHI,
  ZT_TABLE: ZT_TABLE,
  GUANSHA_36: GUANSHA_36,
  GUANSHA_72: GUANSHA_72,
  buildCtx: buildCtx,
  computeXiaoErGuanSha: computeXiaoErGuanSha
};
