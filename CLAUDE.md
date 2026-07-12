# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 公信万年历 — Claude Code 开发指南

- **所有输出和思考过程使用中文**

- **每一次修改前都进行备份，备份文件以时间命名并保存到项目根目录下的Back文件夹**

- **回答铁律三条（2026-05-30 起执行）：**
  1. 不确定就直接说"不确定"，禁止模棱两可、禁止糊弄。
  2. 每次回答末尾必须附【确定性声明】：列出哪些内容是你确定的，哪些是不确定的。
  3. 凡是仅凭经验推测（未经代码/文档验证）的结论，必须明确标注"此为推测，未经证实"。

- **铁律第四条（2026-05-30 起执行）—— 重大操作前必须重读 CLAUDE.md：**
  对项目做以下任何操作前，**必须先重新读取 `h:/Phone/CLAUDE.md`**，逐条核对是否有明确规定的流程、命令或注意事项，**禁止凭惯性/记忆直接操作**：
  - 构建/打包/部署（包括 APK 构建、build-release.js、签名）
  - 修改 CSS/UI 布局
  - 修改日历、八字、神煞等核心计算逻辑
  - 修改授权系统
  - 修改导航系统
  - 新增或删除文件
  - 任何涉及多文件协调的操作
  违反此条导致返工，属于执行者责任，非用户指令不清。

- **根据任务需要自动调用可用 Skills，无需等待用户手动指定。** 例如：创建新功能/组件前自动调 `brainstorming`，遇到 bug 自动调 `systematic-debugging`，UI 界面设计自动调 `ui-ux-pro-max` 或 `frontend-design`，代码审查自动调 `requesting-code-review`，任务完成自动调 `verification-before-completion`

- **铁律第五条（2026-05-31 起执行）—— 页面/UI 修改必须先理解 DOM 结构再操作元素：**
  涉及页面显示/隐藏、区域切换、档案阅览等 UI 操作时，**禁止在现有函数上打补丁**（如添加标记位绕过逻辑、覆盖导航状态）。正确做法：
  1. **先精确定位和理解页面 DOM 结构** — 哪些元素是哪个页面的、它们的可见性由谁控制
  2. **直接管理每个 DOM 元素的可见性** — 逐项设置 `style.display`，像 bazi_pai.html 的 `viewBaziArchive` 那样
  3. **不要依赖高层函数** — `showPage()` 会触发 `ML_calc()` 等副作用，需要干净页面切换时直接操作 DOM
  违反此条 → 代码越改越复杂 → 补丁叠补丁 → 必然返工。典型案例：档案阅览系统四轮重写才对齐 bazi_pai.html 的简洁设计。

- **铁律第六条（2026-06-01 起执行）—— 删除/替换任何符号前，必须先 grep 确认所有引用点：**
  重命名函数、删除变量、替换数据结构时，**必须先用 grep 搜索所有引用**，逐一确认并更新，禁止只改定义处就认为完成。
  违反此条 → 运行时 `undefined` 报错 → 功能静默失效 → 用户体验严重受损。典型案例：`ICON_MAP` 替换为 `getWeatherIcon()` 时漏改 `renderForecast` 中的引用，导致15天预报和温度曲线图全部失效。

- **当上下文使用率达到 70% 时，自动执行 `/compact` 压缩对话历史。** 上下文接近上限时优先压缩而非等待手动指令，避免上下文溢出导致信息丢失。

## 项目概述

万年历·八卦掌决版 — 一款集成八字排盘功能的中国黄历单页应用。最终交付形式为：独立 HTML 文件 + 基于 WebView 封装的安卓 APK。

**技术栈**：单文件 HTML（~17550 行），纯 JavaScript（ES5 兼容）+ lunisolar 天文历算库（CDN importmap），无框架依赖。含完整 RSA-2048 离线授权系统 + HMAC-SHA256 短码四级会员商业化授权体系。

**参考实现**：`h:/Phone/bazi_pai.html` 是档案阅览系统的正确参考实现，其 DOM 直接操作模式是铁律第五条的标准范例。

## ⚠️ 双架构项目（2026-06 新增）

本项目现在包含**两个并行架构**，修改前必须确认目标：

| 架构 | 入口 | 说明 |
|------|------|------|
| **单文件版** | `h:/Phone/index.html` | ~17550 行独立 HTML，原项目。所有计算/渲染/UI 在一个文件中。**未经明确授权禁止修改。** |
| **三层架构** | `h:/Phone/server/index.js` → `web/app.html` | 前后端分离新架构。服务端 API + 前端 SPA。**当前活跃开发目标。** |

### 三层架构速览

```
web/ (浏览器)  ←HMAC→  server/ (Express API)  →  core/ (计算引擎)
  app.html               routes/bazi.js             lunar.js → engine/sxwnl-bundle.js (独立引擎文件)
  js/bazi-ui.js          routes/calendar.js         bazi.js / wuxing.js / shensha.js / patterns.js
  js/bazi-interact.js    middleware/auth.js          _render_funcs.js (服务端渲染)
```

- **启动**：`cd h:/Phone/server && node index.js` → `http://localhost:3000/app.html`
- **⚠️ 更换任何配置（HMAC 密钥、端口、环境变量等）后，必须重启 server 进程！** Node.js 的 `require` 缓存会导致旧配置仍在内存中生效，客户端新配置与服务端不匹配 → 全部 API 返回 401「签名无效」。（2026-06-26 实际发生）
- **详细文档**：`h:/Phone/web/CLAUDE.md`（必读）
- **核心文件**：`core/lunar.js` 通过 `vm.runInThisContext` 从独立文件 `core/engine/sxwnl-bundle.js` 加载计算引擎（2026-06-26 从 index.html 提取）

### 八字 API 卡片渲染链（核心数据流）

```
server/routes/bazi.js
  → renderBaziTable(ob)      — 八字专业细盘 (bt-card)
  → ob.bzinfo                 — 起运/转运 + bt-card×4 + data-card-id 卡片×12
  → _splitBzinfoToCards()     — 拆分为 cards[] 数组（20张），注入 DOM id
  → { bzinfo, cards[], dayun, ... }

web/js/bazi-ui.js renderResult()
  → 优先遍历 data.cards[] 渲染（每个 card.body 已是完整 HTML + id 属性）
  → 回退 data.bzinfo（兼容旧版）

web/js/bazi-interact.js 联动
  → ChangeLn(n)              — 十年大运 onclick → 替换 大运流年/流月/命宫 三张卡片
  → selectLiunianYear(year)  — 大运流年 onclick → 更新流月 (双 ID 回退)
```

### 卡片 ID 双体系（修改联动时必须理解）

| 来源 | 十年大运 | 大运流年 | 流月 | 命宫星性 |
|------|---------|---------|------|---------|
| **ob.bzinfo 初始** | `bt_dayun` | `bt_liunian` | `bt_liuyue` | `bt_minggong` |
| **ChangeLn 替换后** | (不变) | `baziLiunian` | `baziLiuyue` | `baziMinggong` |

> `_splitBzinfoToCards` 将合成 ID 注入卡片 HTML outer div。`selectLiunianYear` 使用 `getElementById('bazi*') || getElementById('bt_*')` 双回退兼容两种状态。

## 文件结构

| 组成部分 | 行号 | 说明 |
|----------|------|------|
| **HTML 头部 + CSS** | 1-2800 | DOCTYPE、meta（含 `viewport-fit=cover`）、完整样式表（CSS 变量、卡片布局、日历格、详情浮层、dark mode、顶栏导航 `.top-nav`、设置面板、记事编辑器、八字卡片、页脚、授权UI、紫微斗数覆盖层 `.wx-full-page`、响应式 `clamp()`） |
| **Body HTML** | ~3895-4400 | 顶部导航栏 + 日历面板 + 八字排盘表单 + 设置面板 + 详情浮层 + 帮助面板 + 页脚 + 试用横幅 + 激活对话框 + 过期页面 + 定价页 + 档案面板 + 紫微斗数 iframe 覆盖层 |
| **Script 1 — 主题切换** | ~4400-4900 | toggleTheme |
| **Script 2 — 天文引擎 + Bz + 八字排盘** | ~4900-9000 | Lunar/JD/XL/ZB/SZJ 全局对象、星表数据、`var Bz={}`、mingLiBaZi、ob.bzinfo（12区块卡片）、`_computeCongGeData()` 从格引擎 |
| **Script 3 — 日历渲染 + 详情** | ~9000-14000 | nianLiHTML、showMessD、changeMonth、computeDayFromLunar、renderFullDetail、openFullDetail、_buildDayCell、建除/宿/煞/徽章、大运/流年表、`fistload()` 预加载 |
| **Script 4 — 每日记事 + 八字主函数** | ~14000-15500 | DailyNotes、openNoteEditor、K_getJD、showPage、backToCalendar、日历事件委托、触摸滑动、卡片折叠、`_updateTopNavHeight()` 响应式测量 |
| **Script 5 — 八字计算 + 档案系统** | ~15500-16200 | ML_calc、ML_calc_ss、saveBaziArchive、viewBaziArchive、BaziArchives、_generateBaziDocument、printBazi |
| **Script 6 — 授权系统核心** | ~16200-17000 | LICENSE_PUBLIC_KEY_PEM、RSA验签、HMAC短码验签、LICENSE_TIERS、机器码生成、license_parseActivationCode() |
| **Script 7 — 授权管理与UI** | ~17000-17550 | license_init()、license_showPricing()、license_showBuyPrompt()、license_showActivation()、功能门控包装、定价页交互、ESC全局关闭、天气全屏页 HTML |
| **importmap** | ~2800 | lunisolar CDN 模块映射 |
| **Script 8 — lunisolar 桥** | ~2800 后 | `<script type="module">`：导入 lunisolar + theGods 插件，暴露 `window._lsrGetGods(y,m,d)` |

> 行号为近似值（±300 行偏移），文件约 17550 行（2026-06-11），持续增长中。

## UI 设计

已实现的现代化设计：
- **卡片式布局**：统一 `.card` / `.card-header` 样式，`linear-gradient` + `box-shadow`
- **三栏 CSS Grid 布局**：`grid-template-columns: 240px 1fr 260px`，左侧控制 + 中间日历 + 右侧信息
- **Dark/Light 主题**：`body.dark` / `body.light` 切换，CSS 变量驱动，设置面板内 toggle 开关控制
- **顶部固定导航栏（top-nav）**：标题”天地玄黄 · 日月更替”与 6 个导航按钮合并为单一固定顶栏，`position: fixed; top: 0; z-index: 1000`。深棕渐变背景 + 金色底边。6 个 `.tab-item` 按钮（萬历/年历/八字/记事/设置/紫微），按钮间竖线分隔。选中态：金色文字 `#F5DD96` + 呼吸辉光阴影（`@keyframes tab-breathe`，2.4s 周期），无描边无背景填充，点击 `scale(0.94)` 反馈。高亮由 `_highlightFab(id)` 管理 `.tab-active` 类。详情浮层无独立返回按钮，用户通过导航按钮切换退出。
- **中文排版优化**：Western-first 字体栈（`--font-body`/`--font-display`），`text-rendering: optimizeLegibility`，`font-kerning: normal`，`font-feature-settings: "kern" 1`，em-based letter-spacing
- **日历日期点击**：点击日历格 → 金色高亮（`.selected`）→ 更新标题栏干支信息 → 浮动详情按钮可查看完整详情
- **详情浮层**：全屏 fixed overlay（z-index: 970），所有版块统一使用 `.card` 卡片格式（含折叠/展开）。包含：粘性日期信息、建除十二神宫格、时辰黄黑道、九星3×3网格、神煞标签云、五行分布、特殊日警示。顶部导航栏浮于其上（z-index: 1000），无返回按钮
- **每日记事**：通过导航栏「记事」按钮触发，弹出模态编辑器，支持新增/修改/删除，localStorage 持久化，有记事的日期格显示红色圆点标记，hover 悬浮框显示记事内容。试用模式下通过 `license_wrapNoteEditor()` 限制最多 1 条记事
- **八字排盘表单**：完整输入表单（姓名/性别/经纬度/日期时间），日期行单行显示（历法/年/月/日/时间），输入框精细化尺寸优化，怀旧风格。**确定按钮位于基本信息卡片底部**（`.bazi-submit-row`），桌面端右对齐，移动端居中
- **八字操作按钮栏**：八字页面标题下方 `.bazi-action-bar`，三个居中排列的圆角按钮（八字定格/八字喜用/八字从格），分别为暗金、玉绿、紫罗兰三种渐变色
- **八字从格分析面板**：`determineCongGe()` 实现完整从格判定算法（从旺/从弱/假从），含五行力量评分、日主根气检查、从神定位、大运破格风险评估，渲染在 `.bz-dingge-panel` 中
- **大运/流年表格横向滚动**：`.scroll-x-touch` 容器 + `white-space:nowrap`，桌面端完整显示，手机端自动出现滚动条
- **日历标签设置面板**：4 个 toggle 开关（无禄日/月倒家杀/年倒家杀/暗色模式），`.st-row` flex 布局 + `align-items: center` + `min-height: 3rem`，图标与文字完全居中
- **响应式断点**：768px（单栏堆叠）、600px（导航按钮缩小）、480px（超小屏优化）
- **固定页脚**： 三行竖排版权信息，。顶部中心三角箭头  点击折叠/展开， 通过  过渡动画平滑收起。 函数切换  类
- **八字分析卡片折叠系统**： — 点击  切换卡片折叠； — 初始化折叠箭头（格局面板）+ 恢复折叠状态； /  — 以  为键 localStorage 持久化
- **CSS 变量系统**：统一配色、间距、圆角、阴影
- **打印样式**：`@media print` 隐藏侧栏、顶栏、导航，仅保留日历区

