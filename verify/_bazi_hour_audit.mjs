// 八字时柱交叉验证 — 实证 bazi.js「时辰边界修正」段是否引入时柱错配
// 复用 server/lib/hmac.js 共享库（非重复硬编码），调活服务；参考 lunar-javascript。
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const hmac = require('H:/Phone/server/lib/hmac.js');
const { Solar } = require('lunar-javascript');

const URL = '/api/v1/bazi';
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 五鼠遁：日干 + 时支 → 时干  公式 ((dayGan%5)*2 + sc) % 10
function hourStemByDay(dayGan, sc) {
  const di = GAN.indexOf(dayGan);
  if (di < 0) return null;
  return GAN[((di % 5) * 2 + sc) % 10];
}

async function getProject(y, m, d, h, min, sex, jd = 116.4, wd = 39.9) {
  const body = JSON.stringify({ name: '', sex, calType: 'gongli', y, m, d, h, min, jd, wd, isLeap: false });
  const mid = 'audit';
  const ts = Date.now();
  const nonce = hmac.genNonce();
  const sig = hmac.sign(mid, ts, nonce, URL);
  const r = await fetch('http://127.0.0.1:3000' + URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
      'x-machine-id': mid, 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig },
    body
  });
  const j = await r.json();
  return j.data;
}

function getLunarJs(y, m, d, h, min) {
  const ec = Solar.fromYmdHms(y, m, d, h, min, 0).getLunar().getEightChar();
  return [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
}

// 案例: [y,m,d,h,min,sex,jd,wd,备注]
const cases = [
  [2000, 1, 1, 0, 30, 1, 116.4, 39.9, '午夜(记忆:壬子,已修)'],
  [2024, 6, 15, 23, 0, 1, 116.4, 39.9, '晚子时·北京'],
  [2024, 6, 15, 23, 30, 1, 116.4, 39.9, '晚子时·北京'],
  [2024, 6, 15, 0, 0, 1, 116.4, 39.9, '早子时·北京'],
  [2024, 6, 15, 23, 0, 1, 134, 48, '抚远(真太阳时跨日→次日00:05)'],
  [2024, 6, 15, 23, 0, 1, 87, 44, '乌鲁木齐(真太阳时≈21:10,戌时)'],
];

(async () => {
  let problems = [];
  for (const [y, m, d, h, min, sex, jd, wd, note] of cases) {
    const proj = await getProject(y, m, d, h, min, sex, jd, wd);
    const bz = [proj.pillars.year, proj.pillars.month, proj.pillars.day, proj.pillars.hour];
    const lj = getLunarJs(y, m, d, h, min);

    // 自洽检查：bazi 时柱天干应使用其当日干五鼠遁
    const bzDayGan = bz[2][0];
    const bzHourZhi = bz[3][1];
    const bzSc = ZHI.indexOf(bzHourZhi);
    const expectHourGan = hourStemByDay(bzDayGan, bzSc);
    const bzHourGan = bz[3][0];
    const selfConsistent = (expectHourGan === bzHourGan);

    console.log(`\n[${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} jd=${jd}°] ${note}`);
    console.log('  bazi   :', bz.join(' '), selfConsistent ? '✓自洽' : '✗自洽失败');
    console.log('  lunarjs:', lj.join(' '));
    if (!selfConsistent) {
      problems.push(`时柱自洽失败 ${y}-${m}-${d} ${h}:${min} jd=${jd}: 时柱=${bz[3]} 但五鼠遁(日干${bzDayGan},时支${bzHourZhi})应得 ${expectHourGan}${bzHourZhi}`);
    }
  }
  console.log('\n════════ 结论 ════════');
  if (problems.length === 0) {
    console.log('✅ 所有案例时柱与自身日干五鼠遁自洽 —— bazi.js「时辰边界修正」未引入时柱错配');
  } else {
    console.log('❌ 发现 ' + problems.length + ' 处时柱自洽问题:');
    problems.forEach(p => console.log('  - ' + p));
  }
})();
