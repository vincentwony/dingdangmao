// core/wuxing.js — 五行力量计算体系 (v2.0)
// 依据: 《八字五行力量计算体系.md》§8 量化计算模型
// 保留所有原有函数，新增 7 层权重计算模型

'use strict';

/* ═══════════════════════════════════════════════════════════
   原有基础工具函数（保持不变）
   ═══════════════════════════════════════════════════════════ */

// ====== 季节旺相休囚死（保留）======
function Qiulq(paramInt1, paramInt2) {
  var i = paramInt1 % 10;
  paramInt2 %= 10;
  paramInt1 = paramInt2;
  if (paramInt2 < i) { paramInt1 = paramInt2 + 10; }
  paramInt2 = paramInt1;
  if (i % 2 == 0) {
    paramInt2 = paramInt1;
    if ((paramInt1 - i) % 2 == 1) { paramInt2 = paramInt1 + 2; }
  }
  var s = (paramInt2 - i) % 10;
  if (s == 0) s = 10;
  return s;
}

// ====== 天干字符→索引 ======
var _DG_GAN = {'甲':0,'乙':1,'丙':2,'丁':3,'戊':4,'己':5,'庚':6,'辛':7,'壬':8,'癸':9};

// ====== 藏干权威数组 ======
var _DG_BENQI   = ['癸','己','甲','乙','戊','丙','丁','己','庚','辛','戊','壬'];
var _DG_ZHONGQI = ['','辛','丙','','乙','戊','','丁','壬','','丁',''];
var _DG_YUQI    = ['','癸','戊','','癸','庚','己','乙','戊','','辛','甲'];

// 藏干力量比例 (§4.2): 子卯酉(1干)100, 午亥(2干)本70/中30, 其余(3干)本60/中30/余10
var _DG_RATIO = [
  [100,0,0],   // 子: 癸100
  [60,30,10],  // 丑: 己60 癸30 辛10
  [60,30,10],  // 寅: 甲60 丙30 戊10
  [100,0,0],   // 卯: 乙100
  [60,30,10],  // 辰: 戊60 乙30 癸10
  [60,30,10],  // 巳: 丙60 庚30 戊10
  [70,30,0],   // 午: 丁70 己30
  [60,30,10],  // 未: 己60 丁30 乙10
  [60,30,10],  // 申: 庚60 壬30 戊10
  [100,0,0],   // 酉: 辛100
  [60,30,10],  // 戌: 戊60 辛30 丁10
  [70,30,0]    // 亥: 壬70 甲30
];

// ====== 天干→五行索引 ======
function _cgGanWx(g) {
  var s = _DG_GAN[g];
  if (s === undefined) return -1;
  if (s < 2) return 0;
  if (s < 4) return 1;
  if (s < 6) return 2;
  if (s < 8) return 3;
  return 4;
}
var _WX = ['木','火','土','金','水'];

// ====== 十神工具 ======
var _LIUQIN = ["比肩","劫财","食神","伤官","偏财","正财","七杀","正官","偏印","正印"];
var _A_SS = [1,0,3,2,5,4,7,6,9,8];

function _localSShen(r, t) {
  var j = r % 10 + 1, k = t % 10 + 1;
  if (j % 2 == 1) return _LIUQIN[(k - j + 10) % 10];
  else return _LIUQIN[_A_SS[(k - j + 11) % 10]];
}

function _cgSSKind(riGanIdx, targetGanIdx) {
  var shenIdx = _LIUQIN.indexOf(_localSShen(riGanIdx, targetGanIdx));
  if (shenIdx === 8 || shenIdx === 9) return '印';
  if (shenIdx === 0 || shenIdx === 1) return '比';
  if (shenIdx === 4 || shenIdx === 5) return '财';
  if (shenIdx === 6 || shenIdx === 7) return '官';
  return '食伤';
}

function _cgIsShengZhu(kind) {
  return kind === '印' || kind === '比';
}