## 构建产物

> ## 🔴 上线前必须完成 — HMAC 密钥替换
> 
> **当前 HMAC 密钥为公开默认值，所有激活码可被任意生成。上线前必须替换！**
> 
> 涉及文件（共 5 个，密钥必须完全一致）：
> 
> | 文件 | 变量 | 行号 |
> |------|------|------|
> | `index.html` | `_LIC_HMAC_K1` + `_LIC_HMAC_K2` | 16245-16246 |
> | `keygen.html` | `HMAC_KEY` | 393 |
> | `server-keygen.js` | `HMAC_SECRET` | — |
> | `worker-deno.js` | `HMAC_SECRET` | — |
> | `worker-license.js` | `HMAC_SECRET` | — |
> 
> 生成新密钥：`node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
> 
> **不替换 = 付费系统形同虚设。详见 `h:/Phone/SECURITY_REVIEW.md`。**

| 产物 | 路径 | 说明 |
|------|------|------|
| **Web 版本** | `h:/Phone/index.html` | ~15800 行，可直接在浏览器打开 |
| **Android APK** | `WannianliAndroid/app/build/outputs/apk/debug/app-debug.apk` | WebView 封装，约 4.0MB |
| **档案系统参考** | `h:/Phone/bazi_pai.html` | 档案阅览系统的正确参考实现，DOM 直接操作模式的范例 |
| **原文件备份** | `h:/Phone/index_old_backup.html` | 原始 11559 行版本（保留备查） |
| **原文件副本** | `h:/Phone/yuan.html` | 用户提供的原始备份 |
| **修改备份** | `h:/Phone/Back/` | 每次修改前的带时间戳备份 |
| **授权模块** | `h:/Phone/.license/` | RSA 密钥对、加解密脚本、防篡改测试 |
| **注册码生成器** | `h:/Phone/keygen.html` | 作者端工具，支持 RSA 长码 + HMAC 短码双格式 |
| **本地发码服务** | `h:/Phone/server-keygen.js` | Node.js Express 发码 + Web 管理页（`/admin`） |
| **Deno 发码服务** | `h:/Phone/worker-deno.js` | Deno Deploy 备用（GFW 安全） |
| **CF Worker 发码** | `h:/Phone/worker-license.js` | Cloudflare Worker 版（需绑自定义域名） |
| **商业化部署指南** | `h:/Phone/商业化部署指南.md` | 落地部署全流程文档 |
| **商业化方案** | `h:/Phone/商业化升级.md` | 功能分级与定价策略 |
| **数据审查文档** | `h:/Phone/审查数据来原.md` | 藏干权重等问题审查 |
| **八字修复文档** | `h:/Phone/八字修复.md` | 从格阈值、喜用标注等修复方案 |
| **Bz解读文字审查** | `h:/Phone/Bz解读文字_文献审查与改进规划.md` | Bz 对象 12 个模块的文献来源逐条审查、学术版本清单、分级改进方案（2026-06-16） |
| **CSS 改动记录** | `h:/Phone/changes.md` | 历次 CSS 统一/优化改动清单（修改前必读） |
| **UI 升级指南** | `h:/Phone/UI升级指导方案.md` | 8 阶段 UI 升级任务清单及参考方案 |
| **详细改动索引** | `h:/Phone/changes.md` + `h:/Phone/UI升级指导方案.md` | 修改 CSS/UI 前务必查阅此二文件了解历史变动 |
| **文档索引** | `h:/Phone/docs/README.md` | 全部 50+ 文档的分类索引（2026-06-26 新建） |

> **修改前必读**：`changes.md`（CSS 改动历史）和 `UI升级指导方案.md`（UI 升级指南）是理解当前设计状态的关键参考文档。**修改 Bz 解读文字前必读**：`Bz解读文字_文献审查与改进规划.md`。特别注意：《万物大全》不是任何已知命理古籍，Bz.bzzl 中所有《万物大全》和《命理正宗》引用均不可采信。

## 导航系统

### 顶部固定导航栏（top-nav）

`#bottomTabs` 容器（ID 保留历史原因）现为顶部固定导航栏 `.top-nav`，标题与按钮合并在同一深色条中。

**结构：**
```
.top-nav (fixed, top:0, z-index:950)
  └── .top-nav-inner (max-width:960px, 居中)
        ├── .top-nav-head (标题区)
        │     ├── h1 "天地玄黄 · 日月更替" + 八卦掌决版 badge
        │     └── .sub 副标题
        └── .top-nav-tabs (7 个导航按钮)
              ├── 首页 (tabHome)      → href="/"
              ├── 萬历 (tabCalendar)  → backToCalendar()
              ├── 年历 (tabNianli)    → showNianli()
              ├── 八字 (tabBazi)      → showPage(1)
              ├── 紫微 (tabZiwei)     → (待集成)
              ├── 记事 (tabNote)      → openNoteEditorForSelected()
              └── 设置 (tabSettings)  → toggleSettingsPanel()
```

| 按钮 | ID | onclick | 说明 |
|------|-----|---------|------|
| 首页 | `tabHome` | `href="/"` | 返回品牌首页 |
| 萬历 | `tabCalendar` | `backToCalendar()` | 返回月历主页，自动关闭详情浮层 |
| 年历 | `tabNianli` | `showNianli()` | 合并年历视图，自动关闭详情浮层 |
| 八字 | `tabBazi` | `showPage(1)` | 八字排盘表单，自动关闭详情浮层 |
| 紫微 | `tabZiwei` | — | 紫微斗数（待集成） |
| 记事 | `tabNote` | `openNoteEditorForSelected()` | 为当前选中日打开记事编辑器 |
| 设置 | `tabSettings` | `toggleSettingsPanel()` | 打开日历标签设置面板 |

### 导航按钮样式（2026-06-25 OWSPACE 方向更新）

- **基础态**：`color: #C9A96E`（浅金），透明背景，`border: 1px solid transparent`
- **悬停态**：`color: #e8d5a0`，`background: rgba(201,169,110,0.08)`
- **按下态**：`transform: scale(0.96)`，`transition: 0.1s ease`
- **选中态 `.tab-active`**：
  - 文字：`color: #e8d5a0`
  - `border-bottom: 2px solid var(--color-gold-bright)`（底线高亮）
  - 无 box-shadow、无呼吸动画（OWSPACE 零动画原则）
- **过渡**：`color 0.3s, background 0.3s`
- **按钮分隔**：`::after` 伪元素 1px 金色竖线
- **无障碇**：`prefers-reduced-motion: reduce` 禁用呼吸动画和缩放
- **暗色模式**：导航栏背景与亮色相同（始终深棕），选中态颜色不变

### 高亮管理

- `_highlightFab(id)` — 遍历 `.top-nav-tabs .tab-item`，移除所有 `.tab-active`，给指定按钮添加
- `showPage()`、`backToCalendar()`、`showNianli()` 入口均调用 `closeFullDetail()`
- 日历页（pg=2）显示所有按钮，年历模式下高亮「年历」按钮

### 页面 DOM 结构（关键元素）

修改页面显示/隐藏前必须先理解此结构：

| 元素 ID | 所属页面 | 可见性控制 |
|---------|---------|-----------|
| `#wnlb` | 万年历主页 | `style.display` |
| `#bzppxt` | 八字排盘表单 | `style.display`（含所有输入控件：Cml_y/m/d/his、gnlsel、Name_input、Sex_input 等） |
| `#Cal62` | 八字结果渲染区 | 始终在 DOM 中，位于 `bzppxt` 外部 |
| `#infoCards` | 右侧信息卡片 | `.page-hidden` 类 |
| `#baziAllResult` | 八字定格/喜用/从格面板 | `.show` 类 |
| `#Cal_pan` | 日历浮层 | `style.display` |
| `#baziArchiveOverlay` | 命盘档案管理面板 | `.show` 类 |
| 日历头部 | 节气栏、年月导航 | `_setCalHeaderVisible(bool)` |

> **关键原则**：`showPage()` 会触发 `ML_calc()` 等副作用。需要干净页面切换时直接操作上述 DOM 元素，不要调用 `showPage()`。详见铁律第五条。

### 页脚模块

固定页脚 `.foot`，三行竖排版权信息：
- `position: fixed; bottom: 0; z-index: 998`
- 顶部中心 `.foot-tab` 三角箭头按钮，点击折叠/展开
- `.foot-body` 通过 `max-height` 过渡（0.35s）平滑收起
- `_footToggle()` 函数切换 `.collapsed` 类，箭头旋转 180°

### 八字分析卡片折叠

12 个八字分析区块使用 `.card[data-card-id]` 体系：
- 点击 `.card-header` → `toggleBaziCardCollapse(headerEl)` → 切换 `.collapsed`
- `_initBaziCollapsibles(container)` — 为格局面板注入折叠箭头 + 恢复全部卡片状态
- `_saveBaziCollapseState()` — 以 `data-card-id` 为键存入 localStorage
- `_restoreBaziCollapseState()` — 恢复折叠状态（默认折叠）

### CSS 关键类速查

> CSS 全部定义在 `index.html` 的 `<style>` 块中（~1-2800 行）。以下为关键类名速查，具体样式值以源文件为准，此处不复制代码。

| 类别 | 关键类名 | 说明 |
|------|---------|------|
| **卡片系统** | `.card` / `.card-header` / `.card-body` / `.card-collapse-icon` / `.card-accent-gold` / `.card-accent-red` / `.card-raised` | 统一卡片布局，金色渐变 `::before` 顶线，折叠/展开 + localStorage 持久化 |
| **顶栏导航** | `.top-nav` / `.top-nav-inner` / `.top-nav-head` / `.top-nav-tabs` / `.tab-item` / `.tab-active` | fixed top z-index:950，纯色深棕底，选中态底线高亮（OWSPACE 方向） |
| **固定页脚** | `.foot` / `.foot-tab` / `.foot-body` | fixed bottom z-index:998，三角箭头折叠 |
| **详情浮层** | `.full-detail-overlay` / `#fullDetailBody` / `.sticky-date-info` | 全屏 overlay z-index:970，详情版块现已统一为 `.card` 格式 |
| **设置面板** | `.settings-panel` / `.st-row` / `.st-label` | absolute 定位，toggle 开关 |
| **按钮系统** | `.bazi-action-bar` / `.bazi-action-btn` / `.bazi-submit-row` / `.btn-license-*` / `.btn-copy-code` | 八字操作按钮 + 授权按钮 |
| **授权 UI** | `.trial-banner` / `.license-overlay` / `.license-dialog` / `.license-expired-page` / `.license-pricing-overlay` / `.pricing-grid` / `.pricing-card` / `.license-status-activated` | 试用横幅(z:1001) + 激活/过期页(z:2000) |
| **八字分析** | `.bz-analysis-wrap` / `.bz-section-body` / `.bz-info-row` / `.bz-wuxing-table` / `.bz-pillar-item` / `.bz-locked` / `.bz-locked-overlay` | 八字卡片内部排版 + 内容模糊锁 |
| **日历徽章** | `.duty12-strip` / `.duty12-item` / `.shichen-table` / `.shichen-cell` / `.ninestar-grid` / `.ninestar-item` / `.shensha-section` / `.shensha-tag-group` / `.shensha-tag` / `.wx-bar-wrap` / `.wx-bar-item` | 建除十二神、时辰黄黑道、九星3×3网格、神煞标签云、五行进度条 |
| **横向滚动** | `.scroll-x-touch` | 大运/流年表格横向滚动容器（含 `-webkit-overflow-scrolling: touch`） |
| **天气搜索** | `.wx-sketch-search-wrap` / `.wx-sketch-city-search` / `.wx-sketch-search-results` / `.wx-sketch-search-result-item` / `.wsr-path` | 精确地点搜索框 + 结果下拉 |
| **天气 GPS** | `.wx-sketch-gps-btn` / `.wx-sketch-gps-btn.locating` | GPS 定位按钮 + 定位中脉冲动画 `@keyframes wx-gps-pulse` |
| **旧类保留** | `.bz-section` / `.bz-highlight-card` / `.bz-section-title--*` | 已不再使用，保留兼容 |

## 核心功能模块


### 1. 日历渲染系统
- **函数**：`nianLiHTML(y)` — 生成整年日历 HTML
- **月历网格**：`getLunar()` — 生成单月日历表格，调用 `Lunar.calc2()` 3次（含 prev/next 月），其余通过快照恢复
- **年历网格**：`showNianli()` 触发，`_nianliMode = 3` 为合并年历模式，上下叠加年历1（12列）+ 年历2（6列双行）
- **年月选择**：`Cal_y`/`Cal_m` select 元素，`changeAssign()` 确认跳转

### 2. 天文计算引擎
- **坐标计算**：`zb_calc(T, L, fa)` — 日月黄经/赤经/方位角/高度角
- **时差计算**：`shiCha(t, a, dL, E)` — 平太阳时与真太阳时之差
- **升降计算**：`RTS1(jd, vJ, vW)` — 日月出没、晨光昏影、昼长
- **定气/定朔**：`XL.S_aLon_t()` / `XL.MS_aLon_t()` — 节气/朔望精确时刻
- **儒略日**：全局 `JD` 对象，`JD.toJD()` / `JD.setFromJD()` 转换

