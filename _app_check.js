// web/js/app.js — 应用入口：初始化 + 模块加载
// 首屏加载路由 + 日历，其余模块懒加载

import { State } from './state.js';
import { Router } from './router.js';
import { _highlightFab, _updateTopNavHeight, $, $$ } from './dom-helpers.js';

// ══════ 导航事件绑定 ══════
function initNavigation() {
  // 首页（落地项，等价于万年历视图）
  $('#tabHome').addEventListener('click', function() {
    Router.navigate('home');
  });

  // 萬历
  $('#tabCalendar').addEventListener('click', function() {
    Router.navigate('calendar');
  });

  // 年历
  $('#tabNianli').addEventListener('click', function() {
    Router.navigate('nianli');
  });

  // 八字
  $('#tabBazi').addEventListener('click', function() {
    Router.navigate('bazi');
  });

  // 紫微斗数
  $('#tabZiwei').addEventListener('click', function() {
    Router.navigate('ziwei');
  });

  // 记事
  $('#tabNote').addEventListener('click', function() {
    Router.navigate('note');
  });

  // 设置 — 由内联脚本 window.toggleSettingsPanel 直接处理，不走路由
}

// ══════ 路由处理 ═════=
function initRoutes() {
  Router.register('home', function() {
    _highlightFab('tabHome');
    showHomePage();
  });

  Router.register('calendar', function() {
    _highlightFab('tabCalendar');
    hideHome();
    showCalendarPage();
  });

  Router.register('nianli', function() {
    _highlightFab('tabNianli');
    hideHome();
    loadModule('nianli').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('bazi', function() {
    _highlightFab('tabBazi');
    hideHome();
    loadModule('bazi').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('ziwei', function() {
    _highlightFab('tabZiwei');
    _closeDetailIfOpen();
    hideHome();
    showZiweiPage();
  });

  Router.register('note', function() {
    _highlightFab('tabNote');
    hideHome();
    loadModule('note').then(function(mod) {
      if (mod && mod.openForSelected) mod.openForSelected();
    });
  });

  Router.register('settings', function() {
    _highlightFab('tabSettings');
    _closeDetailIfOpen();
    hideHome();
    // 由内联脚本 window.toggleSettingsPanel 直接处理
    if (window.toggleSettingsPanel) window.toggleSettingsPanel();
  });
}

// ══════ 页面显示 ══════
function showCalendarPage() {
  // 恢复主应用顶栏（紫微 iframe 中会隐藏）
  var topNav0 = document.querySelector('.top-nav');
  if (topNav0) topNav0.style.display = '';
  // 显示日历区，隐藏八字区和紫微区
  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'block';
  var baziRoot = document.getElementById('bazi-root');
  if (baziRoot) baziRoot.style.display = 'none';
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  // 清理旧的八字结果区域
  var oldArea = document.getElementById('baziResultArea');
  if (oldArea) oldArea.remove();
  // 恢复日历头部（年历模式会隐藏）
  var calHeaderBar = document.getElementById('calHeaderBar');
  if (calHeaderBar) calHeaderBar.style.display = '';
  var FTLN = document.getElementById('FTLN');
  if (FTLN) FTLN.style.display = '';
  // 关闭详情浮层（可能还开着）
  _closeDetailIfOpen();
  State.emit('page:changed', 'calendar');
}

/** 显示首页落地视图（品牌 + 功能入口 + 选日期） */
function showHomePage() {
  var home = document.getElementById('home-root');
  if (home) home.style.display = 'block';
  // 隐藏其它根容器
  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'none';
  var baziRoot = document.getElementById('bazi-root');
  if (baziRoot) baziRoot.style.display = 'none';
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  // 关闭详情浮层（可能还开着）
  _closeDetailIfOpen();
  State.emit('page:changed', 'home');
}

/** 隐藏首页落地视图 */
function hideHome() {
  var home = document.getElementById('home-root');
  if (home) home.style.display = 'none';
}

/** 显示紫微斗数（iframe 覆盖层，React 通过 URL 参数读取表单） */
function showZiweiPage() {
  var params = [];
  try {
    var nameEl = document.getElementById('Name_input');
    var sexEl = document.getElementById('Sex_input');
    var calEl = document.getElementById('gnlsel');
    var yEl = document.getElementById('Cml_y'), mEl = document.getElementById('Cml_m');
    var dEl = document.getElementById('Cml_d'), hisEl = document.getElementById('Cml_his');

    // React 参数名 → 八字表单字段
    // d=生日(YYYY-M-D)  t=时辰(0-12)  g=性别(male/female)  type=历法(solar/lunar)  n=姓名
    if (yEl && yEl.value && mEl && mEl.value && dEl && dEl.value) {
      params.push('d=' + encodeURIComponent(yEl.value + '-' + mEl.value + '-' + dEl.value));
    }
    if (hisEl && hisEl.value) {
      var parts = hisEl.value.split(':');
      var hh = parseInt(parts[0]) || 12, mm = parseInt(parts[1]) || 0;
      var adj = hh + (mm >= 30 ? 1 : 0);
      params.push('t=' + (Math.floor(((adj + 1) % 24) / 2)));
    }
    if (sexEl) params.push('g=' + (sexEl.value === '0' ? 'female' : 'male'));
    if (calEl) params.push('type=' + (calEl.value === '0' ? 'lunar' : 'solar'));
    if (nameEl && nameEl.value) params.push('n=' + encodeURIComponent(nameEl.value));
  } catch(e) { console.warn('[app] showZiweiPage 数据收集失败:', e.message); }

  var ziweiRoot = document.getElementById('ziwei-root');
  var iframe = document.getElementById('ziwei-iframe');

  // iframe 加载失败处理（10 秒超时）
  var loadTimer = setTimeout(function() {
    if (ziweiRoot.style.display === 'block') {
      console.warn('[app] 紫微 iframe 加载超时');
      if (window.showToast) window.showToast('紫微加载超时，请稍后重试', 'warn');
      closeZiweiPage();
    }
  }, 10000);
  iframe.addEventListener('load', function() { clearTimeout(loadTimer); }, { once: true });
  iframe.addEventListener('error', function() {
    clearTimeout(loadTimer);
    if (window.showToast) window.showToast('紫微加载失败', 'error');
    closeZiweiPage();
  }, { once: true });
  var qs = params.length > 0 ? '?' + params.join('&') : '';

  // zh-CN 放在 path 中（React 路由 /:lng?/astrolabe 从路径取语言参数）
  iframe.src = '/ziwei/' + '#/zh-CN/astrolabe' + qs;

  ziweiRoot.style.display = 'block';
  // 隐藏主应用顶栏，让紫微 App 自己的导航（查盘/统计/语言）可见
  var topNav = document.querySelector('.top-nav');
  if (topNav) topNav.style.display = 'none';
  // 隐藏其他页面
  var calRoot = document.getElementById('cal-root');
  var baziRoot = document.getElementById('bazi-root');
  if (calRoot) calRoot.style.display = 'none';
  if (baziRoot) baziRoot.style.display = 'none';
  State.emit('page:changed', 'ziwei');

  // ESC 键关闭紫微 iframe
  document.addEventListener('keydown', _onZiweiEsc);
}

/** 关闭紫微斗数 iframe */
function closeZiweiPage() {
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  var iframe = document.getElementById('ziwei-iframe');
  if (iframe) iframe.src = '';
  document.removeEventListener('keydown', _onZiweiEsc);
  // 恢复主应用顶栏
  var topNav = document.querySelector('.top-nav');
  if (topNav) topNav.style.display = '';
  showCalendarPage();
}

/** ESC 键关闭紫微 */
function _onZiweiEsc(e) {
  if (e.key === 'Escape') closeZiweiPage();
}

/** 关闭详情浮层（如果开着） */
function _closeDetailIfOpen() {
  var overlay = document.querySelector('.detail-panel-overlay.show');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// ══════ 懒加载模块 ══════
var _moduleCache = {};
var _moduleLoaders = {
  calendar: function() { return import('./calendar-ui.js'); },
  bazi: function() { return import('./bazi-ui.js'); },
  detail: function() { return import('./detail-ui.js'); },
  note: function() { return import('./note-ui.js'); },
  nianli: function() { return import('./nianli-ui.js'); },
  settings: function() { return import('./settings-ui.js'); },
  archive: function() { return import('./archive-ui.js'); }
};

function loadModule(name) {
  if (_moduleCache[name]) return Promise.resolve(_moduleCache[name]);

  var loader = _moduleLoaders[name];
  if (!loader) return Promise.resolve(null);

  return loader().then(function(mod) {
    // 动态 import 返回模块命名空间，default 导出在 .default 属性
    var actual = (mod && mod.default) ? mod.default : mod;
    _moduleCache[name] = actual;
    return actual;
  }).catch(function(e) {
    console.error('[app] 模块加载失败 [' + name + ']:', e);
    return null;
  });
}

// ══════ 首页落地视图初始化（入口卡片 + 选日期） ══════
function initHome() {
  var home = document.getElementById('home-root');
  if (!home) return;

  // 功能入口卡片 → 路由跳转
  home.querySelectorAll('.home-entry').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var nav = btn.getAttribute('data-nav');
      if (nav) Router.navigate(nav);
    });
  });

  // 选日期下拉初始化
  var ySel = document.getElementById('homeY');
  var mSel = document.getElementById('homeM');
  var dSel = document.getElementById('homeD');
  if (!ySel || !mSel || !dSel) return;
  var now = new Date();
  var curY = now.getFullYear(), curM = now.getMonth() + 1, curD = now.getDate();

  for (var y = curY - 5; y <= curY + 5; y++) {
    var oy = document.createElement('option');
    oy.value = y; oy.textContent = y + ' 年';
    if (y === curY) oy.selected = true;
    ySel.appendChild(oy);
  }
  for (var m = 1; m <= 12; m++) {
    var om = document.createElement('option');
    om.value = m; om.textContent = m + ' 月';
    if (m === curM) om.selected = true;
    mSel.appendChild(om);
  }
  function fillDays() {
    var y = parseInt(ySel.value, 10), m = parseInt(mSel.value, 10);
    var dim = new Date(y, m, 0).getDate();
    var prev = parseInt(dSel.value, 10) || curD;
    if (prev > dim) prev = dim;
    dSel.innerHTML = '';
    for (var d = 1; d <= dim; d++) {
      var od = document.createElement('option');
      od.value = d; od.textContent = d + ' 日';
      if (d === prev) od.selected = true;
      dSel.appendChild(od);
    }
  }
  ySel.addEventListener('change', fillDays);
  mSel.addEventListener('change', fillDays);
  fillDays();

  var go = document.getElementById('homeGo');
  if (go) {
    go.addEventListener('click', function() {
      var y = parseInt(ySel.value, 10), m = parseInt(mSel.value, 10), d = parseInt(dSel.value, 10);
      Router.navigate('calendar');
      try { State.emit('home:goto-date', { y: y, m: m, d: d }); } catch (e) {}
    });
  }
}

// ══════ 页脚：源流浮层 ══════
function initFooter() {
  var foot = $('#pageFoot');
  var src = $('#footSrc');
  var pop = $('#footPop');
  if (!foot || !src || !pop) return;

  var hideTimer = null;
  function openPop() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    pop.classList.add('open');
    pop.removeAttribute('hidden');
    src.setAttribute('aria-expanded', 'true');
  }
  function closePop() {
    pop.classList.remove('open');
    src.setAttribute('aria-expanded', 'false');
    hideTimer = setTimeout(function() {
      if (!pop.classList.contains('open')) pop.setAttribute('hidden', '');
    }, 240);
  }

  src.addEventListener('click', function(e) {
    e.stopPropagation();
    if (pop.classList.contains('open')) closePop(); else openPop();
  });
  // 点击浮层外部淡出
  document.addEventListener('click', function(e) {
    if (!pop.classList.contains('open')) return;
    if (pop.contains(e.target) || src.contains(e.target)) return;
    closePop();
  });
  // ESC 关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && pop.classList.contains('open')) closePop();
  });
}

