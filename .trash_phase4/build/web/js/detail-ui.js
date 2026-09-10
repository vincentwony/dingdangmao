import { State } from './state.js';
import { API } from './api.js';
import { $, _highlightFab } from './dom-helpers.js';

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
var WEEK2 = ['日','一','二','三','四','五','六'];
var CMON = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
var CDAY = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
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

var _overlayEl = null;
var _currentData = null;
var _barY, _barM, _barD;

function init() {
  State.on('date:selected', function(evt) {
    if (evt && evt.y && evt.m && evt.d) {
      _barY = evt.y; _barM = evt.m; _barD = evt.d;

      if (_overlayEl && _overlayEl.classList.contains('show') &&
          _currentData && _currentData.d === evt.d &&
          evt.y === _barY && evt.m === _barM) {
        show(evt.y, evt.m, evt.d);
      }
    }
  });
}

/** 显示详情浮层 */
async function show(y, m, d) {
  if (!y || !m || !d) return;

  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.className = 'detail-panel-overlay';
    _overlayEl.setAttribute('role', 'dialog');
    _overlayEl.setAttribute('aria-modal', 'true');
    _overlayEl.setAttribute('aria-label', '日课详情');
    _overlayEl.innerHTML =
      '<div class="detail-panel-backdrop"></div>' +
      '<div class="detail-panel" id="detailPanel">' +
        '<div class="detail-panel-handle"></div>' +
        '<div class="detail-panel-head">' +
          '<h2>日课详情</h2>' +
          '<button class="detail-panel-close" aria-label="关闭详情"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="detail-panel-body" id="detailBody"></div>' +
      '</div>';

    var backdrop = _overlayEl.querySelector('.detail-panel-backdrop');
    if (backdrop) backdrop.addEventListener('click', hide);

    var closeBtn = _overlayEl.querySelector('.detail-panel-close');
    if (closeBtn) closeBtn.addEventListener('click', hide);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _overlayEl.classList.contains('show')) hide();
    });

    var panel = _overlayEl.querySelector('#detailPanel');
    var startY = 0, dragging = false;
    if (panel) {
      panel.addEventListener('touchstart', function(e) {
        if (e.target.closest('.detail-panel-body') && panel.scrollTop > 0) return;
        startY = e.touches[0].clientY; dragging = true;
        panel.style.transition = 'none';
      }, { passive: true });
      panel.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        var dy = e.touches[0].clientY - startY;
        if (dy < 0) { dy = 0; dragging = false; panel.style.transition = ''; return; }
        panel.style.transform = 'translateY(' + dy + 'px)';
      }, { passive: true });
      panel.addEventListener('touchend', function(e) {
        if (!dragging) return; dragging = false;
        if (e.changedTouches[0].clientY - startY > 80) { hide(); return; }

        panel.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
        panel.style.transform = '';
        var restore = function() { panel.style.transition = ''; panel.removeEventListener('transitionend', restore); };
        panel.addEventListener('transitionend', restore);
      });
    }

    document.body.appendChild(_overlayEl);
  }

  var bodyEl = _overlayEl.querySelector('#detailBody');
  if (bodyEl) {
    bodyEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">' +
      '<i class="ti ti-loader" style="display:inline-block;animation:spin 1s linear infinite;"></i> 加载中...</div>';
  }
  _overlayEl.classList.add('show');
  _overlayEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  _updateSealState(true);

  try {
    var result = await API.post('/calendar/day', { y: y, m: m, d: d });
    if (result.ok) {
      _currentData = result.data;
      if (bodyEl) bodyEl.innerHTML = renderDetail(result.data, y, m, d);
    } else {
      if (bodyEl) bodyEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--color-cinnabar);">加载失败: ' + (result.error || '未知错误') + '</div>';
    }
  } catch(e) {
    if (bodyEl) bodyEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--color-cinnabar);">网络错误: ' + e.message + '</div>';
  }
}

