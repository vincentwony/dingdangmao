// server/lib/bazi-unified.js
// ─────────────────────────────────────────────────────────────────────────────
// 八字分析 · 统一出口（"只保留一套标准"的核心契约层）
//
// 设计原则（与日主强弱覆盖层一致，不 patch node_modules）：
//   · 所有"日主强弱 / 五行力量 / 喜用神 / 从格 / 格局用神"的下游客体，
//     一律只读 lib/daymaster-strength.js 的权威引擎 computeDayMasterStrength，
//     不再各自维护互不相通的旧刻度（旧三要素整数级 / 从格占比 / 百分制 _YL_VALUE）。
//   · 本文件是 routes/bazi.js 与上游 gongxin-core 之间的"唯一真相翻译层"。
//
// 本次（P0）实现：
//   · getWuxing(ob)  —— 五行力量（替换上游 _computeAllWuxing 百分制）
//   · getXiyong(ob)  —— 喜用神（旺衰用神法，由权威引擎 verdict 推导；
//                        替换上游 determineXiyongshen，后者依赖旧 _congGeData 刻度）
//
// 后续（P1/P2）将在此追加 getCongGe / getGeju，逐步把从格、格局用神也并入本层。
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

var core = require('gongxin-core');
var dm = require('./daymaster-strength.js');

var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var WX = ['木', '火', '土', '金', '水'];
var GAN2WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];

// 十神全称：给定天干 g 相对日主 dayStem 的十神
function tenGod(g, dayStem) {
  var dw = dayStem >> 1, gw = g >> 1;
  var sameYin = (g % 2) === (dayStem % 2);
  if (gw === dw) return sameYin ? '比肩' : '劫财';
  if (gw === (dw + 4) % 5) return sameYin ? '偏印' : '正印';   // 生我
  if (gw === (dw + 1) % 5) return sameYin ? '食神' : '伤官';   // 我生
  if (gw === (dw + 2) % 5) return sameYin ? '偏财' : '正财';   // 我克
  if (gw === (dw + 3) % 5) return sameYin ? '七杀' : '正官';   // 克我
  return '';
}

// 取八字四柱天干中属于某五行的十神（用神喜透干，故以天干为主）
function presentGods(wxIdx, dayStem, stems) {
  var out = [];
  for (var i = 0; i < stems.length; i++) {
    var g = stems[i] % 10;
    if ((g >> 1) === wxIdx && g !== dayStem) {
      out.push({ gan: GAN[g], god: tenGod(g, dayStem) });
    }
  }
  return out;
}

