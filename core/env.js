// core/env.js — 跨环境全局导出（Node.js / 浏览器 / Worker）
// 确保 Lunar 等核心对象在任何环境中均可通过 window.Lunar 访问
'use strict';

/**
 * 检测当前运行环境
 * @returns {'node'|'browser'|'worker'|'unknown'}
 */
function detectEnv() {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) return 'node';
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'browser';
  if (typeof self !== 'undefined' && typeof importScripts !== 'undefined') return 'worker';
  return 'unknown';
}

/**
 * 将值挂载到当前环境的全局根对象
 * @param {string} name  - 全局变量名
 * @param {*}      value - 要挂载的值
 * @returns {{ name, env, mounted }}
 */
function ensureGlobal(name, value) {
  var env = detectEnv();
  var root;
  if (env === 'node')   root = global;
  else if (env === 'browser') root = window;
  else if (env === 'worker')  root = self;
  else root = (typeof globalThis !== 'undefined' ? globalThis : this || {});

  root[name] = value;

  return { name: name, env: env, mounted: typeof root[name] !== 'undefined' };
}

// ═══ 自注册：确保自身可被引用 ═══
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectEnv: detectEnv, ensureGlobal: ensureGlobal };
}
