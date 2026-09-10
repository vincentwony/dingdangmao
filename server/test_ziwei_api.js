// server/test_ziwei_api.js — 用服务端 hmac 库签名，实测紫微 API
'use strict';
const hmac = require('./lib/hmac');
const H = hmac.HEADER_NAMES;

function call(path, body) {
  const mid = 'testmachine01';
  const ts = Date.now();
  const nonce = String(Math.floor(Math.random() * 10000));
  const sig = hmac.sign(mid, ts, nonce, '/api/v1' + path);
  return fetch('http://localhost:3000/api/v1' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [H.MID]: mid, [H.TS]: String(ts), [H.NONCE]: nonce, [H.SIG]: sig
    },
    body: JSON.stringify(body)
  }).then(function(r) { return r.json(); });
}

(async function() {
  try {
    const a = await call('/ziwei/astrolabe', { calType: 'solar', y: 1990, m: 5, d: 15, time: 8, sex: '男' });
    console.log('=== astrolabe ===');
    console.log('ok=', a.ok);
    if (!a.ok) { console.log('ERR', a); return; }
    console.log('palaces=', a.data.palaces.length);
    console.log('五行局=', a.data.meta.fiveElementsClass, '| 命主=', a.data.meta.soul, '| 身主=', a.data.meta.body);
    const ming = a.data.palaces.find(function(p) { return p.name === '命宫'; });
    console.log('命宫:', JSON.stringify(ming));
    const withMajor = a.data.palaces.find(function(p) { return p.majorStars.length; });
    console.log('有主星宫样例:', withMajor.name, withMajor.majorStars);

    const h = await call('/ziwei/horoscope', { calType: 'solar', y: 1990, m: 5, d: 15, time: 8, sex: '男', targetYear: 2026 });
    console.log('\n=== horoscope ===');
    console.log('ok=', h.ok);
    if (!h.ok) { console.log('ERR', h); return; }
    console.log('decadal.index=', h.data.decadal.index, '| mutagen=', h.data.decadal.mutagen);
    console.log('decadal.stars 长度=', h.data.decadal.stars.length, '| 非空宫数=', h.data.decadal.stars.filter(function(x){return x.length;}).length);
    console.log('yearly.index=', h.data.yearly.index, '| mutagen=', h.data.yearly.mutagen);
    console.log('age=', h.data.age);
  } catch (e) {
    console.log('CALL ERR', e.message);
  }
})();