// ====== 十二长生能量表 (§3.2, MD文档权威版本) ======
// 长生0.7 沐浴0.2 冠带0.55 临官1.0 帝旺1.0 衰0.2 病0.1 死0.0 墓0.4 绝0.0 胎0.15 养0.25
// 2026-06-23 修正: 旧值(0.5/0.75/0.9/0.6/0.4/0.2/0.3/0.1/0.25/0.4)与MD文档不一致
var _CS_WEIGHT = [0.7, 0.2, 0.55, 1.0, 1.0, 0.2, 0.1, 0.0, 0.4, 0.0, 0.15, 0.25];
var _CS_START  = [10,6,2,8,2,8,4,0,7,3]; // 甲亥10, 乙午6, 丙寅2...

function _csState(riGanIdx, zhiIdx) {
  return (zhiIdx - _CS_START[riGanIdx] + 12) % 12;
}

function _csWeight(riGanIdx, zhiIdx) {
  return _CS_WEIGHT[_csState(riGanIdx, zhiIdx)];
}

/* ═══════════════════════════════════════════════════════════
   新增: 7 层权重五行力量计算模型 (§8 量化计算模型)
   ═══════════════════════════════════════════════════════════ */

// ─── 速查表: 月令五行旺相休囚死 (§2.2, 附录A)
// [木,火,土,金,水] 在 [寅卯月, 巳午月, 申酉月, 亥子月, 辰戌丑未月] 的状态
// 规则: 当令者旺 / 我生者相 / 生我者休 / 克我者囚 / 我克者死
// 修正于 2026-06-24 P0-1: 旧表夏月土误为休(40)→正为相(70), 此错误导致戊土日主强度系统性低估
var _YL_STATUS_TABLE = [
  ['旺','休','死','相','囚'],  // 木: 春旺 夏休 秋死 冬相 四季囚
  ['相','旺','囚','死','休'],  // 火: 春相 夏旺 秋囚 冬死 四季休
  ['死','相','休','囚','旺'],  // 土: 春死 夏相 秋休 冬囚 四季旺
  ['囚','死','旺','休','相'],  // 金: 春囚 夏死 秋旺 冬休 四季相
  ['休','囚','相','旺','死']   // 水: 春休 夏囚 秋相 冬旺 四季死
];

// 月令状态赋值 (§2.3): 旺=100, 相=70, 休=40, 囚=20, 死=0
var _YL_VALUE = { '旺':100, '相':70, '休':40, '囚':20, '死':0 };

// 月令阶段系数 (§2.4)
// [寅,卯,辰,巳,午,未,申,酉,戌,亥,子,丑] 的阶段: 0=初, 1=中, 2=末
var _YL_STAGE = [0, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0];

// 十二地支→季节组索引: 0=春(寅卯),1=夏(巳午),2=秋(申酉),3=冬(亥子),4=四季(辰戌丑未)
// P1修复 2026-06-24: 旧映射 亥子=zhiIdx(10,11) 错误 — 10=戌非子, 11=亥; 正确为 亥(11)+子(0)
function _seasonGroup(zhiIdx) {
  if (zhiIdx === 2 || zhiIdx === 3) return 0;   // 寅卯→春
  if (zhiIdx === 5 || zhiIdx === 6) return 1;   // 巳午→夏
  if (zhiIdx === 8 || zhiIdx === 9) return 2;   // 申酉→秋
  if (zhiIdx === 11 || zhiIdx === 0) return 3;  // 亥子→冬 (FIXED: 10→0)
  return 4; // 辰戌丑未→四季
}

/* ─── 第1步: 月令分 (§8.2 第二步, 满分40) ─── */
function _step1_yueling(wxIdx, yueZhiIdx) {
  var seasonGrp = _seasonGroup(yueZhiIdx);
  var status = _YL_STATUS_TABLE[wxIdx][seasonGrp];
  var baseVal = _YL_VALUE[status];
  return {
    status: status,
    baseVal: baseVal,
    score: Math.round(baseVal * 0.4),  // 满分40
    breakdown: '月令' + ['寅卯','巳午','申酉','亥子','辰戌丑未'][seasonGrp] + '月' + status + '(' + baseVal + '分)×0.4=' + Math.round(baseVal*0.4) + '分'
  };
}

