// web/js/region-cascader.js — 省→地区二级联动选择器（原生JS）
// 数据源: window._REGION_TREE (region-tree-data.js)
// 替换原 geoCardContainer / citySearchInput
'use strict';

(function() {
  var TREE = window._REGION_TREE || [];

  var _container = null;
  var _selProv = null;
  var _selRegion = null;
  var _selected = null; // { province, provinceFull, region, regionId, lon, lat }

  // ═══ 构建 DOM ═══
  function _buildHTML() {
    return (
      '<div class="rc-wrap">' +
        '<div class="rc-row">' +
          '<select id="rcProvince" class="rc-select">' +
            '<option value="">选择省…</option>' +
          '</select>' +
          '<select id="rcRegion" class="rc-select rc-region" disabled>' +
            '<option value="">选择地区…</option>' +
          '</select>' +
        '</div>' +
        '<div id="rcInfo" class="rc-info" style="display:none"></div>' +
      '</div>'
    );
  }

  // ═══ 填充省份列表 ═══
  function _populateProvinces() {
    if (!_selProv) return;
    _selProv.innerHTML = '<option value="">选择省…</option>';
    for (var i = 0; i < TREE.length; i++) {
      var p = TREE[i];
      var opt = document.createElement('option');
      opt.value = p.provShort;
      opt.textContent = p.province;
      _selProv.appendChild(opt);
    }
  }

  // ═══ 填充地区列表 ═══
  function _populateRegions(provShort) {
    if (!_selRegion) return;
    _selRegion.innerHTML = '<option value="">选择地区…</option>';
    _selRegion.disabled = true;

    var provData = null;
    for (var i = 0; i < TREE.length; i++) {
      if (TREE[i].provShort === provShort) { provData = TREE[i]; break; }
    }
    if (!provData) return;

    for (var j = 0; j < provData.regions.length; j++) {
      var r = provData.regions[j];
      var opt = document.createElement('option');
      opt.value = r.id;
      opt.setAttribute('data-lon', r.lon);
      opt.setAttribute('data-lat', r.lat);
      opt.setAttribute('data-name', r.name);
      opt.textContent = r.name;
      _selRegion.appendChild(opt);
    }
    _selRegion.disabled = false;
  }

  // ═══ 更新选中信息 ═══
  function _updateInfo(regionData) {
    var info = document.getElementById('rcInfo');
    if (!info) return;
    info.style.display = 'none'; // 不再显示附属信息
  }

  // ═══ 选中地区回调 ═══
  function _onRegionSelected(provShort, provFull, regionOpt) {
    var name = regionOpt.getAttribute('data-name');
    var lon = parseFloat(regionOpt.getAttribute('data-lon'));
    var lat = parseFloat(regionOpt.getAttribute('data-lat'));

    _selected = {
      province: provShort,
      provinceFull: provFull,
      region: name,
      regionId: regionOpt.value,
      lon: lon,
      lat: lat
    };

    // 更新隐藏域
    var jdEl = document.getElementById('Jd_input');
    var wdEl = document.getElementById('Wd_input');
    if (jdEl) jdEl.value = lon;
    if (wdEl) wdEl.value = lat;

    // geoDisplay 已移除，仅更新隐藏域坐标

    _updateInfo(_selected);

    // 触发坐标变更事件
    try {
      window.dispatchEvent(new CustomEvent('geo:changed', { detail: _selected }));
    } catch(e) {}
    try {
      if (window._State && window._State.emit) window._State.emit('geo:changed', _selected);
    } catch(e) {}
  }

  // ═══ 初始化 ═══
  function init(containerEl) {
    _container = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
    if (!_container || !TREE.length) return;

    _container.innerHTML = _buildHTML();

    _selProv = document.getElementById('rcProvince');
    _selRegion = document.getElementById('rcRegion');

    _populateProvinces();

    // 省份变更 → 刷新地区
    if (_selProv) {
      _selProv.addEventListener('change', function() {
        var provShort = this.value;
        _selRegion.value = '';
        _selected = null;
        _updateInfo(null);

        // 清空坐标
        var jdEl = document.getElementById('Jd_input');
        var wdEl = document.getElementById('Wd_input');
        if (jdEl) jdEl.value = '';
        if (wdEl) wdEl.value = '';

        if (provShort) {
          _populateRegions(provShort);
        } else {
          _selRegion.innerHTML = '<option value="">选择地区…</option>';
          _selRegion.disabled = true;
        }
      });
    }

    // 地区选中
    if (_selRegion) {
      _selRegion.addEventListener('change', function() {
        if (!this.value) {
          _selected = null;
          _updateInfo(null);
          return;
        }
        var provShort = _selProv.value;
        var provFull = _selProv.selectedOptions[0].textContent;
        _onRegionSelected(provShort, provFull, this.selectedOptions[0]);
      });
    }

    // 暴露全局 API
    window._rcGetSelected = function() { return _selected; };
    window._rcSelectByRegion = function(provShort, regionName) {
      if (_selProv) _selProv.value = provShort;
      _selProv.dispatchEvent(new Event('change'));
      setTimeout(function() {
        if (!_selRegion) return;
        for (var i = 0; i < _selRegion.options.length; i++) {
          if (_selRegion.options[i].getAttribute('data-name') === regionName) {
            _selRegion.value = _selRegion.options[i].value;
            _selRegion.dispatchEvent(new Event('change'));
            return;
          }
        }
      }, 50);
    };

    // 默认选中北京
    setTimeout(function() {
      if (window._rcSelectByRegion) window._rcSelectByRegion('北京市', '北京');
    }, 100);

    console.log('[region-cascader] 就绪 ' + TREE.length + ' 省');
  }

  window.initRegionCascader = init;
})();
