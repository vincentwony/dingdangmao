// web/js/settings-ui.js — 日历标签设置面板
// 构建设置面板 HTML，管理开关状态，持久化到 localStorage

import { State } from './state.js';
import { $, _highlightFab } from './dom-helpers.js';
import { HMAC_KEY } from './hmac-spec.js';
import { hmacSha256Hex } from './sha256.js';

// ══════ 状态 ══════
var _panelEl = null;
var _visible = false;
var _initializing = false; // 初始化期间跳过 change 事件处理

// ══════ 设置键 ══════
var SETTING_KEYS = {};

/** 读取设置 */
function getSetting(key, def) {
  try {
    var v = localStorage.getItem(key);
    if (v === null) return def;
    return v === 'true';
  } catch(e) { return def; }
}

/** 保存设置 */
function saveSetting(key, val) {
  try { localStorage.setItem(key, val ? 'true' : 'false'); } catch(e) {}
}

/** 显示设置面板 */
function show() {
  if (!_panelEl) buildPanel();

  _highlightFab('tabSettings');

  if (_visible) { hide(); return; }

  _panelEl.classList.add('show');
  _visible = true;
  positionPanel();
  initToggleStates();

  // 更新授权状态显示
  updateLicenseStatus();

  // 延迟绑定外部点击（避免立即触发）
  setTimeout(function() {
    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('touchstart', onOutsideClick, { passive: true });
  }, 50);
}

/** 隐藏设置面板 */
function hide() {
  if (_panelEl) _panelEl.classList.remove('show');
  _visible = false;
  document.removeEventListener('mousedown', onOutsideClick);
  document.removeEventListener('touchstart', onOutsideClick);
}

/** 外部点击关闭 */
function onOutsideClick(e) {
  if (!_visible) return;
  var tab = document.getElementById('tabSettings');
  if (_panelEl && !_panelEl.contains(e.target) && tab && !tab.contains(e.target)) {
    hide();
  }
}

/** 获取面板引用（复用 app.html 中已有的 #settingsPanel，不重复创建） */
function buildPanel() {
  // 复用 HTML 中已硬编码的面板，避免双 DOM 问题（2026-06-26 修复）
  _panelEl = document.getElementById('settingsPanel');
  if (!_panelEl) {
    // 极意外情况：HTML 面板被删除，动态创建回退
    _panelEl = document.createElement('div');
    _panelEl.className = 'settings-panel';
    _panelEl.id = 'settingsPanel';
    _panelEl.setAttribute('role', 'menu');
    _panelEl.innerHTML = '<div class="st-row"><div class="st-label">设置面板加载失败</div></div>';
    document.body.appendChild(_panelEl);
    _panelEl.style.position = 'fixed';
    _panelEl.style.zIndex = '2000';
  }

  // 事件已由 app.html 内联脚本绑定，避免重复监听（2026-06-26 修复）
  if (_panelEl._eventsBound) return;
  _panelEl._eventsBound = true;

  // 绑定事件（仅当内联脚本未绑定时执行）
  bindPanelEvents();
}

/** 定位面板（相对于设置按钮） */
function positionPanel() {
  if (!_panelEl) return;
  var tab = document.getElementById('tabSettings');
  if (!tab) return;
  var rect = tab.getBoundingClientRect();
  _panelEl.style.top = (rect.bottom + 4) + 'px';
  _panelEl.style.right = (window.innerWidth - rect.right) + 'px';
}

/** 绑定面板内事件 */
function bindPanelEvents() {
  if (!_panelEl) return;

    // Toggle 开关变更
    _panelEl.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        if (_initializing) return; // 初始化期间静默
        if (cb.id === 'togDarkMode') {
          toggleTheme(cb.checked);
        }
      });
    });

  // 字号按钮
  _panelEl.querySelectorAll('.fs-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var size = this.getAttribute('data-fs');
      setFontSize(size);
    });
  });

  // 激活按钮 — HMAC-SHA256 短码验证（与 index.html 授权体系一致）
  var licBtn = _panelEl.querySelector('#licenseSettingsBtn');
  if (licBtn) {
    licBtn.addEventListener('click', showActivationDialog);
  }
}

/** 初始化所有 toggle 状态（从 localStorage 恢复，不触发 change 事件） */
function initToggleStates() {
  _initializing = true;
  try {
    // 暗色模式
    var darkTog = document.getElementById('togDarkMode');
    if (darkTog) {
      darkTog.checked = document.body.classList.contains('dark');
    }

    // 字号
    updateFontSizeButtons();
  } finally {
    _initializing = false;
  }
}

