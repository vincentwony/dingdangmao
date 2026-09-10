/**
 * scripts/smoke-boot.mjs — 前端启动冒烟 (L1)
 *
 * 用途：用 jsdom 加载 web/app.html 的 DOM，注入浏览器 API 桩，
 *       动态 import web/js/app.js 触发真实启动流程，断言：
 *         1) 模块图 import 无未捕获异常（拦「改 app.js 整站白屏」）
 *         2) 启动 IIFE 未致命失败（#cal-root 未出现「加载失败，请刷新重试」）
 *         3) 日历容器 #Cal3 已被渲染（拦「calendar-ui init 抛错」）
 *         4) 关键功能挂载点存在（cal/bazi/ziwei/note/settings/home）
 *
 * 不依赖运行中的后端：fetch 桩返回合法空包，render 不会因缺字段抛错。
 * 用法: node scripts/smoke-boot.mjs
 */

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const APP_HTML = path.join(ROOT, 'web', 'app.html');
const APP_JS = path.join(ROOT, 'web', 'js', 'app.js');

// ── 1. 读取 app.html，构造 DOM（不执行其中的 <script>，由我们手动 import 模块）──
const html = fs.readFileSync(APP_HTML, 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/app.html',
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const { window } = dom;

// ── 2. 注入浏览器全局桩（对只读全局用 setGlobal 跳过，fetch/观察器用 forceGlobal 强覆盖）──
const errors = [];
const warns = [];

function setGlobal(key, val) {
  try { if (!(key in globalThis)) globalThis[key] = val; }
  catch (e) { try { Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true }); } catch (_) {} }
}
function forceGlobal(key, val) {
  try { globalThis[key] = val; }
  catch (e) { try { Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true }); } catch (_) {} }
}

setGlobal('window', window);
setGlobal('document', window.document);
setGlobal('localStorage', window.localStorage);
setGlobal('HTMLElement', window.HTMLElement);
setGlobal('Node', window.Node);
setGlobal('getComputedStyle', window.getComputedStyle.bind(window));
setGlobal('screen', globalThis.screen || { width: 1280, height: 800 });
if (!window.screen) window.screen = globalThis.screen;
// navigator / crypto：Node 22 已有全局实现，保留（api.js HMAC 用 crypto.subtle）

// fetch 桩：返回合法空包，render 不会因缺字段抛错（强制覆盖 Node 自带 fetch）
const stubFetch = async (url) => {
  const u = String(url || '');
  let data = {};
  if (u.includes('/calendar/month')) {
    const now = new Date();
    data = { y: now.getFullYear(), m: now.getMonth() + 1, days: [], prevEdge: [], nextEdge: [] };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true, took: 1, data }) };
};
forceGlobal('fetch', stubFetch);
window.fetch = stubFetch;

// 计时器 / 动画
const raf = (cb) => setTimeout(() => cb(Date.now()), 0);
const caf = (id) => clearTimeout(id);
forceGlobal('requestAnimationFrame', raf);
forceGlobal('cancelAnimationFrame', caf);
window.requestAnimationFrame = raf;
window.cancelAnimationFrame = caf;

// 观察器
class NoopObserver { observe() {} unobserve() {} disconnect() {} }
forceGlobal('IntersectionObserver', NoopObserver);
forceGlobal('ResizeObserver', NoopObserver);
window.IntersectionObserver = NoopObserver;
window.ResizeObserver = NoopObserver;

// matchMedia
const mql = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
forceGlobal('matchMedia', mql);
window.matchMedia = mql;
window.scrollTo = () => {};

// 错误收集
window.onerror = (msg) => { errors.push('window.onerror: ' + msg); };
process.on('unhandledRejection', (reason) => {
  errors.push('unhandledRejection: ' + (reason && reason.message ? reason.message : reason));
});
const origError = console.error;
console.error = function (...args) {
  const line = args.map(String).join(' ');
  if (line.includes('[app] 启动失败') || line.includes('[app] 模块加载失败') ||
      line.includes('启动失败') || line.includes('模块加载失败')) {
    errors.push('console.error: ' + line);
  } else {
    warns.push(line);
  }
  origError.apply(console, args);
};

// ── 3. 触发真实启动 ──
console.log('═══════════════════════════════════');
console.log('  前端启动冒烟 (L1)');
console.log('═══════════════════════════════════\n');

let importThrew = null;
try {
  await import(pathToFileURL(APP_JS).href);
} catch (e) {
  importThrew = e;
}

// 等待启动 IIFE + 首屏 fetch 完成
await new Promise((r) => setTimeout(r, 1800));

// ── 4. 断言 ──
const fatal = [];

if (importThrew) {
  fatal.push('模块 import 抛错: ' + (importThrew.stack || importThrew.message));
}

const calRoot = window.document.getElementById('cal-root');
const cal3 = window.document.getElementById('Cal3');

// 断言 2：启动未致命失败
if (calRoot && calRoot.textContent.includes('加载失败，请刷新重试')) {
  fatal.push('#cal-root 出现启动致命失败文案（IIFE 抛错被捕获）');
}

// 断言 3：日历已渲染
if (!cal3 || cal3.childElementCount === 0) {
  fatal.push('#Cal3 未渲染（calendar-ui init 可能抛错或无内容）');
}

// 断言 4：关键挂载点存在
const mounts = ['cal-root', 'bazi-root', 'ziwei-vanilla-root', 'note-root', 'settingsPanel', 'home-root'];
const missing = mounts.filter((id) => !window.document.getElementById(id));
if (missing.length > 0) {
  fatal.push('缺失关键挂载点: ' + missing.join(', '));
}

// 过滤致命错误（排除 stub 数据造成的非致命兜底）
const fatalErrors = errors.filter((e) =>
  e.includes('[app] 启动失败') || e.includes('[app] 模块加载失败') ||
  e.includes('启动失败') || e.includes('模块加载失败') ||
  e.startsWith('unhandledRejection') || e.startsWith('window.onerror')
);
fatal.push(...fatalErrors);

// ── 5. 输出 ──
console.log('\n───────────────────────────────────');
if (fatal.length === 0) {
  console.log('✅ 启动冒烟通过');
  console.log('   - 模块图 import 无未捕获异常');
  console.log('   - 启动 IIFE 未致命失败');
  console.log('   - #Cal3 已渲染 (' + (cal3 ? cal3.childElementCount : 0) + ' 子节点)');
  console.log('   - 关键挂载点齐全: ' + mounts.join(' / '));
  if (warns.length > 0) {
    console.log('   ℹ 非致命警告 ' + warns.length + ' 条（多为 stub 数据兜底，可忽略）');
  }
  process.exit(0);
} else {
  console.log('❌ 启动冒烟失败 (' + fatal.length + '):');
  fatal.forEach((f) => console.log('  • ' + f));
  if (warns.length > 0) {
    console.log('\n  附带非致命警告:');
    warns.slice(0, 8).forEach((w) => console.log('  • ' + w.slice(0, 160)));
  }
  console.log('\n' + '─'.repeat(40));
  console.log('⛔ 启动冒烟未通过，原代码可能已被破坏');
  process.exit(1);
}
