# CHANGELOG

## [2026-06-20] — 数据层抽离与跨环境导出

### Added

- **`core/shensha-data.js`** — 神煞/命宫/流月共享常量唯一真相源
  - 导出 `SHENSHA_NAMES`、`SHENSHA_DETAIL`、`LIUYUE_SHENSHA`（流月神煞）、`MINGGONG_STAR_NAMES`、`MINGGONG_STAR_KOUJUE`（12 命宫口诀）
  - 导出辅助函数 `_ganColorClass`、`_zhiColorClass`、`_ganFullName`
  - 服务端通过 `global._sd_*` 变量注入沙箱（`vm.runInThisContext` 无法使用 `require`）

- **`core/env.js`** — 跨环境全局导出适配层
  - `detectEnv()` 返回 `'node'` | `'browser'` | `'worker'`
  - `ensureGlobal(name, value)` 将对象挂载到当前环境的根对象（`global` / `window` / `self`）
  - 已在 `core/lunar.js` 中调用 `ensureGlobal('Lunar', ...)` 使浏览器也可访问 `window.Lunar`

- **`Lunar.sshenShort(r, t)`** — 单字十神简写
  - 通过 `Lunar.LiuQin.indexOf(Lunar.sshen(r, t))` 将双字全名映射为单字
  - 返回 `'比'` / `'劫'` / `'食'` / `'伤'` / `'财'` / `'才'` / `'杀'` / `'官'` / `'枭'` / `'印'`
  - 100/100 与 `Lunar.sshen` 对齐，边界输入不抛异常

### Changed

- **`core/_render_funcs.js`** — 移除本地神煞常量定义（~40 行），改为从 `global._sd_*` 全局变量读取
- **`web/js/bazi-interact.js`** — 干支/十神优先使用 `window.Lunar` 全局对象，不可用时回退本地副本
  - `_G` / `_Z` / `_CANG` → 优先 `window.Lunar.Gan` / `Lunar.Zhi` / `Lunar.CangGan`
  - `_ssName` → 优先 `window.Lunar.sshen`，含完整阴阳干分支回退
  - 抽取 `_upsertCard()` 辅助函数，`ChangeLn` 从 ~80 行缩减到 ~35 行
  - 移除冗余 `b3 % 10`（已在 L96 归一化）

### Fixed

- **`server/routes/bazi.js`** — 删除死代码 `ob._lastMGxh || ...`（服务端 `ob` 从不设置此属性，回退永真）
- **`web/css/bazi.css`** — 修复多余 `}` 导致括号不匹配（251→250）

### Removed

- `core/_render_funcs.js` 中本地定义的 `SHENSHA_NAMES`/`SHENSHA_DETAIL` 等 6 组常量（~35 行）
- `web/js/bazi-interact.js` 中独立的 `function _ssName()` 定义（已被 `var _ssName =` 回退版本取代）
- `server/routes/bazi.js` 中 `_mgxhRaw` 中间变量（合并为直接计算）

---

### 开发规范速查

```
数据常量修改
  → 只改 core/shensha-data.js
     ├── 服务端自动生效（global._sd_* 注入）
     └── 客户端需同步：复制到 web/ 或通过 <script> 加载

十神名获取
  → 全名：Lunar.sshen(riGanIdx, ganIdx)          // "比肩"
  → 简写：Lunar.sshenShort(riGanIdx, ganIdx)     // "比"

浏览器可用性检查
  → 控制台执行：window.Lunar ? '✅' : '❌'
  → 如果 ❌：检查 core/lunar.js 中 ensureGlobal('Lunar', ...) 是否执行
```

### 回归测试

```bash
node core/__tests__/shensha-data.test.js
```

覆盖 6 组 31 项：模块导出、全局注入、sshenShort 全量对比、客户端回退对齐、干支数组回退、跨环境导出。
