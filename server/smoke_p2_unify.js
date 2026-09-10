// server/smoke_p2_unify.js
// HTTP 冒烟：验证 P2（格局卡从格同源 + bz_wuxing 统一 + 死代码移除）在路由层生效且无回归
'use strict';
const crypto = require('crypto');
const hmac = require('./lib/hmac.js');

function auth(path) {
  const ts = Date.now(), nonce = crypto.randomBytes(4).toString('hex');
  const sig = hmac.sign('audit', ts, nonce, path);
  return { 'content-type': 'application/json', 'x-machine-id': 'audit', 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig };
}
function mk(calType, y, m, d, h, min) {
  return JSON.stringify({ name: 't', sex: '男', calType, y, m, d, h, min, jd: 116.4, wd: 39.9 });
}

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name + (extra ? ' :: ' + extra : '')); } }

async function call(body) {
  const r = await fetch('http://localhost:3000/api/v1/bazi', { method: 'POST', headers: auth('/api/v1/bazi'), body });
  return (await r.json()).data;
}

(async () => {
  console.log('═══ P2 HTTP 冒烟 ═══');
  const d = await call(mk('gongli', 2020, 3, 10, 12, 0));

  // 1) bz_wuxing 卡来自统一引擎
  const wx = d.cardsV2.find(c => c.id === 'bz_wuxing');
  ok('bz_wuxing 卡存在', !!wx);
  ok('bz_wuxing 含「统一判定」', wx && wx.body.indexOf('统一判定') >= 0);
  ok('bz_wuxing 已无旧 wuxingRadar canvas', wx && wx.body.indexOf('wuxingRadar') < 0);
  // 与 dayMasterScores 同源
  ok('dayMasterScores 存在', Array.isArray(d.dayMasterScores), JSON.stringify(d.dayMasterScores));
  if (wx && Array.isArray(d.dayMasterScores)) {
    const m = wx.body.match(/加权得分<\/th>[\s\S]*?<\/tr>/);
    ok('bz_wuxing 加权得分 与 dayMasterScores 同源', wx.body.indexOf(String(d.dayMasterScores[0])) >= 0 && wx.body.indexOf(String(d.dayMasterScores[4])) >= 0);
  }

  // 2) 其余卡无破坏
  const ids = d.cardsV2.map(c => c.id);
  ['bz_rizhu', 'bz_geju', 'bz_xiyong', 'bz_congge'].forEach(id => ok('卡片 ' + id + ' 存在', ids.indexOf(id) >= 0));
  const rizhu = d.cardsV2.find(c => c.id === 'bz_rizhu');
  ok('日主强弱卡含「权威判定」标记', rizhu && rizhu.body.indexOf('权威判定') >= 0);
  const xiyong = d.cardsV2.find(c => c.id === 'bz_xiyong');
  ok('喜用卡含「统一判定」标记', xiyong && xiyong.body.indexOf('统一判定') >= 0);
  const congge = d.cardsV2.find(c => c.id === 'bz_congge');
  ok('从格卡含「统一判定」标记', congge && congge.body.indexOf('统一判定') >= 0);
  ok('dayMasterStrength 结论存在', !!d.dayMasterStrength && !!d.dayMasterStrength.level);

  // 3) 响应字段已无旧百分制 wuxingScores（应为统一引擎派生，null 或统一值）
  //    P0 已把 wuxingScores 改为 unified.getWuxing；此处确认存在且与 dayMasterScores 一致
  ok('wuxingScores 与 dayMasterScores 同源', Array.isArray(d.wuxingScores) && d.wuxingScores[0] === d.dayMasterScores[0]);

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SMOKE ERROR', e); process.exit(1); });
