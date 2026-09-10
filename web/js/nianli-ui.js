// web/js/nianli-ui.js — 年历视图模块
// 年历一·十二月览 + 年历二·干支节气
// 数据来自服务端 /api/v1/calendar/nianli

import { State } from './state.js';
import { API } from './api.js';
import { $, _highlightFab } from './dom-helpers.js';

var _currentY = new Date().getFullYear();
var _loaded = false;

/** 渲染年历到 #Cal3 容器 */
function _render(html1, html2, y) {
  var cal3 = $('#Cal3');
  if (!cal3) return;

  cal3.innerHTML =
    '<div class="nianli-merged">' +
      '<div class="card" data-card-id="nianli_1">' +
        '<div class="card-header" onclick="if(window._toggleCardCollapse)window._toggleCardCollapse(this)">' +
          '<span><i class="ti ti-calendar-month"></i> 年历一 · 十二月览</span>' +
          '<i class="ti ti-chevron-down card-collapse-icon"></i>' +
        '</div>' +
        '<div class="card-body">' + html1 + '</div>' +
      '</div>' +
      '<div class="nianli-divider"></div>' +
      '<div class="card" data-card-id="nianli_2">' +
        '<div class="card-header" onclick="if(window._toggleCardCollapse)window._toggleCardCollapse(this)">' +
          '<span><i class="ti ti-calendar-event"></i> 年历二 · 干支节气</span>' +
          '<i class="ti ti-chevron-down card-collapse-icon"></i>' +
        '</div>' +
        '<div class="card-body">' + html2 + '</div>' +
      '</div>' +
      '<div class="nianli-year-nav">' +
        '<button class="nianli-nav-btn" id="btnNianliPrev" title="上一年"><i class="ti ti-chevron-left"></i> 上一年</button>' +
        '<span class="nianli-year-label">' + y + '年</span>' +
        '<button class="nianli-nav-btn" id="btnNianliNext" title="下一年"><i class="ti ti-chevron-right"></i> 下一年</button>' +
      '</div>' +
    '</div>';

  // 绑定年份切换按钮
  var btnPrev = $('#btnNianliPrev');
  var btnNext = $('#btnNianliNext');
  if (btnPrev) btnPrev.addEventListener('click', function() { loadYear(_currentY - 1); });
  if (btnNext) btnNext.addEventListener('click', function() { loadYear(_currentY + 1); });

  // 恢复折叠状态
  if (window._restoreCollapseState) window._restoreCollapseState();
}

/** 加载指定年份的年历数据 */
async function loadYear(y) {
  _currentY = y;
  var cal3 = $('#Cal3');
  if (cal3) cal3.innerHTML = '<div class="nianli-loading">加载中…</div>';

  try {
    var result = await API.post('/calendar/nianli', { y: y });
    if (result && result.ok && result.data) {
      _render(result.data.html1, result.data.html2, y);
    }
  } catch(e) {
    if (cal3) cal3.innerHTML = '<div class="nianli-error">年历加载失败：' + (e.message || '网络错误') + '</div>';
  }
}

/** 显示年历页面 */
async function show() {
  _highlightFab('tabNianli');

  // 集中式切换页面根：显示日历根，隐藏其它（含 home-root）
  window.__setActivePage('cal-root');
  // 旧详情浮层（detail-root）复位
  var detailRoot = document.getElementById('detail-root');
  if (detailRoot) detailRoot.classList.remove('show');
  // 复位内联日详情：#cal-detail-inline 是 cal-root 子节点，
  // 切到年历时若不清空，会残留万年历点过的当日详情（见 issue 节气页残留）
  var detailInline = document.getElementById('cal-detail-inline');
  if (detailInline) {
    detailInline.classList.remove('show');
    detailInline.setAttribute('aria-hidden', 'true');
    detailInline.innerHTML = '';
  }

  // 隐藏日历头部
  var calHeaderBar = document.getElementById('calHeaderBar');
  if (calHeaderBar) calHeaderBar.style.display = 'none';
  var FTLN = document.getElementById('FTLN');
  if (FTLN) FTLN.style.display = 'none';

  State.emit('page:changed', 'nianli');
  await loadYear(_currentY);
  _loaded = true;
}

export { show, loadYear };
