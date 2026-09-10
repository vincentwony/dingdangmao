// scripts/smoke-ziwei.mjs — L1.5 紫微 vanilla 模块冒烟测试
// 用 jsdom 模拟 DOM，import 真实 ziwei-ui.js，mock API.post 返回命盘，
// 断言 show() 渲染出 4×4 命盘且不崩（回归之前 _lsGet 缺失导致回退日历的 bug）
import { JSDOM } from 'jsdom';
import assert from 'node:assert';

const dom = new JSDOM('<!DOCTYPE html><html><body>'
  + '<div id="cal-root"></div>'
  + '<div id="bazi-root" style="display:none"></div>'
  + '<div id="ziwei-vanilla-root" style="display:none"></div>'
  + '</body></html>', { url: 'http://localhost:3000/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.HTMLElement = dom.window.HTMLElement;

var fails = 0;
function check(name, cond) {
  if (cond) { console.log('  ✓ ' + name); }
  else { console.log('  ✗ ' + name); fails++; }
}
function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// ── mock 命盘（12 宫覆盖 12 地支，落 4×4 边缘环位）──
const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
function mockAstrolabe() {
  var palaces = [];
  for (var i = 0; i < 12; i++) {
    palaces.push({
      index: i, name: NAMES[i], earthlyBranch: BRANCHES[i], heavenlyStem: '甲',
      isBodyPalace: i === 0,
      decadal: { range: [i * 10, i * 10 + 9], heavenlyStem: '甲', earthlyBranch: BRANCHES[i] },
      ages: [i * 10 + 6, i * 10 + 18],
      majorStars: (i % 2 === 0) ? [{ name: '紫微', mutagen: '', type: 'major' }] : [],
      minorStars: [{ name: '文昌', mutagen: '' }],
      adjectiveStars: [{ name: '红鸾' }],
      changsheng12: '长生', boshi12: '博士'
    });
  }
  var meta = {
    gender: '男', solarDate: '1990-5-15', lunarDate: '一九九〇年四月廿一',
    chineseDate: '庚午 辛巳 庚辰 甲申', time: '申时', timeRange: '15:00-17:00',
    sign: '金牛', zodiac: '马', earthlyBranchOfBodyPalace: '丑', earthlyBranchOfSoulPalace: '酉',
    soul: '文曲', body: '火星', fiveElementsClass: '水二局'
  };
  return { ok: true, data: { meta: meta, palaces: palaces } };
}
function mockHoroscope() {
  return { ok: true, data: {
    decadal: { index: 3, mutagen: ['紫微', '天机', '太阳', '武曲'], stars: Array.from({ length: 12 }, function () { return []; }) },
    yearly: { index: 1, mutagen: ['天机', '天梁', '紫微', '太阴'], stars: Array.from({ length: 12 }, function () { return []; }) },
    age: { index: 0, value: 6, mutagen: [] }
  } };
}

(async function() {
  try {
    const api = await import('file:///H:/Phone/web/js/api.js');
    const mod = await import('file:///H:/Phone/web/js/ziwei-ui.js');

    // mock API.post（show() 内 _autoCalcIfReady → _calc 会调用）
    api.API.post = async function() { return mockAstrolabe(); };

    check('模块导出 show()', typeof mod.show === 'function');

    // 关键回归：show() 同步部分不得抛错（之前 _lsGet 缺失会崩 → 被路由 .catch 回退日历）
    let threw = false;
    try { mod.show(); } catch (e) { threw = true; console.log('    show() 抛错: ' + e.message); }
    check('show() 不抛错（不回退日历）', !threw);

    const root = document.getElementById('ziwei-vanilla-root');
    check('vanilla-root 已显示', root && root.style.display === 'block');
    check('日历区已隐藏（未回退）', document.getElementById('cal-root').style.display === 'none');

    // 等待异步渲染（_calc 是 async）
    await delay(150);

    const chart = document.getElementById('zw-chart');
    check('命盘网格已渲染', !!chart);

    const palaces = document.querySelectorAll('.zw-palace');
    check('12 宫全部渲染 (实际 ' + palaces.length + ')', palaces.length === 12);

    const info = document.querySelector('.zw-info-card');
    check('信息卡存在', !!info);
    check('信息卡跨中央 2×2 (grid-row 2/4)', info && info.style.gridRow === '2 / 4');
    check('信息卡跨中央 2×2 (grid-column 2/4)', info && info.style.gridColumn === '2 / 4');

    // 中央 2×2 不应有宫位（12 宫都在边缘环位）
    let centerConflict = 0;
    palaces.forEach(function(p) {
      var r = p.style.gridRow, c = p.style.gridColumn;
      if ((r === '2 / 3' || r === '3 / 4') && (c === '2 / 3' || c === '3 / 4')) centerConflict++;
    });
    check('中央 2×2 无宫位冲突 (' + centerConflict + ')', centerConflict === 0);

    // 信息卡显示五行局/命主
    check('信息卡含五行局', info && info.innerHTML.indexOf('水二局') >= 0);
    check('信息卡含命主', info && info.innerHTML.indexOf('文曲') >= 0);

    // 点击宫位 → 详情
    if (palaces[0]) {
      palaces[0].dispatchEvent(new dom.window.Event('click'));
      const detail = document.getElementById('zw-detail');
      check('点击宫位渲染详情', detail && detail.innerHTML.indexOf('命宫') >= 0);
    }

    // 运限切换（大限）
    api.API.post = async function(path) {
      if (path === '/ziwei/horoscope') return mockHoroscope();
      return mockAstrolabe();
    };
    const scopeBtn = document.querySelector('.zw-scope-btn[data-scope="decadal"]');
    check('运限 tab 存在', !!scopeBtn);
    if (scopeBtn) {
      scopeBtn.dispatchEvent(new dom.window.Event('click'));
      await delay(100);
      const scopeInfo = document.getElementById('zw-scope-info');
      check('大限信息已显示', scopeInfo && scopeInfo.innerHTML.indexOf('大限') >= 0);
      // 切换回本命，确认不崩
      const nativeBtn = document.querySelector('.zw-scope-btn[data-scope="native"]');
      if (nativeBtn) {
        nativeBtn.dispatchEvent(new dom.window.Event('click'));
        await delay(20);
        check('切回本命不崩', document.querySelectorAll('.zw-palace').length === 12);
      }
    }

    console.log('\n' + (fails === 0 ? '✅ 紫微 L1.5 全部通过' : '❌ 失败 ' + fails + ' 项'));
    process.exit(fails === 0 ? 0 : 1);
  } catch (e) {
    console.error('SMOKE CRASH:', e);
    process.exit(2);
  }
})();
