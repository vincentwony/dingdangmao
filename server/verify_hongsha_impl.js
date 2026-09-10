// 红砂/大红砂落地验证：带 HMAC 签名，校验 /day 与 /month 两处接口
// 覆盖点：
//   1. /day  -> computed.dahongsha / computed.hongsha
//   2. /day  -> goodGods 含「大红砂」（覆盖层注入）
//   3. /month-> 日项含 isDaHongSha / isHongSha（供日历角标）
'use strict';
var http = require('http');
var hmac = require('./lib/hmac.js');

var H = hmac.HEADER_NAMES;
var MID = 'verify-hongsha';

function post(path, body) {
  return new Promise(function (resolve, reject) {
    var ts = Date.now();
    var nonce = hmac.genNonce();
    var sig = hmac.sign(MID, ts, nonce, path);
    var payload = JSON.stringify(body || {});
    var req = http.request({
      host: 'localhost', port: 3000, path: path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        [H.MID]: MID, [H.TS]: String(ts), [H.NONCE]: nonce, [H.SIG]: sig
      }
    }, function (res) {
      var s = '';
      res.on('data', function (c) { s += c; });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, json: JSON.parse(s) }); }
        catch (e) { resolve({ status: res.statusCode, raw: s }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

var recs = [];
function rec(name, pass, info) {
  recs.push({ name: name, pass: pass });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' :: ' + info : ''));
}

// 玉匣记原版起法（独立参照实现，与被测代码解耦）
function daRule(mb, db) {
  var sp = { '寅': 1, '卯': 1, '辰': 1 }, su = { '巳': 1, '午': 1, '未': 1 };
  var au = { '申': 1, '酉': 1, '戌': 1 }, wi = { '亥': 1, '子': 1, '丑': 1 };
  if (sp[mb] && (db === '戌' || db === '子')) return true;
  if (su[mb] && (db === '辰' || db === '巳')) return true;
  if (au[mb] && (db === '午' || db === '未')) return true;
  if (wi[mb] && (db === '申' || db === '戌')) return true;
  return false;
}
function xiaoRule(mb, db) {
  var meng = { '寅': 1, '巳': 1, '申': 1, '亥': 1 };
  var zhong = { '卯': 1, '午': 1, '酉': 1, '子': 1 };
  var ji = { '辰': 1, '未': 1, '戌': 1, '丑': 1 };
  if (meng[mb] && db === '酉') return true;
  if (zhong[mb] && db === '巳') return true;
  if (ji[mb] && db === '丑') return true;
  return false;
}

(async function () {
  // ---- 1) /day 抽样：2026-02-05(寅月戌日=大红砂) / 2026-02-04(寅月酉日=小红砂) ----
  var cases = [
    { y: 2026, m: 2, d: 5, label: '大红砂日(寅月·戌日)' },
    { y: 2026, m: 2, d: 4, label: '小红砂日(寅月·酉日)' }
  ];
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var r = await post('/api/v1/calendar/day', { y: c.y, m: c.m, d: c.d });
    if (r.status !== 200 || !r.json || !r.json.ok) {
      rec('/day ' + c.label + ' 接口可用', false, 'status=' + r.status + ' ' + JSON.stringify(r.json || r.raw).slice(0, 120));
      continue;
    }
    var d = r.json.data;
    var mb = d.monthGZ[1], db = d.dayGZ[1];
    var expDa = daRule(mb, db), expXiao = xiaoRule(mb, db);
    rec('/day ' + c.label + ' dahongsha 字段正确',
      !!d.dahongsha === expDa, mb + '月' + db + '日 引擎=' + !!d.dahongsha + ' 期望=' + expDa);
    rec('/day ' + c.label + ' hongsha 字段正确',
      !!d.hongsha === expXiao, mb + '月' + db + '日 引擎=' + !!d.hongsha + ' 期望=' + expXiao);
    var inGood = (d.goodGods || []).indexOf('大红砂') >= 0;
    rec('/day ' + c.label + ' 「大红砂」注入 goodGods 正确',
      inGood === expDa && (d.badGods || []).indexOf('大红砂') < 0,
      'goodGods含=' + inGood + ' 期望=' + expDa);
  }

  // ---- 2) /month 全月：2026-02 逐日比对 isDaHongSha / isHongSha ----
  var mr = await post('/api/v1/calendar/month', { y: 2026, m: 2 });
  if (mr.status !== 200 || !mr.json || !mr.json.ok) {
    rec('/month 2026-02 接口可用', false, 'status=' + mr.status);
  } else {
    var days = mr.json.data.days || [];
    var daOk = 0, xiaoOk = 0, daCnt = 0, xiaoCnt = 0, mismatch = [];
    days.forEach(function (it) {
      var mb2 = it.gz.month[1], db2 = it.gz.day[1];
      var eD = daRule(mb2, db2), eX = xiaoRule(mb2, db2);
      if (!!it.isDaHongSha === eD) daOk++; else mismatch.push(2026 + '-2-' + it.d + ' 大红砂 ' + it.isDaHongSha + '/' + eD);
      if (!!it.isHongSha === eX) xiaoOk++; else mismatch.push(2026 + '-2-' + it.d + ' 小红砂 ' + it.isHongSha + '/' + eX);
      if (it.isDaHongSha) daCnt++;
      if (it.isHongSha) xiaoCnt++;
    });
    rec('/month isDaHongSha 全月一致', daOk === days.length, daOk + '/' + days.length + ' 天，标记 ' + daCnt + ' 天');
    rec('/month isHongSha 全月一致', xiaoOk === days.length, xiaoOk + '/' + days.length + ' 天，标记 ' + xiaoCnt + ' 天');
    rec('/month 存在大红砂标记日（非全空）', daCnt > 0, 'daCnt=' + daCnt);
    if (mismatch.length) console.log('  不一致明细: ' + mismatch.slice(0, 5).join(' | '));
  }

  var failed = recs.filter(function (x) { return !x.pass; });
  console.log('\n==== 红砂落地验证: ' + (recs.length - failed.length) + '/' + recs.length + ' 通过 ====');
  if (failed.length) { console.log('失败项: ' + failed.map(function (f) { return f.name; }).join(', ')); process.exit(1); }
})().catch(function (e) { console.error('测试异常:', e); process.exit(2); });
