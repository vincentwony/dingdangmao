# 公信万年历 — 前后端分离架构开发指南

> **作用域**：`web/` + `server/` + `core/` — 前后端分离新架构。  
> **原单文件版**：`h:/Phone/index.html` 是全部日期/八字计算数据的唯一来源（寿星历引擎），其开发指南见 `h:/Phone/CLAUDE.md`。

---

## 铁律（2026-06-26 更新）

1. **不确定就直接说"不确定"**，禁止模棱两可、禁止糊弄。
2. **每次回答末尾附【确定性声明】**：列出确定/不确定的内容。
3. **凡仅凭经验推测的结论**，必须标注"此为推测，未经证实"。
4. **所有输出和思考过程使用中文**。

5. **铁律第五条（2026-06-20 起执行）—— 页面/UI 修改必须先理解 DOM 结构再操作元素：**
  涉及页面显示/隐藏、区域切换、档案阅览等 UI 操作时，**禁止在现有函数上打补丁**（如添加标记位绕过逻辑、覆盖导航状态）。正确做法：
  1. **先精确定位和理解页面 DOM 结构** — 哪些元素是哪个页面的、它们的可见性由谁控制。本架构三个根容器：`#cal-root`（日历）、`#bazi-root`（八字排盘，初始 `display:none`）、`#detail-root`（详情浮层），定义在 `web/app.html:60-80`。
  2. **直接管理每个 DOM 元素的可见性** — 逐项设置 `style.display`。`web/js/app.js:68-80` 的 `showCalendarPage()` 是正确示范：先设置 `cal-root`/`bazi-root` 的 `display`，再清理旧结果视图 `#baziResultView`，最后通过 `State.emit('page:changed', 'calendar')` 通知其他模块。参考实现：`h:/Phone/bazi_pai.html` 的 `viewBaziArchive`（DOM 直接操作模式的黄金标准）。
  3. **不要依赖高层函数** — `BaziUI` 的 `doCalculate()` 会触发服务端 API 调用 + `State.emit('bazi:result')` 事件链 + 大运/流年联动初始化等副作用。需要干净页面切换时直接操作 DOM 元素，不要调用业务函数。
  违反此条 → 代码越改越复杂 → 补丁叠补丁 → 必然返工。典型案例：原单文件版档案阅览系统四轮重写才对齐 bazi_pai.html 的简洁设计。

---

## 架构概览

```
浏览器                  Node.js Server
┌──────────┐           ┌──────────────────────────────┐
│ web/     │  HTTP API │ server/                      │
│ app.html │◄────────►│ index.js (Express)            │
│ js/*.js  │  HMAC签名 │ routes/bazi.js   → core/     │
│ css/*.css│           │ routes/calendar.js → sandbox │
└──────────┘           └──────────────────────────────┘
                                  │
                       ┌──────────┴──────────┐
                       │ core/ (gongxin-core) │
                       │ lunar.js  ← sandbox │ ← 读取 h:/Phone/index.html
                       │ bazi.js   wuxing.js  │
                       │ shensha.js texts.js  │
                       └─────────────────────┘
```

---

## 启动与测试

### 开发服务器

```bash
cd h:/Phone/server && node index.js
# → http://localhost:3000         首页
# → http://localhost:3000/app.html 主应用
# → http://localhost:3000/original 原版 index.html（对比用）
```

> ⚠️ **更换 HMAC 密钥、端口、环境变量后必须重启 server**，否则 `require` 缓存导致旧配置生效 → 全部 API 401。（2026-06-26 教训）

### 八字 API 直接测试（不启动 server）

```bash
cd h:/Phone && node -e "
var core=require('./core/index.js');
var Lunar=core.Lunar, JD=core.JD, J2000=core.J2000;
var y=1982,m=5,d=10,h=12,min=5,jdVal=120,wd=40;
var t=h+min/60;
var d0=JD.JD(y,m,d+t/24)-J2000;
global.Sel2s={vJ:jdVal/(180/Math.PI), vW:wd/(180/Math.PI), options:[{value:'0',text:'默认'}]};
var ob={};
Lunar.mingLiBaZi(d0-8/24, jdVal/(180/Math.PI), ob, 'Test', 1, 0, 0, '');
console.log(ob.bz_jn, ob.bz_jy, ob.bz_jr, ob.bz_js);
// → 壬戌 乙巳 癸巳 戊午
"
```

---

## 关键文件

### 前端 `web/`

