// 验证 _renderJqTopBar 月中取值逻辑：月建(干支月) 与 当月节气 是否一致
// 覆盖跨年(12/1月)、闰月(2025-07 闰六月)、早交节月。
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hmac = require('../server/lib/hmac.js');

const BASE = 'http://localhost:3000';
const PATH = '/api/v1/calendar/month';
const MID = 'audit-bot';

async function getMonth(y, m) {
  const ts = Date.now();
  const nonce = hmac.genNonce();
  const sig = hmac.sign(MID, ts, nonce, PATH);
  const res = await fetch(BASE + PATH, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [hmac.HEADER_NAMES.MID]: MID,
      [hmac.HEADER_NAMES.TS]: String(ts),
      [hmac.HEADER_NAMES.NONCE]: nonce,
      [hmac.HEADER_NAMES.SIG]: sig,
    },
    body: JSON.stringify({ y, m }),
  });
  return res.json();
}

// 复刻 _renderJqTopBar 的月中取值
function monthBranchFromApi(data) {
  const days = data.days || [];
  const curDays = days.filter(d => d && !d.other && d.d && d.gz && d.gz.month);
  let midDay = null;
  curDays.forEach(d => {
    if (!midDay || Math.abs(d.d - 15) < Math.abs(midDay.d - 15)) midDay = d;
  });
  return (midDay && midDay.gz && midDay.gz.month) ? midDay.gz.month : '';
}
function termsFromApi(data) {
  const days = data.days || [];
  return days.filter(d => d && d.jieQi).map(d => d.jieQi);
}

// 期望：月中干支月 地支（与节气所属月建对应）
const EXPECT = {
  '2025-12': '子', '2026-01': '丑', '2026-02': '寅', '2026-03': '卯',
  '2026-06': '午', '2026-07': '未', '2026-08': '申', '2026-12': '子',
  '2027-01': '丑', '2025-07': '未', // 闰六月：农历闰月不影响干支月(节气月)
};

let pass = 0, fail = 0;
for (const key of Object.keys(EXPECT)) {
  const [y, m] = key.split('-').map(Number);
  const r = await getMonth(y, m);
  if (!r.ok) { console.log(`✗ ${key} API失败: ${r.error}`); fail++; continue; }
  const mb = monthBranchFromApi(r.data);
  const terms = termsFromApi(r.data);
  const got = mb ? mb.charAt(mb.length - 1) : '(空)';
  const exp = EXPECT[key];
  const ok = got === exp;
  console.log(`${ok ? '✓' : '✗'} ${key} 月建=${mb} 节气=[${terms.join('·')}] 期望地支=${exp} ${ok ? '' : '<<< 不一致'}`);
  ok ? pass++ : fail++;
}
console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
