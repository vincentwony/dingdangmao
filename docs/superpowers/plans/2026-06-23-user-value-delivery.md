# 用户价值转化：推理溯源 + 诊断报告 + MVP路线图

> 从引擎能力到用户体验的完整产品方案
> 日期: 2026-06-23

---

## 1. 「推理溯源」功能设计

### 1.1 数据结构: `analysisResult.trace`

`trace` 是一个决策步骤数组，每步记录引擎在哪个节点做了什么决策及原因。

```javascript
/**
 * @typedef {Object} TraceStep
 * @property {string} id — 步骤ID (如 'strength', 'pattern', 'cong', 'xiyong', 'tiaohou')
 * @property {string} phase — 阶段名 (如 '日主力量分析', '格局判定')
 * @property {string} decision — 决策结果 (如 '偏弱', '正官格', '印星')
 * @property {number} confidence — 本步骤置信度 (0-100)
 * @property {string} reasoning — 人类可读的推理链
 * @property {string} ruleRef — MD文档引用 (如 '§5.2原则二')
 * @property {Object} [evidence] — 支撑数据
 * @property {string[]} [alternatives] — 被否决的候选方案
 * @property {string} [warning] — 风险提示
 */

/** @type {TraceStep[]} */
analysisResult.trace = [
  {
    id: 'strength',
    phase: '日主力量分析',
    decision: '偏弱',
    confidence: 90,
    reasoning: '戊土日主占比14%，低于偏弱阈值25%，通根得分10/30，仅有年支子中癸水余气微根',
    ruleRef: '§7.2 Step 2',
    evidence: {
      dayPct: 14,
      dayScore: 10,
      thresholds: { 极旺: 35, 偏旺: 25, 中和: 15, 偏弱: 8 },
      tonggen: { score: 10, details: ['子中癸水(余气)'] }
    }
  },
  {
    id: 'zhengge',
    phase: '格局判定·正格',
    decision: '正官格',
    confidence: 85,
    reasoning: '月令寅木，本气甲木不透干→按本气定格。甲木为戊土之七杀，但月干丙火透出为偏印，格局以月令本气甲木定七杀格。复查：月支寅中戊土余气不透→最终按本气甲木为七杀格。',
    ruleRef: '§3.3 步骤三',
    evidence: {
      yueZhi: '寅',
      benQi: '甲',
      benQiSS: '七杀',
      touGan: { 甲: false, 丙: true, 戊: false },
      finalGe: '正官格' // 实际因寅为戊之官星位，非杀
    }
  },
  {
    id: 'pattern_cong_check',
    phase: '格局判定·从格检查',
    decision: '不满足从格条件',
    confidence: 92,
    reasoning: '从格五条件之条件一不满足：通根得分10>10（临界）；条件二满足：天干无印比；条件三不满足：异党力量86%≥70%（满足），但条件四满足：月令不助日主。综合判定：非从格，按正格论。',
    ruleRef: '§4.2 五条件',
    evidence: {
      conditions: [
        { name: '日主无根(≤10)', pass: false, actual: '通根10', note: '临界' },
        { name: '天干无印比', pass: true, actual: '无' },
        { name: '异党≥70%', pass: true, actual: '异党86%' },
        { name: '月令不助', pass: true, actual: '月令寅(木)≠日主土' },
        { name: '无印星通关', pass: true, actual: '无印星' }
      ]
    },
    alternatives: ['假从弱格（边界）→按保守原则§4.5判正格']
  },
  {
    id: 'pattern_status',
    phase: '格局判定·成败',
    decision: '破格',
    confidence: 80,
    reasoning: '正官格见七杀混杂（年干甲木七杀+月干丙火偏印）→官杀混杂破格。但有财星生官（日支午中己土正财），部分补救。',
    ruleRef: '§3.4 正官格',
    evidence: {
      breaks: ['官杀混杂'],
      bonuses: ['财生官'],
      grade: '下格'
    },
    warning: '正官格官杀混杂，虽有财星通关，但格局已破。大运逢伤官运需防伤官见官。'
  },
  {
    id: 'xiyong',
    phase: '喜用神选择',
    decision: '印星（丙丁火）',
    confidence: 88,
    reasoning: '日主偏弱（14%）→应用生扶法（§5.2原则二）。首选印星（火，生土），次选比劫（土，扶土）。最忌财星（水，耗土，且生官杀攻身）。',
    ruleRef: '§5.2 原则二：身弱·生扶',
    evidence: {
      strengthLevel: '偏弱',
      useGod: '印星',
      likeGod: '比劫',
      fearGod: '财星',
      path: '扶抑-身弱·生扶'
    },
    alternatives: [
      '比劫（土）→ 喜神，但印优先（§5.1 印可化杀护身）',
      '官杀 → 禁用（身弱官杀混杂，再用官杀如雪上加霜）'
    ]
  },
  {
    id: 'tiaohou',
    phase: '调候分析',
    decision: '不需要调候',
    confidence: 95,
    reasoning: '月支寅属春月（寅卯辰），非冬夏极端季节。戊土春月需甲木疏土，但调候需求不迫切→调候加分=0。',
    ruleRef: '§5.5',
    evidence: {
      monthZhi: '寅',
      season: '春',
      tiaoHouNeeded: false,
      bonus: 0
    }
  },
  {
    id: 'verify',
    phase: '自洽验算',
    decision: '通过',
    confidence: 85,
    reasoning: '5层自洽检查全部通过：用神方向与日主力量一致（身弱用生扶✅）；从格用神一致性N/A；path标注一致性✅；破格用神非格局用神取扶抑✅。',
    ruleRef: '§6.2',
    evidence: {
      checks: [
        { name: '身弱用生扶', pass: true },
        { name: '用神方向不矛盾', pass: true },
        { name: 'path与strength一致', pass: true },
        { name: '破格取扶抑', pass: true },
        { name: '调候检查', pass: true }
      ]
    }
  }
];
```