| 文件 | 说明 |
|------|------|
| `web/index.html` | 首页（山水背景 + 品牌动画） |
| `web/app.html` | 主应用（日历 + 八字 + 设置 + 内联设置脚本） |
| `web/js/app.js` | 入口：主题/导航/路由/懒加载 |
| `web/js/api.js` | HMAC-SHA256 签名 HTTP 客户端 |
| `web/js/state.js` | Pub/Sub 事件总线 |
| `web/js/router.js` | 前端路由 |
| `web/js/calendar-ui.js` | 日历渲染 + 日期选择 + 月份切换 + 跨月格 |
| `web/js/bazi-ui.js` | 八字表单 + API + 结果渲染 |
| `web/js/bazi-interact.js` | 大运/流年/流月交互 |
| `web/js/detail-ui.js` | 单日详情浮层 |
| `web/js/note-ui.js` | 每日记事 (localStorage) |
| `web/js/archive-ui.js` | 八字档案面板 |
| `web/js/geo-data.js` | 寿星历地理数据 (35 省, 22KB) |
| `web/js/dom-helpers.js` | DOM 工具函数 |

### 前端样式 `web/css/`

| 文件 | 说明 |
|------|------|
| `web/css/variables.css` | 全局变量（色板/字号/间距/z-index/圆角/过渡）+ 五行色 `--bt-gan-*` |
| `web/css/base.css` | CSS Reset + Tabler 图标字体 + 排版 + 卡片系统 + 按钮/输入框/徽章 + 设置面板 + 记事编辑器 + 档案面板 |
| `web/css/layout.css` | 顶部固定导航栏 + 固定页脚 + 响应式 |
| `web/css/calendar.css` | 日历格 + 详情浮层 + 星盘/九星/神煞 + 年历视图 |
| `web/css/bazi.css` | 八字表单 + 八字细盘表 + 章节系统 + MD 卡片 + 推理链 |

### 后端 `server/`

| 文件 | 说明 |
|------|------|
| `server/index.js` | Express 入口 |
| `server/routes/bazi.js` | `POST /api/v1/bazi` |
| `server/routes/calendar.js` | `POST /api/v1/calendar/month` + `/day` |
| `server/middleware/auth.js` | HMAC-SHA256 签名验证 (±5min) |
| `server/middleware/ratelimit.js` | 60 req/min |

### 计算引擎 `core/`

