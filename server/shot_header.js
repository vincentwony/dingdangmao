const { chromium } = require('playwright');
(async () => {
  const OUT = 'H:/Phone/server/_shots';
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1000, height: 360 } });
  await page.goto('http://localhost:3000/_preview_header.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.top-nav', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/header_preview.png', fullPage: true });
  await browser.close();
  console.log('saved ' + OUT + '/header_preview.png');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
