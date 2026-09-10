// server/lib/hmac.js — HMAC-SHA256 签名/验签共享库（服务端单一事实源）
// 消除 auth.js / smoke_test_api.js / web/js/api.js 三处重复实现。
// 任何一端改算法，必须同步更新这里并通知前端 hmac-spec.js。
'use strict';

var crypto = require('crypto');

// 单一密钥源：环境变量优先，缺省回退项目默认（与历史前端硬编码值一致）。
// 注意：前端按设计持有此密钥明文（machine-id 体系，非机密）；此处为权威值。
var HMAC_SECRET = process.env.HMAC_SECRET || '381cb51f0923fc771bf7e81547c485f7';

// 请求头名称常量（HTTP 头大小写无关，Node 统一转小写；集中定义避免散落）
var HEADER_NAMES = {
  MID: 'x-machine-id',
  TS: 'x-timestamp',
  NONCE: 'x-nonce',
  SIG: 'x-signature'
};

// 签名取 HMAC 摘要前 8 位 hex（= 4 字节）
var SIGN_PREFIX_LEN = 8;

// 构建待签消息：mid + ts + nonce + path（三端必须完全一致）
function buildMessage(mid, ts, nonce, path) {
  return String(mid) + String(ts) + String(nonce) + String(path);
}

// 生成密码学安全 nonce（8 位 hex）。严禁用 Math.random()（可预测，属安全隐患）。
function genNonce() {
  return crypto.randomBytes(4).toString('hex');
}

// 对消息做 HMAC-SHA256，返回前 8 位 hex 签名
function sign(mid, ts, nonce, path) {
  var full = crypto.createHmac('sha256', HMAC_SECRET)
    .update(buildMessage(mid, ts, nonce, path), 'utf8')
    .digest('hex');
  return full.substring(0, SIGN_PREFIX_LEN);
}

// 时序安全比较（防时序侧信道攻击）。签名比较绝不能用 === / !==（长度不等直接 false，不抛异常）。
function constantTimeEqual(a, b) {
  var ba = Buffer.from(String(a).toLowerCase(), 'utf8');
  var bb = Buffer.from(String(b).toLowerCase(), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// 仅做签名校验（时间窗口与 nonce 去重由调用方负责），返回 { ok, mid } 或 { ok:false, code, error }
function verify(req) {
  var mid = req.headers[HEADER_NAMES.MID];
  var ts = parseInt(req.headers[HEADER_NAMES.TS], 10);
  var nonce = req.headers[HEADER_NAMES.NONCE];
  var sig = req.headers[HEADER_NAMES.SIG];
  if (!mid || !ts || !nonce || !sig) {
    return { ok: false, code: 401, error: '缺少认证参数' };
  }
  var expected = sign(mid, ts, nonce, req.originalUrl);
  if (!constantTimeEqual(sig, expected)) {
    return { ok: false, code: 401, error: '签名无效' };
  }
  return { ok: true, mid: mid };
}

module.exports = {
  HMAC_SECRET: HMAC_SECRET,
  HEADER_NAMES: HEADER_NAMES,
  SIGN_PREFIX_LEN: SIGN_PREFIX_LEN,
  buildMessage: buildMessage,
  genNonce: genNonce,
  sign: sign,
  verify: verify,
  constantTimeEqual: constantTimeEqual
};
