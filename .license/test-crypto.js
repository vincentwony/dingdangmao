/**
 * test-crypto.js — Node.js 环境下验证 RSA 签名/验签流程
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY_PATH = path.join(__dirname, 'private.pem');
const PUBLIC_KEY_PATH = path.join(__dirname, 'public.pem');

console.log('═══════════════════════════════════════');
console.log('  授权流程测试 — RSA-2048 签名/验签');
console.log('═══════════════════════════════════════\n');

const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

let passed = 0;
let failed = 0;

// ── 测试1: 签名/验签基本流程 ──
console.log('── 测试1: 签名/验签基本流程 ──');
const machineId = 'A1B2C3D4E5F6G7H8';
const timestamp = Date.now();
const payload = machineId + '|lifetime|' + timestamp;
console.log('  载荷:', payload);

const signer = crypto.createSign('RSA-SHA256');
signer.update(payload);
const sig = signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING });
console.log('  签名长度:', sig.length, 'bytes (预期256)');
console.log('  签名长度验证:', sig.length === 256 ? 'PASS' : 'FAIL — 长度不对');

const verifier = crypto.createVerify('RSA-SHA256');
verifier.update(payload);
const valid = verifier.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sig);
console.log('  验签结果:', valid ? 'PASS' : 'FAIL');
if (valid) passed++; else failed++;

// ── 测试2: Base64 编码往返 ──
console.log('\n── 测试2: Base64 编码往返 ──');
// 使用标准Base64（含 +/），分组分隔符用 - 无歧义
const sigB64 = sig.toString('base64')
  .replace(/=/g, '');  // 去掉填充（可选，atob 兼容）
const licenseData = payload + '|' + sigB64;
console.log('  完整注册数据长度:', licenseData.length, '字符');
console.log('  前80字符:', licenseData.slice(0, 80) + '...');

// 解析
const parts = licenseData.split('|');
const sigPart = parts.pop();
const payloadPart = parts.join('|');
console.log('  提取载荷:', payloadPart);
console.log('  载荷匹配:', payloadPart === payload ? 'PASS' : 'FAIL');

// 解码签名并验签
const sigDecoded = Buffer.from(sigPart, 'base64');
const verifier2 = crypto.createVerify('RSA-SHA256');
verifier2.update(payloadPart);
const valid2 = verifier2.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sigDecoded);
console.log('  往返验签:', valid2 ? 'PASS' : 'FAIL');
if (valid2) passed++; else failed();

// ── 测试3: 篡改检测 ──
console.log('\n── 测试3: 篡改检测 ──');
// 篡改机器码
const tamperedPayload = 'FAKE1234ABCD5678|lifetime|' + timestamp;
const verifier3 = crypto.createVerify('RSA-SHA256');
verifier3.update(tamperedPayload);
const valid3 = verifier3.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sig);
console.log('  篡改机器码:', valid3 ? 'FAIL — 应拒绝' : 'PASS — 正确拒绝');
if (!valid3) passed++; else failed++;

// 篡改时间戳
const tamperedPayload2 = machineId + '|lifetime|9999999999999';
const verifier4 = crypto.createVerify('RSA-SHA256');
verifier4.update(tamperedPayload2);
const valid4 = verifier4.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sig);
console.log('  篡改时间戳:', valid4 ? 'FAIL — 应拒绝' : 'PASS — 正确拒绝');
if (!valid4) passed++; else failed++;

// ── 测试4: 不同机器码不可互换 ──
console.log('\n── 测试4: 不同机器码不可互换 ──');
const mid1 = 'A1B2C3D4E5F6G7H8';
const mid2 = 'Z9Y8X7W6V5U4T3S2';
const signer2 = crypto.createSign('RSA-SHA256');
signer2.update(mid1 + '|lifetime|' + timestamp);
const sigForMid1 = signer2.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING });

const verifier5 = crypto.createVerify('RSA-SHA256');
verifier5.update(mid2 + '|lifetime|' + timestamp);
const valid5 = verifier5.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sigForMid1);
console.log('  机器码A的注册码用于B:', valid5 ? 'FAIL — 应拒绝' : 'PASS — 正确拒绝');
if (!valid5) passed++; else failed++;

// ── 测试5: 注册码分组格式 ──
console.log('\n── 测试5: 注册码分组格式 ──');
function group5(str) {
  const groups = [];
  for (let i = 0; i < str.length; i += 5) groups.push(str.slice(i, i + 5));
  return groups.join('-');
}
const formatted = group5(licenseData);
console.log('  分组格式长度:', formatted.length, '字符');
console.log('  前60字符:', formatted.slice(0, 60) + '...');
const ungrouped = formatted.replace(/-/g, '');
console.log('  去分隔符后匹配:', ungrouped === licenseData ? 'PASS' : 'FAIL');
if (ungrouped === licenseData) passed++; else failed++;

// ── 最终 ──
console.log('\n═══════════════════════════════════════');
console.log('  结果: ' + passed + ' 通过, ' + failed + ' 失败');
console.log('═══════════════════════════════════════');
if (failed === 0) console.log('\n 所有测试通过！授权流程已验证可用。');