function dedupWx(arr) {
  var seen = {}, r = [];
  for (var i = 0; i < arr.length; i++) { if (!seen[arr[i]]) { seen[arr[i]] = 1; r.push(arr[i]); } }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// getWuxing —— 五行力量（唯一真相，源自权威引擎 scores）
// ═══════════════════════════════════════════════════════════════════════════
function getWuxing(ob) {
  var dmR = ob._dayMasterStrength || dm.computeDayMasterStrength(ob);
  var scores = dmR.scores; // [木,火,土,金,水] 加权得分
  var sum = scores.reduce(function (a, b) { return a + b; }, 0) || 1;
  var pct = scores.map(function (v) { return Math.round(v / sum * 100); });
  var yueZhi = ob.b2 % 12;
  var season = core._seasonGroup(yueZhi);
  var levels = [];
  for (var w = 0; w < 5; w++) levels.push(core._YL_STATUS_TABLE[w][season]); // 旺/相/休/囚/死
  var details = scores.map(function (v, i) {
    return { wx: WX[i], score: v, pct: pct[i], level: levels[i] };
  });
  return { scores: scores, pct: pct, levels: levels, details: details };
}

// ═══════════════════════════════════════════════════════════════════════════
// getXiyong —— 喜用神（旺衰用神法，由权威引擎 verdict 推导）
// ═══════════════════════════════════════════════════════════════════════════
function getXiyong(ob) {
  var dmR = ob._dayMasterStrength || dm.computeDayMasterStrength(ob);
  if (!dmR || !ob || typeof ob.b3 !== 'number') {
    return '<div class="bz-dingge-step-body">请先排定八字后再查看喜用神。</div>';
  }
  var dayStem = ob.b3 % 10, riWx = dayStem >> 1;
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];

  // 用神五行（来自引擎 favorable 方向：生扶 / 克泄耗）
  var yongWx = [], jiWx = [];
  if (dmR.favorable.indexOf('生扶') >= 0) {
    yongWx = [riWx, (riWx + 4) % 5];                       // 比劫 + 印
  } else if (dmR.favorable.indexOf('克泄耗') >= 0) {
    yongWx = [(riWx + 3) % 5, (riWx + 1) % 5, (riWx + 2) % 5]; // 官杀 + 食伤 + 财
  } else {
    yongWx = [riWx, (riWx + 4) % 5, (riWx + 3) % 5];       // 平衡：生扶与克泄耗并陈
  }
  if (dmR.unfavorable.indexOf('克泄耗') >= 0) {
    jiWx = [(riWx + 3) % 5, (riWx + 1) % 5, (riWx + 2) % 5];
  } else if (dmR.unfavorable.indexOf('生扶') >= 0) {
    jiWx = [riWx, (riWx + 4) % 5];
  } else {
    jiWx = [];
  }
  // 喜神 = 生用神者（印/官杀之类），去重并排除与用神重叠
  var xiWx = dedupWx(yongWx.map(function (w) { return (w + 4) % 5; }))
    .filter(function (w) { return yongWx.indexOf(w) < 0; });

  function collect(wxList) {
    var arr = [];
    wxList.forEach(function (w) { presentGods(w, dayStem, stems).forEach(function (p) { arr.push(p); }); });
    return arr;
  }
  var yong = collect(yongWx);
  var ji = collect(jiWx);
  var jiGans = ji.map(function (j) { return j.gan; });
  var xi = collect(xiWx).filter(function (p) { return jiGans.indexOf(p.gan) < 0; });

  // 调候（简版总纲：冬寒用丙火、夏燥用癸水、秋金喜水火、春木喜火土）
  var yueZhi = ob.b2 % 12;
  var season = core._seasonGroup(yueZhi);
  var thNote = '';
  if (season === 3) thNote = '冬月水寒，调候喜丙火暖局（寒木向阳、寒金得炼）。';
  else if (season === 1) thNote = '夏月火燥，调候喜癸水润局（燥土需水、烈火需济）。';
  else if (season === 2) thNote = '秋月金旺，调候喜水以泄金秀、火以制金锐。';
  else if (season === 0) thNote = '春月木盛，调候喜火以泄秀、土以培根。';

  // ── 渲染（沿用 bz-dingge-* 既有样式类，确保前端兼容）──
  function fmt(list) {
    if (!list.length) return '原局天干未透，需岁运补足';
    return list.map(function (p) { return p.god + '（' + p.gan + '）'; }).join('、');
  }
  var html = '';
  html += '<div class="bz-dingge-title"><i class="ti ti-star"></i> 八字喜用（旺衰用神法 · 统一判定）</div>';

  // 一、日主强弱定调（权威结论）
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、日主强弱定调</div><div class="bz-dingge-step-body">';
  html += '日主 <span class="bz-dingge-highlight">' + GAN[dayStem] + '</span>（' + WX[riWx] + '），';
  html += '据《日主强弱判定方法》权威判定为 <span class="bz-dingge-gold">' + dmR.level + '</span>。';
  html += '（得令·' + (dmR.deling ? '得' : '失') + ' / 得地·' + (dmR.dedi ? '得' : '失') + ' / 得势·' + (dmR.deshi ? '得' : '失') + '）<br>';
  html += '喜用方向：<b>' + dmR.favorable + '</b>；忌：' + dmR.unfavorable + '。';
  html += '</div></div>';

  // 二、喜用神
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、喜用神（透干）</div><div class="bz-dingge-step-body">';
  html += '<div class="bz-dingge-result" style="margin-top:0"><div style="font-size:13px;line-height:2.0">';
  html += '<span style="color:#C41E0A;font-weight:700;">用神：' + fmt(yong) + '</span><br>';
  html += '<span style="color:#8B6914;font-weight:600;">喜神：' + fmt(xi) + '</span><br>';
  html += '<span style="color:var(--color-cinnabar-deep);">忌神：' + fmt(ji) + '</span><br>';
  html += '</div></div></div></div>';

  // 三、调候
  if (thNote) {
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、调候参考</div><div class="bz-dingge-step-body">' + thNote + '</div></div>';
  }

  // 四、取法说明
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">四、取法说明</div><div class="bz-dingge-step-body">';
  html += '本卡喜用依据统一日主强弱引擎（A/B 比值七级）推导，与「日主强弱」卡及「五行力量」图同源于一套判定，不再出现跨卡矛盾。';
  html += '旺衰用神法与格局法维度不同：身弱宜扶（印、比劫），身强宜抑（官杀、食伤、财），从格顺其旺势。格局识别详见「格局」卡。';
  html += '</div></div>';

  return html;
}

