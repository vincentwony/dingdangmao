'use strict';
// 端到端探针：HMAC 签名访问 POST /api/v1/calendar/day，确认响应含 godsMeta 且当日命中差异神煞。
const http = require('http');
const hmac = require('./lib/hmac.js');

const MID = 'verify-bot';
const PATH = '/api/v1/calendar/day';
const BODY = JSON.stringify({ y: 2026, m: 1, d: 4 });

function tsNonce() {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = hmac.genNonce();
  const sig = hmac.sign(MID, ts, nonce, PATH);
  return { ts, nonce, sig };
}

function post() {
  return new Promise((resolve, reject) => {
    // 在同一 tick 内签名并发送，避免时间戳滑出校验窗口（ts 须为毫秒，与中间件 Date.now() 同单位）
    const ts = Date.now();
    const nonce = hmac.genNonce();
    const sig = hmac.sign(MID, ts, nonce, PATH);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(BODY),
      [hmac.HEADER_NAMES.MID]: MID,
      [hmac.HEADER_NAMES.TS]: String(ts),
      [hmac.HEADER_NAMES.NONCE]: nonce,
      [hmac.HEADER_NAMES.SIG]: sig
    };
    const req = http.request({ host: '127.0.0.1', port: 3000, path: PATH, method: 'POST', headers }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(BODY);
    req.end();
  });
}

(async () => {
  try {
    const { status, body } = await post();
    console.log('HTTP', status);
    if (status !== 200) { console.log(body); process.exit(1); }
    const json = JSON.parse(body);
    const d = json.data || {};
    console.log('goodGods 数:', (d.goodGods || []).length, ' badGods 数:', (d.badGods || []).length);
    const meta = d.godsMeta || {};
    const mk = Object.keys(meta);
    console.log('godsMeta 命中数:', mk.length);
    if (mk.length) {
      console.log('示例:', mk.slice(0, 6).join('、'));
      console.log('样例 tooltip 文本 (兵吉):', meta['兵吉'] ? JSON.stringify(meta['兵吉']) : '(今日无兵吉)');
    } else {
      console.log('（今日 2026-09-07 未命中任何差异神煞，godsMeta={} 仍正确返回）');
    }
    process.exit(0);
  } catch (e) {
    console.error('请求失败:', e.message);
    process.exit(1);
  }
})();
