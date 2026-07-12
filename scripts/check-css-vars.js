/**
 * scripts/check-css-vars.js — CSS 变量一致性校验
 *
 * 检查规则：
 *   1. 所有 var(--x) 引用必须有对应的 --x: 定义
 *   2. 无回退值的 var(--x) 引用会触发警告（声明可能静默失效）
 *
 * 用法: node scripts/check-css-vars.js [文件或目录...]
 * 默认: web/css/
 */

'use strict';

var fs = require('fs');
var path = require('path');

var CSS_DIRS = ['web/css/', 'web/'];
var EXTS = ['.css', '.html'];
var REPORT_ONLY = process.argv.includes('--report');

// ── JS 动态设置的 CSS 变量（不在 .css 文件中定义，属于预期例外）──
var JS_DEFINED_VARS = new Set([
  '--top-nav-height'  // web/js/dom-helpers.js: _updateTopNavHeight()
]);

// ── 收集所有 CSS 变量定义 ──
function collectDefinedVars(files) {
  var defined = new Map(); // varName → { file, line }
  var re = /--[\w-]+\s*:/g;

  for (var i = 0; i < files.length; i++) {
    var content = fs.readFileSync(files[i], 'utf8');
    var lines = content.split('\n');
    for (var ln = 0; ln < lines.length; ln++) {
      var m;
      while ((m = re.exec(lines[ln])) !== null) {
        var name = m[0].replace(/\s*:$/, '').trim();
        if (!defined.has(name)) {
          defined.set(name, { file: files[i], line: ln + 1 });
        }
      }
    }
  }
  return defined;
}

// ── 收集所有 var() 引用 ──
function collectVarRefs(files) {
  var refs = []; // { name, hasFallback, file, line }
  var re = /var\((--[\w-]+)(\s*,\s*[^)]+)?\)/g;

  for (var i = 0; i < files.length; i++) {
    var content = fs.readFileSync(files[i], 'utf8');
    var lines = content.split('\n');
    for (var ln = 0; ln < lines.length; ln++) {
      var m;
      while ((m = re.exec(lines[ln])) !== null) {
        refs.push({
          name: m[1],
          hasFallback: !!m[2],
          file: files[i],
          line: ln + 1
        });
      }
    }
  }
  return refs;
}

// ── 收集文件 ──
function collectFiles(dirs) {
  var files = [];
  for (var i = 0; i < dirs.length; i++) {
    var dir = dirs[i];
    if (!fs.existsSync(dir)) continue;
    var stat = fs.statSync(dir);
    if (stat.isFile()) {
      if (EXTS.includes(path.extname(dir))) files.push(dir);
    } else {
      walkDir(dir, files);
    }
  }
  return files;
}

function walkDir(dir, out) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].name.startsWith('.') || entries[i].name === 'node_modules') continue;
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) walkDir(full, out);
    else if (EXTS.includes(path.extname(entries[i].name))) out.push(full);
  }
}

// ── 主流程 ──
var dirs = process.argv.slice(2).filter(function(a) { return !a.startsWith('--'); });
if (dirs.length === 0) dirs = CSS_DIRS;

console.log('═══════════════════════════════════');
console.log('  CSS 变量一致性校验');
console.log('═══════════════════════════════════\n');

var files = collectFiles(dirs);
console.log('扫描文件: ' + files.length + '\n');

var defined = collectDefinedVars(files);
console.log('已定义变量: ' + defined.size);

var refs = collectVarRefs(files);
console.log('var() 引用: ' + refs.length + '\n');

// ── 检查 ──
var issues = [];
var warns = [];

for (var i = 0; i < refs.length; i++) {
  var r = refs[i];
  if (!defined.has(r.name) && !JS_DEFINED_VARS.has(r.name)) {
    issues.push({
      type: 'undefined',
      name: r.name,
      file: path.relative('.', r.file),
      line: r.line
    });
  }
  if (!r.hasFallback && defined.has(r.name)) {
    warns.push({
      type: 'no_fallback',
      name: r.name,
      file: path.relative('.', r.file),
      line: r.line,
      definedIn: path.relative('.', defined.get(r.name).file) + ':' + defined.get(r.name).line
    });
  }
}

// ── 未使用的变量 ──
var usedVars = new Set();
for (var i = 0; i < refs.length; i++) usedVars.add(refs[i].name);
var unused = [];
defined.forEach(function(val, key) {
  if (!usedVars.has(key)) unused.push(key);
});

// ── 输出 ──
if (issues.length > 0) {
  console.log('❌ 未定义变量 (' + issues.length + '):');
  for (var i = 0; i < issues.length; i++) {
    var iss = issues[i];
    console.log('  ' + iss.name + '  →  ' + iss.file + ':' + iss.line);
  }
  console.log('');
}

if (warns.length > 0) {
  console.log('⚠ 无回退值变量 (' + warns.length + '):');
  for (var i = 0; i < warns.length; i++) {
    var w = warns[i];
    console.log('  ' + w.name + '  (' + w.file + ':' + w.line + ')  定义于: ' + w.definedIn);
  }
  console.log('  提示: var(--x, fallback) 可防止声明静默失效');
  console.log('');
}

if (unused.length > 0) {
  console.log('ℹ 未使用的定义变量 (' + unused.length + '):');
  for (var i = 0; i < Math.min(unused.length, 15); i++) {
    console.log('  ' + unused[i]);
  }
  if (unused.length > 15) console.log('  ... 还有 ' + (unused.length - 15) + ' 个');
  console.log('');
}

if (issues.length === 0 && warns.length === 0) {
  console.log('✅ 所有 CSS 变量引用一致');
}

if (issues.length > 0) {
  console.log('\n' + '─'.repeat(35));
  console.log('⚠ 发现 ' + issues.length + ' 个未定义变量引用');
  if (!REPORT_ONLY) process.exit(1);
}
