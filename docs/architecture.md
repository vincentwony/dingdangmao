# 公信万年历 — 架构文档

> 最后更新: 2026-06-23

---

## 1. 系统架构

```
┌─ 浏览器 (web/) ─────────────────────────────────────────┐
│  app.html                                                │
│  ├─ js/app.js        入口: 主题/导航/路由/懒加载          │
│  ├─ js/state.js      Pub/Sub 事件总线                     │
│  ├─ js/api.js        HMAC-SHA256 签名 HTTP 客户端         │
│  ├─ js/router.js     前端路由                              │
│  ├─ js/calendar-ui.js 日历渲染 + 日期选择                  │
│  ├─ js/bazi-ui.js    八字表单 + API 调用 + 结果渲染        │
│  ├─ js/bazi-interact.js 大运/流年/流月 联动               │
│  ├─ js/detail-ui.js  单日详情浮层                          │
│  ├─ js/note-ui.js    每日记事 (localStorage)               │
│  └─ js/archive-ui.js 八字档案面板                          │
│                                                           │
│  ── HMAC-SHA256 ──▶                                      │
└──────────────────────────────────────────────────────────┘
                          │
┌─ Node.js Server (server/) ──────────────────────────────┐
│  index.js (Express)                                      │
│  ├─ routes/bazi.js     POST /api/v1/bazi                 │
│  ├─ routes/calendar.js POST /api/v1/calendar/*           │
│  ├─ middleware/auth.js HMAC 签名验证 (±5min)              │
│  └─ middleware/ratelimit.js 60 req/min                   │
│                                                           │
│  ── require('gongxin-core') ──▶                         │
└──────────────────────────────────────────────────────────┘
                          │
┌─ 计算引擎 (core/) ──────────────────────────────────────┐
│  index.js         统一导出                                 │
│  ├─ wuxing.js     五行/藏干/十神/十二长生 (7层权重模型)    │
│  ├─ texts.js       Bz 对象 (称骨歌/命宫/日坐十神)          │
│  ├─ lunar.js       沙箱 (vm.runInThisContext ← index.html) │
│  ├─ shensha.js     神煞/建除/二十八宿/computeDayFromLunar │
│  ├─ bazi.js        八字排盘/从格旧管道/_computeCongGeData  │
│  ├─ patterns.js    MD格局/喜用神/从格/化气格/调候 (NEW)    │
│  └─ exporters.js   六种导出格式统一抽象层 (NEW)            │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `wuxing.js` | 五行力量计算（7层权重）、藏干比例、十神分类、季节旺衰 | — |
| `bazi.js` | 八字排盘基础、旧管道从格（`_computeCongGeData`）、十神本地计算、十二长生权重 | `wuxing.js` (全局) |
| `patterns.js` | **MD文档对齐**：格局判定、化气格、从格五条件、喜用神推导、调候速查、自洽验算 | `bazi.js` (全局: `_cgSSKind`, `_localSShen`, `_csWeight`) |
| `exporters.js` | 六种输出格式：JSON/CSV/Markdown/API/Props/Cache + 工厂函数 + 类型守卫 | `patterns.js` (可选) |
| `lunar.js` | 沙箱加载 — 从 `index.html` 提取寿星历引擎 | `h:/Phone/index.html` |
| `shensha.js` | 神煞计算、建除十二神、二十八宿、日历日数据 | `lunar.js` (沙箱) |

---

## 3. 分析引擎重构（2026-06-23）

### 3.1 设计原则

1. **零功能回归** — 仅移动/重命名/新增，不修改任何业务逻辑
2. **模块单一职责** — `patterns.js` 仅含格局判定逻辑，不含UI/网络/存储
3. **双管道隔离** — 旧管道（tyme4j）和新管道（MD文档）独立运行，通过灰度开关切换
4. **向后兼容** — 所有函数仍通过 `global` + `module.exports` 双注册

### 3.2 模块职责图

```
analysis_result = {
  // ═══ wuxing.js 提供 ═══
  wuxingScores, wuxingPct, wuxingLevels, wuxingDetails,

  // ═══ bazi.js 提供（旧管道） ═══
  geName, congGe, _congGeData,

  // ═══ patterns.js 提供（新管道 MD对齐） ═══
  mdPattern, mdXiyong, mdVerify, mdDayMaster
}