// ══════ 响应式测量 ══════
function initResponsive() {
  _updateTopNavHeight();
  window.addEventListener('resize', _updateTopNavHeight);
  // 字体加载完成后重新测量
  if (document.fonts) {
    document.fonts.ready.then(_updateTopNavHeight);
  }
}

// ══════ 主题初始化 ═════=
function initTheme() {
  // 由 settings-ui.js 的 initTheme() 处理
  // 先做最小初始化，settings 模块加载后完善
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.body.classList.add('dark');
    }
  } catch(e) {
    document.body.classList.add('dark');
  }
}

// ══════ 启动 ══════
(async function boot() {
  try {
    window._dbg && window._dbg('app.js boot 开始', true);
    initTheme();
    window._dbg && window._dbg('initTheme OK', true);
    initFooter();
    window._dbg && window._dbg('initFooter OK', true);
    initResponsive();
    window._dbg && window._dbg('initResponsive OK', true);
    initNavigation();
    initHome();
    window._dbg && window._dbg('initNavigation OK', true);
    initRoutes();
    window._dbg && window._dbg('initRoutes OK', true);

    // 并行加载三个首屏模块（note → 日历红点，calendar → 首屏必需，detail → 详情浮层）
    var modules = await Promise.all([
      loadModule('note'),
      loadModule('calendar'),
      loadModule('detail')
    ]);
    var noteMod = modules[0], calMod = modules[1], detailMod = modules[2];

    if (noteMod && noteMod.init) {
      noteMod.init();
    }

    if (calMod && calMod.init) {
      if (noteMod && noteMod.DailyNotes && calMod.setDailyNotes) {
        calMod.setDailyNotes(noteMod.DailyNotes);
      }
      calMod.init('#cal-root');
    }

    if (detailMod && detailMod.init) {
      detailMod.init();
    }

    // 触发路由初始化
    Router.init();
    window._dbg && window._dbg('Router.init() OK', true);

    console.log('[app] 启动完成');
    window._dbg && window._dbg('启动完成 ✅', true);
  } catch(e) {
    console.error('[app] 启动失败:', e);
    window._dbg && window._dbg('启动失败: ' + e.message + ' @ ' + (e.stack || '').substring(0, 100), false);
    var root = $('#cal-root');
    if (root) {
      root.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-cinnabar);">加载失败，请刷新重试</div>';
    }
  }
})();

// ══════ 紫微斗数 iframe 消息监听 ══════
window.addEventListener('message', function(e) {
  if (e.data === 'ziwei:close') {
    closeZiweiPage();
  }
});

// 暴露给 hash 路由和内联脚本使用
window.showZiweiPage = showZiweiPage;
window.closeZiweiPage = closeZiweiPage;
