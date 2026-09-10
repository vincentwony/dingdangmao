# 紫微斗数「统一」诊断与安全统一方案

> 诊断日期：2026-07-17 ｜ 诊断人：高级开发工程师（Senior Developer）
> 评审对象：`web/app.html` · `web/js/app.js` · `ziwei/index.html` · `ziwei/server.mjs` · `Back/ziwei_unify_20260714/`

## 一、问题本质（先对齐）
"紫微是后来加进来的，模式/风格都不一样，每次改都会破坏原代码" —— 这不是紫微本身的问题，而是两件事同时缺失：

1. 紫微与主应用是**两套完全不同的技术栈**强行放在一个壳里：主应用是手写 vanilla JS + tab 切换；紫微是独立 React SPA（Vite 打包，hash 文件名 `main-edba3d82.js`）。
2. 之前"统一"的改法，把紫微的逻辑/样式**写进了主应用共享的、启动即加载的关键文件**（`web/app.html`、`web/js/app.js`、`layout.css`），而这些文件日历/八字/年历/记事全都依赖。**没有回归测试网关**，出错只能靠人工点检 —— 这就是"每次都破坏原代码"的根因。

## 二、架构事实
- 紫微 = `H:/Phone/ziwei/` 下独立 SPA，`server.mjs` 在 3004 端口独立服务；主应用用 `#ziwei-root` 全屏 `<iframe>` 嵌入。
- 集成胶水 `showZiweiPage`/`closeZiweiPage`/iframe 超时/ESC/`message` 监听 约 75 行**活在 `app.js`（启动入口）里**。
- 视觉桥接：`ziwei/index.html` 里已有一段 `:root { --color-brand: var(--color-gold) … }` 的 token 重映射（方向正确），但**主题切换不会传到 iframe**（紫微只在加载时读 `localStorage`）。
- 现存唯一诊断页 `web/diag.html` 是**人工打开**的模块加载测试，不是自动回归。
- `Back/ziwei_unify_20260714/` 同时备份了 `app.html`+`app.js`+`main-d2ee087f.css`（紫微自己的 css）—— 证实上次"统一"动了启动关键共享文件 + 试图合并紫微 css。

## 三、为什么每次都坏（按概率排序的假设）
1. **(高)** 改共享壳文件引入语法错误或 CSS 冲突 → `app.js` 一错整站白屏；`layout.css` 一冲突日历/八字跟着歪。**单点失效**。
2. **(高)** 想把 React 打包产物 inline 进主应用 → `.iztro-*` 类名、Ant 变量与主应用 CSS 撞车。
3. **(中)** 主题态未同步到 iframe → 紫微在暗色下显示成亮色，被误判"没统一"，又去动共享文件。
4. **(低)** 紫微胶水重构时无测试 → 抽公共函数时静默改错传给 iframe 的参数。

## 四、更好的统一方式（核心原则：保留硬边界，隔离胶水，只通过干净接缝桥接）
**不要合并两套技术栈。iframe 是隔离的好设计，问题不在它，而在"统一工作写在共享关键文件、且没有测试闸门"。**

### 步骤 A — 把紫微胶水从 app.js 抽出来（最高杠杆）
新建 `web/js/ziwei-shell.js`，把 `showZiweiPage`/`closeZiweiPage`/`_onZiweiEsc`/`message` 监听/iframe 加载超时 全部搬过去。`app.js` 只留：
```js
Router.register('ziwei', () => loadModule('ziwei').then(m => m.show()));
window.showZiweiPage = ...; window.closeZiweiPage = ...;
```
效果：紫微壳出 bug，**再也拖不垮日历/八字启动**。

### 步骤 B — 视觉统一走"token 重映射"，不重写 React
- 清理并固化 `ziwei/index.html` 里那段 `:root` 映射，作为紫微↔主应用 token 的唯一真源。
- **主题同步**：主应用切暗/亮时 `iframe.contentWindow.postMessage({type:'theme',dark})`；紫微 `index.html` 监听并实时 toggle `.dark`。解决"切主题后紫微风格对不上"。

### 步骤 C — 建立反馈回路（根治"每次都坏"的关键）
- **L0（立刻可做，零依赖）**：`npm run test:syntax` = 对全部 `web/js/*.js` 跑 `node --check`。挡住头号杀手——启动文件语法错误。
- **L1（boot 冒烟）**：把 `web/diag.html` 升级为自动 —— 用 JSDOM/无头浏览器加载模块图，断言 `cal-root` 渲染 + 无未捕获异常。
- **L2（回归/E2E）**：Playwright 逐 tab 访问，断言无 console error + 关键 DOM 在场 + 可选截图 diff。这是统一工作的真正护栏。

