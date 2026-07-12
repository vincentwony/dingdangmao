# 双分析管道灰度迁移方案

> **目标**：安全地从旧管道（`_computeCongGeData` tyme4j决策树）迁移到新管道（`_baziAnalysis_md` MD文档决策树），零功能回归。

## 1. 当前状态

### 双管道架构（现状）

```
POST /api/v1/bazi
  │
  ├─ _computeAllWuxing(ob)          ← 共享：7层五行权重计算
  │
  ├─ [旧管道] _computeCongGeData(ob)  ← tyme4j：印星否决→从格→正格
  │   └─ 输出: ob._congGeData, ob._geName
  │   └─ API字段: congGe, geName
  │
  └─ [新管道] _baziAnalysis_md(ob, wxCalc) ← MD文档：从强→化气→从格→正格
      └─ 输出: mdAnalysis
      └─ API字段: mdPattern, mdXiyong, mdVerify, mdDayMaster
```

### 双管道差异对比

| 维度 | 旧管道 (`_computeCongGeData`) | 新管道 (`_baziAnalysis_md`) |
|------|------|------|
| **决策树顺序** | 印星否决→从格→正格 | 从强格→化气格→从格→正格 |
| **化气格** | 不支持 | ✅ 三条件紧贴判定 |
| **从格阈值** | 克泄耗≥80%（旧） | 从旺≥80%，从弱≥85%（tyme4j标准） |
| **中和区间** | 无细化 | ✅ slTilt 偏强/偏弱 |
| **调候** | 无 | ✅ 冬/夏月自动检测 |
| **自洽验算** | 无 | ✅ 5层检查 + 置信度评分 |
| **格局成败** | 简单 | ✅ 十格局破格条件 + 等级评定 |
| **客户端消费** | `congGe` 字段（旧格式） | `mdPattern`/`mdXiyong`（新卡片） |

### 客户端双重消费（现状）

```
bazi-ui.js renderResult()
  ├─ data.congGe → 旧「八字从格分析」面板（determineCongGe 等函数）
  ├─ data.geName → 格局名称显示
  ├─ data.mdPattern → 「AI 格局分析 (MD规范)」卡片 ← 新增
  ├─ data.mdXiyong → 喜用神显示
  ├─ data.wuxingScores → 五行分布柱状图（共享）
  └─ data.wuxingPct / wuxingLevels → 五行等级指示器
```

---

## 2. 灰度开关设计

### 2.1 三层开关体系

```
┌─────────────────────────────────────────────┐
│  Layer 1: 服务端环境变量 (全局默认)           │
│  PIPELINE_MODE = "dual" | "new_only" | "old_only" │
│  PIPELINE_GRAY_PCT = 0~100 (新管道流量%)      │
├─────────────────────────────────────────────┤
│  Layer 2: 请求头覆盖 (单请求粒度)             │
│  X-Pipeline-Mode: "new" | "old" | "dual"     │
├─────────────────────────────────────────────┤
│  Layer 3: 客户端 localStorage (用户粒度)      │
│  _pipeline_mode: "auto" | "new" | "old"      │
└─────────────────────────────────────────────┘
```

**优先级**：Layer 2 > Layer 3 > Layer 1

### 2.2 灰度分组算法

```javascript
/**
 * 确定性灰度分组 — 基于机器码哈希，同一用户始终在同一组
 * @param {string} machineId — 12字符 hex 机器码
 * @param {number} pct — 新管道流量百分比 (0-100)
 * @returns {'new'|'old'} 分组结果
 */
function grayGroup(machineId, pct) {
  // 取机器码前8字符作为哈希种子
  var seed = parseInt(machineId.substring(0, 8), 16);
  return (seed % 100 < pct) ? 'new' : 'old';
}
```

### 2.3 灰度阶段规划

| 阶段 | 时长 | 新管道流量 | 旧管道行为 | 回滚条件 |
|------|------|-----------|-----------|---------|
| **Phase 0** (当前) | — | 双写双读 | 正常运行 | — |
| **Phase 1** 灰度10% | 3天 | 10% | 正常运行 | 不一致率>5% |
| **Phase 2** 灰度50% | 3天 | 50% | 仍运行但结果仅用于比对 | 不一致率>3% |
| **Phase 3** 灰度100% | 7天 | 100%主输出 | 静默运行（比对+日志） | 错误率>1% |
| **Phase 4** 下线旧管道 | — | 100% | 代码删除 | — |

