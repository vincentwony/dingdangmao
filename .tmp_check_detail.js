// web/js/detail-ui.js — 日期详情浮层
// 监听日期选中事件，调用 API 渲染完整日课详情
// 移植自 index.html renderFullDetail() 函数

import { State } from './state.js';
import { API } from './api.js';
import { $, _highlightFab } from './dom-helpers.js';

// ══════ 常量 ══════
var DUTY12_ORDER2 = ['建','除','滿','平','定','執','破','危','成','收','開','閉'];
var DUTY12_GOOD2 = { '建':false,'除':true,'滿':false,'平':false,'定':true,'執':true,'破':false,'危':true,'成':true,'收':false,'開':true,'閉':false };
var DUTY12_MEANING2 = {
    '建':'万物建始·宜求嗣出行', '除':'除旧布新·宜沐浴扫舍',
    '滿':'充盈饱满·宜祭祀祈福', '平':'平稳中和·宜修造动土',
    '定':'安定不移·宜嫁娶开市', '執':'执守不破·宜捕猎伐木',
    '破':'破败冲散·宜求医破屋', '危':'高危临险·宜祭祀安神',
    '成':'成就功业·宜嫁娶开市', '收':'收敛归藏·宜纳财入宅',
    '開':'开张启动·宜开市出行', '閉':'闭藏封固·宜安葬修坟'
};
var NINE_STAR_ORDER2 = ['妖星','惑星','禾刀','煞贡','直星','卜木','角己','人专','立早'];
var NINE_STARS2 = {
    0: { name: '妖星', good: false, meaning: '上官嫁娶起造开店移徙入宅不利，主退败灾凶' },
    1: { name: '惑星', good: false, meaning: '主灾祸，不宜大事' },
    2: { name: '禾刀', good: false, meaning: '有灾迫，慎防口舌是非' },
    3: { name: '煞贡', good: true, meaning: '大吉，万事皆宜' },
    4: { name: '直星', good: true, meaning: '大吉，诸事顺利' },
    5: { name: '卜木', good: false, meaning: '有口舌是非，不宜诉讼' },
    6: { name: '角己', good: false, meaning: '疾病虚惊，不宜远行' },
    7: { name: '人专', good: true, meaning: '吉，宜嫁娶开市出行' },
    8: { name: '立早', good: false, meaning: '凶，百事不宜' }
};
// 九星含义摘要（按 idx 0-8 对应 NINE_STAR_ORDER2）— 九宫盘每格显示
var NINE_STAR_SHORT = ['退败灾凶','灾祸临身','口舌是非','万事皆宜','诸事顺利','口舌诉讼','疾病虚惊','嫁娶开市','百事不宜'];
var WEEK2 = ['日','一','二','三','四','五','六'];
var CMON = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
var CDAY = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
// 注：GOOD_ALL / BAD_ALL 仅为“精选神煞”参考清单，自 2026-07-14 起【不再用于过滤显示】——
// 日详情“今日神煞”卡片现渲染 /calendar/day 返回的当日【全部】吉神/凶煞（goodGods/badGods）。
var GOOD_ALL = [
    '天乙貴人','天乙贵人','天德','月德','天德合','月德合','日祿','日禄',
    '喜神','紅鸞','红鸾','天喜','三合','六合','驛馬','驿马',
    '歲德','岁德','歲德合','岁德合','福星','文昌','學堂','学堂',
    '天赦','月恩','母仓','母倉','天醫','天医','敬安','玉堂','金匮','金匱',
    '司命','青龍','青龙','明堂','金堂','普護','普护','要安'
];
var BAD_ALL = [
    '五不遇','劫煞','災煞','灾煞','月煞','月刑','月害','月破',
    '歲破','岁破','白虎','天吏','天刑','朱雀','玄武','勾陳','勾陈',
    '吊客','病符','死符','喪門','丧门','伏吟','反吟','披麻',
    '天牢','破碎','孤辰','寡宿','天羅','天罗','地網','地网',
    '咸池','血支','血忌','五虛','五虚','八風','八风','歸忌','归忌'
];
// ══════ 状态 ══════
var _currentData = null;
var _currentKey = '';   // 当前内联展示的日期键 'y-m-d'

// ══════ 初始化 ══════
function init() {
  // 内联模式下由 calendar-ui 的 selectDay 直接调用 show()/hide()，此处无需额外监听。
}

/** 获取内联容器 */
function _host() {
  return document.getElementById('cal-detail-inline');
}

