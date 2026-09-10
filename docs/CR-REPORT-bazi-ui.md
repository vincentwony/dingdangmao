# Code Review 报告 — 八字排盘分析页 显示层 + 全链路

> 评审对象：`web/js/bazi-ui.js`（`renderResult` 四板块渲染 / `_renderWxDist` / 提交 payload 时辰换算）
> 评审日期：2026-07-15 ｜ 评审人：资深开发工程师（吴八哥）
> 对照：docs/CR-CHECKLIST.md + docs/CODE-QUALITY.md
> 性质：**实战评审**（走 CR 清单 + 全链路边界验证）
> 关联：本报告的 Bug B-1 是 `docs/CR-REPORT-ziwei.md` 跨模块提示的同一反模式，本次闭环。

## 一、评审范围
- 7/14 审计覆盖了**计算层**（core 引擎 / bazi.js）。本轮评审**显示层 + 全链路**：`renderResult` 是否正确消费引擎字段、有无显示层失真、以及「表单 → API」的时辰透传是否完整。

## 二、CR 清单对照

### 算法与数值（B4–B6）
- ⚠️ **B5 边界覆盖 — 发现确证 bug（见第三节 Bug B-1）**：提交 payload 时辰换算 `|| 12` 孪生 bug，使 7/14 的 backend 午夜修复**在用户路径上被推翻**。
- ✅ B4 交叉验证：修复后全链路实测（见下）`00:30→h=0→时柱壬子(子时)`，`12:30→h=12→戊午(午时)`，与 lunar-javascript 一致。
- ✅ 显示层无失真：`renderResult` 是**后端卡片 HTML 的透传 + 分章归类**（`data.cards`/`cardsV2[].body` 直接注入 chapter），不重算 用神/格局/五行；`data.geName`/`congGe`/`wuxingScores` 等均直取引擎值。7/14 已确认 `_dmGetRelFull`（格局/用神）、五行力量求和=100、神煞/称骨机制正确 → 显示层未引入二阶失真。

### 前端（B7 令牌化）— 观察项（非阻断）
- ⚠️ `_renderWxDist`（五行分布条形图）用内联硬编码色 `colors={木:'#4CAF50',火:'#F44336',土:'#FF9800',金:'#FFC107',水:'#2196F3'}`。五行配色属语义色，但字面上散落 `#xxxxxx`，与红线 10 字面要求有出入（同 `CR-REPORT-calendar.md` 的 B7 观察）。建议抽到 `variables.css` `--wx-mu/--wx-huo/...` 语义令牌。独立清理任务。

### 可维护性（B10–B12）
- ✅ B10 可还原：改前用 `tools/safe-backup` 备份 `web/js/bazi-ui.js`（`Back/safe_20260715_123708/`）。
- ✅ B11 聚焦：仅改时辰换算一处，未顺手改其它。
- ✅ B12 注释：修复处补注释「午夜 00:xx 合法小时，禁用 ||12（与 backend 同款修复）」。

## 三、确证 bug 与修复

### Bug B-1（高）：提交 payload 时辰 `|| 12` 孪生 bug（推翻 7/14 backend 修复）
- 位置：`web/js/bazi-ui.js` 第 556 行 `var h = parseInt(timeStr[0], 10) || 12;`
- 根因：与 `server/routes/bazi.js`（7/14 已修为 `isNaN(parseInt(body.h,10))?12:...`）**同源反模式**。用户在表单选 `00:30` → `parseInt("00")=0` → `0||12=12` → 发 `h=12` 给（已正确的）backend → backend 算 `午时`，**午夜出生在八字页仍错**。
- 影响：7/14 的午夜修复是 backend-only，前端消费者未同步 → 端到端仍错。这是「同源反模式跨文件复活」的典型（红线 9）。
- 修复：
  ```js
  var hRaw = parseInt(timeStr[0], 10), minRaw = parseInt(timeStr[1], 10);
  var h = isNaN(hRaw) ? 12 : hRaw;   // 午夜 00:xx 合法小时：禁用 ||12
  var min = isNaN(minRaw) ? 0 : minRaw;
  ```
- 验证（脚本 `verify/_bazi_midnight_e2e.mjs`）：
  - 前端解析：`"00:30"→h=0` / `"08:30"→h=8` / `""→h=8(默认)` / `"23:30"→h=23` / `"12:00"→h=12` ✅
  - 后端透传：`h=0→时柱 壬子(子时)` / `h=12→时柱 戊午(午时)` ✅
  - **全链路结论：✓ 午夜 h=0 透传后端→子时，修复生效**
- 回归：`node --check` 通过。

> 关联修复：`web/js/app.js`（`showZiweiPage` 紫微参数）同日已修同一反模式（`CR-REPORT-ziwei.md` Bug Z-1）。两处现与 backend 一致，时辰换算「午夜 00:xx」全站正确。

## 四、其它观察
1. **遗留 `|| 12`（非本次范围）**：根 `H:/Phone/index.html`（旧落地页 `/original` 路由）`getHourGZ2(dat.stem, _barH || 12)` 仍有同款写法，但属 legacy 参考页、非 SPA 主路径，不在本次修改范围（如需可单列清理）。
2. **四章节归类**：`_chapterIdx` 按 card id 前缀/清单归章，未命中者进 `unassigned`（页底仍渲染，不丢数据）。显示组织健壮，无数据丢失风险。

## 五、教学要点（对团队）
- **修复要端到端验证，而非「后端过了」**：7/14 修 backend 时用了 API 直测（h=0→壬子），却未走「前端表单 → API」真实路径，导致 `|| 12` 在前端消费者潜伏一个月。印证红线 7/8：历法修复须有**覆盖用户真实入口**的验证（本报告的 e2e 脚本即补此缺口）。
- **`|| 默认值` 是历法/时间字段的高危写法**：凡 `0` 是合法值（午夜、子时 index），必须用 `isNaN(x)?def:x`。本回合三处（`bazi.js`/`app.js`/`bazi-ui.js`）现已统一为同一惯用法，但属「三处各写一遍」——红线 9 仍建议抽 `web/js/time-util.js` 共享 `parseHour`/`toShiChen`，三处引用，修一处即全修。

## 六、结论
- **1 个确证高优 bug（午夜时辰）已修复并端到端验证**；显示层无二阶失真；B7 为建议项（五行令牌化）。
- 可合并。
