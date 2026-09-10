// verify/_bazi_midnight_e2e.mjs — 后端 e2e：午夜 h=0 应得子时
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/x.js');
const hmac = require('./server/lib/hmac.js');

const PATH = '/api/v1/bazi', MID = 'audit-bot';

async function post(p) {
  const ts = Date.now(), nonce = hmac.genNonce(), sig = hmac.sign(MID, ts, nonce, PATH);
  const r = await fetch('http://localhost:3000' + PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json',
      [hmac.HEADER_NAMES.MID]: MID, [hmac.HEADER_NAMES.TS]: String(ts),
      [hmac.HEADER_NAMES.NONCE]: nonce, [hmac.HEADER_NAMES.SIG]: sig },
    body: JSON.stringify(p)
  });
  return r.json();
}

const base = { name: '测', sex: '男', calType: 'gongli', y: 2000, m: 1, d: 1, jd: 116.4, wd: 39.9 };
const r0 = await post({ ...base, h: 0, min: 30 });
const r12 = await post({ ...base, h: 12, min: 0 });
const h0 = r0.data && r0.data.pillars && r0.data.pillars.hour;
const h12 = r12.data && r12.data.pillars && r12.data.pillars.hour;
console.log('  h=0,min=30 -> 时柱', h0, '(应含 子)');
console.log('  h=12,min=0 -> 时柱', h12, '(应含 午)');
const ok = r0.ok && r12.ok && /子/.test(h0) && /午/.test(h12);
console.log(ok ? '✅ 端到端午夜链路正确' : '❌ 链路异常');
process.exit(ok ? 0 : 1);
