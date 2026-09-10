// verify/_time_util_audit.mjs — time-util 双运行时单测（CI 固化）
// 直接读取真实 ESM 源文件，用 data: URL 导入，零临时文件、测的就是线上代码。
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// —— ESM (前端) 真实源文件，data URL 导入 ——
const src = readFileSync(join(__dirname, '..', 'web', 'js', 'time-util.js'), 'utf8');
const ESM = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const { parseClockTime, toShiChenIndex, normalizeMinute } = ESM;

// —— CJS (后端) 镜像，直接 require ——
const CJS = require('../server/lib/time-util.js');
const { normalizeHour, normalizeMinute: normalizeMinuteCJS } = CJS;

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  console.log(`${ok ? '✅' : '❌'} ${name}: got=${JSON.stringify(got)} exp=${JSON.stringify(exp)}`);
  ok ? pass++ : fail++;
}

eq('ESM parseClockTime 00:30', parseClockTime('00:30'), { h: 0, min: 30 });
eq('ESM parseClockTime 08:30', parseClockTime('08:30'), { h: 8, min: 30 });
eq('ESM parseClockTime 23:30', parseClockTime('23:30'), { h: 23, min: 30 });
eq('ESM parseClockTime 12:00', parseClockTime('12:00'), { h: 12, min: 0 });
eq('ESM parseClockTime 空串兜底', parseClockTime(''), { h: 12, min: 0 });
eq('ESM parseClockTime 非法兜底', parseClockTime('abc'), { h: 12, min: 0 });
eq('ESM toShiChen 00:30(子)', toShiChenIndex(0, 30), 1);
eq('ESM toShiChen 08:30(辰)', toShiChenIndex(8, 30), 5);
eq('ESM toShiChen 12:00(午)', toShiChenIndex(12, 0), 6);
eq('ESM toShiChen 23:30(晚子)', toShiChenIndex(23, 30), 0);

eq('CJS normalizeHour 0 保留', normalizeHour(0, 12), 0);
eq('CJS normalizeHour undefined→12', normalizeHour(undefined, 12), 12);
eq('CJS normalizeHour "08"→8', normalizeHour('08', 12), 8);
eq('CJS normalizeHour 25→兜底', normalizeHour(25, 12), 12);
eq('CJS normalizeHour ""→0', normalizeHour('', 0), 0);
eq('CJS toShiChen 镜像一致', CJS.toShiChenIndex(0, 30), 1);

// —— 分钟回归（2026-07-15）：分钟 24-59 必须保留，严禁用 normalizeHour 解析分钟 ——
eq('CJS normalizeMinute 0 保留', normalizeMinuteCJS(0, 0), 0);
eq('CJS normalizeMinute 30 保留', normalizeMinuteCJS(30, 0), 30);
eq('CJS normalizeMinute 55 保留', normalizeMinuteCJS(55, 0), 55);
eq('CJS normalizeMinute 59 保留', normalizeMinuteCJS(59, 0), 59);
eq('CJS normalizeMinute 60→兜底', normalizeMinuteCJS(60, 0), 0);
eq('CJS normalizeMinute undefined→0', normalizeMinuteCJS(undefined, 0), 0);
eq('ESM normalizeMinute 55 保留', normalizeMinute(55, 0), 55);
eq('ESM normalizeMinute 30 保留', normalizeMinute(30, 0), 30);
// 关键：此前误用 normalizeHour(body.min,0)，55 被钳成兜底值（说明绝不能用于分钟）
eq('CJS normalizeHour(55)被钳成兜底(证明不可用于分钟)', normalizeHour(55, 0), 0);
eq('CJS normalizeMinute(55)≠normalizeHour(55)', normalizeMinuteCJS(55, 0) !== normalizeHour(55, 0), true);

console.log(`\n单测结果: ${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exit(1);
