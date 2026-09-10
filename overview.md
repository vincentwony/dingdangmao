# 紫微斗数前端迭代概览

## 本次完成：新增「保存排盘」功能

### 需求
紫微斗数排盘增加保存信息功能，方便用户保存生辰输入，下次快速载入查询。

### 方案
采用前端 `localStorage` 持久化（键 `zw_saved_charts`），只保存生辰输入不保存计算结果，载入时重新调用后端排盘 API，保证数据永远最新，同时避免改动无状态 HMAC 后端。

### 功能点
1. 表单卡片新增「保存此排盘」按钮，与「排盘」并排。
2. 保存时弹窗输入名字（默认用姓名字段）。
3. 左栏新增「已保存排盘」卡片：
   - 搜索框：按姓名/备注/城市过滤。
   - 列表：标签、生辰摘要（年月日时分/性别/历法/城市）、保存时间。
   - 每项可「载入」（回填表单并自动重排）或「删除」（确认后移除）。
   - 空列表与搜索无结果都有友好提示。
4. 刷新页面后保存记录仍在。

### 改动文件
- `web/js/ziwei-ui.js`
  - 提取 `_applyFormToInputs(form)` 供恢复与载入复用。
  - 新增保存相关工具函数（`_getSaved`/`_setSaved`/`_delSaved`/`_snapshotForm`/`_saveCurrentChart`/`_loadSaved`/`_renderSavedList`/`_esc`/`_bindSaved`）。
  - `_formBlockHTML` 添加「保存此排盘」按钮。
  - 新增 `_savedBlockHTML()` 并在 `buildShellHTML` 左栏渲染。
  - `show()` 中调用 `_bindSaved()`。
- `web/css/ziwei.css`
  - 新增 `.zw-btn-row`、`.zw-btn-ghost`、`.zw-btn-mini`、`.zw-btn-danger`。
  - 新增 `.zw-saved*` 系列样式（搜索框、条目、标签、元信息、操作按钮、空状态）。

### 验证
- `node --check web/js/ziwei-ui.js` 通过。
- Playwright 全流程无 JS 报错：保存 → 列表出现 → 刷新仍在 → 搜索匹配/不匹配 → 载入回填并重排 → 删除清空。
- 所有断言通过：保存后 1 条，刷新后仍 1 条，载入后姓名回填为「王」且 24 宫重绘，删除后 0 条并显示空状态。

### 截图
- `ziwei_saved_panel.png`：左栏保存排盘面板实际渲染效果。

---

## 本次完成：首页「天地玄黄 · 日月更替」Hero 重设计

### 需求
原首页 hero 区只有一个浮动 webp 图标 + 平铺标题 + 红色圆角 badge，视觉普通、不够高级，需要重新设计。

### 方案
以「日月合璧」为核心意象，呼应「天地玄黄 · 日月更替」主题：
- 用纯 SVG 绘制银白月牙（左）与鎏金太阳（右），替代原来的 webp 图标。
- 加一圈缓慢自转的星轨虚线环 + 8 颗金星，强化「日月更替、乾坤运转」的氛围。
- 标题分主副两行：主标题「天地玄黄」使用鎏金渐变大字；副标题「日月更替」金色字距展开。
- 原平庸的「八卦掌决版」圆角 badge 改成朱砂方印，带落印入场动效。

### 改动文件
- `web/app.html`
  - 重写 `.home-hero` 内部结构：`.home-emblem`（含 SVG 星轨 + SVG 日月）、`.home-title`（主/副标题拆分）、`.home-seal`（朱砂印章）。
- `web/css/layout.css`
  - 删除旧的 `.home-brand-icon` / `.homeFloat` / `.home-badge`。
  - 新增 `.home-emblem`、`.home-orbit`、`.home-sunmoon`、`.home-title-main`、`.home-title-sub`、`.home-seal` 样式与动画关键帧。
  - 增加 `prefers-reduced-motion` 媒体查询，关闭动画以尊重用户偏好。

### 验证
- `node --check` 无需运行 JS 改动（仅 HTML/CSS），页面无 JS 报错。
- Playwright 访问 SPA 入口 `/app.html`：
  - `.home-emblem` 可见，`.home-sunmoon svg` 成功渲染。
  - 标题文本正确：「天地玄黄」「日月更替」；印章文本正确：「八卦掌决」。
  - `homeOrbit` 星轨动画与 `homeBreath` 呼吸动画均已挂载。

### 截图
- `home_hero.png`：重设计后的首页 hero 实际渲染效果。

---

## 本次完成：固定页脚重设计（折叠式 + 高端玻璃面板）

### 需求
原固定页脚默认展开（80px 高、z-index 900），长期压在每页底部遮挡内容，且文字平铺、样式普通，需要重新设计为「高大上」且不再遮挡。

### 方案
1. **默认折叠**：页面加载后只露出底部中央一枚悬浮「印章」手柄，大幅减少对正文内容的遮挡。
2. **点击展开**：展开为高端磨砂玻璃面板，用户再次点击或离开页面后，由 `localStorage.cal_footExpanded` 记住偏好。
3. **内容重排**：
   - 品牌行「命理推断 · 八卦掌决版」使用金色渐变文字；
   - 岁次范围作为副标题，字距展开，视觉层次更高级；
   - 增加装饰分隔：两端金线 + 中央菱形图标；
   - 来源/署名中的「寿星万年历」「lunisolar」及人名使用金色加粗，信息不再拥挤。
4. **暗色模式**：玻璃面板使用深色半透明渐变 + 柔和阴影，金色文字在暗色下仍保持可读。

### 改动文件
- `web/app.html`
  - 重写 `<footer id="pageFoot">` 结构：`.foot-body`（玻璃面板内容） + `.foot-tab`（印章按钮，含太极 SVG）。
  - 默认添加 `.collapsed` 类。
- `web/css/layout.css`
  - 删除旧的 `.foot-line` 平铺样式。
  - 新增 `.foot-tab`（悬浮圆形印章、柔和阴影、hover 浮起、单次入场动效）。
  - 新增 `.foot-body`（backdrop-filter blur + 渐变背景、圆角上边框、展开过渡）。
  - 新增 `.foot-brand-main`（金色渐变文字）、`.foot-divider`（金线 + 菱形）、`.foot-meta`（来源/署名）。
  - 新增 `body.dark` 适配。
- `web/js/app.js`
  - 重写 `initFooter()`：加载时读取 `localStorage.cal_footExpanded`，默认折叠；点击切换并持久化；同步 `aria-expanded`。

### 验证
- `node --check web/js/app.js` 通过；内联脚本解析通过。
- `server/check_footer.js` Playwright 9/9 通过：
  - 默认折叠；印章手柄可见；面板不可见；
  - 点击展开后面板可见、文案正确、`aria-expanded=true`；
  - 展开偏好刷新后仍保持；暗色模式展开无报错；无网络错误。

### 截图
- `server/_footer_shots/light_collapsed.png`：浅色模式默认折叠，只显示底部印章。
- `server/_footer_shots/light_expanded.png`：浅色模式展开，玻璃面板覆盖效果。
- `server/_footer_shots/dark_expanded.png`：暗色模式展开效果。
