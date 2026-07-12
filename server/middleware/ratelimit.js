// server/middleware/ratelimit.js
'use strict';

module.exports = function createRateLimiter(opts) {
  var windowMs = (opts && opts.windowMs) || 60000;
  var max = (opts && opts.max) || 60;
  var hits = {};

  // 定期清理过期记录
  setInterval(function() {
    var now = Date.now();
    Object.keys(hits).forEach(function(ip) {
      if (now - hits[ip].reset > windowMs * 2) delete hits[ip];
    });
  }, windowMs).unref();

  return function rateLimit(req, res, next) {
    var ip = req.ip || req.connection.remoteAddress || 'unknown';
    var now = Date.now();
    var entry = hits[ip];

    if (!entry || now - entry.reset > windowMs) {
      hits[ip] = { count: 1, reset: now };
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({
        ok: false,
        error: '请求过于频繁，请稍后重试',
        code: 429
      });
    }
    next();
  };
};
