# P2 收口：「只保留一套标准」最终落地

## 目标回顾
按既定范围（数据底座统一）完成最后一块——**格局用神对齐 + 清理上游残留调用**，使八字分析所有判定唯一源自 `lib/daymaster-strength.js` 权威引擎。

## 本次改动（3 处）
1. **格局卡从格预检 → 统一源（消除跨卡双结论）**
   - 根因：上游 `determineBaziPattern` 的「从格前置检查」读 `ob._congGeData || _computeCongGeData(ob)`；主路由此前**从未设置 `ob._congGeData`** → 回退到旧 `_computeCongGeData`，与统一「从格」卡口径冲突。
   - 修复：`routes/bazi.js` 在 `var _uCong = unified.getCongGeData(ob)` 后立即 `ob._congGeData = _uCong`，并移除已弃用的 `ob._congGeData = ob._congGeDataV2` 交换。
   - `getCongGeData` 返回补全 `riHasBenQiRoot/riHasRoot/riHasTianGanHelp` 字段，供格局卡 HTML 正确渲染。
   - **附带修复**：未设 `ob._congGeData` 时旧 `_computeCongGeData` 因 `wxToGan` 未定义会抛 TypeError（上游 bug，原仅特定图表触发）——统一赋值后该路径永不被触及，顺带消除崩溃隐患。

2. **bz_wuxing 卡 → 统一五行力量**
   - 旧卡由上游 `renderBaziTable` 生成，含一个**从未被绘制的 `wuxingRadar` canvas** + 阴阳干计数表，与 wx-dist 图（`dayMasterScores`，已统一）不同源。
   - 新增 `bazi-unified.getWuxingCard(ob)`：五行力量表（加权得分 / 月令旺相休囚死 / 占比%）+ 阴阳干分布（结构性统计，非力量刻度），在 Engine B `cardsV2` 中覆盖 `bz_wuxing`。现与 wx-dist 图 / `dayMasterScores` **完全同源**。

3. **清理 gongxin-core 死代码**
   - 删除 `_computeCongGeData` / `_computeCongGeDataV2` / `_computeAllWuxing` 三个 require；删除 `var wxCalc = _computeAllWuxing(ob); ob._wuxingBreakdown = wxCalc;`（全仓确认无其他消费者）。
   - 保留 `computeTianLuoDiWang` 与 `_DG_GAN/_DG_BENQI`（格局名月令十神法仍用）。

## 验证（全绿）
| 套件 | 结果 |
|---|---|
| `verify_p2.js`（15 断言） | ✅ 15/15 |
| `smoke_p2_unify.js`（14 断言） | ✅ 14/14 |
| `verify_daymaster.js` | ✅ 9/9 |
| `verify_guansha.js` | ✅ 33/33 |
| `verify_congge.js` | ✅ 24/24 |

服务已用 P2 重启（PID 6260，端口 3000 OPEN）。

## 「一套标准」最终状态
| 模块 | 状态 |
|---|---|
| 日主强弱 | ✅ 权威引擎（覆盖层） |
| 关煞三得法 | ✅ 接权威引擎 |
| 五行力量 | ✅ `getWuxing` |
| 喜用神 | ✅ `getXiyong` |
| 八字从格 | ✅ `getCongGe` |
| 格局识别 | ✅ 月令十神法（不同维度保留）；其从格预检已与统一从格卡同源 |

> 说明：格局的「相神/忌神」分析（月令十神维度）仍由上游 `determineBaziPattern` 走月令十神逻辑——这是与日主喜用**正交的不同维度**，按约定不强行合并。所有「日主强弱/五行/喜用/从格/关煞」口径现已唯一。

## 交付文件
- `server/lib/bazi-unified.js`（统一出口：getWuxing / getXiyong / getCongGe / getCongGeData / getWuxingCard）
- `server/routes/bazi.js`（接入 + 死代码清理）
- `server/verify_p2.js`、`server/smoke_p2_unify.js`（P2 验证）
- `server/package.json`（`test:p2` 脚本）
