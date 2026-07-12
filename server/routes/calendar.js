// server/routes/calendar.js — 日历 API
'use strict';

var { Router } = require('express');
var core = require('gongxin-core');
var Lunar = core.Lunar, JD = core.JD;
var computeDayFromLunar = core.computeDayFromLunar;

// lunisolar 神煞引擎
var lunisolar = require('lunisolar');
var theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

/** 从 lunisolar 获取指定日期的神煞数据 */
function _getLsrGods(y, m, d) {
  try {
    var lsr = lunisolar(new Date(y, m - 1, d));
    return {
      good: lsr.theGods.getGoodGods().map(function(g) { return String(g); }),
      bad: lsr.theGods.getBadGods().map(function(g) { return String(g); })
    };
  } catch(e) {
    console.error('[lunisolar] getGods error:', e.message);
    return null;
  }
}

/** 从 lunisolar 获取宜忌 */
function _getLsrActs(y, m, d) {
  try {
    var lsr = lunisolar(new Date(y, m - 1, d));
    var acts = lsr.theGods.getActs(1);
    return acts || { good: [], bad: [] };
  } catch(e) {
    return { good: [], bad: [] };
  }
}

const router = Router();

/** 为指定月份中的某天构建日数据 */
function _buildDayItem(ob, y, m, d) {
  var computed = computeDayFromLunar(y, m, d);
  var lsrGods = _getLsrGods(y, m, d);
  var lsrActs = _getLsrActs(y, m, d);
  return {
    d: d,
    lunarD: ob.Ldc || '',
    lunarM: (ob.Lmc || '').replace('闰', ''),
    lunarMonthName: ob.Lmc || '',  // 原始月名（含闰标记，前端展示用）
    isLeap: !!(ob.Lmc && ob.Lmc.indexOf('闰') >= 0),
    jieQi: ob.jqmc || '',     // 节气名（如"立春"）
    gz: { year: computed.yearGZ, month: computed.monthGZ, day: computed.dayGZ },
    jianChu: computed.jianchu || '',
    jianChuGood: computed.duty12Good || false,
    xiu: computed.xiu || '',
    nineStar: computed.nineStar || null,
    lunarDaysInMonth: ob.Ldn || 30,  // { name, good, meaning }
    shenSha: (lsrGods ? lsrGods.good.concat(lsrGods.bad) : (computed.goodGods || []).concat(computed.badGods || [])).slice(0, 6),
    yi: lsrActs ? (lsrActs.good || []).slice(0, 6) : [],
    ji: lsrActs ? (lsrActs.bad || []).slice(0, 6) : [],
    isChongsang: !!computed.chongsang,
    isWulu: !!computed.wulu,
    isJinshenqisha: !!computed.jinshenqisha,
    isDaojiaMonth: !!computed.daojiaMonth,
    isDaojiaYear: !!computed.daojiaYear,
    isWufu: !!computed.wufu,
    isYanggongJi: !!computed.yanggongJi,
    yanggongJi: computed.yanggongJi || null,
    isSiLiSiJue: !!computed.silisiJue,
    silisiJue: computed.silisiJue || null,
    isTiande: !!computed.tiande,
    isYuede: !!computed.yuede,
    isTianshe: !!computed.tianshe,
    yueXiang: ob.yxmc || '',
    yueXiangTime: ob.yxsj || '',
    solarFestival: (ob.A || '').trim(),
    lunarFestival: (ob.B || '').trim()
  };
}

