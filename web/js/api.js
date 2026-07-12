// web/js/api.js — HTTP 客户端 + HMAC 签名
// 与 server/middleware/auth.js 的验签逻辑对应

const API = (function() {
  'use strict';

  var BASE = '/api/v1';

	  // HMAC 密钥 — 必须与 server 端完全一致（已更换，2026-06-26）
	  var HMAC_KEY = '381cb51f0923fc771bf7e81547c485f7';

  /**
   * 生成或获取机器码
   */
  function _getMachineId() {
    try {
      var stored = localStorage.getItem('_license_mid');
      if (stored) return stored;
    } catch(e) {}

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
    try { localStorage.setItem('_license_mid', mid); } catch(e) {}
    return mid;
  }

  /**
   * HMAC-SHA256 签名
   * @returns {Promise<string>} 8位hex签名字符串
   */
  async function _sign(mid, ts, nonce, path) {
    var message = mid + ts + nonce + path;
    var keyBuf = new TextEncoder().encode(HMAC_KEY);
    var key = await crypto.subtle.importKey('raw', keyBuf,
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    var sigBuf = await crypto.subtle.sign('HMAC', key,
      new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sigBuf.slice(0, 4)))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  /**
   * POST 请求（带 HMAC 签名头）
   * @param {string} path - API 路径（如 '/calendar/month'）
   * @param {object} data - 请求体
   * @returns {Promise<object>} { ok, data, took }
   */
  async function post(path, data) {
    var ts = Date.now();
    var nonce = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
    var mid = _getMachineId();
    var fullPath = BASE + path;
    var sig = await _sign(mid, ts, nonce, fullPath);

    var resp = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Machine-Id': mid,
        'X-Timestamp': String(ts),
        'X-Nonce': nonce,
        'X-Signature': sig
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
    var nonce = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
    var mid = _getMachineId();
    var fullPath = BASE + path;
    var sig = await _sign(mid, ts, nonce, fullPath);

    var resp = await fetch(BASE + path, {
      method: 'GET',
      headers: {
        'X-Machine-Id': mid,
        'X-Timestamp': String(ts),
        'X-Nonce': nonce,
        'X-Signature': sig
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
    BASE: BASE
  };
})();

export { API };
