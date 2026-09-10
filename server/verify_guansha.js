// server/verify_guansha.js
// 小儿关煞规则库审计 + 样本八字验证（CI: npm run test:guansha）
//
// 校验内容：
//   1) 结构完整性：三十六关 idx 1..36 唯一、七十二煞子集 16 条且均标「民俗衍生」、正统子平 10 日干齐全
//   2) 黄金样本：针对「仅男命主凶」「年纳音配时支」「三合局配时支」「空亡叠加」等关键点做断言
//   3) 可选 HTTP 冒烟：若服务在 3000 端口可达，带 HMAC 调 /api/v1/bazi 校验 xiaoErGuanSha 字段
//
// 注：设计文档原标注文件名为 verify/_guansha_audit.mjs，此处遵循本仓库既有 verify_*.js
//     (CommonJS, node 直接运行) 约定落地为 server/verify_guansha.js，便于 `npm run test:guansha` 守护。

'use strict';
var g = require('./lib/guansha-rules.js');
var hmac = require('./lib/hmac');
var crypto = require('crypto');

var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function gzToIdx(gg, zz) {
  for (var i = 0; i < 60; i++) if (GAN[i % 10] === gg && ZHI[i % 12] === zz) return i;
  return -1;
}
function makeOb(y, m, d, h, sex) {
  return {
    b1: gzToIdx(y[0], y[1]), b2: gzToIdx(m[0], m[1]), b3: gzToIdx(d[0], d[1]), b4: gzToIdx(h[0], h[1]),
    bz_jn: y, bz_jy: m, bz_jr: d, bz_js: h, sex: sex
  };
}
function names(arr) { return (arr || []).map(function (x) { return x.name; }); }

var pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg); }
  else { fail++; console.log('  ❌ ' + msg); }
}

console.log('═══ 一、结构完整性 ═══');
(function () {
  ok(g.GUANSHA_36.length === 36, '三十六关数量 = 36（实际 ' + g.GUANSHA_36.length + '）');
  var ids = g.GUANSHA_36.map(function (x) { return x.idx; }).sort(function (a, b) { return a - b; });
  var uniq = ids.filter(function (v, i) { return ids.indexOf(v) === i; });
  ok(JSON.stringify(ids) === JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]), 'idx 连续唯一 1..36');
  var names36 = names(g.GUANSHA_36);
  ok(names36.filter(function (v, i) { return names36.indexOf(v) === i; }).length === 36, '三十六关名称无重复');
  ok(g.GUANSHA_36.every(function (x) { return x.test && typeof x.test === 'function'; }), '每关均有 test 谓词');
  ok(g.GUANSHA_36.every(function (x) { return x.yiYi && x.jiHou && x.chu && x.conf; }), '每关均有 寓意/忌讳/出处/可信度');

  ok(g.GUANSHA_72.length === 16, '七十二煞子集数量 = 16（实际 ' + g.GUANSHA_72.length + '）');
  ok(g.GUANSHA_72.every(function (x) { return (x.conf || '').indexOf('民俗衍生') >= 0; }), '七十二煞子集全部标注「民俗衍生」');
  var n72 = names(g.GUANSHA_72);
  ok(n72.filter(function (v, i) { return n72.indexOf(v) === i; }).length === 16, '七十二煞名称无重复');

  ok(Object.keys(g.ZT_TABLE).length === 10, '正统子平表含 10 日干');
  ok(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].every(function (k) { return g.ZT_TABLE[k]; }), '十干无缺漏');
})();

console.log('═══ 二、黄金样本断言 ═══');
function compute(y, m, d, h, sex) { return g.computeXiaoErGuanSha(makeOb(y, m, d, h, sex), sex); }

// 1) 将军箭：仅男命主凶 —— 女命不计入（分男女，不混为一谈）
(function () {
  var male = compute('庚子', '甲寅', '甲子', '癸酉', 1);
  var female = compute('庚子', '甲寅', '甲子', '癸酉', 0);
  ok(names(male.minjian36).indexOf('将军箭') >= 0, '将军箭：春月酉时男命命中');
  var mj = male.minjian36.filter(function (x) { return x.name === '将军箭'; })[0];
  ok(mj && mj.sexNote && mj.sexNote.indexOf('仅男命主凶') >= 0, '将军箭：命中带「仅男命主凶」标注');
  ok(mj && mj.applySex === 'male' && mj.sexLabel === '男命专属', '将军箭：性别标签=男命专属');
  ok(names(female.minjian36).indexOf('将军箭') < 0, '将军箭：同盘女命【不计入】凶煞名单（仅男命主凶）');
  ok(names(female.minjian72).indexOf('将军煞') < 0, '将军煞：女命因将军箭不命中，连带不出现（男命专属衍生）');
  ok(male.sexText === '乾造·男命' && female.sexText === '坤造·女命', '返回结果含性别文本（乾造/坤造）');
})();

