import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const crypto = require('crypto');
const fs = require('fs');

const SECRET = '381cb51f0923fc771bf7e81547c485f7';
const URL = '/api/v1/bazi';

async function getProject(y, m, d, h, min, sex, jd = 120, wd = 39.9) {
  const body = JSON.stringify({ name: '', sex, calType: 'gongli', y, m, d, h, min, jd, wd, isLeap: false });
  const mid = 'audit', ts = Date.now(), nonce = String(Math.floor(Math.random() * 1e6));
  const sig = crypto.createHmac('sha256', SECRET).update(mid + ts + nonce + URL, 'utf8').digest('hex').slice(0, 8);
  const r = await fetch('http://127.0.0.1:3000' + URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-machine-id': mid, 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig },
    body
  });
  const j = await r.json();
  return j.data;
}

function getLibs(y, m, d, h, min, sex) {
  const out = {};
  // --- lunar-javascript (confirmed API) ---
  try {
    const { Solar } = require('lunar-javascript');
    const ec = Solar.fromYmdHms(y, m, d, h, min, 0).getLunar().getEightChar();
    out.lunarjs = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
  } catch (e) { out.lunarjs = 'ERR ' + e.message; }
  // --- mystilight-8char (src entry) ---
  try {
    const m8path = require.resolve('mystilight-8char/src/index.js');
    const m8 = require(m8path);
    const api = m8.getCurrentEightCharJSON || (m8.default && m8.default.getCurrentEightCharJSON);
    const r = api({ year: y, month: m, day: d, hour: h, minute: min, sect: 2, gender: (sex === '男' ? 1 : 0) });
    out.mysti = [r.pillars.year.value, r.pillars.month.value, r.pillars.day.value, r.pillars.hour.value];
  } catch (e) { out.mysti = 'ERR ' + e.message; }
  // --- lunisolar + char8ex plugin ---
  try {
    require('lunisolar/plugins/char8ex');
    const lunisolar = require('lunisolar');
    const lsr = lunisolar(y, m, d, h, min);
    const ex = lsr.char8.char8ex(sex === '男' ? '乾' : '坤');
    const g = (p) => (p && p.stem && p.branch) ? (p.stem + p.branch) : (p ? String(p) : '?');
    out.lunisolar = [g(ex.year), g(ex.month), g(ex.day), g(ex.hour)];
  } catch (e) { out.lunisolar = 'ERR ' + e.message; }
  return out;
}

function cmp(name, proj, libs) {
  const names = ['年', '月', '日', '时'];
  let line = name + '  PROJ=' + proj.join('') ;
  for (const k of ['lunarjs', 'mysti', 'lunisolar']) {
    const v = libs[k];
    if (Array.isArray(v)) line += ' | ' + k + '=' + v.join('');
    else line += ' | ' + k + '=' + v;
  }
  // mismatch detection
  const refs = ['lunarjs', 'mysti', 'lunisolar'].map(k => libs[k]).filter(Array.isArray);
  let mismatch = [];
  for (let i = 0; i < 4; i++) {
    const vals = refs.map(r => r[i]);
    const uniq = [...new Set(vals)];
    if (uniq.length > 1 || (refs.length && proj[i] !== uniq[0])) {
      // project differs from consensus, or refs disagree
      mismatch.push(names[i]);
    }
  }
  if (mismatch.length) line += '  <== 差异@[' + mismatch.join(',') + ']';
  return line;
}

(async () => {
  const cases = [
    // 正常时辰
    [1990, 5, 15, 14, 30, '男', '午时'],
    [1984, 8, 20, 10, 15, '男', '巳时'],
    [1988, 2, 17, 12, 0, '女', '午时'],
    [1976, 7, 28, 3, 42, '男', '寅时'],
    // 子时/午时边界
    [2000, 1, 1, 0, 30, '男', '早子时(应壬子)'],
    [2000, 1, 1, 12, 30, '男', '午时(应戊午)'],
    [1984, 8, 20, 0, 15, '男', '早子时'],
    [1995, 12, 31, 23, 30, '男', '晚子时(应庚子)'],
    [1990, 5, 15, 23, 45, '男', '晚子时'],
    [1990, 5, 15, 1, 5, '男', '丑时']
  ];
  for (const [y, m, d, h, min, sex, note] of cases) {
    const p = await getProject(y, m, d, h, min, sex);
    const proj = [p.pillars.year, p.pillars.month, p.pillars.day, p.pillars.hour];
    const libs = getLibs(y, m, d, h, min, sex);
    console.log('\n=== ' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ' ' + sex + ' (' + note + ') ===');
    console.log(cmp('四柱', proj, libs));
  }
})();
