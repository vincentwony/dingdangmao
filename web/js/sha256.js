// web/js/sha256.js — 纯 JS SHA-256 / HMAC-SHA256（零依赖、同步）
//
// 存在理由（重要，勿删）：
//   Web Crypto 的 crypto.subtle 只在「安全上下文」(HTTPS 或 localhost) 暴露。
//   本应用通过局域网 HTTP 访问（如 http://192.168.1.7:3000）时属非安全上下文，
//   crypto.subtle === undefined，导致 HMAC 签名抛异常、全部 API 请求失败。
//   本文件提供等价回退实现，保证 HTTP 局域网/手机端同样可用。
//
// 一致性约束：输出必须与 Node `crypto.createHmac('sha256', key).digest('hex')`
//   逐字节相同（key 与 message 均按 UTF-8 编码），由 server/verify_hmac_fallback.js 校验。

'use strict';

// SHA-256 轮常量（前 64 个素数立方根小数部分前 32 位）
var K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function _rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

/**
 * SHA-256 摘要
 * @param {Uint8Array} bytes 输入字节
 * @returns {Uint8Array} 32 字节摘要
 */
function sha256Bytes(bytes) {
  var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  var len = bytes.length;
  // padding：0x80 + 0x00... 使 (len+1+pad) % 64 === 56，末尾 8 字节为 bit 长度（大端）
  var padLen = ((len % 64) < 56) ? (56 - (len % 64)) : (120 - (len % 64));
  var total = len + padLen + 8;
  var msg = new Uint8Array(total);
  msg.set(bytes, 0);
  msg[len] = 0x80;

  // 位长度写入末 8 字节（大端）。JS 位运算限 32 位，故高低 32 位分开算。
  var bitLenHi = Math.floor(len / 0x20000000);      // len * 8 / 2^32
  var bitLenLo = (len * 8) >>> 0;
  msg[total - 8] = (bitLenHi >>> 24) & 0xff;
  msg[total - 7] = (bitLenHi >>> 16) & 0xff;
  msg[total - 6] = (bitLenHi >>> 8) & 0xff;
  msg[total - 5] = bitLenHi & 0xff;
  msg[total - 4] = (bitLenLo >>> 24) & 0xff;
  msg[total - 3] = (bitLenLo >>> 16) & 0xff;
  msg[total - 2] = (bitLenLo >>> 8) & 0xff;
  msg[total - 1] = bitLenLo & 0xff;

  var w = new Uint32Array(64);

  for (var off = 0; off < total; off += 64) {
    for (var i = 0; i < 16; i++) {
      var j = off + i * 4;
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0;
    }
    for (i = 16; i < 64; i++) {
      var s0 = (_rotr(w[i - 15], 7) ^ _rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      var s1 = (_rotr(w[i - 2], 17) ^ _rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (i = 0; i < 64; i++) {
      var S1 = (_rotr(e, 6) ^ _rotr(e, 11) ^ _rotr(e, 25)) >>> 0;
      var ch = ((e & f) ^ (~e & g)) >>> 0;
      var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      var S0 = (_rotr(a, 2) ^ _rotr(a, 13) ^ _rotr(a, 22)) >>> 0;
      var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      var t2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  var out = new Uint8Array(32);
  var hs = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (i = 0; i < 8; i++) {
    out[i * 4] = (hs[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hs[i] & 0xff;
  }
  return out;
}

/**
 * UTF-8 编码（不依赖 TextEncoder，兼容老 WebView）
 * @param {string} str
 * @returns {Uint8Array}
 */
function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  var s = unescape(encodeURIComponent(String(str)));
  var out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function bytesToHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  }
  return hex;
}

/**
 * HMAC-SHA256
 * @param {string} key     密钥（按 UTF-8 编码，与 Node crypto 默认行为一致）
 * @param {string} message 待签消息（UTF-8）
 * @returns {string} 64 位 hex 摘要
 */
function hmacSha256Hex(key, message) {
  var BLOCK = 64;
  var keyBytes = utf8Bytes(key);
  // 长于块长先摘要，短于块长右侧补零
  if (keyBytes.length > BLOCK) keyBytes = sha256Bytes(keyBytes);

  var kPad = new Uint8Array(BLOCK);
  kPad.set(keyBytes, 0);

  var msgBytes = utf8Bytes(message);

  var inner = new Uint8Array(BLOCK + msgBytes.length);
  var outerPrefix = new Uint8Array(BLOCK);
  for (var i = 0; i < BLOCK; i++) {
    inner[i] = kPad[i] ^ 0x36;
    outerPrefix[i] = kPad[i] ^ 0x5c;
  }
  inner.set(msgBytes, BLOCK);

  var innerHash = sha256Bytes(inner);

  var outer = new Uint8Array(BLOCK + 32);
  outer.set(outerPrefix, 0);
  outer.set(innerHash, BLOCK);

  return bytesToHex(sha256Bytes(outer));
}

export { sha256Bytes, hmacSha256Hex, utf8Bytes, bytesToHex };
