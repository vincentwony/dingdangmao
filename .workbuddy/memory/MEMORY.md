# 项目长期记忆 — 万年历神煞推算

## 权威基准
神煞推算以《协纪辨方书》为权威基准。规则文档 `WannianliAndroid/天德月德天赦推算规则.md` 已按协纪重写统一。

## 修正架构（关键约定）
- lunisolar `plugin-thegods` dist（`server/node_modules`/`node_modules`/`core/node_modules` 三副本 × index.js/mjs/iife.js 共 9 文件）是编译产物。
- 9 副本 patch 的逻辑 bug：天德 `isStem` 反转、月德合 `[3,1,8,5]→[3,1,7,5]`、鳴吠對 `戊辰→丁卯`。
- 不 patch dist 的覆盖方式：`server/routes/calendar.js` 的 `_getLsrGods(y,m,d,computed)` 覆盖层强制覆盖吉神名单（注：`server/core/shensha.js` 不存在，旧记误；覆盖层只此一处）。
  - 规则：天德 ADD-only（lunisolar"天德"是黄道十二神·天德，同名不同神，不可误删）；其余（天德合/月德/月德合/天赦/天恩/天願/月刑/月害/重日/復日/聖心/益後/續世）全量增删。
- 已确认「值错误」bug 清单（lunisolar 安装版 dist）：
  | 神煞 | 修复 | 位置 |
  |---|---|---|
  | 天德 | isStem 反转 | dist 9 副本 |
  | 月德合 | 数组 [3,1,8,5]→[3,1,7,5] | dist 9 副本 |
  | 鳴吠對 | 戊辰→丁卯 | dist 9 副本 |
  | 聖心 | 亥/子月 卯↔酉 互换 → 覆盖层 `SHENGXIN_REF` | routes/calendar.js |
  | 益後 | 酉/戌月 寅↔申 互换 → 覆盖层 `YIHOU_REF` | routes/calendar.js |
  | 續世 | 子丑/午未 两组互换+违「益后+1」 → 覆盖层 `XUSHI_REF` | routes/calendar.js |
- 验证脚本：`verify_gods_audit.js`（含 OVERRIDDEN 白名单=天恩/天願/月害/重日/復日）、`verify_override_4.js`（test:override，0 偏差）、`verify_override_noref.js`（test:override-noref，圣心/益后/续世 0 偏差）、`verify_tianen_tianyuan.js`、`verify_fix.js`。

## 神煞审计结论
- lunisolar 神煞整体与《协纪辨方书》一致，未发现新「值错误」类 bug。已确认与协纪一致、无需改动的 lunisolar 神煞：月德、天赦、月恩、四相、時德、母倉、鳴吠、五富、往亡、月破、六合、三合、生氣、死氣、驛馬、月刑（勿误改）。
- Phase 2.1（2026-09-06）：57 个 NOREF 神煞逐条协纪差分 = 37 ANCHORED（DIFF=0）+ 20 MISMATCH（lunisolar 真实差异，已记录）+ 0 NEEDS-SOURCE；CI `npm run test:noref2`。详情 `server/Phase2.1_锚定报告.md`。
- 三合局索引序（lunisolar `C(...,4,"year"/"month")`）：`[申子辰, 巳酉丑, 寅午戌, 亥卯未]`（亥卯未在 idx3、巳酉丑在 idx1，与直觉相反）。
- **铁律**：一律以安装版 `node_modules` dist 真实运行时数组为准（probe_arrays.js 提取）；旧 `remaining_dump.txt` 与安装版有出入，不可作 bug 判据。从记忆重建协纪参考源极易误判——务必先探针提取 lunisolar 真值 + 协纪原文锚定，再下"bug"结论。

