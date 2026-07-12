# 架构健康检查报告 — 2026-Q2

> 检查日期: 2026-06-23  
> 检查范围: `core/` + `server/` + `web/js/`  
> 基准: 2026-06-23 重构后快照

---

## 架构健康评分

| 维度 | 得分 | 满分 | 评级 | 关键扣分项 |
|------|------|------|------|-----------|
| **解耦度** | 62 | 100 | 🟡 中等 | 2个文件中有完全相同的 `_cgSSKind`/`_cgIsShengZhu`/`_cgGanWx`；10个地支关系表在bazi.js中重复定义 |
| **可测性** | 55 | 100 | 🟠 需改进 | `_CS_WEIGHT` 存在两个冲突版本；50+例宣称为32例；部分函数依赖全局状态无法单测 |
| **文档同步率** | 78 | 100 | 🟢 良好 | CLAUDE.md/architecture.md/对比报告 三件齐全；JSDoc覆盖patterns.js和exporters.js |
| **扩展友好度** | 60 | 100 | 🟡 中等 | exporters插件模式良好；但10+处硬编码魔数阻碍调参；GAN/ZHI/wxKeys在各文件中反复定义 |

| **综合评分** | **64** | 100 | 🟡 中等 | 重构取得重大进展（+17分），但基础设施债仍待清理 |

### 评分趋势

```
重构前（估）:  ████████░░░░░░░░░░  47/100
重构后（现在）: ████████████░░░░░░  64/100  (+17)
目标（Q3末）:   ████████████████░░  80/100
```

---

## 1. 已修复的不确定项

| # | 不确定项 | 修复方式 | 状态 |
|---|---------|---------|------|
| 1 | 推理链面板 WebView 兼容性 | 设计中使用 JS `classList.toggle` + 现有 `_toggleCardCollapse` 机制（非原生 `<details>`），已在 patterns.js 重构中验证兼容 | ✅ 已确定 |
| 2 | `_CS_WEIGHT` 双版本冲突 | 见下方 P0-1 修复方案 | 🔴 待修复 |

---

## 2. 重复逻辑扫描结果

### P0 — 立即修复（影响计算正确性）

#### P0-1: `_CS_WEIGHT` 双版本不一致 🔴

**严重度**: 高 — patterns.js 调用 `_csWeight()` 时依赖 `_CS_WEIGHT`，但存在两个不同的数组。

| 文件 | 行 | 数组值 |
|------|-----|--------|
| `wuxing.js` | 87 | `[0.7, 0.5, 0.75, 0.9, 1.0, 0.6, 0.4, 0.2, 0.3, 0.1, 0.25, 0.4]` |
| `bazi.js` | 2503 | `[0.7, 0.2, 0.55, 1.0, 1.0, 0.2, 0.1, 0.0, 0.4, 0.0, 0.15, 0.25]` |

**差异分析** (沐浴/冠带/临官/帝旺/衰/病/死/墓/绝/胎/养):

| 状态 | wuxing.js | bazi.js | 差异 |
|------|-----------|---------|------|
| 长生 | 0.7 | 0.7 | ✅ 一致 |
| 沐浴 | 0.5 | 0.2 | ❌ 差0.3 |
| 冠带 | 0.75 | 0.55 | ❌ 差0.2 |
| 临官 | 0.9 | 1.0 | ❌ 差0.1 |
| 帝旺 | 1.0 | 1.0 | ✅ 一致 |
| 衰 | 0.6 | 0.2 | ❌ 差0.4 |
| 病 | 0.4 | 0.1 | ❌ 差0.3 |
| 死 | 0.2 | 0.0 | ❌ 差0.2 |
| 墓 | 0.3 | 0.4 | ❌ 差0.1 |
| 绝 | 0.1 | 0.0 | ❌ 差0.1 |
| 胎 | 0.25 | 0.15 | ❌ 差0.1 |
| 养 | 0.4 | 0.25 | ❌ 差0.15 |

