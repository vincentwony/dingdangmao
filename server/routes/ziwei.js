// server/routes/ziwei.js — 紫微斗数排盘 API（vanilla 前端专用）
// iztro 为 ESM-only，这里用动态 import 接入
'use strict';

var { Router } = require('express');
var router = Router();
var timeUtil = require('../lib/time-util.js');
var trueSolar = require('../lib/true-solar.js');

// ── iztro 懒加载（CommonJS 无法直接 import ESM 顶层）──
var _iztroPromise = null;
function getIztro() {
  if (!_iztroPromise) {
    _iztroPromise = import('iztro')
      .then(function(m) { return m.default || m; })
      .catch(function(e) { _iztroPromise = null; throw e; });
  }
  return _iztroPromise;
}

// ── 传统派覆盖层基准（紫微斗数全书北派 / 倪师天纪）──
// iztro 的大限/长生/小限用的是另一套自洽流派（大限仅阳女顺、长生依五行局、小限表不同），
// 此处用传统派规则（阳男阴女顺行/阴男阳女逆行、长生依日干、小限依年支性别表）覆盖其输出。
let _baseline = null;
function getBaseline() {
  if (!_baseline) {
    _baseline = import('../ziwei_baseline.mjs')
      .then(function(m) { return m; })
      .catch(function(e) { _baseline = null; throw e; });
  }
  return _baseline;
}

// ── 格局判定器（纯函数，不依赖 iztro 流派；规则见 紫微斗数推算方法_完全版.md 第八章）──
let _patterns = null;
function getPatterns() {
  if (!_patterns) {
    _patterns = import('../ziwei_patterns.mjs')
      .then(function(m) { return m; })
      .catch(function(e) { _patterns = null; throw e; });
  }
  return _patterns;
}

// ── 序列化辅助（palace 对象含循环引用 astrolabe 与方法，必须手动提取）──
function serializeStar(s) {
  if (!s) return null;
  return { name: s.name, mutagen: s.mutagen || '', type: s.type || '', scope: s.scope || '', brightness: s.brightness || '' };
}

function serializePalace(p, ctx) {
  if (!p) return null;
  // 传统派覆盖层（倪师/全书北派）：大限顺逆、长生依日干、小限依年支性别表
  var decadalOut = p.decadal ? {
    range: p.decadal.range || null,
    heavenlyStem: p.decadal.heavenlyStem || '',
    earthlyBranch: p.decadal.earthlyBranch || ''
  } : null;
  var agesOut = Array.isArray(p.ages) ? p.ages : [];
  var changshengOut = p.changsheng12 || '';
  if (ctx) {
    var dec = ctx.decadal[p.name];
    if (dec) decadalOut = { range: [dec.start, dec.end], heavenlyStem: (p.decadal && p.decadal.heavenlyStem) || '', earthlyBranch: (p.decadal && p.decadal.earthlyBranch) || '' };
    if (ctx.ages[p.name] && ctx.ages[p.name].length) agesOut = ctx.ages[p.name];
    if (ctx.changsheng[p.name]) changshengOut = ctx.changsheng[p.name];
  }
  return {
    index: p.index,
    name: p.name,
    earthlyBranch: p.earthlyBranch,
    heavenlyStem: p.heavenlyStem,
    isBodyPalace: !!p.isBodyPalace,
    decadal: decadalOut,
    ages: agesOut,
    // 统一走 serializeStar，避免字段增减时再次出现「半截迁移」遗漏（如 brightness）
    majorStars: (p.majorStars || []).map(serializeStar),
    minorStars: (p.minorStars || []).map(serializeStar),
    adjectiveStars: (p.adjectiveStars || []).map(serializeStar),
    changsheng12: changshengOut,
    boshi12: p.boshi12 || '',
    jiangqian12: p.jiangqian12 || '',
    suiqian12: p.suiqian12 || ''
  };
}

