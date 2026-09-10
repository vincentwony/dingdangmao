// web/js/detail-ui.js — 日期详情浮层
// 监听日期选中事件，调用 API 渲染完整日课详情
// 移植自 index.html renderFullDetail() 函数

import { State } from './state.js';
import { API } from './api.js';
import { $, _highlightFab } from './dom-helpers.js';

// ══════ 常量 ══════
var DUTY12_GOOD2 = { '建':false,'除':true,'滿':false,'平':false,'定':true,'執':true,'破':false,'危':true,'成':true,'收':false,'開':true,'閉':false };
var DUTY12_MEANING2 = {
    '建':'万物建始·宜求嗣出行', '除':'除旧布新·宜沐浴扫舍',
    '滿':'充盈饱满·宜祭祀祈福', '平':'平稳中和·宜修造动土',
    '定':'安定不移·宜嫁娶开市', '執':'执守不破·宜捕猎伐木',
    '破':'破败冲散·宜求医破屋', '危':'高危临险·宜祭祀安神',
    '成':'成就功业·宜嫁娶开市', '收':'收敛归藏·宜纳财入宅',
    '開':'开张启动·宜开市出行', '閉':'闭藏封固·宜安葬修坟'
};
// ── 古籍释义（动态：随当日值星/九星而变）──
// 建除十二神 名义义例 — 据《钦定协纪辨方书·卷六·建除十二神》
var DUTY_CLASSIC = {
  '建': '建者，一月之主也。所值之日为月内行事之纲，凡事当依时创制、兴举初事；然忌妄动土功、嫁娶、安葬。',
  '除': '除者，除旧布新也。阳气奋发、万物更新，宜祀神、祈福、求医、出行；忌远行。',
  '滿': '滿者，丰豫盈溢也。物极则反，宜祭祀、祈福；忌开业、求财、嫁娶。',
  '平': '平者，平治也，无偏陂高低。宜修造、平治道路；忌移徙、远行。',
  '定': '定者，安定不动也。宜签约、纳采、安床、订盟；忌词讼、医疗、出行。',
  '執': '執者，守其成也。宜捕捉、拘执、伐木；忌移徙、开市。',
  '破': '破者，破坏离散也。百事俱凶，唯宜求医、破屋坏垣；忌一切营建嫁娶。',
  '危': '危者，危惧也，临险而慎。宜祭祀、安床、祈福；忌登高、乘船。',
  '成': '成者，成就也。诸事皆成，宜开市、嫁娶、入学、签约、求医；忌词讼。',
  '收': '收者，收敛归藏也。宜纳财、收养、入仓；忌开市、嫁娶、放债。',
  '開': '開者，生气开扬也。宜开市、出行、嫁娶、求医、动土；忌安葬、诉讼、放债。',
  '閉': '閉者，闭藏封闭也。宜安葬、修坟、筑堤；忌开市、求医、出行。'
};
var DUTY_CLASSIC_SRC = '《钦定协纪辨方书·卷六·建除十二神》';
// 九星 名义义例 — 据《星历考原·九星值日》／《协纪辨方书·卷十》
var NINE_CLASSIC = {
  '妖星': '妖星，凶。所值之日，上官、嫁娶、起造、移徙、开店俱不利，主退败灾凶。',
  '惑星': '惑星，凶。主灾祸，不宜兴举大事。',
  '禾刀': '禾刀，凶。有灾逼至，慎防口舌是非之争。',
  '煞贡': '煞贡，吉（上吉）。大吉之日，万事皆宜，百事顺遂。',
  '直星': '直星，吉（上吉）。大吉之日，诸事顺利，营造皆宜。',
  '卜木': '卜木，凶。主口舌是非，不宜兴词诉讼。',
  '角己': '角己，凶。主疾病虚惊，不宜远行出入。',
  '人专': '人专，吉。宜嫁娶、开市、出行，人情和顺。',
  '立早': '立早，凶。百事不宜，诸事忌用。'
};
var NINE_CLASSIC_SRC = '《星历考原·九星值日》';
// 黄道十二神 名义义例 — 据《钦定协纪辨方书·卷六·黄道黑道十二神》（与「建除十二神」为不同体系）
var HUANGDAO_CLASSIC = {
  '青龙': '青龙，黄道六神之首，东方木德之象。所值之时，百事皆宜，尤利兴举、动土、嫁娶、出行、开市。',
  '明堂': '明堂，黄道之神，象帝王布政之堂。所值之时，宜起居、安床、修造、安葬、请贵；诸事和顺。',
  '天刑': '天刑，黑道之神，象刑罚拘系。所值之时，忌词讼、出行、嫁娶、动土；宜静不宜动。',
  '朱雀': '朱雀，黑道之神，南方火象，主口舌。所值之时，忌词讼、争辩、移徙；宜谨言慎行。',
  '金匮': '金匮，黄道之神，象藏籍纳财之府。所值之时，宜收纳、藏书、求财、嫁娶、安床。',
  '天德': '天德，黄道之神（与择日「天德日」干支法异，勿混）。所值之时，宜修造、安葬、祈福、出行，百事皆吉。',
  '白虎': '白虎，黑道之神，西方金象，主凶丧。所值之时，忌嫁娶、出行、动土、安葬；宜避不宜趋。',
  '玉堂': '玉堂，黄道之神，象殿阁清华。所值之时，宜起居、修造、安床、嫁娶、开市、入学。',
  '天牢': '天牢，黑道之神，象拘系牢狱。所值之时，忌词讼、出行、嫁娶、动土；宜静守。',
  '玄武': '玄武（清刊或作元武），黑道之神，北方水象，主盗失。所值之时，忌移徙、出行、开市、纳财；慎防盗失。',
  '司命': '司命，黄道之神，象掌籍录生命。所值之时，宜祭祀、祈福、受封、嫁娶、出行；诸事可举。',
  '勾陈': '勾陈，黑道之神，象滞碍纠缠。所值之时，忌嫁娶、出行、移徙、兴作；宜缓不宜急。'
};
var HUANGDAO_CLASSIC_SRC = '《钦定协纪辨方书·卷六·黄道黑道十二神》';
// 黄道十二神 一句话宜忌（供单值卡 dn-mean 显示）
var HUANGDAO_MEANING = {
  '青龙': '百事皆宜，利兴举、动土、嫁娶、出行、开市',
  '明堂': '宜起居、安床、修造、安葬、请贵',
  '天刑': '忌词讼、出行、嫁娶、动土；宜静守',
  '朱雀': '忌词讼、争辩、移徙；谨言慎行',
  '金匮': '宜收纳、藏书、求财、嫁娶、安床',
  '天德': '宜修造、安葬、祈福、出行，百事吉',
  '白虎': '忌嫁娶、出行、动土、安葬；宜避',
  '玉堂': '宜起居、修造、安床、嫁娶、开市、入学',
  '天牢': '忌词讼、出行、嫁娶、动土；宜静',
  '玄武': '忌移徙、出行、开市、纳财；慎防盗失',
  '司命': '宜祭祀、祈福、受封、嫁娶、出行',
  '勾陈': '忌嫁娶、出行、移徙、兴作；宜缓'
};
var HUANGDAO_GOOD = { '青龙':true,'明堂':true,'天刑':false,'朱雀':false,'金匮':true,'天德':true,'白虎':false,'玉堂':true,'天牢':false,'玄武':false,'司命':true,'勾陈':false };
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