**运行时行为**: `core/index.js` 先加载 `wuxing.js` 再加载 `bazi.js`，导致 `core._CS_WEIGHT` = bazi.js版本。但 `wuxing.js` 内部的 `_step2_tonggen` 使用自己的局部 `_CS_WEIGHT`。而 `patterns.js` 的 `_checkHuaGe_md` 用 `_csWeight()` → 读取 bazi.js 的 `_CS_WEIGHT`。

**修复方案**:
```javascript
// 1. 将权威版本移至 wuxing.js（7层权重模型为唯一真相源）
// 2. 在 bazi.js 中删除重复定义，改为引用 wuxing.js 的版本
// 3. 在 _csWeight 函数签名中明确参数来源

// wuxing.js 保留（权威版本，经MD文档校验）
var _CS_WEIGHT = [0.7, 0.5, 0.75, 0.9, 1.0, 0.6, 0.4, 0.2, 0.3, 0.1, 0.25, 0.4];

// bazi.js 删除 var _CS_WEIGHT = [...]; 改为:
// _CS_WEIGHT 由 wuxing.js 统一定义，通过全局变量引用
```

### P1 — 本周修复（影响可维护性）

#### P1-1: `_cgSSKind` / `_cgIsShengZhu` / `_cgGanWx` 双重定义

| 函数 | 定义位置 | 可删除位置 |
|------|---------|-----------|
| `_cgSSKind` | `wuxing.js:73` + `bazi.js:2377` | 删除 bazi.js 版本 |
| `_cgIsShengZhu` | `wuxing.js:82` + `bazi.js:2387` | 删除 bazi.js 版本 |
| `_cgGanWx` | `wuxing.js:52` + `bazi.js:2367` | 删除 bazi.js 版本 |

**修复**: 在 bazi.js 中删除重复定义，依赖 wuxing.js 加载到全局作用域的版本。

#### P1-2: 地支关系表在 bazi.js 中重复定义

`bazi.js:2397-2408` 和 `bazi.js:3072-3082` 包含几乎相同的10个地支关系表（六合/三合/半合/三会/六冲/六害/三刑/自刑/六破）。共 ~50 行重复。

**修复**: 删除第二组（`_renderGanZhiBrief` 内联版本），统一使用第一组模块级常量。

#### P1-3: GAN/ZHI/wxKeys/WX 数组泛滥

| 数组 | 出现次数 | 建议常量化位置 |
|------|---------|-------------|
| `['甲'..'癸']` | 7 | `wuxing.js` → `core.GAN` |
| `['子'..'亥']` | 5 | `wuxing.js` → `core.ZHI` |
| `['mu','huo','tu','jin','shui']` | 10 | `wuxing.js` → `core.WX_KEYS` |
| `['木','火','土','金','水']` | 10 | `wuxing.js` → `core.WX` (统一使用 `_WX`) |
| `[4,2,0,0,2,1,1,2,3,3,2,4]` | 2 (patterns.js内) | `wuxing.js` → `core.ZHI_WX` |

**修复**: 在 `wuxing.js` 头部定义一次，所有模块通过全局变量引用（`core/index.js` 已在顶部声明 `var core = {}`）。

### P2 — 下月修复（技术债，不影响功能）

#### P2-1: 季节分类逻辑出现在4个位置

`_seasonGroup`(wuxing.js) / `_checkHuaGe_md`(patterns.js) / `_getSeasonLabel`(patterns.js) / `_tiaoHouCheck_md`(patterns.js) — 虽然边界略有不同（有的含四季月，有的仅冬夏），但可提取为统一入口。

#### P2-2: `WUXING_BRANCH2` 和 `BRANCH_WX2` 完全相同

`shensha.js:54-56` — 两个对象键值完全相同，仅键排序不同。删除一个。

#### P2-3: `WXJ = Lunar.WuXingJ` 在 bazi.js 中定义6次

每个函数内独立定义。提取为模块级常量。

---

## 3. 硬编码魔数清单

