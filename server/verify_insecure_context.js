// server/verify_insecure_context.js — 模拟「非安全上下文」端到端验证
//
// 复现用户故障：手机扫码经局域网 HTTP 访问时 crypto.subtle === undefined，
// 旧版 api.js 直接调用导致签名抛异常 → 全部 API 请求失败。
// 本脚本抹掉 crypto.subtle，加载真实 web/js/api.js，验证：
//   1) 签名自动回退纯 JS 且结果正确
//   2) 用该签名实打服务端接口能拿到 200
// CI: npm run test:insecure
'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');
var nodeCrypto = require('crypto');

var WEB_JS = path.join(__dirname, '..', 'web', 'js');
var PORT = process.env.PORT || 3000;

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src).forEach(function (f) {
    var s = path.join(src, f);
    if (fs.statSync(s).isFile() && /\.js$/.test(f)) {
      fs.copyFileSync(s, path.join(dst, f));
    }
  });
}

(async function main() {
  var tmp = path.join(os.tmpdir(), 'insecure_ctx_' + Date.now());
  copyDir(WEB_JS, tmp);
  // 让 Node 以 ESM 解析这些 .js
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));

  // ── 模拟浏览器非安全上下文 ──
  var store = {};
  globalThis.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  // Node 22 的 globalThis.navigator 是只读 getter，必须用 defineProperty 覆盖
  Object.defineProperty(globalThis, 'navigator', {
    value: { hardwareConcurrency: 8, deviceMemory: 8, language: 'zh-CN' },
    configurable: true, writable: true
  });
  globalThis.screen = { width: 390, height: 844 };
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'isSecureContext', {
    value: false, configurable: true, writable: true
  });

  // 关键：暴露 getRandomValues 但抹掉 subtle —— 完全复刻 HTTP 局域网下的浏览器行为
  var fakeCrypto = {
    getRandomValues: function (arr) {
      var b = nodeCrypto.randomBytes(arr.length);
      for (var i = 0; i < arr.length; i++) arr[i] = b[i];
      return arr;
    }
    // 注意：故意不提供 subtle
  };
  Object.defineProperty(globalThis, 'crypto', {
    value: fakeCrypto, configurable: true, writable: true
  });

  var fail = 0;
  function check(label, ok, extra) {
    console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (extra ? '  ' + extra : ''));
    if (!ok) fail++;
  }

  console.log('=== 非安全上下文模拟（crypto.subtle 已抹除）===');
  check('crypto.subtle 确实不可用', typeof crypto.subtle === 'undefined');

  var mod;
  try {
    mod = await import('file://' + path.join(tmp, 'api.js').replace(/\\/g, '/'));
  } catch (e) {
    console.log('  FAIL  api.js 加载失败: ' + e.message);
    process.exit(1);
  }
  var API = mod.API;
  check('api.js 成功加载', !!API);
  check('签名后端自动回退 PureJS', API.signBackend() === 'PureJS', '实际=' + API.signBackend());

  // ── 1. 固定向量签名正确性 ──
  var hmacLib = require('./lib/hmac');
  var VEC = { mid: 'diagtest', ts: 1700000000000, nonce: 'abcd1234', p: '/api/v1/calendar/month' };
  var expected = hmacLib.sign(VEC.mid, VEC.ts, VEC.nonce, VEC.p);
  var actual = await API._sign(VEC.mid, VEC.ts, VEC.nonce, VEC.p);
  check('固定向量签名与服务端一致', actual === expected, 'exp=' + expected + ' act=' + actual);

  // ── 2. 随机向量批量比对 ──
  var mismatch = 0;
  for (var i = 0; i < 100; i++) {
    var mid = nodeCrypto.randomBytes(4).toString('hex');
    var ts = Date.now() + i;
    var nonce = nodeCrypto.randomBytes(4).toString('hex');
    var p = '/api/v1/ziwei/astrolabe';
    var a = await API._sign(mid, ts, nonce, p);
    if (a !== hmacLib.sign(mid, ts, nonce, p)) mismatch++;
  }
  check('100 组随机签名全部一致', mismatch === 0, 'mismatch=' + mismatch);

  // ── 3. 实打活接口（真实 HTTP，验证服务端接受该签名）──
  console.log('\n=== 实打活接口（用非安全上下文生成的签名）===');
  var base = 'http://127.0.0.1:' + PORT;
  var tests = [
    ['万年历·月', '/calendar/month', { y: 2026, m: 8 }],
    ['万年历·日', '/calendar/day', { y: 2026, m: 8, d: 2 }],
    ['八字排盘', '/bazi', { y: 1982, m: 5, d: 10, h: 12, min: 20, sex: '男' }],
    ['紫微排盘', '/ziwei/astrolabe', { y: 1982, m: 5, d: 10, h: 12, min: 20, sex: '男' }]
  ];

  // api.js 内部用 fetch（Node 22 原生支持），但 BASE 是相对路径，需补全 origin
  var origFetch = globalThis.fetch;
  globalThis.fetch = function (url, opt) {
    if (typeof url === 'string' && url.charAt(0) === '/') url = base + url;
    return origFetch(url, opt);
  };

  for (var t = 0; t < tests.length; t++) {
    var label = tests[t][0], p2 = tests[t][1], body = tests[t][2];
    try {
      var r = await API.post(p2, body);
      check(label, !!(r && r.ok), 'took=' + (r.took || '?') + 'ms');
    } catch (e2) {
      check(label, false, e2.message);
    }
  }

  // 清理
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e3) {}

  console.log('\n=== 结果 ===');
  console.log(fail === 0
    ? 'PASS — 非安全上下文（局域网 HTTP / 手机扫码）下签名与全部接口均正常'
    : 'FAIL — ' + fail + ' 项未通过');
  process.exit(fail === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('verify error:', e);
  process.exit(1);
});