### 3. 八字排盘系统
- **输入表单**（`#bzppxt`）：姓名(`Name_input`)、性别(`Sex_input`)、历法选择(`gnlsel`)、年月日时、经纬度、地理位置
- **日期行布局**：`.bazi-row.cols-5 { flex-wrap: nowrap }`，历法/年/月/日/时间单行显示，不换行
- **操作按钮栏**：八字页面标题下方 `.bazi-action-bar`，三个居中排列的圆角按钮「八字定格/八字喜用/八字从格」（暗金/玉绿/紫罗兰渐变）。**确定按钮位于基本信息卡片底部**（`.bazi-submit-row`），桌面端右对齐，移动端居中
- **核心函数**：`ML_calc()` — 触发八字计算并渲染；`ML_calc_ss(nuu)` — 轻量版（历史记录回显）
- **排盘结构**：`Cal62` 容器顶部显示「日标信息」（性别/姓名/星座/空亡 + 公历日期 + 农历日期 + 节气）+「八字命局」（四柱/纪时/时标），下方接 `ob.bzinfo`（四柱表格+大运+流年+分析）
- **大运表渲染**：`dycs` 变量，6行×12列，`min-width:720px`，`.scroll-x-touch` 容器包裹
- **流年表渲染**：`lnpp` 变量，6行×10列，`sty_dyc`/`sty_dyz` 带 `white-space:nowrap`
- **流年文本**：`lnxx` 变量，起于…每年干支…止于，容器 `.scroll-x-touch` + `white-space:nowrap`
- **全流年**：`#Liunian` 容器（`.bazi-liunian` 类），按钮切换时通过 `ChangeLn(n)` 替换内容
- **历史记录**：`saveCurrentBazi()` / `showBaziHistory()` — localStorage 持久化
- **关键优化**：`dayunjl(ob.bz_jd)` 仅在 `ML_calc` 中调用（非 `mingLiBaZi`），避免 `ML_calc_ss` 路径浪费计算

### 4. 宜忌推算
三层整合体系（`getConsolidatedActs(lsr)`）：
1. **建除十二神基线**（`DUTY12_ACTS`）— 为每个建除值提供基础宜忌项
2. **plugin-thegods 神煞数据** — 使用 `lsr.theGods.getActs(1)`（actType=1 标准过滤），过滤 `ARCHAIC_TERMS` 中的过时古代术语
3. **术语标准化**（`TERM_NORMALIZE`）— 将古语映射为现代中文（如"結婚姻"→"嫁娶"），去重并宜忌互斥（忌优先）

### 5. 特殊日判定
所有判定函数的结果存入 `computeDayFromLunar()` 返回对象的对应字段：
- **重丧日**（`isChongsangDay2`）：月令忌干法，黑底红框
- **三丧日**（`isSansangDay2`）：按月支定日支，灰底黑框
- **横天朱雀日**（`isHengtianDay2`）：固定农历日期（初一/初九/十七/廿五）
- **大煞白虎入中宫**（`isDashaDay2` + `isLeitingDay2`）：旬推法 + 雷霆白虎
- **天地空亡**（`getKongwangResult2`）：八卦掌诀推算法
- **三伏天**（`getSanfuPeriods2` / `getSanfuInfo2`）：使用 `Lunar.calc2()` 一致的 `D = (d0 - 6 + 9000000) % 60` 干支公式，夏至后第3庚日=初伏
- **倒家杀**（`isDaojiaYearDay2` / `isDaojiaMonthDay2`）：按年判定 + 按月判定
- **无禄日**（`isWuluDay2`）：禄入旬空算法，`WULU_GZ` Set

### 6. 干支索引（getGZIdx2）
```javascript
function getGZIdx2(gz) {
    var s = Lunar.Gan.indexOf(gz[0]);
    var b = Lunar.Zhi.indexOf(gz[1]);
    var i = s;
    while (i % 12 !== b) i += 10;  // 最多 6 次迭代
    return i;
}
```
天干索引为起点，每次 +10（天干数），直到地支匹配。复杂度 O(6)，远优于线性扫描 O(60)。

### 7. 二十八宿算法
七元甲子法（《协纪辨方书》），420日大周期（60甲子×7元）：
- 锚点：1996-01-28 = 一元甲子·虚宿（index 10）
- `XIU_YUAN_START2 = [10, 14, 18, 22, 26, 2, 6]`
- `xiuIndex2(y, m, d)` — 使用 `Date.UTC()` 计算天数差（时区无关），统一调用入口

### 8. 日历详情系统
- **日期点击选择**：`Cal3` 上 click 事件委托（`onCalendarClick`），`highlightCell(y,m,d)` 高亮，全局状态 `_barY/_barM/_barD/_barH/_barMin`
- **数据桥接**：`computeDayFromLunar(y,m,d)` 从 `Lunar.lun[]` 提取 ~40 字段数据，含 LRU 缓存（max 200），优先使用 lunisolar theGods 插件获取神煞，回退到本地 `getShenshaForDay2`
- **详情浮层**：`renderFullDetail(y,m,d)` 渲染完整详情，`#fullDetailOverlay` 容器。特殊日警示（无禄/红砂/倒家杀/灭门/受死/冰消/三丧/重丧/横天朱雀）根据设置开关显示
- **月份预计算**：`precomputeMonthDays2(y,m)` 批量预计算当月所有日数据
- **触摸滑动**：Cal3 上 touchstart/touchend 监听，水平滑动 >50px 触发 `changeMonth`

### 9. 日历单元格渲染
- **`_buildDayCell(ob, y, m, d, yearStem, opts)`**：统一的单元格 HTML 生成器，用于上月/下月填充格
  - opts 参数：`isCurrentMonth`（默认 true）、`hasMouse`（默认 true）、`showWulu`/`showDaojiaMonth`/`showDaojiaYear`/`showJinshen`（预缓存的设置值）
- **`getLunar()` 主循环**：当月格内联渲染，徽章设置值在循环前缓存（`_cachedShowWulu` 等），避免每格 4 次 localStorage 读取
- **记事红点**：当月格在 `getLunar()` 内联渲染中通过 `DailyNotes.has()` 判断，跨月格通过 `_buildDayCell` opts 传入
- **Lunar.calc2 优化**：首月计算后保存 `Lunar.lun` 快照，prev/next 月计算后从快照恢复，总 calc2 调用从 5 次降至 3 次

### 10. 每日记事模块
- **数据层**：`DailyNotes` — IIFE 闭包，localStorage key `daily_notes`，提供 `get(y,m,d)` / `has(y,m,d)` / `save(y,m,d,text)` / `remove(y,m,d)`
- **触发方式**：底部「记事」标签按钮 → `openNoteEditorForSelected()` → 读取 `_barY/_barM/_barD`（无选中则默认今天）
- **编辑器**：`openNoteEditor(y,m,d)` 创建全屏模态弹窗（`.note-editor-overlay`），textarea + 保存/删除/关闭按钮，ESC 关闭
- **视觉标记**：有记事的日期格显示 `.daily-note-dot` 红色圆点
- **悬浮提示**：`showMessD` 中独立颜色显示记事内容（与八字信息区分）

### 11. 八字从格分析系统（2026-06-16 重构）

**架构**：tyme4j 决策树模型 — "否决权优先 + 从格准入 + 正格定基" 三层结构。

**统一计算引擎：** `_computeCongGeData(ob)` — 所有分析模块的统一数据源，缓存于 `ob._congGeData`。mingLiBaZi 排盘时预计算。

#### 🔴 第一层：否决权（硬否决，不可绕过）

据《子平真诠·论从格》"有印相生，虽弱不从"和《滴天髓》任注"凡从财官食伤，最忌印绶比劫"。

| 否决条件 | 触发规则 | 古籍依据 |
|---------|---------|---------|
| **天干透印** | 年/月/时任一干为印（正印或偏印），日主除外 | 《子平真诠》"有印相生，虽弱不从" |
| **强根** | 日主在任一地支得长生/临官/帝旺 | tyme4j "得长生、禄、刃者，不作无根论" |

> ⚠️ **关键**：否决是**硬性**的——只要触发任一条，直接返回非从格，**不计算**五行评分。这避免了早期返回对象字段缺失导致 `undefined` 的 BUG。

#### 🟢 第二层：从格准入（仅当无否决时到达）

| 条件 | 判定 |
|------|------|
| 生助 ≥ 80% | 从旺格（从印/从比/专旺五格） |
| 克泄耗 ≥ 85% | 从弱格（从财/从官杀/从儿/从势） |
| 克泄耗 65-85% + 无强根 | 假从弱格 |
| 生助 65-80% | 假从旺格 |

#### 🔵 第三层：正格定基

月令本气透干 → 该十神格局；否则月令本气定格。

#### 十二长生能量表

新增 `_CS_WEIGHT`、`_csState`、`_csWeight` 三个函数，用于根气强度判定：

```
长生=0.7, 沐浴=0.2, 冠带=0.55, 临官=1.0, 帝旺=1.0,
衰=0.2, 病=0.1, 死=0.0, 墓=0.4, 绝=0.0, 胎=0.15, 养=0.25
```

> 📌 **寅中丙火为长生根（0.7），非余气（0.2）**——据《渊海子平》"丙火长生在寅"、《三命通会》"不可作无根论"。

#### 关键函数

| 函数 | 说明 |
|------|------|
| `_computeCongGeData(ob)` | tyme4j 决策树引擎，三层判定 |
| `_getCongGeData(ob)` | 缓存读取器，非从格返回 null |
| `determineCongGe(ob)` | HTML 渲染器，非从格走简洁否决展示路径 |
| `_csState(riGanIdx, zhiIdx)` | 十二长生状态索引 |
| `_csWeight(riGanIdx, zhiIdx)` | 十二长生权重值 |
| `_cgSSKind(riGanIdx, targetIdx)` | 十神 → 印/比/财/官/食伤 |
| `_cgIsShengZhu(kind)` | 判断生助（印/比）还是克泄耗 |

#### ⚠️ BUG 教训：早期返回必须补全所有字段

`_computeCongGeData` 在否决路径会早期返回。返回对象**必须包含** `determineCongGe` 渲染所需的所有字段（`yueZhi`、`yueWx`、`rootDetail`、`result`、`congShen`、`scores`、`luckyEl/unluckyEl` 等），漏掉任何一个都会在从格面板显示 `undefined`。同时 `determineCongGe` 顶部增加了 `if (!d.isCong)` 守卫，非从格直接展示简洁否决理由。

#### 测试验证

运行 `node test-ziping-zhenquan.js` 验证 4 条古籍样本（含 BUG 复现用例）：

```
✅ 乙亥戊寅丙申辛卯 → 印星否决（年干乙透印）
✅ 甲子丙寅戊午壬戌 → 印星否决（月干丙透印）
✅ 丙申庚寅壬辰戊申 → 印星否决（月干庚透印）
✅ 丙午甲午辛酉戊戌 → 印星否决（时干戊透印）
```

#### 交叉验证

lunar-javascript（6tail）不提供从格判定 API，但其十神/长生数据可作为独立参照验证否决逻辑的输入正确性。日柱差异（寿星历 vs lunarjs）是预存历算路径差异，不影响算法逻辑。

### 12. 八字分析文字内容库（Bz 对象）

**所有八字排盘的分析文字均来自全局对象 `Bz`**，定义在 `index.html` 第 6054 行附近。这是一个纯静态文本数据库，无外部 API 调用。所有条目已于 2026-05-21 用古籍来源丰富（《三命通会》《渊海子平》《星平会海》《命理正宗》《万物大全》）。

**Bz 对象结构：**

| 属性 | 行号 | 条目数 | 说明 |
|------|------|--------|------|
| `Bz.bzzl` | 3515-3566 | 61 | **袁天罡称骨歌**（骨重 2.1 两 ~ 7.1 两），每 0.1 两一条评语，索引公式 `zlzong * 10 - 21` |
| `Bz.bzzln` | 3937 | 60 | **年干骨重**（60 甲子，单位：两） |
| `Bz.bzzly` | 3938 | 12 | **月骨重**（正月~腊月） |
| `Bz.bzzlr` | 3939 | 30 | **日骨重**（初一~三十） |
| `Bz.bzzls` | 3940 | 12 | **时骨重**（子时~亥时） |
| `Bz.mgd` | 3567-3578 | 12 | **命宫简断**（子宫~亥宫，天贵/天厄/天权/...星） |
| `Bz.mgbc(n)` | 3725-3736 | 函数 | **命宫补充分科**（6 组：子丑宫土星、寅亥宫木星、卯戌宫火星、辰酉宫金星、巳申宫水星、午宫太阳、未宫太阴） |
| `Bz.rzd` | 3579-3588 | 10 | **日主性格**（甲木~癸水，10 天干）。⚠️ 代码中标注为《三命通会》的 10 条引文实际出自《滴天髓·十天干论》 | 
| `Bz.shshxx` | 6408-6417 | 10 | **十神心性**（比肩/劫财/食神/伤官/偏财/正财/偏官/正官/偏印/正印），2026-06-16 新发现模块 |
| `Bz.rzuo` | 3737-3936 | 10×10 | **日坐十神论断**（10 天干 × 10 坐支十神关系，共 100 条） |
| `Bz.zhsxx` | 3599-3610 | 12 | **长生十二运寓意**（长生/沐浴/冠带/临官/帝旺/衰/病/死/墓/绝/胎/养） |
| `Bz.jzdc` | 3611-3670 | 60 | **甲子年断**（60 甲子，如"林下之猪"） |
| `Bz.shery` | 3671-3682 | 12 | **十二月断**（正月~腊月出生性格命运） |
| `Bz.nlsrd` | 3683-3712 | 30 | **农历日断**（初一~三十） |
| `Bz.csscd` | 3713-3724 | 12 | **时辰断**（子时~亥时） |
| `Bz.nayin(xh)` | 3978-3986 | 函数 | **纳音五行**（60 甲子 → 五行+纳音名，如"海中金"） |
| `Bz.ZhshengD` | 4014-... | 函数 | **日柱生克关系**（日主与他柱的生克合化文字描述） |
| `Bz.ZhshengS` | 3998-4013 | 函数 | **长生十二运位置计算** |

