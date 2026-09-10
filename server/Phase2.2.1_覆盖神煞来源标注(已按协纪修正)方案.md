# Phase 2.2.1：14 个覆盖层神煞「已按协纪修正」来源标注

> 日期：2026-09-08　状态：已完成
> 前置：Phase 2.2（20 个差异神煞标注「流派差异」）、Phase 3.1/3.2/3.2.1、Phase 4 已收口

## 一、目标
将程序通过覆盖层（`_getLsrGods`）或 dist 9 副本 patch **强制对齐《协纪辨方书》** 的 14 个神煞，
在「今日神煞」卡片上以 **绿勾「已按协纪修正」** 标记（区别于 Phase 2.2 的「流派差异」三角警告），
提升数据透明度——让用户知道这些神煞的本程序输出已按协纪订正，而非 lunisolar 原始运行版。

## 二、覆盖的 14 个神煞
天德、天德合、月德、月德合、天赦、天恩、天願、月刑、月害、重日、復日、聖心、益後、續世。

（与 MEMORY「修正架构」一致：天德=ADD-only；其余全量增删；其中 天德/月德合/鳴吠對 属 dist patch，
聖心/益後/續世 属覆盖层月支索引错位修正，天恩/天願 属覆盖层流派差异修正。）

## 三、数据模型（GODS_SOURCE 扩展）
原 `GODS_SOURCE` 仅含 20 个 `isDiff:true` 差异神煞。本 Phase 新增 14 项，schema 扩展为二选一：
- 差异神煞：`{ xiejì, def, diff, isDiff:true }`
- 已修正神煞：`{ xiejì, def, corrected:true, note }`（`note` 说明具体修正点，如"覆盖 lunisolar 运行版「天德 isStem 逻辑反转」bug"）

`buildGodsMeta(good, bad)` 原有逻辑「仅返回当日命中的、有记录的神煞」不变，自动纳入新 14 项。

## 四、前端渲染（web/js/detail-ui.js）
- `_metaTip(m)`：新增 `corrected` 分支 → `已按《协纪辨方书》修正：<note>`（替代差异行）。
- `buildSsGroup`：标记逻辑 `isDiff → 三角警告(ss-tag-diff)`；`corrected → 绿勾(ss-tag-corrected, ti-circle-check)` + 加 `is-corrected` 类。
- `renderGodsBanner`（吉神公告栏）：corrected 神煞 tooltip 显示「（已按协纪修正）」而非「（与运行版有流派差异）」，并加 `god-corrected` 类。
- 仅展示，不参与吉凶判定（铁律不变）。

## 五、样式（web/css/calendar.css）
新增 `.ss-tag-corrected`（绿勾，good/bad 两色）、`.is-corrected`（内描边）、`.god-corrected`（公告栏绿虚线下划）；
含 `body.dark` 覆盖（亮绿 `#6fc28c`/`#7fd6a0`）。

## 六、CI 变更
- `verify_godsmeta.js`：字段校验支持 `corrected`（`isDiff===true && diff` 或 `corrected===true && note`）；断言 34 项 = 20 diff + 14 corrected；
  抽样校验「兵吉」isDiff、「天德」corrected。原 `nonSource` 误用「天恩」（现已是来源神煞）→ 改为「月破/天喜」。
- `verify_detail_godsmeta.js`：sampleMeta 增「天德」corrected，断言 `is-corrected` 类、`ss-tag-corrected` 图标、`已按《协纪辨方书》修正：` tooltip。
- 完整 `npm test` 17/17 全绿（零回归）。

## 七、风险与取舍
- `def` 为协纪标准起法（公共神煞常识），`xiejì` 统一标《协纪辨方书》不引具体卷次（与差异神煞的卷次引用区分，避免错引）。
- 月德/月刑/天赦/天德合「运行版本就正确、覆盖层幂等」，仍列入 corrected 以统一透明展示（note 注明"覆盖层确认"），不误导为"修了 bug"。
- 大红砂（玉匣记新增吉神，非 lunisolar 修正）不纳入本集合，避免"已修正"误标。

## 八、验证结论
- `test:godsmeta` 34 项全绿；`test:godsmeta-ui` 渲染校验全绿。
- 端到端扫描 2026：corrected 神煞按日命中（如 2026-1-3 月德合·天德、2026-1-5 天恩·天德·復日）。
- 重启 server（PID 2050，managed node）后 `/calendar/day` 的 `godsMeta` 已含 corrected 项。
