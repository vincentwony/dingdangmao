/**
 * build-release.js — 公信万年历 发布构建脚本 v2.0
 *
 * 流水线: 校验 → 构建 → 验证
 *
 * 用法:
 *   node build-release.js              # 完整构建
 *   node build-release.js --check      # 仅校验
 *   node build-release.js --skip-check # 跳过校验直接构建
 */

var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var WEB_DIR = path.join(__dirname, 'web');
var BUILD_DIR = path.join(__dirname, 'build', 'web');
var ANDROID_DIR = path.join(__dirname, 'WannianliAndroid', 'app', 'src', 'main', 'assets', 'www');
var SCRIPTS_DIR = path.join(__dirname, 'scripts');

var skipCheck = process.argv.includes('--skip-check');
var checkOnly = process.argv.includes('--check');
var stats = { files: 0, originalKB: 0, finalKB: 0 };
var checksFailed = false;

console.log('═══════════════════════════════════════');
console.log('  公信万年历 — 发布构建 v2.0');
console.log('═══════════════════════════════════════\n');

// ═══════════════════════════════════════════
// 阶段一: 预构建校验
// ═══════════════════════════════════════════

function runCheck(name, script) {
  console.log('── ' + name + ' ──');
  try {
    var result = cp.spawnSync('node', [script, '--report'], {
      cwd: __dirname,
      stdio: 'pipe',
      timeout: 30000,
      encoding: 'utf8'
    });
    var output = result.stdout + result.stderr;
    // 提取关键行
    var lines = output.split('\n');
    var summary = [];
    var hasError = false;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].includes('❌') || lines[i].includes('⚠ 发现') || lines[i].includes('✅')) {
        summary.push(lines[i]);
      }
    }
    console.log(summary.join('\n') || '  (无输出)');
    if (result.status !== 0) {
      hasError = true;
      checksFailed = true;
    }
    console.log(hasError ? '  → 未通过\n' : '  → 通过\n');
  } catch(e) {
    console.log('  ❌ 运行失败: ' + e.message + '\n');
    checksFailed = true;
  }
}

if (!skipCheck) {
  console.log('【阶段一】预构建校验\n');
  runCheck('HMAC 密钥一致性', path.join(SCRIPTS_DIR, 'check-hmac-keys.js'));
  runCheck('CSS 变量一致性', path.join(SCRIPTS_DIR, 'check-css-vars.js'));
  runCheck('简繁字符一致性', path.join(SCRIPTS_DIR, 'check-zh-chars.js'));

  if (checksFailed) {
    console.log('═'.repeat(35));
    console.log('❌ 校验未通过，构建中止');
    console.log('   使用 --skip-check 跳过校验强制构建');
    console.log('   使用 --check 仅运行校验不构建');
    console.log('═'.repeat(35));
    process.exit(1);
  }
  console.log('✅ 全部校验通过\n');
}

if (checkOnly) {
  console.log('仅校验模式，跳过构建');
  process.exit(0);
}

// ═══════════════════════════════════════════
// 阶段二: 构建
// ═══════════════════════════════════════════

console.log('【阶段二】构建\n');

// ── 清理 ──
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('清理: ' + path.relative(__dirname, dir));
  }
  fs.mkdirSync(dir, { recursive: true });
}

cleanDir(BUILD_DIR);
cleanDir(ANDROID_DIR);

// ── 压缩 HTML ──
function minifyHTML(content) {
  content = content.replace(/<!--(?![\[\]])([\s\S]*?)-->/g, '');
  var lines = content.split('\n');
  var out = [];
  var prevEmpty = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/[ \t]+$/g, '');
    if (line.trim() === '') {
      if (!prevEmpty) { out.push(''); prevEmpty = true; }
      continue;
    }
    prevEmpty = false;
    out.push(line);
  }
  return out.join('\n').trim();
}

// ── 压缩 CSS ──
function minifyCSS(content) {
  content = content.replace(/\/\*[\s\S]*?\*\//g, function(m) {
    return /@license|@preserve/i.test(m) ? m : '';
  });
  content = content.replace(/[ \t]+/g, ' ');
  content = content.replace(/\n\s*/g, '\n');
  content = content.replace(/;\s*/g, ';\n');
  content = content.replace(/\{\s*/g, '{\n');
  content = content.replace(/\s*\}/g, '}\n');
  return content.replace(/\n{3,}/g, '\n\n').trim();
}

// ── 压缩 JS ──
function minifyJS(content) {
  var lines = content.split('\n');
  var out = [];
  var prevEmpty = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/[ \t]+$/g, '');
    var trimmed = line.trim();
    if (/^\/\/\s/.test(trimmed) && !/^\/\/\s*!/.test(trimmed)) {
      if (!prevEmpty) { out.push(''); prevEmpty = true; }
      continue;
    }
    if (trimmed === '') {
      if (!prevEmpty) { out.push(''); prevEmpty = true; }
      continue;
    }
    prevEmpty = false;
    out.push(line);
  }
  return out.join('\n').trim();
}

var processors = {
  '.html': minifyHTML,
  '.css': minifyCSS,
  '.js': minifyJS
};

