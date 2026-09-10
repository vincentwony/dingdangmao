import { State } from './state.js';
import { Router } from './router.js';
import { _highlightFab, _updateTopNavHeight, $, $$ } from './dom-helpers.js';

function initNavigation() {

  $('#tabCalendar').addEventListener('click', function() {
    Router.navigate('calendar');
  });

  $('#tabNianli').addEventListener('click', function() {
    Router.navigate('nianli');
  });

  $('#tabBazi').addEventListener('click', function() {
    Router.navigate('bazi');
  });

  $('#tabZiwei').addEventListener('click', function() {
    Router.navigate('ziwei');
  });

  $('#tabNote').addEventListener('click', function() {
    Router.navigate('note');
  });

}

function initRoutes() {
  Router.register('calendar', function() {
    _highlightFab('tabCalendar');
    showCalendarPage();
  });

  Router.register('nianli', function() {
    _highlightFab('tabNianli');
    loadModule('nianli').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('bazi', function() {
    _highlightFab('tabBazi');
    loadModule('bazi').then(function(mod) {
      if (mod && mod.show) mod.show();
    });
  });

  Router.register('ziwei', function() {
    _highlightFab('tabZiwei');
    _closeDetailIfOpen();
    showZiweiPage();
  });

  Router.register('note', function() {
    _highlightFab('tabNote');
    loadModule('note').then(function(mod) {
      if (mod && mod.openForSelected) mod.openForSelected();
    });
  });

  Router.register('settings', function() {
    _highlightFab('tabSettings');
    _closeDetailIfOpen();

    if (window.toggleSettingsPanel) window.toggleSettingsPanel();
  });
}

function showCalendarPage() {

  var topNav0 = document.querySelector('.top-nav');
  if (topNav0) topNav0.style.display = '';

  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'block';
  var baziRoot = document.getElementById('bazi-root');
  if (baziRoot) baziRoot.style.display = 'none';
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';

  var oldArea = document.getElementById('baziResultArea');
  if (oldArea) oldArea.remove();

  var calHeaderBar = document.getElementById('calHeaderBar');
  if (calHeaderBar) calHeaderBar.style.display = '';
  var FTLN = document.getElementById('FTLN');
  if (FTLN) FTLN.style.display = '';

  _closeDetailIfOpen();
  State.emit('page:changed', 'calendar');
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

  iframe.src = '/ziwei/' + '#/zh-CN/astrolabe' + qs;

  ziweiRoot.style.display = 'block';

  var topNav = document.querySelector('.top-nav');
  if (topNav) topNav.style.display = 'none';

  var calRoot = document.getElementById('cal-root');
  var baziRoot = document.getElementById('bazi-root');
  if (calRoot) calRoot.style.display = 'none';
  if (baziRoot) baziRoot.style.display = 'none';
  State.emit('page:changed', 'ziwei');

  document.addEventListener('keydown', _onZiweiEsc);
}

/** 关闭紫微斗数 iframe */
function closeZiweiPage() {
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  var iframe = document.getElementById('ziwei-iframe');
  if (iframe) iframe.src = '';
  document.removeEventListener('keydown', _onZiweiEsc);

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

    var actual = (mod && mod.default) ? mod.default : mod;
    _moduleCache[name] = actual;
    return actual;
  }).catch(function(e) {
    console.error('[app] 模块加载失败 [' + name + ']:', e);
    return null;
  });
}

function initFooter() {
  var foot = $('#pageFoot');
  var tab = $('#footTab');
  if (!foot || !tab) return;

  tab.addEventListener('click', function() {
    foot.classList.toggle('collapsed');
  });
}

function initResponsive() {
  _updateTopNavHeight();
  window.addEventListener('resize', _updateTopNavHeight);

  if (document.fonts) {
    document.fonts.ready.then(_updateTopNavHeight);
  }
}

function initTheme() {

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
    initRoutes();
    window._dbg && window._dbg('initRoutes OK', true);

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

window.addEventListener('message', function(e) {
  if (e.data === 'ziwei:close') {
    closeZiweiPage();
  }
});

window.showZiweiPage = showZiweiPage;
window.closeZiweiPage = closeZiweiPage;