// 1b) 阎王关：女命偏重(重)、男命较轻(中) —— 按性别定级，不混为一谈
(function () {
  var male = compute('庚子', '甲寅', '甲子', '乙丑', 1);   // 春(寅月) + 丑时
  var female = compute('庚子', '甲寅', '甲子', '乙丑', 0);
  var ym = male.minjian36.filter(function (x) { return x.name === '阎王关'; })[0];
  var yf = female.minjian36.filter(function (x) { return x.name === '阎王关'; })[0];
  ok(ym && ym.sexWeight === '男命较轻' && ym.level === '中', '阎王关：男命→较轻(中)');
  ok(yf && yf.sexWeight === '女命偏重' && yf.level === '重', '阎王关：女命→偏重(重)');
  ok(ym && ym.applySex === 'female' && ym.sexLabel === '女命偏重', '阎王关：性别标签=女命偏重');
})();

// 2) 白虎关：年纳音火 + 子时
(function () {
  var r = compute('戊子', '甲寅', '甲子', '甲子', 1);
  ok(names(r.minjian36).indexOf('白虎关') >= 0, '白虎关：戊子（霹雳火）年 + 子时命中');
})();

// 3) 取命关：甲日 + 申子辰时
(function () {
  var r = compute('庚子', '甲寅', '甲子', '壬申', 1);
  ok(names(r.minjian36).indexOf('取命关') >= 0, '取命关：甲日 + 申时命中');
})();

// 4) 百日关：寅月 + 辰时
(function () {
  var r = compute('庚子', '甲寅', '甲子', '戊辰', 1);
  ok(names(r.minjian36).indexOf('百日关') >= 0, '百日关：寅月 + 辰时命中');
})();

// 5) 天吊关：年支子（申子辰局）→ 巳时
(function () {
  var r = compute('庚子', '甲寅', '甲子', '辛巳', 1);
  ok(names(r.minjian36).indexOf('天吊关') >= 0, '天吊关：子年（水局）+ 巳时命中');
})();

// 6) 千日关：午年 + 寅时（年支视角）
(function () {
  var r = compute('庚午', '甲寅', '甲子', '戊寅', 1);
  ok(names(r.minjian36).indexOf('千日关') >= 0, '千日关：午年 + 寅时命中（年支视角）');
})();

// 7) 千日关：甲乙日 + 午时（日干视角）
(function () {
  var r = compute('庚子', '甲寅', '甲子', '戊午', 1);
  ok(names(r.minjian36).indexOf('千日关') >= 0, '千日关：甲日 + 午时命中（日干视角）');
})();

// 8) 空亡煞：年/时支入日空亡 + 已犯关
(function () {
  var r = compute('庚子', '甲寅', '甲子', '甲戌', 1); // 甲子日空亡戌亥，戌时
  ok(names(r.minjian72).indexOf('空亡煞') >= 0, '空亡煞：戌时入甲子日空亡(戌亥) + 已犯关命中');
  ok(names(r.minjian36).indexOf('鸡飞关') >= 0 && names(r.minjian36).indexOf('休庵关') >= 0, '空亡煞前提：辰戌丑未时关（鸡飞/休庵）命中');
})();

// 9) 冲天煞 + 千日关 同盘：午年(火局) + 寅时
(function () {
  var r = compute('庚午', '甲寅', '甲子', '戊寅', 1);
  ok(names(r.minjian72).indexOf('冲天煞') >= 0, '冲天煞：午年（火局）+ 寅时命中');
  ok(names(r.minjian36).indexOf('千日关') >= 0, '同盘叠加：千日关亦命中');
})();

// 10) 正统子平：丙日七杀壬(水)1/6、偏财辛(金)4/9
(function () {
  var r = compute('庚子', '甲寅', '丙子', '甲子', 1);
  var z = r.zhengtong[0];
  ok(z && z.guan === '壬' && JSON.stringify(z.guanXian) === JSON.stringify([1, 6]), '正统子平：丙日七杀壬、关限 1/6');
  ok(z && z.sha === '辛' && JSON.stringify(z.shaXian) === JSON.stringify([4, 9]), '正统子平：丙日偏财辛、煞限 4/9');
  ok(z.shenQiangRuo === '身强' || z.shenQiangRuo === '身弱', '正统子平：身强身弱判定产出「' + (z && z.shenQiangRuo) + '」');
})();

console.log('═══ 三、可选 HTTP 冒烟（需服务在 :3000） ═══');
(async function () {
  try {
    var url = 'http://localhost:3000/api/v1/bazi';
    var body = JSON.stringify({ name: '测试', sex: '男', calType: 'gongli', y: 2020, m: 3, d: 10, h: 12, min: 0, jd: 116.4, wd: 39.9 });
    var ts = Date.now(), nonce = crypto.randomBytes(4).toString('hex');
    var sig = hmac.sign('audit', ts, nonce, '/api/v1/bazi');
    var r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json',
        'x-machine-id': 'audit', 'x-timestamp': ts, 'x-nonce': nonce, 'x-signature': sig },
      body: body
    });
    var j = await r.json();
    if (j.ok && j.data && j.data.xiaoErGuanSha) {
      console.log('  ✅ HTTP 冒烟：xiaoErGuanSha 已返回，36=' + j.data.xiaoErGuanSha.total36 + ' 72=' + j.data.xiaoErGuanSha.total72);
      pass++;
    } else {
      console.log('  ❌ HTTP 冒烟：响应异常 ' + JSON.stringify(j).slice(0, 160));
      fail++;
    }
  } catch (e) {
    console.log('  ⏭  HTTP 冒烟跳过（服务不可达）：' + e.message);
  }

  console.log('══════════════════════════');
  console.log('审计结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail === 0 ? 0 : 1);
})();