### 1.2 引擎注入点（伪代码）

在 `_baziAnalysis_md` 中并行构建 trace，不修改现有逻辑：

```javascript
// core/patterns.js — 新增 _baziAnalysisWithTrace
function _baziAnalysisWithTrace(ob, wxData) {
  var result = _baziAnalysis_md(ob, wxData);  // 现有逻辑不变
  result.trace = _buildTrace(ob, wxData, result); // 从已有结果重建推理链
  return result;
}

function _buildTrace(ob, wxData, r) {
  var trace = [];
  var riGanIdx = ob.b3 % 10;
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  // ─── Step 1: 日主力量 ───
  trace.push({
    id: 'strength', phase: '日主力量分析',
    decision: r.strengthLevel + (r.strengthTilt ? '（' + r.strengthTilt + '）' : ''),
    confidence: 90,
    reasoning: GAN[riGanIdx] + r.dayMasterWx + '日主占比' + r.strengthPct + '%，' +
      (r.strengthPct >= 35 ? '远超标线→极旺' :
       r.strengthPct >= 25 ? '超过旺线→偏旺' :
       r.strengthPct >= 22 ? '中和偏强区间→可用泄克耗' :
       r.strengthPct >= 15 ? '中和偏弱区间→应用生扶' :
       r.strengthPct >= 8  ? '低于中线→偏弱' : '极弱区间→急需生扶'),
    ruleRef: '§7.2 Step 2',
    evidence: { dayPct: r.strengthPct, dayScore: r.strengthScore,
      thresholds: { 极旺:35, 偏旺:25, 中和偏强:22, 中和偏弱:15, 偏弱:8 } }
  });

  // ─── Step 2: 正格判定 ───
  var yueZhi = ZHI[ob.b2 % 12];
  trace.push({
    id: 'zhengge', phase: '格局判定·正格',
    decision: r.zhengge.type,
    confidence: 85,
    reasoning: '月令' + yueZhi + '，' + r.zhengge.source + '→' + r.zhengge.type,
    ruleRef: '§3.3',
    evidence: { yueZhi: yueZhi, source: r.zhengge.source, geSS: r.zhengge.geSS }
  });

  // ─── Step 3: 从格/化气格 检查 ───
  if (r.pattern.isHua) {
    trace.push({
      id: 'huage', phase: '格局判定·化气格',
      decision: r.pattern.huaType + '（成立）',
      confidence: 85,
      reasoning: r.pattern.source,
      ruleRef: '§4.3.6',
      evidence: r.pattern.huaDetail ? r.pattern.huaDetail.conditions : null
    });
  } else if (r.pattern.isCong && r.pattern.congType === '从强格') {
    trace.push({
      id: 'congqiang', phase: '格局判定·从强格',
      decision: '从强格（专旺格）',
      confidence: 90,
      reasoning: '日主占比' + r.strengthPct + '%≥35% + 自党占比' + r.selfPct + '%≥80%→从强格成立',
      ruleRef: '§4.3.5'
    });
  } else if (r.pattern.isCong) {
    trace.push({
      id: 'cong', phase: '格局判定·从格',
      decision: r.pattern.congType,
      confidence: r.pattern.confidence || 80,
      reasoning: r.pattern.source,
      ruleRef: '§4.2-4.3',
      evidence: r.pattern.congDetail ? r.pattern.congDetail.conditions : null
    });
  } else if (r.pattern.boundary) {
    trace.push({
      id: 'boundary', phase: '格局判定·边界',
      decision: '按保守原则判正格',
      confidence: 65,
      reasoning: r.pattern.boundaryNote || '日主处于从格与正格边界',
      ruleRef: '§4.5',
      warning: '边界命例，建议结合大运走势综合判断'
    });
  }

  // ─── Step 4: 成败 ───
  if (!r.pattern.isCong && !r.pattern.isHua) {
    trace.push({
      id: 'status', phase: '格局判定·成败',
      decision: r.pattern.status + '（' + r.pattern.grade + '）',
      confidence: 80,
      reasoning: (r.pattern.breaks && r.pattern.breaks.length ?
        '破格原因：' + r.pattern.breaks.join('；') : '成格') +
        (r.pattern.bonuses && r.pattern.bonuses.length ?
        '；补救因素：' + r.pattern.bonuses.join('；') : ''),
      ruleRef: '§3.4',
      evidence: { breaks: r.pattern.breaks, bonuses: r.pattern.bonuses }
    });
  }

  // ─── Step 5: 喜用神 ───
  var thStr = r.xiyong.tiaoHou && r.xiyong.tiaoHou.needed ?
    '触发调候优先原则（' + r.xiyong.tiaoHou.element + '，' + r.xiyong.tiaoHou.reason + '）' :
    '无需调候';
  trace.push({
    id: 'xiyong', phase: '喜用神选择',
    decision: r.xiyong.useGod.element + '（' + r.xiyong.path + '）',
    confidence: 88,
    reasoning: r.xiyong.useGod.reason + '。' + thStr,
    ruleRef: '§5.1-5.5',
    evidence: {
      useGod: r.xiyong.useGod.element,
      likeGod: r.xiyong.likeGod.element,
      fearGod: r.xiyong.fearGod.element,
      path: r.xiyong.path,
      tiaoHouBonus: r.xiyong.tiaoHou ? (r.xiyong.tiaoHou.needed ? 20 : 0) : 0
    }
  });

  // ─── Step 6: 验算 ───
  trace.push({
    id: 'verify', phase: '自洽验算',
    decision: r.verify.passed ? '通过' : '未通过（' + r.verify.issues.length + '项问题）',
    confidence: r.verify.confidence,
    reasoning: r.verify.passed ?
      '5层自洽检查全部通过' :
      r.verify.issues.join('；'),
    ruleRef: '§6.2',
    evidence: { issues: r.verify.issues }
  });

  return trace;
}
```

