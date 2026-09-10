'use strict';
// Phase 3.1 后端 CI：择日助手真实数据与评分校验
// 仅依赖真实 lunisolar 计算（yiActs/jiActs/goodGods/badGods/建除/小红砂/杨公忌），无捏造。
var cal = require('./routes/calendar.js');
var pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('✅ ' + msg); }
  else { fail++; console.log('❌ ' + msg); }
}

// 1) CHOOSE_EVENTS 结构
var EV = cal._CHOOSE_EVENTS;
ok(EV && typeof EV === 'object', '_CHOOSE_EVENTS 已导出');
var keys = Object.keys(EV || {});
ok(keys.length >= 10, '事项规则 >= 10 项（实际 ' + keys.length + '）');
keys.forEach(function(k) {
  var e = EV[k];
  ok(e && e.label && Array.isArray(e.yi) && Array.isArray(e.prefer) && Array.isArray(e.avoid),
     '事项「' + k + '」字段齐全(label/yi/prefer/avoid)');
});

// 2) _dayBundle 真实数据
var b = cal._dayBundle(2026, 10, 1);
ok(b && Array.isArray(b.yiActs) && Array.isArray(b.goodGods), '_dayBundle 返回真实宜忌/神煞数组');
ok(typeof b.jianChu === 'string' && b.jianChu.length > 0, '_dayBundle 含建除：' + (b && b.jianChu));

// 3) _chooseDays 对某月
var data = cal._chooseDays('jiahun', 2026, 10);
ok(data && data.total === 31, '2026-10 total=31（实际 ' + (data && data.total) + '）');
ok(data.days.length === 31, 'days 长度=31（实际 ' + (data && data.days.length) + '）');
ok(data.label && data.ref && Array.isArray(data.sources), '返回 label/ref/sources');

// 4) 每项为真实字段
var allFields = data.days.every(function(d) {
  return d && d.y === 2026 && d.m === 10 && d.d >= 1 && d.d <= 31 &&
    ['吉', '平', '忌'].indexOf(d.grade) >= 0 &&
    typeof d.score === 'number' && Array.isArray(d.reasons) &&
    d.gz && typeof d.gz.day === 'string' && typeof d.jianChu === 'string';
});
ok(allFields, '每一天含真实字段(y/m/d/grade/score/reasons/gz/建除)');

// 5) 排序：吉→平→忌，同级按 score 降序
var rank = { '吉': 0, '平': 1, '忌': 2 };
var sortedOK = true;
for (var i = 1; i < data.days.length; i++) {
  var a = data.days[i - 1], c = data.days[i];
  if (rank[a.grade] > rank[c.grade]) { sortedOK = false; break; }
  if (rank[a.grade] === rank[c.grade] && a.score < c.score) { sortedOK = false; break; }
}
ok(sortedOK, 'days 按 吉→平→忌 且同级 score 降序排序');

// 6) avoidDays 与 _dayBundle 交叉校验（无虚报）
var mismatch = 0;
data.avoidDays.forEach(function(ad) {
  var bb = cal._dayBundle(ad.y, ad.m, ad.d);
  var r = cal._scoreDay(bb, EV['jiahun']);
  if (!(r.universal || r.conflict)) mismatch++;
});
ok(mismatch === 0, 'avoidDays 中每日确实 universal||conflict（交叉校验 ' + data.avoidDays.length + ' 项，虚报 ' + mismatch + '）');

// 7) 反向：任何 universal||conflict 之日必进 avoidDays（无遗漏）
var avoidSet = {};
data.avoidDays.forEach(function(ad) { avoidSet[ad.y + '-' + ad.m + '-' + ad.d] = true; });
var missing = 0;
data.days.forEach(function(d) {
  var bb = cal._dayBundle(d.y, d.m, d.d);
  var r = cal._scoreDay(bb, EV['jiahun']);
  if ((r.universal || r.conflict) && !avoidSet[d.y + '-' + d.m + '-' + d.d]) missing++;
});
ok(missing === 0, '所有 universal||conflict 之日均进入 avoidDays（遗漏 ' + missing + '）');

// 8) 吉/平级候选均有理由文本
var emptyReason = data.days.filter(function(d) { return d.grade !== '忌' && d.reasons.length === 0; });
ok(emptyReason.length === 0, '吉/平 级候选均有理由文本（空理由 ' + emptyReason.length + '）');

// 9) 通用大煞机制：含「月破」判为 诸事不宜(忌)
var fake = { yiActs: [], jiActs: [], goodGods: [], badGods: ['月破'], jianChu: '定', isHongSha: false, isYanggongJi: false };
var fr = cal._scoreDay(fake, EV['jiahun']);
ok(fr.universal === true && fr.grade === '忌', '含「月破」之日判为 诸事不宜(忌)');

// 10) 不同事项返回不同结果（嫁娶 vs 动土 不应完全等同）
var d2 = cal._chooseDays('dongTu', 2026, 10);
var diff = data.days.some(function(d, idx) { return d2.days[idx] && d2.days[idx].grade !== d.grade; });
ok(diff, '不同事项评分结果不同（嫁娶 vs 动土 有差异）');

// 11) 非法事项 key 返回 null（路由层据此 400）
ok(cal._chooseDays('__nope__', 2026, 10) === null, '非法事项 key → _chooseDays 返回 null（路由转 400）');

console.log('\n[' + (fail === 0 ? 'CI OK' : 'CI FAIL') + '] 择日校验 ' + (fail === 0 ? '通过' : '失败') +
  '（pass=' + pass + ' fail=' + fail + '）');
process.exit(fail === 0 ? 0 : 1);