// ── 递归处理 ──
function processDir(srcDir, destDir, androidDir) {
  var entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (var i = 0; i < entries.length; i++) {
    var ent = entries[i];
    var src = path.join(srcDir, ent.name);
    var dest = path.join(destDir, ent.name);
    var adest = path.join(androidDir, ent.name);

    if (ent.name === 'node_modules' || ent.name === '.git') continue;

    if (ent.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.mkdirSync(adest, { recursive: true });
      processDir(src, dest, adest);
    } else {
      var ext = path.extname(ent.name).toLowerCase();
      var content = fs.readFileSync(src, 'utf8');
      var originalKB = Buffer.byteLength(content, 'utf8') / 1024;
      var finalContent = content;

      if (processors[ext]) {
        finalContent = processors[ext](content);
      }

      var finalKB = Buffer.byteLength(finalContent, 'utf8') / 1024;
      stats.files++;
      stats.originalKB += originalKB;
      stats.finalKB += finalKB;

      fs.writeFileSync(dest, finalContent, 'utf8');
      fs.writeFileSync(adest, finalContent, 'utf8');

      var pct = originalKB > 0 ? ((1 - finalKB / originalKB) * 100).toFixed(0) : 0;
      if (ext === '.html' || ext === '.css' || ext === '.js') {
        console.log('  ' + ent.name + '  ' + originalKB.toFixed(1) + 'KB → ' + finalKB.toFixed(1) + 'KB  (-' + pct + '%)');
      }
    }
  }
}

console.log('处理 web/ → build/web/ + Android assets/\n');
processDir(WEB_DIR, BUILD_DIR, ANDROID_DIR);

// ── 汇总 ──
console.log('\n───────────────────────────────────────');
console.log('  文件数:  ' + stats.files);
console.log('  原始:    ' + stats.originalKB.toFixed(0) + ' KB');
console.log('  压缩后:  ' + stats.finalKB.toFixed(0) + ' KB');
console.log('  减少:    ' + (stats.originalKB - stats.finalKB).toFixed(0) + ' KB  (' + (stats.originalKB > 0 ? ((1 - stats.finalKB / stats.originalKB) * 100).toFixed(0) : 0) + '%)');
console.log('───────────────────────────────────────');
console.log('  输出:    ' + path.relative(__dirname, BUILD_DIR));
console.log('  同步:    ' + path.relative(__dirname, ANDROID_DIR));

// ═══════════════════════════════════════════
// 阶段三: 构建后验证
// ═══════════════════════════════════════════

console.log('\n【阶段三】构建后验证\n');

	// 验证1: JS 语法检查（跳过 ES 模块文件，浏览器通过 type="module" 加载）
	var jsErrors = 0;
	var esmSkipped = 0;
	function validateJS(dir) {
	  var entries;
	  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
	  for (var i = 0; i < entries.length; i++) {
	    if (entries[i].name === 'node_modules') continue;
	    var fp = path.join(dir, entries[i].name);
	    if (entries[i].isDirectory()) { validateJS(fp); continue; }
	    if (!fp.endsWith('.js')) continue;
	    // 跳过 ES 模块文件（import/export 语法在 CJS 检查中报错，但浏览器 type="module" 正常工作）
	    try {
	      var content = fs.readFileSync(fp, 'utf8');
	      if (/^\s*(import\s|export\s)/m.test(content)) { esmSkipped++; continue; }
	    } catch(e) {}
	    try {
	      cp.execSync('node --check "' + fp + '"', { timeout: 5000, stdio: 'pipe' });
	    } catch(e) {
	      console.log('  ❌ 语法错误: ' + path.relative(BUILD_DIR, fp));
	      jsErrors++;
	    }
	  }
	}
	validateJS(BUILD_DIR);
	console.log(jsErrors === 0 ? '  ✅ JS 语法检查通过' + (esmSkipped > 0 ? '（跳过 ' + esmSkipped + ' 个 ES 模块）' : '') : '  ❌ ' + jsErrors + ' 个文件语法错误');

// 验证2: 关键文件存在
var requiredFiles = ['app.html', 'js/app.js', 'js/api.js', 'js/bazi-ui.js', 'css/variables.css'];
var missingFiles = [];
for (var i = 0; i < requiredFiles.length; i++) {
  if (!fs.existsSync(path.join(BUILD_DIR, requiredFiles[i]))) {
    missingFiles.push(requiredFiles[i]);
  }
}
console.log(missingFiles.length === 0 ? '  ✅ 关键文件完整' : '  ❌ 缺失: ' + missingFiles.join(', '));

// 验证3: HMAC 密钥一致性（构建产物）
try {
  var buildCheck = cp.spawnSync('node', [path.join(SCRIPTS_DIR, 'check-hmac-keys.js'), '--report'], {
    cwd: __dirname, stdio: 'pipe', timeout: 10000, encoding: 'utf8'
  });
  var hasBuildKeyIssue = buildCheck.status !== 0;
  console.log(hasBuildKeyIssue ? '  ⚠ HMAC 密钥校验有警告' : '  ✅ 构建产物 HMAC 密钥一致');
} catch(e) {
  console.log('  ⚠ HMAC 校验跳过');
}

// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════════════');
if (jsErrors === 0 && missingFiles.length === 0) {
  console.log('  构建成功！');
} else {
  console.log('  ⚠ 构建完成但有警告');
}
console.log('═══════════════════════════════════════');
