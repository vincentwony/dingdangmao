---
name: bazi-cross-verify
description: This skill provides a three-engine cross-validation harness for verifying Chinese almanac (万年历), bazi (八字), and shensha (神煞) calculations before merging any change to calendar or bazi computation logic. It should be used whenever modifying shensha rules, bazi chart computation, ten-god/ten-star logic, timing pillars, or any lunisolar-derived value. Triggers include "verify shensha", "cross-check bazi", "is this lunisolar value correct", "audit calendar calculation", or "did the god/star rule change break anything".
agent_created: true
---

# Bazi / Calendar Cross-Verification Harness

## Purpose

The lunisolar engine that powers this project's shensha and bazi has several **known value bugs**
(e.g. 天德 isStem inversion, 月德合 array off-by-one, 鳴吠對 戊辰→丁卯, 聖心/益後/續世 month-index
swaps). Any change to calculation logic must be cross-checked against independent engines so a
regression or a "false positive bug report" is caught before merge.

## The three reference engines

| Engine | How to invoke (Node) | Notes |
|--------|---------------------|-------|
| **lunar-javascript** | `Solar.fromYmdHms(y,m,d,hh,mm,ss).getLunar().getEightChar()` | Authoritative for 干支/十神/大运/流年; also `getTaiYuan`, `getMingGong`, `getShenGong` |
| **mystilight-8char** | project `core/` wrapper (see `server/verify_*.mjs` for import style) | Independent bazi implementation |
| **lunisolar + char8ex** | `lunisolar(...)` + `char8ex` plugin | The engine actually running in production (may carry the bugs above) |

## When to use

- Before merging any edit to `server/routes/calendar.js` (`_getLsrGods` override layer),
  `core/bazi.js`, `core/lunar.js`, `core/engine/sxwnl-bundle.js`.
- When a user reports "神煞 X 算错了" or "八字 Y 不对" — **always cross-verify first**;
  most reports are false positives from mis-reading the engine's encoding (e.g. `b4%10 ≠ 时干`).
- After touching any shensha array or ten-god mapping.

## Workflow

1. **Extract the production value** with a probe script (e.g. `server/verify_*.mjs` reading the
   live `_getLsrGods` / `computeDayFromLunar`), never trust a stale dump file.
2. **Compute the same value** from lunar-javascript and mystilight independently.
3. **Diff**. Zero diff → safe. Non-zero → check the override-layer whitelist
   (`OVERRIDDEN` in `server/verify_gods_audit.js`: 天恩/天願/月害/重日/復日 are expected diffs,
   CI does NOT fail on them).
4. Only if a diff is outside the whitelist AND reproducible across two independent engines,
   treat it as a real bug and patch via the override layer (never patch the dist directly —
   use `server/routes/calendar.js._getLsrGods`).

## Known-bug reference (do NOT "fix" without re-verifying)

| 神煞 | Bug | Fix location |
|------|-----|--------------|
| 天德 | `isStem` 逻辑反转 `(t%3)` | dist 9 副本 patch (or ADD-only override) |
| 月德合 | `[3,1,8,5]→[3,1,7,5]` 午月错 | dist 9 副本 patch |
| 鳴吠對 | `戊辰→丁卯` | dist 9 副本 patch |
| 聖心 | 亥/子月 卯↔酉 互换 | `server/routes/calendar.js` `SHENGXIN_REF` |
| 益後 | 酉/戌月 寅↔申 互换 | `server/routes/calendar.js` `YIHOU_REF` |
| 續世 | 子丑/午未 两组互换 + 违益后+1 | `server/routes/calendar.js` `XUSHI_REF` |
| 时柱(午夜) | `h=0` 被 `||12` 吞掉 | `server/routes/bazi.js` (已修) |
| 时柱(23:00整点日柱归属) | bazi引擎(`mingLiBaZi`)将 23:00:00 整点算当日日柱、23:00:01 起算次日（晚子时换日流派）；lunar-javascript 对 23:00 含即换次日 — 两者差 1 分钟边界，属流派差异 | 勿"修正"；已在 `core/__tests__/boundary.test.js` 固化（`庚戌`/`辛亥` 断言） |

## Reference

- `references/method.md` — detailed probe/extract patterns and the override-layer contract.
- Live scripts: `server/verify_gods_audit.js`, `server/verify_override_4.js`,
  `server/verify_override_noref.js`, `server/verify_remaining_final.js`.
