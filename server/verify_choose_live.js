'use strict';
// 端到端探针：HMAC 签名访问 POST /api/v1/calendar/choose，确认 Express 路由已接入且返回真实结构。
// 会自动重试若干次（用于等待服务重启后监听就绪）。
const http = require('http');
const hmac = require('./lib/hmac.js');

const MID = 'verify-bot';
const PATH = '/api/v1/calendar/choose';
const BODY = JSON.stringify({ event: 'jiahun', y: 2026, m: 10 });

function postOnce() {
  return new Promise((resolve, reject) => {
    const ts = Date.now();            // 毫秒，与中间件 Date.now() 同单位
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
  let lastErr = null;
  for (let i = 0; i < 12; i++) {
    try {
      const { status, body } = await postOnce();
      if (status !== 200) {
        console.log('HTTP', status, body.slice(0, 200));
        process.exit(1);
      }
      const json = JSON.parse(body);
      const d = json.data || {};
      const ok = d.days && d.days.length === 31 && d.total === 31 && d.label && Array.isArray(d.sources);
      console.log('HTTP', status, '| 事项:', d.label, '| 当月天数:', d.total, '| 候选/排序日:', d.days.length, '| 诸事不宜:', (d.avoidDays || []).length);
      const top = (d.days || [])[0];
      if (top) console.log('榜首:', top.y + '-' + top.m + '-' + top.d, '等级:', top.grade, '理由:', (top.reasons || []).join('；'));
      console.log(ok ? '[OK] /calendar/choose 端到端通过' : '[FAIL] 结构异常');
      process.exit(ok ? 0 : 1);
    } catch (e) {
      lastErr = e.message;
      await new Promise(r => setTimeout(r, 600));
    }
  }
  console.error('请求失败（服务可能未启动或 /choose 未加载）:', lastErr);
  process.exit(1);
})();
