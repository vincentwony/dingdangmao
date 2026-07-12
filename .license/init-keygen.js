/**
 * init-keygen.js — 私钥加密工具（仅用一次）
 *
 * 用法：
 *   node .license/init-keygen.js
 *
 * 功能：
 *   1. 读取 .license/private.pem（RSA 私钥）
 *   2. 提示输入管理密码
 *   3. PBKDF2 派生 AES-256-GCM 密钥
 *   4. 加密私钥并输出
 *   5. 将加密私钥 + salt + iv 写入 .license/encrypted-key.json
 *
 * 完成后请安全删除 private.pem，仅在离线加密介质中备份。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PRIVATE_KEY_PATH = path.join(__dirname, 'private.pem');
const OUTPUT_PATH = path.join(__dirname, 'encrypted-key.json');

function askPassword(query) {
  return new Promise((resolve) => {
    // Use stdout.write for hidden input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // For simple password reading, use stdin directly
    process.stdout.write(query);

    // Switch to raw mode for hidden input
    const { stdin } = process;
    const oldRaw = stdin.isRaw;
    if (typeof oldRaw === 'boolean') {
      stdin.setRawMode(true);
    }

    let password = '';
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (ch) => {
      ch = ch.toString();
      if (ch === '\r' || ch === '\n') {
        stdin.removeListener('data', onData);
        if (typeof oldRaw === 'boolean') {
          stdin.setRawMode(oldRaw);
        }
        stdin.pause();
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (ch === '\x08' || ch === '\x7F') {
        // backspace
        password = password.slice(0, -1);
        return;
      }
      if (ch === '\x03') {
        // Ctrl+C
        process.exit(0);
      }
      password += ch;
      process.stdout.write('*');
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   公信万年历 — 私钥加密工具         ║');
  console.log('║   此脚本仅需运行一次                 ║');
  console.log('╚══════════════════════════════════════╝\n');

  // 1. Read private key
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('[错误] 找不到私钥文件:', PRIVATE_KEY_PATH);
    console.error('请先生成 RSA 密钥对：');
    console.error('  openssl genrsa -out .license/private.pem 2048');
    process.exit(1);
  }
  const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  console.log('[1/3] 已读取私钥文件（RSA-2048）\n');

  // 2. Ask for password (twice)
  const password = await askPassword('请输入管理密码（至少8位，用于保护私钥）: ');
  if (password.length < 8) {
    console.error('[错误] 密码至少需要8位');
    process.exit(1);
  }

  const password2 = await askPassword('再次输入密码确认: ');
  if (password !== password2) {
    console.error('[错误] 两次密码不一致');
    process.exit(1);
  }
  console.log('');

  // 3. Derive key and encrypt
  console.log('[2/3] 正在加密私钥...');

  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // PBKDF2 derive AES-256 key
  const aesKey = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha512');

  // AES-256-GCM encrypt
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyPem, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext
  const payload = Buffer.concat([iv, authTag, encrypted]);

  const output = {
    version: 1,
    algorithm: 'PBKDF2-SHA512+AES-256-GCM',
    iterations: 600000,
    salt: salt.toString('base64'),
    payload: payload.toString('base64'),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('[3/3] 加密完成 →', OUTPUT_PATH);
  console.log('');

  // 4. Print the JSON for easy copy
  console.log('╔══════════════════════════════════════╗');
  console.log('║ 以下内容已写入 encrypted-key.json    ║');
  console.log('║ 请将此内容粘贴到 keygen.html 中      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(JSON.stringify(output));
  console.log('');
  console.log('⚠  重要提醒：');
  console.log('  1. 将 encrypted-key.json 的内容复制到 keygen.html 中替换占位符');
  console.log('  2. 建议删除 .license/private.pem 或将私钥移到安全离线存储');
  console.log('  3. 请务必记住你的管理密码，丢失密码无法恢复私钥！');
}

main().catch((err) => {
  console.error('[错误]', err.message);
  process.exit(1);
});
