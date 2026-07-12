// server/middleware/error.js
'use strict';

module.exports = function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  var status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    code: status
  });
};
