import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outSanhe = path.join(__dirname, 'ziwei_sanhe_focus.png');
const outFeixing = path.join(__dirname, 'ziwei_feixing_focus.png');
const outFull = path.join(__dirname, 'ziwei_views_full.png');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));

  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
    return route.continue();
  });

  await page.goto('http://localhost:3000/app.html', { waitUntil: 'domcontentloaded' });

  await page.click('#tabZiwei');
  await page.waitForSelector('#zw-name', { timeout: 10000 });

  await page.fill('#zw-name', '王', { force: true });
  await page.selectOption('#zw-sex', '男', { force: true });
  await page.selectOption('#zw-y', '1982', { force: true });
  await page.selectOption('#zw-m', '5', { force: true });
  await page.selectOption('#zw-d', '10', { force: true });
  await page.fill('#zw-time', '12:20', { force: true });

  await page.$eval('#zw-submit', el => el.click());

  await page.waitForFunction(() => {
    const palaces = document.querySelectorAll('.zw-palace');
    return palaces.length >= 12;
  }, { timeout: 15000 });
  await page.waitForTimeout(600);

  // 1) 三合视图
  await page.$eval('.zw-bottom-tab[data-view="sanhe"]', el => el.click());
  await page.waitForSelector('.zw-overlay[data-overlay="sanhe"] .sh-link', { timeout: 8000 });
  await page.waitForTimeout(900);
  const sanheWrap = await page.$('.zw-view-panel[data-view="sanhe"] .zw-chart-wrap');
  if (sanheWrap) {
    await sanheWrap.screenshot({ path: outSanhe });
    console.log('SANHE_OK', outSanhe);
  } else {
    console.log('SANHE_MISS');
  }

  // 2) 飞星视图（验证 overlay 仍在宫格上方）
  await page.$eval('.zw-bottom-tab[data-view="feixing"]', el => el.click());
  await page.waitForSelector('.zw-overlay[data-overlay="feixing"] path[class^="fly-"]', { timeout: 8000 });
  await page.waitForTimeout(900);
  const feixingWrap = await page.$('.zw-view-panel[data-view="feixing"] .zw-chart-wrap');
  if (feixingWrap) {
    await feixingWrap.screenshot({ path: outFeixing });
    console.log('FEIXING_OK', outFeixing);
  } else {
    console.log('FEIXING_MISS');
  }

  await page.screenshot({ path: outFull, fullPage: true });
  console.log('FULL_OK', outFull);

  console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
