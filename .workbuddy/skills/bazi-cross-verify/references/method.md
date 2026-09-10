# Bazi / Calendar Cross-Verification — Method Detail

## Principle: extract the LIVE value, never trust a stale dump

The production engine is `lunisolar` (with `char8ex` + the `server/routes/calendar.js._getLsrGods`
override layer). Its runtime arrays can differ from any saved `*.txt` dump. Always re-extract:

```js
// probe_live.mjs (pattern)
import { computeDayFromLunar } from '../server/core/lunar.js';
import { _getLsrGods } from '../server/routes/calendar.js';
const day = computeDayFromLunar(y, m, d, false);
const gods = _getLsrGods(y, m, d, day);   // already includes the override fixes
console.log(JSON.stringify(gods, null, 2));
```

## Three-engine comparison pattern

```js
// 1) lunar-javascript (authoritative reference)
import { Solar } from 'lunar-javascript';
const lc = Solar.fromYmdHms(y, m, d, hh, mm, ss).getLunar().getEightChar();
const refGanZhi = lc.getYearGanZhi();   // etc.

// 2) mystilight-8char (independent)
import { ... } from '../core/mystilight-8char/index.js';
const m8 = computeEightChar(y, m, d, hh, mm, ss);

// 3) lunisolar (what prod runs)
import lunisolar from 'lunisolar';
import 'char8ex';
const lsr = lunisolar.fromYmdHms(y, m, d, hh, mm, ss);
const prod = lsr.char8;

// diff prod vs ref vs m8 → report only non-whitelisted diffs
```

## Override-layer contract (CRITICAL)

`server/routes/calendar.js._getLsrGods(y, m, d, computed)` is the **only** sanctioned place to
correct a lunisolar shensha value. Rules:

- **天德 is ADD-only** — lunisolar's "天德" is actually 黄道十二神·天德 (same name, different god);
  never delete it when overlaying the 协纪 天德.
- All others (天德合/月德/月德合/天赦/天恩/天願/月刑/月害/重日/復日/聖心/益後/續世) are full
  add/remove overlays.
- The `OVERRIDDEN` whitelist in `server/verify_gods_audit.js` = {天恩, 天願, 月害, 重日, 復日};
  diffs on these are expected and CI must NOT fail on them.

## Pitfalls that cause FALSE bug reports

- `b4 = (D-1)*12 + 90000000 + SC` in `sxwnl-bundle.js`; `b4 % 10` is **NOT** the 时干. Do not
  judge 时主星 correctness from `b4%10`.
- lunisolar month arrays are sometimes indexed by 月序位, sometimes by 地支 BR 序号 — confirm
  with a live probe before claiming an off-by-one.
- 月刑 / 往亡 are correct in lunisolar already; do not "fix" them.

## CI gates (already wired)

- `npm run test:override` → `verify_override_4.js` (override layer vs 协纪, must be 0 diff).
- `npm run test:override-noref` → `verify_override_noref.js` (圣心/益後/續世 live vs 协纪, 0 diff).
- `npm run test:remaining` → `verify_remaining_final.js` (remaining 137 MD gods diff-audit).