/* ─── 第2步: 通根分 (§8.2 第三步, 满分30) ─── */
function _step2_tonggen(ob, wxIdx) {
  var zhiArr = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  var total = 0;
  var details = [];
  var WX_NAMES = ['木','火','土','金','水'];
  var GAN2WX = { '甲':0,'乙':0, '丙':1,'丁':1, '戊':2,'己':2, '庚':3,'辛':3, '壬':4,'癸':4 };

  for (var i = 0; i < 4; i++) {
    var zIdx = zhiArr[i];
    var cgList = [];
    if (_DG_BENQI[zIdx]) cgList.push({ gan: _DG_BENQI[zIdx], level: '本气', ratio: _DG_RATIO[zIdx][0] });
    if (_DG_ZHONGQI[zIdx]) cgList.push({ gan: _DG_ZHONGQI[zIdx], level: '中气', ratio: _DG_RATIO[zIdx][1] });
    if (_DG_YUQI[zIdx]) cgList.push({ gan: _DG_YUQI[zIdx], level: '余气', ratio: _DG_RATIO[zIdx][2] });

    for (var j = 0; j < cgList.length; j++) {
      var cg = cgList[j];
      if (GAN2WX[cg.gan] !== wxIdx) continue;
      var ganIdx = _DG_GAN[cg.gan];
      if (ganIdx === undefined) continue;
      var csW = _csWeight(ob.b3 % 10, zIdx);
      var contrib = Math.round(cg.ratio * csW);
      total += contrib;
      details.push({
        zhi: ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][zIdx],
        gan: cg.gan,
        level: cg.level,
        ratio: cg.ratio,
        changshengW: csW,
        contrib: contrib
      });
    }
  }

  // 标准化到30分满分
  var maxPossible = 400; // 理论最大值
  var normalized = Math.round((total / Math.max(maxPossible, total > 0 ? total : 1)) * 30);
  if (total === 0) normalized = 0;

  return {
    rawTotal: total,
    score: Math.min(normalized, 30),
    details: details,
    breakdown: WX_NAMES[wxIdx] + '通根' + details.length + '处, 原始' + total + '分→标准化' + normalized + '分'
  };
}

/* ─── 第3步: 天干分 (§8.2 第四步, 满分15) ─── */
function _step3_tiangan(ob, wxIdx) {
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var gan2wx = [0,0,1,1,2,2,3,3,4,4];
  var count = 0, touGanBonus = 0;
  var details = [];

  for (var i = 0; i < 4; i++) {
    var s = stems[i];
    if (gan2wx[s] === wxIdx) { count++; details.push(GAN[s] + '(天干)'); }
    // 透干加分: 检查对应地支藏干是否透出
    var zIdx = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12][i];
    if (_DG_BENQI[zIdx] && _DG_GAN[_DG_BENQI[zIdx]] === s && gan2wx[s] === wxIdx) {
      touGanBonus += 3; details.push(GAN[s] + '(透干+3)');
    }
  }

  var score = count * 5 + touGanBonus;
  return {
    count: count,
    touGanBonus: touGanBonus,
    score: Math.min(score, 15),
    details: details,
    breakdown: '天干' + count + '个×5=' + (count*5) + '+透干' + Math.floor(touGanBonus/3) + '处×3=' + Math.min(score,15) + '分'
  };
}

