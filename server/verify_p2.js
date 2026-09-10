// server/verify_p2.js
// P2 验证：格局卡从格预检与统一从格同源 + bz_wuxing 卡统一 + 上游死代码移除后逻辑无破坏
// 运行：npm run test:p2
'use strict';
const core = require('gongxin-core');
const u = require('./lib/bazi-unified.js');

function gz(g, z) { for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return n; throw new Error('bad gz ' + g + ' ' + z); }
function mk(a, b, c, d, e, f, g, h) {
  return { b1: gz(a, b), b2: gz(c, d), b3: gz(e, f), b4: gz(g, h), bz_jn: 'x', bz_jy: 'x', bz_jr: 'x', bz_js: 'x' };
}

var pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } }

console.log('═══ P2 验证 ═══');

// 1) 旺极：甲子四柱
var oW = mk(0, 0, 0, 0, 0, 0, 0, 0);
var dW = u.getCongGeData(oW);
ok('旺极 isCong', dW.isCong === true);
ok('旺极 riHasBenQiRoot 字段存在', typeof dW.riHasBenQiRoot === 'boolean');
ok('旺极 riHasTianGanHelp 字段存在', typeof dW.riHasTianGanHelp === 'boolean');

// 2) 弱极：己巳 己巳 甲戌 己巳
var oR = mk(5, 5, 5, 5, 0, 10, 5, 5);
var dR = u.getCongGeData(oR);
ok('弱极 isCong', dR.isCong === true);
ok('弱极 congType 含「真从弱」', dR.congType.indexOf('真从弱') >= 0);

// 3) 格局卡 从格预检一致性（模拟路由：ob._congGeData = unified）
oW._congGeData = u.getCongGeData(oW);
var gejuW = core.determineBaziPattern(oW);
ok('格局卡(旺极) 含统一 congType', gejuW.indexOf(dW.congType) >= 0);
ok('格局卡(旺极) 含「从格判定依据」段落', gejuW.indexOf('从格判定依据') >= 0);

oR._congGeData = u.getCongGeData(oR);
var gejuR = core.determineBaziPattern(oR);
ok('格局卡(弱极) 含统一 congType', gejuR.indexOf(dR.congType) >= 0);

// 4) 非从格：甲日寅月（应走正格，不与从格卡冲突）
var oN = mk(0, 2, 0, 2, 0, 2, 0, 2); // 甲寅月柱
var dN = u.getCongGeData(oN);
ok('甲日寅月 非从格', dN.isCong === false);
// 模拟路由：ob._congGeData 已设为统一源（否则上游 _getCongGeData 会回退到存在 wxToGan bug 的 _computeCongGeData 而崩溃）
oN._congGeData = u.getCongGeData(oN);
var gejuN = core.determineBaziPattern(oN);
ok('格局卡(非从格) 不进入从格分支', gejuN.indexOf('从格判定依据') < 0);

// 5) getWuxingCard 统一输出
var wxc = u.getWuxingCard(oW);
ok('getWuxingCard 含「统一判定」标记', wxc.indexOf('统一判定') >= 0);
ok('getWuxingCard 含加权得分表', wxc.indexOf('加权得分') >= 0);
ok('getWuxingCard 含阴阳干分布', wxc.indexOf('阳木') >= 0);
ok('getWuxingCard 已无旧 wuxingRadar canvas', wxc.indexOf('wuxingRadar') < 0);
// 五行力量与 getWuxing 同源
var w = u.getWuxing(oW);
ok('getWuxingCard 数据源自 getWuxing', wxc.indexOf(String(w.scores[0])) >= 0);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail === 0 ? 0 : 1);