// ═══════════════════════════════════════════════════════════════
// getCongGe / getCongGeData —— 八字从格（唯一真相，源自权威引擎 A/B 7级 + scores）
//
// 统一口径：从格只在「旺极 / 弱极」两档成立（文档 §5 方案二极端档），
//   其余（很旺/很弱/比较旺/比较弱/平衡）一律「非从格」，按普通格局论。
//   真/假判定严格依《渊海子平》"日主无根、四柱无生扶之意，方论从"：
//     · 弱极 → 从弱：真从 = 无根(失地)且无天干印比(失势)；否则假从。
//     · 旺极 → 专旺/从旺：真从 = 日主本气为全局最旺且无克泄耗天干透出、无克泄耗本气根；否则假从。
//   喜忌完全复用权威引擎 favorable/unfavorable（旺极喜生扶、弱极喜克泄耗），
//   与「日主强弱」卡、「五行力量」图、「喜用神」卡同源，消除跨卡双结论。
// ═══════════════════════════════════════════════════════════════
var ZHUANWANG = ['曲直格(木)', '炎上格(火)', '稼穑格(土)', '从革格(金)', '润下格(水)'];
// 地支序(0-11:子丑寅卯辰巳午未申酉戌亥) → 本气五行序(木0火1土2金3水4)
var ZHI_BENQI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
var WX_TO_ZHI = [['寅', '卯'], ['巳', '午'], ['辰', '戌', '丑', '未'], ['申', '酉'], ['亥', '子']];
var WX_TO_GAN = [['甲', '乙'], ['丙', '丁'], ['戊', '己'], ['庚', '辛'], ['壬', '癸']];
var ZHI_NAME = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function _buildWxZhiStr(wxArr) {
  return wxArr.map(function (w) { return WX_TO_ZHI[w].join('') + '（' + WX[w] + '）'; }).join('、');
}
// 四柱天干中是否存在某五行（除日主自身）
function _stemHasWx(wxList, dayStem, stems) {
  for (var i = 0; i < stems.length; i++) {
    var g = stems[i] % 10;
    if (g === dayStem) continue;
    if (wxList.indexOf(g >> 1) >= 0) return true;
  }
  return false;
}
// 四柱地支本气中是否存在某五行
function _zhiHasWx(wxList, ob) {
  var zhi = [ob.b1 % 12, ob.b2 % 12, ob.b3 % 12, ob.b4 % 12];
  for (var i = 0; i < 4; i++) { if (wxList.indexOf(ZHI_BENQI_WX[zhi[i]]) >= 0) return true; }
  return false;
}

