// core/index.js — 统一导出
// Node.js: const { Lunar, Bz } = require('gongxin-core');
// 浏览器: import { Lunar, Bz } from './core/index.js';

'use strict';

var core = {};

// 各模块逐步注册（按依赖顺序）
Object.assign(core, require('./constants.js'));  // 全局常量（最先加载）
Object.assign(core, require('./wuxing.js'));
Object.assign(core, require('./texts.js'));
Object.assign(core, require('./lunar.js'));
Object.assign(core, require('./shensha.js'));
Object.assign(core, require('./bazi.js'));  // 含 sizhu
Object.assign(core, require('./exporters.js'));  // 六种导出格式统一抽象层

// 将 bazi/shensha 所有函数设为全局（mingLiBaZi 内部直接调用）
Object.keys(core).forEach(function(k) {
  if (typeof core[k] === 'function' && !global[k]) global[k] = core[k];
});

// 额外桩
global._fmtShensha = function(gg) { return gg || ''; };
global._assessDayMasterStrength = core._assessDayMasterStrength || function(o) { return {}; };

module.exports = core;