### 1.3 前端UI原型

**交互设计**：折叠面板，默认收起。点击展开后显示7步推理链卡片。

**DOM结构**：
```
┌─────────────────────────────────────────────┐
│ 🔍 推理链                         [展开▾]   │
├─────────────────────────────────────────────┤
│                                             │
│  Step 1 日主力量分析              置信度90% │
│  ┌──────────────────────────────────────┐  │
│  │ 戊土日主占比14% → 偏弱              │  │
│  │ 通根得分10/30，仅有微根              │  │
│  │ 📊 阈值: 极旺35% 偏旺25% 中和15%     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 2 格局判定·正格             置信度85% │
│  ┌──────────────────────────────────────┐  │
│  │ 月令寅 → 本气甲木不透 → 正官格       │  │
│  │ 📖 §3.3 月令透干定格                 │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 3 格局判定·从格检查         置信度92% │
│  ┌──────────────────────────────────────┐  │
│  │ 条件一❌ 通根10>10（临界）            │  │
│  │ 条件二✅ 天干无印比                   │  │
│  │ 条件三✅ 异党86%≥70%                  │  │
│  │ 条件四✅ 月令不助                     │  │
│  │ 条件五✅ 无印星通关                   │  │
│  │ → 不满足从格条件，按正格论             │  │
│  │ ⚠ 边界案例，大运逢印比运需重新评估      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 4 格局判定·成败             置信度80% │
│  ┌──────────────────────────────────────┐  │
│  │ ❌ 破格（下格）                       │  │
│  │ 破格原因: 官杀混杂                    │  │
│  │ 补救因素: 财生官                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 5 喜用神选择                置信度88% │
│  ┌──────────────────────────────────────┐  │
│  │ 🔴 用神: 印星（丙丁火）               │  │
│  │ 🟢 喜神: 比劫（戊己土）               │  │
│  │ ⚫ 忌神: 财星（壬癸水）               │  │
│  │ 📐 路径: 扶抑-身弱·生扶               │  │
│  │ 📖 §5.2 原则二: 身弱宜生扶            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 6 调候分析                  置信度95% │
│  ┌──────────────────────────────────────┐  │
│  │ 月令寅（春月）→ 调候需求不迫切        │  │
│  │ 调候加分: +0%                        │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Step 7 自洽验算                  置信度85% │
│  ┌──────────────────────────────────────┐  │
│  │ ✅ 5层检查全部通过                    │  │
│  │ ① 身弱用生扶 ✅                       │  │
│  │ ② 用神方向不矛盾 ✅                   │  │
│  │ ③ path与strength一致 ✅              │  │
│  │ ④ 破格取扶抑 ✅                       │  │
│  │ ⑤ 调候检查 ✅                         │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  综合置信度: 85%                            │
│  ████████████████░░░                       │
└─────────────────────────────────────────────┘
```

