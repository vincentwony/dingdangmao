// web/js/bazi-interact.js — 八字大运/流年/流月 互动联动
// 为 bzinfo HTML 中的 onclick="ChangeLn(n)" 等提供运行时支持

// ══════ 全局状态（唯一源：window.State.getCache('bazi:result')） ══════
var _selectedDayunIndex = -1;
var _selectedLiunianYear = null;

// 简易 DOMCache
var _domCache = {};
function _dc(id) {
  if (_domCache[id]) return _domCache[id];
  _domCache[id] = document.getElementById(id);
  return _domCache[id];
}

// ══════ 天干地支常量（优先用 window.Lunar，不可用时回退本地副本） ══════
var _L = (typeof window !== 'undefined' && window.Lunar) || null;
var _G = (_L && _L.Gan) || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var _Z = (_L && _L.Zhi) || ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var _CANG = (_L && _L.CangGan) || ['癸','己癸辛','甲丙戊','乙','戊乙癸','丙庚戊','丁','己丁乙','庚壬戊','辛','戊辛丁','壬甲'];
var _ssName = (_L && _L.sshen) || function(b3, ganIdx) {
  var names = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];
  if (b3 % 2 === 0) return names[(ganIdx - b3 + 10) % 10] || '';
  var A = [1,0,3,2,5,4,7,6,9,8];
  return names[A[(ganIdx - b3 + 11) % 10]] || '';
};

// ══════ 辅助函数 ══════
function _ganColorClass(g) {
  var m = {0:'bt-green',1:'bt-green',2:'bt-red',3:'bt-red',4:'bt-orange',5:'bt-orange',6:'bt-gold',7:'bt-gold',8:'bt-blue',9:'bt-blue'};
  return m[g] || '';
}
function _zhiColorClass(z) {
  var m = {0:'bt-br-blue',1:'bt-br-orange',2:'bt-br-green',3:'bt-br-green',4:'bt-br-orange',5:'bt-br-red',6:'bt-br-red',7:'bt-br-orange',8:'bt-br-gold',9:'bt-br-gold',10:'bt-br-orange',11:'bt-br-blue'};
  return m[z] || '';
}
function _ganFullName(c) {
  var m = {'甲':'甲木','乙':'乙木','丙':'丙火','丁':'丁火','戊':'戊土','己':'己土','庚':'庚金','辛':'辛金','壬':'壬水','癸':'癸水'};
  return m[c] || c;
}

// ══════ 神煞 ══════
var SHENSHA_NAMES = ['太岁','太阳','丧门','太阴','官符','死符','岁破','龙德','白虎','福德','吊客','病符'];
var SHENSHA_DETAIL = [
  '太岁运年难行舟，口舌临门不自由；疾病缠身小人侵，婚姻钱财莫强求。',
  '青龙入命大吉祥，创业谋事有人帮；添人进口生贵子，家中喜事一桩桩。',
  '丧门运年心不安，求财望喜多枉然；不是伤人就损财，忧思重重又一年。',
  '六合入命大吉昌，万事顺遂人丁旺；多得亲友来扶助，添喜进财时运强。',
  '官符入命令人愁，是非口舌无止休；平地也会起风波，忧思如麻不断头。',
  '小耗之年多烦恼，是非口舌几多遭；官非易起气易惹，金银钱财有损耗。',
  '年逢大耗祸非轻，官司窃骗容易生；不是破财遭凶事，就是体弱染病行。',
  '朱雀入命是非生，风波扰得心不宁；幸喜紫薇当头照，逢凶化吉保太平。',
  '白虎入命最凶险，血光伤疾度难关；更有内外孝服事，天灾横祸心难安。',
  '贵神入命福寿长，财运畅通身安康；善与人交受人敬，高官厚禄名远扬。',
  '吊客流年也为凶，又见亲人病愁容；求财谋利难如意，晦气飘来几多重。',
  '病符入命心不宁，硬汉也怕病缠身；办事处事心不顺，朝朝暮暮起愁云。'
];
var LIUYUE_SHENSHA = ['太岁','青龙','丧门','六合','官符','小耗','大耗','朱雀','白虎','贵神','吊客','病符'];