### 步骤 D — 流程护栏
每次紫微改动：先 `tools/safe-backup` 备份 → 改 → 跑 L0+L1 → 再宣布完成。把"人工点检"变成"自动闸门"。

## 五、建议执行顺序
1. 先建 **L0+L1 安全阀**（低风险、立刻回本，直接回答"别再弄坏"）。
2. 再做 **步骤 A**（抽胶水）—— 改完跑 L0+L1 验证主应用照常启动。
3. 最后做 **步骤 B**（token 固化 + 主题同步）—— 纯增量，不动其它功能。

> 不建议做的：把 React SPA inline 进主应用当成真 tab —— 那正是反复破坏的来源。

## 六、待用户确认
- 想要的"统一"是 **(a) 视觉风格对齐**（token+主题同步，推荐，低风险）还是 **(b) 连"模式"也改**（把紫微变成和八字一样的真 tab，高风险）？
- 是否现在就把 **L0+L1 安全阀** 搭起来跑通？（第一步，防止再坏的关键）

## 七、已落地（L0+L1，2026-07-17 完成）
安全阀已建好并验证可拦住破坏：
- **L0 语法闸门** — `scripts/check-syntax.js`（CommonJS，匹配 repo 风格），npm: `npm run check:syntax`。对 `web/js/*.js` 全量 `node --check`，任一语法错误即非零退出并定位「文件:行号」。已验证：注入 `const x = ;` 能精准报 `SyntaxError: Unexpected token ';' @ 行2`。
- **L1 启动冒烟** — `scripts/smoke-boot.mjs`（ESM，jsdom），npm: `npm run check:smoke`。加载 `web/app.html` DOM + 注入浏览器桩 + 动态 import `app.js` 真实启动，断言：①模块图无未捕获异常 ②启动 IIFE 未致命失败（#cal-root 无"加载失败"文案）③#Cal3 已渲染 ④关键挂载点齐全。已验证：删除 `#cal-root` 能精准报 `缺失关键挂载点: cal-root`。
- **接线**：`package.json` 的 `check` 链已加入 `check:syntax`；新增 `check:smoke`。依赖 `jsdom` 已加入 devDependencies。
- **下一步**：步骤 A（抽紫微胶水到 `ziwei-shell.js`）/ 步骤 B（token 固化 + 主题同步 postMessage）现在可在安全阀保护下安全进行。每一步改完跑 `npm run check:syntax && npm run check:smoke` 即可即时发现是否弄坏原代码。

## 八、步骤 A + B 已落地（2026-07-17 晚）

**步骤 A — 紫微胶水抽离（完成）**
- 新建 `web/js/ziwei-shell.js`（ESM）：原样搬入 showZiweiPage/closeZiweiPage/_onZiweiEsc、ziwei:close 消息监听、window 暴露；closeZiweiPage 经 `registerZiweiShell({showCalendarPage})` 依赖注入。
- `web/js/app.js` 的 ziwei 路由改为 `import('./ziwei-shell.js')` **懒加载** + `.catch` 回退到日历。紫微出 bug 再也拖不垮日历/八字启动。
- 新增 `scripts/smoke-ziwei.mjs`（L1.5，jsdom），并入 `npm run check` 总链（现含 hmac/syntax/css/zh/boot-smoke/ziwei-smoke）。

**步骤 B — 视觉对齐（完成，不重写 React）**
- 修复隐藏 bug：主应用暗色 token 在 `body.dark`、紫微用 `:root.dark`，`var(--color-*)` 在 html 层回退亮色（暗底近黑字看不见）。`ziwei/index.html` 的 `:root.dark` 与 `body.dark input/select/textarea` 改为硬编暗色字面量（对齐主应用 body.dark token）。
- 主题实时同步：主应用 `ziwei-shell.js` 新增 `_syncZiweiTheme()`（写 `pub.ziwei.theme` + `postMessage({type:'theme'})`），showZiweiPage 设 src 前写 key、iframe load 后 post，initZiweiShell 用 MutationObserver 监听 body 主题变化实时同步；紫微 `index.html` 加 message 监听 + 首屏把 `.dark` 同时加到 html 和 body。
- 验证：L0+L1+L1.5 全绿（15 断言）；运行服务实时吐出更新后的两端文件。

**当前状态**：紫微与万年历已是「iframe 隔离 + token 桥接 + 主题同步」的干净统一，改动均受 L0/L1/L1.5 闸门保护。
**剩余（可选）**：步骤 C（L2 Playwright 真浏览器回归，需装 chromium 二进制）。本沙箱无浏览器自动化，紫微 iframe 视觉跟随需真机目检。