## 红砂 / 大红砂（2026-09-06）
- 小红砂（凶）：协纪 四孟(寅巳申亥)酉 / 四仲(卯午酉子)巳 / 四季(辰未戌丑)丑；月建按节气。`core/shensha.js` 的 `isHongSha2` 本就正确，**勿改**。
- 大红砂（吉）：玉匣记 春戌子/夏辰巳/秋午未/冬申戌，每季两日纯地支；新增 `isDaHongSha2` 注入 `goodGods`。2026 共 62 天。「春戊子」每季一日版未采用。
- 巨坑：`computeDayFromLunar(y,m,d)` 收公历（内部自转农历）；若先取农历再二次传入，月支整体偏移约 2 位。审计脚本务必直接传公历。
- 验证：`verify_hongsha_impl.js`（9/9）、`check_hongsha_ui.js`（Playwright 11/11）。

## 八字排盘 · 夏令时 / 子时（Phase 1.2/1.3，2026-08-10）
- 夏令时（1986–1991 中国）：`server/lib/dst.js` `DST_RANGES`，`applyDST` 对公历减 1h（auto/on/off）。
- 子时流派：程序默认夜子时（23:00 起日柱换次日）；`zao`(早子时) 选项在 `_ziShi==='zao' && _rawH===23` 时日柱前推一日。`routes/bazi.js` 透出 `dstApplied`/`ziShi`。
- 前端 `web/js/bazi-ui.js` 增 Dst_sel/ZiShi_sel。验证 `verify_dst.js`(11/11)、`verify_bazi_dst.js`、`verify_bazi_zishi.js`、`check_zishi_ui.js`。CI `test:dst/test:bazi-dst/test:yiji/test:zishi`。

## 网页展示层（UI）
- 日详情内联渲染：选中某天在 `#cal-detail-inline` 就地展开（非模态）；`detail-ui.js` `show()` 渲染；首屏默认今天。`web/` 由 server 静态服务，改前端刷新即生效。
- 今日神煞卡片：`web/js/detail-ui.js` 渲染 `dat.goodGods`/`dat.badGods` 全部（2026-07-14 起取消白名单过滤，避免漏 圣心/益後/續世 等）。数据来自 `POST /calendar/day`（computeDayFromLunar + `_getLsrGods` 覆盖层，MD 模式，不含年神）。
- 月视图网格（calendar-ui.js）只显示建除/节气/节日/金神七煞角标 + 小红砂「砂」/大红砂「大」（2026-09-06 起）。