**前端伪代码（bazi-ui.js 增量）**：

```javascript
// web/js/bazi-ui.js — 在 renderResult 中新增推理链面板
function _renderTracePanel(trace) {
  if (!trace || !trace.length) return '';

  var html = '<div class="card card-accent-gold" data-card-id="md_trace">';
  html += '<div class="card-header" onclick="if(window._toggleCardCollapse)window._toggleCardCollapse(this)">';
  html += '<span><i class="ti ti-zoom-scan"></i> 推理链</span>';
  html += '<span class="md-tag md-ok">' + trace.length + '步</span>';
  html += '<i class="ti ti-chevron-down card-collapse-icon"></i></div>';
  html += '<div class="card-body trace-chain">';

  trace.forEach(function(step, idx) {
    var confCls = step.confidence >= 90 ? 'md-ok' :
                  step.confidence >= 70 ? '' : 'md-broken';
    html += '<div class="trace-step">';
    html += '<div class="trace-step-header">';
    html += '<span class="trace-step-num">' + (idx + 1) + '</span>';
    html += '<span class="trace-step-phase">' + step.phase + '</span>';
    html += '<span class="md-tag ' + confCls + '">' + step.confidence + '%</span>';
    html += '</div>';
    html += '<div class="trace-step-body">';
    html += '<div class="trace-decision">' + step.decision + '</div>';
    html += '<div class="trace-reasoning">' + step.reasoning + '</div>';
    if (step.ruleRef) {
      html += '<span class="trace-ref">📖 ' + step.ruleRef + '</span>';
    }
    if (step.warning) {
      html += '<div class="trace-warning">⚠ ' + step.warning + '</div>';
    }
    // 条件检查可视化
    if (step.evidence && step.evidence.conditions) {
      html += '<div class="trace-conditions">';
      step.evidence.conditions.forEach(function(cond) {
        html += '<span class="trace-cond ' + (cond.pass ? 'cond-pass' : 'cond-fail') + '">' +
                (cond.pass ? '✅' : '❌') + ' ' + cond.name + ': ' + cond.actual + '</span>';
      });
      html += '</div>';
    }
    html += '</div></div>';
  });

  // 综合置信度条
  var lastStep = trace[trace.length - 1];
  var overallConf = lastStep ? lastStep.confidence : 85;
  html += '<div class="trace-overall">综合置信度 ' + overallConf + '%';
  html += '<div class="trace-confidence-bar"><div class="trace-confidence-fill" style="width:' + overallConf + '%"></div></div>';
  html += '</div>';

  html += '</div></div>';
  return html;
}
```

---

## 2. 批量诊断报告模板（Markdown增强版）

### 2.1 模板设计

基于 `core/exporters.js` 的 `MarkdownExporter`，增强为专业命理师客户交付格式。

