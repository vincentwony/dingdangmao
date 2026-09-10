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

  var btnPrev = $('#btnNianliPrev');
  var btnNext = $('#btnNianliNext');
  if (btnPrev) btnPrev.addEventListener('click', function() { loadYear(_currentY - 1); });
  if (btnNext) btnNext.addEventListener('click', function() { loadYear(_currentY + 1); });

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

  var calRoot = document.getElementById('cal-root');
  if (calRoot) calRoot.style.display = 'block';
  var baziRoot = document.getElementById('bazi-root');
  if (baziRoot) baziRoot.style.display = 'none';
  var ziweiRoot = document.getElementById('ziwei-root');
  if (ziweiRoot) ziweiRoot.style.display = 'none';
  var detailRoot = document.getElementById('detail-root');
  if (detailRoot) { detailRoot.style.display = 'none'; detailRoot.classList.remove('show'); }

  var calHeaderBar = document.getElementById('calHeaderBar');
  if (calHeaderBar) calHeaderBar.style.display = 'none';
  var FTLN = document.getElementById('FTLN');
  if (FTLN) FTLN.style.display = 'none';

  State.emit('page:changed', 'nianli');
  await loadYear(_currentY);
  _loaded = true;
}

export { show, loadYear };