/* ─── 第4步: 生扶克泄耗分 (§8.2 第五步, ±15) ─── */
function _step4_shengke(ob, wxIdx) {
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var riGanIdx = ob.b3 % 10;
  var GAN2WX = [0,0,1,1,2,2,3,3,4,4];
  var shengFu = 0, keXieHao = 0;
  var details = [];

  for (var i = 0; i < 4; i++) {
    if (i === 2) continue; // 跳过日主自身
    var kind = _cgSSKind(riGanIdx, stems[i]);
    if (_cgIsShengZhu(kind)) {
      // 印: +15, 比: +8 (同性增强, §5.1)
      var addVal = kind === '印' ? 15 : 8;
      shengFu += addVal;
      details.push({ pillar: ['年','月','时'][i > 2 ? 1 : i > 1 ? 2 : 0], kind: kind, val: '+' + addVal });
    } else {
      // 官杀(克我): -15, 食伤(我生): -15, 财(我克): -10 (§5.1)
      var subVal = kind === '官' ? 15 : kind === '食伤' ? 15 : 10;
      keXieHao += subVal;
      details.push({ pillar: ['年','月','时'][i > 2 ? 1 : i > 1 ? 2 : 0], kind: kind, val: '-' + subVal });
    }
  }

  var netForce = shengFu - keXieHao;
  return {
    shengFu: shengFu,
    keXieHao: keXieHao,
    score: Math.max(-15, Math.min(15, netForce)),
    details: details,
    breakdown: '生扶' + shengFu + '分-克泄耗' + keXieHao + '分=' + netForce + '分(钳制±15)'
  };
}

/* ─── 第5步: 合化刑冲调整 (§8.2 第六步) ─── */
function _step5_hehua(ob, wxIdx) {
  var adjust = 0;
  var details = [];

  // 天干五合检查 (§5.2)
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var HE_PAIRS = [[0,5],[1,6],[2,7],[3,8],[4,9]]; // 甲己/乙庚/丙辛/丁壬/戊癸
  for (var i = 0; i < HE_PAIRS.length; i++) {
    var a = (ob.b1 % 10 === HE_PAIRS[i][0] || ob.b1 % 10 === HE_PAIRS[i][1]);
    var b = (ob.b2 % 10 === HE_PAIRS[i][0] || ob.b2 % 10 === HE_PAIRS[i][1]);
    var c = (ob.b3 % 10 === HE_PAIRS[i][0] || ob.b3 % 10 === HE_PAIRS[i][1]);
    var d = (ob.b4 % 10 === HE_PAIRS[i][0] || ob.b4 % 10 === HE_PAIRS[i][1]);
    var pairCount = [a,b,c,d].filter(Boolean).length;
    if (pairCount >= 2) {
      // 简化判定: 合化成功+20, 否则-10 (§8.2第六步)
      var huaWx = [2,3,4,0,1][i]; // 甲己化土, 乙庚化金, 丙辛化水, 丁壬化木, 戊癸化火
      if (huaWx === wxIdx) { adjust += 20; details.push('合化成功(+20)'); }
      else { adjust -= 5; details.push('合而不化(-5)'); }
    }
  }

  // 地支六冲简化检查 (§6.4)
  var zhiArr = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
  var CHONG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]; // 子午/丑未/寅申/卯酉/辰戌/巳亥
  for (var j = 0; j < CHONG.length; j++) {
    var hasA = zhiArr.indexOf(CHONG[j][0]) >= 0;
    var hasB = zhiArr.indexOf(CHONG[j][1]) >= 0;
    if (hasA && hasB) {
      adjust -= 10; details.push('六冲(-10)');
      break;
    }
  }

  // 地支三合局 (§6.2)
  var SANHE = [[0,8,4],[2,6,10],[5,9,1],[3,7,11]]; // 申子辰水/寅午戌火/巳酉丑金/亥卯未木
  var sanheWx = [4,1,3,0]; // 对应五行
  for (var k = 0; k < SANHE.length; k++) {
    var count = SANHE[k].filter(function(z) { return zhiArr.indexOf(z) >= 0; }).length;
    if (count >= 2 && sanheWx[k] === wxIdx) { adjust += 15; details.push('三合半局(+15)'); }
    if (count >= 3 && sanheWx[k] === wxIdx) { adjust += 25; details.push('三合成局(+25)'); }
  }

  return {
    score: adjust,
    details: details,
    breakdown: details.length ? details.join(', ') : '无合冲'
  };
}

