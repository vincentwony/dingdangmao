// verify_ziwei_live.mjs — 活接口实测：确认传统派覆盖层已在 /api/v1/ziwei/astrolabe 生效
import hmac from './lib/hmac.js';

const BASE = 'http://localhost:3000';
const PATH = '/api/v1/ziwei/astrolabe';
const body = JSON.stringify({ calType: 'solar', y: 1990, m: 6, d: 15, time: 6, sex: '男' });

const mid = 'verify-live';
const ts = Date.now();
const nonce = hmac.genNonce();
const sig = hmac.sign(mid, ts, nonce, PATH);

const headers = {
  'Content-Type': 'application/json',
  'x-machine-id': mid,
  'x-timestamp': String(ts),
  'x-nonce': nonce,
  'x-signature': sig,
};

const r = await fetch(BASE + PATH, { method: 'POST', headers, body });
const j = await r.json();
if (!j.ok) { console.error('API 失败:', j); process.exit(1); }

const ps = j.data.palaces;
const mp = ps.find(p => p.name === '命宫');
const sorted = ps.filter(p => p.decadal).sort((a, b) => a.decadal.range[0] - b.decadal.range[0]);
const nextName = sorted[(sorted.findIndex(p => p.name === '命宫') + 1) % 12].name;
const dir = nextName === '兄弟' ? '顺' : (nextName === '父母' ? '逆' : '?');

console.log('命宫起运:', mp.decadal.range[0], '(期望6=火六局)');
console.log('大限方向:', dir, '(期望顺=阳男传统派)');
console.log('长生命宫:', mp.changsheng12, '(期望非空)');
console.log('小限命宫条数:', (mp.ages || []).length, '(期望>0)');
console.log('五行局(meta):', j.data.meta && j.data.meta.fiveElementsClass);

const ok = mp.decadal.range[0] === 6 && dir === '顺' && !!mp.changsheng12 && (mp.ages || []).length > 0;
console.log(ok ? '\n✅ 活接口覆盖层生效' : '\n❌ 覆盖层未生效');
process.exit(ok ? 0 : 1);
