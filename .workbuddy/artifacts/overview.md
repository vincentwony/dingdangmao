# 删除神煞/特殊日标签开关 — 完成概览

## 做了什么
按用户要求，删除了设置面板里的 10 个标签开关（无禄日、月倒家杀、年倒家杀、金神七煞、五富日、四离四绝日、天赦日、天德日、月德日、杨公忌日），并把所有对应的神煞/特殊日改为日历格上**常显**状态，不再受开关控制。

## 关键改动
- `web/app.html`
  - 删除 10 个 `.st-row` 标签开关 HTML。
  - 设置面板 `aria-label` 由"日历标签设置"改为"显示设置"。
  - 删除内联脚本中 `getSet` / `saveSet`、对应 `initToggles` 赋值、所有标签 `switch` 分支。
  - 保留：字号大小、暗色模式、授权激活设置。
- `web/js/calendar-ui.js`
  - 删除 `_badgeFlags` / `_loadSet` / `_refreshSettings`。
  - `_renderBadges` 改为无条件显示，直接判断 `dayData.isXxx`。
  - 移除 `settings:changed` 监听器（字号/主题为即时 CSS，无需重载数据）。
- `web/js/settings-ui.js`
  - 清空 `SETTING_KEYS`。
  - 删除 `bindPanelEvents` 中 4 个标签分支。
  - 删除 `initToggleStates` 的循环。
  - 删除 `emitSettingsChanged`。

## 测试结果
- `node --check` 通过 `calendar-ui.js` 与 `settings-ui.js`。
- 本地检查 `app.html`：10 个 `tog*Badge` id 全部消失；字号/暗色/授权设置仍在。
- HMAC 调用 `/api/v1/calendar/month`（2026-7）：返回 31 天，核心 10 个字段 `isTianshe/isTiande/isYuede/isWufu/isWulu/isJinshenqisha/isDaojiaMonth/isDaojiaYear/isSiLiSiJue/isYanggongJi` 全部存在（10/10），说明后端核心计算函数未受影响。
- 服务端 `/app.html` 已更新，不再包含标签开关 id。

## 待用户目检
因环境未装浏览器自动化工具，建议真机或 Chrome DevTools 打开预览页：
1. 点击设置按钮 → 确认只剩"字号大小"、"暗色模式"、授权信息。
2. 查看日历格 → 仍应显示"无/倒/煞/富/离/绝/赦/德/月/忌"等徽章。

## 文件清单
- `H:/Phone/web/app.html`
- `H:/Phone/web/js/calendar-ui.js`
- `H:/Phone/web/js/settings-ui.js`
