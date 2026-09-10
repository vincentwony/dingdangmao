# P1 实施概览 · 八字从格统一到权威引擎

## 做了什么
按既定计划（数据底座统一 · P0 之后推 P1），把**八字从格**也并入唯一真相层 `server/lib/bazi-unified.js`，并彻底移除路由里上游 `gongxin-core` 的 `determineCongGe` / `_computeCongGeData` / `_computeCongGeDataV2` **双引擎（Engine A/B）口径**。

### 统一口径（与文档 §5 方案二 A/B 7级一致）
- **只有「旺极 / 弱极」两极端档成立从格**；很旺/很弱/比较旺/比较弱/平衡 一律「非从格」（贴合子平"无根方论从"）。
- 旺极 → 专旺 / 从旺（日主本气为全局最旺 → 专旺·曲直/炎上/稼穑/从革/润下；否则从旺·从某行）。
- 弱极 → 从弱（按主导非日主五行定 从财 / 从官杀 / 从儿(食伤) / 从势）。
- **真假**严格依《渊海子平》"若见印绶比肩虽微亦假"：旺极见克泄耗透干/本气根→假从旺；弱极有根(失地)或有天干印比(失势)→假从弱。
- **喜忌**完全复用权威引擎 `favorable/unfavorable`（旺极喜生扶、弱极喜克泄耗），与日主强弱卡、五行力量图、喜用神卡**同源**。

### 代码改动
- `lib/bazi-unified.js`：新增 `getCongGe(ob)`（HTML，沿用 `bz-dingge-*` 样式，带"统一判定"标记）+ `getCongGeData(ob)`（结构化）。
- `routes/bazi.js`：
  - `_geName`/`_geNameV2` 原 Engine A/B 两套合并为 `_uCong = unified.getCongGeData(ob)` 单一源。
  - `congGe`/`congGeV2` 响应字段改用 `_uCong`（双字段同源，消失的 Engine B 差异）。
  - Engine B 的 `bz_congge` 卡：`unified.getCongGe(ob)`（替换 `determineCongGe`）。
  - 日主卡 `congNote` 与 `POST /congge` 端点均改读统一源。
  - 已核实格局卡 `determineBaziPattern` 不读 `ob._congGeData`，移除上游从格调用安全无伤。

## 验证（全绿）
- `verify_congge.js` **24/24**（`npm run test:congge`）：旺极(甲子四柱→从旺格·从水 / 甲子甲子甲子丁卯→假从旺格)、弱极(己巳己巳甲戌己巳→真从弱格·从儿食伤, A/B=1/29.5)、非从格(甲日寅月很旺→isCong=false)。
- `smoke_p1_congge.js` **7/7**：congGe/congGeV2 同源、bz_congge 卡含"统一判定"、日主权威卡与五行同源无回归。
- 回归：`verify_daymaster.js` **9/9**、`verify_guansha.js` **33/33** 零回归。
- 服务已重启（端口 3000 OPEN）。

## "一套标准" 进度
| 模块 | 状态 |
|---|---|
| 日主强弱 | ✅ 权威引擎 |
| 关煞三得法 | ✅ 接权威引擎 |
| 五行力量 | ✅ P0 |
| 喜用神 | ✅ P0 |
| 八字从格 | ✅ **P1 新统一** |
| 格局用神对齐 + 删上游残留 | ⏳ **P2**（格局识别保留月令十神法，用神建议与统一喜用对齐；清理 `_computeAllWuxing`/`determineXiyongshen` 残留调用） |