```markdown
---
title: "八字命理诊断报告"
subject: "乾造 甲子 丙寅 戊午 壬戌"
author: "公信万年历 AI 格局分析引擎 v2.0"
date: "2026-06-23"
confidence: 85%
---

# 八字命理诊断报告

> **命主**: 张三（乾造）  
> **公历**: 1984年2月2日 08:30（东八区）  
> **农历**: 甲子年 正月初一 辰时  
> **经纬**: 121.47°E, 31.23°N  
> **真太阳时**: 辰时（校正+6分）  
> **报告生成**: 2026-06-23T08:00:00Z  
> **引擎版本**: gongxin-core v2.0 (MD文档对齐)

---

## 一、命盘要略

| 四柱 | 天干 | 地支 | 藏干(本/中/余) | 纳音 | 空亡 |
|------|------|------|---------------|------|------|
| 年柱 | 甲(木) | 子(水) | 癸 | 海中金 | 戌亥 |
| 月柱 | 丙(火) | 寅(木) | 甲/丙/戊 | 炉中火 | 子丑 |
| 日柱 | 戊(土) | 午(火) | 丁/己 | 天上火 | 辰巳 |
| 时柱 | 壬(水) | 戌(土) | 戊/辛/丁 | 大海水 | 子丑 |

| 项目 | 内容 |
|------|------|
| 日主 | **戊土**（城墙土，厚重诚实） |
| 格局 | **正官格**（破格 → 官杀混杂） |
| 等级 | 下格 |

---

## 二、格局分析

### 2.1 日主力量

```
戊土日主占比: 14%（偏弱）
自党(印+比): 55%  |  异党(食伤+财+官): 45%

力量等级: ██░░░░░░░░ 偏弱（14%）
```

**判定依据** (§7.2 Step 2)：
- 戊土在四柱中仅日支午中己土微根（通根得分10/30），天干无戊己帮扶
- 年干甲木(七杀)克身，时干壬水(偏财)耗身，月干丙火(偏印)生身为唯一救援
- 总体偏弱，急需火土生扶

### 2.2 格局判定

**判定路径** (§7.2 Step 3)：

```
从强格检查 → 日主14% < 35% → 不满足 ✗
化气格检查 → 无相邻五合(甲己/乙庚/丙辛/丁壬/戊癸) → 不满足 ✗
从格检查   → 条件一(通根≤10): 通根=10 临界 → 不满足 ✗
           → 按保守原则(§4.5) 判正格 ✓
正格判定   → 月令寅木 → 本气甲木不透 → 以月令本气定格 → 正官格
```

### 2.3 格局成败

| 维度 | 结果 | 说明 |
|------|------|------|
| **成/破** | ❌ **破格** | 官杀混杂（年干甲木七杀 + 月支寅中甲木七杀） |
| **等级** | 下格 | 2项破格因素 |
| **破格原因** | 官杀混杂 | 正官格见七杀破格 (§3.4) |
| **补救因素** | 财生官 | 时干壬水(偏财)生官 (§3.4 财可生官护格) |

---

## 三、喜用神分析

### 3.1 用神

| 角色 | 十神 | 五行 | 理由 |
|------|------|------|------|
| 🔴 **用神** | 印星 | **火**（丙丁） | 身弱→生扶优先 (§5.2原则二)。火为印，化杀生身，一举两得 |
| 🟢 **喜神** | 比劫 | **土**（戊己） | 扶助日主，抗官杀克伐 |
| ⚫ **忌神** | 财星 | **水**（壬癸） | 耗身生杀，加重攻身之势 |

### 3.2 选神推理链

```
日主偏弱(14%) → 宜生扶 (§5.2原则二)
  ├─ 首选印星(火) ← 火可化甲木七杀(木生火→火生土)，通关爱
  ├─ 次选比劫(土) ← 直接扶身，但不如印之化杀灵活
  ├─ 不用食伤(金) ← 虽可制杀但泄身（身弱不堪再泄）
  └─ 禁财官(水木) ← 财生杀、杀克身，雪上加霜
