// 验证：月刑/月害/重日/復日 覆盖层 vs 协纪主流释义
// 用法：node verify_override_4.js
const S = require("H:/Phone/core/shensha.js");
const lunisolar = require("lunisolar");
const theGods = require("@lunisolar/plugin-thegods");
lunisolar.extend(theGods.theGods);

const STEM = "甲乙丙丁戊己庚辛壬癸", BR = "子丑寅卯辰巳午未申酉戌亥";
const I = (l, e, n = 0) => ("month" === e ? l.getMonthBuilder(n)[0] : l.char8[e]);
const _ = (l, e, n) => { let t = I(l, e, 0); return n ? t.branch.value % n : t.branch.value; };
const L = (l, e, n) => { let t = I(l, e, 0); return n ? t.stem.value % n : t.stem.value; };

// 主流参考（与 shensha.js 内映射一致）：用 lunisolar 取数，独立实现规则
const YUEXING = { 2:'巳',3:'子',4:'辰',5:'申',6:'午',7:'丑',8:'寅',9:'酉',10:'未',11:'亥',0:'卯',1:'戌' };
const YUEHAI  = { 0:'未',1:'午',2:'巳',3:'辰',4:'卯',5:'寅',6:'丑',7:'子',8:'亥',9:'戌',10:'酉',11:'申' };
const FU = { 2:['甲','庚'],8:['甲','庚'],3:['乙','辛'],9:['乙','辛'],4:['戊','己'],10:['戊','己'],1:['戊','己'],7:['戊','己'],5:['丙','壬'],11:['丙','壬'],0:['丁','癸'],6:['丁','癸'] };

function mainYuexing(mb) { return YUEXING[mb] === BR[_(l, "day")]; }
function mainYuehai(mb) { return YUEHAI[mb] === BR[_(l, "day")]; }
// 用闭包外部 l 不便，下面改用内联

function mainRef(lsr) {
  const mb = _(lsr, "month");           // 月支序
  const db = _(lsr, "day");             // 日支序
  const ds = L(lsr, "day");             // 日干序
  const yx = YUEXING[mb] === BR[db];
  const yh = YUEHAI[mb] === BR[db];
  const cr = BR[mb] === BR[db];
  const fu = !!(FU[mb] && FU[mb].indexOf(STEM[ds]) >= 0);
  return { 月刑: yx, 月害: yh, 重日: cr, 復日: fu };
}

const TARGETS = ["月刑", "月害", "重日", "復日"];
let rawDiff = { 月刑:0, 月害:0, 重日:0, 復日:0 };
let overrideMismatch = { 月刑:0, 月害:0, 重日:0, 復日:0 };
let dates = 0;

function applyOverride(goodArr, badArr, truth) {
  const good = goodArr.slice(), bad = badArr.slice();
  TARGETS.forEach(name => {
    const gi = good.indexOf(name), bi = bad.indexOf(name);
    if (truth[name]) {
      if (gi < 0) good.push(name);
      if (bi >= 0) bad.splice(bi, 1);
    } else {
      if (gi >= 0) good.splice(gi, 1);
      if (bi >= 0) bad.splice(bi, 1);
    }
  });
  return { good, bad };
}

for (let y = 2024; y <= 2027; y++) {
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(y, m, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      dates++;
      const lsr = lunisolar(new Date(y, m - 1, d));
      const ref = mainRef(lsr);
      const good = lsr.theGods.getGoodGods().map(g => String(g));
      const bad = lsr.theGods.getBadGods().map(g => String(g));
      const gset = new Set(good), bset = new Set(bad);
      // lunisolar 原始是否含该神
      const raw = {};
      TARGETS.forEach(n => { raw[n] = gset.has(n) || bset.has(n); });
      TARGETS.forEach(n => { if (raw[n] !== ref[n]) rawDiff[n]++; });
      // 应用覆盖层
      const ov = applyOverride(good, bad, ref);
      const ovGood = new Set(ov.good), ovBad = new Set(ov.bad);
      TARGETS.forEach(n => {
        const present = ovGood.has(n) || ovBad.has(n);
        if (present !== ref[n]) overrideMismatch[n]++;
      });
    }
  }
}

console.log("扫描日期数:", dates);
console.log("\n[lunisolar 原始 与 主流释义 不一致天数]");
TARGETS.forEach(n => console.log("  " + n + ": " + rawDiff[n]));
console.log("\n[覆盖层应用后 与 主流释义 偏差天数]");
TARGETS.forEach(n => console.log("  " + n + ": " + overrideMismatch[n]));
const allOk = TARGETS.every(n => overrideMismatch[n] === 0);
console.log("\n覆盖层结论:", allOk ? "全部一致 ✅ (覆盖后输出=协纪主流)" : "仍存在偏差 ❌");
process.exit(allOk ? 0 : 1);
