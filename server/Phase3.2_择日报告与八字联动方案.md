# Phase 3.2 — 择日报告与八字联动（本命合参）

> 延续 Phase 3.1：在择日候选卡上补全**候选日完整八字三柱**（年/月/日，来自已验证的 `computeDayFromLunar` 真实节气干支），
> 并新增**「本命合参」联动**——读取用户保存的命盘（localStorage `bazi_archives`）日柱，按确定性干支规则
> （六冲 / 六合 / 三合 / 三刑 / 六害）标注每日与命主日元的冲合关系。
> **仅展示 + 同等级内软性排序权重，不改 Phase 3.1 的吉凶定级铁律。**

## 一、八字三柱展示（数据真实性已验证）

- 候选日卡原仅显示 `gz.day`（日柱）。现扩展为完整三柱 **「年 月 日 干支」**，由 `_dayBundle` 已返回的 `gz.year / gz.month / gz.day` 直接拼装（`_bazi3col`）。
- **干支真实性核验**：探针确认 `computeDayFromLunar` 的年月柱**按节气分界**（2026-02-03 乙巳 → 02-05 丙午；立夏 05-04 壬辰 → 05-06 癸巳），即其年/月柱为真正的八字年柱/月柱，非农历正月初一切换。故三柱可作真实日课干支展示。
- 示例：2026-10-23 → **丙午年 戊戌月 庚午日**（与后端 `/calendar/choose` 返回一致）。

## 二、本命合参（确定性干支关系）

### 2.1 数据来源
- 用户命盘来自既有"保存排盘"机制（`web/js/archive-ui.js` 的 `localStorage: bazi_archives`），每条记录含 `pillars: {year, month, day, hour}`（四柱 GZ）。取 **日柱**（`pillars.day`）作为本命日元参考。
- 面板提供两种入口：① 下拉选择已保存命盘（自动带出日柱）；② 手动输入日柱（如「甲子」）。`_normZhi` 规整为地支单字（取第 2 字），非法值忽略。

### 2.2 关系规则（纯干支数学，不捏造）
地支序号 `ZHI_ARR = [子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11]`：
- **六冲**（相隔 6 位）：子午 / 丑未 / 寅申 / 卯酉 / 辰戌 / 巳亥 → `kind: bad`
- **六合**：子丑 / 寅亥 / 卯戌 / 辰酉 / 巳申 / 午未 → `kind: good`
- **三合局**：申子辰 / 亥卯未 / 寅午戌 / 巳酉丑 → `kind: good`
- **三刑**：寅巳申（无恩）/ 丑戌未（恃势）/ 子卯（无礼）→ `kind: bad`
- **六害**：子未 / 丑午 / 寅巳 / 卯辰 / 申亥 / 酉戌 → `kind: bad`

> ⚠️ 实现初版曾把三合数组误写为 `[[2,0,4],[5,3,7],…]`（寅子辰/巳卯未），CI 当场捕获（"申 与 子 同局"失败），修正为 `[[8,0,4],[11,3,7],[2,6,10],[5,9,1]]`。**教训：地支三合数组务必按 ZHI_ARR 序号核对，勿凭记忆。**

### 2.3 标注与排序
- `_dayUserRelation(dayZhi, userZhi)`：返回该候选日与命主日支的关系标签数组（如 `[{type:'冲',label:'冲本命',kind:'bad'}]`）。同日支返回空（不标注伏吟）。
- `_applyBenming(days, userDayZhi)`：为每日标注关系并赋软权重（合/三合 +6、冲 −8、刑/害 −4），**仅在同一 grade 内**按 `score + 权重` 重排——冲本命下沉、合本命上浮，**grade（吉/平/忌）不变**。
- 卡片渲染 `.cdc-bm-good`（绿，利）/ `.cdc-bm-bad`（红，不利）标签；结果 meta 显示「已按本命日支「子」合参…不改吉凶定级」提示。

## 三、前端实现（web/js/choose-ui.js）

- 新增纯函数（导出供测试）：`_dayUserRelation` / `_applyBenming` / `_bazi3col` / `_normZhi` / `ZHI_ARR`，及辅助 `_loadArchives` / `_benmingOptions` / `_esc`。
- `_panelHtml`：第二行控件 `本命合参` 下拉（`_benmingOptions` 读 `bazi_archives`）+ `或填日柱` 手动输入。
- `_query`：读取本命输入 → 拿到 `userDayZhi` → `r.data.days = _applyBenming(r.data.days, userDayZhi)` → 设 `r.data.benmingDay` → 渲染。
- `_dayCardHtml`：干支改为 `_bazi3col(d.gz)`（三柱）；有 `d.benming` 时渲染 `.cdc-benming` 标签区。
- `_renderResultsHtml`：meta 区追加本命合参提示（当 `data.benmingDay` 存在）。
- CSS（`calendar.css`）：`.cdc-gz`（三柱、缩字号）、`.cdc-benming`、`.cdc-bm-good/bad`、`.choose-benming-note`、`.choose-controls-2` 及 `body.dark` 覆盖。

## 四、验证（全绿，无回归）

| 脚本 | 内容 | 结果 |
|---|---|---|
| `verify_choose_ui.js`（`npm run test:choose-ui`） | 三柱渲染 + `_bazi3col` + `_dayUserRelation`（六冲/六合/三合/六害/同日支）+ `_applyBenming` 重排与不改 grade + 边界 | **22/22 ✅**（原 12 + 新 10） |
| `check_choose_ui.js`（`npm run test:choose-e2e`） | Playwright 端到端：择日面板 + 本命合参控件 + 三柱卡 + 冲合标注（预置甲子命盘）+ 查看跳转 + 无控制台报错 | **5/5 ✅** |
| `verify_choose.js`（`npm run test:choose`） | 后端 3.1 逻辑不变 | **25/25 ✅** |
| `verify_choose_live.js` | 端到端 HTTP 200（嫁娶·31天·17诸事不宜·榜首 2026-10-23 吉） | **✅** |

**回归**：`test:override`(0偏差) / `test:override-noref`(0偏差) / `test:noref2`(NEEDS-SOURCE=0) / `test:godsmeta`(20/20) / `test:godsmeta-ui` ✅ 全部 EXIT=0。

## 五、已知边界 / 后续

- 本命合参以**日柱（日元）**为基准，未纳入年柱（生肖/年命）冲合——如需可扩展 `pillars.year` 同比标注（仅展示）。
- 时柱未参与（择日按日，无具体时辰）；三柱即"日课"，非完整四柱。
- 未启动：**Phase 4**（清理 Back/build、CI 补强并入主流水线）。
