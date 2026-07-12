// ══════ 干支关系简报（新版格式）══════
// 推算依据：
//   天干五合 — 《三命通会》卷三：甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火
//   天干相克 — 五行相克：木克土、火克金、土克水、金克木、水克火
//   地支六合 — 《星平会海》：子丑合土、寅亥合木、卯戌合火、辰酉合金、巳申合水、午未合火
//   地支三合 — 申子辰水局、亥卯未木局、寅午戌火局、巳酉丑金局
//   地支半合 — 生地半合（申子/亥卯/寅午/巳酉）、墓库半合（子辰/卯未/午戌/酉丑）
//   地支三会 — 亥子丑水、寅卯辰木、巳午未火、申酉戌金
//   地支六冲 — 子午、丑未、寅申、卯酉、辰戌、巳亥
//   地支六害 — 子未、丑午、寅巳、卯辰、申亥、酉戌
//   地支三刑 — 子卯(无礼)、寅巳申(恃势)、丑戌未(无恩)
//   地支自刑 — 辰、午、酉、亥
//   地支六破 — 子酉、寅亥、辰丑、午卯、申巳、戌未
function _renderGanZhiBrief(b1,b2,b3,b4) {
  // ═══ 查找表（内联，避免依赖外部变量顺序）═══
  var _G_HE = { '甲己':'土','乙庚':'金','丙辛':'水','丁壬':'木','戊癸':'火' };
  var _Z_LIUHE_MAP = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
  var _Z_LIUHE_WX = { '子丑':'土','寅亥':'木','卯戌':'火','辰酉':'金','巳申':'水','午未':'火' };
  var _Z_SANHE = { '申子辰':'水','亥卯未':'木','寅午戌':'火','巳酉丑':'金' };
  var _Z_BANHE_SHENG = { '申子':'水','亥卯':'木','寅午':'火','巳酉':'金' };
  var _Z_BANHE_MU = { '子辰':'水','卯未':'木','午戌':'火','酉丑':'金' };
  var _Z_SANHUI = { '亥子丑':'水','寅卯辰':'木','巳午未':'火','申酉戌':'金' };
  var _Z_LIUCHONG = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
  var _Z_LIUHAI = { '子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉' };
  var _Z_SANXING_K = { '子卯':1,'寅巳':1,'巳申':1,'寅申':1,'丑戌':1,'戌未':1,'丑未':1 };
  var _Z_ZIXING = { '辰':1,'午':1,'酉':1,'亥':1 };
  var _Z_LIUPO = { '子':'酉','酉':'子','寅':'亥','亥':'寅','辰':'丑','丑':'辰','午':'卯','卯':'午','申':'巳','巳':'申','戌':'未','未':'戌' };

  var gans = [Lunar.Gan[b1%10], Lunar.Gan[b2%10], Lunar.Gan[b3%10], Lunar.Gan[b4%10]];
  var zhis = [Lunar.Zhi[b1%12], Lunar.Zhi[b2%12], Lunar.Zhi[b3%12], Lunar.Zhi[b4%12]];

  // ═══ 去重辅助 ═══
  var seen = {};
  function _add(arr, s) { if (!seen[s]) { seen[s] = 1; arr.push(s); } }

  // ═══ 天干：五合 + 五行相克 ═══
  var ganHe = [], ganKe = [];
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      var k1 = gans[i] + gans[j], k2 = gans[j] + gans[i];
      // 五合
      if (_G_HE[k1]) ganHe.push(k1 + '合化' + _G_HE[k1]);
      else if (_G_HE[k2]) ganHe.push(k2 + '合化' + _G_HE[k2]);
      // 五行相克: stemIdx>>1 = wuxingIdx (0木1火2土3金4水), (a+2)%5==b 即 a克b
      var wi = Lunar.Gan.indexOf(gans[i]) >> 1;
      var wj = Lunar.Gan.indexOf(gans[j]) >> 1;
      if ((wi + 2) % 5 === wj) _add(ganKe, gans[i] + gans[j] + '相克');
      else if ((wj + 2) % 5 === wi) _add(ganKe, gans[j] + gans[i] + '相克');
    }
  }

  // ═══ 地支：全类关系 ═══
  var zhiHe = [], zhiBanHe = [], zhiSanHe = [], zhiSanHui = [];
  var zhiChong = [], zhiHai = [], zhiXing = [], zhiPo = [];

  // 六合
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUHE_MAP[zhis[i]] === zhis[j]) {
        var k = zhis[i] < zhis[j] ? zhis[i] + zhis[j] : zhis[j] + zhis[i];
        _add(zhiHe, k + '合化' + (_Z_LIUHE_WX[k] || '土'));
      }
    }
  }

  // 三合局 + 半合
  for (var k3 in _Z_SANHE) {
    var found = [];
    for (var i = 0; i < 4; i++) { if (k3.indexOf(zhis[i]) >= 0) found.push(zhis[i]); }
    if (found.length >= 3) {
      _add(zhiSanHe, k3 + '三合' + _Z_SANHE[k3] + '局');
    } else if (found.length >= 2) {
      var key2 = found.join('');
      var wx2 = _Z_BANHE_SHENG[key2] || _Z_BANHE_MU[key2] || '';
      if (wx2) _add(zhiBanHe, key2 + '半合' + wx2 + '局');
    }
  }

  // 三会局
  for (var h3 in _Z_SANHUI) {
    var f2 = [];
    for (var i = 0; i < 4; i++) { if (h3.indexOf(zhis[i]) >= 0) f2.push(zhis[i]); }
    if (f2.length >= 3) _add(zhiSanHui, h3 + '三会' + _Z_SANHUI[h3] + '局');
  }

  // 六冲
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUCHONG[zhis[i]] === zhis[j]) _add(zhiChong, zhis[i] + zhis[j] + '相冲');
    }
  }

  // 六害
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUHAI[zhis[i]] === zhis[j]) _add(zhiHai, zhis[i] + zhis[j] + '相害');
    }
  }

  // 相刑（三刑 + 自刑）
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      var kx = zhis[i] + zhis[j], ky = zhis[j] + zhis[i];
      if (_Z_SANXING_K[kx] || _Z_SANXING_K[ky]) {
        _add(zhiXing, (zhis[i] < zhis[j] ? kx : ky) + '相刑');
      }
    }
  }
  // 自刑：同支出现两次以上
  var ziCount = {};
  for (var i = 0; i < 4; i++) {
    var zi = zhis[i];
    ziCount[zi] = (ziCount[zi] || 0) + 1;
    if (_Z_ZIXING[zi] && ziCount[zi] >= 2) _add(zhiXing, zi + zi + '自刑');
  }

  // 六破
  for (var i = 0; i < 4; i++) {
    for (var j = i + 1; j < 4; j++) {
      if (_Z_LIUPO[zhis[i]] === zhis[j]) _add(zhiPo, zhis[i] + zhis[j] + '相破');
    }
  }

  // ═══ 组装：合→克→刑→冲→害→破 顺序 ═══
  var ganOut = ganHe.concat(ganKe).join(',');
  var zhiAll = zhiHe.concat(zhiBanHe).concat(zhiSanHe).concat(zhiSanHui)
    .concat(zhiXing).concat(zhiChong).concat(zhiHai).concat(zhiPo);
  var zhiOut = zhiAll.join(',');

  return {
    gan: ganOut || '天干无特殊关系',
    zhi: zhiOut || '地支无刑冲害合'
  };
}
