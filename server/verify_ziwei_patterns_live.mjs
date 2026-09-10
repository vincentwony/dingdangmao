import hmac from './lib/hmac.js';
const BASE = 'http://localhost:3000', PATH = '/api/v1/ziwei/astrolabe';
const body = JSON.stringify({ calType: 'solar', y: 1984, m: 6, d: 1, time: 6, sex: '男' });
const mid = 'v', ts = Date.now(), nonce = hmac.genNonce(), sig = hmac.sign(mid, ts, nonce, PATH);
const r = await fetch(BASE + PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-machine-id': mid, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': sig }, body });
const j = await r.json();
if (!j.ok) { console.error(j); process.exit(1); }
const ps = j.data.patterns || [];
console.log('patterns 数量:', ps.length);
console.log('吉:', ps.filter(p => p.cat === '吉').map(p => `${p.name}(${p.level})`).join('、'));
console.log('煞:', ps.filter(p => p.cat === '煞').map(p => `${p.name}(${p.level})`).join('、'));
console.log('样例 desc:', ps[0] ? ps[0].desc : '(无)');
process.exit(ps.length >= 0 ? 0 : 1);