---

## 3. 降级与回滚机制

### 3.1 自动降级触发条件

```javascript
var DEGRADE_CONDITIONS = {
  // 条件1: 新管道异常率超过阈值
  errorRate:     { threshold: 0.05, window: 100 },  // 5%错误率/100请求
  
  // 条件2: 新管道超时率超过阈值
  timeoutRate:   { threshold: 0.10, window: 100 },  // 10%超时/100请求
  
  // 条件3: 新旧结果不一致率（仅对关键字段）
  mismatchRate:  { threshold: 0.30, window: 50 },   // 30%不一致/50请求
  
  // 条件4: 新管道平均延迟超过旧管道3倍
  latencyRatio:  { threshold: 3.0, window: 50 }
};
```

### 3.2 降级行为

```
触发降级 → 自动切回旧管道 → 告警 → 人工介入
  │
  ├─ 立即: 所有请求使用旧管道结果
  ├─ 告警: console.error + 写入降级日志文件
  └─ 恢复: 需手动清除降级标记（避免振荡）
```

### 3.3 回滚操作

```bash
# 立即回滚到旧管道（无需重启）
curl -X POST http://localhost:3000/admin/pipeline/rollback

# 或设置环境变量后重启
export PIPELINE_MODE=old_only
node index.js
```

---

## 4. 核心伪代码实现

### 4.1 `analyzeWithFallback` — 灰度分析核心

```javascript
/**
 * 灰度分析入口 — 根据开关选择管道，带降级保护
 * 
 * @param {object} ob — 八字排盘结果对象（mingLiBaZi 已填充）
 * @param {object} wxCalc — _computeAllWuxing 的返回值
 * @param {object} ctx — 请求上下文 { machineId, headers, query }
 * @returns {{ pattern, xiyong, verify, dayMaster, pipeline: 'new'|'old'|'degraded' }}
 */
function analyzeWithFallback(ob, wxCalc, ctx) {
  var mode = resolvePipelineMode(ctx);
  var result;
  
  // ─── 路径1: 仅新管道 ───
  if (mode === 'new') {
    try {
      var newResult = _baziAnalysis_md(ob, wxCalc);
      logPipelineMetrics('new', 'success', Date.now() - t0);
      return Object.assign({}, newResult, { pipeline: 'new' });
    } catch (e) {
      logPipelineMetrics('new', 'error', e.message);
      // 降级: 新管道失败 → 回退旧管道
      if (typeof _computeCongGeData === 'function') {
        var degradedResult = buildLegacyResult(ob, wxCalc);
        logPipelineMetrics('degraded', 'new_failed_fallback_to_old');
        return Object.assign({}, degradedResult, { pipeline: 'degraded' });
      }
      throw e; // 无旧管道可用，抛出
    }
  }
  
  // ─── 路径2: 双写比对 ───
  if (mode === 'dual') {
    // 旧管道（已有结果，从 ob 读取）
    var oldResult = buildLegacyResult(ob, wxCalc);
    
    // 新管道
    var newResult = null;
    try {
      newResult = _baziAnalysis_md(ob, wxCalc);
    } catch (e) {
      logPipelineMetrics('new', 'error_in_dual', e.message);
    }
    
    // 比对（仅当两者都成功）
    if (newResult) {
      var diff = comparePipelineResults(oldResult, newResult);
      if (diff.hasSignificantDifference) {
        logPipelineDiff(diff, ob); // 记录差异样本供分析
      }
    }
    
    // 以新管道为主，包装旧管道结果作为 fallback
    return Object.assign(
      {},
      newResult || oldResult,
      { 
        pipeline: newResult ? 'new' : 'degraded',
        _legacy: oldResult,  // 旧格式保留兼容
        _diff: diff || null
      }
    );
  }
  
  // ─── 路径3: 仅旧管道 ───
  return Object.assign({}, buildLegacyResult(ob, wxCalc), { pipeline: 'old' });
}

/**
 * 解析管道模式 — 三层优先级
 */
function resolvePipelineMode(ctx) {
  // Layer 2: 请求头覆盖（最高优先级）
  var headerMode = (ctx.headers || {})['x-pipeline-mode'];
  if (headerMode === 'new' || headerMode === 'old' || headerMode === 'dual') {
    return headerMode;
  }
  
  // Layer 1: 全局配置
  var envMode = process.env.PIPELINE_MODE || 'dual';
  if (envMode === 'new_only') {
    // 灰度百分比判定
    var machineId = ctx.machineId || '000000000000';
    var pct = parseInt(process.env.PIPELINE_GRAY_PCT || '10');
    return grayGroup(machineId, pct);
  }
  if (envMode === 'old_only') return 'old';
  return 'dual'; // 默认双写
}
```