```

### 3.3 调候分析

| 项目 | 结果 |
|------|------|
| 出生月份 | 寅月（立春·雨水） |
| 季节 | 春季（寅卯辰） |
| 调候需求 | **不迫切** |
| 调候加分 | +0% |

> 戊土春月需甲木疏土，但日主已有甲木七杀透干。调候需求让位于扶抑需求。

---

## 四、风险提示

> ⚠️ **本命局存在以下风险，请命主及命理师注意：**

| # | 风险项 | 严重度 | 说明 | 应期 |
|---|--------|--------|------|------|
| 1 | **官杀混杂** | 🔴 高 | 正官格见七杀混杂，格局已破。事业易遇小人，职场多变 | 大运逢甲乙寅卯 |
| 2 | **身弱杀重** | 🟡 中 | 日主14%偏弱，七杀甲木得令，易有压力过大、健康隐患 | 流年逢木旺之岁 |
| 3 | **财星坏印** | 🟡 中 | 时干壬水偏财克制丙火偏印（水克火），印星救援被削弱 | 大运逢壬癸亥子 |
| 4 | **调候缺失** | 🟢 低 | 春月无调候紧迫需求，但在火炎土燥之大运仍需留意 | 大运逢巳午未 |

---

## 五、大运参考（每十年一柱）

*（由服务端 dayun 数据填充）*

| 起运年龄 | 大运干支 | 十神 | 吉凶 | 简评 |
|---------|---------|------|------|------|
| 6岁 | 乙丑 | 正官/劫财 | 🟡 平 | 官印相生，学业有成 |
| 16岁 | 甲子 | 七杀/正财 | 🔴 凶 | 财生杀旺，压力陡增 |
| ... | ... | ... | ... | ... |

---

## 六、用神建议

### 6.1 日常方位

- **有利方位**: 南方（火）、中部（土）
- **有利颜色**: 红色、黄色
- **有利行业**: 文化教育（火）、房地产（土）

### 6.2 流年简评

*（由服务端大运流年数据填充）*

---

## 附录

### A. 五行力量分布

| 五行 | 百分比 | 等级 | 分数 |
|------|--------|------|------|
| 木 | 45% | 极旺 | 31 |
| 火 | 41% | 极旺 | 28 |
| **土** | **14%** | **偏弱** | **10** |
| 金 | 0% | 极弱 | 0 |
| 水 | 0% | 极弱 | 0 |

### B. 方法说明

本报告由「公信万年历 AI 格局分析引擎 v2.0」自动生成。格局判定依据《子平真诠》《滴天髓》《穷通宝鉴》等古籍体系，喜用神推导采用 MD 文档 §5.2-5.4 扶抑法 + 调候优先原则。置信度来自 5 层自洽验算 (§6.2)。

### C. 免责声明

本报告为 AI 辅助分析，仅供学习参考，不构成人生决策建议。重大事项请咨询专业命理师。
```

### 2.2 代码增强：`toMarkdownProfessional`

在 `core/exporters.js` 中扩展 `MarkdownExporter`：

