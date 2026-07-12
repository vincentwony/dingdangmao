/**
 * test-decrypt.js — 诊断私钥解密问题
 *
 * 用法: node .license/test-decrypt.js <密码>
 *
 * 用和你打开 keygen.html 时相同的密码运行，诊断是密码问题还是代码问题。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENCRYPTED_KEY_PATH = path.join(__dirname, 'encrypted-key.json');

if (!fs.existsSync(ENCRYPTED_KEY_PATH)) {
  console.error('[错误] 找不到', ENCRYPTED_KEY_PATH);
  console.error('请先运行 node .license/init-keygen.js 生成加密私钥');
  process.exit(1);
}

const password = process.argv[2];
if (!password) {
  console.error('用法: node .license/test-decrypt.js <密码>');
  console.error('请输入和打开 keygen.html 时相同的密码');
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(ENCRYPTED_KEY_PATH, 'utf8'));

  console.log('═══════════════════════════════════════');
  console.log('  私钥解密诊断');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('算法:', data.algorithm);
  console.log('迭代:', data.iterations);
  console.log('salt长度:', Buffer.from(data.salt, 'base64').length, 'bytes');
  console.log('payload长度:', Buffer.from(data.payload, 'base64').length, 'bytes');
  console.log('');

  // 派生密钥
  console.log('[1/3] 派生 AES 密钥...');
  const salt = Buffer.from(data.salt, 'base64');
  const startTime = Date.now();
  const aesKey = crypto.pbkdf2Sync(password, salt, data.iterations, 32, 'sha512');
  console.log('  PBKDF2 耗时:', Date.now() - startTime, 'ms');
  console.log('  密钥长度:', aesKey.length, 'bytes (预期32)');

  // 解析 payload
  console.log('[2/3] 解析并解密...');
  const payload = Buffer.from(data.payload, 'base64');
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);

  console.log('  IV:', iv.toString('hex'));
  console.log('  AuthTag:', authTag.toString('hex'));
  console.log('  密文长度:', ciphertext.length, 'bytes');

  // 解密
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  console.log('[3/3] 解密成功！');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  诊断结果: 解密成功 ✅');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('私钥前80字符:');
  console.log(decrypted.toString('utf8').slice(0, 80));
  console.log('');
  console.log('结论: 密码正确，加密/解密流程在 Node.js 端正常。');
  console.log('如果 keygen.html 中仍然报错，可能是浏览器兼容性问题。');
  console.log('请检查浏览器控制台(F12)的完整错误信息。');

} catch (e) {
  console.log('[3/3] 解密失败 ❌');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  诊断结果: 解密失败');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('错误:', e.message);

  if (e.message.includes('auth') || e.message.includes('Authentication') || e.message.includes('unsupported_state') || e.message.includes('bad decrypt')) {
    console.log('');
    console.log('原因: 密码错误！AES-GCM 认证标签验证失败。');
    console.log('请确认你输入的密码和运行 init-keygen.js 时设置的密码一致。');
    console.log('注意: 密码区分大小写，中英文输入法也可能有影响。');
  } else {
    console.log('原因: 数据解析/格式错误');
  }
}
