# Phase 3.2.2：本命合参扩展（日课年柱 vs 年命）

> 日期：2026-09-08　状态：已完成
> 前置：Phase 3.2（八字三柱 + 本命合参日柱/年命 双维度）、Phase 3.2.1（年命纳入）

## 一、目标
在 Phase 3.2.1 双维度（候选日 日支 vs 本命日柱 / 本命年命）的基础上，新增**第三维度**：
**候选日「日课年柱」年支 vs 本命年命（年支）**，同一套确定性冲/合/三合/刑/害规则，
仅同等级内软排序、不改吉凶定级。

## 二、数据依据（非捏造）
- 候选日 年/月/日 三柱来自 `computeDayFromLunar` 真实节气干支（`_dayBundle` 已返回 `gz.year/month/day`，
  探针确认其年/月柱按节气分界，属真八字日课干支）。
- 用户年命 = 保存命盘 `localStorage:bazi_archives` 的 `pillars.year` 地支。
- 关系规则沿用既有 `_dayUserRelation`：`LIU_CHONG / LIU_HE / SAN_HE / SAN_XING / LIU_HAI`（ZHI_ARR 序号纯数学），
  与 3.2/3.2.1 完全一致。

## 三、改动文件
### 1. `web/js/choose-ui.js`（纯前端）
- `_dayUserRelation(dayZhi, userZhi, ctx)`：ctx 取值扩展 `'日' | '年' | '课年'`，规则不变。
- `_applyBenming(days, userDayZhi, userYearZhi)`：新增 `relYrYear = yearZhi vs userYearZhi (ctx='课年')`，
  与 `relDay(ctx=日)`、`relYear(ctx=年)` 合并标注+软权重（`good +6 / 冲 -8 / 刑害 -4`）；grade 不变。
- `_dayCardHtml`：`ctxTxt` 映射补 `'课年' → '日课年支'`；小标记渲染 `r.ctx`（自动显示「课年」）。
- `_renderResultsHtml`：合参提示补「（含日课年柱冲合）」。
- 下拉编码 `日柱|年命`、手动「或填年命」输入均不变（年命同时驱动 ctx=年 与 ctx=课年 两维度）。

### 2. `server/verify_choose_ui.js`
- 新增断言：六冲 `日课年支 子 冲 年命 午（ctx=课年）`；
  `_applyBenming` 三维度合并（日支冲日元·日 + 日课年支冲年命·课年）、同支不重复标、不改 grade。
- 成功文案更新为「[日柱/年命/课年 三维度]」。
- 现共 22 项（含三维度）全绿。

### 3. `server/check_choose_ui.js`（Playwright 5/5）
- 预置命盘 `年:丙午 日:甲子`；选「甲子|丙午」+ 嫁娶 + 2026-10 → 三柱卡 + 本命标注 + 年命维度标注。
- 注：预设命盘年命=丙午（午），而 2026-10 候选日课年柱均为丙午（午），同支不触发 课年，
  **课年维度由单测确定性覆盖**（e2e 数据无关，故未硬卡 ctx=课年）。

## 四、验证结果（全绿，零回归）
- `npm run test:choose-ui`：22/22（含课年维度断言）。
- `npm run test:choose-e2e`：5/5（Playwright，无控制台/页面 JS 报错）。
- 完整 `npm test` 主流水线：17/17 全绿（override→override-noref→noref2→godsmeta→godsmeta-ui→choose→
  choose-ui→choose-e2e→dst→bazi-dst→yiji→zishi→hongsha→hongsha-ui→guansha→gods→remaining）。
- server 已重启（PID 427）使前端改动生效（纯前端改动本不需重启，但 e2e 需运行中的 server 加载静态页）。

## 五、设计取舍（非 bug，已记）
- **仅纯地支**：与 Phase 3.2 一致，不引入年命纳音五行生克（纳音需真纳音表 + 生克流派规则，易捏造/歧义），
  作为后续可选扩展。候选日「日课年柱」比对对象取「年支」（传统「日课冲本命年」），未做年命纳音。
- 三维度 ctx 标记区分：日（本命日支）/ 年（本命年命）/ 课年（日课年支），避免用户混淆；均仅参考、不硬排除。
- 年命同一值驱动 ctx=年（日支vs年命）与 ctx=课年（年支vs年命）两个独立维度，互不复盖。

## 六、后续可选
1. 永久清空 `.trash_phase4/`（≈55M 已隔离可还原目录，须二次确认）。
2. 引入年命纳音（需接入标准六十甲子纳音表 + 择日纳音生克规则）。
3. 候选日 年柱 vs 用户 月柱/时柱 等更细维度（需求驱动）。
