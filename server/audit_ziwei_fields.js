// server/audit_ziwei_fields.js — 直连活接口，打印真实序列化结构以核对字段迁移遗漏
'use strict';
const crypto = require('crypto');

const HMAC_KEY = '381cb51f0923fc771bf7e81547c485f7';
const BASE = 'http://localhost:3000/api/v1';

function sign(mid, ts, nonce, path) {
  const msg = String(mid) + String(ts) + String(nonce) + String(path);
  const h = crypto.createHmac('sha256', HMAC_KEY).update(msg).digest();
  return h.slice(0, 4).toString('hex');
}
async function post(path, data) {
  const ts = Date.now();
  const nonce = crypto.randomBytes(4).toString('hex');
  const mid = 'audit0001';
  const sig = sign(mid, ts, nonce, '/api/v1' + path);
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-machine-id': mid, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': sig },
    body: JSON.stringify(data)
  });
  return r.json();
}

(async () => {
  const astro = await post('/ziwei/astrolabe', {
    calType: 'solar', y: 1982, m: 5, d: 10, hour: 12, min: 20, sex: '男',
    jd: 116.4, wd: 39.9, zty: false, province: '北京市', region: '北京', location: '北京市 北京'
  });
  if (!astro.ok) { console.log('ASTRO ERR', JSON.stringify(astro)); return; }
  const d = astro.data;
  console.log('=== META KEYS ===');
  console.log(Object.keys(d.meta).join(', '));
  console.log('yearMutagen =', JSON.stringify(d.meta.yearMutagen));
  console.log('fourPillars =', JSON.stringify(d.meta.fourPillars));
  console.log('soul/body =', d.meta.soul, '/', d.meta.body);

  console.log('\n=== PALACE[0] FULL ===');
  console.log(JSON.stringify(d.palaces[0], null, 1));

  // 收集所有 star 字段键名（major/minor/adjective）
  const starKeys = new Set();
  let brightnessCount = 0, starTotal = 0;
  d.palaces.forEach(p => {
    ['majorStars','minorStars','adjectiveStars'].forEach(k => {
      (p[k]||[]).forEach(s => {
        Object.keys(s).forEach(x => starKeys.add(x));
        starTotal++;
        if (s.brightness !== undefined && s.brightness !== '') brightnessCount++;
      });
    });
    // 检查关键字段
    ['ages','jiangqian12','suiqian12','changsheng12','boshi12','decadal'].forEach(f => {
      if (!(f in p)) console.log('  !! palace', p.name, 'missing field', f);
    });
    if (p.decadal && !p.decadal.range) console.log('  ?? palace', p.name, 'decadal but no range');
  });
  console.log('\n=== STAR FIELD KEYS (union) ===', [...starKeys].join(', '));
  console.log('stars with brightness value:', brightnessCount, '/', starTotal);

  console.log('\n=== HOROSCOPE ===');
  const horo = await post('/ziwei/horoscope', {
    calType: 'solar', y: 1982, m: 5, d: 10, hour: 12, min: 20, sex: '男',
    jd: 116.4, wd: 39.9, zty: false, targetYear: 2026
  });
  if (!horo.ok) { console.log('HORO ERR', JSON.stringify(horo)); return; }
  const h = horo.data;
  console.log('decadal.keys =', Object.keys(h.decadal||{}).join(', '));
  console.log('decadal.index =', h.decadal && h.decadal.index, '| mutagen =', JSON.stringify(h.decadal && h.decadal.mutagen));
  console.log('decadal.stars[0] sample =', JSON.stringify((h.decadal && h.decadal.stars && h.decadal.stars[0]) ? h.decadal.stars[0].slice(0,2) : null));
  console.log('yearly.keys =', Object.keys(h.yearly||{}).join(', '));
  console.log('age =', JSON.stringify(h.age));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
