# Phase 3.1 — 择日助手（选日报告）

> 延续 Phase 2.2：在已定正的真实黄历数据之上，新增「择日助手」——给定**事项 + 月份**，
> 基于当月每日真实宜忌 + 吉神/凶煞评分排序，给出候选吉日与可解释理由。
> **本 Phase 仅做「筛选 / 排序 / 解释」，不新增任何吉凶判定**；所有底层数据均来自已有真实计算。

## 一、定位与边界

- **定位**：帮用户从一个月里挑出"相对更适合做某件事"的日子，并给每条结果附真实依据（宜忌词 / 吉神 / 凶煞 / 建除）。
- **不做**：不发明任何择日流派、不改动 `goodGods`/`badGods` 的吉凶判定、不改动覆盖层与神煞计算结果。
- **数据真实性**：
  - 宜忌 `yiActs`/`jiActs` 来自 `_getLsrActs`（lunisolar theGods 真实输出）。
  - 吉神/凶煞 `goodGods`/`badGods` 来自 `_getLsrGods` 覆盖层（已按《协纪辨方书》修正 14 神煞）。
  - 月破/岁破/四离/四绝/小红砂/杨公忌 等"诸事不宜"硬排除来自 `computeDayFromLunar` 真实字段。
- **评分通则来源**：事项→宜忌/神煞映射为《协纪辨方书·义例》《选择宗镜》《玉匣记》通用择日通则（非本程序独创），作为 `_scoreDay` 的加权依据。

## 二、后端实现（server/routes/calendar.js）

### 2.1 事项规则表 `CHOOSE_EVENTS`（10 类）
键名 = 前端 select value；每类含 `label / core / yi / prefer / avoid / avoidJianchu / ref`：

| key | 事项 | core（核心宜词） | 关键 prefer 吉神 | 关键 avoid 凶煞 | avoidJianchu |
|---|---|---|---|---|---|
| jiahun | 嫁娶（结婚） | 嫁娶 | 天德 月德 天喜 三合 六合 不將 天恩 天願 月恩 | 四廢 四窮 四忌 四擊 無祿 八專 觸水龍 往亡 | 破 收 閉 |
| ruZhai | 移徙入宅（搬家） | 入宅 | 天德 月德 三合 六合 天喜 月恩 天醫 | 月破 歲破 四廢 四窮 往亡 | 破 |
| kaiShi | 开市开业 | 開市 | 天德 月德 天願 六合 三合 五富 月恩 | 月破 歲破 四絕 四離 往亡 大會 | 破 閉 |
| dongTu | 动土修造 | 動土 | 天德 月德 月恩 四相 三合 六合 | 月破 歲破 土府 四廢 四窮 四忌 | 破 建 |
| chuXing | 出行 | 出行 | 天德 月德 三合 六合 聖心 天醫 | 往亡 四離 四絕 月破 | 破 |
| anZang | 安葬 | 安葬 | 天德 月德 天赦 鳴吠 鳴吠對 六合 | 月破 歲破 四絕 四離 重喪 復日 八專 | 破 收 |
| qiFu | 祈福祭祀 | 祈福 | 天德 月德 天恩 天願 六合 三合 | 月破 四絕 四離 | （无） |
| dingMeng | 订盟纳采（订婚） | 訂盟 | 三合 六合 天喜 不將 月德 天德 | 月破 歲破 | 破 收 |
| qiuYi | 求医治病 | 求醫 | 天德 月德 天醫 聖心 六合 | 月破 四絕 | （无） |
| qianYue | 签约交易 | 立券 | 三合 六合 五富 天願 月德 | 月破 歲破 四絕 | 破 閉 |

`CHOOSE_SOURCES` 记录出处（《协纪辨方书·义例》《选择宗镜》《玉匣记》+ 数据真实来源说明）。

### 2.2 单日数据打包 `_dayBundle(y,m,d)`
复用既有真实计算：`computeDayFromLunar` → `_getLsrGods` → `_getLsrActs`，
一次性取出 `lunarD / lunarM / gz / jianChu / yiActs / jiActs / goodGods / badGods / isHongSha / isYanggongJi`。
（与月视图 `_buildDayItem` 的 `slice(0,6)` 不同，此处取**全量**供评分。）

### 2.3 评分模型 `_scoreDay(b, ev)`（最小侵入）
- `matchedYi`：`ev.yi` 中出现在当日 `yiActs` 者。
- `conflictJi`：`ev.yi` 中出现在当日 `jiActs` 者（黄历明示忌此事）。
- `preferHit`：`ev.prefer` 命中 `goodGods`。
- `avoidHit`：`ev.avoid` 命中 `badGods`。
- **通用诸事不宜硬排除** `CHOOSE_UNIVERSAL_BAD = ['月破','歲破','四離','四絕']` + `isHongSha`(小红砂) + `isYanggongJi`(杨公忌) → 直接判 `忌` 并归入 `avoidDays`。
- 建除忌日 `avoidJianchu` 命中 → 减分。
- **计分**：`+12·min(matchedYi,3) −9·avoidHit +5·preferHit −10·(建除忌) −40·(conflictJi)`。
- **定级**：`universal || conflict` → 忌；`score≥24` → 吉；`score≥8` → 平；否则忌。
- `reasons[]` 拼接真实依据（宜：…/吉神：…/凶煞：…/建除：…/诸事不宜：…/黄历明示忌…）。

