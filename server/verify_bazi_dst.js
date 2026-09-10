// 验证：八字排盘夏令时端到端集成（HMAC 调 /api/v1/bazi）— Phase 1.2
// 用法：node verify_bazi_dst.js （需服务在 3000 运行）
const http = require('http');
const hmac = require('./lib/hmac.js');
const MID = 'verify-client';

function postBazi(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const path = '/api/v1/bazi';
    const ts = Date.now();
    const nonce = hmac.genNonce();
    const sig = hmac.sign(MID, ts, nonce, path);
    const opt = {
      host: 'localhost', port: 3000, path: path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-machine-id': MID, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': sig,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(opt, (res) => {
      let s = ''; res.on('data', d => s += d); res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({ raw: s }); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data); req.end();
  });
}

(async () => {
  // 1987-07-01 23:30 处于夏令时区间深夜：标准时应为 22:30。
  // 钟表 23:30 为「子时」(戊子)；标准时 22:30 为「亥时」(癸亥)。时柱应不同；日柱不跨日相同。
  const a = await postBazi({ y: 1987, m: 7, d: 1, h: 23, min: 30, jd: 116.4, wd: 39.9, dst: 'auto' });
  const b = await postBazi({ y: 1987, m: 7, d: 1, h: 23, min: 30, jd: 116.4, wd: 39.9, dst: 'off' });
  const da = a.data, db = b.data;
  console.log('auto → dstApplied=' + (da && da.dstApplied) + ' day=' + (da && da.pillars.day) + ' hour=' + (da && da.pillars.hour));
  console.log('off  → dstApplied=' + (db && db.dstApplied) + ' day=' + (db && db.pillars.day) + ' hour=' + (db && db.pillars.hour));
  const ok = da && da.dstApplied === true && db && db.dstApplied === false && da.pillars.hour !== db.pillars.hour;
  console.log(ok ? '✅ 端到端 DST 集成通过（减 1h 后日柱随标准时变化）' : '❌ 端到端 DST 集成失败');
  process.exit(ok ? 0 : 1);
})();
