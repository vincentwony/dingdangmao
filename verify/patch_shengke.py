#!/usr/bin/env python
"""更新 bz_shengke 卡片为古籍注疏格式"""

with open('server/routes/bazi.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the bz_shengke block start and end
start_marker = "// --- bz_shengke:"
end_marker = "// 4张纯数据卡"

start = content.find(start_marker)
end = content.find(end_marker, start)

if start < 0 or end < 0:
    print(f"FAIL: markers not found start={start} end={end}")
    exit(1)

new_block = r"""    // --- bz_shengke: 生克制化 → 古籍注疏风格 ---
    else if (cid === 'bz_shengke') {
      var wxCls = ['sk-wx-mu','sk-wx-huo','sk-wx-tu','sk-wx-jin','sk-wx-shui'];
      var barCls = ['sk-bar-mu','sk-bar-huo','sk-bar-tu','sk-bar-jin','sk-bar-shui'];
      var tagCls = ['sk-zs-tag-mu','sk-zs-tag-huo','sk-zs-tag-tu','sk-zs-tag-jin','sk-zs-tag-shui'];
      var maxScore = 0;
      if (wxCalc.details) {
        for (var ei = 0; ei < wxCalc.details.length; ei++) {
          var d0 = wxCalc.details[ei];
          var ts = (d0.breakdown.yueling||{}).score||0 + (d0.breakdown.tonggen||{}).score||0 + (d0.breakdown.tiangan||{}).score||0;
          if (ts > maxScore) maxScore = ts;
        }
      }
      if (maxScore === 0) maxScore = 80;

      var body = '<div class="card" data-card-id="bz_shengke">'
        + '<div class="sk-header">'
        + '<span class="sk-header-dot"></span>'
        + '<span class="sk-header-title">生克制化</span>'
        + '<span class="sk-header-sub">月令 · 通根 · 天干</span>'
        + '</div>'
        + '<div class="card-body">';

      // Layer 1: 五行力量条
      body += '<div class="sk-bars">';
      if (wxCalc.details) {
        for (var ei = 0; ei < wxCalc.details.length; ei++) {
          var d = wxCalc.details[ei];
          var yl = d.breakdown.yueling || {};
          var tg = d.breakdown.tonggen || {};
          var ta = d.breakdown.tiangan || {};
          var totalS = (typeof d.breakdown.totalScore==='number') ? d.breakdown.totalScore : (yl.score||0)+(tg.score||0)+(ta.score||0);
          var barW = Math.max(2, Math.round(totalS / maxScore * 100));
          var tgN = tg.items ? tg.items.length : 0;
          var taN = ta.count || 0;

          body += '<div class="sk-row">'
            + '<span class="sk-wx ' + wxCls[ei] + '">' + d.wx + '</span>'
            + '<div class="sk-bar-wrap"><div class="sk-bar ' + barCls[ei] + '" style="width:' + barW + '%"></div></div>'
            + '<span class="sk-score">' + totalS + '<span class="sk-unit">分</span></span>'
            + '<span class="sk-detail">月令' + (yl.status||'—') + '·' + (yl.score||0)
            + ' &nbsp; 通根' + (tgN>0 ? tgN+'处·'+tg.score : '—')
            + ' &nbsp; 天干' + (taN>0 ? taN+'位·'+ta.score : '—')
            + '</span></div>';
        }
      }
      body += '</div>';

      // Layer 2: 通根注疏
      var hasTonggen = false;
      if (wxCalc.details) {
        for (var ei = 0; ei < wxCalc.details.length; ei++) {
          var tg2 = wxCalc.details[ei].breakdown.tonggen || {};
          if (tg2.items && tg2.items.length > 0 && tg2.score > 0) { hasTonggen = true; break; }
        }
      }
      if (hasTonggen) {
        body += '<div class="sk-zhushu">';
        body += '<div class="sk-zs-title">▍ 通根溯源</div>';
        var lastWx = '';
        for (var ei = 0; ei < wxCalc.details.length; ei++) {
          var d3 = wxCalc.details[ei];
          var tg3 = d3.breakdown.tonggen || {};
          if (!tg3.items || tg3.items.length === 0 || tg3.score === 0) continue;
          if (lastWx && lastWx !== d3.wx) body += '<div class="sk-zs-gap"></div>';
          lastWx = d3.wx;
          for (var ti = 0; ti < tg3.items.length; ti++) {
            var t = tg3.items[ti];
            if (t.contrib === 0) continue;
            var cw = t.changshengW;
            var csName = cw===0.7?'长生七':cw===0.2?'沐浴二':cw===0.55?'冠带五':cw===1.0?'临官十':cw===0.4?'墓库四':cw===0.1?'病地一':cw===0.15?'胎元一':cw===0.25?'养元二':cw===0?'死绝':'';
            var rRatio = Math.round(t.ratio);
            body += '<div class="sk-zs-item">'
              + '<span class="sk-zs-tag ' + tagCls[ei] + '">' + d3.wx + '</span>'
              + '<span class="sk-zs-text">' + t.zhi + '中<em>' + t.gan + '</em>' + t.level
              + ' ' + rRatio + '铢 × ' + csName + '铢 → <em>' + t.contrib + '铢</em></span>'
              + '</div>';
          }
        }
        body += '</div>';
      }

      // Layer 3: 日主总括
      if (mdAnalysis) {
        var selfPct2 = mdAnalysis.selfPct || 0;
        body += '<div class="sk-summary">'
          + '<span>日主</span>'
          + '<span class="sk-ri">' + (mdAnalysis.dayMaster||'') + (mdAnalysis.dayMasterWx||'') + '</span>'
          + '<span class="sk-summary-divider"></span>'
          + '<span>印比 <span class="sk-pct">' + selfPct2 + '%</span></span>'
          + '<span class="sk-summary-divider"></span>'
          + '<span>克泄耗 <span class="sk-pct">' + (100 - selfPct2) + '%</span></span>'
          + '</div>';
      }

      body += '</div></div>';
      cards[i].body = body;
      cards[i].title = '生克制化';
    }

    // 4张纯数据卡"""

content = content[:start] + new_block + content[end:]

with open('server/routes/bazi.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
