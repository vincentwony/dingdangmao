// 辅助函数从全局注入（core/lunar.js 在 vm.runInThisContext 前设置）
var _ganColorClass = global._sd_ganColorClass;
var _zhiColorClass = global._sd_zhiColorClass;
var _ganFullName = global._sd_ganFullName;
var SHENSHA_NAMES = global._sd_SHENSHA_NAMES;
var SHENSHA_DETAIL = global._sd_SHENSHA_DETAIL;
var LIUYUE_SHENSHA = global._sd_LIUYUE_SHENSHA;
var MINGGONG_STAR_NAMES = global._sd_MINGGONG_STAR_NAMES;
var MINGGONG_STAR_KOUJUE = global._sd_MINGGONG_STAR_KOUJUE;

function _kongwangText(b) {
  var k = ['戌亥','申酉','午未','辰巳','寅卯','子丑'];
  var s = b % 10;
  var z = b % 12;
  var i = s;
  while (i % 12 !== z) i += 10;
  return k[Math.floor(i/10)] || '';
}
function _ziZuoText(b) {
  return Lunar.ZhangSheng[Lunar.ZhshengS(b%10,b%12)];
}
function _stripTags(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, '');
}
function _ganEmoji(g) {
  var map = {0:'🍂',1:'🍂',2:'🔥',3:'🔥',4:'🏔️',5:'🏔️',6:'⚜️',7:'⚜️',8:'💧',9:'💧'};
  return map[g] || '';
}
function _splitCangGan(s) {
  if (!s) return [];
  var raw = _stripTags(s);
  var result = [];
  for (var i = 0; i < raw.length; i++) {
    result.push(_ganFullName(raw.charAt(i)));
  }
  return result;
}
function _splitFuXing(s) {
  if (!s) return [];
  var raw = _stripTags(s);
  var result = [];
  // 副星每字后可能有十神名，每2字符为一组
  var parts = raw.match(/[^\x00-\xff]{2}/g);
  if (parts) return parts;
  // 回退：每2字符一组
  for (var i = 0; i < raw.length; i += 2) {
    result.push(raw.substring(i, Math.min(i + 2, raw.length)));
  }
  return result;
}
// 专业细盘表格渲染
// 神煞竖排渲染 — 按吉凶着色
var _SHENSHA_JI_MAP = null;
var _SHENSHA_XIONG_MAP = null;
function _buildShenshaMaps() {
  if (_SHENSHA_JI_MAP) return;
  _SHENSHA_JI_MAP = {};
  _SHENSHA_XIONG_MAP = {};
  var ji = '天乙,太极,禄神,文昌,金舆,国印,将星,华盖,驿马,学堂,词馆,红鸾,天喜,天医,天德,天德合,月德,天赦,禄马同乡（日坐财官）,禄马同乡（年禄年马同支）'.split(',');
  var xiong = '红艳,流霞,羊刃,桃花,劫煞,孤辰,寡宿,灾煞,六厄,大耗,勾煞,绞煞,天罗,地网,空亡,亡神,魁罡,日刃,金神,阴差阳错,四废'.split(',');
  for (var i = 0; i < ji.length; i++) _SHENSHA_JI_MAP[ji[i]] = 1;
  for (var i = 0; i < xiong.length; i++) _SHENSHA_XIONG_MAP[xiong[i]] = 1;
}
function _formatShensha(s) {
  if (!s) return '';
  _buildShenshaMaps();
  var names = s.replace(/[\s　]+/g, ' ').trim().split(' ');
  var html = '<div class="bt-shensha-wrap">';
  for (var i = 0; i < names.length; i++) {
    var n = names[i].trim();
    if (!n) continue;
    var cls = 'bt-shensha-item';
    if (_SHENSHA_JI_MAP[n]) cls += ' bt-ss-ji';
    else if (_SHENSHA_XIONG_MAP[n]) cls += ' bt-ss-xiong';
    html += '<span class="' + cls + '">' + n + '</span>';
  }
  html += '</div>';
  return html;
}

