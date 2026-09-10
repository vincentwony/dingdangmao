// verify/_hmac_audit.mjs — HMAC 共享库安全回归
// 固化：时序安全比较、签名格式、verify() 行为。CI 可独立运行（无需服务）。
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, 'x.js'));
const hmac = require(join(__dirname, '..', 'server', 'lib', 'hmac.js'));

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name); }
}

console.log('== HMAC 安全审计 ==');

// —— 时序安全比较（Finding A：原 ! == 非时序，已修复）——
ok('constantTimeEqual 相同串 → true', hmac.constantTimeEqual('abcd1234', 'abcd1234') === true);
ok('constantTimeEqual 单字节不同 → false', hmac.constantTimeEqual('abcd1234', 'abcd1235') === false);
ok('constantTimeEqual 长度不同 → false(不抛)', (() => { try { return hmac.constantTimeEqual('ab', 'abcd') === false; } catch (e) { return false; } })());
ok('constantTimeEqual 大小写不敏感 → true', hmac.constantTimeEqual('ABCD1234', 'abcd1234') === true);
ok('constantTimeEqual 空串 vs 有效 → false(不抛)', (() => { try { return hmac.constantTimeEqual('', 'abcd1234') === false; } catch (e) { return false; } })());

// —— 签名格式（Finding C：8 hex 小写，项目既有契约）——
const s = hmac.sign('mid', 1700000000000, 'deadbeef', '/api/v1/bazi');
ok('sign 返回 8 位 hex', /^[0-9a-f]{8}$/.test(s));
ok('sign 为小写', s === s.toLowerCase());

// —— 消息构成幂等（三端一致）——
ok('buildMessage 拼接一致', hmac.buildMessage('m', '1', 'n', '/p') === 'm1n/p');

// —— verify() 行为（含时序安全路径）——
const mid = 'audit-bot', ts = Date.now(), nonce = hmac.genNonce(), path = '/api/v1/bazi';
const goodSig = hmac.sign(mid, ts, nonce, path);
const okReq = { originalUrl: path, headers: { 'x-machine-id': mid, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': goodSig } };
ok('verify 合法签名 → ok', hmac.verify(okReq).ok === true);
const badReq = { originalUrl: path, headers: { 'x-machine-id': mid, 'x-timestamp': String(ts), 'x-nonce': nonce, 'x-signature': goodSig.slice(0, 7) + (goodSig[7] === '0' ? '1' : '0') } };
ok('verify 篡改签名 → !ok', hmac.verify(badReq).ok === false);
const missReq = { headers: { 'x-machine-id': mid } };
ok('verify 缺头 → !ok(401)', hmac.verify(missReq).ok === false && hmac.verify(missReq).code === 401);

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