function serializeScope(scope) {
  if (!scope) return null;
  var stars = (scope.stars || []).map(function(palaceStars) {
    if (!Array.isArray(palaceStars)) return [];
    return palaceStars.map(serializeStar).filter(Boolean);
  });
  return {
    index: scope.index,
    mutagen: scope.mutagen || [],
    stars: stars,
    range: scope.range || null
  };
}

// ── 四化表（年干/宫干 → 禄权科忌 星名）──
var MUTAGEN_MAP = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼']
};

function getYearMutagen(yearStem) {
  return MUTAGEN_MAP[yearStem] || ['', '', '', ''];
}

function _buildAstrolabe(astro, calType, y, m, d, timeIdx, sex) {
  var lunarStr = y + '-' + m + '-' + d;
  if (calType === 'lunar') return astro.byLunar(lunarStr, timeIdx, sex);
  return astro.bySolar(lunarStr, timeIdx, sex);
}

/**
 * 解析并修正出生时间
 * 入参支持旧字段 `time`（0-12）以及新字段 `hour/min/jd/wd/zty`。
 */
function _resolveBirthTime(body) {
  var calType = body.calType === 'lunar' ? 'lunar' : 'solar';
  var y = parseInt(body.y, 10), m = parseInt(body.m, 10), d = parseInt(body.d, 10);
  var sex = body.sex === '女' ? '女' : '男';

  var h, min, jd, wd, isZty;
  // 新字段优先
  if (body.hour != null || body.min != null) {
    h = timeUtil.normalizeHour(body.hour, 12);
    min = timeUtil.normalizeMinute(body.min, 0);
    jd = parseFloat(body.jd) || 120;
    wd = parseFloat(body.wd) || 0;
    isZty = !!body.zty;
  } else {
    // 兼容旧字段 time（0-12）
    var timeIdx = parseInt(body.time, 10);
    if (isNaN(timeIdx)) timeIdx = 8;
    // 时辰序号 → 中点时刻（仅用于 UI 展示，实际仍按 timeIdx 排盘）
    var midHour = timeIdx * 2 - 1; // 0->23, 1->1, 2->3 ...
    if (midHour < 0) midHour = 23;
    h = midHour;
    min = 0;
    jd = 120;
    wd = 0;
    isZty = false;
  }

  var resolved = {
    calType: calType, y: y, m: m, d: d, sex: sex,
    h: h, min: min, jd: jd, wd: wd, isZty: isZty
  };

  if (isZty) {
    var ts = trueSolar.applyTrueSolar(y, m, d, h, min, jd, 8);
    resolved.stdY = y; resolved.stdM = m; resolved.stdD = d;
    resolved.y = ts.y; resolved.m = ts.m; resolved.d = ts.d;
    resolved.h = ts.h; resolved.min = ts.min;
    resolved.clockTime = ts.clockTime;
    resolved.trueSolarTime = ts.trueSolarTime;
    resolved.totalOffsetSec = ts.totalOffsetSec;
  } else {
    resolved.stdY = y; resolved.stdM = m; resolved.stdD = d;
    resolved.clockTime = _pad2(h) + ':' + _pad2(min);
    resolved.trueSolarTime = resolved.clockTime;
    resolved.totalOffsetSec = 0;
  }

  resolved.timeIdx = timeUtil.toShiChenIndex(resolved.h, resolved.min);
  return resolved;
}

function _pad2(n) {
  return String(n).padStart(2, '0');
}

function _formatLocation(body) {
  var parts = [];
  if (body.province) parts.push(body.province);
  if (body.region) parts.push(body.region);
  if (!parts.length && body.location) return body.location;
  return parts.join(' ');
}

function _extractFourPillars(rawDates) {
  if (!rawDates || !rawDates.chineseDate) return null;
  var cd = rawDates.chineseDate;
  return {
    year: (cd.yearly || []).join(''),
    month: (cd.monthly || []).join(''),
    day: (cd.daily || []).join(''),
    hour: (cd.hourly || []).join('')
  };
}