### 4.2 结果比对逻辑

```javascript
/**
 * 新旧管道结果比对 — 仅比对可比较的关键字段
 * @returns {{ hasSignificantDifference: boolean, diffs: string[], score: number }}
 */
function comparePipelineResults(oldR, newR) {
  var diffs = [];
  var totalChecks = 0;
  var mismatchCount = 0;
  
  // ─── 检查1: 从格判定一致性 ───
  totalChecks++;
  if (oldR.isCong !== undefined && newR.pattern) {
    if (oldR.isCong !== newR.pattern.isCong) {
      diffs.push('从格判定不一致: 旧=' + oldR.isCong + ' 新=' + newR.pattern.isCong);
      mismatchCount++;
    }
  }
  
  // ─── 检查2: 格局类型（仅当非从格时比对） ───
  totalChecks++;
  if (!oldR.isCong && !(newR.pattern && newR.pattern.isCong)) {
    var oldType = oldR.geName || '';
    var newType = (newR.pattern && newR.pattern.type) || '';
    // 格局名可能不同（新管道有化气格等），仅标记差异不视为错误
    if (oldType && newType && oldType !== newType) {
      diffs.push('格局名差异(预期): 旧=' + oldType + ' 新=' + newType);
      // 格局名差异不增加 mismatchCount（新管道更准确）
    }
  }
  
  // ─── 检查3: 用神方向一致性 ───
  totalChecks++;
  if (oldR.xiyongDirection && newR.xiyong) {
    // 旧管道用神方向: '生扶' | '泄克耗'
    // 新管道用神: path 中包含 '生扶' | '泄克耗'
    var oldDir = oldR.xiyongDirection;
    var newPath = newR.xiyong.path || '';
    var newDir = newPath.indexOf('生扶') >= 0 ? '生扶' : 
                 newPath.indexOf('泄克耗') >= 0 ? '泄克耗' : '其他';
    if (oldDir !== newDir && newDir !== '其他') {
      diffs.push('用神方向不一致: 旧=' + oldDir + ' 新=' + newDir);
      mismatchCount++;
    }
  }
  
  return {
    hasSignificantDifference: mismatchCount > 0,
    diffs: diffs,
    totalChecks: totalChecks,
    mismatchCount: mismatchCount,
    mismatchRate: totalChecks > 0 ? mismatchCount / totalChecks : 0
  };
}
```

### 4.3 旧管道结果适配器