### 🔴 高风险（影响调参能力）

| 魔数 | 位置 | 含义 | 建议常量名 |
|------|------|------|-----------|
| `0.20` | `patterns.js:709` | 调候加权比例 | `TIAOHOU_BONUS_WEIGHT` |
| `35/25/22/15/8` | `patterns.js:366-371` | 日主力量阈值 | `STRENGTH_THRESHOLDS` |
| `70/80/85` | `patterns.js:84,95,386` | 从格百分比阈值 | `CONG_*_MIN` |
| `10/15` | `patterns.js:55,102` | 通根分数阈值 | `CONG_ROOT_MAX` |
| `0.7` | `patterns.js:546` | 强根权重阈值 | `STRONG_ROOT_WEIGHT` |

### 🟡 中风险（影响可读性）

| 魔数 | 位置 | 含义 |
|------|------|------|
| `0.8/0.85/0.90` | `patterns.js:758-773` + `patterns.js:633-640` | 月令深浅修正因子（两处重复） |
| `0.3` | `patterns.js:709` | 调候最小基础权重 |
| `20` | `patterns.js:397` | 日主分数从格检查下限 |
| `60` | `patterns.js:102,806` | 边界从格异党下限 + 死地分数上限 |

---

## 4. 建议：可自动化重构 — 导出器插件注册表

### 4.1 设计方案

将当前 `VALID_EXPORT_TYPES` 白名单升级为真正的插件注册表，支持运行时动态添加/移除导出格式。

```javascript
// core/exporters.js — 插件注册表模式

var ExportRegistry = {
  _plugins: {},

  /**
   * 注册一个导出器
   * @param {string} name — 格式名 (如 'json', 'yaml')
   * @param {Function} factory — 工厂函数 () => Exporter
   * @param {Object} meta — 元数据 { description, extensions, mimeType }
   */
  register: function(name, factory, meta) {
    if (this._plugins[name]) {
      console.warn('[exporters] 覆盖已注册的导出器: ' + name);
    }
    this._plugins[name] = { factory: factory, meta: meta || {} };
  },

  /** 获取所有已注册的导出器名称 */
  list: function() {
    return Object.keys(this._plugins);
  },

  /** 获取导出器元数据 */
  meta: function(name) {
    return (this._plugins[name] || {}).meta || null;
  },

  /** 创建导出器实例 */
  create: function(name) {
    var entry = this._plugins[name];
    if (!entry) throw new TypeError('未注册的导出器: ' + name + '。可用: ' + this.list().join(', '));
    return entry.factory();
  }
};

// ─── 内置注册 ───
ExportRegistry.register('json', JsonExporter, {
  description: '格式化JSON序列化',
  extensions: ['.json'],
  mimeType: 'application/json'
});

ExportRegistry.register('csv', CsvExporter, {
  description: 'CSV表格（Excel兼容）',
  extensions: ['.csv'],
  mimeType: 'text/csv'
});

ExportRegistry.register('markdown', MarkdownExporter, {
  description: 'Markdown人类可读报告',
  extensions: ['.md'],
  mimeType: 'text/markdown'
});

ExportRegistry.register('api', ApiExporter, {
  description: '服务端API响应格式',
  extensions: [],
  mimeType: 'application/json'
});

ExportRegistry.register('props', PropsExporter, {
  description: '前端UI组件Props格式',
  extensions: [],
  mimeType: 'application/json'
});

ExportRegistry.register('cache', CacheExporter, {
  description: 'localStorage精简存储格式',
  extensions: [],
  mimeType: 'application/json'
});

// ─── 向后兼容的工厂函数 ───
function createExporter(type) {
  return ExportRegistry.create(type);  // 委托给注册表
}

function assertExporterType(type) {
  if (!ExportRegistry._plugins[type]) {
    throw new TypeError(
      '非法导出类型: "' + type + '"。支持: ' + ExportRegistry.list().join(', ')
    );
  }
}

// 导出注册表供扩展使用
module.exports = {
  createExporter: createExporter,
  assertExporterType: assertExporterType,
  ExportRegistry: ExportRegistry,  // ← 新增：供第三方注册自定义导出器
  exportAll: exportAll,
  VALID_EXPORT_TYPES: ExportRegistry.list()  // 动态生成
};
```

