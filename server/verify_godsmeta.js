'use strict';
// Phase 2.2 / 2.2.1 — godsMeta CI 单测：验证差异神煞(isDiff) + 覆盖修正神煞(corrected) 元数据
// 键名精确命中 lunisolar 实际输出、字段齐全、buildGodsMeta 仅返回当日命中的来源神煞（不泄漏非来源名）。
const cal = require('./routes/calendar.js');
const lunisolar = require('lunisolar');
const theGods = require('@lunisolar/plugin-thegods');
lunisolar.extend(theGods.theGods);

const build = cal._buildGodsMeta;
const GODS_SOURCE = cal._GODS_SOURCE;
let fail = 0;
const log = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fail++; };

// 1) 导出存在
log(typeof build === 'function', '_buildGodsMeta 已导出');
log(GODS_SOURCE && typeof GODS_SOURCE === 'object', '_GODS_SOURCE 已导出');

// 2) 真实 lunisolar 输出宇宙（2024-2027）
const universe = new Set();
for (let y = 2024; y <= 2027; y++)
  for (let mo = 1; mo <= 12; mo++)
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, mo - 1, d);
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) continue;
      const l = lunisolar(dt);
      l.theGods.getGoodGods().forEach(g => universe.add(String(g)));
      l.theGods.getBadGods().forEach(g => universe.add(String(g)));
    }

const keys = Object.keys(GODS_SOURCE);
const diffKeys = keys.filter(k => GODS_SOURCE[k].isDiff);
const corrKeys = keys.filter(k => GODS_SOURCE[k].corrected);
log(keys.length === 34, '来源神煞元数据共 34 项（20 差异 + 14 已修正，实际 ' + keys.length + '）');
log(diffKeys.length === 20, '差异神煞(isDiff) 20 项（实际 ' + diffKeys.length + '）');
log(corrKeys.length === 14, '已修正神煞(corrected) 14 项（实际 ' + corrKeys.length + '）');

// 3) 键名必须全部命中真实输出（避免繁简/拼写错配导致永不显示）
const missUniverse = keys.filter(k => !universe.has(k));
log(missUniverse.length === 0, '全部键名命中 lunisolar 实际输出' + (missUniverse.length ? '（未命中：' + missUniverse.join('、') + '）' : ''));

// 4) 字段齐全：差异神煞需 diff、已修正神煞需 note；两者均须 xiejì/def
let fieldOk = true;
keys.forEach(k => {
  const m = GODS_SOURCE[k];
  const hasBase = m && m.xiejì && m.def;
  const hasFlag = (m.isDiff === true && m.diff) || (m.corrected === true && m.note);
  if (!hasBase || !hasFlag) { fieldOk = false; console.log('   缺字段: ' + k + ' (isDiff=' + m.isDiff + ', corrected=' + m.corrected + ')'); }
});
log(fieldOk, '每项含 xiejì/def + (diff|note) 字段');

// 5) buildGodsMeta：仅返回命中的来源神煞，不泄漏非来源名
const nonSource = ['月破', '天喜', '不存在之神煞'];
const meta = build(keys.concat(nonSource), ['天吏', '兵吉']); // good + bad 混合
const out = Object.keys(meta).sort();
const expect = keys.slice().sort();
log(JSON.stringify(out) === JSON.stringify(expect), 'buildGodsMeta 输出恰为 20 个来源神煞（无泄漏）' + (out.length !== expect.length ? '（实际 ' + out.length + '）' : ''));
const leaked = nonSource.filter(n => meta[n]);
log(leaked.length === 0, '未向非来源神煞注入元数据' + (leaked.length ? '（泄漏：' + leaked.join('、') + '）' : ''));

// 6) 抽样：构造一个当日命中场景，确认返回结构
const sample = build(['兵吉', '天后', '天德'], ['天吏']);
log(sample['兵吉'] && sample['兵吉'].isDiff === true && /卷六/.test(sample['兵吉'].xiejì), '抽样「兵吉」含协纪出处且 isDiff=true');
log(sample['天德'] && sample['天德'].corrected === true && sample['天德'].note, '抽样「天德」标 corrected=true 且含 note 修正说明');

console.log('\n' + (fail === 0 ? '[CI OK] godsMeta 校验通过（34 项：20 差异 + 14 已修正）' : '[CI FAIL] ' + fail + ' 项未通过'));
process.exit(fail === 0 ? 0 : 1);
