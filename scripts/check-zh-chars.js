/**
 * scripts/check-zh-chars.js — 简体/繁体字符键一致性校验
 *
 * 规则来源: CLAUDE.md 陷阱 #3 "繁体/简体字不匹配"
 * 核心: 以中文字符为键的 JS 对象/Map，查找来源必须与键使用同一字符变体
 *
 * 已知差异字符对照:
 *   简体 | 繁体 | 出现位置
 *   龙   | 龍   | 黄道十二神
 *   匮   | 匱   | 黄道十二神
 *   陈   | 陳   | 黄道十二神
 *   满   | 滿   | 建除十二神
 *   执   | 執   | 建除十二神
 *   开   | 開   | 建除十二神
 *   闭   | 閉   | 建除十二神
 *
 * 用法: node scripts/check-zh-chars.js [目录...]
 * 默认: 当前目录
 */

'use strict';

var fs = require('fs');
var path = require('path');

// ── 已知差异字符对（简体→繁体） ──
var DIFF_PAIRS = {
  '龙': '龍', '匮': '匱', '陈': '陳',
  '满': '滿', '执': '執', '开': '開', '闭': '閉',
  '为': '為', '时': '時', '万': '萬',
  '历': '曆', '运': '運', '转': '轉',
  '门': '門', '杀': '殺', '见': '見',
  '冲': '沖', '经': '經', '纬': '緯', '网': '網'
};

var EXTS = ['.js', '.html'];
var REPORT_ONLY = process.argv.includes('--report');

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
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
  for (var i = 0; i < entries.length; i++) {
    var name = entries[i].name;
    if (name.startsWith('.') || name === 'node_modules' || name === 'Back' || name === 'build' || name === '.license') continue;
    var full = path.join(dir, name);
    if (entries[i].isDirectory()) walkDir(full, out);
    else if (EXTS.includes(path.extname(name))) out.push(full);
  }
}

// ── 检查文件中是否存在简繁混用 ──
function checkFile(filePath) {
  var content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch(e) { return []; }
  var issues = [];

  // 策略: 在每个文件中，如果同时出现了某个字符的简体和繁体形式，
  // 且它们出现在字符串字面量中，则可能存在混用风险

  var simpleChars = Object.keys(DIFF_PAIRS);

  for (var sc = 0; sc < simpleChars.length; sc++) {
    var sChar = simpleChars[sc];
    var tChar = DIFF_PAIRS[sChar];

    var hasSimple = content.includes(sChar);
    var hasTrad = content.includes(tChar);

    if (hasSimple && hasTrad) {
      // 两者都出现 — 检查是否在 JS 对象键或查找中使用
      // 查找类似 ["青龙"] 或 ["青龍"] 的键定义
      var sKey = new RegExp('["\\\']([^"\\\']*' + sChar + '[^"\\\']*)["\\\']', 'g');
      var tKey = new RegExp('["\\\']([^"\\\']*' + tChar + '[^"\\\']*)["\\\']', 'g');

      var sMatches = [];
      var tMatches = [];
      var m;
      while ((m = sKey.exec(content)) !== null) sMatches.push(m[1]);
      while ((m = tKey.exec(content)) !== null) tMatches.push(m[1]);

      if (sMatches.length > 0 && tMatches.length > 0) {
        issues.push({
          char: sChar + '/' + tChar,
          simpleTerms: sMatches.slice(0, 5),
          tradTerms: tMatches.slice(0, 5)
        });
      }
    }
  }

  return issues;
}

// ── 主流程 ──
var dirs = process.argv.slice(2).filter(function(a) { return !a.startsWith('--'); });
if (dirs.length === 0) dirs = ['.'];
// 排除不检查的目录
dirs = dirs.filter(function(d) {
  return !d.includes('node_modules') && !d.includes('.license') && !d.includes('Back') && !d.includes('.git');
});

console.log('═══════════════════════════════════');
console.log('  简繁字符键一致性校验');
console.log('═══════════════════════════════════\n');

var files = collectFiles(dirs);
console.log('扫描文件: ' + files.length + ' (' + dirs.join(', ') + ')');
console.log('检查字符对: ' + Object.keys(DIFF_PAIRS).length + '\n');

var totalIssues = 0;
for (var i = 0; i < files.length; i++) {
  var issues = checkFile(files[i]);
  if (issues.length > 0) {
    totalIssues += issues.length;
    console.log('⚠ ' + path.relative('.', files[i]) + ' (' + issues.length + ' 处):');
    for (var j = 0; j < issues.length; j++) {
      var iss = issues[j];
      console.log('  字符对: ' + iss.char);
      console.log('    简体: ' + iss.simpleTerms.join(', '));
      console.log('    繁体: ' + iss.tradTerms.join(', '));
    }
    console.log('');
  }
}

if (totalIssues === 0) {
  console.log('✅ 未发现简繁字符混用风险');
} else {
  console.log('⚠ 发现 ' + totalIssues + ' 处潜在简繁混用');
  console.log('提示: 确保以中文字符为键的查找使用一致的字符变体');
  if (!REPORT_ONLY) process.exit(1);
}
