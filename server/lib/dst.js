// 中国夏令时（1986–1991）官方区间表与墙上时间 → 标准时校准
//
// 依据：国务院办公厅每年发布「关于在全国实行夏时制的通知」。全国统一实行 6 年：
//   1986 起：当年 5 月 4 日；之后每年约 4 月中旬起，至 9 月中旬止。
//   起始日凌晨 2:00 将钟表拨快 1 小时（→3:00），结束日凌晨 2:00 拨回 1 小时（→1:00）。
//   1992 年起暂停实行。
// 故「夏令时期间」出生的「北京时间(钟表)」实际相当于 UTC+9；减去 1 小时方为真实标准时(UTC+8)，
// 八字干支应按标准时(真太阳时之前)排定。
//
// 说明：以下以「日」为判定单位（临界凌晨 2:00 前后约 2 小时属边界，UI 已提供手动覆盖选项）。
// 校准函数使用 Date.UTC 将「墙上时间当作 UTC」再减 1h 取回分量，可正确跨月/跨年/跨日。

var DST_RANGES = [
  { y: 1986, sm: 5,  sd: 4,  em: 9, ed: 14 },
  { y: 1987, sm: 4,  sd: 12, em: 9, ed: 13 },
  { y: 1988, sm: 4,  sd: 10, em: 9, ed: 11 },
  { y: 1989, sm: 4,  sd: 16, em: 9, ed: 17 },
  { y: 1990, sm: 4,  sd: 15, em: 9, ed: 16 },
  { y: 1991, sm: 4,  sd: 14, em: 9, ed: 15 }
];

/** 该公历日期是否处于某年夏令时区间（按「日」判定） */
function isDST(y, m, d) {
  if (!y) return false;
  var cur = m * 100 + d;
  for (var i = 0; i < DST_RANGES.length; i++) {
    var r = DST_RANGES[i];
    if (y !== r.y) continue;
    var s = r.sm * 100 + r.sd;
    var e = r.em * 100 + r.ed;
    if (cur >= s && cur <= e) return true;
  }
  return false;
}

/**
 * 将「墙上钟表时间(北京时间)」按夏令时规整为「真实标准时」墙上值。
 * @param {number} y,m,d,h,min 用户输入的出生日期（此处按公历含义处理）+ 钟表时刻
 * @param {string} dstMode 'auto'(默认,区间内减) | 'on'(信任用户,强制减) | 'off'(不减)
 * @returns {{y,m,d,h,min,applied:boolean,inRange:boolean}}
 */
function applyDST(y, m, d, h, min, dstMode) {
  var mode = dstMode || 'auto';
  var inRange = isDST(y, m, d);
  if (mode === 'off') {
    return { y: y, m: m, d: d, h: h, min: min, applied: false, inRange: inRange };
  }
  var doApply = (mode === 'on') || (mode === 'auto' && inRange);
  if (!doApply) {
    return { y: y, m: m, d: d, h: h, min: min, applied: false, inRange: inRange };
  }
  // 真实标准时 = 钟表时间 − 1h。用 Date.UTC 把墙上时间当 UTC，减 3600s 后取回分量（跨日安全）。
  var wallMs = Date.UTC(y, m - 1, d, h, min, 0);
  var stdMs = wallMs - 3600 * 1000;
  var dt = new Date(stdMs);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    h: dt.getUTCHours(),
    min: dt.getUTCMinutes(),
    applied: true,
    inRange: inRange
  };
}

module.exports = { DST_RANGES: DST_RANGES, isDST: isDST, applyDST: applyDST };