> **注意：** 上表行号为 Bz 对象定义时的原始位置（index.html ~3500-4020 行区域）。自 2026-05-30 起文件已增长至 ~15800 行，CSS/HTML 区新增 ~1800 行导致 Bz 区域整体后移约 2500 行。使用 `codegraph_search "Bz.bzzl"` 或 `grep -n "var Bz=" index.html` 定位当前精确位置。条目数不变，仅行号偏移。

**渲染调用（`ob.bzinfo`）— 卡片式排版系统：**

所有分析文字通过 `ob.bzinfo` 字符串拼接输出，12 个分析区块使用 `.card[data-card-id]` / `.card-header` / `.card-body` 体系（与万年历信息卡片统一风格）：

```
.bz-analysis-wrap
  ├── 页头（八字年月 + 基本信息）
  ├── bzjc（四柱干支表格）
  ├── .card（起运时间）
  ├── 流年横滚区
  ├── —— 详细分析 ——（金色虚线分隔）
  ├── .card[data-card-id=bz_taiyuan]（胎命身宫）
  ├── .card[data-card-id=bz_jishen]（吉神凶煞）
  ├── .card.card-accent-gold[data-card-id=bz_zonghe]（综合信息）
  ├── .card[data-card-id=bz_shengke]（生克制化）
  ├── .card.card-raised[data-card-id=bz_rizhu]（日主强弱）
  ├── .card[data-card-id=bz_tiangan]（干支关系）
  ├── .card[data-card-id=bz_wuxing]（五行力量）
  ├── .card.card-raised[data-card-id=bz_zhongliang]（八字称骨）
  ├── .card.card-raised[data-card-id=bz_minggong]（命宫寓意）
  ├── .card[data-card-id=bz_sizhu]（四柱详断）
  ├── .card.card-accent-gold[data-card-id=bz_shishen]（十神定位）
  └── .card.card-accent-red[data-card-id=bz_riduan]（日柱论断）
```

> 卡片标题使用 `.card-header`（金色渐变底 + Tabler 图标 + ▾ 折叠箭头），内容包裹在 `.card-body` 内。`.bz-section-body`/`.bz-info-row`/`.bz-wuxing-table`/`.bz-pillar-item` 等内部排版类继续使用。

| 显示区域 | 数据来源 | 说明 |
|----------|---------|--------|
| 日标信息 | `ob.bzInfo2` / `ob.bzNyr` / `ob.bzJQ` | Script 2 中生成 |
| 八字命局表格 | `ob.bz_jn/jy/jr/js` / `ob.bz_zty` / `ob.bz_JS` | Script 2 中生成 |
| 八字重量（称骨） | `Bz.bzzl` + `Bz.bzzln/y/r/s` | Bz 对象 |
| 命宫寓意 | `Bz.mgd` + `Bz.mgbc()` | Bz 对象 |
| 四柱详断（年/月/日/时） | `Bz.jzdc` / `Bz.shery` / `Bz.nlsrd` / `Bz.csscd` | Bz 对象 |
| 十神定位论断 | `Bz.rzuo` | Bz 对象 |
| 日柱论断 | `Bz.rzd` + `Bz.ZhshengD()` + `Bz.zhsxx` | Bz 对象 |
| 吉神凶煞 | `gg1`~`gg4`（mingLiBaZi 中计算） | Script 2 |
| 五行力量分析 | `Qiulq()` + 阴阳五行计数 | Script 2 |
| 生克制化分析 | `wxstr` / `tiang` / `dizhis` / `rzhdf` | Script 2 |

> 上表原始行号（~5558-9492）已随文件增长偏移约 2500 行。使用 `grep -n` 定位当前精确位置。

> **注意：** Bz 对象为静态数据，修改其中文字务必保持数组长度不变（索引与甲子序号严格对应）。所有内容为繁体中文，修改时勿转简体。`ob.bzinfo` 的 `//` 注释已于简化为 CSS 类时全部移除，勿重新添加。

### 13. 天气预报模块

**模块封装**：`WeatherModule`（IIFE 闭包），位于 Script 1 主题切换脚本前。

**API 配置**：
- 服务商：和风天气 (QWeather) 开发者版
- API Host：`pa4ewuphv9.re.qweatherapi.com`（用户专属域名）
- API Key：`QWETHER_API_KEY`（环境变量，2026-06-26 从明文改为占位）
- 城市搜索：`/geo/v2/city/lookup`（GeoAPI，支持模糊搜索 + 坐标反查）
- 实时天气：`/v7/weather/now`
- 15天预报：`/v7/weather/15d`
- 24小时逐时预报：`/v7/weather/24h`

**精确定位系统**（2026-06-11 新增）：

模块内部维护 `_currentLocation` 状态（`{ id, name, lat, lon, adm1, adm2 }`），支持三种定位方式：

| 方式 | 触发 | 精度 |
|------|------|------|
| **文本搜索** | `#wx-full-city-search` 输入框（350ms 防抖）→ GeoAPI 模糊搜索 → 下拉选择 | 村级/小区级（取决于 QWeather 数据覆盖） |
| **GPS 一键定位** | `#wx-full-gps-btn` 按钮 → `navigator.geolocation` → 坐标反查 | 区/县级（GPS 精度 ~10-50m，QWeather 反查精度到区县） |
| **旧城市下拉** | `#wx-full-city-sel`（隐藏，由 `Sel2` 同步） | 市级 |

选中定位后保存到 `localStorage._weather_location`，下次打开自动恢复。

**核心函数**：

| 函数 | 说明 |
|------|------|
| `WeatherModule.init()` | 初始化：恢复上次定位 → 克隆 Sel2 选项 → 加载天气 → 绑定搜索/GPS 事件 |
| `getCityFromUI()` | 优先级：`_currentLocation.name` → `wx-full-city-sel` → `Sel2` → 默认城市 |
| `searchLocations(query)` | GeoAPI 模糊搜索（`number=6`），渲染结果下拉 |
| `selectByResult(el)` | onclick 回调：从搜索结果 data-属性提取定位信息 |
| `selectLocation(loc)` | 核心：保存 `_currentLocation` + localStorage + 清除缓存 + `fetchWeatherById()` |
| `locateByGPS()` | HTML5 Geolocation → 坐标反查（`enableHighAccuracy: true`）→ 选区级最佳结果 |
| `lookupCity(cityName)` | GeoAPI 城市搜索（单个结果），旧路径保留 |
| `fetchWeather(cityOrLoc)` | **支持字符串或 `{id, name}` 对象**；有 `_currentLocation` 时走 ID 直连路径 |
| `fetchWeatherById(locId, name)` | 直接通过 location ID 请求天气，跳过 GeoAPI（省一次网络请求） |
| `render(data, cityName)` | 渲染实时天气 |
| `renderForecast(daily)` | 渲染 5 日预报 + Canvas 温度折线图 |
| `renderHourly(hourly)` | 渲染 24 小时逐时预报 |
| `tryGeolocation()` | 旧版自动 GPS（已降级为 fallback，仅当无 `_currentLocation` 时调用） |

**搜索 UI 元素**：

| 元素 | 说明 |
|------|------|
| `#wx-full-city-search` | 搜索输入框，placeholder="搜索村/小区..." |
| `#wx-full-search-results` | 搜索结果下拉（`.wx-sketch-search-results`），点击外部自动关闭 |
| `#wx-full-gps-btn` | GPS 定位按钮，定位中有 `.locating` 脉冲动画 |
| `#wx-full-city-sel` | 隐藏的旧城市下拉（`display:none`），作为 `Sel2` 同步后备 |
| `#wx-full-city-name` | 当前定位名称显示 |

**天气图标映射**：和风天气 `icon` 字段（数字）→ Tabler Icons 类名，覆盖 100+ 种天气类型。

**缓存策略**：30 分钟 localStorage 缓存（`_weather_now_*` / `_weather_forecast_*` / `_weather_hourly_*`）。

**已知限制**：
- QWeather 天气数据实际精度到区/县级，村级/小区级仅体现在显示名称
- GPS `enableHighAccuracy: true` 耗电较高，超时 15 秒
- 首次访问无 `_currentLocation` 时，`init()` 先加载默认城市 → 再异步 GPS 覆盖（可能产生双倍 API 请求）

### 14. 日历标签设置开关

设置面板（`#settingsPanel`）中的 5 个 toggle 开关，所有开关默认开启（`checked`/`true`）：

| 开关 | localStorage key | ID | 说明 |
|------|-----------------|-----|------|
| 无禄日标签 | `cal_showWulu` | `togWuluBadge` | 日历格"无"字徽章 + 详情提示 |
| 月倒家杀标签 | `cal_showDaojiaMonth` | `togDaojiaMonth` | 按月的"倒"字徽章 |
| 年倒家杀标签 | `cal_showDaojiaYear` | `togDaojiaYear` | 按年的"倒"字徽章 |
| 暗色模式 | （不走 cal_ 前缀） | `togDarkMode` | 主题切换 |

- **存取函数**：`saveCalSetting(key, val)` / `loadCalSetting(key, def)` — 封装 localStorage，key 自动加 `cal_` 前缀
- **读取辅助**：`_rdCBool(key, def)` — 简单布尔读取，`_buildDayCell` 和 `getLunar` 均使用
- **变更回调**：`onCalSettingChange()` — 保存全部开关值并调用 `getLunar()` 刷新日历
- **初始化**：`initCalSettings()` — 页面加载时从 localStorage 恢复所有开关状态
- **设置面板 CSS**：`.st-row` 使用 `display: flex; align-items: center; min-height: 3rem`，`.st-label` 使用 `display: flex; align-items: center; gap: 0.3rem` 确保图标文字垂直居中

### 14. 屏幕适配系统（2026-06-11 新增）

**响应式基准字号**：`:root { font-size: clamp(14px, calc(14px + (100vw - 375px) * 0.0051), 18px); }`
- 375px 屏 = 14px，768px 屏 = 16px，1440px 屏 = 18px（clamp 上限）
- **注意**：系数 `0.0051` 经精确校准，修改时必须重新验算三个断点

**顶部导航栏高度 CSS 变量**：`_updateTopNavHeight()` 函数在页面加载、resize、字体加载完成时测量 `.top-nav.offsetHeight`，写入 `--top-nav-height`。`.wrap { margin-top: var(--top-nav-height, 120px); }` 使用此变量。

**日历单元格响应式字号**：
- `#Cal3 .cal-cell { font-size: clamp(10px, 2.5vw, 13px) !important; }` — 覆盖 JS 内联样式
- `#Cal3 .cal-cell .solar-num { font-size: clamp(12px, 3vw, 16px) !important; }`
- **注意**：暗色模式下必须使用 `body.dark #Cal3 .cal-cell` / `body.dark #Cal3 .cal-cell .solar-num` 前缀，禁止裸选择器

**表格横向滚动优化**：`.scroll-x-touch { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }`

**天气搜索框自适应**：`.wx-sketch-search-wrap { max-width: clamp(80px, 40vw, 180px); }`

### 15. 辅助函数

| 函数 | 说明 |
|------|------|
| `_highlightFab(activeId)` | 清除所有 `.tab-item` 的 `.tab-active`，给指定 ID 按钮加高亮 |
| `_setCalHeaderVisible(bool)` | 统一显示/隐藏 Cal2、FTLN、jqTopBar、cal-header-bar |
| `_rdCBool(key, def)` | 从 localStorage 读取布尔设置值（带默认值） |
| `_updateCal2(y, m, d)` | 更新日历标题行为指定日的完整干支纳音信息 |
| `_noteDot` | 在 `getLunar()` 和 `_buildDayCell()` 中都需判断 `DailyNotes.has()`，两种渲染路径均覆盖 |
| `_DG_BENQI` | 12 地支权威本气数组 `['癸','己','甲','乙','戊','丙','丁','己','庚','辛','戊','壬']`，藏干相关代码必须以此为准 |
| `_DG_ZHONGQI` | 12 地支权威中气数组 |
| `_DG_YUQI` | 12 地支权威余气数组 |
| `_DG_GAN` | 天干字符→索引哈希表（如 `_DG_GAN['甲']` → 0），O(1) 查找，优于 `Lunar.Gan.indexOf()` |
| `_cgGanWx(g)` | 天干字符→五行索引 0-4，内部 `indexOf` + if 链。仅用于无索引的场景 |
| `_cgSSKind(rIdx, tIdx)` | 十神→类别（印/比/财/官/食伤），用于从格生助/克泄耗分组 |
| `_cgIsShengZhu(kind)` | 判断类别是生助(印/比)还是克泄耗 |
| `_computeCongGeData(ob)` | 统一从格计算引擎，返回 `{ scores, total, shengZhuPct, keXiePct, riWx, riWet, yuelingWx, congPattern, luckyWx, unluckyWx, ... }` |
| `_getCongGeData(ob)` | 缓存读取器，返回兼容旧接口的从格数据 |
| `_LIC_HMAC_K1` / `_LIC_HMAC_K2` | 128-bit HMAC 密钥分裂存储的两半，运行时拼接后用 Web Crypto API 导入 |

### 16. 页面切换
`showPage(pg)` 函数控制页面切换：
- `pg=1`：八字排盘页（`#bzppxt`）
- `pg=2`：万年历主页（`#wnlb` + 信息卡片）
- **入口自动调用 `closeFullDetail()`**，确保详情浮层关闭
- 切换时通过 `_highlightFab` 高亮对应按钮
- 离开日历页（pg≠2）时清除年历模式（`_nianliMode = 0`）

`backToCalendar()` 统一返回入口：**入口调用 `closeFullDetail()`**，若在年历模式则退出年历并重绘月历，否则调用 `showPage(2)`。

