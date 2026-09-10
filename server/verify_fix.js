// verify_fix.js — 验证 calendar.js 中 _getLsrGods 覆盖逻辑（天德同名碰撞修复）
const path = require('path');
const core = require('gongxin-core');
const computeDayFromLunar = core.computeDayFromLunar;

const lunisolar = require('lunisolar');
const theGodsPlugin = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGodsPlugin.theGods);

// 与 routes/calendar.js 中 EDITED 的覆盖逻辑完全一致
function applyOverride(good, bad, computed) {
  var _truth = {
    '天德': !!computed.tiande,
    '天德合': !!computed.tiandeHe,
    '月德': !!computed.yuede,
    '月德合': !!computed.yuedeHe,
    '天赦': !!computed.tianshe
  };
  Object.keys(_truth).forEach(function(name) {
    var gi = good.indexOf(name);
    var bi = bad.indexOf(name);
    if (_truth[name]) {
      if (gi < 0) good.push(name);
      if (bi >= 0) bad.splice(bi, 1);
    } else {
      if (bi >= 0) bad.splice(bi, 1);
      if (name !== '天德' && gi >= 0) good.splice(gi, 1);
    }
  });
  return { good, bad };
}

function getLsr(y, m, d) {
  const lsr = lunisolar(new Date(y, m - 1, d));
  return {
    good: lsr.theGods.getGoodGods().map(g => String(g)),
    bad: lsr.theGods.getBadGods().map(g => String(g)),
  };
}

// 黄道十二神·天德判定（按日支循环）
const BR = '子丑寅卯辰巳午未申酉戌亥';
function huangdaoTiande(monthBranchNum, dayBranchNum) {
  // 月支起青龙：寅月青龙起子... 公式: godIdx = (dayBranch - monthBranchStart + offset) %12
  // 依据原代码 getBy12God2；此处仅用于交叉验证“天德”是否黄道
  const start = (monthBranchNum + 10) % 12; // 寅(2)→子(0)? 简化为验证用
  const idx = (dayBranchNum - start + 12) % 12;
  return idx === 5; // 第6位为天德
}

let stats = {
  total: 0,
  huangdaoTiandeDays: 0,
  shenShaTiandeDays: 0,
  huangdaoPreserved: 0,      // 黄道天德日被保留
  huangdaoWronglyRemoved: 0, // 黄道天德日被误删（应为0）
  shenShaAdded: 0,           // 神煞天德日已补入
  shenShaMissing: 0,         // 神煞天德日未补入（应为0）
  otherMismatch: 0,
};
const otherNames = ['天德合','月德','月德合','天赦'];
const mismatchExamples = [];

const Y = 2026;
for (let m = 1; m <= 12; m++) {
  const dim = new Date(Y, m, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const computed = computeDayFromLunar(Y, m, d);
    const lsr = getLsr(Y, m, d);
    const out = applyOverride(lsr.good.slice(), lsr.bad.slice(), computed);
    stats.total++;

    const goodHasTiande = out.good.includes('天德');
    const lsrHasHuangdao = lsr.good.includes('天德'); // lunisolar 的天德即黄道天德
    const shenSha = !!computed.tiande;

    if (lsrHasHuangdao) {
      stats.huangdaoTiandeDays++;
      if (goodHasTiande) stats.huangdaoPreserved++;
      else { stats.huangdaoWronglyRemoved++; if (mismatchExamples.length < 10) mismatchExamples.push(`${Y}-${m}-${d} 黄道天德被误删`); }
    }
    if (shenSha) {
      stats.shenShaTiandeDays++;
      if (goodHasTiande) stats.shenShaAdded++;
      else { stats.shenShaMissing++; if (mismatchExamples.length < 10) mismatchExamples.push(`${Y}-${m}-${d} 神煞天德未补入`); }
    }

    // 其余四项：out 的 good/bad 应与 computed truth 完全一致（含 lunisolar 原始）
    for (const nm of otherNames) {
      const truth = !!computed[{'天德合':'tiandeHe','月德':'yuede','月德合':'yuedeHe','天赦':'tianshe'}[nm]];
      // 当 truth 成立：good 必须包含；当不成立：good 与 bad 都不应包含（除非 lunisolar 另有同名，这里仅校验 good）
      const inGood = out.good.includes(nm);
      const inBad = out.bad.includes(nm);
      if (truth && !inGood) { stats.otherMismatch++; if (mismatchExamples.length<10) mismatchExamples.push(`${Y}-${m}-${d} ${nm} 应为吉却未入`); }
      if (!truth && inGood) { stats.otherMismatch++; if (mismatchExamples.length<10) mismatchExamples.push(`${Y}-${m}-${d} ${nm} 不应为吉却入`); }
    }
  }
}

console.log('=== 2026 全年覆盖逻辑验证 ===');
console.log(JSON.stringify(stats, null, 2));
console.log('示例:', mismatchExamples.slice(0,10));
console.log(stats.huangdaoWronglyRemoved === 0 && stats.shenShaMissing === 0 && stats.otherMismatch === 0
  ? '\n✅ 全部通过：黄道天德零误删、神煞天德全补入、其余四项无误判'
  : '\n❌ 存在不一致');
