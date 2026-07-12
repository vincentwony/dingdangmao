#!/usr/bin/env python
"""Insert bz_geju/bz_xiyong/bz_congge handlers into _patchCardsWithMd"""

NEW_CARDS_CODE = """    // --- bz_geju: 八字格局 -> 旧标题 + 新管道数据 ---
    else if (cid === 'bz_geju') {
      var zgPat = mdAnalysis.pattern || {};
      var zgZg = mdAnalysis.zhengge || {};
      var zgXy = mdAnalysis.xiyong || {};
      var dmGan = GAN[riGan];
      var dmWx = WX[riGan>>1];
      var yueZhi2 = ZHI[ob.b2%12];
      var yueBenqi = (typeof _DG_BENQI !== 'undefined') ? _DG_BENQI[ob.b2%12] : '';
      var yueGanIdx = (typeof _DG_GAN !== 'undefined' && yueBenqi) ? (_DG_GAN[yueBenqi]||0) : 0;
      var yueSS = typeof _localSShen === 'function' ? _localSShen(riGan, yueGanIdx) : '';

      var body = '<div class="card card-accent-gold" data-card-id="bz_geju">'
        + '<div class="card-header" onclick="toggleBaziCardCollapse(this)"><span><i class="ti ti-target"></i> 八字格局</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-dingge-title"><i class="ti ti-list-details"></i> 八字格局</div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、四柱八字</div>'
        + '<div class="bz-dingge-step-body">日主 <span class="bz-dingge-highlight">' + dmGan + '</span>'
        + '（' + (riGan%2===0?'阳':'阴') + dmWx + '）  '
        + '年柱 ' + GAN[ob.b1%10] + ZHI[ob.b1%12] + ' 月柱 ' + GAN[ob.b2%10] + ZHI[ob.b2%12] + '  '
        + '日柱 ' + GAN[ob.b3%10] + ZHI[ob.b3%12] + ' 时柱 ' + GAN[ob.b4%10] + ZHI[ob.b4%12]
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、月令提纲</div>'
        + '<div class="bz-dingge-step-body">月令 <span class="bz-dingge-gold">' + yueZhi2 + '</span>'
        + '，本气 <span class="bz-dingge-gold">' + yueBenqi + '</span>，本气十神：<span class="bz-dingge-highlight">' + (yueSS||'') + '</span>。'
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、本气十神定位</div>'
        + '<div class="bz-dingge-step-body">';
      var pillars3 = ['年','月','日','时'];
      for (var pi3 = 0; pi3 < 4; pi3++) {
        var gz3 = GAN[ob['b'+(pi3+1)]%10] + ZHI[ob['b'+(pi3+1)]%12];
        var benqi3 = (typeof _DG_BENQI !== 'undefined') ? _DG_BENQI[ob['b'+(pi3+1)]%12] : '';
        var bqGanIdx3 = (typeof _DG_GAN !== 'undefined' && benqi3) ? (_DG_GAN[benqi3]||0) : 0;
        var ss3 = typeof _localSShen === 'function' && benqi3 ? _localSShen(riGan, bqGanIdx3) : '';
        body += (pi3>0?' ':'') + pillars3[pi3] + '柱 ' + gz3 + ' 本气' + benqi3 + ' -> ' + (ss3||'?');
      }
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">四、透干验证</div>'
        + '<div class="bz-dingge-step-body">定格局依据：<span class="bz-dingge-gold">' + (zgZg.source||'?') + '</span>。'
        + '据《子平真诠》卷三："用神专求月令，以日干配月令地支，而生克不同，格局分焉。"'
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">五、格局判定</div>'
        + '<div class="bz-dingge-step-body">'
        + '格局类型：<span class="bz-dingge-highlight">' + (zgPat.huaType || zgPat.type || zgPat.congType || '?') + '</span><br>'
        + '格局状态：<span class="bz-dingge-geju">' + (zgPat.status||'?') + '</span>'
        + ' 等级：<span class="bz-dingge-grade">' + (zgPat.grade||'?') + '</span><br>';
      if (zgPat.isHua) body += '化气类型：' + (zgPat.huaType||'') + '<br>';
      if (zgPat.breaks && zgPat.breaks.length) body += '破格原因：<span style="color:var(--color-cinnabar)">' + zgPat.breaks.join('、') + '</span><br>';
      if (zgPat.bonuses && zgPat.bonuses.length) body += '补救因素：' + zgPat.bonuses.join('、') + '<br>';
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">六、四柱配合分析</div>'
        + '<div class="bz-dingge-step-body">'
        + '日主<span class="bz-dingge-highlight">' + dmGan + dmWx + '</span>，强度<span class="bz-dingge-gold">' + (mdAnalysis.strengthLevel||'?') + '</span>（占比' + (mdAnalysis.strengthPct||0) + '%），'
        + '自党(印+比)=' + (mdAnalysis.selfPct||0) + '%，克泄耗=' + (100-(mdAnalysis.selfPct||0)) + '%。<br>';
      if (mdAnalysis.strengthLevel === '极旺' || mdAnalysis.strengthLevel === '偏旺')
        body += '日主偏旺 -> 宜<span class="bz-dingge-gold">泄克耗</span>。';
      else if (mdAnalysis.strengthLevel === '极弱' || mdAnalysis.strengthLevel === '偏弱')
        body += '日主偏弱 -> 宜<span class="bz-dingge-gold">生扶</span>。';
      else body += '日主中和 -> 以格局用神为主导。';
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">七、格局层次评定</div>'
        + '<div class="bz-dingge-step-body">'
        + '格局' + (zgPat.status||'?') + '，评定为<span class="bz-dingge-grade">' + (zgPat.grade||'?') + '</span>。';
      if (zgPat.boundary) body += '<br>边界案例：' + (zgPat.boundaryNote||'');
      body += '<br>据《子平真诠》卷五各论，格局成败决定命局层次。'
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">八、喜用神索引</div>'
        + '<div class="bz-dingge-step-body">'
        + '用神：<span class="bz-dingge-highlight">' + (zgXy.useGod?zgXy.useGod.element:'?') + '</span>（' + (zgXy.useGod?zgXy.useGod.reason:'') + '）<br>'
        + '喜神：<span class="bz-dingge-gold">' + (zgXy.likeGod?zgXy.likeGod.element:'?') + '</span><br>'
        + '忌神：<span style="color:var(--color-cinnabar)">' + (zgXy.fearGod?zgXy.fearGod.element:'?') + '</span><br>'
        + '推演路径：' + (zgXy.path||'?');
      if (zgXy.tiaoHou && zgXy.tiaoHou.needed) body += '<br>调候：' + zgXy.tiaoHou.element + ' - ' + zgXy.tiaoHou.reason;
      body += '</div></div>'

        + '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '八字格局';
    }

    // --- bz_xiyong: 八字喜用 -> 旧标题 + 新管道数据 ---
    else if (cid === 'bz_xiyong') {
      var xyPat = mdAnalysis.pattern || {};
      var xyXy = mdAnalysis.xiyong || {};
      var dmGan2 = GAN[riGan];
      var dmWx2 = WX[riGan>>1];
      var yueZhi3 = ZHI[ob.b2%12];

      var body = '<div class="card" data-card-id="bz_xiyong">'
        + '<div class="card-header" onclick="toggleBaziCardCollapse(this)"><span><i class="ti ti-sparkles"></i> 八字喜用</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-dingge-title"><i class="ti ti-star"></i> 八字喜用</div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、四柱八字概览</div>'
        + '<div class="bz-dingge-step-body">日主 <span class="bz-dingge-highlight">' + dmGan2 + '</span>（' + dmWx2 + '）'
        + '  |  年柱 ' + GAN[ob.b1%10] + ZHI[ob.b1%12] + ' 月柱 ' + GAN[ob.b2%10] + ZHI[ob.b2%12] + '  '
        + '日柱 ' + GAN[ob.b3%10] + ZHI[ob.b3%12] + ' 时柱 ' + GAN[ob.b4%10] + ZHI[ob.b4%12]
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、月令格局</div>'
        + '<div class="bz-dingge-step-body">月令 <span class="bz-dingge-gold">' + yueZhi3 + '</span>，月令为用神之源。'
        + '《子平真诠》云："八字用神，专求月令。"</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、格局喜用（' + (xyPat.isCong?'从格':'正格') + '）</div>'
        + '<div class="bz-dingge-step-body">'
        + '用神：<span class="bz-dingge-highlight">' + (xyXy.useGod?xyXy.useGod.element:'?') + '</span> - '
        + (xyXy.useGod?xyXy.useGod.reason:'') + '<br>'
        + '喜神：<span class="bz-dingge-gold">' + (xyXy.likeGod?xyXy.likeGod.element:'?') + '</span> - '
        + (xyXy.likeGod?xyXy.likeGod.reason:'') + '<br>'
        + '忌神：<span style="color:var(--color-cinnabar)">' + (xyXy.fearGod?xyXy.fearGod.element:'?') + '</span> - '
        + (xyXy.fearGod?xyXy.fearGod.reason:'') + '<br>'
        + '推演路径：' + (xyXy.path||'?');
      if (xyXy.tiaoHouOverride) {
        body += '<br><span style="color:var(--color-cinnabar)">调候覆盖：' + xyXy.tiaoHouOverride.tiaoHouUseGod
          + '（原扶抑用神' + xyXy.tiaoHouOverride.originalUseGod + '）</span>';
      }
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">四、调候参考</div>'
        + '<div class="bz-dingge-step-body">';
      if (xyXy.tiaoHou && xyXy.tiaoHou.needed) {
        body += '月令' + yueZhi3 + '，<span class="bz-dingge-gold">需调候</span>：'
          + xyXy.tiaoHou.element + ' - ' + xyXy.tiaoHou.reason + '。<br>'
          + '据《穷通宝鉴》："调候为第一要务。"';
      } else {
        body += '月令' + yueZhi3 + '，<span>无需调候</span>（非冬夏月，寒暖适中）。';
      }
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">五、通关参考</div>'
        + '<div class="bz-dingge-step-body">';
      var useEl = xyXy.useGod ? xyXy.useGod.element : '';
      if (useEl === '印星') body += '用神为印星，通关元素为<span class="bz-dingge-gold">官杀</span>（官生印，印生身）。';
      else if (useEl === '比劫') body += '用神为比劫，通关元素为<span class="bz-dingge-gold">印星</span>（印制食伤护比劫）。';
      else if (useEl === '食伤') body += '用神为食伤，通关元素为<span class="bz-dingge-gold">比劫</span>（比劫生食伤）。';
      else if (useEl === '财星') body += '用神为财星，通关元素为<span class="bz-dingge-gold">食伤</span>（食伤生财）。';
      else if (useEl === '官杀') body += '用神为官杀，通关元素为<span class="bz-dingge-gold">财星</span>（财生官杀）。';
      else body += '格局用神，通关视具体十神而定。';
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">六、真假用神检验</div>'
        + '<div class="bz-dingge-step-body">';
      if (mdAnalysis.verify && mdAnalysis.verify.passed) {
        body += '验算<span class="bz-dingge-gold">通过</span>（置信度' + (mdAnalysis.verify.confidence||'?') + '%）。<br>'
          + '用神方向与日主力量一致，自洽无矛盾。';
      } else {
        body += '验算<span style="color:var(--color-cinnabar)">未通过</span>（置信度' + (mdAnalysis.verify?mdAnalysis.verify.confidence:'?') + '%）。<br>'
          + '问题：' + (mdAnalysis.verify?mdAnalysis.verify.issues.join('；'):'?');
      }
      body += '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">七、岁运喜忌参考</div>'
        + '<div class="bz-dingge-step-body">'
        + '喜<span class="bz-dingge-gold">' + (xyXy.useGod?xyXy.useGod.element:'?') + '</span>运、'
        + '<span class="bz-dingge-gold">' + (xyXy.likeGod?xyXy.likeGod.element:'?') + '</span>运；'
        + '忌<span style="color:var(--color-cinnabar)">' + (xyXy.fearGod?xyXy.fearGod.element:'?') + '</span>运。<br>'
        + '《滴天髓》云："富贵虽定乎格局，穷通实系乎运途。"'
        + '</div></div>'

        + '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '八字喜用';
    }

    // --- bz_congge: 八字从格 -> 旧标题 + 五条件 + 核心提示 ---
    else if (cid === 'bz_congge') {
      var cgPat = mdAnalysis.pattern || {};
      var cgZg = mdAnalysis.zhengge || {};
      var cgXy = mdAnalysis.xiyong || {};
      var dmGan3 = GAN[riGan];
      var dmWx3 = WX[riGan>>1];
      var yueZhi4 = ZHI[ob.b2%12];
      var wxKeys2 = ['mu','huo','tu','jin','shui'];
      var riWxKey2 = wxKeys2[riGan>>1];
      var dayScore = wxCalc && wxCalc.scores ? (wxCalc.scores[riWxKey2]||0) : 0;

      var congCheck = typeof _congCheck_md === 'function' ? _congCheck_md(ob, dayScore, wxCalc) : null;
      var conds = (congCheck && congCheck.conditions) ? congCheck.conditions : [false,false,false,false,false];
      var condNames = ['日主无根(通根<=10分)', '天干无印比', '异党>=70%', '月令不助日主', '无印星通关'];
      var passCount = 0; for (var pci=0;pci<conds.length;pci++) if (conds[pci]) passCount++;

      var body = '<div class="card" data-card-id="bz_congge">'
        + '<div class="card-header" onclick="toggleBaziCardCollapse(this)"><span><i class="ti ti-triangle"></i> 八字从格</span><i class="ti ti-chevron-down card-collapse-icon"></i></div>'
        + '<div class="card-body"><div class="bz-section-body">'
        + '<div class="bz-dingge-title"><i class="ti ti-sparkles"></i> 八字从格</div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">一、四柱概览</div>'
        + '<div class="bz-dingge-step-body">'
        + '年柱 ' + GAN[ob.b1%10] + ZHI[ob.b1%12] + ' 月柱 ' + GAN[ob.b2%10] + ZHI[ob.b2%12] + '  '
        + '日柱 ' + GAN[ob.b3%10] + ZHI[ob.b3%12] + ' 时柱 ' + GAN[ob.b4%10] + ZHI[ob.b4%12] + '<br>'
        + '日主 <span class="bz-dingge-highlight">' + dmGan3 + '</span>（五行属' + dmWx3 + '）<br>'
        + '月令 <span class="bz-dingge-gold">' + yueZhi4 + '</span><br>';
      var rootCount2 = 0;
      if (wxCalc && wxCalc.details) {
        for (var ri2 = 0; ri2 < wxCalc.details.length; ri2++) {
          if (wxCalc.details[ri2].wx === dmWx3) {
            var tgR = wxCalc.details[ri2].breakdown.tonggen || {};
            rootCount2 = tgR.items ? tgR.items.length : 0;
          }
        }
      }
      body += '日主根气：' + (rootCount2 > 0 ? '<span class="bz-dingge-gold">有根（' + rootCount2 + '处）</span>' : '<span style="color:var(--color-cinnabar)">无根</span>')
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">二、从格五条件检查 (MD 4.2)</div>'
        + '<div class="bz-dingge-step-body">'
        + '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0">'
        + '<tr style="background:rgba(212,184,102,0.12)"><th style="padding:4px 8px;border:1px solid #D4A574">条件</th><th style="padding:4px 8px;border:1px solid #D4A574">结果</th></tr>';
      for (var cdi = 0; cdi < conds.length; cdi++) {
        body += '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink)">' + condNames[cdi] + '</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);color:' + (conds[cdi]?'#5D8A7C':'var(--color-cinnabar)') + ';font-weight:700">'
          + (conds[cdi] ? '满足' : '不满足') + '</td></tr>';
      }
      body += '</table>'
        + '五条件满足' + passCount + '/5。<br>'
        + '据《子平真诠》卷五·论从格："有印相生，虽弱不从。"'
        + '</div></div>'

        + '<div class="bz-dingge-step"><div class="bz-dingge-step-label">三、结论</div>'
        + '<div class="bz-dingge-step-body">';
      if (cgPat.isCong) {
        body += '五条件全部满足 -> <span class="bz-dingge-highlight">' + (cgPat.congType||'从格成立') + '</span>。<br>'
          + (cgPat.source||'') + '<br>'
          + '格局状态：<span class="bz-dingge-geju">' + (cgPat.status||'成格') + '</span> 等级：<span class="bz-dingge-grade">' + (cgPat.grade||'中格') + '</span>';
      } else {
        body += '不满足从格条件 -> <span class="bz-dingge-highlight">非从格</span>。<br>'
          + '此造应按普通格局论命（' + (cgZg.type||'正格') + '·' + (cgPat.status||'?') + '），'
          + '参阅「八字格局」及「八字喜用」卡片分析。';
      }
      body += '</div></div>';

      // 从格核心提示（从格成立时追加）
      if (cgPat.isCong) {
        body += '<div class="bz-dingge-step bz-section--red" style="margin-top:12px">'
          + '<div class="bz-dingge-step-label">八、从格核心提示（命主必读）</div>'
          + '<div class="bz-dingge-step-body" style="font-size:13px;line-height:1.9">'

          + '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px">一、命局简析</div>'
          + '<p style="margin:2px 0 8px 0">日主<span class="bz-dingge-highlight">' + dmGan3 + '</span>（五行属' + dmWx3 + '），全局克泄耗力量占绝对主导，日主弱至极点，只能顺从旺势。<br>'
          + '《滴天髓》云："阳干从气不从势，阴干从势无情义。"日主' + dmGan3 + '为' + (riGan%2===0?'阳':'阴') + '干，'
          + (riGan%2===0?'需严格无根方能论从。':'从弱条件可略宽。') + '</p>'

          + '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px">二、喜用神详解（顺势而取）</div>'
          + '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px 0">'
          + '<tr style="background:rgba(212,184,102,0.12)"><th style="padding:4px 8px;border:1px solid #D4A574">类别</th><th style="padding:4px 8px;border:1px solid #D4A574">十神</th><th style="padding:4px 8px;border:1px solid #D4A574">命理作用</th></tr>'
          + '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);font-weight:700">用神</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);color:#C41E0A;font-weight:700">' + (cgXy.useGod?cgXy.useGod.element:'?') + '</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-size:11px">顺势取用，全局最旺</td></tr>'
          + '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);font-weight:700">喜神</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-weight:700">' + (cgXy.likeGod?cgXy.likeGod.element:'?') + '</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-size:11px">生助用神，锦上添花</td></tr>'
          + '</table>'

          + '<div style="font-weight:700;color:var(--color-cinnabar-deep);margin-bottom:4px">三、忌神警示（触之必凶）</div>'
          + '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px 0">'
          + '<tr style="background:rgba(196,30,10,0.06)"><th style="padding:4px 8px;border:1px solid #D4A574">危险等级</th><th style="padding:4px 8px;border:1px solid #D4A574">十神</th><th style="padding:4px 8px;border:1px solid #D4A574">破格后果</th></tr>'
          + '<tr><td style="padding:4px 8px;border:1px solid var(--border-ink);text-align:center;color:#C41E0A;font-weight:700">第一忌神</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);color:#8B1508;font-weight:700">' + (cgXy.fearGod?cgXy.fearGod.element:'?') + '</td>'
          + '<td style="padding:4px 8px;border:1px solid var(--border-ink);font-size:11px">直接破格，犯旺招灾，主破财、官非、病灾</td></tr>'
          + '</table>'

          + '<div style="font-weight:700;color:#C41E0A;margin-bottom:4px">四、核心原则</div>'
          + '<p style="margin:2px 0 8px 0">'
          + '从格之命，一生需<span style="color:#C41E0A;font-weight:700">「顺势而不逆」</span>。逢喜神运必发达，逢忌神运必遭重挫。<br>'
          + '《渊海子平》云："从格无根，方论从。"大运见印比即破。<br>'
          + '《子平真诠》："真从之格局，逢印比运即破。"'
          + '</p>'

          + '<div style="font-weight:700;color:#5D8A7C;margin-bottom:4px">五、典籍参考</div>'
          + '<p style="margin:2px 0 4px 0;font-size:12px">'
          + '《滴天髓》上篇·从象："从得真者只论从，从神又有吉和凶。"<br>'
          + '《子平真诠》卷五·论从格："有印相生，虽弱不从。真从之格局，逢印比运即破。"'
          + '</p>'
          + '</div></div>';
      }

      body += '</div></div></div>';
      cards[i].body = body;
      cards[i].title = '八字从格';
    }

    // 4张纯数据卡"""

# Write to file
with open('server/routes/bazi.js', 'r', encoding='utf-8') as f:
    content = f.read()

marker = '    // 4张纯数据卡// 4张纯数据卡'
if marker in content:
    content = content.replace(marker, NEW_CARDS_CODE)
    print('OK: inserted 3 cards before marker')
else:
    print('FAIL: marker not found')

with open('server/routes/bazi.js', 'w', encoding='utf-8') as f:
    f.write(content)