`showNianli()` 年历入口：**入口调用 `closeFullDetail()`**，设置 `_nianliMode = 3`。

### 17. lunisolar 桥接层
- **importmap**：将 `lunisolar` 和 `@lunisolar/plugin-thegods` 映射到 jsdelivr CDN
- **模块脚本**：`<script type="module">` 导入并扩展 lunisolar，暴露 `window._lsrGetGods(y,m,d)` 供常规脚本调用
- **执行时序**：模块脚本 defer 执行（DOM 解析完成后），常规脚本同步执行。`computeDayFromLunar` 在使用时检查 `window._lsrGetGods` 是否可用

### 18. Android 动态图标系统

APP 名称为「万年历·八卦掌决版」，图标系统基于时辰动态切换：

- **图标设计**：红→紫→蓝→桔四色渐变圆形底 + 八卦阴阳鱼暗纹 + 12 时辰钟面指针
- **12 个 activity-alias**：`MainActivityZi`/`Chou`/`Yin`/`Mao`/`Chen`/`Si`/`Wu`/`Wei`/`Shen`/`You`/`Xu`/`Hai`
- **动态切换**：`MainActivity.updateAppIcon()` 根据当前小时计算时辰索引，启用对应 alias 并禁用其余
- **时辰边界调度**：`IconUpdateWorker`（WorkManager）在下一时辰交界时刻准时切换
- **时辰计算**：`getCurrentShichen()` — `h = Calendar.HOUR_OF_DAY; return ((h + 1) % 24) / 2`
- **图标文件**：
  - `drawable/ic_gradient_bg.png` — 432×432 渐变底图
  - `drawable/ic_launcher_{zi~hai}.png` — 12 个完整 PNG 图标（432×432）
  - `mipmap-{mdpi~xxxhdpi}/ic_launcher.png` — 5 密度静态启动图标
  - `mipmap-{mdpi~xxxhdpi}/ic_launcher_background/foreground/monochrome.png` — 自适应图标层
  - `mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml` — 自适应图标定义
- **图标生成脚本**：`WannianliAndroid/generate_icons.py` — PIL 生成所有 PNG，修改后重新运行即可

## 四柱动态详断引擎（2026-06-16 新增）

替代原有硬编码的 `Bz.jzdc`/`Bz.shery`/`Bz.nlsrd`/`Bz.csscd` 四个静态数组，改为基于实际八字排盘结果动态生成解读。

### 渲染函数

| 函数 | 输出 | 关键逻辑 |
|------|------|---------|
| `_getXiyongWx(ob)` | 喜用五行列表 | 复用 `ob._geName` 缓存，优先读缓存 |
| `_renderNianZhu(ob, xy)` | 年柱·祖上基调 | 年干十神 + 年支藏干 + 喜忌判断 |
| `_renderYueZhu(ob, xy)` | 月柱·事业内核 | 月令当令十神 + 透干 + 格局 + 喜忌 |
| `_renderRiZhu(ob, xy)` | 日柱·自我婚姻 | 日主强弱 + 日支十神 + 六冲检查 |
| `_renderShiZhu(ob, xy)` | 时柱·晚景归宿 | 时干十神 + 天干五合 + 喜忌 |
| `_renderTiaoHou(ob)` | 🌡 调候诊断 | 寒暖燥湿 + 《穷通宝鉴》40条表 |
| `_renderLiuTong(ob)` | 🔄 流通诊断 | 五行相生链检测 + 缺失预警 |

### ⚠️ 关键保护

**`ob.bzinfo` 中的 IIFE 必须 try-catch**：动态渲染函数在 `ob.bzinfo = '...' + (function(){...})() + '...'` 中执行。如果 IIFE 内任何函数抛异常，整个 `ob.bzinfo` 赋值失败（变为 undefined），导致排盘页完全空白。

```javascript
+ (function(){
    try {
      var xy2 = _getXiyongWx(ob);
      return _renderNianZhu(...) + ... + _renderTiaoHou(ob) + _renderLiuTong(ob);
    } catch(e) {
      return '降级：基础四柱显示 + 错误信息';  // 不影响其他卡片
    }
  })()
```

### 硬编码数组状态

`Bz.jzdc`、`Bz.shery`、`Bz.nlsrd`、`Bz.csscd` 仍保留在代码中但不再被四柱详断引用，仅作为数据备份。

## 格局名单一真相源（2026-06-16 新增）

### 问题

`determineBaziPattern`、`determineXiyongshen`、四柱详断三者各自独立调用有状态的 `_dinggeGetSiLing(ob)`（内部调用 `Lunar.calc()` 修改全局状态），导致同一八字在不同面板显示不同的格局名。

### 修复

在 `mingLiBaZi` 中（`ob._congGeData` 计算之后）立即计算并缓存 `ob._geName`：

```
mingLiBaZi()
  ├─ ob._congGeData = _computeCongGeData(ob)
  ├─ ob._geName = ...  ← 格局名缓存（唯一真相源）
  └─ ob.bzinfo = ...
```

所有消费者统一从 `ob._geName` 读取，不再各自调用 `_dinggeGetSiLing`。

### 取值逻辑

```javascript
if (cd && cd.isCong) ob._geName = cd.congType;   // 从格
else ob._geName = 司令透干格局 || 月令本气格局;   // 正格
```

## 已知陷阱（禁止重犯）

1. **`textContent` 设置图标 HTML** — 设置含 `<i class="ti ...">` 的字符串必须用 `innerHTML`，`textContent` 会将 HTML 标签当纯文本显示（乱码）
2. **`getShichen()` 属性名** — 返回 `{ index, name, branch }`，属性是 `index` 不是 `idx`
3. **繁体/简体字不匹配（强制校验规则）** — 任何以中文字符为键的 JS 对象/Map，必须确保查找来源与键使用同一字符变体（简体/繁体）。已发生的 Bug：`BY12_GOOD` 键使用繁体（青龍/金匱/勾陳）但 `HUANGDAO_SHEN2` 数组返回简体（青龙/金匮/勾陈），导致 `BY12_GOOD["青龙"]` 返回 `undefined`，青龙和金匮被误判为凶神（2026-05-24 修复）。以下为完整简繁审计清单，每次修改涉及中文键数据结构时必须逐条核对：

**简体组（所有查找链自洽，不可混入繁体）：**
| 数据结构 | 近似行号 | 键值 | 查找来源 | 验证 |
|----------|------|------|----------|------|
| HUANGDAO_SHEN2 | ~9176 | 青龙/明堂/天刑/朱雀/金匮/天德/白虎/玉堂/天牢/玄武/司命/勾陈 | 自身（数字索引） | ✅ |
| HUANGDAO_KJ2 | ~9178 | 同上简体键 | HUANGDAO_SHEN2 | ✅ |
| BY12_GOOD | ~9389 | 同上简体键 | HUANGDAO_SHEN2 | ✅ |
| STEMS2 / BRANCHES2 | ~9081 | 天干地支（简繁相同） | 自身 | ✅ |
| DAOJIA_YEAR2 / 其他天干键表 | ~9450 | 甲-癸（简繁相同） | STEMS2 | ✅ |

**繁体组（所有查找链自洽，不可混入简体）：**
| 数据结构 | 近似行号 | 键值 | 查找来源 | 验证 |
|----------|------|------|----------|------|
| DUTY12_ORDER2 | ~9145 | 建/除/滿/平/定/執/破/危/成/收/開/閉 | 自身（数字索引） | ✅ |
| DUTY12_GOOD2 | ~9146 | 同上繁体键 | DUTY12_ORDER2 | ✅ |
| DUTY12_MEANING2 | ~9147 | 同上繁体键 | DUTY12_ORDER2 | ✅ |
| DUTY12_ACTS | — | 同上繁体键 | DUTY12_ORDER2 | ✅ |

**关键差异字符对照（修改时务必核对此表）：**
| 简体 | 繁体 | 出现位置 |
|------|------|----------|
| 龙 | 龍 | 黄道十二神 |
| 匮 | 匱 | 黄道十二神 |
| 陈 | 陳 | 黄道十二神 |
| 满 | 滿 | 建除十二神 |
| 执 | 執 | 建除十二神 |
| 开 | 開 | 建除十二神 |
| 闭 | 閉 | 建除十二神 |

