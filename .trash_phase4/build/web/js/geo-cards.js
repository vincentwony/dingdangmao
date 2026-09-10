'use strict';

(function() {
  var CARDS = window._GEO_CARDS || [];
  var INITIAL_SHOW = 12;       // 默认展示前 N 个高频地名
  var DEBOUNCE_MS = 200;       // 搜索防抖

  var _container = null;       // #geoCardContainer
  var _searchInput = null;     // #geoCardSearch
  var _grid = null;            // #geoCardGrid
  var _expandBtn = null;       // #geoCardExpand
  var _selectedCard = null;    // 当前选中的卡片 DOM
  var _selectedData = null;    // 当前选中的数据
  var _expanded = false;       // 是否已展开全部
  var _filtered = false;       // 是否正在搜索过滤
  var _searchTimer = null;

  function _buildCardHTML(card) {
    var lonStr = card.lon.toFixed(2) + '°E';
    var latStr = card.lat.toFixed(2) + '°N';
    return (
      '<div class="geo-card" data-id="' + card.id + '" tabindex="0" role="option" aria-selected="false"' +
      ' title="用于真太阳时计算，坐标取自寿星历 v2024">' +
        '<span class="geo-card-name">' + card.name + '</span>' +
        '<span class="geo-card-coord">' + lonStr + ' · ' + latStr + '</span>' +
      '</div>'
    );
  }

  function _renderCards(query) {
    var filtered = CARDS;
    if (query) {
      var q = query.toLowerCase();
      filtered = CARDS.filter(function(c) {
        return c.name.indexOf(q) >= 0 || c.prov.indexOf(q) >= 0;
      });
    }

    var html = '';
    var limit = (_expanded || query) ? filtered.length : Math.min(INITIAL_SHOW, filtered.length);
    for (var i = 0; i < limit; i++) {
      html += _buildCardHTML(filtered[i]);
    }
    _grid.innerHTML = html;

    var remaining = filtered.length - limit;
    if (_expandBtn) {
      if (!query && remaining > 0 && !_expanded) {
        _expandBtn.style.display = 'block';
        _expandBtn.textContent = '▼ 更多… (' + remaining + '个)';
      } else if (!query && _expanded) {
        _expandBtn.style.display = 'block';
        _expandBtn.textContent = '▲ 收起';
      } else if (query) {
        _expandBtn.style.display = 'block';
        _expandBtn.textContent = '共 ' + filtered.length + ' 个结果';
        _expandBtn.style.pointerEvents = 'none';
      } else {
        _expandBtn.style.display = 'none';
      }
    }

    _bindCardEvents();

    if (_selectedData) {
      _highlightSelected();
    }
  }

  function _highlightSelected() {
    var cards = _grid.querySelectorAll('.geo-card');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-id');
      if (_selectedData && id === _selectedData.id) {
        cards[i].classList.add('geo-card-selected');
        cards[i].setAttribute('aria-selected', 'true');
      } else {
        cards[i].classList.remove('geo-card-selected');
        cards[i].setAttribute('aria-selected', 'false');
      }
    }
  }

  function _bindCardEvents() {
    var cards = _grid.querySelectorAll('.geo-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        _selectById(id);
      });
    }
  }

  function _selectById(id) {
    var card = null;
    for (var i = 0; i < CARDS.length; i++) {
      if (CARDS[i].id === id) { card = CARDS[i]; break; }
    }
    if (!card) return;

    _selectedData = card;

    var jdEl = document.getElementById('Jd_input');
    var wdEl = document.getElementById('Wd_input');
    if (jdEl) jdEl.value = card.lon;
    if (wdEl) wdEl.value = card.lat;

    var geoDisplay = document.getElementById('geoDisplay');
    if (geoDisplay) {
      geoDisplay.textContent = card.prov + ' ' + card.name + ' (' + card.lon.toFixed(2) + '°E, ' + card.lat.toFixed(2) + '°N)';
    }

    if (_searchInput) {
      _searchInput.value = card.prov + ' ' + card.name;
    }

    _highlightSelected();

    try {
      window.dispatchEvent(new CustomEvent('geo:changed', { detail: { lon: card.lon, lat: card.lat, name: card.name } }));
    } catch(e) {}
    try { if (window._State && window._State.emit) window._State.emit('geo:changed', { lon: card.lon, lat: card.lat, name: card.name }); } catch(e) {}
  }

  function _onKeyDown(e) {
    if (!_grid) return;
    var cards = _grid.querySelectorAll('.geo-card');
    if (cards.length === 0) return;

    var focused = document.activeElement;
    var idx = -1;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i] === focused) { idx = i; break; }
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      idx = (idx + 1) % cards.length;
      cards[idx].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      idx = (idx - 1 + cards.length) % cards.length;
      cards[idx].focus();
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      cards[idx].click();
    }
  }

  function selectByName(name) {
    for (var i = 0; i < CARDS.length; i++) {
      if (CARDS[i].name === name) {
        _selectById(CARDS[i].id);
        return true;
      }
    }
    return false;
  }

  function getSelected() {
    return _selectedData ? {
      name: _selectedData.name,
      prov: _selectedData.prov,
      lon: _selectedData.lon,
      lat: _selectedData.lat
    } : null;
  }

  function init(containerEl) {
    _container = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
    if (!_container) return;

    _container.innerHTML =
      '<div class="geo-cards-wrap">' +
        '<div class="geo-cards-search-wrap">' +
          '<i class="ti ti-search geo-search-icon"></i>' +
          '<input id="geoCardSearch" type="text" class="geo-cards-search" placeholder="搜索地名…" autocomplete="off">' +
          '<button id="geoCardClear" class="geo-cards-clear" style="display:none" title="清除">×</button>' +
        '</div>' +
        '<div id="geoCardGrid" class="geo-cards-grid" role="listbox" aria-label="出生地选择"></div>' +
        '<button id="geoCardExpand" class="geo-cards-expand">▼ 更多…</button>' +
      '</div>';

    _searchInput = document.getElementById('geoCardSearch');
    _grid = document.getElementById('geoCardGrid');
    _expandBtn = document.getElementById('geoCardExpand');
    var clearBtn = document.getElementById('geoCardClear');

    _renderCards('');

    if (_searchInput) {
      _searchInput.addEventListener('input', function() {
        clearTimeout(_searchTimer);
        var self = this;
        _searchTimer = setTimeout(function() {
          var q = self.value.trim();
          _expanded = !!q;
          _renderCards(q);
          if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
        }, DEBOUNCE_MS);
      });
      _searchInput.addEventListener('keydown', _onKeyDown);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (_searchInput) _searchInput.value = '';
        _expanded = false;
        _renderCards('');
        clearBtn.style.display = 'none';
      });
    }

    if (_expandBtn) {
      _expandBtn.addEventListener('click', function() {
        _expanded = !_expanded;
        _renderCards(_searchInput ? _searchInput.value.trim() : '');
      });
    }

    if (_grid) {
      _grid.addEventListener('keydown', _onKeyDown);
    }

    window._geoSelect = selectByName;
    window._geoGetSelected = getSelected;

    console.log('[geo-cards] 就绪 ' + CARDS.length + ' 个地名');
  }

  window.initGeoCards = init;
  window._geoSelectByName = selectByName;
  window._geoGetSelected = getSelected;
})();