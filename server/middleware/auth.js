// server/middleware/auth.js — HMAC-SHA256 请求签名验证
'use strict';

var hmac = require('../lib/hmac');

var TIME_WINDOW = 5 * 60 * 1000; // ±5分钟
var NONCE_MAX = 10000;
var nonceCache = new Map();

module.exports = function hmacAuth(req, res, next) {
  var H = hmac.HEADER_NAMES;
  var mid = req.headers[H.MID];
  var ts = parseInt(req.headers[H.TS], 10);
  var nonce = req.headers[H.NONCE];
  var sig = req.headers[H.SIG];

  if (!mid || !ts || !nonce || !sig) {
    return res.status(401).json({ ok: false, error: '缺少认证参数', code: 401 });
  }

  // 时间窗口检查
  if (isNaN(ts) || Math.abs(Date.now() - ts) > TIME_WINDOW) {
    return res.status(401).json({ ok: false, error: '时间戳过期', code: 401 });
  }

  // nonce 去重
  if (nonceCache.has(nonce)) {
    return res.status(401).json({ ok: false, error: '请求已使用', code: 401 });
  }

  // HMAC-SHA256 签名验证（复用共享库，单一算法源 + 时序安全比较）
  var expected = hmac.sign(mid, ts, nonce, req.originalUrl);

  if (!hmac.constantTimeEqual(sig, expected)) {
    return res.status(401).json({ ok: false, error: '签名无效', code: 401 });
  }

  // 记录 nonce
  nonceCache.set(nonce, Date.now());
  if (nonceCache.size > NONCE_MAX) {
    var oldest = nonceCache.keys().next().value;
    nonceCache.delete(oldest);
  }

  req.machineId = mid;
  next();
};
