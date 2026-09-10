const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const OUT = 'H:/Phone/server/_shots';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  // 1) 真实页面当前页眉（诚实基线）
  await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.top-nav', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/real_header.png', clip: { x: 0, y: 0, width: 1200, height: 72 } });
  console.log('saved real_header.png');

  // 2) 完整整合预览（H1/H2/H3）
  await page.goto(BASE + '/_preview_header_full.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.top-nav', { timeout: 8000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/header_full_preview.png', fullPage: true });
  console.log('saved header_full_preview.png');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
