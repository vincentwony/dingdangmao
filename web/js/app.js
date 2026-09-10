// web/js/app.js — 应用入口：初始化 + 模块加载
// 首屏加载路由 + 日历，其余模块懒加载

import { State } from './state.js';
import { Router } from './router.js';
import { _highlightFab, _updateTopNavHeight, $, $$ } from './dom-helpers.js';

// ══════ 导航事件绑定 ══════
function initNavigation() {
  // 首页
  $('#tabHome').addEventListener('click', function() {
    Router.navigate('home');
  });

  // 万年历
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

// ══════ 移动端抽屉导航 ══════
function initDrawer() {
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('navDrawer');
  var scrim = document.getElementById('navScrim');
  var closeBtn = document.getElementById('navDrawerClose');
  if (!toggle || !drawer) return;

  var _escHandler = null;

  function open() {
    requestAnimationFrame(function() {
      drawer.classList.add('is-open');
      if (scrim) scrim.classList.add('is-open');
    });
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var first = drawer.querySelector('.drawer-item');
    if (first) { try { first.focus(); } catch (e) {} }
    _escHandler = function(e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', _escHandler, true);
  }

  function close() {
    drawer.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (_escHandler) { document.removeEventListener('keydown', _escHandler, true); _escHandler = null; }
    try { toggle.focus(); } catch (e) {}
  }

  toggle.addEventListener('click', function() {
    if (drawer.classList.contains('is-open')) close(); else open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (scrim) scrim.addEventListener('click', close);

  drawer.querySelectorAll('.drawer-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var nav = item.getAttribute('data-nav');
      if (nav) Router.navigate(nav);
      close();
    });
  });

  // 路由切换同步抽屉高亮
  State.on('route:changed', function(d) {
    var route = d && d.route ? d.route : '';
    drawer.querySelectorAll('.drawer-item').forEach(function(item) {
      item.classList.toggle('is-active', item.getAttribute('data-nav') === route);
    });
  });
}

// ══════ 首页（落地页）交互 ══════
function initHome() {
  var homeRoot = document.getElementById('home-root');
  if (!homeRoot) return;

  // 快捷入口 → 跳转对应路由
  homeRoot.querySelectorAll('.home-entry').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var nav = btn.getAttribute('data-nav');
      if (nav) Router.navigate(nav);
    });
  });

  // 日期选择器：填充年/月/日
  var selY = document.getElementById('homeY');
  var selM = document.getElementById('homeM');
  var selD = document.getElementById('homeD');
  if (selY && selM && selD) {
    var now = new Date();
    var y0 = now.getFullYear(), m0 = now.getMonth() + 1, d0 = now.getDate();
    for (var y = 1900; y <= 2100; y++) {
      var o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      if (y === y0) o.selected = true;
      selY.appendChild(o);
    }
    for (var m = 1; m <= 12; m++) {
      var om = document.createElement('option');
      om.value = String(m); om.textContent = String(m);
      if (m === m0) om.selected = true;
      selM.appendChild(om);
    }
    function fillDays() {
      var yy = parseInt(selY.value, 10);
      var mm = parseInt(selM.value, 10);
      var dim = new Date(yy, mm, 0).getDate();
      selD.innerHTML = '';
      for (var d = 1; d <= dim; d++) {
        var od = document.createElement('option');
        od.value = String(d); od.textContent = String(d);
        if (d === d0 && mm === m0 && yy === y0) od.selected = true;
        selD.appendChild(od);
      }
    }
    fillDays();
    selM.addEventListener('change', fillDays);
    selY.addEventListener('change', fillDays);

    var go = document.getElementById('homeGo');
    if (go) {
      go.addEventListener('click', function() {
        var y = parseInt(selY.value, 10);
        var m = parseInt(selM.value, 10);
        var d = parseInt(selD.value, 10);
        Router.navigate('calendar');
        State.emit('home:goto-date', { y: y, m: m, d: d });
      });
    }
  }
}