/** 是否正在展示 */
function isOpen() {
  var host = _host();
  return !!(host && host.classList.contains('show'));
}

/** 在日历下方内联渲染日课详情 */
async function show(y, m, d) {
  if (!y || !m || !d) return;
  var host = _host();
  if (!host) return;

  _currentKey = y + '-' + m + '-' + d;
  host.classList.add('show');
  host.setAttribute('aria-hidden', 'false');
  host.innerHTML = '<div class="cal-detail-loading">' +
    '<i class="ti ti-loader"></i> 正在推演当日日课…</div>';

  try {
    var result = await API.post('/calendar/day', { y: y, m: m, d: d });
    // 若期间已切到其它日期，丢弃过期响应
    if (_currentKey !== (y + '-' + m + '-' + d)) return;
    if (result.ok) {
      _currentData = result.data;
      host.innerHTML = '<div class="cal-detail-inner">' + renderDetail(result.data, y, m, d) + '</div>';
      _renderJishenBanner(_currentData);
    } else {
      host.innerHTML = '<div class="cal-detail-error">加载失败：' + (result.error || '未知错误') + '</div>';
    }
  } catch(e) {
    host.innerHTML = '<div class="cal-detail-error">网络错误：' + e.message + '</div>';
  }
}

/** 收起内联详情 */
function hide() {
  var host = _host();
  if (host) {
    host.classList.remove('show');
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '';
  }
  _currentKey = '';
  var banner = document.getElementById('jishenBanner');
  if (banner) { banner.classList.remove('show'); banner.innerHTML = ''; }
}

/** 填充吉神公告栏：选中日的吉神名单（呼应已修复的圣心/益后/续世等神煞） */
function _renderJishenBanner(dat) {
  var banner = document.getElementById('jishenBanner');
  if (!banner) return;
  var gods = (dat && dat.goodGods) ? dat.goodGods : [];
  if (!gods.length) { banner.classList.remove('show'); banner.innerHTML = ''; return; }
  var MAX = 16;
  var shown = gods.slice(0, MAX);
  var html = '<span class="jb-label"><i class="ti ti-sun"></i> 今日吉神</span>';
  html += shown.map(function(g) { return '<span class="jb-god">' + g + '</span>'; }).join('');
  if (gods.length > shown.length) html += '<span class="jb-more">等 ' + gods.length + ' 位</span>';
  banner.innerHTML = html;
  banner.classList.add('show');
}

/** 切换：同一天再点则收起，否则展示 */
function toggle(y, m, d) {
  if (isOpen() && _currentKey === (y + '-' + m + '-' + d)) {
    hide();
  } else {
    show(y, m, d);
  }
}

// ══════ 渲染函数 ══════

function renderDetail(dat, y, m, d) {
  var wday = new Date(y, m - 1, d).getDay();
  var chongS = dat.chong ? '冲' + dat.chong : '';
  var shaS = dat.sha ? '煞' + dat.sha : '';

  var html = '';

  // ══════ 日期信息头 — 三行层级 ══════
  html += '<div class="detail-date-head">';
  // 行1：公历日期 + 星期
  var wendClass = (wday === 0 || wday === 6) ? ' detail-wend' : '';
  html += '<div class="ddh-row1">';
  html += '<span class="ddh-gongli' + wendClass + '">' + y + '年' + m + '月' + d + '日</span>';
  html += '<span class="ddh-week' + wendClass + '">星期' + WEEK2[wday] + '</span>';
  html += '</div>';
  // 行2：农历干支 — 格式: 丙午年【2026 · 天河水】· 甲午月【五月 · 沙中金】· 庚午日【十一 · 路旁土】
  html += '<div class="ddh-row2">';
  
  html += '<span class="ddh-nongli">农历 ' + (dat.lunarYear || '') + '年【' + y + ' · ' + (dat.yearNaYin || '') + '】</span>';
  html += '<span class="ddh-sep">·</span>';
  var _lm = dat.lunarMonth || 1;
  html += '<span class="ddh-nongli">' + (dat.monthGZ || '') + '月【' + (dat.isLeap ? '闰' : '') + (CMON[_lm - 1] || _lm + '月') + ' · ' + (dat.monthNaYin || '') + '】</span>';
  html += '<span class="ddh-sep">·</span>';
  html += '<span class="ddh-nongli">' + (dat.dayGZ || '') + '日【' + (CDAY[(dat.lunarDay || 1) - 1] || dat.lunarDay) + ' · ' + (dat.dayNaYin || '') + '】</span>';
  html += '</div>';
  // 行3：节气
  if (dat.solarTerm) {
    html += '<div class="ddh-row3"><span class="ddh-jieqi"><i class="ti ti-bolt"></i> ' + dat.solarTerm + '</span></div>';
  }
  html += '</div>';

  // ══════ 特殊日警示 ══════
  html += renderWarnings(dat);

  // ══════ 月相与节日 ══════
  html += renderYueXiangFestival(dat);

  // ══════ 星命卡片区 ══════
  html += '<div class="detail-cards">';

  // 建除十二神
  html += '<div class="card dp-reveal-item" data-card-id="duty-god">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-building-castle"></i> 今日值神</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="cosmic-board">' + renderDuty12(dat.jianchu) + '</div>';
  html += '<p class="cosmic-desc">今日值神：<strong>' + (dat.jianchu || '') + '</strong>&ensp;—&ensp;' +
    (DUTY12_MEANING2[dat.jianchu] || '') + '&ensp;(' + (DUTY12_GOOD2[dat.jianchu] ? '黄道吉日' : '黑道凶日') + ')</p>';
  html += '</div></div>';

  html += renderShichen(dat);
  html += renderNineStar(dat);
  html += renderShensha(dat, chongS, shaS);

  html += '</div>';

  return html;
}

