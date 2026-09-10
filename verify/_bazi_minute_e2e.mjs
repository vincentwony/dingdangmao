// verify/_bazi_minute_e2e.mjs — 后端「分钟 24-59 被钳成 0」回归验证（需起服务）
// 背景：time-util 抽取时 normalizeHour(n>23 钳制) 被误用于解析分钟，
// 导致所有分钟 24-59 的出生时间分钟归零（约 60% 真实时刻）。
// 修复：后端改 normalizeMinute(body.min, 0)。
// 注意：时柱按传统 2 小时柱（辰=7:00-9:00）划分，分钟内不跨柱，
// 故用「真太阳时(zhenTaiYang)」这一分钟敏感字段断言分钟已保留。
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const hmac = require('../server/lib/hmac.js');
const PATH = '/api/v1/bazi', MID = 'audit-bot';

async function post(p) {
  const ts = Date.now(), nonce = hmac.genNonce(), sig = hmac.sign(MID, ts, nonce, PATH);
  const r = await fetch('http://localhost:3000' + PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [hmac.HEADER_NAMES.MID]: MID, [hmac.HEADER_NAMES.TS]: String(ts), [hmac.HEADER_NAMES.NONCE]: nonce, [hmac.HEADER_NAMES.SIG]: sig },
    body: JSON.stringify(p)
  });
  return r.json();
}
function zty(r) { return r.data && r.data.zhenTaiYang; }
function shiZhi(r) { const h = r.data && r.data.pillars && r.data.pillars.hour; return h ? h.slice(-1) : '(fail)'; }
function hhmm(z) { const m = (z || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; }

let pass = 0, fail = 0;
function check(name, got, exp) {
  const ok = got === exp;
  console.log(`${ok ? '✅' : '❌'} ${name}: got=${JSON.stringify(got)} exp=${JSON.stringify(exp)}`);
  ok ? pass++ : fail++;
}

(async () => {
  const base = { name: '测', sex: '男', calType: 'gongli', y: 2000, m: 1, d: 1, jd: 116.4, wd: 39.9 };

  // —— 核心回归：分钟 24-59 必须保留 ——
  const r800 = await post({ ...base, h: 8, min: 0 });
  const r855 = await post({ ...base, h: 8, min: 55 });
  const z0 = zty(r800), z55 = zty(r855);
  check('08:00 真太阳时存在', typeof z0, 'string');
  check('08:55 真太阳时存在', typeof z55, 'string');
  check('分钟55被保留(真太阳时不同)', z0 !== z55, true);
  const m0 = hhmm(z0), m55 = hhmm(z55);
  check('08:55 比 08:00 真太阳时晚约55分', m0 != null && m55 != null && Math.abs((m55 - m0) - 55) <= 2, true);

  // —— 午夜 h=0 合法值：不可被 ||12 误判成正午 ——
  const r0030 = await post({ ...base, h: 0, min: 30 });
  check('00:30 时支应为 子', shiZhi(r0030), '子');
  const r1230 = await post({ ...base, h: 12, min: 30 });
  check('12:30 时支应为 午', shiZhi(r1230), '午');

  // —— 分钟边界值 smoke ——
  const r859 = await post({ ...base, h: 8, min: 59 });
  check('08:59 真太阳时晚于 08:00', hhmm(zty(r859)) > m0, true);

  console.log(`\n分钟回归 e2e: ${pass} 通过 / ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
