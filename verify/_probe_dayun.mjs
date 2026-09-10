import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const crypto = require('crypto');

const SECRET = '381cb51f0923fc771bf7e81547c485f7';
const URL = '/api/v1/bazi';
async function getProject(y, m, d, h, min, sex) {
  const body = JSON.stringify({ name: '', sex, calType: 'gongli', y, m, d, h, min, jd: 120, wd: 39.9, isLeap: false });
  const mid = 'audit', ts = Date.now(), nonce = String(Math.floor(Math.random() * 1e6));
  const sig = crypto.createHmac('sha256', SECRET).update(mid + ts + nonce + URL, 'utf8').digest('hex').slice(0, 8);
  const r = await fetch('http://127.0.0.1:3000' + URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-machine-id': mid, 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig }, body });
  return (await r.json()).data;
}
function getMysti(y, m, d, h, min, sex) {
  const m8 = require('mystilight-8char/src/index.js');
  const api = m8.getCurrentEightCharJSON || (m8.default && m8.default.getCurrentEightCharJSON);
  return api({ year: y, month: m, day: d, hour: h, minute: min, sect: 2, gender: (sex === '男' ? 1 : 0) });
}

(async () => {
  const cases = [
    [1990, 5, 15, 14, 30, '男'],
    [1988, 2, 17, 12, 0, '女'],
    [1984, 8, 20, 10, 15, '男']
  ];
  for (const [y, m, d, h, min, sex] of cases) {
    const p = await getProject(y, m, d, h, min, sex);
    const du = p.dayun || {};
    const projDY = (du.dyg || []).map((g, i) => g + (du.dyz ? du.dyz[i] : ''));
    const projAge = du.dys || [];
    const projYear = du.dyn || [];
    const mt = getMysti(y, m, d, h, min, sex);
    console.log('\n=== ' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ' ' + sex + ' ===');
    console.log('PROJ 大运(干支|起龄|年起):');
    for (let i = 0; i < 6; i++) console.log('   ' + (i + 1) + '. ' + projDY[i] + ' | ' + projAge[i] + '岁 | ' + projYear[i] + '年');
    console.log('MYSTI dayunArr[0..5]:');
    try {
      const da = mt.dayunArr || [];
      for (let i = 0; i < 6; i++) {
        const e = da[i];
        console.log('   ' + (i + 1) + '. ' + JSON.stringify(e));
      }
    } catch (e) { console.log('   mysti dayun err', e.message); }
    console.log('PROJ qnian(起运):', du.qnian, '| MYSTI startAge:', mt.currentYun && mt.currentYun.startAge);
  }
})();
