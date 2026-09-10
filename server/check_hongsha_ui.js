// 红砂/大红砂 前端冒烟：日历角标 + 详情页文案 + 无控制台报错
// 复用 check_footer.js 的启动约定（channel msedge / serviceWorkers block）
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const hmac = require('./lib/hmac.js');

const BASE = 'http://localhost:3000';
const H = hmac.HEADER_NAMES;
const MID = 'verify-hongsha-ui';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const nonce = hmac.genNonce();
    const sig = hmac.sign(MID, ts, nonce, path);
    const payload = JSON.stringify(body || {});
    const req = http.request({
      host: 'localhost', port: 3000, path: path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        [H.MID]: MID, [H.TS]: String(ts), [H.NONCE]: nonce, [H.SIG]: sig
      }
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

const recs = [];
const rec = (name, pass, info) => { recs.push({ name, pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' :: ' + info : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 414, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !/favicon\.ico/.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url()); });

  await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Cal3 .cal-cell', { timeout: 10000 });
  await page.waitForTimeout(600);

  // 读取当前显示年月
  const shown = await page.evaluate(() => {
    const c = document.querySelector('#Cal3 .cal-cell[data-year]:not(.other-month)');
    return c ? { y: +c.dataset.year, m: +c.dataset.month } : null;
  });
  if (!shown) { rec('读取当前显示年月', false, '未找到当前月格子'); await browser.close(); process.exit(1); }
  rec('读取当前显示年月', true, shown.y + '-' + shown.m);

  // 取该月红砂日
  const mj = await post('/api/v1/calendar/month', { y: shown.y, m: shown.m });
  const days = (mj.data && mj.data.days) || [];
  const daDay = (days.find(d => d.isDaHongSha) || {}).d;
  const xiaoDay = (days.find(d => d.isHongSha && d.d !== daDay) || {}).d;
  rec('该月存在大红砂日', !!daDay, '大红砂日=' + daDay);
  rec('该月存在小红砂日', !!xiaoDay, '小红砂日=' + xiaoDay);

  const cell = d => `#Cal3 .cal-cell[data-year="${shown.y}"][data-month="${shown.m}"][data-day="${d}"]`;

  if (daDay) {
    // 角标
    const badge = await page.locator(cell(daDay) + ' .cal-badge-dahongsha').count();
    rec('大红砂日历角标存在', badge > 0, 'count=' + badge);
    // 详情
    await page.locator(cell(daDay)).click();
    await page.waitForTimeout(700);
    const txt = await page.locator('#cal-detail-inline').innerText().catch(() => '');
    rec('详情页显示「大红砂（吉）」', /大红砂（吉）/.test(txt), 'len=' + txt.length);
    rec('大红砂详情含「百事吉」', /百事吉/.test(txt), '');
  }

  if (xiaoDay) {
    const badge2 = await page.locator(cell(xiaoDay) + ' .cal-badge-hongsha').count();
    rec('小红砂日历角标存在', badge2 > 0, 'count=' + badge2);
    await page.locator(cell(xiaoDay)).click();
    await page.waitForTimeout(700);
    const txt2 = await page.locator('#cal-detail-inline').innerText().catch(() => '');
    rec('详情页显示「小红砂（凶）」', /小红砂（凶）/.test(txt2), 'len=' + txt2.length);
    rec('旧文案「红砂日」已移除', !/红砂日/.test(txt2), '');
    rec('小红砂日不误标大红砂', !/大红砂（吉）/.test(txt2), '');
  }

  rec('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const failed = recs.filter(r => !r.pass);
  console.log('\n==== 红砂前端冒烟: ' + (recs.length - failed.length) + '/' + recs.length + ' 通过 ====');
  if (failed.length) { console.log('失败项: ' + failed.map(f => f.name).join(', ')); process.exit(1); }
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
