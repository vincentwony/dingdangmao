# 紫微斗数 vanilla 重做 — 构建方案

> 参照 `ziwei/` React SPA 的数据渲染方法，用主应用范式（手写 vanilla JS + tab 切换）重建紫微 tab。
> 复用同一个 `iztro` 引擎（改为**后端算**），完整复刻：12 宫圆形罗盘 + 星曜亮度/四化 + 宫位 hover 详情 + 大限/流年运限 + AI 解读。
> **原 `ziwei/` React 文件一行不改**，作为参考/回退。

## 一、已确认的方向（你的选择）
| 维度 | 决策 |
|---|---|
| 计算位置 | **后端**：`server/` 装 `iztro`，新增 HMAC 鉴权端点 |
| 渲染范围 | **完整复刻**：表单 + 12 宫罗盘 + 运限 + 宫位详情 + 四化 + AI 解读 |
| 命盘视觉 | **圆形罗盘**（作用域 `.zw-` CSS，不复用 React class 名） |
| tab 集成 | **替换** iframe：新 vanilla 直接作为 `tabZiwei` 内容 |

## 二、架构与数据流
```
用户输入(表单) → web/js/ziwei-ui.js
   → POST /api/v1/ziwei/astrolabe  (HMAC 鉴权)
       server/routes/ziwei.js → 动态 import('iztro')
         astro.byLunar/bySolar(date, time, gender) → astrolabe
       → 序列化命盘 JSON 返回
   → renderChart() 画圆形罗盘 + 星曜(亮度/四化)
   运限: 年选择器 → POST /api/v1/ziwei/horoscope → 高亮大限/流年宫
   AI: POST /api/interpret (SSE, 升级现有桩) → 流式解读
```
**iztro 真实数据结构（已实证 2.5.8）**
- `astrolabe`: `chineseDate`(四柱干支) / `soul`(命主) / `body`(身主) / `fiveElementsClass`(五行局) / `zodiac`(生肖) / `palaces[12]`
- `palace`: `name` / `index` / `isBodyPalace` / `heavenlyStem` / `earthlyBranch` / `majorStars[]` / `minorStars[]` / `adjectiveStars[]` / `decadal`(大限) / `ages`(流年年龄)
- `Star`: `name` / `type` / `brightness`(得/旺/平/陷) / **`mutagen`(四化: 禄/权/科/忌)** ← 四化直接读此字段

## 三、后端改动（`server/`，CJS；iztro 用动态 import）
**`server/package.json`**：deps 加 `"iztro"`、`"dotenv"`（读 `DEEPSEEK_API_KEY`）。
**`server/routes/ziwei.js`（新）**：
- `POST /astrolabe` `{date:'YYYY-M-D', time:0-12, gender:'男'|'女', calendar:'lunar'|'solar'}`
  → `const { astro } = await import('iztro')` → `astro.byLunar/bySolar(...)` → 序列化上述结构返回。
- `POST /horoscope` `{..., targetYear}` → `astrolabe.horoscope(targetYear, gender)` → 返回该年大限/流年命宫索引等。
**`server/index.js`**：
- 加 `require('dotenv').config()`；
- `const ziweiRouter = require('./routes/ziwei.js'); app.use('/api/v1/ziwei', ziweiRouter);`
- **升级现有 `/api/interpret` 桩**（line 39）为真实 deepseek SSE 代理（镜像 `ziwei/server.mjs`）：读 `DEEPSEEK_API_KEY`（env 或请求体 `apiKey`），SSE 流式转发。

## 四、前端改动（`web/`，手写 vanilla，对齐 `bazi-ui.js` 范式）
**`web/js/ziwei-ui.js`（新）**：
- `show()`：渲染表单到 `#ziwei-vanilla-root`（年/月/日/时辰/性别/历法 tab/姓名）—— 与八字表单同骨架。
- `doCalculate()`：`API.post('/ziwei/astrolabe', ...)` → `renderChart(data)`。
- `renderChart()`：圆形罗盘（12 宫绝对定位 + `rotate`，scoped `.zw-`） + 星曜（带亮度/四化角标）+ 命宫/身宫高亮。
- 运限切换：年选择器 → `POST /horoscope` → 高亮大限/流年宫。
- 宫位 hover/click → 详情浮层（星曜释义）。
- AI 解读面板：调 `/api/interpret`（SSE）流式渲染。
**`web/app.html`**：删 `#ziwei-root` iframe；加 `<div id="ziwei-vanilla-root" style="display:none;">`。
**`web/js/app.js`**：`tabZiwei` 路由改 `import('./ziwei-ui.js').then(m=>m.show())`（懒加载，失败回退日历）；移除 `ziwei-shell` 懒加载引用。
**`web/css/ziwei.css`（新，全部 `.zw-` 作用域）**：罗盘几何（镜像 React `#compass-bg` 定位）+ 卡片/详情/AI 面板 + 明暗主题（复用 `--color-*` token）。
**`web/js/ziwei-shell.js`**：因不再 iframe，删除该文件（及其 L1.5 冒烟测试，改测 `ziwei-ui.js`）。

## 五、测试 / 安全阀
- `scripts/check-syntax.js`（L0）：自动覆盖 `web/js/ziwei-ui.js`。
- `scripts/smoke-ziwei.mjs`（L1.5）：改测 `ziwei-ui.js`——渲染表单 + 注入 mock 命盘数据 → 断言 12 宫 DOM 渲染、星曜带四化、运限切换回调。
- `scripts/smoke-boot.mjs`（L1）：主应用启动冒烟不受影响（tab 懒加载，紫微 bug 不拖垮日历/八字）。
- 后端抽样：`server/verify_ziwei.js` 调 iztro 真值比对 2~3 个命盘（可选 CI）。
- 全部并入 `npm run check` 总链。

## 六、风险与对策
| 风险 | 对策 |
|---|---|
| server CJS + iztro ESM | 动态 `import()`（Node 22 已验证可行） |
| 罗盘 CSS 最易出问题 | 先用几何定位跑通 12 宫，再加星曜；全部 `.zw-` 作用域，不碰主应用 CSS |
| AI 解读需 key | 未配置 `DEEPSEEK_API_KEY` → 优雅降级（503 提示），其余功能不受影响 |
| 删除 iframe 怕回退难 | `ziwei/` React 目录原样保留，`/ziwei` 静态挂载保留 → 随时可手动访问回退 |

## 七、分阶段交付（一次规划，按顺序落地，每阶段过安全阀）
- **P1 核心命盘**：后端 `/astrolabe` + 前端表单 + 12 宫圆形罗盘（星曜+亮度+四化）+ 删 iframe/加 tab。`npm run check` 全绿。
- **P2 运限 + 详情**：`/horoscope` + 大限/流年高亮 + 宫位 hover 详情浮层。
- **P3 AI 解读**：升级 `/api/interpret` SSE 代理 + 前端流式面板。
- **P4 视觉打磨**：罗盘美化、明暗主题同步（复用既有 token 桥接）、L1.5 测试改写完成。

> 原 `ziwei/` React 应用在整个过程**始终不被修改**，作为对照与回退保障。
