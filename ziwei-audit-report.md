# 紫微斗数模块 · 代码 BUG 全面审计报告

> 审计日期：2026-07-18 ｜ 审计范围：紫微斗数全模块生产文件
> 审计方法：源码逐行 + 活接口真实 JSON 字段比对 + 真太阳时单元验证

## 一、审计结论（先行确认）

**运行时字段迁移：完整无遗漏（已用活接口逐一核对）。**
- `brightness` 在 major/minor 星全部带出（20/66 有值，其余空串正确）；
- `ages` / `jiangqian12` / `suiqian12` / `decadal.range` / `meta.*` 字段齐全；
- 前后端 `time-util.js` 镜像**完全一致**（仅 ESM/CommonJS 风格差异）。
- 此前那个「brightness 半截迁移」bug 已彻底修好，未复发。

即：用户最担心的"半截迁移遗漏"在当前运行时**不存在**。

## 二、已修复的 5 处问题

### ① 真实逻辑 BUG — 真太阳时跨日修正符号反了（高危）
文件：`server/lib/true-solar.js`
- 旧逻辑用 `ztyOff = 标准时 - 真太阳时` 再 `> 720 / < -720` 判日，且符号写反：
  - 东经大偏移（如 135°E+1h）标准 23:00 → 真太阳跨次日 00:xx，旧代码**误减一日**；
  - 西部早间（如 73°E-3h）标准 00:30 → 真太阳回前一日，旧代码**误加一日**；
  - 跨年进位也会错。
- 修复：改为「连续秒数 + `dayDelta = floor(total/86400)`」正确拆日，循环处理月/年进位。
- 单元验证通过：WEST- → 2019-12-31 ✓；EAST++ → 2020-1-2 00:36 ✓；YEAREND → 2021-1-1 ✓。

### ② 根因防护 — 星曜序列化三条数组各自内联（半截模式同上次 brightness bug）
文件：`server/routes/ziwei.js`
- 旧：`majorStars`/`minorStars`/`adjectiveStars` 各写一份内联映射，`majorStars` 漏了 `scope` 字段，与 `serializeStar` 不一致——正是上次 brightness 半截 bug 的同源模式。
- 修复：三条数组统一 `.map(serializeStar)`，单一序列化路径，杜绝字段增减再遗漏。
- 活接口复测：adjectiveStars 现补齐 `mutagen/type/scope/brightness`，前端消费字段不变，**无回归**。

### ③ 死代码但选择器错误 — `showDetail`
文件：`web/js/ziwei-ui.js`
- 旧：`document.getElementById('zw-detail')` —— 但 `zw-detail` 是 **class**（每个视图面板各一个），`getElementById` 恒返回 null。
- 修复：改为查 `.zw-view-panel.active .zw-detail`。

### ④ 红线分叉 — 前端又写了一份本地 `_parseClockTime`
文件：`web/js/ziwei-ui.js`
- `time-util.js` 顶部明令「单一真源，禁止分叉」，但 ziwei-ui.js 绕开它另写了一份本地副本（不钳制越界）。
- 修复：删除本地副本，改为 `import { parseClockTime } from './time-util.js'`（语义一致）。

### ⑤ 脆弱耦合加固 — SVG 绘制依赖隐性假设
文件：`web/js/ziwei-ui.js`
- 旧：`palaces[l.from]` / `palaces[selIdx]` 直接用数组下标，隐含「数组位置 === 宫 index」假设（已验证 iztro 当前成立，但属脆弱耦合）。
- 修复：新增 `palaceByIndex(palaces, idx)` 按 index 显式查找，消除隐性依赖。

## 三、已识别但未改（提示项，非 bug）

1. **前后端 `MUTAGEN_MAP` 重复**：年干四化走后端权威值 `meta.yearMutagen`，宫干四化（飞星）走前端表。当前两者一致；建议加交叉注释 + 开发期断言防漂移。
2. **未使用 CSS**：`.zw-info-fiveline` / `.zw-info-extra` / `.zw-placeholder-*` 为冗余样式，非 bug，未删以免误伤。

## 四、验证方式
- 后端 CommonJS 文件 `node --check` 通过；
- 前端 ESM 以 `.mjs` 形态 `node --check` 通过；
- 真太阳时：`applyTrueSolar` 单元用例（正常 / 东 +1 / 西 -1 / 跨年）全部正确；
- 整链路：重启 :3000 服务后重跑活接口字段审计，序列化完整无回归。
