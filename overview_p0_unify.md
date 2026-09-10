# P0 交付概览 · 五行力量 + 喜用神 统一到权威引擎

## 范围（用户拍板）
- **统一边界**：数据底座统一——五行力量 / 身强身弱 / 喜用 全部唯一源自 `daymaster-strength.js` 权威引擎（文档 §5 方案二 A/B 7 级）。格局识别保留月令十神法（不同维度不强行合并），生克制化/干支关系作公共输入层。
- **优先级**：P0 先灭"两张五行力量比例不同" + 喜用跨卡矛盾；P1 从格；P2 格局用神对齐。

## 改动
1. **新建 `server/lib/bazi-unified.js`**（统一出口，不 patch node_modules）
   - `getWuxing(ob)`：五行力量源自权威引擎 `scores`（替换上游 `_computeAllWuxing` 百分制 `_YL_VALUE`）。
   - `getXiyong(ob)`：喜用神由引擎 `favorable/unfavorable` 推导（旺衰用神法，取四柱天干透干为用神），渲染沿用 `bz-dingge-*` 样式。
2. **`server/routes/bazi.js`**
   - 顶部 `require('../lib/bazi-unified.js')`。
   - 响应 `wuxingScores/Pct/Levels/Details` 改由 `unified.getWuxing` 产出。
   - Engine B `_v2xiyong = unified.getXiyong(ob)`（替换 `determineXiyongshen`）。
   - 独立 `POST /xiyong` 接口改走 `unified.getXiyong`。

## 验证（全绿）
- `smoke_p0_unify.js` **3/3**：`wuxingScores` 与 `dayMasterScores` 同源、pct 合计 ~100、喜用卡带「统一判定 / 旺衰用神法」、日主权威卡 + 关煞无回归。
- `verify_daymaster.js` **9/9**、`verify_guansha.js` **33/33** 零回归。

## 遗留（下一轮）
- **P1**：从格 `getCongGe` 接新引擎（替换 `determineCongGe`）。
- **P2**：格局用神与统一喜用对齐；删除残留上游 `_computeAllWuxing` / `determineXiyongshen` 调用（目前为不影响仍运行的 `determineCongGe`/`determineBaziPattern`，暂保留 L365 调用）。

> 当前"一套标准"覆盖：日主强弱 ✅、关煞三得法 ✅、五行力量 ✅(P0)、喜用神 ✅(P0)。待并入：从格(P1)、格局用神(P2)。
