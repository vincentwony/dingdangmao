const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const OUT = 'H:/Phone/server/_shots';
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  // 真实页面页眉
  await page.goto(BASE + '/app.html#calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.top-nav .brand-mark svg', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/header_E_real.png', clip: { x: 0, y: 0, width: 1200, height: 72 } });

  // 放大品牌区
  const brand = await page.$('.top-nav-brand');
  const box = await brand.boundingBox();
  await page.screenshot({ path: OUT + '/header_E_brand.png', clip: { x: box.x - 6, y: box.y - 4, width: box.width + 12, height: box.height + 8 } });

  await browser.close();
  console.log('DONE header_E');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
