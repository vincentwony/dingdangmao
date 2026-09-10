# 日主强弱「权威判定」覆盖层 — 完工与验证

## 背景
依据《日主强弱判定方法研究与实现方案.md》§5 方案二（A/B 比值 7 级）+ §6.1（阳干库根区分），
统一本程序所有「日主强弱」判定与渲染口径，消除旧三要素算法与权威结论并存的双结论矛盾。

## 修复的核心 Bug
`routes/bazi.js` 中 bz_rizhu 的权威卡覆盖**写在首次 `_splitBzinfoToCards` 之后**，
但天罗地网、魁罡两块又各自从原始 `bzinfo` 调用 `_splitBzinfoToCards` 重建 `cards`，
把前面的覆盖**冲掉了** → 前端一直显示旧的 `card-raised` 三要素卡。

**修复**：把 bz_rizhu 覆盖移到**所有 `_splitBzinfoToCards` 重建之后（魁罡块后、小儿关煞前）**。
因 `cardsV2` 由 `cards.map` 派生，覆盖对 Engine A（cards）/ Engine B（cardsV2）同时生效。

## 验证结果
- `smoke_daymaster_override.js`（新）：2 样本 × EngineA/B → bz_rizhu 含「权威判定」/dm-card/dm-ab、
  无旧 `card-raised` 残留，**6/6 PASS**
- `verify_daymaster.js`：**9/9 PASS**（6 黄金样本 + 3 关煞口径对齐）
- `verify_guansha.js`：**33/33 PASS**（含身强身弱与权威引擎口径一致）
- 返回字段 `dayMasterStrength` + `dayMasterScores`([木,火,土,金,水]) 已确认存在，喂前端 wx-dist 图

## 改动文件
- `server/routes/bazi.js`：覆盖顺序修正 + 既有 `_buildDayMasterCard` 接入
- `server/lib/daymaster-strength.js`（#73，权威引擎，本次未动）
- `web/js/bazi-ui.js` / `web/css/bazi.css`（#74，wx-dist 改用权威 scores）
- `server/lib/guansha-rules.js`（#75，关煞三得法升级为同一引擎）
- `server/verify_daymaster.js`、`server/smoke_daymaster_override.js`（#76 审计）
- `server/package.json`：`test:daymaster`

## 结论
判定标准以文档 §5 方案二 A/B 7 级为唯一权威；旧三要素算法不再作为页面结论。
服务已重启（managed node 22 起 `index.js`），新逻辑生效。