> **强制规则：新增或修改任何以中文字符为键的数据结构时，必须：**
> 1. 确认键使用简体还是繁体
> 2. 追踪所有查找该键的代码路径，验证来源字符变体一致
> 3. 若来源是外部库（如 lunisolar），确认其返回的字符变体
> 4. 在本文件的此清单中更新对应条目
4. **`godS` 作用域** — 变量在 `renderSide()` 和 `renderFullDetail()` 中各自定义，不共享
5. **Sticky 栏冲突** — 使用 `position: sticky` 的元素，所有祖先元素不能设置 `overflow: hidden`
6. **`BRANCH_WX` 重复定义** — 统一使用顶部共享常量，勿在各函数内重新内联字面量
7. **`getWangXiang()` 重复实现** — 必须使用已有函数，勿手动重写旺相休囚死计算
8. **`showInterpret()` 中 `dd.hourGZ` 错误** — `computeDay()` 始终返回午时时柱，八字上下文必须重新计算 `effHourGZ`
9. **`BZ_PILLAR_STR_*` 死代码** — 已删除，勿恢复
10. **`PILLAR_LABELS` 重复声明** — 使用模块作用域的 `PILLAR_LABELS`
11. **两个 `renderDayun` 勿混淆** — `renderDayun(dat)` 日历简化版 vs `renderDayunFull(qiyun, monthGZ)` 八字精确版
12. **`lunisolar.SolarTerm` API** — `findNode()` 返回交节时刻，`findDate()` 仅是日期，起运计算必须用 `findNode()`
13. **`JD.DD(jd, r)` 必须传两个参数** — 签名 `function(jd, r)`，`r` 是输出对象。若只传一个参数，`r` 为 `undefined`，`r.Y = ...` 抛出 `TypeError`。调用形式：`JD.DD(jdValue, {})` 或 `JD.DD(jdValue, existingObj)`
14. **干支索引公式一致性** — 三伏天等所有干支计算必须使用 `D = (d0 - 6 + 9000000) % 60`，与 `Lunar.calc2()` 一致
15. **模块脚本执行时序** — `<script type="module">` 在 DOM 解析完成后 defer 执行，晚于所有常规脚本。依赖 `_lsrGetGods` 的函数必须做可用性检查
16. **Lunar.calc2 是原地修改** — `Lunar.calc2()` 修改 `Lunar.lun` 同一对象的属性（不创建新对象）。切换月份计算后必须从快照恢复状态，勿依赖 calc2 返回后的 Lunar 全局状态
17. **日历单元格徽章设置缓存** — `getLunar()` 中 `_rdCBool` 结果必须在循环前缓存，通过 opts 传入 `_buildDayCell`。勿在循环体内或 `_buildDayCell` 内直接调用 `_rdCBool`
18. **记事红点双路径渲染** — 当月格在 `getLunar()` 内联模板中渲染，跨月格在 `_buildDayCell()` 中渲染。两处都必须添加 `DailyNotes.has()` 判断的 `_noteDot`，否则刷新后红点消失
19. **大运/流年表格不压缩** — `sty_dyc` 和 `sty_dyz` 带 `white-space:nowrap`，大运表有 `min-width:720px`。流年表（lnpp）无 `width` 属性让表格自然宽度。两个表格都包裹在 `.scroll-x-touch` 容器中
20. **`additionalData` 不能传 `null`** — Web Crypto API 的 AES-GCM 解密参数中，`additionalData` 不使用时必须省略字段，不能设为 `null`。否则浏览器报 `AesGcmParams: additionalData: Not a BufferSource`。keygen.html 中已修复
21. **授权模块 z-index 层级** — 页脚 998 < 详情浮层 970 < 顶部导航栏 1000 < 试用横幅 1001 < 激活/过期页面 2000。顶部导航栏始终可见，试用横幅在导航栏之下。修改时勿打乱此层级
22. **导航栏暗色模式无需特殊处理** — 顶部导航栏始终使用深棕渐变背景（亮色/暗色模式相同），因此 `.tab-item.tab-active` 和 `body.dark .tab-item.tab-active` 不需要区分。之前存在的 `body.dark .tab-item.tab-active` 块因与亮色块完全重复已被移除。新增导航按钮样式时勿重新添加暗色特化规则。
23. **授权功能门控包装顺序** — 必须在原始函数定义之后、`license_init()` 之前调用 `license_wrapXxx()`，否则包装失效或引用 `undefined`
24. **藏干本气必须用 `_DG_BENQI`** — `Lunar.CangGan[zIdx]` 字符串首字符不一定是本气（如丑='癸辛己'首字符是癸但本气是己，辰='乙戊癸'首字符是乙但本气是戊）。12 个地支中有 8 个首字符≠本气。必须用 `_DG_BENQI[zIdx]` 获取权威本气
25. **五行索引计算统一规范** — 天干索引→五行索引统一用 `idx >> 1`（或 `Math.floor(idx / 2)`）。禁止使用 `Lunar.WuXing[idx].charAt(1)`（脆弱依赖"阳木"2字格式）。若已有天干字符需转五行索引，用 `_cgGanWx(g)`；若已有天干数值索引，直接用 `idx >> 1`，勿再调 `_cgGanWx`
26. **五行评分键名必须一致** — `scores` 对象初始化和读写必须使用同一套键。`determineCongGe` 中使用英文拼音键 `{ mu, huo, tu, jin, shui }`，通过 `wxKeys` 数组映射。勿混用中文键（`Lunar.WuXingJ` 返回'木'等中文）和英文键
27. **`_cgGanWx` 避免冗余调用** — `_cgGanWx(g)` 内部执行 `Lunar.Gan.indexOf(g)` 扫描10元素。若调用处已有 `gIdx = Lunar.Gan.indexOf(g)` 的结果，直接用 `gIdx >> 1`，严禁再调 `_cgGanWx(g)` 导致重复 indexOf
28. **八字数据统一计算入口** — 所有分析（日主强弱、五行力量、从格、喜用）必须从 `ob._congGeData`（由 `_computeCongGeData(ob)` 生成）读取数据，禁止各模块独立计算。统一入口确保藏干权重、季节旺衰、从格判定使用同源数据。
29. **HMAC 密钥一致性** — `index.html`、`keygen.html`、`server-keygen.js`、`worker-*.js`、`server/middleware/auth.js`、`web/js/api.js` 共 7 个文件中的 HMAC 密钥必须完全一致。2026-06-26 已统一更换为 `381cb51f0...`。更换后必须重启 server（见陷阱 #59）。
30. **激活码格式双解析** — `license_parseActivationCode()` 必须同时支持 `BZ-Y-20270529-A3F7`（带横线）和 `BZY20270529A3F7`（无横线）两种格式。strip 横线后的短码存储方式改变了正则匹配策略。
31. **藏干权重四生支标准比** — 寅/巳/申/亥四生支的中气:余气严格按 16:8:4（4:2:1）比例，本气:中气:余气 = 16:8:4。辰戌丑未四库支按 18:9:3（6:3:1）。丑特殊：中气余气 5:7。
32. **从格阈值标准（2026-06-16 更新）** — 三层决策树：（1）印星否决（天干透印/地支本气印→硬否决）；（2）强根否决（长生/临官/帝旺→硬否决）；（3）通过否决后：从旺≥80%，从弱≥85%（tyme4j 标准，原 80%），假从旺 65-80%，假从弱 65-85%。月令 +5 不加乘。**禁止仅用百分比线性阈值判定从格**。
33. **天喜=红鸾对冲** — `TianXi[i] = (HongLuan[i] + 6) % 12`（值用1-12体系，0→12表示子）。修改天喜数组前必须与红鸾逐位验证。
34. **六厄=三合死位** — 亥卯未(木)死位在卯(4)，非寅(3)。`LiuE[0]` 必须为 4。
35. **寡宿=三会对冲** — 亥子丑→丑(2)，寅卯辰→辰(5)，巳午未→未(8)，申酉戌→戌(11)。与孤辰不共用同一推算逻辑。
36. **阴阳差错含12日** — 标准为丙子/丁丑/戊寅/辛卯/**壬辰**/癸巳/丙午/丁未/戊申/辛酉/壬戌/癸亥，共12日。壬辰(i==28)易遗漏。
37. **孤鸾八日标准** — 《渊海子平》乙巳(42)/丁巳(54)/辛亥(48)/戊申(45)/丙午(43)/戊午(55)/壬子(49)/癸丑(50)。索引+1体系，非己酉/乙卯/己未/丁未。
38. **天乙贵人庚干** — 口诀"甲戊庚牛羊"仅指甲戊，庚从"六辛逢马虎"取寅午。第二套 `getShenshaForDay2` 的 tyMap 中庚映射必须为 `寅午`，非 `丑未`。
39. **页面UI操作必须先理解DOM结构（铁律第五条）** — 涉及页面显示/隐藏、区域切换、档案阅览等 UI 操作时，**禁止在现有函数上打补丁**（标记位绕过、覆盖导航状态等）。bazi_pai.html 的 `viewBaziArchive` 是正确示范：先理解每个 DOM 元素的归属和可见性，再逐项 `style.display` 直接管理。典型案例：档案系统四轮重写（`showPage` + `_viewingArchiveId` 标记 → `_navPopState/_navPush` 覆盖导航 → `formValues/birthDateLabel` 膨胀 → 最终删除全部补丁对齐 bazi_pai）。
40. **`fistload()` 覆盖 `Lunar.lun`** — `fistload()` 循环 1-12 月调用 `Lunar.calc2()`，循环结束后 `Lunar.lun` 保留 12 月数据。必须在循环后调用 `Lunar.calc2(By, curM, 1)` 恢复当前月份，否则 `showMessD()` 鼠标悬浮气泡读到错误月份数据（2026-06-11 修复）。
41. **暗色模式 CSS 必须加 `body.dark` 前缀** — `.cal-th`、`#Cal3 .cal-cell .solar-num` 的暗色值（`background: #2a1f14` 等）必须写在 `body.dark` 作用域内。裸选择器会导致暗色样式在亮色模式下也生效（2026-06-11 修复）。
42. **`clamp()` 公式系数必须精确校验** — `:root` 响应式字号注释中声称的断点值必须与公式计算结果一致。修改系数后必须在 375px/768px/1440px 三个断点验算（2026-06-11 修复，系数 `0.0025`→`0.0051`）。
43. **HMAC 校验码长度一致性（致命）** — 所有端的校验码必须为 **8 个 hex 字符**（HMAC-SHA256 前 4 字节）。浏览器端 `crypto.subtle.sign()` 返回 ArrayBuffer，`slice(0,4)` 是 4 字节→8 hex 字符；Node/Deno 端 hex 字符串 `slice(0,8)` 也是 8 hex 字符。**混用会导致生成的激活码全部无效**（2026-06-11 修复 worker-deno.js 和 worker-license.js 中 `slice(0,4)`→`slice(0,8)`）。
44. **从格否决路径的早期返回必须补全所有字段（致命）** — `_computeCongGeData` 在印星/强根否决时会跳过五行评分直接返回。返回对象若缺少 `yueZhi`、`yueWx`、`rootDetail`、`result`、`congShen`、`scores`（含 mu~shui 五项）、`luckyEl/unluckyEl` 等字段，`determineCongGe` 渲染时会显示 `undefined`。**必须逐字段核对**（2026-06-16 修复丙午甲午辛酉戊戌 BUG）。
45. **IIFE 在字符串拼接中必须 try-catch** — `ob.bzinfo = '...' + (function(){...})() + '...'` 中 IIFE 的任何未捕获异常都会导致整个 `ob.bzinfo = undefined`，排盘页完全空白。降级路径至少返回基础四柱信息（2026-06-16 修复）。
46. **古籍引用必须先验证再标注（文献诚信）** — 《万物大全》在五个权威平台均无著录，定性为虚假引用（已全部删除）。Bz.rzd 中 10 处标注为《三命通会》的引文实际出自《滴天髓·十天干论》（已修正）。所有新增古籍引用必须标注：书名、卷次、可核验版本（ISBN/馆藏号）。修改前必读 `Bz解读文字_文献审查与改进规划.md`。
47. **训练知识不可替代原文检索** — 本轮校勘中，关于"《三命通会》不包含命宫星名"和"纳音短描述非原文"的记忆均被 WebSearch 找到的实际原文推翻。任何基于训练数据的文本断言必须标注置信度，并尽可能通过 WebSearch 交叉验证。
48. **十二长生权重方向验证** — `_csState` 返回的索引 0=长生（非绝）。`_CS_WEIGHT` 数组必须按长生→沐浴→冠带→…→养的顺序排列。方向错误会导致长生权重为 0（2026-06-16 修正）。
49. **格局判定函数不得重复调用有状态的 `_dinggeGetSiLing`** — 该函数内部调用 `Lunar.calc()` 修改全局状态。必须通过 `ob._geName` 缓存保证一致性（2026-06-16 修复）。
50. **午时与未时星名重复** — Bz.csscd 中午时和未时均标注为"太阳星"（民间版本中未时应为"太阴星"），可能是转录错误，待核实原始抄本（2026-06-16 标注）。
51. **三层架构 `_splitBzinfoToCards` 必须同时检测 bt-card 和 data-card-id** — 只查 `data-card-id=` 会遗漏 5 张 bt-card（细盘/十年大运/大运流年/流月/命宫），导致页面缺失整个大运互动区 + ChangeLn 联动静默失效（2026-06-20 修复）。
52. **卡片合成 ID 必须注入 HTML outer div** — `_splitBzinfoToCards` 为 bt-card 合成的 ID（`bt_dayun`/`bt_liunian`/`bt_liuyue`/`bt_minggong`）仅在 cards[] 元数据中，不在 body HTML 里。须 `<div id="...">` 注入，否则 `document.getElementById` 始终返回 null，`selectLiunianYear` 联动失效（2026-06-20 修复）。注入时只检查第一个 `<div>` 标签（外层），避免被子元素 `id=` 误导。
53. **卡片 ID 命名空间必须统一** — 服务端 `_splitBzinfoToCards` 和客户端 `ChangeLn._upsertCard` 使用相同的 ID（`baziLiunian`/`baziLiuyue`/`baziMinggong`），由 `BT_ID_MAP` 映射表保证一致性。禁止引入第二个命名空间或双 ID 回退（2026-06-20 修复）。
54. **`State.emit('bazi:result')` 必须在 `renderResult` 之前调用** — `ChangeLn` 和 `selectLiunianYear` 在 onclick 时从 `State.getCache('bazi:result')` 读取 `ob.dayun.dyn`。若 emit 在 renderResult 之后或未执行，联动静默失效。
55. **事件监听器累积 — 复用 DOM 元素时 `addEventListener` 重复调用**。典型案例：① `renderResult` 每次在 `resultEl` 上追加 click 监听器，2 个 = toggle 两次 = 净零效果（2026-06-25 修复 `_cardClickHandler` + `removeEventListener`）；② `bindFormEvents` 中 `.bazi-sex-btn`/`.bazi-cal-tab`/`#Cml_y` 监听器无 `_bound` 守卫，`show()` 每次调用都追加（2026-06-25 修复）。**修复模式**：具名函数引用 + remove 后 add，或 `el._bound = true` 守卫。
56. **CSS 变量未定义 + 无回退值 = 整条声明失效**。`var(--undefined)` 无 fallback 时 CSS 声明被丢弃。曾导致：`--transition` 未定义 → 按钮/输入框过渡动画静默失效；`--radius-pill` 未定义 → 徽章变方角；`--color-good`/`--color-bad` 未定义 → 徽章无色。**`var(--x, fallback)` 有回退值的则安全**。全项目 2026-06-25 审计后已补全 5 个缺失定义。
57. **z-index 变量必须定义在 variables.css** — `--z-nav`、`--z-footer`、`--z-tooltip` 长期未定义，导致导航栏和页脚 `z-index` 回退为 `auto`，被所有设置 z-index 的元素遮挡。修复：`--z-footer:900`、`--z-tooltip:910`、`--z-nav:950`（2026-06-25 修复）。
58. **档案保存必须包含管道渲染全量数据** — `doSave()`→`saveCurrent()` 只保存基础字段，缺 `cards`/`pipeline`/`mdPattern`/`mdXiyong`/`mdVerify`/`mdTrace`/`mdDayMaster`/`wuxingPct`/`wuxingLevels`/`wuxingDetails` 共 10 个字段。调出档案时 `renderResult` 收到 `cards=null` → 退化到 `bzinfo` 降级路径（无章节结构、无 MD 分析卡片）。修复：保存（`doSave` + `saveCurrent`）+ 调出（`viewArchive`）两端同步补全（2026-06-25 修复）。
59. **更换配置后必须重启 server 进程** — 修改 HMAC 密钥、端口、环境变量等任何 `server/` 端配置后，旧进程的 `require` 缓存仍持有旧值。客户端用新密钥签名 → 服务端用旧密钥验签 → 全部 API 返回 401「签名无效」→ 所有功能静默失效。（2026-06-26 实际发生，影响全部 API 端点，修复：`taskkill //F //IM node.exe` 后重启）

## 构建与部署

> ⚠️ **更换配置后必须重启**：修改 HMAC 密钥、端口号、环境变量等任何服务端配置后，必须 `taskkill //F //IM node.exe` 杀掉旧进程再重启。`require` 缓存会使旧配置在内存中持续生效。（2026-06-26 故障教训）

### 本地测试
```bash
# 必须通过 HTTP 加载（ES 模块 + importmap 必需）
npx serve h:\Phone

# 纯语法检查（提取各常规 script 块，跳过 importmap JSON 和 type=module）
cd h:/Phone && node -e "
var fs=require('fs');
var html=fs.readFileSync('index.html','utf8');
var re=/<script(?![^>]*type=\"module\")[^>]*>([\\s\\S]*?)<\\/script>/gi;
var m, ok=true;
while((m=re.exec(html))!==null){
  var code=m[1].trim();
  if(!code || code.startsWith('{')) continue;
  try { new Function(code); }
  catch(e) { console.log('Syntax FAIL: '+e.message); ok=false; }
}
console.log(ok?'All scripts OK':'Some scripts failed');
"
```

### 发布构建（Web + Android 资源同步）

使用 `build-release.js` 一键完成：剥离注释、压缩空白、输出到 `build/` 和 Android assets。

```bash
node h:/Phone/build-release.js
```

产物：
| 产物 | 路径 | 说明 |
|------|------|------|
| Web Release | `build/index.release.html` | ~463KB，剥离注释压缩后 |
| Android 同步 | `WannianliAndroid/app/src/main/assets/www/index.html` | APK 打包用 |

### Android APK 构建

**项目结构**：`h:\Phone\WannianliAndroid\`

```bash
# 环境变量
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export ANDROID_HOME="C:/Users/Administrator/AppData/Local/Android/Sdk"

# 构建 Release APK（使用缓存的 Gradle 8.5）
"C:/Users/Administrator/.gradle/wrapper/dists/gradle-8.5-bin/5hry6tgzq0wontdz18qo6fdj9/gradle-8.5/bin/gradle" \
  -p h:/Phone/WannianliAndroid assembleRelease