function getCongGeData(ob) {
  var dmR = ob._dayMasterStrength || dm.computeDayMasterStrength(ob);
  var riWx = dmR.riWx, dayStem = ob.b3 % 10;
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  var scores = dmR.scores; // [木,火,土,金,水]
  var A = dmR.A, B = dmR.B;
  var total = A + B || 1;
  var shengPct = Math.round(A / total * 1000) / 10;
  var keXiePct = Math.round(B / total * 1000) / 10;

  var isCong = false, congType = '非从格', congShen = '—', grade = '—';
  var luckyEl = [], unluckyEl = [], luckyWx = [], unluckyWx = [];
  var weakExtreme = dmR.level === '弱极';
  var strongExtreme = dmR.level === '旺极';

  if (strongExtreme) {
    isCong = true;
    // 克泄耗（食伤/财/官杀）五行，用于真假从判定
    var opposingWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
    var fake = _stemHasWx(opposingWx, dayStem, stems) || _zhiHasWx(opposingWx, ob);
    // 全局最旺五行
    var maxWx = 0, maxScore = -1;
    for (var w = 0; w < 5; w++) if (scores[w] > maxScore) { maxScore = scores[w]; maxWx = w; }
    if (maxWx === riWx) {
      congType = fake ? '假专旺格' : '专旺格·' + ZHUANWANG[riWx];
      congShen = '比劫';
    } else {
      congType = fake ? '假从旺格' : '从旺格·从' + WX[maxWx];
      congShen = WX[maxWx];
    }
    grade = fake ? '上等（假从·有破格风险）' : '上等（真从·纯粹）';
    luckyEl = ['比劫', '印']; unluckyEl = ['财', '官杀', '食伤'];
    luckyWx = [riWx, (riWx + 4) % 5];
    unluckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
  } else if (weakExtreme) {
    isCong = true;
    // 主导元素（非日主五行中最高分）
    var maxWx2 = -1, maxScore2 = -1;
    for (var w2 = 0; w2 < 5; w2++) { if (w2 === riWx) continue; if (scores[w2] > maxScore2) { maxScore2 = scores[w2]; maxWx2 = w2; } }
    // 真从：无根(失地)且无天干印比(失势)；否则假从
    var shengZhuWx = [riWx, (riWx + 4) % 5]; // 比劫 + 印
    var fakeRuo = dmR.dedi || dmR.deshi || _stemHasWx(shengZhuWx, dayStem, stems);
    var prefix = fakeRuo ? '假' : '真';
    if (maxWx2 === (riWx + 2) % 5) { congType = prefix + '从弱格·从财'; congShen = '财星'; }
    else if (maxWx2 === (riWx + 3) % 5) { congType = prefix + '从弱格·从官杀'; congShen = '官杀'; }
    else if (maxWx2 === (riWx + 1) % 5) { congType = prefix + '从弱格·从儿(食伤)'; congShen = '食伤'; }
    else { congType = prefix + '从弱格·从势'; congShen = WX[maxWx2]; }
    grade = fakeRuo ? '上等（假从·有破格风险）' : '上等（真从·纯粹）';
    luckyEl = ['食伤', '财', '官杀']; unluckyEl = ['印', '比劫'];
    luckyWx = [(riWx + 1) % 5, (riWx + 2) % 5, (riWx + 3) % 5];
    unluckyWx = [riWx, (riWx + 4) % 5];
  }

  var luckyGan = luckyWx.map(function (w) { return WX_TO_GAN[w].join('、'); });
  var luckyZhi = luckyWx.map(function (w) { return WX_TO_ZHI[w].join(''); });
  var unluckyGan = unluckyWx.map(function (w) { return WX_TO_GAN[w].join('、'); });
  var unluckyZhi = unluckyWx.map(function (w) { return WX_TO_ZHI[w].join(''); });

  return {
    isCong: isCong, congType: congType, congShen: congShen, grade: grade,
    shengPct: shengPct, keXiePct: keXiePct,
    detail: congType,
    luckyEl: luckyEl, unluckyEl: unluckyEl,
    luckyWx: luckyWx, unluckyWx: unluckyWx,
    luckyGan: luckyGan, luckyZhi: luckyZhi, unluckyGan: unluckyGan, unluckyZhi: unluckyZhi,
    riWx: riWx, riGan: dmR.riGanName,
    // 兼容上游 determineBaziPattern 格局卡「从格预检」读取的字段（统一出口，消除跨卡双结论）
    riHasBenQiRoot: !!dmR.dedi,
    riHasRoot: !!dmR.dedi,
    riHasTianGanHelp: !!dmR.deshi,
    weakExtreme: weakExtreme, strongExtreme: strongExtreme
  };
}

