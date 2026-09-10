/**
 * scripts/check-syntax.js — 前端 JS 语法闸门 (L0)
 *
 * 用途：对 web/js 下全部 ES 模块做 node --check 语法校验。
 * 这是挡住「启动文件（app.js 等）语法错误导致整站白屏」的头号安全网。
 *
 * 用法: node scripts/check-syntax.js [目录或文件...]
 * 默认: web/js/
 * 依赖: node (>=14, 支持 ESM 语法检查)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var cp = require('child_process');

// 优先使用受管 node 运行时（当前进程的执行文件，最可靠），回退到 PATH 中的 node
var NODE = process.env.MANAGED_NODE || process.execPath || 'node';

var DEFAULT_DIRS = ['web/js/'];
var EXTS = ['.js', '.mjs'];

function collectFiles(dirs) {
  var files = [];
  for (var i = 0; i < dirs.length; i++) {
    var dir = dirs[i];
    if (!fs.existsSync(dir)) continue;
    var stat = fs.statSync(dir);
    if (stat.isFile()) {
      if (EXTS.includes(path.extname(dir))) files.push(dir);
    } else {
      walk(dir, files);
    }
  }
  return files;
}

function walk(dir, out) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].name.startsWith('.') || entries[i].name === 'node_modules') continue;
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) walk(full, out);
    else if (EXTS.includes(path.extname(entries[i].name))) out.push(full);
  }
}

function checkFile(file) {
  var res = cp.spawnSync(NODE, ['--check', file], { encoding: 'utf8' });
  if (res.error) {
    return { file: file, ok: false, stderr: 'spawn 失败: ' + (res.error.code || res.error.message) };
  }
  return {
    file: file,
    ok: res.status === 0,
    stderr: (res.stderr || '').trim()
  };
}

// ── 主流程 ──
var args = process.argv.slice(2).filter(function(a) { return !a.startsWith('--'); });
var dirs = args.length > 0 ? args : DEFAULT_DIRS;

console.log('═══════════════════════════════════');
console.log('  前端 JS 语法闸门 (L0)');
console.log('═══════════════════════════════════\n');

var files = collectFiles(dirs);
if (files.length === 0) {
  console.log('⚠ 未找到 JS 文件于: ' + dirs.join(', '));
  process.exit(0);
}
console.log('扫描文件: ' + files.length + '\n');

var failed = [];
for (var i = 0; i < files.length; i++) {
  var r = checkFile(files[i]);
  if (r.ok) {
    console.log('  ✅ ' + path.relative('.', r.file));
  } else {
    console.log('  ❌ ' + path.relative('.', r.file));
    failed.push(r);
  }
}

console.log('');
if (failed.length > 0) {
  console.log('─'.repeat(40));
  console.log('发现 ' + failed.length + ' 个语法错误:');
  for (var j = 0; j < failed.length; j++) {
    console.log('\n  📄 ' + path.relative('.', failed[j].file));
    // node --check 错误通常含 "file:line" 前缀，原样输出
    console.log('  ' + failed[j].stderr.split('\n').join('\n  '));
  }
  console.log('\n' + '─'.repeat(40));
  console.log('⛔ 语法校验未通过，请修复后再继续');
  process.exit(1);
} else {
  console.log('✅ 全部 ' + files.length + ' 个文件语法校验通过');
}