function renderWarnings(dat) {
  var w = '';
  if (dat.tianshe) w += '<span class="tianshe-notice"><i class="ti ti-sparkles"></i> 天赦日</span>';
  if (dat.tiande) w += '<span class="tiande-notice"><i class="ti ti-sun"></i> 天德日</span>';
  if (dat.yuede) w += '<span class="yuede-notice"><i class="ti ti-moon"></i> 月德日</span>';
  if (dat.wufu) w += '<span class="wufu-notice"><i class="ti ti-star"></i> 五富日</span>';
  if (dat.yanggongJi) {
    w += '<span class="yanggongji-notice"><i class="ti ti-alert-triangle"></i> 杨公忌日 · ' + (dat.yanggongJi.label || '') + '</span>';
  }
  if (dat.silisiJue) {
    var slsj = dat.silisiJue;
    var slsjLabel = slsj.type === '离' ? '四离日' : '四绝日';
    w += '<span class="silisijue-notice"><i class="ti ti-alert-circle"></i> ' + slsjLabel + ' · ' + slsj.name + '</span>';
  }
  if (dat.wulu) w += '<span class="wulu-notice"><i class="ti ti-alert-triangle"></i> 无禄日</span>';
  if (dat.hongsha) w += '<span class="hongsha-notice">红砂日</span>';
  if (dat.jinshenqisha) w += '<span class="jinshenqisha-notice"><i class="ti ti-skull"></i> 金神七煞</span>';
  if (dat.daojia) {
    var djLabel = '倒家杀';
    if (dat.daojiaYear && dat.daojiaMonth) djLabel += '(年+月)';
    else if (dat.daojiaYear) djLabel += '(年)';
    else djLabel += '(月)';
    w += '<span class="daojia-notice"><i class="ti ti-exclamation-mark"></i> ' + djLabel + '</span>';
  }
  if (dat.miemen) w += '<span class="miemen-notice">灭门大祸</span>';
  if (dat.shousi) w += '<span class="shousi-notice">受死日</span>';
  if (dat.bingxiao) w += '<span class="bingxiao-notice">' + dat.bingxiao + '日</span>';
  if (dat.sansang) w += '<span class="sansang-notice">三丧日</span>';
  if (dat.chongsang) w += '<span class="chongsang-notice">重丧日</span>';
  if (dat.hengtian) w += '<span class="hengtian-notice">横天朱雀</span>';
  if (dat.dasha) w += '<span class="dasha-notice">大煞入中宫</span>';
  if (dat.leiting) w += '<span class="dasha-notice"><i class="ti ti-bolt"></i> 雷霆白虎</span>';
  if (dat.kongwang === '天空') w += '<span class="kongwang-notice">天空亡日</span>';
  if (dat.kongwang === '地空') w += '<span class="kongwang-notice">地空亡日</span>';
  if (dat.sanfu) {
    w += '<span class="sanfu-notice"><i class="ti ti-flame"></i> ' + dat.sanfu.period + '第' + dat.sanfu.day + '天</span>';
  }
  return w ? '<div class="detail-warnings">' + w + '</div>' : '';
}

