// web/js/region-cascader.js — 省→地区二级联动选择器（原生JS）
// 数据源: window._REGION_TREE (region-tree-data.js)
// 替换原 geoCardContainer / citySearchInput
// 2026-07-18 升级：支持可选 prefix，避免同一页面多实例 ID 冲突（紫微/八字同时存在）
'use strict';

(function() {
  var TREE = window._REGION_TREE || [];

  function _id(prefix, name) {
    return (prefix || '') + name;
  }

  // ═══ 构建 DOM ═══
  function _buildHTML(prefix) {
    return (
      '<div class="rc-wrap">' +
        '<div class="rc-row">' +
          '<select id="' + _id(prefix, 'rcProvince') + '" class="rc-select">' +
            '<option value="">选择省…</option>' +
          '</select>' +
          '<select id="' + _id(prefix, 'rcRegion') + '" class="rc-select rc-region" disabled>' +
            '<option value="">选择地区…</option>' +
          '</select>' +
        '</div>' +
        '<div id="' + _id(prefix, 'rcInfo') + '" class="rc-info" style="display:none"></div>' +
      '</div>'
    );
  }

  // ═══ 填充省份列表 ═══
  function _populateProvinces(selProv) {
    if (!selProv) return;
    selProv.innerHTML = '<option value="">选择省…</option>';
    for (var i = 0; i < TREE.length; i++) {
      var p = TREE[i];
      var opt = document.createElement('option');
      opt.value = p.provShort;
      opt.textContent = p.province;
      selProv.appendChild(opt);
    }
  }

  // ═══ 填充地区列表 ═══
  function _populateRegions(selRegion, provShort) {
    if (!selRegion) return;
    selRegion.innerHTML = '<option value="">选择地区…</option>';
    selRegion.disabled = true;

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
      selRegion.appendChild(opt);
    }
    selRegion.disabled = false;
  }

  // ═══ 选中地区回调 ═══
  function _onRegionSelected(prefix, provShort, provFull, regionOpt, onChange) {
    var name = regionOpt.getAttribute('data-name');
    var lon = parseFloat(regionOpt.getAttribute('data-lon'));
    var lat = parseFloat(regionOpt.getAttribute('data-lat'));

    var selected = {
      prefix: prefix || '',
      province: provShort,
      provinceFull: provFull,
      region: name,
      regionId: regionOpt.value,
      lon: lon,
      lat: lat
    };

    // 更新隐藏域（支持带 prefix 的隐藏输入）
    var jdEl = document.getElementById(_id(prefix, 'Jd_input'));
    var wdEl = document.getElementById(_id(prefix, 'Wd_input'));
    if (jdEl) jdEl.value = lon;
    if (wdEl) wdEl.value = lat;

    // 触发坐标变更事件
    try {
      window.dispatchEvent(new CustomEvent('geo:changed', { detail: selected }));
    } catch(e) {}
    try {
      if (window._State && window._State.emit) window._State.emit('geo:changed', selected);
    } catch(e) {}

    if (typeof onChange === 'function') onChange(selected);

    return selected;
  }

  // ═══ 初始化 ═══
  function init(containerEl, options) {
    options = options || {};
    var prefix = options.prefix || '';
    var onChange = options.onChange || null;

    var _container = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
    if (!_container || !TREE.length) return;

    _container.innerHTML = _buildHTML(prefix);

    var selProv = document.getElementById(_id(prefix, 'rcProvince'));
    var selRegion = document.getElementById(_id(prefix, 'rcRegion'));
    var _selected = null;

    _populateProvinces(selProv);

    // 省份变更 → 刷新地区
    if (selProv) {
      selProv.addEventListener('change', function() {
        var provShort = this.value;
        if (selRegion) {
          selRegion.value = '';
          _selected = null;
        }
        if (provShort) {
          _populateRegions(selRegion, provShort);
        } else {
          if (selRegion) {
            selRegion.innerHTML = '<option value="">选择地区…</option>';
            selRegion.disabled = true;
          }
        }
        // 清空坐标
        var jdEl = document.getElementById(_id(prefix, 'Jd_input'));
        var wdEl = document.getElementById(_id(prefix, 'Wd_input'));
        if (jdEl) jdEl.value = '';
        if (wdEl) wdEl.value = '';
      });
    }

    // 地区选中
    if (selRegion) {
      selRegion.addEventListener('change', function() {
        if (!this.value) {
          _selected = null;
          return;
        }
        var provShort = selProv ? selProv.value : '';
        var provFull = (selProv && selProv.selectedOptions && selProv.selectedOptions[0])
          ? selProv.selectedOptions[0].textContent : '';
        _selected = _onRegionSelected(prefix, provShort, provFull, this.selectedOptions[0], onChange);
      });
    }

    // 暴露带 prefix 的查询 API
    var apiName = prefix ? ('_rcGetSelected_' + prefix.replace(/[^a-zA-Z0-9_-]/g, '')) : '_rcGetSelected';
    window[apiName] = function() { return _selected; };

    // 默认选中北京
    setTimeout(function() {
      if (window._rcSelectByRegion) window._rcSelectByRegion('北京市', '北京', prefix);
    }, 100);

    console.log('[region-cascader] 就绪 prefix=' + (prefix || '(none)') + ' 省份=' + TREE.length);
  }

  // 全局按省+地区选中（支持 prefix）
  function selectByRegion(provShort, regionName, prefix) {
    prefix = prefix || '';
    var selProv = document.getElementById(_id(prefix, 'rcProvince'));
    var selRegion = document.getElementById(_id(prefix, 'rcRegion'));
    if (!selProv) return;
    selProv.value = provShort;
    selProv.dispatchEvent(new Event('change'));
    setTimeout(function() {
      if (!selRegion) return;
      for (var i = 0; i < selRegion.options.length; i++) {
        if (selRegion.options[i].getAttribute('data-name') === regionName) {
          selRegion.value = selRegion.options[i].value;
          selRegion.dispatchEvent(new Event('change'));
          return;
        }
      }
    }, 50);
  }

  window.initRegionCascader = init;
  window._rcSelectByRegion = selectByRegion;
})();
