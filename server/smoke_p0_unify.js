// server/smoke_p0_unify.js
// P0 统一冒烟：五行力量 + 喜用神 是否接新引擎权威判定
'use strict';
const crypto = require('crypto');
const hmac = require('./lib/hmac.js');

function post(name, calType, y, m, d, h, min) {
  return new Promise((resolve) => {
    const url = 'http://localhost:3000/api/v1/bazi';
    const body = JSON.stringify({ name, sex: '男', calType, y, m, d, h, min, jd: 116.4, wd: 39.9 });
    const ts = Date.now(), nonce = crypto.randomBytes(4).toString('hex');
    const sig = hmac.sign('audit', ts, nonce, '/api/v1/bazi');
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-machine-id': 'audit', 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig }, body })
      .then(r => r.json()).then(j => resolve(j.data)).catch(e => resolve({ __err: String(e) }));
  });
}

function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  let fail = 0;
  const cases = [
    { name: '甲日寅月(很旺)', args: ['gongli', 1984, 2, 4, 12, 0] },
    { name: '丙日午月(比较旺)', args: ['gongli', 2020, 6, 21, 12, 0] },
    { name: '壬日戌月(平衡)', args: ['gongli', 1990, 11, 8, 10, 0] },
  ];
  for (const c of cases) {
    const d = await post(c.name, ...c.args);
    if (d.__err) { console.log('✗', c.name, '请求失败', d.__err); fail++; continue; }
    const wx = d.wuxingScores, dm = d.dayMasterScores;
    const sameSrc = deepEq(wx, dm);
    const pctSum = d.wuxingPct.reduce((a, b) => a + b, 0);
    const xiyong = (d.cardsV2.find(x => x.id === 'bz_xiyong') || {}).body || '';
    const rizhu = (d.cardsV2.find(x => x.id === 'bz_rizhu') || {}).body || '';
    const xiyongUnified = xiyong.indexOf('统一判定') >= 0 && xiyong.indexOf('旺衰用神法') >= 0;
    const rizhuOk = rizhu.indexOf('权威判定') >= 0;
    const gs = d.xiaoErGuanSha ? true : false;
    const ok = sameSrc && Math.abs(pctSum - 100) <= 2 && xiyongUnified && rizhuOk && gs;
    console.log((ok ? '✓' : '✗'), c.name,
      '| wuxing===dm:', sameSrc,
      '| pctSum:', pctSum,
      '| 喜用统一:', xiyongUnified,
      '| 日主权威:', rizhuOk,
      '| 关煞:', gs);
    if (!ok) fail++;
  }
  console.log(fail === 0 ? '\nP0 SMOKE ALL PASS' : `\nP0 SMOKE FAIL = ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
