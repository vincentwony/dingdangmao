// server/middleware/auth.js — HMAC-SHA256 请求签名验证
'use strict';

var crypto = require('crypto');

var HMAC_SECRET = process.env.HMAC_SECRET || '381cb51f0923fc771bf7e81547c485f7';
var TIME_WINDOW = 5 * 60 * 1000; // ±5分钟
var NONCE_MAX = 10000;
var nonceCache = new Map();

module.exports = function hmacAuth(req, res, next) {
  var mid = req.headers['x-machine-id'];
  var ts = parseInt(req.headers['x-timestamp'], 10);
  var nonce = req.headers['x-nonce'];
  var sig = req.headers['x-signature'];

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

  // HMAC-SHA256 签名验证 (Node.js crypto 同步版本)
  var message = mid + ts + nonce + req.originalUrl;
  var hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(message, 'utf8');
  var fullHex = hmac.digest('hex');
  var expected = fullHex.substring(0, 8); // 前4字节=8 hex字符

  if (expected !== sig.toLowerCase()) {
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