```

### APK 签名

```powershell
# 第1步：生成密钥库（仅一次）
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
& "$env:JAVA_HOME\bin\keytool" -genkeypair -v -keystore h:\Phone\WannianliAndroid\release.jks -alias wannianli -keyalg RSA -keysize 2048 -validity 36500

# 第2步：签名APK
$env:ANDROID_SDK = "C:\Users\Administrator\AppData\Local\Android\Sdk"
& "$env:ANDROID_SDK\build-tools\34.0.0\apksigner" sign --ks h:\Phone\WannianliAndroid\release.jks --out h:\Phone\WannianliAndroid\app\build\outputs\apk\release\app-release.apk h:\Phone\WannianliAndroid\app\build\outputs\apk\release\app-release-unsigned.apk

# 第3步：验证签名
& "$env:ANDROID_SDK\build-tools\34.0.0\apksigner" verify --verbose h:\Phone\WannianliAndroid\app\build\outputs\apk\release\app-release.apk
```

APK 输出路径：
| 文件 | 路径 | 大小 |
|------|------|------|
| 未签名 Release | `app/build/outputs/apk/release/app-release-unsigned.apk` | ~3.1MB |
| 已签名 Release | `app/build/outputs/apk/release/app-release.apk` | ~3.1MB |
| Debug | `app/build/outputs/apk/debug/app-debug.apk` | ~4.0MB |

## Android 项目

### 关键文件

| 文件 | 说明 |
|------|------|
| `MainActivity.java` | WebView 主 Activity，注册 `LicenseBridge` JS 接口 |
| `LicenseBridge.java` | `@JavascriptInterface` 暴露 `getDeviceInfo()` 获取硬件信息 |
| `generate_icons.py` | 12时辰动态图标生成脚本（PIL） |
| `IconUpdateWorker.java` | WorkManager 后台任务，在时辰交界时刻切换图标 |

### 冷启动闪退修复（2026-06-11）

**根因**：`onCreate()` 中 WebView 引擎初始化 + `updateAppIcon()` + `requestLocationPermission()` 在冷启动时同步执行，总耗时超过 ANR 阈值（5秒）。

**修复**：
- `AndroidManifest.xml`：添加 `android:launchMode="singleTask"`、`android:hardwareAccelerated="true"`、扩展 `configChanges`
- `MainActivity.java`：`updateAppIcon()` 移入 `onPageFinished` 回调 + try-catch 包裹（失败不影响主功能）
- `MainActivity.java`：`requestLocationPermission()` 移入 `onResume()` + 500ms 延迟（不阻塞启动流程）

### LicenseBridge

```java
@JavascriptInterface
public String getDeviceInfo() {
    // 返回 JSON: { androidId, model, manufacturer, hardware, board, brand, device, product, sdkVersion, installSeed }
}
```

`installSeed` 存储在 SharedPreferences，首次安装时生成随机 UUID，用于机器码计算。

### WebView 适配要点
- 移除 `type="module"` 或改为内联脚本（WebView 可能不完全支持 ES 模块）
- `<meta name="viewport">` 必须保留，确保移动端缩放正确
- 添加 `<meta name="x5-fullscreen" content="true">`（腾讯 X5 内核全屏）
- `lunisolar` 等外部依赖需内联或打包进 HTML
- 测试目标 API Level 24+（Android 7.0+）

### 构建命令（bash）

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export ANDROID_HOME="C:/Users/Administrator/AppData/Local/Android/Sdk"

# 同步 HTML 到 Android 资源（或直接运行 build-release.js）
cp h:/Phone/build/index.release.html h:/Phone/WannianliAndroid/app/src/main/assets/www/index.html

# 构建 Release APK
"C:/Users/Administrator/.gradle/wrapper/dists/gradle-8.5-bin/5hry6tgzq0wontdz18qo6fdj9/gradle-8.5/bin/gradle" \
  -p h:/Phone/WannianliAndroid assembleRelease
```

## 依赖项

- **lunisolar** (v2.6.0)：核心农历/节气计算库，通过 CDN importmap 加载
- **@lunisolar/plugin-thegods** (^0.1.4)：神煞插件，提供宜忌数据
- **Tabler Icons 3.44.0**：图标库（内联 CSS，仅 49 个实际使用的图标，定义在样式表头部）
- **和风天气 QWeather**：天气预报数据源，GeoAPI 城市搜索 + 实时天气 + 15天预报

## 软件授权系统

### 完整链路总览

```
┌─ 1. 密钥生成 ─────────────────────────────────────────────┐
│                                                            │
│  RSA-2048 密钥对 (PKCS#8/SPKI)                              │
│  ├─ 私钥 → PBKDF2-SHA512(密码) + AES-256-GCM → encrypted-key.json  │
│  └─ 公钥 → 嵌入 index.html  LICENSE_PUBLIC_KEY_PEM           │
│                                                            │
│  HMAC-SHA256 密钥 (128-bit = 32 hex)                        │
│  ├─ 完整: 381cb51f0923fc771bf7e81547c485f7                   │
│  ├─ index.html: 分片为 _LIC_HMAC_K1 + _LIC_HMAC_K2          │
│  ├─ keygen.html: HMAC_KEY 变量                              │
│  ├─ server-keygen.js: HMAC_SECRET 环境变量                   │
│  └─ worker-*.js: HMAC_SECRET 环境变量                        │
└────────────────────────────────────────────────────────────┘
                              ↓
┌─ 2. 机器码生成 ───────────────────────────────────────────┐
│                                                            │
│  Android (优先):                                            │
│  LicenseBridge.getDeviceInfo() → { androidId, model,        │
│    manufacturer, hardware, board, brand, device,            │
│    product, sdkVersion, installSeed }                       │
│                                                            │
│  Web (回退):                                                │
│  screen.width/height + devicePixelRatio + platform          │
│  + language + timezone + Canvas 指纹 + installSeed          │
│                                                            │
│  ↓ license_simpleHash(DJB2+反向混合)                        │
│  ↓ 取前 48 bit → 12 字符 hex → XXXX-XXXX-XXXX 格式          │
│  ↓ 缓存至 localStorage._license_mid                         │
└────────────────────────────────────────────────────────────┘
                              ↓
┌─ 3. 激活码生成（作者端）───────────────────────────────────┐
│                                                            │
│  HMAC 短码（主推）:                                         │
│  message = 机器码(去横线) + tier + expireDate               │
│     例: A1B2C3D4E5F6Y20270630                              │
│  sig = HMAC-SHA256(message, 128-bit key)                    │
│  checkCode = sig[0:4].hex → "A3F7"                         │
│  激活码: BZ-Y-20270630-A3F7                                 │
│    ↑   ↑    ↑       ↑                                      │
│   前缀 等级 到期日  4字符校验码                               │
│   终身卡到期日: 00000000                                     │
│                                                            │
│  RSA 长码（旧版兼容）:                                       │
│  payload = machineId|lifetime|timestamp                     │
│  sig = RSA-SHA256(payload, 私钥) → Base64                   │
│  激活码 = payload|sig  (~400字符，5字符分组横线分隔)          │
└────────────────────────────────────────────────────────────┘
                              ↓
┌─ 4. 客户端验签 ───────────────────────────────────────────┐
│                                                            │
│  license_parseActivationCode(code)                          │
│  ├─ 正则: /^BZ-([QYU])-(\d{8})-([A-F0-9]{8})$/            │
│  ├─ 也支持无横线格式: /^BZ([QYU])(\d{8})([A-F0-9]{8})$/    │
│  └─ 旧格式: 含 | 且长度>80 → legacy                         │
│                                                            │
│  license_verify(code, machineId)                            │
│  ├─ format=short → _license_verifyShortCode()               │
│  │   ├─ 重组 message = rawMid + tier + expireDate           │
│  │   ├─ 拼接 _LIC_HMAC_K1+K2 → 导入 HMAC key               │
│  │   ├─ HMAC-SHA256(message) → 取前 4 字节 hex              │
│  │   └─ 比对 checkCode                                     │
│  └─ format=legacy → RSA-2048 验签                           │
│      ├─ 解析 payload|sig                                   │
│      ├─ 比对机器码                                          │
│      └─ crypto.subtle.verify(RSASSA-PKCS1-v1_5, pubKey)    │
│                                                            │
│  license_doActivate(code)                                   │
│  └─ 验签成功 → license_saveLicenseData({tier, expireDate})  │
│               → 更新 UI → 隐藏横幅                          │
└────────────────────────────────────────────────────────────┘
                              ↓
┌─ 5. 状态判定 ─────────────────────────────────────────────┐
│                                                            │
│  license_getStatus()                                        │
│  ├─ 有 lic 且 tier='U'        → 'activated' (终身)          │
│  ├─ 有 lic 且未过期           → 'activated'                 │
│  ├─ 有 lic 但已过期           → 清除 lic → 继续             │
│  ├─ 试用未过期                → 'trial'                     │
│  └─ 试用已过期                → 'expired'                   │
│                                                            │
│  license_getCurrentTier()                                    │
│  ├─ status=activated → lic.tier                             │
│  ├─ status=trial     → 'trial'                              │
│  └─ status=expired   → 'free'                               │
└────────────────────────────────────────────────────────────┘
                              ↓
┌─ 6. 功能门控 ─────────────────────────────────────────────┐
│                                                            │
│  license_hasFeature(key) → 查 LICENSE_TIERS[tier].features   │
│  license_getLimit(key)   → 查 LICENSE_TIERS[tier].limits    │
│                                                            │
│  门控包装器（在函数定义后、license_init() 前调用）:           │
│  license_wrapChangeMonth()  → 限制月份切换范围               │
│  license_wrapShowPage()     → 拦截八字页面 (showPage(1))    │
│  license_wrapShowNianli()   → 拦截年历功能                   │
│  license_wrapNoteEditor()   → 限制记事条数 (free:1条)        │
│  license_wrapSettings()     → 刷新设置面板授权状态            │
│                                                            │
│  内容模糊锁:                                                │
│  license_wrapBaziContent(html, featureKey) →                 │
│  ├─ 有权限 → 返回原 HTML                                    │
│  └─ 无权限 → 返回 <div class="bz-locked"> + 模糊层 +         │
│              "升级会员解锁完整分析" 覆盖层                    │
└────────────────────────────────────────────────────────────┘
```

### 加密层次

