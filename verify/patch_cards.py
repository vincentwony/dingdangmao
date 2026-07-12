import re

with open('server/routes/bazi.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Insert _buildMdCards function before _splitBzinfoToCards
build_fn = '''/** 从新管道数据生成 MD 对齐分析卡片 (2026-06-24 接管) */
function _buildMdCards(mdAnalysis, wxCalc) {
  if (!mdAnalysis) return [];
  var cards = [];
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var WX = ['木','火','土','金','水'];
  var wxKeys = ['mu','huo','tu','jin','shui'];

  // Card 1: 日主强度分析 (替代 bz_rizhu)
  if (mdAnalysis.dayMaster) {
    var dm = mdAnalysis.dayMaster;
    var wx = mdAnalysis.dayMasterWx || '';
    var sl = mdAnalysis.strengthLevel || '?';
    var pct = mdAnalysis.strengthPct || 0;
    var score = mdAnalysis.strengthScore || 0;
    var selfPct = mdAnalysis.selfPct || 0;
    var tilt = mdAnalysis.strengthTilt || '';
    var body1 = '<div class="card" data-card-id="md_strength">'
      + '<div class="card-header"><span><i class="ti ti-activity-heartbeat"></i> 日主强度 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<div class="bz-info-row"><span class="bz-label">日主</span><span class="bz-val">' + dm + wx + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">强度等级</span><span class="bz-val" style="font-weight:700;color:var(--color-cinnabar)">' + sl + (tilt ? ' (' + tilt + ')' : '') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">日主占比</span><span class="bz-val">' + pct + '%</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">日主得分</span><span class="bz-val">' + score + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">自党 (印+比)</span><span class="bz-val">' + selfPct + '%</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">来源</span><span class="bz-val" style="font-size:0.85rem">MD文档 §7.2 七层权重模型</span></div>'
      + '</div></div></div>';
    cards.push({ id: 'md_strength', title: '日主强度 (MD v2.0)', body: body1 });
  }

  // Card 2: 五行力量分布 (替代 bz_wuxing)
  if (wxCalc && wxCalc.pct && wxCalc.levels) {
    var body2 = '<div class="card" data-card-id="md_wuxing_v2">'
      + '<div class="card-header"><span><i class="ti ti-chart-bar"></i> 五行力量 (MD v2.0)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<table class="bz-wuxing-table"><tr><th>五行</th><th>占比</th><th>得分</th><th>等级</th></tr>';
    for (var i = 0; i < 5; i++) {
      var k = wxKeys[i];
      body2 += '<tr><td>' + WX[i] + '</td><td>' + (wxCalc.pct[k]||0).toFixed(1) + '%</td><td>' + (wxCalc.scores[k]||0) + '</td><td>' + (wxCalc.levels[k]||'?') + '</td></tr>';
    }
    body2 += '</table></div></div></div>';
    cards.push({ id: 'md_wuxing_v2', title: '五行力量 (MD v2.0)', body: body2 });
  }

  // Card 3: 格局判定详情 (替代 bz_zonghe)
  if (mdAnalysis.pattern && mdAnalysis.zhengge) {
    var pat = mdAnalysis.pattern;
    var zg = mdAnalysis.zhengge;
    var body3 = '<div class="card card-accent-gold" data-card-id="md_pattern_detail">'
      + '<div class="card-header"><span><i class="ti ti-list-details"></i> 格局判定 (MD §3-4)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<div class="bz-info-row"><span class="bz-label">格局类型</span><span class="bz-val" style="font-weight:700">' + (pat.huaType || pat.type || '?') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">格局状态</span><span class="bz-val">' + (pat.status||'?') + ' (' + (pat.grade||'?') + ')</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">定格局依据</span><span class="bz-val" style="font-size:0.85rem">' + (zg.source||'?') + '</span></div>';
    if (pat.isHua) body3 += '<div class="bz-info-row"><span class="bz-label">化气类型</span><span class="bz-val">' + (pat.huaType||'') + '</span></div>';
    if (pat.breaks && pat.breaks.length) body3 += '<div class="bz-info-row"><span class="bz-label">破格原因</span><span class="bz-val" style="color:var(--color-danger)">' + pat.breaks.join(', ') + '</span></div>';
    if (pat.boundary) body3 += '<div class="bz-info-row"><span class="bz-label">⚠ 边界</span><span class="bz-val">' + (pat.boundaryNote||'') + '</span></div>';
    body3 += '</div></div></div>';
    cards.push({ id: 'md_pattern_detail', title: '格局判定 (MD §3-4)', body: body3 });
  }

  // Card 4: 喜用神分析
  if (mdAnalysis.xiyong) {
    var xy = mdAnalysis.xiyong;
    var body4 = '<div class="card card-accent-gold" data-card-id="md_xiyong_card">'
      + '<div class="card-header"><span><i class="ti ti-star"></i> 喜用神 (MD §5)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<div class="bz-info-row"><span class="bz-label">用神</span><span class="bz-val" style="font-weight:700;color:var(--color-cinnabar)">' + (xy.useGod?xy.useGod.element:'?') + '</span><span class="bz-reason">' + (xy.useGod?xy.useGod.reason:'') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">喜神</span><span class="bz-val">' + (xy.likeGod?xy.likeGod.element:'?') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">忌神</span><span class="bz-val">' + (xy.fearGod?xy.fearGod.element:'?') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">路径</span><span class="bz-val">' + (xy.path||'?') + '</span></div>';
    if (xy.tiaoHou && xy.tiaoHou.needed) {
      body4 += '<div class="bz-info-row"><span class="bz-label">调候</span><span class="bz-val">' + xy.tiaoHou.element + ' — ' + xy.tiaoHou.reason + '</span></div>';
    }
    if (xy.tiaoHouOverride) {
      body4 += '<div class="bz-info-row"><span class="bz-label">调候覆盖</span><span class="bz-val" style="color:var(--color-cinnabar)">' + xy.tiaoHouOverride.tiaoHouUseGod + ' (原' + xy.tiaoHouOverride.originalUseGod + ')</span></div>';
    }
    body4 += '</div></div></div>';
    cards.push({ id: 'md_xiyong_card', title: '喜用神 (MD §5)', body: body4 });
  }

  // Card 5: 自洽验算
  if (mdAnalysis.verify) {
    var v = mdAnalysis.verify;
    var body5 = '<div class="card" data-card-id="md_verify_card">'
      + '<div class="card-header"><span><i class="ti ti-checkbox"></i> 自洽验算 (MD §6.2)</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
      + '<div class="card-body"><div class="bz-section-body">'
      + '<div class="bz-info-row"><span class="bz-label">验算结果</span><span class="bz-val">' + (v.passed ? '通过' : '未通过') + '</span></div>'
      + '<div class="bz-info-row"><span class="bz-label">置信度</span><span class="bz-val">' + (v.confidence||'?') + '%</span></div>';
    if (v.issues && v.issues.length) {
      body5 += '<div class="bz-info-row"><span class="bz-label">问题</span><span class="bz-val" style="color:var(--color-danger)">' + v.issues.join('; ') + '</span></div>';
    }
    body5 += '</div></div></div>';
    cards.push({ id: 'md_verify_card', title: '自洽验算 (MD §6.2)', body: body5 });
  }

  return cards;
}

'''

marker = 'function _findCardStarts(html, tag, positions, type)'
content = content.replace(marker, build_fn + marker)

# Step 2: Merge new pipeline cards into the cards array
old_line = 'cards: _splitBzinfoToCards(fullBzinfo),'
new_line = 'cards: _splitBzinfoToCards(fullBzinfo).concat(_buildMdCards(mdAnalysis, wxCalc)),'
content = content.replace(old_line, new_line)

with open('server/routes/bazi.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK: _buildMdCards inserted + cards merged')
