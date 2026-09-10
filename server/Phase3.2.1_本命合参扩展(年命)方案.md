# Phase 3.2.1 — 本命合参扩展：纳入年命（年柱）冲合

> 日期：2026-09-08　状态：已完成
> 前置：Phase 3.2（本命合参仅用日柱/日元）
> 范围：纯前端扩展（无后端改动、无 server 重启）

## 一、动机与定位

Phase 3.2 的本命合参只把「候选日 日支」与用户「日柱（日元）」做冲合刑害比对。
但传统择日「本命」以**年命（出生年干支 / 生肖）**为根本，日柱（日元）为次。
本次扩展为**双维度**：候选日 日支 同时比对 ① 本命日柱（日元）② 本命年柱（年命）。

- 仍属「展示 + 同等级内软排序」，不改吉凶定级（与全局铁律一致）。
- 关系规则完全一致（六冲/六合/三合/三刑/六害，纯地支序号，无捏造）。
- 两维度权重一致（合/三合 +6、冲 −8、刑/害 −4），仅用于同 grade 内重排。

## 二、实现（web/js/choose-ui.js，ES module）

### 1. `_dayUserRelation(dayZhi, userZhi, ctx)`
- 新增第 3 参数 `ctx`（`'日'` / `'年'`，默认 `'日'`），仅用于展示区分。
- 返回的每条关系对象新增 `ctx` 字段：`{type,label,kind,ctx}`。
- 规则逻辑不变（LIU_CHONG / LIU_HE / SAN_HE / SAN_XING / LIU_HAI）。

### 2. `_applyBenming(days, userDayZhi, userYearZhi)`
- 新增第 3 参数 `userYearZhi`（本命年支）。
- 每候选日：`relDay = userDayZhi?_dayUserRelation(日支,userDayZhi,'日'):[]`；`relYear = userYearZhi?_dayUserRelation(日支,userYearZhi,'年'):[]`；`rel = relDay.concat(relYear)`。
- 权重合并两维度；`d.benming = rel`、`d._bw = 权重`。
- 任一维度为空则忽略该维度；双空直接原样返回。
- 排序：先按 grade（吉>平>忌），同级按 `score+_bw` 降序；**grade 不变**。

### 3. `_benmingOptions()` — 下拉值编码「日柱|年命」
- 保存命盘（localStorage `bazi_archives`，`pillars.{year,month,day,hour}`）选项值改为 `day + '|' + year`。
- 标签：`（日柱 X · 年命 Y）`。

### 4. `_panelHtml` — 新增「或填年命」输入
- 第二控制行加 `<input id="chooseYearManual" maxlength="2">`（占位「如 丙午」）。

### 5. `_query` — 解析双维度
- 下拉值 `split('|')` 得 日柱/年命；手动输入 `#chooseBenmingManual` / `#chooseYearManual` 可分别覆盖。
- `r.data.days = _applyBenming(days, userDay, userYear)`；透传 `r.data.benmingDay` / `r.data.benmingYear`。

### 6. `_dayCardHtml` — ctx 标记
- 标签渲染：`<span class="cdc-bm cdc-bm-{kind}" title="…（本命日支/年命 合参）">冲本命<small class="cdc-bm-ctx">日/年</small></span>`。

### 7. `_renderResultsHtml` — 提示含年命
- 提示：`已按本命{日支「X」}{ 与年命「Y」}合参：冲/刑/害仅影响同等级内排序，不改吉凶定级`。

## 三、样式（web/css/calendar.css）
- 新增 `.cdc-bm-ctx`（小上标，字号 0.58rem、opacity 0.7）；`body.dark .cdc-bm-ctx` 覆盖（opacity 0.65）。
- 沿用既有 `.cdc-bm-good/bad` 明暗配色（ctx 继承）。

## 四、验证（全绿，无回归）
- `npm run test:choose-ui`（verify_choose_ui.js）：扩展后断言含 年命 维度——
  - 六冲 ctx=日 / ctx=年 双标注；`_applyBenming` 双维度（日元冲(日)+年命三合(年) 同日均标注、两关系合并非覆盖、不改 grade、双空原样返回）。
- `npm run test:choose-e2e`（check_choose_ui.js，Playwright）：预置命盘 `年:丙午 日:甲子`，
  选新编码值 `甲子|丙午` → 断言 三柱卡 + **ctx=年 标签数>0**（年命午 vs 候选日支子 → 冲本命(年)）+ 无控制台报错。5/5 ✅
- 完整 `npm test` 主流水线 17/17 全绿（无 server 改动，server 仅因隔夜进程退出后重启 PID 1962）。

## 五、设计取舍（已记录，非 bug）
- **比对对象**：年命维度取「候选日 日支 vs 用户年支」。传统择日「日冲本命/日合本命」即日支对本命年支，故不引入候选日 年柱 vs 年命（留作可选扩展）。
- **未引入纳音**：与 Phase 3.2 一致仅用地支关系，未做年命纳音五行冲合（避免凭记忆捏造纳音表）。
- **权重一致**：年命（生肖）与日元同等权重，未对年命加权，保持可解释、无隐藏魔法。

## 六、已知边界
- 年命维度只看地支；若命盘缺 `year` 字段，下拉/手动仅提供日柱维度（向后兼容）。
- 仍仅「展示 + 软排序」，不进吉凶定级；年命冲合同等视为「参考」而非「诸事不宜」硬排除。
- 后端 `_chooseDays` 未改（本命合参为前端纯函数），无需重启 server（本次仅因隔夜进程退出而重启）。
