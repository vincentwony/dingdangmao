// server/verify_hmac_fallback.js — 校验前端纯 JS HMAC 回退与 Node crypto 逐字节一致
// 背景：局域网 HTTP 属非安全上下文，crypto.subtle 不可用，前端改用 web/js/sha256.js 回退。
// 该回退一旦与服务端算法有任何偏差，全部请求将 401。故此脚本纳入 CI（npm run test:hmac-fallback）。
'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var os = require('os');

var SRC = path.join(__dirname, '..', 'web', 'js', 'sha256.js');

(async function main() {
  // ESM 源码需以 .mjs 载入（项目根无 "type":"module"）
  var tmp = path.join(os.tmpdir(), 'sha256_verify_' + Date.now() + '.mjs');
  fs.copyFileSync(SRC, tmp);

  var mod;
  try {
    mod = await import('file://' + tmp.replace(/\\/g, '/'));
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) {}
  }

  var hmacSha256Hex = mod.hmacSha256Hex;
  var KEY = '381cb51f0923fc771bf7e81547c485f7';

  var cases = [
    '',
    'a',
    'abc',
    'deadbeef1754130000000abc1234/api/v1/calendar/month',
    'deadbeef' + Date.now() + 'a1b2c3d4/api/v1/ziwei/astrolabe',
    '中文 UTF-8 多字节测试 🀄',
    'x'.repeat(55),   // 单块边界 -1
    'x'.repeat(56),   // 触发双块 padding
    'x'.repeat(63),
    'x'.repeat(64),   // 恰好一块
    'x'.repeat(65),
    'y'.repeat(1000)  // 多块
  ];

  // 密钥长度边界：短于块长 / 恰好块长 / 长于块长（需先摘要）
  var keys = [KEY, 'k', 'K'.repeat(64), 'L'.repeat(65), 'M'.repeat(200)];

  var fail = 0, total = 0;

  keys.forEach(function (k) {
    cases.forEach(function (msg) {
      total++;
      var expected = crypto.createHmac('sha256', k).update(msg, 'utf8').digest('hex');
      var actual = hmacSha256Hex(k, msg);
      if (expected !== actual) {
        fail++;
        console.log('MISMATCH keyLen=' + k.length + ' msgLen=' + msg.length);
        console.log('  expected: ' + expected);
        console.log('  actual  : ' + actual);
      }
    });
  });

  // 纯 SHA-256 交叉验证（含官方测试向量）
  var sha256Bytes = mod.sha256Bytes, utf8Bytes = mod.utf8Bytes, bytesToHex = mod.bytesToHex;
  var shaCases = ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '中文测试'];
  shaCases.forEach(function (s) {
    total++;
    var expected = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
    var actual = bytesToHex(sha256Bytes(utf8Bytes(s)));
    if (expected !== actual) {
      fail++;
      console.log('SHA MISMATCH len=' + s.length + '\n  exp: ' + expected + '\n  act: ' + actual);
    }
  });

  // 实际签名场景：与 server/lib/hmac.js sign() 前 8 位比对
  var hmacLib = require('./lib/hmac');
  for (var i = 0; i < 50; i++) {
    total++;
    var mid = crypto.randomBytes(4).toString('hex');
    var ts = Date.now() + i;
    var nonce = crypto.randomBytes(4).toString('hex');
    var p = '/api/v1/calendar/day';
    var expSig = hmacLib.sign(mid, ts, nonce, p);
    var actSig = hmacSha256Hex(KEY, String(mid) + String(ts) + String(nonce) + String(p)).substring(0, 8);
    if (expSig !== actSig) {
      fail++;
      console.log('SIGN MISMATCH exp=' + expSig + ' act=' + actSig);
    }
  }

  console.log('\n=== HMAC fallback verify ===');
  console.log('total cases : ' + total);
  console.log('mismatches  : ' + fail);
  console.log(fail === 0 ? 'RESULT: PASS (与 Node crypto 逐字节一致)' : 'RESULT: FAIL');
  process.exit(fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('verify error:', e);
  process.exit(1);
});
