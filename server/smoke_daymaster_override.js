// server/smoke_daymaster_override.js
// 冒烟：确认 bz_rizhu 卡片已被「权威判定」覆盖层替换（Engine A=cards / Engine B=cardsV2）
'use strict';
var crypto = require('crypto');
var hmac = require('./lib/hmac.js');

function reqBazi(payload) {
  return new Promise(function (resolve, reject) {
    var url = 'http://localhost:3000/api/v1/bazi';
    var body = JSON.stringify(payload);
    var ts = Date.now(), nonce = crypto.randomBytes(4).toString('hex');
    var sig = hmac.sign('audit', ts, nonce, '/api/v1/bazi');
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json',
        'x-machine-id': 'audit', 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig },
      body: body
    })
      .then(function (r) { return r.json(); })
      .then(resolve)
      .catch(reject);
  });
}

function findCard(arr, id) {
  if (!arr) return null;
  for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
  return null;
}

function inspectCard(card, label) {
  if (!card) { console.log('  ❌ [' + label + '] 无 bz_rizhu 卡片'); return false; }
  var b = card.body || '';
  var hasAuth = b.indexOf('权威判定') >= 0;        // _buildDayMasterCard 标题标记
  var hasDmCard = b.indexOf('dm-card') >= 0;       // 权威卡片主体结构
  var hasOld = b.indexOf('card-raised') >= 0;      // 旧 sxwnl-bundle 卡片类
  var hasDmAB = b.indexOf('dm-ab') >= 0;           // A/B 区块
  console.log('  [' + label + '] id=' + card.id + ' len=' + b.length
    + ' | 权威判定:' + (hasAuth ? '✅' : '❌')
    + ' dm-card:' + (hasDmCard ? '✅' : '❌')
    + ' dm-ab:' + (hasDmAB ? '✅' : '❌')
    + ' 旧card-raised:' + (hasOld ? '⚠残留' : '无✅'));
  return hasAuth && hasDmCard && hasDmAB && !hasOld;
}

(async function () {
  var pass = 0, fail = 0;
  var samples = [
    { name: '甲日寅月样', sex: '男', calType: 'gongli', y: 2020, m: 3, d: 10, h: 12, min: 0, jd: 116.4, wd: 39.9 },
    { name: '壬日戌月样', sex: '女', calType: 'gongli', y: 1995, m: 11, d: 8, h: 10, min: 0, jd: 116.4, wd: 39.9 }
  ];
  for (var s = 0; s < samples.length; s++) {
    var p = samples[s];
    console.log('═══ 样本 ' + (s + 1) + '：' + p.name + ' ═══');
    var j;
    try { j = await reqBazi(p); } catch (e) { console.log('  ⏭ 服务不可达: ' + e.message); continue; }
    if (!j || !j.ok || !j.data) { console.log('  ❌ 响应异常 ' + JSON.stringify(j).slice(0, 160)); fail++; continue; }

    var dm = j.data.dayMasterStrength;
    console.log('  dayMasterStrength.level = ' + (dm && dm.level) + ' | A=' + (dm && dm.A) + ' B=' + (dm && dm.B) + ' A/B=' + (dm && dm.ratio));
    if (dm && dm.level) pass++; else { console.log('  ❌ dayMasterStrength 缺失'); fail++; }

    var cA = findCard(j.data.cards, 'bz_rizhu');
    var cB = findCard(j.data.cardsV2, 'bz_rizhu');
    if (inspectCard(cA, 'EngineA/cards')) pass++; else fail++;
    if (inspectCard(cB, 'EngineB/cardsV2')) pass++; else fail++;
  }
  console.log('══════════════════════');
  console.log('冒烟结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail === 0 ? 0 : 1);
})();