// 从格卡渲染（沿用 bz-dingge-* 既有样式类，确保前端兼容；数据源统一为权威引擎）
function getCongGe(ob) {
  var dmR = ob._dayMasterStrength || dm.computeDayMasterStrength(ob);
  if (!dmR || !ob || typeof ob.b3 !== 'number') {
    return '<div class="bz-dingge-step-body">请先排定八字后再查看从格。</div>';
  }
  var d = getCongGeData(ob);
  var dayStem = ob.b3 % 10, riWx = dmR.riWx;
  var yueZhi = ob.b2 % 12, yueWxName = WX[(ZHI_BENQI_WX[yueZhi])];
  var WXJ = WX;

  var html = '<div class="bz-dingge-title"><i class="ti ti-sparkles"></i> 八字从格（统一判定）</div>';

  // 一、四柱概览
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、四柱概览</div><div class="bz-dingge-step-body">';
  html += '年柱 ' + ob.bz_jn + '　月柱 ' + ob.bz_jy + '　日柱 ' + ob.bz_jr + '　时柱 ' + ob.bz_js + '<br>';
  html += '日主 <span class="bz-dingge-highlight">' + dmR.riGanName + '</span>（五行属' + dmR.riWxName + '）<br>';
  html += '月令 <span class="bz-dingge-gold">' + ZHI_NAME[yueZhi] + '</span>（' + yueWxName + '当令）<br>';
  html += '日主根气：' + (dmR.dedi ? '<span class="bz-dingge-gold">有根（得地）</span>' : '<span class="bz-dingge-highlight">无本气根</span>');
  html += '　得势·' + (dmR.dedi ? '' : '') + (dmR.deshi ? '得' : '失');
  html += '</div></div>';

  // 二、全局五行力量评分（源自权威引擎 scores）
  html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、全局五行力量评分</div><div class="bz-dingge-step-body">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;">';
  html += '<tr style="background:rgba(212,184,102,0.1);"><th style="padding:4px 8px;border:1px solid #D4A574;">五行</th><th style="padding:4px 8px;border:1px solid #D4A574;">木</th><th style="padding:4px 8px;border:1px solid #D4A574;">火</th><th style="padding:4px 8px;border:1px solid #D4A574;">土</th><th style="padding:4px 8px;border:1px solid #D4A574;">金</th><th style="padding:4px 8px;border:1px solid #D4A574;">水</th></tr>';
  html += '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;font-size:11px;">加权得分<br>(从格判定)</td>';
  for (var wx3 = 0; wx3 < 5; wx3++) { html += '<td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;">' + dmR.scores[wx3] + '</td>'; }
  html += '</tr></table>';
  html += '<div style="font-size:12px;line-height:1.8;margin-top:4px;">';
  html += '<strong>五行力量：</strong>生助（印比）<span class="bz-dingge-gold">' + dmR.A + '分（' + d.shengPct + '%）</span>　克泄耗（财官食伤）<span class="bz-dingge-highlight">' + dmR.B + '分（' + d.keXiePct + '%）</span>';
  html += '</div></div></div>';

  // 结论
  html += '<div class="bz-dingge-result">';
  html += '<div class="bz-dingge-geju">' + (d.isCong ? '<span class="bz-dingge-highlight">' + d.congType + '</span>' : '非从格') + '</div>';
  html += '<div class="bz-dingge-grade">格局层次：' + (d.isCong ? d.grade : '—') + '</div>';
  html += '</div>';

  if (d.isCong) {
    // 三、格局判定（真/假）
    var isFalseCong = d.congType.indexOf('假') >= 0;
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、格局判定</div><div class="bz-dingge-step-body">';
    html += '判定：<span class="bz-dingge-highlight">' + d.congType + '</span>（' + (isFalseCong ? '假从' : '真从') + '）<br>';
    html += '从神：<span class="bz-dingge-gold">' + d.congShen + '</span><br>';
    html += '判定依据：生助占比 ' + d.shengPct + '%、克泄耗占比 ' + d.keXiePct + '%；日主' + (dmR.dedi ? '有根' : '无根') + (dmR.deshi ? '、天干见印比' : '') + '。<br>';
    if (isFalseCong) {
      html += '<span style="color:#C41E0A;font-weight:700;">假从依据：</span>《渊海子平》"若见印绶比肩，虽微亦假。"全局虽顺势，仍存破格隐患，逢大运流年引动印比则破格。<br>';
    } else {
      html += '<span style="color:#5D8A7C;font-weight:700;">真从依据：</span>日主无根、四柱无生扶之意，全局纯粹顺势。《渊海子平》："从格无根，方论从。纯而不杂者贵。"';
    }
    html += '</div></div>';

    // 四、喜忌划分（子平顺势原则）
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">四、喜忌划分（子平顺势原则）</div><div class="bz-dingge-step-body">';
    html += '喜神（顺势）：<span class="bz-dingge-gold">' + d.luckyEl.join('、') + '</span> — ' + d.luckyGan.join('、') + '（' + d.luckyZhi.join('、') + '）<br>';
    html += '忌神（逆势·破格）：<span style="color:#C41E0A;font-weight:700;">' + d.unluckyEl.join('、') + '</span> — ' + d.unluckyGan.join('、') + '（' + d.unluckyZhi.join('、') + '）<br>';
    html += '</div></div>';

    // 五、大运流年
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">五、大运流年（顺逆局分析）</div><div class="bz-dingge-step-body">';
    html += '<strong>顺局运（顺势而昌）：</strong><span class="bz-dingge-gold">' + d.luckyEl.join('、') + '运</span> — 财源广进，事业顺遂。<br>';
    html += '<strong>逆局破格运（逆势招灾）：</strong><span style="color:#C41E0A;font-weight:700;">' + d.unluckyEl.join('、') + '运</span> — 印比破格，防破财、健康、动荡。<br>';
    html += '· <span style="color:#5D8A7C;font-weight:700;">喜</span> ' + _buildWxZhiStr(d.luckyWx) + ' 旺年，顺势而昌；<br>';
    html += '· <span style="color:#C41E0A;font-weight:700;">忌</span> ' + _buildWxZhiStr(d.unluckyWx) + ' 旺年，逆势则破格招灾。';
    html += '</div></div>';

    // 六、典籍依据
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">六、典籍依据</div><div class="bz-dingge-step-body">';
    html += '《渊海子平·论从格》："从者，日主无根，四柱无生扶之意，满局财官食伤，日主弱极，不得不从。"<br>';
    html += '《三命通会·卷六》："从弱忌生扶，喜克泄。大运见生扶则灾，见克泄则福。"<br>';
    html += '《滴天髓》："假从者，如人之根浅力薄，不能自立，局中虽有劫印，而自顾不暇，不得不从人也。"';
    html += '</div></div>';
  } else {
    html += '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、结论</div><div class="bz-dingge-step-body">日主生助（印比）占比 ' + d.shengPct + '%、克泄耗（财官食伤）占比 ' + d.keXiePct + '%' + (dmR.dedi ? '，日主有根' : '') + '，不满足从格条件（仅「旺极/弱极」两极端档成立）。此造应按普通格局论命，可参阅「八字定格」及「八字喜用」分析。</div></div>';
  }

  return html;
}