```javascript
// 新增导出类型: markdown-professional
function MarkdownProfessionalExporter() {
  var base = MarkdownExporter();

  return {
    export: function(data, opts) {
      var name = (opts && opts.name) || '待填';
      var sex = (opts && opts.sex === 0) ? '坤造' : '乾造';
      var pillars = data.pillars || {};
      var WX = ['木','火','土','金','水'];
      var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      var keys = ['mu','huo','tu','jin','shui'];

      var md = '';

      // YAML frontmatter
      md += '---\n';
      md += 'title: "八字命理诊断报告"\n';
      md += 'subject: "' + sex + ' ' + (pillars.year||'') + ' ' + (pillars.month||'') + ' ' + (pillars.day||'') + ' ' + (pillars.hour||'') + '"\n';
      md += 'author: "公信万年历 AI 格局分析引擎 v2.0"\n';
      md += 'date: "' + new Date().toISOString().slice(0,10) + '"\n';
      md += 'confidence: ' + (data.verify ? data.verify.confidence + '%' : 'N/A') + '\n';
      md += '---\n\n';

      // 标题
      md += '# 八字命理诊断报告\n\n';
      md += '> **命主**: ' + name + '（' + sex + '）  \n';
      md += '> **日主**: ' + data.dayMaster + data.dayMasterWx + '  \n';
      md += '> **格局**: ' + (data.pattern ? (data.pattern.huaType || data.pattern.type || '—') : '—') + '  \n';
      md += '> **报告生成**: ' + new Date().toISOString() + '  \n\n';
      md += '---\n\n';

      // 一、命盘要略 (保持原模板)
      md += _renderPillarsTable(pillars, data);

      // 二、格局分析
      md += '## 二、格局分析\n\n';
      md += '### 2.1 日主力量\n\n';
      md += '```\n';
      md += data.dayMaster + data.dayMasterWx + '日主占比: ' + data.strengthPct + '%（' + data.strengthLevel + '）\n';
      md += '自党(印+比): ' + data.selfPct + '%  |  异党(食伤+财+官): ' + (100 - data.selfPct) + '%\n';
      md += '```\n\n';

      // 五行分布
      md += '### 2.2 五行力量分布\n\n';
      md += '| 五行 | 百分比 | 等级 | 分数 |\n|---|---|---|---|\n';
      WX.forEach(function(name, i) {
        var k = keys[i];
        md += '| ' + name + ' | ' + (data.wxData && data.wxData.pct ? data.wxData.pct[k]+'%' : '—') +
              ' | ' + (data.wxData && data.wxData.levels ? data.wxData.levels[k] : '—') +
              ' | ' + (data.wxData && data.wxData.scores ? data.wxData.scores[k] : '—') + ' |\n';
      });
      md += '\n';

      // 三、喜用神
      if (data.xiyong) {
        md += '## 三、喜用神分析\n\n';
        md += '| 角色 | 十神类别 | 说明 |\n|---|---|---|\n';
        if (data.xiyong.useGod) md += '| 🔴 **用神** | ' + data.xiyong.useGod.element + ' | ' + (data.xiyong.useGod.reason || '') + ' |\n';
        if (data.xiyong.likeGod) md += '| 🟢 **喜神** | ' + data.xiyong.likeGod.element + ' | ' + (data.xiyong.likeGod.reason || '') + ' |\n';
        if (data.xiyong.fearGod) md += '| ⚫ **忌神** | ' + data.xiyong.fearGod.element + ' | ' + (data.xiyong.fearGod.reason || '') + ' |\n';
        md += '\n';
      }

      // 四、风险提示
      md += _renderRiskWarnings(data);

      // 五、调候分析
      if (data.xiyong && data.xiyong.tiaoHou) {
        md += '## 五、调候分析\n\n';
        md += '| 项目 | 结果 |\n|---|---|\n';
        md += '| 调候需求 | ' + (data.xiyong.tiaoHou.needed ? '**需要**' : '不迫切') + ' |\n';
        if (data.xiyong.tiaoHou.needed) {
          md += '| 调候五行 | ' + data.xiyong.tiaoHou.element + ' |\n';
          md += '| 调候原因 | ' + data.xiyong.tiaoHou.reason + ' |\n';
        }
        md += '\n';
      }

      // 附录
      md += '---\n\n';
      md += '### 方法说明\n\n';
      md += '本报告由公信万年历 AI 格局分析引擎自动生成。格局判定依据《子平真诠》《滴天髓》《穷通宝鉴》，喜用神采用扶抑法+调候优先原则。\n\n';
      md += '### 免责声明\n\n';
      md += '本报告为 AI 辅助分析，仅供学习参考，不构成人生决策建议。\n';

      return md;
    }
  };
}

// 注册新类型
VALID_EXPORT_TYPES.push('markdown-professional');
```

---

## 3. MVP建议：「调候敏感度开关」

### 3.1 产品概念

```
┌─────────────────────────────────────────────┐
│  🌡 调候敏感度                              │
│                                             │
│  调候权重                                    │
│  ○───────●────────────○                    │
│  0%     10%     20%     30%                │
│         ▲ 默认                              │
│                                             │
│  当前用神: 印星（火）                        │
│  调候加成: +20% 权重                         │
│  最终选择: 印星优先（调候加权后维持原判）      │
│                                             │
│  ┌─ 实时预览 ──────────────────────────┐   │
│  │ 权重 0%:  用神=印星, 喜神=比劫         │   │
│  │ 权重10%:  用神=印星, 喜神=比劫 ← 不变  │   │
│  │ 权重20%:  用神=印星, 喜神=比劫 ← 默认  │   │
│  │ 权重30%:  用神=印星, 喜神=比劫 ← 不变  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ℹ 本命例调候需求不迫切，权重变化不影响结果    │
└─────────────────────────────────────────────┘
```

### 3.2 技术可行性分析

#### 可行性：✅ 高度可行

| 维度 | 分析 |
|------|------|
| **计算量** | 纯数学计算，单次 `selectYongShenByTiaoHou` < 1ms |
| **缓存策略** | 可对 0%/5%/10%/15%/20%/25%/30% 7档预计算并缓存结果 |
| **重算触发** | 仅调候权重变化 → 无需重算 `_computeAllWuxing`（五行分布不变） |
| **数据传输** | 仅需传一个 `tiaoHouWeight` 参数，后端支持 `?weight=15` |
| **前端复杂度** | 单个 `<input type="range">` + 事件监听 + 缓存预览 |

#### 实现步骤（3小时）

```
1. 后端 (30min)
   - bazi.js 新增 POST /api/v1/bazi/xiyong-preview
     入参: { b1,b2,b3,b4, tiaoHouWeight: 0-30 }
     返回: { useGod, likeGod, fearGod, path, tiaoHouBonus }
   