function renderBaziTable(ob) {
  var sz = ob._sz;
  var gg = ob._gg || ['','','',''];
  var labels = ['主星','天干','地支','藏干','副星','星运','自坐','空亡','纳音','神煞'];
  var idx = [ob.b1, ob.b2, ob.b3, ob.b4];

  var gss = [];
  for (var p = 0; p < 4; p++) {
    gss[p] = _stripTags(sz.gss[p]) || '';
  }

  var gan = [];
  var zhi = [];
  for (var p = 0; p < 4; p++) {
    gan[p] = Lunar.Gan[idx[p]%10];
    zhi[p] = Lunar.Zhi[idx[p]%12];
  }

  var cgArr = [];
  for (var p = 0; p < 4; p++) {
    cgArr[p] = _splitCangGan(sz.cg[p]);
  }

  var csArr = [];
  for (var p = 0; p < 4; p++) {
    csArr[p] = _splitFuXing(sz.cs[p]);
  }

  var zsArr = [];
  for (var p = 0; p < 4; p++) {
    zsArr[p] = sz.zs[p] || '';
  }

  var nyArr = [];
  for (var p = 0; p < 4; p++) {
    nyArr[p] = sz.ny[p] || '';
  }

  var rows = '';
  for (var i = 0; i < labels.length; i++) {
    var label = labels[i];
    var tdCells = '';
    for (var p = 0; p < 4; p++) {
      var cellContent = '';
      if (i === 0) { // 主星
        cellContent = '<span class="bt-main-star">' + gss[p] + '</span>';
      } else if (i === 1) { // 天干
        cellContent = '<span class="' + _ganColorClass(idx[p]%10) + '">' + gan[p] + '</span>';
      } else if (i === 2) { // 地支
        cellContent = '<span class="' + _zhiColorClass(idx[p]%12) + '">' + zhi[p] + '</span>';
      } else if (i === 3) { // 藏干
        for (var j = 0; j < cgArr[p].length; j++) {
          cellContent += '<div class="bt-hidden-star bt-cg-' + j + '">' + cgArr[p][j] + '</div>';
        }
      } else if (i === 4) { // 副星
        for (var j = 0; j < csArr[p].length; j++) {
          cellContent += '<div class="bt-hidden-star bt-cs-' + j + '">' + csArr[p][j] + '</div>';
        }
      } else if (i === 5) { // 星运
        cellContent = zsArr[p];
      } else if (i === 6) { // 自坐
        cellContent = _ziZuoText(idx[p]);
      } else if (i === 7) { // 空亡
        cellContent = _kongwangText(idx[p]);
      } else if (i === 8) { // 纳音
        cellContent = '<span style="font-size:11px">' + nyArr[p] + '</span>';
      } else if (i === 9) { // 神煞 — 竖排，按吉凶着色
        cellContent = _formatShensha(gg[p]);
      }
      var tdClass = (p === 2) ? ' bt-col-day' : '';
      tdCells += '<td class="bt-td' + tdClass + '">' + cellContent + '</td>';
    }
    rows += '<tr class="bt-row-' + i + '"><td class="bt-label">' + label + '</td>' + tdCells + '</tr>';
  }

  var html = ''
    + '<div class="bt-card">'
    + '<div class="bt-title">八字专业细盘</div>'
    + '<table class="bt-table">'
    + '<thead><tr>'
    + '<th class="bt-th-label"></th>'
    + '<th class="bt-th">年柱</th>'
    + '<th class="bt-th">月柱</th>'
    + '<th class="bt-th bt-col-day">日柱</th>'
    + '<th class="bt-th">时柱</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table>'
    + '</div>';

  return html;
}
function renderDayunTable(ob) {
  var sz = ob._sz;
  var labels = ['主星','天干','地支','藏干','副星','星运','行运','行运年'];

  var thCells = '<th class="bt-th-label"></th>';
  for (var uo = 0; uo < 12; uo++) {
    thCells += '<th class="bt-dy-th" style="cursor:pointer" onclick="ChangeLn(' + uo + ')">第' + (uo + 1) + '运</th>';
  }

  var rows = '';
  for (var i = 0; i < labels.length; i++) {
    var tdCells = '';
    for (var uo = 0; uo < 12; uo++) {
      var cell = '';
      var zhiChar = sz.dyz[uo];
      var zhiIdx = Lunar.Zhi.indexOf(zhiChar);
      var cgStr = Lunar.CangGan[zhiIdx] || '';

      if (i === 0) {
        cell = '<span class="bt-main-star">' + _stripTags(sz.dyss[uo] || '') + '</span>';
      } else if (i === 1) {
        var ganIdx = Lunar.Gan.indexOf(sz.dyg[uo]);
        cell = '<span class="' + _ganColorClass(ganIdx) + '">' + sz.dyg[uo] + '</span>';
      } else if (i === 2) {
        cell = '<span class="' + _zhiColorClass(zhiIdx) + '">' + zhiChar + '</span>';
      } else if (i === 3) {
        for (var j = 0; j < cgStr.length; j++) {
          cell += '<div class="bt-hidden-star bt-cg-' + j + '">' + _ganFullName(cgStr.charAt(j)) + '</div>';
        }
      } else if (i === 4) {
        for (var j = 0; j < cgStr.length; j++) {
          var cIdx = Lunar.Gan.indexOf(cgStr.charAt(j));
          cell += '<div class="bt-hidden-star bt-cs-' + j + '">' + Lunar.sshen(ob.b3, cIdx) + '</div>';
        }
      } else if (i === 5) {
        cell = sz.dyzs[uo] || '';
      } else if (i === 6) {
        cell = sz.dys[uo] || '';
      } else if (i === 7) {
        cell = '<a href="javascript:void(0);" onclick="ChangeLn(' + uo + ');" class="xhx" style="color:#b2955d;">' + (sz.dyn[uo] || '') + '</a>';
      }
      tdCells += '<td>' + cell + '</td>';
    }
    rows += '<tr class="bt-dy-row-' + i + '"><td class="bt-label">' + labels[i] + '</td>' + tdCells + '</tr>';
  }

  return '<div class="bt-card bt-dy-card">'
    + '<div class="bt-title">十年大运</div>'
    + '<div class="scroll-x-touch"><table class="bt-table bt-dy-table">'
    + '<thead><tr>' + thCells + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';
}

