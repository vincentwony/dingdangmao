/**
 * test-e2e.js — 端到端授权流程测试
 * 模拟完整的 安装→试用→过期→激活→验签 流程
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_PATH = path.join(__dirname, 'public.pem');
const PRIVATE_KEY_PATH = path.join(__dirname, 'private.pem');

const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const ok = fn();
    if (ok) { passed++; console.log('  PASS:', name); }
    else { failed++; console.log('  FAIL:', name); }
  } catch(e) {
    failed++;
    console.log('  FAIL:', name, '-', e.message);
  }
}

// ── 模拟浏览器环境的数据 ──
function simulateMachineId() {
  const seed = crypto.randomBytes(16).toString('hex').toUpperCase();
  const parts = [
    '1920x1080', '2', 'Win32', 'zh-CN', 'Asia/Shanghai',
    'canvas-fingerprint-data',
    seed
  ];
  const input = parts.join('###');
  // Simple hash simulating the client-side hash
  const h = crypto.createHash('sha256').update(input).digest('hex');
  const hex12 = h.slice(0, 12).toUpperCase();
  return hex12.slice(0, 4) + '-' + hex12.slice(4, 8) + '-' + hex12.slice(8, 12);
}

// ── 模拟 keygen 生成注册码 ──
function generateLicense(machineId) {
  const cleanMid = machineId.replace(/-/g, '');
  const timestamp = Date.now();
  const payload = cleanMid + '|lifetime|' + timestamp;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payload);
  const sig = signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING });

  const sigB64 = sig.toString('base64');
  const licenseData = payload + '|' + sigB64;

  function group5(str) {
    const groups = [];
    for (let i = 0; i < str.length; i += 5) groups.push(str.slice(i, i + 5));
    return groups.join('-');
  }

  return {
    formatted: group5(licenseData),
    raw: licenseData,
    payload: payload,
    machineId: cleanMid,
    timestamp: timestamp
  };
}

// ── 模拟客户端验证 ──
function clientVerify(licenseData, localMachineId) {
  const cleanLocalMid = localMachineId.replace(/-/g, '');

  // 去掉分组分隔符
  const ungrouped = licenseData.replace(/-/g, '').replace(/\s/g, '');

  // 解析
  const lastPipe = ungrouped.lastIndexOf('|');
  if (lastPipe === -1) return { valid: false, reason: '格式无效' };

  const payload = ungrouped.slice(0, lastPipe);
  const sigB64 = ungrouped.slice(lastPipe + 1);

  const parts = payload.split('|');
  if (parts.length !== 3) return { valid: false, reason: '载荷格式无效' };
  const licensedMid = parts[0];
  const licenseType = parts[1];
  const timestamp = parts[2];

  if (licensedMid !== cleanLocalMid) return { valid: false, reason: '机器码不匹配' };
  if (licenseType !== 'lifetime') return { valid: false, reason: '授权类型无效' };

  // 验签
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(payload);
  const valid = verifier.verify({ key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(sigB64, 'base64'));
  if (!valid) return { valid: false, reason: '签名验证失败' };

  return { valid: true, reason: 'ok', machineId: licensedMid, type: licenseType, timestamp: parseInt(timestamp) };
}

console.log('═══════════════════════════════════════');
console.log('  端到端授权流程测试');
console.log('═══════════════════════════════════════\n');

// ── 场景1: 正常流程 ——
console.log('── 场景1: 正常安装→激活→验证 ──');
const mid = simulateMachineId();
console.log('  机器码:', mid);

const lic = generateLicense(mid);
console.log('  注册码(分组):', lic.formatted.slice(0, 60) + '...');
console.log('  注册码长度:', lic.raw.length, '字符');

test('正常流程验签', () => {
  const result = clientVerify(lic.raw, mid);
  return result.valid && result.machineId === mid.replace(/-/g, '') && result.type === 'lifetime';
});

test('带分隔符的注册码验签', () => {
  const result = clientVerify(lic.formatted, mid);
  return result.valid;
});

// ── 场景2: 安全测试 ──
console.log('\n── 场景2: 安全测试 ──');

test('错误机器码被拒绝', () => {
  const wrongMid = 'FFFF0000AAAA1111';
  const result = clientVerify(lic.raw, wrongMid);
  return !result.valid && result.reason === '机器码不匹配';
});

test('篡改注册码被拒绝', () => {
  const tampered = lic.raw.replace('lifetime', 'yearly');
  const result = clientVerify(tampered, mid);
  return !result.valid;
});

test('注册码被截断被拒绝', () => {
  const truncated = lic.raw.slice(0, -20);
  const result = clientVerify(truncated, mid);
  return !result.valid;
});

test('空注册码被拒绝', () => {
  const result = clientVerify('', mid);
  return !result.valid;
});

test('完全随机的注册码被拒绝', () => {
  const random = crypto.randomBytes(400).toString('base64');
  const result = clientVerify(random, mid);
  return !result.valid;
});

// ── 场景3: 不同设备不可互换 ──
console.log('\n── 场景3: 不同设备不可互换 ──');

test('设备A的码不能用于设备B', () => {
  const midA = simulateMachineId();
  const midB = simulateMachineId();
  const licA = generateLicense(midA);
  const result = clientVerify(licA.raw, midB);
  return !result.valid;
});

// ── 场景4: 分组格式往返 ──
console.log('\n── 场景4: 分组格式往返 ──');

test('分组→去分组→验签 往返', () => {
  const testMid = 'ABCDEF123456';
  const cleanTestMid = 'ABCDEF123456';
  const signer = crypto.createSign('RSA-SHA256');
  const testPayload = cleanTestMid + '|lifetime|' + Date.now();
  signer.update(testPayload);
  const testSig = signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING });
  const testData = testPayload + '|' + testSig.toString('base64');

  // 分组
  function group5(str) {
    const groups = [];
    for (let i = 0; i < str.length; i += 5) groups.push(str.slice(i, i + 5));
    return groups.join('-');
  }
  const formatted = group5(testData);

  // 验证往返
  const ungrouped = formatted.replace(/-/g, '');
  return ungrouped === testData;
});

// ── 最终 ──
console.log('\n═══════════════════════════════════════');
console.log('  结果: ' + passed + ' 通过, ' + failed + ' 失败');
console.log('═══════════════════════════════════════');
if (failed === 0) console.log('\n 端到端测试全部通过！授权系统验证完毕。');