## 神煞来源标注 & 择日助手（Phase 2.2 → 3.2.1，2026-09-07~08）
- Phase 2.2：20 个 MISMATCH 神煞在今日神煞卡片标注协纪出处+流派差异（后端 `godsMeta` + 前端 tooltip/⚑），仅展示不改吉凶。CI `test:godsmeta`/`test:godsmeta-ui`。
- Phase 2.2.1（2026-09-08）：14 个覆盖层神煞（天德/天德合/月德/月德合/天赦/天恩/天願/月刑/月害/重日/復日/聖心/益後/續世）补入 `GODS_SOURCE`（`corrected:true`+`note`，schema 由 `isDiff` 二选一扩展），今日神煞卡片以绿勾「已按协纪修正」标记（区别于差异三角）。`buildGodsMeta` 自动纳入。CI `test:godsmeta`(34 项=20 差异+14 修正) / `test:godsmeta-ui` 全绿。设计文档 `server/Phase2.2.1_覆盖神煞来源标注(已按协纪修正)方案.md`。
- Phase 3.1：择日助手——10 类事项 + 基于真实宜忌/吉凶煞评分排序 + 候选吉日可解释理由。后端 `CHOOSE_EVENTS`/`_chooseDays`/`_scoreDay` + `POST /api/v1/calendar/choose`；前端 `web/js/choose-ui.js` 懒加载挂 `#calHeaderBar`「择日」按钮。CI `test:choose`(25/25)/`test:choose-ui`/`test:choose-e2e`。
- Phase 3.2：候选卡补八字三柱（年/月/日 真实节气干支，computeDayFromLunar 年月柱按节气分界）+ 本命合参（读 `localStorage:bazi_archives` 日柱，按六冲/六合/三合/三刑/六害 确定性规则标注；同 grade 内软排序不改定级）。
- Phase 3.2.1：本命合参扩展双维度——候选日 日支 同时比对 用户日柱(日元,'日') 与 年柱(年命,'年')；下拉值编码「日柱|年命」、卡片 ctx=日/年 标记。纯前端，无后端改动。
- Phase 3.2.2：本命合参再扩第三维度——候选日 **年支(日课年柱) vs 年命(年支)**，ctx='课年'；与 ctx=日/年 同一套冲合规则、同软排序权重、不改 grade。纯地支（与 3.2 一致）。CI `test:choose-ui`(22项含课年)/`test:choose-e2e`(5/5)/`npm run test`(17/17 全绿)。设计文档 `server/Phase3.2.2_本命合参扩展(日课年柱)方案.md`。
- Phase 3.2.3：本命合参扩**年命纳音**（2026-09-09）——接入标准六十甲子纳音表(60项,非捏造)，新增 ctx=日纳/年纳 两维度：候选日 日柱纳音/年柱纳音 vs 年命纳音，按 `日课克本命(凶,-10)/日课生本命(吉,+3)/同五行(比和,+2)` 标注，**本命克/生日课(我克/我生)中性不标**；与地支维度同软排序、不改 grade。API 第3参改传年命完整干支(纳音需完整干支)。CI `test:choose-ui`(22项含纳音)/`test:choose-e2e`(6/6)/`npm run test`(17/17 全绿)。设计文档 `server/Phase3.2.3_本命合参扩展(年命纳音)方案.md`。
- Phase 3.2.4：本命合参扩**纳音双参照（年命+日元）**（2026-09-09）——`_applyBenming` 增第四参 `userDayPillar`(本命日柱完整干支)，新增 ctx=日纳元/年纳元 两维度：候选日 日柱纳音/年柱纳音 vs **日元纳音**，与 日纳/年纳(vs年命) 并列 → **七维度**。规则同纳音生克、中性不标、不改 grade。纯前端。CI `test:choose-ui`(26项含双参照)/`test:choose-e2e`(6/6,本命标签=17)/`npm run test`(17/17 全绿)。设计文档 `server/Phase3.2.4_本命合参扩展(纳音双参照_日元).md`。
- 设计文档：`server/Phase2.2_*`、`Phase3.1_*`、`Phase3.2_*`、`Phase3.2.1_*`、`Phase4_*`。

## Phase 4（2026-09-07）：CI 聚合 + 遗留清理
- `npm test` 串联 17 步 fail-fast（override→override-noref→noref2→godsmeta→godsmeta-ui→choose→choose-ui→choose-e2e→dst→bazi-dst→yiji→zishi→hongsha→hongsha-ui→guansha→gods→remaining）+ `test:legacy`（老 bazi/ziwei，不阻塞）。现 17/17 全绿。
- 整跑捕获并修复：① calendar.js:485 宜忌旧名「红砂日」→「小红砂（凶·忌百事）」+ 同步 verify_yi_ji.js；② choose-e2e 偶发 404 噪声 → 对齐 check_hongsha_ui.js 的 Failed-to-load-resource 过滤。
- 关键坑：重启 server 须 netstat/探针校验端口归属进程——`taskkill //PID` 在 Git Bash 偶返回 exit 23 未真杀；改用 `PowerShell Stop-Process -Id <pid> -Force`。
- 遗留清理：确认「全删含 Back/」；Back/(42M)/.build/(1.9M) 不在 git 不可恢复，**未用 rm**，整体移入 `H:/Phone/.trash_phase4/`（≈55M，可还原；build/ 可 git restore）。永久清空隔离区须二次确认。

## 服务 / 调试约定
- 服务：`H:\Phone\server` 用 managed node 22.22.2 启 `index.js`，端口 3000；API 需 HMAC（`server/lib/hmac.js`：sig=hmac.sign(mid,ts,nonce,path)，头 x-machine-id/x-timestamp/x-nonce/x-signature，path 用 req.originalUrl）；未带参返 401。改 `core/`/`server/` 需重启，改 `web/` 仅刷新。
- Playwright 约定：`chromium.launch({channel:'msedge'})` + `newContext({serviceWorkers:'block'})`；日历格 `#Cal3 .cal-cell[data-year][data-month][data-day]`。
