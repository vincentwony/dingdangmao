"""替换8张分析卡片的body为新管道数据"""

with open('server/routes/bazi.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Change call site — cards 经过 _patchCardsWithMd 替换
old_call = 'cards: _splitBzinfoToCards(fullBzinfo),'
new_call = 'cards: _patchCardsWithMd(_splitBzinfoToCards(fullBzinfo), mdAnalysis, wxCalc, ob),'
content = content.replace(old_call, new_call)
print('Step 1 OK: call site updated')

# Step 2: Insert _patchCardsWithMd function before _splitBzinfoToCards

patch_fn = '''/** 用新管道数据替换8张分析卡片的body (2026-06-24 接管)
 *  4张纯数据卡保持不变: bz_taiyuan/bz_jishen/bz_zhongliang/bz_minggong */
function _patchCardsWithMd(cards, mdAnalysis, wxCalc, ob) {
  if (!mdAnalysis || !wxCalc || !cards) return cards;
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var riGan = ob.b3 % 10;
  var wxKeys = ['mu','huo','tu','jin','shui'];

  for (var i = 0; i < cards.length; i++) {
    var cid = cards[i].id;

    // --- bz_rizhu: 日主强弱 → mdAnalysis ---
    if (cid === 'bz_rizhu') {
      var dm = mdAnalysis.dayMaster || '?';
      var wx = mdAnalysis.dayMasterWx || '';
      var sl = mdAnalysis.strengthLevel || '?';
      var pct = mdAnalysis.strengthPct || 0;
      var selfPct = mdAnalysis.selfPct || 0;
      cards[i].body = '<div class="card card-raised" data-card-id="bz_rizhu">'
        + '<div class="card-header"><span><i class="ti ti-activity-heartbeat"></i> 日主强弱 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-info-row"><span class="bz-label">日主</span><span class="bz-val" style="font-weight:700">' + dm + wx + '</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">强度等级</span><span class="bz-val" style="font-weight:700;color:var(--color-cinnabar)">' + sl + '</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">日主占比</span><span class="bz-val">' + pct + '%</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">自党(印+比)</span><span class="bz-val">' + selfPct + '%</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">来源</span><span class="bz-val" style="font-size:0.8rem">MD §7.2 七层权重模型</span></div>'
        + '</div></div></div>';
      cards[i].title = '日主强弱 (新管道)';
    }

    // --- bz_wuxing: 五行力量 → wxCalc ---
    else if (cid === 'bz_wuxing') {
      var body = '<div class="card" data-card-id="bz_wuxing">'
        + '<div class="card-header"><span><i class="ti ti-chart-bar"></i> 五行力量 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<table class="bz-wuxing-table"><tr><th>五行</th><th>占比</th><th>得分</th><th>等级</th></tr>';
      var WX = ['木','火','土','金','水'];
      for (var k = 0; k < 5; k++) {
        var key = wxKeys[k];
        body += '<tr><td>' + WX[k] + '</td><td>' + (wxCalc.pct[key]||0).toFixed(1) + '%</td><td>' + (wxCalc.scores[key]||0) + '</td><td>' + (wxCalc.levels[key]||'?') + '</td></tr>';
      }
      body += '</table></div></div></div>';
      cards[i].body = body;
      cards[i].title = '五行力量 (新管道)';
    }

    // --- bz_zonghe: 综合信息 → mdAnalysis.pattern + zhengge ---
    else if (cid === 'bz_zonghe') {
      var pat = mdAnalysis.pattern || {};
      var zg = mdAnalysis.zhengge || {};
      var body = '<div class="card card-accent-gold" data-card-id="bz_zonghe">'
        + '<div class="card-header"><span><i class="ti ti-list-details"></i> 综合信息 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-info-row"><span class="bz-label">格局</span><span class="bz-val" style="font-weight:700">' + (pat.huaType || pat.type || pat.congType || '?') + '</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">状态</span><span class="bz-val">' + (pat.status||'?') + ' (' + (pat.grade||'?') + ')</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">依据</span><span class="bz-val" style="font-size:0.8rem">' + (zg.source||'?') + '</span></div>';
      if (pat.isHua) body += '<div class="bz-info-row"><span class="bz-label">化气</span><span class="bz-val">' + (pat.huaType||'') + '</span></div>';
      if (pat.breaks && pat.breaks.length) body += '<div class="bz-info-row"><span class="bz-label">破格</span><span class="bz-val" style="color:var(--color-danger)">' + pat.breaks.join(', ') + '</span></div>';
      if (pat.boundary) body += '<div class="bz-info-row"><span class="bz-label">⚠</span><span class="bz-val">' + (pat.boundaryNote||'') + '</span></div>';
      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '综合信息 (新管道)';
    }

    // --- bz_shengke: 生克制化 → wxCalc.details ---
    else if (cid === 'bz_shengke') {
      var body = '<div class="card" data-card-id="bz_shengke">'
        + '<div class="card-header"><span><i class="ti ti-arrows-exchange"></i> 生克制化 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">';
      if (wxCalc.details) {
        for (var ei = 0; ei < wxCalc.details.length; ei++) {
          var d = wxCalc.details[ei];
          var yl = d.breakdown.yueling || {};
          var tg = d.breakdown.tonggen || {};
          var ta = d.breakdown.tiangan || {};
          body += '<div class="bz-info-row"><span class="bz-label" style="min-width:3rem">' + d.wx + '</span>'
            + '<span class="bz-val" style="font-size:0.85rem">月令' + (yl.score||'?') + '(' + (yl.status||'?') + ')'
            + ' 通根' + (tg.score||'?') + '(' + (tg.items?tg.items.length:0) + '处)'
            + ' 天干' + (ta.score||'?')
            + ' 计' + (d.breakdown.totalScore||'?') + '</span></div>';
        }
      }
      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '生克制化 (新管道)';
    }

    // --- bz_tiangan: 干支关系 → 十神分布+五合+六冲 ---
    else if (cid === 'bz_tiangan') {
      var stems = [ob.b1%10, ob.b2%10, ob.b3%10, ob.b4%10];
      var zhis = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
      var pillars = ['年','月','日','时'];
      var body = '<div class="card" data-card-id="bz_tiangan">'
        + '<div class="card-header"><span><i class="ti ti-link"></i> 干支关系 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">';
      // 十神分布
      body += '<div class="bz-info-row"><span class="bz-label">十神</span><span class="bz-val">';
      for (var pi = 0; pi < 4; pi++) {
        if (pi === 2) continue;
        var ssName = typeof _localSShen === 'function' ? _localSShen(riGan, stems[pi]) : GAN[stems[pi]];
        body += pillars[pi] + ':' + ssName + ' ';
      }
      body += '</span></div>';
      // 五合
      var HE = [[0,5],[1,6],[2,7],[3,8],[4,9]];
      var heNames = ['甲己合土','乙庚合金','丙辛合水','丁壬合木','戊癸合火'];
      var found = false;
      for (var hi = 0; hi < HE.length; hi++) {
        for (var ai = 0; ai < 4; ai++) {
          for (var bi = ai+1; bi < 4; bi++) {
            if ((stems[ai]===HE[hi][0] && stems[bi]===HE[hi][1]) || (stems[ai]===HE[hi][1] && stems[bi]===HE[hi][0])) {
              body += '<div class="bz-info-row"><span class="bz-label">五合</span><span class="bz-val">' + pillars[ai] + pillars[bi] + ' ' + heNames[hi] + '</span></div>';
              found = true;
            }
          }
        }
      }
      // 六冲
      var CHONG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
      for (var ci = 0; ci < CHONG.length; ci++) {
        for (var ai = 0; ai < 4; ai++) {
          for (var bi = ai+1; bi < 4; bi++) {
            if ((zhis[ai]===CHONG[ci][0] && zhis[bi]===CHONG[ci][1]) || (zhis[ai]===CHONG[ci][1] && zhis[bi]===CHONG[ci][0])) {
              body += '<div class="bz-info-row"><span class="bz-label">六冲</span><span class="bz-val" style="color:var(--color-danger)">' + pillars[ai] + pillars[bi] + ' ' + ZHI[zhis[ai]] + '冲' + ZHI[zhis[bi]] + '</span></div>';
            }
          }
        }
      }
      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '干支关系 (新管道)';
    }

    // --- bz_shishen: 十神定位 → 四柱十神+藏干十神表 ---
    else if (cid === 'bz_shishen') {
      var pillars2 = ['年柱','月柱','日柱','时柱'];
      var body = '<div class="card card-accent-gold" data-card-id="bz_shishen">'
        + '<div class="card-header"><span><i class="ti ti-users"></i> 十神定位 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<table class="bz-wuxing-table"><tr><th>柱位</th><th>干支</th><th>天干十神</th><th>藏干本气十神</th></tr>';
      for (var pi = 0; pi < 4; pi++) {
        var gz = GAN[ob['b'+(pi+1)]%10] + ZHI[ob['b'+(pi+1)]%12];
        var ss = typeof _localSShen === 'function' ? _localSShen(riGan, ob['b'+(pi+1)]%10) : '?';
        var cg = (typeof _DG_BENQI !== 'undefined') ? _DG_BENQI[ob['b'+(pi+1)]%12] : '';
        var cgSS = '';
        if (cg && typeof _DG_GAN !== 'undefined') {
          var cgIdx = _DG_GAN[cg];
          if (cgIdx !== undefined && typeof _localSShen === 'function') cgSS = _localSShen(riGan, cgIdx);
        }
        body += '<tr><td>' + pillars2[pi] + '</td><td>' + gz + '</td><td>' + ss + '</td><td>' + (cg||'') + '(' + (cgSS||'?') + ')</td></tr>';
      }
      body += '</table></div></div></div>';
      cards[i].body = body;
      cards[i].title = '十神定位 (新管道)';
    }

    // --- bz_sizhu: 四柱详断 → 每柱干支+十神+纳音 ---
    else if (cid === 'bz_sizhu') {
      var pillarLabels = ['年柱·祖上','月柱·事业','日柱·自我','时柱·晚景'];
      var body = '<div class="card" data-card-id="bz_sizhu">'
        + '<div class="card-header"><span><i class="ti ti-columns"></i> 四柱详断 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">';
      for (var pi = 0; pi < 4; pi++) {
        var gz2 = GAN[ob['b'+(pi+1)]%10] + ZHI[ob['b'+(pi+1)]%12];
        var ss2 = typeof _localSShen === 'function' ? _localSShen(riGan, ob['b'+(pi+1)]%10) : '?';
        var ny2 = typeof Lunar !== 'undefined' && Lunar.nayin ? Lunar.nayin(ob['b'+(pi+1)]) : '';
        body += '<div class="bz-pillar-item"><strong>' + pillarLabels[pi] + '</strong>: '
          + gz2 + ' (' + ss2 + ')'
          + (ny2 ? ' · 纳音' + ny2 : '')
          + '</div>';
      }
      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '四柱详断 (新管道)';
    }

    // --- bz_riduan: 日柱论断 → 日柱纳音+强度 ---
    else if (cid === 'bz_riduan') {
      var riGz = GAN[ob.b3%10] + ZHI[ob.b3%12];
      var ny = typeof Lunar !== 'undefined' && Lunar.nayin ? Lunar.nayin(ob.b3) : '';
      var body = '<div class="card card-accent-red" data-card-id="bz_riduan">'
        + '<div class="card-header"><span><i class="ti ti-file-text"></i> 日柱论断 (新管道)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-info-row"><span class="bz-label">日柱</span><span class="bz-val" style="font-weight:700;font-size:1.2rem">' + riGz + '</span></div>'
        + '<div class="bz-info-row"><span class="bz-label">纳音</span><span class="bz-val">' + (ny || '?') + '</span></div>';
      if (mdAnalysis.dayMaster) {
        body += '<div class="bz-info-row"><span class="bz-label">日主强度</span><span class="bz-val">' + mdAnalysis.dayMaster + mdAnalysis.dayMasterWx + ' ' + (mdAnalysis.strengthLevel||'?') + '(' + (mdAnalysis.strengthPct||0) + '%)</span></div>';
      }
      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '日柱论断 (新管道)';
    }

    // 4张纯数据卡: bz_taiyuan / bz_jishen / bz_zhongliang / bz_minggong → 保持不变
  }
  return cards;
}

'''

# Insert before _splitBzinfoToCards
marker = 'function _findCardStarts(html, tag, positions, type)'
content = content.replace(marker, patch_fn + marker)
print('Step 2 OK: _patchCardsWithMd inserted')

with open('server/routes/bazi.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