// 十二命宫星性（据《星平会海》命宫卷）
var MINGGONG_STAR_NAMES = ['天贵星','天厄星','天权星','天破星','天奸星','天文星','天福星','天驿星','天孤星','天刃星','天艺星','天寿星'];
var MINGGONG_STAR_KOUJUE = [
  '子宫天贵志不凡，自视清高在命间，得时国家能重用，失时贵人到近前，生来心慈面又软，晚年信教奉佛仙。',
  '丑宫天厄出生难，劳心劳力在命间，祖业家产难依靠，自力更生创家园，初年中年一个样，晚年福禄胜从前。',
  '寅宫天权最聪明，能文能武在命中，中年就有权合柄，一生衣禄必享通，为人一生人缘好，博得上司来器重。',
  '卯宫天赦最慷慨，处事仗义来疏财，生来为人最抗上，虚伪之人合不来，好打人间不平事，专为人家耗钱财。',
  '辰宫天刚智谋多，处事总是返得着，此人多能又多变，一生婚姻有波折，为人生来最好事，背后净说人家呵。',
  '巳宫天文命最佳，文学创作能振发，女命能把贵夫得，夫唱妻随享荣华，初年不如中年好，晚年富贵胜仙家。',
  '午宫天福命最强，荣华富贵在命上，遇着大事能化小，遇着小事保安康，处事为人心肠软，如同佛道好心肠。',
  '未宫天驿始不安，一生劳碌在命间，离祖成家为上策，自力更生创家园，为人心胸狭又窄，纵然人闲心不闲。',
  '申宫天孤别早婚，早婚必是二婚人，男命离婚应再娶，女命必嫁二夫君，为人人缘还不错，一生能遇外遇人。',
  '酉宫天秘有事非，仗义疏财把人围，生来为人决心大，常因贪心好吃亏，事业经营走正路，以小失大把钱赔。',
  '戌宫天艺性平合，为人生来话不多，艺道成名为上策，生来不让人家说，此人财运倒不错，平平安安度生活。',
  '亥宫天寿有慈心，克己奉公能助人，走遍天下有人敬，此人本是大命人，福如东海长流水，寿比南极一老人。'
];

function _buildShenshaCell(name, detail, text) {
  text = text || name;
  return '<span class="bt-shensha-cell" onclick="_showShenshaDetail(\'' + name + '\',\'' + detail.replace(/'/g,"\\'") + '\',event)" title="点击查看吉凶详诀">' + text + '</span>';
}
function _showShenshaDetail(name, detail, evt) {
  var popup = document.getElementById('shensha-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'shensha-popup';
    popup.className = 'shensha-popup';
    document.body.appendChild(popup);
  }
  popup.innerHTML = '<div class="shensha-popup-title">' + name + '</div><div class="shensha-popup-body">' + detail + '</div>';
  popup.style.display = 'block';
  var x = Math.min(Math.max(evt.clientX - 110, 10), window.innerWidth - 270);
  popup.style.left = x + 'px';
  popup.style.top = (evt.clientY - 60) + 'px';
  setTimeout(function() { popup.style.display = 'none'; }, 4000);
}
// 确保 onclick="_showShenshaDetail(...)" 在任何脚本加载模式下可用
window._showShenshaDetail = _showShenshaDetail;

// ══════ 流年表渲染 ══════
var LIUNIAN_LABELS = ['主星','天干','地支','藏干','副星','星运','命宫太岁','流年','年龄'];
var ZHANGSHENG_NAMES = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];