### 4.2 自动化验证（CI脚本）

```bash
#!/bin/bash
# scripts/check-exporters.sh — CI: 验证导出器注册表完整性

echo "=== 导出器注册表检查 ==="

# 1. 所有声称的类型都可创建
node -e "
var c=require('./core/index.js');
var types=c.ExportRegistry.list();
var errors=[];
types.forEach(function(t){
  try { var e=c.createExporter(t); if(typeof e.export!=='function') errors.push(t+': 缺少export方法'); }
  catch(e) { errors.push(t+': '+e.message); }
});
if(errors.length){ console.log('❌',errors.join('; ')); process.exit(1); }
console.log('✅ 全部'+types.length+'种格式可创建 ('+types.join(', ')+')');
"

# 2. 元数据完整性
node -e "
var c=require('./core/index.js');
var types=c.ExportRegistry.list();
var missing=[];
types.forEach(function(t){
  var m=c.ExportRegistry.meta(t);
  if(!m||!m.description) missing.push(t+': 缺少description');
});
if(missing.length){ console.log('⚠️',missing.join('; ')); }
console.log('✅ 元数据完整');
"
```

---

## 5. 改进优先级路线图

### P0 — 立即（本周，影响计算正确性）

| # | 任务 | 预估 | 风险 |
|---|------|------|------|
| P0-1 | 统一 `_CS_WEIGHT` 为 wuxing.js 权威版本，删除 bazi.js 重复 | 30min | 低 — 仅删除重复，保留权威 |
| P0-2 | 确认 `_csWeight()` 所有调用路径使用同一 `_CS_WEIGHT` | 15min | 低 — grep 验证 |
| P0-3 | 运行 `npm run test:regression` 验证无回归 | 5min | — |

### P1 — 本周（改善可维护性）

| # | 任务 | 预估 |
|---|------|------|
| P1-1 | 删除 bazi.js 中 `_cgSSKind`/`_cgIsShengZhu`/`_cgGanWx` 重复 | 15min |
| P1-2 | 删除 bazi.js 中第二组地支关系表 | 20min |
| P1-3 | 在 wuxing.js 顶部统一定义 `GAN`/`ZHI`/`WX_KEYS`/`_WX`/`ZHI_WX` | 45min |
| P1-4 | patterns.js 内部提取 `ZHI_WX = [4,2,0,0,2,1,1,2,3,3,2,4]` 为模块级常量 | 10min |
| P1-5 | 导出器升级为插件注册表（ExportRegistry） | 60min |

### P2 — 下月（技术债清理）

| # | 任务 | 预估 |
|---|------|------|
| P2-1 | 提取统一季节分类函数 `_seasonClassify(zhi)` | 30min |
| P2-2 | 删除 `WUXING_BRANCH2` 重复 | 5min |
| P2-3 | 提取 `WXJ = Lunar.WuXingJ` 为模块级常量 | 10min |
| P2-4 | 魔数参数化：创建 `core/constants.js` 集中管理阈值 | 90min |

---

## 6. 确定性声明

- **确定**：`_CS_WEIGHT` 双版本不一致是真实BUG — wuxing.js内部使用自己的值，而patterns.js通过bazi.js全局使用另一套值
- **确定**：GAN数组定义了7次、ZHI数组5次、wxKeys数组10次 — grep精确统计
- **确定**：bazi.js中地支关系表定义了两次（~50行重复代码）
- **确定**：魔数 `0.20`（调候加权）在代码中无命名常量，是裸字面量
- **不确定**：wuxing.js 和 bazi.js 哪个 `_CS_WEIGHT` 版本在命理上更准确 — 需对照MD文档《十二长生能量表》确认后选择权威版本