function _buildMeta(astrolabe, resolved, body) {
  var cd = astrolabe.rawDates && astrolabe.rawDates.chineseDate;
  var yearStem = (cd && cd.yearly && cd.yearly[0]) || '';
  return {
    gender: astrolabe.gender,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    rawDates: astrolabe.rawDates,
    fourPillars: _extractFourPillars(astrolabe.rawDates),
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    sign: astrolabe.sign,
    zodiac: astrolabe.zodiac,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    soul: astrolabe.soul,
    body: astrolabe.body,
    fiveElementsClass: astrolabe.fiveElementsClass,
    // 真太阳时相关
    clockTime: resolved.clockTime,
    trueSolarTime: resolved.trueSolarTime,
    totalOffsetSec: resolved.totalOffsetSec,
    isZty: resolved.isZty,
    longitude: resolved.jd,
    latitude: resolved.wd,
    location: _formatLocation(body),
    // 年干四化
    yearMutagen: getYearMutagen(yearStem)
  };
}

// ═══ POST /api/v1/ziwei/astrolabe — 本命盘 ═══
router.post('/astrolabe', async function(req, res, next) {
  try {
    var t0 = Date.now();
    var body = req.body || {};
    var resolved = _resolveBirthTime(body);
    if (!resolved.y || !resolved.m || !resolved.d) {
      return res.status(400).json({ ok: false, error: 'y/m/d required', code: 400 });
    }

    var iztro = await getIztro();
    var astrolabe = _buildAstrolabe(iztro.astro, resolved.calType, resolved.y, resolved.m, resolved.d, resolved.timeIdx, resolved.sex);

    var meta = _buildMeta(astrolabe, resolved, body);
    var B = await getBaseline();
    var cd0 = astrolabe.rawDates.chineseDate;
    var ctx = {
      decadal: B.baselineDecadal(astrolabe.palaces, astrolabe.fiveElementsClass, cd0.yearly[0], resolved.sex),
      ages: B.baselineAges(astrolabe.palaces, cd0.yearly[1], resolved.sex),
      changsheng: B.baselineChangsheng(astrolabe.palaces, cd0.daily[0])
    };
    var palaces = astrolabe.palaces.map(function(p) { return serializePalace(p, ctx); });

    // 格局判定（传统派/倪师天纪，纯函数不依赖 iztro 流派）
    var P = await getPatterns();
    var patterns = [];
    try { patterns = P.detectPatterns(astrolabe); } catch (e) { patterns = []; }

    res.json({ ok: true, data: { meta: meta, palaces: palaces, patterns: patterns }, took: Date.now() - t0 });
  } catch (e) { next(e); }
});

// ═══ POST /api/v1/ziwei/horoscope — 运限（大限/流年/流年年龄）═══
router.post('/horoscope', async function(req, res, next) {
  try {
    var t0 = Date.now();
    var body = req.body || {};
    var resolved = _resolveBirthTime(body);
    var targetYear = parseInt(body.targetYear, 10);
    if (!resolved.y || !resolved.m || !resolved.d) {
      return res.status(400).json({ ok: false, error: 'y/m/d required', code: 400 });
    }
    if (!targetYear) return res.status(400).json({ ok: false, error: 'targetYear required', code: 400 });

    var iztro = await getIztro();
    var astrolabe = _buildAstrolabe(iztro.astro, resolved.calType, resolved.y, resolved.m, resolved.d, resolved.timeIdx, resolved.sex);
    var horo = astrolabe.horoscope(new Date(targetYear, 0, 1), resolved.timeIdx);

    res.json({
      ok: true,
      data: {
        decadal: serializeScope(horo.decadal),
        yearly: serializeScope(horo.yearly),
        age: horo.age ? {
          index: horo.age.index,
          value: horo.age.value,
          nominalAge: horo.age.nominalAge,
          name: horo.age.name,
          heavenlyStem: horo.age.heavenlyStem,
          earthlyBranch: horo.age.earthlyBranch,
          mutagen: horo.age.mutagen || []
        } : null
      },
      took: Date.now() - t0
    });
  } catch (e) { next(e); }
});

module.exports = router;