// ═════════════════════════════════════════════════════════════
// getWuxingCard —— 五行力量卡（统一出口，替换上游 _computeAllWuxing 生成的 bz_wuxing 卡）
//
// 与「五行力量分布(wx-dist)」图、`dayMasterScores` 同源于权威引擎 scores，
// 不再出现「两张五行力量比例不同」。阴阳干分布为结构性统计（非力量刻度），仍保留作辅助。
// ═════════════════════════════════════════════════════════════
function getWuxingCard(ob) {
  var w = getWuxing(ob);
  var dmR = ob._dayMasterStrength || dm.computeDayMasterStrength(ob);
  // 阴阳干分布（四柱天干按 五行×阴阳 计数）
  var yinYang = [[0,0],[0,0],[0,0],[0,0],[0,0]]; // [wx][0=阳,1=阴]
  var stems = [ob.b1 % 10, ob.b2 % 10, ob.b3 % 10, ob.b4 % 10];
  for (var i = 0; i < stems.length; i++) {
    var g = stems[i];
    var wx = g >> 1, yin = (g % 2 === 1) ? 1 : 0;
    yinYang[wx][yin]++;
  }
  var yyParts = [];
  for (var wx2 = 0; wx2 < 5; wx2++) {
    yyParts.push('阳' + WX[wx2] + '：' + yinYang[wx2][0] + '　阴' + WX[wx2] + '：' + yinYang[wx2][1]);
  }

  var html = '<div id="bz_wuxing" class="card" data-card-id="bz_wuxing">';
  html += '<div class="card-header" onclick="toggleBaziCardCollapse(this)"><span><i class="ti ti-chart-bar"></i> 五行力量</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="bz-dingge-title"><i class="ti ti-chart-bar"></i> 五行力量（统一判定）</div>';

  // 五行力量表（加权得分 + 月令旺相休囚死 + 占比）
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;">';
  html += '<tr style="background:rgba(212,184,102,0.1);"><th style="padding:4px 6px;border:1px solid #D4A574;">五行</th><th style="padding:4px 6px;border:1px solid #D4A574;">旺相休囚死</th><th style="padding:4px 6px;border:1px solid #D4A574;">加权得分</th><th style="padding:4px 6px;border:1px solid #D4A574;">占比</th></tr>';
  for (var wx3 = 0; wx3 < 5; wx3++) {
    html += '<tr><td style="padding:4px 6px;border:1px solid var(--border-ink);text-align:center;font-weight:600;">' + WX[wx3] + '</td>';
    html += '<td style="padding:4px 6px;border:1px solid var(--border-ink);text-align:center;">' + w.levels[wx3] + '</td>';
    html += '<td style="padding:4px 6px;border:1px solid var(--border-ink);text-align:center;">' + w.scores[wx3] + '</td>';
    html += '<td style="padding:4px 6px;border:1px solid var(--border-ink);text-align:center;">' + w.pct[wx3] + '%</td></tr>';
  }
  html += '</table>';

  // 阴阳干分布（结构性统计，非力量刻度）
  html += '<div class="bz-wuxing-table">' + yyParts.join('　') + '</div>';
  html += '<div style="font-size:12px;line-height:1.8;margin-top:6px;color:var(--text-muted);">';
  html += '本卡五行力量与「五行力量分布」图及「日主强弱」卡同源于一套权威判定（A/B 比值七级 + 加权得分），不再出现跨卡矛盾。';
  html += '</div>';
  html += '</div></div>';
  return html;
}

module.exports = {
  getWuxing: getWuxing,
  getXiyong: getXiyong,
  getCongGe: getCongGe,
  getCongGeData: getCongGeData,
  getWuxingCard: getWuxingCard
};