/** 月相与节日 — 据寿星历 ob.yxmc/ob.yxsj + ob.A/ob.B */
function renderYueXiangFestival(dat) {
  var html = '';
  var yx = dat.yueXiang || '';
  var yxTime = dat.yueXiangTime || '';
  var sf = dat.solarFestival || '';
  var lf = dat.lunarFestival || '';

  if (!yx && !sf && !lf) return '';

  html += '<div class="card" data-card-id="yuexiang-festival">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-moon-stars"></i> 月相与节日</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';

  // 月相行
  if (yx) {
    var moonEmoji = {朔:'🌑',望:'🌕',上弦:'🌓',下弦:'🌗'};
    var moonLabel = {朔:'朔月(新月)',望:'望月(满月)',上弦:'上弦月',下弦:'下弦月'};
    var emoji = moonEmoji[yx] || '🌙';
    var label = moonLabel[yx] || yx;
    html += '<div class="yxf-row yxf-moon">';
    html += '<span class="yxf-moon-emoji">' + emoji + '</span>';
    html += '<span class="yxf-moon-name">' + label + '</span>';
    if (yxTime) {
      html += '<span class="yxf-moon-time">精确时刻 ' + yxTime + '</span>';
    }
    html += '</div>';
  }

  // 节日行
  if (sf || lf) {
    html += '<div class="yxf-row yxf-fest">';
    html += '<span class="yxf-fest-icon">🏮</span>';
    html += '<span class="yxf-fest-items">';
    var items = [];
    if (sf) {
      var sfParts = sf.split(/[,，\s]+/).filter(function(s){return s.length>0;});
      for (var i = 0; i < sfParts.length; i++) {
        items.push('<span class="yxf-tag yxf-tag-important">' + sfParts[i] + '</span>');
      }
    }
    if (lf) {
      var lfParts = lf.split(/[,，\s]+/).filter(function(s){return s.length>0;});
      for (var j = 0; j < lfParts.length; j++) {
        // 跳过节气类（入梅等）
        if (lfParts[j].indexOf('『') >= 0 || lfParts[j].indexOf('「') >= 0) continue;
        items.push('<span class="yxf-tag yxf-tag-normal">' + lfParts[j] + '</span>');
      }
    }
    html += items.join('') || '<span class="yxf-empty">—</span>';
    html += '</span>';
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function renderDuty12(activeName) {
  var html = '';
  for (var i = 0; i < DUTY12_ORDER2.length; i++) {
    var dn = DUTY12_ORDER2[i];
    var isGood = DUTY12_GOOD2[dn];
    var isActive = dn === activeName;
    html += '<div class="cosmic-cell ' + (isGood ? 'good' : 'bad') + (isActive ? ' active' : '') +
      '" title="' + (DUTY12_MEANING2[dn] || '') + '">';
    html += '<span class="cc-main">' + dn + '</span>';
    if (isActive) html += '<span class="cc-badge">◈ 值神</span>';
    else html += '<span class="cc-sub">' + (DUTY12_MEANING2[dn] ? DUTY12_MEANING2[dn].substring(0,2) : '—') + '</span>';
    html += '</div>';
  }
  return html;
}

/** 时钟角(0°=12点方向,顺时针) → 直角坐标 */
function _clockXY(cx, cy, r, deg) {
  var rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
/** 环形扇区 path（外弧顺时针 + 内弧逆时针闭合） */
function _annularSector(cx, cy, R, r, startDeg, endDeg) {
  var A = _clockXY(cx, cy, R, startDeg), B = _clockXY(cx, cy, R, endDeg);
  var C = _clockXY(cx, cy, r, endDeg),   D = _clockXY(cx, cy, r, startDeg);
  return 'M' + A.x.toFixed(2) + ' ' + A.y.toFixed(2) +
    ' A' + R + ' ' + R + ' 0 0 1 ' + B.x.toFixed(2) + ' ' + B.y.toFixed(2) +
    ' L' + C.x.toFixed(2) + ' ' + C.y.toFixed(2) +
    ' A' + r + ' ' + r + ' 0 0 0 ' + D.x.toFixed(2) + ' ' + D.y.toFixed(2) + ' Z';
}

function renderShichen(dat) {
  var scData = dat.shichen || [];
  if (!scData.length) return '';

  var now = new Date();
  var curHour = now.getHours();
  var curSC = Math.floor(((curHour + 1) % 24) / 2);
  var cur = scData[curSC] || scData[0];

  var cx = 100, cy = 100, R = 94, r = 54;
  var sectors = '', labels = '';
  for (var i = 0; i < 12; i++) {
    var sc = scData[i];
    var start = i * 30 - 15, end = i * 30 + 15;
    var isCur = (i === curSC);
    var scls = 'clk-sec ' + (sc.yellow ? 'clk-good' : 'clk-bad') + (isCur ? ' clk-cur' : '');
    sectors += '<path class="' + scls + '" d="' + _annularSector(cx, cy, R, r, start, end) + '"></path>';
    var p = _clockXY(cx, cy, (R + r) / 2, i * 30);
    labels += '<text class="clk-branch' + (isCur ? ' clk-branch-cur' : '') + '" x="' + p.x.toFixed(1) +
      '" y="' + p.y.toFixed(1) + '">' + sc.branch + '</text>';
  }
  var tip = _clockXY(cx, cy, r - 4, curSC * 30);
  var pointer = '<line class="clk-pointer" x1="' + cx + '" y1="' + cy + '" x2="' + tip.x.toFixed(1) +
    '" y2="' + tip.y.toFixed(1) + '"></line>' +
    '<circle class="clk-hub" cx="' + cx + '" cy="' + cy + '" r="4.5"></circle>';

  var timeRange = (cur.full || '').split(/[：:]/)[1] || '';
  var curCls = cur.yellow ? 'good' : 'bad';

  var html = '<div class="card dp-reveal-item" data-card-id="shichen">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-clock"></i> 时辰值神</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="shichen-clock-wrap">';
  html += '<svg class="shichen-clock" viewBox="0 0 200 200" role="img" aria-label="十二时辰黄黑道时钟盘">';
  html += '<circle class="clk-ring-outer" cx="100" cy="100" r="94.5"></circle>';
  html += sectors;
  html += '<circle class="clk-ring-inner" cx="100" cy="100" r="53.5"></circle>';
  html += labels;
  html += pointer;
  html += '</svg>';
  html += '<div class="clk-center">';
  html += '<span class="clk-c-label">此刻</span>';
  html += '<span class="clk-c-branch">' + cur.branch + '时</span>';
  html += '<span class="clk-c-god ' + curCls + '">' + cur.god + '</span>';
  html += '<span class="clk-c-verdict ' + curCls + '">' + (cur.yellow ? '黄道 · 吉' : '黑道 · 凶') + '</span>';
  html += '<span class="clk-c-time">' + timeRange + '</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="shichen-legend"><span class="dot-ylw"></span>黄道吉时<span class="clk-lg-gap"></span><span class="dot-red"></span>黑道凶时</div>';
  html += '</div></div>';

  return html;
}

function renderNineStar(dat) {
  if (!dat.nineStar) return '';
  var cur = dat.nineStar;
  var curIdx = cur.idx;
  var heroCls = cur.good ? 'good' : 'bad';

  var html = '<div class="card dp-reveal-item" data-card-id="nine-star">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-star"></i> 今日九星</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';

  // 焦点区：当日值星
  html += '<div class="ns-hero ' + heroCls + '">';
  html += '<div class="ns-hero-badge">' + (cur.good ? '吉' : '凶') + '</div>';
  html += '<div class="ns-hero-body">';
  html += '<div class="ns-hero-top"><span class="ns-hero-name">' + cur.name +
    '</span><span class="ns-hero-tag">' + (cur.good ? '今日吉星' : '今日凶星') + '</span></div>';
  html += '<p class="ns-hero-desc">' + cur.meaning + '</p>';
  html += '</div></div>';

  // 九宫盘（3×3，每格补吉凶徽标 + 含义摘要）
  html += '<div class="ninestar-grid">';
  for (var ni = 0; ni < 9; ni++) {
    var ns = NINE_STARS2[ni];
    if (!ns) continue;
    var starName = NINE_STAR_ORDER2[ni];
    var isActive = (ni === curIdx);
    var cls = 'ninestar-item ' + (ns.good ? 'good' : 'bad') + (isActive ? ' active' : '');
    html += '<div class="' + cls + '">';
    html += '<span class="ns-badge">' + (ns.good ? '吉' : '凶') + '</span>';
    html += '<span class="ns-name">' + starName + '</span>';
    html += '<span class="ns-brief">' + (NINE_STAR_SHORT[ni] || '') + '</span>';
    if (isActive) html += '<span class="ns-label">✦ 值星</span>';
    html += '</div>';
  }
  html += '</div>';

  html += '</div></div>';
  return html;
}

/** 构建神煞分组（吉/凶），超量自动折叠 + 「展开全部 N 位」 */
function buildSsGroup(titleText, titleCls, names, tagCls) {
  var THRESHOLD = 12;
  var total = names ? names.length : 0;
  var tagsHtml = '';
  if (total === 0) {
    tagsHtml = '<span class="cosmic-ss-count">无</span>';
  } else {
    for (var i = 0; i < total; i++) {
      tagsHtml += '<span class="cosmic-ss-tag ' + tagCls + '">' + names[i] + '</span>';
    }
  }
  var collapsedCls = (total > THRESHOLD) ? ' collapsed' : '';
  var moreBtn = (total > THRESHOLD)
    ? '<button type="button" class="ss-more-btn" data-total="' + total + '" onclick="window._ssToggleMore(this)">展开全部 ' + total + ' 位</button>'
    : '';
  var countLine = (total > 0)
    ? '<span class="cosmic-ss-count">共 ' + total + ' 位' + (tagCls === 'good-tag' ? '吉神护佑' : '凶煞值日') + '</span>'
    : '';
  return '<div class="cosmic-ss-group ' + (tagCls === 'good-tag' ? 'good-group' : 'bad-group') + '">' +
    '<span class="cosmic-ss-title ' + titleCls + '">' + titleText + '</span>' +
    '<div class="cosmic-ss-tags' + collapsedCls + '">' + tagsHtml + '</div>' +
    moreBtn +
    countLine +
    '</div>';
}

/* 神煞分组「展开/收起」切换（由卡片内按钮调用） */
window._ssToggleMore = function(btn) {
  var group = btn.parentNode;
  var tags = group ? group.querySelector('.cosmic-ss-tags') : null;
  if (!tags) return;
  var collapsed = tags.classList.toggle('collapsed');
  btn.textContent = collapsed ? ('展开全部 ' + btn.dataset.total + ' 位') : '收起';
};

/** 信息徽章（图标 + 标签 + 值） */
function _ssBadge(icon, label, val) {
  return '<div class="ss-badge"><i class="ti ' + icon + '"></i>' +
    '<span class="ss-badge-k">' + label + '</span>' +
    '<span class="ss-badge-v">' + (val || '—') + '</span></div>';
}

function renderShensha(dat, chongS, shaS) {
  var goodN = (dat.goodGods || []).length;
  var badN = (dat.badGods || []).length;
  var jcGood = DUTY12_GOOD2[dat.jianchu];

  var html = '<div class="card dp-reveal-item" data-card-id="shensha">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-clipboard-list"></i> 今日神煞</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';

  // 焦点区：今日吉凶总览
  html += '<div class="ss-hero">';
  html += '<div class="ss-hero-stat good"><span class="ss-hero-num">' + goodN + '</span><span class="ss-hero-lbl">吉神护佑</span></div>';
  html += '<div class="ss-hero-mid"><span class="ss-hero-jc ' + (jcGood ? 'good' : 'bad') + '">' +
    (dat.jianchu || '') + '</span><span class="ss-hero-jc-lbl">' + (jcGood ? '黄道' : '黑道') + '</span></div>';
  html += '<div class="ss-hero-stat bad"><span class="ss-hero-num">' + badN + '</span><span class="ss-hero-lbl">凶煞值日</span></div>';
  html += '</div>';

  // 信息徽章
  html += '<div class="ss-info-badges">';
  html += _ssBadge('ti-flame', '五行', dat.dayNaYin);
  html += _ssBadge('ti-building-castle', '建除', (dat.jianchu || '') + (jcGood ? '·吉' : '·凶'));
  if (chongS) html += _ssBadge('ti-swords', '冲煞', chongS + '·' + (shaS || ''));
  html += _ssBadge('ti-star', '廿八宿', dat.xiuFull);
  html += '</div>';

  // 吉神/凶煞标签墙（全部，超量折叠）
  var gh = buildSsGroup('◇ 吉神', 'good-title', dat.goodGods, 'good-tag');
  var bh = buildSsGroup('◆ 凶煞', 'bad-title', dat.badGods, 'bad-tag');
  html += '<div class="cosmic-shensha-wrap">' + gh + bh + '</div>';
  html += '</div></div>';

  return html;
}

export default { init: init, show: show, hide: hide, toggle: toggle, isOpen: isOpen };