// POST /api/v1/calendar/month — 单月日历数据（含前后月边缘日期）
router.post('/month', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    var m = parseInt(req.body.m, 10);

    if (!y || !m || y < 1900 || y > 2100 || m < 1 || m > 12) {
      return res.status(400).json({ ok: false, error: '参数无效：y/m 必填，范围1900-2100/1-12', code: 400 });
    }

    // 当月
    Lunar.calc2(y, m, 1);
    var lun = Lunar.lun;
    var days = [];
    for (var i = 0; i < lun.dn; i++) {
      days.push(_buildDayItem(lun[i], y, m, lun[i].d));
    }

    // 计算需要的前后月边缘天数
    var firstDayWeek = new Date(y, m - 1, 1).getDay(); // 0=日
    var daysInMonth = new Date(y, m, 0).getDate();
    var lastDayWeek = new Date(y, m - 1, daysInMonth).getDay();
    var prevCount = firstDayWeek;          // 需要填充的上月天数
    var nextCount = (7 - (lastDayWeek + 1)) % 7; // 需要填充的下月天数

    // 上月边缘（最后 prevCount 天）
    var prevEdge = [];
    if (prevCount > 0) {
      var prevM = m === 1 ? 12 : m - 1;
      var prevY = m === 1 ? y - 1 : y;
      var prevDaysInMonth = new Date(prevY, prevM, 0).getDate();
      Lunar.calc2(prevY, prevM, 1);
      var prevLun = Lunar.lun;
      for (var pd = prevDaysInMonth - prevCount; pd < prevDaysInMonth; pd++) {
        var idx = pd; // day-1
        if (idx >= 0 && idx < prevLun.dn) {
          prevEdge.push(_buildDayItem(prevLun[idx], prevY, prevM, prevLun[idx].d));
        }
      }
    }

    // 下月边缘（前 nextCount 天）
    var nextEdge = [];
    if (nextCount > 0) {
      var nextM = m === 12 ? 1 : m + 1;
      var nextY = m === 12 ? y + 1 : y;
      Lunar.calc2(nextY, nextM, 1);
      var nextLun = Lunar.lun;
      for (var nd = 0; nd < nextCount && nd < nextLun.dn; nd++) {
        nextEdge.push(_buildDayItem(nextLun[nd], nextY, nextM, nextLun[nd].d));
      }
    }

    res.json({ ok: true, data: {
      y: y, m: m, days: days,
      prevEdge: prevEdge,
      nextEdge: nextEdge
    }, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// POST /api/v1/calendar/day — 单日完整详情
router.post('/day', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    var m = parseInt(req.body.m, 10);
    var d = parseInt(req.body.d, 10);

    if (!y || !m || !d) {
      return res.status(400).json({ ok: false, error: '参数无效：y/m/d 必填', code: 400 });
    }

    Lunar.calc2(y, m, 1);
    var computed = computeDayFromLunar(y, m, d);
    var _rawOb = Lunar.lun[d - 1];
    if (computed && _rawOb) {
      computed.yueXiang = _rawOb.yxmc || '';
      computed.yueXiangTime = _rawOb.yxsj || '';
      computed.solarFestival = (_rawOb.A || '').trim();
      computed.lunarFestival = (_rawOb.B || '').trim();
    }

    // 补充计算：时辰黄黑道 + 五行力量分布 + lunisolar 神煞/宜忌
    if (computed) {
      computed.shichen = getShichenHuangHei2(computed.branch) || [];
      var noonGZ = getHourGZ2(computed.stem, 12);
      computed.wuxing = {
        counts: getWuxingCounts2(computed.yearGZ, computed.monthGZ, computed.dayGZ, noonGZ ? noonGZ.gz : ''),
        wangXiang: getWangXiang2((computed.monthGZ || '甲辰')[1] || '辰'),
        dist: ''
      };
      // lunisolar 神煞优先，本地回退
      var lsrGods = _getLsrGods(y, m, d);
      if (lsrGods) {
        computed.goodGods = lsrGods.good;
        computed.badGods = lsrGods.bad;
      }
      var lsrActs = _getLsrActs(y, m, d);
      if (lsrActs) {
        computed.yiActs = lsrActs.good || [];
        computed.jiActs = lsrActs.bad || [];
      }
    }

    res.json({ ok: true, data: computed, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

// GET /api/v1/calendar/leap-month?y=1982 — 查询闰月
// 据《闰月处理修正技术文档.md》§6.1 闰月表及 §5.2 中气判定
router.get('/leap-month', function(req, res, next) {
  try {
    var y = parseInt(req.query.y, 10);
    if (!y || y < 1900 || y > 2100) {
      return res.json({ ok: true, data: { y: y, leap: 0, leapName: '' } });
    }

    // 双重检查策略（73/73 闰月表验证通过）：
    //   闰月属于冬至-到-冬至的农历年周期。
    //   2033年闰十一月等年末闰月落在当年冬至后→下年冬至前的周期，
    //   年中JD（7月）落在上一年冬至→当年冬至的周期，会漏检。
    //   策略：先查12月25日（冬至后，捕获年末闰月），leap=0 时回退到2月1日。
    Lunar.calc(Math.floor(JD.JD(y, 12, 25) - J2000));
    var leap = Lunar.leap || 0;

    if (leap === 0) {
      Lunar.calc(Math.floor(JD.JD(y, 2, 1) - J2000));
      leap = Lunar.leap || 0;
    }

    // leap 是内部月序：1=冬月(11月), 2=腊月(12月), 3=正月(1月), …, 14=腊月(12月)
    var leapMonth = 0;
    var leapName = '';
    if (leap > 0) {
      if (leap >= 3) leapMonth = leap - 2;
      else if (leap === 1) leapMonth = 11;
      else if (leap === 2) leapMonth = 12;
      if (leapMonth >= 1 && leapMonth <= 12 && Lunar.ym[leap]) {
        leapName = '闰' + Lunar.ym[leap] + '月';
      }
    }
    res.json({ ok: true, data: { y: y, leap: leapMonth, leapName: leapName } });
  } catch(e) { next(e); }
});

// POST /api/v1/calendar/nianli — 年历视图（与 index.html 的 nianLiHTML/nianLi2HTML 完全一致）
router.post('/nianli', function(req, res, next) {
  try {
    var t0 = Date.now();
    var y = parseInt(req.body.y, 10);
    if (!y || y < 1900 || y > 2100) {
      return res.status(400).json({ ok: false, error: '参数无效：y 必填，范围1900-2100', code: 400 });
    }

    Lunar.calc(Math.floor((y - 2000) * 365.2422 + 180));

    // 年历一：十二月览（与 nianLiHTML 完全一致）
    var html1 = '<div class="nianli-container nianli-1"><div class="nianli-year">' + y + '年</div>';
    for (var i = 0; i < 14; i++) {
      if (Lunar.HS[i + 1] > Lunar.ZQ[24]) break;
      var s1 = Lunar.nu[i]; if (!s1) s1 = '·';
      s1 += Lunar.ym[i]; if (s1.length < 3) s1 += '月';
      s1 += Lunar.dx[i] > 29 ? '大' : '小';
      s1 += ' ' + JD.setFromJD_str(Lunar.HS[i] + J2000).substr(6, 5);

      var v = suo_accurate2(Lunar.HS[i]);
      var s2 = '(' + JD.setFromJD_str(v + J2000).substr(9, 11) + ')';
      if (Math.floor(v + 0.5) !== Lunar.HS[i]) s2 = '<span style="color:red">' + s2 + '</span>';
      s1 += s2;

      for (var j = 0; j < 24; j++) {
        if (Lunar.ZQ[j] < Lunar.HS[i] || Lunar.ZQ[j] >= Lunar.HS[i + 1]) continue;
        s1 += ' ' + Lunar.jqmc[j] + JD.setFromJD_str(Lunar.ZQ[j] + J2000).substr(6, 5);
        var v2 = qi_accurate2(Lunar.ZQ[j]);
        var s3 = '(' + JD.setFromJD_str(v2 + J2000).substr(9, 11) + ')';
        if (Math.floor(v2 + 0.5) !== Lunar.ZQ[j]) s3 = '<span style="color:red">' + s3 + '</span>';
        s1 += s3;
      }
      html1 += '<div class="nianli-line">' + s1 + '</div>';
    }
    html1 += '</div>';

    // 年历二：干支节气（与 nianLi2HTML 完全一致）
    var html2 = '<div class="nianli-container nianli-2"><div class="nianli-year">' + y + '年</div>';
    for (var i2 = 0; i2 < 14; i2++) {
      if (Lunar.HS[i2 + 1] > Lunar.ZQ[24]) break;
      var t1 = Lunar.nu[i2]; if (!t1) t1 = '·';
      t1 += Lunar.ym[i2]; if (t1.length < 3) t1 += '月';
      t1 += Lunar.dx[i2] > 29 ? '大' : '小';
      var vh = Lunar.HS[i2] + J2000;
      t1 += ' ' + Lunar.Gan[(vh + 9) % 10] + Lunar.Zhi[(vh + 1) % 12];
      t1 += ' ' + JD.setFromJD_str(vh).substr(6, 5);

      for (var j2 = 0; j2 < 24; j2++) {
        if (Lunar.ZQ[j2] < Lunar.HS[i2] || Lunar.ZQ[j2] >= Lunar.HS[i2 + 1]) continue;
        var vh2 = Lunar.ZQ[j2] + J2000;
        t1 += ' ' + Lunar.rmc[vh2 - vh] + Lunar.Gan[(vh2 + 9) % 10] + Lunar.Zhi[(vh2 + 1) % 12];
        t1 += Lunar.jqmc[j2] + JD.setFromJD_str(Lunar.ZQ[j2] + J2000).substr(6, 5);
      }
      html2 += '<div class="nianli-line">' + t1 + '</div>';
    }
    html2 += '</div>';

    res.json({ ok: true, data: { y: y, html1: html1, html2: html2 }, took: Date.now() - t0 });
  } catch(e) { next(e); }
});

module.exports = router;
