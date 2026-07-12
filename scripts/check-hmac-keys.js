/**
 * scripts/check-hmac-keys.js — HMAC 密钥一致性校验
 *
 * 规则: 所有文件中的 HMAC 密钥必须完全一致
 * 涉及文件 (共 7 个): index.html, keygen.html, server-keygen.js,
 *   worker-deno.js, worker-license.js, server/middleware/auth.js, web/js/api.js
 *
 * 用法: node scripts/check-hmac-keys.js [--report]
 */

'use strict';

var fs = require('fs');
var path = require('path');

// ── 预期文件及其密钥变量/格式 ──
var TARGETS = [
  { file: 'index.html',         pattern: /_LIC_HMAC_K1\s*=\s*'([^']+)'.*_LIC_HMAC_K2\s*=\s*'([^']+)'/s, combine: true },
  { file: 'keygen.html',        pattern: /HMAC_KEY\s*=\s*'([^']+)'/, combine: false },
  { file: 'server-keygen.js',   pattern: /HMAC_SECRET.*"([^"]+)"/, combine: false },
  { file: 'worker-deno.js',     pattern: /HMAC_SECRET.*"([^"]+)"/, combine: false },
  { file: 'worker-license.js',  pattern: /HMAC_SECRET.*'([^']+)'/, combine: false },
  { file: 'server/middleware/auth.js', pattern: /HMAC_SECRET.*'([^']+)'/, combine: false },
  { file: 'web/js/api.js',      pattern: /HMAC_KEY\s*=\s*'([^']+)'/, combine: false },
  { file: 'build/web/js/api.js',pattern: /HMAC_KEY\s*=\s*'([^']+)'/, combine: false },
  { file: 'WannianliAndroid/app/src/main/assets/www/js/api.js', pattern: /HMAC_KEY\s*=\s*'([^']+)'/, combine: false }
];

var REPORT_ONLY = process.argv.includes('--report');
var ROOT = path.join(__dirname, '..');

console.log('═══════════════════════════════════');
console.log('  HMAC 密钥一致性校验');
console.log('═══════════════════════════════════\n');

var keys = {}; // fullKey → [files]
var missing = [];
var parseErrors = [];

for (var i = 0; i < TARGETS.length; i++) {
  var t = TARGETS[i];
  var fp = path.join(ROOT, t.file);
  if (!fs.existsSync(fp)) {
    missing.push(t.file);
    continue;
  }

  try {
    var content = fs.readFileSync(fp, 'utf8');
    var m = content.match(t.pattern);

    if (!m) {
      parseErrors.push({ file: t.file, error: '未找到密钥定义' });
      continue;
    }

    var fullKey;
    if (t.combine) {
      fullKey = m[1] + m[2]; // 拼接 K1+K2
    } else {
      fullKey = m[1];
    }

    // 验证格式: 32 个 hex 字符
    if (!/^[0-9a-fA-F]{32}$/.test(fullKey)) {
      parseErrors.push({ file: t.file, error: '密钥格式异常: ' + fullKey.substring(0, 16) + '...' });
      continue;
    }

    if (!keys[fullKey]) keys[fullKey] = [];
    keys[fullKey].push(t.file);
  } catch(e) {
    parseErrors.push({ file: t.file, error: e.message });
  }
}

// ── 输出 ──
var keyList = Object.keys(keys);

if (keyList.length === 0) {
  console.log('❌ 未找到任何有效密钥');
  process.exit(1);
}

if (keyList.length === 1) {
  var k = keyList[0];
  console.log('✅ 密钥一致: ' + k.substring(0, 8) + '... (' + keys[k].length + ' 个文件)');
  for (var i = 0; i < keys[k].length; i++) {
    console.log('  ✓ ' + keys[k][i]);
  }
} else {
  console.log('❌ 密钥不一致！发现 ' + keyList.length + ' 个不同密钥:\n');
  for (var ki = 0; ki < keyList.length; ki++) {
    var k = keyList[ki];
    console.log('  密钥 ' + (ki + 1) + ': ' + k.substring(0, 8) + '...');
    for (var j = 0; j < keys[k].length; j++) {
      console.log('    - ' + keys[k][j]);
    }
    console.log('');
  }
}

if (missing.length > 0) {
  console.log('⚠ 文件缺失 (' + missing.length + '):');
  for (var i = 0; i < missing.length; i++) console.log('  ✗ ' + missing[i]);
  console.log('');
}

if (parseErrors.length > 0) {
  console.log('⚠ 解析错误 (' + parseErrors.length + '):');
  for (var i = 0; i < parseErrors.length; i++) {
    console.log('  ✗ ' + parseErrors[i].file + ': ' + parseErrors[i].error);
  }
  console.log('');
}

if (keyList.length !== 1 || parseErrors.length > 0) {
  if (!REPORT_ONLY) process.exit(1);
}