/* ─── 第6步: 纳音微调 (§7.1, ±5分) ─── */
var _NAYIN_WX = [3,1,0,2,0,1,4,3,2,4]; // 纳音五行索引(甲子起)
function _step6_nayin(ob, wxIdx) {
  var adjust = 0;
  var b1 = ob.b1, b2 = ob.b2, b3 = ob.b3, b4 = ob.b4;
  var nayinIdx = [b1, b2, b3, b4].map(function(b) { return Math.floor((b % 60) / 2); });

  // 简化：日柱纳音与wxIdx相同则+3
  if (nayinIdx[2] !== undefined && _NAYIN_WX[nayinIdx[2] % 10] === wxIdx) {
    adjust += 3;
  }
  return { score: adjust, breakdown: adjust > 0 ? '纳音助力(+3)' : '无纳音影响' };
}

/* ─── 第7步: 综合汇总 (§8.2 第七步) ─── */
function _computeAllWuxing(ob) {
  var yueZhiIdx = ob.b2 % 12;
  var result = { mu:0, huo:0, tu:0, jin:0, shui:0 };
  var details = [];
  var wxKeys = ['mu','huo','tu','jin','shui'];

  for (var i = 0; i < 5; i++) {
    var s1 = _step1_yueling(i, yueZhiIdx);
    var s2 = _step2_tonggen(ob, i);
    var s3 = _step3_tiangan(ob, i);
    var s4 = _step4_shengke(ob, i);
    var s5 = _step5_hehua(ob, i);
    var s6 = _step6_nayin(ob, i);

    var total = s1.score + s2.score + s3.score + s4.score + s5.score + s6.score;
    total = Math.max(0, total);
    result[wxKeys[i]] = total;

    details.push({
      wx: ['木','火','土','金','水'][i],
      base: total,
      breakdown: {
        yueling:    { score: s1.score, detail: s1.breakdown },
        tonggen:    { score: s2.score, detail: s2.breakdown, items: s2.details },
        tiangan:    { score: s3.score, detail: s3.breakdown },
        shengke:    { score: s4.score, detail: s4.breakdown, items: s4.details },
        hehua:      { score: s5.score, detail: s5.breakdown },
        nayin:      { score: s6.score, detail: s6.breakdown }
      }
    });
  }

  // 标准化为百分比
  var sum = result.mu + result.huo + result.tu + result.jin + result.shui;
  var pct = {};
  wxKeys.forEach(function(k) { pct[k] = sum > 0 ? Math.round(result[k] / sum * 100) : 20; });

  // 力量等级判定 (§8.3)
  var levels = {};
  wxKeys.forEach(function(k, i) {
    var p = pct[k];
    if (p > 35) levels[k] = '极旺';
    else if (p >= 25) levels[k] = '偏旺';
    else if (p >= 15) levels[k] = '中和';
    else if (p >= 8) levels[k] = '偏弱';
    else levels[k] = '极弱';
  });

  return { scores: result, pct: pct, levels: levels, sum: sum, details: details };
}

/* ═══════════════════════════════════════════════════════════
   导出
   ═══════════════════════════════════════════════════════════ */

module.exports = {
  // 原有函数
  Qiulq,
  _DG_GAN, _DG_BENQI, _DG_ZHONGQI, _DG_YUQI, _DG_RATIO,
  _cgGanWx, _cgSSKind, _cgIsShengZhu,
  _LIUQIN, _localSShen, _A_SS,
  _CS_WEIGHT, _CS_START, _csState, _csWeight,
  // 新增: 7层计算模型
  _WX,
  _YL_STATUS_TABLE, _YL_VALUE, _seasonGroup,
  _step1_yueling, _step2_tonggen, _step3_tiangan,
  _step4_shengke, _step5_hehua, _step6_nayin,
  _computeAllWuxing
};
