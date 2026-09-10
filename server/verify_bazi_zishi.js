// 验证：八字排盘子时流派（夜子时/早子时）端到端集成（HMAC 调 /api/v1/bazi）— Phase 1.3
// 用法：node verify_bazi_zishi.js （需服务在 3000 运行，且已加载 #183 改动）
//
// 测试设计：
//  - 取无夏令时年份 1996（中国 1992 起已停夏令时），排除 DST 干扰，单独验证子时流派。
//  - 23:30 出生：
//      wan(夜子时,默认)：mingLiBaZi 已实现「23:00 起日柱换次日」→ 日柱=次日(07-02)柱；时柱=次日日干遁子时。
//      zao(早子时)：日柱=当日(07-01)柱（前推一日）；时柱=当日日干遁子时。
//      ⇒ 二者日柱、时柱均不同。
//  - 08:30 出生（非 23 点）：wan/zao 不应有差异（子时流派仅作用于 23:00–23:59）。
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
  let pass = true;

  // ── 用例 1：23:30 夜子时 vs 早子时（关键差异）──
  const wan = await postBazi({ y: 1996, m: 7, d: 1, h: 23, min: 30, jd: 116.4, wd: 39.9, dst: 'off', ziShi: 'wan' });
  const zao = await postBazi({ y: 1996, m: 7, d: 1, h: 23, min: 30, jd: 116.4, wd: 39.9, dst: 'off', ziShi: 'zao' });
  const dw = wan.data, dz = zao.data;
  console.log('[23:30] wan → ziShi=' + (dw && dw.ziShi) + ' day=' + (dw && dw.pillars.day) + ' hour=' + (dw && dw.pillars.hour));
  console.log('[23:30] zao → ziShi=' + (dz && dz.ziShi) + ' day=' + (dz && dz.pillars.day) + ' hour=' + (dz && dz.pillars.hour));

  const r1a = dw && dw.ziShi === 'wan' && dz && dz.ziShi === 'zao';
  const r1b = dw && dz && dw.pillars.day !== dz.pillars.day;       // 日柱应不同
  const r1c = dw && dz && dw.pillars.hour !== dz.pillars.hour;     // 时柱应不同（日干不同→子时天干不同）
  // 早子时的日柱应为夜子时日柱「前推一日」：夜子时日柱已=次日，早子时=当日
  console.log('  wan≠zao 日柱=' + r1b + ' 时柱=' + r1c + ' 字段回显=' + r1a);
  if (!(r1a && r1b && r1c)) pass = false;

  // ── 用例 2：08:30 非子时边界，两种流派必须一致 ──
  const wan2 = await postBazi({ y: 1996, m: 7, d: 1, h: 8, min: 30, jd: 116.4, wd: 39.9, dst: 'off', ziShi: 'wan' });
  const zao2 = await postBazi({ y: 1996, m: 7, d: 1, h: 8, min: 30, jd: 116.4, wd: 39.9, dst: 'off', ziShi: 'zao' });
  const dw2 = wan2.data, dz2 = zao2.data;
  console.log('[08:30] wan → day=' + (dw2 && dw2.pillars.day) + ' hour=' + (dw2 && dw2.pillars.hour));
  console.log('[08:30] zao → day=' + (dz2 && dz2.pillars.day) + ' hour=' + (dz2 && dz2.pillars.hour));
  const r2 = dw2 && dz2 && dw2.pillars.day === dz2.pillars.day && dw2.pillars.hour === dz2.pillars.hour;
  console.log('  08:30 wan==zao 一致=' + r2);
  if (!r2) pass = false;

  console.log(pass ? '✅ 子时流派端到端集成通过（23:30 两派日柱/时柱均异，08:30 两派一致）' : '❌ 子时流派端到端集成失败');
  process.exit(pass ? 0 : 1);
})();
