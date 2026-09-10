// web/js/time-util.js — 时辰解析共享工具（红线 9：单一真源）
//
// ⚠️ 严禁在业务代码里写 `parseInt(x) || 12` 这类写法：
//   午夜 00:xx 的小时是合法值 0，但 `0 || 12` 会被误判为正午（h=12），
//   导致午夜出生被算成午时。这是 2026-07 反复出现、跨文件复发的反模式。
//   一律用 isNaN 守卫，保留 0 的合法值。
//
// 本模块与 server/lib/time-util.js（CommonJS 镜像）语义完全一致，
// 修改时必须同步两边。

/**
 * 解析 "HH:MM" 时钟字符串 → { h, min }
 * @param {string} str  形如 "08:30" / "00:30" / "23:30"
 * @param {{h?:number, min?:number}} [fallback] 解析失败时的兜底（默认 h=12 午时, min=0）
 * @returns {{h:number, min:number}} h∈[0,23], min∈[0,59]
 */
export function parseClockTime(str, fallback = { h: 12, min: 0 }) {
  const parts = String(str == null ? '' : str).split(':');
  const hRaw = parseInt(parts[0], 10);
  const mRaw = parseInt(parts[1], 10);
  let h = Number.isNaN(hRaw) ? (fallback.h != null ? fallback.h : 12) : hRaw;
  let min = Number.isNaN(mRaw) ? (fallback.min != null ? fallback.min : 0) : mRaw;
  if (h < 0 || h > 23) h = fallback.h != null ? fallback.h : 12;
  if (min < 0 || min > 59) min = fallback.min != null ? fallback.min : 0;
  return { h, min };
}

/**
 * 规范化数值小时：保留 h=0（午夜/早子时），缺失或非法时回退兜底值。
 * 用于后端直接收到数字小时（而非 "HH:MM"）的场景。
 * @param {number|string} h
 * @param {number} [fallback=12]
 * @returns {number}
 */
export function normalizeHour(h, fallback = 12) {
  const n = Number(h);
  if (Number.isNaN(n) || n < 0 || n > 23) return fallback;
  return n;
}

/**
 * 规范化数值分钟：保留 min=0，缺失或非法时回退兜底值。
 * 注意：分钟取值范围 0-59，与 normalizeHour(0-23) 不同，严禁混用！
 * 此前曾误用 normalizeHour(body.min, 0) 解析分钟，导致 24-59 分被钳成 0
 * （约 60% 真实出生时刻算错），见 2026-07-15 复盘。
 * @param {number|string} min
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function normalizeMinute(min, fallback = 0) {
  const n = Number(min);
  if (Number.isNaN(n) || n < 0 || n > 59) return fallback;
  return n;
}

/**
 * 时(0-23)+分 → 十二时辰序号(0-12)
 * 现行惯例：adj = h + (min>=30 ? 1 : 0)；序号 = floor(((adj+1) % 24) / 2)
 * @param {number} h
 * @param {number} min
 * @returns {number}
 */
export function toShiChenIndex(h, min) {
  const hh = Number.isNaN(Number(h)) ? 12 : Number(h);
  const mm = Number.isNaN(Number(min)) ? 0 : Number(min);
  const adj = hh + (mm >= 30 ? 1 : 0);
  return Math.floor(((adj + 1) % 24) / 2);
}