/** 隐藏详情面板 */
function hide() {
  if (!_overlayEl) return;
  _overlayEl.classList.remove('show');
  _overlayEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  _updateSealState(false);
}

/** 更新日历格印章状态：印(玉石) ↔ 詳(朱砂落印) */
function _updateSealState(isOpen) {
  var toggles = document.querySelectorAll('#Cal3 .cal-cell .cal-detail-toggle .seal-char');
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].textContent = isOpen ? '詳' : '印';
  }
}

/** 切换 */
function toggle(y, m, d) {
  if (_overlayEl && _overlayEl.classList.contains('show')) {
    hide();
  } else {
    show(y, m, d);
  }
}

function renderDetail(dat, y, m, d) {
  var wday = new Date(y, m - 1, d).getDay();
  var chongS = dat.chong ? '冲' + dat.chong : '';
  var shaS = dat.sha ? '煞' + dat.sha : '';

  var html = '';

  html += '<div class="detail-date-head">';

  var wendClass = (wday === 0 || wday === 6) ? ' detail-wend' : '';
  html += '<div class="ddh-row1">';
  html += '<span class="ddh-gongli' + wendClass + '">' + y + '年' + m + '月' + d + '日</span>';
  html += '<span class="ddh-week' + wendClass + '">星期' + WEEK2[wday] + '</span>';
  html += '</div>';

  html += '<div class="ddh-row2">';

  html += '<span class="ddh-nongli">农历 ' + (dat.lunarYear || '') + '年【' + y + ' · ' + (dat.yearNaYin || '') + '】</span>';
  html += '<span class="ddh-sep">·</span>';
  var _lm = dat.lunarMonth || 1;
  html += '<span class="ddh-nongli">' + (dat.monthGZ || '') + '月【' + (dat.isLeap ? '闰' : '') + (CMON[_lm - 1] || _lm + '月') + ' · ' + (dat.monthNaYin || '') + '】</span>';
  html += '<span class="ddh-sep">·</span>';
  html += '<span class="ddh-nongli">' + (dat.dayGZ || '') + '日【' + (CDAY[(dat.lunarDay || 1) - 1] || dat.lunarDay) + ' · ' + (dat.dayNaYin || '') + '】</span>';
  html += '</div>';

  if (dat.solarTerm) {
    html += '<div class="ddh-row3"><span class="ddh-jieqi"><i class="ti ti-bolt"></i> ' + dat.solarTerm + '</span></div>';
  }
  html += '</div>';

  html += renderWarnings(dat);

  html += renderYueXiangFestival(dat);

  html += '<div class="detail-cards">';

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

function renderShichen(dat) {
  var scData = dat.shichen || [];
  if (!scData.length) return '';

  var now = new Date();
  var curHour = now.getHours();
  var curSC = Math.floor(((curHour + 1) % 24) / 2);

  var html = '<div class="card dp-reveal-item" data-card-id="shichen">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-clock"></i> 时辰值神</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="cosmic-board">';

  for (var i = 0; i < 12; i++) {
    var sc = scData[i];
    var isCur = i === curSC;
    html += '<div class="cosmic-cell ' + (sc.yellow ? 'good' : 'bad') + (isCur ? ' active' : '') +
      '" title="' + sc.full + ' ' + sc.god + '">';
    html += '<span class="cc-main">' + sc.branch + '</span>';
    html += '<span class="cc-sub">' + (sc.koujue || '') + '</span>';
    if (isCur) html += '<span class="cc-badge">◈ 当前</span>';
    html += '</div>';
  }

  html += '</div>';
  html += '<p class="cosmic-desc"><span class="dot-ylw"></span>黄道吉时 <span class="dot-red"></span>黑道凶时&ensp;—&ensp;当前：<strong>' +
    scData[curSC].branch + '时 ' + scData[curSC].god + '</strong>&ensp;(' +
    (scData[curSC].yellow ? '黄道·吉' : '黑道·凶') + ')</p>';
  html += '</div></div>';

  return html;
}

function renderNineStar(dat) {
  if (!dat.nineStar) return '';

  var html = '<div class="card dp-reveal-item" data-card-id="nine-star">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-star"></i> 今日九星</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="ninestar-grid">';

  for (var ni = 0; ni < 9; ni++) {
    var ns = NINE_STARS2[ni];
    if (!ns) continue;
    var starName = NINE_STAR_ORDER2[ni];
    var isActive = (ni === dat.nineStar.idx);
    var cls = 'ninestar-item ' + (ns.good ? 'good' : 'bad') + (isActive ? ' active' : '');
    html += '<div class="' + cls + '">';
    html += '<span class="ns-name">' + starName + '</span>';
    if (isActive) html += '<span class="ns-label">✦ 今日值星</span>';
    html += '</div>';
  }

  html += '</div>';
  html += '<p class="cosmic-desc">' + dat.nineStar.name + ' · ' + (dat.nineStar.good ? '<strong>吉星</strong>' : '凶星') + '&ensp;：' + dat.nineStar.meaning + '</p>';
  html += '</div></div>';

  return html;
}

function renderShensha(dat, chongS, shaS) {
  var html = '<div class="card dp-reveal-item" data-card-id="shensha">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-clipboard-list"></i> 今日神煞</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';

  html += '<div class="info-grid">';
  html += '<div class="it"><span class="k">五行：</span><span class="v">' + (dat.dayNaYin || '') + '</span></div>';
  html += '<div class="it"><span class="k">建除：</span><span class="v">' + (dat.jianchu || '') + '</span></div>';
  if (chongS) {
    html += '<div class="it"><span class="k">冲煞：</span><span class="v">' + chongS + '·' + (shaS || '') + '</span></div>';
  }
  html += '<div class="it"><span class="k">廿八宿：</span><span class="v">' + (dat.xiuFull || '') + '</span></div>';
  html += '</div>';

  var gSet = {};
  var bSet = {};
  if (dat.goodGods) for (var gi = 0; gi < dat.goodGods.length; gi++) gSet[dat.goodGods[gi]] = true;
  if (dat.badGods) for (var bi = 0; bi < dat.badGods.length; bi++) bSet[dat.badGods[bi]] = true;

  var gHit = 0, gTag = '';
  for (var i = 0; i < GOOD_ALL.length; i++) {
    var nm = GOOD_ALL[i];
    if (gSet[nm]) { gHit++; gTag += '<span class="cosmic-ss-tag good-tag">' + nm + '</span>'; }
  }
  var gh = '<div class="cosmic-ss-group good-group">';
  gh += '<span class="cosmic-ss-title good-title">◇ 吉神</span>';
  gh += '<div class="cosmic-ss-tags">' + (gTag || '<span class="cosmic-ss-count">今日无吉神</span>') + '</div>';
  if (gHit > 0) gh += '<span class="cosmic-ss-count">共' + gHit + '位吉神护佑</span>';
  gh += '</div>';

  var bHit = 0, bTag = '';
  for (var j = 0; j < BAD_ALL.length; j++) {
    var nm2 = BAD_ALL[j];
    if (bSet[nm2]) { bHit++; bTag += '<span class="cosmic-ss-tag bad-tag">' + nm2 + '</span>'; }
  }
  var bh = '<div class="cosmic-ss-group bad-group">';
  bh += '<span class="cosmic-ss-title bad-title">◆ 凶煞</span>';
  bh += '<div class="cosmic-ss-tags">' + (bTag || '<span class="cosmic-ss-count">今日无凶煞</span>') + '</div>';
  if (bHit > 0) bh += '<span class="cosmic-ss-count">共' + bHit + '位凶煞值日</span>';
  bh += '</div>';

  html += '<div class="cosmic-shensha-wrap">' + gh + bh + '</div>';
  html += '</div></div>';

  return html;
}

export default { init: init, show: show, hide: hide, toggle: toggle };