/** 更新授权状态 */
function updateLicenseStatus() {
  var descEl = document.getElementById('licenseStatusDesc');
  var btnEl = document.getElementById('licenseSettingsBtn');
  if (!descEl) return;

  // 检查是否有已激活的授权数据
  try {
    var licData = localStorage.getItem('_license_data');
    if (licData) {
      var lic = JSON.parse(licData);
      if (lic.tier === 'U') {
        descEl.textContent = '已激活·终身使用';
        if (btnEl) btnEl.style.display = 'none';
        return;
      } else if (lic.tier && lic.expireDate && lic.expireDate > new Date().toISOString().slice(0,10).replace(/-/g,'')) {
        descEl.textContent = '已激活·' + (lic.tier === 'Y' ? '年度' : '季度') + '会员';
        if (btnEl) btnEl.style.display = 'none';
        return;
      }
    }
    // 试用状态
    var trialStart = localStorage.getItem('_trial_start');
    if (trialStart) {
      descEl.textContent = '试用中';
    } else {
      descEl.textContent = '未激活';
    }
  } catch(e) {
    descEl.textContent = '未激活';
  }
}

// ══════ 激活对话框 ══════
var _activationOverlay = null;

/** 显示激活对话框 */
function showActivationDialog() {
  if (_activationOverlay) { closeActivationDialog(); }

  _activationOverlay = document.createElement('div');
  _activationOverlay.className = 'license-activation-overlay';
  _activationOverlay.innerHTML =
    '<div class="license-dialog">' +
      '<div class="license-dialog-header">' +
        '<span><i class="ti ti-key"></i> 输入激活码</span>' +
        '<button class="license-close-btn" id="licCloseBtn"><i class="ti ti-x"></i></button>' +
      '</div>' +
      '<div class="license-dialog-body">' +
        '<div class="license-step"><span class="license-step-num">1</span><span class="license-step-text">您的机器码</span></div>' +
        '<div class="license-machine-code" id="licMachineCode"></div>' +
        '<div class="license-step"><span class="license-step-num">2</span><span class="license-step-text">输入激活码</span></div>' +
        '<textarea class="license-textarea" id="licCodeInput" placeholder="粘贴激活码（如 BZ-Y-20261231-A3F7）" rows="3"></textarea>' +
        '<div class="license-error" id="licError" style="display:none"></div>' +
        '<button class="btn-license-activate" id="licActivateBtn">验证并激活</button>' +
        '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:12px;text-align:center">' +
          '激活码由作者通过 keygen.html 生成。格式：BZ-{等级}-{日期}-{校验码}' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(_activationOverlay);

  // 填充机器码
  var mid = getMachineId();
  document.getElementById('licMachineCode').textContent = mid;

  // 事件绑定
  document.getElementById('licCloseBtn').addEventListener('click', closeActivationDialog);
  document.getElementById('licActivateBtn').addEventListener('click', handleActivate);
  _activationOverlay.addEventListener('click', function(e) {
    if (e.target === _activationOverlay) closeActivationDialog();
  });
}

function closeActivationDialog() {
  if (_activationOverlay) { _activationOverlay.remove(); _activationOverlay = null; }
}

/** 生成机器码（与 api.js _getMachineId 保持一致，8 位 hex） */
function getMachineId() {
  try {
    var stored = localStorage.getItem('_license_mid');
    if (stored && stored.length >= 8) return stored;
    var fp = [
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
      screen.width + 'x' + screen.height,
      navigator.language
    ].join('|');
    var hash = 0;
    for (var i = 0; i < fp.length; i++) {
      hash = ((hash << 5) - hash) + fp.charCodeAt(i);
      hash |= 0;
    }
    var mid = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
    localStorage.setItem('_license_mid', mid);
    return mid;
  } catch(e) { return 'WEB' + Date.now().toString(36).toUpperCase().substring(0, 3); }
}