function _showGods() { try { var v = localStorage.getItem('cal_showGods'); return v === null ? true : (v !== 'false'); } catch(e) { return true; } }

// 设置变更后，用已缓存数据重渲染当前详情（如“显示神煞”开关）
function rerender() {
  var host = _host();
  if (!host || !host.classList.contains('show') || !_currentData || !_currentKey) return;
  var p = _currentKey.split('-');
  var y = +p[0], m = +p[1], d = +p[2];
  host.innerHTML = '<div class="cal-detail-inner">' + renderDetail(_currentData, y, m, d) + '</div>';
  if (_showGods()) _renderJishenBanner(_currentData);
}

// ══════ 初始化 ══════
function init() {
  // “显示神煞”等开关变更 → 若详情正在展示则重渲染
  State.on('settings:changed', function() { rerender(); });
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
      if (_showGods()) _renderJishenBanner(_currentData);
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
  html += shown.map(function(g) {
    var m = (dat.godsMeta && dat.godsMeta[g]) || null;
    var tipTail = m ? (m.isDiff ? '（与运行版有流派差异）' : (m.corrected ? '（已按协纪修正）' : '（协纪出处）')) : '';
    var attr = m ? (' title="' + escAttr('协纪出处：' + (m.xiejì || '《协纪辨方书》') + tipTail) + '"') : '';
    return '<span class="jb-god' + (m ? ' has-source' : '') + (m && m.corrected ? ' god-corrected' : '') + '"' + attr + '>' + g + '</span>';
  }).join('');
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

/** HTML 属性转义（防 title/data-tip 注入断裂） */
function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 把神煞来源元数据拼成可读 tooltip 文本（协纪出处 + 定义 + 差异/已修正） */
function _metaTip(m) {
  var t = '协纪出处：' + (m.xiejì || '《协纪辨方书》') + '\n';
  t += '定义：' + (m.def || '');
  if (m.isDiff) t += '\n与运行版(lunisolar)差异：' + (m.diff || '');
  else if (m.corrected) t += '\n已按《协纪辨方书》修正：' + (m.note || '');
  return t;
}

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
  html += '<span class="ddh-nongli"><span class="ddh-tag ddh-tag-jq">节气</span>' + (dat.monthGZ || '') + '月【' + (dat.monthNaYin || '') + '】</span>';
  html += '<span class="ddh-sep">·</span>';
  var _lm = dat.lunarMonth || 1;
  html += '<span class="ddh-nongli"><span class="ddh-tag ddh-tag-nl">农历</span>' + (dat.isLeap ? '闰' : '') + (CMON[_lm - 1] || _lm + '月') + '</span>';
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

  // ══════ 宜忌（日课）— 含本程序后置修正（红砂）══════
  html += renderYiJi(dat);

  // ══════ 星命卡片区 ══════
  html += '<div class="detail-cards">';

  // 建除值神 + 九星值日（合并单值卡，每天各显示一个值 + 内联古籍释义）
  html += renderDutyNine(dat);
  html += renderShichen(dat);
  if (_showGods()) html += renderShensha(dat, chongS, shaS);

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
  if (dat.hongsha) w += '<span class="hongsha-notice" title="小红砂（凶）：四孟金鸡四仲蛇，四季丑日是红砂。孟月(寅巳申亥)酉日、仲月(子午卯酉)巳日、季月(辰未戌丑)丑日，百事忌。"><i class="ti ti-alert-triangle"></i> 小红砂（凶）</span>';
  if (dat.dahongsha) w += '<span class="dahongsha-notice" title="大红砂（吉，玉匣记原版）：春戌子、夏辰巳、秋午未、冬申戌，每季两日，百事吉。"><i class="ti ti-sparkles"></i> 大红砂（吉）· 百事吉</span>';
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

/** 宜忌（日课）— 渲染 dat.yiActs（宜）/ dat.jiActs（忌）。
 *  数据源：lunisolar theGods.getActs(1) 第三方值 + 本程序 _getLsrActs 后置注入（红砂）。
 *  含「（大红砂」「（小红砂」的项为本程序已验证神煞补充，加 yiji-extra 视觉标注以示来源。 */
function renderYiJi(dat) {
  var yi = (dat.yiActs && dat.yiActs.length) ? dat.yiActs : [];
  var ji = (dat.jiActs && dat.jiActs.length) ? dat.jiActs : [];
  var html = '<div class="card" data-card-id="yiji">';
  html += '<div class="card-header"><span><i class="ti ti-calendar-check"></i> 宜忌（日课）</span></div>';
  html += '<div class="card-body detail-yiji">';

  // 宜
  html += '<div class="yiji-row yiji-good">';
  html += '<span class="yiji-label">宜</span>';
  html += '<div class="yiji-items">';
  if (yi.length) {
    yi.forEach(function(it) {
      var extra = (it.indexOf('（大红砂') >= 0 || it.indexOf('（小红砂') >= 0) ? ' yiji-extra' : '';
      html += '<span class="yiji-item' + extra + '">' + it + '</span>';
    });
  } else {
    html += '<span class="yiji-item yiji-none">诸事平</span>';
  }
  html += '</div></div>';

  // 忌
  html += '<div class="yiji-row yiji-bad">';
  html += '<span class="yiji-label">忌</span>';
  html += '<div class="yiji-items">';
  if (ji.length) {
    ji.forEach(function(it) {
      var extra = (it.indexOf('（大红砂') >= 0 || it.indexOf('（小红砂') >= 0) ? ' yiji-extra' : '';
      html += '<span class="yiji-item' + extra + '">' + it + '</span>';
    });
  } else {
    html += '<span class="yiji-item yiji-none">无特别所忌</span>';
  }
  html += '</div></div>';

  html += '</div></div>';
  return html;
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

/** 古籍释义内联块（动态：kind='duty'|'nine'，key=当日值星名） */
function renderClassic(kind, key) {
  var text = '', src = '';
  if (kind === 'duty') { text = DUTY_CLASSIC[key] || ''; src = DUTY_CLASSIC_SRC; }
  else if (kind === 'nine') { text = NINE_CLASSIC[key] || ''; src = NINE_CLASSIC_SRC; }
  else { text = HUANGDAO_CLASSIC[key] || ''; src = HUANGDAO_CLASSIC_SRC; }
  if (!text) return '';
  return '<div class="classic-inline">' +
    '<div class="classic-inline-head"><i class="ti ti-book-2"></i> 古籍释义</div>' +
    '<p class="classic-text">' + text + '</p>' +
    '<p class="classic-src">—— ' + src + '</p>' +
  '</div>';
}

/** 建除值神 + 九星值日 — 合并单值卡（每天各只显示一个值，附内联古籍释义） */
function renderDutyNine(dat) {
  var jc = dat.jianchu || '';
  var jcGood = DUTY12_GOOD2[jc];
  var nine = dat.nineStar || null;
  var html = '<div class="card dp-reveal-item" data-card-id="duty-nine">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-building-castle"></i> 建除值神 · 九星值日</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';

  // ── 建除值神（单值）──
  if (jc) {
    html += '<div class="dn-row">';
    html += '<div class="dn-emblem ' + (jcGood ? 'good' : 'bad') + '">' + jc + '</div>';
    html += '<div class="dn-main">';
    html += '<div class="dn-top"><span class="dn-kicker">建除值神</span><span class="dn-verdict ' + (jcGood ? 'good' : 'bad') + '">' + (jcGood ? '黄道' : '黑道') + '</span></div>';
    html += '<p class="dn-mean">' + (DUTY12_MEANING2[jc] || '') + '</p>';
    html += renderClassic('duty', jc);
    html += '</div></div>';
  }
  html += '<div class="dn-divider"></div>';
  // ── 九星值日（单值）──
  if (nine && nine.name) {
    var nGood = nine.good;
    html += '<div class="dn-row">';
    html += '<div class="dn-emblem ' + (nGood ? 'good' : 'bad') + '">' + nine.name + '</div>';
    html += '<div class="dn-main">';
    html += '<div class="dn-top"><span class="dn-kicker">九星值日</span><span class="dn-verdict ' + (nGood ? 'good' : 'bad') + '">' + (nGood ? '吉星' : '凶星') + '</span></div>';
    html += '<p class="dn-mean">' + (nine.meaning || '') + '</p>';
    html += renderClassic('nine', nine.name);
    html += '</div></div>';
  }
  html += '</div></div>';
  return html;
}

function renderShichen(dat) {
  var scData = dat.shichen || [];
  if (!scData.length) return '';

  var now = new Date();
  var curHour = now.getHours();
  var curSC = Math.floor(((curHour + 1) % 24) / 2);
  var cur = scData[curSC] || scData[0];

  var god = cur.god || '';
  var isGood = (typeof cur.yellow === 'boolean') ? cur.yellow : (HUANGDAO_GOOD[god] === true);
  var timeRange = (cur.full || '').split(/[：:]/)[1] || '';
  var branchLabel = (cur.branch || '') + '时';

  var html = '<div class="card dp-reveal-item" data-card-id="shichen">';
  html += '<div class="card-header" onclick="window.toggleCardCollapse(this)"><span><i class="ti ti-clock"></i> 当前时辰值神</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body">';
  html += '<div class="dn-row">';
  html += '<div class="dn-emblem ' + (isGood ? 'good' : 'bad') + '">' + god + '</div>';
  html += '<div class="dn-main">';
  html += '<div class="dn-top"><span class="dn-kicker">当前时辰值神</span><span class="dn-verdict ' + (isGood ? 'good' : 'bad') + '">' + (isGood ? '黄道' : '黑道') + '</span></div>';
  html += '<div class="dn-sub">' + branchLabel + ' · ' + timeRange + '</div>';
  html += '<p class="dn-mean">' + (HUANGDAO_MEANING[god] || '') + '</p>';
  html += renderClassic('huangdao', god);
  html += '</div></div>';
  html += '</div></div>';

  return html;
}

// (renderNineStar 已移除：改由 renderDutyNine 合并单值渲染)


/** 构建神煞分组（吉/凶），超量自动折叠 + 「展开全部 N 位」
 *  @param meta 可选 { 神煞名: {xiejì,def,diff,isDiff} }（来自 /calendar/day 的 godsMeta），
 *              命中时渲染 title(tooltip) 与「流派差异」小标记 */
function buildSsGroup(titleText, titleCls, names, tagCls, meta) {
  var THRESHOLD = 12;
  var total = names ? names.length : 0;
  var tagsHtml = '';
  if (total === 0) {
    tagsHtml = '<span class="cosmic-ss-count">无</span>';
  } else {
    for (var i = 0; i < total; i++) {
      var nm = names[i];
      var m = (meta && meta[nm]) || null;
      var cls = 'cosmic-ss-tag ' + tagCls + (m ? ' has-source' : '') + (m && m.corrected ? ' is-corrected' : '');
      var attr = '';
      if (m) {
        attr += ' title="' + escAttr(_metaTip(m)) + '"';
        attr += ' data-tip="' + escAttr(_metaTip(m)) + '"';
      }
      var mark = '';
      if (m) {
        if (m.isDiff) mark = '<i class="ti ti-alert-triangle ss-tag-diff" aria-hidden="true"></i>';
        else if (m.corrected) mark = '<i class="ti ti-circle-check ss-tag-corrected" aria-hidden="true"></i>';
      }
      tagsHtml += '<span class="' + cls + '"' + attr + '>' + nm + mark + '</span>';
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

  // 吉神/凶煞标签墙（全部，超量折叠）；godsMeta 提供协纪出处/差异 tooltip
  var gh = buildSsGroup('◇ 吉神', 'good-title', dat.goodGods, 'good-tag', dat.godsMeta);
  var bh = buildSsGroup('◆ 凶煞', 'bad-title', dat.badGods, 'bad-tag', dat.godsMeta);
  html += '<div class="cosmic-shensha-wrap">' + gh + bh + '</div>';
  html += '</div></div>';

  return html;
}

export default { init: init, show: show, hide: hide, toggle: toggle, isOpen: isOpen };