exporters.js: 将 analysis_result 转换为 6 种输出格式
```

### 3.3 关键决策树（新管道）

```
_baziAnalysis_md(ob, wxData)
  │
  ├─ Step 2: 日主力量等级 (极旺/偏旺/中和/偏弱/极弱)
  │          + slTilt 细化 (中和偏强/中和偏弱)
  │
  ├─ Step 3: 格局判定
  │   ├─ 从强格?    (日主≥35% + 自党≥80%) → 专旺格
  │   ├─ 化气格?    (§4.3.6 紧贴相邻干支)  → 甲己化土等
  │   ├─ 从格?      (§4.2 五条件全部满足)   → 从财/从杀/从儿/从势
  │   └─ 正格       (§3.3 月令透干→定格)   → 十格局
  │        └─ 成败   (§3.4 破格条件检查)    → 成格/破格 + 等级
  │
  ├─ Step 4: 喜用神 (§5.2-5.4)
  │   ├─ 从格 → 用神=从神
  │   ├─ 身旺/中和偏强 → 泄克耗 (官杀→食伤→财星)
  │   ├─ 身弱/中和偏弱 → 生扶 (印星→比劫)
  │   └─ 调候优先 (§5.5 冬→火/夏→水)
  │
  └─ Step 5: 自洽验算 (§6.2 5层检查)
```

### 3.4 迁移路径

| 从 | 到 | 状态 |
|----|----|------|
| `bazi.js:3190-3823` (650行MD函数) | `patterns.js` (870行，含JSDoc) | ✅ 已完成 |
| `_tiaoHouMap` (歧义命名) | `tiaoHouBySeason` (按季节) | ✅ 已完成 |
| `_XYS_TIAOHOU` (歧义命名) | `tiaoHouByPattern` (按格局) | ✅ 已完成 |
| 分散的6种输出逻辑 | `exporters.js` (统一抽象层) | ✅ 已完成 |
| 旧管道 (`_computeCongGeData`) | 新管道 (`_baziAnalysis_md`) | 🔄 灰度中（见迁移方案） |

### 3.5 避坑指南

#### ❌ 禁止在 patterns.js 中做以下操作：

1. **调用外部服务** — `fetch()`、`http.request()`、`axios` 等。patterns.js 是纯计算模块
2. **require() 其他模块** — patterns.js 仅依赖全局变量（`_cgSSKind` 等），由 `core/index.js` 保证加载顺序
3. **修改全局状态** — `global.xxx =` 或 `window.xxx =`。导出应通过 `_exportMap` → `module.exports`
4. **添加UI逻辑** — 不操作 DOM、不生成 HTML
5. **混用新旧管道** — patterns.js 中的函数不应调用 `_computeCongGeData`

#### ✅ 正确做法：

1. 新增函数 → 在 `_exportMap` 中注册 → 自动获得 global + module.exports 双重导出
2. 修改判定规则 → 引用 MD 文档具体章节号 + 古籍出处
3. 新增调候条目 → 更新 `tiaoHouBySeason` 表 → 运行 `npm run test:regression`
4. 新增导出格式 → 在 `exporters.js` 中实现新类 → 在 `VALID_EXPORT_TYPES` 注册

#### 🔧 防护脚本：

```bash
# 回归测试（CI阻断）
npm run test:regression

# patterns.js 规范检查
npm run lint:patterns

# 导出类型校验
npm run check:exports
```

---

## 4. 数据流

```
用户输入 (web/js/bazi-ui.js)
  → API.post('/api/v1/bazi', {y,m,d,h,min,jd,wd})
    → server/routes/bazi.js
      → Lunar.mingLiBaZi(d0, ...)            ← 沙箱寿星历
      → _computeAllWuxing(ob)                ← wuxing.js 7层权重
      → _baziAnalysis_md(ob, wxCalc)         ← patterns.js MD决策树
      → _splitBzinfoToCards(fullBzinfo)      ← 卡片化HTML
      → res.json({ ok:true, data: {...} })
  → State.emit('bazi:result', {ob, MGxh})     ← 缓存联动数据
  → renderResult(data)                         ← DOM渲染
    → MD分析卡片 (mdPattern/mdXiyong/mdVerify)
    → 五行分布柱状图 (wuxingScores/wuxingPct)
    → 卡片列表 (cards[].body)
    → ChangeLn 联动就绪 (bt-card onclick)
```

---

## 确定性声明

- **确定**：本文档描述的是 2026-06-23 重构后的架构状态
- **确定**：patterns.js 的加载顺序必须在 bazi.js 之后（依赖其全局函数）
- **不确定**：后续是否需要将 `_cgSSKind` 等函数也提取到独立模块 — 待双管道统一后评估
