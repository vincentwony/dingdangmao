// server/routes/bazi.js — 八字排盘 API
'use strict';

var { Router } = require('express');
var core = require('gongxin-core');
var timeUtil = require('../lib/time-util.js');
var guansha = require('../lib/guansha-rules.js');
var dmStrength = require('../lib/daymaster-strength.js'); // 日主强弱 · 权威判定引擎
var unified = require('../lib/bazi-unified.js'); // 八字分析 · 统一出口（只保留一套标准）
var dstLib = require('../lib/dst.js');          // 夏令时（1986–1991 中国）校准
var Lunar = core.Lunar, JD = core.JD, J2000 = core.J2000;
var computeTianLuoDiWang = core.computeTianLuoDiWang;
var _DG_GAN = core._DG_GAN, _DG_BENQI = core._DG_BENQI;

var router = Router();
var XIU = ['角','亢','氐','房','心','尾','箕','斗','牛','女','虚','危','室','壁','奎','娄','胃','昴','毕','觜','参','井','鬼','柳','星','张','翼','轸'];
var XIU_SX = ['东方青龙','东方青龙','东方青龙','东方青龙','东方青龙','东方青龙','东方青龙','北方玄武','北方玄武','北方玄武','北方玄武','北方玄武','北方玄武','北方玄武','西方白虎','西方白虎','西方白虎','西方白虎','西方白虎','西方白虎','西方白虎','南方朱雀','南方朱雀','南方朱雀','南方朱雀','南方朱雀','南方朱雀','南方朱雀'];
// 人元司令分野表 —— 据《渊海子平·论天干地支暗藏总诀》
// 地支序: 寅0卯1辰2巳3午4未5申6酉7戌8亥9子10丑11
var RENYUAN = [
  // 寅月(立春): 戊土7日→丙火7日→甲木16日
  [{d:0,s:"戊"},{d:7,s:"丙"},{d:14,s:"甲"}],
  // 卯月(惊蛰): 甲木10日→乙木20日
  [{d:0,s:"甲"},{d:10,s:"乙"}],
  // 辰月(清明): 乙木9日→癸水3日→戊土18日
  [{d:0,s:"乙"},{d:9,s:"癸"},{d:12,s:"戊"}],
  // 巳月(立夏): 戊土5日→庚金9日→丙火16日
  [{d:0,s:"戊"},{d:5,s:"庚"},{d:14,s:"丙"}],
  // 午月(芒种): 丙火10日→己土9日→丁火11日
  [{d:0,s:"丙"},{d:10,s:"己"},{d:19,s:"丁"}],
  // 未月(小暑): 丁火9日→乙木3日→己土18日
  [{d:0,s:"丁"},{d:9,s:"乙"},{d:12,s:"己"}],
  // 申月(立秋): 戊土10日→壬水3日→庚金17日
  [{d:0,s:"戊"},{d:10,s:"壬"},{d:13,s:"庚"}],
  // 酉月(白露): 庚金10日→辛金20日
  [{d:0,s:"庚"},{d:10,s:"辛"}],
  // 戌月(寒露): 辛金9日→丁火3日→戊土18日
  [{d:0,s:"辛"},{d:9,s:"丁"},{d:12,s:"戊"}],
  // 亥月(立冬): 戊土7日→甲木5日→壬水18日
  [{d:0,s:"戊"},{d:7,s:"甲"},{d:12,s:"壬"}],
  // 子月(大雪): 壬水10日→癸水20日
  [{d:0,s:"壬"},{d:10,s:"癸"}],
  // 丑月(小寒): 癸水9日→辛金3日→己土18日
  [{d:0,s:"癸"},{d:9,s:"辛"},{d:12,s:"己"}]
];

function _setSel2s(jdDeg, wdDeg) {
  // 据《真太阳时修正技术参数.md》§3.1 及 §4.3：
  //   真太阳时 = 标准时 + (λ/15 − TZ) + EoT
  //   mingLiBaZi 内部: t22 = L/pi2 + sc/pi2, jd = jd - t22 - 78/86400
  //   其中 L = Sel2s.vJ（弧度），sc = EoT（弧度）
  //   令 -L/pi2 = λ/15 − TZ → L = (TZ×15 − λ) × π/180
  //   中国标准时 TZ=+8，标准经度 120°E → L = (120 − jdDeg) × π/180
  //   例：北京 λ=120° → L=0；上海 λ=121.5° → L=−1.5×π/180（真太阳时 +6min）
  var L_rad = (120 - jdDeg) * Math.PI / 180;  // TZ=+8, 标准经度 120°E
  global.Sel2s = { vJ: L_rad, vW: wdDeg / (180 / Math.PI), options: [{ value: '0', text: '默认' }] };
}