// 十二神煞/命宫/流月常量 → 已迁移至 ./shensha-data.js

function _buildShenshaCell(name, detail, text) {
  text = text || name;
  return '<span class="bt-shensha-cell" onclick="_showShenshaDetail(\'' + name + '\',\'' + detail.replace(/'/g,"\\'") + '\',event)" title="点击查看吉凶详诀">' + text + '</span>';
}
function _showShenshaDetail(name, detail, evt) {
  var popup = DOMCache.get('shensha-popup');
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
  popup.style.top = Math.max(evt.clientY - 130, 10) + 'px';
  clearTimeout(popup._timer);
  popup._timer = setTimeout(function(){ popup.style.display = 'none'; }, 5000);
  evt.stopPropagation();
}
document.addEventListener('click', function(e){
  var popup = DOMCache.get('shensha-popup');
  if (popup && !e.target.closest('.bt-shensha-cell')) {
    popup.style.display = 'none';
  }
});
function renderLiunianTable(ob, startYear, numYears, MGxh, startAge) {
  numYears = numYears || 60;
  startAge = startAge || 1;
  var labels = ['主星','天干','地支','藏干','副星','星运','命宫太岁','流年','年龄'];
  var b3 = ob.b3;
  var mgZhiIdx = MGxh % 12;

  // 预生成60年数据
  var lnss = [], lntg = [], lndz = [], lnzs = [], lnns = [], lnsus = [], lnsha = [];
  for (var uo = 0; uo < numYears; uo++) {
    var year = startYear + uo;
    var y = year - 1984 + 9000;
    var stemIdx = y % 10;
    var branchIdx = y % 12;
    lnss[uo] = Lunar.sshen(b3, stemIdx);
    lntg[uo] = Lunar.Gan[stemIdx];
    lndz[uo] = Lunar.Zhi[branchIdx];
    lnzs[uo] = Lunar.ZhangSheng[Lunar.ZhshengS(b3, stemIdx)];
    lnns[uo] = String(year);
    lnsus[uo] = String(startAge + uo);
    lnsha[uo] = (mgZhiIdx - branchIdx + 12) % 12;
  }

  var thCells = '<th class="bt-th-label"></th>';
  for (var uo = 0; uo < numYears; uo++) {
    thCells += '<th class="bt-dy-th" onclick="selectLiunianYear(' + lnns[uo] + ')" style="cursor:pointer">' + lnns[uo] + '</th>';
  }

  var rows = '';
  for (var i = 0; i < labels.length; i++) {
    var tdCells = '';
    for (var uo = 0; uo < numYears; uo++) {
      var cell = '';
      var zhiIdx = Lunar.Zhi.indexOf(lndz[uo]);
      var cgStr = (zhiIdx >= 0) ? Lunar.CangGan[zhiIdx] : '';
      var ganIdx = Lunar.Gan.indexOf(lntg[uo]);

      if (i === 0) {
        cell = '<span class="bt-main-star">' + lnss[uo] + '</span>';
      } else if (i === 1) {
        cell = '<span class="' + _ganColorClass(ganIdx) + '">' + lntg[uo] + '</span>';
      } else if (i === 2) {
        cell = '<span class="' + _zhiColorClass(zhiIdx) + '">' + lndz[uo] + '</span>';
      } else if (i === 3) {
        for (var j = 0; j < cgStr.length; j++) {
          cell += '<div class="bt-hidden-star bt-cg-' + j + '">' + _ganFullName(cgStr.charAt(j)) + '</div>';
        }
      } else if (i === 4) {
        for (var j = 0; j < cgStr.length; j++) {
          var cIdx = Lunar.Gan.indexOf(cgStr.charAt(j));
          cell += '<div class="bt-hidden-star bt-cs-' + j + '">' + Lunar.sshen(b3, cIdx) + '</div>';
        }
      } else if (i === 5) {
        cell = lnzs[uo];
      } else if (i === 6) {
        var shaIdx = lnsha[uo];
        cell = _buildShenshaCell(SHENSHA_NAMES[shaIdx], SHENSHA_DETAIL[shaIdx]);
      } else if (i === 7) {
        cell = lnns[uo];
      } else if (i === 8) {
        cell = lnsus[uo];
      }
      tdCells += '<td>' + cell + '</td>';
    }
    rows += '<tr class="bt-dy-row-' + i + '"><td class="bt-label">' + labels[i] + '</td>' + tdCells + '</tr>';
  }

  return '<div class="bt-card bt-dy-card">'
    + '<div class="bt-title">大运流年 · ' + startYear + '—' + (startYear + numYears - 1) + '</div>'
    + '<div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-ln-table">'
    + '<thead><tr>' + thCells + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';
}
function renderLiuyueTable(ob, liunianYear, MGxh) {
  var ZHI_DUSHU = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var MONTH_LABELS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  var mgZhiIdx = MGxh % 12;
  var birthZhiIdx = ob.b1 % 12;
  var liunianZhiIdx = (liunianYear - 1984 + 9000) % 12;
  var xiaoxianDushu = ZHI_DUSHU[mgZhiIdx] + ZHI_DUSHU[birthZhiIdx] - ZHI_DUSHU[liunianZhiIdx];
  while (xiaoxianDushu < 1) xiaoxianDushu += 12;
  while (xiaoxianDushu > 12) xiaoxianDushu -= 12;
  var xiaoxianZhiIdx = (xiaoxianDushu + 1) % 12;
  var monthZhiIdx = [];
  for (var m = 0; m < 12; m++) {
    monthZhiIdx[m] = (xiaoxianZhiIdx - m + 12) % 12;
  }

  var thCells = '<th class="bt-th-label"></th>';
  for (var m = 0; m < 12; m++) {
    thCells += '<th class="bt-dy-th">' + MONTH_LABELS[m] + '</th>';
  }

  var rows = '';

  // 地支行
  var tdCells = '';
  for (var m = 0; m < 12; m++) {
    tdCells += '<td><span class="' + _zhiColorClass(monthZhiIdx[m]) + '">' + Lunar.Zhi[monthZhiIdx[m]] + '</span></td>';
  }
  rows += '<tr class="bt-dy-row-0"><td class="bt-label">地支</td>' + tdCells + '</tr>';

  // 神煞行（可点击）
  tdCells = '';
  for (var m = 0; m < 12; m++) {
    tdCells += '<td>' + _buildShenshaCell(LIUYUE_SHENSHA[m], SHENSHA_DETAIL[m]) + '</td>';
  }
  rows += '<tr class="bt-dy-row-1"><td class="bt-label">神煞</td>' + tdCells + '</tr>';

  return '<div class="bt-card bt-dy-card">'
    + '<div class="bt-title">流月 · ' + liunianYear + '年（小限' + Lunar.Zhi[xiaoxianZhiIdx] + '）</div>'
    + '<div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-ly-table">'
    + '<thead><tr>' + thCells + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';
}
function renderMinggongXingxingTable(ob, MGxh) {
  var mgZhiIdx = MGxh % 12;

  var thCells = '<th class="bt-th-label"></th>';
  for (var i = 0; i < 12; i++) {
    var hCls = (i === mgZhiIdx) ? ' bt-mg-highlight' : '';
    thCells += '<th class="bt-dy-th' + hCls + '">' + Lunar.Zhi[i] + '</th>';
  }

  // 星名行（可点击查看口诀）
  var tdCells = '';
  for (var i = 0; i < 12; i++) {
    var hCls = (i === mgZhiIdx) ? ' bt-mg-highlight' : '';
    tdCells += '<td class="' + hCls + '">' + _buildShenshaCell(MINGGONG_STAR_NAMES[i], MINGGONG_STAR_KOUJUE[i]) + '</td>';
  }
  var rows = '<tr class="bt-dy-row-0"><td class="bt-label">星名</td>' + tdCells + '</tr>';

  return '<div class="bt-card bt-dy-card">'
    + '<div class="bt-title">十二命宫星性 · 本命' + Lunar.Zhi[mgZhiIdx] + '（' + MINGGONG_STAR_NAMES[mgZhiIdx] + '）</div>'
    + '<div class="scroll-x-touch"><table class="bt-table bt-dy-table bt-mg-table">'
    + '<thead><tr>' + thCells + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';
}