| 文件 | 说明 |
|------|------|
| `core/lunar.js` | **沙箱** — `vm.runInThisContext` 加载 index.html Block[1]+[2] |
| `core/bazi.js` | 从格/格局/喜用/四柱详断/**干支关系简报** |
| `core/shensha.js` | 神煞/建除/二十八宿/`computeDayFromLunar` |
| `core/wuxing.js` | 五行/藏干/十神/十二长生 |
| `core/texts.js` | Bz 对象（称骨歌/命宫/日坐十神） |
| `core/_render_funcs.js` | 服务端渲染函数 |

---

## 沙箱加载（core/lunar.js）

寿星历引擎从 `h:/Phone/index.html` 动态提取：

1. `fs.readFileSync` 读取 HTML
2. 正则提取 7 个 `<script>` 块
3. `vm.runInThisContext(blocks[1])` — Block[1] 全量（JD/ZB/XL/SZJ/Lunar/Bz）
4. Block[2] 提取 `dt_at→tick`、`shiCha→getCookie`
5. 全局桩：`renderBaziTable`、`showToast`、`_DG_GAN` 等
6. `core/index.js` 将各模块函数注入 `global`

**修改 `h:/Phone/index.html` 或 `core/engine/sxwnl-bundle.js` → 必须重启 server**（引擎只读一次）
**2026-06-26 更新**：天文学引擎已从 index.html 提取到 `core/engine/sxwnl-bundle.js`（~4555行）。修改计算逻辑应改此文件而非 index.html。

---

## 八字计算调用链

```
bazi-ui.js doCalculate()
  → API.post('/bazi', {y,m,d,h,min,jd,wd})
    → JD.JD(y, m, d+t/24) - J2000          (公历)
    → Lunar.JL(y, m, d+t/24, 0) - J2000     (农历，时间加在 d 上)
    → Lunar.mingLiBaZi(d0 - 8/24, jd/radd, ob, ...)
      → t22 = -L/pi2 + sc/pi2              (-L/pi2 与 curTZ 相消)
      → 四柱 bz_jn/bz_jy/bz_jr/bz_js
      → _computeCongGeData(ob)
      → ob.bzinfo HTML 字符串
    → _splitBzinfoToCards(fullBzinfo)        → cards[] (20张，含 bt-card×5 + data-card-id×15)
    → { pillars, bzinfo, cards[], congGe, b1..b4, dayun, MGxh }
  → State.emit('bazi:result', {ob:{b1,b2,b3,b4,dayun}, MGxh})
  → renderResult(data)
    → 遍历 data.cards[] 渲染所有卡片 body
    → ChangeLn 联动就绪（bt-card DOM 锚点 + onclick 处理器）
```

### 真太阳时修正 (2026-06-20 修订)

**依据**：`h:/Phone/真太阳时修正技术参数.md` §3.1, §4.1, §4.3

**原理**：`真太阳时 = 标准时 + (λ/15 − TZ) + EoT`

`mingLiBaZi` 内部：`t22 = L/pi2 + sc/pi2`, `jd = jd − t22 − 78/86400`
- `L = Sel2s.vJ`（弧度），`sc` = EoT（弧度），`78s` = 历史兼容修正
- 令 `−L/pi2 = λ/15 − TZ` → **`L = (TZ×15 − λ) × π/180`**
- 中国标准时 TZ=+8，标准经度 120°E → **`L = (120 − λ) × π/180`**

**jd 参数约定**：`d0 = JD.JD(y,m,d+t/24) − J2000`（本地标准时儒略日偏移，**不加**时区修正），裸传入 `mingLiBaZi`。时区补偿已编码在 `L = (TZ×15 − λ) × π/180` 中。

| 城市 | λ | L (rad) | L/pi2 | 经度修正 | 真太阳时 vs 标准时 |
|------|---|---------|-------|---------|-------------------|
| 北京 | 120°E | 0 | 0 | 0 | 相等（仅差EoT） |
| 上海 | 121.5°E | −0.026 | −0.0042d (−6min) | +6min | 快6分 |
| 乌鲁木齐 | 87.6°E | +0.566 | +0.09d (+130min) | −130min | 慢2时10分 |

**2026-06-20 之前（错误实现）**：
| 参数 | 错误值 | 问题 |
|------|--------|------|
| `Sel2s.vJ` | `jdDeg × π/180`（直接用观测经度） | 北京 L=8h → t22 多减 8h |
| `mingLiBaZi jd` | `d0 − 8/24`（UTC转换） | 外部时区修正 + 内部经度修正 = 双重修正 |
| `ob.bzJQ` | 未设置 | jieQi 字段为空 |

**2026-06-20 修正后**：
| 参数 | 正确值 | 依据 |
|------|--------|------|
| `Sel2s.vJ` | `(120 − jdDeg) × π/180` | 文档 §4.3 公式推导 |
| `mingLiBaZi jd` | `d0`（裸传） | 文档 §4.1 标准时约定 |
| `ob.bzJQ` | `dayunjl(ob.bz_jd)` | 补齐缺失的节气数据 |

---

## 前端八字表单控件

| 控件 | ID | 类型 |
|------|-----|------|
| 姓名 | `Name_input` | text input |
| 性别 | `Sex_toggle` + `Sex_input`(hidden) | 男/女 pill 按钮 |
| 出生地点 | `citySearchInput` | 城市名搜索 + 下拉 |
| 经纬度 | `Jd_input`, `Wd_input`(hidden) | 城市搜索自动填充 |
| 历法 | `.bazi-cal-tab` + `gnlsel`(hidden) | 公历/农历 tab 切换 |
| 年 | `Cml_y` | select 1900~今年 |
| 月 | `Cml_m` | select 1~12 |
| 日 | `Cml_d` | select 1~31 |
| 时间 | `Cml_his` | time input |

### 结果渲染区块

1. 🎯 日标信息 — `ob.bzInfo2` + 乾造/坤造 + 农历 + 节气
2. ☯️ 八字命局 — 四柱大字 + 真太阳时角
3. 🕐 干支纪时 — `ob.bz_JS`
4. 📊 格局摘要 — 格局名 + 从格 + 生助%
5. 📋 八字专业细盘 — `renderBaziTable(ob)`
6. 📦 完整 bzinfo — 12 区块卡片

---

## API 认证 (HMAC-SHA256)

```
message = machineId + timestamp + nonce + path
signature = HMAC-SHA256(message, secret).hex().slice(0, 8)
```

请求头：`X-Machine-Id`, `X-Timestamp`(±5min), `X-Nonce`(不可重用), `X-Signature`

密钥：`381cb51f0923fc771bf7e81547c485f7`（已更换，2026-06-26）

---

## 已知陷阱

1. **修改 index.html → 必须重启 server**
2. **农历 JL 参数**：`JL(y, m, d+t/24, 0)`，时间加在日参数
3. **d0 方向**：北京时间→UTC 是 `-8/24`
4. **t22 符号**：`-L/pi2` 与 `curTZ/24` 相消
5. **core/bazi.js 函数需同时 export + 设 global**
6. **HMAC nonce 不可重用**
7. **Sxwnl 原始数据**：`h:/Phone/Sxwnl/lunar.js`(GBK)，权威参考
8. **懒加载 `default`**：`import('./foo.js')` → `mod.default`
9. **`d0-8/24` 和 `t22=-L/pi2` 必须同时生效**
10. **_renderGanZhiBrief** 在 `core/bazi.js`，通过 global 供沙箱调用
11. **服务端 `_splitBzinfoToCards` 是卡片渲染唯一数据源** — 必须同时检测 `class="bt-card"` 块 + `data-card-id=` 块，遗漏 bt-card 会导致 ChangeLn 联动静默失效。
12. **卡片合成 ID 必须注入 HTML outer div** — 否则客户端 `getElementById` 永远返回 null。
13. **`selectLiunianYear` 卡片 ID 已统一** — 服务端 BT_ID_MAP 和客户端 ChangeLn._upsertCard 使用相同的 `bazi*` 前缀命名空间，无需双 ID 回退。新增 ID 时在 BT_ID_MAP 中添加映射即可。
14. **`State.emit('bazi:result')` 先于 `renderResult`** — ChangeLn onclick 从 State cache 读 dayun.dyn。
15. **事件监听器累积 — 复用 DOM 元素时 `addEventListener` 重复调用**。`renderResult` 每次在 `resultEl` 追加 click 监听器，切换管道后 2 个监听器 toggle 两次 = 净零效果（2026-06-25 修复 `_cardClickHandler` + `removeEventListener`）。`bindFormEvents` 中 `.bazi-sex-btn`/`.bazi-cal-tab` 监听器无 `_bound` 守卫（2026-06-25 修复）。
16. **CSS 变量未定义 + 无回退值 = 声明失效**。`var(--x)` 无 fallback 时整条声明被丢弃。全项目 2026-06-25 审计补全 5 个缺失变量（`--transition`/`--radius-pill`/`--color-good`/`--color-bad`/`--surface-warm`）。
17. **z-index 变量必须在 variables.css 定义** — `--z-nav`/`--z-footer`/`--z-tooltip` 缺失导致导航栏/页脚被遮挡（2026-06-25 修复）。
18. **档案保存必须包含 cards + pipeline + md* 全量字段** — `viewArchive` 重建 data 时缺 `cards` → `renderResult` 退化到 bzinfo 降级路径。修复：`doSave`/`saveCurrent`/`viewArchive` 三处同步补全 10 个字段（2026-06-25 修复）。

19. **CSS 五行色变量统一管理（2026-06-26）** — bazi.css 五行色（蓝/绿/红/橙/金）必须通过 `var(--bt-gan-*)` 引用，禁止硬编码 hex。变量定义在 `variables.css`（`:root` + `body.dark`），暗色模式自动切换。bt-dy-table / bt-ln-table / bt-ly-table 三表字号选择器已合并，新增表类型只需在已有选择器后加 `, .bt-xx-table .bt-color`。

20. **卡片折叠指示器（2026-06-26）** — 折叠态卡片头部通过 `.card.collapsed .card-header::after { content: "展开" }` 显示文字标签。纯 CSS，不依赖 HTML 中图标 class。此前尝试的线装书圆钮/纸叠边/朱砂点隐喻已废弃，不要恢复。

21. **八字章节默认全部折叠（2026-06-26）** — `bazi-ui.js` 中 `CHAPTERS` 数组的 `collapsed` 字段控制初始状态，四个章节均为 `true`。用户展开后通过 `localStorage._bazi_cards_expanded` 持久化，下次自动恢复。

22. **日历格字号底线（2026-06-26）** — 公历数字 `clamp(12px, 3vw, 16px)`，农历日期 `var(--text-sm)`，干支/建除/二十八宿/九星统一 `var(--text-xs)`，特殊徽章 `9px`。480px 以下干支保留为 `8px`（禁止 `display: none`）。

23. **启动模块并行加载（2026-06-26）** — `app.js` 中 note/calendar/detail 三模块用 `Promise.all` 并行 import，减少首屏时间。禁止改回串行 `await`。

24. **事件委托优先（2026-06-26）** — 列表按钮绑定必须用事件委托（`closest()` 匹配），禁止 `querySelectorAll` + `forEach` + `addEventListener` 多次 DOM 遍历。参照 `archive-ui.js` 的 `_archiveDelegated` 守卫模式。

25. **prefers-reduced-motion 唯一位置（2026-06-26）** — `base.css:63-70` 是唯一保留的全局 prefers-reduced-motion 规则。禁止在其他 CSS 文件中新增此媒体查询块。

---

## 数据架构（2026-06-20 更新）

### 共享常量唯一真相源

**`core/shensha-data.js`** 是以下数据的唯一定义位置：

| 常量 | 条目数 | 说明 |
|------|--------|------|
| `SHENSHA_NAMES` | 12 | 流年神煞名（太岁/太阳/…/病符） |
| `SHENSHA_DETAIL` | 12 | 十二神煞吉凶口诀 |
| `LIUYUE_SHENSHA` | 12 | 流月盲派神煞命名 |
| `MINGGONG_STAR_NAMES` | 12 | 命宫十二星名（天贵/天厄/…/天寿） |
| `MINGGONG_STAR_KOUJUE` | 12 | 十二命宫星性口诀 |
| `_ganColorClass` | 函数 | 天干→CSS 颜色类 |
| `_zhiColorClass` | 函数 | 地支→CSS 颜色类 |
| `_ganFullName` | 函数 | 甲→甲木 全名映射 |

**服务端加载路径**：
```
core/lunar.js
  → require('./shensha-data.js')
  → 注入 8 个 global._sd_* 变量
  → vm.runInThisContext('_render_funcs.js')
     → 沙箱内通过 global._sd_* 读取（vm 沙箱无 require）
```

**修改规则**：修改以上任何数据，**只改 `core/shensha-data.js` 一个文件**。服务端自动生效。客户端同步待 Issue #1 完成后跟进。

### 跨环境 Lunar 全局导出

**`core/env.js`** 提供环境检测和全局挂载：

```javascript
// 检测运行环境
env.detectEnv()  // → 'node' | 'browser' | 'worker'

// 将对象挂载到全局根
env.ensureGlobal('Lunar', global.Lunar)
// → { name: 'Lunar', env: 'node', mounted: true }
```

已在 `core/lunar.js` 中调用 `ensureGlobal('Lunar', ...)`，因此：
- **Node.js**：`global.Lunar` ✅
- **浏览器**：`window.Lunar` ✅（需 ES 模块加载 core/lunar.js 后）

### Lunar.sshenShort 使用规范

```javascript
// 全名（2字）：Lunar.sshen(riGanIdx, ganIdx)
Lunar.sshen(0, 0)  // → '比肩'

// 简写（1字）：Lunar.sshenShort(riGanIdx, ganIdx)
Lunar.sshenShort(0, 0)  // → '比'
```

**映射表**：比肩→比 | 劫财→劫 | 食神→食 | 伤官→伤 | 偏财→财 | 正财→才 | 七杀→杀 | 正官→官 | 偏印→枭 | 正印→印

**适用场景**：需要节省显示空间时用 `sshenShort`，其他场景用 `sshen`。两者算法完全一致（均通过 `Lunar.LiuQin` 映射），100/100 对齐。

### 客户端回退机制

`web/js/bazi-interact.js` 中采用了三级回退：

```
访问 window.Lunar
  ├── ✅ 可用 → 使用 Lunar.Gan / Lunar.Zhi / Lunar.CangGan / Lunar.sshen
  └── ❌ 不可用 → 使用内置本地副本
       ├── _G = ['甲'..'癸']       // 10 天干
       ├── _Z = ['子'..'亥']       // 12 地支
       ├── _CANG = ['癸'..'壬甲']  // 12 藏干
       └── _ssName(b3, ganIdx)     // 含阳干/阴干分支，与 Lunar.sshen 输出一致
```

**触发条件**：
- `window.Lunar` 为 `undefined` 或 `null` 时触发回退
- 详见 `web/js/bazi-interact.js` L18-26 的 `_L` 变量检测

**验证**：`node core/__tests__/shensha-data.test.js` — 6 组 31 项测试

## 确定性声明

- **确定**：本文档描述新三层架构，计算继承自 `h:/Phone/index.html` 寿星历引擎
- **确定**：八字四柱已通过 lunisolar 交叉验证和用户校准案例验证
- **确定**：`core/shensha-data.js` 是神煞/命宫/流月常量的唯一真相源——所有修改只在此文件中进行
- **确定**：`Lunar.sshenShort` 通过 `Lunar.LiuQin.indexOf` 映射，与 `Lunar.sshen` 100/100 对齐
- **确定**：t22 和 d0 修正是 2026-06-18 经数学推导的修复
- **不确定**：`<input type="time">` 在部分 Android WebView 的兼容性——未经实测
