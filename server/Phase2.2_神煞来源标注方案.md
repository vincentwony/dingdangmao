# Phase 2.2 — 神煞协纪来源标注（20 个差异神煞）

> 在「今日神煞」卡片为 20 个与《协纪辨方书》存在流派/立成差异的神煞标注协纪出处与差异说明，
> 供 tooltip / 「流派差异」标记展示。**仅展示，不影响吉凶判定、不改 goodGods/badGods。**

## 一、数据流（最小侵入、可回退）
- 后端 `server/routes/calendar.js`：
  - 新增常量 `GODS_SOURCE`（键=lunisolar 实际输出名，已用 `probe_godnames.js` 校准为繁体）。
    每项 `{ xiejì, def, diff, isDiff:true }`，数据全部来自 Phase 2.1 逐条原文锚定（verify_noref2.js + Phase2.1 报告）。
  - 新增 `buildGodsMeta(good, bad)`：仅对当日命中的、有记录的神煞生成 `{ 名: 元数据 }`，不泄漏非来源名。
  - `/calendar/day` 处理器在 `computed.goodGods/badGods` 之后注入 `computed.godsMeta = buildGodsMeta(...)`。
  - 导出 `_buildGodsMeta` / `_GODS_SOURCE` 供 CI 单测。
- 前端 `web/js/detail-ui.js`：
  - `buildSsGroup(title, cls, names, tagCls, meta)` 新增 `meta` 入参；命中来源神煞时渲染
    `title`(原生 tooltip) + `data-tip`(自定义浮层) + `has-source` 类 + `ss-tag-diff` 小标记（⚑）。
  - `renderShensha` 向两组传入 `dat.godsMeta`；`_renderJishenBanner` 为吉神名加 `title`。
- 样式 `web/css/calendar.css`：`.has-source` 光标 help、`.ss-tag-diff` 金色小标记、`.has-source[data-tip]:hover::after` 浮层（原生 title 为兜底）。

## 二、20 个差异神煞（键名=实际输出）
九坎 了戾 地囊 地火 大會 孤辰 孤陽 專日 小會 氣往亡 短星 義日 行狠 陰道沖陽 陰錯 陰陽俱錯 兵吉 臨日 天后 天吏

## 三、验证（CI 全绿）
- `npm run test:godsmeta`（verify_godsmeta.js）：20 项键名精确命中 lunisolar 输出、字段齐全、buildGodsMeta 不泄漏 → 20/20 ✅
- `npm run test:godsmeta-ui`（verify_detail_godsmeta.js）：执行 detail-ui.js 真实 buildSsGroup，确认渲染 title/data-tip/has-source/ss-tag-diff、非来源不泄漏 ✅
- 端到端 `probe_godsmeta_live.js`：HMAC 签名 POST /calendar/day (2026-01-04) → godsMeta 命中 兵吉、天后，含完整 xiejì/def/diff/isDiff ✅
- 回归：verify_override_4 / verify_override_noref / test:noref2 均 EXIT=0（无副作用）

## 四、已知边界
- 仅「今日神煞」卡片展示；月视图网格（只显示建除/节气/角标）不展示来源（与既有设计一致）。
- 若 lunisolar 后续升级改了某神煞的繁体输出名，GODS_SOURCE 对应键将静默失效（CI `test:godsmeta` 的「键名命中真实宇宙」检查会捕获）。
- 如需扩展：把 14 个覆盖层神煞（天德等）的协纪出处也录入 GODS_SOURCE（isDiff:false），即可在 tooltip 展示「已按协纪修正」说明。