function renderLiunianTable(ob, startYear, numYears, MGxh, startAge) {
  numYears = numYears || 10; startAge = startAge || 1;
  var b3 = ob.b3 % 10, mgZhiIdx = MGxh % 12;
  var lnss=[], lntg=[], lndz=[], lnzs=[], lnns=[], lnsus=[], lnsha=[];
  var lnsi=[], lnbi=[], lncgg=[], lncgs=[];  // 预计算索引和藏干数据
  for (var uo=0; uo<numYears; uo++) {
    var year=startYear+uo, y=year-1984+9000;
    var sIdx=y%10, bIdx=y%12, zIdx=bIdx;
    lnsi[uo]=sIdx; lnbi[uo]=bIdx;
    lnss[uo]=_ssName(b3,sIdx); lntg[uo]=_G[sIdx]; lndz[uo]=_Z[bIdx];
    lnzs[uo]=ZHANGSHENG_NAMES[(b3+bIdx)%12]||'';
    lnns[uo]=String(year); lnsus[uo]=String(startAge+uo);
    lnsha[uo]=(mgZhiIdx-bIdx+12)%12;
    // 预计算藏干（避免内层循环重复 indexOf）
    var cg=_CANG[bIdx]||'', cgg=[], cgs=[];
    for (var j=0; j<cg.length; j++) { cgg[j]=_G.indexOf(cg.charAt(j)); cgs[j]=_ssName(b3,cgg[j]); }
    lncgg[uo]=cgg; lncgs[uo]=cgs;
  }
  var thCells='<th class="bt-th-label"></th>';
  for (var uo=0; uo<numYears; uo++) thCells+='<th class="bt-dy-th" onclick="selectLiunianYear('+lnns[uo]+')" style="cursor:pointer">'+lnns[uo]+'</th>';
  var rows='';
  for (var i=0; i<LIUNIAN_LABELS.length; i++) {
    var tdCells='';
    for (var uo=0; uo<numYears; uo++) {
      var cell='', ganIdx=lnsi[uo], zhiIdx=lnbi[uo], cgStr=_CANG[zhiIdx]||'';
      if (i===0) cell='<span class="bt-main-star">'+lnss[uo]+'</span>';
      else if (i===1) cell='<span class="'+_ganColorClass(ganIdx)+'">'+lntg[uo]+'</span>';
      else if (i===2) cell='<span class="'+_zhiColorClass(zhiIdx)+'">'+lndz[uo]+'</span>';
      else if (i===3) { var cgg=lncgg[uo]||[]; for (var j=0; j<cgStr.length; j++) cell+='<div class="bt-hidden-star bt-cg-'+j+'">'+_ganFullName(cgStr.charAt(j))+'</div>'; }
      else if (i===4) { var cgs=lncgs[uo]||[]; for (var j=0; j<cgStr.length; j++) cell+='<div class="bt-hidden-star bt-cs-'+j+'">'+cgs[j]+'</div>'; }
      else if (i===5) cell=lnzs[uo];
      else if (i===6) cell=_buildShenshaCell(SHENSHA_NAMES[lnsha[uo]],SHENSHA_DETAIL[lnsha[uo]]);
      else if (i===7) cell=lnns[uo];
      else if (i===8) cell=lnsus[uo];
      tdCells+='<td>'+cell+'</td>';
    }
    rows+='<tr class="bt-dy-row-'+i+'"><td class="bt-label">'+LIUNIAN_LABELS[i]+'</td>'+tdCells+'</tr>';
  }
  return '<div class="bt-card bt-dy-card"><div class="bt-title">大运流年 · '+startYear+'—'+(startYear+numYears-1)+'</div><div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-ln-table"><thead><tr>'+thCells+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ══════ 流月表渲染 ══════
function renderLiuyueTable(ob, liunianYear, MGxh) {
  var ZHI_DUSHU=[11,12,1,2,3,4,5,6,7,8,9,10];
  var MONTHS=['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  var mgZ=MGxh%12, birthZ=ob.b1%12, lnZ=(liunianYear-1984+9000)%12;
  var xx=ZHI_DUSHU[mgZ]+ZHI_DUSHU[birthZ]-ZHI_DUSHU[lnZ];
  while(xx<1)xx+=12; while(xx>12)xx-=12;
  var xxZ=(xx+1)%12, mZi=[];
  for (var m=0; m<12; m++) mZi[m]=(xxZ-m+12)%12;
  var th='<th class="bt-th-label"></th>';
  for (var m=0; m<12; m++) th+='<th class="bt-dy-th">'+MONTHS[m]+'</th>';
  var rows='', td='';
  for (var m=0; m<12; m++) td+='<td><span class="'+_zhiColorClass(mZi[m])+'">'+_Z[mZi[m]]+'</span></td>';
  rows+='<tr class="bt-dy-row-0"><td class="bt-label">地支</td>'+td+'</tr>';
  td='';
  for (var m=0; m<12; m++) td+='<td>'+_buildShenshaCell(LIUYUE_SHENSHA[m],SHENSHA_DETAIL[m])+'</td>';
  rows+='<tr class="bt-dy-row-1"><td class="bt-label">神煞</td>'+td+'</tr>';
  return '<div class="bt-card bt-dy-card"><div class="bt-title">流月 · '+liunianYear+'年（小限'+_Z[xxZ]+'）</div><div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-ly-table"><thead><tr>'+th+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

// ══════ 十二命宫星性渲染 ══════
function renderMinggongXingxingTable(ob, MGxh) {
  var mgZhiIdx = MGxh % 12;
  var thCells = '<th class="bt-th-label"></th>';
  for (var i = 0; i < 12; i++) {
    var hCls = (i === mgZhiIdx) ? ' bt-mg-highlight' : '';
    thCells += '<th class="bt-dy-th' + hCls + '">' + _Z[i] + '</th>';
  }
  var tdCells = '';
  for (var i = 0; i < 12; i++) {
    var hCls = (i === mgZhiIdx) ? ' bt-mg-highlight' : '';
    tdCells += '<td class="' + hCls + '">' + _buildShenshaCell(MINGGONG_STAR_NAMES[i], MINGGONG_STAR_KOUJUE[i]) + '</td>';
  }
  var rows = '<tr class="bt-dy-row-0"><td class="bt-label">星名</td>' + tdCells + '</tr>';
  return '<div class="bt-card bt-dy-card">'
    + '<div class="bt-title">十二命宫星性 · 本命' + _Z[mgZhiIdx] + '（' + MINGGONG_STAR_NAMES[mgZhiIdx] + '）</div>'
    + '<div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-mg-table">'
    + '<thead><tr>' + thCells + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';
}

// ══════ 辅助：插入或替换卡片（消除 ChangeLn 三处重复） ══════
// ══════ 辅助：插入或替换卡片（消除 ChangeLn 三处重复） ══════
function _upsertCard(resultView, id, html, tableSel, afterId) {
  var el = document.getElementById(id);
  if (el) { el.innerHTML = html; return; }
  el = document.createElement('div'); el.id = id;
  el.innerHTML = html;
  var cards = resultView.querySelectorAll('.bt-card');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].querySelector(tableSel)) {
      cards[i].parentNode.replaceChild(el, cards[i]);
      return;
    }
  }
  if (afterId) {
    var after = document.getElementById(afterId);
    if (after && after.parentNode) after.parentNode.insertBefore(el, after.nextSibling);
  }
}