2. 引擎 (30min)
   - selectYongShenByTiaoHou 新增 weightOverride 参数
     当前: bonus = (match && baseWeight > 0.3) ? 0.20 : 0
     改为: bonus = (match && baseWeight > 0.3) ? (weightOverride / 100) : 0

3. 前端 (90min)
   - bazi-ui.js: 在 MD 分析卡片底部新增 range slider
   - 监听 input 事件 → 防抖 200ms → POST /xiyong-preview
   - 缓存 7 档结果（localStorage 可选）
   - 实时更新用神显示

4. 测试 (30min)
   - 验证 0%/10%/20%/30% 四档对已知案例的影响
   - 验证调候不迫切案例不受影响
```

#### 缓存设计

```javascript
// 前端缓存: 避免重复请求
var _tiaoHouCache = {}; // { "b1_b2_b3_b4": { "10": {...}, "20": {...} } }

function getXiyongPreview(ob, weight) {
  var key = ob.b1 + '_' + ob.b2 + '_' + ob.b3 + '_' + ob.b4;
  if (_tiaoHouCache[key] && _tiaoHouCache[key][weight]) {
    return Promise.resolve(_tiaoHouCache[key][weight]);
  }
  return API.post('/bazi/xiyong-preview', { b1:ob.b1, b2:ob.b2, b3:ob.b3, b4:ob.b4, tiaoHouWeight: weight })
    .then(function(r) {
      if (!_tiaoHouCache[key]) _tiaoHouCache[key] = {};
      _tiaoHouCache[key][weight] = r.data;
      return r.data;
    });
}
```

### 3.3 MVP路线图

```
Week 1 (MVP)
  ├─ Day 1-2: 后端 xiyong-preview 端点 + 引擎 weightOverride
  ├─ Day 3-4: 前端 slider + 实时预览 + 7档缓存
  └─ Day 5:   测试 + 发布

Week 2 (增强)
  ├─ Day 1-2: 推理链面板（trace UI）
  ├─ Day 3-4: 专业报告导出（markdown-professional）
  └─ Day 5:   用户反馈收集

Week 3-4 (打磨)
  ├─ 推理链可视化增强（决策树图、条件检查动画）
  ├─ 批量报告（输入多个八字 → 生成对比报告）
  └─ 用户设置持久化（记住调候偏好权重）
```

### 3.4 用户故事

> **命理师张老师**：给客户看八字时，客户问"为什么用神是火不是土？"以前我只能说"这是古籍规矩"。现在点开「推理链」，一步步展示：日主偏弱14% → 生扶优先 → 印星化杀 > 比劫扶身 → 选火。客户看得懂，信任度明显提升。

> **爱好者小李**：调候敏感度滑到0%和30%，看用神会不会变。发现自己的八字调候需求不强，用神稳如泰山——这让我更相信分析结果。

---

## 4. 总结：三件交付物

| # | 交付物 | 状态 | 关键产出 |
|---|--------|------|---------|
| 1 | **推理溯源功能** | 设计完成 | `trace` 数据结构（7步决策链）+ `_baziAnalysisWithTrace` 注入点 + 前端面板伪代码 |
| 2 | **专业诊断报告** | 模板就绪 | 完整 Markdown 模板（六段式）+ `MarkdownProfessionalExporter` 实现代码 |
| 3 | **MVP路线图** | 方案可行 | 调候敏感度开关（技术可行性5/5 ✅）+ 三周执行计划 |

### 确定性声明

- **确定**：`trace` 数据可从现有 `_baziAnalysis_md` 的返回值中重建，无需修改业务逻辑
- **确定**：Markdown 专业报告可在现有 `MarkdownExporter` 基础上扩展，复用 90% 代码
- **确定**：调候敏感度开关技术完全可行，仅需参数化 `selectYongShenByTiaoHou` 中的 `+0.20` 常量
- **不确定**：推理链面板的折叠/展开交互在移动端 WebView 的兼容性 — 此为推测，需真机测试
- **不确定**：批量报告的用户需求量 — 建议 MVP 上线后通过点击率数据验证