// POST /api/v1/bazi — 八字排盘全量
router.post('/', function(req, res, next) {
  try {
    var t0 = Date.now();
    var body = req.body;
    var name = body.name || '';
    var sex = body.sex === '女' ? 0 : 1;
    var calType = body.calType || 'gongli';
    var y = parseInt(body.y, 10), m = parseInt(body.m, 10), d = parseInt(body.d, 10);
    var h = timeUtil.normalizeHour(body.h, 12);     // 保留 h=0（午夜/早子时），缺失时默认午时
    var min = timeUtil.normalizeMinute(body.min, 0); // 分钟取 0-59；严禁用 normalizeHour（会钳成 0）
    var _rawH = h; // 钟表小时（夏令时校准前），供子时流派判定
    var jdVal = parseFloat(body.jd) || 116.4, wd = parseFloat(body.wd) || 39.9;
    var isLeap = !!body.isLeap;

    // —— 夏令时修正（1986–1991 中国，Phase 1.2）——
    // 夏令时期间「北京时间(钟表)」实为 UTC+9，需减 1h 得标准时(UTC+8)再排盘。
    // 公历输入：用 applyDST 规整到标准时墙上值（跨日安全）；
    // 农历输入：DST 仅对时刻减 1h 融入 t（Lunar.JL 小数日处理跨农历日），年区间按公历近似。
    var _dstMode = body.dst || 'auto';
    var _ziShi = body.ziShi || 'wan'; // 子时流派：wan=夜子时(默认,23:00起日柱换次日) / zao=早子时(23:00不换日)
    var _dstApplied = false;
    if (calType === 'gongli') {
      var _d = dstLib.applyDST(y, m, d, h, min, _dstMode);
      if (_d.applied) { y = _d.y; m = _d.m; d = _d.d; h = _d.h; min = _d.min; _dstApplied = true; }
    } else {
      var _in = dstLib.isDST(y, m, d);
      var _doApply = (_dstMode === 'on') || (_dstMode === 'auto' && _in);
      if (_doApply) {
        var _adj = h * 60 + min - 60;
        h = ((_adj / 60) % 24 + 24) % 24;
        min = ((_adj % 60) + 60) % 60;
        _dstApplied = true;
      }
    }

    if (!y || !m || !d) {
      return res.status(400).json({ ok: false, error: 'y/m/d required', code: 400 });
    }

    var t = h + min / 60, d0;
    if (calType === 'nongli') {
      // 据《闰月处理修正技术文档.md》§4.4：Lunar.JL 的月序调整逻辑
      // 对年末闰月（leapIdx=1冬月/2腊月）存在系统性缺陷：
      //   a) 校验 leapMonth-2 != m 对 leap=1/2 不成立（-1≠11 / 0≠12）
      //   b) 非闰月映射时 m+2 公式对年末月份会越界（m=12→14→溢出回绕）
      // 解决方案：不依赖 Lunar.JL，直接使用 Lunar.HS 数组计算 JD
      Lunar.calc(Math.floor(JD.JD(y, 12, 25) - J2000));
      if (!Lunar.leap) Lunar.calc(Math.floor(JD.JD(y, 2, 1) - J2000));
      var actualLeapIdx = Lunar.leap || 0;

      if (actualLeapIdx === 1 || actualLeapIdx === 2) {
        // 年末闰月：手动映射用户月份→内部月序
        // leap=1: 1=闰11,2=12,3=正,4=二,…,13=十一,14=十二
        // leap=2: 1=11,2=闰12,3=正,4=二,…,14=十二
        var internalMonth;
        if (isLeap) {
          internalMonth = actualLeapIdx;
        } else if (actualLeapIdx === 1) {
          if (m === 11) internalMonth = 13;      // 十一月（非闰）
          else if (m === 12) internalMonth = 2;  // 十二月/腊月
          else internalMonth = m + 2;             // 正月(1→3) … 十月(10→12)
        } else { // leapIdx === 2
          if (m === 11) internalMonth = 1;       // 十一月/冬月
          else if (m === 12) internalMonth = 14; // 十二月（非闰）
          else internalMonth = m + 2;             // 正月(1→3) … 十月(10→12)
        }
        // 日期范围校验
        if (d > (Lunar.dx[internalMonth] || 30)) {
          return res.status(400).json({ ok: false, error: '农历日期超出该月范围（最大' + (Lunar.dx[internalMonth]||30) + '天）', code: 400 });
        }
        d0 = Lunar.HS[internalMonth] + t / 24 + d - 1 - 0.5;
      } else {
        d0 = Lunar.JL(y, m, d + t / 24, isLeap ? actualLeapIdx : 0) - J2000;
        if (d0 == null || isNaN(d0)) {
          return res.status(400).json({ ok: false, error: '农历日期无效（闰月不存在或日期超出范围）', code: 400 });
        }
      }
    } else {
      d0 = JD.JD(y, m, d + t / 24) - J2000;
    }

    // 保存 mingLiBaZi 前的闰月索引（内部 calc 可能 reset Lunar.leap）
    // 对 gongli 输入也需检测：mingLiBaZi 硬编码 mk=1→腊 对 leap=1 的年份均适用
    if (calType === 'gongli') {
      Lunar.calc(Math.floor(JD.JD(y, 12, 25) - J2000));
      if (!Lunar.leap) Lunar.calc(Math.floor(JD.JD(y, 2, 1) - J2000));
    }
    var _savedLeap = Lunar.leap;

    var ob = {};
    _setSel2s(jdVal, wd);
    try {
      // 据《真太阳时修正技术参数.md》§4.1: 真太阳时 = 标准时 + (λ/15−TZ) + EoT
      // d0 = JD.JD(y,m,d+t/24) − J2000，是「本地标准时儒略日偏移」
      // mingLiBaZi 内部用 Sel2s.vJ（已设 = (120−λ)×π/180）做经度修正
      // 不对外部 jd 做时区修正（d0 裸传），时区补偿已编码在 L = (TZ×15−λ)×π/180 中
      Lunar.mingLiBaZi(d0, jdVal / (180 / Math.PI), ob, name, sex, 0, 0, '');
    } catch(e) { return res.status(500).json({ ok: false, error: '八字计算: ' + e.message, code: 500 }); }

    // 闰月显示修正（据《闰月处理修正技术文档.md》§3.2 + 任务A 验证）：
    // mingLiBaZi 将 mk={0,1} 硬编码为 '冬'/'腊'（index.html L7800-7802），
    // 当 leap=1 时 mk=1 实际为「闰十一月」而非「闰腊月」。
    if (_savedLeap === 1 && ob._lunarMonth && ob._lunarMonth.indexOf('闰腊') === 0) {
      ob._lunarMonth = ob._lunarMonth.replace('闰腊', '闰十一');
    }
    // leap=2 时 s1='闰'+ym[2]='闰十二'（length=3），s1.length<3 检查失效，
    // 「月」后缀被跳过 → 显示「闰十二大/小」而非「闰十二月大/小」。
    if (_savedLeap === 2 && ob._lunarMonth && ob._lunarMonth.indexOf('闰十二') === 0) {
      ob._lunarMonth = ob._lunarMonth.replace('闰十二', '闰十二月');
    }

    // 真太阳时修正（据《真太阳时修正技术参数.md》§4.1 公式）：
    //   真太阳时 = 标准时 + (λ/15 − TZ) × 3600 + EoT(秒)
    //   mingLiBaZi 内部 t22 = L/pi2 + sc/pi2 的 EoT 符号与标准公式相反，
    //   且附加 78s 历史兼容修正，导致输出偏差。此处用正确公式重算并覆写。
    (function(){
      // EoT（时差）— Meeus 近似公式（文档 §2.3），精度约 0.5 分钟
      var _daysInMonth = [0,31,28,31,30,31,30,31,31,30,31,30,31];
      var _isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      if (_isLeapYear) _daysInMonth[2] = 29;
      var _n = 0; // 年内日序
      for (var _mi = 1; _mi < m; _mi++) _n += _daysInMonth[_mi];
      _n += d;
      var _B = (360 / 365) * (_n - 81) * Math.PI / 180;
      var _eotMin = 9.87 * Math.sin(2*_B) - 7.53 * Math.cos(_B) - 1.5 * Math.sin(_B);
      var _eotSec = Math.round(_eotMin * 60);

      // 经度修正（秒）
      var _longCorrSec = Math.round((jdVal / 15 - 8) * 3600);

      // 真太阳时（秒）
      var _stdSec = h * 3600 + min * 60;
      var _trueSolarSec = (_stdSec + _longCorrSec + _eotSec + 86400) % 86400;
      var _tsH = Math.floor(_trueSolarSec / 3600);
      var _tsM = Math.floor((_trueSolarSec % 3600) / 60);
      var _tsS = Math.floor(_trueSolarSec % 60);

      // 覆写 ob.bz_zty 中的时间部分（保留空亡、纳音等后缀）
      var _ztyParts = (ob.bz_zty || '').split(' ');
      _ztyParts[0] = String(_tsH).padStart(2,'0') + ':' + String(_tsM).padStart(2,'0') + ':' + String(_tsS).padStart(2,'0');
      ob.bz_zty = _ztyParts.join(' ');

      // 时辰边界修正：若真太阳时跨越时辰边界，同步修正时柱 ob.bz_js
      // 时辰: 子(23-1),丑(1-3),寅(3-5),卯(5-7),辰(7-9),巳(9-11),午(11-13),
      //       未(13-15),申(15-17),酉(17-19),戌(19-21),亥(21-23)
      var _newSC = Math.floor(((_tsH + 1) % 24) / 2);  // 0=子…11=亥
      var _oldZhi = ob.bz_js ? ob.bz_js[1] : '';
      var _oldSC = Lunar.Zhi.indexOf(_oldZhi);
      if (_oldSC >= 0 && _oldSC !== _newSC) {
        // 时辰已变化，根据日干 + 五鼠遁重算时柱天干
        var _dayGanIdx = Lunar.Gan.indexOf(ob.bz_jr[0]);
        if (_dayGanIdx >= 0) {
          var _hourStemIdx = ((_dayGanIdx % 5) * 2 + _newSC) % 10;
          ob.bz_js = Lunar.Gan[_hourStemIdx] + Lunar.Zhi[_newSC];
        }
      }
    })();
    ob.bz_dst = _dstApplied; // 透明化：本次排盘是否应用了夏令时修正

    // —— 子时流派（Phase 1.3）——
    // 默认夜子时(wan)：mingLiBaZi 已按「23:00 起日柱换次日」实现。
    // 早子时(zao)：23:00–23:59 出生者日柱用「当日」（不换日），时柱按当日日干遁子时。
    // 注：判定用 _rawH（钟表小时），不受夏令时校准影响。
    if (_ziShi === 'zao' && _rawH === 23) {
      var _dg = Lunar.Gan.indexOf(ob.bz_jr[0]);
      var _dz = Lunar.Zhi.indexOf(ob.bz_jr[1]);
      if (_dg >= 0 && _dz >= 0) {
        ob.bz_jr = Lunar.Gan[(_dg + 9) % 10] + Lunar.Zhi[(_dz + 11) % 12]; // 日柱前推一日（当日）
        var _hs = (((_dg + 9) % 10) % 5) * 2 % 10; // 五鼠遁：当日日干遁子时
        ob.bz_js = Lunar.Gan[_hs] + '子';
      }
    }

    // 前后节气信息（需在 mingLiBaZi 之后，ob.bz_jd 被设置）
    // dayunjl 依赖 _getLunarDateStr（block[2]中定义，沙箱可能未加载），加 try-catch 保护
    try { ob.bzJQ = typeof dayunjl === 'function' ? dayunjl(ob.bz_jd) : ''; } catch(e) { ob.bzJQ = ''; }

    // 从格分析 — 统一出口（源自权威引擎 A/B 7级，单一标准；不再有 Engine A/B 双口径）
    var _uCong = unified.getCongGeData(ob);
    ob._congGeData = _uCong; // 供下方 determineBaziPattern 格局卡「从格预检」读取，与「从格」卡同源（消除跨卡双结论）
    if (_uCong.isCong) {
      ob._geName = _uCong.congType;
    } else {
      try {
        var mb = ob.b2 % 12, bqIdx = _DG_GAN[_DG_BENQI[mb]];
        if (bqIdx === undefined) bqIdx = 0;
        ob._geName = Lunar.sshen(ob.b3, bqIdx) + '格';
      } catch (e) { ob._geName = '未知格局'; }
    }
    ob._geNameV2 = ob._geName; // 统一标准：Engine A/B 合并为同一结论

    // ═══ 日标信息新字段 ═══
    var _bufD = {}; JD.DD(d0 + J2000, _bufD);
    var gYear = _bufD.Y, gMonth = _bufD.M, gDay = _bufD.D;
    var shengXiao = Lunar.ShX ? Lunar.ShX[ob.b1 % 12] : '';

    // 真太阳时格式化
    var ztyStr = ''; var ztyParts = (ob.bz_zty || '').split(':');
    if (ztyParts.length >= 2) {
      var ztyH = parseInt(ztyParts[0], 10), ztyM = parseInt(ztyParts[1], 10);
      if (!isNaN(ztyH) && !isNaN(ztyM)) {
        var ztyD = gDay, ztyMo = gMonth, ztyY = gYear, ztyOff = (h*60+min) - (ztyH*60+ztyM);
        if (ztyOff > 720) { ztyD--; if (ztyD<1) { ztyMo--; if (ztyMo<1) { ztyY--; ztyMo=12; } ztyD = new Date(ztyY, ztyMo, 0).getDate(); } }
        else if (ztyOff < -720) { ztyD++; var maxD2 = new Date(ztyY, ztyMo, 0).getDate(); if (ztyD > maxD2) { ztyD = 1; ztyMo++; if (ztyMo>12) { ztyY++; ztyMo=1; } } }
        ztyStr = ztyY + '-' + String(ztyMo).padStart(2,'0') + '-' + String(ztyD).padStart(2,'0') + ' ' + String(ztyH).padStart(2,'0') + ':' + String(ztyM).padStart(2,'0');
      }
    }
    var gongliDateStr = gYear + '-' + String(gMonth).padStart(2,'0') + '-' + String(gDay).padStart(2,'0') + ' ' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');

    // 星座（标准黄道十二宫日期边界）
    var XZ_DATA = [
      [1,20,'水瓶座','Aquarius'],[2,19,'双鱼座','Pisces'],[3,21,'白羊座','Aries'],
      [4,20,'金牛座','Taurus'],[5,21,'双子座','Gemini'],[6,22,'巨蟹座','Cancer'],
      [7,23,'狮子座','Leo'],[8,23,'处女座','Virgo'],[9,23,'天秤座','Libra'],
      [10,24,'天蝎座','Scorpio'],[11,22,'射手座','Sagittarius'],[12,22,'摩羯座','Capricorn']
    ];
    var xzCn = '摩羯座', xzEn = 'Capricorn';
    for (var _xz = 11; _xz >= 0; _xz--) {
      if (gMonth > XZ_DATA[_xz][0] || (gMonth === XZ_DATA[_xz][0] && gDay >= XZ_DATA[_xz][1])) {
        xzCn = XZ_DATA[_xz][2]; xzEn = XZ_DATA[_xz][3]; break;
      }
    }

    // 星宿
    var xiuIdx = typeof xiuIndex2 === 'function' ? xiuIndex2(gYear, gMonth, gDay) : 10;

    // 胎元 — 据《三命通会》卷三: 月干进一位+月支进三位, 即月柱GZ索引-9
    var _tyxhRaw = typeof Lunar.taiyuan === 'function' ? Lunar.taiyuan(ob.b2) : 0;
    var Tyxh = ((_tyxhRaw % 60) + 60) % 60;
    var taiYuanGZ = Lunar.Gan[Tyxh % 10] + Lunar.Zhi[Tyxh % 12];
    var taiYuanNY = typeof Lunar.nayin === 'function' ? Lunar.nayin(Tyxh) : '';

    // 命宫 — 据《三命通会·论坐命宫》: 月起逆数+时加顺行→逢卯定位
    var MGxh = typeof Lunar.minggong === 'function' ? ((Lunar.minggong(ob.b1, ob.b2, ob.b4) % 60) + 60) % 60 : 0;
    var mingGongGZ = Lunar.Gan[MGxh % 10] + Lunar.Zhi[MGxh % 12];
    var mingGongNY = typeof Lunar.nayin === 'function' ? Lunar.nayin(MGxh) : '';

    // 身宫 — 据《渊海子平》: 子起正月顺数至月+加时逆推至酉
    var _shgRaw = typeof Lunar.shengong === 'function' ? Lunar.shengong(ob.b1, ob.b2, ob.b4) : 0;
    var ShG = ((_shgRaw % 60) + 60) % 60;
    var shenGongGZ = Lunar.Gan[ShG % 10] + Lunar.Zhi[ShG % 12];
    var shenGongNY = typeof Lunar.nayin === 'function' ? Lunar.nayin(ShG) : '';

    // 胎息 — 据《渊海子平》: 取日干五合+日支六合, 组成新干支, 其纳音为胎息
    // 天干五合: 甲己合土/乙庚合金/丙辛合水/丁壬合木/戊癸合火
    // 地支六合: 子丑合/寅亥合/卯戌合/辰酉合/巳申合/午未合
    var _HE_GAN = [5,6,7,8,9,0,1,2,3,4];  // 甲→己(5), 乙→庚(6), ..., 癸→戊(4)
    var _HE_ZHI = [1,0,11,10,9,8,7,6,5,4,3,2];  // 子→丑,丑→子,寅→亥,卯→戌,辰→酉,巳→申,午→未,未→午,申→巳,酉→辰,戌→卯,亥→寅
    var _riG2Idx = Lunar.Gan.indexOf(ob.bz_jr[0]);
    var _riZ2Idx = Lunar.Zhi.indexOf(ob.bz_jr[1]);
    var _taiXiG = _HE_GAN[_riG2Idx];  // 日干五合之干索引
    var _taiXiZ = _HE_ZHI[_riZ2Idx];  // 日支六合之支索引
    var _taiXiGZIdx = -1;
    for (var _txi = 0; _txi < 60; _txi++) { if (_txi % 10 === _taiXiG && _txi % 12 === _taiXiZ) { _taiXiGZIdx = _txi; break; } }
    var taiXiGZStr = _taiXiGZIdx >= 0 ? Lunar.Gan[_taiXiGZIdx % 10] + Lunar.Zhi[_taiXiGZIdx % 12] : '';
    var taiXiNY = (_taiXiGZIdx >= 0 && typeof Lunar.nayin === 'function') ? Lunar.nayin(_taiXiGZIdx) : '';

    // 保留日柱GZ索引用于后续空亡计算
    var dayGZIdx = 0;
    for (var _tdi = 0; _tdi < 60; _tdi++) { if (Lunar.Gan[_tdi % 10] === ob.bz_jr[0] && Lunar.Zhi[_tdi % 12] === ob.bz_jr[1]) { dayGZIdx = _tdi; break; } }

    // 人元司令分野 — RENYUAN表按月序(寅0卯1…丑11), 需从地支索引转换
    var mb2 = (ob.b2 % 12 + 10) % 12;
    var ryList = RENYUAN[mb2] || [{d:0,s:'戊'}];
    var ryCurrent = ryList[0];
    var lunarDayNum = parseInt(ob._lunarDay) || gDay;
    for (var _ry = ryList.length - 1; _ry >= 0; _ry--) { if (lunarDayNum >= ryList[_ry].d) { ryCurrent = ryList[_ry]; break; } }
    var ganIdxRY = Lunar.Gan.indexOf(ryCurrent.s);
    var wuxingRY = (ganIdxRY >= 0) ? ['木','火','土','金','水'][ganIdxRY >> 1] : '';
    var renYuanStr = ryCurrent.s + wuxingRY + '用事';

    // 空亡
    var kongWangStr = Lunar.Zhi[((Math.floor(dayGZIdx / 10) * 10 + 10) % 60) % 12] + Lunar.Zhi[((Math.floor(dayGZIdx / 10) * 10 + 11) % 60) % 12];

    // 命卦 — 据《八宅明镜》2000年前后分界公式
    var BAGUA = ['坎','坤','震','巽','中','乾','兑','艮','离'];
    var DONGXI = ['东四命','西四命','东四命','东四命','中宫','西四命','西四命','西四命','东四命'];
    var _yearLast2 = gYear % 100;
    var mgNum;
    if (gYear < 2000) {
      // 1900-1999: 男=(100-后两位)%9, 女=(后两位-4)%9, 余0取9
      if (sex === 1) mgNum = (100 - _yearLast2) % 9;
      else mgNum = (_yearLast2 - 4) % 9;
    } else {
      // 2000-2099: 男=(99-后两位)%9, 女=(后两位+6)%9, 余0取9
      if (sex === 1) mgNum = (99 - _yearLast2) % 9;
      else mgNum = (_yearLast2 + 6) % 9;
    }
    if (mgNum === 0) mgNum = 9;
    if (mgNum === 5) { mgNum = sex === 1 ? 2 : 8; }  // 中宫: 男寄坤(2), 女寄艮(8)
    var mgName = BAGUA[mgNum - 1], mgDir = DONGXI[mgNum - 1];

    // 节气详情 — 用太阳视黄经定位（与 dayunjl 一致），避免 Lunar.HS 月序偏移
    var jieQiDetail = null;
    var _jd2 = d0 + dt_T(d0);
    var _solarLon = XL.S_aLon(_jd2 / 36525, -1);  // 太阳视黄经 (rad)
    var _solarMonth = Math.floor((_solarLon / (2 * Math.PI) * 360 + 45 + 15 * 360) / 30);  // 太阳月序
    Lunar.calc(Math.floor(d0 + 0.5));
    var si = (_solarMonth + 2 + 60000000) % 12;  // 节气月索引 (0=子月/大雪～小寒, +6e7 保正)
    if ((2 * si - 1) < 0) { Lunar.calc(Math.floor(d0 + 0.5 - 30.601)); si = si % 12; }
    var zqA = Lunar.ZQ[(2 * si - 1 + 24) % 24];  // 前一节气（可能跨年）
    // 重载当前年（仅在跨年边界时才需要重新 calc）
    Lunar.calc(Math.floor(d0 + 0.5));
    var zqB = Lunar.ZQ[(2 * si + 1 + 24) % 24];  // 后一节气
    // 若 zqB 已过（子月年初边界），取次年节气
    if (zqB + J2000 <= d0 + J2000) { Lunar.calc(Math.floor(d0 + 0.5 + 365.25)); zqB = Lunar.ZQ[(2 * si + 1 + 24) % 24]; }
    if (zqA && zqB && typeof qi_accurate2 === 'function') {
      var qA = qi_accurate2(zqA), qB = qi_accurate2(zqB);
      var jdNow = d0 + J2000;
      var daysAfterA = Math.floor(jdNow - (zqA + J2000));
      var hoursAfterA = Math.floor((jdNow - (zqA + J2000) - daysAfterA) * 24);
      var daysBeforeB = Math.floor((zqB + J2000) - jdNow);
      var hoursBeforeB = Math.floor(((zqB + J2000) - jdNow - daysBeforeB) * 24);
      jieQiDetail = {
        termA: Lunar.jqmc[(2 * si - 1 + 24) % 24],
        termB: Lunar.jqmc[(2 * si + 1 + 24) % 24],
        termATime: JD.JD2str(qA + J2000).trim().substr(0, 16),
        termBTime: JD.JD2str(qB + J2000).trim().substr(0, 16),
        daysAfterA: daysAfterA, hoursAfterA: hoursAfterA,
        daysBeforeB: daysBeforeB, hoursBeforeB: hoursBeforeB
      };
    }

    // 组装响应
    // 完整 bzinfo = 八字专业细盘 + ob.bzinfo（含十年大运/大运流年/流月/命宫星性等 bt-card 块）
    // renderBaziTable 不在 ob.bzinfo 中，需手动拼接。renderDayunTable 等已在 ob.bzinfo 中。
    var fullBzinfo = (typeof renderBaziTable === 'function' ? renderBaziTable(ob) : '')
                   + (ob.bzinfo || '');

    // ═══ 日主强弱 · 权威判定（覆盖层，依据《日主强弱判定方法研究与实现方案.md》§5 方案二 A/B 7级）═══
    var _dmResult = dmStrength.computeDayMasterStrength(ob);
    ob._dayMasterStrength = _dmResult;
    var _wx = unified.getWuxing(ob); // 五行力量 · 统一出口（源自权威引擎 scores）

    // 卡片拆分 — Engine A
    var cards = _splitBzinfoToCards(fullBzinfo);

    // ═══ 天罗地网运卡片（始终显示）═══
    ob.sex = sex;
    var tldw = computeTianLuoDiWang(ob);
    if (tldw) {
      var tldwCard = _buildTianLuoDiWangCard(tldw, ob);
      fullBzinfo += tldwCard;
      cards = _splitBzinfoToCards(fullBzinfo);
    }

    // ═══ 魁罡命格卡片 ═══
    if (core.computeKuiGang) {
      var kuigang = core.computeKuiGang(ob);
      if (kuigang) {
        var kgCard = _buildKuiGangCard(kuigang, ob);
        fullBzinfo += kgCard;
        cards = _splitBzinfoToCards(fullBzinfo);
      }
    }

    // ═══ 权威判定卡片覆盖（须在所有 _splitBzinfoToCards 重建之后执行）═══
    // 日主强弱(bz_rizhu)：原 sxwnl-bundle 用旧三要素算法生成；此处替换为依据
    //   《日主强弱判定方法研究与实现方案.md》§5 方案二（A/B 比值 7 级）的权威结论。
    // 五行力量(bz_wuxing)：替换为 lib/bazi-unified.js 统一出口（与 wx-dist 同源，消除上游旧卡空白 canvas）。
    // —— 以上两项为「只需一套标准」的覆盖，对 Engine A / Engine B 同时生效。
    // ⚠️ 刻意保留的双引擎差异：喜用神 / 从格 / 格局 三张卡**仅 Engine B(cardsV2) 走统一出口**，
    //   Engine A(cards，默认视图) 仍用上游古籍旧派逻辑（《滴天髓》顺势派），供用户切换对照。
    //   这是设计使然，不是 bug——勿在 Engine A 覆盖块中补这三张卡。
    var _dmCardBody = _buildDayMasterCard(_dmResult, ob);
    var _wuxingCardBody = unified.getWuxingCard(ob); // 五行力量 · 统一出口（与 wx-dist 同源，替换上游含空 canvas 的旧卡）
    cards = cards.map(function(c) {
      if (c.id === 'bz_rizhu') return { id: c.id, title: '日主强弱', body: _dmCardBody };
      if (c.id === 'bz_wuxing') return { id: c.id, title: c.title, body: _wuxingCardBody };
      return c;
    });

    // ═══ 小儿关煞推算 ═══
    // 正统子平 + 民间三十六关 + 七十二煞子集（结构化数据，供前端第伍章渲染）
    var xiaoErGuanSha = null;
    try { xiaoErGuanSha = guansha.computeXiaoErGuanSha(ob, sex); } catch (e) { xiaoErGuanSha = null; }

    // 卡片拆分 — Engine B（重建核心分析卡片，全部来自统一出口，单一标准）
    // 注：ob._congGeData 已在上方（L203 区域）设为 unified.getCongGeData(ob)，
    //     供 determineBaziPattern 格局卡「从格预检」读取，与「从格」卡同源；不再交换 _congGeDataV2。
    var _v2geju = typeof determineBaziPattern === 'function' ? determineBaziPattern(ob) : '';
    var _v2xiyong = unified.getXiyong(ob);      // 喜用神 · 统一出口（旺衰用神法，源自权威引擎 verdict）
    var _v2congge = unified.getCongGe(ob);      // 从格 · 统一出口（源自权威引擎 verdict，单一标准）
    var _v2wuxing = unified.getWuxingCard(ob);  // 五行力量 · 统一出口（与 wx-dist 同源）
    var cardsV2 = cards.map(function(c) {
      if (c.id === 'bz_geju' && _v2geju) return { id: c.id, title: c.title, body: _v2geju };
      if (c.id === 'bz_xiyong' && _v2xiyong) return { id: c.id, title: c.title, body: _v2xiyong };
      if (c.id === 'bz_congge' && _v2congge) return { id: c.id, title: c.title, body: _v2congge };
      if (c.id === 'bz_wuxing' && _v2wuxing) return { id: c.id, title: c.title, body: _v2wuxing };
      return c;
    });

    var result = {
      name: name, sex: sex === 1 ? '男' : '女',
      pillars: { year: ob.bz_jn, month: ob.bz_jy, day: ob.bz_jr, hour: ob.bz_js },
      bzInfo: ob.bzInfo2 || '',
      lunarDate: (ob._lunarYear || '') + '年' + (ob._lunarMonth || '').replace(/[大小]/g,'').trim() + (ob._lunarDay || '') + ' ' + (ob.bz_js ? ob.bz_js[1] : '') + '时',
      lunarMonth: ob._lunarMonth || '', lunarDay: ob._lunarDay || '',
      jieQi: ob.bzJQ || '',
      zhenTaiYang: ob.bz_zty || '',
      jiShi: ob.bz_JS || '',
      dstApplied: _dstApplied,
      ziShi: _ziShi,
      // Engine A (《滴天髓》)
      geName: ob._geName,
      congGe: { isCong: _uCong.isCong, congType: _uCong.congType, shengPct: _uCong.shengPct, keXiePct: _uCong.keXiePct, detail: _uCong.detail },
      cards: cards,
      // Engine B (《子平真诠》)
      geNameV2: ob._geNameV2,
      congGeV2: { isCong: _uCong.isCong, congType: _uCong.congType, shengPct: _uCong.shengPct, keXiePct: _uCong.keXiePct, detail: _uCong.detail },
      cardsV2: cardsV2,
      wuxingScores: _wx.scores,
      wuxingPct: _wx.pct,
      wuxingLevels: _wx.levels,
      wuxingDetails: _wx.details,
      // 日主强弱 · 权威判定（文档 §5 方案二 A/B 7级）— 前端单一权威结论 + 五行分布图作明细
      dayMasterStrength: _dmResult,
      dayMasterScores: _dmResult.scores,
      // 2026-06-26: bzinfo 不再返回客户端，cards[] 已完全替代
      bzinfo: '',
      cards: cards,
      dayun: ob._sz || null,
      b1: ob.b1, b2: ob.b2, b3: ob.b3, b4: ob.b4, MGxh: MGxh,
      // 日标信息
      riBiao: {
        shengXiao: shengXiao,
        gongliDate: gongliDateStr,
        ztyDate: ztyStr,
        solarTerms: jieQiDetail,
        xiu: XIU[xiuIdx] + '宿' + XIU_SX[xiuIdx],
        xingZuo: xzCn + '(' + xzEn + ')',
        taiXi: (taiXiGZStr || '无') + ' (' + (taiXiNY || '无纳音') + ')',
        taiYuan: taiYuanGZ + ' (' + taiYuanNY + ')',
        shenGong: shenGongGZ + ' (' + shenGongNY + ')',
        mingGong: mingGongGZ + ' (' + mingGongNY + ')',
        mingGua: mgName + '卦 (' + mgDir + ')',
        renYuan: renYuanStr,
        kongWang: kongWangStr
      },
      // 天罗地网运（双算法）
      tianLuoDiWang: tldw || { classic: { hasShensha: false }, modern: { hasShensha: false } },
      // 小儿关煞（第伍章）
      xiaoErGuanSha: xiaoErGuanSha
    };

    res.json({ ok: true, data: result, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// POST /api/v1/bazi/congge
router.post('/congge', function(req, res, next) {
  try {
    var t0 = Date.now(), body = req.body;
    var ob = { bz_jn: body.pillars.year, bz_jy: body.pillars.month, bz_jr: body.pillars.day, bz_js: body.pillars.hour, b1: body.b1, b2: body.b2, b3: body.b3, b4: body.b4, name: body.name || '', sex: body.sex === '女' ? 0 : 1 };
    ob._congGeData = unified.getCongGeData(ob); // 从格 · 统一出口（不再依赖上游 _computeCongGeData 双口径）
    res.json({ ok: true, data: ob._congGeData, html: unified.getCongGe(ob), took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// POST /api/v1/bazi/xiyong
router.post('/xiyong', function(req, res, next) {
  try {
    var t0 = Date.now(), body = req.body;
    var ob = { bz_jn: body.pillars.year, bz_jy: body.pillars.month, bz_jr: body.pillars.day, bz_js: body.pillars.hour, b1: body.b1, b2: body.b2, b3: body.b3, b4: body.b4, name: body.name || '', sex: body.sex === '女' ? 0 : 1 };
    var xy = unified.getXiyong(ob); // 喜用神 · 统一出口（不再依赖上游 determineXiyongshen 旧刻度）
    res.json({ ok: true, data: xy, strength: ob._dayMasterStrength, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

/** bt-card 标题关键词 → 合成 ID 映射表（与 ChangeLn _upsertCard 的 id 参数一致）
 *  统一使用 bazi* 前缀命名空间，消除 selectLiunianYear 双 ID 回退 */
var BT_ID_MAP = [
  ['八字专业细盘', 'bt_xipan'],
  ['细盘',         'bt_xipan'],
  ['十年大运',     'bt_dayun'],
  ['大运流年',     'baziLiunian'],
  ['流月',         'baziLiuyue'],
  ['十二命宫',     'baziMinggong']
];

function _synthesizeBtId(title) {
  for (var i = 0; i < BT_ID_MAP.length; i++) {
    if (title.indexOf(BT_ID_MAP[i][0]) >= 0) return BT_ID_MAP[i][1];
  }
  return 'bt_' + title.replace(/[^a-zA-Z一-鿿]/g, '_').toLowerCase().substring(0, 20);
}

/** 扫描 HTML 字符串中指定标记的卡片起始位置（去重并入队） */
/** 用新管道数据替换8张分析卡片的body (2026-06-24 接管)
 *  4张纯数据卡保持不变: bz_taiyuan/bz_jishen/bz_zhongliang/bz_minggong */

function _findCardStarts(html, tag, positions, type) {
  var pos = 0, tagLen = tag.length;
  while ((pos = html.indexOf(tag, pos)) >= 0) {
    // 仅 bt-card 类需要排除以 tag 为前缀的其他类名（如 class="bt-card-x"）
    if (type === 'bt') {
      var after = html[pos + tagLen];
      if (after !== '"' && after !== ' ' && after !== '>') { pos += tagLen; continue; }
    }
    var divStart = html.lastIndexOf('<div', pos);
    if (divStart < 0) { pos += tagLen; continue; }
    // 去重
    var i;
    for (i = 0; i < positions.length; i++) {
      if (positions[i].pos === divStart) break;
    }
    if (i === positions.length) positions.push({pos: divStart, type: type});
    pos += tagLen;
  }
}

/** 将 bzinfo HTML 拆分为结构化卡片数组 [{id, title, body}]
 *  覆盖两类卡片：
 *    a) .bt-card 块（八字专业细盘、十年大运等）— 无 data-card-id，按 bt-title 合成 ID
 *    b) .card[data-card-id] 块（12 分析卡片）— 从 data-card-id 取值 */
function _splitBzinfoToCards(bzinfo) {
  if (!bzinfo) return [];
  var cards = [];

  // 第 1 步：找到所有卡片起始位置
  var positions = [];
  _findCardStarts(bzinfo, 'class="bt-card', positions, 'bt');
  _findCardStarts(bzinfo, 'data-card-id="', positions, 'card');

  // 按位置排序
  positions.sort(function(a, b) { return a.pos - b.pos; });

  // 第 2 步：按位置两两分组提取
  for (var i = 0; i < positions.length; i++) {
    var start = positions[i].pos;
    var end = (i + 1 < positions.length) ? positions[i + 1].pos : bzinfo.length;
    var raw = bzinfo.substring(start, end).trim().replace(/\s+$/, '');

    var id, title;

    if (positions[i].type === 'card') {
      var idMatch = raw.match(/data-card-id="([^"]+)"/);
      if (!idMatch) continue;
      id = idMatch[1];
      var cardTitleMatch = raw.match(/<div class="card-header"[^>]*>\s*<span>([\s\S]*?)<\/span>/);
      title = cardTitleMatch ? cardTitleMatch[1].replace(/<[^>]*>/g, '').trim() : id;
    } else {
      var btTitleMatch = raw.match(/<div class="bt-title">([\s\S]*?)<\/div>/);
      title = btTitleMatch ? btTitleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      id = _synthesizeBtId(title);
    }

    // 将合成 ID 注入卡片 HTML 的 outer div，使 DOM 查询生效
    var firstDivEnd = raw.indexOf('>');
    if (firstDivEnd >= 0) {
      var firstDiv = raw.substring(0, firstDivEnd + 1);
      if (firstDiv.indexOf(' id=') < 0) {
        raw = raw.replace(/^<div /, '<div id="' + id + '" ');
      }
    }

    cards.push({ id: id, title: title, body: raw });
  }

  cards = cards.filter(function(c) { return c !== null; });
  return cards;
}

// ══════ 卡片渲染辅助 ══════
function _card(id, icon, title, body) {
  return '<div class="card" data-card-id="'+id+'"><div class="card-header" onclick="window.toggleBaziCardCollapse(this)"><span><i class="ti '+icon+'"></i> '+title+'</span><i class="ti ti-chevron-down card-collapse-icon"></i></div><div class="card-body"><div class="bz-section-body">'+body+'</div></div></div>';
}
function _step(label, body) {
  return '<div class="bz-dingge-step"><div class="bz-dingge-step-label">'+label+'</div><div class="bz-dingge-step-body">'+body+'</div></div>';
}

// ══════ 日主强弱 · 权威判定卡片（覆盖 bz_rizhu）══════
// 依据《日主强弱判定方法研究与实现方案.md》§5 方案二 A/B 比值 7 级 + 旺/强分论 + 三维框架
function _buildDayMasterCard(dm, ob) {
  function _lvClass(lv) {
    if (lv === '弱极' || lv === '很弱' || lv === '比较弱') return 'dm-lv-weak';
    if (lv === '平衡') return 'dm-lv-balance';
    return 'dm-lv-strong';
  }
  var lvCls = _lvClass(dm.level);

  // 三维：得令 / 得地 / 得势
  function _dim(k, ok, sub) {
    return '<div class="dm-dim ' + (ok ? 'on' : 'off') + '">'
      + '<span class="dm-dim-ic">' + (ok ? '✓' : '✕') + '</span>'
      + '<span class="dm-dim-k">' + k + '</span>'
      + (sub ? '<span class="dm-dim-sub">' + sub + '</span>' : '')
      + '</div>';
  }
  var dims = _dim('得令', dm.deling, dm.yueStatus)
    + _dim('得地', dm.dedi, dm.rootList.length ? (dm.rootList.length + ' 根') : '')
    + _dim('得势', dm.desi, dm.shiList.length ? (dm.shiList.length + ' 扶') : '');

  // 旺/强 标记
  var chips = '';
  if (dm.wang) chips += '<span class="dm-chip dm-chip-wang">旺</span>';
  if (dm.qiang) chips += '<span class="dm-chip dm-chip-qiang">强</span>';
  if (!chips) chips = '<span class="dm-chip dm-chip-none">弱</span>';

  // 五行得分 strip（与 wx-dist 同色板，体现 A/B 来源）
  var wxVar = { '木':'--bt-gan-wood', '火':'--bt-gan-fire', '土':'--bt-gan-earth', '金':'--bt-gan-metal', '水':'--bt-gan-water' };
  var order = [['木', dm.scores[0]], ['火', dm.scores[1]], ['土', dm.scores[2]], ['金', dm.scores[3]], ['水', dm.scores[4]]];
  var total = 0; order.forEach(function(o) { total += o[1]; }); if (total === 0) total = 1;
  var bars = order.map(function(o) {
    var pct = Math.round(o[1] / total * 100);
    var color = 'var(' + wxVar[o[0]] + ')';
    return '<div class="wx-bar-item">'
      + '<span class="wx-bar-label" style="color:' + color + '">' + o[0] + '</span>'
      + '<span class="wx-bar-bg"><span class="wx-bar-fill" style="width:' + pct + '%;background:' + color + ';"></span></span>'
      + '<span class="wx-bar-pct">' + pct + '%</span>'
      + '<span class="wx-bar-val">' + o[1].toFixed(1) + '</span>'
      + '</div>';
  }).join('');

  // 从格注脚（不另立第二结论，仅交叉引用，消除双结论矛盾）
  var congNote = '';
  var _cd = unified.getCongGeData(ob);
  if (_cd.isCong) {
    congNote = '<div class="dm-cong">⚑ 此造入「' + (_cd.congType || '从格') + '」，强弱以格局论为主（详见「从格」章）。</div>';
  }

  var body =
    '<div class="dm-card">'
    + '<div class="dm-head">'
    +   '<div class="dm-gan"><span class="dm-gan-name">' + dm.riGanName + '</span><span class="dm-gan-wx">' + dm.riWxName + '日主</span></div>'
    +   '<div class="dm-level-wrap">'
    +     '<div class="dm-level ' + lvCls + '">' + dm.level + '</div>'
    +     '<div class="dm-chips">' + chips + '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="dm-dims">' + dims + '</div>'
    + '<div class="dm-ab">'
    +   '<div class="dm-ab-item"><span class="dm-ab-k">生扶 A</span><span class="dm-ab-v">' + dm.A + '</span></div>'
    +   '<div class="dm-ab-item"><span class="dm-ab-k">克泄 B</span><span class="dm-ab-v">' + dm.B + '</span></div>'
    +   '<div class="dm-ab-item"><span class="dm-ab-k">A/B</span><span class="dm-ab-v">' + dm.ratio + '</span></div>'
    + '</div>'
    + '<div class="dm-scores">' + bars + '</div>'
    + '<div class="dm-xiyong">'
    +   '<div class="dm-xy-row"><span class="dm-xy-k good">喜</span><span class="dm-xy-v good">' + dm.favorable + '</span></div>'
    +   '<div class="dm-xy-row"><span class="dm-xy-k bad">忌</span><span class="dm-xy-v bad">' + dm.unfavorable + '</span></div>'
    + '</div>'
    + '<div class="dm-conclusion">' + dm.conclusion + '</div>'
    + congNote
    + '</div>';

  return '<div class="card" data-card-id="bz_rizhu">'
    + '<div class="card-header" onclick="window.toggleBaziCardCollapse(this)">'
    + '<span><i class="ti ti-target"></i> 日主强弱 · 权威判定</span>'
    + '<i class="ti ti-chevron-down card-collapse-icon"></i></div>'
    + '<div class="card-body"><div class="bz-section-body">' + body + '</div></div></div>';
}

/** 构建天罗地网运卡片 HTML — 结论先行 + 单面板切换 */
function _buildTianLuoDiWangCard(tldw, ob) {
  var sex = ob.sex === 1 ? 'male' : 'female';
  var LABEL = { nayin: '纳音法', dizhi: '地支法' };

  // ═══ 贵人们检测 ═══
  var GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var dayStem = GAN[ob.b3 % 10], monthBranch = ZHI[ob.b2 % 12];
  var guiren = [];
  // 天乙贵人
  var tyMap = { '甲':'丑未','乙':'子申','丙':'亥酉','丁':'亥酉','戊':'丑未','己':'子申','庚':'丑未','辛':'寅午','壬':'巳卯','癸':'巳卯' };
  if ((tyMap[dayStem] || '').indexOf(monthBranch) >= 0) guiren.push('天乙贵人');
  // 月德
  var ydMap = { '寅':'丙','卯':'甲','辰':'壬','巳':'庚','午':'丙','未':'甲','申':'壬','酉':'庚','戌':'丙','亥':'甲','子':'壬','丑':'庚' };
  if (ydMap[monthBranch] === dayStem) guiren.push('月德');
  // 天德
  var monthZhiIdx = ob.b2 % 12 + 1;
  var tdMap = [[1,6],[2,7],[3,4],[4,9],[5,9],[6,8],[7,12],[8,1],[9,10],[10,3],[11,3],[12,2]]; // [月支, 天德干]
  for (var mi = 0; mi < tdMap.length; mi++) {
    if (tdMap[mi][0] === monthZhiIdx && tdMap[mi][1] === ob.b3 % 10 + 1) { guiren.push('天德'); break; }
  }
  // 日柱纳音（天乙另一种查法：年干+日支）
  var tyBr2 = tyMap[GAN[ob.b1 % 10]] || '';
  if (tyBr2.indexOf(ZHI[ob.b3 % 12]) >= 0 && guiren.indexOf('天乙贵人') < 0) guiren.push('天乙贵人');

  /** 结论摘要盒 */
  function _conclusion(data, label, otherData, otherLabel) {
    var c = '<div class="tldw-panel tldw-conclusion" data-tldw="' + label + '">';
    c += '<div class="tldw-conclusion-inner">';
    c += '<span class="tldw-conclusion-label">' + (label === 'modern' ? '现代地支法' : '古法纳音') + '</span>';

    if (data.tianluo.hit || data.diwang.hit) {
      if (data.tianluo.hit) {
        c += '<div class="tldw-conclusion-hit tl">⚡ 天罗命中</div>';
        c += '<div class="tldw-conclusion-detail">戌亥成对 · 严重 ' + ('★'.repeat(data.severity)) + ' (' + data.severity + '/5)</div>';
      }
      if (data.diwang.hit) {
        c += '<div class="tldw-conclusion-hit dw">⚡ 地网命中</div>';
        c += '<div class="tldw-conclusion-detail">辰巳成对 · 严重 ' + ('★'.repeat(data.severity)) + ' (' + data.severity + '/5)</div>';
      }
      if (data.isChongFan) c += '<div class="tldw-conclusion-chongfan">🚫 重犯 — 天罗地网叠加</div>';
    } else if (data.tlDYfull || data.dwDYfull) {
      var dyLabels = [];
      if (data.tlDYfull) dyLabels.push('天罗');
      if (data.dwDYfull) dyLabels.push('地网');
      c += '<div class="tldw-conclusion-hit tl" style="color:#e67e22">⚡ 大运' + dyLabels.join('+') + '</div>';
      c += '<div class="tldw-conclusion-detail">命局不入，但大运中形成完整对偶（见大运罗网详情）</div>';
    } else {
      c += '<div class="tldw-conclusion-none">命局及大运均不入天罗地网</div>';
    }

    // 贵人们化解提示（命中或大运成对时显示）
    if (data.tianluo.hit || data.diwang.hit || data.tlDYfull || data.dwDYfull) {
      if (guiren.length > 0) {
        c += '<div class="tldw-conclusion-guiren good">此命有' + guiren.join('、') + '，可部分化解。</div>';
      } else {
        c += '<div class="tldw-conclusion-guiren warn">此命无天月二德及天乙，流年需谨慎行事！</div>';
      }
    }

    // 另一种算法参考
    var otherHit = otherData.tianluo.hit || otherData.diwang.hit;
    var otherVerdict = otherHit ? (otherData.tianluo.hit ? '天罗命中' : '地网命中') : '不入格';
    c += '<div class="tldw-conclusion-ref">' + otherLabel + '参考：' + otherVerdict + '</div>';

    c += '</div></div>';
    return c;
  }

  /** 详情面板 */
  function _detail(data, mode) {
    var d = '<div class="tldw-panel" data-tldw="' + mode + '">';
    var noHit = !data.tianluo.hit && !data.diwang.hit && !data.tlDYfull && !data.dwDYfull;
    if (noHit) {
      d += '<p style="color:var(--text-muted);padding:0.5rem 0">命局及大运均不入天罗地网，无需担忧。</p>';
    } else {
    var nayinNote = data.nayinWx
      ? (data.nayinWx === '火' ? '火命→查<strong style=\"color:#C41E0A\">天罗</strong>（戌亥）' : (data.nayinWx === '水' || data.nayinWx === '土') ? data.nayinWx + '命→查<strong style=\"color:#C41E0A\">地网</strong>（辰巳）' : '金木命不入正统天罗地网')
      : '不限纳音，纯地支对偶法';

    d += _step('命局检测',
      '<p>年命纳音：<strong>' + (data.nayinWx || '—') + '</strong> → ' + nayinNote + '</p>' +
      (data.tianluo.hit ? '<p><span class="tianluo-badge">⚠ 天罗</span> 柱位：' + data.tianluo.pillars.map(function(p){return p.position+'('+p.branch+')';}).join('、') + ' <small>查法：' + data.tianluo.method.map(function(m){return LABEL[m]||m;}).join('+') + '</small></p>' : '') +
      (data.diwang.hit ? '<p><span class="diwang-badge">⚠ 地网</span> 柱位：' + data.diwang.pillars.map(function(p){return p.position+'('+p.branch+')';}).join('、') + ' <small>查法：' + data.diwang.method.map(function(m){return LABEL[m]||m;}).join('+') + '</small></p>' : '') +
      (data.isChongFan ? '<p><span class="chongfan-badge">🚫 重犯</span> 天罗地网叠加，凶象加重</p>' : '') +
      '<p>严重：' + ('★'.repeat(data.severity)) + ' (' + data.severity + '/5)</p>');

    d += _step('大运罗网',
      (data.tianluoDayun && data.tianluoDayun.length > 0 ? '<p><span class="tianluo-badge">天罗大运</span> ' + data.tianluoDayun.map(function(dy){return dy.gz+'('+dy.age+')';}).join('、') + '</p>' : '') +
      (data.diwangDayun && data.diwangDayun.length > 0 ? '<p><span class="diwang-badge">地网大运</span> ' + data.diwangDayun.map(function(dy){return dy.gz+'('+dy.age+')';}).join('、') + '</p>' : '') +
      ((!data.tianluoDayun||data.tianluoDayun.length===0) && (!data.diwangDayun||data.diwangDayun.length===0) ? '<p style="color:var(--text-muted)">大运中未见天罗地网运。</p>' : ''));

    d += _step('解读',
      (data.tianluo.hit ? (sex === 'male' ? '<p>命带天罗，男命尤忌。戌亥为六阴之终，运势多有蹇滞，宜守不宜攻。</p>' : '<p>命带天罗，女命影响较轻，但仍需注意健康与人际。</p>') : '') +
      (data.diwang.hit ? (sex === 'female' ? '<p>命带地网，女命尤忌。辰巳为六阳之终，婚姻多有波折，薄命抱疾之象。</p>' : '<p>命带地网，男命影响较轻，但主事业推进多有阻碍。</p>') : '') +
      (data.isChongFan ? '<p style="color:#C41E0A;font-weight:700;">重犯叠加，古书云"重犯则灾不能歇"。</p>' : ''));
    }
    d += '</div>';
    return d;
  }

  var html = _card('bz_tianluodiwang', 'ti ti-webhook', '天罗地网运',
    // ── 切换栏 ──
    '<div style="text-align:center;margin-bottom:12px">' +
    '<span class="engine-toggle" style="margin:0">' +
    '<span class="engine-opt active" data-mode="modern" style="cursor:pointer" onclick="window._tldwSwitch(this)">现代地支法</span>' +
    '<span class="engine-opt" data-mode="classic" style="cursor:pointer" onclick="window._tldwSwitch(this)">古法纳音</span>' +
    '</span></div>' +
    // ── 结论摘要（双份，切换显隐） ──
    _conclusion(tldw.modern, 'modern', tldw.classic, '古法纳音') +
    _conclusion(tldw.classic, 'classic', tldw.modern, '现代地支法') +
    // ── 详情面板（双份，切换显隐） ──
    _detail(tldw.modern, 'modern') +
    _detail(tldw.classic, 'classic') +
    // ── 知识 ──
    _step('知识',
      (!tldw.classic.hasShensha && !tldw.modern.hasShensha ? '<p style="color:var(--text-muted)">两种算法均不入天罗地网。</p>' : '<p>· 宜守成稳健，忌冒险投机</p><p>· 命有天月二德或天乙贵人可部分化解</p>') +
      '<p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">戌亥为天罗（六阴之终），辰巳为地网（六阳之终）。古法以纳音火命见戌亥为天罗，水土命见辰巳为地网；现代简化法仅看地支对偶。天罗地网主运势蹇滞、行事受阻，重犯则凶象加重。</p>' +
      '<p style="font-size:0.6875rem;color:var(--text-muted)">📚 出处：《协纪辨方书》引《玉门经》、《三命通会》</p>')
  );

  return html;
}

/** 构建魁罡命格卡片 HTML */
function _buildKuiGangCard(kg, ob) {
  var html = '<div class="card" data-card-id="bz_kuigang">';
  html += '<div class="card-header" onclick="window.toggleBaziCardCollapse(this)"><span><i class="ti ti-swords"></i> 魁罡命格</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body"><div class="bz-section-body">';

  if (!kg.hasShensha) {
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">魁罡检测</div>';
    html += '<div class="bz-dingge-step-body">';
    html += '<p style="color:var(--text-muted)">日柱非魁罡四日（庚辰/壬辰/庚戌/戊戌），不入魁罡格。</p>';
    html += '<p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">魁罡四日为庚辰、壬辰（天罡）与庚戌、戊戌（河魁），主杀伐权柄、刚毅果断。若日柱为此四日之一，再配合身旺、无财官刑煞，则为大贵之格。</p>';
    html += '</div></div>';
    html += '</div></div></div>';
    return html;
  }

  // 一、检测结果
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、魁罡入命</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '<p><span class="kuigang-badge">' + kg.dayPillar + '</span> ' + (kg.type==='罡'?'天罡':'河魁') + '　评级：';
  var stars=kg.evaluation.level;
  for(var si=0;si<5;si++)html+='<span style="color:'+(si<stars?'#ffd700':'#ccc')+'">★</span>';
  html += ' <strong>' + kg.evaluation.grade + '</strong></p>';
  html += '<p style="font-size:0.8125rem;color:var(--text-muted)">' + kg.evaluation.description + '</p>';

  if(kg.overlap.isStacked){
    html += '<p><span class="kuigang-stacked-badge">叠逢×'+kg.overlap.count+'</span> '+kg.overlap.positions.join('、')+'重现魁罡</p>';
  }
  html += '</div></div>';

  // 二、成格分析
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、成格分析</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '<p>' + kg.shenWang.explanation + '  → ' + (kg.shenWang.isWang?'<span style="color:#2e7d32">身旺✅</span>':'<span style="color:#c0392b">身弱</span>') + '</p>';
  if(kg.taboo.details.length>0){
    html += '<p style="color:#c0392b">忌讳：' + kg.taboo.details.join('；') + '</p>';
  }else{
    html += '<p style="color:#2e7d32">✅ 无财官刑煞忌讳</p>';
  }
  if(kg.interpretation.tabooWarning){
    html += '<p style="color:#c0392b;font-weight:600">' + kg.interpretation.tabooWarning + '</p>';
  }
  html += '</div></div>';

  // 三、大运魁罡
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、大运魁罡</div>';
  html += '<div class="bz-dingge-step-body">';
  if(kg.dayun && kg.dayun.length>0){
    var exactDY=kg.dayun.filter(function(d){return d.isExact});
    var posDY=kg.dayun.filter(function(d){return !d.isExact});
    if(exactDY.length>0){
      html += '<p><span class="kuigang-badge">魁罡正运</span> ';
      html += exactDY.map(function(d){return d.gz+'（'+d.age+'）';}).join('、');
      html += '</p>';
    }
    if(posDY.length>0){
      html += '<p style="color:var(--text-muted)">魁罡位运：';
      html += posDY.map(function(d){return d.gz+'（'+d.age+'）';}).join('、');
      html += '</p>';
    }
  }else{
    html += '<p style="color:var(--text-muted)">大运中未见魁罡运。</p>';
  }
  html += '</div></div>';

  // 四、性格解读
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">四、解读</div>';
  html += '<div class="bz-dingge-step-body">';
  html += '<p>' + kg.interpretation.detail + '</p>';
  html += '<p>💼 <strong>事业倾向</strong>：' + kg.personality.career + '</p>';
  html += '<p>💑 <strong>感情</strong>：' + kg.personality.relationship + '</p>';
  html += '<p>🏥 <strong>健康</strong>：注意' + kg.personality.health + '</p>';
  html += '<p>特质：' + kg.personality.traits.join('、') + '</p>';
  html += '<p style="margin-top:0.5rem;font-size:0.8125rem;color:var(--text-muted)">' + kg.interpretation.genderNote + '</p>';
  html += '<p style="font-size:0.75rem;color:var(--text-muted)">📚 出处：《三命通会》卷六·魁罡、《渊海子平》卷五·魁罡诗诀</p>';
  html += '</div></div>';

  html += '</div></div></div>';
  return html;
}

module.exports = router;
