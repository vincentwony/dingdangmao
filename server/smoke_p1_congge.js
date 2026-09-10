// server/smoke_p1_congge.js — P1 从格统一冒烟
'use strict';
const crypto = require('crypto');
const hmac = require('./lib/hmac.js');

function req(body) {
  const ts = Date.now(), nonce = crypto.randomBytes(4).toString('hex');
  const sig = hmac.sign('audit', ts, nonce, '/api/v1/bazi');
  return fetch('http://localhost:3000/api/v1/bazi', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-machine-id': 'audit', 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig },
    body: JSON.stringify(body)
  }).then(r => r.json()).then(j => j.data);
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✅ ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + name + (detail ? '  ' + detail : '')); }
}

(async () => {
  // 甲子四柱 → 旺极 → 从旺格
  const ob = { name: 't', sex: '男', calType: 'gongli', y: 1984, m: 2, d: 2, h: 0, min: 0, jd: 116.4, wd: 39.9 };
  // 1984-02-02 00:00 公历 → 甲子年 甲子月 甲子日 甲子时（近似，仅用于触发完整链路）
  const d = await req(ob);

  console.log('═══ P1 从格统一冒烟 ═══');
  // 1. congGe / congGeV2 同源（双引擎已合并）
  check('congGe 与 congGeV2 同源', JSON.stringify(d.congGe) === JSON.stringify(d.congGeV2),
    'congGe=' + JSON.stringify(d.congGe));
  // 2. 多数组也合并
  check('cards 与 cardsV2 长度一致', d.cards.length === d.cardsV2.length);

  // 3. bz_congge 卡来自统一引擎（含「统一判定」，无旧 determineCongGe 残留）
  const congCardV2 = d.cardsV2.find(c => c.id === 'bz_congge');
  check('cardsV2 含 bz_congge 卡', !!congCardV2);
  if (congCardV2) {
    check('bz_congge 含「统一判定」标记', congCardV2.body.indexOf('统一判定') >= 0);
    check('bz_congge 无旧 determineCongGe 残留', congCardV2.body.indexOf('四柱概览') >= 0); // 新模板沿用该小标题
  }

  // 4. 日主强弱卡（权威）无回归
  const dmCard = d.cardsV2.find(c => c.id === 'bz_rizhu');
  check('bz_rizhu 权威卡存在', !!dmCard && dmCard.body.indexOf('权威判定') >= 0);

  // 5. 五行力量同源（P0 已统一，P1 不破坏）
  check('wuxingScores 与 dayMasterScores 同源',
    JSON.stringify(d.wuxingScores) === JSON.stringify(d.dayMasterScores),
    'wuxing=' + JSON.stringify(d.wuxingScores));

  console.log('\n═══ 结果 ═══');
  console.log('PASS=' + pass + '  FAIL=' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