// ══════ 路由处理 ═════=
function initRoutes() {
  Router.register('home', function() {
    _highlightFab('tabHome');
    showHomePage();
  });

  Router.register('calendar', function() {
    _highlightFab('tabCalendar');
    showCalendarPage();
  });

  Router.register('nianli', function() {
    _highlightFab('tabNianli');
    window.__setActivePage('cal-root');   // 立即隐藏首页根，避免异步加载期间漏显
    loadModule('nianli').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('bazi', function() {
    _highlightFab('tabBazi');
    window.__setActivePage('bazi-root');   // 立即隐藏首页根，避免异步加载期间漏显
    loadModule('bazi').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('ziwei', function() {
    _highlightFab('tabZiwei');
    _closeDetailIfOpen();
    window.__setActivePage('ziwei-vanilla-root');   // 立即隐藏首页根，避免异步加载期间漏显
    loadModule('ziwei').then(function(mod) {
      if (mod && mod.show) mod.show();
      else showCalendarPage();
    }).catch(function(e) {
      console.error('[app] 紫微模块加载失败:', e);
      showCalendarPage();
    });
  });

  Router.register('note', function() {
    _highlightFab('tabNote');
    window.__setActivePage('note-root');   // 记事是独立页面，不再是日历覆盖层
    loadModule('note').then(function(mod) {
      if (mod && mod.renderNotePage) mod.renderNotePage();
    });
  });

  Router.register('choose', function() {
    // 择日助手独立页面（hash: #choose）；顶栏保留，日历底部 Tab 仍可辨识来源
    _highlightFab('tabCalendar');
    window.__setActivePage('choose-root');
    loadModule('choose').then(function(mod) {
      if (mod && mod.show) mod.show();
    }).catch(function(e) {
      console.error('[app] 择日模块加载失败:', e);
      showCalendarPage();
    });
  });

  Router.register('settings', function() {
    _highlightFab('tabSettings');
    _closeDetailIfOpen();
    // 由内联脚本 window.toggleSettingsPanel 直接处理
    if (window.toggleSettingsPanel) window.toggleSettingsPanel();
  });
}

// ══════ 页面根切换（集中式：唯一权威，避免漏藏兄弟根） ══════
// 所有页面根在此登记；切页时先全部隐藏，再只显示目标根。
var PAGE_ROOTS = ['home-root', 'cal-root', 'choose-root', 'bazi-root', 'ziwei-root', 'ziwei-vanilla-root', 'detail-root', 'note-root'];
function setActivePage(targetId) {
  PAGE_ROOTS.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = (id === targetId) ? 'block' : 'none';
  });
}
window.__setActivePage = setActivePage;

// ══════ 页面显示 ══════
function showCalendarPage() {
  // 恢复主应用顶栏（紫微 iframe 中会隐藏）
  var topNav0 = document.querySelector('.top-nav');
  if (topNav0) topNav0.style.display = '';
  // 集中式切换页面根：显示日历根，隐藏其它（含 home-root）
  setActivePage('cal-root');
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

// ══════ 显示首页（落地页） ══════
function showHomePage() {
  // 恢复主应用顶栏
  var topNav0 = document.querySelector('.top-nav');
  if (topNav0) topNav0.style.display = '';
  // 集中式切换页面根：显示首页根，隐藏其它
  setActivePage('home-root');
  _closeDetailIfOpen();
  State.emit('page:changed', 'home');
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

  setActivePage('ziwei-root');   // 集中式：显示 iframe 根，隐藏其余（含 home-root）
  // 隐藏主应用顶栏，让紫微 App 自己的导航（查盘/统计/语言）可见
  var topNav = document.querySelector('.top-nav');
  if (topNav) topNav.style.display = 'none';
  // （其它页面根已由 setActivePage 统一隐藏）
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
  // 同时复位内联日详情（#cal-detail-inline 是 cal-root 子节点，
  // 旧的 _closeDetailIfOpen 只关了模态浮层，内联残留会泄漏到其它复用 cal-root 的页面）
  var inline = document.getElementById('cal-detail-inline');
  if (inline) {
    inline.classList.remove('show');
    inline.setAttribute('aria-hidden', 'true');
    inline.innerHTML = '';
  }
}

// ══════ 懒加载模块 ══════
var _moduleCache = {};
var _moduleLoaders = {
  calendar: function() { return import('./calendar-ui.js'); },
  choose: function() { return import('./choose-ui.js'); },
  bazi: function() { return import('./bazi-ui.js'); },
  detail: function() { return import('./detail-ui.js'); },
  note: function() { return import('./note-ui.js'); },
  nianli: function() { return import('./nianli-ui.js'); },
  settings: function() { return import('./settings-ui.js'); },
  archive: function() { return import('./archive-ui.js'); },
  ziwei: function() { return import('./ziwei-ui.js'); }
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

// ══════ 页脚折叠（重设计：默认折叠，记忆展开偏好）══════
function initFooter() {
  var foot = $('#pageFoot');
  var tab = $('#footTab');
  if (!foot || !tab) return;

  // 恢复用户偏好：曾展开过则保持展开
  var expanded = false;
  try { expanded = localStorage.getItem('cal_footExpanded') === '1'; } catch (e) {}
  foot.classList.toggle('collapsed', !expanded);
  tab.setAttribute('aria-expanded', expanded ? 'true' : 'false');

  tab.addEventListener('click', function() {
    var nowExpanded = foot.classList.toggle('collapsed') === false;
    tab.setAttribute('aria-expanded', nowExpanded ? 'true' : 'false');
    try { localStorage.setItem('cal_footExpanded', nowExpanded ? '1' : '0'); } catch (e) {}
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
    window._dbg && window._dbg('initNavigation OK', true);
    initDrawer();
    window._dbg && window._dbg('initDrawer OK', true);
    initHome();
    window._dbg && window._dbg('initHome OK', true);
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
