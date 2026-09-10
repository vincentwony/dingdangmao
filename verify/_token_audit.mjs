// B7 令牌化审计：确保前端 JS 中引用的 CSS 变量 token 都在 variables.css 的
// 亮色(:root,body.light) 与 暗色(body.dark) 两套主题中定义，且 JS 内无残留硬编码 hex。
// 用法：node verify/_token_audit.mjs  （退出码 0=通过，1=失败）

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:').replace(/\//g, '\\');
const cssPath = ROOT + 'web\\css\\variables.css';
const jsFiles = ['web\\js\\calendar-ui.js', 'web\\js\\bazi-ui.js'].map(p => ROOT + p);

const css = readFileSync(cssPath, 'utf8');
const darkIdx = css.indexOf('暗色主题');
if (darkIdx < 0) { console.error('❌ 未找到暗色主题标记，variables.css 结构异常'); process.exit(1); }
const lightPart = css.slice(0, darkIdx);
const darkPart = css.slice(darkIdx);

function tokensOf(part) {
  const set = new Set();
  const re = /(--[\w-]+)/g; let m;
  while ((m = re.exec(part)) !== null) set.add(m[1]);
  return set;
}
const lightTokens = tokensOf(lightPart);
const darkTokens = tokensOf(darkPart);

let failures = 0;
const fail = (msg) => { console.log('  ❌ ' + msg); failures++; };

// 1) JS 中引用的 token 必须在亮+暗两套都定义
const refRe = /var\(\s*(--[\w-]+)\s*\)/g;
const allRefs = new Map();
for (const f of jsFiles) {
  const src = readFileSync(f, 'utf8');
  let m;
  while ((m = refRe.exec(src)) !== null) {
    const tok = m[1];
    if (!allRefs.has(tok)) allRefs.set(tok, new Set());
    allRefs.get(tok).add(f.split('\\').pop());
  }
}
console.log(`检测到 JS 引用 token ${allRefs.size} 个：`);
for (const [tok, files] of allRefs) {
  const inLight = lightTokens.has(tok);
  const inDark = darkTokens.has(tok);
  const mark = (inLight && inDark) ? '✅' : '❌';
  console.log(`  ${mark} ${tok}  [亮:${inLight ? 'Y' : 'N'} 暗:${inDark ? 'Y' : 'N'}]  <- ${[...files].join(', ')}`);
  if (!inLight) fail(`${tok} 在亮色主题(:root,body.light)未定义`);
  if (!inDark) fail(`${tok} 在暗色主题(body.dark)未定义`);
}

// 2) JS 内不得残留硬编码 hex（#rgb / #rrggbb）
const hexRe = /#[0-9a-fA-F]{3,6}\b/g;
let hexCount = 0;
for (const f of jsFiles) {
  const src = readFileSync(f, 'utf8');
  const hexes = src.match(hexRe);
  if (hexes) {
    hexCount += hexes.length;
    fail(`${f.split('\\').pop()} 残留硬编码 hex: ${hexes.join(', ')}`);
  }
}
console.log(`硬编码 hex 残留: ${hexCount} 处`);

// 3) 新增 token 自身完整性检查（亮暗配齐）
const newTokens = ['--moon-new', '--moon-full', '--moon-quarter', '--color-jieqi'];
for (const t of newTokens) {
  if (!lightTokens.has(t)) fail(`新增 token ${t} 亮色未定义`);
  if (!darkTokens.has(t)) fail(`新增 token ${t} 暗色未定义`);
}

console.log('');
if (failures === 0) {
  console.log(`✅ B7 令牌化审计通过：所有 JS 引用的 ${allRefs.size} 个 token 亮暗齐备，无硬编码 hex 残留`);
  process.exit(0);
} else {
  console.log(`❌ B7 令牌化审计失败：${failures} 项问题`);
  process.exit(1);
}