/** HMAC-SHA256 短码验证（与 index.html / keygen.html 一致） */
async function handleActivate() {
  var code = document.getElementById('licCodeInput').value.trim();
  var errEl = document.getElementById('licError');
  errEl.style.display = 'none';

  if (!code) { showError('请输入激活码'); return; }

  // 去掉横线，支持两种格式
  var raw = code.replace(/-/g, '');
  var m = raw.match(/^BZ([QYU])(\d{8})([A-F0-9]{8})$/);
  if (!m) { showError('激活码格式无效。格式：BZ-{等级}-{YYYYMMDD}-{8位校验码}'); return; }

  var tier = m[1], expireDate = m[2], checkCode = m[3];
  var mid = getMachineId().replace(/-/g, '');
  var message = mid + tier + expireDate;

  try {
    // 密钥单一来源：hmac-spec.js（禁止在此再硬编码一份）
    // crypto.subtle 仅安全上下文可用；局域网 HTTP（手机扫码访问）下为 undefined，
    // 直接调用会抛异常导致激活功能完全不可用，故与 api.js 同策略做能力探测 + 纯 JS 回退。
    var sigHex;
    var _subtleOK = false;
    try {
      _subtleOK = typeof crypto !== 'undefined' && crypto.subtle
        && typeof crypto.subtle.importKey === 'function';
    } catch (e0) { _subtleOK = false; }

    if (_subtleOK) {
      try {
        var keyBuf = new TextEncoder().encode(HMAC_KEY);
        var cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        var sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
        sigHex = Array.from(new Uint8Array(sigBuf)).map(function(b) { return b.toString(16).padStart(2,'0').toUpperCase(); }).join('');
      } catch (e1) { _subtleOK = false; }
    }
    if (!_subtleOK) {
      sigHex = hmacSha256Hex(HMAC_KEY, message).toUpperCase();
    }

    var expectedCheck = sigHex.substring(0, 8);

    if (checkCode !== expectedCheck) {
      showError('激活码无效（校验失败）。请检查机器码和激活码是否匹配。');
      return;
    }

    // 检查有效期
    if (expireDate !== '00000000') {
      var now = new Date();
      var ey = parseInt(expireDate.substring(0,4)), em = parseInt(expireDate.substring(4,6)), ed = parseInt(expireDate.substring(6,8));
      var exp = new Date(ey, em-1, ed);
      if (now > exp) { showError('激活码已过期（' + expireDate + '）'); return; }
    }

    // 保存授权数据
    var licData = { tier: tier, expireDate: expireDate, activatedAt: new Date().toISOString() };
    localStorage.setItem('_license_data', JSON.stringify(licData));
    updateLicenseStatus();
    closeActivationDialog();

    // 通知其他模块
    try { if (window.State && window.State.emit) window.State.emit('license:activated', licData); } catch(e) {}
    window.showToast && window.showToast(tier === 'U' ? '终身授权已激活' : '授权已激活', 'success', 2000);
  } catch(e) {
    showError('验证失败：' + e.message);
  }
}

function showError(msg) {
  var errEl = document.getElementById('licError');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}
function toggleTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    localStorage.setItem('theme', 'light');
  }
  State.emit('theme:changed', isDark ? 'dark' : 'light');
}

/** 设置字号 */
function setFontSize(size) {
  var sizes = { small: '13px', medium: '16px', large: '18px' };
  var descs = { small: '小号', medium: '标准', large: '大号' };
  var root = document.documentElement;

  // 使用 data 属性覆盖 clamp 值
  if (size === 'medium') {
    root.style.removeProperty('font-size');
  } else {
    root.style.fontSize = sizes[size] || '16px';
  }

  localStorage.setItem('fontSize', size);
  updateFontSizeButtons();

  var descEl = document.getElementById('fontSizeDesc');
  if (descEl) descEl.textContent = descs[size] || '标准';
}

/** 更新字号按钮激活状态 */
function updateFontSizeButtons() {
  var current = localStorage.getItem('fontSize') || 'medium';
  document.querySelectorAll('.fs-btn').forEach(function(btn) {
    var fs = btn.getAttribute('data-fs');
    if (fs === current) btn.classList.add('fs-active');
    else btn.classList.remove('fs-active');
  });
}

/** 初始化：恢复暗色模式 */
function initTheme() {
  var saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
  } else if (saved === 'dark' || !saved) {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  }
  // 恢复字号
  var fs = localStorage.getItem('fontSize') || 'medium';
  if (fs !== 'medium') {
    var sizes = { small: '13px', large: '18px' };
    if (sizes[fs]) document.documentElement.style.fontSize = sizes[fs];
  }
}

export default { show: show, hide: hide, initTheme: initTheme };
