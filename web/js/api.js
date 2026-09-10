// web/js/api.js — HTTP 客户端 + HMAC 签名
// 与 server/middleware/auth.js 的验签逻辑对应
// HMAC 规范（头名/密钥/消息格式/nonce）单一来源：web/js/hmac-spec.js

import { HEADER_NAMES, HMAC_KEY, SIGN_PREFIX_LEN, buildMessage, genNonce } from './hmac-spec.js';
import { hmacSha256Hex } from './sha256.js';

const API = (function() {
  'use strict';

  var BASE = '/api/v1';

  /**
   * 生成或获取机器码
   */
  function _getMachineId() {
    try {
      var stored = localStorage.getItem('_license_mid');
      if (stored) return stored;
    } catch (e) {}

    // 生成基于浏览器指纹的简易机器码
    var parts = [
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
      screen.width + 'x' + screen.height,
      navigator.language || ''
    ];
    var raw = parts.join('|');
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    var mid = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
    try { localStorage.setItem('_license_mid', mid); } catch (e) {}
    return mid;
  }

  // crypto.subtle 仅在「安全上下文」(HTTPS / localhost) 暴露。
  // 局域网 HTTP 访问（手机扫码 http://192.168.1.7:3000）属非安全上下文，
  // 此处若直接使用会抛 TypeError，导致全部 API 请求失败。故做能力探测 + 纯 JS 回退。
  var _subtleOK = (function() {
    try {
      return typeof crypto !== 'undefined'
        && crypto.subtle
        && typeof crypto.subtle.importKey === 'function';
    } catch (e) { return false; }
  })();

  /**
   * HMAC-SHA256 签名
   * 安全上下文走 Web Crypto；否则回退纯 JS 实现（结果逐字节一致，
   * 由 server/verify_hmac_fallback.js 保证）。
   * @returns {Promise<string>} 8位hex签名字符串
   */
  async function _sign(mid, ts, nonce, path) {
    var message = buildMessage(mid, ts, nonce, path);

    if (_subtleOK) {
      try {
        var keyBuf = new TextEncoder().encode(HMAC_KEY);
        var key = await crypto.subtle.importKey('raw', keyBuf,
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        var sigBuf = await crypto.subtle.sign('HMAC', key,
          new TextEncoder().encode(message));
        return Array.from(new Uint8Array(sigBuf.slice(0, SIGN_PREFIX_LEN / 2)))
          .map(function(b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      } catch (e) {
        // 某些 WebView 暴露了 subtle 却在调用时失败 —— 静默降级，不可让签名中断
        _subtleOK = false;
      }
    }

    return hmacSha256Hex(HMAC_KEY, message).substring(0, SIGN_PREFIX_LEN);
  }

  /** 供诊断页读取当前签名后端 */
  function signBackend() { return _subtleOK ? 'WebCrypto' : 'PureJS'; }

  /**
   * POST 请求（带 HMAC 签名头）
   * @param {string} path - API 路径（如 '/calendar/month'）
   * @param {object} data - 请求体
   * @returns {Promise<object>} { ok, data, took }
   */
  async function post(path, data) {
    var ts = Date.now();
    var nonce = genNonce();
    var mid = _getMachineId();
    var fullPath = BASE + path;
    var sig = await _sign(mid, ts, nonce, fullPath);

    var resp = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [HEADER_NAMES.MID]: mid,
        [HEADER_NAMES.TS]: String(ts),
        [HEADER_NAMES.NONCE]: nonce,
        [HEADER_NAMES.SIG]: sig
      },
      body: JSON.stringify(data)
    });

    var json = await resp.json().catch(function() {
      return { ok: false, error: '响应解析失败', code: resp.status };
    });

    if (!resp.ok) {
      throw new Error(json.error || 'HTTP ' + resp.status);
    }

    return json;
  }

  /**
   * GET 请求（带 HMAC 签名头）
   * @param {string} path - API 路径
   * @returns {Promise<object>} { ok, data, took }
   */
  async function get(path) {
    var ts = Date.now();
    var nonce = genNonce();
    var mid = _getMachineId();
    var fullPath = BASE + path;
    var sig = await _sign(mid, ts, nonce, fullPath);

    var resp = await fetch(BASE + path, {
      method: 'GET',
      headers: {
        [HEADER_NAMES.MID]: mid,
        [HEADER_NAMES.TS]: String(ts),
        [HEADER_NAMES.NONCE]: nonce,
        [HEADER_NAMES.SIG]: sig
      }
    });

    var json = await resp.json().catch(function() {
      return { ok: false, error: '响应解析失败', code: resp.status };
    });

    if (!resp.ok) {
      throw new Error(json.error || 'HTTP ' + resp.status);
    }

    return json;
  }

  return {
    post: post,
    get: get,
    BASE: BASE,
    signBackend: signBackend,
    _sign: _sign,
    _getMachineId: _getMachineId
  };
})();

export { API };