```javascript
/**
 * 将旧管道结果（ob._congGeData + wxCalc）转换为与新管道兼容的格式
 * 确保客户端无论走哪个管道，返回数据结构一致
 */
function buildLegacyResult(ob, wxCalc) {
  var cd = ob._congGeData || {};
  var riGanIdx = ob.b3 % 10;
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var WX = ['木','火','土','金','水'];
  var WX_KEYS = ['mu','huo','tu','jin','shui'];
  
  var dayPct = wxCalc.pct[WX_KEYS[riGanIdx>>1]] || 20;
  var dayScore = wxCalc.scores[WX_KEYS[riGanIdx>>1]] || 0;
  
  // 旧管道无 slTilt — 默认 null
  var sl;
  if (dayPct >= 35) sl = '极旺';
  else if (dayPct >= 25) sl = '偏旺';
  else if (dayPct >= 15) sl = '中和';
  else if (dayPct >= 8) sl = '偏弱';
  else sl = '极弱';
  
  return {
    dayMaster:      GAN[riGanIdx],
    dayMasterWx:    WX[riGanIdx>>1],
    strengthLevel:  sl,
    strengthTilt:   null,  // 旧管道无此字段
    strengthPct:    dayPct,
    strengthScore:  dayScore,
    selfPct:        cd.shengPct || 0,
    pattern: {
      type:          ob._geName || '未定格',
      isCong:        cd.isCong || false,
      congType:      cd.congType || null,
      source:        '旧管道(tyme4j决策树)',
      status:        cd.isCong ? '成格' : '未判定',
      grade:         '中格',
      isHua:         false,
      huaType:       null,
      confidence:    70  // 旧管道置信度较低（无自洽验算）
    },
    xiyong: {
      useGod:  { element: cd.luckyEl || '未判定', reason: '旧管道扶抑法' },
      likeGod: { element: '未判定', reason: '' },
      fearGod: { element: cd.unluckyEl || '未判定', reason: '' },
      path:    dayPct >= 25 ? '扶抑-旧管道·泄克耗' : '扶抑-旧管道·生扶',
      tiaoHou: null  // 旧管道无调候
    },
    zhengge: { type: ob._geName || '', source: '旧管道', geSS: '', isSpecial: false },
    verify:  { passed: false, issues: ['旧管道无自洽验算'], confidence: 70 },
    wxData:  wxCalc
  };
}
```

---

## 5. 监控指标定义

### 5.1 指标一览

| 指标 | 类型 | 采集点 | 告警阈值 |
|------|------|--------|---------|
| `pipeline_new_success_rate` | Gauge | analyzeWithFallback 新管道路径 | <95% |
| `pipeline_new_latency_p50` | Histogram | 新管道耗时 | >200ms |
| `pipeline_new_latency_p99` | Histogram | 新管道耗时 | >500ms |
| `pipeline_old_latency_p50` | Histogram | 旧管道耗时 | >100ms |
| `pipeline_mismatch_rate` | Gauge | comparePipelineResults | >20% |
| `pipeline_degraded_count` | Counter | 降级触发次数 | >0 (立即告警) |
| `pipeline_mode_active` | Gauge | 当前模式 (0=old, 1=dual, 2=new) | 非预期值 |
| `pipeline_gray_pct` | Gauge | 当前新管道流量% | — |
| `pipeline_old_call_volume` | Counter | 旧管道调用量 | 灰度100%后应降至0 |

### 5.2 指标采集伪代码

```javascript
// 内存滑动窗口（轻量，无外部依赖）
var MetricsWindow = {
  _buckets: {},  // { metricName: [timestamp, ...] }
  _values: {},   // { metricName: [value, ...] }
  
  record: function(name, value) {
    if (!this._values[name]) { this._values[name] = []; this._buckets[name] = []; }
    this._values[name].push(value);
    this._buckets[name].push(Date.now());
    // 仅保留最近 window 条
    var window = 100;
    if (this._values[name].length > window) {
      this._values[name] = this._values[name].slice(-window);
      this._buckets[name] = this._buckets[name].slice(-window);
    }
  },
  
  rate: function(name, predicate) {
    var vals = this._values[name] || [];
    if (vals.length === 0) return 0;
    var match = 0;
    for (var i=0;i<vals.length;i++) { if (predicate(vals[i])) match++; }
    return match / vals.length;
  },
  
  p50: function(name) {
    var vals = (this._values[name] || []).slice().sort(function(a,b){return a-b;});
    if (vals.length === 0) return 0;
    return vals[Math.floor(vals.length * 0.5)];
  },
  
  p99: function(name) {
    var vals = (this._values[name] || []).slice().sort(function(a,b){return a-b;});
    if (vals.length === 0) return 0;
    return vals[Math.floor(vals.length * 0.99)];
  },
  
  counter: function(name) {
    return (this._values[name] || []).length;
  }
};

// 公开 metrics 端点
// GET /admin/metrics → JSON
// {
//   "pipeline": {
//     "mode": "dual",
//     "gray_pct": 10,
//     "new": { "success_rate": 0.99, "p50_ms": 45, "p99_ms": 180 },
//     "old": { "p50_ms": 32, "p99_ms": 95 },
//     "mismatch_rate": 0.12,
//     "degraded_count": 0
//   }
// }
```