// ══════ ChangeLn — 切换大运（bzinfo onclick 调用）══════
window.ChangeLn = function(n) {
  var cached = window.State.getCache('bazi:result') || {};
  var ob = cached.ob;
  var MGxh = cached.MGxh || 0;
  if (!ob || !ob.dayun || !ob.dayun.dyn) return;

  var startYear = parseInt(ob.dayun.dyn[n], 10);
  if (isNaN(startYear)) return;
  var startAge = (parseInt(ob.dayun.qnian||'0',10)||1) + n * 10;

  var resultView = document.getElementById('baziResultArea');
  if (!resultView) return;

  // 重新生成三张联动卡片
  _upsertCard(resultView, 'baziLiunian',  renderLiunianTable(ob, startYear, 10, MGxh, startAge), '.bt-ln-table', null);
  _upsertCard(resultView, 'baziLiuyue',   renderLiuyueTable(ob, startYear, MGxh),               '.bt-ly-table', 'baziLiunian');
  _upsertCard(resultView, 'baziMinggong', renderMinggongXingxingTable(ob, MGxh),                '.bt-mg-table', 'baziLiuyue');

  // 十年大运 — 高亮选中列
  var dyTable = resultView.querySelector('.bt-dy-table');
  if (dyTable) {
    var ths = dyTable.querySelectorAll('thead th.bt-dy-th');
    for (var t = 0; t < ths.length; t++) ths[t].classList.remove('bt-dy-active');
    if (ths[n]) ths[n].classList.add('bt-dy-active');
    var tds = dyTable.querySelectorAll('tbody td:nth-child(' + (n + 2) + ')');
    for (var u = 0; u < tds.length; u++) tds[u].classList.add('bt-dy-active');
  }
};

// ══════ selectLiunianYear — 选中流年（流年表 onclick 调用）══════
window.selectLiunianYear = function(year) {
  var cached = window.State.getCache('bazi:result') || {};
  var ob = cached.ob;
  var MGxh = cached.MGxh || 0;
  if (!ob) return;
  _selectedLiunianYear = year;
  var lyHtml = renderLiuyueTable(ob, year, MGxh);
  var lyEl = document.getElementById('baziLiuyue');
  if (!lyEl) {
    lyEl = document.createElement('div'); lyEl.id = 'baziLiuyue';
    var lnEl = document.getElementById('baziLiunian');
    if (lnEl && lnEl.parentNode) lnEl.parentNode.insertBefore(lyEl, lnEl.nextSibling);
  }
  if (lyEl) lyEl.innerHTML = lyHtml;
};

console.log('[bazi-interact] 就绪 ChangeLn=' + typeof window.ChangeLn + ' selectLiunianYear=' + typeof window.selectLiunianYear);