| 层级 | 算法 | 密钥长度 | 存储位置 | 说明 |
|------|------|---------|---------|------|
| 私钥保护 | PBKDF2-SHA512 (600K iter) + AES-256-GCM | 256-bit | keygen.html `ENCRYPTED_KEY_DATA` | 密码仅作者知晓 |
| RSA 长码签名 | RSA-2048 + SHA-256 (PKCS#1 v1.5) | 2048-bit | 公钥嵌入 index.html，私钥加密存储 | 离线验证 |
| HMAC 短码签名 | HMAC-SHA256 | 128-bit | index.html 分片 + keygen/server/worker 完整 | 离线验证 |
| 机器码哈希 | DJB2 变体 + 反向混合 | 48-bit 输出 | 12 字符 hex | 非密码学哈希 |

### 激活码格式对照

| 格式 | 示例 | 长度 | 状态 |
|------|------|------|------|
| **HMAC 短码** | `BZ-Y-20270630-A3F7` | ~19 字符 | **主推** |
| HMAC 短码(无横线) | `BZY20270630A3F7` | 17 字符 | 兼容 |
| RSA 长码 | `A1B2C3D4E5F6\|365\|1716422400\|...` | ~400 字符 | 旧版兼容 |

### 试用机制

- **7天全功能试用**：`license_initTrial()` 首次访问记录 `trialStartTime`
- **累计计时**：`license_updateAccess()` 每次访问累加实际经过时间，防止改系统时钟
- **时钟回拨检测**：`delta < -60000ms` 强制过期
- **过期降级**：试用过期后自动降为免费版（仅 `bazi_basic`）

### 密钥一致性要求

**所有端的 HMAC 密钥必须完全一致。** 涉及文件：
- `index.html`：`_LIC_HMAC_K1` + `_LIC_HMAC_K2`
- `keygen.html`：`HMAC_KEY`
- `server-keygen.js`：`HMAC_SECRET`
- `worker-deno.js`：`HMAC_SECRET`
- `worker-license.js`：`HMAC_SECRET`

密钥已更换为 `381cb51f0923fc771bf7e81547c485f7`（2026-06-26 更换）。

## CSS 变量系统

定义在 `index.html` 的 `:root` 中（light 主题），`body.dark` 中覆写暗色值：
```css
/* 品牌色 */
--color-cinnabar: #C41E0A;       --color-cinnabar-glow: #E8492E;   --color-cinnabar-deep: #8B1508;
--color-gold: #B8944A;           --color-gold-bright: #9A7A3A;     --color-gold-pale: #8B7A5C;
--color-jade: #5D8A7C;           --color-jade-light: #7DB5A5;
/* 语义色 */
--color-danger: #DC2626;         --color-warning: #D98A20;
--color-info: #5A8FA8;           --color-success: #5D8A7C;
/* 背景色 */
--bg-page: #F5EDE0;              --bg-card: #FFFDF7;
--bg-card-raised: #FFF9EF;       --bg-input: #FDF5E6;
/* 文字色 */
--text-primary: #3C2415;         --text-secondary: #6B5540;        --text-muted: #9B8B78;
--text-heading: #2C1810;
/* 边框 */
--border-light: #E5D5C0;         --border-medium: #D4A574;          --border-ink: #E5D5C0;
/* 间距/圆角/阴影 */
--space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px;
--radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px;
--shadow-sm/md/lg;
/* Western-first 中文排版字体栈 */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif;
--font-display: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Noto Serif SC', 'KaiTi', '楷体', 'STKaiti', serif;
--font-mono: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
```
> **注意：** `.bz-highlight-card` 使用 `--bg-card-raised`。

## 代码组织约定

- **命名规范**：函数名驼峰（`nianLiHTML`），常量全大写下划线（`DUTY12_ORDER`），DOM ID 驼峰（`Cal_y`），私有辅助函数 `_` 前缀（`_buildDayCell`、`_highlightFab`）
- **全局对象**：`JD`（儒略日）、`Lunar`（农历数据）、`XL`（行星计算）、`ZB`（坐标转换）、`SZJ`（升降计算）
- **全局状态**：`_barY/_barM/_barD/_barH/_barMin`（当前选中日期时间）、`_nianliMode`（0=月历, 1=年历1, 2=年历2, 3=合并年历）、`_lastBaziOb`（最后一次八字排盘结果缓存）、`WeatherModule._currentLocation`（天气精确定位 `{id, name, lat, lon, adm1, adm2}`，持久化到 `localStorage._weather_location`）
- **数据模块**：`DailyNotes`（每日记事）使用 IIFE 闭包 + localStorage 持久化
- **设置存取**：`saveCalSetting(key, val)` / `loadCalSetting(key, def)` — 日历标签开关持久化（key 自动加 `cal_` 前缀）
- **CSS 类**：`.top-nav`/`.top-nav-inner`/`.top-nav-head`/`.top-nav-tabs`（顶部固定导航栏）、`.tab-item`/`.tab-active`（导航按钮）、`.foot`/`.foot-tab`/`.foot-body`（固定页脚）、`.card`/`.card-header`/`.card-body`/`.card-collapse-icon`（卡片折叠系统）、`.card-accent-gold`/`.card-accent-red`/`.card-raised`（卡片变体）、`.scroll-x-touch`（横向滚动容器）、`.bazi-liunian`（全流年容器）、`.bazi-action-bar`/`.bazi-action-btn`（八字操作按钮栏）、`.bazi-submit-row`（确定按钮行）、`.note-editor-*`（记事编辑器）、`.settings-panel`/`.st-row`/`.st-label`（设置面板）、`.bz-analysis-wrap`/`.bz-section-body`/`.bz-info-row`/`.bz-wuxing-table`/`.bz-pillar-item`（八字分析内部排版）、`.bz-dingge-panel`（八字定格/喜用/从格面板）、`.bz-locked`/`.bz-locked-overlay`（内容模糊锁）、`.trial-banner`/`.trial-banner-icon`/`.trial-banner-text`/`.trial-banner-btn`（试用横幅）、`.license-overlay`/`.license-dialog`/`.license-dialog-header`/`.license-close-btn`/`.license-dialog-body`/`.license-step`/`.license-step-num`/`.license-step-text`/`.license-machine-code`/`.license-textarea`/`.license-error`（激活对话框）、`.btn-copy-code`/`.btn-license-activate`/`.btn-license-settings`/`.btn-license-upgrade`（授权按钮）、`.license-expired-page`/`.license-expired-card`/`.lic-divider`/`.lic-separator`/`.license-status-activated`（过期页及状态）、`.license-pricing-overlay`/`.pricing-grid`/`.pricing-card`（会员定价页）
- **已删除**：`toggleBaziMenu()`/`closeBaziMenuOnOutside()`（八字浮动菜单）、`BaziAnnotations`/`toggleBaziAnnotation()`（八字批注模块）、`DMJx`/`DMJtxt`/`dmjform`/`tabDmj`（地母经全文）
- **编码**：UTF-8，繁体中文数据值使用繁体字面量（勿改简体）

## 命理古籍参考体系（2026-06-16 起执行）

### 古籍分层与权威等级

所有命理分析代码的规则来源必须严格按以下古籍分层，**禁止使用现代网文/公众号/短视频作为算法依据**：

| 层级 | 范畴 | 核心古籍 | 次要参考 |
|------|------|---------|---------|
| **一层** | 格局与用神判定 | 《子平真诠》（专论格局）、《滴天髓》（日主强弱与气势）、《穷通宝鉴》（调候用神） | 《神峰通考》（病药说） |
| **二层** | 基础规则与神煞 | 《渊海子平》、《三命通会》、《五行大义》 | 《星平会海》、《命理正宗》 |
| **三层** | 年命与纳音 | 《李虚中命书》、《五行精纪》 | 《玉照定真经》 |

### 《子平真诠》核心规则 —— 格局与用神

#### 用神的定义（与代码中旧理解的根本区别）

> **《子平真诠》中的"用神"≠格局十神自身。** 用神是**服务于格局的十神**，而非月令定格的那个十神。这是 2026-06-16 修正前代码的根本偏差来源。

**顺用格局**（正官/正财/正印/食神）：
- 用神 ≠ 格局十神（如正官格的用神是财星，不是官星自身）
- 用神 = 扶持格局十神的十神
- 公式：`yongWx = (riWx + 扶持偏移) % 5`，偏移值视格局而定

**逆用格局**（七杀/伤官/偏印）：
- 用神 = 克制格局十神的十神
- 巧合：用神对应的五行恰好不等于格局十神的五行，但十神类型不同（如食神制杀）

#### 十格局用神规则表（含古籍出处）

| 格局 | 顺/逆 | 用神 | 五行公式 | 喜神 | 忌神 | 古籍出处 |
|------|-------|------|---------|------|------|---------|
| **正官格** | 顺用 | 正财（生官） | `(riWx+2)%5` | 正印（护官） | 伤官（克官） | 卷五"论正官"：正官为用，须财以生之，印以护之 |
| **七杀格** | 逆用 | 食神（制杀） | `(riWx+1)%5` | 食神+正印（化杀） | 正财（生杀） | 卷五"论七杀"：七杀为用，食神以制之 |
| **正财格** | 顺用 | 食神（生财） | `(riWx+1)%5` | 正官（护财） | 比劫（夺财） | 卷五"论正财"：正财为用，喜食神以生之 |
| **偏财格** | 顺用 | 同正财格 | 同正财格 | 同正财格 | 同正财格 | 卷五"论偏财" |
| **正印格** | 顺用 | 正官（生印） | `(riWx+3)%5` | 比劫（助身） | 正财（坏印） | 卷五"论正印"：正印为用，喜官星以生之 |
| **偏印格** | 逆用 | 食神/正财 | `(riWx+1)%5, (riWx+2)%5` | 同用神 | 正印（混枭） | 卷五"论偏印" |
| **食神格** | 顺用 | 食神 | `(riWx+1)%5` | 正财（护食） | 偏印（夺食） | 卷五"论食神"：食神为用，喜财以护之 |
| **伤官格** | 逆用 | 正印（制伤） | `(riWx+4)%5` | 正财（化伤） | 正官（伤官见官） | 卷五"论伤官"：伤官为用，印制之、财化之 |
| **建禄格** | — | 正官优先+正财 | `(riWx+3)%5, (riWx+2)%5` | 同用神 | 比劫+印 | 卷五"论建禄月劫"：建禄格，喜财官 |
| **月劫格** | — | 七杀+食神 | `(riWx+3)%5, (riWx+1)%5` | 同用神 | 比劫+印 | 卷五"论建禄月劫" |

#### 五行索引体系（已验证）

```
同我 = riWx         我生 = (riWx+1)%5    我克 = (riWx+2)%5
克我 = (riWx+3)%5   生我 = (riWx+4)%5
五行: 0=木 1=火 2=土 3=金 4=水
```

### _DXY_RULES 修正记录

**修正日期**：2026-06-16
**修正依据**：《子平真诠》卷五原文
**修正范围**：5 个格局的 yongWx 和 xiWx（偏财格自动继承修正后的正财格）

| 格局 | 修正前 yongWx | 修正后 yongWx | 原因 |
|------|-------------|-------------|------|
| 正官格 | `(riWx+3)%5` = 官自身 | `(riWx+2)%5` = 财生官 | 用神是财（生官），非官自身 |
| 正财格 | `(riWx+2)%5` = 财自身 | `(riWx+1)%5` = 食神生财 | 用神是食神（生财），非财自身 |
| 偏财格 | 引用正财格 | 自动修正 | 继承修正后的正财格 |
| 正印格 | `(riWx+4)%5` = 印自身 | `(riWx+3)%5` = 官生印 | 用神是官（生印），非印自身 |
| 建禄格 | `[(riWx+2)%5,(riWx+3)%5]`（财优先） | `[(riWx+3)%5,(riWx+2)%5]`（官优先） | 官制比劫为急，官优先于财 |

**未修改的格局**（原规则已正确）：
- 七杀格：`yongWx=[(riWx+1)%5]`（食神制杀，逆用格局用神恰为克格局之十神）
- 偏印格：`yongWx=[(riWx+1)%5,(riWx+2)%5]`（食神泄+财制，逆用格局）
- 食神格：`yongWx=[(riWx+1)%5]`（食神自身，顺用格局中食神生财，用食神自身正确）
- 伤官格：`yongWx=[(riWx+4)%5,(riWx+2)%5]`（印制+财化，逆用格局）
- 月劫格：`yongWx=[(riWx+3)%5,(riWx+1)%5]`（官杀制+食伤泄）

> **验证**：2026-06-16 运行 `node test-ziping-zhenquan.js "乾造 甲子 丙寅 戊午 壬戌"`，全部 10 格局用神与《子平真诠》标准一致 ✅。

### 修改命理分析代码的强制流程

1. **查古籍原文** — 从上述三层古籍中找到对应规则的确切出处（卷/章/原文）
2. **对比现有代码** — 运行 `node test-ziping-zhenquan.js` 验证当前实现
3. **标注出处** — 修改后的代码注释中必须包含：古籍名+卷名+原文引用
4. **运行验证** — `node test-analysis-validate.js` 确认 10 命例无回归
5. **更新本文件** — 在本节的修正记录中追加变更

**禁止行为**：
- 以现代网文/公众号/短视频的"命理口诀"作为算法依据
- 仅凭个人对命理的理解修改规则（必须引古籍原文）
- 修改 `_DXY_RULES` 的五行公式但不同步更新本文件

### Bz 解读文字引用修复记录

**修复日期**：2026-06-16
**修复范围**：Bz 对象 12 个模块中的引用标注

#### 第一级修复：删除虚假引用（53 处）

| 虚假来源 | 出现次数 | 所在模块 | 处置 |
|---------|---------|---------|------|
| **《万物大全》** | 26 处 | Bz.bzzl（称骨歌） | **全部删除**。经知网/万方/国图OPAC/古籍联合目录/Web 五平台验证，此书不存在于任何已知命理古籍目录中，定性为虚假引用。 |
| **《命理正宗》** | 25 处 | Bz.bzzl（称骨歌） | **全部删除**。明代张楠《神峰通考命理正宗》不载称骨歌，代码中引文风格为现代白话，与张楠原著无关。 |
| **白鹤先生** | 2 处 | Bz.bzzl（称骨歌） | **全部删除**。白鹤先生为明清民间术士托名，非学术可考来源。 |

替换方案：
- 称骨诗歌正文 → 标注 `【出处】《星平会海》（明·水中龙编）所载称骨歌诀`
- 白话解读文字 → 标注 `【补注】后世命理师补注，非古籍原文`

#### 第二级修复：修正错误出处标注（10 处）

| 模块 | 错误 | 修正 | 依据 |
|------|------|------|------|
| Bz.rzd（日主性格） | 10 处标注为《三命通会》 | →《滴天髓·十天干论》 | "甲木参天，脱胎要火"等 10 句均为《滴天髓》十天干论开篇名句，非《三命通会》原文 |

#### 第三级修复：补充缺失出处（4 个模块）

| 模块 | 补充标注 |
|------|---------|
| Bz.shshxx（十神心性） | `【出处】十神定义据《三命通会》卷三` |
| Bz.rzuo（日坐十神） | `【出处】日坐十神体系据《三命通会》卷三日坐篇` |
| Bz.mgbc（命宫补充分科） | `【出处】七星垣职业分科体系据《星平会海》命宫卷` |
| Bz.bzzln（骨重数值表） | `【出处】骨重数值据《星平会海》称骨卷` |

#### 三级标注体系（代码中使用）

| 标注 | 含义 | 使用场景 |
|------|------|---------|
| **【原文】** | 古籍原文，已校勘确认 | ctext.org / 权威点校本可逐字对应 |
| **【意引】** | 据古籍文意概括，非逐字引用 | 现代命理师对古籍的准确转述 |
| **【补注】** | 现代命理分析文字 | 后人添加的解读，不代表古籍原文 |

#### 四级校勘：Bz 解读文字三命通会引文校勘（2026-06-16，含 WebSearch 在线验证）

见 `h:/Phone/Bz解读文字_三命通会引文校勘报告.md`

**关键发现（WebSearch 在线验证）：**
- ✅ 《三命通会·论坐命宫》确实包含十二命宫星名体系（天贵~天寿 12 星）→ Bz.mgd 引用**正确**
- ✅ 《三命通会》纳音篇确有短描述如"乙亥，伏明之火，其气湮郁而不发藉"→ Bz.jzdc 纳音短描述为**原文**
- ❌ Bz.nlsrd 30 条月相引文在《三命通会》中**未找到**→ 确认为虚构
- ❌ Bz.csscd 12 条时辰引文在《三命通会》中**未找到**→ 确认为虚构
- 🟡 Bz.shshxx 十神定义为**意引**，《三命通会》原文更为详细（"我生者有子孙之义故立名食神"等）

**重要教训**：训练知识中关于古籍具体内容的记忆存在偏差，WebSearch 检索到的实际原文为最终判断依据。

### 修改命理分析代码的强制流程（更新）
