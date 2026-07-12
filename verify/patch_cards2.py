#!/usr/bin/env python
"""补全 _buildMdCards 中剩余5张卡片: 生克制化/干支关系/十神定位/四柱详断/日柱论断"""

with open('server/routes/bazi.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Function signature
content = content.replace(
    'function _buildMdCards(mdAnalysis, wxCalc) {',
    'function _buildMdCards(mdAnalysis, wxCalc, ob) {'
)

# Fix 2: Call site
content = content.replace(
    '.concat(_buildMdCards(mdAnalysis, wxCalc)),',
    '.concat(_buildMdCards(mdAnalysis, wxCalc, ob)),'
)

# Fix 3: Replace 'return cards;' in _buildMdCards with new cards + return
old = '''  }

  return cards;
}

'''

new = '''  }

  // Card 6: 生克制化 — 各元素五步计算得分明细
  if (wxCalc && wxCalc.details && ob) {
    var body6 = '<div class="card" data-card-id="md_shengke">'
      + '<div class="card-header"><span><i class="ti ti-arrows-exchange"></i> 生克制化 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">';
    for (var ei = 0; ei < wxCalc.details.length; ei++) {
      var d = wxCalc.details[ei];
      var yl = d.breakdown.yueling || {};
      var tg = d.breakdown.tonggen || {};
      var ta = d.breakdown.tiangan || {};
      body6 += '<div class="bz-pillar-item"><strong>' + d.wx + '</strong>: '
        + '月令' + (yl.score||'?') + '(' + (yl.status||'?') + ') | '
        + '通根' + (tg.score||'?') + '(' + (tg.items ? tg.items.length : 0) + '处) | '
        + '天干' + (ta.score||'?') + ' | '
        + '总计' + (d.breakdown.totalScore||'?') + '</div>';
    }
    body6 += '</div></div></div>';
    cards.push({ id: 'md_shengke', title: '生克制化 (MD v2.0)', body: body6 });
  }

  // Card 7: 干支关系 — 十神/五合/六冲
  if (ob) {
    var stems = [ob.b1%10, ob.b2%10, ob.b3%10, ob.b4%10];
    var zhis = [ob.b1%12, ob.b2%12, ob.b3%12, ob.b4%12];
    var pillars = ['年','月','日','时'];
    var riGan2 = ob.b3 % 10;
    var body7 = '<div class="card" data-card-id="md_tiangan">'
      + '<div class="card-header"><span><i class="ti ti-link"></i> 干支关系 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">';
    // 十神分布
    body7 += '<div class="bz-info-row"><span class="bz-label">十神分布</span><span class="bz-val">';
    for (var pi = 0; pi < 4; pi++) {
      if (pi === 2) continue;
      var ssName = typeof _localSShen === 'function' ? _localSShen(riGan2, stems[pi]) : '?';
      body7 += pillars[pi] + ':' + ssName + ' ';
    }
    body7 += '</span></div>';
    // 天干五合
    var HE = [[0,5],[1,6],[2,7],[3,8],[4,9]];
    var heNames = ['甲己合土','乙庚合金','丙辛合水','丁壬合木','戊癸合火'];
    var foundHe = false;
    for (var hi = 0; hi < HE.length; hi++) {
      for (var ai = 0; ai < 4; ai++) {
        for (var bi = ai+1; bi < 4; bi++) {
          if ((stems[ai]===HE[hi][0] && stems[bi]===HE[hi][1]) || (stems[ai]===HE[hi][1] && stems[bi]===HE[hi][0])) {
            body7 += '<div class="bz-info-row"><span class="bz-label">天干五合</span><span class="bz-val">' + pillars[ai] + pillars[bi] + ' ' + heNames[hi] + '</span></div>';
            foundHe = true;
          }
        }
      }
    }
    if (!foundHe) body7 += '<div class="bz-info-row"><span class="bz-label">天干五合</span><span class="bz-val">无</span></div>';
    // 地支六冲
    var CHONG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
    var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    for (var ci = 0; ci < CHONG.length; ci++) {
      for (var ai = 0; ai < 4; ai++) {
        for (var bi = ai+1; bi < 4; bi++) {
          if ((zhis[ai]===CHONG[ci][0] && zhis[bi]===CHONG[ci][1]) || (zhis[ai]===CHONG[ci][1] && zhis[bi]===CHONG[ci][0])) {
            body7 += '<div class="bz-info-row"><span class="bz-label">六冲</span><span class="bz-val" style="color:var(--color-danger)">' + pillars[ai] + pillars[bi] + ' ' + ZHI[zhis[ai]] + '冲' + ZHI[zhis[bi]] + '</span></div>';
          }
        }
      }
    }
    body7 += '</div></div></div>';
    cards.push({ id: 'md_tiangan', title: '干支关系 (MD v2.0)', body: body7 });
  }

  // Card 8: 十神定位 — 四柱干支十神+藏干十神
  if (ob) {
    var riGan3 = ob.b3 % 10;
    var pillars2 = ['年柱','月柱','日柱','时柱'];
    var body8 = '<div class="card card-accent-gold" data-card-id="md_shishen">'
      + '<div class="card-header"><span><i class="ti ti-users"></i> 十神定位 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<table class="bz-wuxing-table"><tr><th>柱位</th><th>干支</th><th>天干十神</th><th>藏干·本气十神</th></tr>';
    for (var pi = 0; pi < 4; pi++) {
      var gz = GAN[ob['b'+(pi+1)]%10] + ZHI[ob['b'+(pi+1)]%12];
      var ss = typeof _localSShen === 'function' ? _localSShen(riGan3, ob['b'+(pi+1)]%10) : '?';
      var cg = (typeof _DG_BENQI !== 'undefined') ? _DG_BENQI[ob['b'+(pi+1)]%12] : '';
      var cgSS = '';
      if (cg && typeof _DG_GAN !== 'undefined') {
        var cgIdx = _DG_GAN[cg];
        if (cgIdx !== undefined && typeof _localSShen === 'function') cgSS = _localSShen(riGan3, cgIdx);
      }
      body8 += '<tr><td>' + pillars2[pi] + '</td><td>' + gz + '</td><td>' + ss + '</td><td>' + (cg||'') + '(' + (cgSS||'?') + ')</td></tr>';
    }
    body8 += '</table></div></div></div>';
    cards.push({ id: 'md_shishen', title: '十神定位 (MD v2.0)', body: body8 });
  }

  // Card 9: 四柱详断 — 每柱干支+十神+纳音
  if (ob) {
    var body9 = '<div class="card card-raised" data-card-id="md_sizhu">'
      + '<div class="card-header"><span><i class="ti ti-columns"></i> 四柱详断 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">';
    var pillarLabels = ['年柱·祖上','月柱·事业','日柱·自我','时柱·晚景'];
    var pillarPct = mdAnalysis ? [0, 0, (mdAnalysis.strengthPct||0), 0] : [0,0,0,0];
    for (var pi = 0; pi < 4; pi++) {
      var gz2 = GAN[ob['b'+(pi+1)]%10] + ZHI[ob['b'+(pi+1)]%12];
      var ss2 = typeof _localSShen === 'function' ? _localSShen(ob.b3%10, ob['b'+(pi+1)]%10) : '?';
      var ny2 = typeof Lunar !== 'undefined' && Lunar.nayin ? Lunar.nayin(ob['b'+(pi+1)]) : '';
      body9 += '<div class="bz-pillar-item"><strong>' + pillarLabels[pi] + '</strong>: '
        + gz2 + ' (' + ss2 + ')'
        + (ny2 ? ' · 纳音' + ny2 : '')
        + '</div>';
    }
    body9 += '</div></div></div>';
    cards.push({ id: 'md_sizhu', title: '四柱详断 (MD v2.0)', body: body9 });
  }

  // Card 10: 日柱论断 — 日柱纳音+强度
  if (ob) {
    var riGz = GAN[ob.b3%10] + ZHI[ob.b3%12];
    var ny = typeof Lunar !== 'undefined' && Lunar.nayin ? Lunar.nayin(ob.b3) : '';
    var body10 = '<div class="card card-accent-red" data-card-id="md_riduan">'
      + '<div class="card-header"><span><i class="ti ti-file-text"></i> 日柱论断 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<div class="bz-info-row"><span class="bz-label">日柱</span><span class="bz-val" style="font-weight:700;font-size:1.2rem">' + riGz + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">纳音</span><span class="bz-val">' + (ny || '?') + '</span></div>';
    if (mdAnalysis && mdAnalysis.dayMaster) {
      body10 += '<div class="bz-info-row"><span class="bz-label">日主</span><span class="bz-val">' + mdAnalysis.dayMaster + mdAnalysis.dayMasterWx + '</span></div>';
      body10 += '<div class="bz-info-row"><span class="bz-label">强度</span><span class="bz-val">' + mdAnalysis.strengthLevel + ' (' + mdAnalysis.strengthPct + '%)</span></div>';
    }
    body10 += '</div></div></div>';
    cards.push({ id: 'md_riduan', title: '日柱论断 (MD v2.0)', body: body10 });
  }

  return cards;
}

'''

# Find the first 'return cards;' which is in _buildMdCards
# and the pattern before it
pat = '    cards.push({ id: \'md_verify_card\', title: \'自洽验算 (MD §6.2)\', body: body5 });\n  }\n\n  return cards;\n}\n'
if pat in content:
    content = content.replace(pat, new)
    print('OK: 5 cards added')
else:
    print('FAIL: pattern not found')
    # Debug: find the exact pattern
    idx = content.find('md_verify_card')
    if idx > 0:
        print('Found md_verify_card at', idx)
        print(repr(content[idx:idx+200]))

with open('server/routes/bazi.js', 'w', encoding='utf-8') as f:
    f.write(content)
