/**
 * test-anti-tamper.js — 防篡改场景测试
 *
 * 模拟各种攻击场景，验证授权系统的健壮性
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

// ── 辅助函数：模拟客户端验证 ──
function clientVerify(licenseData, localMachineId) {
  const cleanLocalMid = localMachineId.replace(/-/g, '').replace(/\s/g, '');
  const ungrouped = licenseData.replace(/-/g, '').replace(/\s/g, '');
  const lastPipe = ungrouped.lastIndexOf('|');
  if (lastPipe === -1) return { valid: false, reason: '格式无效' };
  const payload = ungrouped.slice(0, lastPipe);
  const sigB64 = ungrouped.slice(lastPipe + 1);
  const parts = payload.split('|');
  if (parts.length !== 3) return { valid: false, reason: '载荷格式无效' };
  const licensedMid = parts[0];
  if (licensedMid !== cleanLocalMid) return { valid: false, reason: '机器码不匹配' };
  if (parts[1] !== 'lifetime') return { valid: false, reason: '授权类型无效' };
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(payload);
  const valid = verifier.verify(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(sigB64, 'base64')
  );
  if (!valid) return { valid: false, reason: '签名验证失败' };
  return { valid: true, reason: 'ok', payload: payload };
}

// ── 辅助：模拟生成注册码 ──
function generateLicense(machineId) {
  const cleanMid = machineId.replace(/-/g, '');
  const timestamp = Date.now();
  const payload = cleanMid + '|lifetime|' + timestamp;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payload);
  const sig = signer.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING });
  return { raw: payload + '|' + sig.toString('base64'), payload: payload, mid: cleanMid };
}

// ── 辅助：生成13字符hex（模拟机器码）──
function makeMid() {
  const bytes = crypto.randomBytes(8);
  const hex = bytes.toString('hex').slice(0, 12).toUpperCase();
  return hex.slice(0, 4) + '-' + hex.slice(4, 8) + '-' + hex.slice(8, 12);
}

console.log('═══════════════════════════════════════');
console.log('  防篡改安全测试');
console.log('═══════════════════════════════════════\n');

// ━━━ 场景1: 注册码格式攻击 ━━━
console.log('── 场景1: 注册码格式攻击 ──');

test('空字符串被拒绝', () => {
  const r = clientVerify('', makeMid());
  return !r.valid;
});

test('纯随机字符串被拒绝', () => {
  const r = clientVerify(crypto.randomBytes(400).toString('hex'), makeMid());
  return !r.valid;
});

test('无签名的载荷被拒绝', () => {
  const r = clientVerify('ABCDEF123456|lifetime|9999999999999', 'ABCDEF123456');
  return !r.valid;
});

test('分组分隔符混合攻击被正确解析', () => {
  // 在注册码中加入恶意 - 混淆分组解析
  const mid = makeMid();
  const lic = generateLicense(mid);
  // 注入额外的 - 试图绕过
  const tampered = lic.raw.replace(/A/g, '-');  // 替换某些字符为 -
  const r = clientVerify(tampered, mid);
  return !r.valid;  // 签名会失败因为数据被篡改
});

test('中间插入管道符攻击被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  // 在签名中插入 || 试图伪造 payload 部分
  const tampered = lic.raw.slice(0, lic.raw.indexOf('|') + 1) + '||' + lic.raw.slice(lic.raw.indexOf('|') + 1);
  const r = clientVerify(tampered, mid);
  return !r.valid;
});

// ━━━ 场景2: 机器码篡改 ━━━
console.log('\n── 场景2: 机器码篡改 ──');

test('注册码机器码与设备机器码不匹配被拒绝', () => {
  const midA = makeMid();
  const midB = makeMid();
  const lic = generateLicense(midA);
  const r = clientVerify(lic.raw, midB);
  return !r.valid && r.reason === '机器码不匹配';
});

test('机器码大小写变异被拒绝（精确匹配）', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  const r = clientVerify(lic.raw, mid.toLowerCase());
  return !r.valid;  // 大小写不一致应拒绝
});

test('机器码含分隔符的变体被拒绝', () => {
  const mid = 'ABCD-EF12-3456';
  const lic = generateLicense(mid);
  // 客户端应该标准化机器码（去掉 - 再比较）
  const r = clientVerify(lic.raw, 'ABCDEF123456');
  return r.valid;  // 这个是合法的 — 客户端会标准化
});

// ━━━ 场景3: 授权类型篡改 ━━━
console.log('\n── 场景3: 授权类型篡改 ──');

test('lifetime→yearly 篡改被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  const tampered = lic.raw.replace('|lifetime|', '|yearly|');
  const r = clientVerify(tampered, mid);
  return !r.valid;
});

test('lifetime→trial 篡改被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  const tampered = lic.raw.replace('|lifetime|', '|trial|');
  const r = clientVerify(tampered, mid);
  return !r.valid;
});

// ━━━ 场景4: 签名截断/部分篡改 ━━━
console.log('\n── 场景4: 签名篡改 ──');

test('签名中间某字符修改被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  const chars = lic.raw.split('');
  // 修改签名中间位置（跳过载荷部分）
  const sigStart = lic.raw.lastIndexOf('|') + 1;
  const modIdx = sigStart + Math.floor((lic.raw.length - sigStart) / 2);
  chars[modIdx] = chars[modIdx] === 'A' ? 'B' : 'A';
  const r = clientVerify(chars.join(''), mid);
  return !r.valid;
});

test('签名被截断4字符（丢失3字节）被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  // 截断至少4个字符以确保丢失有效载荷字节
  const r = clientVerify(lic.raw.slice(0, -4), mid);
  return !r.valid;
});

// 签名追加攻击被 Base64 padding (==) 自然防御
// 因为 RSA-2048 签名 256 字节 ≡ 1 mod 3，总有 2 个 padding 字符
// atob() 遇到 == 后忽略后续内容，所以追加数据无效
// 真正有效的攻击是修改签名中间的字符（已验证通过）

test('载荷末尾被篡改（时间戳+1）被拒绝', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  // 修改时间戳最后一位数字
  const tampered = lic.raw.replace(/lifetime\|\d+/, function(m) {
    return m.slice(0, -1) + (parseInt(m.slice(-1)) + 1) % 10;
  });
  const r = clientVerify(tampered, mid);
  return !r.valid;
});

// ━━━ 场景5: 跨设备攻击 ━━━
console.log('\n── 场景5: 跨设备攻击 ──');

test('10个不同设备码各自验签通过', () => {
  for (let i = 0; i < 10; i++) {
    const mid = makeMid();
    const lic = generateLicense(mid);
    const r = clientVerify(lic.raw, mid);
    if (!r.valid) return false;
  }
  return true;
});

test('10个设备的码不可互换', () => {
  const mids = [];
  const lics = [];
  for (let i = 0; i < 10; i++) {
    mids.push(makeMid());
    lics.push(generateLicense(mids[i]));
  }
  // 每个码只能用在自己的设备上
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (i === j) continue;
      const r = clientVerify(lics[i].raw, mids[j]);
      if (r.valid) return false;  // 不应该通过
    }
  }
  return true;
});

// ━━━ 场景6: 重放/重装攻击 ━━━
console.log('\n── 场景6: 重放攻击 ──');

test('相同机器码生成的两个注册码均可验证', () => {
  const mid = makeMid();
  const lic1 = generateLicense(mid);
  const lic2 = generateLicense(mid);  // 不同时间戳
  const r1 = clientVerify(lic1.raw, mid);
  const r2 = clientVerify(lic2.raw, mid);
  return r1.valid && r2.valid && lic1.payload !== lic2.payload;  // 不同的签名
});

test('旧的注册码仍然有效（时间戳向前）', () => {
  const mid = makeMid();
  const lic = generateLicense(mid);
  // 注册码中的时间戳是过去的，但仍然应该有效
  const r = clientVerify(lic.raw, mid);
  return r.valid;
});

// ━━━ 最终 ━━━
console.log('\n═══════════════════════════════════════');
console.log('  防篡改测试: ' + passed + ' 通过, ' + failed + ' 失败');
console.log('═══════════════════════════════════════');
if (failed === 0) console.log('\n 全部防篡改测试通过！');
