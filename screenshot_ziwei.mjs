import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'ziwei_preview_1982-5-10.png');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 2400 } });
  // 无外网环境下 Web 字体一直 pending 会卡住 fonts.ready，拦截字体请求让其快速失败
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
    return route.continue();
  });
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'domcontentloaded' });

  // 点击顶部紫微 tab 进入紫微页
  await page.click('#tabZiwei');

  await page.waitForSelector('#zw-name', { timeout: 10000 });

  // 填表单（force 跳过视口/可见性检查，避免表单在滚动容器内无法交互）
  await page.fill('#zw-name', '王', { force: true });
  await page.selectOption('#zw-sex', '男', { force: true });
  await page.selectOption('#zw-y', '1982', { force: true });
  await page.selectOption('#zw-m', '5', { force: true });
  await page.selectOption('#zw-d', '10', { force: true });
  await page.fill('#zw-time', '12:20', { force: true });

  // 点排盘（直接在浏览器上下文触发点击，绕过视口/滚动检查）
  await page.$eval('#zw-submit', el => el.click());

  // 等渲染完成（出现 zw-palace 且数量 >=12）
  await page.waitForFunction(() => {
    const palaces = document.querySelectorAll('.zw-palace');
    return palaces.length >= 12;
  }, { timeout: 15000 });

  // 再等 500ms 让 CSS 稳定
  await page.waitForTimeout(800);

  // 诊断：打印关键元素 rect
  const rects = await page.evaluate(() => {
    const root = document.getElementById('ziwei-vanilla-root');
    const shell = document.querySelector('.zw-shell');
    const left = document.querySelector('.zw-left');
    const right = document.querySelector('.zw-right');
    const panel = document.querySelector('.zw-view-panel.active');
    const card = document.querySelector('.zw-view-panel.active .zw-chart-card');
    const wrap = document.querySelector('.zw-view-panel.active .zw-chart-wrap');
    const canvas = document.querySelector('.zw-view-panel.active .zw-chart-canvas');
    const grid = document.querySelector('.zw-chart-grid[data-chart="common"]');
    const palaces = document.querySelectorAll('.zw-palace');
    const box = (el) => el ? el.getBoundingClientRect() : null;
    const st = (el) => el ? {
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
      position: getComputedStyle(el).position,
      width: getComputedStyle(el).width,
      height: getComputedStyle(el).height
    } : null;
    return {
      root: { rect: box(root), style: st(root) },
      shell: { rect: box(shell), style: st(shell) },
      left: { rect: box(left), style: st(left) },
      right: { rect: box(right), style: st(right) },
      panel: { rect: box(panel), style: st(panel) },
      card: { rect: box(card), style: st(card) },
      wrap: { rect: box(wrap), style: st(wrap) },
      canvas: { rect: box(canvas), style: st(canvas) },
      grid: { rect: box(grid), style: st(grid) },
      palaceCount: palaces.length,
      palaceBg: palaces.length ? getComputedStyle(palaces[0]).backgroundColor : '',
      palaceColor: palaces.length ? getComputedStyle(palaces[0]).color : '',
      palaceBorder: palaces.length ? getComputedStyle(palaces[0]).borderColor : '',
      samplePalaceHtml: palaces.length ? palaces[0].outerHTML.slice(0, 200) : '',
      centerSample: palaces.length ? (palaces[0].querySelector('.zw-palace-mid') ? palaces[0].querySelector('.zw-palace-mid').textContent : '') : '',
      mutagenMarks: (function () {
        var all = document.querySelectorAll('.zw-mutagen-i');
        var sample = all.length ? all[0].outerHTML : '';
        var palette = {};
        all.forEach(function (m) { var c = m.className.replace('zw-mutagen-i','').replace(/\s+/g,' ').trim(); palette[c] = (palette[c]||0)+1; });
        return { count: all.length, sample: sample, byClass: palette };
      })(),
      overflow: (function () {
        var max = 0, worst = '';
        palaces.forEach(function (p) {
          var row = p.querySelector('.zw-palace-stars');
          if (!row) return;
          var pw = p.clientWidth;
          // 三行里最宽的一行
          row.querySelectorAll('.zw-palace-row').forEach(function (r) {
            var w = r.scrollWidth;
            if (w - pw > max) { max = w - pw; worst = p.querySelector('.zw-palace-name') ? p.querySelector('.zw-palace-name').textContent : ''; }
          });
        });
        return { maxOverflowPx: Math.round(max), worstPalace: worst };
      })(),
      infoCenter: (function () {
        var c = document.querySelector('.zw-info-center');
        if (!c) return null;
        var p = c.querySelector('.zw-infopanel');
        var r = c.getBoundingClientRect();
        return {
          exists: !!p,
          rectW: Math.round(r.width),
          rectH: Math.round(r.height),
          panelScrollH: p ? p.scrollHeight : 0,
          centerClientH: c.clientHeight,
          clipped: p ? (p.scrollHeight > c.clientHeight + 2) : null,
          bg: p ? getComputedStyle(p).backgroundColor : '',
          color: p ? getComputedStyle(p).color : '',
          fontSize: p ? getComputedStyle(p).fontSize : '',
          text: p ? p.textContent.replace(/\s+/g, ' ').trim() : ''
        };
      })()
    };
  });
  console.log('rects:', JSON.stringify(rects, null, 2));

  // 滚动到命盘区域并截图可见视口
  await page.$eval('.zw-chart-canvas', el => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);

  // 用 CDP 底层截图（可见视口，避免离线字体卡死）
  const client = await page.context().newCDPSession(page);
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  });
  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  console.log('screenshot saved:', outPath, '(full page)');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
