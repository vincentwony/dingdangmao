'use strict';
// 离线验证 web/js/detail-ui.js 真实函数：buildSsGroup 在给定 godsMeta 时是否产出
// title / data-tip / has-source / ss-tag-diff 标记，且非来源神煞不泄漏。
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'web', 'js', 'detail-ui.js'), 'utf8')
  .replace(/^\s*import .*$/gm, '')                 // 去 ES import
  .replace(/export default \{[^}]*\};?\s*$/, '');  // 去 ES export

// 在沙箱里执行模块，捕获真实函数
const factory = new Function(
  'document', 'window', 'State', 'API', '$', '_highlightFab',
  SRC + '\n;return { escAttr: escAttr, _metaTip: _metaTip, buildSsGroup: buildSsGroup };'
);
const stubDoc = { getElementById: () => null };
const stubWin = { _ssToggleMore: () => {}, toggleCardCollapse: () => {} };
const { buildSsGroup } = factory(stubDoc, stubWin, {}, {}, () => {}, () => {});

let fail = 0;
const log = (ok, m) => { console.log((ok ? '✅ ' : '❌ ') + m); if (!ok) fail++; };

const sampleMeta = {
  '兵吉': { xiejì: '《协纪辨方书·卷六·立成》', def: '正月子丑寅卯，逐月渐退一辰', diff: '整体偏移协纪', isDiff: true },
  '天吏': { xiejì: '《协纪辨方书·卷六/卷十》', def: '三合死气', diff: '多报其余死气支', isDiff: true },
  '天德': { xiejì: '《协纪辨方书》', def: '月德之阳', corrected: true, note: '覆盖 lunisolar 运行版「天德 isStem 逻辑反转」bug，已对齐协纪' }
};

// 吉神分组：含一个差异神煞(兵吉) + 一个已修正神煞(天德) + 一个非来源(天恩)
const html = buildSsGroup('◇ 吉神', 'good-title', ['兵吉', '天德', '天恩'], 'good-tag', sampleMeta);

log(/class="cosmic-ss-tag good-tag has-source"/.test(html), '来源神煞渲染 has-source 类');
log(/class="cosmic-ss-tag good-tag has-source is-corrected"/.test(html), '已修正神煞渲染 is-corrected 类');
log(/title="协纪出处：/.test(html), '含 title(协纪出处…) 供原生 tooltip');
log(/data-tip="协纪出处：/.test(html), '含 data-tip(协纪出处…) 供自定义浮层');
log(/<i class="ti ti-alert-triangle ss-tag-diff" aria-hidden="true"><\/i>/.test(html), '含「流派差异」小标记图标');
log(/<i class="ti ti-circle-check ss-tag-corrected" aria-hidden="true"><\/i>/.test(html), '含「已按协纪修正」绿勾标记');
log(html.indexOf('>兵吉<') >= 0 && html.indexOf('>天德<') >= 0 && html.indexOf('>天恩<') >= 0, '当日神煞名(兵吉/天德/天恩)均渲染');
log(!/天恩[^<]*has-source/.test(html) && !/title="协纪出处：[^"]*天恩/.test(html), '非来源神煞(天恩)不泄漏元数据');
log(/与运行版\(lunisolar\)差异：/.test(html), '差异神煞 tooltip 含「与运行版差异」说明');
log(/已按《协纪辨方书》修正：/.test(html), '已修正神煞 tooltip 含「已按协纪修正」说明');

console.log('\n' + (fail === 0 ? '[CI OK] detail-ui 渲染校验通过' : '[CI FAIL] ' + fail + ' 项未通过'));
process.exit(fail === 0 ? 0 : 1);