### 2.4 主函数 `_chooseDays(eventKey, y, m)`
遍历当月 `dn` 天，逐日 `_dayBundle`+`_scoreDay`，按 `gradeRank{吉:0,平:1,忌:2}` 再按 `score` 降序排序。
返回 `{event,label,ref,y,m,total,days,avoidDays,sources}`。
`days` 全量（前端候选区过滤掉忌/诸事不宜），`avoidDays` 含诸事不宜与黄历忌事由。

### 2.5 接口 `POST /api/v1/calendar/choose`
- 入参 `body.event / y / m`；`event` 不在 `CHOOSE_EVENTS` 或 `y(1900–2100)/m(1–12)` 非法 → 400。
- 成功返回 `{ok:true,data,took}`。
- 导出 `_chooseDays / _CHOOSE_EVENTS / _dayBundle / _scoreDay / _CHOOSE_UNIVERSAL_BAD` 供 CI。

## 三、前端实现（web/js/choose-ui.js）

- **挂载**：`calendar-ui.js` 末尾懒加载 `import('./choose-ui.js')` 调 `init()`（独立模块，避免静态循环依赖；失败不影响日历）。`init()` 在 `#calHeaderBar` 注入「择日」按钮，并在 `#cal-detail-inline` 后注入 `#choose-panel`。
- **面板**：事项 select（10 项，key 与后端严格一致）+ 年/月 select（默认当前视图年/月）+ 查询/收起。
- **查询**：`API.post('/calendar/choose', {event,y,m})` → `_renderResultsHtml` 渲染。
- **渲染（纯函数，可测）**：
  - `_dayCardHtml(d)`：日期 + 农历 + 日干支 + 建除 + 等级徽章 + `reasons` + 「查看日课」按钮（带 `data-y/m/d`）。
  - `_renderResultsHtml(data)`：推荐候选区（过滤掉 忌）+ `details` 折叠「本月诸事不宜日」+ 参考出处。
  - 「查看日课」→ 动态 `import('./calendar-ui.js')` 调 `selectDay(y,m,d)` 跳转并定位到该日详情，收起面板。
- **样式**：`calendar.css` 的 `.choose-btn/.choose-panel/.choose-day-card.grade-吉|平|忌`（吉=success 绿 / 平=amber / 忌=cinnabar 红）含 `body.dark` 覆盖。

## 四、验证（全绿，无回归）

| 脚本 | 内容 | 结果 |
|---|---|---|
| `verify_choose.js`（`npm run test:choose`） | `_CHOOSE_EVENTS` 10 项字段齐全、`_dayBundle` 真实数组、`_chooseDays('jiahun',2026,10)` total=31/排序正确/avoidDays 交叉零虚报零遗漏/吉平级理由非空/月破→诸事不宜/不同事项结果不同/非法 key→null | **25/25 ✅** |
| `verify_choose_ui.js`（`npm run test:choose-ui`） | 沙箱执行 `_renderResultsHtml`/`_dayCardHtml`：候选区仅吉平、含干支/跳转属性/理由/出处/查看按钮/空数据兜底 | **12/12 ✅** |
| `verify_choose_live.js` | HMAC 签名 POST `/api/v1/calendar/choose`（重试待服务就绪） | **HTTP 200**：嫁娶·31天·17诸事不宜·榜首 2026-10-23 吉（宜嫁娶；吉神 天喜、三合、不將、月恩）✅ |

**回归**（Phase 3.1 未触碰吉凶判定，确认无副作用）：
- `npm run test:override`：覆盖层 0 偏差 ✅
- `npm run test:override-noref`：圣心/益後/續世 0 偏差 ✅
- `npm run test:noref2`：NEEDS-SOURCE=0 ✅
- `npm run test:godsmeta`：20/20 ✅
- `npm run test:godsmeta-ui`：detail-ui 渲染 ✅

## 五、已知边界 / 后续

- 前端神煞名已用 `probe_godnames.js` 校准为繁体（鳴吠/不將/四相/三合/月德/六合/月破/五富/聖心/天德/天喜/天醫/天願/天赦/四絕/四離 等）。
- 评分权重为择日**通则**的加权近似，非某一流派的精确"成格"判定；若 lunisolar 升级改了某神煞繁体输出名，对应匹配静默失效（CI 可捕获键名命中）。
- **Phase 3.2（未启动）**：八字明细 / 择日报告与八字联动呈现。
- **Phase 4（未启动）**：清理 Back/build、CI 补强并入主流水线。