### 5.3 日志采样策略

```javascript
/**
 * 差异样本日志 — 仅在发现不一致时记录完整八字数据
 * 写入: server/logs/pipeline_diff.jsonl (每行一个 JSON)
 */
function logPipelineDiff(diff, ob) {
  // 采样: 仅记录5%的差异（避免日志爆炸）
  if (Math.random() > 0.05) return;
  
  var sample = {
    timestamp: new Date().toISOString(),
    b1: ob.b1, b2: ob.b2, b3: ob.b3, b4: ob.b4,  // 四柱索引
    diffs: diff.diffs,
    oldPattern: ob._geName,
    oldCong: ob._congGeData ? ob._congGeData.isCong : null
  };
  
  // 异步写入，不阻塞响应
  require('fs').appendFile(
    'server/logs/pipeline_diff.jsonl',
    JSON.stringify(sample) + '\n',
    function(err) { if (err) console.error('[pipeline-diff] write error:', err.message); }
  );
}
```

---

## 6. 迁移执行清单

### Phase 0: 准备（当前）
- [ ] 创建 `server/logs/` 目录（如果不存在）
- [ ] 确认 `_tiaoHouMap` 已在 `patterns.js` 中正确导出
- [ ] 确认旧管道所有 consumer 已识别（bazi-ui.js, bazi-interact.js）

### Phase 1: 灰度10%（3天）
- [ ] 在 `routes/bazi.js` 中实现 `analyzeWithFallback` 函数
- [ ] 设置 `PIPELINE_GRAY_PCT=10`
- [ ] 部署 → 观察3天
- [ ] 每日检查 `GET /admin/metrics` 指标
- [ ] 收集 `pipeline_diff.jsonl` 中的差异样本

### Phase 2: 灰度50%（3天）
- [ ] 分析 Phase 1 差异样本，确认差异是可接受的（新管道更准确）
- [ ] 设置 `PIPELINE_GRAY_PCT=50`
- [ ] 客户端增加 `_pipeline_mode` localStorage 开关
- [ ] 若 mismatch_rate > 5%，回滚到 Phase 1

### Phase 3: 灰度100%（7天）
- [ ] 设置 `PIPELINE_MODE=new_only` + `PIPELINE_GRAY_PCT=100`
- [ ] 旧管道静默运行，仅用于比对日志
- [ ] 客户端默认展示新管道结果，旧面板标记为"旧版(即将下线)"
- [ ] 运行至少一个完整的农历月周期

### Phase 4: 下线旧管道
- [ ] 删除 `_computeCongGeData` 调用（保留函数定义为注释）
- [ ] 删除 API 响应中的 `congGe` 字段（保留 `geName` 兼容）
- [ ] 客户端移除旧「八字从格分析」面板
- [ ] 更新 CLAUDE.md 中的数据流文档

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 新管道结果与旧管道大比例不一致 | 中 | 用户困惑 | Phase 1-2 期间收集差异样本，人工审核 |
| 新管道性能差于旧管道 | 低 | 响应变慢 | 新管道纯计算无I/O，预计 <50ms |
| 化气格判定过于宽松 | 中 | 误判格局 | Phase 2 期间增加化气格样本的人工校验 |
| 从格阈值变化导致格局变更 | 中 | 部分八字格局改变 | 这是预期行为（MD文档标准），非回归 |
| 客户端同时显示新旧两套结果 | 高 | UI 混乱 | Phase 3 统一为新卡片，旧面板标记弃用 |

---

## 确定性声明

- **确定**：当前双管道同时运行，每次请求额外浪费 ~5ms（`_baziAnalysis_md` 的纯CPU时间）
- **确定**：新管道增加了化气格判定、调候检测、自洽验算三个旧管道不具备的能力
- **确定**：灰度开关三层优先级设计可以在不重启服务的情况下切换管道
- **确定**：降级机制确保新管道任何异常都能自动回退到旧管道
- **不确定**：新旧管道的不一致率具体数值——此为推测，需 Phase 1 实际数据
- **不确定**：客户端同时展示新旧结果对用户的困惑程度——此为推测，需用户反馈
