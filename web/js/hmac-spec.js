// web/js/hmac-spec.js — 浏览器端 HMAC 规范（与 server/lib/hmac.js 算法一致）
// 纯浏览器安全：常量 / 消息格式 / nonce 生成。
// 签名本身用 Web Crypto（见 api.js _sign），无法与服务端 Node crypto 共用实现，故此处仅共享"规范"。
// 本文件必须是 api.js 的唯一 HMAC 规范来源，禁止在别处再写一份。

// 与 server/lib/hmac.js 的 HEADER_NAMES 完全一致
export const HEADER_NAMES = {
  MID: 'x-machine-id',
  TS: 'x-timestamp',
  NONCE: 'x-nonce',
  SIG: 'x-signature'
};

// 与 server/lib/hmac.js 的 HMAC_SECRET 默认值同一字面量。
// 前端密钥按设计非保密（machine-id 体系，用于请求鉴权而非保密），但只允许在此一处定义。
export const HMAC_KEY = '381cb51f0923fc771bf7e81547c485f7';

export const SIGN_PREFIX_LEN = 8;

// 构建待签消息：mid + ts + nonce + path（必须与 server 端 buildMessage 完全一致）
export function buildMessage(mid, ts, nonce, path) {
  return String(mid) + String(ts) + String(nonce) + String(path);
}

// 密码学安全 nonce（8 位 hex）。
// crypto.getRandomValues 不受「安全上下文」限制（不同于 crypto.subtle），
// 局域网 HTTP 下依然可用，故为首选路径；仅在极老 WebView 完全缺失时才降级。
// nonce 的语义是「一次性防重放」，要求唯一性优先于不可预测性，
// 因此降级路径用 时间戳 + Math.random 组合保证唯一，且绝不用于签名密钥。
export function genNonce() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    }
  } catch (e) { /* 落到降级路径 */ }

  var v = ((Date.now() & 0xffff) ^ Math.floor(Math.random() * 0xffff)) * 0x10000
        + Math.floor(Math.random() * 0xffff);
  return (v >>> 0).toString(16).padStart(8, '0').slice(-8);
}
